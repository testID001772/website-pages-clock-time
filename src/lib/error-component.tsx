import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
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
      <div className="glass flex max-w-md flex-col items-center gap-3 rounded-[32px] p-8 text-center">
        <span className="text-sun" aria-hidden="true">
          <TriangleAlert className="size-10" strokeWidth={2} />
        </span>
        <h1 className="text-lg font-semibold">{t.errorFallback.title}</h1>
        <p className="max-w-md text-sm break-words text-muted">
          {errorMessage(error, t.errorFallback.message)}
        </p>
      </div>
    </main>
  );
}
