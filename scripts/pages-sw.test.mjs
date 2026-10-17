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
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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

test("an offline launch boots the app, not a bare document", () => {
  // The shell fetch goes through a query: a host can hold a stale answer for the
  // bare directory (GitHub Pages did), and the shell must never be that answer.
  assert.ok(SW.includes("const SHELL_FETCH = `${BASE}?source=sw`;"));
  assert.ok(SW.includes("await cache.put(BASE, document_);"), "the shell is stored under BASE");
  // Whatever the host answers for a navigation, the app still comes up.
  assert.ok(SW.includes('else if (request.mode === "navigate") {'));
  assert.ok(SW.includes("const shell = await caches.match(BASE);"));
  // The hashed client assets are precached, so the offline shell can render.
  assert.ok(SW.includes("const BUILD_ASSETS = [];"), "the build stamps the asset list here");
  assert.ok(SW.includes("...BUILD_ASSETS.map((asset) => `${BASE}${asset}`)"));
  // The 1.6 MB backdrop is not in the shell list: offline renders over the
  // gradient rather than spending a phone's data on a decorative image.
  const shell = SW.slice(SW.indexOf("const SHELL = ["), SW.indexOf("/** The audio"));
  assert.ok(!shell.includes("ferric-wash"), "the backdrop is not precached");
  assert.ok(shell.includes("manifest.webmanifest") && shell.includes("icon-512.png"));
});

test("the Pages build stamps the cache version from the built HTML", () => {
  const out = mkdtempSync(join(tmpdir(), "pages-sw-"));
  mkdirSync(join(out, "assets"));
  writeFileSync(join(out, "assets", "index-aaa.js"), "");
  const template = 'const VERSION = "clock-time-v6";\nconst BUILD_ASSETS = [];\n';
  writeFileSync(join(out, "sw.js"), template);

  const first = '<script src="/repo/assets/index-aaa.js"></script>';
  stampServiceWorker(first, out);
  const stamped = readFileSync(join(out, "sw.js"), "utf8");
  assert.match(stamped, /const VERSION = "clock-time-[0-9a-f]{8}";/);
  // …and the client assets of that build, for the offline shell.
  assert.match(stamped, /const BUILD_ASSETS = \["assets\/index-aaa\.js"\];/);
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
  assert.throws(() => stampServiceWorker(first, out), /could not stamp the cache version or the asset list/);
});

test("the shipped worker still matches what the build rewrites", () => {
  // `stampServiceWorker` rewrites this exact line; if the worker is refactored
  // without it, the build throws — assert that here so it is caught locally.
  assert.match(SW, /const VERSION = "clock-time-v2";/);
});
