#!/usr/bin/env node
/**
 * One track per upcoming release, for the Coming up card. Each release plays its
 * own music when its row is opened, so each gets a seed of its own and a
 * three-minute track in the same synthesis as the playlist (`generate-music.mjs`).
 *
 *   node scripts/generate-event-music.mjs   # write public/event/<id>.mp3
 *
 * The ids must match the release ids in `src/lib/events.ts`
 * (`src/lib/event-media.ts` maps them to these files).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { assertDistinctScores, encodeMp3, renderTrack } from "./generate-music.mjs";
import { projectRoot } from "./with-app-env.mjs";

export const EVENT_TRACKS = [
  { id: "gta-vi", seed: 7101, style: "pulse", bassProfile: "medium" },
  { id: "cod-modern-warfare-4", seed: 7102, style: "arp", bassProfile: "medium" },
  { id: "wow-forever", seed: 7103, style: "pad", bassProfile: "medium" },
  { id: "zelda-ocarina-of-time", seed: 7104, style: "arp", bassProfile: "medium" },
  { id: "monster-hunter-wilds-switch-2", seed: 7105, style: "pad", bassProfile: "medium" },
  { id: "attack-on-titan-3", seed: 7106, style: "pulse", bassProfile: "medium" },
  { id: "poppy-playtime-chapter-6", seed: 7107, style: "pad", bassProfile: "medium" },
].map((track) => ({ ...track, seconds: 180 }));

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  assertDistinctScores(EVENT_TRACKS);
  const dir = join(projectRoot(), "public", "event");
  mkdirSync(dir, { recursive: true });
  for (const track of EVENT_TRACKS) {
    const mp3 = encodeMp3(renderTrack(track));
    writeFileSync(join(dir, `${track.id}.mp3`), mp3);
    console.log(`${track.id}.mp3 ${(mp3.length / 1024).toFixed(0)} KB`);
  }
}
