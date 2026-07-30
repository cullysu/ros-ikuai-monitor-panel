#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_ROOT = path.join(ROOT, 'src', 'panel-framework');
const ALLOWED_EXTENSIONS = new Set(['.ts', '.tsx']);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(target, files);
    else if (ALLOWED_EXTENSIONS.has(path.extname(entry.name))) files.push(target);
  }
  return files;
}

const failures = [];
for (const file of walk(SOURCE_ROOT)) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    if (line.includes('toLocaleLowerCase')) {
      failures.push(`${path.relative(ROOT, file).replace(/\\/g, '/')}:${index + 1}`);
    }
  });
}

const report = {
  pass: failures.length === 0,
  contract: 'locale-invariant-normalization-v1',
  implementationState: failures.length === 0 ? 'focused-green' : 'expected-red',
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
