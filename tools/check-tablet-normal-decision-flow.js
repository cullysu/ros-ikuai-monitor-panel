#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { gitWorktreeIdentity } = require('./worktree-runtime-identity');

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(ROOT, relativePath));
const checks = [];

function check(name, pass, detail = '') {
  checks.push({ name, pass: Boolean(pass), detail });
}

function findKey(value, key) {
  if (!value || typeof value !== 'object') return null;
  if (Object.prototype.hasOwnProperty.call(value, key)) return value[key];
  for (const child of Object.values(value)) {
    const found = findKey(child, key);
    if (found) return found;
  }
  return null;
}

const css = read('src/panel-framework/mobile/mobile-tablet-layout.css');
const reportPath = '_acceptance/panel-runtime-browser/report.json';
const report = exists(reportPath) ? JSON.parse(read(reportPath)) : null;
const runtimeIdentity = gitWorktreeIdentity(ROOT);
const normal768 = findKey(report, 'normal768');
const decisionRect = normal768?.decisionRect;
const decisionRows = normal768?.decisionRowRects ?? [];

const continuousOwner = /@container\s*\(min-width:\s*620px\)\s*\{[\s\S]*?\.mp-shell:not\(\.is-large-text\)\s+\.mp-tablet-right-column\s*>\s*\.mp-steady-decisions\s+\.mp-load\s*>\s*div\s*,/.test(css)
  && /@container\s*\(min-width:\s*620px\)\s*\{[\s\S]*?\.mp-shell:not\(\.is-large-text\)\s+\.mp-tablet-right-column\s*>\s*\.mp-steady-decisions\s+\.mp-decision-ledger-rows\s*\{[\s\S]*?grid-template-columns:\s*1fr\s*;/.test(css);
const boundedFork = /@container\s*\(min-width:\s*620px\)\s*and\s*\(max-width:\s*899px\)/.test(css);
const boundedForkIsScopedToColumnContinuity = /@container\s*\(min-width:\s*620px\)\s*and\s*\(max-width:\s*899px\)[\s\S]*?\.mp-tablet-steady-support\s*\{\s*display:\s*contents;[\s\S]*?\.mp-tablet-steady-support\s*>\s*\.mp-ledger\s*\{\s*grid-column:\s*1\s*\/\s*-1;/.test(css);
const noWideFork = !/@container\s*\(min-width:\s*900px\)/.test(css);
const verticalSeparators = /\.mp-shell:not\(\.is-large-text\)\s+\.mp-tablet-right-column\s*>\s*\.mp-steady-decisions\s+\.mp-decision-ledger-row\s*\+\s*\.mp-decision-ledger-row\s*\{[\s\S]*?border-top:\s*1px solid var\(--mp-line\)[\s\S]*?border-left:\s*0\s*;/.test(css);

check(
  '620px+ tablet owner uses one readable decision column',
  continuousOwner,
  '620px+ must explicitly set the normal decision ledger to one column',
);
check(
  'lower-capacity tablet load owner uses one readable decision column',
  continuousOwner,
  'resource/load decision rows must not remain three narrow columns in the same capacity range',
);
check(
  'lower-capacity tablet separators follow the vertical flow',
  verticalSeparators,
  'vertical decision rows need top separators and no left-column dividers',
);
check(
  '620px–1199px keeps one decision-flow owner across capacity boundaries',
  (!boundedFork || boundedForkIsScopedToColumnContinuity) && noWideFork,
  'a bounded rule is allowed only for the focused column-continuity placement; decision-flow ownership must not fork at 899→900',
);

check(
  'fresh runtime is current clean exact-SHA evidence',
  report?.source === 'playwright-production-runtime' &&
    report?.pass === true &&
    report?.commit === runtimeIdentity.commit &&
    report?.worktreeClean === true &&
    runtimeIdentity.worktreeClean === true &&
    report?.worktreeFingerprint === runtimeIdentity.worktreeFingerprint &&
    report?.releaseEvidenceEligible === true,
  {
    source: report?.source ?? null,
    pass: report?.pass ?? null,
    commit: report?.commit ?? null,
    currentCommit: runtimeIdentity.commit,
    reportWorktreeClean: report?.worktreeClean ?? null,
    currentWorktreeClean: runtimeIdentity.worktreeClean,
    fingerprintMatches: report?.worktreeFingerprint === runtimeIdentity.worktreeFingerprint,
    releaseEvidenceEligible: report?.releaseEvidenceEligible ?? null,
  },
);
check(
  'fresh normal 768 runtime reports a vertical decision flow',
  normal768?.decisionOrientation === 'vertical' &&
    decisionRows.length >= 2 &&
    decisionRows.every((row) => Number(row.width) >= 320) &&
    Number(decisionRect?.width) >= 320,
  {
    decisionOrientation: normal768?.decisionOrientation ?? null,
    decisionRect,
    decisionRows,
  },
);
check(
  'fresh normal tablet original is registered',
  report?.screenshots?.includes('tablet-overview-normal-768.png') === true,
  { screenshot: 'tablet-overview-normal-768.png' },
);

const failures = checks.filter((entry) => !entry.pass).map((entry) => entry.name);
const result = {
  pass: failures.length === 0,
  contract: 'tablet-normal-decision-flow-v1',
  implementationState: failures.length === 0 ? 'focused-green' : 'expected-red',
  releaseEligible: false,
  failures,
  checks,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
process.exitCode = result.pass ? 0 : 1;
