// ============================================
// GESTOR DE DATOS Y CACHÉ
// ============================================

import { CONFIG, getPlantIdFromURL } from './config.js';
import { log } from './utils.js';

// Datos de fallback cuando no se puede cargar del servidor
const FALLBACK_DATA = {
  eventType: "MONITORING",
  eventId: "01FALLBACK000000000000000",
  batchId: "01FALLBACK000000000000001",
  lotCode: "DEMO-2025-10-10-FALLBACK",
  timestamp: new Date().toISOString(),
  recordedBy: "device-DEMO",
  fieldId: "DEMO-FIELD",
  seed_LotId: "DEMO-SEED-001",
  seedVariety: "Demo Plant (No JSON)",
  seedSupplier: "Demo Supplier",
  seedTreatment: "demo",
  quantity_kg: 0.0,
  plantingMethod: "demo-system",
  rowSpacing_cm: 0,
  plantingDepth_cm: 0.0,
  germinationRate_pct: 0
};

// Caché de datos de plantas
// Estructura: Map<plantIndex, {data, lastUpdate, previousData}>
const plantDataCache = new Map();

/**
 * Carga los datos de una planta desde el servidor (con caché)
 * @param {number} plantIndex - Índice de la planta (0, 1, 2...)
 * @returns {Promise<object>} - Datos de la planta
 */
export async function loadPlantData(plantIndex) {
  // ⭐ FORZAR: Solo permitir plantIndex = 0
  if (plantIndex !== 0) {
    console.warn(`Intentando cargar planta ${plantIndex}, forzando a 0`);
    plantIndex = 0;
  }
  
  const now = Date.now();
  const cached = plantDataCache.get(plantIndex);

  // Si hay cache y es reciente (menos de 5 segundos), usar cache
  if (cached && (now - cached.lastUpdate) < CONFIG.dataUpdateInterval) {
    log(`Usando datos en caché para planta ${plantIndex}`);
    return cached.data;
  }

  // Determinar el ID del archivo JSON
  // SIEMPRE usamos el ID del URL (planta01), nunca planta02, planta03, etc.
  const defaultId = getPlantIdFromURL();
  const plantId = defaultId; // Siempre el mismo ID
  const url = `./data/${encodeURIComponent(plantId)}.json`;
  
  try {
    log(`Cargando datos desde ${url}`);
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    // Guardar en cache
    plantDataCache.set(plantIndex, {
      data: data,
      lastUpdate: now,
      previousData: cached ? cached.data : null
    });
    
    log(`✓ Datos cargados para planta ${plantIndex}: ${data.name}`);
    return data;
    
  } catch (err) {
    log(`No se pudo cargar ${url}: ${err.message}`, 'warn');
    
    // Usar datos de fallback con nombre personalizado
    const fallback = {
      ...FALLBACK_DATA,
      name: `Planta ${plantIndex + 1}`
    };
    
    // Solo guardar en cache si no existe
    if (!cached) {
      plantDataCache.set(plantIndex, {
        data: fallback,
        lastUpdate: now,
        previousData: null
      });
    }
    
    return cached ? cached.data : fallback;
  }
}

/**
 * Obtiene los datos cacheados de una planta
 * @param {number} plantIndex - Índice de la planta
 * @returns {object|null} - Datos cacheados o null
 */
export function getCachedPlantData(plantIndex) {
  return plantDataCache.get(plantIndex);
}

/**
 * Limpia el caché de una planta específica
 * @param {number} plantIndex - Índice de la planta
 */
export function clearPlantCache(plantIndex) {
  plantDataCache.delete(plantIndex);
  log(`Caché limpiado para planta ${plantIndex}`);
}

/**
 * Limpia todo el caché
 */
export function clearAllCache() {
  plantDataCache.clear();
  log('Caché completo limpiado');
}

/**
 * Pre-carga los datos de las plantas más comunes
 * @param {number} count - Cantidad de plantas a pre-cargar
 */
export async function preloadPlantData(count = 3) {
  log(`Pre-cargando datos de ${count} plantas...`);
  const promises = [];
  
  for (let i = 0; i < count; i++) {
    promises.push(loadPlantData(i));
  }
  
  try {
    await Promise.all(promises);
    log(`✓ Pre-carga completa (${count} plantas)`);
  } catch (err) {
    log(`Error en pre-carga: ${err.message}`, 'error');
  }
}