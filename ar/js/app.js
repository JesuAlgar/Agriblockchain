// ============================================
// APP.JS - ARRANQUE LIGERO Y UI LIMPIA
// ============================================

import { log } from './utils.js';
import { startCamera, increaseZoom, decreaseZoom, resetZoom, getCurrentZoom } from './camera.js';
import { loadModel, detect } from './detector.js';
import { toggleTheme, toggleFullscreen, showAlert, initHistoryUI, renderHistoryTimeline, showTxHashBanner, showHistoryEventInPanel } from './ui.js';
import { initHistoryModule, subscribeHistory, loadHistoryForPlant, setHistoryFilter, showMoreHistory, selectHistoryEvent, appendHistoricalEvent, changePlantId } from './events.js';
import { STATE, getPlantIdFromURL, setPlantIdInURL, getEventIdFromURL, setEventIdInURL } from './config.js';

// --------------------------------------------
// Arranque principal
// --------------------------------------------
async function init() {
  try {
    log('=== Iniciando AR Planta IA ===');
    const params = new URLSearchParams(location.search);
    const debug = params.get('debug') === '1';
    initHistoryModule({ debug });
    STATE.history.pendingEventId = getEventIdFromURL() || null;
    subscribeHistory((state) => {
      renderHistoryTimeline(state);
      if (STATE.detectionCount > 0 && state.selectedEvent) {
        showHistoryEventInPanel(state.selectedEvent);
      }
    });

    // Referencias DOM
    const video = document.getElementById('camera');
    const canvas = document.getElementById('canvas');
    const container = document.getElementById('container');
    if (!video || !canvas || !container) throw new Error('No se encontró cámara/canvas/contenedor');

    // Guardar contenedor global para UI
    STATE.container = container;
    STATE.panelRegion = document.getElementById('panelRegion');

    // Enlazar UI
    wireUI();

    // Cámara
    log('Cámara: solicitando permisos...');
    await startCamera(video, canvas);
    log('Cámara lista');

    // IA
    log('Cargando modelo de IA...');
    await loadModel();
    log('IA lista, iniciando detección...');
    detect();
    scheduleHistoryLoadOnDetection(getPlantIdFromURL());

  } catch (err) {
    log(`Error de arranque: ${err.message}`, 'error');
    showAlert(`Error: ${err.message}`);
  }
}

// --------------------------------------------
// UI y eventos
// --------------------------------------------
function wireUI() {
  const byId = (id) => document.getElementById(id);

  // Tema / pantalla completa
  const btnTheme = byId('btnTheme');
  if (btnTheme) btnTheme.addEventListener('click', toggleTheme);

  const btnFullscreen = byId('btnFullscreen');
  if (btnFullscreen) btnFullscreen.addEventListener('click', toggleFullscreen);

  // Zoom
  const btnZoomIn = byId('btnZoomIn');
  const btnZoomOut = byId('btnZoomOut');
  const btnZoomReset = byId('btnZoomReset');
  if (btnZoomIn) btnZoomIn.addEventListener('click', async () => { await increaseZoom(0.2); updateZoomIndicator(); });
  if (btnZoomOut) btnZoomOut.addEventListener('click', async () => { await decreaseZoom(0.2); updateZoomIndicator(); });
  if (btnZoomReset) btnZoomReset.addEventListener('click', async () => { await resetZoom(); updateZoomIndicator(); });
  updateZoomIndicator();

  // Guardado en blockchain
  const btnSaveChain = byId('btnSaveChain');
  if (btnSaveChain) btnSaveChain.addEventListener('click', openSaveModal);

  const btnEditJson = byId('btnEditJson');
  if (btnEditJson) btnEditJson.addEventListener('click', openJsonModal);
  const btnNewPlant = byId('btnNewPlant');
  if (btnNewPlant) btnNewPlant.addEventListener('click', handleNewPlant);

  const btnConfirmSave = byId('btnConfirmSave');
  const btnCancelSave = byId('btnCancelSave');
  if (btnConfirmSave) btnConfirmSave.addEventListener('click', handleConfirmSave);
  if (btnCancelSave) btnCancelSave.addEventListener('click', () => toggleSaveModal(false));

  const btnJsonSave = byId('btnJsonSave');
  const btnJsonCancel = byId('btnJsonCancel');
  if (btnJsonSave) btnJsonSave.addEventListener('click', handleJsonSave);
  if (btnJsonCancel) btnJsonCancel.addEventListener('click', () => toggleJsonModal(false));

  const eventTypeSelect = byId('f_eventType');
  if (eventTypeSelect) eventTypeSelect.addEventListener('change', updateEventSections);

  initHistoryUI({
    onFilterChange: (filter) => setHistoryFilter(filter || 'ALL'),
    onRefresh: () => {
      STATE.history.loadedOnce = true;
      loadHistoryForPlant(STATE.history.plantId || getPlantIdFromURL(), { force: true });
    },
    onLoadMore: () => showMoreHistory(),
    onSelectEvent: (key) => selectHistoryEvent(key),
    onChangePlantId: (newId) => {
      STATE.history.loadedOnce = true;
      changePlantId(newId);
    }
  });

  const btnToggleHistory = byId('btnToggleHistory');
  const historyWrapper = byId('historyWrapper');
  if (btnToggleHistory && historyWrapper) {
    btnToggleHistory.addEventListener('click', () => {
      historyWrapper.classList.toggle('hidden');
    });
  }
}

