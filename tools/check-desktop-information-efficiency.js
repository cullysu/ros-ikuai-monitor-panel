#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const componentPath = path.join(root, 'src', 'panel-framework', 'overview', 'desktop-overview', 'LegacyDesktopOverview.tsx');
const entryPath = path.join(root, 'src', 'panel-framework', 'overview', 'desktop-overview', 'styles', 'desktop-overview-entry.css');
const cssPath = path.join(root, 'src', 'panel-framework', 'overview', 'desktop-overview', 'styles', 'legacy-desktop.css');
const component = fs.readFileSync(componentPath, 'utf8');
const entry = fs.readFileSync(entryPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');

const checks = {
  legacyIpadOwnerDeclared: /data-desktop-information-efficiency="legacy-ipad-v1"/.test(component),
  acceptedVisualGrammarDeclared: /data-visual-grammar="ikuai-4-ipad"/.test(component),
  eightItemSummaryStrip: (component.match(/<SummaryTile /g) || []).length >= 8,
  wanAndRealtimeColumnsOwned: /legacy-wan-column/.test(component) && /legacy-right-column/.test(component),
  trafficResourceAndObjectBandsDistinct: /legacy-trend-grid/.test(component) && /legacy-resource-grid/.test(component) && /legacy-object-list/.test(component),
  responsiveGridPreserved: /@media \(max-width: 1280px\)/.test(css) && /@media \(max-width: 1040px\)/.test(css),
  retiredLedgerCssUnowned: !/desktop-overview-(?:tokens|base|responsive)\.css|desktop-next\.css/.test(entry),
  entryOnlyImportsLegacyOwner: entry.trim() === '@import "./legacy-desktop.css";',
};

const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const report = {
  pass: failed.length === 0,
  contract: 'desktop-information-efficiency-v3-legacy-ipad',
  scope: 'desktop overview 1200px+',
  files: [componentPath, entryPath, cssPath].map((file) => path.relative(root, file).replaceAll('\\', '/')),
  checks,
  failed,
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
