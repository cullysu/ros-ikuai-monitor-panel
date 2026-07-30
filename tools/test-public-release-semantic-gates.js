#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  RUNTIME_REQUIRED_CHECKS,
  assertEvidenceModeEligibility,
  assertMatrixEvidenceIdentity,
  assertRuntimeEvidenceIdentity,
  collectGateDetailFailures,
  matrixEvidenceStatusMessage,
  parseArgs,
  runtimeScreenshotEvidenceMatches,
} = require('./check-public-release-readiness');
const { isGovernancePath } = require('./worktree-runtime-identity');
const { RUNTIME_CHECK_CONTRACT, RUNTIME_SCREENSHOT_CONTRACT } = require('./runtime-screenshot-contract');

function mobileReport(checks) {
  return {
    checks: [{
      name: 'responsive public/single/narrow/overview',
      pass: true,
      detail: {
        surface: 'mobile-overview',
        mobileOverviewAppHomeGateProbe: {
          contract: 'mobile-patrol-console-v3',
          appHomePass: true,
          evidenceMode: 'current',
          risk: 'none',
          checks,
        },
      },
    }],
  };
}

function desktopReport(contract) {
  return {
    checks: [{
      name: 'responsive public/single/desktop/overview',
      pass: true,
      detail: {
        surface: 'desktop-overview',
        desktopOverviewLedgerProbe: {
          contract,
          evidenceMode: 'current',
          risk: 'none',
          checks: { taskContract: true, firstViewport: true },
        },
      },
    }],
  };
}

const missing = collectGateDetailFailures(mobileReport({ mounted: true }));
assert(
  missing.mobileSemantic.some((failure) => failure.field === 'checks.adaptiveLedger'),
  'release evidence must fail when the adaptive ledger check is omitted'
);

const passing = collectGateDetailFailures(mobileReport({ mounted: true, adaptiveLedger: true }));
assert.deepEqual(passing.mobileSemantic, []);

const currentDesktop = collectGateDetailFailures(desktopReport('overview-task-v1'));
assert.deepEqual(
  currentDesktop.desktopSemantic,
  [],
  'the current observable desktop task contract must be accepted'
);

const retiredDesktop = collectGateDetailFailures(desktopReport('cold-blue-operations-ledger'));
assert(
  retiredDesktop.desktopSemantic.some((failure) => failure.field === 'contract'),
  'the superseded visual-label contract must be rejected'
);

function matrixEvidence(fingerprint) {
  const matrix = {
    commit: 'abc123',
    worktreeClean: false,
    worktreeFingerprint: fingerprint,
    artifactKey: `worktree-abc123-${fingerprint}`,
    releaseEvidenceEligible: false,
  };
  return { report: { matrix } };
}

const currentIdentity = {
  commit: 'abc123',
  worktreeClean: false,
  worktreeFingerprint: 'same',
  artifactKey: 'worktree-abc123-same',
  releaseEvidenceEligible: false,
};
const sameIdentity = {
  overview: matrixEvidence('same'),
  routeResponsive: matrixEvidence('same'),
  routeState: matrixEvidence('same'),
};
assert.equal(assertMatrixEvidenceIdentity(sameIdentity, currentIdentity).releaseEvidenceEligible, false);
assert.match(matrixEvidenceStatusMessage(currentIdentity), /worktree engineering matrix evidence is complete; release ineligible/);
assert.doesNotMatch(matrixEvidenceStatusMessage(currentIdentity), /current release evidence is complete/);
assert.throws(
  () => assertEvidenceModeEligibility(currentIdentity, { allowDirtyEngineering: false }),
  /clean worktree\/commit evidence/,
  'public release readiness must fail closed on dirty evidence'
);
assert.doesNotThrow(() => assertEvidenceModeEligibility(currentIdentity, { allowDirtyEngineering: true }));
assert.deepEqual(parseArgs(['--engineering-worktree']), {
  staticOnly: false,
  allowDirtyEngineering: true,
  help: false,
});
assert.equal(
  RUNTIME_CHECK_CONTRACT?.tabletSparseWorkbench,
  '768px tablet domain workspace exposes a split object task with semantic preview',
  'runtime and readiness must share the current tablet capability check name'
);
assert.notEqual(
  RUNTIME_CHECK_CONTRACT?.tabletSparseWorkbench,
  '768px tablet stacks a two-row list above an equally wide semantic preview',
  'the retired short-stack contract must not remain release evidence'
);
assert.notEqual(
  RUNTIME_CHECK_CONTRACT?.tabletSparseWorkbench,
  '768px tablet preserves a split object list and semantic evidence workspace',
  'the superseded squeezed split-workspace contract must not remain release evidence'
);

