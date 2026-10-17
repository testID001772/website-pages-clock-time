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
        featured ? "p-[1.5rem] sm:p-[2rem]" : "p-[1.25rem] hover:-translate-y-0.5"
      }`}
    >
      <div className="flex items-start justify-between gap-[0.5rem]">
        <div>
          <h2 className={featured ? "text-2xl font-semibold" : "text-lg font-semibold"}>{city}</h2>
          <p className="text-xs text-muted">
            {timeZone}
            {abbreviation ? ` · ${abbreviation}` : ""}
          </p>
        </div>
        <span className="rounded-full bg-white/10 px-[0.625rem] py-[0.25rem] text-xs tabular-nums">{offset}</span>
      </div>
      <p
        className={`mt-[1rem] font-mono font-semibold tabular-nums ${
          featured ? "text-5xl sm:text-6xl" : "text-3xl"
        }`}
      >
        {time}
      </p>
      <p className="mt-[0.25rem] text-sm text-muted">{date}</p>
      <p className="mt-[0.75rem] text-xs text-muted">{relative}</p>
      {children}
      {actions && (
        <div className="mt-[1rem] flex items-center gap-[0.5rem] border-t border-white/10 pt-[0.75rem]">{actions}</div>
      )}
    </article>
  );
}
