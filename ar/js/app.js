// ============================================
// APP.JS - INTEGRACION COMPLETA
// ============================================

import { loginWithMagic, getMagicUser, logoutMagic, savePlantData } from './dataManager.js';
import { log } from './utils.js';

let isModelLoaded = false;
let net;

/**
 * INICIALIZAR APP
 */
async function initApp() {
  log('Inicializando app...');
  
  try {
    log('Cargando modelo de IA...');
    net = await cocoSsd.load();
    isModelLoaded = true;
    log('✅ Modelo cargado');
    document.getElementById('loading').style.display = 'none';
  } catch (error) {
    log('❌ Error cargando modelo: ' + error.message, 'error');
  }

  setupUIEvents();
  
  const user = await getMagicUser();
  if (user) {
    log('✅ Usuario ya logeado: ' + user.email);
    updateUILogged(user);
  } else {
    log('Usuario no logeado');
    updateUINotLogged();
  }
}

/**
 * SETUP EVENTOS UI
 */
function setupUIEvents() {
  const loginBtn = document.getElementById('btnLogin');
  const emailInput = document.getElementById('emailInput');
  
  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      if (!email) {
        log('Por favor ingresa un email', 'warn');
        return;
      }
      await handleLogin(email);
    });
  }

  const logoutBtn = document.getElementById('btnLogout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  const saveChainBtn = document.getElementById('btnSaveChain');
  if (saveChainBtn) {
    saveChainBtn.addEventListener('click', handleSaveBlockchain);
  }

  const confirmSaveBtn = document.getElementById('btnConfirmSave');
  if (confirmSaveBtn) {
    confirmSaveBtn.addEventListener('click', handleConfirmSave);
  }

  const cancelSaveBtn = document.getElementById('btnCancelSave');
  if (cancelSaveBtn) {
    cancelSaveBtn.addEventListener('click', handleCancelSave);
  }

  const zoomInBtn = document.getElementById('btnZoomIn');
  const zoomOutBtn = document.getElementById('btnZoomOut');
  const zoomResetBtn = document.getElementById('btnZoomReset');

  if (zoomInBtn) zoomInBtn.addEventListener('click', () => zoomCamera(1.2));
  if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => zoomCamera(0.8));
  if (zoomResetBtn) zoomResetBtn.addEventListener('click', () => zoomCamera(1.0));
}

/**
 * HANDLE LOGIN
 */
async function handleLogin(email) {
  try {
    log('Intentando login con: ' + email);
    
    const token = await loginWithMagic(email);
    
    log('✅ Login exitoso');
    
    const user = await getMagicUser();
    updateUILogged(user);

  } catch (error) {
    log('❌ Error en login: ' + error.message, 'error');
  }
}

/**
 * HANDLE LOGOUT
 */
async function handleLogout() {
  try {
    await logoutMagic();
    log('✅ Logout exitoso');
    updateUINotLogged();
  } catch (error) {
    log('❌ Error en logout: ' + error.message, 'error');
  }
}

/**
 * UPDATE UI - LOGEADO
 */
function updateUILogged(user) {
  log('Actualizando UI - Usuario logeado: ' + user.email);

  const statusDiv = document.getElementById('status');
  if (statusDiv) {
    statusDiv.innerHTML = '✅ ' + user.email + ' | ' + user.publicAddress.substring(0, 10) + '...';
  }

  const saveChainBtn = document.getElementById('btnSaveChain');
  if (saveChainBtn) saveChainBtn.disabled = false;

  const form = document.getElementById('loginForm');
  if (form) form.style.display = 'none';
}

/**
 * UPDATE UI - NO LOGEADO
 */
function updateUINotLogged() {
  log('Actualizando UI - No logeado');

  const statusDiv = document.getElementById('status');
  if (statusDiv) {
    statusDiv.innerHTML = '⚠️ No logeado';
  }

  const saveChainBtn = document.getElementById('btnSaveChain');
  if (saveChainBtn) saveChainBtn.disabled = true;

  const form = document.getElementById('loginForm');
  if (form) form.style.display = 'block';
}

