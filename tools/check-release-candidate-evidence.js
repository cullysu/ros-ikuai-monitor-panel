#!/usr/bin/env node
'use strict';

/** Fail-closed release evidence gate. All mutable external inputs are frozen once. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { isDeepStrictEqual } = require('node:util');
const { TextDecoder } = require('node:util');
const { readBoundedFileSnapshotSync } = require('./lib/bounded-file-snapshot');
const { gitWorktreeIdentity } = require('./worktree-runtime-identity');

const ROOT = path.resolve(__dirname, '..');
const REQUIRED_ROLES = ['product-information-architecture', 'visual-interaction', 'accessibility-interaction', 'engineering-code-review', 'route-owner'];
const REQUIRED_CHANNELS = ['health', 'snapshot'];
const DEFAULT_MIN_SOAK_SECONDS = 300;
const DEFAULT_MIN_SOAK_SAMPLES = 10;
const DEFAULT_ROUTE_VERIFIER_TIMEOUT_MS = 30_000;
const DEFAULT_SOAK_VERIFIER_TIMEOUT_MS = 30_000;
const LOW_LOAD_CHILD_TIMEOUT_MS = 180_000;
const MAX_LOW_LOAD_CHILD_TIMEOUT_MS = 600_000;
const LOW_LOAD_TIMEOUT_OWNER = 'run-low-load/v1';
const MAX_REVIEW_RECORD_BYTES = 1024 * 1024;
const MAX_EVIDENCE_BUNDLE_BYTES = 64 * 1024 * 1024;
const MAX_EVIDENCE_BUNDLE_FILE_BYTES = 4 * 1024 * 1024;
const MAX_SOAK_REPORT_BYTES = MAX_EVIDENCE_BUNDLE_FILE_BYTES;
const MAX_EVIDENCE_BUNDLE_FILES = 256;
const MAX_EVIDENCE_BUNDLE_DIRECTORIES = 64;
const MAX_EVIDENCE_BUNDLE_ENTRIES = 320;
const MAX_EVIDENCE_BUNDLE_DEPTH = 16;
const ROUTE_MANIFEST_FILE = 'route-manifest.json';
let verifiedTimeoutOwnerSignature = null;

function isPlainObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function isCandidateCommit(value) { return typeof value === 'string' && /^[0-9a-f]{40}$/.test(value); }
function isSafeRelativePath(value) { return typeof value === 'string' && value.length > 0 && !path.isAbsolute(value) && !value.split(/[\\/]+/).includes('..'); }
function isPathInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}
function hasManagedTimeoutOwnerDescriptor(environment = process.env) {
  const ownerPid = Number(environment?.CODEX_LOW_LOAD_OWNER_PID);
  const jobName = environment?.CODEX_LOW_LOAD_JOB_NAME;
  const prefix = `Local\\CodexLowLoad-${ownerPid}-`;
  return environment?.CODEX_LOW_LOAD_MANAGED === '1' &&
    environment?.CODEX_LOW_LOAD_TIMEOUT_OWNER === LOW_LOAD_TIMEOUT_OWNER &&
    Number.isSafeInteger(ownerPid) && ownerPid > 0 &&
    typeof jobName === 'string' && jobName.startsWith(prefix) &&
    /^[0-9a-f]{32}$/.test(jobName.slice(prefix.length));
}
function verifyManagedTimeoutOwner(environment = process.env) {
  if (process.platform !== 'win32' || !hasManagedTimeoutOwnerDescriptor(environment)) return false;
  const signature = `${environment.CODEX_LOW_LOAD_JOB_NAME}:${environment.CODEX_LOW_LOAD_OWNER_PID}:${process.pid}:${process.ppid}`;
  if (verifiedTimeoutOwnerSignature === signature) return true;
  const result = spawnSync('py', [
    '-3',
    path.join(__dirname, 'run-low-load.py'),
    '--verify-timeout-owner',
    environment.CODEX_LOW_LOAD_JOB_NAME,
    String(process.pid),
    environment.CODEX_LOW_LOAD_OWNER_PID,
  ], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 30_000,
    maxBuffer: 64 * 1024,
    windowsHide: true,
    env: { ...process.env, CODEX_MEMORY_LIMIT_MB: '2048' },
  });
  if (!result.error && result.status === 0) verifiedTimeoutOwnerSignature = signature;
  return verifiedTimeoutOwnerSignature === signature;
}
function managedChildTimeoutMs(timeoutMs, environment = process.env, ownerVerifier = verifyManagedTimeoutOwner) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) throw new RangeError('child timeout must be a positive safe integer');
  if (hasManagedTimeoutOwnerDescriptor(environment) && ownerVerifier(environment) === true) return undefined;
  return environment?.CODEX_LOW_LOAD_MANAGED === '1'
    ? Math.min(MAX_LOW_LOAD_CHILD_TIMEOUT_MS, Math.max(LOW_LOAD_CHILD_TIMEOUT_MS, timeoutMs))
    : timeoutMs;
}
function sha256Digest(bytes) { return `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`; }
function inspectEvidenceBundleSize(reviewBytes, soakBytes) {
  const values = [reviewBytes, soakBytes];
  if (values.some((value) => !Number.isSafeInteger(value) || value < 0)) {
    return { pass: false, failures: ['evidence_bundle_size_invalid'], totalBytes: null };
  }
  const totalBytes = reviewBytes + soakBytes;
  if (!Number.isSafeInteger(totalBytes)) return { pass: false, failures: ['evidence_bundle_size_invalid'], totalBytes: null };
  return {
    pass: totalBytes <= MAX_EVIDENCE_BUNDLE_BYTES,
    failures: totalBytes <= MAX_EVIDENCE_BUNDLE_BYTES ? [] : ['evidence_bundle_size_exceeded'],
    totalBytes,
  };
}
function reviewEvidenceReadLimit(totalBytes) {
  const budget = inspectEvidenceBundleSize(totalBytes, 0);
  if (!budget.pass) throw new Error(budget.failures[0]);
  return Math.min(MAX_EVIDENCE_BUNDLE_FILE_BYTES, MAX_EVIDENCE_BUNDLE_BYTES - totalBytes);
}
function reviewSnapshotByteLength(review) {
  if (!Array.isArray(review?.files)) return Number.NaN;
  return review.files.reduce((total, file) => total + Number(file?.bytes?.length), 0);
}
function nativeIdentityPart(value) {
  if (typeof value === 'bigint') return value === 0n ? null : value.toString();
  return typeof value === 'number' && Number.isFinite(value) && value !== 0 ? String(value) : null;
}
function nativeFileIdentity(metadata) {
  const device = nativeIdentityPart(metadata?.dev);
  const inode = nativeIdentityPart(metadata?.ino);
  return device && inode ? `${device}:${inode}` : null;
}
function assertFrozenExternalFile(fullPath, realPathBefore, frozen) {
  const pathStat = fs.lstatSync(fullPath);
  if (pathStat.isSymbolicLink() || !pathStat.isFile()) throw new Error('evidence_bundle_file_changed');
  const realPathAfter = fs.realpathSync(fullPath);
  if (realPathBefore !== realPathAfter) throw new Error('evidence_bundle_file_realpath_changed');
  const frozenIdentity = nativeFileIdentity(frozen?.metadata);
  const pathIdentity = nativeFileIdentity(pathStat);
  if (!frozenIdentity || !pathIdentity) throw new Error('evidence_bundle_file_identity_unavailable');
  if (frozenIdentity !== pathIdentity) throw new Error('evidence_bundle_file_identity_changed');
  const frozenMetadata = frozen?.metadata;
  if (![frozenMetadata?.size, frozenMetadata?.mtimeMs, frozenMetadata?.ctimeMs].every(Number.isFinite)) {
    throw new Error('evidence_bundle_file_metadata_unavailable');
  }
  if (pathStat.size !== frozenMetadata.size || pathStat.mtimeMs !== frozenMetadata.mtimeMs || pathStat.ctimeMs !== frozenMetadata.ctimeMs) {
    throw new Error('evidence_bundle_file_metadata_changed');
  }
  return realPathAfter;
}
function assertFrozenReviewFile(directory, fullPath, realPathBefore, frozen) {
  const currentRealPath = fs.realpathSync(fullPath);
  if (!isPathInside(directory, fullPath) || !isPathInside(directory, currentRealPath)) throw new Error('evidence_bundle_path_escape');
  return assertFrozenExternalFile(fullPath, realPathBefore, frozen);
}
function decodeUtf8Fatal(bytes, label) {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) throw new Error(`${label}_bom_forbidden`);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new Error(`${label}_invalid_utf8`); }
}

function runGit(root, args, options = {}) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', timeout: managedChildTimeoutMs(30_000), maxBuffer: 4 * 1024 * 1024, windowsHide: true, ...options });
  if (result.error || result.status !== 0) throw new Error(`git_${args[0].replaceAll('-', '_')}_failed`);
  return result;
}

function withIsolatedCandidateWorktree(root, candidateCommit, operation) {
  if (!isCandidateCommit(candidateCommit)) throw new Error('candidate_commit_invalid');
  runGit(root, ['cat-file', '-e', `${candidateCommit}^{commit}`]);
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'release-candidate-evidence-'));
  let attached = false;
  try {
    runGit(root, ['worktree', 'add', '--detach', temporary, candidateCommit]);
    attached = true;
    // Normalize only non-ignored residue. Do not use -x: the linked worktree's
    // .git control file is intentionally untracked and must remain present.
    runGit(temporary, ['reset', '--hard', '--quiet', candidateCommit]);
    return operation(temporary);
  } finally {
    if (attached) spawnSync('git', ['worktree', 'remove', '--force', temporary], { cwd: root, encoding: 'utf8', timeout: managedChildTimeoutMs(30_000), windowsHide: true });
    fs.rmSync(temporary, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 });
  }
}

function inspectCandidateCommit(candidateCommit) {
  return isCandidateCommit(candidateCommit) ? { pass: true, failures: [] } : { pass: false, failures: ['candidate_commit_invalid'] };
}

function evidencePaths(evidence) {
  if (!Array.isArray(evidence)) return null;
  const paths = evidence.map((entry) => typeof entry === 'string' ? entry : entry?.path);
  return paths.every(isSafeRelativePath) ? paths : null;
}

function operationalRouteClaims(routeManifest) {
  if (!isPlainObject(routeManifest) || !Array.isArray(routeManifest.routes)) return null;
  const claims = routeManifest.routes.filter((entry) => entry?.kind === 'module');
  if (!claims.length || claims.some((entry) => typeof entry.route !== 'string' || !entry.route || !['bounded-readonly', 'complete'].includes(entry.declaredMaturity))) return null;
  if (new Set(claims.map((entry) => entry.route)).size !== claims.length) return null;
  return claims;
}

function inspectRouteOwnerRecord(record, routeClaims, fail) {
  const entries = record.routeAcceptance;
  if (!Array.isArray(entries) || entries.length !== routeClaims.length) { fail('route_owner_coverage_invalid'); return; }
  const expected = new Map(routeClaims.map((entry) => [entry.route, entry.declaredMaturity]));
  const seen = new Set();
  const recordEvidence = new Set(evidencePaths(record.evidence) || []);
  for (const entry of entries) {
    if (!isPlainObject(entry) || Object.keys(entry).some((key) => !['route', 'declaredMaturity', 'result', 'evidence'].includes(key))) { fail('route_owner_entry_invalid'); continue; }
    if (!expected.has(entry.route) || seen.has(entry.route)) fail('route_owner_coverage_invalid');
    seen.add(entry.route);
    if (entry.result !== 'pass' || entry.declaredMaturity !== expected.get(entry.route)) fail('route_owner_claim_invalid');
    if (!isSafeRelativePath(entry.evidence) || !recordEvidence.has(entry.evidence)) fail('route_owner_evidence_invalid');
  }
  if (seen.size !== expected.size || [...expected.keys()].some((route) => !seen.has(route))) fail('route_owner_coverage_invalid');
}

function inspectAssistiveTechnologyRecord(record, routeClaims, fail) {
  const tests = record.assistiveTechnologyTests;
  if (!Array.isArray(tests) || tests.length === 0) { fail('assistive_technology_tests_missing'); return; }
  const expected = new Set(routeClaims.map((entry) => entry.route));
  const covered = new Set();
  const recordEvidence = new Set(evidencePaths(record.evidence) || []);
  const allowedInteractionModes = new Set(['keyboard', 'screen-reader', 'spoken-announcement', 'touch-exploration', 'switch-control']);
  for (const test of tests) {
    const allowedFields = ['schema', 'sessionId', 'startedAt', 'endedAt', 'operatingSystem', 'operatingSystemVersion', 'assistiveTechnology', 'assistiveTechnologyVersion', 'browserOrHost', 'browserOrHostVersion', 'deviceContext', 'interactionModes', 'protocol', 'result', 'routeResults', 'evidence'];
    if (!isPlainObject(test) || Object.keys(test).some((key) => !allowedFields.includes(key))) { fail('assistive_technology_test_invalid'); continue; }
    const requiredText = ['operatingSystem', 'operatingSystemVersion', 'assistiveTechnology', 'assistiveTechnologyVersion', 'browserOrHost', 'browserOrHostVersion', 'deviceContext', 'protocol'];
    const versionFields = ['operatingSystemVersion', 'assistiveTechnologyVersion', 'browserOrHostVersion'];
    const timestampsValid = [test.startedAt, test.endedAt].every((value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) && Number.isFinite(Date.parse(value))) && Date.parse(test.endedAt) > Date.parse(test.startedAt);
    if (test.schema !== 'assistive-technology-session/v1' || typeof test.sessionId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(test.sessionId) || !timestampsValid || requiredText.some((field) => typeof test[field] !== 'string' || test[field].trim().length < 3) || versionFields.some((field) => !/\d/.test(test[field]) || /^(?:current|latest|unknown|unspecified)$/i.test(test[field].trim())) || test.protocol !== 'manual-assistive-technology-route-review/v1' || test.result !== 'pass') fail('assistive_technology_test_invalid');
    if (!Array.isArray(test.interactionModes) || test.interactionModes.length === 0 || new Set(test.interactionModes).size !== test.interactionModes.length || test.interactionModes.some((mode) => !allowedInteractionModes.has(mode))) fail('assistive_technology_test_invalid');
    if (!isSafeRelativePath(test.evidence) || !recordEvidence.has(test.evidence)) fail('assistive_technology_evidence_invalid');
    if (!Array.isArray(test.routeResults) || test.routeResults.length === 0) { fail('assistive_technology_route_coverage_invalid'); continue; }
    const sessionRoutes = new Set();
    for (const routeResult of test.routeResults) {
      if (!isPlainObject(routeResult) || Object.keys(routeResult).some((key) => !['route', 'result', 'evidence'].includes(key)) || routeResult.result !== 'pass' || typeof routeResult.route !== 'string' || !expected.has(routeResult.route) || sessionRoutes.has(routeResult.route)) {
        fail('assistive_technology_route_coverage_invalid');
        continue;
      }
      sessionRoutes.add(routeResult.route);
      covered.add(routeResult.route);
      if (!isSafeRelativePath(routeResult.evidence) || !recordEvidence.has(routeResult.evidence)) fail('assistive_technology_evidence_invalid');
    }
  }
  if (covered.size !== expected.size || [...expected].some((route) => !covered.has(route))) fail('assistive_technology_route_coverage_invalid');
}

function inspectIndependentReviewRecords(records, candidateCommit, candidateRuntimeIdentity, routeManifest) {
  const failures = [];
  const fail = (code) => { if (!failures.includes(code)) failures.push(code); };
  if (!Array.isArray(records) || records.length !== REQUIRED_ROLES.length) return { pass: false, failures: ['independent_review_count_invalid'] };
  if (!isPlainObject(candidateRuntimeIdentity) ||
    candidateRuntimeIdentity.commit !== candidateCommit ||
    candidateRuntimeIdentity.worktreeClean !== true ||
    candidateRuntimeIdentity.releaseEvidenceEligible !== true ||
    typeof candidateRuntimeIdentity.artifactKey !== 'string' || !candidateRuntimeIdentity.artifactKey ||
    typeof candidateRuntimeIdentity.worktreeFingerprint !== 'string' || !candidateRuntimeIdentity.worktreeFingerprint) {
    return { pass: false, failures: ['candidate_runtime_identity_invalid'] };
  }
  const reviewerIds = [];
  const roles = [];
  const routeClaims = operationalRouteClaims(routeManifest);
  if (!routeClaims) fail('route_manifest_claims_invalid');
  let firstArtifact = null;
  for (const record of records) {
    if (!isPlainObject(record)) { fail('independent_review_record_invalid'); continue; }
    if (record.schema !== 'independent-review/v1') fail('independent_review_schema_invalid');
    roles.push(record.role);
    if (typeof record.reviewerAgentId !== 'string' || !record.reviewerAgentId.trim()) fail('independent_review_reviewer_invalid'); else reviewerIds.push(record.reviewerAgentId);
    if (record.verdict !== 'pass') fail('independent_review_verdict_not_pass');
    if (record.p0 !== 0 || record.p1 !== 0) fail('independent_review_severity_not_clear');
    if (record.scope !== 'external-release-scope') fail('independent_review_scope_invalid');
    if (record.releaseEligible !== true) fail('independent_review_release_ineligible');
    if (!evidencePaths(record.evidence)?.length) fail('independent_review_evidence_paths_invalid');
    const artifact = record.reviewedArtifact;
    if (!isPlainObject(artifact) || typeof artifact.artifactKey !== 'string' || !artifact.artifactKey || typeof artifact.fingerprint !== 'string' || !artifact.fingerprint || typeof artifact.generatedAt !== 'string' || !artifact.generatedAt || artifact.pass !== true) {
      fail('independent_review_artifact_identity_invalid');
      continue;
    }
    if (artifact.commit !== candidateCommit) fail('independent_review_commit_mismatch');
    if (artifact.artifactKey !== candidateRuntimeIdentity.artifactKey) fail('independent_review_artifact_key_mismatch');
    if (artifact.fingerprint !== candidateRuntimeIdentity.worktreeFingerprint) fail('independent_review_fingerprint_mismatch');
    if (firstArtifact === null) firstArtifact = artifact; else if (!isDeepStrictEqual(artifact, firstArtifact)) fail('independent_review_artifact_identity_mismatch');
    if (routeClaims && record.role === 'route-owner') inspectRouteOwnerRecord(record, routeClaims, fail);
    if (routeClaims && record.role === 'accessibility-interaction') inspectAssistiveTechnologyRecord(record, routeClaims, fail);
  }
  if (roles.length !== REQUIRED_ROLES.length || new Set(roles).size !== REQUIRED_ROLES.length || REQUIRED_ROLES.some((role) => !roles.includes(role))) fail('independent_review_roles_invalid');
  if (reviewerIds.length !== REQUIRED_ROLES.length || new Set(reviewerIds).size !== REQUIRED_ROLES.length) fail('independent_review_reviewers_not_unique');
  return { pass: failures.length === 0, failures };
}

function inspectSoakReport(report, candidateCommit, minSoakSeconds = DEFAULT_MIN_SOAK_SECONDS, minSoakSamples = DEFAULT_MIN_SOAK_SAMPLES) {
  const failures = [];
  const fail = (code) => { if (!failures.includes(code)) failures.push(code); };
  if (!Number.isFinite(minSoakSeconds) || minSoakSeconds <= 0) fail('minimum_soak_seconds_invalid');
  if (!Number.isSafeInteger(minSoakSamples) || minSoakSamples <= 0) fail('minimum_soak_samples_invalid');
  if (!isPlainObject(report)) return { pass: false, failures: [...failures, 'soak_report_invalid'] };
  if (report.schema !== 'routeros-readonly-soak/v2') fail('soak_schema_invalid');
  if (report.outcome !== 'pass') fail('soak_outcome_not_pass');
  if (report.interrupted !== false) fail('soak_interrupted');
  if (Object.hasOwn(report, 'internalOutcome')) fail('soak_internal_failure_present');
  if (report.expectedCommit !== candidateCommit) fail('soak_expected_commit_mismatch');
  for (const field of ['durationSeconds', 'elapsedSeconds']) if (!Number.isFinite(report[field]) || report[field] < minSoakSeconds) fail('soak_duration_below_minimum');
  if (!Array.isArray(report.samples) || report.samples.length < minSoakSamples) return { pass: false, failures: [...failures, 'soak_samples_below_minimum'] };
  for (const sample of report.samples) {
    if (!isPlainObject(sample) || sample.outcome !== 'ok') { fail('soak_sample_not_ok'); continue; }
    if (!Array.isArray(sample.channels)) { fail('soak_sample_channels_invalid'); continue; }
    const names = sample.channels.map((channel) => isPlainObject(channel) ? channel.channel : null);
    if (sample.channels.length !== REQUIRED_CHANNELS.length || new Set(names).size !== REQUIRED_CHANNELS.length || REQUIRED_CHANNELS.some((channel) => !names.includes(channel))) fail('soak_required_channels_missing');
    for (const channel of sample.channels) if (!isPlainObject(channel) || !REQUIRED_CHANNELS.includes(channel.channel) || channel.outcome !== 'ok' || channel.freshness !== 'fresh' || channel.failureState !== 'clear' || channel.commitCheck !== 'match' || channel.buildCommit !== candidateCommit) fail('soak_channel_record_invalid');
  }
  return { pass: failures.length === 0, failures };
}

function readExternalFileSnapshot(workspaceRoot, filePath, label, maxBytes) {
  if (!filePath || !path.isAbsolute(filePath)) return { ok: false, reason: `${label}_must_be_absolute` };
  try {
    const workspaceRealPath = fs.realpathSync(workspaceRoot);
    const resolved = path.resolve(filePath);
    const realBefore = fs.realpathSync(resolved);
    if (isPathInside(workspaceRealPath, resolved) || isPathInside(workspaceRealPath, realBefore)) return { ok: false, reason: `${label}_must_be_external` };
    const frozen = readBoundedFileSnapshotSync(resolved, { maxBytes, decodeUtf8: true });
    const realAfter = assertFrozenExternalFile(resolved, realBefore, frozen);
    if (isPathInside(workspaceRealPath, resolved) || isPathInside(workspaceRealPath, realAfter)) return { ok: false, reason: `${label}_must_be_external` };
    return { ok: true, path: realAfter, bytes: Buffer.from(frozen.bytes), text: frozen.text, digest: frozen.digest };
  } catch (error) {
    if (error?.code === 'ERR_BOUNDED_FILE_SNAPSHOT_TOO_LARGE') return { ok: false, reason: `${label}_too_large` };
    if (['ERR_BOUNDED_FILE_SNAPSHOT_NOT_REGULAR', 'ERR_BOUNDED_FILE_SNAPSHOT_SYMLINK'].includes(error?.code)) return { ok: false, reason: `${label}_must_be_regular_file` };
    if (String(error?.code || '').startsWith('ERR_BOUNDED_FILE_SNAPSHOT_')) return { ok: false, reason: `${label}_changed_or_invalid` };
    if (String(error?.message || '').startsWith('evidence_bundle_file_')) return { ok: false, reason: `${label}_changed_or_invalid` };
    return { ok: false, reason: `${label}_unreadable` };
  }
}

function snapshotExternalReviewDirectory(workspaceRoot, directoryPath) {
  if (!directoryPath || !path.isAbsolute(directoryPath)) return { ok: false, reason: 'independent_review_dir_must_be_absolute' };
  try {
    const workspaceRealPath = fs.realpathSync(workspaceRoot);
    const resolved = path.resolve(directoryPath);
    const stat = fs.lstatSync(resolved);
    if (!stat.isDirectory() || stat.isSymbolicLink()) return { ok: false, reason: 'independent_review_dir_must_be_directory' };
    const directory = fs.realpathSync(resolved);
    if (isPathInside(workspaceRealPath, resolved) || isPathInside(workspaceRealPath, directory)) return { ok: false, reason: 'independent_review_dir_must_be_external' };
    const collect = () => {
      const entries = [];
      const pending = [{ current: directory, depth: 0 }];
      let directoryCount = 0;
      let entryCount = 0;
      while (pending.length > 0) {
        const { current, depth } = pending.pop();
        if (depth > MAX_EVIDENCE_BUNDLE_DEPTH) throw new Error('evidence_bundle_depth_exceeded');
        directoryCount += 1;
        if (directoryCount > MAX_EVIDENCE_BUNDLE_DIRECTORIES) throw new Error('evidence_bundle_directory_count_exceeded');
        const currentStat = fs.lstatSync(current);
        const currentRealPath = fs.realpathSync(current);
        if (currentStat.isSymbolicLink() || !currentStat.isDirectory()) throw new Error('evidence_bundle_directory_changed');
        if (!isPathInside(directory, current) || !isPathInside(directory, currentRealPath)) throw new Error('evidence_bundle_path_escape');

        const children = [];
        const handle = fs.opendirSync(current);
        try {
          for (let entry = handle.readSync(); entry !== null; entry = handle.readSync()) {
            entryCount += 1;
            if (entryCount > MAX_EVIDENCE_BUNDLE_ENTRIES) throw new Error('evidence_bundle_entry_count_exceeded');
            children.push(entry);
          }
        } finally {
          handle.closeSync();
        }
        children.sort((a, b) => a.name.localeCompare(b.name, 'en'));
        const childDirectories = [];
        for (const entry of children) {
          const fullPath = path.join(current, entry.name);
          const entryStat = fs.lstatSync(fullPath);
          if (entryStat.isSymbolicLink()) throw new Error('evidence_bundle_symlink_forbidden');
          if (entryStat.isDirectory()) { childDirectories.push({ current: fullPath, depth: depth + 1 }); continue; }
          if (!entryStat.isFile()) throw new Error('evidence_bundle_special_file_forbidden');
          entries.push(path.relative(directory, fullPath).split(path.sep).join('/'));
          if (entries.length > MAX_EVIDENCE_BUNDLE_FILES) throw new Error('evidence_bundle_file_count_exceeded');
        }
        for (let index = childDirectories.length - 1; index >= 0; index -= 1) pending.push(childDirectories[index]);
      }
      return entries.sort((a, b) => a.localeCompare(b, 'en'));
    };
    const before = collect();
    const files = [];
    const frozenFiles = [];
    let totalBytes = 0;
    for (const relativePath of before) {
      const fullPath = path.join(directory, ...relativePath.split('/'));
      const realPathBefore = fs.realpathSync(fullPath);
      if (!isPathInside(directory, fullPath) || !isPathInside(directory, realPathBefore)) throw new Error('evidence_bundle_path_escape');
      const readLimit = reviewEvidenceReadLimit(totalBytes);
      let frozen;
      try {
        frozen = readBoundedFileSnapshotSync(fullPath, { maxBytes: readLimit, decodeUtf8: false });
      } catch (error) {
        if (error?.code === 'ERR_BOUNDED_FILE_SNAPSHOT_TOO_LARGE' && readLimit < MAX_EVIDENCE_BUNDLE_FILE_BYTES) {
          throw new Error('evidence_bundle_size_exceeded');
        }
        throw error;
      }
      assertFrozenReviewFile(directory, fullPath, realPathBefore, frozen);
      const bytes = Buffer.from(frozen.bytes);
      totalBytes += bytes.length;
      if (totalBytes > MAX_EVIDENCE_BUNDLE_BYTES) throw new Error('evidence_bundle_size_exceeded');
      files.push({ relativePath, bytes });
      frozenFiles.push({ relativePath, realPathBefore, metadata: frozen.metadata });
    }
    if (!isDeepStrictEqual(before, collect())) throw new Error('evidence_bundle_changed_while_reading');
    for (const frozenFile of frozenFiles) {
      const fullPath = path.join(directory, ...frozenFile.relativePath.split('/'));
      assertFrozenReviewFile(directory, fullPath, frozenFile.realPathBefore, { metadata: frozenFile.metadata });
    }
    return { ok: true, directory, files: files.sort((a, b) => a.relativePath.localeCompare(b.relativePath, 'en')) };
  } catch (error) {
    if (error?.code === 'ERR_BOUNDED_FILE_SNAPSHOT_TOO_LARGE') return { ok: false, reason: 'evidence_bundle_file_too_large' };
    if (String(error?.code || '').startsWith('ERR_BOUNDED_FILE_SNAPSHOT_')) return { ok: false, reason: 'evidence_bundle_file_changed' };
    const reason = String(error?.message || '');
    if (/^evidence_bundle_[a-z0-9_]+$/.test(reason)) return { ok: false, reason };
    return { ok: false, reason: 'independent_review_dir_unreadable' };
  }
}

function readSoakWithinEvidenceBudget(workspaceRoot, soakReportPath, review) {
  const reviewBytes = reviewSnapshotByteLength(review);
  const reviewBudget = inspectEvidenceBundleSize(reviewBytes, 0);
  if (!reviewBudget.pass) return { ok: false, reason: reviewBudget.failures[0] };
  const remainingBytes = MAX_EVIDENCE_BUNDLE_BYTES - reviewBytes;
  const soakLimit = Math.min(MAX_SOAK_REPORT_BYTES, remainingBytes);
  const soak = readExternalFileSnapshot(workspaceRoot, soakReportPath, 'soak_report', soakLimit);
  if (!soak.ok) {
    if (soak.reason === 'soak_report_too_large' && soakLimit < MAX_SOAK_REPORT_BYTES) {
      return { ok: false, reason: 'evidence_bundle_size_exceeded' };
    }
    return soak;
  }
  const combinedBudget = inspectEvidenceBundleSize(reviewBytes, soak.bytes.length);
  return combinedBudget.pass ? soak : { ok: false, reason: combinedBudget.failures[0] };
}

function snapshotReleaseInputs(workspaceRoot, options) {
  const review = snapshotExternalReviewDirectory(workspaceRoot, options.independentReviewDir);
  if (!review.ok) return { ok: false, failures: [review.reason] };
  const soak = readSoakWithinEvidenceBudget(workspaceRoot, options.soakReport, review);
  const failures = [soak].filter((entry) => !entry.ok).map((entry) => entry.reason);
  if (soak.ok && isPathInside(review.directory, soak.path)) failures.push('soak_report_must_be_outside_review_dir');
  return failures.length ? { ok: false, failures } : { ok: true, review, soak };
}

function computeEvidenceDigestFromSnapshot(snapshot) {
  const size = inspectEvidenceBundleSize(reviewSnapshotByteLength(snapshot?.review), Number(snapshot?.soak?.bytes?.length));
  if (!size.pass) return { pass: false, failures: size.failures, evidenceDigest: null, fileCount: 0, totalBytes: size.totalBytes };
  const hash = crypto.createHash('sha256');
  hash.update('release-evidence-bundle/v1\0');
  for (const file of snapshot.review.files) {
    hash.update(`review/${file.relativePath}\0${file.bytes.length}\0`);
    hash.update(file.bytes);
    hash.update('\0');
  }
  hash.update(`soak/report.json\0${snapshot.soak.bytes.length}\0`);
  hash.update(snapshot.soak.bytes);
  return { pass: true, failures: [], evidenceDigest: `sha256:${hash.digest('hex')}`, fileCount: snapshot.review.files.length + 1, totalBytes: size.totalBytes };
}

function computeEvidenceDigest(workspaceRoot, reviewDirectory, soakReportPath) {
  const review = snapshotExternalReviewDirectory(workspaceRoot, reviewDirectory);
  if (!review.ok) return { pass: false, failures: [review.reason] };
  const soak = readSoakWithinEvidenceBudget(workspaceRoot, soakReportPath, review);
  if (!soak.ok) return { pass: false, failures: [soak.reason] };
  if (isPathInside(review.directory, soak.path)) return { pass: false, failures: ['soak_report_must_be_outside_review_dir'] };
  return computeEvidenceDigestFromSnapshot({ review, soak });
}

function loadCurrentRouteManifest(root = ROOT) {
  const checker = path.join(root, 'tools', 'check-route-maturity-contract.js');
  const result = spawnSync(process.execPath, ['--max-old-space-size=2048', checker, '--print-public-release-manifest'], {
    cwd: root,
    encoding: null,
    timeout: managedChildTimeoutMs(DEFAULT_ROUTE_VERIFIER_TIMEOUT_MS),
    maxBuffer: 1024 * 1024,
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=2048', CODEX_MEMORY_LIMIT_MB: '2048' },
  });
  if (result.error || result.status !== 0 || !Buffer.isBuffer(result.stdout)) return { pass: false, failures: ['route_manifest_generation_failed'] };
  const bytes = Buffer.from(result.stdout);
  try {
    const manifest = JSON.parse(decodeUtf8Fatal(bytes, 'route_manifest'));
    const policyBytes = Buffer.from(readBoundedFileSnapshotSync(path.join(root, 'docs', 'decision-system', 'external-acceptance', 'route-release-policy.json'), { maxBytes: MAX_REVIEW_RECORD_BYTES, decodeUtf8: true }).bytes);
    const productContractBytes = Buffer.from(readBoundedFileSnapshotSync(path.join(root, 'docs', 'full-console-product-contract.md'), { maxBytes: MAX_REVIEW_RECORD_BYTES, decodeUtf8: true }).bytes);
    if (manifest?.['schema-version'] !== 1 || manifest?.['policy-id'] !== 'bounded-public-release-v1' || !Array.isArray(manifest.routes)) throw new Error('invalid_manifest');
    return {
      pass: true,
      bytes,
      manifest,
      productContractDigest: sha256Digest(productContractBytes),
      routePolicyDigest: sha256Digest(policyBytes),
      routeManifestDigest: sha256Digest(bytes),
    };
  } catch {
    return { pass: false, failures: ['route_manifest_generation_invalid'] };
  }
}

function verifyRouteManifest(snapshot, root = ROOT) {
  const expected = loadCurrentRouteManifest(root);
  if (!expected.pass) return expected;
  const manifests = snapshot?.review?.files?.filter((file) => file.relativePath === ROUTE_MANIFEST_FILE) || [];
  if (manifests.length !== 1) return { pass: false, failures: ['route_manifest_missing_or_duplicate'] };
  if (!manifests[0].bytes.equals(expected.bytes)) return { pass: false, failures: ['route_manifest_does_not_match_candidate'] };
  return expected;
}

function loadIndependentReviewRecords(snapshot) {
  const topLevelJson = snapshot.review.files.filter((file) => !file.relativePath.includes('/') && file.relativePath.endsWith('.json') && file.relativePath !== ROUTE_MANIFEST_FILE);
  if (topLevelJson.length !== REQUIRED_ROLES.length) return { ok: false, failures: ['independent_review_count_invalid'] };
  const knownPaths = new Set(snapshot.review.files.map((file) => file.relativePath));
  const records = [];
  const failures = [];
  for (const file of topLevelJson) {
    try {
      const record = JSON.parse(decodeUtf8Fatal(file.bytes, 'independent_review_record'));
      const paths = evidencePaths(record?.evidence);
      if (!paths?.length) failures.push('independent_review_evidence_paths_invalid');
      else if (paths.some((evidencePath) => !knownPaths.has(evidencePath))) failures.push('independent_review_evidence_missing_or_unsafe');
      records.push(record);
    } catch { failures.push('independent_review_record_json_invalid'); }
  }
  return { ok: failures.length === 0, records, failures };
}

function loadSoakReport(snapshot) {
  try { return { ok: true, report: JSON.parse(decodeUtf8Fatal(snapshot.soak.bytes, 'soak_report')) }; }
  catch { return { ok: false, failures: ['soak_report_json_invalid'] }; }
}

function verifySoakReport({ root = ROOT, candidateCommit, soakBytes, minSoakSeconds = DEFAULT_MIN_SOAK_SECONDS, minSoakSamples = DEFAULT_MIN_SOAK_SAMPLES, timeoutMs = DEFAULT_SOAK_VERIFIER_TIMEOUT_MS } = {}) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || !Buffer.isBuffer(soakBytes)) return { pass: false, failures: ['soak_verifier_input_invalid'] };
  const python = process.platform === 'win32' ? 'py' : 'python3';
  const args = process.platform === 'win32' ? ['-3'] : [];
  args.push(path.join(root, 'tools', 'check-routeros-readonly-soak.py'), '--verify-report-stdin', '--expected-commit', candidateCommit || '', '--min-duration', String(minSoakSeconds), '--min-samples', String(minSoakSamples));
  const result = spawnSync(python, args, { cwd: root, encoding: 'utf8', input: soakBytes, timeout: managedChildTimeoutMs(timeoutMs), maxBuffer: 1024 * 1024, windowsHide: true });
  if (result.error) return { pass: false, failures: [result.error.code === 'ETIMEDOUT' ? 'soak_verifier_timed_out' : 'soak_verifier_execution_failed'] };
  return result.status === 0 ? { pass: true, failures: [] } : { pass: false, failures: ['soak_verifier_rejected_report'] };
}

function inspectCurrentCheckout(root, candidateCommit) {
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', timeout: managedChildTimeoutMs(10_000), windowsHide: true });
  if (head.error || head.status !== 0) return { pass: false, failures: ['candidate_checkout_head_unavailable'] };
  if (String(head.stdout || '').trim().toLowerCase() !== candidateCommit) return { pass: false, failures: ['candidate_commit_is_not_current_head'] };
  const status = spawnSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd: root, encoding: 'utf8', timeout: managedChildTimeoutMs(30_000), maxBuffer: 4 * 1024 * 1024, windowsHide: true });
  if (status.error || status.status !== 0) return { pass: false, failures: ['candidate_checkout_status_unavailable'] };
  return String(status.stdout || '').trim() ? { pass: false, failures: ['candidate_checkout_not_clean'] } : { pass: true, failures: [] };
}

function inspectReleaseCandidateEvidence(options, { root = ROOT, verifySoak = verifySoakReport, verifyRoute = verifyRouteManifest, inspectCheckout = inspectCurrentCheckout, snapshot = null, afterSnapshot = null } = {}) {
  const failures = [];
  const append = (items) => failures.push(...items.filter((item) => !failures.includes(item)));
  const candidate = inspectCandidateCommit(options.candidateCommit);
  append(candidate.failures);
  if (!candidate.pass) return { pass: false, candidateCommit: options.candidateCommit || null, failures };
  if (!Number.isFinite(options.minSoakSeconds) || options.minSoakSeconds < DEFAULT_MIN_SOAK_SECONDS) append(['soak_minimum_seconds_below_release_policy']);
  if (!Number.isSafeInteger(options.minSoakSamples) || options.minSoakSamples < DEFAULT_MIN_SOAK_SAMPLES) append(['soak_minimum_samples_below_release_policy']);
  append(inspectCheckout(root, options.candidateCommit).failures);
  const frozen = snapshot || snapshotReleaseInputs(root, options);
  append(frozen.failures || []);
  if (!frozen.ok) return { pass: false, candidateCommit: options.candidateCommit, evidenceDigest: null, failures };
  if (typeof afterSnapshot === 'function') afterSnapshot(frozen);
  let routeManifest = { pass: false, failures: ['candidate_isolated_worktree_unavailable'] };
  let soakVerification = { pass: false, failures: ['candidate_isolated_worktree_unavailable'] };
  let candidateRuntimeIdentity = null;
  try {
    withIsolatedCandidateWorktree(root, options.candidateCommit, (candidateRoot) => {
      candidateRuntimeIdentity = gitWorktreeIdentity(candidateRoot, { ignoreFileMode: true });
      routeManifest = verifyRoute(frozen, candidateRoot);
      if (loadSoakReport(frozen).ok) {
        soakVerification = verifySoak({ root: candidateRoot, candidateCommit: options.candidateCommit, soakBytes: frozen.soak.bytes, minSoakSeconds: options.minSoakSeconds, minSoakSamples: options.minSoakSamples, timeoutMs: options.soakVerifierTimeoutMs });
      }
    });
  } catch { /* The public result below remains fail-closed. */ }
  append(routeManifest.failures || []);
  const reviews = loadIndependentReviewRecords(frozen);
  append(reviews.failures || []);
  if (reviews.ok) append(inspectIndependentReviewRecords(reviews.records, options.candidateCommit, candidateRuntimeIdentity, routeManifest.manifest).failures);
  const soak = loadSoakReport(frozen);
  append(soak.failures || []);
  if (soak.ok) {
    append(inspectSoakReport(soak.report, options.candidateCommit, options.minSoakSeconds, options.minSoakSamples).failures);
    append(soakVerification.failures);
  }
  const digest = computeEvidenceDigestFromSnapshot(frozen);
  if (options.evidenceDigest && options.evidenceDigest !== digest.evidenceDigest) append(['release_evidence_digest_mismatch']);
  append(inspectCheckout(root, options.candidateCommit).failures);
  return {
    pass: failures.length === 0,
    candidateEvidenceShapePass: failures.length === 0,
    candidateEvidencePass: false,
    publicReleasePass: false,
    releaseComplete: false,
    authority: 'candidate-structural-check-only',
    candidateCommit: options.candidateCommit,
    evidenceDigest: digest.evidenceDigest,
    productContractDigest: routeManifest.productContractDigest || null,
    routePolicyDigest: routeManifest.routePolicyDigest || null,
    routeManifestDigest: routeManifest.routeManifestDigest || null,
    trustBoundary: 'reviewer-authenticity-signature-and-promotion-authorization-are-external',
    failures,
  };
}

