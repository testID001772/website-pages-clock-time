/**
 * Numbers per language — the one place that decides what a count, a padded
 * countdown block, a duration or the clock looks like.
 *
 * The app ships 11 languages and each one writes numbers its own way. Building
 * them with `String(n).padStart(2, "0")` (and a forced `hour12: true`) pinned
 * every language to the English shape: an Arabic page printed Latin digits, a
 * German clock read "7:07 PM" instead of "19:07", and "43.7" kept its English
 * decimal point in languages that write "43,7". Everything visible now goes
 * through `Intl.NumberFormat`/`Intl.DateTimeFormat` with the active language, so
 * the countdown, the time, the dates and the progress line agree.
 *
 * Arabic is pinned explicitly. A bare `ar` tag resolves to Latin digits in some
 * engines (ICU follows the host locale when the language does not force a system
 * — that is exactly how the "same numbers everywhere" bug looked), so the digits
 * are requested outright: ٠١٢٣٤٥٦٧٨٩.
 */

/** Languages whose digits are not the Latin ones, and the system to use. */
const NUMERAL_SYSTEMS: Record<string, string> = {
  /** Arabic-Indic digits, plus its own decimal separator `٫`. */
  ar: "arab",
};

/**
 * The Intl tag every number and date in the app is formatted with: the active
 * language, with its numeral system pinned when the defaults are ambiguous.
 * Unknown/absent locales fall back to `"en"` (the dictionary fallback too).
 */
export function numberTag(locale?: string): string {
  const tag = (locale ?? "").trim() || "en";
  // A caller that already pinned a system (`ar-u-nu-arab`, `en-u-nu-latn`) wins.
  if (/-u(-|$)/.test(tag)) return tag;
  const system = NUMERAL_SYSTEMS[tag.split("-")[0].toLowerCase()];
  return system ? `${tag}-u-nu-${system}` : tag;
}

/** Intl accepts 1–21 digits; anything else is a programming error, not input. */
function clampDigits(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(Math.trunc(n), 1), 21);
}

/**
 * Formatters are cached: a countdown tick asks for the same handful of shapes
 * ten times a second, and constructing an `Intl.NumberFormat` is not cheap.
 */
const formatters = new Map<string, Intl.NumberFormat>();

function formatter(locale: string | undefined, options: Intl.NumberFormatOptions) {
  const tag = numberTag(locale);
  const key = `${tag}|${options.minimumIntegerDigits ?? 1}|${options.minimumFractionDigits ?? 0}|${options.maximumFractionDigits ?? 0}`;
  const hit = formatters.get(key);
  if (hit) return hit;
  const made = new Intl.NumberFormat(tag, { useGrouping: false, ...options });
  formatters.set(key, made);
  return made;
}

/** At least `minDigits` integer digits, no grouping: `2` → `02` / `٠٢`. */
export function formatInteger(value: number, locale?: string, minDigits = 1): string {
  if (!Number.isFinite(value)) return "";
  return formatter(locale, { minimumIntegerDigits: clampDigits(minDigits) }).format(
    Math.trunc(value),
  );
}

/**
 * Fixed decimals in the language's own notation: `43.7` → `43.7` / `43,7` /
 * `٤٣٫٧`. `minDigits` pads the integer part the same way `formatInteger` does.
 */
export function formatDecimal(
  value: number,
  locale?: string,
  fractionDigits = 1,
  minDigits = 1,
): string {
  if (!Number.isFinite(value)) return "";
  const digits = clampDigits(fractionDigits);
  return formatter(locale, {
    minimumIntegerDigits: clampDigits(minDigits),
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}
