// ============================================
// DATA MANAGER - BLOCKCHAIN + MAGIC.LINK API
// VERSION: SIN SDK (SOLO REQUESTS HTTP)
// ============================================

import { CONFIG, getPlantIdFromURL, STATE } from './config.js';
import { log } from './utils.js';

const MAGIC_API_KEY = 'pk_live_37872478211D964B';
const INFURA_KEY = 'f4ec683049b74beab43d0ec659c28f6a';
const RPC_URL = 'https://sepolia.infura.io/v3/' + INFURA_KEY;

let userEmail = null;
let userDIDToken = null;
let userPublicAddress = null;

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
 * GENERAR DIRECCION ETHEREUM DESDE EMAIL
 */
function generateAddressFromEmail(email) {
  const encoder = new TextEncoder();
  const data = encoder.encode(email + MAGIC_API_KEY);
  
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const addressNum = Math.abs(hash) % 1000000000000000;
  const hex = addressNum.toString(16).padStart(40, '0');
  return '0x' + hex;
}

/**
 * LOGIN CON MAGIC.LINK (SIMULADO)
 */
export async function loginWithMagic(email) {
  try {
    log('[Magic.link] 📧 Login: ' + email);

    userEmail = email;
    userPublicAddress = generateAddressFromEmail(email);
    userDIDToken = 'did_' + Math.random().toString(36).substr(2, 9);

    log('[Magic.link] ✅ Login OK');
    localStorage.setItem('magic_email', userEmail);
    localStorage.setItem('magic_address', userPublicAddress);
    localStorage.setItem('magic_did_token', userDIDToken);

    log('[Magic.link] ✅ Dirección: ' + userPublicAddress);
    
    console.log('================================');
    console.log('COPIA PARA FAUCET:');
    console.log(userPublicAddress);
    console.log('================================');

    return userDIDToken;

  } catch (error) {
    log('[Magic.link] ❌ Error: ' + error.message, 'error');
    throw error;
  }
}

/**
 * GET USER LOGEADO
 */
export async function getMagicUser() {
  try {
    const email = localStorage.getItem('magic_email');
    const address = localStorage.getItem('magic_address');
    const token = localStorage.getItem('magic_did_token');

    if (!email || !address) {
      return null;
    }

    return {
      email: email,
      publicAddress: address,
      didToken: token
    };

  } catch (error) {
    return null;
  }
}

/**
 * INICIALIZAR MAGIC
 */
export async function initMagic() {
  log('[Magic.link] Inicializado');
  return {
    auth: {
      loginWithMagicLink: async (opts) => {
        return loginWithMagic(opts.email);
      }
    },
    user: {
      isLoggedIn: async () => {
        return localStorage.getItem('magic_email') !== null;
      },
      getMetadata: async () => {
        return getMagicUser();
      },
      logout: async () => {
        logoutMagic();
      }
    }
  };
}

/**
 * LOGOUT
 */
export async function logoutMagic() {
  try {
    userEmail = null;
    userDIDToken = null;
    userPublicAddress = null;
    
    localStorage.removeItem('magic_email');
    localStorage.removeItem('magic_address');
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

    const user = await getMagicUser();
    if (!user) {
      throw new Error('No logeado. Haz login primero.');
    }

    log('[Blockchain] Usuario: ' + user.email);
    log('[Blockchain] Dirección: ' + user.publicAddress);

    const provider = new ethers.providers.JsonRpcProvider(RPC_URL, {
      name: 'sepolia',
      chainId: 11155111
    });

    log('[Blockchain] ✅ Provider OK');

    const contract = new ethers.Contract(
      CONFIG.blockchain.contractAddress,
      CONFIG.blockchain.contractABI,
      provider
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

    const user = await getMagicUser();
    if (!user) {
      throw new Error('No logeado');
    }

    log('[Blockchain] Datos de: ' + plantId);
    log('[Blockchain] Usuario: ' + user.publicAddress);

    const json = JSON.stringify(data);
    localStorage.setItem('plant_' + plantId, json);

    log('[Blockchain] ✅ Guardado localmente');
    log('[Blockchain] Dirección: ' + user.publicAddress);

    return {
      blockNumber: 0,
      status: 'local'
    };

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