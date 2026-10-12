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
 * Navigations are revalidated (`cache: "no-cache"`) rather than taken from the
 * browser's HTTP cache: a stale HTML document pins the page to the previous
 * build's hashed stylesheet, which reads as "my change didn't deploy". The Pages
 * build also stamps `VERSION` with a hash of the built `index.html`
 * (`scripts/build-pages.mjs`), so a deploy renames the cache and every browser
 * drops the old shell on activate.
 *
 * Every path is built from `BASE` — the directory this worker is served from
 * (`self.registration.scope`), so `/` at the root and
 * `/website-pages-clock-time-/` on the GitHub Pages build. Precaching the wrong
 * shell would poison the offline experience with the host's 404 page.
 */
const BASE = new URL(self.registration.scope).pathname;
// Stamped with the build hash by `scripts/build-pages.mjs`; this value is what
// the dev server (and a manual `npm run build`) serves.
const VERSION = "clock-time-v7";
/**
 * Everything needed to boot the app: the page, the manifest, the icons. The
 * backdrop is deliberately *not* here — it is 1.6 MB and the app renders fine
 * over the gradient, so a phone on mobile data should not pay for it twice.
 */
const SHELL = [
  BASE,
  `${BASE}manifest.webmanifest`,
  `${BASE}icon-192.png`,
  `${BASE}icon-512.png`,
  `${BASE}favicon.svg`,
];
/**
 * The hashed stylesheet and client bundles of the build this worker shipped
 * with, filled in by `scripts/build-pages.mjs`. They are what make an offline
 * launch render the app instead of a bare document; the dev server leaves the
 * list empty and Vite serves modules instead.
 */
const BUILD_ASSETS = [];
/** Store the app shell under `BASE` but fetch it through a query. */
const SHELL_FETCH = `${BASE}?source=sw`;
/** The audio that is worth keeping offline (first play caches it). */
const MUSIC_PATHS = [`${BASE}music/`, `${BASE}api/music/`];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      await Promise.allSettled(
        [...SHELL, ...BUILD_ASSETS.map((asset) => `${BASE}${asset}`)].map((url) =>
          cache.add(new Request(url, { cache: "reload" })),
        ),
      );
      // The document itself. Fetched with a query because a host can hold a
      // stale answer for the bare directory (GitHub Pages did exactly that),
      // and the shell must never be that answer — it is what an installed app
      // boots from. Stored under the plain `BASE` key so the fallback finds it.
      const document_ = await fetch(SHELL_FETCH, { cache: "reload" }).catch(() => null);
      if (document_?.ok) await cache.put(BASE, document_);
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
        const response = await fetch(
          request,
          request.mode === "navigate" ? { cache: "no-cache" } : undefined,
        );
        if (response.ok) {
          const cache = await caches.open(VERSION);
          await cache.put(request, response.clone());
        } else if (request.mode === "navigate") {
          // A navigation answered with 404/5xx still boots the app when we hold
          // the shell: that is the difference between "the app keeps stopping"
          // and the countdown, for a launch URL that outlived its host cache.
          const shell = await caches.match(BASE);
          if (shell) return shell;
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
