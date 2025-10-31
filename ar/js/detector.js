// ============================================
// DETECTOR DE PLANTAS Y ÁRBOLES CON IA
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
const plantLastSeen = new Map(); // Map<plantIndex, timestamp>
const PANEL_PERSIST_TIME = 3000; // Tiempo que persiste el panel sin detección (3 segundos)

/**
 * Carga el modelo de detección COCO-SSD
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
    STATE.model = await cocoSsd.load({ base: CONFIG.model.base });
    
    if (loadingElement) {
      loadingElement.classList.add('hidden');
    }
    
    if (statusElement) {
      statusElement.textContent = '✓ IA lista - Buscando plantas y árboles...';
      statusElement.classList.add('detecting');
    }
    
    log('✓ Modelo COCO-SSD cargado correctamente');
    log(`✓ Detectando: ${CONFIG.model.plantClasses.join(', ')}`);
    
  } catch (err) {
    log(`Error al cargar el modelo: ${err.message}`, 'error');
    
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = '⚠️ Error al cargar IA';
    }
    
    throw err;
  }
}

/**
 * Dibuja un bounding box en el canvas (OPCIÓN 3: INVISIBLE - NO DIBUJA NADA)
 * @param {Array} bbox - [x, y, width, height]
 * @param {string} label - Etiqueta a mostrar
 * @param {string} color - Color del bounding box
 */
function drawBoundingBox(bbox, label, color = '#02eef0') {
  // INVISIBLE: El sistema detecta pero no muestra ningún indicador visual
  // Solo se verán los datos en la esquina superior derecha
  return;
}

/**
 * ⭐ NUEVA: Verifica si un objeto detectado es una planta/árbol válido
 * @param {object} prediction - Predicción del modelo
 * @returns {boolean}
 */
function isValidPlant(prediction) {
  const isPlantClass = CONFIG.model.plantClasses.includes(prediction.class);
  const meetsConfidence = prediction.score >= CONFIG.model.confidenceThreshold;
  
  return isPlantClass && meetsConfidence;
}

/**
 * ⭐ NUEVA: Obtiene el tipo de planta/árbol detectado
 * @param {string} plantClass - Clase detectada
 * @returns {string} - Emoji + nombre
 */
function getPlantTypeLabel(plantClass) {
  const labels = {
    'tree': '🌳 Árbol',
    'bush': '🌿 Arbusto',
    'shrub': '🌿 Arbusto',
    'potted plant': '🪴 Planta en Maceta',
    'plant': '🌱 Planta',
    'vase': '🏺 Planta en Macetero',
    'cactus': '🌵 Cactus',
    'succulent': '🪴 Suculenta',
    'fern': '🌿 Helecho',
    'herb': '🌿 Hierba',
    'flower': '🌸 Flor',
    'ivy': '🍃 Hiedra',
    'climbing plant': '🍃 Planta Trepadora'
  };
  
  return labels[plantClass] || `🌱 ${plantClass}`;
}

/**
 * Loop principal de detección MEJORADO
 */
export async function detect() {
  // Verificar que todo esté listo
  if (!STATE.model || !STATE.video || !STATE.video.videoWidth) {
    requestAnimationFrame(detect);
    return;
  }

  const now = Date.now();
  
  // Limitar frecuencia de detección
  if (now - STATE.lastDetectionTime < CONFIG.detectionInterval) {
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

    // ⭐ MEJORADO: Filtrar plantas/árboles válidos usando la función mejorada
    const plants = predictions.filter(p => isValidPlant(p));

    // ⭐ Ordenar por confianza (de mayor a menor)
    plants.sort((a, b) => b.score - a.score);

    // Logging detallado
    if (plants.length > 0) {
      log(`🔍 Detectados ${plants.length} objeto(s):`);
      plants.forEach((p, i) => {
        log(`   ${i + 1}. ${p.class} (${(p.score * 100).toFixed(1)}%)`);
      });
    }

    // ⭐ Tomar solo la planta con mayor confianza (evitar solapamientos)
    const bestPlant = plants.length > 0 
      ? [plants[0]]
      : [];

    // Actualizar instrucciones
    updateInstructions(bestPlant.length);

    // Limpiar tracking de plantas antiguas (solo mantenemos índice 0)
    plantLastSeen.forEach((lastSeen, plantIndex) => {
      if (plantIndex !== 0) {
        plantLastSeen.delete(plantIndex);
      }
    });

    const activePanels = new Set();

    // Procesar la planta detectada (solo una)
    if (bestPlant.length > 0) {
      const plant = bestPlant[0];
      const plantIndex = 0; // Siempre índice 0 porque solo mostramos una planta

      // Actualizar timestamp de última vez vista
      plantLastSeen.set(plantIndex, now);

      // Dibujar bounding box (INVISIBLE)
      drawBoundingBox(plant.bbox, plant.class);

      // Cargar datos de la planta (usa caché automáticamente)
      const data = await loadPlantData(plantIndex);
      
      // ⭐ NUEVO: Pasar información de tipo de planta detectado
      const plantType = getPlantTypeLabel(plant.class);
      
      // Crear/actualizar panel de datos
      createOrUpdatePanel(plantIndex, plant.bbox, plant.score, data, plantType);
      activePanels.add(plantIndex);
    }

    // Mantener paneles visibles aunque no se detecten (por PANEL_PERSIST_TIME ms)
    plantLastSeen.forEach((lastSeen, plantIndex) => {
      const timeSinceLastSeen = now - lastSeen;
      
      if (timeSinceLastSeen < PANEL_PERSIST_TIME) {
        // Panel todavía debe estar visible
        activePanels.add(plantIndex);
      } else {
        // Panel ha expirado, remover del tracking
        plantLastSeen.delete(plantIndex);
      }
    });

    // Ocultar paneles de plantas que ya no se detectan y han expirado
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
  // El loop se detendrá automáticamente al no llamar requestAnimationFrame
  log('Detección detenida');
}