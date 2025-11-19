// ============================================
// GESTOR DE INTERFAZ DE USUARIO - OPTIMIZADO
// ============================================

import { CONFIG, STATE, getPlantIdFromURL } from './config.js';
import { getCachedPlantData } from './dataManager.js';
import { debounce } from './utils.js';

const EVENT_LABELS = {
  SEEDING_EVENT: 'Seeding',
  HARVEST_EVENT: 'Harvest',
  STORAGE_EVENT: 'Storage',
  TRANSPORT_EVENT: 'Transport',
  SALES_EVENT: 'Sales'
};

const HISTORY_FILTER_LABELS = {
  ALL: 'All',
  SEEDING: 'Seeding',
  HARVEST: 'Harvest',
  STORAGE: 'Storage',
  TRANSPORT: 'Transport',
  SALES: 'Sales'
};

const HISTORY_DEFAULT_VISIBLE = 50;

const EVENT_FIELD_MAP = {
  SEEDING_EVENT: [
    { label: 'Seed Lot', field: 'seed_LotId' },
    { label: 'Variedad', field: 'seedVariety' },
    { label: 'Proveedor', field: 'seedSupplier' },
    { label: 'Método', field: 'plantingMethod' },
    { label: 'Espaciado (cm)', field: 'rowSpacing_cm' },
    { label: 'Profundidad (cm)', field: 'plantingDepth_cm' },
    { label: 'Germinación (%)', field: 'germinationRate_pct' }
  ],
  HARVEST_EVENT: [
    { label: 'Nº Cosechas', field: 'numberOfHarvests' },
    { label: 'Peso hojas (g)', field: 'leafWeight_g' },
    { label: 'Área hojas (cm²)', field: 'leafArea_cm2' },
    { label: 'Peso seco (g)', field: 'dryWeight_g' },
    { label: 'Fenólicos (mg/Kg)', field: 'phenolicComp_mgKg' }
  ],
  STORAGE_EVENT: [
    { label: 'Ubicación', field: 'locationId' },
    { label: 'Origen', field: 'sourceLatLon' },
    { label: 'Temp (°C)', field: 'temperature_C' },
    { label: 'Humedad (%)', field: 'humidity_pct' },
    { label: 'Duración (h)', field: 'duration_h' }
  ],
  TRANSPORT_EVENT: [
    { label: 'Origen', field: 'sourceLatLon' },
    { label: 'Destino', field: 'destinationLatLon' },
    { label: 'Vehículo', field: 'vehicleType' },
    { label: 'Condición', field: 'transportCondition' },
    { label: 'Duración (h)', field: 'duration_h' }
  ],
  SALES_EVENT: [
    { label: 'Comprador', field: 'buyerId' },
    { label: 'Ubicación venta', field: 'saleLocationId' },
    { label: 'Cantidad (kg)', field: 'quantity_kg' },
    { label: 'Precio (€/kg)', field: 'price_EURkg' }
  ]
};

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
  panel.dataset.activeEvent = 'HARVEST_EVENT';
  
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

    <div class="event-toggle" data-event-toggle>
      ${Object.entries(EVENT_LABELS).map(([type, label]) => (
        `<button type="button" data-event-view="${type}">${label}</button>`
      )).join('')}
    </div>

    <div class="event-details" data-event-details>
      <div class="event-details-row">Selecciona un evento</div>
    </div>
  `;
  attachEventToggleHandlers(panel);
  return panel;
}

function attachEventToggleHandlers(panel) {
  const buttons = panel.querySelectorAll('[data-event-view]');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      panel.dataset.activeEvent = btn.dataset.eventView;
      updateEventDetails(panel);
    });
  });
}

function renderGeneralFields(panel, data, confidence, plantIndex) {
  if (!data) return;
  panel.querySelector('[data-field="seedVariety"]').textContent =
    data.seedVariety || `Planta ${Number(plantIndex || 0) + 1}`;
  panel.querySelector('[data-field="confidence"]').textContent =
    `${Math.round(Number(confidence || 0) * 100)}%`;

  panel.querySelector('[data-field="eventType"]').textContent =
    EVENT_LABELS[data.eventType] || data.eventType || '--';

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
    data.seed_LotId || data.seedLotId || '--';

  panel.querySelector('[data-field="seedSupplier"]').textContent =
    data.seedSupplier || '--';

  panel.querySelector('[data-field="seedTreatment"]').textContent =
    data.seedTreatment || '--';

  panel.querySelector('[data-field="quantity"]').textContent =
    formatValue(data.quantity_kg);

  panel.querySelector('[data-field="plantingMethod"]').textContent =
    data.plantingMethod || '--';

  panel.querySelector('[data-field="rowSpacing"]').textContent =
    formatValue(data.rowSpacing_cm);

  panel.querySelector('[data-field="plantingDepth"]').textContent =
    formatValue(data.plantingDepth_cm);

  panel.querySelector('[data-field="germinationRate"]').textContent =
    formatValue(data.germinationRate_pct);

  panel.querySelector('[data-field="timestamp"]').textContent =
    formatTimestamp(data.timestamp);
}

/**
 * Actualiza solo los valores del panel (sin recrear HTML)
 */
function updatePanelValues(panel, data, confidence, plantIndex) {
  const baseHistory = data.__eventHistory || {};
  const history = { ...(panel._eventSnapshots || {}), ...baseHistory };
  if (data.eventType) {
    history[data.eventType] = data;
  }
  if (data.eventType) {
    panel.dataset.activeEvent = data.eventType;
  }
  panel._eventSnapshots = history;
  panel._confidence = confidence;
  panel._plantIndex = plantIndex;

  if (!panel.dataset.activeEvent || !history[panel.dataset.activeEvent]) {
    panel.dataset.activeEvent = Object.keys(history)[0] || 'HARVEST_EVENT';
  }

  updateEventDetails(panel);
}

function updateEventDetails(panel) {
  const container = panel.querySelector('[data-event-details]');
  if (!container) return;
  const snapshots = panel._eventSnapshots || {};
  let active = panel.dataset.activeEvent || Object.keys(snapshots)[0];
  if (!active || !snapshots[active]) {
    active = Object.keys(snapshots)[0];
  }
  if (!active) {
    container.innerHTML = '<div class="event-details-row">No hay eventos registrados.</div>';
    return;
  }
  panel.dataset.activeEvent = active;

  const selectedData = snapshots[active];

  const buttons = panel.querySelectorAll('[data-event-view]');
  buttons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.eventView === active);
  });

  if (selectedData) {
    renderGeneralFields(panel, selectedData, panel._confidence || 0, panel._plantIndex || 0);
  }

  const fields = EVENT_FIELD_MAP[active] || [];
  if (!selectedData || !fields.length) {
    container.innerHTML = '<div class="event-details-row">No hay datos para este evento.</div>';
    return;
  }

  const html = fields.map(field => {
    const value = selectedData[field.field];
    return `
      <div class="event-details-row">
        <span class="event-details-label">${field.label}</span>
        <span class="event-details-value">${formatValue(value)}</span>
      </div>`;
  }).join('');
  container.innerHTML = html || '<div class="event-details-row">No hay datos</div>';
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
    const host = STATE.panelRegion || STATE.container;
    if (STATE.panelRegion) {
      const placeholder = STATE.panelRegion.querySelector('.data-panel-placeholder');
      if (placeholder) placeholder.remove();
    }
    host.appendChild(panel);
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
  if (STATE.panelRegion) {
    panel.classList.remove('floating');
    panel.style.position = 'static';
    panel.style.top = panel.style.right = panel.style.left = panel.style.bottom = 'auto';
    panel.style.maxWidth = '100%';
    panel.style.maxHeight = 'none';
    panel.style.overflow = 'visible';
    return;
  }

  panel.classList.add('floating');
  panel.style.position = 'fixed';
  panel.style.top = '80px';
  panel.style.right = '10px';
  panel.style.left = 'auto';
  panel.style.bottom = 'auto';
  panel.style.transform = 'none';
  panel.style.maxWidth = '280px';
  panel.style.maxHeight = 'calc(100vh - 100px)';
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

  const isFS = !!(d.fullscreenElement || d.webkitFullscreenElement || d.mozFullScreenElement || d.msFullscreenElement);
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
    // Comprobación post-intento: si no entró, avisar
    setTimeout(() => {
      const nowFS = !!(d.fullscreenElement || d.webkitFullscreenElement || d.mozFullScreenElement || d.msFullscreenElement);
      if (!nowFS) {
        console.log('[Fullscreen] No se pudo activar pantalla completa nativa en este navegador');
        try { showAlert('Este navegador no permite pantalla completa nativa aquí', 'warning'); } catch {}
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
    if (!exited) {
      // No hay API para salir, no hacer nada extra
    }
  };

  if (!isFS) {
    tryEnter();
  } else {
    tryExit();
  }
}

// --------------------------------------------
// HISTORIAL ON-CHAIN
// --------------------------------------------

export function initHistoryUI(handlers = {}) {
  const filters = document.getElementById('historyFilters');
  if (filters) {
    filters.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-history-filter]');
      if (!btn) return;
      ev.preventDefault();
      handlers.onFilterChange?.(btn.dataset.historyFilter);
    });
  }

  const refreshBtn = document.getElementById('btnHistoryRefresh');
  if (refreshBtn) refreshBtn.addEventListener('click', () => handlers.onRefresh?.());

  const loadMoreBtn = document.getElementById('btnHistoryLoadMore');
  if (loadMoreBtn) loadMoreBtn.addEventListener('click', () => handlers.onLoadMore?.());

  const list = document.getElementById('historyList');
  if (list) {
    list.addEventListener('click', (ev) => {
      const card = ev.target.closest('[data-history-key]');
      if (!card) return;
      handlers.onSelectEvent?.(card.dataset.historyKey);
    });
  }

  const plantInput = document.getElementById('plantSelector');
  if (plantInput) {
    plantInput.value = getPlantIdFromURL();
    plantInput.setAttribute('readonly', 'readonly');
  }
}

export function renderHistoryTimeline(state = {}) {
  const statusEl = document.getElementById('historyStatus');
  if (statusEl) {
    if (state.error) statusEl.textContent = `⚠️ ${state.error}`;
    else if (state.loading) statusEl.textContent = 'Cargando eventos...';
    else statusEl.textContent = state.status || 'Listo';
  }

  const plantInput = document.getElementById('plantSelector');
  if (plantInput && state.plantId && plantInput.value !== state.plantId) {
    plantInput.value = state.plantId;
  }

  const list = document.getElementById('historyList');
  if (!list) return;

  const filtered = filterHistoryEvents(state);
  const limit = state.visibleCount || HISTORY_DEFAULT_VISIBLE;
  const visible = filtered.slice(Math.max(0, filtered.length - limit));

  if (!visible.length) {
    list.innerHTML = `<div class="history-empty">${state.loading ? 'Cargando...' : 'No hay eventos.'}</div>`;
  } else {
    list.innerHTML = visible.map(evt => renderHistoryCard(evt, state.selectedKey)).join('');
  }

  const loadMoreBtn = document.getElementById('btnHistoryLoadMore');
  if (loadMoreBtn) {
    loadMoreBtn.classList.toggle('hidden', filtered.length <= limit);
  }

  const filters = document.querySelectorAll('[data-history-filter]');
  filters.forEach(btn => {
    const filter = btn.dataset.historyFilter;
    const label = HISTORY_FILTER_LABELS[filter] || filter;
    const count = filter === 'ALL'
      ? (state.events?.length || 0)
      : (state.counts?.[filter] || 0);
    btn.textContent = `${label} (${count})`;
    btn.classList.toggle('active', state.filter === filter);
  });

  const debugBox = document.getElementById('historyDebug');
  if (debugBox) {
    if (state.debug && state.metrics) {
      const { fromBlock = 0, toBlock = 0, durationMs = 0, requests = [] } = state.metrics;
      debugBox.classList.remove('hidden');
      debugBox.innerHTML = `Bloques ${fromBlock}→${toBlock}<br>requests: ${requests.length}<br>tiempo: ${durationMs} ms`;
    } else {
      debugBox.classList.add('hidden');
      debugBox.textContent = '';
    }
  }
}

function filterHistoryEvents(state) {
  if (!state?.events) return [];
  if (!state.filter || state.filter === 'ALL') return [...state.events];
  return state.events.filter(evt => evt.shortType === state.filter);
}

function renderHistoryCard(evt, selectedKey) {
  const explorer = CONFIG.blockchain?.explorer || 'https://sepolia.etherscan.io';
  const date = evt.timestamp ? new Date(evt.timestamp * 1000).toLocaleString('es-ES') : 'sin fecha';
  const shortAddress = formatAddress(evt.recordedBy);
  const pretty = evt.data ? JSON.stringify(evt.data, null, 2) : evt.rawPayload;
  const cls = evt.key === selectedKey ? 'history-card active' : 'history-card';
  const label = HISTORY_FILTER_LABELS[evt.shortType] || evt.shortType;
  return `
    <article class="${cls}" data-history-key="${evt.key}">
      <header>
        <span>${label}</span>
        <span>${date}</span>
      </header>
      <div class="history-meta">
        <a href="${explorer}/tx/${evt.txHash}" target="_blank" rel="noopener">${shortAddress}</a>
        <span>#${evt.idx}</span>
      </div>
        <pre>${escapeHtml(pretty || '{}')}</pre>
    </article>
  `;
}

function escapeHtml(str = '') {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatAddress(addr = '') {
  if (!addr) return '--';
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

let txBannerTimeout;

export function showTxHashBanner(hash) {
  const banner = document.getElementById('txCopyBanner');
  const hashSpan = document.getElementById('txCopyHash');
  const copyBtn = document.getElementById('btnCopyTx');
  if (!banner || !hashSpan || !copyBtn) return;
  clearTimeout(txBannerTimeout);
  if (!hash) {
    banner.classList.add('hidden');
    return;
  }
  hashSpan.textContent = hash;
  banner.classList.remove('hidden');
  copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(hash);
      showAlert('Hash copiado al portapapeles', 'success');
    } catch (err) {
      showAlert('No se pudo copiar: ' + err.message, 'danger');
    }
  };
  txBannerTimeout = setTimeout(() => {
    banner.classList.add('hidden');
  }, 12000);
}

export function showHistoryEventInPanel(event) {
  if (!event || !event.data) return;
  const host = STATE.panelRegion || STATE.container || document.body;
  let panel = host ? host.querySelector('.data-panel') : document.querySelector('.data-panel');
  if (!panel) {
    panel = createPanelStructure('panel-history');
    if (host) host.appendChild(panel);
  }

  const normalizedType = (event.eventType || `${event.shortType}_EVENT` || 'HARVEST_EVENT').toUpperCase();
  const payload = normalizeEventPayload(event);
  panel._eventSnapshots = panel._eventSnapshots || {};
  panel._eventSnapshots[normalizedType] = payload;
  panel.dataset.activeEvent = normalizedType;
  panel._confidence = 1;
  panel._plantIndex = 0;
  renderGeneralFields(panel, payload, 1, 0);
  updateEventDetails(panel);
  panel.classList.add('visible');
}

function normalizeEventPayload(event) {
  const payload = { ...(event.data || {}) };
  payload.eventType = payload.eventType || event.eventType || event.shortType;
  payload.eventId = payload.eventId || event.key || event.txHash;
  payload.batchId = payload.batchId || payload.plantId || event.plantId || STATE.history.plantId;
  payload.lotCode = payload.lotCode || '--';
  payload.recordedBy = payload.recordedBy || event.recordedBy;
  payload.timestamp = payload.timestamp || (event.timestamp ? new Date(event.timestamp * 1000).toISOString() : undefined);
  payload.seed_LotId = payload.seed_LotId || payload.seedLotId;
  return payload;
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
