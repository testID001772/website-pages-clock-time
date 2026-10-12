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
      className={`glass flex flex-col rounded-[28px] transition-all duration-300 ${
        featured ? "p-6 sm:p-8" : "p-5 hover:-translate-y-0.5"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className={featured ? "text-2xl font-semibold" : "text-lg font-semibold"}>{city}</h2>
          <p className="text-xs text-muted">
            {timeZone}
            {abbreviation ? ` · ${abbreviation}` : ""}
          </p>
        </div>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs tabular-nums">{offset}</span>
      </div>
      <p
        className={`mt-4 font-mono font-semibold tabular-nums ${
          featured ? "text-5xl sm:text-6xl" : "text-3xl"
        }`}
      >
        {time}
      </p>
      <p className="mt-1 text-sm text-muted">{date}</p>
      <p className="mt-3 text-xs text-muted">{relative}</p>
      {children}
      {actions && (
        <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3">{actions}</div>
      )}
    </article>
  );
}
