/**
 * Browser preference storage under the app's current name.
 *
 * The app was renamed (System Space → Clock Time) and the keys followed it:
 * `clock-time-theme`, `clock-time-motion`, `clock-time-music`, … Anyone who
 * used the old build still has `system-space-*` entries in localStorage, so a
 * plain rename would silently drop their theme, motion, sound and language
 * choices. `readPref` adopts the old value on first read (writes it under the
 * new key, then clears the orphan) and every write goes to the new key only.
 *
 * The `theme-provider` migration below (`lights`/`layers`) predates both names
 * and is handled by its own comment — this module only covers the rename.
 */

/** Key prefix for everything this module stores. */
export const PREF_PREFIX = "clock-time-";

/** The prefix this app wrote before the rename. */
export const LEGACY_PREF_PREFIX = "system-space-";

/** `readPref("theme")` -> the `clock-time-theme` localStorage entry. */
export function prefKey(name: string): string {
  return `${PREF_PREFIX}${name}`;
}

/** The slice of the Storage interface this module uses (easy to fake in tests). */
export type PrefStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function defaultStorage(): PrefStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    // Safari in private mode (and some embedded webviews) throw on access.
    return null;
  }
}

/** Read a preference, adopting the pre-rename value the first time. */
export function readPref(name: string, storage: PrefStorage | null = defaultStorage()): string | null {
  if (!storage) return null;
  const key = prefKey(name);
  const current = storage.getItem(key);
  if (current !== null) return current;
  const legacyKey = `${LEGACY_PREF_PREFIX}${name}`;
  const legacy = storage.getItem(legacyKey);
  if (legacy === null) return null;
  storage.setItem(key, legacy);
  storage.removeItem(legacyKey);
  return legacy;
}

/** Write a preference under the current name. */
export function writePref(
  name: string,
  value: string,
  storage: PrefStorage | null = defaultStorage(),
): void {
  storage?.setItem(prefKey(name), value);
}
