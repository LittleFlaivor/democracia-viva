// Service Worker: Democracia Viva PWA
const CACHE_NAME = 'democracia-viva-v1.8.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/pwa-192.png',
  '/pwa-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Soporte para control de ciclo de vida y limpieza forzada desde la app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
    );
  }
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests and skip firebase firestore/auth requests
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // /admin es una página independiente: nunca debe cachearse como /index.html
  if (url.pathname === '/admin' || url.pathname === '/admin.html') return;

  // Let Firestore & Firebase Auth go network-direct
  if (url.origin.includes('firestore') || url.origin.includes('firebase') || url.origin.includes('identitytoolkit')) {
    return;
  }

  // Network-First para navegaciones HTML con reload para recibir siempre la versión más reciente en vivo
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'reload' }).then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const toCache = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', toCache));
        }
        return networkRes;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        // Cache static fonts or assets
        if (url.pathname.startsWith('/assets/') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.png')) {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, toCache));
        }
        return response;
      });
    })
  );
});
