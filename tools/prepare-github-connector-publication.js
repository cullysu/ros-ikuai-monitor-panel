#!/usr/bin/env node
'use strict';

// This module only inspects local Git objects.  It deliberately has no HTTP
// client, credential handling, ref updates, index changes, or worktree writes.
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { TextDecoder } = require('node:util');

const SHA_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i;
const MAX_GIT_OUTPUT_BYTES = 16 * 1024 * 1024;
const DEFAULT_MAX_BLOB_BYTES = 8 * 1024 * 1024;
const DEFAULT_CHUNK_BYTES = 256 * 1024;
const MAX_BLOB_BYTES = 64 * 1024 * 1024;
const MAX_CHUNK_BYTES = 1024 * 1024;
const MAX_CHANGED_PATHS = 10000;
const utf8 = new TextDecoder('utf-8', { fatal: true });

class PublicationPlanError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PublicationPlanError';
    this.code = code;
  }
}

function asBuffer(value) {
  return Buffer.isBuffer(value) ? value : Buffer.from(String(value || ''), 'utf8');
}

function decodeUtf8(value, code, message) {
  try {
    return utf8.decode(asBuffer(value));
  } catch {
    throw new PublicationPlanError(code, message);
  }
}

function defaultRunGit(args, options) {
  return execFileSync('git', args, {
    cwd: options.cwd,
    encoding: 'buffer',
    maxBuffer: options.maxBuffer || MAX_GIT_OUTPUT_BYTES,
    windowsHide: true,
  });
}

function gitBuffer(runGit, cwd, args, maxBuffer = MAX_GIT_OUTPUT_BYTES) {
  try {
    return asBuffer(runGit(args, { cwd, encoding: 'buffer', maxBuffer }));
  } catch (error) {
    if (error instanceof PublicationPlanError) throw error;
    throw new PublicationPlanError('GIT_READ_FAILED', `Local Git could not read ${args[0] || 'the requested object'}.`);
  }
}

function gitText(runGit, cwd, args, maxBuffer) {
  return decodeUtf8(gitBuffer(runGit, cwd, args, maxBuffer), 'GIT_OUTPUT_INVALID_UTF8', 'Local Git returned invalid UTF-8 metadata.');
}

function boundedPositiveInteger(value, fallback, maximum, label) {
  const result = value === undefined ? fallback : Number(value);
  if (!Number.isSafeInteger(result) || result <= 0 || result > maximum) {
    throw new PublicationPlanError('INVALID_INPUT', `${label} must be a positive integer no larger than ${maximum}.`);
  }
  return result;
}

function requireSha(value, label) {
  const sha = String(value || '').trim().toLowerCase();
  if (!SHA_PATTERN.test(sha)) throw new PublicationPlanError('LOCAL_OBJECT_INVALID', `${label} is not a supported Git object SHA.`);
  return sha;
}

function resolveCommit(runGit, cwd, value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new PublicationPlanError('INVALID_INPUT', `${label} is required.`);
  }
  return requireSha(gitText(runGit, cwd, ['rev-parse', '--verify', `${value.trim()}^{commit}`], 1024 * 1024).trim(), label);
}

function safeGitPath(value) {
  if (typeof value !== 'string' || !value || value.includes('\0') || value.includes('\\') || value.startsWith('/') || /^[A-Za-z]:/.test(value)) {
    throw new PublicationPlanError('UNSAFE_PATH', 'Candidate contains an unsafe repository path.');
  }
  const parts = value.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..')) {
    throw new PublicationPlanError('UNSAFE_PATH', 'Candidate contains an unsafe repository path.');
  }
  return value;
}

function parseNulFields(buffer, code, message) {
  const fields = [];
  let start = 0;
  for (let index = 0; index < buffer.length; index += 1) {
    if (buffer[index] === 0) {
      fields.push(decodeUtf8(buffer.subarray(start, index), code, message));
      start = index + 1;
    }
  }
  if (start !== buffer.length) throw new PublicationPlanError(code, message);
  return fields;
}

function readSingleParent(runGit, cwd, candidateSha, baseSha) {
  const fields = gitText(runGit, cwd, ['rev-list', '--parents', '-n', '1', candidateSha], 1024 * 1024).trim().split(/\s+/);
  if (fields.length !== 2 || requireSha(fields[0], 'Candidate SHA') !== candidateSha) {
    throw new PublicationPlanError('CANDIDATE_NOT_SINGLE_PARENT', 'Candidate must be a commit with exactly one parent.');
  }
  const parentSha = requireSha(fields[1], 'Candidate parent SHA');
  if (parentSha !== baseSha) {
    throw new PublicationPlanError('CANDIDATE_IDENTITY_MISMATCH', 'Candidate parent does not equal the requested base commit.');
  }
  return parentSha;
}

