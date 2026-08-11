#!/usr/bin/env node
'use strict';

const { execFileSync } = require('node:child_process');
const {
  DEFAULT_MIN_SOAK_SAMPLES,
  DEFAULT_MIN_SOAK_SECONDS,
  inspectReleaseCandidateEvidence,
} = require('./check-release-candidate-evidence');

// GitHub's Git Data API currently addresses repository objects by their
// canonical 40-character SHA-1.  Accepting abbreviated or arbitrary-length
// values would weaken the exact-candidate/parent contract this tool enforces.
const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const API_VERSION = '2022-11-28';
const GITHUB_API_BASE = 'https://api.github.com';

class PublishError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PublishError';
    this.code = code;
  }
}

function requireSha(value, label) {
  const sha = String(value || '').trim();
  if (!SHA_PATTERN.test(sha)) {
    throw new PublishError('INVALID_INPUT', `${label} must be a Git object SHA.`);
  }
  return sha.toLowerCase();
}

function requireRepository(value) {
  const repository = String(value || '').trim();
  if (!/^[^/\s]+\/[^/\s]+$/.test(repository)) {
    throw new PublishError('INVALID_INPUT', 'GITHUB_REPOSITORY must be an owner/repository value.');
  }
  return repository;
}

function requireEvidencePaths(independentReviewDir, soakReport) {
  if (typeof independentReviewDir !== 'string' || !independentReviewDir.trim()) {
    throw new PublishError('MISSING_RELEASE_EVIDENCE', 'An external independent review directory is required before publication.');
  }
  if (typeof soakReport !== 'string' || !soakReport.trim()) {
    throw new PublishError('MISSING_RELEASE_EVIDENCE', 'An external RouterOS soak report is required before publication.');
  }
}

function asText(value) {
  return Buffer.isBuffer(value) ? value.toString('utf8') : String(value);
}

function defaultRunGit(args, options) {
  return execFileSync('git', args, {
    cwd: options.cwd,
    encoding: options.encoding || 'utf8',
    maxBuffer: 1024 * 1024 * 1024,
  });
}

function gitText(runGit, cwd, args) {
  return asText(runGit(args, { cwd, encoding: 'utf8' }));
}

function gitBuffer(runGit, cwd, args) {
  const value = runGit(args, { cwd, encoding: 'buffer' });
  return Buffer.isBuffer(value) ? value : Buffer.from(value);
}

function readSingleParent(runGit, cwd, candidateSha) {
  const fields = gitText(runGit, cwd, ['rev-list', '--parents', '-n', '1', candidateSha]).trim().split(/\s+/);
  if (fields.length !== 2 || fields[0].toLowerCase() !== candidateSha) {
    throw new PublishError('LOCAL_COMMIT_INVALID', 'Candidate must be a non-merge commit with exactly one parent.');
  }
  return requireSha(fields[1], 'Candidate parent SHA');
}

function readIdentity(runGit, cwd, candidateSha) {
  const separator = '\u0000';
  const fields = gitText(runGit, cwd, [
    'show', '-s', '--format=%an%x00%ae%x00%aI%x00%cn%x00%ce%x00%cI', candidateSha,
  ]).trimEnd().split(separator);
  if (fields.length !== 6 || fields.some((field) => !field)) {
    throw new PublishError('LOCAL_COMMIT_INVALID', 'Candidate author or committer metadata is incomplete.');
  }
  return {
    author: { name: fields[0], email: fields[1], date: fields[2] },
    committer: { name: fields[3], email: fields[4], date: fields[5] },
  };
}

function readTreeEntry(runGit, cwd, commitSha, filePath) {
  const output = gitBuffer(runGit, cwd, ['ls-tree', '-z', commitSha, '--', filePath]);
  const record = output.toString('utf8').split('\u0000')[0];
  const match = /^(\d+) ([a-z]+) ([0-9a-f]{40,64})\t([\s\S]+)$/i.exec(record);
  if (!match || match[4] !== filePath) {
    throw new PublishError('LOCAL_COMMIT_INVALID', `Unable to read tree entry for ${filePath}.`);
  }
  if (!/^(100644|100755|120000)$/.test(match[1])) {
    throw new PublishError('UNSUPPORTED_CHANGE', `Unsupported blob mode for ${filePath}.`);
  }
  return { mode: match[1], type: match[2], sha: match[3].toLowerCase(), path: match[4] };
}

function readChanges(runGit, cwd, parentSha, candidateSha) {
  const output = gitBuffer(runGit, cwd, [
    'diff-tree', '--no-commit-id', '--no-renames', '--name-status', '-r', '-z', parentSha, candidateSha,
  ]);
  // With --name-status -z Git writes alternating status and pathname fields,
  // not the human-readable "A<TAB>path" form.  Parsing the NUL protocol keeps
  // spaces, tabs, and newlines in paths intact and rejects rename/copy pairs.
  const fields = output.toString('utf8').split('\u0000');
  if (fields[fields.length - 1] === '') fields.pop();
  if (fields.length % 2 !== 0) {
    throw new PublishError('LOCAL_COMMIT_INVALID', 'Candidate diff has an incomplete NUL-delimited change record.');
  }
  const changes = [];
  for (let index = 0; index < fields.length; index += 2) {
    const status = fields[index];
    const filePath = fields[index + 1];
    if (!/^[AMD]$/.test(status) || !filePath) {
      throw new PublishError('LOCAL_COMMIT_INVALID', 'Candidate diff must contain only add, modify, or delete file changes.');
    }
    changes.push({ status, path: filePath });
  }
  return changes;
}

