// ============================================
// APLICACIÓN PRINCIPAL
// ============================================

import { CONFIG, STATE } from './config.js';
import { log } from './utils.js';
import { preloadPlantData } from './dataManager.js';
import { startCamera, increaseZoom, decreaseZoom, resetZoom, getCurrentZoom } from './camera.js';
import { loadModel, detect } from './detector.js';
import { toggleTheme, toggleFullscreen } from './ui.js';

/**
 * Inicializa los event listeners de los controles
 */
function initControls() {
  // Botón cambiar tema
  const btnTheme = document.getElementById('btnTheme');
  if (btnTheme) {
    btnTheme.addEventListener('click', toggleTheme);
    log('✓ Control de tema inicializado');
  }

  // Botón pantalla completa
  const btnFullscreen = document.getElementById('btnFullscreen');
  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', toggleFullscreen);
    log('✓ Control de pantalla completa inicializado');
  }
}

// Controles de zoom
function initZoomControls() {
  const btnZoomIn = document.getElementById('btnZoomIn');
  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', async () => {
      await increaseZoom(CONFIG.camera.zoomStep);
      updateZoomIndicator();
    });
    log('Control Zoom + inicializado');
  }
  const btnZoomOut = document.getElementById('btnZoomOut');
  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', async () => {
      await decreaseZoom(CONFIG.camera.zoomStep);
      updateZoomIndicator();
    });
    log('Control Zoom - inicializado');
  }
  const btnZoomReset = document.getElementById('btnZoomReset');
  if (btnZoomReset) {
    btnZoomReset.addEventListener('click', async () => {
      await resetZoom();
      updateZoomIndicator();
    });
    log('Control Reset Zoom inicializado');
  }
}

function updateZoomIndicator() {
  const indicator = document.getElementById('zoomIndicator');
  if (!indicator) return;
  const z = getCurrentZoom();
  try {
    indicator.textContent = `Zoom: ${z.toFixed(1)}x`;
  } catch {
    indicator.textContent = `Zoom: ${z}x`;
  }
}

/**
 * Registra el Service Worker para PWA
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(() => log('✓ Service Worker registrado'))
      .catch(err => log(`Service Worker no disponible: ${err.message}`, 'warn'));
  }
}

/**
 * Inicialización principal de la aplicación
 */
async function init() {
  try {
    log('=== Iniciando AR Planta IA ===');
    
    // Obtener referencias a elementos del DOM
    const video = document.getElementById('camera');
    const canvas = document.getElementById('canvas');
    const container = document.getElementById('container');
    
    if (!video || !canvas || !container) {
      throw new Error('Elementos del DOM no encontrados');
    }
    
    // Guardar referencias en el estado global
    STATE.container = container;
    
    // ⭐ LIMPIAR paneles antiguos que puedan existir
    document.querySelectorAll('.data-panel').forEach(panel => panel.remove());
    log('✓ Paneles antiguos limpiados');
    
    // Paso 1: Inicializar controles
    log('1/5 Inicializando controles...');
    initControls();
    initZoomControls();
    
    // Paso 2: Registrar Service Worker
    log('2/5 Registrando Service Worker...');
    registerServiceWorker();
    
    // Paso 3: Iniciar cámara
    log('3/5 Iniciando cámara...');
    await startCamera(video, canvas);
    updateZoomIndicator();
    
    // Paso 4: Cargar modelo de IA
    log('4/5 Cargando modelo de IA...');
    await loadModel();
    
    // Paso 5: Pre-cargar datos (opcional, mejora rendimiento inicial)
    log('5/5 Pre-cargando datos...');
    await preloadPlantData(2); // Pre-cargar 2 plantas
    
    // Iniciar loop de detección
    log('✓ Inicialización completa. Iniciando detección...');
    detect();
    
  } catch (err) {
    log(`Error crítico en inicialización: ${err.message}`, 'error');
    
    // Mostrar error en UI
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = `⚠️ Error: ${err.message}`;
    }
  }
}

// Iniciar aplicación cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Manejar errores no capturados
window.addEventListener('error', (event) => {
  log(`Error no capturado: ${event.message}`, 'error');
});

window.addEventListener('unhandledrejection', (event) => {
  log(`Promise rechazada: ${event.reason}`, 'error');
});
