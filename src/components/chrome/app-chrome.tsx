import { Link } from "@tanstack/react-router";
import { Layers, Moon, Sun } from "lucide-react";
import { LanguagePicker } from "@/components/chrome/language-picker";
import { InstallPrompt } from "@/components/chrome/install-prompt";
import { MusicPicker } from "@/components/chrome/music-picker";
import { UpdateBanner } from "@/components/chrome/update-banner";
import { useTheme } from "@/components/theme-provider";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { STATIC_SITE } from "@/lib/base-url";
import { useLocale } from "@/lib/i18n";
import { playSfx } from "@/lib/sfx";

/**
 * The v2 header: a wordmark on the leading edge, the control rail on the other.
 *
 * The rail keeps v1's chips (theme, glass, install, playlist, language, account)
 * but groups them in one container, so the header reads as a single object
 * sitting on the stage instead of six loose pills.
 */
export function AppChrome({ hideAuth = false }: { hideAuth?: boolean }) {
  const { theme, setTheme, glass, setGlass } = useTheme();
  const { user, isPending } = useCurrentUserState();
  const { t } = useLocale();

  const toggleTheme = () => {
    playSfx("click");
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const toggleGlass = () => {
    playSfx("click");
    setGlass(glass === "on" ? "off" : "on");
  };

  const initial = (user?.displayName ?? user?.primaryEmail ?? "M").charAt(0).toUpperCase();

  return (
    <header className="chrome">
      <UpdateBanner />
      <Link to="/" className="brand" onClick={() => playSfx("click")}>
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="size-4">
            <circle
              cx="12"
              cy="12"
              r="8.5"
              fill="none"
              stroke="#e8e2ff"
              strokeWidth="1.4"
              opacity="0.85"
            />
            <path
              d="M12 7.2V12l3.1 1.9"
              fill="none"
              stroke="#7fd4ff"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <circle cx="12" cy="12" r="1.1" fill="#ffc95e" />
          </svg>
        </span>
        <span className="brand-name">Clock&nbsp;Time</span>
      </Link>

      <div className="rail">
        <button
          type="button"
          className="icon-btn glass"
          onClick={toggleTheme}
          aria-pressed={theme === "light"}
          aria-label={theme === "dark" ? t.chrome.useWhite : t.chrome.useDark}
        >
          {theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
          <span className="hidden sm:inline">
            {theme === "dark" ? t.chrome.dark : t.chrome.white}
          </span>
        </button>

        <button
          type="button"
          className="icon-btn glass chip-glass"
          onClick={toggleGlass}
          aria-pressed={glass === "on"}
          aria-label={glass === "on" ? t.chrome.useSolid : t.chrome.useGlass}
        >
          <Layers className="size-4" />
          <span className="hidden sm:inline">{t.chrome.glass}</span>
        </button>

        <InstallPrompt />

        <MusicPicker />

        <LanguagePicker />

        {hideAuth || STATIC_SITE ? null : isPending ? (
          <div className="glass h-11 w-24 animate-pulse rounded-full" />
        ) : user ? (
          <Link to="/dashboard" className="icon-btn glass max-w-[12rem]">
            {user.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="" className="size-6 rounded-full object-cover" />
            ) : (
              <span className="grid size-6 place-items-center rounded-full bg-white/15 text-xs">
                {initial}
              </span>
            )}
            <span className="hidden max-w-[7rem] truncate sm:inline">
              {user.displayName ?? t.chrome.dashboard}
            </span>
          </Link>
        ) : (
          <div className="flex gap-2">
            <Link to="/login" className="btn btn-ghost btn-sm">
              {t.chrome.logIn}
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm">
              {t.chrome.register}
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
