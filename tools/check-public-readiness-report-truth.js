#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'tools', 'check-public-release-readiness.js'), 'utf8');

const checks = {
  readinessDefinesNestedPassScanner: /function reportNestedPassFalsePaths\s*\(/.test(source),
  readinessRejectsNestedPassFalse: /reportNestedPassFalsePaths\s*\(\s*report\s*\)/.test(source),
  readinessRejectsFailedChecks: /checks\.filter\(\s*\(check\)\s*=>\s*!isExplicitNotApplicableCheck\(check\)[\s\S]{0,180}check\.pass\s*!==\s*true/.test(source),
  readinessKeepsExplicitNotApplicable: /function isExplicitNotApplicableCheck\s*\(/.test(source),
  readinessRunsTruthContract: /assertNodeContract\(\s*'tools\/check-report-truth\.js'\s*\)/.test(source),
};

const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  pass: failed.length === 0,
  contract: 'public-readiness-report-truth-v1',
  checks,
  failures: failed,
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (failed.length) process.exitCode = 1;
