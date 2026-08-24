#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  MATRIX_REPORT_ALIAS_NAMES,
  MOBILE_MATRIX_CELLS,
  MOBILE_WORKFLOW_NAMES,
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
  validateMobileRuntimeReport,
} = require('./check-public-release-readiness');
const { crc32, decodePngIdentity } = require('./png-evidence-identity');
const zlib = require('node:zlib');
const { isGovernancePath } = require('./worktree-runtime-identity');
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
assert(packageJson.scripts['check:mobile-telemetry'].includes('tools/run-mobile-reference-runtime.js'));
assert.equal((packageJson.scripts['check:runtime-browser'].match(/run-mobile-reference-runtime\.js --smoke/g) || []).length, 1);
assert.equal(/npm run check:mobile-telemetry(?:\s*(?:&&|$))/.test(packageJson.scripts['check:runtime-browser']), false);
assert(packageJson.scripts['check:runtime-browser'].includes('tools/check-wide-landscape-browser-owner.js'));
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
  reviewContentFingerprint: 'review-same',
  releaseEvidenceEligible: false,
};
const sameIdentity = {
  overview: matrixEvidence('same'),
  routeResponsive: matrixEvidence('same'),
  routeState: matrixEvidence('same'),
  mobileReference: matrixEvidence('same'),
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
const currentAccessibilityGateSource = fs.readFileSync(path.join(__dirname, 'check-mobile-reference-accessibility-runtime.js'), 'utf8');
const responsiveBoundaryGateSource = fs.readFileSync(path.join(__dirname, 'check-responsive-boundary-contract.js'), 'utf8');
const toolbarGateSource = fs.readFileSync(path.join(__dirname, 'check-browser-toolbar-zoom200.js'), 'utf8');
assert(currentAccessibilityGateSource.includes('CURRENT_MOBILE_REFERENCE_ROUTE_STAGE'), 'public readiness must retain the current 18-route accessibility stage');
assert(currentAccessibilityGateSource.includes('page.goBack') && currentAccessibilityGateSource.includes('page.goForward'), 'current accessibility evidence must fail closed without Back/Forward restoration');
assert(currentAccessibilityGateSource.includes('danglingAriaTargets.length === 0') && currentAccessibilityGateSource.includes('duplicateIds.length === 0'), 'current accessibility evidence must reject broken ARIA targets and duplicate ids');
assert(responsiveBoundaryGateSource.includes('id: "landscape599Tall", width: 599, height: 550, owner: "mobile-reference"'), 'current boundary evidence must retain the tall narrow phone owner');
assert(responsiveBoundaryGateSource.includes('id: "landscape600", width: 600, height: 320, owner: "desktop"'), 'current boundary evidence must switch to desktop at 600px landscape');
assert.equal(responsiveBoundaryGateSource.includes('searchParams.set("surface"'), false, 'responsive evidence must not force an owner query');
assert(toolbarGateSource.includes('main[data-mobile-reference-home]') && toolbarGateSource.includes('main[data-desktop-overview]'), 'toolbar 200% evidence must target both current owners');
assert.equal(/data-mobile-overview|data-mobile-domain-workspace/.test(toolbarGateSource), false, 'toolbar 200% evidence must not accept retired mobile owners');
assert(
  readinessSource.includes("collect('mobileReference'") &&
  readinessSource.includes('assertMobileRuntimeReport'),
  'public readiness must require the dedicated mobile producer report',
);
assert(
  readinessSource.includes('MOBILE_MATRIX_CELL_IDS'),
  'public readiness must own an explicit 49-cell mobile expectation',
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

{
  const pngChunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  body.copy(chunk, 4);
  chunk.writeUInt32BE(crc32(body), 8 + data.length);
  return chunk;
};
  const pngFor = (width, height) => {
    const header = Buffer.alloc(13);
    header.writeUInt32BE(width, 0);
    header.writeUInt32BE(height, 4);
    header.set([8, 0, 0, 0, 0], 8);
    const row = Buffer.alloc(1 + width);
    const image = Buffer.concat(Array.from({ length: height }, () => row));
    return Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      pngChunk('IHDR', header),
      pngChunk('IDAT', zlib.deflateSync(image)),
      pngChunk('IEND', Buffer.alloc(0)),
    ]);
  };
  const evidenceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mobile-release-evidence-'));
  const outputDirectory = path.join(evidenceRoot, '_acceptance', 'mobile-reference-runtime');
  fs.mkdirSync(outputDirectory, { recursive: true });
  const cells = MOBILE_MATRIX_CELLS.map(({ scenario, viewport }) => {
    const fileName = `${scenario}-${viewport.id}-overview.png`;
    const filePath = path.join(outputDirectory, fileName);
    fs.writeFileSync(filePath, pngFor(viewport.width, viewport.height));
    return {
      scenario,
      viewport: { id: viewport.id, width: viewport.width, height: viewport.height },
      pass: true,
      file: `_acceptance/mobile-reference-runtime/${fileName}`,
      png: decodePngIdentity(filePath),
    };
  });
  const workflows = Object.fromEntries(MOBILE_WORKFLOW_NAMES.map((name) => [name, true]));
  const shared = {
    commit: 'abc123',
    worktreeClean: false,
    worktreeFingerprint: 'same',
    artifactKey: 'worktree-abc123-same',
    reviewContentFingerprint: 'review-same',
    releaseEvidenceEligible: false,
  };
  const runtimePhase = {
    schema: 'mobile-node-runtime-identity-v1',
    execPath: process.execPath,
    version: process.version,
    nodeVersion: process.versions.node,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    entrypoint: path.join(evidenceRoot, 'tools', 'check-mobile-reference-runtime.js'),
    projectRoot: evidenceRoot,
    launcherId: path.join(evidenceRoot, 'tools', 'run-mobile-reference-runtime.js'),
  };
  const report = {
    pass: true, smokePass: true, complete: true, releasePass: false, releaseEvidenceEligible: false,
    ...shared,
    contract: 'mobile-reference-runtime-v1',
    evidenceContract: 'mobile-decoded-png-runtime-v1',
    generatedAt: new Date().toISOString(),
    freshness: true, runtimeFreshness: true,
    runtimeStart: runtimePhase, runtimeEnd: runtimePhase, evidenceErrors: [],
    outputDirectory: '_acceptance/mobile-reference-runtime',
    workflows,
    matrix: { ...shared, mode: 'full', append: false, required: 49, completed: 49, failed: 0, remaining: 0, cells },
  };
  const reportPath = path.join(outputDirectory, 'report.json');
  try {
    fs.writeFileSync(reportPath, JSON.stringify(report));
    assert.deepEqual(validateMobileRuntimeReport(reportPath, currentIdentity).errors, []);

    const incomplete = JSON.parse(JSON.stringify(report));
    incomplete.matrix.cells.pop();
    incomplete.matrix.completed = 48;
    incomplete.matrix.remaining = 1;
    fs.writeFileSync(reportPath, JSON.stringify(incomplete));
    let errors = validateMobileRuntimeReport(reportPath, currentIdentity).errors;
    assert(errors.some((item) => item.startsWith('matrix is not exactly 49')), 'a 48-cell mobile matrix must fail readiness');
    assert(errors.some((item) => item.includes('missing=1')), 'every required mobile cell must be explicit');

    const staleHash = JSON.parse(JSON.stringify(report));
    staleHash.matrix.cells[0].png.sha256 = '0'.repeat(64);
    fs.writeFileSync(reportPath, JSON.stringify(staleHash));
    errors = validateMobileRuntimeReport(reportPath, currentIdentity).errors;
    assert(errors.some((item) => item.includes('sha256 does not match')), 'recorded screenshot hashes must be re-read from files');

    const corruptFile = JSON.parse(JSON.stringify(report));
    fs.writeFileSync(path.join(evidenceRoot, corruptFile.matrix.cells[1].file), Buffer.from('not-a-png'));
    fs.writeFileSync(reportPath, JSON.stringify(corruptFile));
    errors = validateMobileRuntimeReport(reportPath, currentIdentity).errors;
    assert(errors.some((item) => item.includes('file is not a PNG')), 'release validation must decode every screenshot');

    const smokeMixed = JSON.parse(JSON.stringify(report));
    smokeMixed.outputDirectory = '_acceptance/mobile-reference-runtime-smoke';
    fs.writeFileSync(reportPath, JSON.stringify(smokeMixed));
    errors = validateMobileRuntimeReport(reportPath, currentIdentity).errors;
    assert(errors.some((item) => item.includes('mixed with smoke evidence')), 'smoke evidence must never satisfy the full release gate');

    const staleSource = JSON.parse(JSON.stringify(report));
    staleSource.worktreeFingerprint = 'old';
    staleSource.matrix.worktreeFingerprint = 'old';
    fs.writeFileSync(reportPath, JSON.stringify(staleSource));
    errors = validateMobileRuntimeReport(reportPath, currentIdentity).errors;
    assert(errors.some((item) => item.includes('current runtime worktree identity')), 'stale source identity must fail readiness');

    const falseComplete = JSON.parse(JSON.stringify(report));
    falseComplete.complete = false;
    falseComplete.matrix.complete = false;
    fs.writeFileSync(reportPath, JSON.stringify(falseComplete));
    errors = validateMobileRuntimeReport(reportPath, currentIdentity).errors;
    assert(errors.some((item) => /not a passing complete run|complete/.test(item)), 'top-level truth must remain fail-closed');
  } finally {
    fs.rmSync(evidenceRoot, { recursive: true, force: true });
  }
}

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
