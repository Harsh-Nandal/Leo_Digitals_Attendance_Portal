// public/sw.js — minimal, unregister + clear caches + always network
self.addEventListener("install", (e) => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    try { await self.registration.unregister(); } catch(e){ console.warn('unregister failed', e); }
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      console.log('cleared caches');
    } catch(e){ console.warn('cache delete failed', e); }
  })());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
