/**
 * The release this build of the app ships.
 *
 * One source for the two places a version is visible: the footer badge on the
 * public pages and the name the service worker gives its cache when the site is
 * served outside the Pages build (which stamps a content hash instead — see
 * `scripts/build-pages.mjs`). Bump it with each look release so an installed app
 * that is still on the previous shell can be told apart from the new one.
 */
export const APP_VERSION = "v2";

/** The service-worker cache name the shipped `public/sw.js` carries. */
export const CACHE_VERSION = `clock-time-${APP_VERSION}`;
