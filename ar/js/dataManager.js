// ============================================
// DATA MANAGER - MAGIC.LINK + BLOCKCHAIN
// VERSION: IFRAME (EVITA ERRORES DE SINTAXIS)
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
  eventId: "01FALLBACK",
  batchId: "01FALLBACK",
  lotCode: "DEMO",
  timestamp: new Date().toISOString(),
  recordedBy: "device-DEMO",
  fieldId: "DEMO-FIELD",
  seed_LotId: "DEMO",
  seedVariety: "Demo Plant",
  seedSupplier: "Demo",
  seedTreatment: "demo",
  quantity_kg: 0.0,
  plantingMethod: "demo",
  rowSpacing_cm: 0,
  plantingDepth_cm: 0.0,
  germinationRate_pct: 0
};

/**
 * ESPERAR A QUE MAGIC ESTÉ DISPONIBLE
 */
async function waitForMagic(timeout = 10000) {
  const start = Date.now();
  while (!window.Magic) {
    if (Date.now() - start > timeout) {
      throw new Error('Timeout esperando Magic.link');
    }
    await new Promise(r => setTimeout(r, 100));
  }
  return window.Magic;
}

/**
 * INYECTAR MAGIC VIA IFRAME
 */
async function setupMagicViaIframe() {
  return new Promise((resolve, reject) => {
    if (window.Magic) {
      resolve(window.Magic);
      return;
    }

    log('[Magic.link] Inicializando via iframe...');

    // Crear iframe
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.sandbox.add('allow-scripts');
    iframe.sandbox.add('allow-same-origin');

    iframe.onload = () => {
      log('[Magic.link] Iframe cargado');

      // Inyectar Magic en el iframe
      const script = iframe.contentDocument.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@magic-sdk/admin@latest/dist/magic.js';
      script.async = true;

      script.onload = () => {
        log('[Magic.link] ✅ Magic cargado en iframe');

        // Copiar Magic al window principal
        try {
          if (iframe.contentWindow.Magic) {
            window.Magic = iframe.contentWindow.Magic;
            log('[Magic.link] ✅ Magic disponible globalmente');
            resolve(window.Magic);
          } else {
            setTimeout(() => {
              if (iframe.contentWindow.Magic) {
                window.Magic = iframe.contentWindow.Magic;
                resolve(window.Magic);
              } else {
                reject(new Error('Magic no en iframe'));
              }
            }, 500);
          }
        } catch (err) {
          reject(err);
        }
      };

      script.onerror = () => {
        reject(new Error('Error cargando Magic en iframe'));
      };

      iframe.contentDocument.head.appendChild(script);
    };

    iframe.onerror = () => {
      reject(new Error('Error iframe'));
    };

    iframe.src = 'about:blank';
    document.head.appendChild(iframe);
  });
}

/**
 * INICIALIZA MAGIC - INTENTA MULTIPLES METODOS
 */
export async function initMagic() {
  if (magic) return magic;

  try {
    log('[Magic.link] Inicializando...');

    // Método 1: Si ya está disponible
    if (window.Magic) {
      log('[Magic.link] ✅ Magic ya disponible');
    } else {
      // Método 2: Setup via iframe
      log('[Magic.link] Usando método iframe...');
      await setupMagicViaIframe();
    }

    // Esperar a que Magic esté listo
    const Magic = await waitForMagic();

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
 * LOGIN
 */
export async function loginWithMagic(email) {
  try {
    log('[Magic.link] 📧 Login: ' + email);

    magic = await initMagic();

    const didToken = await magic.auth.loginWithMagicLink({ email });

    log('[Magic.link] ✅ Login OK');
    localStorage.setItem('magic_did_token', didToken);

    const metadata = await magic.user.getMetadata();
    log('[Magic.link] ✅ Dirección: ' + metadata.publicAddress);
    
    console.log('================================');
    console.log('COPIA PARA FAUCET:');
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
 * CONECTA A SEPOLIA
 */
async function connectAndGetContract() {
  try {
    log('[Blockchain] Conectando a Sepolia...');

    magic = await initMagic();
    provider = magic.rpcProvider;

    const ethersProvider = new ethers.providers.Web3Provider(provider, 'any');
    const signer = ethersProvider.getSigner();

    const network = await ethersProvider.getNetwork();
    log('[Blockchain] ChainId: ' + network.chainId);

    if (network.chainId !== 11155111) {
      throw new Error('No en Sepolia');
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
    log('[Blockchain] ✅ Confirmada bloque: ' + receipt.blockNumber);

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