/**
 * World-clock logic: time-zone data, localisation, offsets, search and the
 * saved card order. Pure functions only, so the node test runner covers them
 * without a DOM. Times and names come from the browser's `Intl` tables, so
 * nothing here needs a server.
 */
import { numberTag } from "./numbers.ts";

/** Languages the world-clock copy and city names are written in. */
export type CityLanguage = "en" | "ar" | "es" | "fr";

/** One clock card as shown on the dashboard. */
export interface TimeZoneData {
  /** Display name in the active language, e.g. "القاهرة". */
  city: string;
  /** IANA zone id, e.g. "Africa/Cairo". Also the card's identity. */
  timeZone: string;
  /** Offset from UTC at the moment it was computed, e.g. "UTC+02:00". */
  offset: string;
}

/** A zone the visitor can add, with its city names in each language. */
export interface TimeZoneOption {
  cityNames: Record<CityLanguage, string>;
  /** ISO 3166-1 alpha-2 country code, localised through `Intl.DisplayNames`. */
  country: string;
  timeZone: string;
}

/** Locale settings the page needs: the Intl tag and the layout direction. */
export interface LocaleConfig {
  /** The app's locale code, e.g. "ar". */
  locale: string;
  /** Intl tag with the right numeral system, e.g. "ar-u-nu-arab". */
  tag: string;
  dir: "ltr" | "rtl";
}

/** Latitude/longitude for a weather lookup. */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** The primary card. Always shown first and never removable. */
export const FEATURED_ZONE = {
  cityNames: { en: "Cairo", ar: "القاهرة", es: "El Cairo", fr: "Le Caire" },
  country: "EG",
  timeZone: "Africa/Cairo",
  coordinates: { latitude: 30.050755, longitude: 31.246909 } satisfies Coordinates,
} as const;

/** Cards the dashboard starts with on a first visit. */
export const DEFAULT_ZONES: readonly string[] = [
  "Europe/London",
  "America/New_York",
  "Asia/Tokyo",
  "Australia/Sydney",
];

/** Keeps the grid readable and the stored preference small. */
export const MAX_CARDS = 12;

const RTL_LOCALES: readonly string[] = ["ar"];

