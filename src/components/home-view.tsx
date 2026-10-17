import { useCallback, useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { AppChrome } from "@/components/chrome/app-chrome";
import { SiteFooter } from "@/components/chrome/site-footer";
import { CountdownClock } from "@/components/space/countdown-clock";
import { EventCountdown } from "@/components/space/event-countdown";
import { Fireworks } from "@/components/space/fireworks";
import { SpaceStage } from "@/components/space/space-stage";
import { YearRing } from "@/components/space/year-ring";
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
  const [yearLabel, setYearLabel] = useState(() => formatInteger(new Date().getFullYear(), locale));
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
        setYearLabel(formatInteger(now.getFullYear(), locale));
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

      <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col items-center justify-center px-5 pb-8 pt-28 text-center sm:pt-32">
        <p
          className={`transition-opacity duration-300 ${party ? "opacity-0" : "opacity-100"}`}
          aria-hidden={party}
        >
          <span className="eyebrow">{t.home.eyebrow}</span>
        </p>

        <p
          className={`tnum mt-7 text-2xl font-medium tabular-nums text-muted transition-opacity duration-300 sm:text-3xl ${party ? "opacity-0" : "opacity-100"}`}
          role="timer"
          aria-label={clockNow}
          suppressHydrationWarning
        >
          {clockNow}
        </p>

        <div
          className={`mt-7 w-full transition-opacity duration-300 ${party ? "pointer-events-none opacity-0" : "opacity-100"}`}
        >
          <CountdownClock parts={parts} />

          <p className="mt-8 text-sm text-muted">
            {t.home.target} <strong className="font-semibold text-ink">{targetLabel}</strong>
          </p>

          {/* v2: the year's progress is a ring, and the reading of it sits
              beside it — the sentence the ring's accessible name carries. */}
          <div className="mx-auto mt-10 flex w-full max-w-2xl flex-col items-center gap-7 sm:flex-row sm:justify-center sm:gap-10">
            <YearRing
              percent={progress}
              value={`${formatDecimal(progress, locale, 2)}%`}
              caption={yearLabel}
              label={progressLabel}
            />
            <div className="space-y-2 text-xs tracking-wide text-muted sm:text-start">
              <p className="tnum text-base text-ink">{progressLabel}</p>
              <p>{meta}</p>
              {readyMs !== null ? (
                <p className="tnum">{t.home.loadedIn(formatDecimal(readyMs / 1000, locale, 1))}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-9">
            <EventCountdown />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {!partyStarted.current ? (
              <button type="button" className="btn btn-primary" onClick={onPreview}>
                {t.home.previewFinale}
              </button>
            ) : null}

            <Link to="/world-clock" className="btn btn-ghost">
              {copyFor(locale).title}
            </Link>

            <Link to="/download" className="btn btn-ghost">
              <Download className="size-4" aria-hidden="true" />
              {t.download.footer}
            </Link>
          </div>
        </div>

        <SiteFooter />
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
