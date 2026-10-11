import { Check, ChevronDown, Globe } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LOCALES, LOCALE_NAMES, useLocale } from "@/lib/i18n";
import { playSfx } from "@/lib/sfx";

export function LanguagePicker() {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  return (
    <div className="lang-picker" ref={rootRef}>
      <button
        type="button"
        className="icon-btn glass"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.chrome.language}
        onClick={() => {
          playSfx(open ? "close" : "open");
          setOpen((o) => !o);
        }}
      >
        <Globe className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">{LOCALE_NAMES[locale]}</span>
        <ChevronDown className="size-4 opacity-70" aria-hidden="true" />
      </button>

      {open ? (
        <ul className="lang-menu glass" role="menu" aria-label={t.chrome.language}>
          {LOCALES.map((l) => (
            <li key={l} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={l === locale}
                className={`lang-option${l === locale ? " current" : ""}`}
                onClick={() => {
                  playSfx("pop");
                  setLocale(l);
                  setOpen(false);
                }}
              >
                <span>{LOCALE_NAMES[l]}</span>
                {l === locale ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
