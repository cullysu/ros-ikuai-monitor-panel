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

const contractSources = [
  path.join(SOURCE_ROOT, 'overview', 'mobile-overview', 'optical-patrol', 'opticalPatrolCollectionClaims.ts'),
  path.join(SOURCE_ROOT, 'overview', 'mobile-overview', 'optical-patrol', 'opticalPatrolResourceClaims.ts'),
];

function requireSourcePattern(file, pattern, label) {
  const source = fs.readFileSync(file, 'utf8');
  if (!pattern.test(source)) {
    failures.push(`${path.relative(ROOT, file).replace(/\\/g, '/')}:${label}`);
  }
}

for (const file of contractSources) {
  requireSourcePattern(file, /\.normalize\(["']NFKC["']\)[\s\S]{0,120}\.toLowerCase\(\)/, 'missing-locale-neutral-key-normalization');
}

const localeProbe = 'I REST SSH';
const localeIndependent = localeProbe.toLowerCase();
if (localeIndependent !== 'i rest ssh' || localeProbe.toLocaleLowerCase('tr') === localeIndependent) {
  failures.push('runtime:locale-neutral-case-fold-probe');
}

const report = {
  pass: failures.length === 0,
  contract: 'locale-invariant-normalization-v1',
  implementationState: failures.length === 0 ? 'blocking-green' : 'blocking-red',
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
