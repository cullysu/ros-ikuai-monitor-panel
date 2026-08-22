#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  MATRIX_REPORT_ALIAS_NAMES,
  MOBILE_REFERENCE_REQUIRED_CHECKS,
  assertEvidenceModeEligibility,
  assertMatrixEvidenceIdentity,
  collectGateDetailFailures,
  hasPinnedDockerBuildPushActionV7,
  matrixEvidenceStatusMessage,
  parseArgs,
  reportNameMatchesKind,
  ROUTE_STATE_MATRIX_CELLS,
  validateMatrixReport,
} = require('./check-public-release-readiness');
const { isGovernancePath } = require('./worktree-runtime-identity');
const { RUNTIME_CHECK_CONTRACT } = require('./runtime-screenshot-contract');
const { inspectIndependentReviewRecords } = require('./check-independent-review-records');

function mobileReport(checks, requiredChecks = Object.keys(checks)) {
  return {
    checks: [{
      name: 'responsive public/single/narrow/overview',
      pass: true,
      detail: {
        surface: 'mobile-overview',
        mobileReferenceGateProbe: {
          contract: 'mobile-reference-runtime-v1',
          appHomePass: true,
          truthMode: 'current',
          risk: 'none',
          requiredChecks,
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
          visualGrammar: 'ikuai-4-ipad',
          evidenceMode: 'current',
          risk: 'none',
          checks: { taskContract: true, firstViewport: true },
        },
      },
    }],
  };
}

const pinnedBuildPushAction = `uses: docker/build-push-action@${'a'.repeat(40)} # v7`;
assert.equal(
  hasPinnedDockerBuildPushActionV7(pinnedBuildPushAction),
  true,
  'SHA-pinned docker/build-push-action with its v7 annotation must satisfy readiness'
);
assert.equal(
  hasPinnedDockerBuildPushActionV7('uses: docker/build-push-action@v7'),
  false,
  'mutable build-push-action tags must not satisfy the release pinning gate'
);
assert.equal(
  hasPinnedDockerBuildPushActionV7(`uses: actions/checkout@${'a'.repeat(40)} # v7`),
  false,
  'a SHA pin for another action must not satisfy the build-push-action gate'
);
assert.equal(
  hasPinnedDockerBuildPushActionV7(`uses: docker/build-push-action@${'a'.repeat(40)} # v6`),
  false,
  'a SHA pin annotated as a different major version must not satisfy the v7 gate'
);

const completeMobileChecks = Object.fromEntries(
  MOBILE_REFERENCE_REQUIRED_CHECKS.map((name) => [name, true])
);
const missing = collectGateDetailFailures(mobileReport({
  ...completeMobileChecks,
  ikuai4Root: undefined,
}));
assert(
  missing.mobileSemantic.some((failure) => failure.field === 'checks.ikuai4Root'),
  'release evidence must fail when the current iKuai 4 root contract is omitted'
);

const passing = collectGateDetailFailures(mobileReport(completeMobileChecks));
assert.deepEqual(passing.mobileSemantic, []);

const rejectedOwner = collectGateDetailFailures(mobileReport({
  ...completeMobileChecks,
  noRejectedOwner: false,
}));
assert(
  rejectedOwner.mobileSemantic.some((failure) => failure.field === 'checks.noRejectedOwner'),
  'release evidence must fail when a retired mobile owner is still mounted'
);

const staleProducer = mobileReport(completeMobileChecks);
staleProducer.checks[0].detail.mobileReferenceGateProbe.requiredChecks =
  MOBILE_REFERENCE_REQUIRED_CHECKS.filter((field) => field !== 'ikuai4Root');
assert(
  collectGateDetailFailures(staleProducer).mobileSemantic.some((failure) => failure.field === 'requiredChecks.missing'),
  'release evidence must fail when the producer declares a stale required-check contract'
);

const retiredProducerField = mobileReport(completeMobileChecks);
retiredProducerField.checks[0].detail.mobileReferenceGateProbe.requiredChecks = [
  ...MOBILE_REFERENCE_REQUIRED_CHECKS,
  'decisiveEvidence',
];
assert(
  collectGateDetailFailures(retiredProducerField).mobileSemantic.some((failure) => failure.field === 'requiredChecks.unexpected'),
  'release evidence must fail when a retired producer field reappears'
);

const duplicateProducerField = mobileReport(completeMobileChecks, [
  ...MOBILE_REFERENCE_REQUIRED_CHECKS,
  'ikuai4Root',
]);
assert(
  collectGateDetailFailures(duplicateProducerField).mobileSemantic.some((failure) => failure.field === 'requiredChecks.duplicates'),
  'release evidence must fail when the producer repeats a required field'
);

