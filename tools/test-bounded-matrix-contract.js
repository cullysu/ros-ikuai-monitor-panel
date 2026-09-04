const assert = require('assert');
const { finalizeReportTruth } = require('./local-predeploy-check.js');

function reportWithIncompleteMatrix() {
  return {
    failures: [],
    checks: [],
    matrix: { complete: false, requestedComplete: true },
  };
}

const bounded = reportWithIncompleteMatrix();
finalizeReportTruth(bounded, false, { allowIncompleteMatrix: true });
assert.strictEqual(bounded.pass, true, 'bounded shard should pass when its explicit cells pass');
assert.strictEqual(bounded.exitCodeShouldFail, false, 'bounded shard should exit successfully');

const release = reportWithIncompleteMatrix();
finalizeReportTruth(release, false);
assert.strictEqual(release.pass, false, 'release matrix must remain incomplete');
assert.strictEqual(release.exitCodeShouldFail, true, 'incomplete release matrix must fail closed');

console.log('bounded matrix contract: PASS');
