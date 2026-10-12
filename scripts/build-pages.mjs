#!/usr/bin/env node
/**
 * Build the GitHub Pages copy of the app — a static, serverless site.
 *
 *   PAGES_BASE=/website-pages-clock-time-/ npm run build:pages
 *
 * GitHub Pages serves files; it cannot run this app's server (no server
 * functions, no Better Auth, no database). So this build:
 *
 *  - mounts the app under `PAGES_BASE` — a project site lives at
 *    `/<repo>/`, so Vite's `base`, the router's `basepath` and the hand-built
 *    asset URLs (`@/lib/base-url`) all move together;
 *  - sets `VITE_STATIC_SITE=1`, which swaps the database-backed playlist for the
 *    shipped `music/library.json` and drops the account UI instead of leaving
 *    dead sign-in flows on a site with nothing to sign in to;
 *  - prerenders the pages to real HTML (`dist/client/**\/index.html`), so the
 *    first paint is the countdown, not an empty div waiting for JavaScript;
 *  - adds `404.html` (a copy of the page shell) and `.nojekyll`, so deep links
 *    hand over to the client router and no path is treated as Jekyll input.
 *
 * Output: `dist/client`, ready to upload as a Pages artifact. The normal
 * `npm run build` (server output, `base: "/"`) is untouched.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isMainModule, projectRoot } from "./with-app-env.mjs";

const root = projectRoot();
const OUT = join(root, "dist", "client");

/** Mount point: `/` for a root site, `/<repo>/` for a GitHub project site. */
export function normalizeBase(raw) {
  const value = (raw ?? "").trim();
  if (value === "" || value === "/") return "/";
  const withLead = value.startsWith("/") ? value : `/${value}`;
  return withLead.endsWith("/") ? withLead : `${withLead}/`;
}

/** Everything the deployed site needs, checked after the build. */
const REQUIRED = [
  "index.html",
  "ferric-wash.jpg",
  "space-nebula.jpg",
  "manifest.webmanifest",
  "favicon.svg",
  "icon-192.png",
  "sw.js",
  "music/library.json",
];

function build(base) {
  console.log(`[pages] vite build — base ${base}, static (no server)`);
  execFileSync(
    process.execPath,
    [join(root, "scripts", "with-app-env.mjs"), "vite", "build"],
    {
      cwd: root,
      stdio: "inherit",
      env: {
        ...process.env,
        PAGES_BUILD: "1",
        PAGES_BASE: base,
        VITE_STATIC_SITE: "1",
      },
    },
  );
}

function postProcess(base) {
  const index = join(OUT, "index.html");
  if (!existsSync(index)) {
    throw new Error(
      `no prerendered index.html in dist/client — the build ran without prerendering`,
    );
  }
  const html = readFileSync(index, "utf8");
  if (!html.includes("Clock Time")) {
    throw new Error("dist/client/index.html does not look like the app shell");
  }
  // Deep links (`/<repo>/dashboard`) land on this page and boot the client
  // router, which is what keeps a static host from 404-ing on every route.
  copyFileSync(index, join(OUT, "404.html"));
  // Pages serves the artifact as-is with the GitHub Actions deploy; the marker
  // keeps the site intact if it is ever published from a branch instead.
  writeFileSync(join(OUT, ".nojekyll"), "");

  const missing = REQUIRED.filter((rel) => !existsSync(join(OUT, rel)));
  if (missing.length > 0) {
    throw new Error(`missing from dist/client: ${missing.join(", ")}`);
  }
  if (base !== "/" && !html.includes(base)) {
    throw new Error(`index.html does not reference the mount point ${base}`);
  }
  assertCatalogue();
  stampServiceWorker(html);
  return html;
}

/**
 * Every track the shipped catalogue lists has to be in the artifact. The list is
 * generated (`scripts/generate-music.mjs`), so the build reads it instead of a
 * hand-kept copy of 30 file names — a track that is listed but missing would be a
 * row in the playlist that cannot play.
 */
function assertCatalogue() {
  const catalogue = JSON.parse(readFileSync(join(OUT, "music", "library.json"), "utf8"));
  const rows = Array.isArray(catalogue?.tracks) ? catalogue.tracks : [];
  if (rows.length === 0) throw new Error("music/library.json lists no tracks");
  const missing = rows
    .map((row) => String(row?.source ?? "").replace(/^\//, ""))
    .filter((rel) => rel === "" || !existsSync(join(OUT, rel)));
  if (missing.length > 0) {
    throw new Error(`missing from dist/client: ${missing.join(", ")}`);
  }
  console.log(`[pages] music catalogue: ${rows.length} tracks, every file present`);
}

/**
 * Give the service worker a cache name derived from the build, so every deploy
 * drops the previous shell instead of leaving installed browsers on the old one
 * until someone remembers to bump a constant by hand. The HTML carries the
 * hashed asset names, so hashing it changes exactly when the build changes.
 */
export function stampServiceWorker(html, outDir = OUT) {
  const path = join(outDir, "sw.js");
  const source = readFileSync(path, "utf8");
  const stamp = createHash("sha256").update(html).digest("hex").slice(0, 8);
  const stamped = source.replace(
    /const VERSION = "[^"]*";/,
    `const VERSION = "clock-time-${stamp}";`,
  );
  if (stamped === source) {
    throw new Error("sw.js: could not stamp the cache version (VERSION line changed?)");
  }
  writeFileSync(path, stamped);
  console.log(`[pages] sw.js cache version → clock-time-${stamp}`);
}

function main() {
  const base = normalizeBase(process.env.PAGES_BASE);
  if (base === "/") {
    console.log(
      "[pages] PAGES_BASE is empty — building for the origin root. A GitHub project site needs its repo path, e.g. PAGES_BASE=/my-repo/.",
    );
  }
  build(base);
  postProcess(base);
  const bytes = statSync(join(OUT, "index.html")).size;
  console.log(
    `[pages] dist/client ready — index.html ${(bytes / 1024).toFixed(1)} KB, ` +
      `${REQUIRED.length} required files present, base ${base}, 404.html + .nojekyll written`,
  );
}

if (isMainModule(import.meta.url)) main();
