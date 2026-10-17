import type { CSSProperties, ReactNode } from "react";
import { useTheme } from "@/components/theme-provider";
import { resolveBackgroundUrl, resolvePhoneBackgroundUrl } from "@/lib/background";

/**
 * Paints the page backdrop: the gradient lives on `.space-bg` and the image (an
 * upload or the shipped default) on `.space-bg-custom`.
 *
 * v2 stacks three decorative layers on top of that gradient — a pair of
 * drifting aurora fields, a thin star field and a horizon glow under the stage —
 * so the page reads as a sky rather than a flat wash. They are CSS-only (no
 * bitmap, no canvas) and the light theme switches all three off.
 *
 * The stage reads its settings from the theme provider, which the root route
 * seeds from the server — so the background image is part of the first paint,
 * not something that pops in after hydration.
 */
export function SpaceStage({ children }: { children: ReactNode }) {
  const { settings } = useTheme();
  const imageUrl = resolveBackgroundUrl(settings);
  const phoneUrl = resolvePhoneBackgroundUrl(settings);
  return (
    <div className="space-root">
      <div className="space-bg" aria-hidden="true">
        <div
          className="space-bg-custom"
          hidden={!imageUrl}
          // Both URLs travel as custom properties and `styles.css` picks one:
          // the phone copy under 900px, the full-size artwork above it. Setting
          // `background-image` here instead would win over that rule.
          style={
            imageUrl
              ? ({
                  "--bg-image": `url("${imageUrl}")`,
                  "--bg-image-phone": `url("${phoneUrl ?? imageUrl}")`,
                } as CSSProperties)
              : undefined
          }
        />
        <div className="space-aurora" />
        <div className="space-stars" />
        <div className="space-horizon" />
        <div className="space-vignette" />
      </div>
      <div className="space-content">{children}</div>
    </div>
  );
}
