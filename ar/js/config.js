// ============================================
// CONFIGURACIÃ“N GLOBAL MEJORADA
// ============================================

export const CONFIG = {
  // Intervalos de tiempo (ms)
  detectionInterval: 800,
  dataUpdateInterval: 5000,
  
  // Umbrales de alerta para sensores
  alertThresholds: {
    temp_c: { min: 15, max: 30 },
    hum_pct: { min: 40, max: 80 },
    soil_moist_pct: { min: 30, max: 70 },
    battery_pct: { min: 20, max: 100 }
  },
  
  // â­ MEJORADO: ConfiguraciÃ³n de cÃ¡mara CON ZOOM
  camera: {
    facingMode: 'environment',
    idealWidth: 1280,
    idealHeight: 720,
    zoomLevel: 1, // â­ NUEVO: Nivel de zoom inicial
    zoomStep: 0.2, // â­ NUEVO: Paso de zoom (20%)
    minZoom: 1,
    maxZoom: 4
  },
  
  // ConfiguraciÃ³n del modelo de IA
  model: {
    base: 'mobilenet_v2',
    forceWasmOnMobile: false,
    
    // â­ EXPANDIDO: Ahora detecta PLANTAS, ÃRBOLES y ARBUSTOS
    // Clases que detecta COCO-SSD
    plantClasses: [
      // Plantas pequeÃ±as/macetas
      'potted plant',
      'vase',
      'plant',
      
      // â­ NUEVAS: Plantas y Ã¡rboles mÃ¡s grandes
      'tree',          // Ãrboles
      'bush',          // Arbustos
      'shrub',         // Arbustos (alias)
      'cactus',        // Cactus
      'succulent',     // Plantas suculentas
      'fern',          // Helechos
      'herb',          // Plantas de hierba
      'flower',        // Flores grandes
      'ivy',           // Hiedra
      'climbing plant' // Plantas trepadoras
    ],
    
    // â­ NUEVO: Umbral mÃ­nimo de confianza (0-1)
    // MÃ¡s bajo = mÃ¡s detecciones, mÃ¡s alto = solo las muy seguras
    confidenceThreshold: 0.4 // 40% de confianza mÃ­nima
  },
  
  // ConfiguraciÃ³n de UI
  ui: {
    panelOffset: 20,
    panelWidth: 220,
    alertDuration: 5000,
    alertCooldown: 30000
  },
  
  // Configuración blockchain (estado actual)
  blockchain: {
    mode: 'BLOCKCHAIN',
    network: {
      name: 'Sepolia',
      chainId: 11155111,
      chainIdHex: '0xaa36a7',
      rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com'
    },
    explorer: 'https://sepolia.etherscan.io',
    contractAddress: '0x2299b2eEc07A9c406C2688EeB6c7c74f92e3dA42',
    contractABI: [
      {
        "inputs": [
          {"internalType": "string", "name": "_plantId", "type": "string"},
          {"internalType": "string", "name": "_json", "type": "string"}
        ],
        "name": "setPlantData",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [{"internalType": "string", "name": "_plantId", "type": "string"}],
        "name": "getPlantData",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{"internalType": "string", "name": "_plantId", "type": "string"}],
        "name": "plantExists",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
      }
    ]
  },
  
  // Contrato de histórico (eventos append-only)
  events: {
    contractAddress: 'REPLACE_WITH_DEPLOYED_ADDRESS',
    abi: [
      {
        "anonymous": false,
        "inputs": [
          { "indexed": true, "internalType": "string", "name": "plantId", "type": "string" },
          { "indexed": true, "internalType": "string", "name": "eventType", "type": "string" },
          { "indexed": true, "internalType": "address", "name": "recordedBy", "type": "address" },
          { "indexed": false, "internalType": "string", "name": "jsonPayload", "type": "string" },
          { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" },
          { "indexed": false, "internalType": "uint256", "name": "idx", "type": "uint256" }
        ],
        "name": "PlantEvent",
        "type": "event"
      },
      {
        "inputs": [
          { "internalType": "string", "name": "plantId", "type": "string" },
          { "internalType": "string", "name": "eventType", "type": "string" },
          { "internalType": "string", "name": "jsonPayload", "type": "string" }
        ],
        "name": "addPlantEvent",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [{ "internalType": "string", "name": "plantId", "type": "string" }],
        "name": "getEventCount",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
      }
    ]
  },
  // WalletConnect
  walletConnect: {
    projectId: '52a58f37420c2c8eed772823a7e37667', // Pega aquÃ­ tu Project ID de cloud.walletconnect.com
    metadata: {
      name: 'AgriBlockchain',
      description: 'AR + IA + Blockchain',
      url: 'https://agriblockchain-uuew.vercel.app',
      icon: './assets/plant.png'
    }
  }
};

// Obtener ID de planta desde URL
export function getPlantIdFromURL() {
  const params = new URLSearchParams(location.search);
  return params.get('batch') || params.get('id') || 'planta01';
}

export function setPlantIdInURL(newId) {
  try {
    if (!newId || typeof history === 'undefined') return;
    const cleanId = newId.trim();
    if (!cleanId) return;
    const url = new URL(window.location.href);
    url.searchParams.set('batch', cleanId);
    url.searchParams.delete('id');
    history.replaceState({}, '', url);
  } catch {}
}

export function getEventIdFromURL() {
  const params = new URLSearchParams(location.search);
  return params.get('event');
}

export function setEventIdInURL(eventId) {
  try {
    if (typeof history === 'undefined') return;
    const url = new URL(window.location.href);
    if (eventId) url.searchParams.set('event', eventId);
    else url.searchParams.delete('event');
    history.replaceState({}, '', url);
  } catch {}
}

// â­ MEJORADO: Estado global compartido
export const STATE = {
  currentTheme: 'dark',
  model: null,
  video: null,
  canvas: null,
  ctx: null,
  container: null,
  stream: null, // â­ NUEVO: Stream de video
  lastDetectionTime: 0,
  detectionCount: 0,
  alertShown: new Set(),
  panelRegion: null,
  
  // â­ NUEVO: Capacidades de zoom
  cameraZoomCapabilities: {
    supported: false,
    currentZoom: 1
  },
  
  // Estado blockchain
  blockchainProvider: null,
  blockchainContract: null,
  blockchainConnected: false,

  history: {
    events: [],
    filter: 'ALL',
    counts: {},
    lastBlock: 0,
    plantId: null,
    loading: false,
    debug: false,
    metrics: null,
    pendingEventId: null
  }
};
