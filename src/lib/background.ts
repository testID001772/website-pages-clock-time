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

/** The image the app ships with; served straight from `public/`. */
export const DEFAULT_BACKGROUND_URL = appUrl("/background.jpg");

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
 * page load — the background sits under a blur and a scrim, which is why a
 * modest size is plenty.
 */
export const BACKGROUND_MAX_CHARS = 500_000;

/** Server-side ceiling: the client budget plus room for hand-made requests. */
export const BACKGROUND_HARD_MAX_CHARS = 650_000;
