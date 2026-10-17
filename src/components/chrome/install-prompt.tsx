import { Download } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { useInstallPrompt } from "@/lib/use-install-prompt";
import { playSfx } from "@/lib/sfx";

/**
 * "Install app" in the header. Appears only when the browser offers an install
 * (`beforeinstallprompt`); Safari/iOS never fires it and uses Share → Add to
 * Home Screen, so there the chip stays hidden. The download page explains that
 * case in words — see `use-install-prompt.ts` for the shared state.
 */
export function InstallPrompt() {
  const { t } = useLocale();
  const { available, installed, install } = useInstallPrompt();

  if (installed || !available) return null;

  const onClick = () => {
    playSfx("click");
    void install();
  };

  return (
    <button
      type="button"
      className="icon-btn glass"
      onClick={onClick}
      aria-label={t.chrome.install}
    >
      <Download className="size-4" />
      <span className="hidden sm:inline">{t.chrome.install}</span>
    </button>
  );
}
