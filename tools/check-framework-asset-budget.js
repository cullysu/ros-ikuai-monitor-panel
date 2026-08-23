#!/usr/bin/env node
'use strict';

const path = require('path');
const { verifyFrameworkAssetBudget } = require('./framework-asset-budget');

try {
  const report = verifyFrameworkAssetBudget(path.resolve(__dirname, '..'));
  const stream = report.pass ? process.stdout : process.stderr;
  stream.write(JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.pass ? 0 : 1;
} catch (error) {
  process.stderr.write(JSON.stringify({
    pass: false,
    error: error && error.message ? error.message : String(error),
  }, null, 2) + '\n');
  process.exitCode = 1;
}
