import { createFileRoute } from "@tanstack/react-router";
import {
  AppWindow,
  Download,
  Monitor,
  ShieldAlert,
  Smartphone,
} from "lucide-react";
import { AppChrome } from "@/components/chrome/app-chrome";
import { SiteFooter } from "@/components/chrome/site-footer";
import { SpaceStage } from "@/components/space/space-stage";
import { useLocale } from "@/lib/i18n";
import { APP_VERSION } from "@/lib/version";
import {
  androidDownloadUrl,
  windows7Ia32DownloadUrl,
  windows7X64DownloadUrl,
  windowsDownloadUrl,
} from "@/lib/downloads";
import { useInstallPrompt } from "@/lib/use-install-prompt";
import { playSfx } from "@/lib/sfx";

export const Route = createFileRoute("/download")({ component: DownloadPage });

const BROWSER_INSTALLERS = [
  { name: "Google Chrome", url: "https://www.google.com/chrome/" },
  { name: "Mozilla Firefox", url: "https://www.mozilla.org/firefox/new/" },
  { name: "Microsoft Edge", url: "https://www.microsoft.com/edge/download" },
] as const;

/**
 * Where the installers are handed over.
 *
 * Three ways to get the app, in the order a visitor is likely to want them:
 * the Windows installer, the Android APK and — for everyone else — the browser
 * install, which needs no file at all. The two files link at the GitHub release
 * endpoint (see `@/lib/downloads`), so this page never has to change when a new
 * build is published.
 */
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
            <p className="lede mt-2 flex-1">{t.download.windowsBlurb}</p>
            <a
              href={windowsDownloadUrl()}
              className="btn btn-primary mt-5 w-full"
              download
            >
              <Download className="size-4" />
              {t.download.windowsAction}
            </a>
            <div className="mt-5 border-t border-white/10 pt-4">
              <h3 className="text-sm font-semibold text-ink">
                {t.download.windowsLegacy}
              </h3>
              <p className="micro mt-2 leading-relaxed normal-case tracking-normal text-sun">
                {t.download.windowsLegacyBlurb}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <a
                  href={windows7X64DownloadUrl()}
                  className="btn btn-ghost w-full text-xs"
                  download
                >
                  <Download className="size-4" />
                  {t.download.windowsLegacyX64Action}
                </a>
                <a
                  href={windows7Ia32DownloadUrl()}
                  className="btn btn-ghost w-full text-xs"
                  download
                >
                  <Download className="size-4" />
                  {t.download.windowsLegacyX86Action}
                </a>
              </div>
            </div>
          </section>

          <section className="glass panel flex flex-col">
            <span className="text-mint" aria-hidden="true">
              <Smartphone className="size-7" strokeWidth={1.75} />
            </span>
            <h2 className="h2 mt-4">{t.download.android}</h2>
            <p className="lede mt-2 flex-1">{t.download.androidBlurb}</p>
            <a
              href={androidDownloadUrl()}
              className="btn btn-primary mt-5 w-full"
              download
            >
              <Download className="size-4" />
              {t.download.androidAction}
            </a>
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
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="micro mb-2 normal-case tracking-normal">
                {t.download.browserInstallers}
              </p>
              <div className="grid gap-2">
                {BROWSER_INSTALLERS.map((browser) => (
                  <a
                    key={browser.name}
                    href={browser.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost w-full justify-between"
                    aria-label={`Get ${browser.name} from its official download page`}
                  >
                    <span>{browser.name}</span>
                    <Download className="size-4" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          </section>
        </div>

        <section className="glass panel-tight mt-5 flex items-start gap-3">
          <span className="mt-0.5 shrink-0 text-sun" aria-hidden="true">
            <ShieldAlert className="size-5" strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-sm text-muted">{t.download.unsigned}</p>
            <p className="mt-2 text-xs text-muted">{t.download.rebuilt}</p>
          </div>
        </section>

        <SiteFooter />
      </main>
    </SpaceStage>
  );
}
