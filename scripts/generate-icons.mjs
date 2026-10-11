#!/usr/bin/env node
/**
 * Rasterize the PWA icon set from `public/favicon.svg`.
 *
 * The manifest and `__root.tsx` reference `icon-192.png`, `icon-512.png` and
 * `apple-touch-icon.png`; without the files those are 404s and Android refuses
 * to install the app. Keeping one SVG as the source means the icons can never
 * drift from the favicon:
 *
 *   node scripts/generate-icons.mjs
 *
 * `sharp` renders the SVG at each size (no network, no font dependency — the
 * glyph is pure geometry). The apple-touch icon is flattened onto the brand
 * background because iOS composites home-screen icons over black and renders
 * alpha as opaque black.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "public/favicon.svg");
const BRAND_BACKGROUND = "#12082a";

const sizes = [192, 512];

async function main() {
  const svg = await readFile(SOURCE);
  const written = [];

  for (const size of sizes) {
    const target = join(ROOT, `public/icon-${size}.png`);
    await sharp(svg, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toFile(target);
    written.push([`public/icon-${size}.png`, size]);
  }

  const apple = join(ROOT, "public/apple-touch-icon.png");
  await sharp(svg, { density: 384 })
    .resize(180, 180)
    .flatten({ background: BRAND_BACKGROUND })
    .png({ compressionLevel: 9 })
    .toFile(apple);
  written.push(["public/apple-touch-icon.png", 180]);

  for (const [file, size] of written) console.log(`[icons] ${file} (${size}x${size})`);
}

await main();
