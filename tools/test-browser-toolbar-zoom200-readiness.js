#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { TOOLBAR_200_REQUIRED_CELLS, TOOLBAR_INCREMENTS, TOOLBAR_CONTRACT, MOBILE_ORIGIN_OWNER, DESKTOP_ORIGIN_OWNER, toolbarReportReadiness } = require('./check-browser-toolbar-zoom200');
const { actionTimeout: panelRuntimeActionTimeout } = require('./check-panel-runtime-browser');

const runnerSource = fs.readFileSync(path.join(__dirname, 'check-browser-toolbar-zoom200.js'), 'utf8');
const windowsZoomSource = fs.readFileSync(path.join(__dirname, 'acceptance', 'accessibility-v2', 'windows_browser_zoom.py'), 'utf8');
const panelRuntimeSource = fs.readFileSync(path.join(__dirname, 'check-panel-runtime-browser.js'), 'utf8');
const accessibilityRuntimeSource = fs.readFileSync(path.join(__dirname, 'acceptance', 'accessibility-v2', 'runtime.js'), 'utf8');
assert.match(runnerSource, /main\[data-mobile-reference-home\]/, 'the toolbar fixture must bind to the accepted Mobile Reference overview owner');
assert.match(runnerSource, /data-mobile-reference-workspace/, 'the toolbar fixture must bind route checks to the accepted Mobile Reference owner');
assert.match(runnerSource, /data-mobile-reference-navigation/, 'the toolbar fixture must verify the accepted Mobile Reference navigation owner');
assert.match(runnerSource, /main\[data-desktop-overview\]/, 'the toolbar fixture must bind wide landscape overview checks to the browser owner');
assert.match(runnerSource, /data-panel-route=\\"interfaces\\"/, 'the toolbar fixture must bind wide landscape route checks to the browser owner');
assert.match(runnerSource, /\.panel-task-navigation/, 'the toolbar fixture must verify wide landscape browser navigation ownership');
assert.match(runnerSource, /keyboardTraversal/, 'the toolbar fixture must traverse every current-owner control');
assert.match(runnerSource, /maxLeft === 0/, 'the toolbar fixture must fail on any horizontal scroll range');
assert.match(runnerSource, /process\.env\.PYTHON_EXECUTABLE \|\| "python"/, 'toolbar automation must use the setup-python interpreter from PATH unless explicitly overridden');
assert.doesNotMatch(runnerSource, /spawn\("py"|\["-3", "-B"/, 'toolbar automation must not bypass setup-python through the Windows launcher');
assert.doesNotMatch(runnerSource, /data-mobile-pulse|\.oc-objects|data-mobile-ops-overview|mop-route-row/, 'the toolbar fixture must not retain retired mobile selector fallbacks');
assert.match(windowsZoomSource, /send_chord\(0x11, 0x30\).*Ctrl \+ 0/, 'toolbar reset must use a real bounded Win32 Ctrl+0 input without importing the full UIA tree');
assert.match(windowsZoomSource, /elif args\.action == "menu-plus":[\s\S]*from pywinauto import Desktop/, 'pywinauto must be loaded only for the real Edge menu fallback');
assert.doesNotMatch(windowsZoomSource, /from pywinauto import Desktop, keyboard/, 'simple physical key actions must not pay the full UIA import cost');
const configuredPanelRuntimeTimeout = Number(process.env.CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS || 0);
const expectedPanelRuntimeTimeout = Number.isFinite(configuredPanelRuntimeTimeout) && configuredPanelRuntimeTimeout > 0
  ? Math.min(300_000, Math.max(8_000, configuredPanelRuntimeTimeout))
  : 8_000;
assert.equal(panelRuntimeActionTimeout, expectedPanelRuntimeTimeout, 'mock pipe transport must share the bounded low-load browser action budget');
assert.match(panelRuntimeSource, /beginStop:[\s\S]*stopping = true/, 'mock transport must expose an explicit teardown boundary');
assert.match(panelRuntimeSource, /accepted: stopping \|\| Boolean\(browserFailure\)/, 'pipe resets must retain whether browser cancellation or teardown owned them');
assert.match(accessibilityRuntimeSource, /runtime\.mock\?\.beginStop\?\.\(\);[\s\S]*runtime\.context/, 'accessibility cleanup must mark mock teardown before closing the browser context');
assert.match(runnerSource, /pipeResets\.every\(\(item\) => item\.accepted === true\)/, 'toolbar evidence must reject any active mock pipe reset after cleanup');

const runtimePath = path.join(__dirname, 'acceptance', 'accessibility-v2', 'runtime.js');
function runtimeActionTimeout(extraEnv = {}, removedEnv = []) {
  const env = { ...process.env, ...extraEnv };
  for (const name of removedEnv) delete env[name];
  return Number(execFileSync(process.execPath, [
    '-p',
    `require(${JSON.stringify(runtimePath)}).ACTION_TIMEOUT_MS`,
  ], { env, encoding: 'utf8', windowsHide: true }).trim());
}
assert.equal(runtimeActionTimeout({}, ['CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS']), 8_000, 'ordinary browser actions must retain the fast timeout');
assert.equal(runtimeActionTimeout({ CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS: '90000' }), 90_000, 'CPU-capped browser actions must trade wall time for lower machine impact');

function toolbarTimeouts(extraEnv = {}, removedEnv = []) {
  const env = { ...process.env, ...extraEnv };
  for (const name of removedEnv) delete env[name];
  return JSON.parse(execFileSync(process.execPath, [
    '-p',
    `JSON.stringify((({ UI_ACTION_TIMEOUT_MS, CELL_TIMEOUT_MS }) => ({ UI_ACTION_TIMEOUT_MS, CELL_TIMEOUT_MS }))(require(${JSON.stringify(path.join(__dirname, 'check-browser-toolbar-zoom200.js'))})))`,
  ], { env, encoding: 'utf8', windowsHide: true }).trim());
}
assert.deepEqual(toolbarTimeouts({}, ['CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS']), { UI_ACTION_TIMEOUT_MS: 8_000, CELL_TIMEOUT_MS: 180_000 }, 'ordinary toolbar automation must retain bounded fast timeouts');
assert.deepEqual(toolbarTimeouts({ CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS: '90000' }), { UI_ACTION_TIMEOUT_MS: 90_000, CELL_TIMEOUT_MS: 1_350_000 }, 'CPU-capped toolbar automation must keep assertions while extending only wall-clock budgets');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'router-panel-toolbar-readiness-'));
const reportPath = path.join(root, '_acceptance', 'edge-toolbar-zoom200', 'report.json');
const identity = {
  commit: 'a'.repeat(40),
  worktreeFingerprint: 'b'.repeat(64),
  artifactKey: 'worktree-aaaaaaaaaaaa-bbbbbbbbbbbb',
  worktreeClean: false,
  releaseEvidenceEligible: false,
};

