/**
 * The loopback static server the desktop shell serves its bundled site from.
 *
 * Kept out of `main.cjs` on purpose: this module has no Electron dependency, so
 * `desktop/static-server.test.mjs` can boot it and assert what a packaged app
 * would actually serve — without a window, and without the Electron binary.
 *
 * Why a server at all: the build mounts its assets at absolute paths
 * (`/assets/…`), which a `file://` document cannot resolve, and `http://` also
 * keeps `fetch` and the router behaving exactly as they do in a browser.
 */
const { createServer } = require("node:http");
const { createReadStream, statSync } = require("node:fs");
const { extname, join, normalize, sep } = require("node:path");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

/** True only for a readable regular file — directories must not be streamed. */
function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/**
 * Resolve a request path inside `webRoot`. Returns null when the path escapes
 * the bundle, which the caller turns into a 403 rather than a file read.
 */
function resolveInside(webRoot, pathname) {
  const relative = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, "");
  const resolved = join(webRoot, relative);
  const within = resolved === webRoot || resolved.startsWith(webRoot + sep);
  return within ? resolved : null;
}

/**
 * Serve `webRoot` on an ephemeral loopback port — 127.0.0.1 only, because the
 * bundled site is for this window and not for the rest of the network.
 *
 * Unknown paths answer with `index.html` so the client router owns deep links
 * (`/dashboard`, `/world-clock`) the same way `404.html` does on GitHub Pages.
 */
function startStaticServer(webRoot) {
  const index = join(webRoot, "index.html");
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const pathname = url.pathname;

    // The web app registers a service worker so an installed PWA works offline.
    // Here the files are already on disk, and a worker that had cached the
    // previous release would keep serving it after an update — so the shell has
    // none. The registration rejects and the app ignores the failure.
    if (pathname === "/sw.js") {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("no service worker in the desktop shell");
      return;
    }

    const resolved = resolveInside(webRoot, pathname === "/" ? "/index.html" : pathname);
    if (!resolved) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }

    // Only a *file* is served. `existsSync` is true for the bundle's directories
    // too (`/assets`, `/music`), and streaming one throws EISDIR — inside a
    // request handler that is an uncaught exception, i.e. a dead app. Anything
    // that is not a file falls through to the shell, like an unknown path.
    const file = isFile(resolved) ? resolved : index;
    res.writeHead(200, {
      "Content-Type": TYPES[extname(file).toLowerCase()] ?? "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    const stream = createReadStream(file);
    // A read failure (a file replaced under us mid-response) must not take the
    // window down with it.
    stream.on("error", () => res.destroy());
    stream.pipe(res);
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (typeof address !== "object" || !address) {
        reject(new Error("static server did not bind a port"));
        return;
      }
      resolve({ server, url: `http://127.0.0.1:${address.port}/` });
    });
  });
}

module.exports = { isFile, resolveInside, startStaticServer, TYPES };
