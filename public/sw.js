self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Apenas permite que o app funcione como PWA online
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});