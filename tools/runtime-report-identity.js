#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { gitWorktreeIdentity } = require('./worktree-runtime-identity');

function readRuntimeReport(root, relativePath = '_acceptance/panel-runtime-browser/report.json', options = {}) {
  const reportPath = path.join(root, relativePath);
  const expectedSource = options.expectedSource || 'playwright-production-runtime';
  const identity = gitWorktreeIdentity(root);
  if (!fs.existsSync(reportPath)) {
    return { report: null, reportPath, identity, status: 'missing', current: false };
  }
  let report;
  try {
    report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  } catch (error) {
    return { report: null, reportPath, identity, status: 'invalid', current: false, error: String(error?.message || error) };
  }
  const identityMatches = report?.commit === identity.commit
    && report?.worktreeFingerprint === identity.worktreeFingerprint
    && report?.artifactKey === identity.artifactKey;
  const current = identityMatches
    && report?.source === expectedSource
    && report?.pass === true;
  return {
    report,
    reportPath,
    identity,
    status: current ? 'current' : identityMatches ? 'red' : 'stale',
    current,
  };
}

function runtimeIdentityDetail(binding) {
  const { report, identity } = binding;
  return {
    status: binding.status,
    source: report?.source ?? null,
    pass: report?.pass ?? null,
    reportCommit: report?.commit ?? null,
    currentCommit: identity.commit,
    reportArtifactKey: report?.artifactKey ?? null,
    currentArtifactKey: identity.artifactKey,
    fingerprintMatches: report?.worktreeFingerprint === identity.worktreeFingerprint,
  };
}

module.exports = { readRuntimeReport, runtimeIdentityDetail };
