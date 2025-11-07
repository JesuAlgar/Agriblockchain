// ============================================
// GESTOR DE INTERFAZ DE USUARIO - OPTIMIZADO
// ============================================

import { CONFIG, STATE } from './config.js';
import { getCachedPlantData } from './dataManager.js';

/**
 * Muestra una alerta flotante
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
 */
function formatValue(value, unit = '') {
  if (value === undefined || value === null) return '--';
  return `${value}${unit ? ' ' + unit : ''}`;
}

/**
 * Formatea fecha ISO a formato legible
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
 * ✨ NUEVA: Detecta si el panel tiene scroll y añade clase
 */
function checkPanelScroll(panel) {
  if (!panel) return;
  
  // Esperar un frame para que el navegador calcule las dimensiones
  requestAnimationFrame(() => {
    const hasScroll = panel.scrollHeight > panel.clientHeight;
    
    if (hasScroll) {
      panel.classList.add('has-scroll');
    } else {
      panel.classList.remove('has-scroll');
    }
  });
}

/**
 * Crea el HTML inicial del panel (solo una vez)
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
 */
function updatePanelValues(panel, data, confidence, plantIndex) {
  panel.querySelector('[data-field="seedVariety"]').textContent = 
    data.seedVariety || `Planta ${plantIndex + 1}`;
  panel.querySelector('[data-field="confidence"]').textContent = 
    `${Math.round(confidence * 100)}%`;
  
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
 * ✨ MEJORADO: Crea o actualiza el panel de datos de una planta
 */
export function createOrUpdatePanel(plantIndex, bbox, confidence, data) {
  const panelId = `panel-${plantIndex}`;
  let panel = document.getElementById(panelId);

  // Crear panel solo si no existe
  if (!panel) {
    panel = createPanelStructure(panelId);
    STATE.container.appendChild(panel);
  }

  // Actualizar valores
  updatePanelValues(panel, data, confidence, plantIndex);

  // Posicionar panel
  positionPanel(panel, bbox);
  
  // Hacer visible con animación
  if (!panel.classList.contains('visible')) {
    panel.classList.add('visible');
  }

  // ✨ NUEVO: Verificar si necesita scroll después de actualizar
  checkPanelScroll(panel);

  return panel;
}

/**
 * Posiciona el panel en la esquina superior derecha (fijo)
 */
function positionPanel(panel, bbox) {
  panel.style.position = 'fixed';
  panel.style.top = '80px';
  panel.style.right = '10px';
  panel.style.left = 'auto';
  panel.style.bottom = 'auto';
  panel.style.transform = 'none';
  panel.style.maxWidth = '280px';
  panel.style.maxHeight = 'calc(100vh - 100px)';
  
  // ✨ ASEGURAR QUE EL SCROLL FUNCIONE
  panel.style.overflowY = 'auto';
  panel.style.overflowX = 'hidden';
}

/**
 * Oculta y elimina paneles inactivos
 */
export function hideInactivePanels(activePanelIndices) {
  document.querySelectorAll('.data-panel').forEach(panel => {
    const panelIndex = parseInt(panel.id.split('-')[1]);
    
    if (panelIndex !== 0 || !activePanelIndices.has(panelIndex)) {
      panel.classList.remove('visible');
      
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
 * Activa/desactiva pantalla completa (compatible con móviles y Trust Wallet)
 */
export function toggleFullscreen() {
  const d = document;
  const elements = [d.documentElement, d.body, d.getElementById('container')];

  const isFS = !!(d.fullscreenElement || d.webkitFullscreenElement || d.mozFullScreenElement || d.msFullscreenElement || document.body.classList.contains('simulated-fullscreen'));
  console.log('[Fullscreen] Estado actual:', isFS ? 'Activado' : 'Desactivado');

  const tryEnter = () => {
    let started = false;
    for (const el of elements) {
      if (!el) continue;
      try {
        if (el.requestFullscreen) { el.requestFullscreen(); started = true; break; }
        if (el.webkitRequestFullscreen) { el.webkitRequestFullscreen(); started = true; break; }
        if (el.mozRequestFullScreen) { el.mozRequestFullScreen(); started = true; break; }
        if (el.msRequestFullscreen) { el.msRequestFullscreen(); started = true; break; }
      } catch (e) {
        console.warn('[Fullscreen] start error:', e?.message);
      }
    }
    // Comprobación post-intento: si no entró, simular tras un pequeño delay
    setTimeout(() => {
      const nowFS = !!(d.fullscreenElement || d.webkitFullscreenElement || d.mozFullScreenElement || d.msFullscreenElement);
      if (!nowFS) {
        console.log('[Fullscreen] No se pudo activar nativo, usando simulado');
        simulateFullscreen(true);
      } else {
        updateFullscreenButton(true);
      }
    }, 150);
  };

  const tryExit = () => {
    let exited = false;
    try { if (d.exitFullscreen) { d.exitFullscreen(); exited = true; } } catch {}
    try { if (d.webkitExitFullscreen) { d.webkitExitFullscreen(); exited = true; } } catch {}
    try { if (d.mozCancelFullScreen) { d.mozCancelFullScreen(); exited = true; } } catch {}
    try { if (d.msExitFullscreen) { d.msExitFullscreen(); exited = true; } } catch {}
    if (!exited) simulateFullscreen(false);
  };

  if (!isFS) {
    tryEnter();
  } else {
    tryExit();
  }
}

/**
 * Intenta fullscreen con webkit como fallback
 */
function tryWebkitFullscreen(elem) {
  console.log('[Fullscreen] Intentando fallback webkit...');
  if (typeof elem.webkitRequestFullscreen === 'function') {
    try {
      elem.webkitRequestFullscreen();
      console.log('[Fullscreen] ✓ Fallback webkit funcionó');
      setTimeout(() => updateFullscreenButton(true), 100);
    } catch (err) {
      console.warn('[Fullscreen] Fallback webkit también falló:', err.message);
      // Último recurso: modo simulado
      simulateFullscreen(true);
      showAlert('Modo pantalla completa (simulado)', 'info');
    }
  } else {
    // No hay webkit, usar modo simulado
    simulateFullscreen(true);
    showAlert('Modo pantalla completa (simulado)', 'info');
  }
}

/**
 * Actualiza el botón de fullscreen
 */
function updateFullscreenButton(isFullscreen) {
  const btn = document.getElementById('btnFullscreen');
  if (btn) {
    btn.textContent = isFullscreen ? 'Salir Fullscreen' : 'Fullscreen';
    btn.title = isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa';
  }
}

/**
 * Simula pantalla completa con CSS cuando la API no está disponible
 */
function simulateFullscreen(enable) {
  if (enable) {
    console.log('[Fullscreen] Activando modo simulado CSS');
    document.body.classList.add('simulated-fullscreen');
    // Ocultar barra de direcciones en móviles
    setTimeout(() => window.scrollTo(0, 1), 100);
    updateFullscreenButton(true);
  } else {
    console.log('[Fullscreen] Desactivando modo simulado CSS');
    document.body.classList.remove('simulated-fullscreen');
    updateFullscreenButton(false);
  }
}

/**
 * Listener para cambios de estado de fullscreen
 */
if (typeof document !== 'undefined') {
  // Escuchar eventos de fullscreen para actualizar el botón
  document.addEventListener('fullscreenchange', () => {
    const isFullscreen = !!document.fullscreenElement;
    console.log('[Fullscreen] fullscreenchange:', isFullscreen);
    updateFullscreenButton(isFullscreen);
    if (isFullscreen) {
      document.body.classList.add('is-fullscreen');
    } else {
      document.body.classList.remove('is-fullscreen');
    }
  });

  document.addEventListener('webkitfullscreenchange', () => {
    const isFullscreen = !!document.webkitFullscreenElement;
    console.log('[Fullscreen] webkitfullscreenchange:', isFullscreen);
    updateFullscreenButton(isFullscreen);
    if (isFullscreen) {
      document.body.classList.add('is-fullscreen');
    } else {
      document.body.classList.remove('is-fullscreen');
    }
  });

  document.addEventListener('mozfullscreenchange', () => {
    const isFullscreen = !!document.mozFullScreenElement;
    console.log('[Fullscreen] mozfullscreenchange:', isFullscreen);
    updateFullscreenButton(isFullscreen);
    if (isFullscreen) {
      document.body.classList.add('is-fullscreen');
    } else {
      document.body.classList.remove('is-fullscreen');
    }
  });

  document.addEventListener('msfullscreenchange', () => {
    const isFullscreen = !!document.msFullscreenElement;
    console.log('[Fullscreen] msfullscreenchange:', isFullscreen);
    updateFullscreenButton(isFullscreen);
    if (isFullscreen) {
      document.body.classList.add('is-fullscreen');
    } else {
      document.body.classList.remove('is-fullscreen');
    }
  });
}