function parseCliArguments(argv) {
  const values = {};
  const failures = [];
  const names = new Set(['candidate-commit', 'independent-review-dir', 'soak-report', 'evidence-digest', 'min-soak-seconds', 'min-soak-samples', 'soak-verifier-timeout-ms']);
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === '--compute-evidence-digest') { if (values.computeOnly) failures.push('cli_argument_invalid'); values.computeOnly = true; continue; }
    if (!current.startsWith('--')) { failures.push('cli_argument_invalid'); continue; }
    const equals = current.indexOf('=');
    const name = current.slice(2, equals === -1 ? undefined : equals);
    const value = equals === -1 ? argv[++index] : current.slice(equals + 1);
    if (!names.has(name) || !value || Object.hasOwn(values, name)) { failures.push('cli_argument_invalid'); continue; }
    values[name] = value;
  }
  const required = values.computeOnly ? ['independent-review-dir', 'soak-report'] : ['candidate-commit', 'independent-review-dir', 'soak-report'];
  for (const name of required) if (!Object.hasOwn(values, name)) failures.push(`cli_${name.replaceAll('-', '_')}_missing`);
  const minSoakSeconds = values['min-soak-seconds'] === undefined ? DEFAULT_MIN_SOAK_SECONDS : Number(values['min-soak-seconds']);
  const minSoakSamples = values['min-soak-samples'] === undefined ? DEFAULT_MIN_SOAK_SAMPLES : Number(values['min-soak-samples']);
  const soakVerifierTimeoutMs = values['soak-verifier-timeout-ms'] === undefined ? DEFAULT_SOAK_VERIFIER_TIMEOUT_MS : Number(values['soak-verifier-timeout-ms']);
  if (!Number.isFinite(minSoakSeconds) || minSoakSeconds <= 0 || !Number.isSafeInteger(minSoakSamples) || minSoakSamples <= 0 || !Number.isSafeInteger(soakVerifierTimeoutMs) || soakVerifierTimeoutMs <= 0) failures.push('cli_numeric_option_invalid');
  return { pass: failures.length === 0, failures, options: { candidateCommit: values['candidate-commit'], independentReviewDir: values['independent-review-dir'], soakReport: values['soak-report'], evidenceDigest: values['evidence-digest'], minSoakSeconds, minSoakSamples, soakVerifierTimeoutMs, computeOnly: values.computeOnly === true } };
}

