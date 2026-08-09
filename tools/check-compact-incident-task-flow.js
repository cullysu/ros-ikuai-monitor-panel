#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const screen = fs.readFileSync(path.join(root, 'src/panel-framework/mobile/MobilePatrolScreen.tsx'), 'utf8');
const surface = fs.readFileSync(path.join(root, 'src/panel-framework/mobile/useMobilePanelSurface.ts'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/panel-framework/mobile/mobile-patrol.css'), 'utf8');

const checks = {
  compactQueryReused: surface.includes('COMPACT_TASK_QUERY') && screen.includes('COMPACT_TASK_QUERY'),
  compactCapabilityOwned: /const\s+compactTask\s*=\s*useMediaCapability\(COMPACT_TASK_QUERY\)/.test(screen),
  compactIncidentOwned: /const\s+compactIncident\s*=\s*\(compactTask\s*\|\|\s*compactLandscapeFallback\)\s*&&\s*!tablet\s*&&\s*incident/.test(screen),
  compactShellState: screen.includes('is-compact-incident') && screen.includes('data-mobile-compact-incident'),
  primaryActionLandmark: screen.includes('data-mobile-compact-incident-actions') && screen.includes('compactIncidentActions'),
  noContextDuplicate: /!phonePrimaryAction\s*&&\s*!compactIncidentActions\s*&&\s*state\.scale\s*!==\s*["']fleet["']\s*\?\s*patrolActions\s*:\s*null/.test(screen),
  compactCssBand: /@media\s*\(min-width:\s*(?:375|600)px\)\s*and\s*\(max-width:\s*767px\)/.test(css),
  compactCssOwner: css.includes('.mp-compact-action-list'),
  compactCssTwoColumns: /mp-compact-action-list[\s\S]{0,500}grid-template-columns:\s*repeat\(2/.test(css),
  largeTextSingleColumn: /is-large-text[\s\S]{0,900}\.mp-compact-action-list[\s\S]{0,300}grid-template-columns:\s*1fr/.test(css),
};

const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const result = { pass: failed.length === 0, contract: 'compact-incident-task-flow-v1', checks, failed };
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (failed.length) process.exitCode = 1;