function surface(label) {
  return {
    label,
    overflowX: 0,
    main: { horizontalOverflow: 0, maxLeft: 0 },
    clippedOperationalText: [],
    unreadableOperationalText: [],
    primary: { present: true, visible: true, reachable: true, withinMain: true, obscuredByNavigation: false },
    keyboardTraversal: { complete: true, expectedCount: 2, visitedCount: 2, missingIds: [], sequence: [
      { order: 1, id: 'control-0', focusVisible: true, outlineWidth: 2, outlineStyle: 'solid', fullyVisible: true, withinMain: true, obscuredByNavigation: false },
      { order: 2, id: 'control-1', focusVisible: true, outlineWidth: 2, outlineStyle: 'solid', fullyVisible: true, withinMain: true, obscuredByNavigation: false },
    ] },
    screenshot: { file: `${label}.png`, sha256: 'c'.repeat(64) },
    playwrightDiagnosticScreenshot: { file: `${label}-playwright-diagnostic.png`, sha256: 'd'.repeat(64) },
    windowsCapture: {
      pass: true,
      windowHandle: 31415,
      captureOnly: true,
      captureState: { foregroundHandle: 31415, captureMode: 'screen-unobscured', unobscured: true, sampleCount: 9, blockedSamples: [], windowRect: { left: 1, top: 1, right: 2, bottom: 2 } },
    },
  };
}

