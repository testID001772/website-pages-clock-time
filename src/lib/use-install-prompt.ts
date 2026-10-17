import { useCallback, useEffect, useRef, useState } from "react";
import { appUrl } from "@/lib/base-url";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallPromptState = {
  /** The browser will show its own install UI (Chrome, Edge, Samsung, Android). */
  available: boolean;
  /** The app is already installed; hide the offer. */
  installed: boolean;
  /** Ask the browser to install. Dismissed prompts come back. */
  install: () => Promise<void>;
};

/**
 * PWA install state, in one place.
 *
 * Two callers need it — the header chip and the download page — and both used to
 * want the same three facts: has `beforeinstallprompt` fired, has the app been
 * installed, and how to bring the prompt back after a dismissal. Safari/iOS
 * never fires the event, so `available` stays false there and callers show the
 * Share → Add to Home Screen instructions instead.
 *
 * It also registers the service worker (`public/sw.js`), which is what makes an
 * installed app work offline.
 */
export function useInstallPrompt(): InstallPromptState {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const promptRef = useRef<InstallPromptEvent | null>(null);
  promptRef.current = promptEvent;

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register(appUrl("/sw.js")).catch(() => undefined);
    }
    const onBeforeInstall = (e: Event) => {
      // Not preventing this leaves the browser to show its own mini-infobar at a
      // moment we did not choose.
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

  const install = useCallback(async () => {
    const event = promptRef.current;
    if (!event) return;
    setPromptEvent(null);
    await event.prompt().catch(() => undefined);
    const choice = await event.userChoice.catch(() => ({ outcome: "dismissed" as const }));
    // Dismissed means "not now", not "never": put the prompt back.
    if (choice.outcome === "dismissed") setPromptEvent(event);
  }, []);

  return { available: promptEvent !== null, installed, install };
}
