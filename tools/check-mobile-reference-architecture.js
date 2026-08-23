#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const panel = path.join(root, "src", "panel-framework");
const owner = path.join(panel, "mobile-reference-ui");
const shell = path.join(panel, "mobile");
const failures = [];
const required = ["MobileReferenceSurface.tsx", "MobileReferenceConnection.tsx", "mobile-reference.css"];
const retiredOwners = [
  "mobile-situation-ui", "mobile-flow-ui", "mobile-native-ui", "mobile-ops-ui", "mobile-inspection-ui",
  "mobile-ikuai-ui", "mobile-patrol", "mobile-origin", "mobile-glance", "mobile-pulse-ui", "mobile-next",
  "mobile-origin-space", "mobile-atomic",
];
const retiredMarkers = /MobileSituation|mobile-situation-ui|MobileFlow|mobile-flow-ui|MobileNative|mobile-native-ui|MobileOps|mobile-ops-ui|MobileInspection|mobile-inspection-ui|data-mobile-inspection|MobileIkuai|mobile-ikuai-ui|data-mobile-ikuai/;
const read = (file) => fs.readFileSync(file, "utf8");
const expect = (condition, message) => { if (!condition) failures.push(message); };

for (const file of required) expect(fs.existsSync(path.join(owner, file)), `missing-mobile-reference-file:${file}`);
for (const retired of retiredOwners) expect(!fs.existsSync(path.join(panel, retired)), `retired-owner-still-exists:${retired}`);

for (const file of required) {
  const target = path.join(owner, file);
  if (!fs.existsSync(target)) continue;
  const source = read(target);
  expect(!retiredMarkers.test(source), `retired-presentation-reference:${file}`);
  if (file.endsWith(".css")) {
    expect(!/!important\b/i.test(source), `important:${file}`);
    expect(!/transition\s*:\s*all(?:\s|,|;|$)|transition-property\s*:\s*all\b/i.test(source), `unbounded-transition:${file}`);
    expect(!/font-size\s*:\s*(?:[0-9]|1[01])px\b/i.test(source), `sub-12px-operational-text:${file}`);
  }
}

const mobileApp = read(path.join(shell, "MobilePanelApp.tsx"));
const sharedApp = read(path.join(panel, "panel-framework-app.tsx"));
for (const [name, source] of [["MobilePanelApp", mobileApp], ["panel-framework-app", sharedApp]]) {
  for (const component of ["MobileReferenceSurface", "MobileReferenceNavigation", "MobileReferenceConnection"]) {
    expect(new RegExp(`\\b${component}\\b`).test(source), `${name}:mobile-reference-not-mounted:${component}`);
  }
  expect(!retiredMarkers.test(source), `${name}:retired-mobile-owner-mounted`);
}
expect(/OverviewPanel/.test(sharedApp) && /OperationalSectionPage/.test(sharedApp) && /PanelTaskNavigation/.test(sharedApp) && /RouterConnectionScreen/.test(sharedApp), "panel-framework-app:desktop-composition-not-independent");

const entryCss = read(path.join(shell, "mobile-entry.css"));
expect(/mobile-reference-ui\/mobile-reference\.css/.test(entryCss), "mobile-entry:reference-style-not-owned");
expect(!retiredMarkers.test(entryCss), "mobile-entry:retired-owner-imported");

const surface = read(path.join(owner, "MobileReferenceSurface.tsx"));
for (const marker of ["data-mobile-reference-home", "data-mobile-reference-scene", "data-mobile-reference-tablet-workspace", "data-mobile-reference-wan-detail", "data-mobile-reference-workspace", "data-mobile-reference-directory", "data-mobile-reference-navigation"]) {
  expect(surface.includes(marker), `missing-runtime-marker:${marker}`);
}
expect(!/(?:rows|defaultRoutes)\s*\[\s*0\s*\]/.test(surface), "route-selection-arbitrary-first-row-fallback");

const styles = read(path.join(owner, "mobile-reference.css"));
expect(/\.ref-tablet-tasks\s*\{[^}]*display\s*:\s*none/i.test(styles), "tablet-workspace:must-not-change-phone-composition");
expect(/min-width\s*:\s*600px[\s\S]*?\.ref-tablet-tasks\s*\{[^}]*display\s*:\s*block/i.test(styles), "tablet-workspace:must-fill-tablet-task-space");
expect(/data-panel-large-text="true"[^\n]*\.ref-tablet-tasks__grid\s*\{[^}]*grid-template-columns\s*:\s*1fr/i.test(styles), "tablet-workspace:must-reflow-at-large-text");

const report = {
  contract: "mobile-reference-architecture-v1",
  pass: failures.length === 0,
  owner: path.relative(root, owner).replace(/\\/g, "/"),
  requiredFiles: required.length,
  retiredOwnersAbsent: retiredOwners.every((item) => !fs.existsSync(path.join(panel, item))),
  failures,
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exitCode = report.pass ? 0 : 1;
