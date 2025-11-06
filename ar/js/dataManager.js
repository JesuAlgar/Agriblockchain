// ============================================
// DATA MANAGER - BLOCKCHAIN + METAMASK
// ============================================

import { CONFIG, getPlantIdFromURL, STATE } from './config.js';
import { log } from './utils.js';

// Cache de datos
const plantDataCache = new Map();

// Datos de fallback
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
 * Carga el MetaMask SDK desde CDN
 * SOLO opciones v11+ validas
 */
async function loadMetaMaskSDK() {
  log('[MetaMask SDK] Iniciando carga desde CDN...');
  
  return new Promise((resolve, reject) => {
    // Ya está cargado?
    if (typeof window.MetaMaskSDK === 'function') {
      log('[MetaMask SDK] Detectado en window.MetaMaskSDK');
      return resolve(window.MetaMaskSDK);
    }

    // Crear script para CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@metamask/sdk@latest/dist/metamask-sdk.js';
    script.async = true;
    
    script.onload = () => {
      log('[MetaMask SDK] Script cargado del CDN');
      
      // Esperar a que window.MetaMaskSDK se defina
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        
        if (typeof window.MetaMaskSDK === 'function') {
          clearInterval(checkInterval);
          log('[MetaMask SDK] Detectado en window.MetaMaskSDK');
          resolve(window.MetaMaskSDK);
        } else if (attempts > 50) {
          clearInterval(checkInterval);
          reject(new Error('[MetaMask SDK] No se pudo cargar window.MetaMaskSDK'));
        }
      }, 100);
    };
    
    script.onerror = () => {
      log('[MetaMask SDK] Error cargando CDN', 'error');
      reject(new Error('[MetaMask SDK] Error cargando de CDN'));
    };
    
    document.head.appendChild(script);
  });
}

/**
 * Inicializa MetaMask y obtiene el signer
 * SOLO opciones v11+ validas
 */
async function initializeMetaMask() {
  try {
    log('[Blockchain] Obteniendo SDK...');
    
    const MetaMaskSDK = await loadMetaMaskSDK();
    log('[MetaMask SDK] Constructor obtenido');
    
    // SOLO opciones validas v11+
    const options = {
      dappMetadata: {
        name: 'AgriBlockchain',
        url: typeof window !== 'undefined' ? window.location.origin : ''
      },
      useDeeplink: true,
      checkInstallationImmediately: false
    };
    
    log('[MetaMask SDK] Inicializando con opciones');
    
    const mmsdk = new MetaMaskSDK(options);
    
    log('[MetaMask SDK] Instancia creada');
    log('[MetaMask SDK] Obteniendo provider...');
    
    const provider = mmsdk.getProvider();
    
    if (!provider) {
      throw new Error('No se pudo obtener provider de MetaMask SDK');
    }
    
    log('[MetaMask SDK] Provider obtenido');
    
    return provider;
    
  } catch (error) {
    log('[Blockchain] Error inicializando MetaMask: ' + error.message, 'error');
    throw error;
  }
}

/**
 * Conecta a MetaMask y retorna el contrato
 */
async function connectAndGetContract() {
  try {
    log('[Blockchain] Conectando a MetaMask...');
    
    const provider = await initializeMetaMask();
    
    // Solicitar cuentas
    log('[Blockchain] Solicitando cuentas...');
    const accounts = await provider.request({ 
      method: 'eth_requestAccounts' 
    });
    
    log('[Blockchain] Conectado a cuenta: ' + accounts[0]);
    
    // Crear Web3 provider con ethers
    const ethersProvider = new ethers.providers.Web3Provider(provider, 'any');
    const signer = ethersProvider.getSigner();
    
    log('[Blockchain] Signer obtenido');
    
    // Verificar red
    const network = await ethersProvider.getNetwork();
    log('[Blockchain] Red actual: ' + network.chainId);
    
    // Si no es Sepolia (11155111), cambiar
    if (network.chainId !== 11155111) {
      log('[Blockchain] Cambiando a Sepolia...');
      
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }]
        });
        log('[Blockchain] Red cambiada a Sepolia');
      } catch (switchError) {
        if (switchError.code === 4902) {
          log('[Blockchain] Agregando Sepolia...');
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xaa36a7',
              chainName: 'Sepolia',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://sepolia.infura.io/v3/YOUR_INFURA_KEY'],
              blockExplorerUrls: ['https://sepolia.etherscan.io']
            }]
          });
          log('[Blockchain] Sepolia agregada');
        } else {
          throw switchError;
        }
      }
    }
    
    // Crear contrato
    const contract = new ethers.Contract(
      CONFIG.blockchain.contractAddress,
      CONFIG.blockchain.contractABI,
      signer
    );
    
    log('[Blockchain] Contrato inicializado');
    
    return contract;
    
  } catch (error) {
    log('[Blockchain] Error conectando: ' + error.message, 'error');
    if (error.stack) {
      console.error('[Blockchain] Stack:', error.stack);
    }
    throw error;
  }
}

/**
 * Guarda datos en blockchain
 */
export async function savePlantData(plantId, data) {
  try {
    log('[Blockchain] Guardando para plantId: ' + plantId);
    
    const contract = await connectAndGetContract();
    const json = JSON.stringify(data);
    
    log('[Blockchain] Datos: ' + json.substring(0, 100) + '...');
    log('[Blockchain] Enviando transaccion...');
    
    const tx = await contract.setPlantData(plantId, json);
    
    log('[Blockchain] Tx enviada - Hash: ' + tx.hash);
    log('[Blockchain] Etherscan: https://sepolia.etherscan.io/tx/' + tx.hash);
    
    log('[Blockchain] Esperando confirmacion...');
    const receipt = await tx.wait();
    
    log('[Blockchain] Confirmada en bloque ' + receipt.blockNumber);
    log('[Blockchain] Gas usado: ' + receipt.gasUsed.toString());
    
    return receipt;
    
  } catch (error) {
    log('[Blockchain] Error guardando: ' + error.message, 'error');
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
    
    log('Cargando datos de: ' + url);
    
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
      log('Datos no encontrados, usando fallback', 'warn');
      return FALLBACK_DATA;
    }
    
    const data = await response.json();
    log('Datos cargados: ' + data.seedVariety);
    
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

/**
 * Obtiene datos cacheados
 */
export function getCachedPlantData(plantIndex) {
  return plantDataCache.get(plantIndex);
}

/**
 * Limpia cache
 */
export function clearPlantCache(plantIndex) {
  plantDataCache.delete(plantIndex);
  log('Cache limpiado para planta ' + plantIndex);
}

/**
 * Pre-carga datos
 */
export async function preloadPlantData(count = 3) {
  log('Pre-cargando datos de ' + count + ' plantas...');
  
  const promises = [];
  for (let i = 0; i < count; i++) {
    promises.push(
      loadPlantData(i).catch(err => {
        log('Error pre-cargando planta ' + i + ': ' + err.message, 'warn');
      })
    );
  }
  
  try {
    await Promise.all(promises);
    log('Pre-carga completa');
  } catch (error) {
    log('Error en pre-carga: ' + error.message, 'warn');
  }
}