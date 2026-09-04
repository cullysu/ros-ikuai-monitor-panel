#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  browserCandidates,
  buildAttestation,
  validateBrowserOnlyAttestation,
} = require('./check-wan-axis-label-integrity-v1');

function fixtureIdentity() {
  return {
    capturedAt: new Date().toISOString(),
    worktree: {
      commit: '5'.repeat(40),
      worktreeClean: false,
      worktreeFingerprint: '6'.repeat(64),
      reviewContentFingerprint: '7'.repeat(64),
      artifactKey: 'worktree-555555555555-666666666666',
      releaseEvidenceEligible: false,
      untrackedFiles: 3,
      runtimeUntrackedFiles: 3,
      identityError: '',
    },
    framework: {
      pass: true,
      manifestVersion: 3,
      expected: { algorithm: 'sha256', schema: 'framework-inputs-v1', digest: '8'.repeat(64), files: 21 },
      actual: { algorithm: 'sha256', schema: 'framework-inputs-v1', digest: '8'.repeat(64), files: 21 },
      reasons: [],
    },
  };
}

function main() {
  assert.ok(browserCandidates.includes("/usr/bin/google-chrome"), "Linux Google Chrome candidate must be present");
  assert.ok(browserCandidates.includes("/usr/bin/google-chrome-stable"), "Linux stable Chrome candidate must be present");
  assert.ok(browserCandidates.includes("/usr/bin/chromium"), "Linux Chromium candidate must be present");
  assert.ok(browserCandidates.includes("/usr/bin/chromium-browser"), "Linux Chromium browser candidate must be present");
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'wan-axis-report-identity-'));
  const runtimeDirectory = path.join(fixtureRoot, 'source-runtime');
  const reportPath = path.join(fixtureRoot, 'source-runtime-attestation.json');
  try {
    fs.mkdirSync(runtimeDirectory);
    fs.writeFileSync(path.join(runtimeDirectory, 'panel-framework.js'), 'window.wanFixture = true;\n');
    fs.writeFileSync(path.join(runtimeDirectory, 'style.css'), '.wan-fixture { color: blue; }\n');
    fs.writeFileSync(path.join(runtimeDirectory, 'desktop-overview.css'), '.wan-overview { display: grid; }\n');
    const currentIdentity = fixtureIdentity();

    const missing = validateBrowserOnlyAttestation(runtimeDirectory, currentIdentity, reportPath);
    assert.equal(missing.pass, false, 'browser-only without attestation must fail closed');
    assert.match(missing.reasons.join('\n'), /missing/);

    const attestation = buildAttestation(
      runtimeDirectory,
      currentIdentity,
      currentIdentity,
      currentIdentity,
    );
    assert.equal(attestation.stagePass, true, attestation.identityValidation.reasons.join('; '));
    assert.equal(attestation.pass, false, 'build-only cannot claim final pass');
    assert.equal(attestation.complete, false, 'build-only cannot claim completeness');
    fs.writeFileSync(reportPath, JSON.stringify(attestation, null, 2));
    assert.equal(validateBrowserOnlyAttestation(runtimeDirectory, currentIdentity, reportPath).pass, true);

    const tamperedIdentity = JSON.parse(JSON.stringify(attestation));
    tamperedIdentity.identity.build.worktree.commit = '9'.repeat(40);
    fs.writeFileSync(reportPath, JSON.stringify(tamperedIdentity, null, 2));
    assert.match(
      validateBrowserOnlyAttestation(runtimeDirectory, currentIdentity, reportPath).reasons.join('\n'),
      /identity phase is stale: build/,
    );

    fs.writeFileSync(reportPath, JSON.stringify(attestation, null, 2));
    fs.appendFileSync(path.join(runtimeDirectory, 'desktop-overview.css'), '/* tampered */\n');
    assert.match(
      validateBrowserOnlyAttestation(runtimeDirectory, currentIdentity, reportPath).reasons.join('\n'),
      /source runtime files are missing, stale, or tampered/,
    );

    console.log('WAN axis report identity fixtures passed');
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

main();
