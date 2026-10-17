#!/usr/bin/env node
/**
 * Copy the static site build into the desktop shell's bundle.
 *
 * `electron-builder` packs whatever is under `desktop/`, and the app it ships is
 * the same prerendered static build GitHub Pages serves (`npm run build:pages`).
 * Copying instead of pointing at `../dist/client` keeps the packaged app
 * self-contained: the `files` list in package.json cannot reach outside the
 * project directory, and a stale sibling build would be worse than an error.
 */
import { cpSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(dirname(fileURLToPath(import.meta.url))); // desktop/
const root = join(here, "..");
const source = join(root, "dist", "client");
const target = join(here, "web");

if (!existsSync(join(source, "index.html"))) {
  console.error(
    `[desktop] no static build at dist/client.\n` +
      `[desktop] run \`npm run build:pages\` from the repository root first, then \`npm run dist\` here.`,
  );
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });

console.log(`[desktop] static site copied to desktop/web`);
