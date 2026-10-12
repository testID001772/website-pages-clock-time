import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AppChrome } from "@/components/chrome/app-chrome";
import { CountdownClock } from "@/components/space/countdown-clock";
import { EventCountdown } from "@/components/space/event-countdown";
import { Fireworks } from "@/components/space/fireworks";
import { SpaceStage } from "@/components/space/space-stage";
import {
  formatMetaParts,
  formatNow,
  formatTarget,
  nextNewYear,
  splitRange,
  yearProgress,
} from "@/lib/countdown";
import { useLocale } from "@/lib/i18n";
import { formatDecimal, formatInteger } from "@/lib/numbers";
import { playSfx } from "@/lib/sfx";
import { copyFor } from "@/lib/world-clock-copy";

export function HomeView() {
  const { t, locale } = useLocale();
  // Render-time snapshot: the server paints the REAL countdown on first paint
  // (never 00s), and the tick effect below takes over live updates on mount.
  const targetRef = useRef(nextNewYear(new Date()));
  const partyTimer = useRef<number | null>(null);
  const partyStarted = useRef(false);
  const lastSecond = useRef<number | null>(null);

  const [parts, setParts] = useState(() => splitRange(new Date(), targetRef.current));
  const [targetLabel, setTargetLabel] = useState(() => formatTarget(targetRef.current, locale));
  const [meta, setMeta] = useState(() => {
    const { when, timeZone } = formatMetaParts(targetRef.current, locale);
    return t.home.ringsIn(when, timeZone);
  });
  const [clockNow, setClockNow] = useState(() => formatNow(new Date(), locale));
  const [progress, setProgress] = useState(() => yearProgress(new Date()));
  const [progressLabel, setProgressLabel] = useState(() => {
    const now = new Date();
    return t.home.yearComplete(
      formatInteger(now.getFullYear(), locale),
      formatDecimal(yearProgress(now), locale, 2),
    );
  });
  const [party, setParty] = useState(false);
  const [partySub, setPartySub] = useState("");
  const [trueMidnight, setTrueMidnight] = useState(false);
  const [nextYearLabel, setNextYearLabel] = useState("");
  const [fx, setFx] = useState(false);
  const [sr, setSr] = useState("");
  const [readyMs, setReadyMs] = useState<number | null>(null);

  const describe = useCallback(() => {
    setTargetLabel(formatTarget(targetRef.current, locale));
    const { when, timeZone } = formatMetaParts(targetRef.current, locale);
    setMeta(t.home.ringsIn(when, timeZone));
  }, [locale, t]);

  const startParty = useCallback(
    (year: number) => {
      playSfx("chime");
      setParty(true);
      setFx(true);
      setTrueMidnight(true);
      setPartySub(t.home.partyGo);
      setNextYearLabel(formatInteger(year + 1, locale));
      const midnight = new Date(year, 0, 1);
      if (partyTimer.current) window.clearInterval(partyTimer.current);
      partyTimer.current = window.setInterval(() => {
        const s = splitRange(midnight, new Date());
        setPartySub(
          t.home.partyElapsed(
            formatInteger(s.hours, locale, 2),
            formatInteger(s.minutes, locale, 2),
            formatInteger(s.seconds, locale, 2),
            formatInteger(year, locale),
          ),
        );
      }, 1000);
    },
    [t, locale],
  );

  useEffect(() => {
    targetRef.current = nextNewYear(new Date());
    describe();

    const tick = () => {
      const now = new Date();
      const remaining = targetRef.current.getTime() - now.getTime();
      if (remaining <= 0) {
        if (!partyStarted.current) {
          partyStarted.current = true;
          startParty(targetRef.current.getFullYear());
        }
        return;
      }
      const p = splitRange(now, targetRef.current);
      const stamp = Math.ceil(remaining / 1000);
      // Clock + countdown run at 0.1s; labels, progress and title update each second.
      setClockNow(formatNow(now, locale));
      setParts(p);
      if (stamp !== lastSecond.current) {
        lastSecond.current = stamp;
        const pct = yearProgress(now);
        setProgress(pct);
        setProgressLabel(
          t.home.yearComplete(
            formatInteger(now.getFullYear(), locale),
            formatDecimal(pct, locale, 2),
          ),
        );
        if (p.seconds === 0) {
          setSr(
            t.home.srCountdown(
              formatInteger(p.days, locale),
              formatInteger(p.hours, locale, 2),
              formatInteger(p.minutes, locale, 2),
              formatInteger(targetRef.current.getFullYear(), locale),
            ),
          );
        }
        document.title = `${formatInteger(p.months, locale)}mo ${formatInteger(p.days, locale)}d ${formatInteger(p.hours, locale, 2)}:${formatInteger(p.minutes, locale, 2)}:${formatInteger(p.seconds, locale, 2)} · Clock Time`;
      }
    };

    tick();
    // Page-load timer: ms from navigation start to the first live tick.
    setReadyMs(Math.round(window.performance.now()));
    const interval = window.setInterval(tick, 100);
    return () => {
      window.clearInterval(interval);
      if (partyTimer.current) window.clearInterval(partyTimer.current);
    };
  }, [describe, startParty, locale, t]);

  const onPreview = () => {
    playSfx("chime");
    setParty(true);
    setFx(true);
    setTrueMidnight(false);
    setPartySub(t.home.partyPeek);
    window.setTimeout(() => {
      if (!partyStarted.current) {
        setParty(false);
        setFx(false);
      }
    }, 6500);
  };

  const onNext = () => {
    playSfx("click");
    if (partyTimer.current) window.clearInterval(partyTimer.current);
    partyStarted.current = false;
    targetRef.current = nextNewYear(new Date());
    lastSecond.current = null;
    describe();
    setParty(false);
    setFx(false);
    setTrueMidnight(false);
  };

  return (
    <SpaceStage>
      <AppChrome />
      {fx ? <Fireworks active={fx} /> : null}

      <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col items-center justify-center px-4 pb-16 pt-24 text-center">
        <p
          className={`num mt-2 text-4xl tabular-nums transition-opacity duration-300 sm:text-5xl ${party ? "opacity-0" : "opacity-100"}`}
          role="timer"
          aria-label={clockNow}
          suppressHydrationWarning
        >
          {clockNow}
        </p>

        <div
          className={`mt-6 w-full transition-opacity duration-300 ${party ? "pointer-events-none opacity-0" : "opacity-100"}`}
        >
          <CountdownClock parts={parts} />

          <p className="mt-8 text-sm text-muted">
            {t.home.target} <strong className="font-medium text-ink">{targetLabel}</strong>
          </p>

          <div className="mx-auto mt-6 w-full max-w-md">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progress.toFixed(3)}%`,
                  background: "linear-gradient(90deg, var(--color-ice), #e8e2ff, var(--color-sun))",
                }}
              />
            </div>
            <p className="mt-3 text-xs tracking-wide text-muted">{progressLabel}</p>
          </div>

          <div className="mt-6">
            <EventCountdown />
          </div>

          <div className="mt-6 space-y-2 text-xs tracking-wide text-muted">
            <p>{meta}</p>
            {readyMs !== null ? (
              <p>{t.home.loadedIn(formatDecimal(readyMs / 1000, locale, 1))}</p>
            ) : null}
          </div>

          {!partyStarted.current ? (
            <button type="button" className="btn btn-ghost mt-6" onClick={onPreview}>
              {t.home.previewFinale}
            </button>
          ) : null}

          <Link to="/world-clock" className="btn btn-ghost mt-3">
            {copyFor(locale).title}
          </Link>

        </div>
      </main>

      {party ? (
        <div className="celebrate">
          <h1>{t.home.partyTitle}</h1>
          <p>{t.home.partyWish}</p>
          <p className="text-sm text-muted">{partySub}</p>
          {trueMidnight ? (
            <button type="button" className="btn btn-ghost" onClick={onNext}>
              {t.home.startCountingTo(nextYearLabel)}
            </button>
          ) : null}
        </div>
      ) : null}

      <p className="sr-only" role="status" aria-live="polite">
        {sr}
      </p>
    </SpaceStage>
  );
}
