#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'tools', 'acceptance', 'report-quarantine-policy.json');
const REPORT_ROOT = path.join(ROOT, '_acceptance');
const CURRENT_SOURCES = [
  path.join(ROOT, 'docs', 'decision-system', 'current-state.md'),
  path.join(ROOT, 'docs', 'product-loop-current.md'),
  path.join(ROOT, '.product-loop', 'state.json'),
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function falsePassPaths(value, currentPath = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => falsePassPaths(item, `${currentPath}/${index}`));
  }
  if (!isRecord(value)) return [];
  const failures = [];
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${currentPath}/${key}`;
    if (key === 'pass' && child === false) failures.push(childPath);
    failures.push(...falsePassPaths(child, childPath));
  }
  return failures;
}

function globToRegExp(glob) {
  const escaped = glob.replace(/[|\\{}()[\]^$+?.]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function relativeSlash(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join('/');
}

function reportFiles() {
  const result = [];
  for (const entry of fs.readdirSync(REPORT_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^release-routes-state-[0-9a-f]{40}$/.test(entry.name)) continue;
    const filePath = path.join(REPORT_ROOT, entry.name, 'report.json');
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) result.push(filePath);
  }
  return result;
}

function main() {
  const failures = [];
  if (!fs.existsSync(MANIFEST_PATH)) {
    failures.push({ name: 'manifest-missing', detail: 'tools/acceptance/report-quarantine-policy.json is required' });
  }

  let manifest = null;
  if (fs.existsSync(MANIFEST_PATH)) {
    manifest = readJson(MANIFEST_PATH);
    if (manifest.schema !== 'acceptance-report-quarantine-v1') {
      failures.push({ name: 'manifest-schema', detail: 'unexpected quarantine manifest schema' });
    }
    if (manifest.status !== 'current') {
      failures.push({ name: 'manifest-status', detail: 'quarantine manifest must be current' });
    }
    if (!Array.isArray(manifest.rules) || manifest.rules.length === 0) {
      failures.push({ name: 'manifest-rules', detail: 'quarantine manifest must declare at least one rule' });
    }
  }

  const rules = Array.isArray(manifest?.rules) ? manifest.rules : [];
  const falseGreen = [];
  for (const filePath of reportFiles()) {
    const relative = relativeSlash(filePath);
    let report;
    try {
      report = readJson(filePath);
    } catch (error) {
      failures.push({ name: 'invalid-report-json', detail: `${relative}: ${error.message}` });
      continue;
    }
    const childFailures = falsePassPaths(report);
    if (report.pass === true && childFailures.length > 0) {
      falseGreen.push({ relative, childFailures });
      const matchingRules = rules.filter((rule) => {
        if (!isRecord(rule) || typeof rule.glob !== 'string') return false;
        return globToRegExp(rule.glob).test(relative);
      });
      if (matchingRules.length === 0) {
        failures.push({ name: 'unclassified-false-green', detail: relative + ': ' + childFailures.length + ' child pass=false' });
      } else {
        const openRules = matchingRules.filter((rule) => (
          rule.classification !== 'historical-counterexample'
          && rule.classification !== 'historical-or-worktree-artifact'
        ) || rule.allowAsCurrentReleaseInput !== false);
        if (openRules.length > 0) {
          failures.push({ name: 'false-green-rule-not-closed', detail: relative + ': every matching rule must forbid current release use' });
        }
      }
    }
  }

  const forbiddenReferences = [];
  const quarantinedPaths = falseGreen.map((item) => item.relative);
  for (const sourcePath of CURRENT_SOURCES) {
    if (!fs.existsSync(sourcePath)) continue;
    const source = fs.readFileSync(sourcePath, 'utf8');
    for (const relative of quarantinedPaths) {
      if (!source.includes(relative)) continue;
      if (sourcePath.endsWith('.json') && source.includes(`historical-counterexample:${relative}`)) continue;
      forbiddenReferences.push({ source: relativeSlash(sourcePath), report: relative });
    }
  }
  if (forbiddenReferences.length) {
    failures.push({ name: 'quarantined-report-current-reference', detail: forbiddenReferences });
  }

  const result = {
    pass: failures.length === 0,
    contract: 'acceptance-report-quarantine-v1',
    manifest: fs.existsSync(MANIFEST_PATH) ? relativeSlash(MANIFEST_PATH) : null,
    falseGreenCount: falseGreen.length,
    falseGreenReports: falseGreen,
    forbiddenReferences,
    failures,
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (failures.length) process.exitCode = 1;
}

main();
