#!/usr/bin/env node

/**
 * Contract for report truth at the release boundary.
 *
 * A bounded capability run may have every requested cell green while still
 * being incomplete for the public matrix. That evidence must remain useful,
 * but its top-level `pass` cannot be mistaken for release approval.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const localPredeployPath = path.join(root, 'tools', 'local-predeploy-check.js');
const mobileRuntimePath = path.join(root, 'tools', 'check-mobile-native-runtime.js');
const { finalizeReportTruth } = require('./local-predeploy-check');

function check(name, pass, detail) {
  return { name, pass: Boolean(pass), detail };
}

function main() {
  const localPredeploy = fs.readFileSync(localPredeployPath, 'utf8');
  const mobileRuntime = fs.readFileSync(mobileRuntimePath, 'utf8');
  // This contract tests the production finalizer directly. It must not depend
  // on a disposable browser artifact directory that may be cleaned between
  // matrix runs, because a missing historical screenshot report is neither a
  // product pass nor a meaningful report-truth result.
  const report = {
    checks: [],
    failures: [],
    matrix: {
      complete: false,
      requestedComplete: true,
      total: 0,
      passed: 0,
      failed: 0,
      releaseEvidenceEligible: false,
    },
    pass: true,
    exitCodeShouldFail: false,
  };
  finalizeReportTruth(report, false);
  const matrix = report.matrix || {};
  const checks = [
    check('fixture is an incomplete bounded matrix', matrix.complete === false, {
      complete: matrix.complete,
      requestedComplete: matrix.requestedComplete,
      total: matrix.total,
      passed: matrix.passed,
      failed: matrix.failed,
    }),
    check('incomplete matrix suppresses top-level pass', matrix.complete !== false || report.pass !== true, {
      complete: matrix.complete,
      pass: report.pass,
    }),
    check('bounded engineering result is explicit', matrix.complete !== false || typeof report.engineeringPass === 'boolean', {
      engineeringPass: report.engineeringPass,
      boundedPass: report.boundedPass,
    }),
    check('predeploy finalization records engineering result separately', localPredeploy.includes('report.engineeringPass'), {
      source: 'tools/local-predeploy-check.js',
    }),
    check('bounded runtime verifier does not require release pass', mobileRuntime.includes('report.engineeringPass !== true') && mobileRuntime.includes('report.pass !== false'), {
      source: 'tools/check-mobile-native-runtime.js',
    }),
    check('incomplete report remains release-ineligible', matrix.complete !== false || matrix.releaseEvidenceEligible === false, {
      releaseEvidenceEligible: matrix.releaseEvidenceEligible,
    }),
  ];
  const failures = checks.filter((item) => !item.pass).map((item) => item.name);
  const result = {
    pass: failures.length === 0,
    contract: 'report-top-level-truth-v1',
    checks,
    failures,
    implementationState: 'semantic-split-installed-runtime-result-may-still-fail-independently',
  };
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.pass ? 0 : 1;
}

main();
