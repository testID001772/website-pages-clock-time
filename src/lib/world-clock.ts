/**
 * World-clock logic: time-zone data, offsets, search and persisted card order.
 * Pure functions only, so the node test runner covers them without a DOM.
 * Time comes from the browser's `Intl` tables, so nothing here needs a server.
 */

/** One clock card as shown on the dashboard. */
export interface TimeZoneData {
  /** Display name, e.g. "Cairo". */
  city: string;
  /** IANA zone id, e.g. "Africa/Cairo". Also the card's identity. */
  timeZone: string;
  /** Offset from UTC at the moment it was computed, e.g. "UTC+02:00". */
  offset: string;
}

/** A zone the visitor can add, before it has an offset. */
export interface TimeZoneOption {
  city: string;
  region: string;
  timeZone: string;
}

/** Cards the dashboard starts with on a first visit. */
export const DEFAULT_ZONES: readonly string[] = [
  "Africa/Cairo",
  "Europe/London",
  "America/New_York",
  "Asia/Tokyo",
  "Australia/Sydney",
];

/** Keeps the grid readable and the stored preference small. */
export const MAX_CARDS = 12;

export const TIME_ZONE_CATALOGUE: readonly TimeZoneOption[] = [
  { city: "Cairo", region: "Egypt", timeZone: "Africa/Cairo" },
  { city: "Lagos", region: "Nigeria", timeZone: "Africa/Lagos" },
  { city: "Johannesburg", region: "South Africa", timeZone: "Africa/Johannesburg" },
  { city: "Nairobi", region: "Kenya", timeZone: "Africa/Nairobi" },
  { city: "London", region: "United Kingdom", timeZone: "Europe/London" },
  { city: "Paris", region: "France", timeZone: "Europe/Paris" },
  { city: "Berlin", region: "Germany", timeZone: "Europe/Berlin" },
  { city: "Madrid", region: "Spain", timeZone: "Europe/Madrid" },
  { city: "Rome", region: "Italy", timeZone: "Europe/Rome" },
  { city: "Istanbul", region: "Türkiye", timeZone: "Europe/Istanbul" },
  { city: "Athens", region: "Greece", timeZone: "Europe/Athens" },
  { city: "Moscow", region: "Russia", timeZone: "Europe/Moscow" },
  { city: "Dubai", region: "UAE", timeZone: "Asia/Dubai" },
  { city: "Riyadh", region: "Saudi Arabia", timeZone: "Asia/Riyadh" },
  { city: "Tehran", region: "Iran", timeZone: "Asia/Tehran" },
  { city: "Karachi", region: "Pakistan", timeZone: "Asia/Karachi" },
  { city: "Mumbai", region: "India", timeZone: "Asia/Kolkata" },
  { city: "Dhaka", region: "Bangladesh", timeZone: "Asia/Dhaka" },
  { city: "Bangkok", region: "Thailand", timeZone: "Asia/Bangkok" },
  { city: "Singapore", region: "Singapore", timeZone: "Asia/Singapore" },
  { city: "Hong Kong", region: "China", timeZone: "Asia/Hong_Kong" },
  { city: "Shanghai", region: "China", timeZone: "Asia/Shanghai" },
  { city: "Seoul", region: "South Korea", timeZone: "Asia/Seoul" },
  { city: "Tokyo", region: "Japan", timeZone: "Asia/Tokyo" },
  { city: "Sydney", region: "Australia", timeZone: "Australia/Sydney" },
  { city: "Perth", region: "Australia", timeZone: "Australia/Perth" },
  { city: "Auckland", region: "New Zealand", timeZone: "Pacific/Auckland" },
  { city: "Honolulu", region: "United States", timeZone: "Pacific/Honolulu" },
  { city: "Los Angeles", region: "United States", timeZone: "America/Los_Angeles" },
  { city: "Denver", region: "United States", timeZone: "America/Denver" },
  { city: "Chicago", region: "United States", timeZone: "America/Chicago" },
  { city: "New York", region: "United States", timeZone: "America/New_York" },
  { city: "Toronto", region: "Canada", timeZone: "America/Toronto" },
  { city: "Mexico City", region: "Mexico", timeZone: "America/Mexico_City" },
  { city: "Bogotá", region: "Colombia", timeZone: "America/Bogota" },
  { city: "São Paulo", region: "Brazil", timeZone: "America/Sao_Paulo" },
  { city: "Buenos Aires", region: "Argentina", timeZone: "America/Argentina/Buenos_Aires" },
];

