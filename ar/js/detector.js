// ============================================
// DETECTOR DE PLANTAS CON IA - OPTIMIZADO
// ============================================

import { CONFIG, STATE } from './config.js';
import { log } from './utils.js';
import { loadPlantData } from './dataManager.js';
import { 
  updateInstructions,
  createOrUpdatePanel,
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

    // Preparar backend de TensorFlow: WebGL preferido, fallback WASM
    if (typeof tf !== 'undefined') {
      try {
        await tf.ready();
        let backend = tf.getBackend && tf.getBackend();
        // Si no hay backend o no es webgl, intenta webgl primero
        const canWebGL = (tf.findBackend && tf.findBackend('webgl')) || (tf.engine && tf.engine().registryFactory && tf.engine().registryFactory['webgl']);
        if (canWebGL && backend !== 'webgl') {
          await tf.setBackend('webgl');
          await tf.ready();
          backend = tf.getBackend && tf.getBackend();
        }
        // Si no hay webgl, intenta wasm
        const canWASM = (tf.findBackend && tf.findBackend('wasm')) || (tf.engine && tf.engine().registryFactory && tf.engine().registryFactory['wasm']);
        if (backend !== 'webgl' && canWASM && backend !== 'wasm') {
          await tf.setBackend('wasm');
          await tf.ready();
          backend = tf.getBackend && tf.getBackend();
        }
        log(`Backend TF activo: ${backend}`);
      } catch (e) {
        log(`No se pudo preparar backend TF: ${e.message}`, 'warn');
      }
    }
    
    // ✨ OPTIMIZACIÓN 1: Detectar si es móvil
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Forzar backend WASM en móviles para evitar cuelgues por WebGL
    if (typeof tf !== 'undefined' && isMobile) {
      try {
        await tf.setBackend('wasm');
        await tf.ready();
        log('Backend TF forzado: wasm (móvil)');
      } catch (e) {
        log(`No se pudo forzar backend wasm: ${e.message}`, 'warn');
      }
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
    
    // Cargar modelo con timeout para evitar bloqueos en algunos móviles
    const loadPromise = (typeof cocoSsd !== 'undefined' && cocoSsd.load)
      ? cocoSsd.load(modelConfig)
      : Promise.reject(new Error('coco-ssd no disponible'));
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout cargando modelo')), 25000));
    STATE.model = await Promise.race([loadPromise, timeoutPromise]);
    
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
    if (statusElement) {
      statusElement.textContent = '⚠️ Error al cargar IA';
    }
    
    const loadingElement2 = document.getElementById('loading');
    if (loadingElement2) {
      loadingElement2.classList.add('hidden');
    }
    throw err;
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
      const plant = bestPlant[0];
      const plantIndex = 0;

      // Actualizar timestamp
      plantLastSeen.set(plantIndex, now);

      // Dibujar bounding box (invisible)
      const label = plant.class;
      drawBoundingBox(plant.bbox, label);

      // Cargar datos de la planta
      const data = await loadPlantData(plantIndex);
      
      // Crear/actualizar panel de datos
      createOrUpdatePanel(plantIndex, plant.bbox, plant.score, data);
      activePanels.add(plantIndex);
    }

    // Mantener paneles visibles aunque no se detecten
    plantLastSeen.forEach((lastSeen, plantIndex) => {
      const timeSinceLastSeen = now - lastSeen;
      
      if (timeSinceLastSeen < PANEL_PERSIST_TIME) {
        activePanels.add(plantIndex);
      } else {
        plantLastSeen.delete(plantIndex);
      }
    });

    // Ocultar paneles inactivos
    hideInactivePanels(activePanels);

  } catch (err) {
    log(`Error en detección: ${err.message}`, 'error');
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
