/**
 * Where the installers come from.
 *
 * The APK and the Windows installer are built by the `Build installers`
 * workflow and attached to a GitHub release, so the site links at the release
 * endpoint rather than at a build number: `releases/latest/download/<asset>`
 * always resolves to the newest published file, and the asset names are
 * therefore *stable* (no version in them) — that is what makes one link valid
 * forever.
 *
 * `import.meta.env` is undefined under plain node (the unit tests run there), so
 * the read is defensive, the same way `base-url.ts` does it. `VITE_RELEASE_BASE`
 * overrides the endpoint for a fork.
 */
type AppEnv = {
  VITE_RELEASE_BASE?: string;
};

const env: AppEnv = import.meta.env ?? {};

/** This repository's "latest release" download endpoint. */
export const DEFAULT_RELEASE_BASE =
  "https://github.com/testID001772/website-pages-clock-time/releases/latest/download";

/** The endpoint in force, with no trailing slash. */
export const RELEASE_BASE: string =
  env.VITE_RELEASE_BASE && env.VITE_RELEASE_BASE.length > 0
    ? env.VITE_RELEASE_BASE.replace(/\/+$/, "")
    : DEFAULT_RELEASE_BASE;

/** Names must match what the workflow uploads, or the links 404. */
export const WINDOWS_ASSET = "ClockTime-windows-setup.exe";
export const WINDOWS_7_X64_ASSET = "ClockTime-windows-legacy-x64-setup.exe";
export const ANDROID_ASSET = "ClockTime-android.apk";

/** Pure join, so the URLs can be tested without a Vite environment. */
export function releaseAssetUrl(base: string, asset: string): string {
  const root = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${root}/${asset.replace(/^\/+/, "")}`;
}

export function windowsDownloadUrl(base = RELEASE_BASE): string {
  return releaseAssetUrl(base, WINDOWS_ASSET);
}

export function windows7X64DownloadUrl(base = RELEASE_BASE): string {
  return releaseAssetUrl(base, WINDOWS_7_X64_ASSET);
}

export function androidDownloadUrl(base = RELEASE_BASE): string {
  return releaseAssetUrl(base, ANDROID_ASSET);
}
