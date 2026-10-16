import { appUrl } from "@/lib/base-url";

/**
 * Per-release artwork and music for the Coming up card. Files live in
 * `public/event/` and are written by `scripts/generate-event-music.mjs` (music)
 * and the image generator (`<id>.jpg`). Keyed by the release ids in `events.ts`;
 * a release with no entry just shows the card's plain glass background.
 */
export function eventBackground(id: string): string {
  return `url("${appUrl(`/event/${id}.jpg`)}")`;
}

export function eventTrack(id: string): string {
  return appUrl(`/event/${id}.mp3`);
}
