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
  TOOLBAR_ZOOM_ACTION,
  TOOLBAR_INCREMENTS,
  TOOLBAR_CONTRACT,
  MOBILE_ORIGIN_OWNER,
  DESKTOP_ORIGIN_OWNER,
  GLOBAL_TIMEOUT_MS,
  CELL_TIMEOUT_MS,
  baselineViewportFor,
  isExpectedViewport,
  toolbarZoomEvidence,
  expectedToolbarSurface,
  acceptedZoomAttempt,
  validWindowsCapture,
  stableEvidenceIdentity,
  toolbarScenarioConfig,
  pendingToolbarCells,
  parseMaxCells,
  toolbarReportReadiness,
} = require("./check-browser-toolbar-zoom200");

const runnerSource = fs.readFileSync(path.join(__dirname, "check-browser-toolbar-zoom200.js"), "utf8");

assert.match(runnerSource, /main\[data-mobile-reference-home\]/, "the Edge runner must inspect the accepted Mobile Reference overview main landmark");
assert.match(runnerSource, /main\[data-mobile-reference-workspace/, "the Edge runner must inspect the accepted Mobile Reference route owner");
assert.match(runnerSource, /\.ref-object-list > button/, "the Edge runner must focus a real Mobile Reference route object");
assert.doesNotMatch(runnerSource, /data-mobile-pulse|data-mobile-ops-overview|mop-route-row|\.oc-objects/, "the Edge runner must not retain retired mobile selector fallbacks");

assert.equal(TOOLBAR_INCREMENTS, 5, "real Edge toolbar flow must retain a bounded five-invocation safety cap");
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
assert.equal(TOOLBAR_200_REQUIRED_CELLS.length, 24, "the matrix must require 18 base viewport/scenario cells plus six additional canonical Overview states at 390px");
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
assert.equal(TOOLBAR_ZOOM_ACTION, "menu-plus", "only the process-owned real Edge menu control may change browser zoom");
assert(
  GLOBAL_TIMEOUT_MS > Math.max(CELL_TIMEOUT_MS, 180_000 * TOOLBAR_200_REQUIRED_CELLS.length),
  "global timeout must cover the nominal complete matrix and one CPU-capped cell without permitting every cell to consume its extended worst-case budget",
);
assert.equal(TOOLBAR_200_MATRIX.length, 9, "bounded matrix must contain exactly the required nine CSS viewports");
assert.deepEqual(
  TOOLBAR_200_MATRIX.map((item) => `${item.cssViewport.width}x${item.cssViewport.height}`),
  ["320x568", "360x800", "375x667", "390x844", "430x932", "768x1024", "568x320", "667x375", "844x390"],
  "matrix must retain all required portrait widths and all three ownership-significant landscape viewports",
);
assert.deepEqual(
  TOOLBAR_200_MATRIX.filter((item) => item.orientation === "landscape").map((item) => item.cssViewport),
  [{ width: 568, height: 320 }, { width: 667, height: 375 }, { width: 844, height: 390 }],
  "the narrow mobile and both wide desktop landscape cells must remain explicit",
);
assert.equal(expectedToolbarSurface({ orientation: "landscape", cssViewport: { width: 568, height: 320 } }), "mobile", "568px landscape must resolve to the mobile owner");
for (const width of [600, 667, 844]) {
  assert.equal(expectedToolbarSurface({ orientation: "landscape", cssViewport: { width, height: 320 } }), "desktop", `${width}px landscape must resolve to the desktop owner`);
}
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
  automation: { steps: Array.from({ length: 5 }, (_, index) => ({ step: index + 1, acceptedAction: "menu-plus", attempts: [{ action: "menu-plus", changed: true }] })) },
  targetCssViewport: { width: 390, height: 844 },
});
assert.equal(wrongViewport.verified, true, "one CSS pixel is an allowed browser rounding tolerance");

const earlyTargetZoom = toolbarZoomEvidence({
  baseline: { innerWidth: 780, innerHeight: 1688 },
  zoomed: { innerWidth: 390, innerHeight: 844, devicePixelRatio: 2 },
  automation: { steps: Array.from({ length: 4 }, (_, index) => ({ step: index + 1, acceptedAction: "menu-plus", attempts: [{ action: "menu-plus", changed: true }] })) },
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
  automation: { steps: Array.from({ length: 6 }, (_, index) => ({ step: index + 1, acceptedAction: "menu-plus", attempts: [{ action: "menu-plus", changed: true }] })) },
  targetCssViewport: { width: 390, height: 844 },
});
assert.equal(overrunToolbarInteraction.verified, false, "evidence beyond the bounded five-step safety cap must fail closed");

