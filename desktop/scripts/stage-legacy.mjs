#!/usr/bin/env node
/**
 * Stage the shared static app and Electron shell into the isolated Electron 22
 * project. The staged files are generated/ignored; legacy dependencies and
 * builder settings never replace the maintained modern desktop package.
 */
import { cpSync, copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const desktopRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const root = join(desktopRoot, "..");
const legacyRoot = join(desktopRoot, "legacy");
const sourceWeb = join(desktopRoot, "web");
const targetWeb = join(legacyRoot, "web");

if (!existsSync(join(sourceWeb, "index.html"))) {
  console.error("[legacy] no desktop/web/index.html; build and sync the static app first");
  process.exit(1);
}

for (const file of ["main.cjs", "preload.cjs", "static-server.cjs"]) {
  copyFileSync(join(desktopRoot, file), join(legacyRoot, file));
}

rmSync(targetWeb, { recursive: true, force: true });
cpSync(sourceWeb, targetWeb, { recursive: true });

const resources = join(legacyRoot, "buildResources");
mkdirSync(resources, { recursive: true });
copyFileSync(join(desktopRoot, "buildResources", "icon.ico"), join(resources, "icon.ico"));

console.log(`[legacy] staged Windows 7 bundle from ${join(root, "dist", "client")}`);
