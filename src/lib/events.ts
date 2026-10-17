/**
 * Countdown targets — the featured game plus the wider release calendar.
 * Add an entry here and the home page picks it up automatically.
 *
 * A release either has a moment (`target`, so the app can count to it) or only a
 * window the studio has pointed at (`expectedYear`). The second kind is a real
 * state — a chapter confirmed to be coming but not yet dated — and pretending it
 * has a day would put a made-up countdown in front of visitors. Those rows show
 * "2027 (expected)" instead and never expire.
 */
type EventIdentity = {
  id: string;
  /** Game name, kept verbatim in every locale. */
  title: string;
};

export type DatedEvent = EventIdentity & {
  /** The release moment, in the visitor's local time. */
  target: Date;
  expectedYear?: never;
};

export type ExpectedEvent = EventIdentity & {
  target?: never;
  /** Year the studio has named or pointed at. */
  expectedYear: number;
};

export type ScheduledEvent = DatedEvent | ExpectedEvent;

/** The moment to count to, or `null` for an event with only a window. */
export function eventMoment(event: ScheduledEvent): Date | null {
  return event.target instanceof Date ? event.target : null;
}

/** The year an undated event points at, or `null` when it has a real date. */
export function expectedYearOf(event: ScheduledEvent): number | null {
  return event.target instanceof Date ? null : (event.expectedYear ?? null);
}

/** Grand Theft Auto VI is officially set to release on November 19, 2026. */
export const GTA_VI_RELEASE: ScheduledEvent = {
  id: "gta-vi",
  title: "Grand Theft Auto VI",
  target: new Date(2026, 10, 19),
};

/** The event featured in the big card on the home page. */
export const FEATURED_EVENT = GTA_VI_RELEASE;

/**
 * Poppy Playtime: Chapter 6 — no date yet, and no way to invent one.
 *
 * Chapter 5 ("Broken Things") shipped 18 February 2026, and chapters 3 and 4
 * both opened their years (30 January 2024 and 2025), so the studio's cadence
 * points at early 2027. Mob Entertainment has not announced the chapter, a title
 * or a trailer, so this entry carries the year alone: the card reads
 * "2027 (expected)" rather than counting down to a day nobody has named. Give it
 * a `target` the moment the date is official.
 */
export const POPPY_PLAY_TIME_CHAPTER_6: ExpectedEvent = {
  id: "poppy-playtime-chapter-6",
  title: "Poppy Playtime: Chapter 6",
  expectedYear: 2027,
};

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
  // Undated: shows its window, keeps its place at the end of the list.
  POPPY_PLAY_TIME_CHAPTER_6,
];

/** How long a released event keeps its card ("Out now") before dropping off. */
const OUT_NOW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function stillCurrent(event: ScheduledEvent, now: number) {
  const moment = eventMoment(event);
  // An undated release does not go stale: it is still coming.
  if (!moment) return true;
  return moment.getTime() + OUT_NOW_WINDOW_MS > now;
}

/**
 * The event in the big countdown card: the featured release, or — once it is
 * long past — the next dated one.
 *
 * Window-only releases are deliberately not eligible: the card's job is to count
 * down to a moment, and "2027 (expected)" has none. They still appear in the
 * "More releases" list, and if nothing dated is left the card renders nothing.
 */
export function currentEvent(from: Date): ScheduledEvent | null {
  const now = from.getTime();
  if (stillCurrent(FEATURED_EVENT, now)) return FEATURED_EVENT;
  const next = liveGames(from).find((event) => eventMoment(event) !== null);
  return next ?? null;
}

/**
 * Every game worth counting to right now — featured + calendar.
 *
 * Dated releases come first, soonest first; a release with only a window follows
 * them (it has no "soonest"), ordered by the year it points at. That is what puts
 * "Poppy Playtime: Chapter 6 — 2027 (expected)" at the end of the list rather
 * than somewhere in the middle of the dates.
 */
export function liveGames(from: Date): ScheduledEvent[] {
  const now = from.getTime();
  return [FEATURED_EVENT, ...MORE_GAMES]
    .filter((event) => stillCurrent(event, now))
    .sort((a, b) => {
      const one = eventMoment(a);
      const two = eventMoment(b);
      if (one && two) return one.getTime() - two.getTime();
      if (one) return -1;
      if (two) return 1;
      const yearA = expectedYearOf(a) ?? Number.POSITIVE_INFINITY;
      const yearB = expectedYearOf(b) ?? Number.POSITIVE_INFINITY;
      return yearA - yearB || a.title.localeCompare(b.title);
    });
}
