import { appUrl } from "@/lib/base-url";

/**
 * Per-release artwork and shared soundtrack for the Coming up card. Files live
 * in `public/event/`; artwork is keyed by the release ids in `events.ts`.
 */

/** The release's artwork as a small thumbnail at the chosen icon size. */
export function eventThumb(id: string): string {
  return appUrl(`/event/${id}.jpg`);
}

/** The one original medium-bass track shared by the Coming up card. */
export function eventTrack(): string {
  return appUrl("/event/coming-up.mp3?v=medium-bass-1");
}
