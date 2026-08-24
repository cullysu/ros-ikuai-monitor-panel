#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const checker = require('./check-release-candidate-evidence.js');
const { gitWorktreeIdentity } = require('./worktree-runtime-identity.js');

const root = path.resolve(__dirname, '..');
const candidate = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).stdout.trim();
assert.match(candidate, /^[0-9a-f]{40}$/);

function writeJson(file, value) { fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }
function review(role, reviewerAgentId, runtimeIdentity, routeManifest) {
  const operationalRoutes = routeManifest.routes.filter((entry) => entry.kind === 'module');
  return {
    schema: 'independent-review/v1', role, reviewerAgentId, verdict: 'pass', p0: 0, p1: 0,
    scope: 'external-release-scope', releaseEligible: true, evidence: ['evidence.txt', 'evidence/at-session.json'],
    reviewedArtifact: { artifactKey: runtimeIdentity.artifactKey, fingerprint: runtimeIdentity.worktreeFingerprint, generatedAt: '2026-08-09T00:00:00.000Z', commit: candidate, pass: true },
    ...(role === 'route-owner' ? { routeAcceptance: operationalRoutes.map((entry) => ({ route: entry.route, declaredMaturity: entry.declaredMaturity, result: 'pass', evidence: 'evidence.txt' })) } : {}),
    ...(role === 'accessibility-interaction' ? { assistiveTechnologyTests: [{ schema: 'assistive-technology-session/v1', sessionId: 'at-session-20260809-001', startedAt: '2026-08-09T00:00:00.000Z', endedAt: '2026-08-09T00:30:00.000Z', operatingSystem: 'Windows', operatingSystemVersion: '11 24H2', assistiveTechnology: 'Narrator', assistiveTechnologyVersion: '11.2506.4', browserOrHost: 'Microsoft Edge', browserOrHostVersion: '140.0', deviceContext: 'desktop keyboard', interactionModes: ['keyboard', 'screen-reader', 'spoken-announcement'], protocol: 'manual-assistive-technology-route-review/v1', result: 'pass', routeResults: operationalRoutes.map((entry) => ({ route: entry.route, result: 'pass', evidence: 'evidence/at-session.json' })), evidence: 'evidence/at-session.json' }] } : {}),
  };
}
function soak() {
  return { schema: 'routeros-readonly-soak/v2', outcome: 'pass', interrupted: false, expectedCommit: candidate, durationSeconds: 300, elapsedSeconds: 300, samples: Array.from({ length: 10 }, () => ({ outcome: 'ok', channels: ['health', 'snapshot'].map((channel) => ({ channel, outcome: 'ok', freshness: 'fresh', failureState: 'clear', commitCheck: 'match', buildCommit: candidate })) })) };
}
const acceptanceRoot = path.join(root, '_acceptance');
fs.mkdirSync(acceptanceRoot, { recursive: true });
const temporary = fs.mkdtempSync(path.join(acceptanceRoot, '.release-candidate-evidence-'));
const testWorkspaceBoundary = path.join(root, 'src');
try {
  assert.equal(checker.managedChildTimeoutMs(30_000, {}), 30_000, 'normal execution must preserve the strict child timeout');
  const ownerEnvironment = {
    CODEX_LOW_LOAD_MANAGED: '1',
    CODEX_LOW_LOAD_TIMEOUT_OWNER: checker.LOW_LOAD_TIMEOUT_OWNER,
    CODEX_LOW_LOAD_JOB_NAME: `Local\\CodexLowLoad-123-${'a'.repeat(32)}`,
    CODEX_LOW_LOAD_OWNER_PID: '123',
  };
  assert.equal(checker.hasManagedTimeoutOwnerDescriptor(ownerEnvironment), true, 'timeout ownership requires a complete bounded Job descriptor');
  assert.equal(
    checker.managedChildTimeoutMs(30_000, ownerEnvironment, () => true),
    undefined,
    'a verified pause-aware Job owner must be the sole timeout owner for an ordinary managed tree',
  );
  assert.equal(
    checker.managedChildTimeoutMs(30_000, ownerEnvironment, () => false),
    180_000,
    'an unverified or forged owner descriptor must retain a bounded nested timeout',
  );
  assert.equal(
    checker.hasManagedTimeoutOwnerDescriptor({ CODEX_LOW_LOAD_MANAGED: '1', CODEX_LOW_LOAD_TIMEOUT_OWNER: checker.LOW_LOAD_TIMEOUT_OWNER }),
    false,
    'bare environment markers must never disable nested timeouts',
  );
  if (process.platform === 'win32' && process.env.CODEX_LOW_LOAD_TIMEOUT_OWNER === checker.LOW_LOAD_TIMEOUT_OWNER) {
    assert.equal(checker.verifyManagedTimeoutOwner(process.env), true, 'the live candidate fixture must verify membership in its named runner Job');
  }
  assert.equal(checker.managedChildTimeoutMs(30_000, { CODEX_LOW_LOAD_MANAGED: '1' }), 180_000, 'managed low-load execution must cover the complete pause budget');
  assert.equal(checker.managedChildTimeoutMs(240_000, { CODEX_LOW_LOAD_MANAGED: '1' }), 240_000, 'a larger bounded verifier timeout must be preserved');
  assert.equal(checker.managedChildTimeoutMs(900_000, { CODEX_LOW_LOAD_MANAGED: '1' }), 600_000, 'managed child wall time must retain an absolute upper bound');
  const reviews = path.join(temporary, 'reviews');
  const soakPath = path.join(temporary, 'soak.json');
  fs.mkdirSync(reviews);
  fs.mkdirSync(path.join(reviews, 'evidence'));
  fs.writeFileSync(path.join(reviews, 'evidence.txt'), 'external evidence\n');
  fs.writeFileSync(path.join(reviews, 'evidence', 'at-session.json'), '{"session":"external-manual-at-evidence"}\n');
  const manifest = checker.loadCurrentRouteManifest(root);
  assert.equal(manifest.pass, true, 'fixture manifest must be generated from the active route registry and policy');
  const candidateRuntimeIdentity = checker.withIsolatedCandidateWorktree(root, candidate, (candidateRoot) => {
    assert.notEqual(path.resolve(candidateRoot), root, 'candidate verification must execute outside the mutable workspace');
    return gitWorktreeIdentity(candidateRoot);
  });
  assert.equal(candidateRuntimeIdentity.commit, candidate, 'clean candidate identity must bind the candidate commit');
  assert.equal(candidateRuntimeIdentity.worktreeClean, true, 'candidate identity must come from a clean isolated worktree');
  assert.equal(candidateRuntimeIdentity.releaseEvidenceEligible, true, 'clean candidate identity must be release-evidence eligible');
  fs.writeFileSync(path.join(reviews, 'route-manifest.json'), manifest.bytes);
  const roles = ['product-information-architecture', 'visual-interaction', 'accessibility-interaction', 'engineering-code-review', 'route-owner'];
  roles.forEach((role, index) => writeJson(path.join(reviews, `${index}.json`), review(role, `reviewer-${index}`, candidateRuntimeIdentity, manifest.manifest)));
  writeJson(soakPath, soak());
  assert.deepEqual(
    checker.inspectEvidenceBundleSize(checker.MAX_EVIDENCE_BUNDLE_BYTES, 0),
    { pass: true, failures: [], totalBytes: checker.MAX_EVIDENCE_BUNDLE_BYTES },
    'the exact combined evidence budget must remain valid without allocating a maximum-size fixture',
  );
  assert.deepEqual(
    checker.inspectEvidenceBundleSize(checker.MAX_EVIDENCE_BUNDLE_BYTES, 1),
    { pass: false, failures: ['evidence_bundle_size_exceeded'], totalBytes: checker.MAX_EVIDENCE_BUNDLE_BYTES + 1 },
    'review and soak bytes must share one 64 MiB total budget',
  );
  assert.equal(checker.MAX_SOAK_REPORT_BYTES, checker.MAX_EVIDENCE_BUNDLE_FILE_BYTES, 'soak must obey the same 4 MiB per-file evidence limit');
  assert.equal(checker.reviewEvidenceReadLimit(0), checker.MAX_EVIDENCE_BUNDLE_FILE_BYTES, 'an empty review bundle may use the complete per-file budget');
  assert.equal(checker.reviewEvidenceReadLimit(checker.MAX_EVIDENCE_BUNDLE_BYTES - 1), 1, 'the next review file must be limited by the remaining total budget before allocation');
  assert.equal(checker.reviewEvidenceReadLimit(checker.MAX_EVIDENCE_BUNDLE_BYTES), 0, 'an exhausted review bundle must not allocate another non-empty file');
  assert.equal(
    checker.readSoakWithinEvidenceBudget(testWorkspaceBoundary, soakPath, {
      files: [{ bytes: { length: checker.MAX_EVIDENCE_BUNDLE_BYTES - 1 } }],
    }).reason,
    'evidence_bundle_size_exceeded',
    'soak reading must fail at the remaining combined budget before allocating a larger snapshot',
  );
  const baseOptions = {
    candidateCommit: candidate,
    independentReviewDir: reviews,
    soakReport: soakPath,
    minSoakSeconds: 300,
    minSoakSamples: 10,
    soakVerifierTimeoutMs: 30_000,
  };
  const snapshot = checker.snapshotReleaseInputs(testWorkspaceBoundary, baseOptions);
  assert.equal(snapshot.ok, true, 'external review and soak inputs must snapshot once');
  const digest = checker.computeEvidenceDigestFromSnapshot(snapshot).evidenceDigest;
  assert.match(digest, /^sha256:[0-9a-f]{64}$/);

  const depthRoot = path.join(temporary, 'depth-limit');
  fs.mkdirSync(depthRoot);
  let depthCursor = depthRoot;
  for (let depth = 0; depth <= checker.MAX_EVIDENCE_BUNDLE_DEPTH; depth += 1) {
    depthCursor = path.join(depthCursor, `d${depth}`);
    fs.mkdirSync(depthCursor);
  }
  assert.equal(
    checker.snapshotExternalReviewDirectory(testWorkspaceBoundary, depthRoot).reason,
    'evidence_bundle_depth_exceeded',
    'review evidence traversal must reject excessive directory depth before recursive resource exhaustion',
  );

  const directoryCountRoot = path.join(temporary, 'directory-count-limit');
  fs.mkdirSync(directoryCountRoot);
  for (let index = 0; index < checker.MAX_EVIDENCE_BUNDLE_DIRECTORIES; index += 1) {
    fs.mkdirSync(path.join(directoryCountRoot, `d-${String(index).padStart(3, '0')}`));
  }
  assert.equal(
    checker.snapshotExternalReviewDirectory(testWorkspaceBoundary, directoryCountRoot).reason,
    'evidence_bundle_directory_count_exceeded',
    'review evidence traversal must reject excessive directory fanout before walking the complete tree',
  );

  const entryCountRoot = path.join(temporary, 'entry-count-limit');
  fs.mkdirSync(entryCountRoot);
  for (let index = 0; index <= checker.MAX_EVIDENCE_BUNDLE_ENTRIES; index += 1) {
    fs.writeFileSync(path.join(entryCountRoot, `f-${String(index).padStart(3, '0')}.txt`), '');
  }
  assert.equal(
    checker.snapshotExternalReviewDirectory(testWorkspaceBoundary, entryCountRoot).reason,
    'evidence_bundle_entry_count_exceeded',
    'review evidence traversal must stop reading a directory once the bounded entry budget is exhausted',
  );

  const fileSizeRoot = path.join(temporary, 'file-size-limit');
  const oversizedEvidence = path.join(fileSizeRoot, 'oversized-evidence.bin');
  fs.mkdirSync(fileSizeRoot);
  const oversizedHandle = fs.openSync(oversizedEvidence, 'w');
  try {
    fs.ftruncateSync(oversizedHandle, checker.MAX_EVIDENCE_BUNDLE_FILE_BYTES + 1);
  } finally {
    fs.closeSync(oversizedHandle);
  }
  assert.equal(
    checker.snapshotExternalReviewDirectory(testWorkspaceBoundary, fileSizeRoot).reason,
    'evidence_bundle_file_too_large',
    'one evidence file must fail closed before immutable byte-array expansion can exceed the per-file memory budget',
  );
  assert.equal(
    checker.readExternalFileSnapshot(testWorkspaceBoundary, oversizedEvidence, 'soak_report', checker.MAX_SOAK_REPORT_BYTES).reason,
    'soak_report_too_large',
    'a soak report must fail from file metadata before exceeding the shared 4 MiB single-file budget',
  );
  assert.equal(
    checker.snapshotExternalReviewDirectory(testWorkspaceBoundary, path.join(temporary, 'missing-review-directory')).reason,
    'independent_review_dir_unreadable',
    'unknown filesystem failures must not expose locale-dependent paths or messages as contract reasons',
  );

  const junctionRaceRoot = path.join(temporary, 'junction-race');
  const junctionInternal = path.join(junctionRaceRoot, 'slot');
  const junctionExternal = path.join(temporary, 'junction-external');
  fs.mkdirSync(junctionInternal, { recursive: true });
  fs.mkdirSync(junctionExternal);
  const internalEvidence = path.join(junctionInternal, 'proof.txt');
  const externalEvidence = path.join(junctionExternal, 'proof.txt');
  fs.writeFileSync(internalEvidence, 'inside');
  fs.writeFileSync(externalEvidence, 'outside');
  const internalRealPath = fs.realpathSync(internalEvidence);
  const internalStat = fs.statSync(internalEvidence);
  const externalStat = fs.statSync(externalEvidence);
  const frozenMetadata = (stat) => ({ dev: stat.dev, ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs, ctimeMs: stat.ctimeMs });
  const internalFrozen = { metadata: frozenMetadata(internalStat) };
  const externalFrozen = { metadata: frozenMetadata(externalStat) };
  assert.throws(
    () => checker.assertFrozenReviewFile(junctionRaceRoot, internalEvidence, internalRealPath, externalFrozen),
    /evidence_bundle_file_identity_changed/,
    'restoring the original path after reading a different file must fail native file identity binding',
  );
  assert.throws(
    () => checker.assertFrozenReviewFile(junctionRaceRoot, internalEvidence, internalRealPath, { metadata: { dev: 0, ino: 0 } }),
    /evidence_bundle_file_identity_unavailable/,
    'release evidence must fail closed when the platform cannot provide a native file identity',
  );
  assert.throws(
    () => checker.assertFrozenExternalFile(internalEvidence, internalRealPath, { metadata: { ...internalFrozen.metadata, size: internalFrozen.metadata.size + 1 } }),
    /evidence_bundle_file_metadata_changed/,
    'in-place mutation after a file snapshot must fail the final metadata revalidation',
  );
  assert.doesNotThrow(
    () => checker.assertFrozenExternalFile(internalEvidence, internalRealPath, internalFrozen),
    'an unchanged external evidence file must retain its native identity and metadata',
  );
  const junctionBackup = path.join(junctionRaceRoot, 'slot-original');
  fs.renameSync(junctionInternal, junctionBackup);
  fs.symlinkSync(junctionExternal, junctionInternal, process.platform === 'win32' ? 'junction' : 'dir');
  try {
    assert.throws(
      () => checker.assertFrozenReviewFile(junctionRaceRoot, path.join(junctionInternal, 'proof.txt'), internalRealPath, externalFrozen),
      /evidence_bundle_path_escape/,
      'a parent directory changed to a junction outside the review root must fail containment after the file read',
    );
  } finally {
    fs.unlinkSync(junctionInternal);
    fs.renameSync(junctionBackup, junctionInternal);
  }

  assert.equal(checker.inspectCandidateCommit('a'.repeat(39)).pass, false, 'wrong SHA must fail');
  const canonicalReviews = roles.map((role, index) => review(role, `reviewer-${index}`, candidateRuntimeIdentity, manifest.manifest));
  assert.equal(checker.inspectIndependentReviewRecords(canonicalReviews, candidate, candidateRuntimeIdentity, manifest.manifest).pass, true, 'reviews must pass only when their artifact identity, route-owner claims, and AT coverage match the clean candidate');
  const missingRouteOwnerCoverage = structuredClone(canonicalReviews);
  missingRouteOwnerCoverage.find((record) => record.role === 'route-owner').routeAcceptance.pop();
  assert.equal(checker.inspectIndependentReviewRecords(missingRouteOwnerCoverage, candidate, candidateRuntimeIdentity, manifest.manifest).failures.includes('route_owner_coverage_invalid'), true, 'route owner must cover every operational route');
  const automatedOnlyAccessibility = structuredClone(canonicalReviews);
  automatedOnlyAccessibility.find((record) => record.role === 'accessibility-interaction').assistiveTechnologyTests[0].assistiveTechnology = 'Playwright';
  assert.equal(checker.inspectIndependentReviewRecords(automatedOnlyAccessibility, candidate, candidateRuntimeIdentity, manifest.manifest).pass, true, 'the candidate checker validates evidence shape, not whether a caller-provided AT identity is authentic');
  const duplicateAccessibilityRoute = structuredClone(canonicalReviews);
  const atRoutes = duplicateAccessibilityRoute.find((record) => record.role === 'accessibility-interaction').assistiveTechnologyTests[0].routeResults;
  atRoutes.push(structuredClone(atRoutes[0]));
  assert.equal(checker.inspectIndependentReviewRecords(duplicateAccessibilityRoute, candidate, candidateRuntimeIdentity, manifest.manifest).failures.includes('assistive_technology_route_coverage_invalid'), true, 'one AT session cannot duplicate a route result');
  const genericAtVersion = structuredClone(canonicalReviews);
  genericAtVersion.find((record) => record.role === 'accessibility-interaction').assistiveTechnologyTests[0].assistiveTechnologyVersion = 'current';
  assert.equal(checker.inspectIndependentReviewRecords(genericAtVersion, candidate, candidateRuntimeIdentity, manifest.manifest).failures.includes('assistive_technology_test_invalid'), true, 'AT versions must be reproducible rather than generic labels');
  for (const field of ['operatingSystemVersion', 'browserOrHostVersion']) {
    const genericVersion = structuredClone(canonicalReviews);
    genericVersion.find((record) => record.role === 'accessibility-interaction').assistiveTechnologyTests[0][field] = 'current';
    assert.equal(checker.inspectIndependentReviewRecords(genericVersion, candidate, candidateRuntimeIdentity, manifest.manifest).failures.includes('assistive_technology_test_invalid'), true, `${field} must be reproducible rather than generic`);
  }
  const zeroDurationAtSession = structuredClone(canonicalReviews);
  const zeroDurationTest = zeroDurationAtSession.find((record) => record.role === 'accessibility-interaction').assistiveTechnologyTests[0];
  zeroDurationTest.endedAt = zeroDurationTest.startedAt;
  assert.equal(checker.inspectIndependentReviewRecords(zeroDurationAtSession, candidate, candidateRuntimeIdentity, manifest.manifest).failures.includes('assistive_technology_test_invalid'), true, 'AT session duration must be positive');
  const missingRouteEvidence = structuredClone(canonicalReviews);
  delete missingRouteEvidence.find((record) => record.role === 'accessibility-interaction').assistiveTechnologyTests[0].routeResults[0].evidence;
  assert.equal(checker.inspectIndependentReviewRecords(missingRouteEvidence, candidate, candidateRuntimeIdentity, manifest.manifest).failures.includes('assistive_technology_evidence_invalid'), true, 'every AT route result must link to frozen evidence');
  const unlistedRouteEvidence = structuredClone(canonicalReviews);
  unlistedRouteEvidence.find((record) => record.role === 'accessibility-interaction').assistiveTechnologyTests[0].routeResults[0].evidence = 'evidence/not-listed.json';
  assert.equal(checker.inspectIndependentReviewRecords(unlistedRouteEvidence, candidate, candidateRuntimeIdentity, manifest.manifest).failures.includes('assistive_technology_evidence_invalid'), true, 'AT route evidence must be listed by the review record');
  const wrongArtifactKey = structuredClone(canonicalReviews);
  wrongArtifactKey.forEach((record) => { record.reviewedArtifact.artifactKey = 'other-candidate'; });
  assert.deepEqual(
    checker.inspectIndependentReviewRecords(wrongArtifactKey, candidate, candidateRuntimeIdentity, manifest.manifest),
    { pass: false, failures: ['independent_review_artifact_key_mismatch'] },
    'four internally consistent review artifact keys that differ from the clean candidate identity must fail closed',
  );
  const wrongFingerprint = structuredClone(canonicalReviews);
  wrongFingerprint.forEach((record) => { record.reviewedArtifact.fingerprint = '0'.repeat(64); });
  assert.deepEqual(
    checker.inspectIndependentReviewRecords(wrongFingerprint, candidate, candidateRuntimeIdentity, manifest.manifest),
    { pass: false, failures: ['independent_review_fingerprint_mismatch'] },
    'four internally consistent review fingerprints that differ from the clean candidate identity must fail closed',
  );
  const missingFingerprint = structuredClone(canonicalReviews);
  delete missingFingerprint[0].reviewedArtifact.fingerprint;
  assert.deepEqual(
    checker.inspectIndependentReviewRecords(missingFingerprint, candidate, candidateRuntimeIdentity, manifest.manifest),
    { pass: false, failures: ['independent_review_artifact_identity_invalid'] },
    'reviews that omit the exact candidate fingerprint must fail closed',
  );
  assert.equal(checker.inspectSoakReport(soak(), candidate).pass, true, 'valid soak summary must pass pure inspection');
  assert.equal(checker.verifyRouteManifest(snapshot, root).pass, true, 'external review bundle must contain the fixture route manifest bytes');

  fs.writeFileSync(path.join(reviews, 'route-manifest.json'), Buffer.concat([manifest.bytes, Buffer.from(' ')]));
  const alteredManifestSnapshot = checker.snapshotReleaseInputs(testWorkspaceBoundary, baseOptions);
  assert.equal(checker.verifyRouteManifest(alteredManifestSnapshot, root).pass, false, 'a one-byte manifest change must fail before signature verification');
  fs.writeFileSync(path.join(reviews, 'route-manifest.json'), manifest.bytes);

  const reviewRecord = path.join(reviews, '0.json');
  const canonicalReview = fs.readFileSync(reviewRecord);
  fs.writeFileSync(reviewRecord, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), canonicalReview]));
  const bomSnapshot = checker.snapshotReleaseInputs(testWorkspaceBoundary, baseOptions);
  const bomResult = checker.inspectReleaseCandidateEvidence(baseOptions, {
    root,
    snapshot: bomSnapshot,
    inspectCheckout: () => ({ pass: true, failures: [] }),
    verifyRoute: () => ({ pass: true, failures: [] }),
    verifySoak: () => ({ pass: true, failures: [] }),
  });
  assert.equal(bomResult.pass, false, 'UTF-8 BOM review records must fail closed');
  fs.writeFileSync(reviewRecord, canonicalReview);

  const frozenSoak = Buffer.from(snapshot.soak.bytes);
  fs.writeFileSync(soakPath, '{"attacker":true}\n');
  fs.writeFileSync(path.join(reviews, 'evidence.txt'), 'attacker replacement\n');
  const frozenResult = checker.inspectReleaseCandidateEvidence(baseOptions, {
    root,
    snapshot,
    inspectCheckout: () => ({ pass: true, failures: [] }),
    verifyRoute: (frozen, candidateRoot) => ({ pass: path.resolve(candidateRoot) !== root && frozen === snapshot, failures: [], manifest: manifest.manifest }),
    verifySoak: ({ soakBytes }) => ({ pass: soakBytes.equals(frozenSoak), failures: [] }),
  });
  assert.equal(frozenResult.pass, true, `post-snapshot path replacements must not influence frozen verification bytes: ${JSON.stringify(frozenResult)}`);
  assert.equal(frozenResult.candidateEvidenceShapePass, true, 'repository checker may establish only the frozen evidence structure');
  assert.equal(frozenResult.candidateEvidencePass, false, 'repository checker cannot authenticate externally supplied reviewer or AT identities');
  assert.equal(frozenResult.publicReleasePass, false, 'candidate-controlled code must never authorize its own public release');
  assert.equal(frozenResult.releaseComplete, false, 'pre-promotion evidence must not claim exact-SHA CL completion');

  const belowPolicyResult = checker.inspectReleaseCandidateEvidence({ ...baseOptions, minSoakSeconds: 1, minSoakSamples: 1 }, {
    root,
    snapshot,
    inspectCheckout: () => ({ pass: true, failures: [] }),
    verifyRoute: () => ({ pass: true, failures: [], manifest: manifest.manifest }),
    verifySoak: () => ({ pass: true, failures: [] }),
  });
  assert.equal(belowPolicyResult.pass, false, 'publication evidence cannot lower the 300-second and 10-sample soak policy');
  assert.equal(belowPolicyResult.failures.includes('soak_minimum_seconds_below_release_policy'), true);
  assert.equal(belowPolicyResult.failures.includes('soak_minimum_samples_below_release_policy'), true);

  assert.equal(checker.inspectCurrentCheckout(root, 'a'.repeat(40)).pass, false, 'candidate evidence must bind current HEAD');
  console.log('release candidate evidence tests: pass');
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
