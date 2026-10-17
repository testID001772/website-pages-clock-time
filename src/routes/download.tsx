import { createFileRoute } from "@tanstack/react-router";
import {
  AppWindow,
  Download,
  Info,
  Monitor,
  Smartphone,
  Tablet,
} from "lucide-react";
import { AppChrome } from "@/components/chrome/app-chrome";
import { SiteFooter } from "@/components/chrome/site-footer";
import { SpaceStage } from "@/components/space/space-stage";
import { useLocale } from "@/lib/i18n";
import { APP_VERSION } from "@/lib/version";
import { useInstallPrompt } from "@/lib/use-install-prompt";
import { playSfx } from "@/lib/sfx";

export const Route = createFileRoute("/download")({ component: DownloadPage });

/** A compact status row for native platform targets. */
function DownloadStatusRow({
  label,
  status,
}: {
  label: string;
  status: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
      <span className="text-sm text-ink">{label}</span>
      <span className="badge flex-none text-xs">{status}</span>
    </div>
  );
}

function DownloadPage() {
  const { t } = useLocale();
  const { available, installed, install } = useInstallPrompt();

  const onInstall = () => {
    playSfx("click");
    void install();
  };

  return (
    <SpaceStage>
      <AppChrome />
      <main className="mx-auto w-full max-w-4xl px-4 pb-8 pt-28">
        <header className="section-head">
          <div>
            <p className="eyebrow">{t.download.version(APP_VERSION)}</p>
            <h1 className="display mt-3">{t.download.title}</h1>
            <p className="lede mt-3">{t.download.subtitle}</p>
          </div>
        </header>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <section className="glass panel flex flex-col">
            <span className="text-ice" aria-hidden="true">
              <Monitor className="size-7" strokeWidth={1.75} />
            </span>
            <h2 className="h2 mt-4">{t.download.windows}</h2>
            <p className="lede mt-2">{t.download.windowsBlurb}</p>
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-ink">
                {t.download.windowsLegacy}
              </h3>
              <div className="mt-2 grid gap-2">
                <DownloadStatusRow
                  label={t.download.windowsLegacyX64Action}
                  status={t.download.done}
                />
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              <DownloadStatusRow
                label={`${t.download.windows} 10 · x64`}
                status={t.download.comingLater}
              />
              <DownloadStatusRow
                label={`${t.download.windows} 11 · x64`}
                status={t.download.comingLater}
              />
            </div>
            <p className="micro mt-4 leading-relaxed normal-case tracking-normal text-sun">
              {t.download.windowsLegacyBlurb}
            </p>
          </section>

          <section className="glass panel flex flex-col">
            <span className="text-mint" aria-hidden="true">
              <Smartphone className="size-7" strokeWidth={1.75} />
            </span>
            <h2 className="h2 mt-4">{t.download.android}</h2>
            <p className="lede mt-2 flex-1">{t.download.androidBlurb}</p>
            <div className="mt-auto pt-5">
              <DownloadStatusRow
                label={`${t.download.android} 8+`}
                status={t.download.comingLater}
              />
            </div>
          </section>

          <section className="glass panel flex flex-col">
            <span className="text-ice" aria-hidden="true">
              <Smartphone className="size-7" strokeWidth={1.75} />
            </span>
            <h2 className="h2 mt-4">iPhone</h2>
            <div className="mt-auto pt-5">
              <DownloadStatusRow
                label="iPhone"
                status={t.download.comingLater}
              />
            </div>
          </section>

          <section className="glass panel flex flex-col">
            <span className="text-ice" aria-hidden="true">
              <Tablet className="size-7" strokeWidth={1.75} />
            </span>
            <h2 className="h2 mt-4">iPad</h2>
            <div className="mt-auto pt-5">
              <DownloadStatusRow label="iPad" status={t.download.comingLater} />
            </div>
          </section>

          <section className="glass panel flex flex-col sm:col-span-2 lg:col-span-1">
            <span className="text-aurora" aria-hidden="true">
              <AppWindow className="size-7" strokeWidth={1.75} />
            </span>
            <h2 className="h2 mt-4">{t.download.pwa}</h2>
            <p className="lede mt-2 flex-1">{t.download.pwaBlurb}</p>
            {/* The browser only offers an install once it has decided the app
                qualifies; until then (and forever on iOS) the menu path is the
                one that works, so say so instead of showing a dead button. */}
            {available ? (
              <button
                type="button"
                className="btn btn-ghost mt-5 w-full"
                onClick={onInstall}
                disabled={installed}
              >
                <Download className="size-4" />
                {t.download.pwaAction}
              </button>
            ) : (
              <p className="micro mt-5 leading-relaxed normal-case tracking-normal">
                {t.download.pwaHowTo}
              </p>
            )}
          </section>
        </div>

        <section className="glass panel-tight mt-5 flex items-start gap-3">
          <span className="mt-0.5 shrink-0 text-ice" aria-hidden="true">
            <Info className="size-5" strokeWidth={1.75} />
          </span>
          <p className="text-sm text-muted">{t.download.nativeVersionsNote}</p>
        </section>

        <SiteFooter />
      </main>
    </SpaceStage>
  );
}