const processOwnedMenuAttempt = [
  { action: "menu-plus", input: { pass: true }, changed: true },
];
assert.equal(acceptedZoomAttempt(processOwnedMenuAttempt)?.action, "menu-plus", "a process-owned menu invocation with observed geometry change may count");
assert.equal(acceptedZoomAttempt([{ action: "menu-plus", input: { pass: true }, changed: false }]), null, "successful UIA invocation with unchanged geometry must fail closed rather than claim zoom");

const ownedHandle = 31415;
assert.equal(validWindowsCapture({
  pass: true, contract: "windows-edge-toolbar-zoom-v1", action: "capture", captureOnly: true, windowHandle: ownedHandle,
  captureState: { foregroundHandle: ownedHandle, captureMode: "screen-unobscured", unobscured: true, sampleCount: 9, windowRect: { left: 1, top: 1, right: 300, bottom: 400 } },
}, ownedHandle), true, "Windows screenshot evidence must bind the foreground Edge HWND and unobscured sample grid");
assert.equal(validWindowsCapture({
  pass: true, contract: "windows-edge-toolbar-zoom-v1", action: "capture", captureOnly: true, windowHandle: ownedHandle,
  captureState: { foregroundHandle: ownedHandle, captureMode: "owned-window-render", unobscured: false, sampleCount: 9, blockedSamples: [{ x: 1, y: 1, coveringRoot: 99 }], ownedWindowRender: { success: true, method: "PrintWindow", sampledColorCount: 32, channelSpan: 200 }, windowRect: { left: 1, top: 1, right: 300, bottom: 400 } },
}, ownedHandle), true, "an oversized foreground Edge HWND may provide a complete owner-rendered Windows image with explicit obstruction evidence");
assert.equal(validWindowsCapture({
  pass: true, contract: "windows-edge-toolbar-zoom-v1", action: "capture", captureOnly: true, windowHandle: ownedHandle,
  captureState: { foregroundHandle: ownedHandle, captureMode: "owned-window-render", unobscured: false, sampleCount: 9, blockedSamples: [{ x: 1, y: 1, coveringRoot: 99 }], ownedWindowRender: { success: true, method: "PrintWindow", sampledColorCount: 1, channelSpan: 0 }, windowRect: { left: 1, top: 1, right: 300, bottom: 400 } },
}, ownedHandle), false, "a blank owner-rendered image must fail closed");
assert.equal(validWindowsCapture({
  pass: true, contract: "windows-edge-toolbar-zoom-v1", action: "capture", captureOnly: true, windowHandle: ownedHandle,
  captureState: { foregroundHandle: ownedHandle, captureMode: "screen-visible-segment", unobscured: false, sampleCount: 9, blockedSamples: [{ x: 1, y: 1, coveringRoot: 99 }], ownedWindowRender: { success: false }, visibleSegment: { success: true, method: "physical-screen-segment", unobscured: true, coverageRatio: 0.68, sampleCount: 9, sampledColorCount: 64, channelSpan: 300 }, windowRect: { left: 1, top: 1, right: 300, bottom: 400 } },
}, ownedHandle), true, "an oversized window may pair a substantial unobscured physical segment with the separately hashed full renderer screenshot");
assert.equal(validWindowsCapture({
  pass: true, contract: "windows-edge-toolbar-zoom-v1", action: "capture", captureOnly: true, windowHandle: ownedHandle,
  captureState: { foregroundHandle: 27182, captureMode: "screen-unobscured", unobscured: true, sampleCount: 9, windowRect: { left: 1, top: 1, right: 300, bottom: 400 } },
}, ownedHandle), false, "a foreground title/HWND mismatch must invalidate the Windows screenshot evidence");

const syntheticIdentity = { commit: "a".repeat(40), worktreeFingerprint: "e".repeat(64), artifactKey: "worktree-a", worktreeClean: true, releaseEvidenceEligible: true };
const syntheticStableIdentity = { commit: syntheticIdentity.commit, fingerprint: "b".repeat(64), official: syntheticIdentity };

