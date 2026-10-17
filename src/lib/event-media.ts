import { appUrl } from "@/lib/base-url";

/**
 * Per-release artwork for the Coming up card. Files live in `public/event/`
 * and are keyed by the release ids in `events.ts`.
 */

/** The release's artwork as a small thumbnail at the chosen icon size. */
export function eventThumb(id: string): string {
  return appUrl(`/event/${id}.jpg`);
}
