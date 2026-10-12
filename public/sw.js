/**
 * Clock Time service worker — installability + offline support.
 *
 * Strategies:
 * - App shell (the app root, manifest, icons): precached on install.
 * - Everything else on this origin: network-first — never stale while
 *   online (safe with the dev server's HMR), cache fallback offline.
 * - music/*.mp3 and api/music/<id> (an uploaded track): cache-first after the
 *   first play, so a track keeps working offline once it has been played.
 *
 * Every path is built from `BASE` — the directory this worker is served from
 * (`self.registration.scope`), so `/` at the root and
 * `/website-pages-clock-time-/` on the GitHub Pages build. Precaching the wrong
 * shell would poison the offline experience with the host's 404 page.
 */
const BASE = new URL(self.registration.scope).pathname;
const VERSION = "clock-time-v6";
const SHELL = [
  BASE,
  `${BASE}background.jpg`,
  `${BASE}manifest.webmanifest`,
  `${BASE}icon-192.png`,
  `${BASE}icon-512.png`,
  `${BASE}favicon.svg`,
];
/** The audio that is worth keeping offline (first play caches it). */
const MUSIC_PATHS = [`${BASE}music/`, `${BASE}api/music/`];

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

  if (MUSIC_PATHS.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(
      musicStrategy(url.pathname).catch(() =>
        caches.match(BASE).then((hit) => hit ?? Response.error()),
      ),
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
          const home = await caches.match(BASE);
          if (home) return home;
        }
        return Response.error();
      }
    })(),
  );
});
