// public/sw.js — minimal: unregister + clear caches + always network
self.addEventListener("install", (e) => {
  // take control fast
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      // try to unregister this worker (forces removal)
      try {
        await self.registration.unregister();
        console.log("Service worker: unregistered self");
      } catch (err) {
        console.warn("Service worker: unregister failed", err);
      }

      // clear caches created by prior SWs
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        console.log("Service worker: caches cleared");
      } catch (err) {
        console.warn("Service worker: cache cleanup failed", err);
      }
    })()
  );
});

// Always fall back to network — do not respond from cache
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request).catch(() => new Response("Network error", { status: 504 })));
});
