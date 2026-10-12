import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CARD_BASE_ALPHA,
  CARD_RGB,
  CARD_SOLID,
  GLASS_OPACITY_DEFAULT,
  resolveCardSurface,
} from "./cards.ts";

/** A settings row as the database seeds it (see DEFAULT_SETTINGS). */
const seeded = { glassAuto: true, glassColor: "#ffffff", glassOpacity: GLASS_OPACITY_DEFAULT };

describe("card surfaces", () => {
  it("is the theme's own colour: black in dark, white in light", () => {
    assert.equal(CARD_SOLID.dark, "#000000");
    assert.equal(CARD_SOLID.light, "#ffffff");
    assert.equal(CARD_RGB.dark, "0, 0, 0");
    assert.equal(CARD_RGB.light, "255, 255, 255");

    assert.deepEqual(resolveCardSurface(seeded, "dark"), {
      rgb: "0, 0, 0",
      alpha: CARD_BASE_ALPHA.dark,
    });
    assert.deepEqual(resolveCardSurface(seeded, "light"), {
      rgb: "255, 255, 255",
      alpha: CARD_BASE_ALPHA.light,
    });
  });

  it("keeps a staff colour when auto is off, in both themes", () => {
    const picked = { glassAuto: false, glassColor: "#2a1458", glassOpacity: GLASS_OPACITY_DEFAULT };
    assert.equal(resolveCardSurface(picked, "dark").rgb, "42, 20, 88");
    assert.equal(resolveCardSurface(picked, "light").rgb, "42, 20, 88");
    // A seeded row still carries #ffffff — with auto off that is white cards,
    // which is a deliberate choice rather than the theme default.
    const white = { glassAuto: false, glassColor: "#ffffff", glassOpacity: 20 };
    assert.equal(resolveCardSurface(white, "dark").rgb, "255, 255, 255");
  });

  it("treats the fill slider as a delta around the theme's natural card", () => {
    const at = (glassOpacity: number) => resolveCardSurface({ ...seeded, glassOpacity }, "dark").alpha;
    assert.equal(at(GLASS_OPACITY_DEFAULT), CARD_BASE_ALPHA.dark);
    assert.ok(at(40) > at(GLASS_OPACITY_DEFAULT));
    assert.ok(at(0) < at(GLASS_OPACITY_DEFAULT));
    assert.ok(Math.abs(at(30) - (CARD_BASE_ALPHA.dark + 0.1)) < 1e-9);
    // Never invisible, never a division-by-zero-ish negative.
    assert.ok(at(0) >= 0.12);
    assert.ok(resolveCardSurface({ ...seeded, glassOpacity: 400 }, "light").alpha <= 1);
    assert.equal(resolveCardSurface({ ...seeded, glassOpacity: Number.NaN }, "dark").alpha, CARD_BASE_ALPHA.dark);
  });

  it("matches what the stylesheet paints before hydration", () => {
    // The first paint has no JS, so `:root` and the light block carry the same
    // numbers a seeded row resolves to. If these drift, the page flashes.
    const css = readFileSync(join(import.meta.dirname, "..", "styles.css"), "utf8");
    const root = css.slice(0, css.indexOf('html[data-theme="light"]'));
    assert.match(root, /--card-solid:\s*#000000/, "dark card colour in :root");
    assert.match(root, /--glass-rgb:\s*0,\s*0,\s*0/, "dark card rgb in :root");
    const light = css.slice(css.indexOf('html[data-theme="light"]'));
    assert.match(light, /--card-solid:\s*#ffffff/, "light card colour");
    assert.match(light, /--glass-rgb:\s*255,\s*255,\s*255/, "light card rgb");
    // And the solid dropdown reads the token, not a hard-coded violet.
    assert.match(css, /\.lang-menu[^}]*background:\s*var\(--card-solid\)/s);
    assert.ok(!/rgb\(18 8 42\)/.test(css), "the old violet panel colour is gone");
  });
});
