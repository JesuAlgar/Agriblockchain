// ============================================
// DATA MANAGER - BLOCKCHAIN (ETH + WC v2) + DATOS
// ============================================

import { CONFIG, getPlantIdFromURL, STATE } from './config.js';
import { log } from './utils.js';

const plantDataCache = new Map();

const FALLBACK_DATA = {
  eventType: "MONITOR",
  eventId: "01FALLBACK",
  batchId: "01FALLBACK",
  lotCode: "DEMO",
  timestamp: new Date().toISOString(),
  recordedBy: "device-DEMO",
  fieldId: "DEMO-FIELD",
  seed_LotId: "DEMO",
  seedVariety: "Demo Plant",
  seedSupplier: "Demo",
  seedTreatment: "demo",
  quantity_kg: 0.0,
  plantingMethod: "demo",
  rowSpacing_cm: 0,
  plantingDepth_cm: 0.0,
  germinationRate_pct: 0
};

// --------------------------------------------
// Provider / Signer via MetaMask or WalletConnect
// --------------------------------------------
function resolveWCEProviderClass() {
  const w = window;
  // Prefer explicit global
  if (w.WalletConnectEthereumProvider && w.WalletConnectEthereumProvider.init) return w.WalletConnectEthereumProvider;
  // Some UMDs expose as EthereumProvider
  if (w.EthereumProvider && w.EthereumProvider.init) return w.EthereumProvider;
  // Some builds expose as default under namespaces
  if (w.WalletConnectEthereumProvider && w.WalletConnectEthereumProvider.default && w.WalletConnectEthereumProvider.default.init) return w.WalletConnectEthereumProvider.default;
  if (w.WalletConnectProvider && w.WalletConnectProvider.default && w.WalletConnectProvider.default.init) return w.WalletConnectProvider.default;
  return null;
}

async function getSignerAndContract() {
  try {
    const { contractAddress, contractABI, network } = CONFIG.blockchain;
    const chainId = network.chainId;

    let web3Provider;

    if (window.ethereum) {
      log('[Blockchain] Usando window.ethereum');
      // Solicitar cuentas
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      // Envolver en ethers
      web3Provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
    } else {
      const EthereumProviderClass = resolveWCEProviderClass();
      if (!EthereumProviderClass) {
        throw new Error('MetaMask/WalletConnect no disponible. Abre con una wallet o usa QR en escritorio.');
      }
      log('[Blockchain] Iniciando WalletConnect Provider (UMD)');
      const wcProvider = await EthereumProviderClass.init({
        projectId: CONFIG.walletConnect.projectId,
        showQrModal: true,
        chains: [chainId],
        metadata: CONFIG.walletConnect.metadata
      });
      await wcProvider.enable();
      web3Provider = new ethers.providers.Web3Provider(wcProvider, 'any');
      STATE.blockchainProvider = wcProvider;
    }

    const signer = web3Provider.getSigner();
    const contract = new ethers.Contract(contractAddress, contractABI, signer);
    STATE.blockchainConnected = true;
    STATE.blockchainContract = contract;
    return { signer, contract };
  } catch (error) {
    STATE.blockchainConnected = false;
    throw error;
  }
}

/**
 * GUARDA EN BLOCKCHAIN
 */
export async function savePlantData(plantId, data) {
  try {
    log('[Blockchain] Guardando...');

    const json = JSON.stringify(data);
    // Guardado local para reflejar cambios inmediatos en la UI
    localStorage.setItem('plant_' + plantId, json);

    // Enviar a blockchain
    const { contract } = await getSignerAndContract();
    const tx = await contract.setPlantData(plantId, json);
    log('[Blockchain] Tx enviada: ' + tx.hash);
    const receipt = await tx.wait();
    log('[Blockchain] ✅ Confirmada en bloque: ' + receipt.blockNumber);
    return receipt;

  } catch (error) {
    log('[Blockchain] ❌ Error: ' + (error?.message || error), 'error');
    throw error;
  }
}

/**
 * CARGA DATOS
 */
export async function loadPlantData(plantIndex) {
  try {
    const plantId = getPlantIdFromURL();
    // Primero, datos locales si existen
    const local = localStorage.getItem('plant_' + plantId);
    let data;
    if (local) {
      data = JSON.parse(local);
    } else {
      const url = './data/' + encodeURIComponent(plantId) + '.json';
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) return FALLBACK_DATA;
      data = await response.json();
    }
    plantDataCache.set(plantIndex, { data, lastUpdate: Date.now() });
    return data;
  } catch (error) {
    return FALLBACK_DATA;
  }
}

export function getCachedPlantData(plantIndex) {
  return plantDataCache.get(plantIndex);
}

export function clearPlantCache(plantIndex) {
  plantDataCache.delete(plantIndex);
}

export async function preloadPlantData(count = 3) {
  const promises = [];
  for (let i = 0; i < count; i++) {
    promises.push(loadPlantData(i).catch(() => {}));
  }
  await Promise.all(promises);
}
