// ============================================
// GESTOR DE INTERFAZ DE USUARIO
// ============================================

import { CONFIG, STATE } from './config.js';
import { getCachedPlantData } from './dataManager.js';

/**
 * Muestra una alerta flotante
 * @param {string} message - Mensaje de la alerta
 * @param {string} type - Tipo: 'danger' o 'warning'
 */
export function showAlert(message, type = 'danger') {
  const banner = document.getElementById('alertBanner');
  if (!banner) return;
  
  banner.textContent = message;
  banner.className = `alert-banner ${type} show`;
  
  setTimeout(() => {
    banner.classList.remove('show');
  }, CONFIG.ui.alertDuration);
}

/**
 * Actualiza el mensaje de instrucciones
 * @param {number} plantCount - Cantidad de plantas detectadas
 */
export function updateInstructions(plantCount) {
  const instructions = document.getElementById('instructions');
  if (!instructions) return;
  
  if (plantCount === 0) {
    instructions.textContent = '🔍 Buscando plantas...';
    instructions.classList.remove('success');
  } else if (plantCount === 1) {
    instructions.textContent = '✅ Planta detectada';
    instructions.classList.add('success');
  } else {
    instructions.textContent = `✅ ${plantCount} plantas detectadas`;
    instructions.classList.add('success');
  }
}

/**
 * Formatea un valor con unidad
 * @param {*} value - Valor a formatear
 * @param {string} unit - Unidad
 * @returns {string}
 */
function formatValue(value, unit = '') {
  if (value === undefined || value === null) return '--';
  return `${value}${unit ? ' ' + unit : ''}`;
}

/**
 * Formatea fecha ISO a formato legible
 * @param {string} isoString - Fecha en formato ISO
 * @returns {string}
 */