function updateZoomIndicator() {
  const indicator = document.getElementById('zoomIndicator');
  if (!indicator) return;
  const z = getCurrentZoom();
  indicator.textContent = `Zoom: ${Number(z).toFixed(1)}x`;
}

// --------------------------------------------
// Guardado en blockchain
// --------------------------------------------
function openSaveModal() {
  // Relleno automático básico
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  set('f_eventId', generateUlid());
  set('f_batchId', generateUlid());
  set('f_timestamp', new Date().toISOString());
  set('f_lotCode', 'LOT-' + new Date().getFullYear());
  set('f_eventType', 'HARVEST_EVENT');
  clearEventInputs();
  updateEventSections();
  toggleSaveModal(true);
}

function toggleSaveModal(show) {
  const modal = document.getElementById('saveModal');
  if (!modal) return;
  modal.classList[show ? 'remove' : 'add']('hidden');
}

function clearEventInputs() {
  document.querySelectorAll('[data-event-input]').forEach(input => {
    input.value = '';
  });
}

function updateEventSections() {
  const select = document.getElementById('f_eventType');
  const type = select ? select.value : 'HARVEST_EVENT';
  document.querySelectorAll('[data-event-section]').forEach(section => {
    const match = section.dataset.eventSection === type;
    section.classList.toggle('hidden', !match);
  });
}

async function openJsonModal() {
  const editor = document.getElementById('jsonEditor');
  if (!editor) return;

  try {
    const selected = STATE.history?.selectedEvent?.data;
    if (selected) {
      editor.value = JSON.stringify(selected, null, 2);
    } else {
      editor.value = JSON.stringify({
        eventId: getEventIdFromURL() || generateUlid(),
        batchId: getPlantIdFromURL(),
        timestamp: new Date().toISOString()
      }, null, 2);
    }
  } catch (err) {
    editor.value = JSON.stringify({ error: 'No se pudieron cargar los datos base', reason: err?.message || err }, null, 2);
  }

  toggleJsonModal(true);
}

function toggleJsonModal(show) {
  const modal = document.getElementById('jsonModal');
  if (!modal) return;
  modal.classList[show ? 'remove' : 'add']('hidden');
}

function getInputValue(id) {
  return (document.getElementById(id)?.value || '').trim();
}

function getFloatValue(id) {
  const val = parseFloat(getInputValue(id));
  return Number.isFinite(val) ? val : 0;
}

function getIntValue(id) {
  const val = parseInt(getInputValue(id), 10);
  return Number.isFinite(val) ? val : 0;
}

function generateUlid() {
  const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let ts = Date.now();
  const timeChars = new Array(10);
  for (let i = 9; i >= 0; i--) {
    timeChars[i] = ENCODING[ts % 32];
    ts = Math.floor(ts / 32);
  }
  const randChars = new Array(16);
  const randomValues = (window.crypto && crypto.getRandomValues)
    ? crypto.getRandomValues(new Uint8Array(16))
    : Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  for (let i = 0; i < 16; i++) {
    randChars[i] = ENCODING[randomValues[i] % 32];
  }
  return timeChars.join('') + randChars.join('');
}

function handleNewPlant() {
  const confirmNew = window.confirm('¿Generar un nuevo batch y reemplazar el de la URL actual?');
  if (!confirmNew) return;

  const newId = generateUlid();

  const rawEvent = prompt('eventId (opcional)', getEventIdFromURL() || '');
  const eventId = rawEvent ? rawEvent.trim() : null;

  setPlantIdInURL(newId);
  if (eventId) {
    setEventIdInURL(eventId);
    STATE.history.pendingEventId = eventId;
  } else {
    setEventIdInURL(null);
    STATE.history.pendingEventId = null;
  }

  showAlert(`Planta creada: ${newId}`, 'info');
  STATE.history.loadedOnce = true;
  loadHistoryForPlant(newId, { force: true });
}

