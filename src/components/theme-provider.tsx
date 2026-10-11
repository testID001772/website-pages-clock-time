import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { LEGACY_PREF_PREFIX, readPref, writePref } from "@/lib/prefs";
import { getPublicSettings } from "@/lib/server/site";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/types";
import { hexToRgb } from "@/lib/utils";

type ThemeCtx = {
  settings: SiteSettings;
  space: "on" | "off";
  setSpace: (next: "on" | "off") => void;
  motion: "on" | "off";
  setMotion: (next: "on" | "off") => void;
  theme: "dark" | "light";
  setTheme: (next: "dark" | "light") => void;
  refreshSettings: () => Promise<void>;
  applySettings: (next: SiteSettings) => void;
};

const ThemeContext = createContext<ThemeCtx | null>(null);

function applyCssVars(
  settings: SiteSettings,
  space: "on" | "off",
  motion: "on" | "off",
  theme: "dark" | "light",
) {
  const root = document.documentElement;
  root.dataset.space = space;
  root.dataset.motion = motion;
  root.dataset.theme = theme;
  root.style.setProperty("--bg-blur", `${settings.backgroundBlur}px`);
  root.style.setProperty("--glass-blur", `${settings.glassBlur}px`);
  const { r, g, b } = hexToRgb(settings.glassColor);
  root.style.setProperty("--glass-rgb", `${r}, ${g}, ${b}`);
  root.style.setProperty("--glass-alpha", String(settings.glassOpacity / 100));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [space, setSpaceState] = useState<"on" | "off">("on");
  const [motion, setMotionState] = useState<"on" | "off">("on");
  const [theme, setThemeState] = useState<"dark" | "light">("dark");

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
    const storedTheme = readPref("theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      setThemeState(storedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      setThemeState("light");
    } else if (storedSpace === "off") {
      // Migration: space-off used to mean white mode; keep that look.
      setThemeState("light");
    }
    void getPublicSettings()
      .then(setSettings)
      .catch(() => setSettings(DEFAULT_SETTINGS));
  }, []);

  useEffect(() => {
    applyCssVars(settings, space, motion, theme);
  }, [settings, space, motion, theme]);

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
      refreshSettings: async () => {
        try {
          setSettings(await getPublicSettings());
        } catch {
          /* keep current */
        }
      },
      applySettings: setSettings,
    }),
    [settings, space, motion, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
