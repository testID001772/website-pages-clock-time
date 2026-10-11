import { RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n";
import { playSfx } from "@/lib/sfx";

/**
 * "A new version is ready — Reload" pill. Whenever the service worker
 * installs an update (deployed changes, dev edits), the browser keeps
 * serving the already-loaded old page until reload; this banner makes that
 * moment visible instead of leaving the user on a stale page wondering why
 * nothing changed. Hidden entirely when there is no SW support.
 */
export function UpdateBanner() {
  const { t } = useLocale();
  const [updateReady, setUpdateReady] = useState(false);
  const reloadRef = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let registration: ServiceWorkerRegistration | undefined;
    const onControllerChange = () => {
      // A new SW took over — reload once to run the new shell.
      if (reloadRef.current) window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    void navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        registration = reg;
        reg.addEventListener("updatefound", () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller &&
              !reloadRef.current
            ) {
              setUpdateReady(true);
            }
          });
        });
      })
      .catch(() => undefined);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      registration?.removeEventListener("updatefound", () => undefined);
    };
  }, []);

  if (!updateReady) return null;

  const reload = () => {
    playSfx("click");
    reloadRef.current = true;
    void navigator.serviceWorker.getRegistration().then((reg) => {
      const waiting = reg?.waiting;
      if (waiting) {
        waiting.postMessage("skip-waiting");
      } else {
        window.location.reload();
      }
    });
  };

  return (
    <div className="update-banner glass" role="status" aria-live="polite">
      <p className="text-xs font-medium text-ink">{t.chrome.updateReady}</p>
      <button type="button" className="btn btn-ghost !h-8 !px-3 text-xs" onClick={reload}>
        <RefreshCw className="size-3.5" />
        {t.chrome.reload}
      </button>
    </div>
  );
}
