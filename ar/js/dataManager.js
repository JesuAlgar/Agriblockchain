// ============================================
// GESTOR DE DATOS Y CACHÉ
// ============================================

import { CONFIG, getPlantIdFromURL, STATE } from './config.js';
import { log } from './utils.js';

// Datos de fallback cuando no se puede cargar
const FALLBACK_DATA = {
  eventType: "MONITOR",
  eventId: "01FALLBACK000000000000000",
  batchId: "01FALLBACK000000000000001",
  lotCode: "DEMO-2025-10-10-FALLBACK",
  timestamp: new Date().toISOString(),
  recordedBy: "device-DEMO",
  fieldId: "DEMO-FIELD",
  seed_LotId: "DEMO-SEED-001",
  seedVariety: "Demo Plant (No Data)",
  seedSupplier: "Demo Supplier",
  seedTreatment: "demo",
  quantity_kg: 0.0,
  plantingMethod: "demo-system",
  rowSpacing_cm: 0,
  plantingDepth_cm: 0.0,
  germinationRate_pct: 0
};

// Caché de datos de plantas
const plantDataCache = new Map();

/**
 * ⭐ NUEVA: Inicializar conexión a blockchain
 */
async function initBlockchain() {
  if (STATE.blockchainConnected) {
    return true; // Ya conectado
  }

  try {
    log('Inicializando conexión a blockchain...');

    // Verificar que ethers esté disponible
    if (typeof window.ethers === 'undefined') {
      throw new Error('Ethers.js no está cargado');
    }

    // Crear provider (solo lectura, no necesita MetaMask)
    const provider = new ethers.providers.JsonRpcProvider(
      CONFIG.blockchain.network.rpcUrl
    );

    // Crear instancia del contrato
    const contract = new ethers.Contract(
      CONFIG.blockchain.contractAddress,
      CONFIG.blockchain.contractABI,
      provider
    );

    // Guardar en estado global
    STATE.blockchainProvider = provider;
    STATE.blockchainContract = contract;
    STATE.blockchainConnected = true;

    log('✅ Blockchain conectado a Sepolia');
    return true;

  } catch (err) {
    log(`Error conectando a blockchain: ${err.message}`, 'error');
    STATE.blockchainConnected = false;
    return false;
  }
}

/**
 * ⭐ NUEVA: Cargar datos desde blockchain
 */
async function loadFromBlockchain(plantId) {
  try {
    // Asegurar que blockchain está conectado
    const connected = await initBlockchain();
    if (!connected) {
      throw new Error('No se pudo conectar a blockchain');
    }

    log(`📖 Leyendo datos de blockchain para: ${plantId}`);

    // Verificar si la planta existe
    const exists = await STATE.blockchainContract.plantExists(plantId);
    
    if (!exists) {
      log(`⚠️ Planta ${plantId} no encontrada en blockchain`, 'warn');
      throw new Error('Planta no encontrada en blockchain');
    }

    // Leer datos de la planta
    const jsonData = await STATE.blockchainContract.getPlantData(plantId);
    
    // Parsear JSON
    const data = JSON.parse(jsonData);
    
    log(`✅ Datos de blockchain leídos: ${data.seedVariety}`);
    
    return data;

  } catch (err) {
    log(`Error leyendo blockchain: ${err.message}`, 'error');
    throw err;
  }
}

/**
 * ⭐ MODIFICADA: Cargar datos desde JSON local
 */
async function loadFromLocalJSON(plantId) {
  const url = `./data/${encodeURIComponent(plantId)}.json`;
  
  try {
    log(`📖 Cargando datos locales desde ${url}`);
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    log(`✅ Datos locales cargados: ${data.seedVariety}`);
    return data;
    
  } catch (err) {
    log(`Error cargando JSON local: ${err.message}`, 'warn');
    throw err;
  }
}

/**
 * ⭐ MODIFICADA: Carga los datos de una planta (con caché)
 * Ahora soporta BLOCKCHAIN o LOCAL_JSON según configuración
 */
