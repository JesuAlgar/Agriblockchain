// ============================================
// EVENTOS ON-CHAIN (append-only)
// ============================================

import { CONFIG, STATE, setPlantIdInURL, setEventIdInURL } from './config.js';
import { ensureWalletProvider } from './dataManager.js';
import { log } from './utils.js';

const HISTORY_STATE = STATE.history;
const CACHE_PREFIX = 'agri:history';
const RANGE_BLOCKS = 10000;
const DEFAULT_VISIBLE = 50;
const subscribers = new Set();
let writableProviderCache = null;
const ABI_CODER = ethers.AbiCoder.defaultAbiCoder();

function resolveEventsContractAddress() {
  const raw = (CONFIG.events.contractAddress || '').trim();
  if (!raw || raw.startsWith('REPLACE')) {
    throw new Error('Configura CONFIG.events.contractAddress con la dirección desplegada de AgriEvents.');
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(raw)) {
    throw new Error(`Dirección del contrato de eventos inválida: ${raw}`);
  }
  return raw;
}

function notifyHistory() {
  subscribers.forEach(cb => {
    try { cb({ ...HISTORY_STATE }); } catch (err) { console.error('History subscriber error', err); }
  });
}

export function initHistoryModule({ debug = false } = {}) {
  HISTORY_STATE.debug = debug;
  HISTORY_STATE.filter = 'ALL';
  HISTORY_STATE.visibleCount = DEFAULT_VISIBLE;
  HISTORY_STATE.events = [];
  HISTORY_STATE.counts = {};
  HISTORY_STATE.selectedKey = null;
  HISTORY_STATE.error = null;
  HISTORY_STATE.loading = false;
}

export function subscribeHistory(callback) {
  if (typeof callback === 'function') {
    subscribers.add(callback);
    callback({ ...HISTORY_STATE });
  }
  return () => subscribers.delete(callback);
}

export function setHistoryFilter(filter) {
  HISTORY_STATE.filter = filter || 'ALL';
  notifyHistory();
}

export function showMoreHistory(step = 50) {
  HISTORY_STATE.visibleCount = Math.min(
    HISTORY_STATE.events.length,
    (HISTORY_STATE.visibleCount || DEFAULT_VISIBLE) + step
  );
  notifyHistory();
}

export async function loadHistoryForPlant(plantId, { force = false } = {}) {
  if (!plantId) return;
  let eventContractAddress;
  try {
    eventContractAddress = resolveEventsContractAddress();
  } catch (cfgErr) {
    HISTORY_STATE.error = cfgErr.message;
    notifyHistory();
    return;
  }

  HISTORY_STATE.plantId = plantId;
  HISTORY_STATE.loading = true;
  HISTORY_STATE.error = null;
  HISTORY_STATE.status = `Consultando ${plantId}...`;
  notifyHistory();

  const cacheKey = makeCacheKey(eventContractAddress, plantId);
  let cached = !force ? readCache(cacheKey) : null;
  let events = cached?.events || [];
  let lastBlock = cached?.lastBlock || 0;

  try {
    const { newEvents, latestBlock, metrics } = await fetchEventsFromChain(eventContractAddress, plantId, lastBlock ? lastBlock + 1 : 0);
    log(`[History] fetchEventsFromChain(${plantId}) -> ${newEvents.length} eventos visibles (último bloque ${latestBlock})`);
    HISTORY_STATE.metrics = metrics;
    if (force || !cached) {
      events = newEvents;
      lastBlock = latestBlock;
    } else if (newEvents.length) {
      events = mergeEvents(events, newEvents);
      lastBlock = latestBlock;
    }

    events.sort((a, b) => {
      if (a.timestamp === b.timestamp) {
        return a.idx - b.idx;
      }
      return a.timestamp - b.timestamp;
    });

    HISTORY_STATE.events = events;
    HISTORY_STATE.lastBlock = lastBlock;
    HISTORY_STATE.counts = buildCounts(events);
    HISTORY_STATE.visibleCount = Math.min(Math.max(HISTORY_STATE.visibleCount || DEFAULT_VISIBLE, DEFAULT_VISIBLE), events.length || DEFAULT_VISIBLE);
    const pendingEventId = HISTORY_STATE.pendingEventId;
    if (pendingEventId) {
      const match = findEventByEventId(events, pendingEventId);
      if (match) {
        HISTORY_STATE.selectedKey = match.key;
        HISTORY_STATE.selectedEvent = match;
        setEventIdInURL(match.data?.eventId || null);
      }
      HISTORY_STATE.pendingEventId = null;
    }
    if (!HISTORY_STATE.selectedKey && events.length) {
      const latest = events[events.length - 1];
      HISTORY_STATE.selectedKey = latest.key;
      HISTORY_STATE.selectedEvent = latest;
      setEventIdInURL(latest.data?.eventId || null);
    }
    HISTORY_STATE.status = `Eventos: ${events.length}`;
    HISTORY_STATE.loading = false;
    writeCache(cacheKey, { events, lastBlock });
  } catch (error) {
    HISTORY_STATE.loading = false;
    HISTORY_STATE.error = error?.message || 'Error cargando histórico';
    log('[History] Error cargando eventos: ' + HISTORY_STATE.error, 'error');
  }

  notifyHistory();
}

