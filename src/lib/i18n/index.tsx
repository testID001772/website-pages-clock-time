import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ar } from "./locales/ar";
import { de } from "./locales/de";
import { en } from "./locales/en";
import { es } from "./locales/es";
import { fr } from "./locales/fr";
import { hi } from "./locales/hi";
import { it } from "./locales/it";
import { pt } from "./locales/pt";
import { ru } from "./locales/ru";
import { tr } from "./locales/tr";
import { zh } from "./locales/zh";

/**
 * App locales. Adding a language is:
 * 1. Add `src/lib/i18n/locales/<tag>.ts` exporting a `Dictionary`.
 * 2. Register it in `LOCALES`, `dictionaries`, `DIRS`, and `LOCALE_NAMES`.
 * The header switcher picks it up automatically.
 *
 * `Dictionary` is the shape of the English copy, so a new locale with a
 * missing or mistyped key fails `npm run typecheck` instead of rendering
 * blank. Interpolated strings are functions so each language owns its own
 * word order, pluralization, and number formatting.
 */
export const LOCALES = ["en", "ar", "de", "es", "fr", "hi", "it", "pt", "ru", "tr", "zh"] as const;
export type Locale = (typeof LOCALES)[number];
export type Dictionary = typeof en;

/** Native display names for the language switcher. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
  de: "Deutsch",
  es: "Español",
  fr: "Français",
  hi: "हिन्दी",
  it: "Italiano",
  pt: "Português",
  ru: "Русский",
  tr: "Türkçe",
  zh: "中文",
};

const dictionaries: Record<Locale, Dictionary> = { en, ar, de, es, fr, hi, it, pt, ru, tr, zh };
const DIRS: Record<Locale, "ltr" | "rtl"> = {
  en: "ltr",
  ar: "rtl",
  de: "ltr",
  es: "ltr",
  fr: "ltr",
  hi: "ltr",
  it: "ltr",
  pt: "ltr",
  ru: "ltr",
  tr: "ltr",
  zh: "ltr",
};

const STORAGE_KEY = "system-space-locale";

type LocaleCtx = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  /** The active dictionary — `t.home.previewFinale`, `t.auth.email`, … */
  t: Dictionary;
};

const LocaleContext = createContext<LocaleCtx | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && (LOCALES as readonly string[]).includes(stored)) {
      setLocaleState(stored as Locale);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = DIRS[locale];
  }, [locale]);

  const value = useMemo<LocaleCtx>(
    () => ({
      locale,
      setLocale: (next) => {
        if (!(LOCALES as readonly string[]).includes(next)) return;
        setLocaleState(next);
        window.localStorage.setItem(STORAGE_KEY, next);
      },
      t: dictionaries[locale],
    }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** English fallback for trees outside the provider (e.g. the route error page). */
const FALLBACK_CTX: LocaleCtx = {
  locale: "en",
  setLocale: () => undefined,
  t: en,
};

export function useLocale(): LocaleCtx {
  return useContext(LocaleContext) ?? FALLBACK_CTX;
}
