#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  FRAMEWORK_ASSET_BUDGETS,
  evaluateFrameworkAssetBudget,
  verifyFrameworkAssetBudget,
} = require('./framework-asset-budget');

assert.deepEqual(FRAMEWORK_ASSET_BUDGETS, {
  script: { bytes: 768000, gzipBytes: 155000, brotliBytes: 132000 },
  style: { bytes: 120000, gzipBytes: 20000, brotliBytes: 18000 },
  desktopStyle: { bytes: 40000, gzipBytes: 10000, brotliBytes: 8000 },
});

const withinBudget = {
  assets: {
    script: { file: 'panel.js', bytes: 10, gzipBytes: 8, brotliBytes: 7 },
    style: { file: 'style.css', bytes: 10, gzipBytes: 8, brotliBytes: 7 },
    desktopStyle: { file: 'desktop-overview.css', bytes: 10, gzipBytes: 8, brotliBytes: 7 },
  },
};
assert.equal(evaluateFrameworkAssetBudget(withinBudget).pass, true);

const compressedOverflow = JSON.parse(JSON.stringify(withinBudget));
compressedOverflow.assets.style.gzipBytes = 20001;
const overflow = evaluateFrameworkAssetBudget(compressedOverflow);
assert.equal(overflow.pass, false);
assert(overflow.reasons.some((reason) => reason.includes('style.gzipBytes exceeds')));

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'framework-budget-'));
try {
  const output = path.join(fixture, 'public', 'assets', 'framework');
  fs.mkdirSync(output, { recursive: true });
  for (const record of Object.values(withinBudget.assets)) {
    fs.writeFileSync(path.join(output, record.file), Buffer.alloc(record.bytes));
    fs.writeFileSync(path.join(output, `${record.file}.gz`), Buffer.alloc(record.gzipBytes));
    fs.writeFileSync(path.join(output, `${record.file}.br`), Buffer.alloc(record.brotliBytes));
  }
  fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(withinBudget));
  assert.equal(verifyFrameworkAssetBudget(fixture).pass, true);

  fs.appendFileSync(path.join(output, 'style.css.gz'), Buffer.from([0]));
  const mismatch = verifyFrameworkAssetBudget(fixture);
  assert.equal(mismatch.pass, false);
  assert(mismatch.reasons.some((reason) => reason.includes('manifest/file mismatch')));
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}

console.log('[framework-asset-budget] PASS raw/compressed limits and manifest/file identity');
