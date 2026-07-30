#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const proofSource = read('src/panel-framework/overview/evidence-model/buildOverviewEvidenceModel.ts');
const pressureSource = read('src/panel-framework/mobile/MobileResourcePressure.tsx');
const historySource = read('src/panel-framework/mobile/MobileResourceHistory.tsx');
const runtimePath = path.join(root, '_acceptance/panel-runtime-browser/report.json');
const runtime = fs.existsSync(runtimePath) ? JSON.parse(fs.readFileSync(runtimePath, 'utf8')) : null;
const resourceRuntime = (runtime?.checks || []).find((check) => check.name === '390px expanded resource evidence survives measured synthetic text stress without being reported as OS scaling');
const resourceStart = proofSource.indexOf('if (risk === "resource")');
const resourceEnd = proofSource.indexOf('if (risk === "interfaces")', resourceStart);
const resourceBlock = resourceStart >= 0 && resourceEnd > resourceStart ? proofSource.slice(resourceStart, resourceEnd) : '';
const trailingLine = resourceBlock.split(/\r?\n/).find((line) => line.includes('fact("resource-trailing"')) || '';
const samplesLine = resourceBlock.split(/\r?\n/).find((line) => line.includes('fact("resource-samples"')) || '';

const checks = {
  proofDoesNotReplayLeadingMetric: !trailingLine.includes('leading.label'),
  proofUsesWindowDuration: resourceBlock.includes('durationSeconds'),
  proofNamesSourceRole: samplesLine.includes('采样来源') && samplesLine.includes('原子序列'),
  pressureKeepsLeadingMetricOutOfComparisonBars: /const metrics = resource\.metrics\.slice\(1\)/.test(pressureSource),
  historyOwnsTimeSeriesRole: /data-resource-evidence-role="time-series"/.test(historySource),
  freshResourceRuntimeEvidence: Boolean(resourceRuntime?.pass === true),
};

const failures = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  pass: failures.length === 0,
  contract: 'mobile-resource-layer-novelty-v1',
  implementationState: failures.length === 0 ? 'focused-green' : 'expected-red',
  checks,
  failures,
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
process.exitCode = result.pass ? 0 : 1;
