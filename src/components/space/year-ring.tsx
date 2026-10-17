/**
 * The year progress ring on the home screen — one SVG circle, the percentage in
 * the middle. It replaces v1's thin bar: the same number, but the shape says
 * "how much of the year is left" without asking the reader to compare lengths.
 *
 * Pure presentation: it takes a 0–100 value and renders. No theme, no clock.
 */
export function YearRing({
  percent,
  value,
  caption,
  label,
}: {
  /** 0–100; drives the stroke length. */
  percent: number;
  /** The big number in the middle, already formatted for the locale. */
  value: string;
  /** The short line under it — the year being counted. */
  caption: string;
  /** The full sentence for assistive tech ("2026 is 69.63% complete"). */
  label: string;
}) {
  const clamped = Math.min(100, Math.max(0, Number.isFinite(percent) ? percent : 0));
  // r = 46 on a 100×100 viewBox, so the stroke stays inside the box.
  const circumference = 2 * Math.PI * 46;
  const offset = circumference * (1 - clamped / 100);
  return (
    <div className="year-ring" role="img" aria-label={label}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id="yearRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            {/* `style`, not the `stop-color` attribute: a var() in a
                presentation attribute is not substituted by every engine. */}
            <stop offset="0%" style={{ stopColor: "var(--color-ice)" }} />
            <stop offset="55%" style={{ stopColor: "var(--color-aurora)" }} />
            <stop offset="100%" style={{ stopColor: "var(--color-sun)" }} />
          </linearGradient>
        </defs>
        <circle className="year-ring-track" cx="50" cy="50" r="46" />
        <circle
          className="year-ring-fill"
          cx="50"
          cy="50"
          r="46"
          strokeDasharray={circumference.toFixed(2)}
          strokeDashoffset={offset.toFixed(2)}
        />
      </svg>
      <div className="year-ring-body">
        <p className="tnum text-2xl font-semibold">{value}</p>
        <p className="micro">{caption}</p>
      </div>
    </div>
  );
}
