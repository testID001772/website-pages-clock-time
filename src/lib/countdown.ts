import { formatDecimal, formatInteger, numberTag } from "./numbers.ts";

/**
 * The units the clock renders, longest first. `years` is deliberately absent:
 * the countdown targets the next New Year (always < 12 months away), so a
 * years block could only ever read 00. The split below still computes on a
 * year anchor — that is what makes "2 months 20 days" correct instead of a
 * naive day count.
 */
export const UNITS = ["months", "days", "hours", "minutes", "seconds"] as const;
export type Unit = (typeof UNITS)[number];

/** A countdown snapshot as the clock renders it (see `splitRange`). */
export type UnitParts = Record<Unit, number> & { tenths: number };

/**
 * One countdown block, in the visitor's language: two integer digits for every
 * unit and the seconds block with its tenth (`43.7` / `43,7` / `٤٣٫٧`).
 *
 * `tenthsLive` is false for the server/first paint, which must render the same
 * mark-up on both sides of hydration — the tenths start ticking after mount.
 */
export function unitNumberText(
  unit: Unit,
  parts: UnitParts,
  locale?: string,
  tenthsLive = true,
): string {
  if (unit === "seconds") {
    const tenths = tenthsLive ? parts.tenths : 0;
    return formatDecimal(parts.seconds + tenths / 10, locale, 1, 2);
  }
  return formatInteger(parts[unit], locale, 2);
}

export function nextNewYear(from: Date) {
  return new Date(from.getFullYear() + 1, 0, 1, 0, 0, 0, 0);
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

/** Add years without day overflow (Feb 29 → Feb 28). Time of day preserved. */
function addYearsClamped(date: Date, years: number) {
  const target = date.getFullYear() + years;
  const out = new Date(date.getTime());
  out.setFullYear(
    target,
    date.getMonth(),
    Math.min(date.getDate(), daysInMonth(target, date.getMonth())),
  );
  return out;
}

/** Add months without day overflow (Jan 31 + 1mo → Feb 28/29). */
function addMonthsClamped(date: Date, months: number) {
  const raw = date.getMonth() + months;
  const year = date.getFullYear() + Math.floor(raw / 12);
  const month = ((raw % 12) + 12) % 12;
  const out = new Date(date.getTime());
  out.setFullYear(year, month, Math.min(date.getDate(), daysInMonth(year, month)));
  return out;
}

/**
 * Calendar-aware split of [from, to): full months, then the exact day/time
 * remainder. Past ranges clamp to zero.
 *
 * The year step is internal only — it anchors the month arithmetic (and keeps
 * month lengths right across a leap day). Years are not part of the result
 * because the UI has no years unit; see `UNITS`.
 */
export function splitRange(from: Date, to: Date) {
  const zero = { months: 0, days: 0, hours: 0, minutes: 0, seconds: 0, tenths: 0 };
  if (to.getTime() <= from.getTime()) return zero;
  let years = to.getFullYear() - from.getFullYear();
  if (addYearsClamped(from, years).getTime() > to.getTime()) years -= 1;
  const yearAnchor = addYearsClamped(from, years);
  let months =
    (to.getFullYear() - yearAnchor.getFullYear()) * 12 +
    (to.getMonth() - yearAnchor.getMonth());
  let anchor = addMonthsClamped(yearAnchor, months);
  if (anchor.getTime() > to.getTime()) {
    months -= 1;
    anchor = addMonthsClamped(yearAnchor, months);
  }
  const ms = to.getTime() - anchor.getTime();
  const total = Math.floor(ms / 1000);
  return {
    months,
    days: Math.floor(total / 86400),
    hours: Math.floor((total / 3600) % 24),
    minutes: Math.floor((total / 60) % 60),
    seconds: total % 60,
    tenths: Math.floor((ms % 1000) / 100),
  };
}

export function yearProgress(now: Date) {
  const start = new Date(now.getFullYear(), 0, 1).getTime();
  const end = new Date(now.getFullYear() + 1, 0, 1).getTime();
  return ((now.getTime() - start) / (end - start)) * 100;
}

export function formatTarget(target: Date, locale?: string) {
  return new Intl.DateTimeFormat(numberTag(locale), {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(target);
}

/** Date + zone parts — the sentence around them lives in the dictionary. */
export function formatMetaParts(target: Date, locale?: string) {
  const timeZone = Intl.DateTimeFormat(numberTag(locale)).resolvedOptions().timeZone || "local time";
  const when = new Intl.DateTimeFormat(numberTag(locale), {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(target);
  return { when, timeZone };
}

/**
 * The wall clock the countdown sits under.
 *
 * No `hour12` is forced: each language keeps its own clock — 12-hour with a
 * marker in English, Arabic, Hindi and Spanish, 24-hour in German, French,
 * Italian, Portuguese, Russian, Turkish and Chinese — which is what "7:07 PM"
 * in every language was getting wrong. `numberTag` keeps the digits and the
 * decimal separator in that same language, so the clock matches the countdown
 * next to it (`٧:٠٧:١٦٫٢ م`, `19:07:16,2`).
 */
export function formatNow(now: Date, locale?: string) {
  try {
    return new Intl.DateTimeFormat(numberTag(locale), {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 1,
    }).format(now);
  } catch {
    // Older engines (Safari < 15.4, legacy Android WebView) reject
    // fractionalSecondDigits — fall back to whole seconds rather than
    // throwing on every tick and freezing the page.
    return new Intl.DateTimeFormat(numberTag(locale), {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    }).format(now);
  }
}
