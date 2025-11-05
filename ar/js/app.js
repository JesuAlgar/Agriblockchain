// ============================================
// APLICACIÓN PRINCIPAL
// ============================================

import { CONFIG, STATE } from './config.js';
import { log } from './utils.js';
import { preloadPlantData, savePlantData, getCachedPlantData, loadPlantData } from './dataManager.js';
import { startCamera, increaseZoom, decreaseZoom, resetZoom, getCurrentZoom } from './camera.js';
import { loadModel, detect } from './detector.js';
import { toggleTheme, toggleFullscreen, showAlert } from './ui.js';
import { getPlantIdFromURL } from './config.js';

/**
 * Inicializa los event listeners de los controles
 */
function initControls() {
  // Botón cambiar tema
  const btnTheme = document.getElementById('btnTheme');
  if (btnTheme) {
    btnTheme.addEventListener('click', toggleTheme);
    log('✓ Control de tema inicializado');
  }

  // Botón pantalla completa
  const btnFullscreen = document.getElementById('btnFullscreen');
  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', toggleFullscreen);
    log('✓ Control de pantalla completa inicializado');
  }
}

// Controles de zoom
function initZoomControls() {
  const btnZoomIn = document.getElementById('btnZoomIn');
  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', async () => {
      await increaseZoom(CONFIG.camera.zoomStep);
      updateZoomIndicator();
    });
    log('Control Zoom + inicializado');
  }
  const btnZoomOut = document.getElementById('btnZoomOut');
  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', async () => {
      await decreaseZoom(CONFIG.camera.zoomStep);
      updateZoomIndicator();
    });
    log('Control Zoom - inicializado');
  }
  const btnZoomReset = document.getElementById('btnZoomReset');
  if (btnZoomReset) {
    btnZoomReset.addEventListener('click', async () => {
      await resetZoom();
      updateZoomIndicator();
    });
    log('Control Reset Zoom inicializado');
  }
}

function updateZoomIndicator() {
  const indicator = document.getElementById('zoomIndicator');
  if (!indicator) return;
  const z = getCurrentZoom();
  try {
    indicator.textContent = `Zoom: ${z.toFixed(1)}x`;
  } catch {
    indicator.textContent = `Zoom: ${z}x`;
  }
}

// Nuevo: versión simple del control de guardado
function initSaveControl2() {
  const btnSave = document.getElementById('btnSaveChain');
  if (!btnSave) return;
  btnSave.addEventListener('click', async () => {
    try {
      await openSaveModal();
    } catch (err) {
      showAlert(`Error: ${err.message}`);
    }
  });
}

// Guardar en blockchain (botón de la cabecera)
function initSaveControl() {\n  const btnSave = document.getElementById('btnSaveChain');\n  if (!btnSave) return;\n  btnSave.addEventListener('click', async () => {\n    try {\n      await openSaveModal();\n    } catch (err) {\n      showAlert(Error: );\n    }\n  });\n}\n  btnSave.addEventListener('click', async () => {
    try {
      if (typeof window.ethereum === 'undefined') {
        const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (isMobile) {
          const raw = location.href;
          const clean = raw.replace(/^https?:\/\//, '');
          const deepLink = `https://metamask.app.link/dapp/${clean}`;
          showAlert('Abriendo en MetaMask…', 'warning');
          window.location.href = deepLink;
        } else {
          showAlert('MetaMask no está disponible. Instala la extensión en tu navegador o usa el navegador de MetaMask en móvil.', 'warning');
        }
        return;
      }
      await openSaveModal();
    } catch (err) {
      showAlert(`Error: ${err.message}`);
    }
  });
}

/**
 * Registra el Service Worker para PWA
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(() => log('✓ Service Worker registrado'))
      .catch(err => log(`Service Worker no disponible: ${err.message}`, 'warn'));
  }
}

/**
 * Inicialización principal de la aplicación
 */
async function init() {
  try {
    log('=== Iniciando AR Planta IA ===');
    
    // Obtener referencias a elementos del DOM
    const video = document.getElementById('camera');
    const canvas = document.getElementById('canvas');
    const container = document.getElementById('container');
    
    if (!video || !canvas || !container) {
      throw new Error('Elementos del DOM no encontrados');
    }
    
    // Guardar referencias en el estado global
    STATE.container = container;
    
    // ⭐ LIMPIAR paneles antiguos que puedan existir
    document.querySelectorAll('.data-panel').forEach(panel => panel.remove());
    log('✓ Paneles antiguos limpiados');
    
    // Paso 1: Inicializar controles
    log('1/5 Inicializando controles...');
    initControls();
    initZoomControls();
    initSaveControl2();
    
    // Paso 2: Registrar Service Worker
    log('2/5 Registrando Service Worker...');
    registerServiceWorker();
    
    // Paso 3: Iniciar cámara
    log('3/5 Iniciando cámara...');
    await startCamera(video, canvas);
    updateZoomIndicator();
    
    // Paso 4: Cargar modelo de IA
    log('4/5 Cargando modelo de IA...');
    await loadModel();
    
    // Paso 5: Pre-cargar datos (opcional, mejora rendimiento inicial)
    log('5/5 Pre-cargando datos...');
    await preloadPlantData(2); // Pre-cargar 2 plantas
    
    // Iniciar loop de detección
    log('✓ Inicialización completa. Iniciando detección...');
    detect();
    
  } catch (err) {
    log(`Error crítico en inicialización: ${err.message}`, 'error');
    
    // Mostrar error en UI
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = `⚠️ Error: ${err.message}`;
    }
  }
}

