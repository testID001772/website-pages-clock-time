import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BACKGROUND_HARD_MAX_CHARS,
  BACKGROUND_MAX_CHARS,
  DEFAULT_BACKGROUND_URL,
  isDefaultBackground,
  resolveBackgroundUrl,
} from "./background.ts";

describe("background image resolution", () => {
  it("shows an uploaded image when one is set", () => {
    const settings = { backgroundUrl: "data:image/jpeg;base64,AAAA", backgroundEnabled: true };
    assert.equal(resolveBackgroundUrl(settings), "data:image/jpeg;base64,AAAA");
    assert.equal(isDefaultBackground(settings), false);
  });

  it("falls back to the shipped image when nothing was uploaded", () => {
    const settings = { backgroundUrl: null, backgroundEnabled: true };
    assert.equal(resolveBackgroundUrl(settings), DEFAULT_BACKGROUND_URL);
    assert.equal(isDefaultBackground(settings), true);
  });

  it("treats a blank upload as nothing uploaded", () => {
    const settings = { backgroundUrl: "   ", backgroundEnabled: true };
    assert.equal(resolveBackgroundUrl(settings), DEFAULT_BACKGROUND_URL);
  });

  it("paints no image when the admin turns the switch off", () => {
    assert.equal(resolveBackgroundUrl({ backgroundUrl: null, backgroundEnabled: false }), null);
    assert.equal(
      resolveBackgroundUrl({ backgroundUrl: "data:image/png;base64,BBBB", backgroundEnabled: false }),
      null,
    );
    assert.equal(isDefaultBackground({ backgroundUrl: null, backgroundEnabled: false }), false);
  });

  it("treats a missing flag as on (older rows)", () => {
    // A row read before migration 0007 has no `background_enabled`; the
    // resolver must not blank the page out for it.
    const legacy = { backgroundUrl: null } as unknown as {
      backgroundUrl: string | null;
      backgroundEnabled: boolean;
    };
    assert.equal(resolveBackgroundUrl(legacy), DEFAULT_BACKGROUND_URL);
  });

  it("keeps the upload budget inside the server ceiling", () => {
    assert.ok(BACKGROUND_MAX_CHARS < BACKGROUND_HARD_MAX_CHARS);
    // Both are character counts of a base64 data URL, i.e. ~4/3 of the bytes.
    assert.ok(BACKGROUND_MAX_CHARS <= 500_000);
  });

  it("points at a real public asset path", () => {
    assert.match(DEFAULT_BACKGROUND_URL, /^\/[A-Za-z0-9._~\-/]+$/);
    assert.ok(!DEFAULT_BACKGROUND_URL.includes(".."));
  });
});
