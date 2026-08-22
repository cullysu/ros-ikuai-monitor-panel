#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ARTIFACT_PREFIXES = ['_acceptance/', '.impeccable/'];
const GOVERNANCE_PATHS = [
  '.product-loop/state.json',
  'docs/mobile-reference-baseline.md',
  'docs/panel-redesign-decision-log.md',
  'docs/product-loop-current.md',
];
const GOVERNANCE_PREFIXES = ['docs/decision-system/', 'docs/independent-review/'];
const REVIEW_EXCLUDED_PREFIXES = [
  ...ARTIFACT_PREFIXES,
  ...GOVERNANCE_PREFIXES,
  'tools/',
  'docs/',
  '.github/',
  '.agents/',
  '_design/',
];

function normalizedPath(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.\//, '');
}

function isArtifactPath(value) {
  const name = normalizedPath(value);
  return ARTIFACT_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function isGovernancePath(value) {
  const name = normalizedPath(value);
  return GOVERNANCE_PATHS.includes(name) || GOVERNANCE_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function isReviewContentPath(value) {
  const name = normalizedPath(value);
  return Boolean(name) && !GOVERNANCE_PATHS.includes(name) &&
    !REVIEW_EXCLUDED_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function reviewContentFingerprint(rootDir, untrackedNames = []) {
  const tracked = git(rootDir, ['ls-files', '-z'], { maxBuffer: 32 * 1024 * 1024 });
  const hash = crypto.createHash('sha256');
  hash.update('review-content-v1\0');
  const trackedNames = tracked.status === 0
    ? tracked.stdout.toString('utf8').split('\0').map(normalizedPath).filter(isReviewContentPath).sort()
    : [];
  const names = [...new Set([...trackedNames, ...untrackedNames.filter(isReviewContentPath)])].sort();
  for (const name of names) {
    hash.update(name);
    hash.update('\0');
    const file = path.join(rootDir, ...name.split('/'));
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      hash.update(fs.readFileSync(file));
    } else {
      hash.update('<missing>');
    }
    hash.update('\0');
  }
  if (tracked.status !== 0) hash.update(String(tracked.stderr || 'git ls-files failed'));
  return hash.digest('hex');
}

function matrixArtifactKey({ commit, worktreeClean, worktreeFingerprint }) {
  const safeCommit = String(commit || 'unknown').replace(/[^A-Za-z0-9._-]+/g, '-');
  if (worktreeClean) return safeCommit;
  const safeFingerprint = String(worktreeFingerprint || 'unknown').replace(/[^A-Za-z0-9._-]+/g, '-');
  return `worktree-${safeCommit.slice(0, 12)}-${safeFingerprint.slice(0, 12)}`;
}

function git(rootDir, args, options = {}) {
  return spawnSync('git', args, {
    cwd: rootDir,
    encoding: options.encoding === undefined ? null : options.encoding,
    maxBuffer: options.maxBuffer || 32 * 1024 * 1024,
  });
}

function gitHead(rootDir) {
  const result = git(rootDir, ['rev-parse', 'HEAD'], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  return result.status === 0 ? String(result.stdout || '').trim() : 'unknown';
}

function gitWorktreeIdentity(rootDir) {
  const commit = gitHead(rootDir);
  const fullDiff = git(rootDir, ['diff', '--binary', '--no-ext-diff', 'HEAD', '--', '.']);
  const runtimeDiff = git(rootDir, [
    'diff', '--binary', '--no-ext-diff', 'HEAD', '--', '.',
    ...ARTIFACT_PREFIXES.map((prefix) => `:(exclude)${prefix}**`),
    ...GOVERNANCE_PATHS.map((name) => `:(exclude)${name}`),
    ...GOVERNANCE_PREFIXES.map((prefix) => `:(exclude)${prefix}**`),
  ]);
  const others = git(rootDir, ['ls-files', '--others', '--exclude-standard'], {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });
  const allUntracked = others.status === 0
    ? String(others.stdout || '').split(/\r?\n/).map(normalizedPath).filter((name) => name && !isArtifactPath(name)).sort()
    : [];
  const runtimeUntracked = allUntracked.filter((name) => !isGovernancePath(name));
  const hash = crypto.createHash('sha256');
  hash.update(commit);
  hash.update('\0runtime-tracked\0');
  hash.update(Buffer.isBuffer(runtimeDiff.stdout) ? runtimeDiff.stdout : Buffer.from(String(runtimeDiff.stdout || '')));
  hash.update('\0runtime-untracked\0');
  for (const name of runtimeUntracked) {
    hash.update(name);
    hash.update('\0');
    const file = path.join(rootDir, ...name.split('/'));
    if (fs.existsSync(file) && fs.statSync(file).isFile()) hash.update(fs.readFileSync(file));
    hash.update('\0');
  }
  if (runtimeDiff.status !== 0) hash.update(String(runtimeDiff.stderr || 'git runtime diff failed'));
  if (others.status !== 0) hash.update(String(others.stderr || 'git ls-files failed'));
  const identityError = fullDiff.status === 0 && runtimeDiff.status === 0 && others.status === 0
    ? ''
    : 'git worktree identity could not be read completely';
  const worktreeClean = !identityError && fullDiff.stdout.length === 0 && allUntracked.length === 0;
  const worktreeFingerprint = hash.digest('hex');
  const reviewContent = reviewContentFingerprint(rootDir, runtimeUntracked);
  return {
    commit,
    worktreeClean,
    worktreeFingerprint,
    reviewContentFingerprint: reviewContent,
    artifactKey: matrixArtifactKey({ commit, worktreeClean, worktreeFingerprint }),
    releaseEvidenceEligible: worktreeClean,
    untrackedFiles: allUntracked.length,
    runtimeUntrackedFiles: runtimeUntracked.length,
    identityError,
  };
}

module.exports = {
  gitWorktreeIdentity,
  isGovernancePath,
  isReviewContentPath,
  matrixArtifactKey,
  reviewContentFingerprint,
};
