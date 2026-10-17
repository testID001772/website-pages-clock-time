import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
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

/** One line of the featured card's weather strip. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="micro">{label}</p>
      <p className="tnum mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

export function WorldClockDashboard() {
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
  const localOption = optionFor(localZone);
  const localCity = localOption ? cityName(localOption, appLocale) : localZone;
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

  return (
    <div dir={locale.dir} className="flex flex-col gap-10">
      <header className="section-head">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1 className="display mt-3">{copy.title}</h1>
        </div>
        {/* Rendered only once the clock is live, so the server paint and the
            first client paint agree (both leave it out). */}
        {now ? (
          <p className="badge badge-accent tnum">
            <span
              className="size-1.5 animate-pulse rounded-full bg-ice"
              style={{ background: "currentColor" }}
              aria-hidden="true"
            />
            {localCity} · {formatOffset(localOffset)}
          </p>
        ) : null}
      </header>

      {/* Featured: Cairo, with live weather beneath the clock. */}
      <section aria-label={copy.featuredLabel} className="flex flex-col gap-4">
        <p className="eyebrow">{copy.featuredLabel}</p>
        <ClockCard
          city={featuredCity}
          timeZone={FEATURED_ZONE.timeZone}
          offset={formatOffset(featuredOffset)}
          now={now}
          locale={locale}
          copy={copy}
          difference={now ? formatDifference(featuredOffset - localOffset, locale.tag) : null}
          featured
        >
          <div className="mt-7 grid gap-6 border-t border-white/10 pt-6 sm:grid-cols-3">
            <div>
              <p className="micro">{copy.weatherTitle}</p>
              <p className="mt-2 text-lg font-medium" aria-live="polite">
                {weatherCode
                  ? copy.conditions[weatherCode]
                  : weather.status === "error"
                    ? copy.weatherError
                    : copy.weatherLoading}
              </p>
              {weather.status === "error" ? (
                <button type="button" onClick={weather.retry} className="btn btn-ghost btn-sm mt-3">
                  {copy.retry}
                </button>
              ) : null}
            </div>
            <Stat
              label={copy.temperature}
              value={
                weather.data
                  ? `${formatInteger(Math.round(weather.data.temperatureC), appLocale)}°C`
                  : "—"
              }
            />
            <Stat
              label={copy.humidity}
              value={
                weather.data
                  ? `${formatInteger(Math.round(weather.data.humidity), appLocale)}%`
                  : "—"
              }
            />
          </div>
        </ClockCard>
      </section>

      {/* Your local time: always shown, never removable. */}
      <section aria-label={copy.localLabel} className="flex flex-col gap-4">
        <p className="eyebrow">{copy.localLabel}</p>
        <ClockCard
          city={localCity}
          timeZone={localZone}
          offset={formatOffset(localOffset)}
          now={now}
          locale={locale}
          copy={copy}
          difference={null}
        />
      </section>

      {/* Add a zone, with suggestions. */}
      <section aria-label={copy.addTitle} className="flex flex-col gap-4">
        <label className="field max-w-xl" htmlFor="world-clock-search">
          <span>{copy.addTitle}</span>
          <input
            id="world-clock-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleSearchKey}
            disabled={atLimit}
            placeholder={atLimit ? copy.limitReached : copy.addPlaceholder}
            autoComplete="off"
          />
        </label>
        {!atLimit && suggestions.length > 0 ? (
          <ul className="glass grid max-w-xl gap-1 rounded-[20px] p-2 sm:grid-cols-2">
            {suggestions.map((option) => (
              <li key={option.timeZone}>
                <button
                  type="button"
                  onClick={() => addZone(option.timeZone)}
                  className="flex w-full items-center justify-between gap-3 rounded-[14px] px-3 py-2 text-start transition-colors duration-200 hover:bg-white/10"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium">{cityName(option, appLocale)}</span>
                    <span className="truncate text-xs text-muted">{option.timeZone}</span>
                  </span>
                  <span className="badge shrink-0">+ {copy.addAction}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {/* City cards, in the order the visitor chose. */}
      <section aria-label={copy.title} className="flex flex-col gap-4">
        <p className="eyebrow">{copy.title}</p>
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
                          className="rounded-full p-2 transition-colors hover:bg-white/10 disabled:opacity-30"
                        >
                          <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveCard(index, 1)}
                          disabled={index === cards.length - 1}
                          aria-label={copy.moveLater(card.city)}
                          className="rounded-full p-2 transition-colors hover:bg-white/10 disabled:opacity-30"
                        >
                          <ChevronRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeZone(card.timeZone)}
                          aria-label={copy.removeCity(card.city)}
                          className="ms-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:bg-white/10"
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
