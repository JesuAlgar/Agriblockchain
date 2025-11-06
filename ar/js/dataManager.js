// ============================================
// GESTOR DE DATOS Y CACHÃ‰
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

// CachÃ© de datos de plantas
const plantDataCache = new Map();

/**
 * â­ NUEVA: Inicializar conexiÃ³n a blockchain
 */
async function initBlockchain() {
  if (STATE.blockchainConnected) {
    return true; // Ya conectado
  }

  try {
    log('Inicializando conexiÃ³n a blockchain...');

    // Verificar que ethers estÃ© disponible
    if (typeof window.ethers === 'undefined') {
      throw new Error('Ethers.js no estÃ¡ cargado');
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

    log('âœ… Blockchain conectado a Sepolia');
    return true;

  } catch (err) {
    log(`Error conectando a blockchain: ${err.message}`, 'error');
    STATE.blockchainConnected = false;
    return false;
  }
}

/**
 * â­ NUEVA: Cargar datos desde blockchain
 */
async function loadFromBlockchain(plantId) {
  try {
    // Asegurar que blockchain estÃ¡ conectado
    const connected = await initBlockchain();
    if (!connected) {
      throw new Error('No se pudo conectar a blockchain');
    }

    log(`ðŸ“– Leyendo datos de blockchain para: ${plantId}`);

    // Verificar si la planta existe
    const exists = await STATE.blockchainContract.plantExists(plantId);
    
    if (!exists) {
      log(`âš ï¸ Planta ${plantId} no encontrada en blockchain`, 'warn');
      throw new Error('Planta no encontrada en blockchain');
    }

    // Leer datos de la planta
    const jsonData = await STATE.blockchainContract.getPlantData(plantId);
    
    // Parsear JSON
    const data = JSON.parse(jsonData);
    
    log(`âœ… Datos de blockchain leÃ­dos: ${data.seedVariety}`);
    
    return data;

  } catch (err) {
    log(`Error leyendo blockchain: ${err.message}`, 'error');
    throw err;
  }
}

/**
 * â­ MODIFICADA: Cargar datos desde JSON local
 */
async function loadFromLocalJSON(plantId) {
  const url = `./data/${encodeURIComponent(plantId)}.json`;
  
  try {
    log(`ðŸ“– Cargando datos locales desde ${url}`);
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    log(`âœ… Datos locales cargados: ${data.seedVariety}`);
    return data;
    
  } catch (err) {
    log(`Error cargando JSON local: ${err.message}`, 'warn');
    throw err;
  }
}

/**
 * â­ MODIFICADA: Carga los datos de una planta (con cachÃ©)
 * Ahora soporta BLOCKCHAIN o LOCAL_JSON segÃºn configuraciÃ³n
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
    log(`Usando datos en cachÃ© para planta ${plantIndex}`);
    return cached.data;
  }

  // Determinar el ID del archivo/blockchain
  const plantId = getPlantIdFromURL();
  
  try {
    let data;

    // â­ SELECCIONAR FUENTE DE DATOS
    if (CONFIG.blockchain.mode === 'BLOCKCHAIN') {
      log(`ðŸ”— Modo BLOCKCHAIN activado para ${plantId}`);
      data = await loadFromBlockchain(plantId);
    } else {
      log(`ðŸ“ Modo LOCAL_JSON activado para ${plantId}`);
      data = await loadFromLocalJSON(plantId);
    }
    
    // Guardar en cache
    plantDataCache.set(plantIndex, {
      data: data,
      lastUpdate: now,
      previousData: cached ? cached.data : null
    });
    
    log(`âœ… Datos cargados para planta ${plantIndex}: ${data.seedVariety}`);
    return data;
    
  } catch (err) {
    log(`âŒ Error cargando datos: ${err.message}`, 'error');
    
    // Intentar usar cache antiguo si existe
    if (cached) {
      log(`âš ï¸ Usando cache antiguo como fallback`);
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
 * Limpia el cachÃ© de una planta especÃ­fica
 */
export function clearPlantCache(plantIndex) {
  plantDataCache.delete(plantIndex);
  log(`CachÃ© limpiado para planta ${plantIndex}`);
}

/**
 * Limpia todo el cachÃ©
 */
export function clearAllCache() {
  plantDataCache.clear();
  log('CachÃ© completo limpiado');
}

/**
 * Pre-carga los datos de las plantas mÃ¡s comunes
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
    log(`âœ… Pre-carga completa`);
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
    throw new Error('MetaMask no estÃ¡ disponible');
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
      // Si la red no estÃ¡ agregada (cÃ³digo 4902), intentar agregarla
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
          throw new Error('Agrega la red Sepolia en MetaMask e intÃ©ntalo de nuevo');
        }
      } else {
        throw new Error('Conecta MetaMask a Sepolia e intÃ©ntalo de nuevo');
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
 * NUEVA: Carga del MetaMask SDK desde archivo local vendorizado
 */
async function __loadMetaMaskSDK() {
  throw new Error('MetaMask SDK no cargado. Incluye ./assets/metamask-sdk.min.js en index.html');
}
async function getSignerContractSDK() {
  if (typeof window === 'undefined') {
    throw new Error('Entorno sin ventana');
  }

  let ethProvider = null;

  // Intentar usar window.ethereum primero (extensión o app ya inyectada)
  if (window.ethereum) {
    log('[MetaMask] Usando provider ya inyectado (extensión o app)');
    ethProvider = window.ethereum;
  } else {
    // Si no hay provider, cargar SDK para abrir MetaMask app
    try {
      log('[MetaMask] No hay provider inyectado, cargando SDK...');
      const SDKMod = await __loadMetaMaskSDK();
      const SDKCtor = SDKMod.default || SDKMod;

      log('[MetaMask SDK] Inicializando (deeplink habilitado)...');
      const MMSDK = new SDKCtor({
        dappMetadata: { name: 'AgriBlockchain', url: location.origin },
        useDeeplink: true,
        checkInstallationImmediately: false
      });

      ethProvider = MMSDK.getProvider();
      log('[MetaMask SDK] ✅ Provider obtenido del SDK');
    } catch (e) {
      log(`[MetaMask SDK] ❌ Error: ${e.message}`, 'error');
      if (e.stack) {
        console.error('[MetaMask SDK] Stack trace:', e.stack);
      }
      throw new Error(`No se pudo inicializar MetaMask SDK: ${e.message}`);
    }
  }
  if (!ethProvider) {
    throw new Error('MetaMask no estÃ¡ disponible');
  }
  await ethProvider.request({ method: 'eth_requestAccounts' });
  const web3Provider = new ethers.providers.Web3Provider(ethProvider, 'any');
  const network = await web3Provider.getNetwork();
  if (network.chainId !== CONFIG.blockchain.network.chainId) {
    try {
      await ethProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CONFIG.blockchain.network.chainIdHex }]
      });
    } catch (switchErr) {
      if (switchErr && (switchErr.code === 4902 || switchErr.message?.includes('Unrecognized chain'))) {
        try {
          await ethProvider.request({
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
          throw new Error('Agrega la red Sepolia en MetaMask e intÃ©ntalo de nuevo');
        }
      } else {
        throw new Error('Conecta MetaMask a Sepolia e intÃ©ntalo de nuevo');
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
    log('[Blockchain] Iniciando guardado para plantId: ' + plantId);

    const contract = await getSignerContractSDK();
    const json = JSON.stringify(data);

    log('[Blockchain] Enviando setPlantData(' + plantId + ')...');
    log('[Blockchain] Datos: ' + json.substring(0, 100) + '...');

    const tx = await contract.setPlantData(plantId, json);
    const txHash = tx.hash;
    log('[Blockchain] Tx enviada - Hash: ' + txHash);
    log('[Blockchain] Ver en Etherscan: https://sepolia.etherscan.io/tx/' + txHash);

    log('[Blockchain] Esperando confirmacion...');
    const receipt = await tx.wait();
    log('[Blockchain] Tx confirmada en bloque ' + receipt.blockNumber);
    log('[Blockchain] Gas usado: ' + receipt.gasUsed.toString());

    // Limpiar cache para forzar recarga fresca
    try { clearPlantCache(0); } catch {}

    return receipt;

  } catch (err) {
    log('[Blockchain] Error guardando: ' + err.message, 'error');
    if (err.stack) {
      console.error('[Blockchain] Stack trace:', err.stack);
    }
    throw err;
  }
}