function formatTimestamp(isoString) {
  if (!isoString) return '--';
  try {
    const date = new Date(isoString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

/**
 * Crea el HTML inicial del panel (solo una vez)
 * @param {string} panelId - ID del panel
 * @returns {HTMLElement} - Panel creado
 */
function createPanelStructure(panelId) {
  const panel = document.createElement('div');
  panel.id = panelId;
  panel.className = 'data-panel';
  
  panel.innerHTML = `
    <div class="plant-title">
      <div class="plant-name" data-field="seedVariety">--</div>
      <div class="plant-confidence" data-field="confidence">--</div>
    </div>
    
    <div class="data-chip">
      <span class="data-icon">📋</span>
      <div class="data-content">
        <div class="data-label">Tipo Evento</div>
        <div class="data-value-container">
          <span class="data-value" data-field="eventType">--</span>
        </div>
      </div>
    </div>

    <div class="data-chip">
      <span class="data-icon">🆔</span>
      <div class="data-content">
        <div class="data-label">Event ID</div>
        <div class="data-value-container">
          <span class="data-value-small" data-field="eventId">--</span>
        </div>
      </div>
    </div>

    <div class="data-chip">
      <span class="data-icon">📦</span>
      <div class="data-content">
        <div class="data-label">Batch ID</div>
        <div class="data-value-container">
          <span class="data-value-small" data-field="batchId">--</span>
        </div>
      </div>
    </div>

    <div class="data-chip">
      <span class="data-icon">🏷️</span>
      <div class="data-content">
        <div class="data-label">Lote Código</div>
        <div class="data-value-container">
          <span class="data-value-small" data-field="lotCode">--</span>
        </div>
      </div>
    </div>

    <div class="data-chip">
      <span class="data-icon">🌾</span>
      <div class="data-content">
        <div class="data-label">Campo</div>
        <div class="data-value-container">
          <span class="data-value" data-field="fieldId">--</span>
        </div>
      </div>
    </div>

    <div class="data-chip">
      <span class="data-icon">📡</span>
      <div class="data-content">
        <div class="data-label">Dispositivo</div>
        <div class="data-value-container">
          <span class="data-value-small" data-field="recordedBy">--</span>
        </div>
      </div>
    </div>

    <div class="data-chip">
      <span class="data-icon">🌱</span>
      <div class="data-content">
        <div class="data-label">Lote Semilla</div>
        <div class="data-value-container">
          <span class="data-value-small" data-field="seedLotId">--</span>
        </div>
      </div>
    </div>

    <div class="data-chip">
      <span class="data-icon">🏭</span>
      <div class="data-content">
        <div class="data-label">Proveedor</div>
        <div class="data-value-container">
          <span class="data-value-small" data-field="seedSupplier">--</span>
        </div>
      </div>
    </div>

    <div class="data-chip">
      <span class="data-icon">💊</span>
      <div class="data-content">
        <div class="data-label">Tratamiento</div>
        <div class="data-value-container">
          <span class="data-value" data-field="seedTreatment">--</span>
        </div>
      </div>
    </div>

    <div class="data-chip">
      <span class="data-icon">⚖️</span>
      <div class="data-content">
        <div class="data-label">Cantidad</div>
        <div class="data-value-container">
          <span class="data-value" data-field="quantity">--</span>
          <span class="data-unit">kg</span>
        </div>
      </div>
    </div>

    <div class="data-chip">
      <span class="data-icon">🌿</span>
      <div class="data-content">
        <div class="data-label">Método Siembra</div>
        <div class="data-value-container">
          <span class="data-value-small" data-field="plantingMethod">--</span>
        </div>
      </div>
    </div>

    <div class="data-chip">
      <span class="data-icon">↔️</span>
      <div class="data-content">
        <div class="data-label">Espaciado Filas</div>
        <div class="data-value-container">
          <span class="data-value" data-field="rowSpacing">--</span>
          <span class="data-unit">cm</span>
        </div>
      </div>
    </div>

    <div class="data-chip">
      <span class="data-icon">⬇️</span>
      <div class="data-content">
        <div class="data-label">Profundidad</div>
        <div class="data-value-container">
          <span class="data-value" data-field="plantingDepth">--</span>
          <span class="data-unit">cm</span>
        </div>
      </div>
    </div>

    <div class="data-chip">
      <span class="data-icon">📈</span>
      <div class="data-content">
        <div class="data-label">Germinación</div>
        <div class="data-value-container">
          <span class="data-value" data-field="germinationRate">--</span>
          <span class="data-unit">%</span>
        </div>
      </div>
    </div>

    <div class="data-chip">
      <span class="data-icon">🕐</span>
      <div class="data-content">
        <div class="data-label">Timestamp</div>
        <div class="data-value-container">
          <span class="data-value-small" data-field="timestamp">--</span>
        </div>
      </div>
    </div>
  `;
  
  return panel;
}

/**
 * Actualiza solo los valores del panel (sin recrear HTML)
 * @param {HTMLElement} panel - Panel existente
 * @param {object} data - Datos
 * @param {number} confidence - Confianza
 * @param {number} plantIndex - Índice de la planta
 */
function updatePanelValues(panel, data, confidence, plantIndex) {
  // Actualizar título con variedad de semilla
  panel.querySelector('[data-field="seedVariety"]').textContent = 
    data.seedVariety || `Planta ${plantIndex + 1}`;
  panel.querySelector('[data-field="confidence"]').textContent = 
    `${Math.round(confidence * 100)}%`;
  
  // Actualizar TODOS los campos
  panel.querySelector('[data-field="eventType"]').textContent = 
    data.eventType || '--';
  
  panel.querySelector('[data-field="eventId"]').textContent = 
    data.eventId || '--';
  
  panel.querySelector('[data-field="batchId"]').textContent = 
    data.batchId || '--';
  
  panel.querySelector('[data-field="lotCode"]').textContent = 
    data.lotCode || '--';
  
  panel.querySelector('[data-field="fieldId"]').textContent = 
    data.fieldId || '--';
  
  panel.querySelector('[data-field="recordedBy"]').textContent = 
    data.recordedBy || '--';
  
  panel.querySelector('[data-field="seedLotId"]').textContent = 
    data.seed_LotId || '--';
  
  panel.querySelector('[data-field="seedSupplier"]').textContent = 
    data.seedSupplier || '--';
  
  panel.querySelector('[data-field="seedTreatment"]').textContent = 
    data.seedTreatment || '--';
  
  panel.querySelector('[data-field="quantity"]').textContent = 
    data.quantity_kg || '--';
  
  panel.querySelector('[data-field="plantingMethod"]').textContent = 
    data.plantingMethod || '--';
  
  panel.querySelector('[data-field="rowSpacing"]').textContent = 
    data.rowSpacing_cm || '--';
  
  panel.querySelector('[data-field="plantingDepth"]').textContent = 
    data.plantingDepth_cm || '--';
  
  panel.querySelector('[data-field="germinationRate"]').textContent = 
    data.germinationRate_pct || '--';
  
  panel.querySelector('[data-field="timestamp"]').textContent = 
    formatTimestamp(data.timestamp);
}

/**
 * Crea o actualiza el panel de datos de una planta
 * @param {number} plantIndex - Índice de la planta
 * @param {Array} bbox - Bounding box [x, y, width, height]
 * @param {number} confidence - Confianza de la detección (0-1)
 * @param {object} data - Datos
 * @returns {HTMLElement} - Panel creado/actualizado
 */
export function createOrUpdatePanel(plantIndex, bbox, confidence, data) {
  const panelId = `panel-${plantIndex}`;
  let panel = document.getElementById(panelId);

  // Crear panel solo si no existe
  if (!panel) {
    panel = createPanelStructure(panelId);
    STATE.container.appendChild(panel);
  }

  // Actualizar solo los valores (sin recrear HTML)
  updatePanelValues(panel, data, confidence, plantIndex);

  // Posicionar panel (FIJO en esquina superior derecha)
  positionPanel(panel, bbox);
  
  // Hacer visible con animación suave
  if (!panel.classList.contains('visible')) {
    panel.classList.add('visible');
  }

  return panel;
}

/**
 * Posiciona el panel en la ESQUINA SUPERIOR DERECHA (posición fija)
 * @param {HTMLElement} panel - Panel a posicionar
 * @param {Array} bbox - Bounding box (no usado)
 */
function positionPanel(panel, bbox) {
  // ⭐ POSICIÓN FIJA: ESQUINA SUPERIOR DERECHA
  panel.style.position = 'fixed';
  panel.style.top = '80px';      // Debajo del header
  panel.style.right = '10px';    // Pegado a la derecha
  panel.style.left = 'auto';
  panel.style.bottom = 'auto';
  panel.style.transform = 'none';
  panel.style.maxWidth = '280px';
  panel.style.maxHeight = 'calc(100vh - 180px)';
  panel.style.overflowY = 'auto';
}

/**
 * Oculta y elimina paneles inactivos
 * @param {Set} activePanelIndices - Set con índices de paneles activos
 */
export function hideInactivePanels(activePanelIndices) {
  document.querySelectorAll('.data-panel').forEach(panel => {
    const panelIndex = parseInt(panel.id.split('-')[1]);
    
    // ⭐ FORZAR: Solo permitir panel-0, eliminar cualquier otro
    if (panelIndex !== 0 || !activePanelIndices.has(panelIndex)) {
      panel.classList.remove('visible');
      
      // Eliminar después de la animación
      setTimeout(() => {
        if (!panel.classList.contains('visible')) {
          panel.remove();
        }
      }, 500);
    }
  });
}

/**
 * Cambia el tema de la aplicación
 */
export function toggleTheme() {
  STATE.currentTheme = STATE.currentTheme === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', STATE.currentTheme);
}

/**
 * Activa/desactiva pantalla completa
 */
export function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}