export const TIME_ZONE_CATALOGUE: readonly TimeZoneOption[] = [
  { cityNames: { en: "Lagos", ar: "لاغوس", es: "Lagos", fr: "Lagos" }, country: "NG", timeZone: "Africa/Lagos" },
  { cityNames: { en: "Johannesburg", ar: "جوهانسبرغ", es: "Johannesburgo", fr: "Johannesburg" }, country: "ZA", timeZone: "Africa/Johannesburg" },
  { cityNames: { en: "Nairobi", ar: "نيروبي", es: "Nairobi", fr: "Nairobi" }, country: "KE", timeZone: "Africa/Nairobi" },
  { cityNames: { en: "London", ar: "لندن", es: "Londres", fr: "Londres" }, country: "GB", timeZone: "Europe/London" },
  { cityNames: { en: "Paris", ar: "باريس", es: "París", fr: "Paris" }, country: "FR", timeZone: "Europe/Paris" },
  { cityNames: { en: "Berlin", ar: "برلين", es: "Berlín", fr: "Berlin" }, country: "DE", timeZone: "Europe/Berlin" },
  { cityNames: { en: "Madrid", ar: "مدريد", es: "Madrid", fr: "Madrid" }, country: "ES", timeZone: "Europe/Madrid" },
  { cityNames: { en: "Rome", ar: "روما", es: "Roma", fr: "Rome" }, country: "IT", timeZone: "Europe/Rome" },
  { cityNames: { en: "Istanbul", ar: "إسطنبول", es: "Estambul", fr: "Istanbul" }, country: "TR", timeZone: "Europe/Istanbul" },
  { cityNames: { en: "Athens", ar: "أثينا", es: "Atenas", fr: "Athènes" }, country: "GR", timeZone: "Europe/Athens" },
  { cityNames: { en: "Moscow", ar: "موسكو", es: "Moscú", fr: "Moscou" }, country: "RU", timeZone: "Europe/Moscow" },
  { cityNames: { en: "Dubai", ar: "دبي", es: "Dubái", fr: "Dubaï" }, country: "AE", timeZone: "Asia/Dubai" },
  { cityNames: { en: "Riyadh", ar: "الرياض", es: "Riad", fr: "Riyad" }, country: "SA", timeZone: "Asia/Riyadh" },
  { cityNames: { en: "Tehran", ar: "طهران", es: "Teherán", fr: "Téhéran" }, country: "IR", timeZone: "Asia/Tehran" },
  { cityNames: { en: "Karachi", ar: "كراتشي", es: "Karachi", fr: "Karachi" }, country: "PK", timeZone: "Asia/Karachi" },
  { cityNames: { en: "Mumbai", ar: "مومباي", es: "Bombay", fr: "Bombay" }, country: "IN", timeZone: "Asia/Kolkata" },
  { cityNames: { en: "Dhaka", ar: "دكا", es: "Daca", fr: "Dacca" }, country: "BD", timeZone: "Asia/Dhaka" },
  { cityNames: { en: "Bangkok", ar: "بانكوك", es: "Bangkok", fr: "Bangkok" }, country: "TH", timeZone: "Asia/Bangkok" },
  { cityNames: { en: "Singapore", ar: "سنغافورة", es: "Singapur", fr: "Singapour" }, country: "SG", timeZone: "Asia/Singapore" },
  { cityNames: { en: "Hong Kong", ar: "هونغ كونغ", es: "Hong Kong", fr: "Hong Kong" }, country: "HK", timeZone: "Asia/Hong_Kong" },
  { cityNames: { en: "Shanghai", ar: "شنغهاي", es: "Shanghái", fr: "Shanghai" }, country: "CN", timeZone: "Asia/Shanghai" },
  { cityNames: { en: "Seoul", ar: "سيول", es: "Seúl", fr: "Séoul" }, country: "KR", timeZone: "Asia/Seoul" },
  { cityNames: { en: "Tokyo", ar: "طوكيو", es: "Tokio", fr: "Tokyo" }, country: "JP", timeZone: "Asia/Tokyo" },
  { cityNames: { en: "Sydney", ar: "سيدني", es: "Sídney", fr: "Sydney" }, country: "AU", timeZone: "Australia/Sydney" },
  { cityNames: { en: "Perth", ar: "بيرث", es: "Perth", fr: "Perth" }, country: "AU", timeZone: "Australia/Perth" },
  { cityNames: { en: "Auckland", ar: "أوكلاند", es: "Auckland", fr: "Auckland" }, country: "NZ", timeZone: "Pacific/Auckland" },
  { cityNames: { en: "Honolulu", ar: "هونولولو", es: "Honolulu", fr: "Honolulu" }, country: "US", timeZone: "Pacific/Honolulu" },
  { cityNames: { en: "Los Angeles", ar: "لوس أنجلوس", es: "Los Ángeles", fr: "Los Angeles" }, country: "US", timeZone: "America/Los_Angeles" },
  { cityNames: { en: "Denver", ar: "دنفر", es: "Denver", fr: "Denver" }, country: "US", timeZone: "America/Denver" },
  { cityNames: { en: "Chicago", ar: "شيكاغو", es: "Chicago", fr: "Chicago" }, country: "US", timeZone: "America/Chicago" },
  { cityNames: { en: "New York", ar: "نيويورك", es: "Nueva York", fr: "New York" }, country: "US", timeZone: "America/New_York" },
  { cityNames: { en: "Toronto", ar: "تورونتو", es: "Toronto", fr: "Toronto" }, country: "CA", timeZone: "America/Toronto" },
  { cityNames: { en: "Mexico City", ar: "مكسيكو سيتي", es: "Ciudad de México", fr: "Mexico" }, country: "MX", timeZone: "America/Mexico_City" },
  { cityNames: { en: "Bogotá", ar: "بوغوتا", es: "Bogotá", fr: "Bogota" }, country: "CO", timeZone: "America/Bogota" },
  { cityNames: { en: "São Paulo", ar: "ساو باولو", es: "São Paulo", fr: "São Paulo" }, country: "BR", timeZone: "America/Sao_Paulo" },
  { cityNames: { en: "Buenos Aires", ar: "بوينس آيرس", es: "Buenos Aires", fr: "Buenos Aires" }, country: "AR", timeZone: "America/Argentina/Buenos_Aires" },
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

/** Locale settings for an app locale: numerals, Intl tag and direction. */
export function localeConfig(locale: string): LocaleConfig {
  return {
    locale,
    tag: numberTag(locale),
    dir: RTL_LOCALES.includes(locale) ? "rtl" : "ltr",
  };
}

/** City name in the active language, falling back to English. */
export function cityName(option: Pick<TimeZoneOption, "cityNames">, locale: string): string {
  const language = locale as CityLanguage;
  return option.cityNames[language] ?? option.cityNames.en;
}

/** Country name in the active language, from the runtime's own tables. */
export function countryName(code: string, tag: string): string {
  try {
    return new Intl.DisplayNames([tag], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
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

/** "UTC+02:00", "UTC-05:30", or "UTC" for zero. Digits stay ASCII for clarity. */
export function formatOffset(minutes: number): string {
  if (minutes === 0) return "UTC";
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `UTC${sign}${hh}:${mm}`;
}

/** Clock face text, e.g. "07:04:16 م" in Arabic or "19:04:16" in Spanish. */
export function formatClockTime(date: Date, timeZone: string, tag: string): string {
  return new Intl.DateTimeFormat(tag, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

/** Full date with weekday, in the active language. */
export function formatClockDate(date: Date, timeZone: string, tag: string): string {
  return new Intl.DateTimeFormat(tag, {
    timeZone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/** The zone's abbreviation at `date`, e.g. "GMT+3" or "EEST", in the active language. */
export function formatZoneAbbreviation(date: Date, timeZone: string, tag: string): string {
  const part = new Intl.DateTimeFormat(tag, { timeZone, timeZoneName: "short" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName");
  return part?.value ?? timeZone;
}

/**
 * Difference from the visitor's clock, localised: "+6h", "−7h", "+5h 30m".
 * Returns `null` for the same time so the caller can say so in its own words.
 */
export function formatDifference(diffMinutes: number, tag: string): string | null {
  if (diffMinutes === 0) return null;
  const sign = diffMinutes > 0 ? "+" : "−";
  const abs = Math.abs(diffMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  const hourPart = new Intl.NumberFormat(tag, { style: "unit", unit: "hour", unitDisplay: "narrow" });
  const minutePart = new Intl.NumberFormat(tag, { style: "unit", unit: "minute", unitDisplay: "narrow" });
  const pieces: string[] = [];
  if (hours > 0) pieces.push(hourPart.format(hours));
  if (minutes > 0) pieces.push(minutePart.format(minutes));
  return `${sign}${pieces.join(" ")}`;
}

/** Build the card data for one zone at one instant. */
export function describeZone(option: TimeZoneOption, locale: string, date: Date): TimeZoneData {
  return {
    city: cityName(option, locale),
    timeZone: option.timeZone,
    offset: formatOffset(offsetMinutes(option.timeZone, date)),
  };
}

/** Catalogue entry for a zone id, if we know it. */
export function optionFor(timeZone: string): TimeZoneOption | undefined {
  return TIME_ZONE_CATALOGUE.find((option) => option.timeZone === timeZone);
}

/**
 * Suggestions for the add box: matches on the city in any language, the
 * country (English or the active language), or the zone id. Zones already on
 * the dashboard and the featured zone are skipped.
 */
export function searchTimeZones(
  query: string,
  selected: readonly string[],
  locale = "en",
  limit = 6,
): TimeZoneOption[] {
  const needle = query.trim().toLowerCase();
  const tag = numberTag(locale);
  return TIME_ZONE_CATALOGUE.filter((option) => {
    if (selected.includes(option.timeZone) || option.timeZone === FEATURED_ZONE.timeZone) {
      return false;
    }
    if (!needle) return true;
    const haystack = [
      ...Object.values(option.cityNames),
      countryName(option.country, tag),
      countryName(option.country, "en"),
      option.timeZone,
    ];
    return haystack.some((text) => text.toLowerCase().includes(needle));
  }).slice(0, limit);
}

/**
 * Read the saved card list. Anything unknown, malformed, duplicated or equal
 * to the featured zone is dropped, so a stale preference can never break the page.
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

/** Return a copy with the item at `index` moved by `delta` (-1 earlier, +1 later). */
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
