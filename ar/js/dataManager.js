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

  // Debug: Mostrar lo que está disponible
  log('[WC] Buscando WalletConnect provider...');

  // La librería UMD de WalletConnect v2 expone el proveedor como:
  // window.WalletConnectProvider o window.WalletConnectProvider.default

  // 1. Intenta window.WalletConnectProvider.default (más común)
  if (w.WalletConnectProvider && w.WalletConnectProvider.default) {
    log('[WC] ✓ Encontrado: WalletConnectProvider.default');
    return w.WalletConnectProvider.default;
  }

  // 2. Intenta window.WalletConnectProvider directo
  if (w.WalletConnectProvider && typeof w.WalletConnectProvider.init === 'function') {
    log('[WC] ✓ Encontrado: WalletConnectProvider');
    return w.WalletConnectProvider;
  }

  // 3. Intenta window.WalletConnectEthereumProvider (nombre alternativo)
  if (w.WalletConnectEthereumProvider && w.WalletConnectEthereumProvider.init) {
    log('[WC] ✓ Encontrado: WalletConnectEthereumProvider');
    return w.WalletConnectEthereumProvider;
  }

  // 4. Intenta window.EthereumProvider
  if (w.EthereumProvider && w.EthereumProvider.init) {
    log('[WC] ✓ Encontrado: EthereumProvider');
    return w.EthereumProvider;
  }

  // 5. Intenta acceder al namespace completo
  if (w['@walletconnect/ethereum-provider'] && w['@walletconnect/ethereum-provider'].default) {
    log('[WC] ✓ Encontrado: @walletconnect/ethereum-provider');
    return w['@walletconnect/ethereum-provider'].default;
  }

  log('[WC] ✗ No se encontró ningún proveedor WalletConnect', 'error');
  log('[WC] window.WalletConnectProvider existe? ' + (!!w.WalletConnectProvider), 'warn');
  log('[WC] window.ethereum existe? ' + (!!w.ethereum), 'warn');

  return null;
}

async function getSignerAndContract() {
  try {
    const { contractAddress, contractABI, network } = CONFIG.blockchain;
    const chainId = network.chainId;

    let web3Provider;

    // 1. Detectar si Trust Wallet o MetaMask inyectaron window.ethereum
    if (window.ethereum) {
      log('[Blockchain] ✓ Detectado window.ethereum (Trust Wallet/MetaMask)');

      // Verificar si necesitamos cambiar de red
      try {
        const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
        log(`[Blockchain] Chain ID actual: ${currentChainId}, requerido: ${network.chainIdHex}`);

        if (currentChainId !== network.chainIdHex) {
          log('[Blockchain] Solicitando cambio de red a Sepolia...');
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: network.chainIdHex }],
            });
          } catch (switchError) {
            // Si la red no existe, agregarla
            if (switchError.code === 4902) {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: network.chainIdHex,
                  chainName: network.name,
                  rpcUrls: [network.rpcUrl],
                  nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
                  blockExplorerUrls: ['https://sepolia.etherscan.io']
                }],
              });
            } else {
              throw switchError;
            }
          }
        }
      } catch (err) {
        log('[Blockchain] Advertencia al verificar/cambiar red: ' + err.message, 'warn');
      }

      // Solicitar cuentas
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      // Envolver en ethers
      web3Provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
    } else {
      // 2. Si no hay window.ethereum, usar WalletConnect
      log('[Blockchain] No se detectó window.ethereum, intentando WalletConnect...');

      const EthereumProviderClass = resolveWCEProviderClass();
      if (!EthereumProviderClass) {
        throw new Error('No se detectó wallet. Para usar Trust Wallet:\n\n1. Abre esta página en el navegador de Trust Wallet (DApp Browser)\n2. O escanea el código QR desde Trust Wallet\n3. También puedes usar MetaMask en escritorio');
      }
      log('[Blockchain] Iniciando WalletConnect Provider...');
      // Metadata dinámica para que el dominio coincida exactamente con el actual
      const metaCfg = CONFIG.walletConnect?.metadata || {};
      const appOrigin = (typeof location !== 'undefined' && location.origin) ? location.origin : (metaCfg.url || '');
      let iconAbs = '';
      try {
        const rel = metaCfg.icon || './assets/plant.png';
        iconAbs = new URL(rel, (typeof location !== 'undefined' ? location.href : rel)).href;
      } catch {}
      const wcMetadata = {
        name: metaCfg.name || 'AgriBlockchain',
        description: metaCfg.description || 'AR + IA + Blockchain',
        url: appOrigin,
        icons: iconAbs ? [iconAbs] : []
      };
      const wcProvider = await EthereumProviderClass.init({
        projectId: CONFIG.walletConnect.projectId,
        showQrModal: true,
        chains: [chainId],
        metadata: wcMetadata,
        rpcMap: { [chainId]: network.rpcUrl }
      });
      log('[Blockchain] Solicitando conexión con wallet...');
      await wcProvider.enable();
      log('[Blockchain] ✓ Conectado con wallet');
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
