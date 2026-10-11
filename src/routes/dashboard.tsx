import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DashboardMark } from "@/components/auth/auth-art";
import { GatePage } from "@/components/chrome/gate-page";
import { CountdownClock } from "@/components/space/countdown-clock";
import { EventCountdown } from "@/components/space/event-countdown";
import { nextNewYear, splitRange, yearProgress } from "@/lib/countdown";
import { useLocale } from "@/lib/i18n";
import { getMyProfile } from "@/lib/server/profiles";
import type { Profile } from "@/lib/types";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function Dashboard() {
  const { t } = useLocale();
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
      <section className="glass rounded-[32px] p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <DashboardMark />
          <div>
            <p className="text-xs tracking-[0.28em] text-muted uppercase">
              {t.dashboard.memberOrbit}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {profile ? t.dashboard.welcome(profile.displayName) : t.dashboard.title}
            </h1>
            <p className="mt-2 text-sm text-muted">{profile?.bio || t.dashboard.bioFallback}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs tracking-[0.16em] uppercase">
            {role ?? t.dashboard.roleFallback}
          </span>
          {profile?.email ? (
            <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-muted">
              {profile.email}
            </span>
          ) : null}
        </div>
      </section>

      <section className="glass mt-4 rounded-[32px] p-6 sm:p-8">
        <h2 className="text-sm tracking-[0.2em] text-muted uppercase">
          {t.dashboard.countdownTitle}
        </h2>
        <div className="mt-4">
          <CountdownClock parts={parts} />
        </div>
        <div className="mx-auto mt-6 h-1.5 max-w-md overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-ice" style={{ width: `${pct.toFixed(2)}%` }} />
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          {t.dashboard.yearPassed(pct.toFixed(2))}
        </p>
        <div className="mt-6">
          <EventCountdown variant="inline" />
        </div>
      </section>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Link
          to="/settings"
          className="glass block rounded-[28px] p-6 no-underline transition-colors hover:bg-white/6"
        >
          <h2 className="text-lg font-medium">{t.dashboard.account}</h2>
          <p className="mt-1 text-sm text-muted">{t.dashboard.accountBlurb}</p>
        </Link>
        {role === "admin" || role === "owner" ? (
          <Link
            to="/admin"
            className="glass block rounded-[28px] p-6 no-underline transition-colors hover:bg-white/6"
          >
            <h2 className="text-lg font-medium">{t.dashboard.admin}</h2>
            <p className="mt-1 text-sm text-muted">{t.dashboard.adminBlurb}</p>
          </Link>
        ) : (
          <div className="glass rounded-[28px] p-6">
            <h2 className="text-lg font-medium">{t.dashboard.roleTitle}</h2>
            <p className="mt-1 text-sm text-muted">{t.dashboard.roleBlurb}</p>
          </div>
        )}
      </div>
    </GatePage>
  );
}
