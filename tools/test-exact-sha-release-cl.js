#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { ReleaseVerificationError, remoteTransport } = require('./check-exact-sha-release-cl.js');
const { TOOLBAR_200_REQUIRED_CELLS, TOOLBAR_INCREMENTS } = require('./check-browser-toolbar-zoom200.js');
const { MAX_ENTRY_BYTES } = require('./lib/bounded-artifact-zip.js');

const script = path.join(__dirname, 'check-exact-sha-release-cl.js');
const sha = 'a'.repeat(40);
const indexDigest = `sha256:${'1'.repeat(64)}`;
const amd64Digest = `sha256:${'2'.repeat(64)}`;
const arm64Digest = `sha256:${'3'.repeat(64)}`;
const digest = (data) => crypto.createHash('sha256').update(data).digest('hex');

function zip(entries) {
  const locals = [];
  const central = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const data = Buffer.from(entry.data || '');
    const declaredSize = entry.declaredSize === undefined ? data.length : entry.declaredSize;
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0, 6); local.writeUInt16LE(0, 8);
    local.writeUInt32LE(data.length, 18); local.writeUInt32LE(declaredSize, 22); local.writeUInt16LE(name.length, 26);
    name.copy(local, 30); locals.push(local, data);
    const record = Buffer.alloc(46 + name.length);
    record.writeUInt32LE(0x02014b50, 0); record.writeUInt16LE(20, 4); record.writeUInt16LE(20, 6); record.writeUInt16LE(0, 8); record.writeUInt16LE(0, 10);
    record.writeUInt32LE(data.length, 20); record.writeUInt32LE(declaredSize, 24); record.writeUInt16LE(name.length, 28); record.writeUInt32LE(offset, 42);
    name.copy(record, 46); central.push(record); offset += local.length + data.length;
  }
  const centralBuffer = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(centralBuffer.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuffer, end]);
}

function artifact(name, buffer, id) {
  return { id, name, size_in_bytes: buffer.length, expired: false, archive_base64: buffer.toString('base64') };
}

