#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const {
  contradictionReasons,
  inspectReport,
  matrixIsDeclaredRequired,
} = require('./check-report-completeness-quarantine');

const closedRule = {
  glob: '_acceptance/*/report.json',
  classification: 'historical-or-worktree-artifact',
  allowAsCurrentReleaseInput: false,
};

const incomplete = {
  pass: true,
  matrix: {
    requestedComplete: true,
    complete: false,
  },
};
assert.equal(matrixIsDeclaredRequired(incomplete.matrix), true);
assert.deepEqual(contradictionReasons(incomplete), ['required-matrix-incomplete']);
assert.equal(inspectReport(incomplete, '_acceptance/fixture/report.json', [closedRule]).quarantined, true);

const nestedFailure = {
  pass: true,
  matrix: {
    requestedComplete: true,
    complete: true,
  },
  checks: [{ pass: false }],
};
assert.deepEqual(contradictionReasons(nestedFailure), ['nested-pass-false']);
assert.equal(inspectReport(nestedFailure, '_acceptance/fixture/report.json', [closedRule]).quarantined, true);

const complete = {
  pass: true,
  matrix: {
    requestedComplete: true,
    complete: true,
  },
  checks: [{ pass: true }],
};
assert.deepEqual(contradictionReasons(complete), []);
assert.equal(inspectReport(complete, '_acceptance/fixture/report.json', [closedRule]), null);

const openRule = {
  glob: '_acceptance/*/report.json',
  classification: 'current-evidence',
  allowAsCurrentReleaseInput: true,
};
assert.equal(inspectReport(incomplete, '_acceptance/fixture/report.json', [openRule]).quarantined, false);

process.stdout.write(JSON.stringify({
  pass: true,
  contract: 'report-completeness-quarantine-fixture-v1',
  checks: 4,
}, null, 2) + '\n');