const undeclaredActualField = mobileReport({
  ...completeMobileChecks,
  decisiveEvidence: true,
}, MOBILE_REFERENCE_REQUIRED_CHECKS);
assert(
  collectGateDetailFailures(undeclaredActualField).mobileSemantic.some((failure) => failure.field === 'checks.unexpected'),
  'release evidence must fail when checks contains an undeclared retired field'
);

const missingActualChecks = { ...completeMobileChecks };
delete missingActualChecks.ikuai4Root;
const missingActualField = mobileReport(missingActualChecks, MOBILE_REFERENCE_REQUIRED_CHECKS);
assert(
  collectGateDetailFailures(missingActualField).mobileSemantic.some((failure) => failure.field === 'checks.missing'),
  'release evidence must fail when the declared producer contract omits an actual check key'
);

const retiredMobile = mobileReport(completeMobileChecks);
retiredMobile.checks[0].detail.mobileReferenceGateProbe.contract = 'pocket-console-v1';
assert(
  collectGateDetailFailures(retiredMobile).mobileSemantic.some((failure) => failure.field === 'contract'),
  'the superseded Pocket Console contract must not satisfy public readiness'
);
const legacyLinkboard = mobileReport(completeMobileChecks);
legacyLinkboard.checks[0].detail.mobileReferenceGateProbe.contract = 'linkboard-overview-v1';
assert(
  collectGateDetailFailures(legacyLinkboard).mobileSemantic.some((failure) => failure.field === 'contract'),
  'the retired Linkboard contract must not satisfy public readiness'
);

const readinessSource = fs.readFileSync(path.join(__dirname, 'check-public-release-readiness.js'), 'utf8');
assert(!readinessSource.includes('src/panel-framework/mobile/MobilePatrolScreen.tsx'));
assert(!readinessSource.includes('src/panel-framework/mobile/MobileEvidenceLedger.tsx'));
assert(!readinessSource.includes('src/panel-framework/mobile/mobile-patrol.css'));
assert(!readinessSource.includes('optical-patrol'));
assert(readinessSource.includes('src/panel-framework/mobile-reference-ui/MobileReferenceSurface.tsx'));
assert(readinessSource.includes("contract !== 'mobile-reference-runtime-v1'"));
assert(!readinessSource.includes("contract !== 'pocket-console-v1'"));
assert(!readinessSource.includes("contract !== 'linkboard-overview-v1'"));
assert(readinessSource.includes("assertNotContains(asset, 'data-linkboard-root')"));
assert(readinessSource.includes("public/assets/framework/panel-mobile.js"));
assert(readinessSource.includes("public/assets/framework/panel-desktop.js"));
assert(readinessSource.includes("'data-mobile-reference-home'"));
assert(readinessSource.includes("'data-mobile-reference-workspace'"));
assert(!readinessSource.includes('src/panel-framework/mobile-patrol/'));
assert(!readinessSource.includes('src/panel-framework/mobile-ikuai4/'));
assert(readinessSource.includes("assertNotExists('tools/check-pocket-console-runtime.js')"));
assert(readinessSource.includes("assertNotExists('tools/lib/pocket-console-runtime/runtime.js')"));
assert(readinessSource.includes("assertContains('tools/check-mobile-reference-runtime.js', 'contract: \"mobile-reference-runtime-v1\"')"));

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
assert.equal(packageJson.scripts['check:mobile-linkboard'], undefined);
assert.equal(packageJson.scripts['check:mobile-pocket-console'], undefined);
assert.equal(packageJson.scripts['check:mobile-incident-lens'], undefined);
assert.equal(typeof packageJson.scripts['check:mobile-telemetry'], 'string');
assert(packageJson.scripts['check:mobile-telemetry'].includes('check:mobile-telemetry-model'));
assert(packageJson.scripts['check:mobile-telemetry'].includes('tools/check-mobile-reference-runtime.js'));
assert.equal((packageJson.scripts['check:runtime-browser'].match(/check:mobile-telemetry/g) || []).length, 1);
assert.equal(fs.existsSync(path.join(__dirname, 'check-pocket-console-runtime.js')), false);
assert.equal(fs.existsSync(path.join(__dirname, 'lib', 'pocket-console-runtime', 'runtime.js')), false);
assert.equal(fs.existsSync(path.join(__dirname, 'check-mobile-next-runtime.js')), false);
assert.equal(fs.existsSync(path.join(__dirname, 'check-mobile-reference-runtime.js')), true);

