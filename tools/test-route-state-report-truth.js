#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  ROUTE_STATE_MATRIX_CELLS,
  validateMatrixReport,
} = require('./check-public-release-readiness');

function head() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
  });
  const value = String(result.stdout || '').trim();
  assert.equal(result.status, 0, result.stderr);
  assert.match(value, /^[0-9a-f]{40}$/);
  return value;
}

function fixture(commit) {
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
      cells: ROUTE_STATE_MATRIX_CELLS.map((expected) => ({
        profile: expected.profile,
        scaleScenario: expected.scaleScenario,
        section: expected.section,
        viewportKey: `${expected.viewport.name}=${expected.viewport.width}x${expected.viewport.height}`,
        pass: true,
      })),
    },
  };
}

function errorsFor(mutator) {
  const commit = head();
  const report = fixture(commit);
  mutator(report);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'route-state-report-'));
  const reportPath = path.join(root, 'report.json');
  try {
    fs.writeFileSync(reportPath, JSON.stringify(report));
    return validateMatrixReport(reportPath, ROUTE_STATE_MATRIX_CELLS, commit).errors;
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

assert.deepEqual(errorsFor(() => {}), []);
assert(errorsFor((report) => { report.checks[0].pass = false; })
  .some((error) => error.includes('report checks contain failures')));
assert(errorsFor((report) => { report.browserChecks.pop(); })
  .some((error) => error.includes('browserChecks does not exactly match')));
assert(errorsFor((report) => { report.matrix.complete = false; })
  .some((error) => error === 'matrix.complete must be true'));
assert(errorsFor((report) => { report.matrix.commit = '0'.repeat(40); })
  .some((error) => error.startsWith('matrix.commit must equal current HEAD')));

console.log('route-state report truth: 5/5 passed');
