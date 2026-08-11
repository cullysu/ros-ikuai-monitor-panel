#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const inspectorSource = read('src/panel-framework/mobile/mobile-inspector/ResourceInspector.tsx');
const presentationSource = read('src/panel-framework/sections/resourceEvidencePresentation.ts');

const checks = {
  objectUsesOneEvidenceDossier: /<InspectorSection title="样本判断"/.test(inspectorSource) && /title="相关资源比较"/.test(inspectorSource) && /title="依赖与来源"/.test(inspectorSource),
  primaryFactsSeparateCurrentThresholdChangeAndContinuity: ["当前样本", "策略阈值", "变化范围", "连续性"].every((label) => inspectorSource.includes(label)),
  siblingMetricsBecomeRelativeEvidenceInsteadOfBareReplay: /<InspectorRelations/.test(inspectorSource) && /resourceComparisonRows\(evidence, relatedRows\)/.test(inspectorSource) && /data-resource-related-comparison/.test(inspectorSource),
  provenanceHasOneExplicitDependencyOwner: inspectorSource.includes('采样来源') && /title="依赖与来源"/.test(inspectorSource) && !/mdi-resource-provenance/.test(inspectorSource),
  evidencePresentationStillOwnsRangeAndContinuityTruth: presentationSource.includes('minimum:') && presentationSource.includes('maximum:') && presentationSource.includes('continuity:'),
};

const failures = Object.entries(checks)
  .filter(([, pass]) => !pass)
  .map(([name]) => name);
const result = {
  pass: failures.length === 0,
  contract: 'mobile-resource-object-decision-ledger-v3',
  implementationState: failures.length === 0 ? 'focused-green' : 'expected-red',
  checks,
  failures,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
process.exitCode = result.pass ? 0 : 1;