function collectCandidateCommit(runGit, cwd, candidateSha, parentSha) {
  const changes = readChanges(runGit, cwd, parentSha, candidateSha);
  const entries = changes.map((change) => {
    const entry = readTreeEntry(runGit, cwd, change.status === 'D' ? parentSha : candidateSha, change.path);
    if (entry.type !== 'blob') {
      throw new PublishError('UNSUPPORTED_CHANGE', `Only blob changes are supported: ${change.path}.`);
    }
    return { ...change, ...entry };
  });
  return {
    parentTreeSha: requireSha(gitText(runGit, cwd, ['show', '-s', '--format=%T', parentSha]).trim(), 'Parent tree SHA'),
    candidateTreeSha: requireSha(gitText(runGit, cwd, ['show', '-s', '--format=%T', candidateSha]).trim(), 'Candidate tree SHA'),
    identity: readIdentity(runGit, cwd, candidateSha),
    message: gitText(runGit, cwd, ['log', '-1', '--format=%B', candidateSha]),
    entries,
    readBlob(sha) {
      return gitBuffer(runGit, cwd, ['cat-file', 'blob', sha]);
    },
  };
}

async function defaultRequest({ method, url, headers, body }) {
  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new PublishError('GITHUB_API_FAILED', `GitHub API transport failed during ${method}.`);
  }

  let json = null;
  try {
    json = await response.json();
  } catch {
    // The status still determines success; error response bodies are deliberately not surfaced.
  }
  return { status: response.status, json };
}