function buildEventPayload() {
  const eventType = document.getElementById('f_eventType')?.value || 'HARVEST_EVENT';
  const eventId = getInputValue('f_eventId');
  const batchId = getInputValue('f_batchId');
  const timestamp = getInputValue('f_timestamp') || new Date().toISOString();
  const lotCode = getInputValue('f_lotCode');

  if (!batchId) throw new Error('batchId es obligatorio.');
  if (!lotCode) throw new Error('lotCode es obligatorio.');

  const data = {
    eventType,
    eventId: eventId || generateUlid(),
    batchId,
    lotCode,
    timestamp
  };

  switch (eventType) {
    case 'HARVEST_EVENT':
      data.numberOfHarvests = getIntValue('f_numberOfHarvests');
      data.leafWeight_g = getFloatValue('f_leafWeight');
      data.leafArea_cm2 = getFloatValue('f_leafArea');
      data.dryWeight_g = getFloatValue('f_dryWeight');
      data.phenolicComp_mgKg = getFloatValue('f_phenolic');
      break;
    case 'SEEDING_EVENT':
      data.seed_LotId = getInputValue('f_seedLotSeeding');
      data.seedVariety = getInputValue('f_seedVarietySeeding');
      data.seedSupplier = getInputValue('f_seedSupplierSeeding');
      data.plantingMethod = getInputValue('f_plantingMethodSeeding');
      data.rowSpacing_cm = getFloatValue('f_rowSpacingSeeding');
      data.plantingDepth_cm = getFloatValue('f_plantingDepthSeeding');
      data.germinationRate_pct = getFloatValue('f_germinationRateSeeding');
      break;
    case 'STORAGE_EVENT':
      data.locationId = getInputValue('f_storageLocation');
      data.sourceLatLon = getInputValue('f_storageSource');
      data.temperature_C = getFloatValue('f_storageTemp');
      data.humidity_pct = getFloatValue('f_storageHumidity');
      data.duration_h = getFloatValue('f_storageDuration');
      break;
    case 'TRANSPORT_EVENT':
      data.sourceLatLon = getInputValue('f_transportSource');
      data.destinationLatLon = getInputValue('f_transportDest');
      data.vehicleType = getInputValue('f_transportVehicle');
      data.transportCondition = getInputValue('f_transportCondition');
      data.duration_h = getFloatValue('f_transportDuration');
      break;
    case 'SALES_EVENT':
      data.buyerId = getInputValue('f_salesBuyer');
      data.saleLocationId = getInputValue('f_salesLocation');
      data.quantity_kg = getFloatValue('f_salesQuantity');
      data.price_EURkg = getFloatValue('f_salesPrice');
      break;
    default:
      throw new Error('Tipo de evento no soportado.');
  }

  return data;
}

function resolvePlantIdFromData(data) {
  if (data?.batchId && data.batchId.trim().length > 0) {
    return data.batchId.trim();
  }
  return getPlantIdFromURL();
}

async function handleConfirmSave(e) {
  e.preventDefault();
  const btn = e.currentTarget;
  try {
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

    const data = buildEventPayload();
    const plantId = resolvePlantIdFromData(data);
    if (!plantId) {
      throw new Error('batchId es obligatorio para identificar el lote.');
    }
    data.batchId = plantId;
    setPlantIdInURL(plantId);
    if (data.eventId) {
      STATE.history.pendingEventId = data.eventId;
      setEventIdInURL(data.eventId);
    }
    showAlert('Añadiendo evento histórico... Firma en MetaMask y vuelve a esta pestaña para completar.', 'warning');
    const txHash = await appendHistoricalEvent(plantId, data.eventType, JSON.stringify(data));
    showTxHashBanner(txHash);
    showAlert(`Evento guardado (${txHash.slice(0, 8)}…)`, 'success');
    toggleSaveModal(false);
  } catch (err) {
    log('Error guardando: ' + err.message, 'error');
    showAlert('Error guardando: ' + err.message, 'danger');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Guardar'; }
  }
}

async function handleJsonSave(e) {
  e.preventDefault();
  const btn = e.currentTarget;
  const editor = document.getElementById('jsonEditor');
  if (!editor) return;

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Guardando...';
    }

    let parsed;
    try {
      parsed = JSON.parse(editor.value);
      if (typeof parsed !== 'object' || Array.isArray(parsed) || !parsed) {
        throw new Error('El JSON debe ser un objeto con claves/valores');
      }
    } catch (jsonErr) {
      throw new Error('JSON inv�lido: ' + jsonErr.message);
    }

    const plantId = resolvePlantIdFromData(parsed);
    if (!plantId) {
      throw new Error('El JSON debe incluir "batchId" con un valor no vacío.');
    }
    parsed.batchId = plantId;
    setPlantIdInURL(plantId);
    if (!parsed.eventId) {
      parsed.eventId = generateUlid();
    }
    STATE.history.pendingEventId = parsed.eventId;
    setEventIdInURL(parsed.eventId);
    showAlert('Añadiendo evento histórico... Firma en MetaMask y vuelve a esta pestaña para completar.', 'warning');
    const txHash = await appendHistoricalEvent(plantId, parsed.eventType || 'CUSTOM', JSON.stringify(parsed));
    showTxHashBanner(txHash);
    showAlert(`Evento guardado (${txHash.slice(0, 8)}…)`, 'success');
    toggleJsonModal(false);
  } catch (err) {
    log('Error guardando JSON: ' + err.message, 'error');
    showAlert('Error guardando JSON: ' + err.message, 'danger');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Guardar JSON';
    }
  }
}

// --------------------------------------------
// Arranque
// --------------------------------------------
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function scheduleHistoryLoadOnDetection(plantId) {
  if (!plantId) return;
  const wait = () => {
    if (STATE.history.loadedOnce) return;
    if (STATE.detectionCount > 0) {
      STATE.detectedOnce = true;
      STATE.history.loadedOnce = true;
      loadHistoryForPlant(plantId, { force: true });
      return;
    }
    requestAnimationFrame(wait);
  };
  wait();
}
