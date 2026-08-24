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
const desktopApp = read(path.join(panel, "desktop", "DesktopPanelApp.tsx"));
for (const component of ["MobileReferenceSurface", "MobileReferenceNavigation", "MobileReferenceConnection"]) {
  expect(new RegExp(`\\b${component}\\b`).test(mobileApp), `MobilePanelApp:mobile-reference-not-mounted:${component}`);
  expect(!new RegExp(`\\b${component}\\b`).test(desktopApp), `DesktopPanelApp:mobile-owner-cross-surface-import:${component}`);
}
expect(!retiredMarkers.test(mobileApp), "MobilePanelApp:retired-mobile-owner-mounted");
expect(!retiredMarkers.test(desktopApp), "DesktopPanelApp:retired-mobile-owner-mounted");
expect(/DesktopOverviewScreen/.test(desktopApp) && /OperationalSectionPage/.test(desktopApp) && /PanelTaskNavigation/.test(desktopApp) && /RouterConnectionScreen/.test(desktopApp), "DesktopPanelApp:desktop-composition-not-independent");
expect(!/DesktopOverviewScreen|OperationalSectionPage|PanelTaskNavigation|RouterConnectionScreen/.test(mobileApp), "MobilePanelApp:desktop-owner-cross-surface-import");
expect(!fs.existsSync(path.join(panel, "panel-framework-app.tsx")), "dead-composite-owner:panel-framework-app-still-exists");
expect(!fs.existsSync(path.join(panel, "main.tsx")), "dead-composite-entry:main-tsx-still-exists");

const entryCss = read(path.join(shell, "mobile-entry.css"));
expect(/mobile-reference-ui\/mobile-reference\.css/.test(entryCss), "mobile-entry:reference-style-not-owned");
expect(!retiredMarkers.test(entryCss), "mobile-entry:retired-owner-imported");

