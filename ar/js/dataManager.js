// ============================================
// DATA MANAGER - BLOCKCHAIN + MAGIC.LINK
// VERSION: FUNCIONANDO
// ============================================

import { CONFIG, getPlantIdFromURL, STATE } from './config.js';
import { log } from './utils.js';

const MAGIC_API_KEY = 'pk_live_37872478211D964B';
const INFURA_KEY = 'f4ec683049b74beab43d0ec659c28f6a';
const RPC_URL = 'https://sepolia.infura.io/v3/' + INFURA_KEY;

let magic;
let provider;

const plantDataCache = new Map();

const FALLBACK_DATA = {
  eventType: "MONITOR",
  eventId: "01FALLBACK000000000000000",
  batchId: "01FALLBACK000000000000001",
  lotCode: "DEMO-2025-10-10-FALLBACK",
  timestamp: new Date().toISOString(),
  recordedBy: "device-DEMO",
  fieldId: "DEMO-FIELD",
  seed_LotId: "DEMO-SEED-001",
  seedVariety: "Demo Plant (Sin datos)",
  seedSupplier: "Demo Supplier",
  seedTreatment: "demo",
  quantity_kg: 0.0,
  plantingMethod: "demo-system",
  rowSpacing_cm: 0,
  plantingDepth_cm: 0.0,
  germinationRate_pct: 0
};

/**
 * CARGA MAGIC.LINK DESDE CDN
 */
async function loadMagicSDK() {
  return new Promise((resolve, reject) => {
    if (window.Magic) {
      log('[Magic.link] SDK ya cargado');
      resolve(window.Magic);
      return;
    }

    log('[Magic.link] Cargando SDK desde CDN...');

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@magic-sdk/admin@latest/dist/magic.js';
    script.async = true;
    script.crossOrigin = 'anonymous';

    script.onload = () => {
      log('[Magic.link] ✅ Script cargado');
      
      if (window.Magic) {
        log('[Magic.link] ✅ Magic disponible');
        resolve(window.Magic);
      } else {
        setTimeout(() => {
          if (window.Magic) {
            resolve(window.Magic);
          } else {
            reject(new Error('Magic no se definió'));
          }
        }, 500);
      }
    };

    script.onerror = () => {
      log('[Magic.link] ❌ Error cargando script', 'error');
      reject(new Error('Error cargando Magic.link'));
    };

    document.head.appendChild(script);
  });
}

/**
 * INICIALIZA MAGIC.LINK
 */
export async function initMagic() {
  if (magic) {
    return magic;
  }

  try {
    log('[Magic.link] Inicializando...');

    const Magic = await loadMagicSDK();

    magic = new Magic(MAGIC_API_KEY, {
      network: {
        rpcUrl: RPC_URL,
        chainId: 11155111
      }
    });

    log('[Magic.link] ✅ Inicializado con Sepolia');

    provider = magic.rpcProvider;
    return magic;

  } catch (error) {
    log('[Magic.link] ❌ Error: ' + error.message, 'error');
    throw error;
  }
}

/**
 * LOGIN CON EMAIL
 */
export async function loginWithMagic(email) {
  try {
    log('[Magic.link] 📧 Login: ' + email);

    magic = await initMagic();

    const didToken = await magic.auth.loginWithMagicLink({
      email: email
    });

    log('[Magic.link] ✅ Login OK');

    localStorage.setItem('magic_did_token', didToken);

    const metadata = await magic.user.getMetadata();
    log('[Magic.link] ✅ Dirección: ' + metadata.publicAddress);
    console.log('================================');
    console.log('COPIA ESTA DIRECCION:');
    console.log(metadata.publicAddress);
    console.log('================================');

    return didToken;

  } catch (error) {
    log('[Magic.link] ❌ Error: ' + error.message, 'error');
    throw error;
  }
}

/**
 * OBTENER USUARIO
 */
export async function getMagicUser() {
  try {
    magic = await initMagic();

    const isLoggedIn = await magic.user.isLoggedIn();

    if (!isLoggedIn) {
      return null;
    }

    const metadata = await magic.user.getMetadata();
    return metadata;

  } catch (error) {
    return null;
  }
}

/**
 * LOGOUT
 */
export async function logoutMagic() {
  try {
    magic = await initMagic();
    await magic.user.logout();
    localStorage.removeItem('magic_did_token');
    log('[Magic.link] ✅ Logout');
  } catch (error) {
    log('[Magic.link] Error: ' + error.message, 'error');
  }
}

/**
 * CONECTA A SEPOLIA
 */
async function connectAndGetContract() {
  try {
    log('[Blockchain] Conectando...');

    magic = await initMagic();
    provider = magic.rpcProvider;

    const ethersProvider = new ethers.providers.Web3Provider(provider, 'any');
    const signer = ethersProvider.getSigner();

    log('[Blockchain] ✅ Signer OK');

    const network = await ethersProvider.getNetwork();
    log('[Blockchain] ChainId: ' + network.chainId);

    if (network.chainId !== 11155111) {
      throw new Error('No es Sepolia');
    }

    const contract = new ethers.Contract(
      CONFIG.blockchain.contractAddress,
      CONFIG.blockchain.contractABI,
      signer
    );

    log('[Blockchain] ✅ Contrato OK');

    return contract;

  } catch (error) {
    log('[Blockchain] ❌ Error: ' + error.message, 'error');
    throw error;
  }
}

/**
 * GUARDA EN BLOCKCHAIN
 */
export async function savePlantData(plantId, data) {
  try {
    log('[Blockchain] Guardando...');

    const contract = await connectAndGetContract();
    const json = JSON.stringify(data);

    const tx = await contract.setPlantData(plantId, json);

    log('[Blockchain] ✅ TX: ' + tx.hash);
    log('[Blockchain] https://sepolia.etherscan.io/tx/' + tx.hash);

    const receipt = await tx.wait();

    log('[Blockchain] ✅ Bloque: ' + receipt.blockNumber);

    return receipt;

  } catch (error) {
    log('[Blockchain] ❌ Error: ' + error.message, 'error');
    throw error;
  }
}

/**
 * CARGA DATOS
 */
export async function loadPlantData(plantIndex) {
  try {
    const plantId = getPlantIdFromURL();
    const url = './data/' + encodeURIComponent(plantId) + '.json';

    const response = await fetch(url, { cache: 'no-store' });

    if (!response.ok) {
      return FALLBACK_DATA;
    }

    const data = await response.json();
    log('✅ Datos: ' + data.seedVariety);

    plantDataCache.set(plantIndex, {
      data: data,
      lastUpdate: Date.now()
    });

    return data;

  } catch (error) {
    return FALLBACK_DATA;
  }
}

export function getCachedPlantData(plantIndex) {
  return plantDataCache.get(plantIndex);
}

export function clearPlantCache(plantIndex) {
  plantDataCache.delete(plantIndex);
}

export async function preloadPlantData(count = 3) {
  const promises = [];
  for (let i = 0; i < count; i++) {
    promises.push(loadPlantData(i).catch(err => {}));
  }
  await Promise.all(promises);
}