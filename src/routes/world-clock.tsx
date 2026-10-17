import { createFileRoute } from "@tanstack/react-router";
import { AppChrome } from "@/components/chrome/app-chrome";
import { SiteFooter } from "@/components/chrome/site-footer";
import { SpaceStage } from "@/components/space/space-stage";
import { WorldClockDashboard } from "@/components/world-clock/world-clock-dashboard";

export const Route = createFileRoute("/world-clock")({
  component: WorldClockPage,
});

/** The clocks on the same stage as the countdown, with the app's own chrome. */
function WorldClockPage() {
  return (
    <SpaceStage>
      <AppChrome />
      <main className="mx-auto w-full max-w-6xl px-4 pb-8 pt-28 sm:px-6">
        <WorldClockDashboard />
        <SiteFooter />
      </main>
    </SpaceStage>
  );
}
