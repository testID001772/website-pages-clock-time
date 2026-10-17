import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ANDROID_ASSET,
  DEFAULT_RELEASE_BASE,
  RELEASE_BASE,
  WINDOWS_ASSET,
  WINDOWS_7_X64_ASSET,
  androidDownloadUrl,
  releaseAssetUrl,
  windows7X64DownloadUrl,
  windowsDownloadUrl,
} from "./downloads.ts";

describe("installer links", () => {
  it("points at this repository's latest release", () => {
    // No Vite env under plain node, so the built-in endpoint is in force.
    assert.equal(RELEASE_BASE, DEFAULT_RELEASE_BASE);
    assert.match(RELEASE_BASE, /github\.com\/testID001772\/website-pages-clock-time\/releases\/latest\/download$/);
  });

  it("keeps the asset names version-free so one link stays valid", () => {
    // `releases/latest/download/<name>` resolves by exact name: a version in
    // the filename would break the link on every release.
    assert.equal(WINDOWS_ASSET, "ClockTime-windows-setup.exe");
    assert.equal(WINDOWS_7_X64_ASSET, "ClockTime-windows-legacy-x64-setup.exe");
    assert.equal(ANDROID_ASSET, "ClockTime-android.apk");
    for (const asset of [WINDOWS_ASSET, WINDOWS_7_X64_ASSET, ANDROID_ASSET]) {
      assert.doesNotMatch(asset, /\d+\.\d+\.\d+/, `${asset} carries a version`);
    }
  });

  it("joins the endpoint and the asset exactly once", () => {
    const base = "https://github.com/o/r/releases/latest/download";
    assert.equal(
      releaseAssetUrl(base, WINDOWS_ASSET),
      `${base}/ClockTime-windows-setup.exe`,
    );
    assert.equal(
      releaseAssetUrl(`${base}/`, "/ClockTime-android.apk"),
      `${base}/ClockTime-android.apk`,
      "a trailing slash on one side and a leading one on the other must not double up",
    );
  });

  it("produces the planned installer URLs", () => {
    assert.equal(windowsDownloadUrl(), `${DEFAULT_RELEASE_BASE}/${WINDOWS_ASSET}`);
    assert.equal(
      windows7X64DownloadUrl(),
      `${DEFAULT_RELEASE_BASE}/${WINDOWS_7_X64_ASSET}`,
    );
    assert.equal(androidDownloadUrl(), `${DEFAULT_RELEASE_BASE}/${ANDROID_ASSET}`);
    // A fork can point the links somewhere else without touching the page.
    assert.equal(
      windowsDownloadUrl("https://example.com/dl/"),
      "https://example.com/dl/ClockTime-windows-setup.exe",
    );
  });
});
