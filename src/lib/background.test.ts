import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/** Width/height of a JPEG, read straight from its frame header. */
function imageSize(bytes: Buffer): { width: number; height: number } | null {
  let i = 2;
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = bytes[i + 1];
    const length = bytes.readUInt16BE(i + 2);
    // SOF0..SOF15 minus the non-frame markers (DHT=0xc4, JPG=0xc8, DAC=0xcc).
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { width: bytes.readUInt16BE(i + 7), height: bytes.readUInt16BE(i + 5) };
    }
    i += 2 + length;
  }
  return null;
}
import {
  BACKGROUND_HARD_MAX_CHARS,
  BACKGROUND_MAX_CHARS,
  DEFAULT_BACKGROUND_URL,
  SHIPPED_BACKGROUNDS,
  isDefaultBackground,
  resolveBackgroundUrl,
  resolvePhoneBackgroundUrl,
  shippedBackgroundFor,
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

  it("paints the phone copy of the shipped artwork on a narrow screen", () => {
    const shipped = { backgroundUrl: null, backgroundEnabled: true };
    assert.equal(resolvePhoneBackgroundUrl(shipped), "/ferric-wash-phone.jpg");
    assert.equal(
      resolvePhoneBackgroundUrl({ backgroundUrl: "/space-nebula.jpg", backgroundEnabled: true }),
      "/space-nebula-phone.jpg",
    );
    // No image at all stays no image — the phone rule must not resurrect one.
    assert.equal(resolvePhoneBackgroundUrl({ backgroundUrl: null, backgroundEnabled: false }), null);
    // An upload is already inside the budget and is painted as-is.
    const upload = { backgroundUrl: "data:image/jpeg;base64,AAAA", backgroundEnabled: true };
    assert.equal(resolvePhoneBackgroundUrl(upload), "data:image/jpeg;base64,AAAA");
  });

  it("ships a phone copy for every shipped backdrop, and they are small", () => {
    for (const image of SHIPPED_BACKGROUNDS) {
      const phone = join(import.meta.dirname, "..", "..", "public", image.phoneUrl.replace("/", ""));
      assert.ok(existsSync(phone), `${image.phoneUrl} is missing (npm run backgrounds)`);
      const size = statSync(phone).size;
      assert.ok(size < 400_000, `${image.phoneUrl} is ${(size / 1024).toFixed(0)} KB`);
      // Nine times fewer pixels than the 8K original — that is the point.
      const meta = imageSize(readFileSync(phone));
      assert.ok(meta, `${image.phoneUrl} must be a readable JPEG`);
      assert.ok(
        meta.width <= 2048 && meta.height <= 2048,
        `${image.phoneUrl} is ${meta.width}×${meta.height}`,
      );
      assert.ok(meta.width >= 1280, `${image.phoneUrl} is too small for a phone (${meta.width}px wide)`);
    }
  });

  it("picks between the two copies in CSS, not in JavaScript", () => {
    // The media query is what makes a phone skip the 33-megapixel decode; a
    // `background-image` set inline would win over it, so the stage sets custom
    // properties instead.
    const css = readFileSync(join(import.meta.dirname, "..", "styles.css"), "utf8");
    assert.match(css, /\.space-bg-custom \{[^}]*background-image: var\(--bg-image\)/s);
    const narrow = css.slice(css.indexOf("@media (max-width: 900px)"));
    assert.match(narrow, /background-image: var\(--bg-image-phone, var\(--bg-image\)\)/);
    const stage = readFileSync(
      join(import.meta.dirname, "..", "components", "space", "space-stage.tsx"),
      "utf8",
    );
    assert.match(stage, /"--bg-image": `url\("\$\{imageUrl\}"\)`/);
    assert.match(stage, /"--bg-image-phone": `url\("\$\{phoneUrl \?\? imageUrl\}"\)`/);
    assert.ok(!/backgroundImage:/.test(stage), "the stage must not set background-image inline");
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
describe("shipped artwork", () => {
  it("lists unique 8K-able JPEG paths, the ferric wash first", () => {
    assert.ok(SHIPPED_BACKGROUNDS.length >= 2, "both shipped images are offered");
    const ids = SHIPPED_BACKGROUNDS.map((image) => image.id);
    assert.deepEqual([...new Set(ids)], ids, "stable unique ids");
    const urls = SHIPPED_BACKGROUNDS.map((image) => image.url);
    assert.deepEqual([...new Set(urls)], urls, "no duplicate files");
    for (const image of SHIPPED_BACKGROUNDS) {
      assert.match(image.url, /^\/[a-z0-9-]+\.jpg$/, image.url);
    }
    assert.equal(SHIPPED_BACKGROUNDS[0].id, "ferric-wash");
    assert.equal(DEFAULT_BACKGROUND_URL, SHIPPED_BACKGROUNDS[0].url);
  });

  it("recognizes its own artwork and nothing else", () => {
    assert.equal(shippedBackgroundFor("/ferric-wash.jpg")?.id, "ferric-wash");
    assert.equal(shippedBackgroundFor("/space-nebula.jpg")?.id, "space-nebula");
    assert.equal(shippedBackgroundFor(null), null);
    assert.equal(shippedBackgroundFor(""), null);
    assert.equal(shippedBackgroundFor("data:image/jpeg;base64,AAAA"), null);
    assert.equal(shippedBackgroundFor("https://cdn.example.com/bg.jpg"), null);
    assert.equal(shippedBackgroundFor("/background.jpg"), null, "the old filename is gone");
  });
});
