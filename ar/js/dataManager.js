// ============================================
// DATA MANAGER - BLOCKCHAIN + MAGIC.LINK
// VERSION: SIMPLIFICADA (SIN CARGAR SDK)
// ============================================

import { CONFIG, getPlantIdFromURL, STATE } from './config.js';
import { log } from './utils.js';

// Magic.link API Key
const MAGIC_API_KEY = 'pk_live_37872478211D964B';

// Infura Sepolia
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
 * INICIALIZA MAGIC.LINK (ASUME QUE YA ESTA INYECTADO)
 */
export async function initMagic() {
  if (magic) return magic;
  
  log('[Magic.link] Verificando si SDK está disponible...');
  
  // Esperar a que Magic esté disponible
  let attempts = 0;
  while (!window.Magic && attempts < 20) {
    await new Promise(r => setTimeout(r, 500));
    attempts++;
  }
  
  if (!window.Magic) {
    throw new Error('Magic.link SDK no disponible. Asegúrate de que está cargado en index.html');
  }
  
  log('[Magic.link] ✅ SDK disponible');
  
  magic = new window.Magic(MAGIC_API_KEY, {
    network: {
      rpcUrl: RPC_URL,
      chainId: 11155111
    }
  });
  
  log('[Magic.link] ✅ Inicializado con Sepolia');
  
  provider = magic.rpcProvider;
  return magic;
}

/**
 * Login con Magic.link (Email)
 */
export async function loginWithMagic(email) {
  try {
    log('[Magic.link] 📧 Login con: ' + email);
    
    magic = await initMagic();
    
    const didToken = await magic.auth.loginWithMagicLink({
      email: email
    });
    
    log('[Magic.link] ✅ Login exitoso');
    
    localStorage.setItem('magic_did_token', didToken);
    
    // Obtener dirección
    const metadata = await magic.user.getMetadata();
    log('[Magic.link] ✅ Tu dirección: ' + metadata.publicAddress);
    console.log('IMPORTANTE - COPIA ESTA DIRECCION: ' + metadata.publicAddress);
    
    return didToken;
    
  } catch (error) {
    log('[Magic.link] ❌ Error: ' + error.message, 'error');
    throw error;
  }
}

/**
 * Obtener usuario logueado
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
    log('[Magic.link] Error: ' + error.message, 'error');
    return null;
  }
}

/**
 * Logout
 */
export async function logoutMagic() {
  try {
    magic = await initMagic();
    await magic.user.logout();
    localStorage.removeItem('magic_did_token');
    log('[Magic.link] ✅ Logout exitoso');
  } catch (error) {
    log('[Magic.link] Error: ' + error.message, 'error');
  }
}

/**
 * Conecta y obtiene el contrato en SEPOLIA
 */
async function connectAndGetContract() {
  try {
    log('[Blockchain] Conectando a Sepolia...');
    
    magic = await initMagic();
    provider = magic.rpcProvider;
    
    log('[Blockchain] ✅ Provider conectado');
    
    const ethersProvider = new ethers.providers.Web3Provider(provider, 'any');
    const signer = ethersProvider.getSigner();
    
    log('[Blockchain] ✅ Signer obtenido');
    
    const network = await ethersProvider.getNetwork();
    log('[Blockchain] Red: chainId ' + network.chainId);
    
    if (network.chainId !== 11155111) {
      throw new Error('No estamos en Sepolia');
    }
    
    const contract = new ethers.Contract(
      CONFIG.blockchain.contractAddress,
      CONFIG.blockchain.contractABI,
      signer
    );
    
    log('[Blockchain] ✅ Contrato listo');
    
    return contract;
    
  } catch (error) {
    log('[Blockchain] ❌ Error: ' + error.message, 'error');
    throw error;
  }
}

/**
 * Guarda datos en blockchain
 */
export async function savePlantData(plantId, data) {
  try {
    log('[Blockchain] Guardando...');
    
    const contract = await connectAndGetContract();
    const json = JSON.stringify(data);
    
    log('[Blockchain] 📤 Enviando tx a Sepolia...');
    
    const tx = await contract.setPlantData(plantId, json);
    
    log('[Blockchain] ✅ Tx enviada');
    log('[Blockchain] Hash: ' + tx.hash);
    log('[Blockchain] https://sepolia.etherscan.io/tx/' + tx.hash);
    
    log('[Blockchain] ⏳ Esperando confirmación...');
    const receipt = await tx.wait();
    
    log('[Blockchain] ✅ CONFIRMADA en bloque: ' + receipt.blockNumber);
    
    return receipt;
    
  } catch (error) {
    log('[Blockchain] ❌ Error: ' + error.message, 'error');
    throw error;
  }
}

/**
 * Carga datos de una planta
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
