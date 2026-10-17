import { createFileRoute } from "@tanstack/react-router";
import { AppChrome } from "@/components/chrome/app-chrome";
import { EventCountdown } from "@/components/space/event-countdown";
import { SpaceStage } from "@/components/space/space-stage";

export const Route = createFileRoute("/coming-up")({
  component: ComingUpPage,
});

/** The full Coming up card on its own page, on the same backdrop as the home screen. */
function ComingUpPage() {
  return (
    <SpaceStage>
      <AppChrome />
      <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col items-center justify-center px-4 pb-16 pt-24">
        <EventCountdown variant="page" />
      </main>
    </SpaceStage>
  );
}
