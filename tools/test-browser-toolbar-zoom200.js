#!/usr/bin/env node
"use strict";

// Offline contract for the real-Edge runner.  It deliberately does not launch
// a browser or emulate browser zoom; CI can verify the matrix definition and
// evidence semantics without misrepresenting that as Windows UI proof.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  TOOLBAR_200_MATRIX,
  TOOLBAR_200_REQUIRED_CELLS,
  TOOLBAR_SCENARIOS,
  TOOLBAR_CANONICAL_OVERVIEW_SCENARIOS,
  KEYBOARD_ZOOM_ACTIONS,
  TOOLBAR_INCREMENTS,
  GLOBAL_TIMEOUT_MS,
  CELL_TIMEOUT_MS,
  baselineViewportFor,
  isExpectedViewport,
  toolbarZoomEvidence,
  acceptedZoomAttempt,
  validWindowsCapture,
  stableEvidenceIdentity,
  toolbarScenarioConfig,
  pendingToolbarCells,
  parseMaxCells,
} = require("./check-browser-toolbar-zoom200");

const runnerSource = fs.readFileSync(path.join(__dirname, "check-browser-toolbar-zoom200.js"), "utf8");

assert.match(runnerSource, /main\[data-mobile-reference-home\]/, "the Edge runner must inspect the accepted Mobile Reference overview main landmark");
assert.match(runnerSource, /main\[data-mobile-reference-workspace/, "the Edge runner must inspect the accepted Mobile Reference route owner");
assert.match(runnerSource, /\.ref-object-list > button/, "the Edge runner must focus a real Mobile Reference route object");
assert.doesNotMatch(runnerSource, /data-mobile-pulse|data-mobile-ops-overview|mop-route-row|\.oc-objects/, "the Edge runner must not retain retired mobile selector fallbacks");

assert.equal(TOOLBAR_INCREMENTS, 5, "real Edge toolbar flow must remain Ctrl+0 + five Ctrl++ commands");
assert.deepEqual(TOOLBAR_SCENARIOS, ["normal", "interfaces-down"], "the real Edge matrix must independently exercise normal and highest-risk interfaces-down");
assert.deepEqual(
  TOOLBAR_CANONICAL_OVERVIEW_SCENARIOS,
  ["normal", "fleet", "all-offline", "no-snapshot", "collection-down", "resource-full", "interfaces-down-overview"],
  "the canonical 390px Overview contract must cover every public state without collapsing the route incident case",
);
assert.deepEqual(
  toolbarScenarioConfig("no-snapshot"),
  { fixtureScenario: "no-snapshot", route: "overview", surface: "overview", runtimePhase: "error" },
  "no-snapshot must wait for its truthful error phase rather than a fabricated current phase",
);
assert.equal(toolbarScenarioConfig("resource-full").runtimePhase, "current");
assert.equal(TOOLBAR_200_REQUIRED_CELLS.length, 22, "v5 must require 16 base viewport/scenario cells plus six additional canonical Overview states at 390px");
assert.equal(parseMaxCells(["--resume", "--max-cells=4"]), 4, "bounded real-Edge batches must accept an explicit positive cell limit");
assert.equal(parseMaxCells(["--resume"]), Infinity, "an omitted batch limit must retain the complete matrix behavior");
assert.deepEqual(
  pendingToolbarCells(TOOLBAR_200_REQUIRED_CELLS.slice(0, 2).map(({ viewport, scenario }) => ({ viewport, scenario }))).map(({ viewport, scenario }) => `${viewport.id}::${scenario}`),
  TOOLBAR_200_REQUIRED_CELLS.slice(2).map(({ viewport, scenario }) => `${viewport.id}::${scenario}`),
  "resume must skip only exact completed cell identities and retain required order",
);
const phone390Cells = TOOLBAR_200_REQUIRED_CELLS
  .filter(({ viewport }) => viewport.id === "phone-390")
  .map(({ scenario }) => scenario)
  .sort();
assert.deepEqual(
  phone390Cells,
  ["normal", "fleet", "all-offline", "no-snapshot", "collection-down", "resource-full", "interfaces-down", "interfaces-down-overview"].sort(),
  "phone-390 must retain the route incident and independently exercise all seven canonical Overview cases",
);
assert.deepEqual(KEYBOARD_ZOOM_ACTIONS, ["oem-plus", "numpad-plus"], "both real Ctrl+Plus keyboard variants must precede the real menu fallback");
assert(GLOBAL_TIMEOUT_MS > CELL_TIMEOUT_MS * TOOLBAR_200_REQUIRED_CELLS.length, "global timeout must bound the complete v5 required-cell matrix without being shorter than the independent viewport cells");
assert.equal(TOOLBAR_200_MATRIX.length, 8, "bounded matrix must contain exactly the required eight CSS viewports");
assert.deepEqual(
  TOOLBAR_200_MATRIX.map((item) => `${item.cssViewport.width}x${item.cssViewport.height}`),
  ["320x568", "360x800", "375x667", "390x844", "430x932", "768x1024", "667x375", "844x390"],
  "matrix must retain all required portrait widths and both required landscape viewports",
);
assert.deepEqual(
  TOOLBAR_200_MATRIX.filter((item) => item.orientation === "landscape").map((item) => item.cssViewport),
  [{ width: 667, height: 375 }, { width: 844, height: 390 }],
  "both required landscape cells must remain explicit",
);
for (const item of TOOLBAR_200_MATRIX) {
  const baseline = baselineViewportFor(item.cssViewport);
  assert.deepEqual(baseline, { width: item.cssViewport.width * 2, height: item.cssViewport.height * 2 }, `${item.id} must open at the physical pre-zoom viewport`);
  assert(isExpectedViewport(item.cssViewport, item.cssViewport), `${item.id} must accept its exact CSS target`);
}

const verified = toolbarZoomEvidence({
  baseline: { innerWidth: 780, innerHeight: 1688 },
  zoomed: { innerWidth: 390, innerHeight: 844, devicePixelRatio: 2 },
  automation: { steps: Array.from({ length: 5 }, (_, index) => ({
    step: index + 1,
    acceptedAction: "menu-plus",
    attempts: [
      { action: "oem-plus", input: { pass: true }, changed: false },
      { action: "numpad-plus", input: { pass: true }, changed: false },
      { action: "menu-plus", input: { pass: true }, changed: true },
    ],
  })) },
  targetCssViewport: { width: 390, height: 844 },
});
assert.equal(verified.expectedPercent, 200);
assert.equal(verified.verified, true, "page geometry plus five actual toolbar increments must prove the requested browser zoom level");

const wrongViewport = toolbarZoomEvidence({
  baseline: { innerWidth: 780, innerHeight: 1688 },
  zoomed: { innerWidth: 391, innerHeight: 844, devicePixelRatio: 2 },
  automation: { steps: Array.from({ length: 5 }, (_, index) => ({ step: index + 1, acceptedAction: "oem-plus", attempts: [{ action: "oem-plus", changed: true }] })) },
  targetCssViewport: { width: 390, height: 844 },
});
assert.equal(wrongViewport.verified, true, "one CSS pixel is an allowed browser rounding tolerance");

const earlyTargetZoom = toolbarZoomEvidence({
  baseline: { innerWidth: 780, innerHeight: 1688 },
  zoomed: { innerWidth: 390, innerHeight: 844, devicePixelRatio: 2 },
  automation: { steps: Array.from({ length: 4 }, (_, index) => ({ step: index + 1, acceptedAction: "oem-plus", attempts: [{ action: "oem-plus", changed: true }] })) },
  targetCssViewport: { width: 390, height: 844 },
});
assert.equal(earlyTargetZoom.verified, true, "runner may stop before the five-step safety cap once real toolbar actions and page geometry prove 200 percent");

const missingToolbarInteraction = toolbarZoomEvidence({
  baseline: { innerWidth: 780, innerHeight: 1688 },
  zoomed: { innerWidth: 390, innerHeight: 844, devicePixelRatio: 2 },
  automation: { steps: [] },
  targetCssViewport: { width: 390, height: 844 },
});
assert.equal(missingToolbarInteraction.verified, false, "page geometry alone must never impersonate a real toolbar zoom action");

const overrunToolbarInteraction = toolbarZoomEvidence({
  baseline: { innerWidth: 780, innerHeight: 1688 },
  zoomed: { innerWidth: 390, innerHeight: 844, devicePixelRatio: 2 },
  automation: { steps: Array.from({ length: 6 }, (_, index) => ({ step: index + 1, acceptedAction: "oem-plus", attempts: [{ action: "oem-plus", changed: true }] })) },
  targetCssViewport: { width: 390, height: 844 },
});
assert.equal(overrunToolbarInteraction.verified, false, "evidence beyond the bounded five-step safety cap must fail closed");

const keyboardNoOpThenMenu = [
  { action: "oem-plus", input: { pass: true }, changed: false },
  { action: "numpad-plus", input: { pass: true }, changed: false },
  { action: "menu-plus", input: { pass: true }, changed: true },
];
assert.equal(acceptedZoomAttempt(keyboardNoOpThenMenu)?.action, "menu-plus", "a key dispatch without DPR/layout change must not count and must continue to the real menu fallback");
assert.equal(acceptedZoomAttempt(keyboardNoOpThenMenu.slice(0, 2)), null, "successful key dispatch with unchanged geometry must fail closed rather than claim zoom");

const ownedHandle = 31415;
assert.equal(validWindowsCapture({
  pass: true, captureOnly: true, windowHandle: ownedHandle,
  captureState: { foregroundHandle: ownedHandle, captureMode: "screen-unobscured", unobscured: true, sampleCount: 9, windowRect: { left: 1, top: 1, right: 300, bottom: 400 } },
}, ownedHandle), true, "Windows screenshot evidence must bind the foreground Edge HWND and unobscured sample grid");
assert.equal(validWindowsCapture({
  pass: true, captureOnly: true, windowHandle: ownedHandle,
  captureState: { foregroundHandle: ownedHandle, captureMode: "owned-window-render", unobscured: false, sampleCount: 9, blockedSamples: [{ x: 1, y: 1, coveringRoot: 99 }], ownedWindowRender: { success: true, method: "PrintWindow", sampledColorCount: 32, channelSpan: 200 }, windowRect: { left: 1, top: 1, right: 300, bottom: 400 } },
}, ownedHandle), true, "an oversized foreground Edge HWND may provide a complete owner-rendered Windows image with explicit obstruction evidence");
assert.equal(validWindowsCapture({
  pass: true, captureOnly: true, windowHandle: ownedHandle,
  captureState: { foregroundHandle: ownedHandle, captureMode: "owned-window-render", unobscured: false, sampleCount: 9, blockedSamples: [{ x: 1, y: 1, coveringRoot: 99 }], ownedWindowRender: { success: true, method: "PrintWindow", sampledColorCount: 1, channelSpan: 0 }, windowRect: { left: 1, top: 1, right: 300, bottom: 400 } },
}, ownedHandle), false, "a blank owner-rendered image must fail closed");
assert.equal(validWindowsCapture({
  pass: true, captureOnly: true, windowHandle: ownedHandle,
  captureState: { foregroundHandle: ownedHandle, captureMode: "screen-visible-segment", unobscured: false, sampleCount: 9, blockedSamples: [{ x: 1, y: 1, coveringRoot: 99 }], ownedWindowRender: { success: false }, visibleSegment: { success: true, method: "physical-screen-segment", unobscured: true, coverageRatio: 0.68, sampleCount: 9, sampledColorCount: 64, channelSpan: 300 }, windowRect: { left: 1, top: 1, right: 300, bottom: 400 } },
}, ownedHandle), true, "an oversized window may pair a substantial unobscured physical segment with the separately hashed full renderer screenshot");
assert.equal(validWindowsCapture({
  pass: true, captureOnly: true, windowHandle: ownedHandle,
  captureState: { foregroundHandle: 27182, captureMode: "screen-unobscured", unobscured: true, sampleCount: 9, windowRect: { left: 1, top: 1, right: 300, bottom: 400 } },
}, ownedHandle), false, "a foreground title/HWND mismatch must invalidate the Windows screenshot evidence");

const identity = stableEvidenceIdentity();
assert.equal(identity.ignoredToolOwnedRuntimeArtifact, "tools/acceptance/browser-lifecycle-v2/.artifacts/latest-report.json");
assert.equal(typeof identity.fingerprint, "string");
assert.equal(identity.fingerprint.length, 64, "stable identity must still bind tracked and non-owned untracked worktree content");

const windowsCaptureSource = fs.readFileSync(
  path.join(__dirname, "acceptance", "accessibility-v2", "windows_browser_zoom.py"),
  "utf8",
);
const captureOwnedEdgeSource = windowsCaptureSource.match(/def capture_owned_edge\([\s\S]*?\n\ndef /)?.[0] || "";
assert.match(
  captureOwnedEdgeSource,
  /focus_owned_window\(handle,[\s\S]*?inspect_edge_visibility\(handle\)/,
  "the Windows-owned capture must reclaim the exact Edge HWND immediately before inspecting and capturing it",
);
assert.match(
  captureOwnedEdgeSource,
  /foregroundStabilizationAttempts/,
  "the Windows-owned capture must expose bounded foreground stabilization diagnostics",
);

process.stdout.write(`${JSON.stringify({ pass: true, contract: "edge-toolbar-zoom200-offline-v8-mobile-reference", cells: TOOLBAR_200_REQUIRED_CELLS.length }, null, 2)}\n`);