function evidenceArchives({ mutateToolbarCell, mutateImageEvidence } = {}) {
  const report = Buffer.from(JSON.stringify({ schema: 'linux-validation-evidence-v1', candidate_sha: sha, job: 'linux-validation', status: 'success' }));
  const linuxManifest = Buffer.from(`${digest(report)}  validation-report.json\n`);
  const linuxProof = Buffer.from(JSON.stringify({ schema: 'release-artifact-proof-v1', candidate_sha: sha, job: 'linux-validation', status: 'success', manifest_sha256: digest(linuxManifest) }));
  const bundleFiles = [
    ['README.txt', Buffer.from('release')],
    ['bin/panel.exe', Buffer.from('binary')],
  ];
  const windowsManifest = Buffer.from(bundleFiles.map(([name, data]) => `${digest(data)} *${name}`).join('\n') + '\n');
  const windowsProof = Buffer.from(JSON.stringify({ schema: 'release-artifact-proof-v1', candidate_sha: sha, job: 'windows-packaging', status: 'success', manifest_sha256: digest(windowsManifest) }));
  const screenshot = Buffer.from('png-evidence');
  const diagnosticScreenshot = Buffer.from('playwright-diagnostic-evidence');
  const toolbarCells = TOOLBAR_200_REQUIRED_CELLS.map(({ viewport, scenario }) => {
    const cell = {
    viewport: { id: viewport.id, cssViewport: { ...viewport.cssViewport } }, scenario,
    zoomLevel: { verified: true, expectedPercent: 200, toolbarIncrements: TOOLBAR_INCREMENTS },
    windowsAutomation: { pass: true, steps: Array.from({ length: 5 }, (_, index) => ({ step: index + 1, acceptedAction: 'menu-plus', attempts: [{ action: 'menu-plus', changed: true }] })) },
    surface: {
      clippedOperationalText: [],
      unreadableOperationalText: [],
      screenshot: { file: `_acceptance/edge-toolbar-zoom200/${viewport.id}-${scenario}.png`, sha256: digest(screenshot) },
      playwrightDiagnosticScreenshot: { file: `_acceptance/edge-toolbar-zoom200/${viewport.id}-${scenario}-playwright-diagnostic.png`, sha256: digest(diagnosticScreenshot) },
      windowsCapture: {
        pass: true,
        captureOnly: true,
        windowHandle: 31415,
        captureState: viewport.id === 'phone-430'
          ? { foregroundHandle: 31415, captureMode: 'screen-visible-segment', unobscured: false, sampleCount: 9, blockedSamples: [{ x: 1, y: 1, coveringRoot: 99 }], ownedWindowRender: { success: false }, visibleSegment: { success: true, method: 'physical-screen-segment', unobscured: true, coverageRatio: 0.68, sampleCount: 9, sampledColorCount: 64, channelSpan: 300 }, windowRect: { left: 1, top: 1, right: 300, bottom: 400 } }
          : { foregroundHandle: 31415, captureMode: 'screen-unobscured', unobscured: true, sampleCount: 9, blockedSamples: [], windowRect: { left: 1, top: 1, right: 300, bottom: 400 } },
      },
    },
    };
    if (typeof mutateToolbarCell === 'function') mutateToolbarCell(cell);
    return cell;
  });
  const toolbarReport = Buffer.from(JSON.stringify({
    pass: true, contract: 'edge-toolbar-zoom200-windows-v5',
    identity: { commit: sha, worktreeClean: true, releaseEvidenceEligible: true },
    matrix: { complete: true }, cells: toolbarCells,
  }));
  const toolbarPayload = [
    { name: 'edge-toolbar/report.json', data: toolbarReport },
    ...toolbarCells.map((cell) => ({ name: `edge-toolbar/${cell.viewport.id}-${cell.scenario}.png`, data: screenshot })),
    ...toolbarCells.map((cell) => ({ name: `edge-toolbar/${cell.viewport.id}-${cell.scenario}-playwright-diagnostic.png`, data: diagnosticScreenshot })),
  ];
  const toolbarManifest = Buffer.from(toolbarPayload.map((entry) => `${digest(entry.data)} *${entry.name}`).join('\n') + '\n');
  const toolbarProof = Buffer.from(JSON.stringify({ schema: 'windows-edge-toolbar-zoom200-evidence-v1', candidate_sha: sha, job: 'windows-packaging', status: 'success', report_sha256: digest(toolbarReport), manifest_sha256: digest(toolbarManifest) }));
  const imageEvidenceDocument = {
    schema: 'ghcr-image-evidence-v1',
    candidate_sha: sha,
    ci_run_id: 101,
    container_run_id: 102,
    image: `ghcr.io/cullysu/ros-ikuai-monitor-panel:sha-${sha}`,
    oci_index_digest: indexDigest,
    index_revision: sha,
    platforms: {
      'linux/amd64': amd64Digest,
      'linux/arm64': arm64Digest,
    },
  };
  if (typeof mutateImageEvidence === 'function') mutateImageEvidence(imageEvidenceDocument);
  const imageEvidence = Buffer.from(JSON.stringify(imageEvidenceDocument));
  return {
    linuxReport: zip([{ name: 'validation-report.json', data: report }, { name: 'artifact-proof.json', data: linuxProof }]),
    linuxManifest: zip([{ name: 'SHA256SUMS', data: linuxManifest }]),
    windowsBundle: zip(bundleFiles.map(([name, data]) => ({ name, data }))),
    windowsManifest: zip([{ name: 'SHA256SUMS', data: windowsManifest }, { name: 'artifact-proof.json', data: windowsProof }]),
    windowsToolbar: zip([...toolbarPayload, { name: 'SHA256SUMS', data: toolbarManifest }, { name: 'artifact-proof.json', data: toolbarProof }]),
    imageEvidence: zip([{ name: 'ghcr-image-evidence.json', data: imageEvidence }]),
  };
}