async function githubApi(request, context, method, path, body) {
  let result;
  try {
    result = await request({
      method,
      path,
      url: `${context.apiBase}${path}`,
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${context.token}`,
        'x-github-api-version': API_VERSION,
        'user-agent': 'github-git-data-atomic-publish',
      },
      body,
    });
  } catch (error) {
    if (error instanceof PublishError) throw error;
    throw new PublishError('GITHUB_API_FAILED', `GitHub API request failed during ${method} ${path}.`);
  }
  if (!result || result.status < 200 || result.status >= 300 || !result.json) {
    throw new PublishError('GITHUB_API_FAILED', `GitHub API returned an unsuccessful response during ${method} ${path}.`);
  }
  return result.json;
}

async function readRemoteRef(request, context) {
  const ref = await githubApi(request, context, 'GET', `/repos/${context.repository}/git/ref/heads/main`);
  const sha = requireSha(ref && ref.object && ref.object.sha, 'Remote main SHA');
  if (ref.object.type !== 'commit') {
    throw new PublishError('REMOTE_REF_INVALID', 'Remote main must reference a commit.');
  }
  return sha;
}

// This repository-owned module may create the candidate Git objects, but it
// deliberately cannot mutate refs.  Promotion is owned by the fixed external
// controller, which revalidates its signed acceptance record and performs the
// only force:false ref update.
async function stageCandidateObjects({
  candidateSha,
  expectedRemoteMainSha,
  repository,
  independentReviewDir,
  soakReport,
  minSoakSeconds = DEFAULT_MIN_SOAK_SECONDS,
  minSoakSamples = DEFAULT_MIN_SOAK_SAMPLES,
  cwd = process.cwd(),
  environment = process.env,
  request = defaultRequest,
  runGit = defaultRunGit,
} = {}) {
  const candidate = requireSha(candidateSha, 'Candidate SHA');
  const expected = requireSha(expectedRemoteMainSha, 'Expected remote main SHA');
  const token = String(environment.GITHUB_TOKEN || '').trim();
  if (!token) throw new PublishError('MISSING_TOKEN', 'GITHUB_TOKEN is required.');
  const context = {
    token,
    repository: requireRepository(repository || environment.GITHUB_REPOSITORY),
    // This publisher handles a repository fixed to github.com.  Do not inherit
    // GITHUB_API_URL here: a caller-controlled endpoint would receive the
    // contents-write token used to stage the candidate objects.
    apiBase: GITHUB_API_BASE,
  };

  const parent = readSingleParent(runGit, cwd, candidate);
  const initialRemote = await readRemoteRef(request, context);
  if (initialRemote !== expected) {
    throw new PublishError('REMOTE_REF_DRIFT', 'Remote main changed before publish began.');
  }
  if (parent !== initialRemote) {
    throw new PublishError('LOCAL_PARENT_DRIFT', 'Candidate parent does not match the freshly read remote main SHA.');
  }

  requireEvidencePaths(independentReviewDir, soakReport);
  const releaseEvidence = inspectReleaseCandidateEvidence({
    candidateCommit: candidate,
    independentReviewDir,
    soakReport,
    minSoakSeconds,
    minSoakSamples,
  }, { root: cwd });
  if (!releaseEvidence.pass || !releaseEvidence.evidenceDigest) {
    throw new PublishError('RELEASE_EVIDENCE_INVALID', 'Candidate release evidence did not pass independent review and RouterOS soak verification.');
  }
  const local = collectCandidateCommit(runGit, cwd, candidate, parent);
  const remoteCommit = await githubApi(request, context, 'GET', `/repos/${context.repository}/git/commits/${expected}`);
  const remoteCommitSha = requireSha(remoteCommit && remoteCommit.sha, 'Remote commit SHA');
  if (remoteCommitSha !== expected) {
    throw new PublishError('REMOTE_PARENT_MISMATCH', 'GitHub returned a different commit for the expected remote parent.');
  }
  const remoteTreeSha = requireSha(remoteCommit && remoteCommit.tree && remoteCommit.tree.sha, 'Remote commit tree SHA');
  if (remoteTreeSha !== local.parentTreeSha) {
    throw new PublishError('REMOTE_PARENT_MISMATCH', 'Remote parent tree differs from the local candidate parent tree.');
  }
  const remoteTree = await githubApi(request, context, 'GET', `/repos/${context.repository}/git/trees/${remoteTreeSha}`);
  if (requireSha(remoteTree && remoteTree.sha, 'Remote tree SHA') !== remoteTreeSha) {
    throw new PublishError('REMOTE_PARENT_MISMATCH', 'GitHub returned a different tree for the expected remote parent.');
  }

  const beforeObjectWrites = await readRemoteRef(request, context);
  if (beforeObjectWrites !== expected) {
    throw new PublishError('REMOTE_REF_DRIFT', 'Remote main changed before GitHub object creation began.');
  }

  const treeEntries = [];
  for (const entry of local.entries) {
    if (entry.status === 'D') {
      treeEntries.push({ path: entry.path, mode: entry.mode, type: 'blob', sha: null });
      continue;
    }
    const blob = await githubApi(request, context, 'POST', `/repos/${context.repository}/git/blobs`, {
      content: local.readBlob(entry.sha).toString('base64'),
      encoding: 'base64',
    });
    const uploadedSha = requireSha(blob.sha, `Uploaded blob SHA for ${entry.path}`);
    if (uploadedSha !== entry.sha) {
      throw new PublishError('BLOB_SHA_MISMATCH', `GitHub returned a different blob SHA for ${entry.path}.`);
    }
    treeEntries.push({ path: entry.path, mode: entry.mode, type: 'blob', sha: uploadedSha });
  }

  const createdTree = await githubApi(request, context, 'POST', `/repos/${context.repository}/git/trees`, {
    base_tree: remoteTreeSha,
    tree: treeEntries,
  });
  const createdTreeSha = requireSha(createdTree.sha, 'Created tree SHA');
  if (createdTreeSha !== local.candidateTreeSha) {
    throw new PublishError('TREE_SHA_MISMATCH', 'GitHub created a tree different from the local candidate tree.');
  }

  const createdCommit = await githubApi(request, context, 'POST', `/repos/${context.repository}/git/commits`, {
    message: local.message,
    tree: createdTreeSha,
    parents: [expected],
    author: local.identity.author,
    committer: local.identity.committer,
  });
  const createdCommitSha = requireSha(createdCommit.sha, 'Created commit SHA');
  if (createdCommitSha !== candidate) {
    throw new PublishError('COMMIT_SHA_MISMATCH', 'GitHub created a commit different from the local candidate.');
  }

  return {
    staged: true,
    candidateSha: candidate,
    expectedRemoteMainSha: expected,
    evidenceDigest: releaseEvidence.evidenceDigest,
    changedPaths: local.entries.map((entry) => entry.path),
  };
}

async function main() {
  const [candidateSha, expectedRemoteMainSha, ...arguments_] = process.argv.slice(2);
  const options = {};
  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index];
    const value = arguments_[index + 1];
    if (!value || !['--independent-review-dir', '--soak-report'].includes(name) || Object.hasOwn(options, name)) {
      throw new PublishError('INVALID_INPUT', 'Usage: node tools/github-git-data-atomic-publish.js <candidate-sha> <expected-remote-main-sha> --independent-review-dir <absolute-path> --soak-report <absolute-path>');
    }
    options[name] = value;
  }
  if (!candidateSha || !expectedRemoteMainSha || Object.keys(options).length !== 2) {
    throw new PublishError('INVALID_INPUT', 'Usage: node tools/github-git-data-atomic-publish.js <candidate-sha> <expected-remote-main-sha> --independent-review-dir <absolute-path> --soak-report <absolute-path>');
  }
  const result = await stageCandidateObjects({
    candidateSha,
    expectedRemoteMainSha,
    independentReviewDir: options['--independent-review-dir'],
    soakReport: options['--soak-report'],
  });
  console.log(`Staged ${result.candidateSha} as unreachable Git objects (${result.changedPaths.length} changed paths); the fixed external promotion controller must perform the ref update.`);
}

module.exports = { PublishError, stageCandidateObjects };

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof PublishError ? error.message : 'Atomic publish failed.');
    process.exitCode = 1;
  });
}