const step184RequiredChecks = {
  historicalLogPreview: 'historical log preview identifies the event in its heading and keeps body evidence novel',
  reflow320LogDetail: '320x568 log detail keeps event evidence and temporal context without clipped text or controls',
  syntheticLogDetail: '390x844 log detail survives synthetic text stress with event evidence and temporal context',
  browserZoomIncident: 'physical 768x1024 at browser 200 percent zoom keeps the interface incident operable in a 384x512 CSS viewport',
  browserZoomResource: 'physical 768x1024 resource evidence at browser 200 percent zoom keeps chart truth in a 384x512 CSS viewport',
};
for (const [key, checkName] of Object.entries(step184RequiredChecks)) {
  assert.equal(RUNTIME_CHECK_CONTRACT?.[key], checkName, `runtime contract must expose ${key}`);
  assert(
    Array.isArray(RUNTIME_REQUIRED_CHECKS) && RUNTIME_REQUIRED_CHECKS.includes(checkName),
    `public readiness must require ${key}`
  );
}

const syntheticDetailContract = RUNTIME_SCREENSHOT_CONTRACT.find(
  (item) => item.state === 'a11y-synthetic-text-stress200-logs-detail'
);
assert.deepEqual(
  syntheticDetailContract?.evidence,
  {
    class: 'synthetic-text-stress',
    scale: 2,
    accessibilitySignoff: false,
    cssViewport: [390, 844],
  },
  'synthetic detail metadata must explicitly refuse Accessibility signoff'
);
assert.equal(
  runtimeScreenshotEvidenceMatches(
    { ...syntheticDetailContract.evidence, accessibilitySignoff: true },
    syntheticDetailContract.evidence
  ),
  false,
  'readiness metadata matching must reject a synthetic screenshot that claims Accessibility signoff'
);

const runtimeBrowserSource = fs.readFileSync(path.join(__dirname, 'check-panel-runtime-browser.js'), 'utf8');
const zoomProbeStart = runtimeBrowserSource.indexOf('const result = await accessibilityPage.evaluate(async');
const zoomProbeEnd = runtimeBrowserSource.indexOf('if (expandResource) result.resourceHistory', zoomProbeStart);
const zoomProbeSource = runtimeBrowserSource.slice(zoomProbeStart, zoomProbeEnd);
const settleLoopIndex = zoomProbeSource.indexOf('for (let index = 0; index < 8; index += 1)');
const controlsSnapshotIndex = zoomProbeSource.indexOf('const controls = [...document.querySelectorAll');
assert(settleLoopIndex >= 0, 'browser zoom overlap probe must keep a bounded settle loop');
assert(
  controlsSnapshotIndex > settleLoopIndex,
  'browser zoom overlap probe must enumerate controls only after layout settling'
);
assert(
  zoomProbeSource.includes('settled: layoutSettled'),
  'browser zoom overlap evidence must report whether bounded settling actually converged'
);
assert(
  runtimeBrowserSource.includes('bottomGeometry.settled === true'),
  'browser zoom checks must fail closed when layout did not settle'
);
assert.doesNotThrow(() => assertRuntimeEvidenceIdentity({ ...currentIdentity }, currentIdentity));
assert.throws(
  () => assertRuntimeEvidenceIdentity({ commit: currentIdentity.commit }, currentIdentity),
  /runtime browser report does not match current runtime worktree identity/,
  'runtime browser evidence must not be accepted by HEAD alone'
);

const mixedIdentity = { ...sameIdentity, routeState: matrixEvidence('different') };
assert.throws(
  () => assertMatrixEvidenceIdentity(mixedIdentity, currentIdentity),
  /do not share the current runtime worktree identity/,
  'mixed dirty fingerprints must never be merged into readiness evidence'
);
assert.equal(isGovernancePath('docs/decision-system/current-state.md'), true);
assert.equal(isGovernancePath('docs/panel-redesign-decision-log.md'), true);
assert.equal(isGovernancePath('tools/local-predeploy-check.js'), false);

console.log('[public-release-semantic-gates] PASS semantic UI gates and shared matrix/runtime worktree identity');
