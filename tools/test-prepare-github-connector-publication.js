#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const { PublicationPlanError, prepareGitHubConnectorPublication } = require('./prepare-github-connector-publication');

const base = '1'.repeat(40);
const candidate = '2'.repeat(40);
const baseTree = '3'.repeat(40);
const candidateTree = '4'.repeat(40);
const blobs = {
  a: '5'.repeat(40), empty: '6'.repeat(40), executable: '7'.repeat(40), deleted: '8'.repeat(40), compressed: '9'.repeat(40), link: 'a'.repeat(40),
};
const data = {
  [blobs.a]: Buffer.from('alpha', 'utf8'),
  [blobs.empty]: Buffer.alloc(0),
  [blobs.executable]: Buffer.from('#!/bin/sh\n', 'utf8'),
  [blobs.deleted]: Buffer.from('old', 'utf8'),
  [blobs.compressed]: Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0xff, 0x00]),
  [blobs.link]: Buffer.from('../../outside', 'utf8'),
};
const definitions = {
  'a.txt': ['M', '100644', blobs.a],
  'empty.txt': ['A', '100644', blobs.empty],
  'run.sh': ['M', '100755', blobs.executable],
  'removed.txt': ['D', '100644', blobs.deleted],
  'assets/bundle.gz': ['A', '100644', blobs.compressed],
};

function output(value) { return Buffer.isBuffer(value) ? value : Buffer.from(value); }

function gitMock({ dirty = false, link = false } = {}) {
  const calls = [];
  const active = link ? { 'safe-link': ['A', '120000', blobs.link] } : definitions;
  const runGit = (args, options) => {
    calls.push({ args, options });
    const key = args.join(' ');
    if (key === `rev-parse --verify main^{commit}`) return output(`${base}\n`);
    if (key === `rev-parse --verify ${candidate}^{commit}` || key === 'rev-parse --verify HEAD^{commit}') return output(`${candidate}\n`);
    if (key === `rev-list --parents -n 1 ${candidate}`) return output(`${candidate} ${base}\n`);
    if (key === `show -s --format=%T ${base}`) return output(`${baseTree}\n`);
    if (key === `show -s --format=%T ${candidate}`) return output(`${candidateTree}\n`);
    if (key === `show -s --format=%an%x00%ae%x00%aI%x00%cn%x00%ce%x00%cI ${candidate}`) {
      return output(['Author', 'author@example.test', '2026-01-02T03:04:05+00:00', 'Committer', 'committer@example.test', '2026-01-02T03:04:06+00:00'].join('\0') + '\n');
    }
    if (key === `log -1 --format=%B ${candidate}`) return output('fixture candidate\n');
    if (key === `diff-tree --no-commit-id --no-renames --name-status -r -z ${base} ${candidate}`) {
      return output(`${Object.entries(active).reverse().flatMap(([file, [status]]) => [status, file]).join('\0')}\0`);
    }
    if (key === 'status --porcelain=v1 -z') return output(dirty ? ' M tracked.txt\0' : '');
    if (args[0] === 'ls-tree') {
      const file = args[args.length - 1];
      const [, mode, sha] = active[file];
      return output(`${mode} blob ${sha}\t${file}\0`);
    }
    if (args[0] === 'cat-file' && args[1] === '-s') return output(`${data[args[2]].length}\n`);
    if (args[0] === 'cat-file' && args[1] === 'blob') return data[args[2]];
    throw new Error(`Unexpected git command: ${key}`);
  };
  return { runGit, calls };
}

function makePlan(options = {}) {
  const mock = gitMock(options);
  return { manifest: prepareGitHubConnectorPublication({ baseRef: 'main', candidateCommit: candidate, chunkBytes: 4, maxBlobBytes: 64, runGit: mock.runGit, cwd: 'C:\\fixture' }), mock };
}

