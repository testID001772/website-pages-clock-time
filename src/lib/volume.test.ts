import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatPercent } from "./numbers.ts";
import type { PrefStorage } from "./prefs.ts";
import { DEFAULT_VOLUME, VOLUME_PREF, clampVolume, readVolume, writeVolume } from "./volume.ts";

/** A fake localStorage, so the pref path is exercised without a browser. */
function fakeStorage(initial: Record<string, string> = {}): PrefStorage & { map: Map<string, string> } {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

describe("volume", () => {
  it("ships at full volume", () => {
    assert.equal(DEFAULT_VOLUME, 1);
    assert.equal(readVolume(fakeStorage()), 1);
    assert.equal(formatPercent(DEFAULT_VOLUME, "en"), "100%");
  });

  it("reads what the reader set, per language", () => {
    const storage = fakeStorage({ [`clock-time-${VOLUME_PREF}`]: "35" });
    assert.equal(readVolume(storage), 0.35);
    assert.equal(formatPercent(readVolume(storage), "en"), "35%");
    assert.equal(formatPercent(readVolume(storage), "ar"), "٣٥٪؜");
  });

  it("stores whole percent, so a hand-edited value reads the way it looks", () => {
    const storage = fakeStorage();
    assert.equal(writeVolume(0.6, storage), 0.6);
    assert.equal(storage.map.get(`clock-time-${VOLUME_PREF}`), "60");
    // The old player's pinned level is now just a value the reader can pick.
    assert.equal(readVolume(storage), 0.6);
  });

  it("clamps nonsense instead of throwing or going silent", () => {
    assert.equal(clampVolume(2), 1);
    assert.equal(clampVolume(-1), 0);
    assert.equal(clampVolume(Number.NaN), 1);
    assert.equal(clampVolume(Number.POSITIVE_INFINITY), 1);
    assert.equal(readVolume(fakeStorage({ [`clock-time-${VOLUME_PREF}`]: "banana" })), 1);
    assert.equal(readVolume(fakeStorage({ [`clock-time-${VOLUME_PREF}`]: "" })), 1);
    assert.equal(readVolume(fakeStorage({ [`clock-time-${VOLUME_PREF}`]: "-40" })), 0);
    assert.equal(readVolume(fakeStorage({ [`clock-time-${VOLUME_PREF}`]: "400" })), 1);
  });

  it("keeps zero as a real value — silence is not the same as unset", () => {
    const storage = fakeStorage();
    assert.equal(writeVolume(0, storage), 0);
    assert.equal(storage.map.get(`clock-time-${VOLUME_PREF}`), "0");
    assert.equal(readVolume(storage), 0);
  });

  it("migrates the pre-rename key like every other preference", () => {
    const storage = fakeStorage({ "system-space-volume": "20" });
    assert.equal(readVolume(storage), 0.2);
    assert.equal(storage.map.get("system-space-volume"), undefined, "old key cleaned up");
  });
});

describe("percent labels", () => {
  it("uses each language's own percent sign and digits", () => {
    assert.equal(formatPercent(1, "en"), "100%");
    assert.equal(formatPercent(0, "en"), "0%");
    // Arabic writes its own percent sign, and Arabic-Indic digits.
    assert.equal(formatPercent(1, "ar"), "١٠٠٪؜");
    // Russian and German put a space before the sign (a non-breaking one, so the
    // number and its sign never wrap apart).
    assert.match(formatPercent(1, "ru"), /^100\u00a0?\s?%$/u);
    assert.match(formatPercent(1, "de"), /^100\u00a0?\s?%$/u);
    assert.equal(formatPercent(0.37, "zh"), "37%");
  });

  it("rounds to whole percent", () => {
    assert.equal(formatPercent(0.366, "en"), "37%");
    assert.equal(formatPercent(0.999, "en"), "100%");
  });
});
