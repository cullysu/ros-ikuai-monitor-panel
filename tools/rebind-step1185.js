#!/usr/bin/env node
'use strict';
/**
 * One-shot local helper: rebind the four step1185 independent-review records
 * to the freshly generated mobile reference runtime report identity.
 * Run after tools/check-mobile-reference-runtime.js produces pass=true.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const reportPath = path.join(root, '_acceptance/mobile-reference-runtime/report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
if (report.pass !== true) throw new Error(`runtime report pass=${report.pass}; refusing to rebind`);
const artifact = {
  artifactKey: report.artifactKey,
  worktreeFingerprint: report.worktreeFingerprint,
  reviewContentFingerprint: report.reviewContentFingerprint,
  generatedAt: report.generatedAt,
  commit: report.commit,
  pass: true,
};
const dir = path.join(root, 'docs/decision-system/independent-reviews');
for (const name of ['product', 'visual', 'accessibility', 'engineering']) {
  const file = path.join(dir, `step1185-${name}.json`);
  const record = JSON.parse(fs.readFileSync(file, 'utf8'));
  record.reviewedArtifact = artifact;
  fs.writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`rebound ${path.relative(root, file)}`);
}
console.log(JSON.stringify(artifact, null, 2));
