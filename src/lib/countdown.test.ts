import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ar } from "./i18n/locales/ar.ts";
import { de } from "./i18n/locales/de.ts";
import { en } from "./i18n/locales/en.ts";
import { es } from "./i18n/locales/es.ts";
import { fr } from "./i18n/locales/fr.ts";
import { hi } from "./i18n/locales/hi.ts";
import { it as itLocale } from "./i18n/locales/it.ts";
import { pt } from "./i18n/locales/pt.ts";
import { ru } from "./i18n/locales/ru.ts";
import { tr } from "./i18n/locales/tr.ts";
import { zh } from "./i18n/locales/zh.ts";
import { nextNewYear, splitRange, UNITS } from "./countdown.ts";

const dictionaries: Record<string, typeof en> = {
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

/** Today, so the assertions track the real countdown the clock ships. */
const NOW = new Date();
const TARGET = nextNewYear(NOW);

describe("countdown units", () => {
  it("has no years unit — the clock renders months and below", () => {
    assert.deepEqual([...UNITS], ["months", "days", "hours", "minutes", "seconds"]);
    assert.ok(!(UNITS as readonly string[]).includes("years"));
  });

  it("never produces a years field, whatever the range", () => {
    const ranges: Array<[Date, Date]> = [
      [NOW, TARGET],
      [new Date(2026, 0, 1), new Date(2031, 5, 5)],
      [new Date(2024, 1, 29), new Date(2028, 1, 28)],
      [TARGET, NOW],
    ];
    for (const [from, to] of ranges) {
      const parts = splitRange(from, to);
      assert.ok(!("years" in parts), `${from.toISOString()} -> ${to.toISOString()}`);
      assert.deepEqual(Object.keys(parts).sort(), [
        "days",
        "hours",
        "minutes",
        "months",
        "seconds",
        "tenths",
      ]);
    }
  });

  it("splits on a sub-year calendar and drops the year it consumed", () => {
    const parts = splitRange(
      new Date(2028, 0, 1, 6, 30, 0),
      new Date(2028, 2, 4, 8, 32, 30),
    );
    assert.equal(parts.months, 2);
    assert.equal(parts.days, 3);
    assert.equal(parts.hours, 2);
    assert.equal(parts.minutes, 2);
    assert.equal(parts.seconds, 30);
  });

  it("clamps the year anchor instead of overflowing a leap day", () => {
    // Feb 29 + 1 year is Feb 28 (clamped), so a target of Mar 1 leaves one day
    // of remainder. Without the clamp the anchor would be Mar 1 and the split
    // would lose that day entirely.
    const parts = splitRange(new Date(2024, 1, 29), new Date(2026, 2, 1));
    assert.equal(parts.months, 0);
    assert.equal(parts.days, 1);

    // The anchor keeps the time of day, and nothing may go negative when it
    // lands just past the target.
    const nextDay = splitRange(new Date(2024, 1, 29, 6, 30), new Date(2025, 1, 28, 12, 0, 0));
    assert.deepEqual(
      {
        months: nextDay.months,
        days: nextDay.days,
        hours: nextDay.hours,
        minutes: nextDay.minutes,
      },
      { months: 0, days: 0, hours: 5, minutes: 30 },
    );
  });

  it("each locale labels exactly the rendered units", () => {
    for (const [tag, dict] of Object.entries(dictionaries)) {
      assert.deepEqual(
        Object.keys(dict.countdown.units).sort(),
        [...UNITS].sort(),
        `${tag} unit labels`,
      );
      assert.ok(
        !("years" in (dict.countdown.units as Record<string, string>)),
        `${tag} still labels years`,
      );
    }
  });

  it("no locale leaves a years numeral in the timer sentences", () => {
    for (const tag of Object.keys(dictionaries)) {
      const source = readFileSync(join(import.meta.dirname, "i18n/locales", `${tag}.ts`), "utf8");
      assert.ok(!/years/.test(source), `${tag} locale still mentions years`);
    }
  });

  it("the spoken timers start at months", () => {
    for (const [tag, dict] of Object.entries(dictionaries)) {
      const countdown = dict.countdown.ariaLabel(2, 20, "07", "05", "30");
      assert.equal(typeof countdown, "string");
      assert.ok(countdown.length > 0, `${tag} countdown aria`);
      const event = dict.event.timerAria(2, 1, 11, 11);
      assert.ok(event.length > 0, `${tag} event aria`);
      // "2" has to survive into the sentence — a dropped placeholder would
      // leave the months amount unspoken.
      assert.match(countdown, /2/, `${tag} countdown aria lost its months value`);
      assert.match(event, /2/, `${tag} event aria lost its months value`);
    }
  });
});