function assertCurrentOwnerReport(report, expectedIdentity = null) {
  assert.equal(report.pass, true, 'current-owner toolbar evidence must explicitly pass');
  assert.equal(report.contract, 'edge-toolbar-zoom200-windows-v9-variable-increment-mobile-reference', 'current-owner toolbar evidence must use the current variable-increment Mobile Reference contract');
  assert.equal(report.matrix.complete, true, 'current-owner toolbar matrix must be complete');
  assert.equal(report.cells.length, TOOLBAR_200_REQUIRED_CELLS.length, 'current-owner toolbar matrix cell count must match');
  if (expectedIdentity) assert.equal(report.identity.worktreeFingerprint, expectedIdentity.worktreeFingerprint, 'current-owner toolbar evidence must not be stale');
  for (const cell of report.cells) {
    assert.equal(cell.zoomLevel.verified, true, 'actual toolbar zoom must be verified');
    assert.equal(cell.zoomLevel.expectedPercent, 200, 'actual toolbar zoom must be 200%');
    assert.equal(cell.surface.primary.reachable, true, 'current-owner primary task must remain reachable');
    assert.equal(cell.surface.primary.obscuredByNavigation, false, 'current-owner primary task must clear navigation');
    assert.equal(cell.surface.main.horizontalOverflow, 0, 'current-owner main scroll root must not overflow horizontally');
    assert.deepEqual(cell.surface.clippedOperationalText, [], 'current-owner operational text must not clip');
    assert.deepEqual(cell.surface.unreadableOperationalText, [], 'current-owner operational text must respect readability floor');
    assert.equal(cell.surface.main.maxLeft, 0, 'current-owner main must have no horizontal scroll range');
    assert.equal(cell.surface.keyboardTraversal.complete, true, 'current-owner keyboard traversal must be complete');
    assert.equal(cell.surface.keyboardTraversal.visitedCount, cell.surface.keyboardTraversal.expectedCount, 'current-owner keyboard traversal must reach every expected control');
    assert.equal(cell.surface.windowsCapture.captureState.unobscured, true, 'current-owner Windows capture must be unobscured in the readiness fixture');
  }
}

function passingReport() {
  const stableIdentity = { commit: identity.commit, fingerprint: 'd'.repeat(64) };
  return {
    pass: true,
    contract: TOOLBAR_CONTRACT,
    ownerContract: {
      ...MOBILE_ORIGIN_OWNER,
      desktopOverview: DESKTOP_ORIGIN_OWNER.overview,
      desktopRoute: DESKTOP_ORIGIN_OWNER.route,
      desktopNavigation: DESKTOP_ORIGIN_OWNER.navigation,
    },
    identity,
    stableIdentity,
    proofBoundary: { doesNotProve: 'iOS Dynamic Type, Android system font size, Windows OS font size, CSS-injected text resize, CDP pageScale, or behavior on a physical mobile device.' },
    matrix: { complete: true },
    cells: TOOLBAR_200_REQUIRED_CELLS.map(({ viewport, scenario }) => ({
      viewport,
      scenario,
      stableIdentity,
      zoomLevel: { verified: true, expectedPercent: 200, toolbarIncrements: TOOLBAR_INCREMENTS },
      windowsAutomation: {
        pass: true,
        steps: Array.from({ length: TOOLBAR_INCREMENTS }, (_, index) => ({
          step: index + 1,
          acceptedAction: 'menu-plus',
          attempts: [
            { action: 'oem-plus', input: { pass: true }, changed: false },
            { action: 'numpad-plus', input: { pass: true }, changed: false },
            { action: 'menu-plus', input: { pass: true }, changed: true },
          ],
        })),
      },
      surface: surface(`${viewport.id}-${scenario}`),
    })),
  };
}

function write(report) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
}

