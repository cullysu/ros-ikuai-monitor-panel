#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const reportPath = path.join(root, '_acceptance', 'mobile-native-runtime', 'report.json');
const inspectorPath = path.join(root, 'tools', 'acceptance', 'inspect-overview-mobile.js');
const relationPath = path.join(root, 'src', 'panel-framework', 'mobile', 'MobileTabletRelationRail.tsx');
const proofPath = path.join(root, 'src', 'panel-framework', 'mobile', 'MobileProofStrip.tsx');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function check(name, pass, detail) {
  return { name, pass: Boolean(pass), detail };
}

function findCell(report, scenario, viewport) {
  return (report.browserChecks || []).find((cell) => (
    cell.scaleScenario === scenario && cell.viewport?.name === viewport
  ));
}

function main() {
  const report = readJson(reportPath);
  const inspector = fs.readFileSync(inspectorPath, 'utf8');
  const relation = fs.readFileSync(relationPath, 'utf8');
  const proof = fs.readFileSync(proofPath, 'utf8');
  const normalPhone = findCell(report, 'single', 'p390');
  const normalTablet = findCell(report, 'single', 'tablet');
  const shortLandscape = ['all-offline', 'resource-full', 'interfaces-down']
    .map((scenario) => ({ scenario, cell: findCell(report, scenario, 'l667') }));
  const checks = [
    check('fresh normal phone exposes the current next-decision ordering failure', normalPhone?.mobileOverviewAppHomeGateProbe?.checks?.nextDecision === true, {
      actual: normalPhone?.mobileOverviewAppHomeGateProbe?.checks?.nextDecision,
    }),
    check('fresh tablet keeps exactly three core facts', normalTablet?.mobileOverviewAppHomeGateProbe?.checks?.threeFacts === true, {
      factKeys: normalTablet?.mobileOverviewAppHomeGateProbe?.factKeys || [],
      actual: normalTablet?.mobileOverviewAppHomeGateProbe?.checks?.threeFacts,
    }),
    check('fresh short-landscape incident actions are discoverable', shortLandscape.every(({ cell }) => cell?.mobileOverviewAppHomeGateProbe?.checks?.patrolActions === true), {
      cells: shortLandscape.map(({ scenario, cell }) => ({
        scenario,
        patrolActions: cell?.mobileOverviewAppHomeGateProbe?.checks?.patrolActions,
      })),
    }),
    check('next-decision acceptance uses the verdict/proof order', !/nextDecisionRect\.top\s*>=\s*decisionRect\.bottom/.test(inspector), {
      source: 'tools/acceptance/inspect-overview-mobile.js',
    }),
    check('tablet relation rail has a separate relation fact marker', /data-mobile-relation-fact|factAttribute/.test(relation), {
      source: 'src/panel-framework/mobile/MobileTabletRelationRail.tsx',
    }),
    check('proof strip supports a scoped fact marker without changing core defaults', /factAttribute/.test(proof) && /data-mobile-core-fact/.test(proof), {
      source: 'src/panel-framework/mobile/MobileProofStrip.tsx',
    }),
  ];
  const failures = checks.filter((item) => !item.pass).map((item) => item.name);
  const result = {
    pass: failures.length === 0,
    contract: 'mobile-runtime-contract-v1',
    reportPath,
    checks,
    failures,
    expectedBeforeImplementation: true,
  };
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.pass ? 0 : 1;
}

main();
