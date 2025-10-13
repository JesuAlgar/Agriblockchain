// ============================================
// GESTOR DE DATOS - PREPARADO PARA BLOCKCHAIN
// ============================================

import { CONFIG, getPlantIdFromURL } from './config.js';
import { log } from './utils.js';

// ⭐ CONFIGURACIÓN DE FUENTE DE DATOS
const DATA_SOURCE = {
  type: 'LOCAL_JSON', // Cambiar a 'BLOCKCHAIN' cuando esté listo
  // type: 'BLOCKCHAIN', // Descomentar cuando tengas la info
};

// Datos de fallback cuando no se puede cargar
const FALLBACK_DATA = {
  eventType: "MONITORING",
  eventId: "01FALLBACK000000000000000",
  batchId: "01FALLBACK000000000000001",
  lotCode: "DEMO-2025-10-10-FALLBACK",
  timestamp: new Date().toISOString(),
  recordedBy: "device-DEMO",
  fieldId: "DEMO-FIELD",
  seed_LotId: "DEMO-SEED-001",
  seedVariety: "Demo Plant (No Data)",
  seedSupplier: "Demo Supplier",
  seedTreatment: "demo",
  quantity_kg: 0.0,
  plantingMethod: "demo-system",
  rowSpacing_cm: 0,
  plantingDepth_cm: 0.0,
  germinationRate_pct: 0
};

// Caché de datos
const plantDataCache = new Map();

// ============================================
// MÉTODO 1: CARGAR DESDE JSON LOCAL (ACTUAL)
// ============================================
async function loadFromLocalJSON(plantId) {
  const url = `./data/${encodeURIComponent(plantId)}.json`;
  
  try {
    log(`📁 Cargando desde JSON local: ${url}`);
    const response = await fetch(url, { cache: 'no-store' });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    log(`✅ Datos cargados desde JSON: ${data.seedVariety}`);
    return data;
    
  } catch (err) {
    log(`❌ Error cargando JSON: ${err.message}`, 'warn');
    throw err;
  }
}

// ============================================
// MÉTODO 2: CARGAR DESDE BLOCKCHAIN (FUTURO)
// ============================================
async function loadFromBlockchain(plantId) {
  log(`🔗 Cargando desde Blockchain: ${plantId}`);
  
  // 🚧 AQUÍ IRÁ LA LÓGICA DE BLOCKCHAIN
  // Ejemplo de lo que tendrás que hacer:
  
  /*
  // 1. Conectar a blockchain
  const provider = new ethers.JsonRpcProvider(BLOCKCHAIN_RPC);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
  
  // 2. Obtener datos del smart contract
  const rawData = await contract.getPlantData(plantId);
  
  // 3. Mapear datos al formato de la app
  return {
    eventType: rawData.eventType,
    eventId: rawData.eventId,
    batchId: rawData.batchId,
    lotCode: rawData.lotCode,
    timestamp: rawData.timestamp,
    recordedBy: rawData.recordedBy,
    fieldId: rawData.fieldId,
    seed_LotId: rawData.seedLotId,
    seedVariety: rawData.seedVariety,
    seedSupplier: rawData.seedSupplier,
    seedTreatment: rawData.seedTreatment,
    quantity_kg: Number(rawData.quantity),
    plantingMethod: rawData.plantingMethod,
    rowSpacing_cm: Number(rawData.rowSpacing),
    plantingDepth_cm: Number(rawData.plantingDepth),
    germinationRate_pct: Number(rawData.germinationRate)
  };
  */
  
  // ⭐ POR AHORA: Simular delay de blockchain y devolver datos mock
  await new Promise(resolve => setTimeout(resolve, 500)); // Simular latencia
  
  return {
    eventType: "MONITORING",
    eventId: `BLOCKCHAIN-${plantId}`,
    batchId: `BATCH-${plantId}`,
    lotCode: `LOT-BLOCKCHAIN-${plantId}`,
    timestamp: new Date().toISOString(),
    recordedBy: "blockchain-node-01",
    fieldId: "FIELD-BLOCKCHAIN",
    seed_LotId: `SEED-${plantId}`,
    seedVariety: "🔗 Blockchain Tomato",
    seedSupplier: "Blockchain Farms Inc",
    seedTreatment: "organic-blockchain",
    quantity_kg: 2.5,
    plantingMethod: "smart-contract-system",
    rowSpacing_cm: 50,
    plantingDepth_cm: 3.0,
    germinationRate_pct: 96
  };
}

// ============================================
// FUNCIÓN PRINCIPAL: CARGA DATOS (ABSTRACCIÓN)
// ============================================
/**
 * Carga datos de una planta desde la fuente configurada
 * @param {number} plantIndex - Índice de la planta (0, 1, 2...)
 * @returns {Promise<object>} - Datos de la planta
 */
export async function loadPlantData(plantIndex) {
  // ⭐ FORZAR: Solo permitir plantIndex = 0
  if (plantIndex !== 0) {
    plantIndex = 0;
  }
  
  const now = Date.now();
  const cached = plantDataCache.get(plantIndex);

  // Si hay cache y es reciente (menos de 5 segundos), usar cache
  if (cached && (now - cached.lastUpdate) < CONFIG.dataUpdateInterval) {
    log(`💾 Usando datos en caché para planta ${plantIndex}`);
    return cached.data;
  }

  // Obtener ID de la planta desde URL (parámetro QR)
  const plantId = getPlantIdFromURL();
  
  try {
    let data;
    
    // ⭐ SELECTOR DE FUENTE DE DATOS
    if (DATA_SOURCE.type === 'BLOCKCHAIN') {
      data = await loadFromBlockchain(plantId);
    } else {
      data = await loadFromLocalJSON(plantId);
    }
    
    // Guardar en cache
    plantDataCache.set(plantIndex, {
      data: data,
      lastUpdate: now,
      previousData: cached ? cached.data : null
    });
    
    log(`✅ Datos cargados para planta ${plantIndex}: ${data.seedVariety}`);
    return data;
    
  } catch (err) {
    log(`❌ Error cargando datos: ${err.message}`, 'error');
    
    // Usar datos de fallback con nombre personalizado
    const fallback = {
      ...FALLBACK_DATA,
      seedVariety: `Planta ${plantIndex + 1} (Sin conexión)`
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
  log(`🗑️ Caché limpiado para planta ${plantIndex}`);
}

/**
 * Limpia todo el caché
 */
export function clearAllCache() {
  plantDataCache.clear();
  log('🗑️ Caché completo limpiado');
}

/**
 * Pre-carga los datos de las plantas más comunes
 * @param {number} count - Cantidad de plantas a pre-cargar
 */
export async function preloadPlantData(count = 3) {
  log(`⏳ Pre-cargando datos de ${count} plantas...`);
  const promises = [];
  
  for (let i = 0; i < count; i++) {
    promises.push(loadPlantData(i));
  }
  
  try {
    await Promise.all(promises);
    log(`✅ Pre-carga completa (${count} plantas)`);
  } catch (err) {
    log(`❌ Error en pre-carga: ${err.message}`, 'error');
  }
}

// ============================================
// EXPORTAR CONFIGURACIÓN (para cambiar fácilmente)
// ============================================
export function switchDataSource(newSource) {
  DATA_SOURCE.type = newSource;
  clearAllCache(); // Limpiar caché al cambiar fuente
  log(`🔄 Fuente de datos cambiada a: ${newSource}`);
}s