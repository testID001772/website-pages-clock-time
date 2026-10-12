import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FEATURED_EVENT,
  GTA_VI_RELEASE,
  MORE_GAMES,
  POPPY_PLAY_TIME_CHAPTER_6,
  currentEvent,
  eventMoment,
  expectedYearOf,
  liveGames,
} from "./events.ts";

/** A fixed "now" so the calendar is read the same way in every run. */
const NOW = new Date(2026, 9, 12, 12, 0, 0);

describe("release calendar", () => {
  it("counts to a dated release", () => {
    assert.ok(eventMoment(GTA_VI_RELEASE) instanceof Date);
    assert.equal(expectedYearOf(GTA_VI_RELEASE), null);
    assert.equal(GTA_VI_RELEASE.id, "gta-vi");
  });

  it("carries an undated release as a window, never a made-up day", () => {
    // Poppy Playtime: Chapter 6 has no announced date; the entry says so.
    assert.equal(POPPY_PLAY_TIME_CHAPTER_6.expectedYear, 2027);
    assert.equal(eventMoment(POPPY_PLAY_TIME_CHAPTER_6), null);
    assert.equal(expectedYearOf(POPPY_PLAY_TIME_CHAPTER_6), 2027);
    assert.ok(
      MORE_GAMES.some((event) => event.id === "poppy-playtime-chapter-6"),
      "the chapter is in the calendar",
    );
  });

  it("lists a window-only release after every dated one", () => {
    const games = liveGames(NOW);
    const last = games[games.length - 1];
    assert.equal(last.id, "poppy-playtime-chapter-6");
    const dated = games.filter((event) => eventMoment(event)).map((event) => eventMoment(event)!.getTime());
    assert.deepEqual(dated, [...dated].sort((a, b) => a - b), "dated releases stay soonest first");
  });

  it("never lets an undated release go stale", () => {
    // Years past every date on the calendar: the window is still coming.
    const later = new Date(2030, 0, 1);
    assert.deepEqual(
      liveGames(later).map((event) => event.id),
      ["poppy-playtime-chapter-6"],
    );
    // …but the big card counts to a moment, so it steps aside once nothing dated
    // is left rather than ticking towards an estimate.
    assert.equal(currentEvent(later), null);
  });

  it("steps the featured card on to the next dated release", () => {
    // GTA VI's card week ends 26 November 2026; after that the next dated
    // release takes the big slot, and never a window-only entry.
    const afterGta = currentEvent(new Date(2026, 11, 1));
    assert.equal(afterGta?.id, "monster-hunter-wilds-switch-2");
    assert.ok(eventMoment(afterGta!) instanceof Date);
    // Past the last dated release (10 December 2026 + its week), only the
    // window is left — and the card steps aside rather than counting to 2027.
    const newYear = new Date(2027, 0, 1);
    assert.deepEqual(
      liveGames(newYear).map((event) => event.id),
      ["poppy-playtime-chapter-6"],
    );
    assert.equal(currentEvent(newYear), null);
  });

  it("every entry is either dated or windowed, never both or neither", () => {
    for (const event of [FEATURED_EVENT, ...MORE_GAMES]) {
      const moment = eventMoment(event);
      const year = expectedYearOf(event);
      assert.notEqual(moment === null, year === null, `${event.id} must have exactly one of the two`);
      if (year !== null) assert.ok(year >= 2026 && year <= 2100, `${event.id} window ${year}`);
      if (moment) assert.ok(Number.isFinite(moment.getTime()), `${event.id} date`);
      assert.ok(event.title.length > 0, `${event.id} title`);
    }
  });
});
