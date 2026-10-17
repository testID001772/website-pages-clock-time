import { Link, type ErrorComponentProps } from "@tanstack/react-router";
import { Compass, TriangleAlert } from "lucide-react";
import { useLocale } from "./i18n";

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  const { t } = useLocale();
  return (
    <main className="flex min-h-screen items-center justify-center bg-void px-6 text-ink">
      <div className="glass panel flex max-w-md flex-col items-center gap-3 text-center">
        <span className="text-sun" aria-hidden="true">
          <TriangleAlert className="size-10" strokeWidth={2} />
        </span>
        <h1 className="h2">{t.errorFallback.title}</h1>
        <p className="max-w-md text-sm break-words text-muted">
          {errorMessage(error, t.errorFallback.message)}
        </p>
      </div>
    </main>
  );
}

/**
 * Router-level 404 (wired as `defaultNotFoundComponent` in `router.tsx`).
 *
 * Without it the router renders its built-in `<p>Not Found</p>` — unstyled, no
 * chrome, no way back — which is what a mistyped URL or a crawler hitting a
 * missing path would see. The response status is still a real 404; this only
 * decides what the body looks like.
 */
export function AppNotFoundComponent() {
  const { t } = useLocale();
  return (
    <main className="flex min-h-screen items-center justify-center bg-void px-6 text-ink">
      <div className="glass panel flex max-w-md flex-col items-center gap-3 text-center">
        <span className="text-ice" aria-hidden="true">
          <Compass className="size-10" strokeWidth={2} />
        </span>
        <h1 className="h2">{t.notFound.title}</h1>
        <p className="max-w-md text-sm text-muted">{t.notFound.message}</p>
        <Link to="/" className="btn btn-primary no-underline">
          {t.notFound.home}
        </Link>
      </div>
    </main>
  );
}
