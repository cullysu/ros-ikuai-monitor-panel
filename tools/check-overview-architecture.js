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
const retiredOwners = ["mobile-native-ui", "mobile-ops-ui", "mobile-pulse-ui", "mobile-patrol", "mobile-ikuai4", "mobile-origin", "mobile-glance", "mobile-next", "mobile-origin-space", "mobile-atomic"];
const retiredMarker = /MobileNative|mobile-native-ui|data-mobile-native|\bmni-|\bmnw-|\bmnc-|MobileOps|mobile-ops-ui|data-mobile-ops|\bmou-|\bmow-|\bmop-|MobilePulse|mobile-pulse-ui|data-mobile-pulse|MobilePatrol|mobile-patrol|data-mobile-patrol|IkuaiMobile|mobile-ikuai4|data-ikuai-mobile|data-origin-navigation/;
const read = (file) => fs.readFileSync(file, "utf8");
const relative = (file) => path.relative(root, file).replace(/\\/g, "/");
const walk = (directory) => !fs.existsSync(directory) ? [] : fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const target = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(target) : /\.(?:ts|tsx|css)$/.test(entry.name) ? [target] : [];
});
const expect = (condition, message) => { if (!condition) failures.push(message); };

required.forEach((entry) => expect(fs.existsSync(path.join(owner, entry)), `missing mobile-flow-ui owner file: ${entry}`));
retiredOwners.forEach((entry) => expect(!fs.existsSync(path.join(panel, entry)), `retired mobile presentation owner still exists: ${entry}`));
for (const target of walk(owner)) {
  const content = read(target);
  expect(!retiredMarker.test(content), `mobile-flow-ui references a rejected owner: ${relative(target)}`);
  if (target.endsWith(".css")) {
    expect(!/!important\b/i.test(content), `mobile-flow-ui CSS uses !important: ${relative(target)}`);
    expect(!/transition\s*:\s*all(?:\s|,|;|$)|transition-property\s*:\s*all\b/i.test(content), `mobile-flow-ui CSS uses an unbounded transition: ${relative(target)}`);
  }
}
const overviewSource = read(path.join(panel, "overview", "OverviewPanel.tsx"));
expect(/DesktopOverviewScreen/.test(overviewSource), "OverviewPanel does not preserve the independent desktop entry");
expect(!/MobileNative|mobile-native-ui|data-mobile-native|MobileFlow|mobile-flow-ui|data-mobile-flow/.test(overviewSource), "OverviewPanel is coupled to the independent mobile owner");
function completeMobileOwner(source, name) {
  for (const component of ["MobileFlowOverview", "MobileFlowNavigation", "MobileFlowRoutes", "MobileFlowConnection"]) {
    expect(new RegExp(`\\b${component}\\b`).test(source), `${name} does not mount the complete mobile-flow-ui owner (${component} missing)`);
  }
  expect(!retiredMarker.test(source), `${name} still references a rejected mobile presentation`);
}
completeMobileOwner(read(path.join(shell, "MobilePanelApp.tsx")), "MobilePanelApp");
const sharedApp = read(path.join(panel, "panel-framework-app.tsx"));
completeMobileOwner(sharedApp, "panel-framework-app");
expect(/OverviewPanel/.test(sharedApp) && /OperationalSectionPage/.test(sharedApp) && /PanelTaskNavigation/.test(sharedApp) && /RouterConnectionScreen/.test(sharedApp), "panel-framework-app does not preserve independent desktop composition");
const entryCss = read(path.join(shell, "mobile-entry.css"));
for (const stylesheet of ["flow-overview", "flow-navigation", "flow-workspace", "flow-directory", "flow-connection"]) {
  expect(new RegExp(`mobile-flow-ui/styles/${stylesheet}\\.css`).test(entryCss), `mobile shell does not load mobile-flow-ui ${stylesheet} styles`);
}
expect(!retiredMarker.test(entryCss), "mobile shell still imports a rejected presentation stylesheet");
if (failures.length) {
  console.error("mobile-flow-ui overview architecture gate: FAIL");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("mobile-flow-ui overview architecture gate: PASS");
console.log("Checked isolated Mobile Flow ownership, complete mounts, independent desktop composition, rejected-owner absence, and dedicated mobile stylesheet ownership.");
