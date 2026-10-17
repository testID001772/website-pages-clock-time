import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_ZONES,
  FEATURED_ZONE,
  MAX_CARDS,
  TIME_ZONE_CATALOGUE,
  cityName,
  countryName,
  formatClockTime,
  formatDifference,
  formatOffset,
  isValidTimeZone,
  localeConfig,
  moveZone,
  offsetMinutes,
  parseStoredZones,
  searchTimeZones,
  serializeZones,
} from "./world-clock.ts";

// Mid-January: no daylight saving in Cairo, London or New York's winter time.
const winter = new Date("2026-01-15T12:00:00Z");
// Mid-July: Cairo is on summer time again (since 2023), London on BST.
const summer = new Date("2026-07-15T12:00:00Z");

test("offsets come from the zone's real rules, DST included", () => {
  assert.equal(offsetMinutes("Africa/Cairo", winter), 120);
  assert.equal(offsetMinutes("Africa/Cairo", summer), 180);
  assert.equal(offsetMinutes("Europe/London", winter), 0);
  assert.equal(offsetMinutes("Europe/London", summer), 60);
  assert.equal(offsetMinutes("America/New_York", winter), -300);
  assert.equal(offsetMinutes("Asia/Kolkata", winter), 330);
});

test("offset labels read as UTC±HH:MM", () => {
  assert.equal(formatOffset(0), "UTC");
  assert.equal(formatOffset(180), "UTC+03:00");
  assert.equal(formatOffset(-300), "UTC-05:00");
  assert.equal(formatOffset(330), "UTC+05:30");
});

test("difference from local is signed, localised, and null for the same time", () => {
  assert.equal(formatDifference(0, "en"), null);
  assert.equal(formatDifference(360, "en"), "+6h");
  assert.equal(formatDifference(-420, "en"), "−7h");
  assert.equal(formatDifference(330, "en"), "+5h 30m");
  assert.equal(formatDifference(-30, "en"), "−30m");
});

test("the featured zone is Cairo and is never a catalogue or saved card", () => {
  assert.equal(FEATURED_ZONE.timeZone, "Africa/Cairo");
  assert.equal(FEATURED_ZONE.coordinates.latitude, 30.050755);
  assert.equal(FEATURED_ZONE.coordinates.longitude, 31.246909);
  assert.ok(!DEFAULT_ZONES.includes(FEATURED_ZONE.timeZone));
  assert.ok(!searchTimeZones("cairo", []).some((o) => o.timeZone === FEATURED_ZONE.timeZone));
  assert.deepEqual(parseStoredZones(JSON.stringify(["Africa/Cairo", "Asia/Tokyo"])), ["Asia/Tokyo"]);
});

test("every catalogue zone is a valid IANA zone and appears once", () => {
  const ids = TIME_ZONE_CATALOGUE.map((option) => option.timeZone);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.ok(isValidTimeZone(id), id);
  for (const id of DEFAULT_ZONES) assert.ok(ids.includes(id), id);
});

test("city names follow the active language, with English as the fallback", () => {
  const tokyo = TIME_ZONE_CATALOGUE.find((o) => o.timeZone === "Asia/Tokyo");
  assert.ok(tokyo);
  assert.equal(cityName(tokyo, "en"), "Tokyo");
  assert.equal(cityName(tokyo, "ar"), "طوكيو");
  assert.equal(cityName(tokyo, "es"), "Tokio");
  assert.equal(cityName(tokyo, "de"), "Tokyo", "a language without city names falls back");
});

test("country names come from the runtime's own localisation tables", () => {
  assert.equal(countryName("JP", "en"), "Japan");
  assert.equal(countryName("EG", "fr"), "Égypte");
  assert.equal(typeof countryName("ZZ", "en"), "string", "unknown codes never throw");
});

test("search matches city in any language, country, and zone id, skipping shown zones", () => {
  assert.ok(searchTimeZones("lon", []).some((o) => o.timeZone === "Europe/London"));
  assert.ok(searchTimeZones("japan", []).some((o) => o.timeZone === "Asia/Tokyo"));
  assert.ok(searchTimeZones("طوكيو", [], "ar").some((o) => o.timeZone === "Asia/Tokyo"));
  assert.ok(searchTimeZones("Asia/Seoul", []).some((o) => o.timeZone === "Asia/Seoul"));
  assert.ok(!searchTimeZones("london", ["Europe/London"]).some((o) => o.timeZone === "Europe/London"));
  assert.equal(searchTimeZones("", [], "en", 3).length, 3);
  assert.equal(searchTimeZones("zzzz", []).length, 0);
});

test("saved order is restored, and bad entries are dropped", () => {
  const raw = JSON.stringify(["Asia/Tokyo", "Not/AZone", 42, "Asia/Tokyo", "Europe/Paris"]);
  assert.deepEqual(parseStoredZones(raw), ["Asia/Tokyo", "Europe/Paris"]);
});

test("missing or corrupt storage falls back to the defaults", () => {
  assert.deepEqual(parseStoredZones(null), [...DEFAULT_ZONES]);
  assert.deepEqual(parseStoredZones("{not json"), [...DEFAULT_ZONES]);
  assert.deepEqual(parseStoredZones('{"zones":[]}'), [...DEFAULT_ZONES]);
});

test("the dashboard never holds more than MAX_CARDS", () => {
  const all = TIME_ZONE_CATALOGUE.map((option) => option.timeZone);
  assert.equal(parseStoredZones(JSON.stringify(all)).length, MAX_CARDS);
  assert.equal(JSON.parse(serializeZones(all)).length, MAX_CARDS);
});

test("moving a card swaps it with its neighbour and stops at the edges", () => {
  const zones = ["a", "b", "c"];
  assert.deepEqual(moveZone(zones, 1, -1), ["b", "a", "c"]);
  assert.deepEqual(moveZone(zones, 1, 1), ["a", "c", "b"]);
  assert.deepEqual(moveZone(zones, 0, -1), ["a", "b", "c"]);
  assert.deepEqual(moveZone(zones, 2, 1), ["a", "b", "c"]);
  assert.deepEqual(zones, ["a", "b", "c"], "input is not mutated");
});

test("Arabic gets RTL and Arabic-Indic numerals; other languages stay LTR", () => {
  const ar = localeConfig("ar");
  assert.equal(ar.dir, "rtl");
  assert.match(formatClockTime(winter, "Africa/Cairo", ar.tag), /[\u0660-\u0669]/u);
  const en = localeConfig("en");
  assert.equal(en.dir, "ltr");
  assert.match(formatClockTime(winter, "Africa/Cairo", en.tag), /^\d/u);
});
