import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { LEGACY_PREF_PREFIX, PREF_PREFIX, prefKey, readPref, writePref } from "./prefs.ts";

/** Minimal localStorage stand-in with the three methods prefs.ts uses. */
function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
}

describe("preference storage", () => {
  it("namespaces keys under the current brand", () => {
    assert.equal(PREF_PREFIX, "clock-time-");
    assert.equal(LEGACY_PREF_PREFIX, "system-space-");
    assert.equal(prefKey("theme"), "clock-time-theme");
  });

  it("reads what was just written", () => {
    const storage = fakeStorage();
    writePref("theme", "light", storage);
    assert.equal(readPref("theme", storage), "light");
    assert.equal(storage.map.get("clock-time-theme"), "light");
  });

  it("returns null for a preference that was never set", () => {
    assert.equal(readPref("motion", fakeStorage()), null);
  });

  it("adopts the pre-rename value and clears the orphan", () => {
    const storage = fakeStorage({ "system-space-theme": "light" });
    assert.equal(readPref("theme", storage), "light");
    assert.equal(storage.map.get("clock-time-theme"), "light", "migrated under the new key");
    assert.equal(storage.map.has("system-space-theme"), false, "old key cleaned up");
  });

  it("prefers the current key when both exist", () => {
    const storage = fakeStorage({ "clock-time-theme": "dark", "system-space-theme": "light" });
    assert.equal(readPref("theme", storage), "dark");
    assert.equal(storage.map.get("system-space-theme"), "light", "legacy key untouched");
  });

  it("only migrates the key it was asked for", () => {
    const storage = fakeStorage({ "system-space-motion": "off" });
    assert.equal(readPref("theme", storage), null);
    assert.equal(storage.map.get("system-space-motion"), "off");
    assert.equal(storage.map.size, 1);
  });

  it("survives storage being unavailable (SSR, private mode)", () => {
    assert.equal(readPref("theme", null), null);
    assert.doesNotThrow(() => writePref("theme", "dark", null));
  });

  it("treats the falsy-shaped values the callers branch on", () => {
    const storage = fakeStorage({ "system-space-music": "false" });
    assert.equal(readPref("music", storage), "false");
    assert.equal(readPref("music", storage) !== "false", false, "muted intent survives the rename");
  });
});
