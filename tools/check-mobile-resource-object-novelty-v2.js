#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const inspectorSource = read('src/panel-framework/mobile/mobile-inspector/ResourceInspector.tsx');
const comparisonSource = read('src/panel-framework/mobile/mobile-inspector/resourceComparison.ts');
const presentationSource = read('src/panel-framework/sections/resourceEvidencePresentation.ts');
const runtimePath = path.join(root, '_acceptance/panel-runtime-browser/report.json');
const runtime = fs.existsSync(runtimePath) ? JSON.parse(fs.readFileSync(runtimePath, 'utf8')) : null;
const runtimeCheck = (runtime?.checks || []).find((check) => (
  check.name === '772px resource related comparison reports delta to selected object without replay'
));

const checks = {
  relatedStatusDoesNotReplayRowTrailing: !/status:\s*item\.trailing/.test(inspectorSource),
  relativeComparisonHelperExists: /function\s+resourceRelativeStatus\s*\(/.test(comparisonSource),
  relativeComparisonUsesSelectedAndRelatedLatest: /selectedLatest/.test(comparisonSource) && /relatedLatest/.test(comparisonSource),
  missingComparisonIsExplicit: comparisonSource.includes('相对值不可比较'),
  objectStillOwnsRangeAndEvidenceTime: presentationSource.includes('minimum:') && presentationSource.includes('maximum:') && presentationSource.includes('evidenceAt:'),
  freshRuntimeRelatedComparisonEvidence: runtimeCheck?.pass === true,
};

const failures = Object.entries(checks)
  .filter(([, pass]) => !pass)
  .map(([name]) => name);
const result = {
  pass: failures.length === 0,
  contract: 'mobile-resource-object-novelty-v2',
  implementationState: failures.length === 0 ? 'focused-green' : 'expected-red',
  checks,
  failures,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
process.exitCode = result.pass ? 0 : 1;
