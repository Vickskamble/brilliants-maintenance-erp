const SW_VERSION = "bem-20261017";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
      console.log(`[sw] ${SW_VERSION} active; wiped ${keys.length} cache(s)`);
    })()
  );
});

self.addEventListener("fetch", () => {
  /* passthrough — no respondWith, so nothing is cached and no stale build can be served */
});
