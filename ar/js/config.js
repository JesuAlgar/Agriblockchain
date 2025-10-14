// ============================================
// CONFIGURACIÓN GLOBAL
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
  
  // Configuración de cámara
  camera: {
    facingMode: 'environment',
    idealWidth: 1280,
    idealHeight: 720
  },
  
  // Configuración del modelo de IA
  model: {
    base: 'mobilenet_v2',
    plantClasses: ['potted plant', 'vase', 'plant']
  },
  
  // Configuración de UI
  ui: {
    panelOffset: 20,
    panelWidth: 220,
    alertDuration: 5000,
    alertCooldown: 30000
  },
  
  // ⭐ CONFIGURACIÓN BLOCKCHAIN CON ANKR
  blockchain: {
    // Modo: 'LOCAL_JSON' o 'BLOCKCHAIN'
    mode: 'BLOCKCHAIN',
    
    // Configuración de Sepolia con RPC de Ankr
    network: {
      name: 'Sepolia',
      chainId: 11155111,
      chainIdHex: '0xaa36a7',
      rpcUrl: 'https://rpc.ankr.com/eth_sepolia'
    },
    
    // Tu contrato desplegado
    contractAddress: '0x2299b2eEc07A9c406C2688EeB6c7c74f92e3dA42',
    
    // ABI del contrato (solo las funciones que necesitamos)
    contractABI: [
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

// Estado global compartido
export const STATE = {
  currentTheme: 'dark',
  model: null,
  video: null,
  canvas: null,
  ctx: null,
  container: null,
  lastDetectionTime: 0,
  detectionCount: 0,
  alertShown: new Set(),
  
  // Estado blockchain
  blockchainProvider: null,
  blockchainContract: null,
  blockchainConnected: false
};