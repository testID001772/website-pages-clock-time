/**
 * Current weather for a point, from Open-Meteo (free, no API key, CORS-enabled).
 * The browser calls it directly, so the static Pages build needs no server.
 * Parsing is defensive: a malformed or partial reply becomes `null`, never a crash.
 */
import type { Coordinates } from "./world-clock.ts";

export interface WeatherData {
  temperatureC: number;
  /** Relative humidity, 0–100. */
  humidity: number;
  /** WMO weather interpretation code, as Open-Meteo reports it. */
  code: number;
}

/** The copy keys a condition maps to. Kept here so the mapping is testable. */
export type ConditionKey =
  | "clear"
  | "partlyCloudy"
  | "overcast"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "showers"
  | "thunderstorm"
  | "unknown";

export const WEATHER_ENDPOINT = "https://api.open-meteo.com/v1/forecast";

/** How often the card refreshes. Weather changes slowly; this keeps requests modest. */
export const WEATHER_REFRESH_MS = 10 * 60 * 1000;

export function weatherUrl({ latitude, longitude }: Coordinates): string {
  const query = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,relative_humidity_2m,weather_code",
    temperature_unit: "celsius",
  });
  return `${WEATHER_ENDPOINT}?${query.toString()}`;
}

/** Read the `current` block of an Open-Meteo reply, or `null` if it is not usable. */
export function parseWeather(payload: unknown): WeatherData | null {
  if (typeof payload !== "object" || payload === null) return null;
  const current = (payload as { current?: unknown }).current;
  if (typeof current !== "object" || current === null) return null;
  const { temperature_2m, relative_humidity_2m, weather_code } = current as Record<string, unknown>;
  if (
    typeof temperature_2m !== "number" ||
    typeof relative_humidity_2m !== "number" ||
    typeof weather_code !== "number" ||
    !Number.isFinite(temperature_2m) ||
    !Number.isFinite(relative_humidity_2m) ||
    !Number.isFinite(weather_code)
  ) {
    return null;
  }
  return {
    temperatureC: temperature_2m,
    humidity: Math.min(100, Math.max(0, relative_humidity_2m)),
    code: weather_code,
  };
}

/** WMO code → condition, per Open-Meteo's documented table. */
export function conditionKey(code: number): ConditionKey {
  if (code === 0 || code === 1) return "clear";
  if (code === 2) return "partlyCloudy";
  if (code === 3) return "overcast";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if (code >= 61 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "showers";
  if (code === 85 || code === 86) return "snow";
  if (code >= 95 && code <= 99) return "thunderstorm";
  return "unknown";
}

/** Fetch and parse current weather. Rejects on network or HTTP errors. */
export async function fetchWeather(
  coordinates: Coordinates,
  signal?: AbortSignal,
): Promise<WeatherData> {
  const response = await fetch(weatherUrl(coordinates), { signal, headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`weather ${response.status}`);
  const data = parseWeather(await response.json());
  if (!data) throw new Error("weather: unexpected reply");
  return data;
}
