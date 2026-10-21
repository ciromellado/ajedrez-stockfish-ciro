// ═══════════════════════════════════════════════════════════
// SERVICE WORKER - Ajedrez Liviano Ciro
// Permite que la app funcione 100% offline
// ═══════════════════════════════════════════════════════════

const CACHE_NAME = 'ajedrez-ciro-v1';
const FILES_TO_CACHE = [
  './',
  './ajedrez_liviano_ciro.html',
  './chess.min.js',
  './stockfish.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ── INSTALACIÓN: cachea todos los archivos principales ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando archivos principales...');
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVACIÓN: limpia cachés antiguas ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME) {
          console.log('[SW] Eliminando caché antigua:', key);
          return caches.delete(key);
        }
      }));
    }).then(() => self.clients.claim())
  );
});

// ── INTERCEPCIÓN DE PETICIONES: estrategia "Cache First" ──
self.addEventListener('fetch', event => {
  // No interceptamos peticiones a recursos externos ni blobs
  if (event.request.url.startsWith('blob:') || 
      event.request.url.includes('chrome-extension') ||
      event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request)
          .then(response => {
            // Si la respuesta es válida, la guardamos en caché
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return response;
          })
          .catch(() => {
            // Si falla la red y no está en caché, devolvemos la página principal
            if (event.request.mode === 'navigate') {
              return caches.match('./ajedrez_liviano_ciro.html');
            }
          });
      })
  );
});
