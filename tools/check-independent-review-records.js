#!/usr/bin/env node
'use strict';

/**
 * Verifies the structured current-step local-independent review records. These
 * records can close a scoped review only; they can never make a release
 * candidate eligible for publication.
 */
const fs = require('node:fs');
const path = require('node:path');
const { readRuntimeReport, runtimeIdentityDetail } = require('./runtime-report-identity');

const ROOT = path.resolve(__dirname, '..');
const REVIEW_DIR = 'docs/decision-system/independent-reviews';
const DEFAULT_RUNTIME_REPORT = '_acceptance/mobile-reference-runtime/report.json';
const DEFAULT_RUNTIME_SOURCE = 'mobile-reference-runtime';
const DEFAULT_RUNTIME_CONTRACT = 'mobile-reference-runtime-v1';
const SUPERSEDED_POCKET_REVIEW_STEP = 932;
const SUPERSEDED_POCKET_RUNTIME_REPORT = '_acceptance/pocket-console-runtime/report.json';
const REVIEW_SPECS = [
  ['product', 'product-information-architecture'],
  ['visual', 'visual-interaction'],
  ['accessibility', 'accessibility-interaction'],
  ['engineering', 'engineering-code-review'],
];

function isSafeRelativePath(value) {
  return typeof value === 'string' && value.length > 0 &&
    !path.isAbsolute(value) && !value.split(/[\\/]+/).includes('..');
}

function evidencePaths(evidence) {
  if (!Array.isArray(evidence)) return [];
  return evidence.map((item) => typeof item === 'string' ? item : item?.path);
}

function artifactKeyFor(runtimeReport) {
  if (typeof runtimeReport?.artifactKey === 'string' && runtimeReport.artifactKey) return runtimeReport.artifactKey;
  const commit = String(runtimeReport?.commit || '');
  const fingerprint = String(runtimeReport?.worktreeFingerprint || '');
  return `worktree-${commit.slice(0, 12)}-${fingerprint.slice(0, 12)}`;
}

function currentDecisionStep(root) {
  const source = fs.readFileSync(path.join(root, 'docs/decision-system/current-state.md'), 'utf8');
  const match = source.match(/^- currentConclusionForStep:\s*`(\d+)`/m);
  return match ? Number(match[1]) : null;
}

function latestCompleteReviewStep(root) {
  const directory = path.join(root, REVIEW_DIR);
  if (!fs.existsSync(directory)) return null;
  const names = new Set(fs.readdirSync(directory));
  const candidates = [...names]
    .map((name) => Number((name.match(/^step(\d+)-product\.json$/) || [])[1]))
    .filter((step) => Number.isInteger(step))
    .filter((step) => REVIEW_SPECS.every(([name]) => names.has(`step${step}-${name}.json`)));
  return candidates.length ? Math.max(...candidates) : null;
}

