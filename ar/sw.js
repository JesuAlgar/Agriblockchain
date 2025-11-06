/**
 * Service Worker - Cache strategy + no interceptar cross-origin
 * ✅ v5: skipWaiting, clientsClaim, exclusión de metamask-sdk
 */

const CACHE_NAME = 'ar-planta-v5'; // ✅ Bumped para forzar actualización
const urlsToCache = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/camera.js',
  './js/config.js',
  './js/dataManager.js',
  './js/detector.js',
  './js/ui.js',
  './js/utils.js',
  './data/planta01.json',
  './manifest.json',
  './assets/plant.png'
  // IMPORTANTE: NO cachear ./assets/metamask-sdk.min.js para evitar versiones obsoletas
];

// ✅ Instalar y skipWaiting inmediato
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando archivos...');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.warn('[SW] Error cacheando:', err);
      })
  );
  // ✅ Forzar activación inmediata (saltar waiting)
  self.skipWaiting();
});

// ✅ Activar con clientsClaim para control inmediato
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Borrando cache viejo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // ✅ Tomar control inmediato de clientes
  self.clients.claim();
});

// ✅ Fetch: NO interceptar cross-origin
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // ❌ NO interceptar cross-origin (CDNs, APIs externas)
  if (url.origin !== self.location.origin) {
    console.log('[SW] ❌ Cross-origin, pasando a red:', url.href);
    return; // Dejar que fetch proceda sin interceptar
  }

  // ❌ NO cachear el SDK de MetaMask para evitar versiones obsoletas
  if (url.pathname.includes('metamask-sdk')) {
    console.log('[SW] ❌ MetaMask SDK, fetch directo sin cache');
    event.respondWith(fetch(event.request));
    return;
  }

  // ✅ Para recursos same-origin (nuestros archivos locales)
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si está en cache, devolverlo
        if (response) {
          console.log('[SW] ✓ Cache hit:', url.pathname);
          return response;
        }
        // Si no, hacer fetch
        console.log('[SW] Cache miss, fetching:', url.pathname);
        return fetch(event.request).catch(() => {
          // Si falla el fetch, devolver página offline si es HTML
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./index.html');
          }
        });
      })
  );
});

console.log('[SW] Service Worker v5 listo');