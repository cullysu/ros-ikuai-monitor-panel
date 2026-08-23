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
