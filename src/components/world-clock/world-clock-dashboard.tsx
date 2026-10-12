import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useTheme } from "@/components/theme-provider";
import { readPref, writePref } from "@/lib/prefs";
import {
  DEFAULT_ZONES,
  MAX_CARDS,
  describeZone,
  differenceLabel,
  localTimeZone,
  moveZone,
  offsetMinutes,
  optionFor,
  parseStoredZones,
  searchTimeZones,
  serializeZones,
  type TimeZoneData,
} from "@/lib/world-clock";

const PREF_NAME = "world-clock-zones";

/** Clock face text for one zone, in the browser's own locale. */
function formatTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function WorldClockDashboard() {
  const { theme, setTheme } = useTheme();

  // Server and first client render use the defaults and no time, so the HTML
  // never disagrees with the browser's clock. The effect below fills them in.
  const [zones, setZones] = useState<string[]>([...DEFAULT_ZONES]);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [localZone, setLocalZone] = useState("UTC");
  const [query, setQuery] = useState("");

  useEffect(() => {
    setZones(parseStoredZones(readPref(PREF_NAME)));
    setLocalZone(localTimeZone());
    setNow(new Date());
    setReady(true);
    // One tick per second keeps every seconds hand honest.
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Persist only after the saved list has loaded, so the defaults never
  // overwrite a visitor's order on the first render.
  useEffect(() => {
    if (ready) writePref(PREF_NAME, serializeZones(zones));
  }, [zones, ready]);

  const suggestions = useMemo(() => searchTimeZones(query, zones), [query, zones]);
  const atLimit = zones.length >= MAX_CARDS;

  const localMinutes = now ? offsetMinutes(localZone, now) : 0;
  const cards: TimeZoneData[] = useMemo(
    () =>
      now
        ? zones.map((zone) =>
            describeZone(
              optionFor(zone) ?? { city: zone, region: "", timeZone: zone },
              now,
            ),
          )
        : [],
    [zones, now],
  );

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
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.28em] text-muted uppercase">Clock &amp; Time Zone</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">World clocks</h1>
        </div>
        <button
          type="button"
          onClick={() => setTheme(nextTheme)}
          aria-label={`Switch to ${nextTheme} mode`}
          className="rounded-full border border-white/15 px-4 py-2 text-sm transition-colors duration-300 hover:bg-white/10"
        >
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </header>

      {/* Local time: always first, never removable. */}
      <section
        aria-label="Your local time"
        className="glass rounded-[28px] p-6 transition-all duration-300 sm:p-8"
      >
        <p className="text-xs tracking-[0.2em] text-muted uppercase">Your local time · {localZone}</p>
        <p className="mt-2 font-mono text-5xl font-semibold tabular-nums sm:text-6xl" aria-live="off">
          {now ? formatTime(now, localZone) : "--:--:--"}
        </p>
        <p className="mt-2 text-sm text-muted">{now ? formatDate(now, localZone) : " "}</p>
      </section>

      {/* Add a zone, with suggestions. */}
      <section aria-label="Add a time zone" className="space-y-3">
        <label htmlFor="world-clock-search" className="text-sm font-medium">
          Add a city or time zone
        </label>
        <input
          id="world-clock-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleSearchKey}
          disabled={atLimit}
          placeholder={atLimit ? `Limit of ${MAX_CARDS} clocks reached` : "Try Cairo, Tokyo or Europe/Paris"}
          autoComplete="off"
          className="w-full rounded-xl border border-white/15 bg-transparent px-4 py-3 outline-none transition-colors duration-300 focus:border-indigo-400 disabled:opacity-50"
        />
        {!atLimit && suggestions.length > 0 && (
          <ul className="glass grid gap-1 rounded-2xl p-2 sm:grid-cols-2" role="list">
            {suggestions.map((option) => (
              <li key={option.timeZone}>
                <button
                  type="button"
                  onClick={() => addZone(option.timeZone)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors duration-200 hover:bg-white/10"
                >
                  <span>
                    <span className="font-medium">{option.city}</span>
                    <span className="ml-2 text-sm text-muted">{option.region}</span>
                  </span>
                  <span className="text-xs text-muted">+ Add</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* City cards. */}
      <section aria-label="World clocks">
        {zones.length === 0 ? (
          <p className="text-sm text-muted">No clocks yet. Search above to add one.</p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card, index) => (
              <li
                key={card.timeZone}
                className="glass flex flex-col rounded-[24px] p-5 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">{card.city}</h2>
                    <p className="text-xs text-muted">{card.timeZone}</p>
                  </div>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs tabular-nums">
                    {card.offset}
                  </span>
                </div>
                <p className="mt-4 font-mono text-3xl font-semibold tabular-nums">
                  {now ? formatTime(now, card.timeZone) : "--:--:--"}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {now ? formatDate(now, card.timeZone) : " "}
                </p>
                <p className="mt-3 text-xs text-muted">
                  {now
                    ? `${differenceLabel(offsetMinutes(card.timeZone, now), localMinutes)} vs local`
                    : " "}
                </p>
                <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3">
                  <button
                    type="button"
                    onClick={() => moveCard(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${card.city} earlier`}
                    className="rounded-lg px-2.5 py-1 text-sm transition-colors hover:bg-white/10 disabled:opacity-30"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCard(index, 1)}
                    disabled={index === cards.length - 1}
                    aria-label={`Move ${card.city} later`}
                    className="rounded-lg px-2.5 py-1 text-sm transition-colors hover:bg-white/10 disabled:opacity-30"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    onClick={() => removeZone(card.timeZone)}
                    aria-label={`Remove ${card.city}`}
                    className="ml-auto rounded-lg px-2.5 py-1 text-sm text-muted transition-colors hover:bg-white/10 hover:text-current"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
