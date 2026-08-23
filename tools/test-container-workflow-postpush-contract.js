#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const workflowPath = path.join(root, '.github', 'workflows', 'container-image.yml');
const candidateExpression = '${{ github.event.workflow_run.head_sha }}';

function contractFailures(source) {
  const failures = [];
  const buildStart = source.indexOf('- name: Build and push exact CI candidate');
  const verifyStart = source.indexOf('- name: Verify published GHCR OCI index');
  const buildStep = buildStart >= 0 ? source.slice(buildStart, verifyStart >= 0 ? verifyStart : undefined) : '';
  const verifyStep = verifyStart >= 0 ? source.slice(verifyStart) : '';

  if (!/^\s{8}id: push$/m.test(buildStep)) failures.push('build-push action must expose id: push');
  if (!/uses: docker\/build-push-action@/.test(buildStep)) failures.push('identified push step must use docker/build-push-action');
  if (!/annotations:\s*\|[\s\S]*?index:org\.opencontainers\.image\.revision=\$\{\{\s*github\.event\.workflow_run\.head_sha\s*\}\}/.test(buildStep)) {
    failures.push('push must annotate the OCI index with the exact candidate revision');
  }
  if (!/^\s{10}provenance: false$/m.test(buildStep)) failures.push('push must avoid extra provenance manifests in the index');
  if (source.indexOf(verifyStep) <= source.indexOf(buildStep)) failures.push('post-push verification must follow the push step');
  if (!/PUSH_DIGEST:\s*\$\{\{\s*steps\.push\.outputs\.digest\s*\}\}/.test(verifyStep)) {
    failures.push('post-push verification must consume the build action digest output');
  }
  if (!new RegExp(`IMAGE_REFERENCE: ghcr\\.io/\\$\\{\\{ github\\.repository \\}\\}:sha-\\$\\{\\{ github\\.event\\.workflow_run\\.head_sha \\}\\}`).test(verifyStep)) {
    failures.push('post-push verification must resolve the exact sha-CANDIDATE_SHA tag');
  }
  if (!/\[\[ "\$PUSH_DIGEST" =~ \^sha256:\[0-9a-f\]\{64\}\$ \]\]/.test(verifyStep)) failures.push('post-push verification must validate digest syntax');
  if (!/docker buildx imagetools inspect "\$IMAGE_REFERENCE" --format '\{\{json \.Manifest\}\}'/.test(verifyStep) ||
      !/const \[manifestPath, pushDigest\] = process\.argv\.slice\(2\);/.test(verifyStep) ||
      !/const manifest = JSON\.parse\(fs\.readFileSync\(manifestPath, 'utf8'\)\);/.test(verifyStep) ||
      !/manifest\.digest !== pushDigest/.test(verifyStep)) {
    failures.push('post-push verification must parse the Manifest JSON digest and compare it with the action output');
  }
  if (verifyStep.includes('{{.Digest}}')) failures.push('post-push verification must not use the unsupported .Digest template field');
  if (!/docker buildx imagetools inspect --raw "\$IMAGE_REFERENCE"/.test(verifyStep)) failures.push('post-push verification must fetch the raw OCI index');
  if (!/application\/vnd\.oci\.image\.index\.v1\+json/.test(verifyStep)) failures.push('raw document must be required to be an OCI index');
  if (!/index\.annotations\?\.\['org\.opencontainers\.image\.revision'\] !== candidateSha/.test(verifyStep)) {
    failures.push('index revision must equal CANDIDATE_SHA');
  }
  if (!verifyStep.includes("new Set(['linux/amd64', 'linux/arm64'])") ||
      !verifyStep.includes('index.manifests.length !== expectedPlatforms.size') ||
      !verifyStep.includes('expectedPlatforms.delete(platformName)')) {
    failures.push('index platforms must be exactly linux/amd64 and linux/arm64');
  }

  return failures;
}

const passingFixture = `- name: Build and push exact CI candidate
        id: push
        uses: docker/build-push-action@0123456789abcdef0123456789abcdef01234567
        with:
          annotations: |
            index:org.opencontainers.image.revision=${candidateExpression}
          provenance: false
- name: Verify published GHCR OCI index
        env:
          IMAGE_REFERENCE: ghcr.io/${'${{ github.repository }}'}:sha-${candidateExpression}
          PUSH_DIGEST: ${'${{ steps.push.outputs.digest }}'}
        run: |
          [[ "$PUSH_DIGEST" =~ ^sha256:[0-9a-f]{64}$ ]]
          docker buildx imagetools inspect "$IMAGE_REFERENCE" --format '{{json .Manifest}}' > "$RUNNER_TEMP/tag-manifest.json"
          const [manifestPath, pushDigest] = process.argv.slice(2);
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          if (manifest.digest !== pushDigest) throw new Error();
          docker buildx imagetools inspect --raw "$IMAGE_REFERENCE"
          const index = { mediaType: 'application/vnd.oci.image.index.v1+json' };
          if (index.annotations?.['org.opencontainers.image.revision'] !== candidateSha) throw new Error();
          const expectedPlatforms = new Set(['linux/amd64', 'linux/arm64']);
          if (index.manifests.length !== expectedPlatforms.size) throw new Error();
          expectedPlatforms.delete(platformName);
`;

assert.deepEqual(contractFailures(passingFixture), []);
assert.match(contractFailures(passingFixture.replace('id: push', 'id: image')).join('\n'), /id: push/);
assert.match(contractFailures(passingFixture.replace('{{json .Manifest}}', '{{.Digest}}')).join('\n'), /Manifest JSON|unsupported \.Digest/);
assert.match(contractFailures(passingFixture.replace("application/vnd.oci.image.index.v1+json", 'application/json')).join('\n'), /OCI index/);
assert.match(contractFailures(passingFixture.replace("'linux/arm64'", "'linux/s390x'")).join('\n'), /linux\/amd64 and linux\/arm64/);

const workflow = fs.readFileSync(workflowPath, 'utf8');
assert.deepEqual(contractFailures(workflow), [], 'container workflow violates the post-push GHCR contract');
console.log('container workflow post-push contract fixtures passed');
