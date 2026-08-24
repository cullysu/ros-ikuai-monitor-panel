#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  FOCUSED_SOURCE_RUNTIME_REPORTS,
  assertFocusedSourceRuntimeReports,
} = require('./check-public-release-readiness');
const { createSourceRuntimeReportIdentity } = require('./source-runtime-report-identity');

function fixtureIdentity() {
  return {
    capturedAt: new Date().toISOString(),
    worktree: {
      commit: '1'.repeat(40),
      worktreeClean: false,
      worktreeFingerprint: '2'.repeat(64),
      reviewContentFingerprint: '3'.repeat(64),
      artifactKey: 'worktree-111111111111-222222222222',
      releaseEvidenceEligible: false,
      untrackedFiles: 2,
      runtimeUntrackedFiles: 2,
      identityError: '',
    },
    framework: {
      pass: true,
      manifestVersion: 3,
      expected: { algorithm: 'sha256', schema: 'framework-inputs-v1', digest: '4'.repeat(64), files: 20 },
      actual: { algorithm: 'sha256', schema: 'framework-inputs-v1', digest: '4'.repeat(64), files: 20 },
      reasons: [],
    },
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function writeRuntime(runtimeDirectory) {
  fs.mkdirSync(runtimeDirectory, { recursive: true });
  fs.writeFileSync(path.join(runtimeDirectory, 'panel-framework.js'), 'window.focusedFixture = true;\n');
  fs.writeFileSync(path.join(runtimeDirectory, 'style.css'), '.focused-fixture { display: block; }\n');
  fs.writeFileSync(path.join(runtimeDirectory, 'desktop-overview.css'), '.desktop-fixture { display: grid; }\n');
}

function makeReport(definition, runtimeDirectory, currentIdentity, generatedAt = new Date().toISOString()) {
  const report = {
    contract: definition.contract,
    phase: 'browser',
    generatedAt,
    stagePass: true,
    pass: true,
    complete: true,
    pageErrors: [],
    consoleErrors: [],
    requestErrors: [],
    requestFailures: [],
    identity: createSourceRuntimeReportIdentity({
      runtimeDirectory,
      requiredFiles: definition.requiredFiles,
      start: clone(currentIdentity),
      build: clone(currentIdentity),
      browser: clone(currentIdentity),
      end: clone(currentIdentity),
    }),
  };
  if (definition.name === 'desktopResourceDensity') {
    const checks = () => ({
      desktopResourceScenario: true,
      compactVerdictVisible: true,
      resourceEvidenceVisible: true,
      resourceTripletTruthful: true,
      workspaceStartsInFixedFirstViewport: true,
      firstObjectStartsInFixedFirstViewport: true,
      resourcePrecedesWorkspace: true,
      noReorderHole: true,
      noHorizontalOverflow: true,
    });
    report.results = [
      { viewport: { width: 1366, height: 768 }, pass: true, checks: checks() },
      { viewport: { width: 1440, height: 900 }, pass: true, checks: checks() },
    ];
  } else {
    report.checks = {
      directionPeaksAreExact: true,
      leftWanUsesCurrentEvidence: true,
      bboxInsideViewBox: true,
      domRectInsideSvg: true,
      domRectInsideChartContainer: true,
      labelHasPositiveAxisGap: true,
    };
    report.geometry = [{ direction: 'up' }, { direction: 'down' }];
  }
  return report;
}

function writeReport(reportPath, report) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
}

function main() {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'focused-source-runtime-readiness-'));
  const nowMs = Date.now();
  const currentIdentity = fixtureIdentity();
  const reports = new Map();
  try {
    for (const definition of FOCUSED_SOURCE_RUNTIME_REPORTS) {
      const runtimeDirectory = path.join(fixtureRoot, definition.runtimeRelative);
      const reportPath = path.join(fixtureRoot, definition.reportRelative);
      writeRuntime(runtimeDirectory);
      const report = makeReport(definition, runtimeDirectory, currentIdentity);
      writeReport(reportPath, report);
      reports.set(definition.name, { definition, runtimeDirectory, reportPath, report });
    }

    const valid = assertFocusedSourceRuntimeReports(fixtureRoot, { currentIdentity, nowMs, maxAgeMs: 60_000 });
    assert.deepEqual(Object.keys(valid).sort(), ['desktopResourceDensity', 'wanAxisLabelIntegrity']);

    const wan = reports.get('wanAxisLabelIntegrity');
    fs.rmSync(wan.reportPath);
    assert.throws(
      () => assertFocusedSourceRuntimeReports(fixtureRoot, { currentIdentity, nowMs, maxAgeMs: 60_000 }),
      /wanAxisLabelIntegrity: report is missing/,
    );
    writeReport(wan.reportPath, wan.report);

    const desktop = reports.get('desktopResourceDensity');
    const stale = clone(desktop.report);
    stale.identity.start.worktree.artifactKey = 'stale-artifact';
    writeReport(desktop.reportPath, stale);
    assert.throws(
      () => assertFocusedSourceRuntimeReports(fixtureRoot, { currentIdentity, nowMs, maxAgeMs: 60_000 }),
      /identity phase is stale: start/,
    );
    writeReport(desktop.reportPath, desktop.report);

    const forgedDesktop = clone(desktop.report);
    forgedDesktop.results[0].pass = false;
    forgedDesktop.results[0].checks.desktopResourceScenario = false;
    writeReport(desktop.reportPath, forgedDesktop);
    assert.throws(
      () => assertFocusedSourceRuntimeReports(fixtureRoot, { currentIdentity, nowMs, maxAgeMs: 60_000 }),
      /desktop resource result is failed or structurally incomplete/,
    );
    writeReport(desktop.reportPath, desktop.report);

    const inventedDesktopChecks = clone(desktop.report);
    inventedDesktopChecks.results[0].checks = { invented: true };
    writeReport(desktop.reportPath, inventedDesktopChecks);
    assert.throws(
      () => assertFocusedSourceRuntimeReports(fixtureRoot, { currentIdentity, nowMs, maxAgeMs: 60_000 }),
      /desktop resource result is failed or structurally incomplete/,
    );
    writeReport(desktop.reportPath, desktop.report);

    const forgedWan = clone(wan.report);
    forgedWan.checks.directionPeaksAreExact = false;
    writeReport(wan.reportPath, forgedWan);
    assert.throws(
      () => assertFocusedSourceRuntimeReports(fixtureRoot, { currentIdentity, nowMs, maxAgeMs: 60_000 }),
      /WAN axis checks are failed or structurally incomplete/,
    );
    writeReport(wan.reportPath, wan.report);

    fs.appendFileSync(path.join(wan.runtimeDirectory, 'panel-framework.js'), '// tampered\n');
    assert.throws(
      () => assertFocusedSourceRuntimeReports(fixtureRoot, { currentIdentity, nowMs, maxAgeMs: 60_000 }),
      /source runtime files are missing, stale, or tampered/,
    );
    writeRuntime(wan.runtimeDirectory);

    const contaminated = makeReport(desktop.definition, desktop.runtimeDirectory, currentIdentity);
    contaminated.consoleErrors = ['Failed to load resource: 404', 'Failed to load resource: 404'];
    writeReport(desktop.reportPath, contaminated);
    assert.throws(
      () => assertFocusedSourceRuntimeReports(fixtureRoot, { currentIdentity, nowMs, maxAgeMs: 60_000 }),
      /consoleErrors is contaminated \(2\)/,
    );

    const oldReport = makeReport(
      desktop.definition,
      desktop.runtimeDirectory,
      currentIdentity,
      new Date(nowMs - 120_000).toISOString(),
    );
    writeReport(desktop.reportPath, oldReport);
    assert.throws(
      () => assertFocusedSourceRuntimeReports(fixtureRoot, { currentIdentity, nowMs, maxAgeMs: 60_000 }),
      /report is stale/,
    );

    console.log('focused source runtime readiness fixtures passed');
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

main();
