#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'src/panel-framework/overview/desktop-overview/styles/legacy-desktop.css'), 'utf8');
const source = fs.readFileSync(path.join(root, 'src/panel-framework/overview/desktop-overview/LegacyDesktopOverview.tsx'), 'utf8');
const checks = {
  eightColumnSummaryAtWideDesktop: /\.legacy-summary-strip\s*\{[\s\S]*?grid-template-columns:\s*repeat\(8/.test(css),
  wanAndRealtimeShareMainGrid: /\.legacy-main-grid\s*\{[\s\S]*?grid-template-columns:\s*minmax\(320px, 32%\) minmax\(0, 68%\)/.test(css),
  columnsAlignAtTop: /\.legacy-main-grid\s*\{[\s\S]*?align-items:\s*start/.test(css),
  normalVerdictConsumesNoSpace: /\.legacy-verdict\s*\{[\s\S]*?display:\s*none/.test(css),
  summaryPrecedesOperationalGrid: source.indexOf('legacy-summary-strip') < source.indexOf('legacy-main-grid'),
};
const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  pass: failed.length === 0,
  contract: 'desktop-normal-top-band-continuity-v3-legacy-ipad',
  implementationState: failed.length ? 'expected-red' : 'static-green-runtime-pending',
  checks,
  failed,
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