function readCandidateMetadata(runGit, cwd, candidateSha, parentSha) {
  const fields = gitText(
    runGit,
    cwd,
    ['show', '-s', '--format=%an%x00%ae%x00%aI%x00%cn%x00%ce%x00%cI', candidateSha],
    1024 * 1024
  ).replace(/\r?\n$/, '').split('\0');
  if (fields.length !== 6 || fields.some((field) => !field)) {
    throw new PublicationPlanError('LOCAL_COMMIT_INVALID', 'Candidate author or committer metadata is incomplete.');
  }
  return Object.freeze({
    sha: candidateSha,
    parentSha,
    treeSha: requireSha(gitText(runGit, cwd, ['show', '-s', '--format=%T', candidateSha], 1024 * 1024).trim(), 'Candidate tree SHA'),
    message: gitText(runGit, cwd, ['log', '-1', '--format=%B', candidateSha], MAX_GIT_OUTPUT_BYTES),
    author: Object.freeze({ name: fields[0], email: fields[1], date: fields[2] }),
    committer: Object.freeze({ name: fields[3], email: fields[4], date: fields[5] }),
  });
}

function readChanges(runGit, cwd, baseSha, candidateSha) {
  const fields = parseNulFields(
    gitBuffer(runGit, cwd, ['diff-tree', '--no-commit-id', '--no-renames', '--name-status', '-r', '-z', baseSha, candidateSha]),
    'LOCAL_COMMIT_INVALID',
    'Candidate diff is not valid UTF-8 NUL-delimited data.'
  );
  if (fields.length % 2 !== 0) {
    throw new PublicationPlanError('LOCAL_COMMIT_INVALID', 'Candidate diff has an incomplete change record.');
  }
  const changes = [];
  for (let index = 0; index < fields.length; index += 2) {
    if (!/^[AMD]$/.test(fields[index])) {
      throw new PublicationPlanError('LOCAL_COMMIT_INVALID', 'Candidate diff must contain only add, modify, and delete records.');
    }
    changes.push(Object.freeze({ status: fields[index], path: safeGitPath(fields[index + 1]) }));
  }
  if (changes.length > MAX_CHANGED_PATHS) {
    throw new PublicationPlanError('CHANGE_SET_TOO_LARGE', `Candidate changes exceed the ${MAX_CHANGED_PATHS} path limit.`);
  }
  changes.sort((left, right) => Buffer.compare(Buffer.from(left.path, 'utf8'), Buffer.from(right.path, 'utf8')));
  if (new Set(changes.map((change) => change.path)).size !== changes.length) {
    throw new PublicationPlanError('LOCAL_COMMIT_INVALID', 'Candidate diff contains duplicate paths.');
  }
  return changes;
}

function readTreeEntry(runGit, cwd, commitSha, filePath) {
  const record = gitBuffer(runGit, cwd, ['ls-tree', '-z', commitSha, '--', filePath], 1024 * 1024);
  const fields = parseNulFields(record, 'LOCAL_COMMIT_INVALID', 'Git tree entry is invalid.');
  if (fields.length !== 1) throw new PublicationPlanError('LOCAL_COMMIT_INVALID', 'Git tree entry is incomplete.');
  const tab = fields[0].indexOf('\t');
  const header = tab < 0 ? '' : fields[0].slice(0, tab);
  const entryPath = tab < 0 ? '' : fields[0].slice(tab + 1);
  const match = /^(100644|100755|120000) (blob) ((?:[0-9a-f]{40}|[0-9a-f]{64}))$/i.exec(header);
  if (!match || entryPath !== filePath) throw new PublicationPlanError('LOCAL_COMMIT_INVALID', `Unable to read tree entry for ${filePath}.`);
  return Object.freeze({ mode: match[1], type: match[2], localBlobSha: match[3].toLowerCase() });
}

function readBlobSize(runGit, cwd, sha, maxBlobBytes) {
  const value = gitText(runGit, cwd, ['cat-file', '-s', sha], 1024 * 1024).trim();
  const size = Number(value);
  if (!Number.isSafeInteger(size) || size < 0) throw new PublicationPlanError('LOCAL_OBJECT_INVALID', 'Git blob size is invalid.');
  if (size > maxBlobBytes) throw new PublicationPlanError('BLOB_TOO_LARGE', `Git blob exceeds the configured ${maxBlobBytes}-byte limit.`);
  return size;
}

