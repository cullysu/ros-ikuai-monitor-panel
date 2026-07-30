#!/usr/bin/env node
'use strict';

/**
 * R07 follow-up contract: compact context actions must remain readable.
 *
 * The density slice intentionally gives the primary task a full row and puts
 * secondary context actions side by side. That creates a new obligation:
 * secondary labels and notes must not be visually ellipsized at 375/390px.
 * Keep this separate from the density contract so a shorter rail cannot hide
 * a copy/readability regression.
 */

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const types = read('src/panel-framework/overview/evidence-model/overviewEvidenceTypes.ts');
const actions = read('src/panel-framework/overview/evidence-model/buildOverviewInvestigationActions.ts');
const mobileActions = read('src/panel-framework/mobile/MobilePatrolActions.tsx');
const runtime = JSON.parse(read('_acceptance/panel-runtime-browser/report.json'));

const records = runtime.checks
  .filter((check) => check.name === 'mobile composite incident keeps proved interface dependency primary and resource pressure secondary')
  .map((check) => check.detail)
  .filter((detail) => detail?.viewport?.width === 375 || detail?.viewport?.width === 390)
  .map((detail) => ({
    viewport: detail.viewport,
    labels: detail.compactActionLabels || null,
  }));

const checks = {
  'action model exposes a compact secondary label and note': /compactLabel\?:\s*string/.test(types) && /compactNote\?:\s*string/.test(types),
  'risk action builders provide compact context copy': /compactLabel/.test(actions) && /compactNote/.test(actions),
  'mobile action renderer uses compact copy only for secondary actions': /action\.priority === "secondary"[\s\S]{0,240}compactLabel/.test(mobileActions),
  'fresh 375/390 records expose compact action geometry': records.length === 2 && records.every((record) => Array.isArray(record.labels) && record.labels.length === 2),
  'fresh compact labels and notes fit without horizontal clipping': records.length === 2 && records.every((record) => Array.isArray(record.labels) && record.labels.every((label) => (
    label.labelScrollWidth <= label.labelClientWidth + 1
      && label.noteScrollWidth <= label.noteClientWidth + 1
      && label.labelText
      && label.noteText
  ))),
};

const failures = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  pass: failures.length === 0,
  contract: 'mobile-compact-action-labels-v1',
  implementationState: failures.length === 0 ? 'focused-green' : 'expected-red',
  observed: records,
  checks,
  failures,
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
