#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const ownerPath = path.join(root, 'src', 'panel-framework', 'overview', 'desktop-overview', 'LegacyDesktopOverview.tsx');
const cssPath = path.join(root, 'src', 'panel-framework', 'overview', 'desktop-overview', 'styles', 'legacy-desktop.css');
const reportPath = path.join(root, '_acceptance', 'desktop-ipad-baseline', 'report.json');
const owner = fs.readFileSync(ownerPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;
const captures = Array.isArray(report?.captures) ? report.captures : [];
const requiredScenarios = ['single', 'fleet', 'all-offline', 'no-snapshot', 'collection-down', 'resource-full', 'interfaces-down'];
const requiredViewports = ['1366x768', '1440x900'];
const capturedCells = new Set(captures.filter((cell) => cell.pass).map((cell) => `${cell.scenario}:${cell.width}x${cell.height}`));

const checks = {
  acceptedOwnerDeclared: /data-overview-task-contract="legacy-desktop-task-v1"/.test(owner),
  acceptedVisualGrammarDeclared: /data-visual-grammar="ikuai-4-ipad"/.test(owner),
  wideSummaryRetainsEightCompactFacts: /\.legacy-summary-strip\s*\{[\s\S]*?repeat\(8/.test(css),
  normalVerdictDoesNotConsumeFirstViewport: /\.legacy-verdict\s*\{[\s\S]*?display:\s*none/.test(css),
  mainColumnsAlignAtTop: /\.legacy-main-grid\s*\{[\s\S]*?align-items:\s*start/.test(css),
  narrowDesktopReflowsWithoutOverlappingWanGrid: /@media \(max-width:\s*1040px\)[\s\S]*?\.legacy-wan-column\s*\{\s*display:\s*block/.test(css),
  requiredMatrixComplete: requiredScenarios.every((scenario) => requiredViewports.every((viewport) => capturedCells.has(`${scenario}:${viewport}`))),
  requiredMatrixPasses: report?.pass === true && captures.length === requiredScenarios.length * requiredViewports.length,
  rejectedDesktopOwnersRemainAbsent: !/DesktopLedger|DesktopOverviewTask|DesktopIncidentDocket|data-desktop-normal-top-band|has-focus-task/.test(owner),
};

const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  pass: failed.length === 0,
  contract: 'desktop-normal-density-v3-legacy-ipad',
  implementationState: failed.length ? 'expected-red' : 'desktop-matrix-green',
  scope: 'accepted 192.168.3.5 desktop owner at 1366x768 and 1440x900',
  reportPath,
  captureCount: captures.length,
  checks,
  failed,
  releaseEvidenceEligible: false,
};

console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
