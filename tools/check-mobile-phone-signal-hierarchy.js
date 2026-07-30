#!/usr/bin/env node
'use strict';

/**
 * Step364 write-ahead contract.
 *
 * This is intentionally a source/runtime composition gate, not a visual
 * sign-off. The phone WAN signal must distinguish current readings from the
 * window peak and remain discoverable at both common narrow widths.
 */

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const trafficSource = fs.readFileSync(
  path.join(root, 'src/panel-framework/mobile/MobilePatrolTraffic.tsx'),
  'utf8',
);
const focusSource = fs.readFileSync(
  path.join(root, 'src/panel-framework/mobile/MobileFocusObject.tsx'),
  'utf8',
);
const screenSource = fs.readFileSync(
  path.join(root, 'src/panel-framework/mobile/MobilePatrolScreen.tsx'),
  'utf8',
);
const reportPath = path.join(root, '_acceptance/panel-runtime-browser/report.json');
const report = fs.existsSync(reportPath)
  ? JSON.parse(fs.readFileSync(reportPath, 'utf8'))
  : null;
const primaryStart = screenSource.indexOf('<div className="mp-workspace-primary">');
const primaryEnd = screenSource.indexOf('</div>', primaryStart);
const primarySource = primaryStart >= 0 && primaryEnd > primaryStart
  ? screenSource.slice(primaryStart, primaryEnd)
  : '';

const checks = [
  {
    name: 'current rate has one explicit phone owner in the current-object surface',
    pass: /data-mobile-traffic-current/.test(focusSource) && !/data-mobile-traffic-current/.test(trafficSource),
  },
  {
    name: 'current rate is not replayed in the WAN signal surface',
    pass: !/traffic\.currentDown|traffic\.currentUp/.test(trafficSource),
  },
  {
    name: 'traffic instrument labels window peak and sample window without current replay',
    pass: /峰值/.test(trafficSource) && /data-mobile-traffic-peak/.test(trafficSource) && /data-mobile-traffic-window/.test(trafficSource),
  },
  {
    name: 'normal phone keeps the signal before the secondary decision ledger',
    pass: primarySource.includes('{normalPhoneSteadyDecisions}') &&
      primarySource.indexOf('{trafficSignal}') < primarySource.indexOf('{normalPhoneSteadyDecisions}'),
  },
  {
    name: 'runtime binds one current-rate owner and signal peak/window at 375/390',
    pass: Boolean(report?.checks?.some((check) => (
      /normal phone current rate owner.*375.*390/i.test(check.name || '') && check.pass === true
    ))),
  },
];

for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
}

const failed = checks.filter((check) => !check.pass);
if (failed.length) {
  console.error(`[mobile-phone-signal-hierarchy] FAIL ${failed.length}/${checks.length}`);
  process.exitCode = 1;
} else {
  console.log(`[mobile-phone-signal-hierarchy] PASS ${checks.length}/${checks.length}`);
}
