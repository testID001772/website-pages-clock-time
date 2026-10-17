import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * White mode has to read as white.
 *
 * The backdrop is the piece that can quietly break it: the stage paints a
 * photograph (a shipped backdrop or a staff upload — both near-black 8K images)
 * and the light theme paints dark ink on top. Every light-mode value in the
 * stylesheet assumes a pale page, so a photo left painting in white mode leaves
 * dark text on a black page — the whole theme unreadable at once.
 */
const CSS = readFileSync(join(import.meta.dirname, "..", "styles.css"), "utf8");
const LIGHT_AT = CSS.indexOf('html[data-theme="light"] {');
const LIGHT = CSS.slice(LIGHT_AT);

describe("white mode", () => {
  it("paints the pale gradient and skips the photograph", () => {
    const backdrop = LIGHT.slice(0, LIGHT.indexOf('html[data-theme="light"] .glass'));
    assert.match(backdrop, /\.space-bg \{\s+background:\s+radial-gradient\(/);
    assert.match(backdrop, /html\[data-theme="light"\] \.space-bg-custom \{\s+display: none;\s+\}/);
    // …and the dark stage still gets it.
    assert.ok(!/\.space-bg-custom[^{]*\{\s+display: none/.test(CSS.slice(0, LIGHT_AT)));
  });

  it("keeps dark ink on every surface that sits on that pale page", () => {
    // The language menu is white in white mode, so its states tint to the ink.
    assert.match(LIGHT, /html\[data-theme="light"\] \.lang-option:hover \{\s+background: rgb\(36 29 78/);
    assert.match(LIGHT, /html\[data-theme="light"\] \.lang-option\.current \{\s+background: rgb\(36 29 78/);
    // The finale's line was a dark-theme lavender in both themes.
    assert.match(LIGHT, /html\[data-theme="light"\] \.celebrate p \{\s+color: var\(--color-muted\)/);
    // Focus rings and image outlines are tuned for the dark stage by default.
    assert.match(LIGHT, /html\[data-theme="light"\] \.btn:focus-visible/);
    assert.match(LIGHT, /html\[data-theme="light"\] img \{\s+outline-color: rgb\(36 29 78/);
    // So are the hairline utilities — a white border on a white card is nothing
    // (the playlist header divider, the release-list separator).
    assert.match(LIGHT, /html\[data-theme="light"\] \[class\*="border-white\/"\] \{\s+border-color: rgb\(36 29 78/);
  });

  it("keeps the pickers reachable and unclipped in a narrow window", () => {
    // Both panels are 20rem wide. Anchored to their chip they ran off the left
    // edge once the header row pushed that chip across; under 800px they anchor
    // to the viewport, under the header row.
    const narrow = CSS.slice(CSS.indexOf("@media (max-width: 800px)"));
    assert.ok(narrow.length > 0, "the narrow-window rule exists");
    assert.match(narrow, /\.music-menu,\s+\n?\s*\.lang-menu \{\s+position: fixed;/);
    assert.match(narrow, /inset-inline-end: 1rem;/);
    // Switching language is not optional on a phone: the glass chip rests
    // instead of the language picker (which used to be hidden below 560px).
    assert.match(
      CSS,
      /@media \(max-width: 560px\) \{\s+\.chip-glass \{\s+display: none;/,
    );
    assert.ok(
      !/\.lang-picker \{[^}]*display: none/s.test(CSS),
      "the language picker must never hide",
    );
  });

  it("keeps the light palette light and its ink dark", () => {
    const block = LIGHT.slice(0, LIGHT.indexOf("}"));
    assert.match(block, /--color-void: #e9e6fa/);
    assert.match(block, /--color-ink: #241d4e/);
    assert.match(block, /--card-solid: #ffffff/);
  });
});
