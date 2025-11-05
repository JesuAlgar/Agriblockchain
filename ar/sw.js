const CACHE_NAME = 'ar-planta-v3';
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
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si estÃ¡ en cache, devolverlo
        if (response) {
          return response;
        }
        // Si no, hacer fetch
        return fetch(event.request).catch(() => {
          // Si falla el fetch, devolver pÃ¡gina offline si es HTML
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('./index.html');
          }
        });
      })
  );
});


