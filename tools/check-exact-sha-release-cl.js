#!/usr/bin/env node
'use strict';

// Read-only release evidence verifier. It never creates a GitHub run or writes
// a registry object; the fixture transport keeps the same checks testable offline.
const fs = require('node:fs');
const crypto = require('node:crypto');
const { ArtifactZipError, MAX_ARCHIVE_BYTES, readBoundedZip } = require('./lib/bounded-artifact-zip.js');
const {
  TOOLBAR_200_REQUIRED_CELLS,
  TOOLBAR_INCREMENTS,
  validWindowsCapture,
} = require('./check-browser-toolbar-zoom200.js');

const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const OCI_INDEX_MEDIA_TYPES = new Set([
  'application/vnd.oci.image.index.v1+json',
  'application/vnd.docker.distribution.manifest.list.v2+json',
]);
const OCI_MANIFEST_MEDIA_TYPE = 'application/vnd.oci.image.manifest.v1+json';
const DOCKER_MANIFEST_MEDIA_TYPE = 'application/vnd.docker.distribution.manifest.v2+json';
const OCI_CONFIG_MEDIA_TYPE = 'application/vnd.oci.image.config.v1+json';
const DOCKER_CONFIG_MEDIA_TYPE = 'application/vnd.docker.container.image.v1+json';
const INDEX_ACCEPT = [...OCI_INDEX_MEDIA_TYPES, OCI_MANIFEST_MEDIA_TYPE, DOCKER_MANIFEST_MEDIA_TYPE].join(', ');
const MANIFEST_ACCEPT = [OCI_MANIFEST_MEDIA_TYPE, DOCKER_MANIFEST_MEDIA_TYPE].join(', ');
const CONFIG_ACCEPT = [OCI_CONFIG_MEDIA_TYPE, DOCKER_CONFIG_MEDIA_TYPE, 'application/json'].join(', ');
const REQUIRED_CI_ARTIFACTS = [
  'ci-linux-validation-report',
  'ci-linux-validation-manifest',
  'ci-windows-bundle',
  'ci-windows-sha256-manifest',
  'ci-windows-edge-toolbar-zoom200',
];
const REQUIRED_IMAGE_PLATFORMS = ['amd64', 'arm64'];
const REQUIRED_CONTAINER_IMAGE_EVIDENCE = 'ghcr-image-evidence';
const OCI_DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/i;
const PRODUCTION_ENDPOINTS = Object.freeze({
  githubApiBase: 'https://api.github.com',
  registryBase: 'https://ghcr.io',
  registryTokenEndpoint: 'https://ghcr.io/token',
});

class ReleaseVerificationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ReleaseVerificationError';
    this.code = code;
  }
}

function requireSha(value, label = 'SHA') {
  const sha = String(value || '').trim().toLowerCase();
  if (!SHA_PATTERN.test(sha)) throw new ReleaseVerificationError('INVALID_INPUT', `${label} must be a 40-character Git SHA.`);
  return sha;
}

function requireOciDigest(value, label = 'OCI digest') {
  const digest = String(value || '').trim().toLowerCase();
  if (!OCI_DIGEST_PATTERN.test(digest)) {
    throw new ReleaseVerificationError('IMAGE_DIGEST_INVALID', `${label} must be a sha256 OCI digest.`);
  }
  return digest;
}

function requireRepository(value) {
  const repository = String(value || '').trim().toLowerCase();
  if (!/^[^/\s]+\/[^/\s]+$/.test(repository)) {
    throw new ReleaseVerificationError('INVALID_INPUT', 'Repository must be an owner/repository value.');
  }
  return repository;
}

function latestRun(runs) {
  return [...runs].sort((left, right) => {
    const leftTime = Date.parse(left.updated_at || left.created_at || '') || 0;
    const rightTime = Date.parse(right.updated_at || right.created_at || '') || 0;
    return rightTime - leftTime || Number(right.id || 0) - Number(left.id || 0);
  })[0];
}

function assertCompletedSuccess(item, kind) {
  if (!item) throw new ReleaseVerificationError(`MISSING_${kind}`, `${kind} was not found for the requested SHA.`);
  if (item.status !== 'completed') {
    throw new ReleaseVerificationError(`${kind}_NOT_COMPLETE`, `${kind} is ${item.status || 'missing a status'}, not completed.`);
  }
  if (item.conclusion !== 'success') {
    throw new ReleaseVerificationError(`${kind}_NOT_SUCCESS`, `${kind} concluded ${item.conclusion || 'without a conclusion'}.`);
  }
}

function findNamedJob(jobs, name) {
  const matches = jobs.filter((job) => job && job.name === name);
  return latestRun(matches);
}

function validateRunIdentity(run, sha, workflowEvent, kind) {
  if (!run || String(run.head_sha || '').toLowerCase() !== sha || run.event !== workflowEvent || run.head_branch !== 'main') {
    throw new ReleaseVerificationError(`${kind}_IDENTITY_MISMATCH`, `${kind} does not represent the exact main push SHA.`);
  }
}

