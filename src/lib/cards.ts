/**
 * Card surfaces — what a panel, a dropdown or an input is *made of*.
 *
 * The rule the app ships: **a card is the theme's own colour** — `#000000` in
 * the dark theme, `#ffffff` in the light one. That is deliberately decided here
 * and not by the staff glass settings, because "glass" describing the *tint* of
 * a card is how the language menu ended up a purple panel: it had the dark
 * violet stage colour baked in, and every other card inherited whatever colour
 * the upload sampler had picked.
 *
 * Staff keep control of the two things that matter for texture:
 *
 * - `glassAuto` (the default) → the card takes the theme colour.
 *   Switched off → the staff `glassColor` is used, in both themes.
 * - `glassOpacity` is a delta around the theme's natural fill
 *   (`CARD_BASE_ALPHA`), so `20` — the seeded value — is "the theme's card" and
 *   the slider moves both ways from there.
 */
import type { SiteSettings } from "./types";
import { hexToRgb } from "./utils.ts";

export type CardTheme = "dark" | "light";

/** The card *colour* per theme — the instruction this module exists to honour. */
export const CARD_SOLID: Record<CardTheme, string> = {
  dark: "#000000",
  light: "#ffffff",
};

/** The same colours in the `rgb(r, g, b)` form the CSS variables expect. */
export const CARD_RGB: Record<CardTheme, string> = {
  dark: "0, 0, 0",
  light: "255, 255, 255",
};

/** How solid a natural card is in each theme, before the fill slider. */
export const CARD_BASE_ALPHA: Record<CardTheme, number> = {
  dark: 0.5,
  light: 0.62,
};

/** The fill value a seeded row carries; it means "the theme's natural fill". */
export const GLASS_OPACITY_DEFAULT = 20;

/** Smallest alpha we will paint: below this a card is invisible, not subtle. */
const MIN_ALPHA = 0.12;
const MAX_ALPHA = 1;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

/**
 * The `--glass-rgb` / `--glass-alpha` pair for one theme and one settings row.
 * Pure, so the resolver can be unit-tested without a DOM.
 */
export function resolveCardSurface(
  settings: Partial<Pick<SiteSettings, "glassAuto" | "glassColor" | "glassOpacity">>,
  theme: CardTheme,
): { rgb: string; alpha: number } {
  // The fill slider is relative to the theme's natural card. A row without a
  // usable number (older/partial payloads) means "the theme's fill".
  const fill =
    typeof settings.glassOpacity === "number" && Number.isFinite(settings.glassOpacity)
      ? settings.glassOpacity
      : GLASS_OPACITY_DEFAULT;
  const alpha = clamp(
    CARD_BASE_ALPHA[theme] + (fill - GLASS_OPACITY_DEFAULT) / 100,
    MIN_ALPHA,
    MAX_ALPHA,
  );
  // Partial settings can come from old cached app builds or a failed static
  // server-function response. Missing `glassAuto` means the safe default (auto),
  // and an incomplete custom colour falls back to the seeded white.
  if (settings.glassAuto !== false) return { rgb: CARD_RGB[theme], alpha };
  const { r, g, b } = hexToRgb(settings.glassColor ?? "#ffffff");
  return { rgb: `${r}, ${g}, ${b}`, alpha };
}
