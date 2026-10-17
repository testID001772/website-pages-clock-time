#!/usr/bin/env node
/**
 * Create the single original, medium-bass instrumental used by Coming Up.
 *
 *   node scripts/generate-coming-up-music.mjs   # write public/event/coming-up.mp3
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { encodeMp3, renderTrack } from "./generate-music.mjs";
import { projectRoot } from "./with-app-env.mjs";

export const COMING_UP_TRACK = {
  seed: 80217,
  style: "arp",
  seconds: 120,
  bassProfile: "medium",
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const dir = join(projectRoot(), "public", "event");
  mkdirSync(dir, { recursive: true });
  const mp3 = encodeMp3(renderTrack(COMING_UP_TRACK));
  writeFileSync(join(dir, "coming-up.mp3"), mp3);
  console.log(`coming-up.mp3 ${(mp3.length / 1024).toFixed(0)} KB`);
}
