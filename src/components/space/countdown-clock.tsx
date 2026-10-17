import { Fragment, useEffect, useState } from "react";
import { unitNumberText, UNITS, type UnitParts } from "@/lib/countdown";
import { useLocale } from "@/lib/i18n";
import { formatInteger } from "@/lib/numbers";

export function CountdownClock({
  parts,
  compact = false,
}: {
  parts: UnitParts;
  compact?: boolean;
}) {
  const { t, locale } = useLocale();
  // Tenths render after mount so SSR and first paint always match.
  const [tenthsLive, setTenthsLive] = useState(false);
  useEffect(() => {
    setTenthsLive(true);
  }, []);
  const wide = parts.days >= 100;
  return (
    <div
      className={`countdown${wide ? " wide" : ""}`}
      role="timer"
      aria-label={t.countdown.ariaLabel(
        formatInteger(parts.months, locale),
        formatInteger(parts.days, locale),
        formatInteger(parts.hours, locale, 2),
        formatInteger(parts.minutes, locale, 2),
        formatInteger(parts.seconds, locale, 2),
      )}
    >
      {UNITS.map((unit, i) => (
        <Fragment key={unit}>
          {i > 0 && !compact ? (
            <div className="colon" aria-hidden="true">
              :
            </div>
          ) : null}
          <div className="unit">
            <div
              className={unit === "seconds" ? "num tick" : "num"}
              key={unit === "seconds" ? parts.seconds : unit}
            >
              {unitNumberText(unit, parts, locale, tenthsLive)}
            </div>
            <div className="unit-label">{t.countdown.units[unit]}</div>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
