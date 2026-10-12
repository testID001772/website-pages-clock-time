import { appUrl } from "./base-url.ts";
import type { SiteSettings } from "./types";

/**
 * Background-image rules, in one place — the stage that paints it, the admin
 * preview that shows it and the settings page all read the same answer.
 *
 * Three states, all reachable from the admin UI:
 *  1. an uploaded image  -> `backgroundUrl` is a data URL, shown;
 *  2. the shipped image  -> `backgroundUrl` is null, the default path is shown;
 *  3. no image at all    -> `backgroundEnabled` is false, the stage falls back
 *                           to the plain gradient.
 */

/**
 * The artwork the app ships with, in the order the admin panel offers it. Both
 * are 8K JPEGs in `public/`, painted by the stage and picked in `/admin`.
 *
 * `id` is stable (the thumbnail key, and what a future migration would store);
 * `url` is the site path, mounted under `BASE_URL` like every other asset.
 */
export const SHIPPED_BACKGROUNDS = [
  /**
   * Iron-oxide wash on near-black — the default, and what ships with the theme.
   * `phoneUrl` is the 1920×1080 copy (`scripts/generate-backgrounds.mjs`): the
   * 8K original is 33 megapixels, and decoding that on a phone is enough for a
   * low-end Android to kill the tab while the home-screen app starts.
   */
  { id: "ferric-wash", url: "/ferric-wash.jpg", phoneUrl: "/ferric-wash-phone.jpg" },
  /** The deep-space nebula. */
  { id: "space-nebula", url: "/space-nebula.jpg", phoneUrl: "/space-nebula-phone.jpg" },
] as const;

export type ShippedBackgroundId = (typeof SHIPPED_BACKGROUNDS)[number]["id"];

/** The image a fresh install paints; served straight from `public/`. */
export const DEFAULT_BACKGROUND_URL = appUrl(SHIPPED_BACKGROUNDS[0].url);

/**
 * The shipped artwork a stored URL points at, or `null` when the URL is an
 * upload (a data URL) or not one of ours.
 */
export function shippedBackgroundFor(
  url: string | null | undefined,
): (typeof SHIPPED_BACKGROUNDS)[number] | null {
  if (!url) return null;
  return SHIPPED_BACKGROUNDS.find((image) => appUrl(image.url) === url) ?? null;
}

/**
 * The image URL to paint, or `null` for the gradient-only look.
 * Deliberately tolerant of a missing flag (older rows, partial payloads) —
 * absent means "on", matching the column default.
 */
export function resolveBackgroundUrl(
  settings: Pick<SiteSettings, "backgroundUrl" | "backgroundEnabled">,
): string | null {
  if (settings.backgroundEnabled === false) return null;
  const custom = settings.backgroundUrl?.trim();
  if (custom) return custom;
  return DEFAULT_BACKGROUND_URL;
}

/**
 * The image to paint on a narrow screen, or `null` when the stage shows none.
 *
 * The shipped artwork has a phone copy; an upload is already capped at
 * `BACKGROUND_MAX_CHARS` (~375 KB) and is painted as-is. The stage hands both
 * URLs to CSS and a media query picks between them, so a phone never starts the
 * 33-megapixel decode.
 */
export function resolvePhoneBackgroundUrl(
  settings: Pick<SiteSettings, "backgroundUrl" | "backgroundEnabled">,
): string | null {
  const url = resolveBackgroundUrl(settings);
  if (!url) return null;
  const shipped = shippedBackgroundFor(url);
  return shipped ? appUrl(shipped.phoneUrl) : url;
}

/** True when the painted image is the shipped one (i.e. nothing uploaded). */
export function isDefaultBackground(
  settings: Pick<SiteSettings, "backgroundUrl" | "backgroundEnabled">,
): boolean {
  return resolveBackgroundUrl(settings) === DEFAULT_BACKGROUND_URL;
}

/**
 * Upload budget for a custom image, in characters of the resulting data URL
 * (base64, so ~4/3 of the byte size). The URL is inlined into the server-
 * rendered HTML and the pre-hydration CSS variable, so it is paid for on every
 * page load — the background sits under a blur, which is why a modest size is
 * plenty.
 */
export const BACKGROUND_MAX_CHARS = 500_000;

/** Server-side ceiling: the client budget plus room for hand-made requests. */
export const BACKGROUND_HARD_MAX_CHARS = 650_000;
