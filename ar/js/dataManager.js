// ============================================
// DATA MANAGER - BLOCKCHAIN + METAMASK
// ALTERNATIVA: Usar window.ethereum directamente
// ============================================

import { CONFIG, getPlantIdFromURL, STATE } from './config.js';
import { log } from './utils.js';

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
 * Conecta a MetaMask usando window.ethereum
 * NO carga SDK completo, usa provider inyectado
 */
async function connectAndGetContract() {
  try {
    log('[Blockchain] Conectando a MetaMask...');
    
    // Verificar que MetaMask está disponible
    if (!window.ethereum) {
      throw new Error('MetaMask no instalada. Por favor instala la app en tu movil.');
    }
    
    log('[Blockchain] MetaMask disponible');
    
    // Solicitar cuentas
    log('[Blockchain] Solicitando cuentas...');
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    
    log('[Blockchain] Conectado a cuenta: ' + accounts[0]);
    
    // Crear Web3 provider con ethers
    const ethersProvider = new ethers.providers.Web3Provider(window.ethereum, 'any');
    const signer = ethersProvider.getSigner();
    
    log('[Blockchain] Signer obtenido');
    
    // Verificar red
    const network = await ethersProvider.getNetwork();
    log('[Blockchain] Red actual: chainId ' + network.chainId);
    
    // Si no es Sepolia (11155111), cambiar
    if (network.chainId !== 11155111) {
      log('[Blockchain] No estamos en Sepolia, cambiando...');
      
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }]
        });
        log('[Blockchain] Red cambiada a Sepolia');
      } catch (switchError) {
        if (switchError.code === 4902) {
          log('[Blockchain] Sepolia no conocida, agregando...');
          await window.ethereum.request({
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