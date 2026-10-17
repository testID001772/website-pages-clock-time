/**
 * Where the app is mounted, and whether this bundle is the static one.
 *
 * The app normally lives at the root of an origin (`BASE_URL === "/"`), which is
 * what the dev server, the preview and a server deployment all use. The GitHub
 * Pages build is a *project* site, so every page and asset sits under
 * `/website-pages-clock-time-/` — `scripts/build-pages.mjs` bakes that prefix in
 * as Vite's `base`.
 *
 * Vite rewrites the URLs it can see (bundled assets, CSS) but not the ones the
 * app builds by hand — the background image, the PWA icons, the track URLs and
 * the service worker. Those go through `appUrl()` so there is exactly one place
 * that knows about the prefix. With `BASE_URL === "/"` every helper here is the
 * identity, so the dev/preview behaviour is unchanged.
 *
 * `import.meta.env` is undefined under plain node (the unit tests run there), so
 * the reads are defensive: an environment without Vite means "mounted at the
 * root, full app".
 */
type AppEnv = {
  BASE_URL?: string;
  VITE_STATIC_SITE?: string;
};

const env: AppEnv = import.meta.env ?? {};

/** Vite's `base`: `"/"` normally, the project path in the Pages build. */
export const BASE_URL: string = env.BASE_URL && env.BASE_URL.length > 0 ? env.BASE_URL : "/";

/** `BASE_URL` guaranteed to end in `/`, so joining is a plain concatenation. */
export const ASSET_BASE: string = BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`;

/**
 * True in the GitHub Pages build (`VITE_STATIC_SITE=1`), where there is no
 * server: no session, no admin, no music library. The clock, the countdown, the
 * background, the languages and the shipped playlist all still work.
 */
export const STATIC_SITE: boolean = env.VITE_STATIC_SITE === "1";

/**
 * Join an app-absolute URL to a mount point. The pure form of `appUrl`, so the
 * Pages prefix can be tested without building for Pages.
 */
export function joinBase(base: string, path: string): string {
  if (!path.startsWith("/")) return path;
  const rooted = base.endsWith("/") ? base : `${base}/`;
  return `${rooted}${path.slice(1)}`;
}

/**
 * An app-absolute URL, mounted under `BASE_URL`.
 *
 * `appUrl("/background.jpg")` is `/background.jpg` at the root and
 * `/website-pages-clock-time-/background.jpg` on Pages. Already-relative and
 * absolute URLs (`data:`, `https:`, `music/x.mp3`) are returned untouched, so
 * this is safe to call on any stored value.
 */
export function appUrl(path: string): string {
  return joinBase(ASSET_BASE, path);
}