function passingFixture() {
  const archives = evidenceArchives();
  return {
    github: {
      remoteMainSha: sha,
      ciRuns: [{ id: 101, head_sha: sha, head_branch: 'main', event: 'push', status: 'completed', conclusion: 'success', updated_at: '2026-08-10T00:00:00Z' }],
      ciJobs: { 101: [{ id: 1, name: 'Linux validation', status: 'completed', conclusion: 'success' }, { id: 2, name: 'Windows packaging', status: 'completed', conclusion: 'success' }] },
      ciArtifacts: { 101: [
        artifact(`ci-linux-validation-report-${sha}`, archives.linuxReport, 1),
        artifact(`ci-linux-validation-manifest-${sha}`, archives.linuxManifest, 2),
        artifact(`ci-windows-bundle-${sha}`, archives.windowsBundle, 3),
        artifact(`ci-windows-sha256-manifest-${sha}`, archives.windowsManifest, 4),
        artifact(`ci-windows-edge-toolbar-zoom200-${sha}`, archives.windowsToolbar, 5),
      ] },
      containerRuns: [{ id: 102, head_sha: sha, head_branch: 'main', event: 'workflow_run', status: 'completed', conclusion: 'success', updated_at: '2026-08-10T00:03:00Z' }],
      containerArtifacts: { 102: [artifact(`ghcr-image-evidence-${sha}`, archives.imageEvidence, 6)] },
    },
    registry: {
      indexDigest,
      index: { mediaType: 'application/vnd.oci.image.index.v1+json', annotations: { 'org.opencontainers.image.revision': sha }, manifests: [{ digest: amd64Digest, platform: { os: 'linux', architecture: 'amd64' } }, { digest: arm64Digest, platform: { os: 'linux', architecture: 'arm64' } }] },
      manifests: { [amd64Digest]: { config: { digest: `sha256:${'4'.repeat(64)}` } }, [arm64Digest]: { config: { digest: `sha256:${'5'.repeat(64)}` } } },
      blobs: { [`sha256:${'4'.repeat(64)}`]: { config: { Labels: { 'org.opencontainers.image.revision': sha } } }, [`sha256:${'5'.repeat(64)}`]: { config: { Labels: { 'org.opencontainers.image.revision': sha } } } },
    },
  };
}

function archiveAt(fixture, index, entries) {
  const archive = zip(entries);
  fixture.github.ciArtifacts[101][index] = artifact(fixture.github.ciArtifacts[101][index].name, archive, index + 1);
}

function replaceToolbarEvidence(fixture, mutateToolbarCell) {
  const archives = evidenceArchives({ mutateToolbarCell });
  fixture.github.ciArtifacts[101][4] = artifact(`ci-windows-edge-toolbar-zoom200-${sha}`, archives.windowsToolbar, 5);
}

function replaceContainerImageEvidence(fixture, mutateImageEvidence) {
  const archives = evidenceArchives({ mutateImageEvidence });
  fixture.github.containerArtifacts[102][0] = artifact(`ghcr-image-evidence-${sha}`, archives.imageEvidence, 6);
}

async function testGhcrAuthentication() {
  const requests = [];
  const challenge = 'Bearer realm="https://token.example/token",service="ghcr.io",scope="repository:cullysu/ros-ikuai-monitor-panel:pull"';
  const fetchImpl = async (url, options = {}) => {
    const headers = options.headers || {}; requests.push({ url: String(url), headers });
    if (String(url).startsWith('https://ghcr.test/v2/')) return headers.authorization ? new Response(JSON.stringify({ mediaType: 'application/vnd.oci.image.index.v1+json', manifests: [] }), { status: 200, headers: { 'content-type': 'application/json' } }) : new Response('', { status: 401, headers: { 'www-authenticate': challenge } });
    if (String(url).startsWith('https://token.example/token')) return new Response(JSON.stringify({ token: 'registry-token' }), { status: 200, headers: { 'content-type': 'application/json' } });
    throw new Error('Unexpected mock request.');
  };
  const transport = remoteTransport({
    repository: 'cullysu/ros-ikuai-monitor-panel',
    environment: { GITHUB_TOKEN: 'github-api-secret', GHCR_USERNAME: 'test-user', GHCR_TOKEN: 'ghcr-secret' },
    fetchImpl,
    testEndpoints: { githubApiBase: 'https://api.github.test', registryBase: 'https://ghcr.test', registryTokenEndpoint: 'https://token.example/token' },
  });
  await transport.getRegistryIndex(`sha-${sha}`);
  assert.ok(!requests.some((request) => request.headers.authorization === 'Bearer github-api-secret'), 'GITHUB_TOKEN must never be sent to GHCR.');
  assert.equal(requests.find((request) => request.url.startsWith('https://token.example/token')).headers.authorization, `Basic ${Buffer.from('test-user:ghcr-secret').toString('base64')}`);
}

