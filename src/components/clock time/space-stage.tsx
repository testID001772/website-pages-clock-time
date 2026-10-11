import type { ReactNode } from "react";
import { useTheme } from "@/components/theme-provider";

export function SpaceStage({ children }: { children: ReactNode }) {
  const { settings } = useTheme();
  return (
    <div className="space-root">
      <div className="space-bg" aria-hidden="true">
        <div
          className="space-bg-custom"
          hidden={!settings.backgroundUrl}
          style={
            settings.backgroundUrl
              ? { backgroundImage: `url(${settings.backgroundUrl})` }
              : undefined
          }
        />
      </div>
      <div className="space-content">{children}</div>
    </div>
  );
}