function assertSafeSymlink(runGit, cwd, filePath, entry, size, maxBlobBytes) {
  if (entry.mode !== '120000') return;
  if (size > 4096 || size > maxBlobBytes) throw new PublicationPlanError('UNSAFE_SYMLINK', 'Symbolic link target exceeds the safety limit.');
  const target = decodeUtf8(gitBuffer(runGit, cwd, ['cat-file', 'blob', entry.localBlobSha], size + 1024), 'UNSAFE_SYMLINK', 'Symbolic link target must be UTF-8.');
  if (!target || target.includes('\0') || target.includes('\\') || target.startsWith('/') || /^[A-Za-z]:/.test(target)) {
    throw new PublicationPlanError('UNSAFE_SYMLINK', 'Symbolic link target is unsafe.');
  }
  const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(filePath), target));
  if (resolved === '..' || resolved.startsWith('../') || resolved.startsWith('/')) {
    throw new PublicationPlanError('UNSAFE_SYMLINK', 'Symbolic link target escapes the repository.');
  }
}

function makeContentHint(size, chunkBytes) {
  return Object.freeze({
    encodings: Object.freeze(['base64', 'utf8-if-valid']),
    maxChunkBytes: chunkBytes,
    chunkCount: Math.max(1, Math.ceil(size / chunkBytes)),
    byteRange: '[offset, offset + length)',
  });
}

function collectEntries(runGit, cwd, changes, baseSha, candidateSha, maxBlobBytes, chunkBytes) {
  return Object.freeze(changes.map((change) => {
    const sourceSha = change.status === 'D' ? baseSha : candidateSha;
    const entry = readTreeEntry(runGit, cwd, sourceSha, change.path);
    const size = readBlobSize(runGit, cwd, entry.localBlobSha, maxBlobBytes);
    assertSafeSymlink(runGit, cwd, change.path, entry, size, maxBlobBytes);
    return Object.freeze({
      status: change.status,
      path: change.path,
      mode: entry.mode,
      type: entry.type,
      localBlobSha: entry.localBlobSha,
      size,
      content: change.status === 'D' ? null : makeContentHint(size, chunkBytes),
    });
  }));
}

function createChunkReader(runGit, cwd, entries, maxBlobBytes, chunkBytes) {
  const byPath = new Map(entries.filter((entry) => entry.status !== 'D').map((entry) => [entry.path, entry]));
  return Object.freeze(({ path: filePath, offset = 0, length } = {}) => {
    const entry = byPath.get(filePath);
    if (!entry) throw new PublicationPlanError('UNKNOWN_BLOB_PATH', 'Chunk extraction path is not a non-deleted candidate blob.');
    const safeOffset = Number(offset);
    const safeLength = length === undefined ? Math.min(chunkBytes, entry.size - safeOffset) : Number(length);
    if (!Number.isSafeInteger(safeOffset) || safeOffset < 0 || safeOffset >= entry.size || !Number.isSafeInteger(safeLength) || safeLength <= 0 || safeLength > chunkBytes || safeOffset + safeLength > entry.size) {
      if (entry.size === 0 && safeOffset === 0 && safeLength === 0) {
        return Object.freeze({ path: entry.path, offset: 0, length: 0, nextOffset: null, base64: '', utf8: '' });
      }
      throw new PublicationPlanError('INVALID_CHUNK_RANGE', 'Chunk range must be a bounded range within the blob.');
    }
    const blob = gitBuffer(runGit, cwd, ['cat-file', 'blob', entry.localBlobSha], Math.min(maxBlobBytes + 1024, MAX_BLOB_BYTES + 1024));
    if (blob.length !== entry.size || blob.length > maxBlobBytes) throw new PublicationPlanError('LOCAL_OBJECT_CHANGED', 'Local Git blob no longer matches the prepared manifest.');
    const chunk = blob.subarray(safeOffset, safeOffset + safeLength);
    let text = null;
    try { text = utf8.decode(chunk); } catch { /* binary chunks intentionally omit UTF-8 text */ }
    return Object.freeze({
      path: entry.path,
      offset: safeOffset,
      length: chunk.length,
      nextOffset: safeOffset + chunk.length < entry.size ? safeOffset + chunk.length : null,
      base64: chunk.toString('base64'),
      utf8: text,
    });
  });
}

