import { useEffect } from "react";
import { playSfx, sfxWasPlayedInCurrentTask } from "@/lib/sfx";

/**
 * Fills in a quiet UI tick for controls that do not already choose a sound.
 * Existing handlers can still play their more specific open/pop/chime effect;
 * `sfxWasPlayedInCurrentTask` prevents this delegated handler from doubling it.
 */
export function InteractionSounds() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const control = target.closest<HTMLElement>(
        [
          "button:not(:disabled)",
          "a[href]",
          '[role="button"]:not([aria-disabled="true"])',
          '[role="menuitem"]',
          '[role="menuitemcheckbox"]',
          '[role="menuitemradio"]',
          '[role="switch"]',
          '[role="slider"]',
          "summary",
          "select",
          'input[type="checkbox"]',
          'input[type="radio"]',
          'input[type="range"]',
        ].join(","),
      );
      if (!control || control.closest('[data-sfx="off"]')) return;
      if (sfxWasPlayedInCurrentTask()) return;

      playSfx("click");
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
