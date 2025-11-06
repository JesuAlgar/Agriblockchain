// ============================================
// DATA MANAGER - BLOCKCHAIN + MAGIC.LINK
// VERSION: FINAL FIX (SIN PROBLEMAS MIME/CORS)
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
  seedVariety: "Demo Plant",
  seedSupplier: "Demo Supplier",
  seedTreatment: "demo",
  quantity_kg: 0.0,
  plantingMethod: "demo-system",
  rowSpacing_cm: 0,
  plantingDepth_cm: 0.0,
  germinationRate_pct: 0
};

/**
 * INYECTA MAGIC.LINK VIA FETCH + BLOB
 */
async function injectMagicSDK() {
  return new Promise((resolve, reject) => {
    if (window.Magic) {
      resolve(window.Magic);
      return;
    }

    log('[Magic.link] Inyectando SDK...');

    const CDN_URL = 'https://cdn.jsdelivr.net/npm/@magic-sdk/admin@latest/dist/magic.js';

    fetch(CDN_URL)
      .then(res => res.text())
      .then(scriptText => {
        log('[Magic.link] Script descargado');

        try {
          const blob = new Blob([scriptText], { type: 'application/javascript' });
          const blobURL = URL.createObjectURL(blob);

          const script = document.createElement('script');
          script.src = blobURL;
          script.async = true;

          script.onload = () => {
            log('[Magic.link] ✅ Inyectado');
            URL.revokeObjectURL(blobURL);
            
            if (window.Magic) {
              resolve(window.Magic);
            } else {
              setTimeout(() => {
                if (window.Magic) {
                  resolve(window.Magic);
                } else {
                  reject(new Error('Magic no disponible'));
                }
              }, 100);
            }
          };

          script.onerror = () => {
            reject(new Error('Error inyectando Magic'));
          };

          document.head.appendChild(script);
        } catch (err) {
          reject(err);
        }
      })
      .catch(err => {
        log('[Magic.link] ❌ Error: ' + err.message, 'error');
        reject(err);
      });
  });
}

/**
 * INICIALIZA MAGIC
 */
export async function initMagic() {
  if (magic) return magic;

  try {
    log('[Magic.link] Inicializando...');

    const Magic = await injectMagicSDK();

    magic = new Magic(MAGIC_API_KEY, {
      network: {
        rpcUrl: RPC_URL,
        chainId: 11155111
      }
    });

    log('[Magic.link] ✅ OK con Sepolia');
    provider = magic.rpcProvider;
    return magic;

  } catch (error) {
    log('[Magic.link] ❌ Error: ' + error.message, 'error');
    throw error;
  }
}

/**
 * LOGIN
 */
export async function loginWithMagic(email) {
  try {
    log('[Magic.link] 📧 Login: ' + email);

    magic = await initMagic();

    const didToken = await magic.auth.loginWithMagicLink({ email });

    log('[Magic.link] ✅ OK');
    localStorage.setItem('magic_did_token', didToken);

    const metadata = await magic.user.getMetadata();
    log('[Magic.link] ✅ Dir: ' + metadata.publicAddress);
    
    console.log('================================');
    console.log('TU DIRECCION PARA FAUCET:');
    console.log(metadata.publicAddress);
    console.log('================================');

    return didToken;

  } catch (error) {
    log('[Magic.link] ❌ Error: ' + error.message, 'error');
    throw error;
  }
}

/**
 * GET USER
 */
export async function getMagicUser() {
  try {
    magic = await initMagic();
    const isLoggedIn = await magic.user.isLoggedIn();
    if (!isLoggedIn) return null;
    return await magic.user.getMetadata();
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
 * GET CONTRACT
 */
async function connectAndGetContract() {
  try {
    log('[Blockchain] Conectando...');

    magic = await initMagic();
    provider = magic.rpcProvider;

    const ethersProvider = new ethers.providers.Web3Provider(provider, 'any');
    const signer = ethersProvider.getSigner();

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

    log('[Blockchain] ✅ OK');
    return contract;

  } catch (error) {
    log('[Blockchain] ❌ Error: ' + error.message, 'error');
    throw error;
  }
}

/**
 * SAVE TO BLOCKCHAIN
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
 * LOAD PLANT DATA
 */
export async function loadPlantData(plantIndex) {
  try {
    const plantId = getPlantIdFromURL();
    const url = './data/' + encodeURIComponent(plantId) + '.json';

    const response = await fetch(url, { cache: 'no-store' });

    if (!response.ok) return FALLBACK_DATA;

    const data = await response.json();
    plantDataCache.set(plantIndex, { data, lastUpdate: Date.now() });

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
    promises.push(loadPlantData(i).catch(() => {}));
  }
  await Promise.all(promises);
}