async function testRejectsUntrustedGhcrRealmBeforeCredentials() {
  const requests = [];
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url: String(url), headers: options.headers || {} });
    return new Response('', { status: 401, headers: { 'www-authenticate': 'Bearer realm="https://attacker.example/token",service="ghcr.io"' } });
  };
  const transport = remoteTransport({
    repository: 'cullysu/ros-ikuai-monitor-panel',
    environment: { GHCR_USERNAME: 'test-user', GHCR_TOKEN: 'ghcr-secret' },
    fetchImpl,
    testEndpoints: { githubApiBase: 'https://api.github.test', registryBase: 'https://ghcr.test', registryTokenEndpoint: 'https://token.example/token' },
  });
  await assert.rejects(
    () => transport.getRegistryIndex(`sha-${sha}`),
    (error) => error instanceof ReleaseVerificationError && error.code === 'REGISTRY_AUTH_FAILED',
  );
  assert.equal(requests.length, 1, 'an untrusted realm must not receive a second request');
  assert.equal(requests[0].headers.authorization, undefined, 'registry credentials must not be sent before a trusted challenge is accepted');
}

async function testProductionEndpointsIgnoreEnvironmentOverrides() {
  const requests = [];
  const transport = remoteTransport({
    repository: 'cullysu/ros-ikuai-monitor-panel',
    environment: { GITHUB_TOKEN: 'github-api-secret', GHCR_USERNAME: 'test-user', GHCR_TOKEN: 'ghcr-secret', GITHUB_API_URL: 'https://attacker.example', GHCR_REGISTRY_URL: 'https://attacker.example' },
    fetchImpl: async (url, options = {}) => {
      requests.push({ url: String(url), headers: options.headers || {} });
      const body = String(url).startsWith('https://api.github.com/')
        ? { object: { type: 'commit', sha } }
        : { mediaType: 'application/vnd.oci.image.index.v1+json', manifests: [] };
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });
  await transport.readRemoteMain();
  await transport.getRegistryIndex(`sha-${sha}`);
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url.startsWith('https://api.github.com/'), true);
  assert.equal(requests[0].headers.authorization, 'Bearer github-api-secret');
  assert.equal(requests[1].url.startsWith('https://ghcr.io/v2/'), true);
  assert.equal(requests[1].headers.authorization, undefined);
}

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'exact-sha-release-'));
function runFixture(name, fixture) {
  const fixturePath = path.join(temporary, `${name}.json`);
  fs.writeFileSync(fixturePath, JSON.stringify(fixture));
  return spawnSync(process.execPath, ['--max-old-space-size=2048', script, sha, '--fixture', fixturePath], { encoding: 'utf8' });
}
function mustFail(name, alter) { const fixture = passingFixture(); alter(fixture); assert.notEqual(runFixture(name, fixture).status, 0, `${name} must fail closed`); }

