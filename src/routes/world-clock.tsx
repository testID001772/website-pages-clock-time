import { createFileRoute } from "@tanstack/react-router";
import { WorldClockDashboard } from "@/components/world-clock/world-clock-dashboard";

export const Route = createFileRoute("/world-clock")({
  component: WorldClockPage,
});

function WorldClockPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <WorldClockDashboard />
    </main>
  );
}
