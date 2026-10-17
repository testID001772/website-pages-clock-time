import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Clock Time as an Android app.
 *
 * The app packages the same static build GitHub Pages serves
 * (`npm run build:pages` → `dist/client`), so it needs no server, no database
 * and no network after install. `VITE_STATIC_SITE` is set by that build, which
 * is also what drops the sign-in UI — there is nothing to sign in to offline.
 *
 * `androidScheme: "https"` matters: the build mounts its assets at absolute
 * paths (`/assets/…`), and the WebView serves `webDir` from the root of that
 * scheme, so those paths resolve exactly as they do on the deployed site.
 */
const config: CapacitorConfig = {
  appId: "app.clocktime.mobile",
  appName: "Clock Time",
  webDir: "dist/client",
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
