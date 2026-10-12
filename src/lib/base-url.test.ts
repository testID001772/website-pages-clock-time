import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ASSET_BASE, BASE_URL, joinBase, STATIC_SITE, appUrl } from "./base-url.ts";

describe("mount point", () => {
  it("is the origin root under plain node (no Vite env)", () => {
    // The unit tests run outside Vite, which is also the dev/preview shape:
    // every helper is the identity.
    assert.equal(BASE_URL, "/");
    assert.equal(ASSET_BASE, "/");
    assert.equal(STATIC_SITE, false, "a test run is never the static site build");
    assert.equal(appUrl("/background.jpg"), "/background.jpg");
    assert.equal(appUrl("/api/music/"), "/api/music/");
  });

  it("keeps URLs that are not app-absolute untouched", () => {
    for (const url of ["https://cdn.example.com/song.mp3", "data:audio/mpeg;base64,QUJD", "music/x.mp3", ""]) {
      assert.equal(appUrl(url), url);
      assert.equal(joinBase("/website-pages-clock-time-/", url), url);
    }
  });

  it("joins a GitHub project-site mount point exactly once", () => {
    const base = "/website-pages-clock-time-/";
    assert.equal(joinBase(base, "/background.jpg"), `${base}background.jpg`);
    assert.equal(joinBase("/website-pages-clock-time-", "/favicon.svg"), `${base}favicon.svg`);
    assert.equal(joinBase("/", "/favicon.svg"), "/favicon.svg");
    assert.equal(appUrl("/music/first-light.mp3"), "/music/first-light.mp3");
  });
});
