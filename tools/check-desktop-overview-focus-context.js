#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const componentPath = path.join(root, 'src', 'panel-framework', 'overview', 'desktop-overview', 'LegacyDesktopOverview.tsx');
const source = fs.readFileSync(componentPath, 'utf8');
const failures = [];

function check(name, condition, detail) {
  if (!condition) failures.push({ name, detail });
}

check('desktop owner uses the shared ranked risk queue', /model\.riskQueue/.test(source), 'incident rows must come from the shared canonical ranking');
check('priority objects extend incident context', /model\.priorityObjects/.test(source), 'incident rows need object context beyond the headline');
check('active WAN requires an explicitly running row', /find\(\(row\) => row\.running && !row\.disabled\) \|\| null/.test(source), 'the desktop must not claim an arbitrary first WAN as active');
check('no arbitrary first-row fallback remains', !/wans\[0\]|rows\[0\]/.test(source), 'unknown active WAN must remain unknown');
check('object navigation retains evidence time', /evidenceAt: model\.evidenceAt/.test(source), 'desktop object navigation must preserve evidence context');
check('traffic stays bound to evidence model', /const traffic = model\.traffic/.test(source), 'current rates must not be reconstructed locally');
const resourceFallback = source.slice(source.indexOf('const resourceMetrics ='), source.indexOf('const fallbackObjects ='));
check('resource fallback is current-only', /当前单点/.test(source) && !/timestamp\s*:/.test(resourceFallback), 'a missing history must not become a fake trend');
check('mobile presentation is not imported', !/mobile-inspection-ui|MobileInspection/.test(source), 'desktop and mobile presentation owners remain isolated');

if (failures.length) {
  console.error(JSON.stringify({ pass: false, contract: 'desktop-overview-focus-context-v2-legacy-ipad', failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ pass: true, checks: 8, contract: 'desktop-overview-focus-context-v2-legacy-ipad' }, null, 2));
