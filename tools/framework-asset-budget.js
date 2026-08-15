#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const FRAMEWORK_ASSET_BUDGETS = Object.freeze({
  'mobile.script': Object.freeze({ bytes: 380000, gzipBytes: 120000, brotliBytes: 100000 }),
  'mobile.style': Object.freeze({ bytes: 60000, gzipBytes: 12000, brotliBytes: 10000 }),
  'desktop.script': Object.freeze({ bytes: 470000, gzipBytes: 145000, brotliBytes: 120000 }),
  'desktop.style': Object.freeze({ bytes: 90000, gzipBytes: 17000, brotliBytes: 15000 }),
  loader: Object.freeze({ bytes: 4000, gzipBytes: 2000, brotliBytes: 1800 }),
});

function assetRecord(manifest, kind) {
  return kind.split('.').reduce((value, segment) => value?.[segment], manifest?.assets);
}

function evaluateFrameworkAssetBudget(manifest, budgets = FRAMEWORK_ASSET_BUDGETS) {
  const reasons = [];
  const assets = {};
  for (const [kind, limits] of Object.entries(budgets)) {
    const record = assetRecord(manifest, kind);
    if (!record || typeof record !== 'object') {
      reasons.push(`framework manifest is missing ${kind} asset metadata`);
      continue;
    }
    assets[kind] = {};
    for (const [metric, limit] of Object.entries(limits)) {
      const value = Number(record[metric]);
      assets[kind][metric] = value;
      if (!Number.isFinite(value) || value < 0) {
        reasons.push(`${kind}.${metric} is not a valid non-negative size`);
      } else if (value > limit) {
        reasons.push(`${kind}.${metric} exceeds ${limit} bytes (found ${value})`);
      }
    }
  }
  return {
    pass: reasons.length === 0,
    budgets,
    assets,
    reasons,
  };
}

function verifyFrameworkAssetBudget(projectRoot) {
  const resolvedRoot = path.resolve(projectRoot);
  const frameworkDir = path.join(resolvedRoot, 'public', 'assets', 'framework');
  const manifestPath = path.join(frameworkDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const report = evaluateFrameworkAssetBudget(manifest);
  const reasons = [...report.reasons];

  for (const kind of Object.keys(FRAMEWORK_ASSET_BUDGETS)) {
    const record = assetRecord(manifest, kind);
    if (!record || typeof record.file !== 'string') continue;
    const assetPath = path.join(frameworkDir, record.file);
    const actual = {
      bytes: fs.statSync(assetPath).size,
      gzipBytes: fs.statSync(`${assetPath}.gz`).size,
      brotliBytes: fs.statSync(`${assetPath}.br`).size,
    };
    for (const [metric, value] of Object.entries(actual)) {
      if (Number(record[metric]) !== value) {
        reasons.push(`${kind}.${metric} manifest/file mismatch: manifest=${String(record[metric])} actual=${value}`);
      }
    }
    report.assets[kind] = { ...report.assets[kind], ...actual };
  }

  return {
    ...report,
    pass: reasons.length === 0,
    manifestPath,
    reasons,
  };
}

function assertFrameworkAssetBudget(projectRoot) {
  const report = verifyFrameworkAssetBudget(projectRoot);
  if (!report.pass) {
    const error = new Error('framework asset budget failed: ' + report.reasons.join('; '));
    error.code = 'FRAMEWORK_ASSET_BUDGET_EXCEEDED';
    error.report = report;
    throw error;
  }
  return report;
}

module.exports = {
  FRAMEWORK_ASSET_BUDGETS,
  assertFrameworkAssetBudget,
  evaluateFrameworkAssetBudget,
  verifyFrameworkAssetBudget,
};