/**
 * HANDLE GUARDAR EN BLOCKCHAIN
 */
async function handleSaveBlockchain() {
  try {
    const user = await getMagicUser();
    
    if (!user) {
      log('❌ No logeado. Haz login primero', 'error');
      return;
    }

    log('📝 Abriendo formulario de guardado...');

    const form = document.getElementById('saveForm');
    if (form) {
      document.getElementById('f_eventId').value = 'EVT-' + Date.now();
      document.getElementById('f_batchId').value = 'BATCH-' + Math.random().toString(36).substr(2, 9);
      document.getElementById('f_timestamp').value = new Date().toISOString();
      document.getElementById('f_lotCode').value = 'LOT-' + new Date().getFullYear();
      document.getElementById('f_recordedBy').value = 'device-' + user.publicAddress.substring(0, 8);
    }

    const modal = document.getElementById('saveModal');
    if (modal) {
      modal.classList.remove('hidden');
    }

  } catch (error) {
    log('❌ Error: ' + error.message, 'error');
  }
}

/**
 * HANDLE CONFIRMAR GUARDADO
 */
async function handleConfirmSave(e) {
  e.preventDefault();

  try {
    const user = await getMagicUser();
    if (!user) {
      log('❌ No logeado', 'error');
      return;
    }

    log('💾 Guardando datos...');

    const data = {
      eventType: document.getElementById('f_eventType').value || 'MONITOR',
      eventId: document.getElementById('f_eventId').value,
      batchId: document.getElementById('f_batchId').value,
      timestamp: document.getElementById('f_timestamp').value,
      lotCode: document.getElementById('f_lotCode').value,
      recordedBy: document.getElementById('f_recordedBy').value,
      fieldId: document.getElementById('f_fieldId').value || 'FIELD-1',
      seed_LotId: document.getElementById('f_seedLotId').value || 'SEED-001',
      seedVariety: document.getElementById('f_seedVariety').value || 'Unknown',
      seedSupplier: document.getElementById('f_seedSupplier').value || 'Unknown',
      seedTreatment: document.getElementById('f_seedTreatment').value || 'None',
      quantity_kg: parseFloat(document.getElementById('f_quantityKg').value) || 0,
      plantingMethod: document.getElementById('f_plantingMethod').value || 'Manual',
      rowSpacing_cm: parseInt(document.getElementById('f_rowSpacing').value) || 20,
      plantingDepth_cm: parseFloat(document.getElementById('f_plantingDepth').value) || 2.0,
      germinationRate_pct: parseInt(document.getElementById('f_germinationRate').value) || 80
    };

    log('📤 Enviando datos...');

    const result = await savePlantData('plant-' + user.publicAddress, data);

    log('✅ ¡Guardado exitosamente!');

    const modal = document.getElementById('saveModal');
    if (modal) {
      modal.classList.add('hidden');
    }

  } catch (error) {
    log('❌ Error guardando: ' + error.message, 'error');
  }
}

/**
 * HANDLE CANCELAR GUARDADO
 */
function handleCancelSave() {
  const modal = document.getElementById('saveModal');
  if (modal) {
    modal.classList.add('hidden');
  }
  log('Guardado cancelado');
}

/**
 * ZOOM CAMERA
 */
function zoomCamera(factor) {
  const canvas = document.getElementById('canvas');
  if (!canvas) return;

  const style = canvas.style.transform || 'scale(1)';
  const currentScale = parseFloat(style.match(/\d+\.?\d*/)[0]) || 1;
  const newScale = currentScale * factor;

  canvas.style.transform = 'scale(' + newScale + ')';
  
  const indicator = document.getElementById('zoomIndicator');
  if (indicator) {
    indicator.textContent = 'Zoom: ' + newScale.toFixed(1) + 'x';
  }
}

/**
 * CUANDO CARGA LA PAGINA
 */
document.addEventListener('DOMContentLoaded', () => {
  log('DOM cargado');
  initApp();
});