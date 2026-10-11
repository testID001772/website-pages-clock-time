import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ar } from "./locales/ar.ts";
import { de } from "./locales/de.ts";
import { en } from "./locales/en.ts";
import { es } from "./locales/es.ts";
import { fr } from "./locales/fr.ts";
import { hi } from "./locales/hi.ts";
import { it as itLocale } from "./locales/it.ts";
import { pt } from "./locales/pt.ts";
import { ru } from "./locales/ru.ts";
import { tr } from "./locales/tr.ts";
import { zh } from "./locales/zh.ts";

const locales: Record<string, unknown> = {
  ar,
  de,
  en,
  es,
  fr,
  hi,
  it: itLocale,
  pt,
  ru,
  tr,
  zh,
};

/** Every leaf path plus its kind ("string" | "function" | "object"). */
function shape(value: unknown, path = ""): Map<string, string> {
  const out = new Map<string, string>();
  if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value)) {
      const child = (value as Record<string, unknown>)[key];
      for (const [p, k] of shape(child, path ? `${path}.${key}` : key)) out.set(p, k);
    }
  } else {
    out.set(path, typeof value);
  }
  return out;
}

function leaves(value: unknown, path = ""): Array<[string, unknown]> {
  if (value !== null && typeof value === "object") {
    return Object.keys(value).flatMap((key) =>
      leaves((value as Record<string, unknown>)[key], path ? `${path}.${key}` : key),
    );
  }
  return [[path, value]];
}

describe("locales", () => {
  it("every locale matches the English key tree exactly", () => {
    const base = shape(en);
    for (const [tag, dict] of Object.entries(locales)) {
      const got = shape(dict);
      const missing = [...base.keys()].filter((k) => !got.has(k));
      const extra = [...got.keys()].filter((k) => !base.has(k));
      const mistyped = [...base.keys()].filter((k) => got.has(k) && got.get(k) !== base.get(k));
      assert.deepEqual(missing, [], `${tag}: missing keys`);
      assert.deepEqual(extra, [], `${tag}: extra keys`);
      assert.deepEqual(mistyped, [], `${tag}: mistyped keys`);
    }
  });

  it("no locale ships an empty string", () => {
    for (const [tag, dict] of Object.entries(locales)) {
      for (const [path, value] of leaves(dict)) {
        if (typeof value === "string") assert.notEqual(value, "", `${tag}.${path} is empty`);
      }
    }
  });

  it("interpolations return non-empty strings", () => {
    const args: Record<string, unknown[]> = {
      "countdown.ariaLabel": [110, "20", "37", "54"],
      "event.releases": ["November 19, 2026"],
      "event.more": [7],
      "playlist.count": [100],
      "event.timerAria": [0, 2, 1, 11, 11],
      "home.yearComplete": [2026, "69.63"],
      "home.ringsIn": ["when", "tz"],
      "home.loadedIn": ["19.1"],
      "home.partyElapsed": [5, 4, 3, 2026],
      "home.startCountingTo": ["2027"],
      "home.srCountdown": [110, 20, 37, 2027],
      "dashboard.welcome": ["Ada"],
      "dashboard.yearPassed": ["69.63"],
      "admin.backgroundBlur": [4],
      "admin.glassBlur": [8],
      "admin.glassFill": [12],
    };
    for (const [tag, dict] of Object.entries(locales)) {
      for (const [path, a] of Object.entries(args)) {
        const fn = path
          .split(".")
          .reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], dict);
        assert.equal(typeof fn, "function", `${tag}.${path} is a function`);
        const out = (fn as (...xs: unknown[]) => unknown)(...a);
        assert.equal(typeof out, "string", `${tag}.${path} returns a string`);
        assert.notEqual(out, "", `${tag}.${path} returns non-empty`);
      }
    }
  });
});
