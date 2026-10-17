#!/usr/bin/env node
/**
 * Writes the Clock Time icon set from one vector master:
 *   public/favicon.svg        64×64 rounded tab icon (transparent corners)
 *   public/icon-192.png       full-bleed square, clock inside the maskable safe zone
 *   public/icon-512.png       same artwork at 512 (valid as "any" and "maskable")
 *   public/apple-touch-icon.png 180×180 full-bleed (iOS applies its own mask)
 *
 * Proportions come from the AI-made master (design/favicon-master.png):
 * ring outer radius ≈ 41 % of the plate, minute hand ≈ 31 %, hour hand ≈ 25 %.
 *
 *   node scripts/generate-icons.mjs          write the files
 *   node scripts/generate-icons.mjs --check  verify they exist and have the right sizes
 */
import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");

const PLATE = "#050505";
const GOLD = "#ffd166";
const HUB = "#ef7d32";

/* Clock artwork in a 64-unit box centred on (32,32). `scale` shrinks it toward
 * the centre so maskable icons keep the artwork inside the 80 % safe circle. */
function clockGroup(scale) {
  return `<g transform="translate(32 32) scale(${scale}) translate(-32 -32)">
    <circle cx="32" cy="32" r="22.5" fill="none" stroke="${GOLD}" stroke-width="6"/>
    <line x1="32" y1="32" x2="32" y2="12.5" stroke="${GOLD}" stroke-width="6" stroke-linecap="round"/>
    <line x1="32" y1="32" x2="48" y2="32" stroke="${GOLD}" stroke-width="6" stroke-linecap="round"/>
    <circle cx="32" cy="32" r="4" fill="${HUB}"/>
  </g>`;
}

/** Tab icon: rounded plate, full-size clock. */
export function faviconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${PLATE}"/>
  ${clockGroup(1)}
</svg>
`;
}

/** Full-bleed square for installed icons; artwork at 70 % so it survives any mask. */
export function squareSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${PLATE}"/>
  ${clockGroup(0.7)}
</svg>
`;
}

const outputs = [
  { file: "favicon.svg", svg: faviconSvg(), size: null },
  { file: "icon-192.png", svg: squareSvg(), size: 192 },
  { file: "icon-512.png", svg: squareSvg(), size: 512 },
  { file: "apple-touch-icon.png", svg: squareSvg(), size: 180 },
];

async function write() {
  for (const out of outputs) {
    const target = join(publicDir, out.file);
    if (out.size === null) {
      await writeFile(target, out.svg);
    } else {
      const png = await sharp(Buffer.from(out.svg), { density: 1200 })
        .resize(out.size, out.size)
        .png({ compressionLevel: 9 })
        .toBuffer();
      await writeFile(target, png);
    }
    console.log(`wrote public/${out.file}`);
  }
}

async function check() {
  const problems = [];
  for (const out of outputs) {
    const target = join(publicDir, out.file);
    const bytes = await readFile(target);
    if (out.size === null) {
      if (!bytes.toString("utf8").includes("<svg")) problems.push(`${out.file}: not an SVG`);
      continue;
    }
    const meta = await sharp(bytes).metadata();
    if (meta.width !== out.size || meta.height !== out.size) {
      problems.push(`${out.file}: ${meta.width}×${meta.height}, want ${out.size}`);
    }
  }
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log("icons: every file present at the declared sizes");
}

if (process.argv.includes("--check")) {
  await check();
} else {
  await write();
}
