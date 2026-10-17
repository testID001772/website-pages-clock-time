/**
 * Preload runs isolated from the page. The site needs nothing from Node, so all
 * this exposes is the packaged version, which the window title can carry.
 */
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("clockTimeDesktop", {
  version: require("./package.json").version,
  platform: process.platform,
});
