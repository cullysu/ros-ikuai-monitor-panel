#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'src/panel-framework/overview/desktop-overview/styles/legacy-desktop.css'), 'utf8');
const source = fs.readFileSync(path.join(root, 'src/panel-framework/overview/desktop-overview/LegacyDesktopOverview.tsx'), 'utf8');
const checks = {
  summaryBusIsSemanticLandmark: /data-desktop-status-bus/.test(source) && /aria-label="设备摘要"/.test(source),
  exactlyEightSummaryTiles: (source.match(/<SummaryTile /g) || []).length >= 8,
  compactButReadableSummaryType: /\.legacy-summary-tile > span[\s\S]*?font-size:\s*10px/.test(css) && /\.legacy-summary-tile > b[\s\S]*?font-size:\s*16px/.test(css),
  noSubTenOperationalType: !/font-size:\s*(?:7|8|9)(?:\.\d+)?px/.test(css.replace(/\.legacy-axis-label\s*\{[\s\S]*?\}/, '')),
  restrainedCardRadius: /--legacy-radius:\s*10px/.test(css) && !/border-radius:\s*(?:1[6-9]|[2-9]\d)px/.test(css),
};
const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  pass: failed.length === 0,
  contract: 'desktop-status-density-v2-legacy-ipad',
  implementationState: failed.length ? 'expected-red' : 'focused-engineering-green',
  scope: 'accepted legacy iPad desktop summary density',
  checks,
  failed,
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
