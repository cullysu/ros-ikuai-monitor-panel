#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const panel = path.join(root, "src", "panel-framework");
const owner = path.join(panel, "mobile-flow-ui");
const shell = path.join(panel, "mobile");
const failures = [];
const required = [
  "overview/mobileFlowModel.ts", "overview/MobileFlowOverview.tsx",
  "navigation/MobileFlowNavigation.tsx", "workspace/MobileFlowWorkspace.tsx", "workspace/MobileFlowRoutes.tsx",
  "connection/MobileFlowConnection.tsx", "styles/flow-overview.css", "styles/flow-navigation.css",
  "styles/flow-workspace.css", "styles/flow-directory.css", "styles/flow-connection.css",
];
const retiredOwners = ["mobile-native-ui", "mobile-ops-ui", "mobile-patrol", "mobile-ikuai4", "mobile-origin", "mobile-glance", "mobile-pulse-ui", "mobile-next", "mobile-origin-space", "mobile-atomic"];
const retiredMarkers = /MobileNative|mobile-native-ui|data-mobile-native|\bmni-|\bmnw-|\bmnc-|MobileOps|mobile-ops-ui|data-mobile-ops|\bmou-|\bmow-|\bmop-|MobilePatrol|mobile-patrol|MobilePulse|mobile-pulse-ui|data-mobile-pulse|IkuaiMobile|mobile-ikuai4|data-mobile-patrol|data-ikuai-mobile|data-origin-navigation/;
const read = (file) => fs.readFileSync(file, "utf8");
const relative = (file) => path.relative(root, file).replace(/\\/g, "/");
const walk = (dir) => !fs.existsSync(dir) ? [] : fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const target = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(target) : /\.(?:ts|tsx|css)$/.test(entry.name) ? [target] : [];
});
const expect = (condition, message) => { if (!condition) failures.push(message); };
for (const file of required) expect(fs.existsSync(path.join(owner, file)), `missing-mobile-flow-ui-owner-file:${file}`);
for (const retired of retiredOwners) expect(!fs.existsSync(path.join(panel, retired)), `retired-owner-still-exists:${retired}`);
for (const file of walk(owner)) {
  const source = read(file); const entry = relative(file);
  expect(!retiredMarkers.test(source), `retired-presentation-reference:${entry}`);
  if (!file.endsWith(".css")) continue;
  expect(!/!important\b/i.test(source), `important:${entry}`);
  expect(!/transition\s*:\s*all(?:\s|,|;|$)|transition-property\s*:\s*all\b/i.test(source), `unbounded-transition:${entry}`);
}
function mounted(source, name) {
  for (const component of ["MobileFlowOverview", "MobileFlowNavigation", "MobileFlowRoutes", "MobileFlowConnection"]) expect(new RegExp(`\\b${component}\\b`).test(source), `${name}:mobile-flow-ui-not-completely-mounted:${component}`);
  expect(!retiredMarkers.test(source), `${name}:retired-mobile-owner-mounted`);
}
const mobileApp = read(path.join(shell, "MobilePanelApp.tsx"));
const sharedApp = read(path.join(panel, "panel-framework-app.tsx"));
mounted(mobileApp, "MobilePanelApp"); mounted(sharedApp, "panel-framework-app");
expect(/OverviewPanel/.test(sharedApp) && /OperationalSectionPage/.test(sharedApp) && /PanelTaskNavigation/.test(sharedApp) && /RouterConnectionScreen/.test(sharedApp), "panel-framework-app:desktop-composition-not-independent");
const entryCss = read(path.join(shell, "mobile-entry.css"));
for (const stylesheet of ["flow-overview", "flow-navigation", "flow-workspace", "flow-directory", "flow-connection"]) expect(new RegExp(`mobile-flow-ui/styles/${stylesheet}\\.css`).test(entryCss), `mobile-entry:mobile-flow-ui-style-not-owned:${stylesheet}`);
expect(!retiredMarkers.test(entryCss), "mobile-entry:retired-owner-imported");
const report = { contract: "mobile-flow-ui-architecture-v1", pass: failures.length === 0, owner: relative(owner), requiredFiles: required.length, retiredMobileNativeAbsent: !fs.existsSync(path.join(panel, "mobile-native-ui")), retiredMobileOpsAbsent: !fs.existsSync(path.join(panel, "mobile-ops-ui")), failures };
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exitCode = report.pass ? 0 : 1;