export async function loadPlantData(plantIndex) {
  // Forzar solo plantIndex = 0
  if (plantIndex !== 0) {
    console.warn(`Intentando cargar planta ${plantIndex}, forzando a 0`);
    plantIndex = 0;
  }
  
  const now = Date.now();
  const cached = plantDataCache.get(plantIndex);

  // Si hay cache y es reciente (menos de 5 segundos), usar cache
  if (cached && (now - cached.lastUpdate) < CONFIG.dataUpdateInterval) {
    log(`Usando datos en caché para planta ${plantIndex}`);
    return cached.data;
  }

  // Determinar el ID del archivo/blockchain
  const plantId = getPlantIdFromURL();
  
  try {
    let data;

    // ⭐ SELECCIONAR FUENTE DE DATOS
    if (CONFIG.blockchain.mode === 'BLOCKCHAIN') {
      log(`🔗 Modo BLOCKCHAIN activado para ${plantId}`);
      data = await loadFromBlockchain(plantId);
    } else {
      log(`📁 Modo LOCAL_JSON activado para ${plantId}`);
      data = await loadFromLocalJSON(plantId);
    }
    
    // Guardar en cache
    plantDataCache.set(plantIndex, {
      data: data,
      lastUpdate: now,
      previousData: cached ? cached.data : null
    });
    
    log(`✅ Datos cargados para planta ${plantIndex}: ${data.seedVariety}`);
    return data;
    
  } catch (err) {
    log(`❌ Error cargando datos: ${err.message}`, 'error');
    
    // Intentar usar cache antiguo si existe
    if (cached) {
      log(`⚠️ Usando cache antiguo como fallback`);
      return cached.data;
    }
    
    // Si no hay cache, usar fallback
    const fallback = {
      ...FALLBACK_DATA,
      seedVariety: `Planta ${plantIndex + 1} (Sin datos)`
    };
    
    plantDataCache.set(plantIndex, {
      data: fallback,
      lastUpdate: now,
      previousData: null
    });
    
    return fallback;
  }
}

/**
 * Obtiene los datos cacheados de una planta
 */
export function getCachedPlantData(plantIndex) {
  return plantDataCache.get(plantIndex);
}

/**
 * Limpia el caché de una planta específica
 */
export function clearPlantCache(plantIndex) {
  plantDataCache.delete(plantIndex);
  log(`Caché limpiado para planta ${plantIndex}`);
}

/**
 * Limpia todo el caché
 */
export function clearAllCache() {
  plantDataCache.clear();
  log('Caché completo limpiado');
}

/**
 * Pre-carga los datos de las plantas más comunes
 */
export async function preloadPlantData(count = 3) {
  log(`Pre-cargando datos de ${count} plantas...`);
  const promises = [];
  
  for (let i = 0; i < count; i++) {
    promises.push(loadPlantData(i).catch(err => {
      log(`Error pre-cargando planta ${i}: ${err.message}`, 'warn');
    }));
  }
  
  try {
    await Promise.all(promises);
    log(`✅ Pre-carga completa`);
  } catch (err) {
    log(`Error en pre-carga: ${err.message}`, 'warn');
  }
}

/**
 * NUEVA: Inicializa contrato con signer (MetaMask) para ESCRITURA
 */
async function getSignerContract() {
  if (typeof window === 'undefined') {
    throw new Error('Entorno sin ventana');
  }
  if (!window.ethereum) {
    throw new Error('MetaMask no está disponible');
  }

  // Solicitar cuentas
  await window.ethereum.request({ method: 'eth_requestAccounts' });

  const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
  const network = await web3Provider.getNetwork();

  // Cambiar de red si es necesario
  if (network.chainId !== CONFIG.blockchain.network.chainId) {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CONFIG.blockchain.network.chainIdHex }]
      });
    } catch (switchErr) {
      // Si la red no está agregada (código 4902), intentar agregarla
      if (switchErr && (switchErr.code === 4902 || switchErr.message?.includes('Unrecognized chain'))) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: CONFIG.blockchain.network.chainIdHex,
              chainName: CONFIG.blockchain.network.name,
              nativeCurrency: { name: 'Sepolia ETH', symbol: 'SEP', decimals: 18 },
              rpcUrls: [CONFIG.blockchain.network.rpcUrl],
              blockExplorerUrls: ['https://sepolia.etherscan.io']
            }]
          });
        } catch (addErr) {
          throw new Error('Agrega la red Sepolia en MetaMask e inténtalo de nuevo');
        }
      } else {
        throw new Error('Conecta MetaMask a Sepolia e inténtalo de nuevo');
      }
    }
  }

  const signer = web3Provider.getSigner();
  const contract = new ethers.Contract(
    CONFIG.blockchain.contractAddress,
    CONFIG.blockchain.contractABI,
    signer
  );
  return contract;
}

/**
 * NUEVA: Guarda datos de una planta en blockchain (setPlantData)
 */
export async function savePlantData(plantId, data) {
  try {
    const contract = await getSignerContract();
    const json = JSON.stringify(data);

    log(`⬆️ Enviando setPlantData(${plantId})...`);
    const tx = await contract.setPlantData(plantId, json);
    log(`📨 Tx enviada: ${tx.hash}`);

    const receipt = await tx.wait();
    log(`✅ Tx confirmada en bloque ${receipt.blockNumber}`);

    // Limpiar caché para forzar recarga fresca
    try { clearPlantCache(0); } catch {}
    return receipt;

  } catch (err) {
    log(`Error guardando en blockchain: ${err.message}`, 'error');
    throw err;
  }
}
