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
  'mobile.script': { bytes: 380000, gzipBytes: 120000, brotliBytes: 100000 },
  'mobile.style': { bytes: 60000, gzipBytes: 12000, brotliBytes: 10000 },
  'desktop.script': { bytes: 470000, gzipBytes: 145000, brotliBytes: 120000 },
  'desktop.style': { bytes: 90000, gzipBytes: 17000, brotliBytes: 15000 },
  loader: { bytes: 4000, gzipBytes: 2000, brotliBytes: 1800 },
});

const withinBudget = {
  assets: {
    mobile: {
      script: { file: 'panel-mobile.js', bytes: 10, gzipBytes: 8, brotliBytes: 7 },
      style: { file: 'mobile.css', bytes: 10, gzipBytes: 8, brotliBytes: 7 },
    },
    desktop: {
      script: { file: 'panel-desktop.js', bytes: 10, gzipBytes: 8, brotliBytes: 7 },
      style: { file: 'desktop.css', bytes: 10, gzipBytes: 8, brotliBytes: 7 },
    },
    loader: { file: 'panel-surface-loader.js', bytes: 10, gzipBytes: 8, brotliBytes: 7 },
  },
};
assert.equal(evaluateFrameworkAssetBudget(withinBudget).pass, true);

const compressedOverflow = JSON.parse(JSON.stringify(withinBudget));
compressedOverflow.assets.mobile.style.gzipBytes = 12001;
const overflow = evaluateFrameworkAssetBudget(compressedOverflow);
assert.equal(overflow.pass, false);
assert(overflow.reasons.some((reason) => reason.includes('mobile.style.gzipBytes exceeds')));

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'framework-budget-'));
try {
  const output = path.join(fixture, 'public', 'assets', 'framework');
  fs.mkdirSync(output, { recursive: true });
  const records = [
    withinBudget.assets.mobile.script,
    withinBudget.assets.mobile.style,
    withinBudget.assets.desktop.script,
    withinBudget.assets.desktop.style,
    withinBudget.assets.loader,
  ];
  for (const record of records) {
    fs.writeFileSync(path.join(output, record.file), Buffer.alloc(record.bytes));
    fs.writeFileSync(path.join(output, `${record.file}.gz`), Buffer.alloc(record.gzipBytes));
    fs.writeFileSync(path.join(output, `${record.file}.br`), Buffer.alloc(record.brotliBytes));
  }
  fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(withinBudget));
  assert.equal(verifyFrameworkAssetBudget(fixture).pass, true);

  fs.appendFileSync(path.join(output, 'mobile.css.gz'), Buffer.from([0]));
  const mismatch = verifyFrameworkAssetBudget(fixture);
  assert.equal(mismatch.pass, false);
  assert(mismatch.reasons.some((reason) => reason.includes('manifest/file mismatch')));
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}

console.log('[framework-asset-budget] PASS raw/compressed limits and manifest/file identity');
