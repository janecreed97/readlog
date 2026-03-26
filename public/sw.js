// Alexandria service worker — minimal, required for PWA install + share_target
const CACHE = 'alexandria-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

// Intercept GET requests only; pass everything else through to the network.
// A fetch handler is required for Chrome to treat this as a controllable PWA.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  )
})