function syntheticToolbarCell(required, index) {
  const { viewport, scenario } = required;
  const captureWidth = viewport.cssViewport.width + 16;
  const captureHeight = viewport.cssViewport.height + 88;
  const expectedSurface = viewport.orientation === "landscape" && viewport.cssViewport.width >= 600 ? "desktop" : "mobile";
  const handle = 40000 + index;
  const baseline = { innerWidth: viewport.cssViewport.width * 2, innerHeight: viewport.cssViewport.height * 2, devicePixelRatio: 1 };
  const zoomed = { innerWidth: viewport.cssViewport.width, innerHeight: viewport.cssViewport.height, devicePixelRatio: 2 };
  const ladder = Array.from({ length: 5 }, (_, ladderIndex) => {
    const ratio = 1 + ladderIndex / 4;
    return {
      innerWidth: baseline.innerWidth / ratio,
      innerHeight: baseline.innerHeight / ratio,
      devicePixelRatio: ratio,
    };
  });
  const steps = Array.from({ length: 4 }, (_, stepIndex) => {
    const before = ladder[stepIndex];
    const after = ladder[stepIndex + 1];
    return {
      step: stepIndex + 1,
      acceptedAction: "menu-plus",
      before,
      after,
      attempts: [{
        action: "menu-plus",
        changed: true,
        before,
        after,
        input: { pass: true, contract: "windows-edge-toolbar-zoom-v1", action: "menu-plus", captureOnly: false, windowHandle: handle },
      }],
    };
  });
  const windowsCapture = {
    pass: true,
    contract: "windows-edge-toolbar-zoom-v1",
    action: "capture",
    captureOnly: true,
    windowHandle: handle,
    captureState: { foregroundHandle: handle, captureMode: "screen-unobscured", unobscured: true, sampleCount: 9, windowRect: { left: 1, top: 1, right: captureWidth + 1, bottom: captureHeight + 1 } },
    capture: { width: captureWidth, height: captureHeight },
  };
  return {
    viewport,
    scenario,
    expectedBaselineSurface: expectedSurface,
    browserSurface: expectedSurface,
    baseline,
    zoomed,
    zoomLevel: { verified: true, expectedPercent: 200, toolbarIncrements: steps.length, targetCssViewport: viewport.cssViewport },
    windowsAutomation: { pass: true, windowHandle: handle, baselineInspection: { pass: true, contract: "windows-edge-toolbar-zoom-v1", action: "inspect", windowHandle: handle }, steps, final: zoomed },
    stableIdentity: syntheticStableIdentity,
    surface: {
      overflowX: 0,
      main: { horizontalOverflow: 0, maxLeft: 0 },
      primary: { present: true, visible: true, reachable: true, withinMain: true, obscuredByNavigation: false },
      clippedOperationalText: [],
      unreadableOperationalText: [],
      keyboardTraversal: { complete: true, expectedCount: 1, visitedCount: 1, sequence: [{ focusVisible: true, outlineWidth: 2, outlineStyle: "solid", fullyVisible: true, withinMain: true, obscuredByNavigation: false }] },
      screenshot: { file: `${viewport.id}-${scenario}-edge-toolbar-zoom200.png`, sha256: (index * 2 + 1).toString(16).padStart(64, "0"), dimensions: { width: captureWidth, height: captureHeight } },
      playwrightDiagnosticScreenshot: { file: `${viewport.id}-${scenario}-edge-toolbar-zoom200-playwright-diagnostic.png`, sha256: (index * 2 + 2).toString(16).padStart(64, "0"), dimensions: { width: viewport.cssViewport.width, height: viewport.cssViewport.height } },
      windowsCapture,
    },
  };
}

