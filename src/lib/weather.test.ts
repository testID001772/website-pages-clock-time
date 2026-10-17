import assert from "node:assert/strict";
import { test } from "node:test";
import { conditionKey, parseWeather, weatherUrl } from "./weather.ts";
import { copyFor } from "./world-clock-copy.ts";

test("the request asks Open-Meteo for the three current values in Celsius", () => {
  const url = new URL(weatherUrl({ latitude: 30.050755, longitude: 31.246909 }));
  assert.equal(url.origin, "https://api.open-meteo.com");
  assert.equal(url.pathname, "/v1/forecast");
  assert.equal(url.searchParams.get("latitude"), "30.050755");
  assert.equal(url.searchParams.get("longitude"), "31.246909");
  assert.equal(url.searchParams.get("current"), "temperature_2m,relative_humidity_2m,weather_code");
  assert.equal(url.searchParams.get("temperature_unit"), "celsius");
});

test("a valid reply parses to temperature, humidity and code", () => {
  const parsed = parseWeather({
    current: { temperature_2m: 27.4, relative_humidity_2m: 41, weather_code: 2 },
  });
  assert.deepEqual(parsed, { temperatureC: 27.4, humidity: 41, code: 2 });
});

test("malformed or partial replies become null, never a throw", () => {
  assert.equal(parseWeather(null), null);
  assert.equal(parseWeather("sunny"), null);
  assert.equal(parseWeather({}), null);
  assert.equal(parseWeather({ current: { temperature_2m: "27" } }), null);
  assert.equal(
    parseWeather({ current: { temperature_2m: 1, relative_humidity_2m: 2, weather_code: Number.NaN } }),
    null,
  );
});

test("humidity is clamped to 0–100", () => {
  const high = parseWeather({ current: { temperature_2m: 1, relative_humidity_2m: 130, weather_code: 0 } });
  assert.equal(high?.humidity, 100);
});

test("WMO codes map to the documented conditions", () => {
  assert.equal(conditionKey(0), "clear");
  assert.equal(conditionKey(3), "overcast");
  assert.equal(conditionKey(45), "fog");
  assert.equal(conditionKey(63), "rain");
  assert.equal(conditionKey(73), "snow");
  assert.equal(conditionKey(81), "showers");
  assert.equal(conditionKey(96), "thunderstorm");
  assert.equal(conditionKey(999), "unknown");
});

test("every condition has copy in every supported language", () => {
  for (const locale of ["en", "ar", "es", "fr", "de"]) {
    const copy = copyFor(locale);
    for (const value of Object.values(copy.conditions)) assert.ok(value.length > 0, locale);
  }
  assert.equal(copyFor("ar").conditions.rain, "مطر");
  assert.equal(copyFor("de").conditions.rain, "Rain", "unsupported languages fall back to English");
});
