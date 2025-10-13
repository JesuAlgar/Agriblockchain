// ============================================
// GESTOR DE CÁMARA
// ============================================

import { CONFIG, STATE } from './config.js';
import { log } from './utils.js';

/**
 * Inicia el stream de la cámara
 * @param {HTMLVideoElement} videoElement - Elemento video donde mostrar el stream
 * @param {HTMLCanvasElement} canvasElement - Canvas para sincronizar dimensiones
 * @returns {Promise<void>}
 */
export async function startCamera(videoElement, canvasElement) {
  try {
    log('Solicitando acceso a la cámara...');
    
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: CONFIG.camera.facingMode,
        width: { ideal: CONFIG.camera.idealWidth },
        height: { ideal: CONFIG.camera.idealHeight }
      },
      audio: false
    });

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
    
    // Guardar referencia en el estado
    STATE.video = videoElement;
    STATE.canvas = canvasElement;
    STATE.ctx = canvasElement.getContext('2d');
    
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
 * Detiene el stream de la cámara
 */
export function stopCamera() {
  if (STATE.video && STATE.video.srcObject) {
    const tracks = STATE.video.srcObject.getTracks();
    tracks.forEach(track => track.stop());
    STATE.video.srcObject = null;
    log('Cámara detenida');
  }
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