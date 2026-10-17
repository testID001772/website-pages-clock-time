#!/usr/bin/env node
/**
 * The install is only as good as the manifest.
 *
 * Two failures this file exists to prevent, both seen in the field on phones:
 *
 * 1. A relative `start_url` (".") resolves to the bare directory, so launching
 *    the home-screen app depends on what the host answers for that one path. On
 *    GitHub Pages it was a stale 404 — the WebAPK failed to mint ("error
 *    install") and an installed app started into the host's error page, which
 *    Android reports as the app stopping.
 * 2. Icons that are not really there, or not the sizes Chrome demands
 *    (192 + 512), make the install fail outright.
 */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { stampManifest } from "./build-pages.mjs";
import { projectRoot } from "./with-app-env.mjs";

const ROOT = projectRoot();
const MANIFEST = join(ROOT, "public", "manifest.webmanifest");

function readManifest() {
  return JSON.parse(readFileSync(MANIFEST, "utf8"));
}

/** PNG headers carry the pixel size — no image library needed to check it. */
function pngSize(bytes) {
  assert.equal(bytes.toString("latin1", 1, 4), "PNG", "icons must be PNG");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

test("launches through a URL that cannot be a stale directory", () => {
  const doc = readManifest();
  assert.equal(doc.start_url, "/?source=pwa");
  assert.ok(!doc.start_url.startsWith("."), "a relative start_url follows the directory");
  assert.equal(doc.scope, "/");
  assert.equal(doc.id, "/");
  assert.equal(doc.display, "standalone");
  // Android paints the splash from these; they must match the app's near-black.
  assert.equal(doc.background_color, "#050505");
  assert.equal(doc.theme_color, "#050505");
});

test("ships the icons an install requires, at the sizes it claims", () => {
  const doc = readManifest();
  const sizes = doc.icons.map((icon) => icon.sizes);
  assert.ok(sizes.includes("192x192"), "Chrome needs a 192px icon");
  assert.ok(sizes.includes("512x512"), "Chrome needs a 512px icon");
  assert.ok(
    doc.icons.some((icon) => icon.purpose === "maskable"),
    "a maskable icon keeps the launcher from cropping the mark",
  );
  for (const icon of doc.icons) {
    const bytes = readFileSync(join(ROOT, "public", icon.src));
    const { width, height } = pngSize(bytes);
    assert.equal(`${width}x${height}`, icon.sizes, `${icon.src} is not the size it claims`);
  }
});

test("the Pages build points the launch URL at the deployed copy", () => {
  const out = mkdtempSync(join(tmpdir(), "pages-manifest-"));
  writeFileSync(join(out, "manifest.webmanifest"), readFileSync(MANIFEST));

  stampManifest("/website-pages-clock-time/", out);
  const stamped = JSON.parse(readFileSync(join(out, "manifest.webmanifest"), "utf8"));
  assert.equal(stamped.start_url, "/website-pages-clock-time/?source=pwa");
  assert.equal(stamped.scope, "/website-pages-clock-time/");
  assert.equal(stamped.id, "/website-pages-clock-time/");
  // Everything the install needs survives the rewrite.
  assert.deepEqual(stamped.icons, readManifest().icons);
  assert.equal(stamped.name, readManifest().name);

  // Stamping is idempotent for the same base and follows a different one.
  stampManifest("/website-pages-clock-time/", out);
  assert.deepEqual(
    JSON.parse(readFileSync(join(out, "manifest.webmanifest"), "utf8")),
    stamped,
  );
  stampManifest("/", out);
  assert.equal(JSON.parse(readFileSync(join(out, "manifest.webmanifest"), "utf8")).start_url, "/?source=pwa");
});
