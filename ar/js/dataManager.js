// ============================================
// DATA MANAGER - BLOCKCHAIN + METAMASK
// VERSION: MEJORADA CON MEJOR DETECCION
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
 * ESPERA A QUE window.ethereum ESTE DISPONIBLE
 * Intenta 30 veces (15 segundos)
 */
async function waitForMetaMask(maxAttempts = 30) {
  log('[Blockchain] ========== DETECTANDO METAMASK ==========');
  log('[Blockchain] Intentando hasta 15 segundos...');
  
  for (let i = 0; i < maxAttempts; i++) {
    if (window.ethereum) {
      log('[Blockchain] ✅ MetaMask DETECTADA en intento: ' + (i + 1) + '/' + maxAttempts);
      return window.ethereum;
    }
    
    if (i % 5 === 0) {
      log('[Blockchain] Intento ' + (i + 1) + '/' + maxAttempts + '... esperando MetaMask');
    }
    
    // Esperar 500ms entre intentos
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  log('[Blockchain] ❌ MetaMask NO detectada después de 15 segundos');
  log('[Blockchain] ========== VERIFICACIONES ==========');
  log('[Blockchain] 1. ¿MetaMask app ABIERTA en el móvil? (icono zorro)');
  log('[Blockchain] 2. ¿Wallet CREADA en MetaMask?');
  log('[Blockchain] 3. ¿Red SEPOLIA seleccionada en MetaMask?');
  log('[Blockchain] 4. ¿El teléfono tiene internet?');
  log('[Blockchain] 5. Intenta: Cierra Chrome → Abre MetaMask → Abre Chrome');
  log('[Blockchain] ==========================================');
  
  throw new Error(
    'MetaMask NO inyectada.\n\n' +
    'Verifica:\n' +
    '1. MetaMask app está ABIERTA (ves el icono zorro)\n' +
    '2. Recargaste la página DESPUES de abrir MetaMask\n' +
    '3. En Chrome móvil (no en navegador por defecto)\n' +
    '\n' +
    'Solución:\n' +
    '1. Cierra Chrome completamente\n' +
    '2. Abre MetaMask app\n' +
    '3. Abre Chrome\n' +
    '4. Ve a tu app\n' +
    '5. Intenta de nuevo'
  );
}

/**
 * Conecta a MetaMask usando window.ethereum
 */
async function connectAndGetContract() {
  try {
    log('[Blockchain] ========== CONECTANDO A METAMASK ==========');
    
    // ESPERAR a que MetaMask esté disponible
    const ethereum = await waitForMetaMask();
    
    log('[Blockchain] ✅ window.ethereum disponible');
    log('[Blockchain] Solicitando autorización de cuentas...');
    
    // Solicitar cuentas - ESTO ABRE METAMASK SI ESTA INSTALADA
    let accounts;
    try {
      accounts = await ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
    } catch (requestError) {
      if (requestError.code === 4001) {
        log('[Blockchain] ❌ Usuario rechazó la conexión en MetaMask', 'error');
        throw new Error('Debes autorizar la conexión en MetaMask');
      }
      throw requestError;
    }
    
    if (!accounts || accounts.length === 0) {
      throw new Error('No se obtuvieron cuentas de MetaMask');
    }
    
    log('[Blockchain] ✅ Conectado a: ' + accounts[0]);
    
    // Crear Web3 provider con ethers
    const ethersProvider = new ethers.providers.Web3Provider(ethereum, 'any');
    const signer = ethersProvider.getSigner();
    
    log('[Blockchain] ✅ Signer obtenido');
    
    // Verificar red
    const network = await ethersProvider.getNetwork();
    log('[Blockchain] Red actual: chainId ' + network.chainId);
    
    // Si no es Sepolia (11155111), cambiar
    if (network.chainId !== 11155111) {
      log('[Blockchain] ⚠️  No estamos en Sepolia, intentando cambiar...');
      
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }]
        });
        log('[Blockchain] ✅ Red cambiada a Sepolia');
      } catch (switchError) {
        if (switchError.code === 4902) {
          log('[Blockchain] Sepolia no conocida, agregando red...');
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xaa36a7',
              chainName: 'Sepolia',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://sepolia.infura.io/v3/YOUR_INFURA_KEY'],
              blockExplorerUrls: ['https://sepolia.etherscan.io']
            }]
          });
          log('[Blockchain] ✅ Sepolia agregada');
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
    
    log('[Blockchain] ✅ Contrato inicializado');
    log('[Blockchain] ========== LISTO PARA TRANSACCION ==========');
    
    return contract;
    
  } catch (error) {
    log('[Blockchain] ❌ Error: ' + error.message, 'error');
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
    log('[Blockchain] ========== INICIANDO GUARDADO ==========');
    log('[Blockchain] PlantId: ' + plantId);
    
    const contract = await connectAndGetContract();
    const json = JSON.stringify(data);
    
    log('[Blockchain] Datos JSON: ' + json.substring(0, 100) + '...');
    log('[Blockchain] Enviando transacción a Sepolia...');
    
    const tx = await contract.setPlantData(plantId, json);
    
    log('[Blockchain] ✅ Transacción enviada');
    log('[Blockchain] Hash: ' + tx.hash);
    log('[Blockchain] Etherscan: https://sepolia.etherscan.io/tx/' + tx.hash);
    
    log('[Blockchain] Esperando confirmación (puede tardar 10-30 segundos)...');
    const receipt = await tx.wait();
    
    log('[Blockchain] ✅ Confirmada en bloque: ' + receipt.blockNumber);
    log('[Blockchain] Gas usado: ' + receipt.gasUsed.toString());
    log('[Blockchain] ========== TRANSACCION EXITOSA ==========');
    
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
    
    log('Cargando datos de: ' + url);
    
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
      log('Datos no encontrados, usando fallback', 'warn');
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
    log('✅ Pre-carga completa');
  } catch (error) {
    log('Error en pre-carga: ' + error.message, 'warn');
  }
}