import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useLocale } from "@/lib/i18n";
import { formatInteger } from "@/lib/numbers";
import { readPref, writePref } from "@/lib/prefs";
import { conditionKey } from "@/lib/weather";
import { copyFor } from "@/lib/world-clock-copy";
import {
  DEFAULT_ZONES,
  FEATURED_ZONE,
  MAX_CARDS,
  cityName,
  describeZone,
  formatDifference,
  formatOffset,
  localTimeZone,
  localeConfig,
  moveZone,
  offsetMinutes,
  optionFor,
  parseStoredZones,
  searchTimeZones,
  serializeZones,
  type TimeZoneData,
} from "@/lib/world-clock";
import { ClockCard } from "./clock-card";
import { useNow, useWeather } from "./use-world-clock";

const PREF_NAME = "world-clock-zones";

export function WorldClockDashboard() {
  const { theme, setTheme } = useTheme();
  const { locale: appLocale } = useLocale();
  const locale = useMemo(() => localeConfig(appLocale), [appLocale]);
  const copy = copyFor(appLocale);

  // Server and first client render use the defaults and no time, so the HTML
  // never disagrees with the browser's clock. The effects below fill them in.
  const [zones, setZones] = useState<string[]>([...DEFAULT_ZONES]);
  const [ready, setReady] = useState(false);
  const [localZone, setLocalZone] = useState("UTC");
  const [query, setQuery] = useState("");
  const now = useNow();
  const weather = useWeather(FEATURED_ZONE.coordinates);

  useEffect(() => {
    setZones(parseStoredZones(readPref(PREF_NAME)));
    setLocalZone(localTimeZone());
    setReady(true);
  }, []);

  // Persist only after the saved list has loaded, so the defaults never
  // overwrite a visitor's order on the first render.
  useEffect(() => {
    if (ready) writePref(PREF_NAME, serializeZones(zones));
  }, [zones, ready]);

  const suggestions = useMemo(
    () => searchTimeZones(query, zones, appLocale),
    [query, zones, appLocale],
  );
  const atLimit = zones.length >= MAX_CARDS;

  const cards: TimeZoneData[] = useMemo(
    () =>
      now
        ? zones.map((zone) => {
            const option = optionFor(zone);
            return option
              ? describeZone(option, appLocale, now)
              : { city: zone, timeZone: zone, offset: "UTC" };
          })
        : [],
    [zones, now, appLocale],
  );

  const featuredOffset = now ? offsetMinutes(FEATURED_ZONE.timeZone, now) : 0;
  const localOffset = now ? offsetMinutes(localZone, now) : 0;
  const featuredCity = cityName(FEATURED_ZONE, appLocale);
  const weatherCode = weather.data ? conditionKey(weather.data.code) : null;

  function addZone(timeZone: string) {
    if (atLimit || zones.includes(timeZone)) return;
    setZones([...zones, timeZone]);
    setQuery("");
  }

  function removeZone(timeZone: string) {
    setZones(zones.filter((zone) => zone !== timeZone));
  }

  function moveCard(index: number, delta: number) {
    setZones(moveZone(zones, index, delta));
  }

  function handleSearchKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && suggestions[0]) {
      event.preventDefault();
      addZone(suggestions[0].timeZone);
    }
    if (event.key === "Escape") setQuery("");
  }

  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <div dir={locale.dir} className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.28em] text-muted uppercase">{copy.eyebrow}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{copy.title}</h1>
        </div>
        <button
          type="button"
          onClick={() => setTheme(nextTheme)}
          className="rounded-full border border-white/15 px-4 py-2 text-sm transition-colors duration-300 hover:bg-white/10"
        >
          {theme === "dark" ? copy.lightMode : copy.darkMode}
        </button>
      </header>

      {/* Featured: Cairo, with live weather beneath the clock. */}
      <section aria-label={copy.featuredLabel} className="space-y-3">
        <p className="text-xs tracking-[0.2em] text-muted uppercase">{copy.featuredLabel}</p>
        <ClockCard
          city={featuredCity}
          timeZone={FEATURED_ZONE.timeZone}
          offset={formatOffset(featuredOffset)}
          now={now}
          locale={locale}
          copy={copy}
          difference={
            now ? formatDifference(featuredOffset - localOffset, locale.tag) : null
          }
          featured
        >
          <div className="mt-6 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <p className="text-xs text-muted uppercase tracking-[0.16em]">{copy.weatherTitle}</p>
              <p className="mt-1 text-lg font-medium" aria-live="polite">
                {weatherCode
                  ? copy.conditions[weatherCode]
                  : weather.status === "error"
                    ? copy.weatherError
                    : copy.weatherLoading}
              </p>
              {weather.status === "error" && (
                <button
                  type="button"
                  onClick={weather.retry}
                  className="mt-2 rounded-full border border-white/15 px-3 py-1 text-xs transition-colors hover:bg-white/10"
                >
                  {copy.retry}
                </button>
              )}
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-[0.16em]">{copy.temperature}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">
                {weather.data
                  ? `${formatInteger(Math.round(weather.data.temperatureC), appLocale)}°C`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted uppercase tracking-[0.16em]">{copy.humidity}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">
                {weather.data
                  ? `${formatInteger(Math.round(weather.data.humidity), appLocale)}%`
                  : "—"}
              </p>
            </div>
          </div>
        </ClockCard>
      </section>

      {/* Your local time: always shown, never removable. */}
      <section aria-label={copy.localLabel} className="space-y-3">
        <p className="text-xs tracking-[0.2em] text-muted uppercase">{copy.localLabel}</p>
        <ClockCard
          city={localZone}
          timeZone={localZone}
          offset={formatOffset(localOffset)}
          now={now}
          locale={locale}
          copy={copy}
          difference={null}
        />
      </section>

      {/* Add a zone, with suggestions. */}
      <section aria-label={copy.addTitle} className="space-y-3">
        <label htmlFor="world-clock-search" className="text-sm font-medium">
          {copy.addTitle}
        </label>
        <input
          id="world-clock-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleSearchKey}
          disabled={atLimit}
          placeholder={atLimit ? copy.limitReached : copy.addPlaceholder}
          autoComplete="off"
          className="w-full rounded-xl border border-white/15 bg-transparent px-4 py-3 outline-none transition-colors duration-300 focus:border-indigo-400 disabled:opacity-50"
        />
        {!atLimit && suggestions.length > 0 && (
          <ul className="glass grid gap-1 rounded-2xl p-2 sm:grid-cols-2">
            {suggestions.map((option) => (
              <li key={option.timeZone}>
                <button
                  type="button"
                  onClick={() => addZone(option.timeZone)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-start transition-colors duration-200 hover:bg-white/10"
                >
                  <span>
                    <span className="font-medium">{cityName(option, appLocale)}</span>
                    <span className="ms-2 text-sm text-muted">{option.timeZone}</span>
                  </span>
                  <span className="text-xs text-muted">+ {copy.addAction}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* City cards, in the order the visitor chose. */}
      <section aria-label={copy.title}>
        {zones.length === 0 ? (
          <p className="text-sm text-muted">{copy.empty}</p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card, index) => {
              const option = optionFor(card.timeZone);
              const zoneOffset = now ? offsetMinutes(card.timeZone, now) : 0;
              return (
                <li key={card.timeZone}>
                  <ClockCard
                    city={card.city}
                    timeZone={card.timeZone}
                    offset={card.offset}
                    now={now}
                    locale={locale}
                    copy={copy}
                    difference={
                      now && option ? formatDifference(zoneOffset - localOffset, locale.tag) : null
                    }
                    actions={
                      <>
                        <button
                          type="button"
                          onClick={() => moveCard(index, -1)}
                          disabled={index === 0}
                          aria-label={copy.moveEarlier(card.city)}
                          className="rounded-lg p-1.5 transition-colors hover:bg-white/10 disabled:opacity-30"
                        >
                          <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveCard(index, 1)}
                          disabled={index === cards.length - 1}
                          aria-label={copy.moveLater(card.city)}
                          className="rounded-lg p-1.5 transition-colors hover:bg-white/10 disabled:opacity-30"
                        >
                          <ChevronRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeZone(card.timeZone)}
                          aria-label={copy.removeCity(card.city)}
                          className="ms-auto flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-muted transition-colors hover:bg-white/10"
                        >
                          <X className="size-3.5" aria-hidden="true" />
                          {copy.remove}
                        </button>
                      </>
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