export function selectHistoryEvent(key) {
  if (!key) return;
  const event = HISTORY_STATE.events.find(evt => evt.key === key);
  if (!event) return;
  HISTORY_STATE.selectedKey = key;
  HISTORY_STATE.selectedEvent = event;
  if (event.data?.eventId) {
    setEventIdInURL(event.data.eventId);
  }
  notifyHistory();
}

export async function appendHistoricalEvent(plantId, eventType, jsonPayload) {
  const contractAddress = resolveEventsContractAddress();
  const provider = await getWritableProvider();
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(contractAddress, CONFIG.events.abi, signer);
  const normalizedType = eventType || 'HARVEST_EVENT';
  log('[History] addPlantEvent tipo=' + normalizedType);
  const tx = await contract.addPlantEvent(plantId, normalizedType, jsonPayload);
  const receipt = await tx.wait();
  log('[History] Tx confirmada: ' + receipt.hash);
  await loadHistoryForPlant(plantId, { force: false });
  if (HISTORY_STATE.events.length) {
    const latest = HISTORY_STATE.events[HISTORY_STATE.events.length - 1];
    HISTORY_STATE.selectedKey = latest.key;
    HISTORY_STATE.selectedEvent = latest;
    setEventIdInURL(latest.data?.eventId || null);
    notifyHistory();
  }
  return receipt.hash;
}

function buildCounts(events) {
  const counts = {
    ALL: events.length,
    SEEDING: 0,
    HARVEST: 0,
    STORAGE: 0,
    TRANSPORT: 0,
    SALES: 0
  };
  events.forEach(evt => {
    if (counts[evt.shortType] !== undefined) {
      counts[evt.shortType] += 1;
    }
  });
  return counts;
}

function mergeEvents(existing, incoming) {
  const map = new Map();
  existing.forEach(evt => map.set(evt.key, evt));
  incoming.forEach(evt => map.set(evt.key, evt));
  return Array.from(map.values());
}

async function fetchEventsFromChain(contractAddress, plantId, fromBlock) {
  const provider = await getReadProvider();
  const contract = new ethers.Contract(contractAddress, CONFIG.events.abi, provider);
  const latest = await provider.getBlockNumber();
  const deploymentBlock = Number(CONFIG.events.deploymentBlock || 0);
  const normalizedFrom = typeof fromBlock === 'number' && fromBlock >= 0 ? fromBlock : 0;
  const start = Math.max(0, deploymentBlock || 0, normalizedFrom);
  const logs = [];
  const metrics = { requests: [], fromBlock: start, toBlock: latest, startedAt: Date.now() };

  for (let block = start; block <= latest; block += RANGE_BLOCKS) {
    const to = Math.min(block + RANGE_BLOCKS - 1, latest);
    const filter = contract.filters.PlantEvent();
    const chunk = await contract.queryFilter(filter, block, to);
    logs.push(...chunk);
    metrics.requests.push({ from: block, to, events: chunk.length });
  }
  metrics.durationMs = Date.now() - metrics.startedAt;

  const mapped = logs.map(mapLog).filter(Boolean);
  const normalizedPlant = (plantId || '').trim().toLowerCase();
  const filtered = normalizedPlant
    ? mapped.filter(evt => {
        const eventPlant = (evt.plantId || evt.data?.batchId || '').trim().toLowerCase();
        return eventPlant === normalizedPlant;
      })
    : mapped;
  log(`[History] queryFilter bloques ${start}-${latest}: logs=${logs.length}, mapeados=${mapped.length}, filtrados=${filtered.length} para ${plantId}`);
  if (!filtered.length) {
    const apiEvents = await fetchEventsFromApi(contractAddress, plantId, start, latest);
    if (apiEvents.length) {
      log(`[History] fallback API devolvió ${apiEvents.length} eventos para ${plantId}`);
      return { newEvents: apiEvents, latestBlock: latest, metrics };
    }
  }
  return { newEvents: filtered, latestBlock: latest, metrics };
}

