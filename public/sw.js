self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    try { await self.registration.unregister(); } catch(_) {}
    try { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } catch(_) {}
  })());
});
self.addEventListener("fetch", e => {
  e.respondWith(fetch(e.request).catch(() => new Response("Network error",{status:504})));
});
