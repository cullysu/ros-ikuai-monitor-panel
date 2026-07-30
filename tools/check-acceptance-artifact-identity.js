#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_ROOT = path.join(ROOT, '_acceptance');
const MANIFEST_PATH = path.join(ROOT, 'tools', 'acceptance', 'report-quarantine-policy.json');
const CURRENT_SOURCES = [
  path.join(ROOT, 'docs', 'decision-system', 'current-state.md'),
  path.join(ROOT, 'docs', 'product-loop-current.md'),
  path.join(ROOT, '.product-loop', 'state.json'),
];

function relativeSlash(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join('/');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function globToRegExp(glob) {
  const escaped = glob.replace(/[|\\{}()[\]^$+?.]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function reportFiles() {
  if (!fs.existsSync(REPORT_ROOT)) return [];
  return fs.readdirSync(REPORT_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(REPORT_ROOT, entry.name, 'report.json'))
    .filter((filePath) => fs.existsSync(filePath) && fs.statSync(filePath).isFile());
}

function isAmbiguousDirectory(filePath) {
  const directory = path.basename(path.dirname(filePath));
  return /(^|[-_])(current|worktree|working-tree)([-_]|$)/i.test(directory);
}

function hasHistoricalReferenceMarker(source) {
  return source.includes('historical-artifact') && source.includes('releaseEvidenceEligible=false');
}

function sourceMentionsArtifact(source, artifact) {
  if (source.includes(artifact.relative)) return true;
  const escapedDirectory = artifact.directory
    .replace(/[.*+?^()|[\]\\]/g, '\\$&');
  return new RegExp('(^|[^A-Za-z0-9_-])' + escapedDirectory + '($|[^A-Za-z0-9_-])').test(source);
}

function main() {
  const failures = [];
  const warnings = [];
  const files = reportFiles();
  const ambiguous = files
    .filter(isAmbiguousDirectory)
    .map((filePath) => ({
      filePath,
      relative: relativeSlash(filePath),
      directory: path.basename(path.dirname(filePath)),
    }));

  let manifest = null;
  if (!fs.existsSync(MANIFEST_PATH)) {
    failures.push({ name: 'manifest-missing', detail: relativeSlash(MANIFEST_PATH) });
  } else {
    try {
      manifest = readJson(MANIFEST_PATH);
    } catch (error) {
      failures.push({ name: 'manifest-invalid-json', detail: error.message });
    }
  }

  const policy = manifest?.artifactIdentityPolicy;
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) {
    failures.push({
      name: 'artifact-identity-policy-missing',
      detail: 'tools/acceptance/report-quarantine-policy.json must declare artifactIdentityPolicy before ambiguous reports can be current evidence',
    });
  }

  const rules = Array.isArray(policy?.rules) ? policy.rules : [];
  if (policy && policy.schema !== 'acceptance-artifact-identity-v1') {
    failures.push({ name: 'artifact-identity-policy-schema', detail: policy.schema || null });
  }
  if (policy && policy.status !== 'current') {
    failures.push({ name: 'artifact-identity-policy-status', detail: policy.status || null });
  }
  if (policy && policy.allowAsCurrentReleaseInput !== false) {
    failures.push({ name: 'artifact-identity-policy-default', detail: 'policy default must forbid ambiguous artifacts as current input' });
  }
  if (policy && (!Array.isArray(policy.tokens) || !['current', 'worktree', 'working-tree'].every((token) => policy.tokens.includes(token)))) {
    failures.push({ name: 'artifact-identity-policy-tokens', detail: 'policy must cover current/worktree/working-tree' });
  }
  if (policy && rules.length === 0) {
    failures.push({ name: 'artifact-identity-policy-rules', detail: 'at least one explicit path rule is required' });
  }

  const classifications = [];
  for (const artifact of ambiguous) {
    const matchingRules = rules.filter((rule) => (
      rule && typeof rule.glob === 'string' && globToRegExp(rule.glob).test(artifact.relative)
    ));
    if (matchingRules.length !== 1) {
      failures.push({
        name: 'ambiguous-artifact-rule',
        detail: `${artifact.relative}: expected exactly one identity rule, got ${matchingRules.length}`,
      });
      continue;
    }
    const [rule] = matchingRules;
    if (rule.allowAsCurrentReleaseInput !== false) {
      failures.push({ name: 'ambiguous-artifact-allowed', detail: artifact.relative });
    }
    if (!['historical-artifact', 'worktree-artifact', 'historical-or-worktree-artifact'].includes(rule.classification)) {
      failures.push({ name: 'ambiguous-artifact-classification', detail: `${artifact.relative}: ${rule.classification || '<missing>'}` });
    }
    let report = null;
    try {
      report = readJson(artifact.filePath);
    } catch (error) {
      failures.push({ name: 'ambiguous-artifact-invalid-report', detail: `${artifact.relative}: ${error.message}` });
    }
    const matrix = report && report.matrix && typeof report.matrix === 'object' ? report.matrix : null;
    if (report?.releaseEvidenceEligible === true || matrix?.releaseEvidenceEligible === true) {
      failures.push({ name: 'ambiguous-artifact-claims-current', detail: artifact.relative });
    }
    classifications.push({
      path: artifact.relative,
      directory: artifact.directory,
      classification: rule.classification,
      allowAsCurrentReleaseInput: rule.allowAsCurrentReleaseInput,
      reportReleaseEvidenceEligible: report?.releaseEvidenceEligible ?? matrix?.releaseEvidenceEligible ?? null,
    });
  }

  const currentSourceReferences = [];
  for (const sourcePath of CURRENT_SOURCES) {
    if (!fs.existsSync(sourcePath)) continue;
    const source = fs.readFileSync(sourcePath, 'utf8');
    for (const artifact of ambiguous) {
      const bareDirectory = artifact.directory;
      if (!sourceMentionsArtifact(source, artifact)) continue;
      const allowed = hasHistoricalReferenceMarker(source);
      currentSourceReferences.push({ source: relativeSlash(sourcePath), artifact: artifact.relative, allowed });
      if (!allowed) {
        failures.push({ name: 'ambiguous-artifact-current-reference', detail: { source: relativeSlash(sourcePath), artifact: artifact.relative } });
      }
    }
  }

  const result = {
    pass: failures.length === 0,
    contract: 'acceptance-artifact-identity-v1',
    manifest: relativeSlash(MANIFEST_PATH),
    ambiguousArtifactCount: ambiguous.length,
    classifications,
    currentSourceReferences,
    warnings,
    failures,
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (failures.length) process.exitCode = 1;
}

main();
