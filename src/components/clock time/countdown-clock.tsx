import { Fragment, useEffect, useState } from "react";
import { pad2, UNITS, type Unit } from "@/lib/countdown";
import { useLocale } from "@/lib/i18n";

type Parts = Record<Unit, number> & { tenths: number };

function unitText(unit: Unit, parts: Parts, tenthsLive: boolean): string {
  if (unit === "days") return String(parts.days).padStart(2, "0");
  if (unit === "seconds") return `${pad2(parts.seconds)}.${tenthsLive ? parts.tenths : 0}`;
  return pad2(parts[unit]);
}

export function CountdownClock({ parts, compact = false }: { parts: Parts; compact?: boolean }) {
  const { t } = useLocale();
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
        parts.years,
        parts.months,
        parts.days,
        pad2(parts.hours),
        pad2(parts.minutes),
        pad2(parts.seconds),
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
              {unitText(unit, parts, tenthsLive)}
            </div>
            <div className="unit-label">{t.countdown.units[unit]}</div>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