// Iniciar aplicación cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Manejar errores no capturados
window.addEventListener('error', (event) => {
  log(`Error no capturado: ${event.message}`, 'error');
});

window.addEventListener('unhandledrejection', (event) => {
  log(`Promise rechazada: ${event.reason}`, 'error');
});

// ==========================
// Modal Guardar en blockchain
// ==========================
function genId(prefix = '') {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return prefix ? `${prefix}-${hex}` : hex;
}

function genLotCode(fieldId) {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const plot = (fieldId || 'PLOT').toString().replace(/\s+/g, '-');
  return `FARM-${y}-${m}-${day}-${plot}`;
}

async function openSaveModal() {
  const modal = document.getElementById('saveModal');
  const form = document.getElementById('saveForm');
  const cancelBtn = document.getElementById('btnCancelSave');
  if (!modal || !form || !cancelBtn) return;

  // Obtener datos actuales (de caché o cargándolos)
  let data = getCachedPlantData(0)?.data;
  if (!data) {
    try { data = await loadPlantData(0); } catch {}
  }
  data = data || {};

  // Autocompletar campos auto
  const nowIso = new Date().toISOString();
  const auto = {
    eventId: genId('EVT'),
    batchId: genId('BATCH'),
    timestamp: nowIso,
    lotCode: genLotCode(data.fieldId)
  };

  // Poner valores en el formulario
  form.querySelector('#f_eventId').value = auto.eventId;
  form.querySelector('#f_batchId').value = auto.batchId;
  form.querySelector('#f_timestamp').value = auto.timestamp;
  form.querySelector('#f_lotCode').value = auto.lotCode;

  form.querySelector('#f_eventType').value = data.eventType || '';
  form.querySelector('#f_recordedBy').value = data.recordedBy || '';
  form.querySelector('#f_fieldId').value = data.fieldId || '';
  form.querySelector('#f_seedLotId').value = data.seed_LotId || '';
  form.querySelector('#f_seedVariety').value = data.seedVariety || '';
  form.querySelector('#f_seedSupplier').value = data.seedSupplier || '';
  form.querySelector('#f_seedTreatment').value = data.seedTreatment || '';
  form.querySelector('#f_quantityKg').value = data.quantity_kg ?? '';
  form.querySelector('#f_plantingMethod').value = data.plantingMethod || '';
  form.querySelector('#f_rowSpacing').value = data.rowSpacing_cm ?? '';
  form.querySelector('#f_plantingDepth').value = data.plantingDepth_cm ?? '';
  form.querySelector('#f_germinationRate').value = data.germinationRate_pct ?? '';

  // Mostrar modal
  modal.classList.remove('hidden');

  function close() {
    modal.classList.add('hidden');
    form.onsubmit = null;
    cancelBtn.onclick = null;
  }

  cancelBtn.onclick = close;

  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        eventType: form.querySelector('#f_eventType').value || 'SEEDING',
        eventId: form.querySelector('#f_eventId').value,
        batchId: form.querySelector('#f_batchId').value,
        lotCode: form.querySelector('#f_lotCode').value,
        timestamp: form.querySelector('#f_timestamp').value,
        recordedBy: form.querySelector('#f_recordedBy').value || 'device-unknown',
        fieldId: form.querySelector('#f_fieldId').value || 'PLOT',
        seed_LotId: form.querySelector('#f_seedLotId').value || '',
        seedVariety: form.querySelector('#f_seedVariety').value || '',
        seedSupplier: form.querySelector('#f_seedSupplier').value || '',
        seedTreatment: form.querySelector('#f_seedTreatment').value || '',
        quantity_kg: parseFloat(form.querySelector('#f_quantityKg').value || '0') || 0,
        plantingMethod: form.querySelector('#f_plantingMethod').value || '',
        rowSpacing_cm: parseInt(form.querySelector('#f_rowSpacing').value || '0') || 0,
        plantingDepth_cm: parseFloat(form.querySelector('#f_plantingDepth').value || '0') || 0,
        germinationRate_pct: parseInt(form.querySelector('#f_germinationRate').value || '0') || 0,
      };

      const plantId = getPlantIdFromURL();
      showAlert('Enviando a blockchain...', 'warning');
      await savePlantData(plantId, payload);
      showAlert('Datos guardados en blockchain', 'success');
      close();
    } catch (err) {
      showAlert(`Error al guardar: ${err.message}`, 'danger');
    }
  };
}

