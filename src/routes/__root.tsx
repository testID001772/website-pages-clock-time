import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { LocaleProvider } from "@/lib/i18n";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { ThemeProvider } from "@/components/theme-provider";
import { appUrl } from "@/lib/base-url";
import { getPublicSettings } from "@/lib/server/site";
import { DEFAULT_SETTINGS } from "@/lib/types";
import appCss from "../styles.css?url";

const APP_NAME = "Clock Time";

export const Route = createRootRoute({
  /**
   * Site settings are fetched on the server for the first paint, so the
   * background image and glass values are in the HTML before hydration. Never
   * throws — an unreachable database degrades to the defaults.
   */
  loader: () => getPublicSettings().catch(() => DEFAULT_SETTINGS),
  staleTime: 5 * 60_000,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "theme-color", content: "#050505" },
      {
        name: "description",
        content:
          "Clock Time — a cinematic countdown to New Year with glass controls, event countdowns, and member orbits.",
      },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: APP_NAME },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: appUrl("/favicon.svg") },
      { rel: "manifest", href: appUrl("/manifest.webmanifest") },
      { rel: "apple-touch-icon", sizes: "180x180", href: appUrl("/apple-touch-icon.png") },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  const initialSettings = Route.useLoaderData();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <ThemeProvider initialSettings={initialSettings}>
            <LocaleProvider>
              <Outlet />
            </LocaleProvider>
          </ThemeProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
