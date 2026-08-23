#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const evidenceChecker = require('./check-release-candidate-evidence');

// The publisher imports this dependency normally in production.  The test
// replaces only its process-local module export so the GitHub API can be
// mocked without turning a fixture into a production authorization path.
let evidenceResult = { pass: true, evidenceDigest: `sha256:${'a'.repeat(64)}` };
let evidenceCalls = [];
evidenceChecker.inspectReleaseCandidateEvidence = (options, context) => {
  evidenceCalls.push({ options, context });
  return evidenceResult;
};
const publisher = require('./github-git-data-atomic-publish');
const { PublishError, stageCandidateObjects } = publisher;

const parent = '1'.repeat(40);
const candidate = '2'.repeat(40);
const parentTree = '3'.repeat(40);
const candidateTree = '4'.repeat(40);
const blobA = '5'.repeat(40);
const blobM = '6'.repeat(40);

function gitMock() {
  return (args) => {
    const key = args.join(' ');
    if (key === `rev-list --parents -n 1 ${candidate}`) return `${candidate} ${parent}\n`;
    if (key === `show -s --format=%T ${parent}`) return `${parentTree}\n`;
    if (key === `show -s --format=%T ${candidate}`) return `${candidateTree}\n`;
    if (key === `diff-tree --no-commit-id --no-renames --name-status -r -z ${parent} ${candidate}`) {
      return Buffer.from('A\0added.txt\0M\0changed.sh\0D\0removed.txt\0');
    }
    if (key === `ls-tree -z ${candidate} -- added.txt`) return Buffer.from(`100644 blob ${blobA}\tadded.txt\0`);
    if (key === `ls-tree -z ${candidate} -- changed.sh`) return Buffer.from(`100755 blob ${blobM}\tchanged.sh\0`);
    if (key === `ls-tree -z ${parent} -- removed.txt`) return Buffer.from(`100644 blob ${'7'.repeat(40)}\tremoved.txt\0`);
    if (key === `cat-file blob ${blobA}`) return Buffer.from('added content\n');
    if (key === `cat-file blob ${blobM}`) return Buffer.from('#!/bin/sh\necho changed\n');
    if (key === `show -s --format=%an%x00%ae%x00%aI%x00%cn%x00%ce%x00%cI ${candidate}`) {
      return [
        'Author', 'author@example.test', '2026-01-02T03:04:05+00:00',
        'Committer', 'committer@example.test', '2026-01-02T03:04:06+00:00',
      ].join('\0') + '\n';
    }
    if (key === `log -1 --format=%B ${candidate}`) return 'Atomic publish test\n\nRetain exact commit message.\n';
    throw new Error(`Unexpected git command: ${key}`);
  };
}

function response(json, status = 200) {
  return { status, json };
}

function makeSuccessRequest(calls, {
  preWriteRef = parent,
  commitSha = candidate,
  remoteCommitSha = parent,
  remoteTreeSha = parentTree,
  createdTreeSha = candidateTree,
} = {}) {
  let refReads = 0;
  return async (request) => {
    calls.push(request);
    const { method, path } = request;
    if (method === 'GET' && path.endsWith('/git/ref/heads/main')) {
      refReads += 1;
      const sha = refReads === 1 ? parent : preWriteRef;
      return response({ object: { type: 'commit', sha } });
    }
    if (method === 'GET' && path.endsWith(`/git/commits/${parent}`)) return response({ sha: remoteCommitSha, tree: { sha: parentTree } });
    if (method === 'GET' && path.endsWith(`/git/trees/${parentTree}`)) return response({ sha: remoteTreeSha, tree: [] });
    if (method === 'POST' && path.endsWith('/git/blobs')) {
      const sha = calls.filter((call) => call.method === 'POST' && call.path.endsWith('/git/blobs')).length === 1 ? blobA : blobM;
      return response({ sha });
    }
    if (method === 'POST' && path.endsWith('/git/trees')) return response({ sha: createdTreeSha });
    if (method === 'POST' && path.endsWith('/git/commits')) return response({ sha: commitSha });
    if (method === 'PATCH' && path.endsWith('/git/refs/heads/main')) return response({ object: { sha: candidate } });
    throw new Error(`Unexpected HTTP request: ${method} ${path}`);
  };
}

