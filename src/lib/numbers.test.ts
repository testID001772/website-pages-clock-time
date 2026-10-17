import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatDecimal, formatInteger, numberTag } from "./numbers.ts";

/** Every language the app ships (`LOCALES` in `@/lib/i18n`). */
const LOCALES = ["en", "ar", "de", "es", "fr", "hi", "it", "pt", "ru", "tr", "zh"];
/** Arabic-Indic digits U+0660…U+0669 and the Arabic decimal separator U+066B. */
const ARABIC_INDIC = /[\u0660-\u0669]/;
const ARABIC_DECIMAL = "\u066B";
const LATIN_DIGITS = /[0-9]/;

describe("numbers per language", () => {
  it("pins the Arabic numeral system and leaves the other languages alone", () => {
    assert.equal(numberTag("ar"), "ar-u-nu-arab");
    assert.equal(numberTag("ar-EG"), "ar-EG-u-nu-arab");
    for (const locale of LOCALES.filter((l) => l !== "ar")) {
      assert.equal(numberTag(locale), locale, locale);
    }
    // Missing or unknown locales fall back to English, like the dictionary does.
    assert.equal(numberTag(undefined), "en");
    assert.equal(numberTag(""), "en");
    assert.equal(numberTag("   "), "en");
    // A caller that already pinned a system keeps it.
    assert.equal(numberTag("ar-u-nu-latn"), "ar-u-nu-latn");
    assert.equal(numberTag("en-u-nu-arab"), "en-u-nu-arab");
  });

  it("pads counts without thousands separators", () => {
    assert.equal(formatInteger(2, "en", 2), "02");
    assert.equal(formatInteger(2, "ar", 2), "٠٢");
    assert.equal(formatInteger(43, "ar"), "٤٣");
    assert.equal(formatInteger(2027, "en"), "2027");
    for (const locale of LOCALES) {
      assert.equal(formatInteger(2, locale, 2).length, 2, `${locale} pads to two digits`);
      assert.equal(formatInteger(7, locale), formatInteger(7, locale, 1), locale);
    }
  });

  it("writes decimals the way the language does", () => {
    assert.equal(formatDecimal(43.7, "en", 1, 2), "43.7");
    assert.equal(formatDecimal(43.7, "de", 1, 2), "43,7");
    assert.equal(formatDecimal(43.7, "ar", 1, 2), `٤٣${ARABIC_DECIMAL}٧`);
    assert.equal(formatDecimal(77.94, "en", 2), "77.94");
    assert.equal(formatDecimal(77.94, "ar", 2), `٧٧${ARABIC_DECIMAL}٩٤`);
    // The tenths are always shown, so a whole second keeps its ".0".
    assert.equal(formatDecimal(43, "en", 1, 2), "43.0");
  });

  it("uses the language's own digits, never Latin ones in Arabic", () => {
    for (const locale of LOCALES) {
      const digits = formatInteger(1_234_567_890, locale);
      if (locale === "ar") {
        assert.ok(ARABIC_INDIC.test(digits), `ar prints Arabic-Indic digits: ${digits}`);
        assert.ok(!LATIN_DIGITS.test(digits), `ar must not print Latin digits: ${digits}`);
      } else {
        assert.ok(LATIN_DIGITS.test(digits), `${locale}: ${digits}`);
        assert.ok(!ARABIC_INDIC.test(digits), `${locale} must stay Latin: ${digits}`);
      }
    }
  });

  it("returns an empty string instead of throwing on non-numbers", () => {
    assert.equal(formatInteger(Number.NaN, "en"), "");
    assert.equal(formatDecimal(Number.POSITIVE_INFINITY, "ar"), "");
  });
});
