// ============================================
// GESTOR DE CÁMARA CON ZOOM
// ============================================

import { CONFIG, STATE } from './config.js';
import { log } from './utils.js';

/**
 * Inicia el stream de la cámara CON SOPORTE DE ZOOM
 * @param {HTMLVideoElement} videoElement - Elemento video donde mostrar el stream
 * @param {HTMLCanvasElement} canvasElement - Canvas para sincronizar dimensiones
 * @returns {Promise<void>}
 */
export async function startCamera(videoElement, canvasElement) {
  try {
    log('Solicitando acceso a la cámara...');
    
    // ⭐ NUEVO: Configuración avanzada con zoom
    const constraints = {
      video: {
        facingMode: CONFIG.camera.facingMode,
        width: { ideal: CONFIG.camera.idealWidth },
        height: { ideal: CONFIG.camera.idealHeight },
        // ⭐ Soporte para zoom
        zoom: { ideal: CONFIG.camera.zoomLevel || 1 }
      },
      audio: false
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = stream;
    
    // Esperar a que el video esté listo
    await new Promise(resolve => {
      videoElement.onloadedmetadata = () => {
        videoElement.play();
        resolve();
      };
    });

    // Ajustar dimensiones del canvas al video
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;

    log(`✓ Cámara iniciada: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
    
    // ⭐ NUEVO: Detectar capacidades de zoom
    const settings = stream.getVideoTracks()[0].getSettings();
    STATE.cameraZoomCapabilities = {
      currentZoom: settings.zoom || 1,
      supported: stream.getVideoTracks()[0].getCapabilities().zoom !== undefined
    };
    
    if (STATE.cameraZoomCapabilities.supported) {
      log('✓ Zoom de cámara soportado');
    } else {
      log('⚠️ Zoom de cámara NO soportado en este dispositivo');
    }
    
    // Guardar referencias en el estado
    STATE.video = videoElement;
    STATE.canvas = canvasElement;
    STATE.ctx = canvasElement.getContext('2d');
    STATE.stream = stream;
    
  } catch (err) {
    log(`Error al acceder a la cámara: ${err.message}`, 'error');
    
    // Actualizar UI con el error
    const status = document.getElementById('status');
    if (status) {
      status.textContent = '⚠️ Error: No se pudo acceder a la cámara';
      status.classList.remove('detecting');
    }
    
    throw err;
  }
}

/**
 * ⭐ NUEVA: Aumentar zoom de la cámara
 * @param {number} step - Cantidad a aumentar (ej: 0.1)
 */
export async function increaseZoom(step = 0.1) {
  if (!STATE.stream) return false;
  
  try {
    const track = STATE.stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities();
    
    if (!capabilities.zoom) {
      log('⚠️ Zoom no soportado en este dispositivo', 'warn');
      return false;
    }
    
    const settings = track.getSettings();
    const currentZoom = settings.zoom || 1;
    const maxZoom = capabilities.zoom.max || 4;
    const newZoom = Math.min(currentZoom + step, maxZoom);
    
    await track.applyConstraints({
      advanced: [{ zoom: newZoom }]
    });
    
    CONFIG.camera.zoomLevel = newZoom;
    STATE.cameraZoomCapabilities.currentZoom = newZoom;
    
    log(`🔍 Zoom aumentado a: ${newZoom.toFixed(2)}x`);
    return true;
    
  } catch (err) {
    log(`Error ajustando zoom: ${err.message}`, 'warn');
    return false;
  }
}

/**
 * ⭐ NUEVA: Disminuir zoom de la cámara
 * @param {number} step - Cantidad a disminuir (ej: 0.1)
 */
export async function decreaseZoom(step = 0.1) {
  if (!STATE.stream) return false;
  
  try {
    const track = STATE.stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities();
    
    if (!capabilities.zoom) {
      log('⚠️ Zoom no soportado en este dispositivo', 'warn');
      return false;
    }
    
    const settings = track.getSettings();
    const currentZoom = settings.zoom || 1;
    const minZoom = capabilities.zoom.min || 1;
    const newZoom = Math.max(currentZoom - step, minZoom);
    
    await track.applyConstraints({
      advanced: [{ zoom: newZoom }]
    });
    
    CONFIG.camera.zoomLevel = newZoom;
    STATE.cameraZoomCapabilities.currentZoom = newZoom;
    
    log(`🔍 Zoom disminuido a: ${newZoom.toFixed(2)}x`);
    return true;
    
  } catch (err) {
    log(`Error ajustando zoom: ${err.message}`, 'warn');
    return false;
  }
}

/**
 * ⭐ NUEVA: Obtener nivel de zoom actual
 * @returns {number} - Nivel de zoom actual (ej: 1.0, 2.0, etc)
 */
export function getCurrentZoom() {
  return STATE.cameraZoomCapabilities?.currentZoom || 1;
}

/**
 * ⭐ NUEVA: Reset zoom a nivel normal
 */
export async function resetZoom() {
  if (!STATE.stream) return false;
  
  try {
    const track = STATE.stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities();
    
    if (!capabilities.zoom) return false;
    
    const minZoom = capabilities.zoom.min || 1;
    
    await track.applyConstraints({
      advanced: [{ zoom: minZoom }]
    });
    
    CONFIG.camera.zoomLevel = minZoom;
    STATE.cameraZoomCapabilities.currentZoom = minZoom;
    
    log(`🔍 Zoom reseteado a: ${minZoom}x`);
    return true;
    
  } catch (err) {
    log(`Error reseteando zoom: ${err.message}`, 'warn');
    return false;
  }
}

/**
 * Detiene el stream de la cámara
 */
export function stopCamera() {
  if (STATE.stream) {
    const tracks = STATE.stream.getTracks();
    tracks.forEach(track => track.stop());
    STATE.stream = null;
  }
  
  if (STATE.video) {
    STATE.video.srcObject = null;
  }
  
  log('Cámara detenida');
}

/**
 * Verifica si la cámara está activa
 * @returns {boolean}
 */
export function isCameraActive() {
  return STATE.video && STATE.video.srcObject && STATE.video.readyState === 4;
}

/**
 * Cambia entre cámara frontal y trasera (si está disponible)
 */
export async function switchCamera() {
  const currentFacing = CONFIG.camera.facingMode;
  CONFIG.camera.facingMode = currentFacing === 'environment' ? 'user' : 'environment';
  
  stopCamera();
  
  if (STATE.video && STATE.canvas) {
    await startCamera(STATE.video, STATE.canvas);
  }
  
  log(`Cámara cambiada a: ${CONFIG.camera.facingMode}`);
}