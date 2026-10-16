import { createFileRoute } from "@tanstack/react-router";
import { EventCountdown } from "@/components/space/event-countdown";

export const Route = createFileRoute("/coming-up")({
  component: ComingUpPage,
});

/** The full Coming up card on its own page: every release, each with its artwork and track. */
function ComingUpPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col items-center px-[1rem] py-[2.5rem] sm:px-[1.5rem]">
      <EventCountdown />
    </main>
  );
}
