#!/usr/bin/env node
/**
 * Writes the *native* launcher icons from the same vector master the web icons
 * come from (`scripts/generate-icons.mjs`):
 *
 *   android/app/src/main/res/mipmap-{density}/ic_launcher.png        48…192 px
 *   android/app/src/main/res/mipmap-{density}/ic_launcher_round.png  same, round mask
 *   android/app/src/main/res/mipmap-{density}/ic_launcher_foreground.png  108…432 px
 *   desktop/buildResources/icon.png                          512 px (Linux)
 *   desktop/buildResources/icon.ico                          16…256 px (Windows)
 *
 * Run it after `npx cap add android` (which ships Capacitor's placeholder
 * artwork) and whenever the master changes:
 *
 *   node scripts/generate-app-icons.mjs          write the files
 *   node scripts/generate-app-icons.mjs --check  verify sizes, no writes
 *
 * The `.ico` is written by hand: a PNG-compressed ICO container, which Windows
 * Vista and later read natively. That avoids needing ImageMagick or a Windows
 * box just to repackage pixels sharp already produced.
 */
import { mkdirSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { squareSvg } from "./generate-icons.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const androidRes = join(root, "android", "app", "src", "main", "res");
const desktopResources = join(root, "desktop", "buildResources");

/** Launcher icon size per Android density bucket. */
const DENSITIES = [
  { bucket: "mdpi", icon: 48, foreground: 108 },
  { bucket: "hdpi", icon: 72, foreground: 162 },
  { bucket: "xhdpi", icon: 96, foreground: 216 },
  { bucket: "xxhdpi", icon: 144, foreground: 324 },
  { bucket: "xxxhdpi", icon: 192, foreground: 432 },
];

/** Sizes packed into the Windows icon; 256 is stored as PNG per the format. */
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

const SVG = squareSvg();

async function png(size) {
  return sharp(Buffer.from(SVG), { density: 1200 }).resize(size, size).png().toBuffer();
}

/**
 * The adaptive-icon foreground: the artwork shrunk into the middle of the
 * 108dp canvas, because Android masks and zooms adaptive icons and anything
 * near the edge is cropped away.
 */
async function foregroundPng(size) {
  const art = await sharp(Buffer.from(SVG), { density: 1200 })
    .resize(Math.round(size * 0.62), Math.round(size * 0.62))
    .png()
    .toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 5, g: 5, b: 12, alpha: 1 } },
  })
    .composite([{ input: art, gravity: "center" }])
    .png()
    .toBuffer();
}

/** ICO header + directory + PNG payloads. */
function icoContainer(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // 0 means 256
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // palette colours
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt8(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map((image) => image.data)]);
}

async function write() {
  for (const { bucket, icon, foreground } of DENSITIES) {
    const dir = join(androidRes, `mipmap-${bucket}`);
    mkdirSync(dir, { recursive: true });
    const art = await png(icon);
    for (const name of ["ic_launcher.png", "ic_launcher_round.png"]) {
      await writeFile(join(dir, name), art);
      console.log(`wrote mipmap-${bucket}/${name} (${icon}×${icon})`);
    }
    await writeFile(join(dir, "ic_launcher_foreground.png"), await foregroundPng(foreground));
    console.log(`wrote mipmap-${bucket}/ic_launcher_foreground.png (${foreground}×${foreground})`);
  }

  mkdirSync(desktopResources, { recursive: true });
  await writeFile(join(desktopResources, "icon.png"), await png(512));
  console.log("wrote desktop/buildResources/icon.png (512×512)");

  const ico = icoContainer(
    await Promise.all(ICO_SIZES.map(async (size) => ({ size, data: await png(size) }))),
  );
  await writeFile(join(desktopResources, "icon.ico"), ico);
  console.log(`wrote desktop/buildResources/icon.ico (${ICO_SIZES.join(", ")} px, ${ico.length} bytes)`);
}

async function check() {
  const problems = [];
  for (const { bucket, icon, foreground } of DENSITIES) {
    const targets = [
      [`mipmap-${bucket}/ic_launcher.png`, icon],
      [`mipmap-${bucket}/ic_launcher_round.png`, icon],
      [`mipmap-${bucket}/ic_launcher_foreground.png`, foreground],
    ];
    for (const [rel, size] of targets) {
      try {
        const meta = await sharp(readFileSync(join(androidRes, rel))).metadata();
        if (meta.width !== size || meta.height !== size) {
          problems.push(`${rel}: ${meta.width}×${meta.height}, want ${size}`);
        }
      } catch {
        problems.push(`${rel}: missing`);
      }
    }
  }
  for (const [rel, size] of [
    ["icon.png", 512],
  ]) {
    try {
      const meta = await sharp(readFileSync(join(desktopResources, rel))).metadata();
      if (meta.width !== size) problems.push(`${rel}: ${meta.width}px wide, want ${size}`);
    } catch {
      problems.push(`${rel}: missing`);
    }
  }
  try {
    const ico = readFileSync(join(desktopResources, "icon.ico"));
    if (ico.readUInt16LE(2) !== 1) problems.push("icon.ico: not an icon container");
    if (ico.readUInt16LE(4) !== ICO_SIZES.length) {
      problems.push(`icon.ico: ${ico.readUInt16LE(4)} entries, want ${ICO_SIZES.length}`);
    }
  } catch {
    problems.push("icon.ico: missing");
  }

  if (problems.length > 0) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log("app icons: android launcher set and desktop icons present at the declared sizes");
}

if (process.argv.includes("--check")) {
  await check();
} else {
  await write();
}
