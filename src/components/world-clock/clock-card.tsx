import type { ReactNode } from "react";
import {
  formatClockDate,
  formatClockTime,
  formatZoneAbbreviation,
  type LocaleConfig,
} from "@/lib/world-clock";
import type { WorldClockCopy } from "@/lib/world-clock-copy";

export interface ClockCardProps {
  /** City name, already in the active language. */
  city: string;
  /** IANA zone id, e.g. "Europe/London". */
  timeZone: string;
  /** "UTC+01:00" and friends. */
  offset: string;
  /** The current instant, or `null` before mount. */
  now: Date | null;
  locale: LocaleConfig;
  copy: WorldClockCopy;
  /** Localised difference from the visitor's clock, or `null` for the same time. */
  difference: string | null;
  /** The large primary card. */
  featured?: boolean;
  /** Extra content under the clock, such as weather. */
  children?: ReactNode;
  /** Reorder and remove controls. */
  actions?: ReactNode;
}

/** The accent rule the featured card wears across its top edge. */
const ACCENT = "linear-gradient(90deg, var(--color-ice), var(--color-aurora), var(--color-sun))";

/** One clock: city, live time, date, zone abbreviation and offset. */
export function ClockCard({
  city,
  timeZone,
  offset,
  now,
  locale,
  copy,
  difference,
  featured = false,
  children,
  actions,
}: ClockCardProps) {
  const time = now ? formatClockTime(now, timeZone, locale.tag) : "--:--:--";
  const date = now ? formatClockDate(now, timeZone, locale.tag) : " ";
  const abbreviation = now ? formatZoneAbbreviation(now, timeZone, locale.tag) : "";
  const relative = now
    ? difference === null
      ? copy.sameTime
      : copy.vsLocal(difference)
    : " ";

  return (
    <article
      aria-label={city}
      className={`glass relative flex flex-col overflow-hidden rounded-[26px] transition-transform duration-300 ${
        featured ? "p-6 sm:p-8" : "p-5 hover:-translate-y-1"
      }`}
    >
      {featured ? (
        <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: ACCENT }} aria-hidden="true" />
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            className={`font-semibold tracking-tight ${featured ? "text-2xl sm:text-3xl" : "text-lg"}`}
          >
            {city}
          </h2>
          <p className="mt-1 truncate text-xs text-muted">
            {timeZone}
            {abbreviation ? ` · ${abbreviation}` : ""}
          </p>
        </div>
        <span className="badge badge-accent tnum shrink-0">{offset}</span>
      </div>

      <p
        className={`tnum mt-5 font-semibold ${
          featured ? "text-5xl sm:text-6xl" : "text-3xl"
        }`}
      >
        {time}
      </p>
      <p className="mt-1.5 text-sm text-muted">{date}</p>
      <p className="mt-4 text-xs tracking-wide text-muted uppercase">{relative}</p>
      {children}
      {actions ? (
        <div className="mt-5 flex items-center gap-1 border-t border-white/10 pt-3">{actions}</div>
      ) : null}
    </article>
  );
}
