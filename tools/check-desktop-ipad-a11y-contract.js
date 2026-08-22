#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const tsx = fs.readFileSync(path.join(root, 'src/panel-framework/overview/desktop-overview/LegacyDesktopOverview.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/panel-framework/overview/desktop-overview/styles/legacy-desktop.css'), 'utf8');
const navigation = fs.readFileSync(path.join(root, 'src/panel-framework/sections/PanelTaskNavigation.tsx'), 'utf8');
const capture = fs.readFileSync(path.join(root, 'tools/capture-desktop-ipad-baseline.js'), 'utf8');

const checks = {
  scopedTokens: /\.panel-app-desktop\s*\{[\s\S]*--legacy-blue/.test(css) && !/:root\s*\{[\s\S]*--legacy-blue/.test(css),
  intermediateBreakpoints: /@media\s*\(max-width:\s*1040px\)/.test(css) && /@media\s*\(max-width:\s*820px\)/.test(css),
  largeTextReflow: /data-panel-large-text="true"/.test(css) && /legacy-main-grid\s*\{\s*grid-template-columns:\s*1fr/.test(css),
  focusVisible: /\.panel-task-navigation button:focus-visible/.test(css) && /\.legacy-object-row button:not\(:disabled\):focus-visible/.test(css),
  coarsePointerTargets: /@media\s*\(pointer:\s*coarse\)/.test(css) && /min-height:\s*40px/.test(css),
  reducedMotion: /@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(css),
  chartSamplingContract: /独立标尺/.test(tsx) && /sampleInterval/.test(tsx),
  routeToneContract: /legacy-route-chip is-\$\{routeStatus\}/.test(tsx) && /is-offline/.test(css) && /is-unavailable/.test(css),
  resourceThresholdContract: /data-resource-state/.test(tsx) && /is-over-threshold/.test(css),
  unavailableBoundaryContract: /unavailableDoesNotLookMeasured/.test(capture) && /historicalDoesNotClaimCurrent/.test(capture),
  navNames: /title=\{item\.label\}/.test(navigation),
};

const report = {
  pass: Object.values(checks).every(Boolean),
  contract: 'desktop-ipad-a11y-and-evidence-v1',
  checks,
  files: [
    'src/panel-framework/overview/desktop-overview/LegacyDesktopOverview.tsx',
    'src/panel-framework/overview/desktop-overview/styles/legacy-desktop.css',
    'src/panel-framework/sections/PanelTaskNavigation.tsx',
    'tools/capture-desktop-ipad-baseline.js',
  ],
};

const outDir = path.join(root, '_acceptance', 'desktop-ipad-a11y-contract');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