if (require.main === module) {
  const parsed = parseCliArguments(process.argv.slice(2));
  const result = parsed.pass && parsed.options.computeOnly ? computeEvidenceDigest(ROOT, parsed.options.independentReviewDir, parsed.options.soakReport) : parsed.pass ? inspectReleaseCandidateEvidence(parsed.options) : { pass: false, candidateCommit: parsed.options.candidateCommit || null, failures: parsed.failures };
  console.log(JSON.stringify({ contract: parsed.options.computeOnly ? 'release-evidence-digest/v1' : 'release-candidate-evidence/v2', ...result }, null, 2));
  process.exitCode = result.pass ? 0 : 1;
}

module.exports = { DEFAULT_MIN_SOAK_SECONDS, DEFAULT_MIN_SOAK_SAMPLES, LOW_LOAD_CHILD_TIMEOUT_MS, MAX_LOW_LOAD_CHILD_TIMEOUT_MS, LOW_LOAD_TIMEOUT_OWNER, hasManagedTimeoutOwnerDescriptor, verifyManagedTimeoutOwner, managedChildTimeoutMs, MAX_EVIDENCE_BUNDLE_BYTES, MAX_EVIDENCE_BUNDLE_FILE_BYTES, MAX_SOAK_REPORT_BYTES, MAX_EVIDENCE_BUNDLE_DIRECTORIES, MAX_EVIDENCE_BUNDLE_ENTRIES, MAX_EVIDENCE_BUNDLE_DEPTH, inspectEvidenceBundleSize, reviewEvidenceReadLimit, nativeFileIdentity, assertFrozenExternalFile, assertFrozenReviewFile, inspectCandidateCommit, inspectIndependentReviewRecords, inspectSoakReport, inspectReleaseCandidateEvidence, inspectCurrentCheckout, computeEvidenceDigest, computeEvidenceDigestFromSnapshot, snapshotReleaseInputs, snapshotExternalReviewDirectory, readSoakWithinEvidenceBudget, readExternalFileSnapshot, loadCurrentRouteManifest, verifyRouteManifest, withIsolatedCandidateWorktree, parseCliArguments, verifySoakReport, sha256Digest };
