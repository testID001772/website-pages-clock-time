import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n";
import { playSfx } from "@/lib/sfx";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * PWA glue: registers the service worker (public/sw.js) for offline
 * support, and surfaces an "Install app" button when the browser fires
 * `beforeinstallprompt` (Chrome, Edge, Samsung, Android). Safari/iOS never
 * fires it — there the button stays hidden and iOS uses Share → Add to
 * Home Screen (see the apple-touch-icon meta in the root route).
 */
export function InstallPrompt() {
  const { t } = useLocale();
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || !promptEvent) return null;

  const install = async () => {
    playSfx("click");
    const event = promptEvent;
    setPromptEvent(null);
    await event.prompt().catch(() => undefined);
    const choice = await event.userChoice.catch(() => ({ outcome: "dismissed" as const }));
    if (choice.outcome === "dismissed") setPromptEvent(event);
  };

  return (
    <button
      type="button"
      className="icon-btn glass"
      onClick={() => void install()}
      aria-label={t.chrome.install}
    >
      <Download className="size-4" />
      <span className="hidden sm:inline">{t.chrome.install}</span>
    </button>
  );
}
