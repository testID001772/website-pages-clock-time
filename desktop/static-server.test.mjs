import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, sep } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { isFile, resolveInside, startStaticServer } = require("./static-server.cjs");

const here = fileURLToPath(new URL(".", import.meta.url));
const webRoot = join(here, "web");

// The shell serves the copied static build; without it there is nothing to
// assert against, and "no files" must not read as a pass.
const hasBundle = existsSync(join(webRoot, "index.html"));

test("the bundled site is present (run `npm run app:sync` first)", (t) => {
  if (!hasBundle) t.skip("desktop/web is empty — nothing packaged yet");
  assert.ok(existsSync(join(webRoot, "assets")), "the build's hashed assets are copied too");
});

test("no request path resolves to a file outside the bundle", () => {
  // `normalize` collapses `..` against the leading slash, so these cannot climb
  // out; what matters is that nothing ever lands outside webRoot.
  for (const attempt of [
    "/../../package.json",
    "/..%2f..%2fetc/passwd",
    "/../../../../etc/passwd",
    "/assets/../../../../../../etc/passwd",
  ]) {
    const resolved = resolveInside(webRoot, attempt);
    assert.ok(
      resolved === null || resolved === webRoot || resolved.startsWith(webRoot + sep),
      `${attempt} escaped the bundle: ${resolved}`,
    );
    assert.ok(
      resolved !== join(webRoot, "..", "package.json"),
      `${attempt} reached the repository's own package.json`,
    );
  }
  // A path with no leading slash is the one shape that can climb: refused.
  assert.equal(resolveInside(webRoot, "../../etc/passwd"), null);
  // Ordinary paths stay where they should.
  assert.equal(resolveInside(webRoot, "/assets/app.js"), join(webRoot, "assets", "app.js"));
  // The root resolves to the bundle directory; the handler is what points a
  // request for it at index.html (proved by the fetch of `/` below).
  assert.equal(resolveInside(webRoot, "/"), webRoot);
});

test("a directory is never streamed", (t) => {
  if (!hasBundle) t.skip("desktop/web is empty — nothing packaged yet");
  assert.equal(isFile(join(webRoot, "index.html")), true);
  assert.equal(isFile(join(webRoot, "assets")), false, "a directory is not a file");
  assert.equal(isFile(join(webRoot, "does-not-exist.js")), false);
});

test("the shell serves the app, its assets, and no service worker", async (t) => {
  if (!hasBundle) t.skip("desktop/web is empty — nothing packaged yet");
  const { server, url } = await startStaticServer(webRoot);
  // `close()` alone waits for open sockets, and `fetch` keeps them alive — the
  // run would never end. Drop the connections as well.
  t.after(() => {
    server.close();
    server.closeAllConnections?.();
  });

  const home = await fetch(url);
  const html = await home.text();
  assert.equal(home.status, 200);
  assert.match(home.headers.get("content-type"), /text\/html/);
  assert.match(html, /Clock Time/, "the prerendered shell is what answers");
  assert.match(html, /class="countdown/, "the countdown is in the first paint");

  // The document names its bundle by absolute path; that is the whole reason
  // the shell serves over http instead of file://. Prove one resolves.
  const asset = html.match(/(\/assets\/[^"]+\.js)/)?.[1];
  assert.ok(asset, "index.html references a hashed client bundle");
  const response = await fetch(new URL(asset, url));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /javascript/);

  // A deep link falls through to the shell, so the client router can take it.
  const deep = await fetch(new URL("/world-clock", url));
  assert.equal(deep.status, 200);
  assert.match(await deep.text(), /Clock Time/);

  // No worker: a cached previous release must not survive an app update.
  const sw = await fetch(new URL("/sw.js", url));
  assert.equal(sw.status, 404);

  // A directory request answers with the shell instead of throwing EISDIR —
  // inside a request handler that would be an uncaught exception, i.e. a dead app.
  const directory = await fetch(new URL("/assets", url));
  assert.equal(directory.status, 200);
  assert.match(directory.headers.get("content-type"), /text\/html/);

  // And a traversal attempt must not leak a file from outside the bundle.
  // (undici collapses `..` before it is sent, so this also covers the plain
  // unknown-path case: the answer is the shell, never a stray file.)
  const escape = await fetch(new URL("/../../package.json", url));
  const leaked = await escape.text();
  assert.ok(!leaked.includes('"devDependencies"'), "the repository's package.json was served");
});

test("every file the packaged app needs is in the bundle", (t) => {
  if (!hasBundle) t.skip("desktop/web is empty — nothing packaged yet");
  const flat = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(join(dir, entry.name));
      else flat.push(entry.name);
    }
  };
  walk(webRoot);
  for (const name of ["manifest.webmanifest", "icon-512.png", "favicon.svg", "music" /* dir */]) {
    assert.ok(flat.includes(name) || existsSync(join(webRoot, name)), `${name} is packaged`);
  }
  // The catalogue the static build ships, and the artwork it references.
  const catalogue = JSON.parse(readFileSync(join(webRoot, "music", "library.json"), "utf8"));
  assert.ok(Array.isArray(catalogue.tracks), "the shipped playlist is readable");
});
