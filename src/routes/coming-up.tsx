import { createFileRoute } from "@tanstack/react-router";
import { AppChrome } from "@/components/chrome/app-chrome";
import { SiteFooter } from "@/components/chrome/site-footer";
import { EventCountdown } from "@/components/space/event-countdown";
import { SpaceStage } from "@/components/space/space-stage";
import { useLocale } from "@/lib/i18n";

export const Route = createFileRoute("/coming-up")({
  component: ComingUpPage,
});

/** The full Coming up card on its own page, on the same backdrop as the home screen. */
function ComingUpPage() {
  const { t } = useLocale();
  return (
    <SpaceStage>
      <AppChrome />
      <main className="mx-auto flex w-full max-w-4xl flex-col px-4 pb-8 pt-28">
        <header className="section-head">
          <div>
            <p className="eyebrow">{t.event.label}</p>
            <h1 className="display mt-3">{t.event.title}</h1>
          </div>
        </header>
        <div className="mt-8">
          <EventCountdown variant="page" />
        </div>
        <SiteFooter />
      </main>
    </SpaceStage>
  );
}
