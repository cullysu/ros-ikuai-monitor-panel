'use strict';

const fs = require('fs');
const path = require('path');
const { assertIndependentReviewRecords } = require('./check-independent-review-records');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const packageJson = JSON.parse(read('package.json'));
const workflow = read('.github/workflows/ci.yml');
const localPs = read('tools/ci-local.ps1');
const localSh = read('tools/ci-local.sh');
const releaseBlockers = read('tools/check-release-blockers.js');
const authority = read('tools/check-current-state-authority.js');
const currentBoundary = read('tools/check-current-release-boundary.js');
const currentState = read('docs/decision-system/current-state.md');
const handoff = read('docs/product-loop-current.md');
const reviewLedger = read('docs/decision-system/review-adjudication-2026-07-23.md');
const machine = JSON.parse(read('.product-loop/state.json'));
const independentReview = assertIndependentReviewRecords({ root });
const failures = [];
const latestStep = Number(machine.latest_decision_step);
const latestOutcome = String(machine.latest_decision_outcome || '');
const currentReviewStatuses = ['product', 'design', 'visual-qa'].map((name) => machine.gates?.[name]?.status);
const localReviewIsHistorical = independentReview.pass === true &&
  independentReview.releaseEligible === false &&
  independentReview.step < latestStep &&
  independentReview.runtimeReportMatchesReviewedArtifact === false;
const localReviewResolved = localReviewIsHistorical
  ? currentReviewStatuses.every((status) => status === 'pending' || status === 'failed')
  : currentReviewStatuses.every((status) => status === 'pass');
const machineFailClosed = Number.isSafeInteger(latestStep) && latestStep > 0 &&
  latestOutcome.startsWith(`${latestStep}:`) &&
  localReviewResolved &&
  independentReview.pass &&
  machine.gates?.['state-matrix']?.status === 'pending' &&
  machine.gates?.['release-hygiene']?.status === 'pending' &&
  machine.gates?.['ci-linux']?.status === 'pending' &&
  machine.gates?.['ci-windows']?.status === 'pending' &&
  machine.gates?.['ci-container']?.status === 'pending';

function expect(condition, message) {
  if (!condition) failures.push(message);
}

const decisionScript = String(packageJson.scripts?.['check:decision-system'] || '');
expect(
  decisionScript.includes('tools/check-current-state-authority.js'),
  'check:decision-system must execute check-current-state-authority.js'
);
expect(
  decisionScript.includes('tools/check-current-release-boundary.js'),
  'check:decision-system must execute check-current-release-boundary.js'
);
expect(
  decisionScript.includes('tools/check-review-adjudication.js'),
  'check:decision-system must execute check-review-adjudication.js'
);
expect(
  workflow.includes('npm run check:decision-system'),
  'GitHub CI must execute the check:decision-system authority path'
);
expect(
  localPs.includes('tools/check-current-state-authority.js'),
  'ci-local.ps1 must execute check-current-state-authority.js'
);
expect(
  localPs.includes('tools/check-current-release-boundary.js'),
  'ci-local.ps1 must execute check-current-release-boundary.js'
);
expect(
  localSh.includes('tools/check-current-state-authority.js'),
  'ci-local.sh must execute check-current-state-authority.js'
);
expect(
  localSh.includes('tools/check-current-release-boundary.js'),
  'ci-local.sh must execute check-current-release-boundary.js'
);
expect(
  localPs.includes('tools/check-review-adjudication.js') &&
    localSh.includes('tools/check-review-adjudication.js'),
  'both local CI paths must execute check-review-adjudication.js'
);
expect(
  releaseBlockers.includes('tools/check-current-state-authority.js') &&
    releaseBlockers.includes('tools/check-current-release-boundary.js') &&
    releaseBlockers.includes('current-state authority') &&
    releaseBlockers.includes('current release boundary') &&
    releaseBlockers.includes('current product release'),
  'release-blocker integration must require current-state authority and current release boundary contracts'
);
expect(
  authority.includes('current-state top header') && authority.includes('handoff top section') &&
    currentBoundary.includes('current-release-boundary-v1') &&
    currentState.includes('**FAIL') && handoff.includes('| Current product release | `fail` |'),
  'the current authority and release-boundary contracts must retain the current FAIL boundary'
);
expect(reviewLedger.includes('productGate: `failed`') && reviewLedger.includes('designGate: `failed`') && reviewLedger.includes('visualGate: `failed`'), 'historical review adjudication must preserve its original boundary');
expect(
  machineFailClosed,
  'machine state must preserve historical local-review scope while keeping current release evidence fail-closed'
);

const report = {
  pass: failures.length === 0,
  contract: 'decision-truth-integration-v1',
  failures,
  checks: {
    decisionScript: decisionScript.includes('tools/check-current-state-authority.js'),
    currentReleaseBoundary: decisionScript.includes('tools/check-current-release-boundary.js'),
    reviewAdjudication: decisionScript.includes('tools/check-review-adjudication.js'),
    ci: workflow.includes('npm run check:decision-system'),
    localPs: localPs.includes('tools/check-current-state-authority.js'),
    localPsCurrentReleaseBoundary: localPs.includes('tools/check-current-release-boundary.js'),
    localSh: localSh.includes('tools/check-current-state-authority.js'),
    localShCurrentReleaseBoundary: localSh.includes('tools/check-current-release-boundary.js'),
    localReviewAdjudication: localPs.includes('tools/check-review-adjudication.js') && localSh.includes('tools/check-review-adjudication.js'),
    releaseBlockers: releaseBlockers.includes('tools/check-current-state-authority.js'),
    currentFailBoundary: currentState.includes('**FAIL') && handoff.includes('| Current product release | `fail` |'),
    machineFailClosed,
  },
};

console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