function testManifestIncludesAllGitDataEntriesDeterministically() {
  const first = makePlan().manifest;
  const second = makePlan().manifest;
  assert.equal(JSON.stringify(first), JSON.stringify(second), 'manifest JSON must not depend on traversal order');
  assert.equal(first.base.treeSha, baseTree);
  assert.deepEqual(first.candidate, {
    sha: candidate, parentSha: base, treeSha: candidateTree, message: 'fixture candidate\n',
    author: { name: 'Author', email: 'author@example.test', date: '2026-01-02T03:04:05+00:00' },
    committer: { name: 'Committer', email: 'committer@example.test', date: '2026-01-02T03:04:06+00:00' },
  });
  assert.deepEqual(first.changes.map((entry) => entry.path), ['a.txt', 'assets/bundle.gz', 'empty.txt', 'removed.txt', 'run.sh']);
  assert.deepEqual(first.targetTreeEntries.map((entry) => entry.path), ['a.txt', 'assets/bundle.gz', 'empty.txt', 'removed.txt', 'run.sh']);
  assert.equal(first.changes.find((entry) => entry.path === 'run.sh').mode, '100755');
  assert.equal(first.changes.find((entry) => entry.path === 'empty.txt').size, 0);
  assert.equal(first.changes.find((entry) => entry.path === 'assets/bundle.gz').content.chunkCount, 2);
  assert.deepEqual(first.targetTreeEntries.find((entry) => entry.path === 'removed.txt'), { path: 'removed.txt', mode: '100644', type: 'blob', sha: null });
}

function testBoundedBinaryAndEmptyExtraction() {
  const { manifest, mock } = makePlan();
  const text = manifest.readBlobChunk({ path: 'a.txt', offset: 0, length: 4 });
  assert.deepEqual(text, { path: 'a.txt', offset: 0, length: 4, nextOffset: 4, base64: 'YWxwaA==', utf8: 'alph' });
  const binary = manifest.readBlobChunk({ path: 'assets/bundle.gz', offset: 0, length: 4 });
  assert.equal(binary.base64, data[blobs.compressed].subarray(0, 4).toString('base64'));
  assert.equal(binary.utf8, null, 'compressed bytes must not be presented as UTF-8');
  const empty = manifest.readBlobChunk({ path: 'empty.txt', offset: 0, length: 0 });
  assert.deepEqual(empty, { path: 'empty.txt', offset: 0, length: 0, nextOffset: null, base64: '', utf8: '' });
  const blobReads = mock.calls.filter((call) => call.args[0] === 'cat-file' && call.args[1] === 'blob');
  assert(blobReads.every((call) => call.options.maxBuffer <= 1088), 'blob extraction must retain a fixed byte bound');
  assert.throws(() => manifest.readBlobChunk({ path: 'removed.txt', offset: 0, length: 1 }), (error) => error instanceof PublicationPlanError && error.code === 'UNKNOWN_BLOB_PATH');
}

function testRejectsDirtyWorktreeAndEscapingSymlink() {
  const dirty = gitMock({ dirty: true });
  assert.throws(
    () => prepareGitHubConnectorPublication({ baseRef: 'main', candidateWorktree: 'C:\\candidate', runGit: dirty.runGit }),
    (error) => error instanceof PublicationPlanError && error.code === 'CANDIDATE_WORKTREE_DIRTY'
  );
  const escaping = gitMock({ link: true });
  assert.throws(
    () => prepareGitHubConnectorPublication({ baseRef: 'main', candidateCommit: candidate, runGit: escaping.runGit }),
    (error) => error instanceof PublicationPlanError && error.code === 'UNSAFE_SYMLINK'
  );
}

testManifestIncludesAllGitDataEntriesDeterministically();
testBoundedBinaryAndEmptyExtraction();
testRejectsDirtyWorktreeAndEscapingSymlink();
console.log('[prepare-github-connector-publication] PASS deterministic Git Data manifest and bounded blob extraction');
