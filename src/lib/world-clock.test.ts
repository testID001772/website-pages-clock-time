import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_ZONES,
  MAX_CARDS,
  TIME_ZONE_CATALOGUE,
  differenceLabel,
  formatOffset,
  isValidTimeZone,
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
  assert.equal(formatOffset(120), "UTC+02:00");
  assert.equal(formatOffset(-300), "UTC-05:00");
  assert.equal(formatOffset(330), "UTC+05:30");
});

test("difference from local is signed and drops zero minutes", () => {
  assert.equal(differenceLabel(0, 0), "Same time");
  assert.equal(differenceLabel(480, 120), "+6h");
  assert.equal(differenceLabel(-300, 120), "−7h");
  assert.equal(differenceLabel(330, 0), "+5h 30m");
});

test("every catalogue zone is a valid IANA zone and appears once", () => {
  const ids = TIME_ZONE_CATALOGUE.map((option) => option.timeZone);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.ok(isValidTimeZone(id), id);
  for (const id of DEFAULT_ZONES) assert.ok(ids.includes(id), id);
});

test("search matches city, region and zone id, skipping zones already shown", () => {
  const cities = searchTimeZones("lon", []).map((o) => o.city);
  assert.ok(cities.includes("London"));
  assert.ok(searchTimeZones("japan", []).some((o) => o.city === "Tokyo"));
  assert.ok(searchTimeZones("Asia/Seoul", []).some((o) => o.city === "Seoul"));
  assert.ok(!searchTimeZones("london", ["Europe/London"]).some((o) => o.city === "London"));
  assert.equal(searchTimeZones("", [], 3).length, 3);
  assert.equal(searchTimeZones("zzzz", []).length, 0);
});

test("saved order is restored, and bad entries are dropped", () => {
  const raw = JSON.stringify([
    "Asia/Tokyo",
    "Not/AZone",
    42,
    "Asia/Tokyo",
    "Europe/Paris",
  ]);
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
