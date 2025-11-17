// ============================================
// DATA MANAGER - BLOCKCHAIN (ETH + WC v2) + DATOS
// ============================================

import { CONFIG, getPlantIdFromURL, STATE } from './config.js';
import { log } from './utils.js';

const plantDataCache = new Map();
let metaMaskSDKInstance = null;
let metaMaskSDKProvider = null;

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

async function waitForMetaMaskSDK(timeout = 4000) {
  if (window.MetaMaskSDK) return true;
  return new Promise(resolve => {
    const iv = setInterval(() => {
      if (window.MetaMaskSDK) {
        clearInterval(iv);
        resolve(true);
      }
    }, 100);
    setTimeout(() => {
      clearInterval(iv);
      resolve(!!window.MetaMaskSDK);
    }, timeout);
  });
}

async function ensureMetaMaskSDKProvider() {
  if (window.ethereum) return window.ethereum;
  if (metaMaskSDKProvider) return metaMaskSDKProvider;

  const ready = await waitForMetaMaskSDK();
  if (!ready) {
    log('[MetaMaskSDK] ? No se cargó el script del SDK', 'warn');
    return null;
  }

  if (!metaMaskSDKInstance) {
    try {
      const metadata = CONFIG.walletConnect?.metadata || {};
      metaMaskSDKInstance = new window.MetaMaskSDK({
        dappMetadata: {
          name: metadata.name || 'AgriBlockchain',
          url: metadata.url || window.location.origin
        },
        preferMobile: true,
        useDeeplink: true,
        logging: { developerMode: true },
        openDeeplink: (link) => {
          log('[MetaMaskSDK] → Abriendo deeplink MetaMask');
          window.location.href = link;
        }
      });
      log('[MetaMaskSDK] ✓ Instancia creada');
    } catch (err) {
      log('[MetaMaskSDK] ? Error iniciando SDK: ' + err.message, 'error');
      metaMaskSDKInstance = null;
      return null;
    }
  }

  try {
    metaMaskSDKProvider = metaMaskSDKInstance.getProvider();
    window.ethereum = metaMaskSDKProvider;
    log('[MetaMaskSDK] ✓ Provider listo en window.ethereum');
    return metaMaskSDKProvider;
  } catch (err) {
    log('[MetaMaskSDK] ? No se pudo obtener provider: ' + err.message, 'error');
    return null;
  }
}

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

    if (!window.ethereum) {
      await ensureMetaMaskSDKProvider();
    }

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
      STATE.blockchainProvider = window.ethereum;
      // Verificar red tras conectar (vía ethers getNetwork para evitar formatos distintos)
      try {
        const net = await web3Provider.getNetwork();
        const cur = Number(net.chainId);
        if (cur !== Number(network.chainId)) {
          throw new Error('Red incorrecta en la wallet. Cambia a Sepolia (chainId 11155111) en tu wallet y vuelve a intentar.');
        }
      } catch (netErr) {
        throw netErr;
      }
    } else {
      // 2. Si no hay window.ethereum, usar WalletConnect
      log('[Blockchain] No se detectó window.ethereum, intentando WalletConnect...');

      // Asegurar que el script UMD de WC está cargado (intento dinámico)
      if (typeof window.__ensureWCLoaded === 'function') {
        await window.__ensureWCLoaded();
      }

      // Obtener clase/fábrica del provider
      const W = window;
      const candidates = [
        () => W.WalletConnectEthereumProvider && W.WalletConnectEthereumProvider.init,
        () => W.EthereumProvider && W.EthereumProvider.init,
        () => W.WalletConnectProvider && W.WalletConnectProvider.init,
        () => W.WalletConnectProvider && W.WalletConnectProvider.default && W.WalletConnectProvider.default.init,
        () => W.WalletConnectEthereumProvider && W.WalletConnectEthereumProvider.default && W.WalletConnectEthereumProvider.default.init,
        () => W['@walletconnect/ethereum-provider'] && W['@walletconnect/ethereum-provider'].default && W['@walletconnect/ethereum-provider'].default.init
      ];
      let initFn = null;
      for (const get of candidates) {
        try {
          const f = get();
          if (typeof f === 'function') { initFn = f; break; }
        } catch {}
      }
      if (!initFn) {
        throw new Error('WalletConnect Provider no disponible. Verifica que el script UMD cargó correctamente.');
      }

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

      let wcProvider;
      try {
        wcProvider = await initFn.call(W, {
          projectId: CONFIG.walletConnect.projectId,
          showQrModal: true,
          // 1º intento: conectar en mainnet y pedir Sepolia como opcional
          chains: [1],
          optionalChains: [chainId],
          methods: [
            'eth_sendTransaction',
            'eth_sign',
            'personal_sign',
            'eth_signTypedData',
            'eth_signTypedData_v4'
          ],
          optionalMethods: [
            'wallet_switchEthereumChain',
            'wallet_addEthereumChain'
          ],
          events: ['chainChanged', 'accountsChanged'],
          metadata: wcMetadata,
          rpcMap: { 1: 'https://cloudflare-eth.com', [chainId]: network.rpcUrl }
        });
      } catch (initErr) {
        const msg = String(initErr?.message || initErr || '');
        // 2º intento: si la wallet soporta testnets, conectar directo a Sepolia
        if (msg.includes('Requested chains are not supported') || msg.includes('no matching key') || msg.includes('proposal')) {
          log('[Blockchain] Reintentando sesión directamente en Sepolia...', 'warn');
          wcProvider = await initFn.call(W, {
            projectId: CONFIG.walletConnect.projectId,
            showQrModal: true,
            chains: [chainId],
            optionalChains: [1],
            methods: [
              'eth_sendTransaction',
              'eth_sign',
              'personal_sign',
              'eth_signTypedData',
              'eth_signTypedData_v4'
            ],
            optionalMethods: [
              'wallet_switchEthereumChain',
              'wallet_addEthereumChain'
            ],
            events: ['chainChanged', 'accountsChanged'],
            metadata: wcMetadata,
            rpcMap: { 1: 'https://cloudflare-eth.com', [chainId]: network.rpcUrl }
          });
        } else {
          throw initErr;
        }
      }
      if (!wcProvider) {
        throw new Error('WalletConnect init() devolvió undefined');
      }

      // Habilitar sesión/cuentas (asegurando que la página tiene foco para evitar 'Document does not have focus')
      const ensureVisible = () => new Promise(resolve => {
        try {
          if (typeof document === 'undefined') return resolve();
          if (document.visibilityState === 'visible') return resolve();
          const onVis = () => {
            if (document.visibilityState === 'visible') {
              document.removeEventListener('visibilitychange', onVis);
              resolve();
            }
          };
          document.addEventListener('visibilitychange', onVis);
          // Seguridad: resolver tras 2s por si el evento no llega
          setTimeout(() => {
            document.removeEventListener('visibilitychange', onVis);
            resolve();
          }, 2000);
        } catch { resolve(); }
      });

      await ensureVisible();

      if (typeof wcProvider.enable === 'function') {
        log('[Blockchain] Solicitando conexión con wallet (enable)...');
        await wcProvider.enable();
      } else if (typeof wcProvider.request === 'function') {
        log('[Blockchain] Solicitando conexión con wallet (request accounts)...');
        await wcProvider.request({ method: 'eth_requestAccounts' });
      } else {
        log('[Blockchain] Provider obtenido, pero no expone enable/request', 'warn');
      }

      log('[Blockchain] ✓ Conectado con wallet');
      web3Provider = new ethers.providers.Web3Provider(wcProvider, 'any');
      STATE.blockchainProvider = wcProvider;

      // Verificar red después de conectar (sin forzar cambio): instruir al usuario si no es Sepolia
      try {
        const net = await web3Provider.getNetwork();
        const cur = Number(net.chainId);
        if (cur !== Number(network.chainId)) {
          throw new Error('Wallet conectada en red distinta. Abre tu wallet y cambia manualmente a Sepolia (11155111), luego vuelve y pulsa Guardar.');
        }
      } catch (netErr) {
        throw netErr;
      }
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