function readJson(root, relative, failures) {
  const fullPath = path.join(root, relative);
  if (!fs.existsSync(fullPath)) {
    failures.push(`missing ${relative}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (error) {
    failures.push(`invalid JSON in ${relative}: ${error.message}`);
    return null;
  }
}

function inspectIndependentReviewRecords(options = {}) {
  const root = options.root || ROOT;
  const step = options.step ?? latestCompleteReviewStep(root) ?? currentDecisionStep(root) ?? 910;
  const requestedRuntimeReport = options.runtimeReport || null;
  const requestedRuntimeSource = options.runtimeSource || null;
  let runtimeReportPath = requestedRuntimeReport || DEFAULT_RUNTIME_REPORT;
  const failures = [];
  const historicalMissingPaths = [];
  const records = [];
  const currentStep = currentDecisionStep(root);
  const historicalRecord = Number.isInteger(currentStep) && currentStep > step;
  const supersededPocketReview = step === SUPERSEDED_POCKET_REVIEW_STEP;
  if (supersededPocketReview && !historicalRecord) {
    failures.push(`Step${SUPERSEDED_POCKET_REVIEW_STEP} is a superseded Pocket Console review and cannot be evaluated as current product evidence`);
  }
  for (const [name, role] of REVIEW_SPECS) {
    const relativePath = `${REVIEW_DIR}/step${step}-${name}.json`;
    const record = readJson(root, relativePath, failures);
    if (!record) continue;
    records.push({ name, relativePath, record });
    if (record.schema !== 'independent-review/v1') failures.push(`${relativePath} must use schema independent-review/v1`);
    if (record.step !== step) failures.push(`${relativePath} must bind step ${step}`);
    if (record.role !== role) failures.push(`${relativePath} must use role ${role}`);
    if (typeof record.reviewerAgentId !== 'string' || !record.reviewerAgentId.trim()) failures.push(`${relativePath} must declare reviewerAgentId`);
    if (!historicalRecord && record.verdict !== 'pass') failures.push(`${relativePath} verdict must be pass`);
    if (!historicalRecord && (record.p0 !== 0 || record.p1 !== 0)) failures.push(`${relativePath} must record p0=0 and p1=0`);
    if (historicalRecord && !['pass', 'veto'].includes(String(record.verdict || '').toLowerCase())) failures.push(`${relativePath} historical verdict must be pass or veto`);
    if (historicalRecord && (![record.p0, record.p1, record.p2].every((value) => Number.isInteger(value) && value >= 0))) {
      failures.push(`${relativePath} historical severity counts must be non-negative integers`);
    }
    if (record.scope !== 'local-independent-scope') failures.push(`${relativePath} scope must be local-independent-scope`);
    if (record.releaseEligible !== false) failures.push(`${relativePath} releaseEligible must be false`);
    if (historicalRecord && (record.status === 'current' || record.currentEvidence === true)) {
      failures.push(`${relativePath} is superseded by Step${currentStep} and cannot claim current evidence status`);
    }
    if (!historicalRecord && (record.status === 'superseded' || record.superseded === true)) {
      failures.push(`${relativePath} is the current review step and cannot be marked superseded`);
    }

    const paths = evidencePaths(record.evidence);
    if (!paths.length || paths.some((item) => !isSafeRelativePath(item))) {
      failures.push(`${relativePath} must declare non-empty safe relative evidence paths`);
    }
    if (!historicalRecord && !paths.includes(runtimeReportPath)) failures.push(`${relativePath} must cite ${runtimeReportPath}`);
    if (!historicalRecord && paths.some((item) => item === SUPERSEDED_POCKET_RUNTIME_REPORT || item.includes('pocket-console-runtime'))) {
      failures.push(`${relativePath} cannot cite superseded Pocket Console runtime evidence as current product evidence`);
    }

    const artifact = record.reviewedArtifact;
    if (!artifact || typeof artifact !== 'object') {
      failures.push(`${relativePath} must declare reviewedArtifact`);
    } else {
      const requiredArtifactKeys = historicalRecord
        ? ['artifactKey', 'worktreeFingerprint', 'generatedAt', 'commit']
        : ['artifactKey', 'worktreeFingerprint', 'reviewContentFingerprint', 'generatedAt', 'commit'];
      for (const key of requiredArtifactKeys) {
        if (typeof artifact[key] !== 'string' || !artifact[key]) failures.push(`${relativePath} reviewedArtifact.${key} must be a non-empty string`);
      }
      if (artifact.pass !== true) failures.push(`${relativePath} reviewedArtifact.pass must be true`);
    }
  }

  if (records.length === REVIEW_SPECS.length) {
    const reviewerIds = records.map(({ record }) => record.reviewerAgentId);
    if (new Set(reviewerIds).size !== REVIEW_SPECS.length) failures.push(`Step${step} reviewerAgentId values must be four distinct agents`);
    const artifactKeys = ['artifactKey', 'worktreeFingerprint', 'reviewContentFingerprint', 'generatedAt', 'commit', 'pass'];
    for (const key of artifactKeys) {
      const values = records.map(({ record }) => record.reviewedArtifact?.[key]);
      if (values.some((value) => value !== values[0])) failures.push(`Step${step} reviewedArtifact.${key} must match across all four records`);
    }
  }

  if (historicalRecord && !requestedRuntimeReport) {
    const citedHistoricalRuntime = records
      .flatMap(({ record }) => evidencePaths(record.evidence))
      .find((item) => typeof item === 'string' && /(?:pocket-console|optical-patrol|incident-lens|mobile-telemetry|mobile-reference)-runtime\/report\.json$/.test(item));
    if (citedHistoricalRuntime) runtimeReportPath = citedHistoricalRuntime;
  }
  const historicalPocketRuntime = historicalRecord && runtimeReportPath === SUPERSEDED_POCKET_RUNTIME_REPORT;
  const runtimeSource = requestedRuntimeSource || (historicalPocketRuntime ? 'pocket-console-runtime' : DEFAULT_RUNTIME_SOURCE);
  const runtimeBinding = readRuntimeReport(root, runtimeReportPath, { expectedSource: runtimeSource });
  const runtimeReportExists = runtimeBinding.status !== 'missing';
  if (!historicalRecord && !runtimeReportExists) failures.push(`missing current mobile reference runtime report: ${runtimeReportPath}`);
  let runtimeReportMatchesReviewedArtifact = false;
  if (runtimeReportExists) {
    const runtimeReport = readJson(root, runtimeReportPath, failures);
    if (runtimeReport) {
      const reviewedRuntimePass = runtimeReport.pass;
      if (!historicalRecord && reviewedRuntimePass !== true) failures.push(`${runtimeReportPath} pass must be true`);
      if (!historicalRecord && runtimeReport.contract !== DEFAULT_RUNTIME_CONTRACT) {
        failures.push(`${runtimeReportPath} must use ${DEFAULT_RUNTIME_CONTRACT}`);
      }
      if (runtimeReport.releaseEvidenceEligible !== false) failures.push(`${runtimeReportPath} must remain ineligible for release evidence`);
      const reviewedArtifact = records[0]?.record?.reviewedArtifact || {};
      runtimeReportMatchesReviewedArtifact =
        reviewedArtifact.reviewContentFingerprint === runtimeReport.reviewContentFingerprint &&
        reviewedArtifact.pass === reviewedRuntimePass;
      if (!historicalRecord && records.length === REVIEW_SPECS.length && !runtimeReportMatchesReviewedArtifact) {
        failures.push(`current Step${step} reviewedArtifact must match the reviewed product-content fingerprint in ${runtimeReportPath}`);
      }
      for (const { relativePath, record } of records) {
        const artifact = record.reviewedArtifact || {};
        if (runtimeReportMatchesReviewedArtifact && artifact.reviewContentFingerprint !== runtimeReport.reviewContentFingerprint) {
          failures.push(`${relativePath} reviewedArtifact.reviewContentFingerprint must match ${runtimeReportPath}`);
        }
        if (runtimeReportMatchesReviewedArtifact && artifact.pass !== reviewedRuntimePass) {
          failures.push(`${relativePath} reviewedArtifact.pass must match ${runtimeReportPath} ${historicalRecord ? 'pass' : 'runtimePass'}`);
        }
        for (const evidencePath of evidencePaths(record.evidence)) {
          if (isSafeRelativePath(evidencePath) && !fs.existsSync(path.join(root, evidencePath))) {
            const detail = { record: relativePath, path: evidencePath };
            if (historicalRecord && record.reviewedArtifact && typeof record.reviewedArtifact.artifactKey === 'string') {
              historicalMissingPaths.push(detail);
            } else {
              failures.push(`${relativePath} evidence path is missing locally: ${evidencePath}`);
            }
          }
        }
      }
    }
  }

  return {
    pass: failures.length === 0,
    contract: 'independent-review-records-v1',
    step,
    currentStep,
    historicalRecord,
    reviewStatus: historicalRecord ? 'superseded/historical' : 'current',
    currentEvidence: !historicalRecord && runtimeReportMatchesReviewedArtifact,
    historicalEvidenceOnly: historicalRecord,
    supersededPocketReview,
    scope: 'local-independent-scope',
    releaseEligible: false,
    runtimeReportExists,
    runtimeReport: runtimeReportPath,
    runtimeEvidence: runtimeIdentityDetail(runtimeBinding),
    runtimeReportMatchesReviewedArtifact,
    historicalMissingPaths,
    records: records.map(({ name, relativePath, record }) => ({
      name,
      path: relativePath,
      reviewerAgentId: record.reviewerAgentId,
      role: record.role,
      status: historicalRecord ? 'superseded' : 'current',
    })),
    failures,
  };
}

function assertIndependentReviewRecords(options) {
  const result = inspectIndependentReviewRecords(options);
  if (!result.pass) {
    throw new Error(`independent review records contract failed:\n${result.failures.map((failure) => `- ${failure}`).join('\n')}`);
  }
  return result;
}

if (require.main === module) {
  const result = inspectIndependentReviewRecords();
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.pass ? 0 : 1;
}

module.exports = { inspectIndependentReviewRecords, assertIndependentReviewRecords };
