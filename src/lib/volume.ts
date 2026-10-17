/**
 * How loud the app plays — one number the reader owns, shared by everything that
 * makes a sound: the playlist, the generative ambience and the UI effects.
 *
 * The player used to be pinned at `audio.volume = 0.6`, which is quieter than
 * the file it plays and quieter than every other app in the phone's mixer. The
 * default is now **100%**: the media files are mastered for it, and anyone who
 * wants less has a slider in the playlist panel. The value lives in
 * `clock-time-volume` as `"0"`…`"100"` (percent, like the label a person sees),
 * so a hand-edited localStorage value still reads the way it looks.
 *
 * Muting stays a separate decision (`clock-time-music`): volume 0 is "silent but
 * still playing", the MUSIC chip is "stop". Keeping them apart is what lets the
 * reader duck the volume without losing their place in a track.
 */
import { readPref, writePref, type PrefStorage } from "./prefs.ts";

/** `clock-time-volume`, stored as whole percent. */
export const VOLUME_PREF = "volume";

/** Full volume — what the app ships with. */
export const DEFAULT_VOLUME = 1;

/** Smallest audible step; below this the slider reads as silent anyway. */
const MIN_VOLUME = 0;
const MAX_VOLUME = 1;

/** Clamp anything (a stored string, a slider tick, a NaN) to a usable volume. */
export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_VOLUME;
  return Math.min(MAX_VOLUME, Math.max(MIN_VOLUME, value));
}

/**
 * The stored volume as a 0–1 fraction. An absent or unreadable entry means full
 * volume, not silence: volume is something the reader turns *down*. `storage` is
 * only passed by tests and by callers that already hold one.
 */
export function readVolume(storage?: PrefStorage | null): number {
  const stored = readPref(VOLUME_PREF, storage);
  if (stored === null || stored.trim() === "") return DEFAULT_VOLUME;
  const percent = Number(stored);
  if (!Number.isFinite(percent)) return DEFAULT_VOLUME;
  return clampVolume(percent / 100);
}

/** Store a volume (0–1). Returns the clamped value that was written. */
export function writeVolume(volume: number, storage?: PrefStorage | null): number {
  const clamped = clampVolume(volume);
  writePref(VOLUME_PREF, String(Math.round(clamped * 100)), storage);
  return clamped;
}
