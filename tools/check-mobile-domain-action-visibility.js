#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const reportPath = path.join(root, '_acceptance', 'panel-runtime-browser', 'report.json');
const expectedName = '390px resource detail next-evidence action avoids fixed navigation';
const failures = [];
let report = null;

if (!fs.existsSync(reportPath)) {
  failures.push('runtime report is missing');
} else {
  try {
    report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  } catch (error) {
    failures.push(`runtime report is not valid JSON: ${error.message}`);
  }
}

const evidence = report?.checks?.find((item) => item?.name === expectedName) || null;
if (!evidence) {
  failures.push(`runtime report is missing check: ${expectedName}`);
} else if (evidence.pass !== true) {
  failures.push(`runtime check is not green: ${expectedName}`);
}

const result = {
  pass: failures.length === 0,
  contract: 'mobile-domain-action-visibility-v1',
  expectedName,
  evidence: evidence?.detail || null,
  failures,
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (failures.length) process.exitCode = 1;
