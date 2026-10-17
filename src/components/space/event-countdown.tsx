import { useEffect, useState } from "react";
import { eventThumb } from "@/lib/event-media";
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

type IconSize = "xl";

/** Explorer-style icon sizes for the release thumbnails on the full page. */
const ICON_SIZES: { id: IconSize; label: string }[] = [
  { id: "xl", label: "Extra large" },
];

const ICON_CLASS: Record<IconSize, string> = {
  xl: "h-20 w-36",
};

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
  variant?: "card" | "inline" | "page";
}) {
  const { t, locale } = useLocale();
  const [snap, setSnap] = useState<Snapshot | null>(() => snapshot(new Date()));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [iconSize, setIconSize] = useState<IconSize>("xl");

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
        variant === "page"
          ? "glass relative mx-auto w-full max-w-4xl overflow-hidden rounded-[26px] p-6 sm:p-8"
          : variant === "card"
            ? "glass relative mx-auto w-full max-w-md overflow-hidden rounded-[22px] px-5 py-4"
            : "relative mx-auto w-full max-w-md overflow-hidden"
      }
    >
      <div className="relative">
        <p className="eyebrow">{t.event.label}</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="min-w-0">
            <p className="text-base font-semibold text-ink">
              {selected.event.title}
            </p>
            <p className="mt-1 text-xs text-muted">
              {selected.event.target
                ? t.event.releases(formatTarget(selected.event.target, locale))
                : expectedLabel(selected.event, locale, t)}
            </p>
          </div>
          {!main ? null : main.released ? (
            <p className="badge badge-sun">{t.event.outNow}</p>
          ) : (
            <p
              className={`tnum ${variant === "page" ? "text-4xl font-semibold sm:text-5xl" : "text-xl font-medium"}`}
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
          <>
            {variant === "page" ? (
              <div
                role="radiogroup"
                aria-label="Icon size"
                className="mt-5 flex flex-wrap gap-2"
              >
                {ICON_SIZES.map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    role="radio"
                    aria-checked={iconSize === size.id}
                    className={`badge transition-colors ${
                      iconSize === size.id
                        ? "badge-accent"
                        : "text-muted hover:text-ink"
                    }`}
                    onClick={() => setIconSize(size.id)}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            ) : null}
            <ul className="event-list mt-4 space-y-1.5 border-t border-white/10 pt-3 text-left">
              {allGames.map((game) => {
                const current = game.event.id === selected.event.id;
                return (
                  <li
                    key={game.event.id}
                    className="relative overflow-hidden rounded-[16px]"
                  >
                    <div className="relative flex items-center gap-x-2">
                      {variant === "page" ? (
                        <img
                          src={eventThumb(game.event.id)}
                          alt=""
                          loading="lazy"
                          className={`flex-none rounded-[12px] object-cover ${ICON_CLASS[iconSize]}`}
                        />
                      ) : null}
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-baseline justify-between gap-x-4 rounded-[14px] px-3 py-2 text-left transition-colors hover:bg-white/5"
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
                          <span className="badge badge-sun flex-none">
                            {t.event.outNow}
                          </span>
                        ) : (
                          <span className="tnum flex-none text-xs text-muted">
                            {daysLeft(game.snap.totalDays, locale)}
                          </span>
                        )}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}
      </div>
    </div>
  );
}
