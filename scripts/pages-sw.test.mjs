#!/usr/bin/env node
/**
 * The service worker is what makes "did my change deploy?" answerable.
 *
 * A static site keeps its HTML under `Cache-Control: max-age=600`, and the
 * document names its stylesheet by content hash — so a stale document paints the
 * *previous* build's CSS for as long as the cache holds it, which is exactly how
 * a shipped card-colour fix looked like it never deployed. Two guards:
 *
 * - navigations revalidate against the server instead of trusting the HTTP cache;
 * - the Pages build renames the cache per deploy, so an installed browser drops
 *   the old shell when the new worker activates.
 */
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { stampServiceWorker } from "./build-pages.mjs";
import { projectRoot } from "./with-app-env.mjs";

const ROOT = projectRoot();
const SW = readFileSync(join(ROOT, "public", "sw.js"), "utf8");

test("navigations revalidate instead of trusting the browser cache", () => {
  assert.match(SW, /request\.mode === "navigate" \? \{ cache: "no-cache" \} : undefined/);
  // The offline fallback stays: a failed navigation still answers from cache.
  assert.match(SW, /if \(request\.mode === "navigate"\)/);
  assert.match(SW, /const VERSION = "[^"]+";/);
});

test("the Pages build stamps the cache version from the built HTML", () => {
  const out = mkdtempSync(join(tmpdir(), "pages-sw-"));
  const template = 'const VERSION = "clock-time-v6";\n';
  writeFileSync(join(out, "sw.js"), template);

  const first = '<script src="/repo/assets/index-aaa.js"></script>';
  stampServiceWorker(first, out);
  const stamped = readFileSync(join(out, "sw.js"), "utf8");
  assert.match(stamped, /const VERSION = "clock-time-[0-9a-f]{8}";/);
  assert.notEqual(stamped, template);

  // Same build → same name (idempotent); new assets → new name (invalidating).
  writeFileSync(join(out, "sw.js"), template);
  stampServiceWorker(first, out);
  assert.equal(readFileSync(join(out, "sw.js"), "utf8"), stamped);
  writeFileSync(join(out, "sw.js"), template);
  stampServiceWorker('<script src="/repo/assets/index-bbb.js"></script>', out);
  assert.notEqual(readFileSync(join(out, "sw.js"), "utf8"), stamped);

  // A worker whose VERSION line drifted must fail the build, not ship stale.
  writeFileSync(join(out, "sw.js"), "self.addEventListener('install', () => {});\n");
  assert.throws(() => stampServiceWorker(first, out), /could not stamp the cache version/);
});

test("the shipped worker still matches what the build rewrites", () => {
  // `stampServiceWorker` rewrites this exact line; if the worker is refactored
  // without it, the build throws — assert that here so it is caught locally.
  assert.match(SW, /const VERSION = "clock-time-v6";/);
});