function resolveCandidate({ candidateCommit, candidateWorktree, cwd, runGit }) {
  if (candidateCommit && candidateWorktree) throw new PublicationPlanError('INVALID_INPUT', 'Provide either candidateCommit or candidateWorktree, not both.');
  if (candidateWorktree) {
    const root = path.resolve(candidateWorktree);
    const candidateSha = resolveCommit(runGit, root, 'HEAD', 'Candidate worktree HEAD');
    const status = gitBuffer(runGit, root, ['status', '--porcelain=v1', '-z'], MAX_GIT_OUTPUT_BYTES);
    if (status.length !== 0) throw new PublicationPlanError('CANDIDATE_WORKTREE_DIRTY', 'Candidate worktree must be clean and match its HEAD commit.');
    return { cwd: root, candidateSha };
  }
  return { cwd, candidateSha: resolveCommit(runGit, cwd, candidateCommit, 'Candidate commit') };
}

function prepareGitHubConnectorPublication({
  baseRef,
  candidateCommit,
  candidateWorktree,
  cwd = process.cwd(),
  maxBlobBytes = DEFAULT_MAX_BLOB_BYTES,
  chunkBytes = DEFAULT_CHUNK_BYTES,
  runGit = defaultRunGit,
} = {}) {
  const boundedBlobBytes = boundedPositiveInteger(maxBlobBytes, DEFAULT_MAX_BLOB_BYTES, MAX_BLOB_BYTES, 'maxBlobBytes');
  const boundedChunkBytes = boundedPositiveInteger(chunkBytes, DEFAULT_CHUNK_BYTES, Math.min(MAX_CHUNK_BYTES, boundedBlobBytes), 'chunkBytes');
  const candidate = resolveCandidate({ candidateCommit, candidateWorktree, cwd, runGit });
  const baseSha = resolveCommit(runGit, candidate.cwd, baseRef, 'Base ref');
  const parentSha = readSingleParent(runGit, candidate.cwd, candidate.candidateSha, baseSha);
  const baseTreeSha = requireSha(gitText(runGit, candidate.cwd, ['show', '-s', '--format=%T', baseSha], 1024 * 1024).trim(), 'Base tree SHA');
  const candidateMetadata = readCandidateMetadata(runGit, candidate.cwd, candidate.candidateSha, parentSha);
  const entries = collectEntries(runGit, candidate.cwd, readChanges(runGit, candidate.cwd, baseSha, candidate.candidateSha), baseSha, candidate.candidateSha, boundedBlobBytes, boundedChunkBytes);
  const manifest = {
    schema: 'github-connector-publication-plan-v1',
    base: Object.freeze({ ref: baseRef, sha: baseSha, treeSha: baseTreeSha }),
    candidate: candidateMetadata,
    changes: entries,
    targetTreeEntries: Object.freeze(entries.map((entry) => Object.freeze({
      path: entry.path,
      mode: entry.mode,
      type: entry.type,
      sha: entry.status === 'D' ? null : entry.localBlobSha,
    }))),
  };
  Object.defineProperty(manifest, 'readBlobChunk', {
    enumerable: false,
    value: createChunkReader(runGit, candidate.cwd, entries, boundedBlobBytes, boundedChunkBytes),
  });
  return Object.freeze(manifest);
}

function parseArgs(argv) {
  const [baseRef, candidate, worktree, ...rest] = argv;
  if (!baseRef || !candidate || rest.length !== 0) {
    throw new PublicationPlanError('INVALID_INPUT', 'Usage: node tools/prepare-github-connector-publication.js <base-ref-or-commit> <candidate-commit> | <base-ref-or-commit> --candidate-worktree <path>');
  }
  if (candidate === '--candidate-worktree') {
    if (!worktree) throw new PublicationPlanError('INVALID_INPUT', 'The --candidate-worktree option requires a path.');
    return { baseRef, candidateWorktree: worktree };
  }
  if (worktree) throw new PublicationPlanError('INVALID_INPUT', 'Candidate commit form accepts exactly two arguments.');
  return { baseRef, candidateCommit: candidate };
}

if (require.main === module) {
  try {
    process.stdout.write(`${JSON.stringify(prepareGitHubConnectorPublication(parseArgs(process.argv.slice(2))), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof PublicationPlanError ? `${error.code}: ${error.message}` : 'UNEXPECTED_ERROR: Unable to prepare publication manifest.'}\n`);
    process.exitCode = 1;
  }
}

module.exports = { PublicationPlanError, prepareGitHubConnectorPublication };
