// ============================================
// CONFIGURACIÓN GLOBAL
// ============================================

export const CONFIG = {
  // Intervalos de tiempo (ms)
  detectionInterval: 800,      // Tiempo entre detecciones de IA (aumentado para evitar parpadeos)
  dataUpdateInterval: 5000,    // Tiempo entre actualizaciones de datos del servidor
  
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
    // Clases que se consideran como plantas
    plantClasses: ['potted plant', 'vase', 'plant']
  },
  
  // Configuración de UI
  ui: {
    panelOffset: 20,           // Píxeles de separación (no usado en posición fija)
    panelWidth: 220,           // Ancho del panel de datos
    alertDuration: 5000,       // Duración de alertas (ms)
    alertCooldown: 30000       // Tiempo antes de poder mostrar la misma alerta (ms)
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
  alertShown: new Set()
};