const syntheticCells = TOOLBAR_200_REQUIRED_CELLS.map(syntheticToolbarCell);
const syntheticReport = {
  pass: true,
  contract: TOOLBAR_CONTRACT,
  ownerContract: { ...MOBILE_ORIGIN_OWNER, desktopOverview: DESKTOP_ORIGIN_OWNER.overview, desktopRoute: DESKTOP_ORIGIN_OWNER.route, desktopNavigation: DESKTOP_ORIGIN_OWNER.navigation },
  identity: syntheticIdentity,
  stableIdentity: syntheticStableIdentity,
  platform: "win32",
  matrix: { complete: true, requiredCellIds: TOOLBAR_200_REQUIRED_CELLS.map(({ viewport, scenario }) => `${viewport.id}::${scenario}`) },
  proofBoundary: { doesNotProve: "iOS Dynamic Type or CDP pageScale" },
  cells: syntheticCells,
};
assert.equal(toolbarReportReadiness(syntheticReport).pass, true, "a complete variable-increment v10 report must pass the shared strict validator");
const duplicateCellsReport = { ...syntheticReport, cells: syntheticCells.map(() => syntheticCells[0]) };
assert.equal(toolbarReportReadiness(duplicateCellsReport).pass, false, "duplicate cell IDs must never satisfy a required matrix");
const wrongOwnerReport = { ...syntheticReport, cells: syntheticCells.map((cell, index) => index === syntheticCells.length - 1 ? { ...cell, browserSurface: "mobile" } : cell) };
assert.equal(toolbarReportReadiness(wrongOwnerReport).pass, false, "a wide-landscape mobile owner must fail the responsive owner contract");
const narrowLandscapeWrongOwnerReport = { ...syntheticReport, cells: syntheticCells.map((cell) => cell.viewport.id === "landscape-568x320" ? { ...cell, browserSurface: "desktop" } : cell) };
assert.equal(toolbarReportReadiness(narrowLandscapeWrongOwnerReport).pass, false, "a 568px landscape desktop owner must fail the responsive owner contract");
const missingScreenshotHashReport = { ...syntheticReport, cells: syntheticCells.map((cell, index) => index === 0 ? { ...cell, surface: { ...cell.surface, screenshot: { ...cell.surface.screenshot, sha256: "" } } } : cell) };
assert.equal(toolbarReportReadiness(missingScreenshotHashReport).pass, false, "missing screenshot evidence must fail the shared validator");
const reusedScreenshotHashReport = { ...syntheticReport, cells: syntheticCells.map((cell, index) => index === 1 ? { ...cell, surface: { ...cell.surface, screenshot: { ...cell.surface.screenshot, sha256: syntheticCells[0].surface.screenshot.sha256 } } } : cell) };
assert.equal(toolbarReportReadiness(reusedScreenshotHashReport).pass, false, "cross-cell screenshot hash reuse must fail the shared validator");
const forgedCaptureDimensionsReport = { ...syntheticReport, cells: syntheticCells.map((cell, index) => index === 0 ? { ...cell, surface: { ...cell.surface, screenshot: { ...cell.surface.screenshot, dimensions: { ...cell.surface.screenshot.dimensions, width: cell.surface.screenshot.dimensions.width + 1 } } } } : cell) };
assert.equal(toolbarReportReadiness(forgedCaptureDimensionsReport).pass, false, "declared Windows screenshot dimensions must match the owned capture dimensions");
const undersizedDiagnosticReport = { ...syntheticReport, cells: syntheticCells.map((cell, index) => index === 0 ? { ...cell, surface: { ...cell.surface, playwrightDiagnosticScreenshot: { ...cell.surface.playwrightDiagnosticScreenshot, dimensions: { width: cell.viewport.cssViewport.width - 1, height: cell.viewport.cssViewport.height } } } } : cell) };
assert.equal(toolbarReportReadiness(undersizedDiagnosticReport).pass, false, "renderer screenshots must cover the target CSS viewport");
const disconnectedGeometryReport = { ...syntheticReport, cells: syntheticCells.map((cell, index) => index === 0 ? { ...cell, windowsAutomation: { ...cell.windowsAutomation, steps: cell.windowsAutomation.steps.map((step, stepIndex) => stepIndex === 1 ? { ...step, before: { ...step.before, innerWidth: step.before.innerWidth + 20 } } : step) } } : cell) };
assert.equal(toolbarReportReadiness(disconnectedGeometryReport).pass, false, "disconnected toolbar geometry steps must fail the shared validator");
const staleOfficialIdentityReport = { ...syntheticReport, stableIdentity: { ...syntheticStableIdentity, official: { ...syntheticIdentity, artifactKey: "stale" } } };
assert.equal(toolbarReportReadiness(staleOfficialIdentityReport).pass, false, "stable evidence must remain bound to the official worktree identity");

const identity = stableEvidenceIdentity();
assert.equal(identity.ignoredToolOwnedRuntimeArtifact, "tools/acceptance/browser-lifecycle-v2/.artifacts/latest-report.json");
assert.equal(typeof identity.fingerprint, "string");
assert.equal(identity.fingerprint.length, 64, "stable identity must still bind tracked and non-owned untracked worktree content");

const windowsCaptureSource = fs.readFileSync(
  path.join(__dirname, "acceptance", "accessibility-v2", "windows_browser_zoom.py"),
  "utf8",
);
assert.doesNotMatch(
  windowsCaptureSource,
  /keybd_event|SendInput|send_chord|\.click_input\s*\(/,
  "the Windows helper must never emit global keyboard or physical mouse input",
);
assert.match(
  windowsCaptureSource,
  /def invoke_owned_control[\s\S]*?control_process_id != owned_process_id[\s\S]*?require_owned_foreground_process[\s\S]*?control\.click\(\)/,
  "every Edge control invocation must verify control-process and foreground-process ownership",
);
assert.match(
  windowsCaptureSource,
  /menu_remains_open[\s\S]*?invoke_owned_control\(more, owned_process_id, handle, "Edge Settings and more close control"\)/,
  "the process-owned menu path must close a persistent Edge popup without global input",
);
const captureOwnedEdgeSource = windowsCaptureSource.match(/def capture_owned_edge\([\s\S]*?\r?\n\r?\ndef /)?.[0] || "";
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

process.stdout.write(`${JSON.stringify({ pass: true, contract: "edge-toolbar-zoom200-offline-v10-process-owned-uia-mobile-reference", cells: TOOLBAR_200_REQUIRED_CELLS.length }, null, 2)}\n`);
