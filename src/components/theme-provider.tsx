import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CARD_SOLID, resolveCardSurface } from "@/lib/cards";
import { LEGACY_PREF_PREFIX, readPref, writePref } from "@/lib/prefs";
import { getPublicSettings } from "@/lib/server/site";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/types";

type ThemeCtx = {
  settings: SiteSettings;
  space: "on" | "off";
  setSpace: (next: "on" | "off") => void;
  motion: "on" | "off";
  setMotion: (next: "on" | "off") => void;
  theme: "dark" | "light";
  setTheme: (next: "dark" | "light") => void;
  /** Card look: `on` = the staff-tuned glass, `off` = the flat theme colour. */
  glass: "on" | "off";
  setGlass: (next: "on" | "off") => void;
  refreshSettings: () => Promise<void>;
  applySettings: (next: SiteSettings) => void;
};

const ThemeContext = createContext<ThemeCtx | null>(null);

function applyCssVars(
  settings: SiteSettings,
  space: "on" | "off",
  motion: "on" | "off",
  theme: "dark" | "light",
  glass: "on" | "off",
) {
  const root = document.documentElement;
  root.dataset.space = space;
  root.dataset.motion = motion;
  root.dataset.theme = theme;
  // Cards are solid unless the reader turned glass on; the stylesheet keys off
  // this attribute, so the whole card family moves together.
  root.dataset.glass = glass;
  root.style.setProperty("--bg-blur", `${settings.backgroundBlur}px`);
  root.style.setProperty("--glass-blur", `${settings.glassBlur}px`);
  // Cards are the theme's own colour (black / white) unless staff picked one.
  const cards = resolveCardSurface(settings, theme);
  root.style.setProperty("--glass-rgb", cards.rgb);
  root.style.setProperty("--glass-alpha", String(cards.alpha));
  // Fully solid cards (the language menu) take the literal theme colour, so the
  // panel can never end up on the stage's violet, whatever else is in flight.
  root.style.setProperty("--card-solid", CARD_SOLID[theme]);
}

/**
 * `initialSettings` comes from the root route loader, so the first server paint
 * already carries the real background image and glass values. Without it the
 * stage renders the bare gradient until `getPublicSettings()` resolves — which
 * is what "the background image doesn't show" looked like.
 */
export function ThemeProvider({
  children,
  initialSettings,
}: {
  children: ReactNode;
  initialSettings?: SiteSettings;
}) {
  const [settings, setSettings] = useState<SiteSettings>(initialSettings ?? DEFAULT_SETTINGS);
  const [space, setSpaceState] = useState<"on" | "off">("on");
  const [motion, setMotionState] = useState<"on" | "off">("on");
  const [theme, setThemeState] = useState<"dark" | "light">("dark");
  const [glass, setGlassState] = useState<"on" | "off">("off");

  useEffect(() => {
    // Feature flags dropped before the rename — their stored values are
    // deleted rather than migrated (`readPref` only adopts keys we still read).
    window.localStorage.removeItem(`${LEGACY_PREF_PREFIX}lights`);
    window.localStorage.removeItem(`${LEGACY_PREF_PREFIX}layers`);
    const storedSpace = readPref("space");
    if (storedSpace === "off" || storedSpace === "on") setSpaceState(storedSpace);
    const storedMotion = readPref("motion");
    if (storedMotion === "off" || storedMotion === "on") {
      setMotionState(storedMotion);
    } else if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMotionState("off");
    }
    const storedGlass = readPref("glass");
    if (storedGlass === "on" || storedGlass === "off") setGlassState(storedGlass);
    const storedTheme = readPref("theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      setThemeState(storedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      setThemeState("light");
    } else if (storedSpace === "off") {
      // Migration: space-off used to mean white mode; keep that look.
      setThemeState("light");
    }
    // Refresh once on the client: covers a database blip in the loader and a
    // long-lived open tab. Failure keeps whatever we already have.
    void getPublicSettings()
      .then(setSettings)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    applyCssVars(settings, space, motion, theme, glass);
  }, [settings, space, motion, theme, glass]);

  const value = useMemo<ThemeCtx>(
    () => ({
      settings,
      space,
      setSpace: (next) => {
        setSpaceState(next);
        writePref("space", next);
      },
      motion,
      setMotion: (next) => {
        setMotionState(next);
        writePref("motion", next);
      },
      theme,
      setTheme: (next) => {
        setThemeState(next);
        writePref("theme", next);
      },
      glass,
      setGlass: (next) => {
        setGlassState(next);
        writePref("glass", next);
      },
      refreshSettings: async () => {
        try {
          setSettings(await getPublicSettings());
        } catch {
          /* keep current */
        }
      },
      applySettings: setSettings,
    }),
    [settings, space, motion, theme, glass],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
