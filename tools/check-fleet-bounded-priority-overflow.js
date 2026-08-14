"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const screen = fs.readFileSync(path.join(
  root,
  "src",
  "panel-framework",
  "overview",
  "desktop-overview",
  "DesktopOverviewScreen.tsx",
), "utf8");
const layoutCss = fs.readFileSync(path.join(
  root,
  "src",
  "panel-framework",
  "overview",
  "desktop-overview",
  "styles",
  "desktop-overview.css",
), "utf8");
const currentDesktopCss = fs.readFileSync(path.join(
  root,
  "src",
  "panel-framework",
  "overview",
  "desktop-overview",
  "styles",
  "desktop-next.css",
), "utf8");
const runtimeCheck = fs.readFileSync(path.join(root, "tools", "check-panel-runtime-browser.js"), "utf8");

assert.match(
  screen,
  /className="do-fleet-preview-content" id=\{fleetPreviewId\}/,
  "Fleet Ledger must expose a dedicated shrinkable content wrapper",
);

const shrinkRule = layoutCss.match(
  /\.do-fleet-preview,\s*\.do-fleet-preview-content\s*\{([^}]*)\}/,
);
assert(shrinkRule, "Fleet preview and its Ledger wrapper must share one shrink rule");
assert.match(shrinkRule[1], /min-width:\s*0\s*;/, "the nested grid item must be allowed to shrink inside its 1200px track");
assert.doesNotMatch(shrinkRule[1], /overflow/, "the fix must constrain intrinsic width rather than hide overflow");
assert.match(currentDesktopCss, /\.do-normal-focus-column,\s*\.do-normal-signal\s*\{[^}]*min-width:\s*0\s*;/s, "the parent desktop grid item must remain shrinkable");
assert.match(runtimeCheck, /fleetCoverage1200\.overflow <= 1/, "the runtime overflow gate must remain strict");

process.stdout.write(`${JSON.stringify({
  pass: true,
  contract: "fleet-1200-intrinsic-width-v1",
  mechanism: "nested-grid-min-width-zero",
  overflowGate: "<=1",
}, null, 2)}\n`);
