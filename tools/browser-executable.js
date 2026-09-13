"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

// Environment overrides win first so CI (CHROME_PATH from the Playwright
// install) and per-worktree toolchains can point every browser-backed gate
// at one executable; hardcoded Windows install paths stay as last resorts.
const environmentCandidates = [
  process.env.CHROME_PATH,
  process.env.EDGE_PATH,
  process.env.BROWSER,
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/microsoft-edge",
].filter(Boolean);

function resolveBrowserExecutable(localCandidates = []) {
  const candidates = [...environmentCandidates, ...localCandidates];
  return candidates.find((candidate) => {
    if (path.isAbsolute(candidate)) return fs.existsSync(candidate);
    return spawnSync(process.platform === "win32" ? "where.exe" : "which", [candidate], {
      stdio: "ignore",
      windowsHide: true,
    }).status === 0;
  }) || "";
}

module.exports = { resolveBrowserExecutable };
