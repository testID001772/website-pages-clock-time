export const UNITS = ["years", "months", "days", "hours", "minutes", "seconds"] as const;
export type Unit = (typeof UNITS)[number];

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
 * Calendar-aware split of [from, to): full years, then full months, then
 * the exact day/time remainder. Past ranges clamp to zero.
 */
export function splitRange(from: Date, to: Date) {
  const zero = { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0, tenths: 0 };
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
    years,
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

export const pad2 = (n: number) => String(n).padStart(2, "0");

export function formatTarget(target: Date, locale?: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(target);
}

/** Date + zone parts — the sentence around them lives in the dictionary. */
export function formatMetaParts(target: Date, locale?: string) {
  const timeZone = Intl.DateTimeFormat(locale).resolvedOptions().timeZone || "local time";
  const when = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(target);
  return { when, timeZone };
}

export function formatNow(now: Date, locale?: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 1,
      hour12: true,
    }).format(now);
  } catch {
    // Older engines (Safari < 15.4, legacy Android WebView) reject
    // fractionalSecondDigits — fall back to whole seconds rather than
    // throwing on every tick and freezing the page.
    return new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(now);
  }
}
