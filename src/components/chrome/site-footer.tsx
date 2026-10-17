import { Link } from "@tanstack/react-router";
import { APP_VERSION } from "@/lib/version";
import { useLocale } from "@/lib/i18n";

/**
 * The strip the public pages end on: where the app came from, where it is now.
 *
 * v2 marks its own build here — the version the service worker names its cache
 * after — so a reader on a stale shell can see which release they are looking
 * at without opening devtools.
 */
export function SiteFooter() {
  const { t } = useLocale();
  return (
    <footer className="site-foot w-full">
      <p className="micro">
        Clock Time <span className="badge badge-accent ms-1">{APP_VERSION}</span>
      </p>
      <p className="text-xs text-muted">
        {/* `exact`: "/" prefix-matches every route, and without this the footer
            would claim aria-current="page" for Home on every screen. */}
        <Link
          to="/"
          activeOptions={{ exact: true }}
          className="text-ink no-underline underline-offset-4 hover:underline"
        >
          {t.nav.home}
        </Link>
        <span aria-hidden="true" className="px-2 opacity-40">
          /
        </span>
        <Link to="/download" className="text-ink no-underline underline-offset-4 hover:underline">
          {t.download.footer}
        </Link>
      </p>
    </footer>
  );
}
