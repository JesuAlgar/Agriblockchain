import { CONFIG, getPlantIdFromURL, STATE } from './config.js';
import { log } from './utils.js';

// Magic.link API Key - CONFIGURADA ✅
const MAGIC_API_KEY = 'pk_live_37872478211D964B';

// Infura API Key - CONFIGURADA ✅
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
 * INICIALIZA MAGIC.LINK CON SEPOLIA
 */
export async function initMagic() {
  if (magic) return magic;
  
  log('[Magic.link] ✅ CONFIGURADO');
  log('[Magic.link] API Key: pk_live_37872478211D964B');
  log('[Magic.link] RPC: https://sepolia.infura.io/v3/f4ec683049b74beab43d0ec659c28f6a');
  log('[Magic.link] Inicializando...');
  
  if (!window.Magic) {
    log('[Magic.link] Cargando Magic SDK desde CDN...');
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@magic-sdk/admin@latest/dist/magic.js';
      script.async = true;
      
      script.onload = () => {
        log('[Magic.link] SDK cargado ✅');
        
        magic = new window.Magic(MAGIC_API_KEY, {
          network: {
            rpcUrl: RPC_URL,
            chainId: 11155111
          }
        });
        
        log('[Magic.link] ✅ LISTO para Sepolia (chainId: 11155111)');
        
        provider = magic.rpcProvider;
        resolve(magic);
      };
      
      script.onerror = () => {
        log('[Magic.link] ❌ Error cargando SDK', 'error');
        reject(new Error('Error cargando Magic.link SDK'));
      };
      
      document.head.appendChild(script);
    });
  } else {
    magic = new window.Magic(MAGIC_API_KEY, {
      network: {
        rpcUrl: RPC_URL,
        chainId: 11155111
      }
    });
    
    log('[Magic.link] ✅ Inicializado');
    provider = magic.rpcProvider;
    return magic;
  }
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
    log('[Magic.link] 📬 Revisa tu email para el magic link');
    
    localStorage.setItem('magic_did_token', didToken);
    
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
    log('[Magic.link] Error obteniendo usuario: ' + error.message, 'error');
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
    log('[Magic.link] Error en logout: ' + error.message, 'error');
  }
}

/**
 * Conecta y obtiene el contrato en SEPOLIA
 */
async function connectAndGetContract() {
  try {
    log('[Blockchain] ========== CONECTANDO A SEPOLIA ==========');
    
    magic = await initMagic();
    provider = magic.rpcProvider;
    
    log('[Blockchain] ✅ Provider Magic.link conectado');
    
    const ethersProvider = new ethers.providers.Web3Provider(provider, 'any');
    const signer = ethersProvider.getSigner();
    
    log('[Blockchain] ✅ Signer obtenido');
    
    const network = await ethersProvider.getNetwork();
    log('[Blockchain] Red actual: chainId ' + network.chainId);
    
    if (network.chainId !== 11155111) {
      throw new Error('No estamos en Sepolia. ChainId: ' + network.chainId);
    }
    
    log('[Blockchain] ✅ Red confirmada: SEPOLIA');
    
    const contract = new ethers.Contract(
      CONFIG.blockchain.contractAddress,
      CONFIG.blockchain.contractABI,
      signer
    );
    
    log('[Blockchain] ✅ Contrato inicializado');
    log('[Blockchain] Dirección: ' + CONFIG.blockchain.contractAddress);
    
    return contract;
    
  } catch (error) {
    log('[Blockchain] ❌ Error conectando: ' + error.message, 'error');
    if (error.stack) {
      console.error('[Blockchain] Stack:', error.stack);
    }
    throw error;
  }
}

/**
 * Guarda datos en blockchain - AUTOMATICO
 */
export async function savePlantData(plantId, data) {
  try {
    log('[Blockchain] ========== INICIANDO GUARDADO ==========');
    log('[Blockchain] PlantId: ' + plantId);
    
    const contract = await connectAndGetContract();
    const json = JSON.stringify(data);
    
    log('[Blockchain] Datos: ' + json.substring(0, 100) + '...');
    log('[Blockchain] 📤 Enviando transacción a SEPOLIA...');
    
    // Magic.link FIRMA Y ENVIA AUTOMATICAMENTE
    const tx = await contract.setPlantData(plantId, json);
    
    log('[Blockchain] ✅ Transacción enviada AUTOMATICAMENTE');
    log('[Blockchain] 🔗 Hash: ' + tx.hash);
    log('[Blockchain] 🔍 Etherscan: https://sepolia.etherscan.io/tx/' + tx.hash);
    
    log('[Blockchain] ⏳ Esperando confirmación (10-30 seg)...');
    const receipt = await tx.wait();
    
    log('[Blockchain] ✅ CONFIRMADA en bloque: ' + receipt.blockNumber);
    log('[Blockchain] ⛽ Gas usado: ' + receipt.gasUsed.toString());
    log('[Blockchain] ========== ✅ GUARDADO EN BLOCKCHAIN ==========');
    
    return receipt;
    
  } catch (error) {
    log('[Blockchain] ❌ Error guardando: ' + error.message, 'error');
    if (error.stack) {
      console.error('[Blockchain] Stack:', error.stack);
    }
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
    
    log('📂 Cargando datos de: ' + url);
    
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
      log('⚠️  Datos no encontrados, usando fallback', 'warn');
      return FALLBACK_DATA;
    }
    
    const data = await response.json();
    log('✅ Datos cargados: ' + data.seedVariety);
    
    plantDataCache.set(plantIndex, {
      data: data,
      lastUpdate: Date.now()
    });
    
    return data;
    
  } catch (error) {
    log('Error cargando datos: ' + error.message, 'warn');
    return FALLBACK_DATA;
  }
}

export function getCachedPlantData(plantIndex) {
  return plantDataCache.get(plantIndex);
}

export function clearPlantCache(plantIndex) {
  plantDataCache.delete(plantIndex);
  log('🗑️  Cache limpiado para planta ' + plantIndex);
}

export async function preloadPlantData(count = 3) {
  log('📥 Pre-cargando ' + count + ' plantas...');
  
  const promises = [];
  for (let i = 0; i < count; i++) {
    promises.push(
      loadPlantData(i).catch(err => {
        log('⚠️  Error pre-cargando planta ' + i + ': ' + err.message, 'warn');
      })
    );
  }
  
  try {
    await Promise.all(promises);
    log('✅ Pre-carga completa');
  } catch (error) {
    log('Error en pre-carga: ' + error.message, 'warn');
  }
}
