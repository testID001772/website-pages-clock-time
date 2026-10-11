/**
 * System Space service worker — installability + offline support.
 *
 * Strategies:
 * - App shell (/, manifest, icons): precached on install.
 * - Everything else on this origin: network-first — never stale while
 *   online (safe with the dev server's HMR), cache fallback offline.
 * - /music/*.mp3: cache-first after the first play. Range requests are
 *   answered with the full 200 body (accepted by media elements), so a
 *   track keeps working offline once it has been played.
 */
const VERSION = "system-space-v2";
const SHELL = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      await Promise.allSettled(SHELL.map((url) => cache.add(new Request(url, { cache: "reload" }))));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

async function musicStrategy(pathname) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(pathname);
  if (hit) return hit;
  // Fetch the full body (no Range header) so the cached copy is complete.
  const response = await fetch(new Request(pathname, { headers: { accept: "*/*" } }));
  if (response.ok) await cache.put(pathname, response.clone());
  return response;
}

self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/music/")) {
    event.respondWith(
      musicStrategy(url.pathname).catch(() => caches.match("/").then((hit) => hit ?? Response.error())),
    );
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(VERSION);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        const hit = await caches.match(request, { ignoreSearch: request.mode === "navigate" });
        if (hit) return hit;
        if (request.mode === "navigate") {
          const home = await caches.match("/");
          if (home) return home;
        }
        return Response.error();
      }
    })(),
  );
});
