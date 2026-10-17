import { appUrl } from "@/lib/base-url";

/**
 * Per-release media for the Coming up card. Files live in `public/event/` and
 * are written by `scripts/generate-event-music.mjs` (music) and the image
 * generator (`<id>.jpg`). Keyed by the release ids in `events.ts`.
 */

/** The release's artwork as a small thumbnail at the chosen icon size. */
export function eventThumb(id: string): string {
  return appUrl(`/event/${id}.jpg`);
}

export function eventTrack(id: string): string {
  return appUrl(`/event/${id}.mp3`);
}
