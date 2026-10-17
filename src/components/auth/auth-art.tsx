export function DashboardMark() {
  return (
    <svg viewBox="0 0 72 72" className="size-12" aria-hidden="true">
        <defs>
          <radialGradient id="mSun" cx="42%" cy="38%" r="65%">
            <stop offset="0%" stopColor="#fffbe8"/>
            <stop offset="60%" stopColor="#ffd166"/>
            <stop offset="100%" stopColor="#ef7d32"/>
          </radialGradient>
        </defs>
        <circle cx="36" cy="36" r="34" fill="#1a0b3d"/>
        <circle cx="56" cy="20" r="1.2" fill="#fff" opacity="0.8"/>
        <circle cx="14" cy="50" r="1" fill="#fff" opacity="0.5"/>
        <circle cx="24" cy="26" r="16" fill="#ffd166" opacity="0.22"/>
        <circle cx="24" cy="26" r="9" fill="url(#mSun)"/>
        <ellipse cx="36" cy="38" rx="24" ry="14" fill="none" stroke="rgba(232,226,255,0.28)"/>
        <circle cx="30" cy="50" r="3" fill="#4f8fce"/>
        <circle cx="48" cy="44" r="8" fill="#d9a066" opacity="0.2"/>
        <circle cx="48" cy="44" r="5" fill="#d9a066"/>
        <ellipse cx="48" cy="44" rx="9" ry="2.6" fill="none" stroke="#e6d3a3" strokeWidth="1.2"/>
    </svg>
  );
}