/** The visitor's own zone, or UTC where the browser cannot say. */
export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Whether `timeZone` is a zone this runtime can format. */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Offset from UTC in whole minutes at `date` (e.g. Cairo in winter = 120). */
export function offsetMinutes(timeZone: string, date: Date): number {
  const whole = Math.floor(date.getTime() / 1000) * 1000;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(whole));
  const pick = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    pick("year"),
    pick("month") - 1,
    pick("day"),
    pick("hour"),
    pick("minute"),
    pick("second"),
  );
  return Math.round((asUtc - whole) / 60000);
}

/** "UTC+02:00", "UTC-05:30", or "UTC" for zero. */
export function formatOffset(minutes: number): string {
  if (minutes === 0) return "UTC";
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `UTC${sign}${hh}:${mm}`;
}

/**
 * Difference from the visitor's clock, phrased for a card:
 * "Same time", "+7h", "−5h 30m" (sign first so the direction reads at a glance).
 */
export function differenceLabel(zoneMinutes: number, localMinutes: number): string {
  const diff = zoneMinutes - localMinutes;
  if (diff === 0) return "Same time";
  const sign = diff > 0 ? "+" : "−";
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `${sign}${h}h` : `${sign}${h}h ${m}m`;
}

/** Build the card data for one zone at one instant. */
export function describeZone(option: TimeZoneOption, date: Date): TimeZoneData {
  return {
    city: option.city,
    timeZone: option.timeZone,
    offset: formatOffset(offsetMinutes(option.timeZone, date)),
  };
}

/** Catalogue entry for a zone id, if we know it. */
export function optionFor(timeZone: string): TimeZoneOption | undefined {
  return TIME_ZONE_CATALOGUE.find((option) => option.timeZone === timeZone);
}

/**
 * Suggestions for the add box: matches on city, region or zone id, skipping
 * zones already on the dashboard. An empty query returns the first few.
 */
export function searchTimeZones(
  query: string,
  selected: readonly string[],
  limit = 6,
): TimeZoneOption[] {
  const needle = query.trim().toLowerCase();
  return TIME_ZONE_CATALOGUE.filter((option) => {
    if (selected.includes(option.timeZone)) return false;
    if (!needle) return true;
    return (
      option.city.toLowerCase().includes(needle) ||
      option.region.toLowerCase().includes(needle) ||
      option.timeZone.toLowerCase().includes(needle)
    );
  }).slice(0, limit);
}

/**
 * Read the saved card list. Anything unknown, malformed or duplicated is
 * dropped, so a hand-edited or stale preference can never break the page.
 */
export function parseStoredZones(raw: string | null): string[] {
  if (!raw) return [...DEFAULT_ZONES];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [...DEFAULT_ZONES];
  }
  if (!Array.isArray(parsed)) return [...DEFAULT_ZONES];
  const known = new Set(TIME_ZONE_CATALOGUE.map((option) => option.timeZone));
  const seen = new Set<string>();
  const zones: string[] = [];
  for (const entry of parsed) {
    if (typeof entry !== "string" || !known.has(entry) || seen.has(entry)) continue;
    seen.add(entry);
    zones.push(entry);
    if (zones.length === MAX_CARDS) break;
  }
  return zones;
}

export function serializeZones(zones: readonly string[]): string {
  return JSON.stringify(zones.slice(0, MAX_CARDS));
}

/** Return a copy with the item at `index` moved by `delta` (-1 left, +1 right). */
export function moveZone(zones: readonly string[], index: number, delta: number): string[] {
  const target = index + delta;
  if (index < 0 || index >= zones.length || target < 0 || target >= zones.length) {
    return [...zones];
  }
  const next = [...zones];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}
