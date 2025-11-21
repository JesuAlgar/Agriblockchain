// ============================================
// DETECTOR DE PLANTAS CON IA - OPTIMIZADO
// ============================================

import { CONFIG, STATE } from './config.js';
import { log } from './utils.js';
import { 
  updateInstructions,
  hideInactivePanels 
} from './ui.js';

// Tracking de última detección de cada planta
const plantLastSeen = new Map();
const PANEL_PERSIST_TIME = 3000;

/**
 * ✨ OPTIMIZADO: Carga el modelo de detección COCO-SSD
 * Usa modelo más ligero en móviles para cargar más rápido
 * @returns {Promise<void>}
 */
export async function loadModel() {
  try {
    const statusElement = document.getElementById('status');
    const loadingElement = document.getElementById('loading');
    
    if (statusElement) {
      statusElement.textContent = 'Cargando modelo de IA...';
    }
    
    log('Cargando modelo COCO-SSD...');

    // Preparar backend de TensorFlow con cadena robusta: webgl -> wasm -> cpu
    if (typeof tf !== 'undefined') {
      try {
        await tf.ready();
        let backend = tf.getBackend();

        // 1) Intentar WebGL primero
        try {
          if (backend !== 'webgl' && tf.findBackend && tf.findBackend('webgl')) {
            await tf.setBackend('webgl');
            await tf.ready();
            backend = tf.getBackend();
          }
        } catch {}

        // 2) Si no hay WebGL, caer directamente a CPU (evitar CORS de WASM en algunos CDNs)
        if (backend !== 'webgl') {
          try {
            await tf.setBackend('cpu');
            await tf.ready();
            backend = tf.getBackend();
          } catch {}
        }

        log(`Backend TF activo: ${backend}`);
      } catch (e) {
        log(`No se pudo preparar backend TF: ${e.message}`, 'warn');
      }
    }
    
    // ✨ OPTIMIZACIÓN 1: Detectar si es móvil
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // NO forzar WASM en móvil: usar WASM solo si WebGL no está disponible
    if (typeof tf !== 'undefined') {
      try {
        const backend = tf.getBackend && tf.getBackend();
        if (backend !== 'webgl') {
          log(`Backend TF activo: ${backend} (sin forzar wasm en móvil)`);
        }
      } catch {}
    }
    
    // ✨ OPTIMIZACIÓN 2: Usar modelo más ligero en móvil
    const modelConfig = {
      base: isMobile ? 'lite_mobilenet_v2' : 'mobilenet_v2'  // lite = más rápido pero menos preciso
    };
    
    log(`Dispositivo: ${isMobile ? 'Móvil' : 'PC'} - Usando modelo: ${modelConfig.base}`);
    
    // ✨ OPTIMIZACIÓN 3: Mostrar progreso de carga
    if (loadingElement) {
      const progressText = loadingElement.querySelector('small') || document.createElement('small');
      progressText.textContent = isMobile 
        ? 'Cargando modelo ligero para móvil...' 
        : 'Cargando modelo completo...';
      loadingElement.appendChild(progressText);
    }
    
    // Cargar modelo con timeout más largo (60s para móviles lentos)
    const loadPromise = (typeof cocoSsd !== 'undefined' && cocoSsd.load)
      ? cocoSsd.load(modelConfig)
      : Promise.reject(new Error('coco-ssd no disponible'));

    // Timeout más largo (60 segundos) + feedback cada 5 segundos
    let progressInterval;
    const timeoutPromise = new Promise((_, reject) => {
      let elapsed = 0;
      progressInterval = setInterval(() => {
        elapsed += 5000;
        if (loadingElement) {
          const progressText = loadingElement.querySelector('small');
          if (progressText) {
            progressText.textContent = `Cargando modelo... (${Math.floor(elapsed/1000)}s)`;
          }
        }
        log(`Cargando modelo... ${elapsed/1000}s`);

        if (elapsed >= 60000) {
          clearInterval(progressInterval);
          reject(new Error('Timeout cargando modelo (60s). Intenta recargar o usa otro navegador.'));
        }
      }, 5000);
    });

    try {
      STATE.model = await Promise.race([loadPromise, timeoutPromise]);
      if (progressInterval) clearInterval(progressInterval);
    } catch (err) {
      if (progressInterval) clearInterval(progressInterval);
      throw err;
    }
    
    if (loadingElement) {
      loadingElement.classList.add('hidden');
    }
    
    if (statusElement) {
      statusElement.textContent = '✓ IA lista - Buscando plantas...';
      statusElement.classList.add('detecting');
    }
    
    log(`✓ Modelo COCO-SSD cargado correctamente (${modelConfig.base})`);
    
  } catch (err) {
    log(`Error al cargar el modelo: ${err.message}`, 'error');

    const statusElement = document.getElementById('status');
    const loadingElement2 = document.getElementById('loading');

    if (statusElement) {
      statusElement.textContent = '⚠️ Error al cargar IA';
      statusElement.innerHTML = `
        ⚠️ Error al cargar IA<br>
        <small style="font-size: 0.8em;">La IA está tardando demasiado. Puedes:</small><br>
        <button id="btnSkipAI" style="margin-top: 8px; padding: 8px 16px; background: #02eef0; border: none; border-radius: 4px; cursor: pointer;">
          ⏭️ Continuar sin IA (solo blockchain)
        </button>
      `;

      // Añadir listener al botón
      const skipBtn = document.getElementById('btnSkipAI');
      if (skipBtn) {
        skipBtn.onclick = () => {
          log('Usuario decidió continuar sin IA');
          if (statusElement) statusElement.textContent = '📱 Modo solo blockchain';
          if (loadingElement2) loadingElement2.classList.add('hidden');
          // No lanzar error, dejar que la app funcione sin IA
        };
      }
    }

    if (loadingElement2) {
      loadingElement2.classList.add('hidden');
    }

    // NO lanzar error si el usuario puede saltar
    // throw err;
  }
}