try {
  write(passingReport());
  assert.doesNotThrow(() => assertCurrentOwnerReport(JSON.parse(fs.readFileSync(reportPath, 'utf8')), identity));
  assert.equal(toolbarReportReadiness(passingReport()).pass, true);

  const cleanCurrentIdentity = {
    ...identity,
    worktreeClean: true,
    releaseEvidenceEligible: true,
  };
  const exactReport = passingReport();
  exactReport.identity = cleanCurrentIdentity;
  assert.equal(toolbarReportReadiness(exactReport, cleanCurrentIdentity).pass, true);
  const differentCurrentSha = {
    ...cleanCurrentIdentity,
    commit: 'f'.repeat(40),
    artifactKey: 'f'.repeat(40),
  };
  assert.equal(toolbarReportReadiness(exactReport, differentCurrentSha).code, 'V8_EXACT_SHA_STALE');

  const oldOwner = passingReport();
  oldOwner.contract = 'edge-toolbar-zoom200-windows-v6-mobile-pulse';
  assert.equal(toolbarReportReadiness(oldOwner).code, 'V8_CONTRACT_STALE');

  const incompleteKeyboard = passingReport();
  incompleteKeyboard.cells[0].surface.keyboardTraversal.complete = false;
  incompleteKeyboard.cells[0].surface.keyboardTraversal.visitedCount = 1;
  assert.equal(toolbarReportReadiness(incompleteKeyboard).code, 'V8_CELL_ACCESSIBILITY_FAILED');

  const ownerRendered = passingReport();
  ownerRendered.cells[0].surface.windowsCapture.captureState = {
    foregroundHandle: 31415,
    captureMode: 'owned-window-render',
    unobscured: false,
    sampleCount: 9,
    blockedSamples: [{ x: 1, y: 1, coveringRoot: 99 }],
    ownedWindowRender: { success: true, method: 'PrintWindow', sampledColorCount: 32, channelSpan: 200 },
    windowRect: { left: 1, top: 1, right: 2, bottom: 2 },
  };
  write(ownerRendered);
  assert.throws(() => assertCurrentOwnerReport(JSON.parse(fs.readFileSync(reportPath, 'utf8')), identity), /unobscured/);

  const screenSegment = passingReport();
  screenSegment.cells[0].surface.windowsCapture.captureState = {
    foregroundHandle: 31415,
    captureMode: 'screen-visible-segment',
    unobscured: false,
    sampleCount: 9,
    blockedSamples: [{ x: 1, y: 1, coveringRoot: 99 }],
    ownedWindowRender: { success: false },
    visibleSegment: { success: true, method: 'physical-screen-segment', unobscured: true, coverageRatio: 0.68, sampleCount: 9, sampledColorCount: 64, channelSpan: 300 },
    windowRect: { left: 1, top: 1, right: 2, bottom: 2 },
  };
  write(screenSegment);
  assert.throws(() => assertCurrentOwnerReport(JSON.parse(fs.readFileSync(reportPath, 'utf8')), identity), /unobscured/);

  const stale = passingReport();
  stale.identity = { ...identity, worktreeFingerprint: 'e'.repeat(64) };
  write(stale);
  assert.throws(() => assertCurrentOwnerReport(JSON.parse(fs.readFileSync(reportPath, 'utf8')), identity), /stale/);

  const failed = passingReport();
  failed.pass = false;
  write(failed);
  assert.throws(() => assertCurrentOwnerReport(JSON.parse(fs.readFileSync(reportPath, 'utf8'))), /explicitly pass/);

  const incomplete = passingReport();
  incomplete.cells.pop();
  write(incomplete);
  assert.throws(() => assertCurrentOwnerReport(JSON.parse(fs.readFileSync(reportPath, 'utf8'))), /cell count/);

  const clipped = passingReport();
  clipped.cells[0].surface.clippedOperationalText = [{ text: 'truncated' }];
  write(clipped);
  assert.throws(() => assertCurrentOwnerReport(JSON.parse(fs.readFileSync(reportPath, 'utf8')), identity), /operational text must not clip/);

  const unreadable = passingReport();
  unreadable.cells[0].surface.unreadableOperationalText = [{ text: 'too small', fontSize: 9 }];
  write(unreadable);
  assert.throws(() => assertCurrentOwnerReport(JSON.parse(fs.readFileSync(reportPath, 'utf8')), identity), /readability floor/);

  const rootOverflow = passingReport();
  rootOverflow.cells[0].surface.main.horizontalOverflow = 2;
  write(rootOverflow);
  assert.throws(() => assertCurrentOwnerReport(JSON.parse(fs.readFileSync(reportPath, 'utf8')), identity), /must not overflow horizontally/);

  const maxLeft = passingReport();
  maxLeft.cells[0].surface.main.maxLeft = 1;
  write(maxLeft);
  assert.throws(() => assertCurrentOwnerReport(JSON.parse(fs.readFileSync(reportPath, 'utf8')), identity), /no horizontal scroll range/);

  const navigationObscured = passingReport();
  navigationObscured.cells[0].surface.primary.obscuredByNavigation = true;
  write(navigationObscured);
  assert.throws(() => assertCurrentOwnerReport(JSON.parse(fs.readFileSync(reportPath, 'utf8')), identity), /clear navigation/);

  const obscured = passingReport();
  obscured.cells[0].surface.windowsCapture.captureState.unobscured = false;
  write(obscured);
  assert.throws(() => assertCurrentOwnerReport(JSON.parse(fs.readFileSync(reportPath, 'utf8')), identity), /unobscured/);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

process.stdout.write(`${JSON.stringify({ pass: true, contract: 'edge-toolbar-zoom200-mobile-reference-readiness-fixture-v6' })}\n`);
