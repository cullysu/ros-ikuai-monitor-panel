#!/usr/bin/env node
'use strict';

const path = require('path');
const { verifyFrameworkAssetIdentity } = require('./framework-asset-identity');

const projectRoot = path.resolve(__dirname, '..');

try {
  const report = verifyFrameworkAssetIdentity(projectRoot);
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