/**
 * Dibuja un bounding box en el canvas (INVISIBLE)
 */
function drawBoundingBox(bbox, label, color = '#02eef0') {
  // No dibuja nada - solo detecta
  return;
}

/**
 * ✨ OPTIMIZADO: Loop principal de detección
 * Ajusta automáticamente la frecuencia según el dispositivo
 */
export async function detect() {
  // Verificar que todo esté listo
  if (!STATE.model || !STATE.video || !STATE.video.videoWidth) {
    requestAnimationFrame(detect);
    return;
  }

  const now = Date.now();
  
  // ✨ OPTIMIZACIÓN 4: Intervalo dinámico según dispositivo
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const detectionInterval = isMobile ? 1200 : CONFIG.detectionInterval; // Móvil: más lento para ahorrar batería
  
  // Limitar frecuencia de detección
  if (now - STATE.lastDetectionTime < detectionInterval) {
    requestAnimationFrame(detect);
    return;
  }
  STATE.lastDetectionTime = now;

  try {
    // Realizar detección con el modelo
    const predictions = await STATE.model.detect(STATE.video);
    STATE.detectionCount++;

    // Limpiar canvas
    STATE.ctx.clearRect(0, 0, STATE.canvas.width, STATE.canvas.height);

    // Filtrar solo plantas
    const plants = predictions.filter(p => 
      CONFIG.model.plantClasses.includes(p.class)
    );

    // Tomar solo la planta con mayor confianza
    const bestPlant = plants.length > 0 
      ? [plants.reduce((best, current) => current.score > best.score ? current : best)]
      : [];

    // Actualizar instrucciones
    updateInstructions(bestPlant.length);

    // Limpiar tracking de plantas antiguas
    plantLastSeen.forEach((lastSeen, plantIndex) => {
      if (plantIndex !== 0) {
        plantLastSeen.delete(plantIndex);
      }
    });

    const activePanels = new Set();

    // Procesar la planta detectada
    if (bestPlant.length > 0) {
      STATE.detectedOnce = true;
      const plant = bestPlant[0];
      const plantIndex = 0;
      STATE.detectedOnce = true;

      // Actualizar timestamp
      plantLastSeen.set(plantIndex, now);

      // Dibujar bounding box (invisible)
      const label = plant.class;
      drawBoundingBox(plant.bbox, label);

    }

    // Mantener paneles visibles aunque no se detecten
    plantLastSeen.forEach((lastSeen, plantIndex) => {
      const timeSinceLastSeen = now - lastSeen;
      
      if (timeSinceLastSeen < PANEL_PERSIST_TIME) {
      } else {
        plantLastSeen.delete(plantIndex);
      }
    });

    // Ocultar paneles inactivos solo si no se ha abierto el panel manual (history)
    if (!STATE.showPanel) {
      hideInactivePanels(activePanels);
    }

  } catch (err) {
    log(`Error en detección : ${err.message}`, 'error');
  }

  // Continuar loop
  requestAnimationFrame(detect);
}

/**
 * Detiene el loop de detección
 */
export function stopDetection() {
  log('Detección detenida');
}
