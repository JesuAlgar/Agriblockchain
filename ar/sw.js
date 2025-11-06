const CACHE_NAME = 'ar-planta-v4';
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

// Instalar
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cacheando archivos');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.warn('Service Worker: Error cacheando:', err);
      })
  );
  // Forzar activaciÃ³n inmediata
  self.skipWaiting();
});

// Activar
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Borrando cache viejo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Tomar control inmediato
  return self.clients.claim();
});

// Fetch
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // NO interceptar peticiones cross-origin (CDNs, APIs externas, etc.)
  if (url.origin !== self.location.origin) {
    // Dejar que el navegador maneje cross-origin directamente
    return;
  }

  // NO cachear el SDK de MetaMask para evitar problemas de versión
  if (url.pathname.includes('metamask-sdk')) {
    // Fetch directo, sin cache
    event.respondWith(fetch(event.request));
    return;
  }

  // Para recursos same-origin (nuestros archivos locales)
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si está en cache, devolverlo
        if (response) {
          return response;
        }
        // Si no, hacer fetch
        return fetch(event.request).catch(() => {
          // Si falla el fetch, devolver página offline si es HTML
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./index.html');
          }
        });
      })
  );
});


