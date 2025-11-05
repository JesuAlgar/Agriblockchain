// ============================================
// CONFIGURACIÓN GLOBAL MEJORADA
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
  
  // ⭐ MEJORADO: Configuración de cámara CON ZOOM
  camera: {
    facingMode: 'environment',
    idealWidth: 1280,
    idealHeight: 720,
    zoomLevel: 1, // ⭐ NUEVO: Nivel de zoom inicial
    zoomStep: 0.2, // ⭐ NUEVO: Paso de zoom (20%)
    minZoom: 1,
    maxZoom: 4
  },
  
  // Configuración del modelo de IA
  model: {
    base: 'mobilenet_v2',
    
    // ⭐ EXPANDIDO: Ahora detecta PLANTAS, ÁRBOLES y ARBUSTOS
    // Clases que detecta COCO-SSD
    plantClasses: [
      // Plantas pequeñas/macetas
      'potted plant',
      'vase',
      'plant',
      
      // ⭐ NUEVAS: Plantas y árboles más grandes
      'tree',          // Árboles
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
    
    // ⭐ NUEVO: Umbral mínimo de confianza (0-1)
    // Más bajo = más detecciones, más alto = solo las muy seguras
    confidenceThreshold: 0.4 // 40% de confianza mínima
  },
  
  // Configuración de UI
  ui: {
    panelOffset: 20,
    panelWidth: 220,
    alertDuration: 5000,
    alertCooldown: 30000
  },
  
  // Configuración blockchain
  blockchain: {
    mode: 'BLOCKCHAIN',
    
    network: {
      name: 'Sepolia',
      chainId: 11155111,
      chainIdHex: '0xaa36a7',
      rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com'
    },
    
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
  }
};

// Obtener ID de planta desde URL
export function getPlantIdFromURL() {
  const params = new URLSearchParams(location.search);
  return params.get('id') || 'planta01';
}

// ⭐ MEJORADO: Estado global compartido
export const STATE = {
  currentTheme: 'dark',
  model: null,
  video: null,
  canvas: null,
  ctx: null,
  container: null,
  stream: null, // ⭐ NUEVO: Stream de video
  lastDetectionTime: 0,
  detectionCount: 0,
  alertShown: new Set(),
  
  // ⭐ NUEVO: Capacidades de zoom
  cameraZoomCapabilities: {
    supported: false,
    currentZoom: 1
  },
  
  // Estado blockchain
  blockchainProvider: null,
  blockchainContract: null,
  blockchainConnected: false
};
