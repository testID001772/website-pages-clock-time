#!/usr/bin/env node
/**
 * Phone-sized copies of the shipped backdrops.
 *
 *   node scripts/generate-backgrounds.mjs           # write them
 *   node scripts/generate-backgrounds.mjs --check   # verify what is on disk
 *
 * The artwork is 7680×4320 (33 megapixels). Decoding that on a phone is a real
 * cost — tens of megabytes of bitmap plus a GPU layer the size of the viewport —
 * and on a cheap Android it is enough for the browser to kill the tab while the
 * home-screen app is starting, which reads as "the app keeps stopping". A
 * 1920×1080 copy is 1/9th of the pixels and a fraction of the bytes, and it is
 * indistinguishable behind the app's blur and dark wash.
 *
 * The stage picks the copy with a media query (`.space-bg-custom` in
 * `styles.css`), so the full-size image still reaches desktops and tablets.
 */
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { projectRoot } from "./with-app-env.mjs";

/** The shipped backdrops and the phone copy each one gets. */
export const PHONE_BACKGROUNDS = [
  { source: "ferric-wash.jpg", phone: "ferric-wash-phone.jpg" },
  { source: "space-nebula.jpg", phone: "space-nebula-phone.jpg" },
];

const PHONE_WIDTH = 1920;
const PHONE_HEIGHT = 1080;
/** Keep in step with the shipped 8K files: 4:4:4, mozjpeg, quality 86 @ 8K. */
const QUALITY = 80;
/** A phone copy that grew past this is not doing its job any more. */
const MAX_BYTES = 400_000;

const OUT_DIR = "public";

/** One phone copy: 1920×1080, mozjpeg. Exported so the test can rebuild it. */
export async function renderPhoneBackground(sourcePath) {
  return sharp(sourcePath)
    .resize(PHONE_WIDTH, PHONE_HEIGHT, { fit: "cover", position: "centre" })
    .jpeg({ quality: QUALITY, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toBuffer();
}

async function writeAll() {
  for (const { source, phone } of PHONE_BACKGROUNDS) {
    const from = join(projectRoot(), OUT_DIR, source);
    const to = join(projectRoot(), OUT_DIR, phone);
    const bytes = await renderPhoneBackground(from);
    writeFileSync(to, bytes);
    console.log(`${phone}  ${(bytes.length / 1024).toFixed(0)} KB  ${PHONE_WIDTH}×${PHONE_HEIGHT}`);
  }
}

function check() {
  let bad = 0;
  for (const { source, phone } of PHONE_BACKGROUNDS) {
    const to = join(projectRoot(), OUT_DIR, phone);
    if (!existsSync(to)) {
      console.error(`MISSING ${OUT_DIR}/${phone} (run: node scripts/generate-backgrounds.mjs)`);
      bad++;
      continue;
    }
    const size = statSync(to).size;
    if (size > MAX_BYTES) {
      console.error(`TOO BIG ${OUT_DIR}/${phone}: ${(size / 1024).toFixed(0)} KB > ${MAX_BYTES / 1024} KB`);
      bad++;
      continue;
    }
    // An empty or truncated JPEG would decode to nothing on a phone.
    const head = readFileSync(to).subarray(0, 2);
    if (head[0] !== 0xff || head[1] !== 0xd8) {
      console.error(`NOT JPEG ${OUT_DIR}/${phone}`);
      bad++;
    }
  }
  if (bad) {
    console.error(`\n${bad} problem(s) found`);
    process.exitCode = 1;
    return;
  }
  console.log(`${PHONE_BACKGROUNDS.length} phone backdrops present and small enough`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  if (process.argv.slice(2).includes("--check")) check();
  else await writeAll();
}
