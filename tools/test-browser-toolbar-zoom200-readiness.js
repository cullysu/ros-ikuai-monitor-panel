#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { TOOLBAR_200_REQUIRED_CELLS, TOOLBAR_INCREMENTS } = require('./check-browser-toolbar-zoom200');
const { assertToolbarZoom200Report } = require('./check-public-release-readiness');

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
    main: { horizontalOverflow: 0 },
    clippedOperationalText: [],
    unreadableOperationalText: [],
    primary: { present: true, visible: true, reachable: true, withinMain: true, obscuredByNavigation: false },
    keyboardFocus: { focusVisible: true, fullyVisible: true, withinMain: true, obscuredByNavigation: false },
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

function passingReport() {
  const stableIdentity = { commit: identity.commit, fingerprint: 'd'.repeat(64) };
  return {
    pass: true,
    contract: 'edge-toolbar-zoom200-windows-v5',
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
  assert.throws(() => assertToolbarZoom200Report(root, identity), /report is missing/);
  write(passingReport());
  assert.doesNotThrow(() => assertToolbarZoom200Report(root, identity));

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
  assert.doesNotThrow(() => assertToolbarZoom200Report(root, identity));

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
  assert.doesNotThrow(() => assertToolbarZoom200Report(root, identity));

  const stale = passingReport();
  stale.identity = { ...identity, worktreeFingerprint: 'e'.repeat(64) };
  write(stale);
  assert.throws(() => assertToolbarZoom200Report(root, identity), /failed or stale/);

  const failed = passingReport();
  failed.pass = false;
  write(failed);
  assert.throws(() => assertToolbarZoom200Report(root, identity), /failed or stale/);

  const incomplete = passingReport();
  incomplete.cells.pop();
  write(incomplete);
  assert.throws(() => assertToolbarZoom200Report(root, identity), /matrix is incomplete/);

  const clipped = passingReport();
  clipped.cells[0].surface.clippedOperationalText = [{ text: 'truncated' }];
  write(clipped);
  assert.throws(() => assertToolbarZoom200Report(root, identity), /task, navigation clearance, clipping, overflow, focus, or Windows screenshot evidence failed/);

  const unreadable = passingReport();
  unreadable.cells[0].surface.unreadableOperationalText = [{ text: 'too small', fontSize: 9 }];
  write(unreadable);
  assert.throws(() => assertToolbarZoom200Report(root, identity), /task, navigation clearance, clipping, overflow, focus, or Windows screenshot evidence failed/);

  const rootOverflow = passingReport();
  rootOverflow.cells[0].surface.main.horizontalOverflow = 2;
  write(rootOverflow);
  assert.throws(() => assertToolbarZoom200Report(root, identity), /task, navigation clearance, clipping, overflow, focus, or Windows screenshot evidence failed/);

  const navigationObscured = passingReport();
  navigationObscured.cells[0].surface.primary.obscuredByNavigation = true;
  write(navigationObscured);
  assert.throws(() => assertToolbarZoom200Report(root, identity), /task, navigation clearance, clipping, overflow, focus, or Windows screenshot evidence failed/);

  const obscured = passingReport();
  obscured.cells[0].surface.windowsCapture.captureState.unobscured = false;
  write(obscured);
  assert.throws(() => assertToolbarZoom200Report(root, identity), /task, navigation clearance, clipping, overflow, focus, or Windows screenshot evidence failed/);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

process.stdout.write(`${JSON.stringify({ pass: true, contract: 'edge-toolbar-zoom200-readiness-fixture-v3' })}\n`);
