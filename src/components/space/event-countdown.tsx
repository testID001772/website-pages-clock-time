import { useEffect, useRef, useState } from "react";
import { eventArt, eventTrack } from "@/lib/event-media";
import { formatTarget, splitRange } from "@/lib/countdown";
import {
  currentEvent,
  eventMoment,
  liveGames,
  type ScheduledEvent,
} from "@/lib/events";
import { useLocale, type Dictionary } from "@/lib/i18n";
import { formatInteger } from "@/lib/numbers";
import { playSfx } from "@/lib/sfx";

type Snap = {
  parts: ReturnType<typeof splitRange>;
  /** Total days left — the display uses this, not calendar months. */
  totalDays: number;
  released: boolean;
};

type GameSnap = {
  event: ScheduledEvent;
  /** `null` when the release has a window but no date to count to. */
  snap: Snap | null;
};

type Snapshot = {
  /** All games worth counting to right now, soonest first. */
  games: GameSnap[];
  /** Default featured game (GTA VI, or the next release once it is out). */
  defaultEvent: ScheduledEvent;
};

/** Render-time snapshot so the server paints the real timer on first paint. */
function snapshot(now: Date): Snapshot | null {
  const defaultEvent = currentEvent(now);
  if (!defaultEvent) return null;
  const snapOf = (target: Date | null): Snap | null => {
    if (!target) return null;
    const ms = target.getTime() - now.getTime();
    return {
      parts: splitRange(now, target),
      totalDays: Math.max(0, Math.floor(ms / 86_400_000)),
      released: ms <= 0,
    };
  };
  return {
    games: liveGames(now).map((event) => ({
      event,
      snap: snapOf(eventMoment(event)),
    })),
    defaultEvent,
  };
}

/**
 * "2027 (expected)" — the label for a release that has a window but no date.
 * The year is a number like every other in the app, so it follows the visitor's
 * language: `٢٠٢٧ (متوقع)` in Arabic, `2027（预计）` in Chinese.
 */
function expectedLabel(
  event: ScheduledEvent,
  locale: string,
  t: Dictionary,
): string {
  return t.event.expected(formatInteger(event.expectedYear ?? 0, locale));
}

/** `62d` — total days left, no month/year units, in the visitor's digits. */
function daysLeft(totalDays: number, locale: string) {
  return `${formatInteger(totalDays, locale)}d`;
}

/**
 * Countdown card for upcoming game releases (see src/lib/events.ts): the big
 * timer tracks the selected game — GTA VI by default, or any game picked from
 * the expandable "More releases" list (click a row to switch, click GTA VI to
 * switch back). Self-ticking, so it drops into any page. Shows "Out now" once
 * a release passes and renders nothing once every event is long past.
 */
export function EventCountdown({
  variant = "card",
}: {
  variant?: "card" | "inline";
}) {
  const { t, locale } = useLocale();
  const [snap, setSnap] = useState<Snapshot | null>(() => snapshot(new Date()));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // One release track at a time; stop it when the card unmounts.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  function togglePlay(id: string) {
    const audio = audioRef.current;
    if (playingId === id && audio) {
      audio.pause();
      setPlayingId(null);
      return;
    }
    audio?.pause();
    const next = new Audio(eventTrack(id));
    next.loop = true;
    next.volume = 0.6;
    audioRef.current = next;
    setPlayingId(id);
    void next.play().catch(() => setPlayingId(null));
  }

  useEffect(() => {
    const tick = () => setSnap(snapshot(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!snap) return null;

  // Selected game — or the featured default when nothing (valid) is picked.
  const selected =
    snap.games.find((game) => game.event.id === selectedId) ??
    snap.games.find((game) => game.event.id === snap.defaultEvent.id) ??
    snap.games[0];
  const { snap: main } = selected;

  const allGames = snap.games;

  return (
    <div
      className={
        variant === "card"
          ? "glass relative mx-auto w-full max-w-md overflow-hidden rounded-[28px] px-5 py-4"
          : "relative mx-auto w-full max-w-md overflow-hidden"
      }
    >
      {/* The selected release's artwork, behind the card's content. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-cover bg-center brightness-150 opacity-90 transition-opacity duration-500"
        style={{ backgroundImage: eventArt(selected.event.id) }}
      />
      <div className="relative">
        <p className="text-[0.65rem] font-bold tracking-[0.28em] text-muted uppercase">
          {t.event.label}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">
              {selected.event.title}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {selected.event.target
                ? t.event.releases(formatTarget(selected.event.target, locale))
                : expectedLabel(selected.event, locale, t)}
            </p>
          </div>
          {!main ? null : main.released ? (
            <p className="rounded-full bg-sun/15 px-3 py-1 text-xs font-bold tracking-[0.12em] text-sun uppercase">
              {t.event.outNow}
            </p>
          ) : (
            <p
              className="num text-xl tabular-nums"
              role="timer"
              aria-label={t.event.timerAria(
                formatInteger(main.parts.months, locale),
                formatInteger(main.parts.days, locale),
                formatInteger(main.parts.hours, locale, 2),
                formatInteger(main.parts.minutes, locale, 2),
              )}
              suppressHydrationWarning
            >
              {daysLeft(main.totalDays, locale)}{" "}
              {formatInteger(main.parts.hours, locale, 2)}:
              {formatInteger(main.parts.minutes, locale, 2)}:
              {formatInteger(main.parts.seconds, locale, 2)}
            </p>
          )}
        </div>

        {allGames.length > 1 ? (
          <ul className="event-list mt-3 space-y-1 border-t border-white/10 pt-2 text-left">
            {allGames.map((game) => {
              const current = game.event.id === selected.event.id;
              const playing = playingId === game.event.id;
              return (
                <li
                  key={game.event.id}
                  className="relative overflow-hidden rounded-xl"
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-cover bg-center brightness-150 opacity-80"
                    style={{ backgroundImage: eventArt(game.event.id) }}
                  />
                  <div className="relative flex items-center gap-x-2">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-baseline justify-between gap-x-4 rounded-xl px-2.5 py-1.5 text-left transition-colors hover:bg-white/5"
                      aria-current={current ? "true" : undefined}
                      onClick={() => {
                        if (!current) playSfx("pop");
                        setSelectedId(game.event.id);
                        if (playingId !== game.event.id)
                          togglePlay(game.event.id);
                      }}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">
                          {game.event.title}
                        </span>
                        <span className="block text-xs text-muted">
                          {game.event.target
                            ? t.event.releases(
                                formatTarget(game.event.target, locale),
                              )
                            : expectedLabel(game.event, locale, t)}
                        </span>
                      </span>
                      {!game.snap ? (
                        <span className="flex-none text-xs text-muted">
                          {expectedLabel(game.event, locale, t)}
                        </span>
                      ) : game.snap.released ? (
                        <span className="flex-none text-[0.65rem] font-bold tracking-[0.12em] text-sun uppercase">
                          {t.event.outNow}
                        </span>
                      ) : (
                        <span className="flex-none text-xs tabular-nums text-muted">
                          {daysLeft(game.snap.totalDays, locale)}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      className="flex-none rounded-full border border-white/15 px-2.5 py-1 text-xs font-semibold text-ink transition-colors hover:bg-white/10"
                      aria-label={
                        playing
                          ? `Pause ${game.event.title}`
                          : `Play ${game.event.title}`
                      }
                      aria-pressed={playing}
                      onClick={() => togglePlay(game.event.id)}
                    >
                      {playing ? "Pause" : "Play"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
