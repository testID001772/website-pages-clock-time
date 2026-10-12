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
  });

  it("keeps the light palette light and its ink dark", () => {
    const block = LIGHT.slice(0, LIGHT.indexOf("}"));
    assert.match(block, /--color-void: #e9e6fa/);
    assert.match(block, /--color-ink: #241d4e/);
    assert.match(block, /--card-solid: #ffffff/);
  });
});