async function main() {
  try {
    const passing = runFixture('passing', passingFixture());
    assert.equal(passing.status, 0, passing.stderr);
    assert.match(passing.stdout, /"platforms":\["linux\/amd64","linux\/arm64"\]/);
    assert.match(passing.stdout, /"imageDigest":"sha256:[a-f0-9]{64}"/, 'the exact-SHA verifier must return a persisted immutable OCI index digest');
    mustFail('tampered-proof', (fixture) => archiveAt(fixture, 0, [{ name: 'validation-report.json', data: '{}' }, { name: 'artifact-proof.json', data: '{}' }]));
    mustFail('proof-wrong-sha', (fixture) => { const report = Buffer.from(JSON.stringify({ schema: 'linux-validation-evidence-v1', candidate_sha: sha, job: 'linux-validation', status: 'success' })); const manifest = Buffer.from(`${digest(report)}  validation-report.json\n`); archiveAt(fixture, 0, [{ name: 'validation-report.json', data: report }, { name: 'artifact-proof.json', data: JSON.stringify({ schema: 'release-artifact-proof-v1', candidate_sha: 'b'.repeat(40), job: 'linux-validation', status: 'success', manifest_sha256: digest(manifest) }) }]); });
    mustFail('report-wrong-sha', (fixture) => { const report = Buffer.from(JSON.stringify({ schema: 'linux-validation-evidence-v1', candidate_sha: 'b'.repeat(40), job: 'linux-validation', status: 'success' })); const manifest = Buffer.from(`${digest(report)}  validation-report.json\n`); const proof = Buffer.from(JSON.stringify({ schema: 'release-artifact-proof-v1', candidate_sha: sha, job: 'linux-validation', status: 'success', manifest_sha256: digest(manifest) })); archiveAt(fixture, 0, [{ name: 'validation-report.json', data: report }, { name: 'artifact-proof.json', data: proof }]); archiveAt(fixture, 1, [{ name: 'SHA256SUMS', data: manifest }]); });
    mustFail('bad-linux-manifest', (fixture) => archiveAt(fixture, 1, [{ name: 'SHA256SUMS', data: `${'0'.repeat(64)}  validation-report.json\n` }]));
    mustFail('bad-windows-manifest', (fixture) => archiveAt(fixture, 3, [{ name: 'SHA256SUMS', data: `${'0'.repeat(64)} *README.txt\n` }, { name: 'artifact-proof.json', data: '{}' }]));
    mustFail('missing-windows-toolbar-report', (fixture) => archiveAt(fixture, 4, [{ name: 'SHA256SUMS', data: '' }, { name: 'artifact-proof.json', data: '{}' }]));
    mustFail('bundle-extra', (fixture) => archiveAt(fixture, 2, [{ name: 'README.txt', data: 'release' }, { name: 'bin/panel.exe', data: 'binary' }, { name: 'unlisted.txt', data: 'extra' }]));
    mustFail('bundle-missing', (fixture) => archiveAt(fixture, 2, [{ name: 'README.txt', data: 'release' }]));
    mustFail('unsafe-path', (fixture) => archiveAt(fixture, 0, [{ name: '../artifact-proof.json', data: '{}' }]));
    mustFail('duplicate-path', (fixture) => archiveAt(fixture, 0, [{ name: 'validation-report.json', data: '{}' }, { name: 'validation-report.json', data: '{}' }]));
    mustFail('zip-bomb', (fixture) => archiveAt(fixture, 0, [{ name: 'validation-report.json', data: '', declaredSize: MAX_ENTRY_BYTES + 1 }]));
    mustFail('wrong-artifact-name', (fixture) => { fixture.github.ciArtifacts[101][0].name = `ci-linux-validation-report-${'b'.repeat(40)}`; });
    mustFail('extra-oci-descriptor', (fixture) => { fixture.registry.index.manifests.push({ digest: 'sha256:s390x', platform: { os: 'linux', architecture: 's390x' } }); });
    mustFail('missing-container-image-evidence', (fixture) => { fixture.github.containerArtifacts[102] = []; });
    mustFail('registry-digest-does-not-match-persisted-evidence', (fixture) => { fixture.registry.indexDigest = `sha256:${'6'.repeat(64)}`; });
    mustFail('missing-registry-content-digest', (fixture) => { fixture.registry.indexDigest = ''; });
    mustFail('persisted-platform-descriptor-does-not-match-index', (fixture) => replaceContainerImageEvidence(fixture, (evidence) => {
      evidence.platforms['linux/arm64'] = `sha256:${'7'.repeat(64)}`;
    }));
    mustFail('toolbar-clipped-operational-text', (fixture) => replaceToolbarEvidence(fixture, (cell) => {
      if (cell.viewport.id === 'phone-390' && cell.scenario === 'resource-full') cell.surface.clippedOperationalText.push({ text: 'CPU 负载' });
    }));
    mustFail('toolbar-unreadable-operational-text', (fixture) => replaceToolbarEvidence(fixture, (cell) => {
      if (cell.viewport.id === 'phone-390' && cell.scenario === 'resource-full') cell.surface.unreadableOperationalText.push({ text: 'CPU 负载', fontSize: 9 });
    }));
    await testGhcrAuthentication();
    await testRejectsUntrustedGhcrRealmBeforeCredentials();
    await testProductionEndpointsIgnoreEnvironmentOverrides();
    console.log('exact SHA release verifier fixture tests passed');
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