function options(request) {
  return {
    candidateSha: candidate,
    expectedRemoteMainSha: parent,
    repository: 'example/atomic-publish',
    independentReviewDir: 'C:\\external\\reviews',
    soakReport: 'C:\\external\\soak.json',
    environment: { GITHUB_TOKEN: 'test-token', GITHUB_API_URL: 'https://attacker.example.test' },
    request,
    runGit: gitMock(),
  };
}

async function expectPublishError(action, code) {
  await assert.rejects(action, (error) => error instanceof PublishError && error.code === code);
}

async function testSuccessfulStagingNeverMutatesRef() {
  const calls = [];
  evidenceResult = { pass: true, evidenceDigest: `sha256:${'a'.repeat(64)}` };
  evidenceCalls = [];
  const result = await stageCandidateObjects(options(makeSuccessRequest(calls)));
  assert.deepEqual(result, {
    staged: true,
    candidateSha: candidate,
    expectedRemoteMainSha: parent,
    evidenceDigest: evidenceResult.evidenceDigest,
    changedPaths: ['added.txt', 'changed.sh', 'removed.txt'],
  });
  assert.deepEqual(calls.map((call) => `${call.method} ${call.path}`), [
    'GET /repos/example/atomic-publish/git/ref/heads/main',
    `GET /repos/example/atomic-publish/git/commits/${parent}`,
    `GET /repos/example/atomic-publish/git/trees/${parentTree}`,
    'GET /repos/example/atomic-publish/git/ref/heads/main',
    'POST /repos/example/atomic-publish/git/blobs',
    'POST /repos/example/atomic-publish/git/blobs',
    'POST /repos/example/atomic-publish/git/trees',
    'POST /repos/example/atomic-publish/git/commits',
  ]);
  assert.deepEqual(calls[6].body.tree, [
    { path: 'added.txt', mode: '100644', type: 'blob', sha: blobA },
    { path: 'changed.sh', mode: '100755', type: 'blob', sha: blobM },
    { path: 'removed.txt', mode: '100644', type: 'blob', sha: null },
  ]);
  assert.equal(calls.some((call) => call.method === 'PATCH'), false);
  assert.equal(calls.every((call) => call.headers.authorization === 'Bearer test-token'), true);
  assert.equal(calls.every((call) => call.url.startsWith('https://api.github.com/')), true, 'production staging must ignore GITHUB_API_URL overrides');
  assert.deepEqual(calls[7].body.author, {
    name: 'Author', email: 'author@example.test', date: '2026-01-02T03:04:05+00:00',
  });
  assert.deepEqual(calls[7].body.committer, {
    name: 'Committer', email: 'committer@example.test', date: '2026-01-02T03:04:06+00:00',
  });
  assert.deepEqual(evidenceCalls, [{
    options: {
      candidateCommit: candidate,
      independentReviewDir: 'C:\\external\\reviews',
      soakReport: 'C:\\external\\soak.json',
      minSoakSeconds: 300,
      minSoakSamples: 10,
    },
    context: { root: process.cwd() },
  }]);
}

async function testInitialParentDrift() {
  const calls = [];
  const request = makeSuccessRequest(calls);
  const drifted = async (call) => {
    if (call.method === 'GET' && call.path.endsWith('/git/ref/heads/main') && calls.length === 0) {
      calls.push(call);
      return response({ object: { type: 'commit', sha: '8'.repeat(40) } });
    }
    return request(call);
  };
  await expectPublishError(() => stageCandidateObjects(options(drifted)), 'REMOTE_REF_DRIFT');
  assert.equal(calls.length, 1);
}

async function testLocalParentDriftDoesNotCallApi() {
  const calls = [];
  const runGit = gitMock();
  const original = runGit;
  const wrongParentGit = (args, options) => {
    if (args.join(' ') === `rev-list --parents -n 1 ${candidate}`) return `${candidate} ${'8'.repeat(40)}\n`;
    return original(args, options);
  };
  await expectPublishError(() => stageCandidateObjects({ ...options(makeSuccessRequest(calls)), runGit: wrongParentGit }), 'LOCAL_PARENT_DRIFT');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'GET');
}

