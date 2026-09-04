#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'tools/local-predeploy-check.js'), 'utf8');
const checks = {
  finalizerDefined: /function finalizeReportTruth\s*\(/.test(source),
  derivesFailuresFromChecks: /report\.checks[\s\S]{0,500}(applicable|pass)/.test(source) && /check\.pass\s*!==\s*true/.test(source),
  finalizerInvokedAtClose: /finalizeReportTruth\s*\(\s*report\s*,\s*matrixBlocksTopLevelPass\b/.test(source),
  finalizerExportedForRegression: /finalizeReportTruth\s*,/.test(source),
};

let behavior = null;
if (Object.values(checks).every(Boolean)) {
  const { finalizeReportTruth } = require('./local-predeploy-check');
  const failedChild = { name: 'child failure', pass: false, detail: {} };
  const report = { checks: [failedChild], failures: [], pass: true, exitCodeShouldFail: false };
  finalizeReportTruth(report, false);
  const nestedFailedChild = {
    name: 'parent check',
    pass: true,
    detail: { browser: { pass: false, reason: 'nested evidence failed' } },
  };
  const nestedReport = { checks: [nestedFailedChild], failures: [], pass: true, exitCodeShouldFail: false };
  finalizeReportTruth(nestedReport, false);
  const notApplicable = {
    checks: [{ name: 'not applicable', applicable: false, status: 'not_applicable', pass: null, reason: 'outside scope' }],
    failures: [],
    pass: true,
    exitCodeShouldFail: false,
  };
  finalizeReportTruth(notApplicable, false);
  const incompleteMatrix = {
    checks: [],
    failures: [],
    matrix: { complete: false, requestedComplete: true },
    pass: true,
    exitCodeShouldFail: false,
  };
  finalizeReportTruth(incompleteMatrix, false);
  behavior = {
    failedChildSuppressed: report.pass === false && report.exitCodeShouldFail === true && report.failures.includes(failedChild),
    nestedFailedChildSuppressed: nestedReport.pass === false && nestedReport.exitCodeShouldFail === true && nestedReport.failures.length > 0,
    explicitNotApplicablePreserved: notApplicable.pass === true && notApplicable.exitCodeShouldFail === false && notApplicable.failures.length === 0,
    incompleteMatrixSuppressed: incompleteMatrix.pass === false && incompleteMatrix.engineeringPass === true && incompleteMatrix.boundedPass === true && incompleteMatrix.releasePass === false,
  };
  checks.failedChildSuppressed = behavior.failedChildSuppressed;
  checks.nestedFailedChildSuppressed = behavior.nestedFailedChildSuppressed;
  checks.explicitNotApplicablePreserved = behavior.explicitNotApplicablePreserved;
  checks.incompleteMatrixSuppressed = behavior.incompleteMatrixSuppressed;
}

const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const result = { pass: failed.length === 0, contract: 'report-truth-v1', checks, behavior, failed };
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (failed.length) process.exitCode = 1;
