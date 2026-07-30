#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const targetPath = path.join(ROOT, 'tools', 'check-public-release-readiness.js');
const source = fs.readFileSync(targetPath, 'utf8');

const checks = [
  ['bounded readiness child runner exists', /function runReadinessChild\s*\(/.test(source)],
  ['readiness child timeout is explicit and bounded', /READINESS_CHILD_TIMEOUT_MS\s*=\s*\d+/.test(source) && /timeout:\s*READINESS_CHILD_TIMEOUT_MS/.test(source)],
  ['readiness child runner keeps a Windows-safe hidden process boundary', /windowsHide:\s*true/.test(source)],
  ['readiness child runner emits phase and elapsed timeout diagnostics', /phase=.*elapsedMs|elapsedMs=.*phase/.test(source) && /ETIMEDOUT|timed out/.test(source)],
  ['git identity lookup uses the bounded child runner', /runReadinessChild\([^\n]*git/.test(source)],
  ['Node contracts use the bounded child runner', /runReadinessChild\([^\n]*process\.execPath/.test(source)],
  ['Python decision sync uses the bounded child runner', /runReadinessChild\([^\n]*python/.test(source)],
  ['direct spawnSync is isolated inside the bounded child runner', (source.match(/\bspawnSync\s*\(/g) || []).length === 1],
  ['matrix report discovery is bounded and identity-aware', source.includes('MAX_MATRIX_REPORT_CANDIDATES = 6') && source.includes('scoreCurrentMatrixReportCandidate') && source.includes('.slice(0, MAX_MATRIX_REPORT_CANDIDATES)')],
];

const failed = checks.filter(([, pass]) => !pass).map(([name]) => name);
const report = {
  pass: failed.length === 0,
  contract: 'public-release-readiness-lifecycle-v1',
  implementationState: failed.length === 0 ? 'focused-engineering-green' : 'expected-red',
  target: path.relative(ROOT, targetPath).split(path.sep).join('/'),
  checks: Object.fromEntries(checks),
  failed,
};

console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
