export function AuthArt({ title }: { title: string }) {
  return (
    <div className="relative hidden min-h-[280px] overflow-hidden lg:block">
      <svg viewBox="0 0 640 720" className="h-full w-full" role="img" aria-hidden="true">
        <title>{title}</title>
          <defs>
            <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#060312"/>
              <stop offset="55%" stopColor="#140a33"/>
              <stop offset="100%" stopColor="#0c0620"/>
            </linearGradient>
            <radialGradient id="nebulaGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#6a5cff" stopOpacity="0.16"/>
              <stop offset="100%" stopColor="#6a5cff" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="authSun" cx="42%" cy="38%" r="65%">
              <stop offset="0%" stopColor="#fffbe8"/>
              <stop offset="55%" stopColor="#ffd166"/>
              <stop offset="100%" stopColor="#ef7d32"/>
            </radialGradient>
            <linearGradient id="hullGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ece8ff"/>
              <stop offset="100%" stopColor="#8f86c4"/>
            </linearGradient>
            <linearGradient id="domeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d8efff"/>
              <stop offset="100%" stopColor="#5d8fce"/>
            </linearGradient>
            <linearGradient id="beamGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7eb8e8" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="#7eb8e8" stopOpacity="0"/>
            </linearGradient>
            <linearGradient id="tailGrad" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9"/>
              <stop offset="60%" stopColor="#ffffff" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.15"/>
            </linearGradient>
            <linearGradient id="vigGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#060312" stopOpacity="0"/>
              <stop offset="100%" stopColor="#060312" stopOpacity="0.55"/>
            </linearGradient>
          </defs>

          <rect width="640" height="720" fill="url(#bgGrad)"/>
          <circle cx="520" cy="120" r="180" fill="url(#nebulaGrad)"/>

          <g fill="#fff">
            <circle cx="40" cy="60" r="0.9" opacity="0.5"/><circle cx="110" cy="40" r="1.2" opacity="0.6"/>
            <circle cx="200" cy="60" r="1" opacity="0.4"/><circle cx="290" cy="36" r="1.4" opacity="0.7"/>
            <circle cx="380" cy="60" r="1" opacity="0.5"/><circle cx="470" cy="44" r="1.2" opacity="0.6"/>
            <circle cx="560" cy="60" r="0.9" opacity="0.4"/><circle cx="610" cy="100" r="1.3" opacity="0.6"/>
            <circle cx="60" cy="160" r="1" opacity="0.4"/><circle cx="230" cy="140" r="1.1" opacity="0.5"/>
            <circle cx="330" cy="120" r="1.3" opacity="0.7"/><circle cx="430" cy="150" r="1" opacity="0.5"/>
            <circle cx="520" cy="170" r="0.9" opacity="0.4"/><circle cx="600" cy="200" r="1.2" opacity="0.55"/>
            <circle cx="36" cy="260" r="1.1" opacity="0.5"/><circle cx="120" cy="250" r="0.9" opacity="0.4"/>
            <circle cx="220" cy="240" r="1.4" opacity="0.65"/><circle cx="330" cy="250" r="1" opacity="0.45"/>
            <circle cx="430" cy="240" r="1.2" opacity="0.6"/><circle cx="540" cy="260" r="1" opacity="0.5"/>
            <circle cx="610" cy="300" r="0.9" opacity="0.4"/><circle cx="60" cy="360" r="1.2" opacity="0.55"/>
            <circle cx="150" cy="380" r="1" opacity="0.45"/><circle cx="250" cy="360" r="1.3" opacity="0.6"/>
            <circle cx="360" cy="350" r="1" opacity="0.5"/><circle cx="470" cy="380" r="1.1" opacity="0.55"/>
            <circle cx="560" cy="360" r="0.9" opacity="0.4"/><circle cx="40" cy="470" r="1.2" opacity="0.6"/>
            <circle cx="140" cy="480" r="1" opacity="0.5"/><circle cx="240" cy="470" r="1.1" opacity="0.45"/>
            <circle cx="350" cy="470" r="1.3" opacity="0.6"/><circle cx="80" cy="580" r="1.1" opacity="0.5"/>
            <circle cx="180" cy="610" r="1" opacity="0.45"/><circle cx="280" cy="640" r="1.2" opacity="0.55"/>
            <circle cx="420" cy="630" r="1" opacity="0.5"/><circle cx="520" cy="600" r="1.3" opacity="0.6"/>
            <circle cx="600" cy="560" r="1" opacity="0.45"/><circle cx="600" cy="660" r="0.9" opacity="0.4"/>
            <circle cx="500" cy="680" r="1.1" opacity="0.5"/><circle cx="360" cy="690" r="1" opacity="0.45"/>
            <circle cx="200" cy="685" r="1.2" opacity="0.55"/><circle cx="90" cy="670" r="1" opacity="0.5"/>
          </g>

          {/*comet*/}
          <path d="M532 204 L614 118 L594 136 Z" fill="url(#tailGrad)"/>
          <circle cx="532" cy="204" r="7" fill="#eaf6ff"/>
          <circle cx="532" cy="204" r="12" fill="#bfe4ff" opacity="0.3"/>

          {/*sun*/}
          <circle cx="140" cy="140" r="95" fill="#ffd166" opacity="0.1"/>
          <circle cx="140" cy="140" r="66" fill="#ffd166" opacity="0.22"/>
          <circle cx="140" cy="140" r="44" fill="url(#authSun)"/>
          <circle cx="126" cy="126" r="10" fill="#fff8dc" opacity="0.5"/>

          {/*orbit tracks*/}
          <g fill="none" stroke="rgba(232,226,255,0.14)">
            <ellipse cx="320" cy="400" rx="255" ry="210"/>
            <ellipse cx="320" cy="400" rx="185" ry="152"/>
            <ellipse cx="320" cy="400" rx="115" ry="95"/>
          </g>
          <g fill="none" stroke="rgba(232,226,255,0.3)" strokeWidth="1.5">
            <path d="M65 400 A255 210 0 0 0 575 400"/>
            <path d="M135 400 A185 152 0 0 0 505 400"/>
            <path d="M205 400 A115 95 0 0 0 435 400"/>
          </g>

          {/*saturn ring (back half)*/}
          <path d="M73 505 A32 8 0 0 1 137 505" fill="none" stroke="#e6d3a3" strokeWidth="3" opacity="0.9"/>

          {/*planets*/}
          <circle cx="205" cy="330" r="15" fill="#b7a48c" opacity="0.14"/>
          <circle cx="205" cy="330" r="9" fill="#b7a48c"/>
          <circle cx="202" cy="327" r="2.5" fill="#fff" opacity="0.35"/>

          <circle cx="310" cy="302" r="22" fill="#e2c07a" opacity="0.14"/>
          <circle cx="310" cy="302" r="13" fill="#e2c07a"/>
          <circle cx="305" cy="297" r="3.5" fill="#fff" opacity="0.4"/>

          <circle cx="471" cy="313" r="27" fill="#4f8fce" opacity="0.16"/>
          <circle cx="471" cy="313" r="16" fill="#4f8fce"/>
          <ellipse cx="466" cy="308" rx="6" ry="4" fill="#3d8a62"/>
          <circle cx="477" cy="318" r="3" fill="#3d8a62"/>
          <path d="M458 312 Q471 304 484 312" fill="none" stroke="#fff" strokeWidth="2" opacity="0.5"/>
          <circle cx="464" cy="305" r="4" fill="#fff" opacity="0.4"/>
          <circle cx="495" cy="300" r="4" fill="#cfc8e8"/>

          <circle cx="480" cy="476" r="19" fill="#c45c3e" opacity="0.14"/>
          <circle cx="480" cy="476" r="11" fill="#c45c3e"/>
          <ellipse cx="483" cy="479" rx="5" ry="3" fill="#9c452c"/>
          <circle cx="476" cy="472" r="3" fill="#fff" opacity="0.3"/>

          <circle cx="565" cy="440" r="42" fill="#d9a066" opacity="0.14"/>
          <circle cx="565" cy="440" r="26" fill="#d9a066"/>
          <ellipse cx="565" cy="432" rx="19" ry="4" fill="#c9844c" opacity="0.55"/>
          <ellipse cx="565" cy="448" rx="22" ry="5" fill="#b06a3b" opacity="0.5"/>
          <circle cx="556" cy="430" r="6" fill="#fff" opacity="0.3"/>

          <circle cx="105" cy="505" r="18" fill="#e6d3a3"/>
          <circle cx="99" cy="499" r="4.5" fill="#fff" opacity="0.35"/>
          {/*saturn ring (front half)*/}
          <path d="M73 505 A32 8 0 0 0 137 505" fill="none" stroke="#e6d3a3" strokeWidth="3" opacity="0.9"/>

          {/*ship*/}
          <polygon points="290,606 350,606 380,680 260,680" fill="url(#beamGrad)" opacity="0.5"/>
          <ellipse cx="320" cy="612" rx="78" ry="10" fill="#7eb8e8" opacity="0.18"/>
          <path d="M242 590 Q320 566 398 590 L382 602 Q320 612 258 602 Z" fill="url(#hullGrad)"/>
          <path d="M292 584 Q320 552 348 584 Z" fill="url(#domeGrad)"/>
          <circle cx="310" cy="570" r="6" fill="#fff" opacity="0.5"/>
          <circle cx="290" cy="596" r="8" fill="#7eb8e8" opacity="0.25"/>
          <circle cx="320" cy="597" r="8" fill="#7eb8e8" opacity="0.25"/>
          <circle cx="350" cy="596" r="8" fill="#7eb8e8" opacity="0.25"/>
          <circle cx="290" cy="596" r="6" fill="#1b1238"/>
          <circle cx="290" cy="596" r="3" fill="#7eb8e8"/>
          <circle cx="320" cy="597" r="6" fill="#1b1238"/>
          <circle cx="320" cy="597" r="3" fill="#7eb8e8"/>
          <circle cx="350" cy="596" r="6" fill="#1b1238"/>
          <circle cx="350" cy="596" r="3" fill="#7eb8e8"/>
          <circle cx="250" cy="592" r="3" fill="#ffd166"/>
          <circle cx="390" cy="592" r="3" fill="#ffd166"/>

          <rect y="560" width="640" height="160" fill="url(#vigGrad)"/>
      </svg>
    </div>
  );
}

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
