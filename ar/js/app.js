// ============================================
// APP.JS - ARRANQUE LIGERO Y UI LIMPIA
// ============================================

import { log } from './utils.js';
import { startCamera, increaseZoom, decreaseZoom, resetZoom, getCurrentZoom } from './camera.js';
import { loadModel, detect } from './detector.js';
import { savePlantData } from './dataManager.js';
import { toggleTheme, toggleFullscreen, showAlert } from './ui.js';
import { STATE } from './config.js';

// --------------------------------------------
// Arranque principal
// --------------------------------------------
async function init() {
  try {
    log('=== Iniciando AR Planta IA ===');

    // Referencias DOM
    const video = document.getElementById('camera');
    const canvas = document.getElementById('canvas');
    const container = document.getElementById('container');
    if (!video || !canvas || !container) throw new Error('No se encontró cámara/canvas/contenedor');

    // Guardar contenedor global para UI
    STATE.container = container;

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

  const btnConfirmSave = byId('btnConfirmSave');
  const btnCancelSave = byId('btnCancelSave');
  if (btnConfirmSave) btnConfirmSave.addEventListener('click', handleConfirmSave);
  if (btnCancelSave) btnCancelSave.addEventListener('click', () => toggleSaveModal(false));
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
  set('f_eventId', 'EVT-' + Date.now());
  set('f_batchId', 'BATCH-' + Math.random().toString(36).slice(2, 10));
  set('f_timestamp', new Date().toISOString());
  set('f_lotCode', 'LOT-' + new Date().getFullYear());
  set('f_recordedBy', 'device-web');
  toggleSaveModal(true);
}

function toggleSaveModal(show) {
  const modal = document.getElementById('saveModal');
  if (!modal) return;
  modal.classList[show ? 'remove' : 'add']('hidden');
}

async function handleConfirmSave(e) {
  e.preventDefault();
  const btn = e.currentTarget;
  try {
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

    const get = (id) => (document.getElementById(id)?.value || '').trim();
    const data = {
      eventType: get('f_eventType') || 'MONITOR',
      eventId: get('f_eventId'),
      batchId: get('f_batchId'),
      timestamp: get('f_timestamp'),
      lotCode: get('f_lotCode'),
      recordedBy: get('f_recordedBy') || 'device-web',
      fieldId: get('f_fieldId') || 'FIELD-1',
      seed_LotId: get('f_seedLotId') || 'SEED-001',
      seedVariety: get('f_seedVariety') || 'Unknown',
      seedSupplier: get('f_seedSupplier') || 'Unknown',
      seedTreatment: get('f_seedTreatment') || 'None',
      quantity_kg: parseFloat(get('f_quantityKg') || '0') || 0,
      plantingMethod: get('f_plantingMethod') || 'Manual',
      rowSpacing_cm: parseInt(get('f_rowSpacing') || '20') || 20,
      plantingDepth_cm: parseFloat(get('f_plantingDepth') || '2.0') || 2.0,
      germinationRate_pct: parseInt(get('f_germinationRate') || '80') || 80
    };

    const plantId = 'planta01';
    showAlert('Enviando a blockchain...', 'warning');
    await savePlantData(plantId, data);
    showAlert('Datos guardados en blockchain', 'success');
    toggleSaveModal(false);
  } catch (err) {
    log('Error guardando: ' + err.message, 'error');
    showAlert('Error guardando: ' + err.message, 'danger');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Guardar'; }
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