async function fetchEventsFromApi(contractAddress, plantId, fromBlock, toBlock) {
  const url = `https://eth-sepolia.blockscout.com/api?module=logs&action=getLogs&address=${contractAddress}&fromBlock=${fromBlock}&toBlock=${toBlock}`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    if (!json?.result || !Array.isArray(json.result)) return [];
    const normalizedPlant = (plantId || '').trim().toLowerCase();
    const events = [];
    for (const logEntry of json.result) {
      try {
        const [jsonPayload, timestamp, idx] = ABI_CODER.decode(
          ['string', 'uint256', 'uint256'],
          logEntry.data
        );
        let parsed = null;
        try { parsed = JSON.parse(jsonPayload); } catch { parsed = null; }
        const plantIdFromJson = (parsed?.batchId || '').trim();
        const eventTypeFromJson = (parsed?.eventType || '').trim();
        const recordedBy = (Array.isArray(logEntry.topics) && logEntry.topics[3])
          ? '0x' + logEntry.topics[3].slice(-40)
          : logEntry.address;
        const mapped = {
          key: `${logEntry.transactionHash}-${Number(logEntry.logIndex || 0)}`,
          plantId: plantIdFromJson,
          eventType: (eventTypeFromJson || '').toUpperCase(),
          shortType: (eventTypeFromJson || '').toUpperCase().replace('_EVENT', '') || 'UNKNOWN',
          recordedBy,
          timestamp: Number(timestamp || 0),
          idx: Number(idx || 0),
          blockNumber: Number(logEntry.blockNumber),
          txHash: logEntry.transactionHash,
          rawPayload: jsonPayload,
          data: parsed || { eventId: logEntry.transactionHash }
        };
        if (parsed && !parsed.eventId) parsed.eventId = logEntry.transactionHash;
        const eventPlant = (mapped.plantId || mapped.data?.batchId || '').toLowerCase();
        if (normalizedPlant && eventPlant !== normalizedPlant) continue;
        events.push(mapped);
      } catch (err) {
        log('[History] Error parseando log API: ' + (err?.message || err), 'warn');
      }
    }
    return events;
  } catch (err) {
    log('[History] Error en fallback API: ' + (err?.message || err), 'warn');
    return [];
  }
}

function mapLog(logEntry) {
  const args = logEntry.args || {};
  try {
    let plantId = '';
    if (typeof args.plantId === 'string' && !args.plantId.startsWith('0x')) {
      plantId = args.plantId;
    }
    const rawPayload = args.jsonPayload || '{}';
    let parsed = null;
    try { parsed = JSON.parse(rawPayload); } catch { parsed = null; }
    const derivedEventId = (parsed && parsed.eventId) || args.eventId || logEntry.transactionHash;
    if (parsed) parsed.eventId = derivedEventId;
    else parsed = { eventId: derivedEventId };
    if (!plantId && parsed?.batchId) {
      plantId = parsed.batchId;
    }
    let eventType = '';
    if (typeof args.eventType === 'string' && !args.eventType.startsWith('0x')) {
      eventType = args.eventType;
    } else if (parsed?.eventType) {
      eventType = parsed.eventType;
    }
    const normalized = (eventType || '').toUpperCase();
    const shortType = normalized.replace('_EVENT', '') || 'UNKNOWN';
    return {
      key: `${logEntry.transactionHash}-${Number(args.idx ?? logEntry.index ?? 0)}`,
      plantId,
      eventType: normalized,
      shortType,
      recordedBy: args.recordedBy || logEntry.args?.recordedBy || logEntry.address,
      timestamp: Number(args.timestamp || 0),
      idx: Number(args.idx || 0),
      blockNumber: logEntry.blockNumber,
      txHash: logEntry.transactionHash,
      rawPayload,
      data: parsed
    };
  } catch (error) {
    log('[History] Error parseando log: ' + error.message, 'warn');
    return null;
  }
}

function getReadProvider() {
  try {
    return new ethers.JsonRpcProvider(CONFIG.blockchain.network.rpcUrl);
  } catch (err) {
    log('[History] Error creando JsonRpcProvider: ' + (err?.message || err), 'warn');
  }
  if (window.ethereum) {
    try {
      return new ethers.BrowserProvider(window.ethereum);
    } catch (innerErr) {
      log('[History] Error usando window.ethereum como provider: ' + (innerErr?.message || innerErr), 'warn');
    }
  }
  throw new Error('No hay provider RPC disponible para leer eventos.');
}

async function getWritableProvider() {
  const base = await ensureWalletProvider();
  if (!base) throw new Error('No hay wallet conectada');
  if (writableProviderCache) return writableProviderCache;

  const provider = new ethers.BrowserProvider(window.ethereum, 'any');
  // Intentar sin prompt primero
  const accounts = await provider.send('eth_accounts', []);
  if (!accounts || !accounts.length) {
    await provider.send('eth_requestAccounts', []);
  }
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== Number(CONFIG.blockchain.network.chainId)) {
    throw new Error('Wallet conectada en red distinta. Cambia a Sepolia y reintenta.');
  }
  writableProviderCache = provider;
  return provider;
}

function makeCacheKey(contractAddress, plantId) {
  const addr = (contractAddress || '').toLowerCase();
  return `${CACHE_PREFIX}:${addr}:${plantId}`;
}

function findEventByEventId(events, eventId) {
  if (!eventId) return null;
  return events.find(evt => (evt.data?.eventId || evt.key) === eventId);
}

function readCache(key) {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeCache(key, value) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function changePlantId(newId) {
  if (!newId) return;
  setPlantIdInURL(newId);
  setEventIdInURL(null);
  HISTORY_STATE.pendingEventId = null;
  loadHistoryForPlant(newId, { force: true });
}