const supersededPocketReview = inspectIndependentReviewRecords({ step: 932 });
assert.equal(supersededPocketReview.pass, true, 'the historical Step932 review record must remain readable without becoming current evidence');
assert.equal(supersededPocketReview.reviewStatus, 'superseded/historical');
assert.equal(supersededPocketReview.currentEvidence, false);
assert.equal(supersededPocketReview.historicalEvidenceOnly, true);
assert.equal(supersededPocketReview.supersededPocketReview, true);
assert.equal(supersededPocketReview.runtimeReport, '_acceptance/pocket-console-runtime/report.json');

const currentDesktop = collectGateDetailFailures(desktopReport('legacy-desktop-task-v1'));
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
  releaseCandidate: false,
  candidateEvidenceArgs: [],
  help: false,
});
assert.deepEqual(
  parseArgs(['--release-candidate', `--candidate-commit=${'a'.repeat(40)}`]),
  {
    staticOnly: false,
    allowDirtyEngineering: false,
    releaseCandidate: true,
    candidateEvidenceArgs: [`--candidate-commit=${'a'.repeat(40)}`],
    help: false,
  },
  'release-candidate mode must preserve exact external evidence arguments'
);
assert.throws(
  () => parseArgs([`--candidate-commit=${'a'.repeat(40)}`]),
  /require --release-candidate/,
  'candidate evidence cannot be smuggled into an ordinary readiness run'
);
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
}

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
assert.equal(MATRIX_REPORT_ALIAS_NAMES.overview.has('panel-runtime-browser'), false);
assert.equal(reportNameMatchesKind('panel-runtime-browser', 'overview'), false);
assert.equal(reportNameMatchesKind('independent-visual-signoff-current', 'overview'), false);
assert.equal(reportNameMatchesKind('release-matrix-current', 'overview'), true);
assert.equal(reportNameMatchesKind('route-matrix-current', 'responsive'), true);
assert.equal(reportNameMatchesKind('route-state-matrix-current', 'state'), true);

const mixedIdentity = { ...sameIdentity, routeState: matrixEvidence('different') };
assert.throws(
  () => assertMatrixEvidenceIdentity(mixedIdentity, currentIdentity),
  /do not share the current runtime worktree identity/,
  'mixed dirty fingerprints must never be merged into readiness evidence'
);

function routeStateReportFixture(commit) {
  const cells = ROUTE_STATE_MATRIX_CELLS.map((expected) => ({
    profile: expected.profile,
    scaleScenario: expected.scaleScenario,
    section: expected.section,
    viewportKey: `${expected.viewport.name}=${expected.viewport.width}x${expected.viewport.height}`,
    pass: true,
  }));
  return {
    checks: [{ name: 'required route-state evidence', pass: true }],
    failures: [],
    browserChecks: ROUTE_STATE_MATRIX_CELLS.map((expected) => ({
      profile: expected.profile,
      scaleScenario: expected.scaleScenario,
      requestedSection: expected.section,
      viewport: expected.viewport,
      pass: true,
    })),
    pass: true,
    exitCodeShouldFail: false,
    matrix: {
      commit,
      requestedComplete: true,
      complete: true,
      failed: 0,
      cells,
    },
  };
}

function validateRouteStateFixture(mutator) {
  const head = String(spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
  }).stdout || '').trim();
  assert.match(head, /^[0-9a-f]{40}$/);
  const report = routeStateReportFixture(head);
  mutator(report);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'route-state-report-'));
  const reportPath = path.join(root, 'report.json');
  try {
    fs.writeFileSync(reportPath, JSON.stringify(report));
    return validateMatrixReport(reportPath, ROUTE_STATE_MATRIX_CELLS, head).errors;
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

assert.deepEqual(validateRouteStateFixture(() => {}), []);
assert(
  validateRouteStateFixture((report) => { report.checks[0].pass = false; })
    .some((error) => error.includes('report checks contain failures')),
  'a failed required route-state child check must reject otherwise green evidence'
);
assert(
  validateRouteStateFixture((report) => { report.browserChecks.pop(); })
    .some((error) => error.includes('browserChecks does not exactly match')),
  'a missing route-state browser check must reject otherwise green evidence'
);
assert(
  validateRouteStateFixture((report) => { report.matrix.complete = false; })
    .some((error) => error === 'matrix.complete must be true'),
  'an incomplete route-state matrix must reject otherwise green evidence'
);
assert(
  validateRouteStateFixture((report) => { report.matrix.commit = '0'.repeat(40); })
    .some((error) => error.startsWith('matrix.commit must equal current HEAD')),
  'a stale route-state report must reject otherwise green evidence'
);
assert.equal(isGovernancePath('docs/decision-system/current-state.md'), true);
assert.equal(isGovernancePath('docs/panel-redesign-decision-log.md'), true);
assert.equal(isGovernancePath('tools/local-predeploy-check.js'), false);

console.log('[public-release-semantic-gates] PASS semantic UI gates and shared matrix/runtime worktree identity');