async function testMissingOrRejectedEvidencePreventsFirstWrite() {
  const missingCalls = [];
  const missing = options(makeSuccessRequest(missingCalls));
  delete missing.independentReviewDir;
  await expectPublishError(() => stageCandidateObjects(missing), 'MISSING_RELEASE_EVIDENCE');
  assert.equal(missingCalls.every((call) => call.method === 'GET'), true);

  const rejectedCalls = [];
  evidenceResult = { pass: false, evidenceDigest: null };
  await expectPublishError(() => stageCandidateObjects(options(makeSuccessRequest(rejectedCalls))), 'RELEASE_EVIDENCE_INVALID');
  assert.equal(rejectedCalls.every((call) => call.method === 'GET'), true);
  evidenceResult = { pass: true, evidenceDigest: `sha256:${'a'.repeat(64)}` };
}

async function testRepositoryOwnedModuleCannotUpdateRef() {
  assert.equal(Object.hasOwn(publisher, 'publishCandidate'), false);
  assert.equal(Object.hasOwn(publisher, 'updateRef'), false);
}

async function testPreWriteParentDriftPreventsObjectWrites() {
  const calls = [];
  await expectPublishError(() => stageCandidateObjects(options(makeSuccessRequest(calls, { preWriteRef: '8'.repeat(40) }))), 'REMOTE_REF_DRIFT');
  assert.equal(calls.some((call) => call.method === 'POST'), false);
}

async function testCommitShaMismatch() {
  const calls = [];
  await expectPublishError(() => stageCandidateObjects(options(makeSuccessRequest(calls, { commitSha: '9'.repeat(40) }))), 'COMMIT_SHA_MISMATCH');
  assert.equal(calls.some((call) => call.method === 'PATCH'), false);
}

async function testCreatedTreeMismatchDoesNotCreateCommitOrUpdateRef() {
  const calls = [];
  await expectPublishError(
    () => stageCandidateObjects(options(makeSuccessRequest(calls, { createdTreeSha: '8'.repeat(40) }))),
    'TREE_SHA_MISMATCH',
  );
  assert.equal(calls.some((call) => call.method === 'POST' && call.path.endsWith('/git/commits')), false);
  assert.equal(calls.some((call) => call.method === 'PATCH'), false);
}

async function testRemoteCommitAndTreeIdentityMismatch() {
  const commitCalls = [];
  await expectPublishError(
    () => stageCandidateObjects(options(makeSuccessRequest(commitCalls, { remoteCommitSha: '8'.repeat(40) }))),
    'REMOTE_PARENT_MISMATCH',
  );
  assert.equal(commitCalls.some((call) => call.method === 'POST'), false);

  const treeCalls = [];
  await expectPublishError(
    () => stageCandidateObjects(options(makeSuccessRequest(treeCalls, { remoteTreeSha: '8'.repeat(40) }))),
    'REMOTE_PARENT_MISMATCH',
  );
  assert.equal(treeCalls.some((call) => call.method === 'POST'), false);
}

async function testApiFailure() {
  const calls = [];
  const request = async (call) => {
    calls.push(call);
    return response(null, 500);
  };
  await expectPublishError(() => stageCandidateObjects(options(request)), 'GITHUB_API_FAILED');
  assert.equal(calls.length, 1);
}

async function testMutationApiFailureDoesNotUpdateRefOrLeakToken() {
  const calls = [];
  const token = 'top-secret-token-that-must-never-appear';
  const success = makeSuccessRequest(calls);
  const request = async (call) => {
    if (call.method === 'POST' && call.path.endsWith('/git/blobs')) {
      calls.push(call);
      return response({ message: token }, 403);
    }
    return success(call);
  };
  const config = options(request);
  config.environment.GITHUB_TOKEN = token;
  await assert.rejects(
    () => stageCandidateObjects(config),
    (error) => {
      assert.equal(error instanceof PublishError, true);
      assert.equal(error.code, 'GITHUB_API_FAILED');
      assert.equal(error.message.includes(token), false);
      return true;
    },
  );
  assert.equal(calls.some((call) => call.method === 'PATCH'), false);
}

(async () => {
  await testSuccessfulStagingNeverMutatesRef();
  await testInitialParentDrift();
  await testLocalParentDriftDoesNotCallApi();
  await testMissingOrRejectedEvidencePreventsFirstWrite();
  await testRepositoryOwnedModuleCannotUpdateRef();
  await testPreWriteParentDriftPreventsObjectWrites();
  await testCommitShaMismatch();
  await testCreatedTreeMismatchDoesNotCreateCommitOrUpdateRef();
  await testRemoteCommitAndTreeIdentityMismatch();
  await testApiFailure();
  await testMutationApiFailureDoesNotUpdateRefOrLeakToken();
  console.log('github-git-data-atomic-publish tests passed');
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
