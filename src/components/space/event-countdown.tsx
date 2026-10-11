import { Fragment, useEffect, useState } from "react";
import { formatTarget, pad2, splitRange } from "@/lib/countdown";
import { currentEvent, liveGames, type ScheduledEvent } from "@/lib/events";
import { useLocale } from "@/lib/i18n";
import { playSfx } from "@/lib/sfx";

type Snap = {
  parts: ReturnType<typeof splitRange>;
  /** Total days left — the display uses this, not calendar months. */
  totalDays: number;
  released: boolean;
};

type GameSnap = { event: ScheduledEvent; snap: Snap };

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
  const snapOf = (target: Date): Snap => {
    const ms = target.getTime() - now.getTime();
    return {
      parts: splitRange(now, target),
      totalDays: Math.max(0, Math.floor(ms / 86_400_000)),
      released: ms <= 0,
    };
  };
  return {
    games: liveGames(now).map((event) => ({ event, snap: snapOf(event.target) })),
    defaultEvent,
  };
}

/** `62d` — total days left, no month/year units. */
function daysLeft(totalDays: number) {
  return `${totalDays}d`;
}

/**
 * Countdown card for upcoming game releases (see src/lib/events.ts): the big
 * timer tracks the selected game — GTA VI by default, or any game picked from
 * the expandable "More releases" list (click a row to switch, click GTA VI to
 * switch back). Self-ticking, so it drops into any page. Shows "Out now" once
 * a release passes and renders nothing once every event is long past.
 */
export function EventCountdown({ variant = "card" }: { variant?: "card" | "inline" }) {
  const { t, locale } = useLocale();
  const [snap, setSnap] = useState<Snapshot | null>(() => snapshot(new Date()));
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
          ? "glass mx-auto w-full max-w-md rounded-[28px] px-5 py-4"
          : "mx-auto w-full max-w-md"
      }
    >
      <p className="text-[0.65rem] font-bold tracking-[0.28em] text-muted uppercase">
        {t.event.label}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{selected.event.title}</p>
          <p className="mt-0.5 text-xs text-muted">
            {t.event.releases(formatTarget(selected.event.target, locale))}
          </p>
        </div>
        {main.released ? (
          <p className="rounded-full bg-sun/15 px-3 py-1 text-xs font-bold tracking-[0.12em] text-sun uppercase">
            {t.event.outNow}
          </p>
        ) : (
          <p
            className="num text-xl tabular-nums"
            role="timer"
            aria-label={t.event.timerAria(
              main.parts.years,
              main.parts.months,
              main.parts.days,
              main.parts.hours,
              main.parts.minutes,
            )}
            suppressHydrationWarning
          >
            {daysLeft(main.totalDays)} {pad2(main.parts.hours)}:{pad2(main.parts.minutes)}:
            {pad2(main.parts.seconds)}
          </p>
        )}
      </div>

      {allGames.length > 1 ? (
        <Fragment>
          <button
            type="button"
            className="mt-3 text-xs font-semibold tracking-wide text-muted underline-offset-4 hover:text-ink hover:underline"
            aria-expanded={open}
            onClick={() => {
              playSfx(open ? "close" : "open");
              setOpen((next) => !next);
            }}
          >
            {open ? t.event.less : t.event.more(allGames.length)}
          </button>
          {open ? (
            <ul className="event-list mt-3 space-y-1 border-t border-white/10 pt-2 text-left">
              {allGames.map((game) => {
                const current = game.event.id === selected.event.id;
                return (
                  <li key={game.event.id}>
                    <button
                      type="button"
                      className="flex w-full items-baseline justify-between gap-x-4 rounded-xl px-2.5 py-1.5 text-left transition-colors hover:bg-white/5"
                      aria-current={current ? "true" : undefined}
                      onClick={() => {
                        if (!current) playSfx("pop");
                        setSelectedId(game.event.id);
                      }}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">
                          {game.event.title}
                        </span>
                        <span className="block text-xs text-muted">
                          {t.event.releases(formatTarget(game.event.target, locale))}
                        </span>
                      </span>
                      {game.snap.released ? (
                        <span className="flex-none text-[0.65rem] font-bold tracking-[0.12em] text-sun uppercase">
                          {t.event.outNow}
                        </span>
                      ) : (
                        <span className="flex-none text-xs tabular-nums text-muted">
                          {daysLeft(game.snap.totalDays)}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </Fragment>
      ) : null}
    </div>
  );
}
