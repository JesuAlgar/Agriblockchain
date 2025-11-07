// ============================================
// CAMERA MANAGER WITH ZOOM
// ============================================

import { CONFIG, STATE } from './config.js';
import { log } from './utils.js';

/**
 * Starts camera stream with zoom support
 * @param {HTMLVideoElement} videoElement - Video element for stream
 * @param {HTMLCanvasElement} canvasElement - Canvas for sync dimensions
 * @returns {Promise<void>}
 */
export async function startCamera(videoElement, canvasElement) {
  try {
    log('Requesting camera access...');
    
    // Camera constraints - flexible
    const constraints = {
      video: {
        facingMode: { ideal: CONFIG.camera.facingMode || 'environment' },
        width: { ideal: CONFIG.camera.idealWidth },
        height: { ideal: CONFIG.camera.idealHeight }
      },
      audio: false
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = stream;
    
    // Wait for video to be ready
    await new Promise(resolve => {
      videoElement.onloadedmetadata = () => {
        videoElement.play();
        resolve();
      };
    });

    // Adjust canvas to video dimensions
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;

    log(`[Camera] Started: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
    
    // Detect zoom capabilities
    const settings = stream.getVideoTracks()[0].getSettings();
    STATE.cameraZoomCapabilities = {
      currentZoom: settings.zoom || 1,
      supported: stream.getVideoTracks()[0].getCapabilities().zoom !== undefined
    };
    
    if (STATE.cameraZoomCapabilities.supported) {
      log('[Camera] Zoom supported');
    } else {
      log('[Camera] Zoom NOT supported on this device');
    }
    
    // Store references
    STATE.video = videoElement;
    STATE.canvas = canvasElement;
    STATE.ctx = canvasElement.getContext('2d');
    STATE.stream = stream;
    
  } catch (err) {
    log(`[Camera] Error: ${err.message}`, 'error');
    
    // Update UI with error
    const status = document.getElementById('status');
    if (status) {
      status.textContent = 'Error: Could not access camera';
      status.classList.remove('detecting');
    }
    
    throw err;
  }
}

/**
 * Increase camera zoom
 * @param {number} step - Zoom increment (e.g., 0.1)
 */
export async function increaseZoom(step = 0.1) {
  if (!STATE.stream) return false;
  
  try {
    const track = STATE.stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities();
    
    if (!capabilities.zoom) {
      // Fallback CSS scale (aplica a video + canvas)
      const current = STATE.cameraZoomCapabilities.currentZoom || 1;
      const maxZoom = CONFIG.camera.maxZoom || 4;
      const newZoom = Math.min(current + step, maxZoom);
      applyCssZoom(newZoom);
      CONFIG.camera.zoomLevel = newZoom;
      STATE.cameraZoomCapabilities.currentZoom = newZoom;
      log(`[Camera] (CSS) Zoom: ${newZoom.toFixed(2)}x`);
      return true;
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
    
    log(`[Camera] Zoom: ${newZoom.toFixed(2)}x`);
    return true;
    
  } catch (err) {
    log(`[Camera] Zoom error: ${err.message}`, 'warn');
    return false;
  }
}

/**
 * Decrease camera zoom
 * @param {number} step - Zoom decrement (e.g., 0.1)
 */
export async function decreaseZoom(step = 0.1) {
  if (!STATE.stream) return false;
  
  try {
    const track = STATE.stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities();
    
    if (!capabilities.zoom) {
      // Fallback CSS scale
      const current = STATE.cameraZoomCapabilities.currentZoom || 1;
      const minZoom = CONFIG.camera.minZoom || 1;
      const newZoom = Math.max(current - step, minZoom);
      applyCssZoom(newZoom);
      CONFIG.camera.zoomLevel = newZoom;
      STATE.cameraZoomCapabilities.currentZoom = newZoom;
      log(`[Camera] (CSS) Zoom: ${newZoom.toFixed(2)}x`);
      return true;
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
    
    log(`[Camera] Zoom: ${newZoom.toFixed(2)}x`);
    return true;
    
  } catch (err) {
    log(`[Camera] Zoom error: ${err.message}`, 'warn');
    return false;
  }
}

/**
 * Get current zoom level
 * @returns {number} - Current zoom (e.g., 1.0, 2.0)
 */
export function getCurrentZoom() {
  return STATE.cameraZoomCapabilities?.currentZoom || 1;
}

/**
 * Reset zoom to default
 */
export async function resetZoom() {
  if (!STATE.stream) return false;
  
  try {
    const track = STATE.stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities();
    
    if (!capabilities.zoom) {
      const minZoom = CONFIG.camera.minZoom || 1;
      applyCssZoom(minZoom);
      CONFIG.camera.zoomLevel = minZoom;
      STATE.cameraZoomCapabilities.currentZoom = minZoom;
      log(`[Camera] (CSS) Zoom reset: ${minZoom}x`);
      return true;
    }
    
    const minZoom = capabilities.zoom.min || 1;
    
    await track.applyConstraints({
      advanced: [{ zoom: minZoom }]
    });
    
    CONFIG.camera.zoomLevel = minZoom;
    STATE.cameraZoomCapabilities.currentZoom = minZoom;
    
    log(`[Camera] Zoom reset: ${minZoom}x`);
    return true;
    
  } catch (err) {
    log(`[Camera] Reset error: ${err.message}`, 'warn');
    return false;
  }
}

/**
 * Stop camera stream
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
  
  log('[Camera] Stopped');
}

/**
 * Check if camera is active
 * @returns {boolean}
 */
export function isCameraActive() {
  return STATE.video && STATE.video.srcObject && STATE.video.readyState === 4;
}

/**
 * Switch between front and back camera
 */
export async function switchCamera() {
  const currentFacing = CONFIG.camera.facingMode;
  CONFIG.camera.facingMode = currentFacing === 'environment' ? 'user' : 'environment';
  
  stopCamera();
  
  if (STATE.video && STATE.canvas) {
    await startCamera(STATE.video, STATE.canvas);
  }
  
  log(`[Camera] Switched to: ${CONFIG.camera.facingMode}`);
}

// --------------------------------------------
// Helpers: CSS Zoom fallback
// --------------------------------------------
function applyCssZoom(scale = 1) {
  try {
    if (STATE.video) {
      STATE.video.style.transformOrigin = 'center center';
      STATE.video.style.transform = `scale(${scale})`;
    }
    if (STATE.canvas) {
      STATE.canvas.style.transformOrigin = 'center center';
      STATE.canvas.style.transform = `scale(${scale})`;
    }
  } catch {}
}
