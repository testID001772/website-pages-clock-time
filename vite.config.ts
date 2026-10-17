import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import { appEnvPlugin } from "./scripts/app-env-plugin.mjs";

/**
 * Vite config for the Clock Time countdown app.
 *
 * Two shapes come out of this file. The default (dev, `npm run build`, preview)
 * is the server app mounted at `/`. `npm run build:pages` sets `PAGES_BUILD=1`
 * and `PAGES_BASE`, which mounts everything under the project path GitHub Pages
 * serves it from and prerenders the pages to HTML — same app, no server
 * (`scripts/build-pages.mjs` explains the rest).
 *
 * Three plugins, in order:
 *  - `tailwindcss()` — Tailwind v4; `src/styles.css` is the only CSS entry and
 *    `@import "tailwindcss"` is expanded here.
 *  - `appEnvPlugin()` — dev-only `/__app-env`, which `scripts/check-auth-invariant.mjs`
 *    reads to prove the running dev server resolved the same `VITE_AUTH_ENABLED`
 *    the next build will (the plugin stays in the config, not in `dev` only, so a
 *    Vite started outside `scripts/with-app-env.mjs` is still observable).
 *  - `tanstackStart()` — SSR build, file-based routes (`src/routes` →
 *    `src/routeTree.gen.ts`), server functions, `vite preview` SSR middleware.
 *
 * Ports are part of the contract with the sandbox tooling: the dev server owns
 * :8080 (see `scripts/startup.sh`) and the built-output QA preview owns :8081
 * (`scripts/preview.mjs` reads `preview.port` back out of this file). Both are
 * strict, so a port already in use fails loudly instead of silently shifting to
 * a port nobody is watching.
 */
/** The GitHub Pages build: static output mounted under `PAGES_BASE`. */
const pagesBuild = process.env.PAGES_BUILD === "1";
const pagesBase = pagesBuild && process.env.PAGES_BASE ? process.env.PAGES_BASE : "/";
// The isolated Electron 22 package embeds Chromium 108 for Windows 7. Its
// bundle gets a matching target; the ordinary site and maintained desktop build
// continue using Vite's modern default target.
const buildTarget = process.env.VITE_BUILD_TARGET;

export default defineConfig({
  base: pagesBase,
  ...(buildTarget ? { build: { target: buildTarget } } : {}),
  plugins: [
    tailwindcss(),
    appEnvPlugin(),
    // Prerender only for the static host: the server build keeps rendering on
    // demand. `prerender.js` discovers the routes and writes them as
    // `dist/client/**/index.html`; a failure here fails the Pages deploy.
    tanstackStart(pagesBuild ? { prerender: { enabled: true } } : {}),
    // Nitro packages the server build (`.output/`, or `.vercel/output` when the
    // build runs on Vercel). Without it the app has no server entry point and
    // every request 404s. Skipped for the static GitHub Pages build.
    // Build-only: in dev, Nitro's extra environments changed how the route chunks
    // are served, and the dev preview failed to fetch them.
    ...(pagesBuild ? [] : nitro().map((plugin) => ({ ...plugin, apply: "build" as const }))),
    viteReact(),
  ],
  resolve: {
    // `@/*` → `src/*`, matching tsconfig `paths`. Vite does not read tsconfig
    // paths without a plugin, so the alias is declared here too.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
    // The sandbox serves the app through a proxied preview host, so the Host
    // header is not localhost. Vite's host check would otherwise reject it.
    allowedHosts: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 8081,
    strictPort: true,
    allowedHosts: true,
  },
});
