#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/panel-framework/overview/desktop-overview/LegacyDesktopOverview.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/panel-framework/overview/desktop-overview/styles/legacy-desktop.css'), 'utf8');
const checks = {
  compactIncidentVerdictExists: /data-desktop-incident-verdict/.test(source) && /\.legacy-desktop-shell\.has-risk \.legacy-verdict/.test(css),
  normalStateDoesNotSpendHeightOnVerdict: /\.legacy-verdict\s*\{[\s\S]*?display:\s*none/.test(css),
  incidentKeepsLegacyPageArchitecture: /legacy-summary-strip/.test(source) && /legacy-main-grid/.test(source) && /data-desktop-object-list/.test(source),
  incidentObjectsUseCanonicalRiskOwners: /model\.riskQueue/.test(source) && /model\.priorityObjects/.test(source),
  resourceIncidentKeepsThreeMeasuredCards: /resourceMetrics\.map/.test(source) && /data-desktop-resource-evidence/.test(source),
};
const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const report = {
  pass: failed.length === 0,
  contract: 'desktop-incident-band-v2-legacy-ipad',
  implementationState: failed.length ? 'expected-red' : 'focused-green',
  scope: 'compact incident rhythm inside the accepted 192.168.3.5 desktop architecture',
  checks,
  failed,
  releaseEvidenceEligible: false,
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
