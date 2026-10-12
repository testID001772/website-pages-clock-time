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
import {
  formatNow,
  nextNewYear,
  splitRange,
  unitNumberText,
  UNITS,
  type UnitParts,
} from "./countdown.ts";
import { numberTag } from "./numbers.ts";

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

describe("the clock speaks the visitor's language", () => {
  /** 19:07:16.2 UTC — the exact moment the Arabic screenshot showed. */
  const AT = new Date(Date.UTC(2026, 9, 12, 19, 7, 16, 200));
  const PARTS: UnitParts = { months: 2, days: 19, hours: 4, minutes: 52, seconds: 43, tenths: 7 };
  /** CLDR's default clock: 12-hour with a marker … */
  const TWELVE_HOUR = ["en", "ar", "hi"];
  /** … and 24-hour, where an English "PM" was simply wrong. */
  const TWENTY_FOUR_HOUR = ["de", "es", "fr", "it", "pt", "ru", "tr", "zh"];

  it("renders every countdown block in the visitor's digits", () => {
    assert.equal(unitNumberText("months", PARTS, "en"), "02");
    assert.equal(unitNumberText("months", PARTS, "ar"), "٠٢");
    assert.equal(unitNumberText("hours", PARTS, "ar"), "٠٤");
    assert.equal(unitNumberText("seconds", PARTS, "en"), "43.7");
    assert.equal(unitNumberText("seconds", PARTS, "de"), "43,7");
    assert.equal(unitNumberText("seconds", PARTS, "ar"), "٤٣\u066B٧");
    // First paint / server render: the tenths are not live yet.
    assert.equal(unitNumberText("seconds", PARTS, "en", false), "43.0");
  });

  it("keeps each language's own clock instead of forcing 12-hour", () => {
    for (const locale of TWENTY_FOUR_HOUR) {
      const text = formatNow(AT, locale);
      assert.match(text, /^[0-9]{1,2}:[0-9]{2}:[0-9]{2}[.,][0-9]$/, `${locale}: ${text}`);
    }
    for (const locale of TWELVE_HOUR) {
      const text = formatNow(AT, locale);
      assert.match(text, /[A-Za-z\u0600-\u06FF]/, `${locale} keeps its own day period: ${text}`);
      assert.match(text, /[0-9\u0660-\u0669]{1,2}:[0-9\u0660-\u0669]{2}:/, `${locale}: ${text}`);
    }
    // The old build hard-coded `hour12: true`, which is what put an English
    // "PM" on the German, French and Russian clocks.
    const forced = new Intl.DateTimeFormat("de", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 1,
      hour12: true,
    }).format(AT);
    assert.notEqual(formatNow(AT, "de"), forced);
  });

  it("passes the language through and formats nothing on its own", () => {
    for (const locale of [...TWELVE_HOUR, ...TWENTY_FOUR_HOUR]) {
      const expected = new Intl.DateTimeFormat(numberTag(locale), {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 1,
      }).format(AT);
      assert.equal(formatNow(AT, locale), expected, locale);
    }
  });

  it("agrees with itself: the clock and the countdown share one numeral system", () => {
    const arabic = formatNow(AT, "ar");
    assert.ok(/[\u0660-\u0669]/.test(arabic), `Arabic-Indic digits in the clock: ${arabic}`);
    assert.ok(
      /[\u0660-\u0669]/.test(unitNumberText("seconds", PARTS, "ar")),
      "Arabic-Indic digits in the countdown",
    );
    assert.ok(
      !/[0-9]/.test(unitNumberText("seconds", PARTS, "ar")),
      "no Latin digits left in the Arabic countdown",
    );
  });
});
