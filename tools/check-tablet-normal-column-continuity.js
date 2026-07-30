#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

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

const css = `${read('src/panel-framework/mobile/mobile-patrol.css')}\n${read('src/panel-framework/mobile/mobile-tablet-layout.css')}`;
const screen = read('src/panel-framework/mobile/MobilePatrolScreen.tsx');
const reportPath = '_acceptance/panel-runtime-browser/report.json';
const report = exists(reportPath) ? JSON.parse(read(reportPath)) : null;
const normal768 = findKey(report, 'normal768');
const signalRect = normal768?.signalRect;
const decisionRect = normal768?.decisionRect;

check(
  'tablet split places the WAN signal in the right work column',
  /\.mp-tablet-right-column\s*>\s*\.mp-traffic\s+\.mp-traffic-body/.test(css) &&
    /className="mp-tablet-right-column"[\s\S]*?\{trafficSignal\}/.test(screen),
  'the signal must be owned by the named right column instead of relying on auto-placement',
);
check(
  'tablet split stacks normal decisions beneath the WAN signal',
  /\.mp-tablet-right-column\s*>\s*\.mp-steady-decisions/.test(css) &&
    /\{trafficSignal\}[\s\S]*?<MobileSteadyDecisionLedger/.test(screen),
  'normal decision evidence must follow the signal inside the named right work column',
);
check(
  'tablet split does not force the normal decision ledger across both columns',
  !/\.mp-tablet-steady\s*>\s*\.mp-steady-decisions\s*\{[^}]*?grid-column:\s*1\s*\/\s*-1\s*;/.test(css),
  'a full-width decision band must not leave the right work column visually idle',
);
check(
  'fresh 768px normal runtime keeps decisions below the signal in the same column',
  Boolean(signalRect && decisionRect &&
    decisionRect.left >= signalRect.left - 2 &&
    decisionRect.right <= signalRect.right + 2 &&
    decisionRect.top >= signalRect.bottom - 2),
  { signalRect, decisionRect },
);
check(
  'fresh runtime is production-shaped evidence and remains release-ineligible',
  report?.source === 'playwright-production-runtime' && report?.pass === true && report?.releaseEvidenceEligible === false,
  { source: report?.source ?? null, pass: report?.pass ?? null, releaseEvidenceEligible: report?.releaseEvidenceEligible ?? null },
);

const failures = checks.filter((entry) => !entry.pass).map((entry) => entry.name);
const result = {
  pass: failures.length === 0,
  contract: 'tablet-normal-column-continuity-v1',
  implementationState: failures.length === 0 ? 'focused-green' : 'expected-red',
  failures,
  checks,
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
process.exitCode = result.pass ? 0 : 1;