function fixtureTransport(fixture) {
  const github = fixture.github || {};
  const registry = fixture.registry || {};
  return {
    async readRemoteMain() { return github.remoteMainSha; },
    async listCiRuns() { return github.ciRuns || []; },
    async listCiJobs(runId) { return (github.ciJobs || {})[String(runId)] || []; },
    async listCiArtifacts(runId) { return (github.ciArtifacts || {})[String(runId)] || []; },
    async downloadCiArtifact(artifact) {
      const encoded = artifact && (artifact.archive_base64 || (github.ciArtifactArchives || {})[String(artifact.id || artifact.name)]);
      if (typeof encoded !== 'string') throw new ReleaseVerificationError('CI_ARTIFACT_DOWNLOAD_FAILED', 'Fixture is missing an artifact archive.');
      return Buffer.from(encoded, 'base64');
    },
    async listContainerRuns() { return github.containerRuns || []; },
    async listContainerArtifacts(runId) { return (github.containerArtifacts || {})[String(runId)] || []; },
    async getRegistryIndex() {
      return registry.indexResponse || {
        document: registry.index,
        digest: registry.indexDigest,
      };
    },
    async getRegistryManifest(digest) { return (registry.manifests || {})[digest]; },
    async getRegistryBlob(digest) { return (registry.blobs || {})[digest]; },
  };
}

async function fetchJson(fetchImpl, url, headers = {}) {
  let response;
  try {
    response = await fetchImpl(url, { headers });
  } catch {
    throw new ReleaseVerificationError('REMOTE_REQUEST_FAILED', 'A read-only remote verification request failed.');
  }
  let json;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  return { status: response.status, headers: response.headers, json };
}

function requireHttpsEndpoint(value, label, requiredPath = '') {
  let endpoint;
  try {
    endpoint = new URL(String(value));
  } catch {
    throw new ReleaseVerificationError('INVALID_TEST_TRANSPORT', `${label} must be an HTTPS URL.`);
  }
  if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || (endpoint.pathname !== requiredPath && !(requiredPath === '' && endpoint.pathname === '/'))) {
    throw new ReleaseVerificationError('INVALID_TEST_TRANSPORT', `${label} must be an HTTPS origin with the expected path.`);
  }
  return requiredPath ? `${endpoint.origin}${requiredPath}` : endpoint.origin;
}

function resolveTransportEndpoints(fetchImpl, testEndpoints) {
  if (testEndpoints === undefined) return PRODUCTION_ENDPOINTS;
  if (fetchImpl === globalThis.fetch || !testEndpoints || typeof testEndpoints !== 'object' || Array.isArray(testEndpoints)) {
    throw new ReleaseVerificationError('INVALID_TEST_TRANSPORT', 'Custom release endpoints require an explicit injected test fetch implementation.');
  }
  if (Object.keys(testEndpoints).sort().join(',') !== 'githubApiBase,registryBase,registryTokenEndpoint') {
    throw new ReleaseVerificationError('INVALID_TEST_TRANSPORT', 'Test transport endpoints are incomplete or contain unexpected fields.');
  }
  return Object.freeze({
    githubApiBase: requireHttpsEndpoint(testEndpoints.githubApiBase, 'Test GitHub API endpoint'),
    registryBase: requireHttpsEndpoint(testEndpoints.registryBase, 'Test registry endpoint'),
    registryTokenEndpoint: requireHttpsEndpoint(testEndpoints.registryTokenEndpoint, 'Test registry token endpoint', '/token'),
  });
}

