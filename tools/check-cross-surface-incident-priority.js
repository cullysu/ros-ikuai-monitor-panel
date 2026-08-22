#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/panel-framework/overview/desktop-overview/LegacyDesktopOverview.tsx'), 'utf8');
const verdictIndex = source.indexOf('<LegacyVerdict model={model} />');
const summaryIndex = source.indexOf('<section className="legacy-summary-strip"');
const workspaceIndex = source.indexOf('<div className="legacy-object-list"');
const riskRowsIndex = source.indexOf('const riskRows =');
const objectRowsIndex = source.indexOf('const objectRows =');
const checks = {
  incidentSummaryPrecedesDenseWorkspace: verdictIndex >= 0 && summaryIndex > verdictIndex && workspaceIndex > summaryIndex,
  rankedRiskRowsOwnIncidentObjects: riskRowsIndex >= 0 && objectRowsIndex > riskRowsIndex && /model\.riskQueue/.test(source) && /model\.priorityObjects/.test(source),
  fleetDoesNotOverrideRisk: /const risk = model\.risk !== "none"/.test(source) && !/state\.scale\s*===\s*"fleet"[\s\S]*riskRows/.test(source),
  defaultObjectRowsFollowRisk: /const objectRows = risk\s*\? riskRows/.test(source),
};
const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  pass: failed.length === 0,
  contract: 'cross-surface-incident-priority-v2-legacy-ipad',
  implementationState: failed.length ? 'expected-red' : 'focused-engineering-green',
  scope: 'desktop incident summary and object priority; Product/Visual sign-off remains separate',
  checks,
  failed,
  releaseEvidenceEligible: false,
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
