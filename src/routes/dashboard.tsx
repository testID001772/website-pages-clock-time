import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardMark } from "@/components/auth/auth-art";
import { GatePage } from "@/components/chrome/gate-page";
import { CountdownClock } from "@/components/space/countdown-clock";
import { EventCountdown } from "@/components/space/event-countdown";
import { nextNewYear, splitRange, yearProgress } from "@/lib/countdown";
import { useLocale } from "@/lib/i18n";
import { formatDecimal } from "@/lib/numbers";
import { getMyProfile } from "@/lib/server/profiles";
import type { Profile } from "@/lib/types";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function Dashboard() {
  const { t, locale } = useLocale();
  const [profile, setProfile] = useState<Profile | null>(null);
  // Render-time snapshot so the server paints the real countdown on first
  // paint (never 00s); the tick effect below takes over live updates on mount.
  const [parts, setParts] = useState(() => {
    const now = new Date();
    return splitRange(now, nextNewYear(now));
  });
  const [pct, setPct] = useState(() => yearProgress(new Date()));

  useEffect(() => {
    void getMyProfile()
      .then(setProfile)
      .catch(() => setProfile(null));
    const tick = () => {
      const now = new Date();
      setParts(splitRange(now, nextNewYear(now)));
      setPct(yearProgress(now));
    };
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, []);

  const role = profile?.role ?? null;

  return (
    <GatePage current="/dashboard" role={role}>
      <section className="glass panel">
        <div className="flex items-start gap-4">
          <DashboardMark />
          <div className="min-w-0">
            <p className="eyebrow">{t.dashboard.memberOrbit}</p>
            <h1 className="h1 mt-2">
              {profile ? t.dashboard.welcome(profile.displayName) : t.dashboard.title}
            </h1>
            <p className="lede mt-2">{profile?.bio || t.dashboard.bioFallback}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <span className="badge badge-accent">{role ?? t.dashboard.roleFallback}</span>
          {profile?.email ? <span className="badge">{profile.email}</span> : null}
        </div>
      </section>

      <section className="glass panel mt-5">
        <h2 className="eyebrow">{t.dashboard.countdownTitle}</h2>
        <div className="mt-5">
          <CountdownClock parts={parts} compact />
        </div>
        <div className="mt-7 h-1.5 max-w-md overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct.toFixed(2)}%`,
              background:
                "linear-gradient(90deg, var(--color-ice), var(--color-aurora), var(--color-sun))",
            }}
          />
        </div>
        <p className="tnum mt-3 text-xs text-muted">
          {t.dashboard.yearPassed(formatDecimal(pct, locale, 2))}
        </p>
        <div className="mt-7">
          <EventCountdown variant="inline" />
        </div>
      </section>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Link
          to="/settings"
          className="glass panel block no-underline transition-transform duration-300 hover:-translate-y-1"
        >
          <h2 className="h2">{t.dashboard.account}</h2>
          <p className="lede mt-2">{t.dashboard.accountBlurb}</p>
        </Link>
        {role === "admin" || role === "owner" ? (
          <Link
            to="/admin"
            className="glass panel block no-underline transition-transform duration-300 hover:-translate-y-1"
          >
            <h2 className="h2">{t.dashboard.admin}</h2>
            <p className="lede mt-2">{t.dashboard.adminBlurb}</p>
          </Link>
        ) : (
          <div className="glass panel">
            <h2 className="h2">{t.dashboard.roleTitle}</h2>
            <p className="lede mt-2">{t.dashboard.roleBlurb}</p>
          </div>
        )}
      </div>
    </GatePage>
  );
}