function bearerChallenge(header) {
  const match = /^Bearer\s+(.+)$/i.exec(header || '');
  if (!match) return null;
  return Object.fromEntries([...match[1].matchAll(/([A-Za-z]+)="([^"]*)"/g)].map(([, key, value]) => [key.toLowerCase(), value]));
}

function remoteTransport({ repository, environment, fetchImpl = globalThis.fetch, testEndpoints } = {}) {
  const githubToken = String(environment.GITHUB_TOKEN || '').trim();
  const ghcrToken = String(environment.GHCR_TOKEN || '').trim();
  const ghcrUsername = String(environment.GHCR_USERNAME || '').trim();
  if (typeof fetchImpl !== 'function') throw new ReleaseVerificationError('INVALID_TEST_TRANSPORT', 'Release transport requires a fetch implementation.');
  const endpoints = resolveTransportEndpoints(fetchImpl, testEndpoints);
  const githubHeaders = { accept: 'application/vnd.github+json', 'user-agent': 'exact-sha-release-verifier' };
  if (githubToken) githubHeaders.authorization = `Bearer ${githubToken}`;
  const api = endpoints.githubApiBase;
  const registry = endpoints.registryBase;

  async function github(path) {
    const result = await fetchJson(fetchImpl, `${api}${path}`, githubHeaders);
    if (result.status < 200 || result.status >= 300 || !result.json) {
      throw new ReleaseVerificationError('GITHUB_API_FAILED', 'GitHub did not return release verification data.');
    }
    return result.json;
  }

  async function githubArtifact(artifact) {
    const artifactId = Number(artifact && artifact.id);
    if (!Number.isSafeInteger(artifactId) || artifactId <= 0) {
      throw new ReleaseVerificationError('CI_ARTIFACT_INVALID', 'Required CI artifact has no valid GitHub artifact id.');
    }
    let response;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      response = await fetchImpl(`${api}/repos/${repository}/actions/artifacts/${artifactId}/zip`, {
        headers: githubHeaders,
        redirect: 'follow',
        signal: controller.signal,
      });
    } catch {
      throw new ReleaseVerificationError('CI_ARTIFACT_DOWNLOAD_FAILED', 'GitHub artifact download failed or timed out.');
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok || !response.body) throw new ReleaseVerificationError('CI_ARTIFACT_DOWNLOAD_FAILED', 'GitHub artifact download was not successful.');
    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_ARCHIVE_BYTES) {
      throw new ReleaseVerificationError('CI_ARTIFACT_TOO_LARGE', 'GitHub artifact archive exceeds the download limit.');
    }
    const chunks = [];
    let length = 0;
    const reader = response.body.getReader();
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        length += part.value.byteLength;
        if (length > MAX_ARCHIVE_BYTES) {
          await reader.cancel();
          throw new ReleaseVerificationError('CI_ARTIFACT_TOO_LARGE', 'GitHub artifact archive exceeds the download limit.');
        }
        chunks.push(Buffer.from(part.value));
      }
    } catch (error) {
      if (error instanceof ReleaseVerificationError) throw error;
      throw new ReleaseVerificationError('CI_ARTIFACT_DOWNLOAD_FAILED', 'GitHub artifact archive could not be read.');
    }
    return Buffer.concat(chunks, length);
  }

  async function registryGet(path, accept) {
    // GHCR's registry challenge is anonymous for public packages. A GitHub API
    // token is not a registry bearer token, so it must never be sent here.
    const headers = { accept };
    let result = await fetchJson(fetchImpl, `${registry}/v2/${repository}/${path}`, headers);
    if (result.status === 401) {
      const challenge = bearerChallenge(result.headers.get('www-authenticate'));
      if (!challenge || !challenge.realm) throw new ReleaseVerificationError('REGISTRY_AUTH_FAILED', 'GHCR did not provide a usable authentication challenge.');
      const tokenUrl = new URL(challenge.realm);
      if (tokenUrl.toString().replace(/\/$/, '') !== endpoints.registryTokenEndpoint) {
        throw new ReleaseVerificationError('REGISTRY_AUTH_FAILED', 'GHCR authentication challenge did not name the trusted token endpoint.');
      }
      if (challenge.service) tokenUrl.searchParams.set('service', challenge.service);
      tokenUrl.searchParams.set('scope', challenge.scope || `repository:${repository}:pull`);
      const authHeaders = ghcrToken && ghcrUsername
        ? { authorization: `Basic ${Buffer.from(`${ghcrUsername}:${ghcrToken}`, 'utf8').toString('base64')}` }
        : {};
      const auth = await fetchJson(fetchImpl, tokenUrl.toString(), authHeaders);
      const registryToken = auth.json && (auth.json.token || auth.json.access_token);
      if (auth.status < 200 || auth.status >= 300 || !registryToken) {
        throw new ReleaseVerificationError('REGISTRY_AUTH_FAILED', 'Unable to obtain a read-only GHCR token.');
      }
      result = await fetchJson(fetchImpl, `${registry}/v2/${repository}/${path}`, { accept, authorization: `Bearer ${registryToken}` });
    }
    if (result.status < 200 || result.status >= 300 || !result.json) {
      throw new ReleaseVerificationError('REGISTRY_REQUEST_FAILED', 'GHCR did not return image verification data.');
    }
    return result;
  }

  return {
    async readRemoteMain() {
      const ref = await github(`/repos/${repository}/git/ref/heads/main`);
      if (!ref || !ref.object || ref.object.type !== 'commit') {
        throw new ReleaseVerificationError('REMOTE_MAIN_INVALID', 'GitHub main does not reference a commit.');
      }
      try {
        return requireSha(ref.object.sha, 'Remote main SHA');
      } catch {
        throw new ReleaseVerificationError('REMOTE_MAIN_INVALID', 'GitHub returned an invalid main commit SHA.');
      }
    },
    async listCiRuns(sha) {
      const data = await github(`/repos/${repository}/actions/workflows/ci.yml/runs?event=push&branch=main&head_sha=${encodeURIComponent(sha)}&per_page=100`);
      return data.workflow_runs || [];
    },
    async listCiJobs(runId) {
      const data = await github(`/repos/${repository}/actions/runs/${encodeURIComponent(runId)}/jobs?per_page=100`);
      return data.jobs || [];
    },
    async listCiArtifacts(runId) {
      const data = await github(`/repos/${repository}/actions/runs/${encodeURIComponent(runId)}/artifacts?per_page=100`);
      return data.artifacts || [];
    },
    downloadCiArtifact: githubArtifact,
    async listContainerRuns(sha) {
      const data = await github(`/repos/${repository}/actions/workflows/container-image.yml/runs?event=workflow_run&branch=main&head_sha=${encodeURIComponent(sha)}&per_page=100`);
      return data.workflow_runs || [];
    },
    async getRegistryIndex(tag) {
      const result = await registryGet(`manifests/${encodeURIComponent(tag)}`, INDEX_ACCEPT);
      return {
        document: result.json,
        digest: result.headers.get('docker-content-digest'),
      };
    },
    async getRegistryManifest(digest) {
      return (await registryGet(`manifests/${encodeURIComponent(digest)}`, MANIFEST_ACCEPT)).json;
    },
    async getRegistryBlob(digest) {
      return (await registryGet(`blobs/${encodeURIComponent(digest)}`, CONFIG_ACCEPT)).json;
    },
  };
}

