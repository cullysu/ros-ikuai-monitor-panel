#!/usr/bin/env node
'use strict';

/**
 * Report-completeness quarantine contract.
 *
 * A bounded report is useful engineering evidence, but it cannot be a green
 * release input when it declares a required matrix and leaves that matrix
 * incomplete. The same rule applies when a green root contains a nested
 * pass=false result. Historical/worktree artifacts remain inspectable; they
 * must be classified and forbidden as current release evidence.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_ROOT = path.join(ROOT, '_acceptance');
const MANIFEST_PATH = path.join(ROOT, 'tools', 'acceptance', 'report-quarantine-policy.json');
const CURRENT_SOURCES = [
  path.join(ROOT, 'docs', 'decision-system', 'current-state.md'),
  path.join(ROOT, 'docs', 'product-loop-current.md'),
  path.join(ROOT, '.product-loop', 'state.json'),
];
const scanWarnings = [];

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function falsePassPaths(value, currentPath = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => falsePassPaths(item, currentPath + '/' + index));
  }
  if (!isRecord(value)) return [];
  const failures = [];
  for (const [key, child] of Object.entries(value)) {
    const childPath = currentPath + '/' + key;
    if (key === 'pass' && child === false) failures.push(childPath);
    failures.push(...falsePassPaths(child, childPath));
  }
  return failures;
}

function matrixIsDeclaredRequired(matrix) {
  if (!isRecord(matrix)) return false;
  return matrix.requestedComplete === true
    || (Array.isArray(matrix.requiredCells) && matrix.requiredCells.length > 0)
    || (Array.isArray(matrix.requestedRequiredCells) && matrix.requestedRequiredCells.length > 0);
}

function contradictionReasons(report) {
  if (!isRecord(report) || report.pass !== true) return [];
  const matrix = isRecord(report.matrix) ? report.matrix : null;
  const reasons = [];
  if (matrixIsDeclaredRequired(matrix) && matrix.complete !== true) {
    reasons.push('required-matrix-incomplete');
  }
  if (falsePassPaths(report).length > 0) {
    reasons.push('nested-pass-false');
  }
  return reasons;
}

function globToRegExp(glob) {
  const escaped = glob.replace(/[|\\{}()[\]^$+?.]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp('^' + escaped + '$');
}

function relativeSlash(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join('/');
}

function reportFiles() {
  if (!fs.existsSync(REPORT_ROOT)) return [];
  let entries;
  try {
    entries = fs.readdirSync(REPORT_ROOT, { withFileTypes: true });
  } catch (error) {
    scanWarnings.push({ directory: relativeSlash(REPORT_ROOT), detail: error.message });
    return [];
  }
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(REPORT_ROOT, entry.name, 'report.json'))
    .filter((filePath) => fs.existsSync(filePath) && fs.statSync(filePath).isFile());
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function matchingClosedRules(relative, rules) {
  return rules.filter((rule) => (
    isRecord(rule)
    && typeof rule.glob === 'string'
    && globToRegExp(rule.glob).test(relative)
    && rule.allowAsCurrentReleaseInput === false
    && typeof rule.classification === 'string'
    && /^(historical|worktree)/.test(rule.classification)
  ));
}

function matchingRules(relative, rules) {
  return rules.filter((rule) => (
    isRecord(rule)
    && typeof rule.glob === 'string'
    && globToRegExp(rule.glob).test(relative)
  ));
}

function currentSourceText(sourcePath) {
  if (path.basename(sourcePath) !== 'state.json') {
    return fs.readFileSync(sourcePath, 'utf8');
  }
  try {
    const state = readJson(sourcePath);
    // Machine state retains historical gate evidence for auditability. Only
    // the current evidence ledger feeds the current-report quarantine scan.
    return Array.isArray(state.evidence) ? state.evidence.join(String.fromCharCode(10)) : '';
  } catch (error) {
    scanWarnings.push({ source: relativeSlash(sourcePath), detail: error.message });
    return '';
  }
}

function sourceReferences(relative, sources = CURRENT_SOURCES) {
  return sources
    .filter((sourcePath) => fs.existsSync(sourcePath))
    .filter((sourcePath) => currentSourceText(sourcePath).includes(relative))
    .map((sourcePath) => relativeSlash(sourcePath));
}

function currentReportReferences(sources = CURRENT_SOURCES) {
  const references = new Set();
  const punctuation = String.fromCharCode(96, 34, 39) + '()[]{}.,;';
  for (const sourcePath of sources) {
    if (!fs.existsSync(sourcePath)) continue;
    const source = currentSourceText(sourcePath);
    for (const token of source.split(/\s+/)) {
      let candidate = token.replaceAll('\\', '/');
      while (candidate && punctuation.includes(candidate[0])) candidate = candidate.slice(1);
      while (candidate && punctuation.includes(candidate[candidate.length - 1])) candidate = candidate.slice(0, -1);
      if (candidate.startsWith('_acceptance/') && candidate.endsWith('/report.json')) {
        references.add(candidate);
      }
    }
  }
  return references;
}

function inspectReport(report, relative, rules) {
  const reasons = contradictionReasons(report);
  if (reasons.length === 0) return null;
  const matches = matchingRules(relative, rules);
  const closedMatches = matchingClosedRules(relative, rules);
  return {
    relative,
    reasons,
    matchingRules: matches.map((rule) => rule.glob),
    currentSourceReferences: sourceReferences(relative),
    quarantined: matches.length > 0 && closedMatches.length === matches.length,
  };
}

function main() {
  const failures = [];
  let manifest = null;
  try {
    manifest = readJson(MANIFEST_PATH);
  } catch (error) {
    failures.push({ name: 'manifest-unavailable', detail: error.message });
  }

  if (manifest?.schema !== 'acceptance-report-quarantine-v1') {
    failures.push({ name: 'manifest-schema', detail: manifest?.schema || null });
  }
  if (manifest?.status !== 'current') {
    failures.push({ name: 'manifest-status', detail: manifest?.status || null });
  }

  const rules = Array.isArray(manifest?.rules) ? manifest.rules : [];
  const files = reportFiles();
  const currentReferences = currentReportReferences();
  const currentFiles = files.filter((filePath) => currentReferences.has(relativeSlash(filePath)));
  const contradictions = [];
  const invalidReports = [];
  for (const filePath of currentFiles) {
    const relative = relativeSlash(filePath);
    let report;
    try {
      report = readJson(filePath);
    } catch (error) {
      invalidReports.push({ relative, detail: error.message });
      continue;
    }
    const contradiction = inspectReport(report, relative, rules);
    if (contradiction) contradictions.push(contradiction);
  }

  for (const contradiction of contradictions) {
    if (!contradiction.quarantined) {
      failures.push({
        name: 'unclassified-report-contradiction',
        detail: {
          report: contradiction.relative,
          reasons: contradiction.reasons,
        },
      });
    }
    if (contradiction.currentSourceReferences.length > 0) {
      failures.push({
        name: 'quarantined-report-current-reference',
        detail: {
          report: contradiction.relative,
          sources: contradiction.currentSourceReferences,
        },
      });
    }
  }
  for (const invalid of invalidReports) {
    failures.push({ name: 'invalid-report-json', detail: invalid });
  }

  const result = {
    pass: failures.length === 0,
    contract: 'report-completeness-quarantine-v1',
    manifest: relativeSlash(MANIFEST_PATH),
    totalReports: files.length,
    scannedReports: currentFiles.length,
    skippedHistoricalReports: files.length - currentFiles.length,
    currentReferences: [...currentReferences].sort(),
    scanWarnings,
    contradictionCount: contradictions.length,
    quarantinedCount: contradictions.filter((item) => item.quarantined).length,
    contradictions,
    invalidReports,
    failures,
    currentReleaseInput: false,
  };
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  if (!result.pass) process.exitCode = 1;
}

module.exports = {
  contradictionReasons,
  inspectReport,
  matrixIsDeclaredRequired,
};

if (require.main === module) main();
