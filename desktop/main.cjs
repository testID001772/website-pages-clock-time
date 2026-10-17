/**
 * Clock Time desktop shell.
 *
 * The app it wraps is the *static* build (`npm run build:pages`), copied into
 * `desktop/web` by `scripts/sync-web.mjs`. That build is prerendered HTML plus
 * a client bundle with no server behind it, so the packaged app runs with no
 * network at all — no Node server, no database, no Better Auth.
 *
 * The serving itself lives in `static-server.cjs`, which is Electron-free and
 * therefore testable (`desktop/static-server.test.mjs`).
 */
const { app, BrowserWindow, Menu, shell } = require("electron");
const { join } = require("node:path");
const { startStaticServer } = require("./static-server.cjs");

const WEB_ROOT = join(__dirname, "web");

let mainWindow = null;
let staticServer = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 420,
    minHeight: 620,
    backgroundColor: "#04040c",
    autoHideMenuBar: true,
    title: "Clock Time",
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // The app is the whole product; there is nothing to navigate away to, so
  // external links open in the real browser instead of replacing the window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });

  await mainWindow.loadURL(staticServer.url);
}

app.whenReady().then(async () => {
  // A packaged app has no menu bar to reach; keep the shortcuts, drop the chrome.
  Menu.setApplicationMenu(null);
  try {
    staticServer = await startStaticServer(WEB_ROOT);
  } catch (err) {
    console.error("[clock-time] could not start the bundled site:", err);
    app.quit();
    return;
  }
  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("quit", () => {
  staticServer?.server.close();
});