function requireCiEvidenceArtifacts(artifacts, sha) {
  const required = new Map();
  for (const prefix of REQUIRED_CI_ARTIFACTS) {
    const name = `${prefix}-${sha}`;
    const matches = artifacts.filter((artifact) => artifact && artifact.name === name);
    if (matches.length === 0) {
      throw new ReleaseVerificationError('CI_ARTIFACT_MISSING', `CI run is missing required SHA-bound artifact ${name}.`);
    }
    if (matches.length !== 1) {
      throw new ReleaseVerificationError('CI_ARTIFACT_DUPLICATE', `CI run has duplicate required SHA-bound artifacts named ${name}.`);
    }
    const artifact = matches[0];
    if (artifact.expired === true) {
      throw new ReleaseVerificationError('CI_ARTIFACT_EXPIRED', `Required CI artifact ${name} has expired.`);
    }
    if (!Number.isFinite(Number(artifact.size_in_bytes)) || Number(artifact.size_in_bytes) <= 0) {
      throw new ReleaseVerificationError('CI_ARTIFACT_EMPTY', `Required CI artifact ${name} is empty.`);
    }
    if (Number(artifact.size_in_bytes) > MAX_ARCHIVE_BYTES) {
      throw new ReleaseVerificationError('CI_ARTIFACT_TOO_LARGE', `Required CI artifact ${name} exceeds the evidence size limit.`);
    }
    required.set(prefix, artifact);
  }
  return required;
}

