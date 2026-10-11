/**
 * Countdown targets — the featured game plus the wider release calendar.
 * Add an entry here and the home page picks it up automatically.
 */
export type ScheduledEvent = {
  id: string;
  /** Game name, kept verbatim in every locale. */
  title: string;
  /** The release moment, in the visitor's local time. */
  target: Date;
};

/** Grand Theft Auto VI is officially set to release on November 19, 2026. */
export const GTA_VI_RELEASE: ScheduledEvent = {
  id: "gta-vi",
  title: "Grand Theft Auto VI",
  target: new Date(2026, 10, 19),
};

/** The event featured in the big card on the home page. */
export const FEATURED_EVENT = GTA_VI_RELEASE;

/**
 * More upcoming releases for the expandable "More releases" list —
 * soonest first at render time. Dates as officially announced.
 */
export const MORE_GAMES: readonly ScheduledEvent[] = [
  { id: "silent-hill-townfall", title: "Silent Hill: Townfall", target: new Date(2026, 8, 24) },
  {
    id: "minecraft-dungeons-2",
    title: "Minecraft Dungeons 2",
    target: new Date(2026, 8, 29),
  },
  {
    id: "cod-modern-warfare-4",
    title: "Call of Duty: Modern Warfare 4",
    target: new Date(2026, 9, 23),
  },
  {
    id: "wow-forever",
    title: "World of Warcraft: Forever",
    target: new Date(2026, 10, 4),
  },
  {
    id: "zelda-ocarina-of-time",
    title: "The Legend of Zelda: Ocarina of Time",
    target: new Date(2026, 10, 5),
  },
  {
    id: "monster-hunter-wilds-switch-2",
    title: "Monster Hunter Wilds (Switch 2)",
    target: new Date(2026, 11, 4),
  },
  { id: "attack-on-titan-3", title: "Attack on Titan 3", target: new Date(2026, 11, 10) },
];

/** How long a released event keeps its card ("Out now") before dropping off. */
const OUT_NOW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function stillCurrent(event: ScheduledEvent, now: number) {
  return event.target.getTime() + OUT_NOW_WINDOW_MS > now;
}

/** The featured event, or — once it is long past — the next big release. */
export function currentEvent(from: Date): ScheduledEvent | null {
  const now = from.getTime();
  if (stillCurrent(FEATURED_EVENT, now)) return FEATURED_EVENT;
  const next = liveGames(from);
  return next[0] ?? null;
}

/** Every game worth counting to right now — featured + calendar, soonest first. */
export function liveGames(from: Date): ScheduledEvent[] {
  const now = from.getTime();
  return [FEATURED_EVENT, ...MORE_GAMES]
    .filter((event) => stillCurrent(event, now))
    .sort((a, b) => a.target.getTime() - b.target.getTime());
}