const surface = read(path.join(owner, "MobileReferenceSurface.tsx"));
for (const marker of ["data-mobile-reference-home", "data-mobile-reference-scene", "data-mobile-reference-tablet-workspace", "data-mobile-reference-wan-detail", "data-mobile-reference-workspace", "data-mobile-reference-directory", "data-mobile-reference-navigation"]) {
  expect(surface.includes(marker), `missing-runtime-marker:${marker}`);
}
expect(!/(?:rows|defaultRoutes)\s*\[\s*0\s*\]/.test(surface), "route-selection-arbitrary-first-row-fallback");
expect(/id=\{objectRowFocusId\(route, row\.id\)\}/.test(surface), "workspace-object-row:stable-focus-id-missing");
expect(/focusId:\s*objectRowFocusId\(route, row\.id\)/.test(surface), "workspace-object-row:navigation-focus-id-missing");
expect(/threshold === null \? null :/.test(surface), "resource-threshold:missing-threshold-must-not-render-a-line");
expect(!/\bChevronDown\b/.test(surface), "mobile-header:noninteractive-title-chevron-must-be-absent");
expect(!/\b650\b|setTimeout\s*\(/.test(surface), "mobile-refresh:fixed-duration-feedback-must-be-absent");
expect(/onRefresh\?:\s*\(\)\s*=>\s*Promise<void>\s*\|\s*void/.test(surface), "mobile-refresh:promise-contract-missing");
const refreshActionBlock = /const\s+refreshAction\s*=\s*async\s*\(\)\s*:\s*Promise<void>\s*=>\s*\{([\s\S]*?)\n\s*\};/.exec(surface)?.[1] || "";
expect(Boolean(refreshActionBlock), "mobile-refresh:shared-action-missing");
expect(/if\s*\(\s*!onRefresh\s*\|\|\s*refreshingRef\.current\s*\)\s*return/.test(refreshActionBlock), "mobile-refresh:reentry-bound-missing");
expect(/refreshingRef\.current\s*=\s*true/.test(refreshActionBlock) && /setRefreshing\(true\)/.test(refreshActionBlock), "mobile-refresh:busy-start-missing");
expect(/try\s*\{[\s\S]*await\s+onRefresh\(\)[\s\S]*\}\s*finally\s*\{[\s\S]*refreshingRef\.current\s*=\s*false[\s\S]*setRefreshing\(false\)/.test(refreshActionBlock), "mobile-refresh:promise-finally-boundary-missing");
expect(!/\bcatch\b/.test(refreshActionBlock), "mobile-refresh:rejected-promise-must-not-be-swallowed");
expect((surface.match(/const\s*\[refreshing,\s*setRefreshing\]\s*=\s*useState\(false\)/g) || []).length === 1, "mobile-refresh:busy-state-must-have-one-home-owner");
expect((surface.match(/onRefresh=\{onRefresh \? refreshAction : undefined\}/g) || []).length === 2, "mobile-refresh:header-and-recovery-must-share-one-action");
expect(/ref-topbar__actions[\s\S]*aria-busy=\{refreshing\}[\s\S]*disabled=\{!onRefresh \|\| refreshing\}[\s\S]*onClick=\{onRefresh\}/.test(surface), "mobile-refresh:header-busy-controls-missing");
expect(/ref-inline-action[\s\S]*aria-busy=\{refreshing\}[\s\S]*disabled=\{refreshing\}[\s\S]*onClick=\{onRefresh\}/.test(surface), "mobile-refresh:recovery-busy-controls-missing");
expect(/onRefresh=\{runtime \? \(\) => runtime\.refresh\("manual"\) : undefined\}/.test(mobileApp), "mobile-panel-app:refresh-promise-not-returned");
expect(!/void\s+runtime\.refresh\("manual"\)/.test(mobileApp), "mobile-panel-app:refresh-promise-discarded");

const refScrollNodes = surface.match(/<div\b[^>]*\bclassName="[^"]*\bref-scroll\b[^"]*"[^>]*>/g) || [];
expect(refScrollNodes.length > 0, "ref-scroll:missing");
expect(refScrollNodes.every((node) => /\bdata-origin-space-scroll=(?:"mobile-reference:[^"]+"|\{`mobile-reference:[^`]+`\})/.test(node)), "ref-scroll:stable-data-origin-space-scroll-missing");
expect(/<div\b(?=[^>]*\bclassName="[^"]*\bref-scroll\b[^"]*")(?=[^>]*\bdata-panel-workspace-scroll=\{route\})[^>]*>/.test(surface), "workspace-list:route-owned-data-panel-workspace-scroll-missing");

expect(/\bcreatePanelWorkspaceHistoryState\s*\(/.test(surface), "workspace-history:create-helper-missing");
expect(/\bpanelWorkspaceStateFromHistoryState\s*\(\s*window\.history\.state\s*,\s*route\s*\)/.test(surface), "workspace-history:restore-helper-missing");
const workspaceHistoryWrite = /const\s+panelWorkspace\s*=\s*createPanelWorkspaceHistoryState\s*\(\s*route\s*,\s*\{([\s\S]*?)\}\s*\)\s*;\s*window\.history\.replaceState/.exec(surface);
expect(Boolean(workspaceHistoryWrite), "workspace-history:replace-state-write-missing");
for (const [field, value] of [["search", "query"], ["filter", "filterId"], ["sort", "sortId"], ["page", "effectivePage"]]) {
  expect(Boolean(workspaceHistoryWrite && new RegExp(`\\b${field}\\s*:\\s*${value}\\b`).test(workspaceHistoryWrite[1])), `workspace-history:${field}-not-persisted`);
}
expect(Boolean(workspaceHistoryWrite && /\bscrollY\s*:\s*Math\.max\(/.test(workspaceHistoryWrite[1])), "workspace-history:scrollY-not-persisted");

expect(/const\s*\{[^}]*\bentryKey\b[^}]*\}\s*=\s*usePanelRoute\(\)/.test(mobileApp), "mobile-panel-app:use-panel-route-entry-key-missing");
expect(/<MobileReferenceSurface\b[^>]*\bnavigationEntryKey=\{entryKey\}/.test(mobileApp), "mobile-panel-app:entry-key-not-passed-to-reference-surface");

const styles = read(path.join(owner, "mobile-reference.css"));
expect(/\.ref-tablet-tasks\s*\{[^}]*display\s*:\s*none/i.test(styles), "tablet-workspace:must-not-change-phone-composition");
expect(/min-width\s*:\s*600px[\s\S]*?\.ref-tablet-tasks\s*\{[^}]*display\s*:\s*block/i.test(styles), "tablet-workspace:must-fill-tablet-task-space");
expect(/data-panel-large-text="true"[^\n]*\.ref-tablet-tasks__grid\s*\{[^}]*grid-template-columns\s*:\s*1fr/i.test(styles), "tablet-workspace:must-reflow-at-large-text");
expect(/\.ref-connect button:focus-visible[\s\S]*?outline\s*:\s*2px solid var\(--ref-blue\)/i.test(styles), "connection:button-focus-visible-missing");
expect(/\.ref-connect input:focus-visible[\s\S]*?outline\s*:\s*2px solid var\(--ref-blue\)/i.test(styles), "connection:input-focus-visible-missing");
expect(/\.ref-mobile button\s*,\s*\.ref-connect button:not\(:disabled\)\s*\{[^}]*transition\s*:\s*transform 140ms cubic-bezier\(\.23,1,\.32,1\)/i.test(styles), "motion:mobile-and-enabled-connection-press-transition-missing");
expect(/html\[data-panel-input-modality="pointer"\]\s+:is\(\.ref-mobile,\.ref-connect\)\s+button:not\(:disabled\):active\s*\{[^}]*transform\s*:\s*scale\(\.97\)/i.test(styles), "motion:pointer-only-press-transform-missing");
expect(!/(?:^|\})\s*\.ref-mobile button:active\s*\{[^}]*transform\s*:\s*scale\(/im.test(styles), "motion:ungated-mobile-active-transform-present");
const reducedMotionStart = styles.indexOf("@media (prefers-reduced-motion:reduce)");
const reducedMotionEnd = reducedMotionStart < 0 ? -1 : styles.indexOf("@media (prefers-reduced-transparency:reduce)", reducedMotionStart);
const reducedMotionStyles = reducedMotionStart < 0 ? "" : styles.slice(reducedMotionStart, reducedMotionEnd < 0 ? styles.length : reducedMotionEnd);
expect(/\.ref-spin\s*\{[^}]*animation\s*:\s*none/i.test(reducedMotionStyles), "motion:reduced-spin-must-stop");
expect(/\.ref-mobile button\s*,\s*\.ref-connect button:not\(:disabled\)\s*\{[^}]*transition\s*:\s*none/i.test(reducedMotionStyles), "motion:reduced-mobile-and-connection-transition-must-stop");
expect(/html\[data-panel-input-modality="pointer"\]\s+:is\(\.ref-mobile,\.ref-connect\)\s+button:not\(:disabled\):active\s*\{[^}]*transform\s*:\s*none/i.test(reducedMotionStyles), "motion:reduced-mobile-and-connection-transform-must-stop");
expect(!/ease-in(?!-out)/i.test(styles), "motion:ease-in-forbidden");
expect(!/scale\(\s*0(?:\.0*)?\s*\)/i.test(styles), "motion:scale-zero-forbidden");
const transitionDurations = [...styles.matchAll(/transition(?:-[a-z-]+)?\s*:[^;}]+/gi)]
  .flatMap((rule) => [...rule[0].matchAll(/(\d+(?:\.\d+)?)ms/gi)].map((match) => Number(match[1])));
expect(transitionDurations.every((duration) => duration <= 300), "motion:transition-over-300ms-forbidden");

const routeHook = read(path.join(panel, "routes", "usePanelRoute.ts"));
expect(/\[data-origin-space-detail-title\], \[data-panel-route-title\]/.test(routeHook), "detail-title:current-mobile-owner-focus-target-missing");

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
