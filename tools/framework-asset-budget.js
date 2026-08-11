#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const FRAMEWORK_ASSET_BUDGETS = Object.freeze({
  script: Object.freeze({
    // The supplemental evidence routes are shipped in the same offline-safe
    // IIFE. Terser absorbs most of that cost; keep raw and Brotli ceilings
    // tighter than the former budget while allowing a bounded gzip variance.
    bytes: 600000,
    gzipBytes: 160000,
    brotliBytes: 130000,
  }),
  style: Object.freeze({
    bytes: 120000,
    gzipBytes: 20000,
    brotliBytes: 18000,
  }),
  desktopStyle: Object.freeze({
    bytes: 40000,
    gzipBytes: 10000,
    brotliBytes: 8000,
  }),
});

function evaluateFrameworkAssetBudget(manifest, budgets = FRAMEWORK_ASSET_BUDGETS) {
  const reasons = [];
  const assets = {};
  for (const [kind, limits] of Object.entries(budgets)) {
    const record = manifest?.assets?.[kind];
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
    const record = manifest?.assets?.[kind];
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