function requireContainerImageEvidenceArtifact(artifacts, sha) {
  const name = `${REQUIRED_CONTAINER_IMAGE_EVIDENCE}-${sha}`;
  const matches = artifacts.filter((artifact) => artifact && artifact.name === name);
  if (matches.length === 0) {
    throw new ReleaseVerificationError('CONTAINER_IMAGE_EVIDENCE_MISSING', `Container workflow is missing required SHA-bound artifact ${name}.`);
  }
  if (matches.length !== 1) {
    throw new ReleaseVerificationError('CONTAINER_IMAGE_EVIDENCE_DUPLICATE', `Container workflow has duplicate SHA-bound artifacts named ${name}.`);
  }
  const artifact = matches[0];
  if (artifact.expired === true) {
    throw new ReleaseVerificationError('CONTAINER_IMAGE_EVIDENCE_EXPIRED', `Container image evidence ${name} has expired.`);
  }
  if (!Number.isFinite(Number(artifact.size_in_bytes)) || Number(artifact.size_in_bytes) <= 0 || Number(artifact.size_in_bytes) > MAX_ARCHIVE_BYTES) {
    throw new ReleaseVerificationError('CONTAINER_IMAGE_EVIDENCE_INVALID', `Container image evidence ${name} has an invalid size.`);
  }
  return artifact;
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function artifactFiles(buffer, label) {
  try {
    return readBoundedZip(buffer);
  } catch (error) {
    if (error instanceof ArtifactZipError) throw new ReleaseVerificationError(error.code, `${label}: ${error.message}`);
    throw error;
  }
}

function fileByBasename(files, basename, label) {
  const matches = [...files.entries()].filter(([name]) => name === basename || name.endsWith(`/${basename}`));
  if (matches.length !== 1) throw new ReleaseVerificationError('CI_ARTIFACT_CONTENT_INVALID', `${label} must contain exactly one ${basename}.`);
  return matches[0][1];
}

function requireOnlyBasenames(files, basenames, label) {
  const actual = [...files.keys()].map((name) => name.slice(name.lastIndexOf('/') + 1)).sort();
  const expected = [...basenames].sort();
  if (actual.length !== expected.length || actual.some((name, index) => name !== expected[index])) {
    throw new ReleaseVerificationError('CI_ARTIFACT_CONTENT_INVALID', `${label} contains unexpected or missing files.`);
  }
}

function parseJson(data, label) {
  try {
    return JSON.parse(data.toString('utf8'));
  } catch {
    throw new ReleaseVerificationError('CI_ARTIFACT_CONTENT_INVALID', `${label} is not valid JSON.`);
  }
}

function verifyProof(proof, sha, job, manifestDigest, label) {
  if (!proof || proof.schema !== 'release-artifact-proof-v1' || proof.candidate_sha !== sha || proof.job !== job || proof.status !== 'success' || proof.manifest_sha256 !== manifestDigest) {
    throw new ReleaseVerificationError('CI_ARTIFACT_PROOF_INVALID', `${label} does not bind successful ${job} evidence to the requested SHA and manifest.`);
  }
}

function verifyContainerImageEvidence(files, { sha, repository, ciRunId, containerRunId, registryIndexDigest, index }) {
  requireOnlyBasenames(files, ['ghcr-image-evidence.json'], 'Container image evidence artifact');
  const evidence = parseJson(fileByBasename(files, 'ghcr-image-evidence.json', 'Container image evidence artifact'), 'Container image evidence');
  const expectedImage = `ghcr.io/${repository}:sha-${sha}`;
  if (!evidence || evidence.schema !== 'ghcr-image-evidence-v1' || evidence.candidate_sha !== sha ||
      evidence.ci_run_id !== Number(ciRunId) || evidence.container_run_id !== Number(containerRunId) ||
      evidence.image !== expectedImage || evidence.index_revision !== sha ||
      requireOciDigest(evidence.oci_index_digest, 'Evidence OCI index digest') !== registryIndexDigest) {
    throw new ReleaseVerificationError('CONTAINER_IMAGE_EVIDENCE_INVALID', 'Container image evidence does not bind the requested SHA, workflow runs, image reference, and immutable OCI digest.');
  }

  const expectedPlatforms = new Map();
  for (const descriptor of Array.isArray(index?.manifests) ? index.manifests : []) {
    const platform = descriptor?.platform || {};
    if (platform.os === 'linux' && REQUIRED_IMAGE_PLATFORMS.includes(platform.architecture) && !platform.variant) {
      expectedPlatforms.set(`linux/${platform.architecture}`, requireOciDigest(descriptor.digest, `OCI descriptor for linux/${platform.architecture}`));
    }
  }
  const reportedPlatforms = evidence.platforms && typeof evidence.platforms === 'object' && !Array.isArray(evidence.platforms)
    ? Object.entries(evidence.platforms)
    : [];
  if (reportedPlatforms.length !== expectedPlatforms.size || reportedPlatforms.some(([platform, digest]) => expectedPlatforms.get(platform) !== requireOciDigest(digest, `Evidence descriptor for ${platform}`))) {
    throw new ReleaseVerificationError('CONTAINER_IMAGE_EVIDENCE_INVALID', 'Container image evidence platform descriptors do not match the immutable OCI index.');
  }
  return evidence;
}

function normalizeManifestPath(value) {
  const name = String(value || '');
  if (!name || name.includes('\\') || name.includes('\0') || name.startsWith('/') || /^[A-Za-z]:/.test(name) || name.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new ReleaseVerificationError('CI_ARTIFACT_MANIFEST_INVALID', 'Artifact SHA256 manifest contains an unsafe path.');
  }
  return name;
}

function parseSha256Sums(data, label) {
  const lines = data.toString('utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trimEnd().split('\n');
  if (lines.length === 0 || !lines[0]) throw new ReleaseVerificationError('CI_ARTIFACT_MANIFEST_INVALID', `${label} is empty.`);
  const entries = new Map();
  for (const line of lines) {
    const match = /^([a-f0-9]{64})[ ]{1,2}(?:\*)?(.+)$/i.exec(line);
    if (!match) throw new ReleaseVerificationError('CI_ARTIFACT_MANIFEST_INVALID', `${label} has an invalid SHA256 entry.`);
    const name = normalizeManifestPath(match[2]);
    if (entries.has(name)) throw new ReleaseVerificationError('CI_ARTIFACT_MANIFEST_INVALID', `${label} contains duplicate paths.`);
    entries.set(name, match[1].toLowerCase());
  }
  return entries;
}

function verifyLinuxEvidence(reportFiles, manifestFiles, sha) {
  requireOnlyBasenames(reportFiles, ['validation-report.json', 'artifact-proof.json'], 'Linux report artifact');
  requireOnlyBasenames(manifestFiles, ['SHA256SUMS'], 'Linux manifest artifact');
  const report = fileByBasename(reportFiles, 'validation-report.json', 'Linux report artifact');
  const proof = parseJson(fileByBasename(reportFiles, 'artifact-proof.json', 'Linux report artifact'), 'Linux artifact proof');
  const manifest = fileByBasename(manifestFiles, 'SHA256SUMS', 'Linux manifest artifact');
  const entries = parseSha256Sums(manifest, 'Linux SHA256SUMS');
  if (entries.size !== 1 || entries.get('validation-report.json') !== sha256(report)) {
    throw new ReleaseVerificationError('CI_ARTIFACT_MANIFEST_MISMATCH', 'Linux SHA256SUMS does not exactly bind validation-report.json.');
  }
  verifyProof(proof, sha, 'linux-validation', sha256(manifest), 'Linux artifact proof');
  const reportJson = parseJson(report, 'Linux validation report');
  if (!reportJson || reportJson.schema !== 'linux-validation-evidence-v1' || reportJson.candidate_sha !== sha || reportJson.job !== 'linux-validation' || reportJson.status !== 'success') {
    throw new ReleaseVerificationError('CI_ARTIFACT_PROOF_INVALID', 'Linux validation report does not bind a successful Linux job to the requested SHA.');
  }
}

function verifyWindowsEvidence(bundleFiles, manifestFiles, sha) {
  requireOnlyBasenames(manifestFiles, ['SHA256SUMS', 'artifact-proof.json'], 'Windows manifest artifact');
  const manifest = fileByBasename(manifestFiles, 'SHA256SUMS', 'Windows manifest artifact');
  const proof = parseJson(fileByBasename(manifestFiles, 'artifact-proof.json', 'Windows manifest artifact'), 'Windows artifact proof');
  verifyProof(proof, sha, 'windows-packaging', sha256(manifest), 'Windows artifact proof');
  const entries = parseSha256Sums(manifest, 'Windows SHA256SUMS');
  const bundle = new Map();
  for (const [name, data] of bundleFiles) {
    // upload-artifact archives the common path root, so files uploaded from
    // dist/routeros-triage-panel are rooted at the bundle contents (for
    // example README.txt and bin/panel.exe), not at that directory name.
    // There is deliberately no separately trusted "bundle root" prefix: ZIP
    // path safety plus exact manifest equality defines the entire boundary.
    const relative = normalizeManifestPath(name);
    if (bundle.has(relative)) throw new ReleaseVerificationError('CI_ARTIFACT_BUNDLE_INVALID', 'Windows bundle has duplicate relative paths.');
    bundle.set(relative, sha256(data));
  }
  if (bundle.size === 0 || bundle.size !== entries.size) throw new ReleaseVerificationError('CI_ARTIFACT_MANIFEST_MISMATCH', 'Windows artifact-root files and SHA256SUMS have different file counts.');
  for (const [name, digest] of entries) {
    if (bundle.get(name) !== digest) throw new ReleaseVerificationError('CI_ARTIFACT_MANIFEST_MISMATCH', `Windows bundle does not match SHA256SUMS for ${name}.`);
  }
}

function verifyWindowsToolbarEvidence(files, sha) {
  const manifest = fileByBasename(files, 'SHA256SUMS', 'Windows Edge toolbar artifact');
  const proof = parseJson(fileByBasename(files, 'artifact-proof.json', 'Windows Edge toolbar artifact'), 'Windows Edge toolbar proof');
  const entries = parseSha256Sums(manifest, 'Windows Edge toolbar SHA256SUMS');
  const payload = new Map([...files.entries()].filter(([name]) => name !== 'SHA256SUMS' && name !== 'artifact-proof.json'));
  if (payload.size === 0 || payload.size !== entries.size) {
    throw new ReleaseVerificationError('CI_ARTIFACT_MANIFEST_MISMATCH', 'Windows Edge toolbar artifact-root files and SHA256SUMS have different file counts.');
  }
  for (const [name, data] of payload) {
    if (entries.get(normalizeManifestPath(name)) !== sha256(data)) {
      throw new ReleaseVerificationError('CI_ARTIFACT_MANIFEST_MISMATCH', `Windows Edge toolbar evidence does not match SHA256SUMS for ${name}.`);
    }
  }
  const report = payload.get('edge-toolbar/report.json');
  if (!report) throw new ReleaseVerificationError('CI_ARTIFACT_CONTENT_INVALID', 'Windows Edge toolbar evidence must contain edge-toolbar/report.json.');
  if (!proof || proof.schema !== 'windows-edge-toolbar-zoom200-evidence-v1' || proof.candidate_sha !== sha || proof.job !== 'windows-packaging' || proof.status !== 'success' || proof.report_sha256 !== sha256(report) || proof.manifest_sha256 !== sha256(manifest)) {
    throw new ReleaseVerificationError('CI_ARTIFACT_PROOF_INVALID', 'Windows Edge toolbar proof does not bind a successful Windows job, report, manifest, and requested SHA.');
  }
  const parsed = parseJson(report, 'Windows Edge toolbar report');
  const expectedCells = TOOLBAR_200_REQUIRED_CELLS.map(({ viewport, scenario }) => ({
    id: `${viewport.id}::${scenario}`,
    viewport: viewport.cssViewport,
  }));
  const expectedById = new Map(expectedCells.map((cell) => [cell.id, cell]));
  const cells = Array.isArray(parsed?.cells) ? parsed.cells : [];
  const actualCells = cells.map((cell) => `${cell?.viewport?.id || ''}::${cell?.scenario || ''}`);
  if (parsed?.pass !== true || parsed?.contract !== 'edge-toolbar-zoom200-windows-v5' || parsed?.identity?.commit !== sha || parsed?.identity?.worktreeClean !== true || parsed?.identity?.releaseEvidenceEligible !== true || parsed?.matrix?.complete !== true ||
      cells.length !== expectedCells.length || expectedCells.some(({ id }) => !actualCells.includes(id)) || actualCells.some((id) => !expectedById.has(id))) {
    throw new ReleaseVerificationError('CI_ARTIFACT_PROOF_INVALID', 'Windows Edge toolbar report is not a complete successful exact-SHA 22-cell matrix.');
  }
  for (const cell of cells) {
    const cellId = `${cell?.viewport?.id || ''}::${cell?.scenario || ''}`;
    const expected = expectedById.get(cellId);
    const steps = Array.isArray(cell?.windowsAutomation?.steps) ? cell.windowsAutomation.steps : [];
    const screenshot = cell?.surface?.screenshot;
    const diagnosticScreenshot = cell?.surface?.playwrightDiagnosticScreenshot;
    const windowsCapture = cell?.surface?.windowsCapture;
    const screenshotName = String(screenshot?.file || '').split(/[\\/]/u).pop();
    const diagnosticName = String(diagnosticScreenshot?.file || '').split(/[\\/]/u).pop();
    if (!expected || cell?.viewport?.cssViewport?.width !== expected.viewport.width || cell?.viewport?.cssViewport?.height !== expected.viewport.height ||
        cell?.zoomLevel?.verified !== true || cell?.zoomLevel?.expectedPercent !== 200 || cell?.zoomLevel?.toolbarIncrements !== TOOLBAR_INCREMENTS ||
        cell?.windowsAutomation?.pass !== true || steps.length !== TOOLBAR_INCREMENTS ||
        steps.some((step) => !step?.attempts?.some((attempt) => attempt?.action === step?.acceptedAction && attempt?.changed === true)) ||
        !Array.isArray(cell?.surface?.clippedOperationalText) || cell.surface.clippedOperationalText.length !== 0 ||
        !Array.isArray(cell?.surface?.unreadableOperationalText) || cell.surface.unreadableOperationalText.length !== 0 ||
        !validWindowsCapture(windowsCapture, windowsCapture?.windowHandle) ||
        !screenshotName || !payload.has(`edge-toolbar/${screenshotName}`) || sha256(payload.get(`edge-toolbar/${screenshotName}`)) !== screenshot?.sha256 ||
        !diagnosticName || !payload.has(`edge-toolbar/${diagnosticName}`) || sha256(payload.get(`edge-toolbar/${diagnosticName}`)) !== diagnosticScreenshot?.sha256) {
      throw new ReleaseVerificationError('CI_ARTIFACT_PROOF_INVALID', `Windows Edge toolbar cell ${cell?.viewport?.id || '?'}::${cell?.scenario || '?'} lacks complete zoom or screenshot evidence.`);
    }
  }
}

async function verifyCiArtifactContents(transport, artifacts, sha) {
  const files = new Map();
  for (const [name, artifact] of artifacts) files.set(name, artifactFiles(await transport.downloadCiArtifact(artifact), `${name} artifact`));
  verifyLinuxEvidence(files.get('ci-linux-validation-report'), files.get('ci-linux-validation-manifest'), sha);
  verifyWindowsEvidence(files.get('ci-windows-bundle'), files.get('ci-windows-sha256-manifest'), sha);
  verifyWindowsToolbarEvidence(files.get('ci-windows-edge-toolbar-zoom200'), sha);
}

function requireExactImageDescriptors(index, tag) {
  if (index.manifests.length !== REQUIRED_IMAGE_PLATFORMS.length) {
    throw new ReleaseVerificationError('IMAGE_DESCRIPTOR_SET_INVALID', `GHCR tag ${tag} must contain exactly two platform descriptors.`);
  }

  const descriptors = new Map();
  const digests = new Set();
  for (const descriptor of index.manifests) {
    const platform = descriptor && descriptor.platform;
    if (!descriptor || !descriptor.digest || !platform || platform.os !== 'linux' || !REQUIRED_IMAGE_PLATFORMS.includes(platform.architecture)) {
      throw new ReleaseVerificationError('IMAGE_DESCRIPTOR_SET_INVALID', `GHCR tag ${tag} contains an unsupported platform descriptor.`);
    }
    if (Object.prototype.hasOwnProperty.call(platform, 'variant')) {
      throw new ReleaseVerificationError('IMAGE_PLATFORM_VARIANT_INVALID', `GHCR tag ${tag} must not contain platform variants.`);
    }
    const platformName = `linux/${platform.architecture}`;
    if (descriptors.has(platformName) || digests.has(descriptor.digest)) {
      throw new ReleaseVerificationError('IMAGE_DESCRIPTOR_DUPLICATE', `GHCR tag ${tag} contains duplicate platform descriptors.`);
    }
    descriptors.set(platformName, descriptor);
    digests.add(descriptor.digest);
  }

  if (descriptors.size !== REQUIRED_IMAGE_PLATFORMS.length) {
    throw new ReleaseVerificationError('IMAGE_DESCRIPTOR_SET_INVALID', `GHCR tag ${tag} does not contain the required linux/amd64 and linux/arm64 descriptors.`);
  }
  return descriptors;
}

async function verifyExactShaRelease({ sha, repository, environment = process.env, fixture } = {}) {
  const expectedSha = requireSha(sha);
  const expectedRepository = requireRepository(repository || environment.GITHUB_REPOSITORY || 'cullysu/ros-ikuai-monitor-panel');
  const transport = fixture ? fixtureTransport(fixture) : remoteTransport({ repository: expectedRepository, environment });

  let remoteMainSha;
  try {
    remoteMainSha = requireSha(await transport.readRemoteMain(), 'Remote main SHA');
  } catch (error) {
    if (error instanceof ReleaseVerificationError) throw error;
    throw new ReleaseVerificationError('REMOTE_MAIN_INVALID', 'Unable to read GitHub main.');
  }
  if (remoteMainSha !== expectedSha) {
    throw new ReleaseVerificationError('REMOTE_MAIN_MISMATCH', 'Current GitHub main does not equal the requested SHA.');
  }

  const ciRun = latestRun((await transport.listCiRuns(expectedSha)).filter((run) => String(run.head_sha || '').toLowerCase() === expectedSha));
  assertCompletedSuccess(ciRun, 'CI_RUN');
  validateRunIdentity(ciRun, expectedSha, 'push', 'CI_RUN');
  const jobs = await transport.listCiJobs(ciRun.id);
  for (const jobName of ['Linux validation', 'Windows packaging']) {
    const job = findNamedJob(jobs, jobName);
    assertCompletedSuccess(job, `CI_JOB_${jobName.toUpperCase().replace(/[^A-Z]+/g, '_')}`);
  }
  const ciArtifacts = requireCiEvidenceArtifacts(await transport.listCiArtifacts(ciRun.id), expectedSha);
  await verifyCiArtifactContents(transport, ciArtifacts, expectedSha);

  const containerRun = latestRun((await transport.listContainerRuns(expectedSha)).filter((run) => String(run.head_sha || '').toLowerCase() === expectedSha));
  assertCompletedSuccess(containerRun, 'CONTAINER_RUN');
  validateRunIdentity(containerRun, expectedSha, 'workflow_run', 'CONTAINER_RUN');

  const tag = `sha-${expectedSha}`;
  const indexResponse = await transport.getRegistryIndex(tag);
  const index = indexResponse && indexResponse.document;
  const registryIndexDigest = requireOciDigest(indexResponse && indexResponse.digest, 'GHCR Docker-Content-Digest');
  if (!index || !OCI_INDEX_MEDIA_TYPES.has(index.mediaType) || !Array.isArray(index.manifests)) {
    throw new ReleaseVerificationError('IMAGE_INDEX_INVALID', `GHCR tag ${tag} is not a multi-platform OCI image index.`);
  }
  if ((index.annotations || {})['org.opencontainers.image.revision'] !== expectedSha) {
    throw new ReleaseVerificationError('IMAGE_REVISION_MISMATCH', 'The OCI index revision does not equal the requested SHA.');
  }

  const containerArtifact = requireContainerImageEvidenceArtifact(await transport.listContainerArtifacts(containerRun.id), expectedSha);
  const imageEvidence = verifyContainerImageEvidence(
    artifactFiles(await transport.downloadCiArtifact(containerArtifact), 'Container image evidence artifact'),
    {
      sha: expectedSha,
      repository: expectedRepository,
      ciRunId: ciRun.id,
      containerRunId: containerRun.id,
      registryIndexDigest,
      index,
    },
  );

  const descriptors = requireExactImageDescriptors(index, tag);
  const verifiedPlatforms = [];
  for (const architecture of REQUIRED_IMAGE_PLATFORMS) {
    const descriptor = descriptors.get(`linux/${architecture}`);
    const manifest = await transport.getRegistryManifest(descriptor.digest);
    if (!manifest || !manifest.config || !manifest.config.digest) {
      throw new ReleaseVerificationError('IMAGE_MANIFEST_INVALID', `linux/${architecture} has no OCI config digest.`);
    }
    const config = await transport.getRegistryBlob(manifest.config.digest);
    if (!config || !config.config || !config.config.Labels || config.config.Labels['org.opencontainers.image.revision'] !== expectedSha) {
      throw new ReleaseVerificationError('IMAGE_REVISION_MISMATCH', `linux/${architecture} OCI revision does not equal the requested SHA.`);
    }
    verifiedPlatforms.push(`linux/${architecture}`);
  }

  return {
    sha: expectedSha,
    repository: expectedRepository,
    ciRunId: ciRun.id,
    containerRunId: containerRun.id,
    image: `ghcr.io/${expectedRepository}:${tag}`,
    imageDigest: imageEvidence.oci_index_digest,
    platforms: verifiedPlatforms,
  };
}

function parseArgs(argv) {
  const options = {};
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--fixture' || value === '--repository') {
      if (!argv[index + 1]) throw new ReleaseVerificationError('INVALID_INPUT', `${value} requires a value.`);
      options[value.slice(2)] = argv[index + 1];
      index += 1;
    } else if (value.startsWith('--')) {
      throw new ReleaseVerificationError('INVALID_INPUT', `Unknown option: ${value}`);
    } else {
      positional.push(value);
    }
  }
  if (positional.length !== 1) throw new ReleaseVerificationError('INVALID_INPUT', 'Usage: node tools/check-exact-sha-release-cl.js <40-hex-sha> [--fixture path] [--repository owner/repo]');
  return { sha: positional[0], ...options };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  let fixture;
  if (options.fixture) {
    try {
      fixture = JSON.parse(fs.readFileSync(options.fixture, 'utf8'));
    } catch {
      throw new ReleaseVerificationError('FIXTURE_INVALID', 'Fixture must be readable JSON.');
    }
  }
  const result = await verifyExactShaRelease({ sha: options.sha, repository: options.repository, fixture });
  console.log(JSON.stringify({ pass: true, contract: 'exact-sha-release-v1', ...result }));
}

module.exports = { ReleaseVerificationError, verifyExactShaRelease, fixtureTransport, remoteTransport, verifyCiArtifactContents };

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof ReleaseVerificationError ? `${error.code}: ${error.message}` : 'UNEXPECTED_ERROR: Exact SHA release verification failed.');
    process.exitCode = 1;
  });
}
