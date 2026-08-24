#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  DESKTOP_RESOURCE_REPORT_CONTRACT,
  SOURCE_RUNTIME_REPORT_IDENTITY_SCHEMA,
  WAN_AXIS_REPORT_CONTRACT,
  createSourceRuntimeReportIdentity,
  readAttestedRuntimeFile,
  validateCurrentSourceRuntimeReport,
} = require('./source-runtime-report-identity');

const CONTRACT = 'focused-source-runtime-fixture-v1';
const REQUIRED_FILES = ['panel-framework.js', 'style.css', 'desktop-overview.css'];

function fixtureIdentity() {
  return {
    capturedAt: new Date().toISOString(),
    worktree: {
      commit: 'a'.repeat(40),
      worktreeClean: false,
      worktreeFingerprint: 'b'.repeat(64),
      reviewContentFingerprint: 'c'.repeat(64),
      artifactKey: 'worktree-aaaaaaaaaaaa-bbbbbbbbbbbb',
      releaseEvidenceEligible: false,
      untrackedFiles: 1,
      runtimeUntrackedFiles: 1,
      identityError: '',
    },
    framework: {
      pass: true,
      manifestVersion: 3,
      expected: { algorithm: 'sha256', schema: 'framework-inputs-v1', digest: 'd'.repeat(64), files: 12 },
      actual: { algorithm: 'sha256', schema: 'framework-inputs-v1', digest: 'd'.repeat(64), files: 12 },
      reasons: [],
    },
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function finalReport(runtimeDirectory, currentIdentity) {
  return {
    contract: CONTRACT,
    phase: 'browser',
    generatedAt: new Date().toISOString(),
    stagePass: true,
    pass: true,
    complete: true,
    pageErrors: [],
    consoleErrors: [],
    requestErrors: [],
    requestFailures: [],
    identity: createSourceRuntimeReportIdentity({
      runtimeDirectory,
      requiredFiles: REQUIRED_FILES,
      start: clone(currentIdentity),
      build: clone(currentIdentity),
      browser: clone(currentIdentity),
      end: clone(currentIdentity),
    }),
  };
}

function validate(report, runtimeDirectory, currentIdentity, options = {}) {
  return validateCurrentSourceRuntimeReport(report, {
    rootDir: path.dirname(runtimeDirectory),
    runtimeDirectory,
    requiredFiles: REQUIRED_FILES,
    expectedContract: CONTRACT,
    currentIdentity,
    nowMs: Date.now(),
    maxAgeMs: 60_000,
    ...options,
  });
}

function main() {
  assert.equal(DESKTOP_RESOURCE_REPORT_CONTRACT, 'desktop-resource-density-v4-exact-current');
  assert.equal(WAN_AXIS_REPORT_CONTRACT, 'wan-axis-label-integrity-v3-exact-current');
  const projectRoot = path.resolve(__dirname, '..');
  const desktopEntry = path.join(projectRoot, 'src', 'panel-framework', 'desktop', 'main.tsx');
  const retiredCompositeEntry = path.join(projectRoot, 'src', 'panel-framework', 'main.tsx');
  assert.equal(fs.existsSync(desktopEntry), true, 'focused browser builds require the current desktop entry');
  assert.equal(fs.existsSync(retiredCompositeEntry), false, 'retired composite main.tsx must remain deleted');
  for (const checker of [
    'check-desktop-resource-density-v2.js',
    'check-wan-axis-label-integrity-v1.js',
  ]) {
    const source = fs.readFileSync(path.join(__dirname, checker), 'utf8');
    assert.match(
      source,
      /path\.join\(root, ["']src["'], ["']panel-framework["'], ["']desktop["'], ["']main\.tsx["']\)/,
      `${checker} must build from desktop/main.tsx`,
    );
    assert.doesNotMatch(
      source,
      /path\.join\(root, ["']src["'], ["']panel-framework["'], ["']main\.tsx["']\)/,
      `${checker} must not reference the retired composite main.tsx`,
    );
  }
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'source-runtime-report-identity-'));
  const runtimeDirectory = path.join(fixtureRoot, 'source-runtime');
  try {
    fs.mkdirSync(runtimeDirectory);
    fs.writeFileSync(path.join(runtimeDirectory, 'panel-framework.js'), 'window.fixture = true;\n');
    fs.writeFileSync(path.join(runtimeDirectory, 'style.css'), '.fixture { color: green; }\n');
    fs.writeFileSync(path.join(runtimeDirectory, 'desktop-overview.css'), '.overview { display: grid; }\n');
    const currentIdentity = fixtureIdentity();
    const report = finalReport(runtimeDirectory, currentIdentity);

    assert.equal(report.identity.schema, SOURCE_RUNTIME_REPORT_IDENTITY_SCHEMA);
    assert.equal(validate(report, runtimeDirectory, currentIdentity).pass, true);
    assert.equal(validate(null, runtimeDirectory, currentIdentity).pass, false, 'missing report must fail closed');

    const stale = clone(report);
    stale.identity.end.worktree.worktreeFingerprint = 'e'.repeat(64);
    assert.match(validate(stale, runtimeDirectory, currentIdentity).reasons.join('\n'), /identity phase is stale: end/);

    const missingIdentity = clone(report);
    delete missingIdentity.identity;
    assert.equal(validate(missingIdentity, runtimeDirectory, currentIdentity).pass, false);

    const staleTime = clone(report);
    staleTime.generatedAt = new Date(Date.now() - 120_000).toISOString();
    assert.match(validate(staleTime, runtimeDirectory, currentIdentity).reasons.join('\n'), /report is stale/);

    fs.appendFileSync(path.join(runtimeDirectory, 'style.css'), '/* tampered */\n');
    assert.throws(
      () => readAttestedRuntimeFile(runtimeDirectory, '/style.css', report.identity.sourceRuntime),
      /differs from the build attestation/,
      'bytes changed after preflight must never be served to the browser',
    );
    assert.match(validate(report, runtimeDirectory, currentIdentity).reasons.join('\n'), /missing, stale, or tampered/);
    fs.writeFileSync(path.join(runtimeDirectory, 'style.css'), '.fixture { color: green; }\n');

    const invalidFramework = clone(currentIdentity);
    invalidFramework.framework.pass = false;
    invalidFramework.framework.reasons = ['fixture framework asset mismatch'];
    assert.equal(validate(report, runtimeDirectory, invalidFramework).pass, false, 'non-current framework assets must fail closed');

    for (const [field, values] of [
      ['pageErrors', ['uncaught fixture error']],
      ['consoleErrors', ['Failed to load resource: 404', 'Failed to load resource: 404']],
      ['requestErrors', [{ status: 404, url: '/missing.css' }]],
      ['requestFailures', [{ url: '/aborted.js', errorText: 'net::ERR_ABORTED' }]],
    ]) {
      const contaminated = finalReport(runtimeDirectory, currentIdentity);
      contaminated[field] = values;
      const result = validate(contaminated, runtimeDirectory, currentIdentity);
      assert.equal(result.pass, false, `${field} contamination must fail closed`);
      assert.match(result.reasons.join('\n'), new RegExp(field));
    }

    const buildOnly = finalReport(runtimeDirectory, currentIdentity);
    buildOnly.phase = 'build-only';
    buildOnly.pass = false;
    buildOnly.complete = false;
    delete buildOnly.identity.browser;
    const buildValidation = validate(buildOnly, runtimeDirectory, currentIdentity, {
      requireFinal: false,
      requireBrowserPhase: false,
    });
    assert.equal(buildValidation.pass, true, buildValidation.reasons.join('; '));

    console.log('source runtime report identity fixtures passed');
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

main();
