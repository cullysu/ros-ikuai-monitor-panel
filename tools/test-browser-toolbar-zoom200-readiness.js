#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { TOOLBAR_200_REQUIRED_CELLS, TOOLBAR_INCREMENTS, TOOLBAR_CONTRACT, MOBILE_ORIGIN_OWNER, DESKTOP_ORIGIN_OWNER, toolbarReportReadiness } = require('./check-browser-toolbar-zoom200');
const { actionTimeout: panelRuntimeActionTimeout } = require('./acceptance/current-runtime-mock');

const runnerSource = fs.readFileSync(path.join(__dirname, 'check-browser-toolbar-zoom200.js'), 'utf8');
const windowsZoomSource = fs.readFileSync(path.join(__dirname, 'acceptance', 'accessibility-v2', 'windows_browser_zoom.py'), 'utf8');
const currentRuntimeMockSource = fs.readFileSync(path.join(__dirname, 'acceptance', 'current-runtime-mock.js'), 'utf8');
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
assert.doesNotMatch(windowsZoomSource, /keybd_event|SendInput|send_chord|\.click_input\s*\(/, 'toolbar automation must never emit global keyboard or physical mouse input');
assert.match(windowsZoomSource, /if args\.action == "menu-plus":[\s\S]*from pywinauto import Desktop/, 'pywinauto must be loaded only for the process-owned Edge menu action');
assert.match(windowsZoomSource, /def invoke_owned_control[\s\S]*control_process_id != owned_process_id[\s\S]*require_owned_foreground_process[\s\S]*control\.click\(\)/, 'Edge controls must be process-bound and activated through UIA only');
assert.match(windowsZoomSource, /UIA click uses Invoke\/Select[\s\S]*control\.click\(\)/, 'Edge activation must use pywinauto UIA click fallback, never physical click_input');
assert.match(windowsZoomSource, /NoPatternInterfaceError[\s\S]*pywinauto\.uia_defines as uia_defs[\s\S]*get_elem_interface\(control\.element_info\.element, \"LegacyIAccessible\"\)[\s\S]*DoDefaultAction\(\)/, 'Edge activation must retain a direct UIA LegacyIAccessible fallback without physical input');
assert.match(windowsZoomSource, /menu_remains_open[\s\S]*invoke_owned_control\(more, owned_process_id, handle, "Edge Settings and more close control"\)/, 'the owned Edge menu must be closed through UIA before the next increment or capture');
assert.match(windowsZoomSource, /def ui_control_is_visible_and_enabled[\s\S]*if not ui_control_is_visible_and_enabled\(button\):/, 'Edge UIA lookup must ignore hidden or disabled duplicate projections');
assert.match(windowsZoomSource, /more_tokens = \("settings and more", "设置及更多", "设置和更多", "更多"\)[\s\S]*find_buttons\(\(window,\), more_tokens, exact=True\)/, 'Settings and more lookup must use exact localized names');
assert.match(windowsZoomSource, /def ui_control_names\([\s\S]*element_info, "name"[\s\S]*window_text/, 'Edge UIA lookup must read the UIA Name property before the Win32 text projection');
assert.match(windowsZoomSource, /EDGE_ACCELERATOR_SUFFIX[\s\S]*def canonical_ui_name[\s\S]*def ui_name_matches[\s\S]*return normalized_name in normalized_tokens/, 'exact Edge names may only remove a recognized accelerator suffix');
assert.doesNotMatch(windowsZoomSource, /observed\.append|automation_id.*observed|json\.dumps\(observed/, 'UIA metadata must not be emitted into CI diagnostics');
assert.match(windowsZoomSource, /def safe_exception_message[\s\S]*type\(error\).__name__/, 'UIA failures must preserve a safe exception type when the message is empty');
assert.match(windowsZoomSource, /stage = \"find-owned-window\"[\s\S]*\"stage\": stage/, 'UIA failures must retain a bounded execution stage');
assert.match(windowsZoomSource, /candidate_names = ui_control_names\(candidate\)[\s\S]*ui_name_matches\(name, more_tokens, exact=True\)/, 'automation-id candidates must still pass canonical exact name validation');
assert.match(windowsZoomSource, /matched = any\([\s\S]*ui_name_matches\(candidate, tuple\(normalized_tokens\), exact=exact\)/, 'Edge UIA lookup must test every bounded name projection for the owned control');
assert.doesNotMatch(windowsZoomSource, /matched = name in normalized_tokens if exact else any\(token in name/, 'Edge UIA lookup must not regress to the old exact-or-broad-substring branch');
const configuredPanelRuntimeTimeout = Number(process.env.CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS || 0);
const expectedPanelRuntimeTimeout = Number.isFinite(configuredPanelRuntimeTimeout) && configuredPanelRuntimeTimeout > 0
  ? Math.min(300_000, Math.max(8_000, configuredPanelRuntimeTimeout))
  : 8_000;
assert.equal(panelRuntimeActionTimeout, expectedPanelRuntimeTimeout, 'mock pipe transport must share the bounded low-load browser action budget');
assert.match(currentRuntimeMockSource, /beginStop:[\s\S]*stopping = true/, 'mock transport must expose an explicit teardown boundary');
assert.match(currentRuntimeMockSource, /accepted: stopping \|\| Boolean\(browserFailure\)/, 'pipe resets must retain whether browser cancellation or teardown owned them');
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

function surface(label, handle, viewport) {
  const dimensions = {
    width: viewport.cssViewport.width,
    height: viewport.cssViewport.height,
  };
  const evidenceHash = (kind) => crypto.createHash('sha256').update(`${label}:${kind}`).digest('hex');
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
    screenshot: { file: `${label}-edge-toolbar-zoom200.png`, sha256: evidenceHash('windows'), dimensions },
    playwrightDiagnosticScreenshot: { file: `${label}-edge-toolbar-zoom200-playwright-diagnostic.png`, sha256: evidenceHash('renderer'), dimensions },
    windowsCapture: {
      pass: true,
      contract: 'windows-edge-toolbar-zoom-v1',
      action: 'capture',
      windowHandle: handle,
      captureOnly: true,
      capture: dimensions,
      captureState: { foregroundHandle: handle, captureMode: 'screen-unobscured', unobscured: true, sampleCount: 9, blockedSamples: [], windowRect: { left: 1, top: 1, right: 2, bottom: 2 } },
    },
  };
}

function assertCurrentOwnerReport(report, expectedIdentity = null) {
  assert.equal(report.pass, true, 'current-owner toolbar evidence must explicitly pass');
  assert.equal(report.contract, TOOLBAR_CONTRACT, 'current-owner toolbar evidence must use the current process-owned UIA Mobile Reference contract');
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

function passingReport(reportIdentity = identity) {
  const stableIdentity = { commit: reportIdentity.commit, fingerprint: 'd'.repeat(64), official: reportIdentity };
  return {
    pass: true,
    contract: TOOLBAR_CONTRACT,
    ownerContract: {
      ...MOBILE_ORIGIN_OWNER,
      desktopOverview: DESKTOP_ORIGIN_OWNER.overview,
      desktopRoute: DESKTOP_ORIGIN_OWNER.route,
      desktopNavigation: DESKTOP_ORIGIN_OWNER.navigation,
    },
    identity: reportIdentity,
    stableIdentity,
    platform: 'win32',
    proofBoundary: { doesNotProve: 'iOS Dynamic Type, Android system font size, Windows OS font size, CSS-injected text resize, CDP pageScale, or behavior on a physical mobile device.' },
    matrix: {
      complete: true,
      requiredCellIds: TOOLBAR_200_REQUIRED_CELLS.map(({ viewport, scenario }) => `${viewport.id}::${scenario}`),
    },
    cells: TOOLBAR_200_REQUIRED_CELLS.map(({ viewport, scenario }, cellIndex) => {
      const handle = 31415 + cellIndex;
      const expectedSurface = viewport.orientation === 'landscape' && viewport.cssViewport.width >= 600 ? 'desktop' : 'mobile';
      const incrementCount = Math.min(4, TOOLBAR_INCREMENTS);
      const baseline = { innerWidth: viewport.cssViewport.width * 2, innerHeight: viewport.cssViewport.height * 2, devicePixelRatio: 1 };
      const zoomed = { innerWidth: viewport.cssViewport.width, innerHeight: viewport.cssViewport.height, devicePixelRatio: 2 };
      const ladder = Array.from({ length: incrementCount + 1 }, (_, ladderIndex) => {
        const ratio = 1 + ladderIndex / incrementCount;
        return { innerWidth: baseline.innerWidth / ratio, innerHeight: baseline.innerHeight / ratio, devicePixelRatio: ratio };
      });
      const steps = Array.from({ length: incrementCount }, (_, index) => {
        const before = ladder[index];
        const after = ladder[index + 1];
        return {
          step: index + 1,
          acceptedAction: 'menu-plus',
          before,
          after,
          attempts: [{
            action: 'menu-plus',
            input: { pass: true, contract: 'windows-edge-toolbar-zoom-v1', action: 'menu-plus', captureOnly: false, windowHandle: handle },
            changed: true,
            before,
            after,
          }],
        };
      });
      return {
        viewport,
        scenario,
        expectedBaselineSurface: expectedSurface,
        browserSurface: expectedSurface,
        stableIdentity,
        baseline,
        zoomed,
        zoomLevel: { verified: true, expectedPercent: 200, toolbarIncrements: incrementCount },
        windowsAutomation: {
          pass: true,
          windowHandle: handle,
          baselineInspection: { pass: true, contract: 'windows-edge-toolbar-zoom-v1', action: 'inspect', windowHandle: handle },
          steps,
          final: zoomed,
        },
        surface: surface(`${viewport.id}-${scenario}`, handle, viewport),
      };
    }),
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
  const exactReport = passingReport(cleanCurrentIdentity);
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

  const missingCaptureDimensions = passingReport();
  delete missingCaptureDimensions.cells[0].surface.windowsCapture.capture;
  assert.equal(toolbarReportReadiness(missingCaptureDimensions).code, 'V10_EVIDENCE_INVALID');

  const reusedVisualEvidence = passingReport();
  reusedVisualEvidence.cells[1].surface.screenshot.sha256 = reusedVisualEvidence.cells[0].surface.screenshot.sha256;
  assert.equal(toolbarReportReadiness(reusedVisualEvidence).code, 'V10_EVIDENCE_INVALID');

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
