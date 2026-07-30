#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const screen = read('src/panel-framework/mobile/MobilePatrolScreen.tsx');
const reportPath = path.join(root, '_acceptance/panel-runtime-browser/report.json');
const report = fs.existsSync(reportPath)
  ? JSON.parse(fs.readFileSync(reportPath, 'utf8'))
  : null;
const runtimeCheck = (report?.checks || []).find((entry) => entry.name.startsWith('normal patrol actions'));
const normal768 = runtimeCheck?.detail?.normal768 || null;
const normal844 = runtimeCheck?.detail?.normal844 || null;

const rightStart = screen.indexOf('<div className="mp-tablet-right-column"');
const supportStart = screen.indexOf('<div className="mp-tablet-steady-support">');
const rightBody = rightStart >= 0 && supportStart > rightStart
  ? screen.slice(rightStart, supportStart)
  : '';
const supportBody = supportStart >= 0 ? screen.slice(supportStart, supportStart + 420) : '';

const geometryPass = (item) => {
  const investigationBottom = Number(item?.investigationRect?.bottom);
  const objectTop = Number(item?.normalObjectFocusRect?.top);
  const objectBottom = Number(item?.normalObjectFocusRect?.bottom);
  const relationTop = Number(item?.tabletRelationRect?.top);
  const relationBottom = Number(item?.tabletRelationRect?.bottom);
  const evidenceTop = Number(item?.evidenceBoundaryRect?.top);
  return Number.isFinite(investigationBottom)
    && Number.isFinite(objectTop)
    && Number.isFinite(objectBottom)
    && Number.isFinite(relationTop)
    && Number.isFinite(relationBottom)
    && Number.isFinite(evidenceTop)
    && objectTop <= investigationBottom + 24
    && relationTop >= objectBottom - 1
    && evidenceTop >= relationBottom - 1;
};

const checks = {
  sourceKeepsRelationOutOfRightColumn: rightBody && !rightBody.includes('relationTablet'),
  sourcePlacesRelationInSteadySupport: supportBody.includes('relationTablet'),
  sourceKeepsEvidenceLedgerInSupport: supportBody.includes('evidenceLedger'),
  freshRuntimeAvailable: report?.pass === true && Boolean(normal768) && Boolean(normal844),
  normal768UsesTaskSpaceWithoutTallRightRailGap: geometryPass(normal768),
  normal844UsesTaskSpaceWithoutTallRightRailGap: geometryPass(normal844),
};

const failures = Object.entries(checks)
  .filter(([, pass]) => !pass)
  .map(([name]) => name);
const result = {
  pass: failures.length === 0,
  contract: 'tablet-normal-space-v2',
  implementationState: failures.length === 0 ? 'focused-green' : 'expected-red',
  checks,
  geometry: {
    normal768: normal768 ? {
      investigationBottom: normal768.investigationRect?.bottom ?? null,
      objectTop: normal768.normalObjectFocusRect?.top ?? null,
      objectBottom: normal768.normalObjectFocusRect?.bottom ?? null,
      relationTop: normal768.tabletRelationRect?.top ?? null,
      relationBottom: normal768.tabletRelationRect?.bottom ?? null,
      evidenceTop: normal768.evidenceBoundaryRect?.top ?? null,
    } : null,
    normal844: normal844 ? {
      investigationBottom: normal844.investigationRect?.bottom ?? null,
      objectTop: normal844.normalObjectFocusRect?.top ?? null,
      objectBottom: normal844.normalObjectFocusRect?.bottom ?? null,
      relationTop: normal844.tabletRelationRect?.top ?? null,
      relationBottom: normal844.tabletRelationRect?.bottom ?? null,
      evidenceTop: normal844.evidenceBoundaryRect?.top ?? null,
    } : null,
  },
  failures,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
process.exitCode = result.pass ? 0 : 1;
