#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const {
  REQUIRED_INPUT_FILES,
  computeFrameworkInputIdentity,
  verifyFrameworkAssetIdentity,
} = require('./framework-asset-identity');

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'framework-identity-'));

function write(relative, body) {
  const target = path.join(fixture, ...relative.split('/'));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, body);
}

function sha256(body) {
  return crypto.createHash('sha256').update(body).digest('hex');
}

function writeBuiltAssets() {
  const definitions = {
    script: { prefix: 'panel-framework', extension: 'js', body: Buffer.from('console.log("framework");\n') },
    style: { prefix: 'style', extension: 'css', body: Buffer.from(':root { color: #123; }\n') },
  };
  const assets = {};
  for (const [kind, definition] of Object.entries(definitions)) {
    const digest = sha256(definition.body);
    const file = `${definition.prefix}.${digest.slice(0, 12)}.${definition.extension}`;
    const gzipBody = zlib.gzipSync(definition.body, { level: 9, mtime: 0 });
    const brotliBody = zlib.brotliCompressSync(definition.body);
    write(`public/assets/framework/${file}`, definition.body);
    write(`public/assets/framework/${file}.gz`, gzipBody);
    write(`public/assets/framework/${file}.br`, brotliBody);
    assets[kind] = {
      file,
      sha256: digest,
      bytes: definition.body.length,
      gzipBytes: gzipBody.length,
      brotliBytes: brotliBody.length,
    };
  }
  write(
    'public/index.html',
    `<div id="app"></div><link rel="stylesheet" href="/assets/framework/${assets.style.file}"><script src="/assets/framework/${assets.script.file}"></script>\n`
  );
  return assets;
}

function writeManifest(inputs, version = 2, assets) {
  write('public/assets/framework/manifest.json', JSON.stringify({ version, inputs, assets }));
}

try {
  for (const relative of REQUIRED_INPUT_FILES) write(relative, relative + '\n');
  write('src/panel-framework/main.tsx', 'export const value = 1;\n');
  write('src/panel-framework/styles.css', ':root { color: #123; }\n');

  const original = computeFrameworkInputIdentity(fixture);
  const assets = writeBuiltAssets();
  writeManifest(original, 2, assets);
  assert.equal(verifyFrameworkAssetIdentity(fixture).pass, true, 'matching inputs must pass');

  const frameworkDirectory = path.join(fixture, 'public', 'assets', 'framework');
  const frameworkDirectoryBackup = path.join(fixture, 'framework-directory-backup');
  const externalFrameworkDirectory = path.join(fixture, 'external-framework-directory');
  fs.mkdirSync(externalFrameworkDirectory, { recursive: true });
  fs.renameSync(frameworkDirectory, frameworkDirectoryBackup);
  let frameworkDirectorySymlinkCreated = false;
  try {
    fs.symlinkSync(externalFrameworkDirectory, frameworkDirectory, 'junction');
    frameworkDirectorySymlinkCreated = true;
  } catch (error) {
    if (!['EPERM', 'EACCES', 'EINVAL'].includes(error.code)) throw error;
  }
  if (frameworkDirectorySymlinkCreated) {
    const directorySymlink = verifyFrameworkAssetIdentity(fixture);
    assert.equal(directorySymlink.pass, false, 'framework output directory symlink must fail closed');
    assert(directorySymlink.reasons.some((reason) => reason.includes('directory chain')));
    fs.unlinkSync(frameworkDirectory);
  }
  fs.renameSync(frameworkDirectoryBackup, frameworkDirectory);

  const scriptPath = `public/assets/framework/${assets.script.file}`;
  const originalScript = fs.readFileSync(path.join(fixture, ...scriptPath.split('/')));
  const mutatedScript = Buffer.from(originalScript);
  mutatedScript[0] ^= 1;
  write(scriptPath, mutatedScript);
  const mutated = verifyFrameworkAssetIdentity(fixture);
  assert.equal(mutated.pass, false, 'a same-size built-asset byte mutation must fail');
  assert(mutated.reasons.some((reason) => reason.includes('sha256 mismatch')));
  write(scriptPath, originalScript);

  const gzipPath = `${scriptPath}.gz`;
  const originalGzip = fs.readFileSync(path.join(fixture, ...gzipPath.split('/')));
  const mutatedGzip = Buffer.from(originalGzip);
  mutatedGzip[mutatedGzip.length - 1] ^= 1;
  write(gzipPath, mutatedGzip);
  const sidecarMutation = verifyFrameworkAssetIdentity(fixture);
  assert.equal(sidecarMutation.pass, false, 'a same-size compressed-sidecar mutation must fail');
  assert(sidecarMutation.reasons.some((reason) => reason.includes('gz sidecar')));
  write(gzipPath, originalGzip);

  write('public/index.html', `<div id="app"></div><link href="/assets/framework/${assets.style.file}">\n`);
  const missingReference = verifyFrameworkAssetIdentity(fixture);
  assert.equal(missingReference.pass, false, 'the public index must reference every manifest asset');
  assert(missingReference.reasons.some((reason) => reason.includes('does not load')));
  write(
    'public/index.html',
    `<div id="app"></div><link rel="stylesheet" href="/assets/framework/${assets.style.file}"><script src="/assets/framework/${assets.script.file}"></script>\n`
  );

  const validStyleLink = `<link rel="stylesheet" href="/assets/framework/${assets.style.file}">`;
  write('public/index.html', `<div id="app"></div><!-- <script src="/assets/framework/${assets.script.file}"></script> -->${validStyleLink}\n`);
  assert.equal(
    verifyFrameworkAssetIdentity(fixture).pass,
    false,
    'a script filename present only in an HTML comment must fail'
  );
  write('public/index.html', `<div id="app" data-script="${assets.script.file}"></div>${validStyleLink}\n`);
  assert.equal(
    verifyFrameworkAssetIdentity(fixture).pass,
    false,
    'a script filename present only in an inert data attribute must fail'
  );
  write('public/index.html', `<div id="app"></div><img src="/assets/framework/${assets.script.file}">${validStyleLink}\n`);
  assert.equal(
    verifyFrameworkAssetIdentity(fixture).pass,
    false,
    'a script filename loaded through the wrong tag must fail'
  );
  write(
    'public/index.html',
    `<div id="app"></div>${validStyleLink}<script src="/wrong.js" src="/assets/framework/${assets.script.file}"></script>\n`
  );
  assert.equal(verifyFrameworkAssetIdentity(fixture).pass, false, 'duplicate script src attributes must fail');
  write(
    'public/index.html',
    `<div id="app"></div><link rel="stylesheet" href="/wrong.css" href="/assets/framework/${assets.style.file}"><script src="/assets/framework/${assets.script.file}"></script>\n`
  );
  assert.equal(verifyFrameworkAssetIdentity(fixture).pass, false, 'duplicate stylesheet href attributes must fail');
  write(
    'public/index.html',
    `<div id="app"></div>${validStyleLink}<script type="application/json" src="/assets/framework/${assets.script.file}"></script>\n`
  );
  assert.equal(verifyFrameworkAssetIdentity(fixture).pass, false, 'an inert script type must fail');
  write(
    'public/index.html',
    `<div id="app"></div><link rel="stylesheet" disabled href="/assets/framework/${assets.style.file}"><script src="/assets/framework/${assets.script.file}"></script>\n`
  );
  assert.equal(verifyFrameworkAssetIdentity(fixture).pass, false, 'a disabled stylesheet must fail');
  write(
    'public/index.html',
    `<div id="app"></div><link rel="stylesheet" media="print" href="/assets/framework/${assets.style.file}"><script src="/assets/framework/${assets.script.file}"></script>\n`
  );
  assert.equal(verifyFrameworkAssetIdentity(fixture).pass, false, 'a non-all-media stylesheet must fail');
  write(
    'public/index.html',
    `<div id="app"></div>${validStyleLink}<script src="/assets/framework/${assets.script.file}"></script>\n`
  );

  const brotliPath = `${scriptPath}.br`;
  const originalBrotli = fs.readFileSync(path.join(fixture, ...brotliPath.split('/')));
  const mutatedBrotli = Buffer.from(originalBrotli);
  mutatedBrotli[mutatedBrotli.length - 1] ^= 1;
  write(brotliPath, mutatedBrotli);
  const brotliMutation = verifyFrameworkAssetIdentity(fixture);
  assert.equal(brotliMutation.pass, false, 'a same-size Brotli sidecar mutation must fail');
  assert(brotliMutation.reasons.some((reason) => reason.includes('br sidecar')));
  write(brotliPath, originalBrotli);

  write('src/panel-framework/main.tsx', 'export const value = 2;\n');
  const stale = verifyFrameworkAssetIdentity(fixture);
  assert.equal(stale.pass, false, 'a managed source change must fail');
  assert(stale.reasons.some((reason) => reason.includes('digest mismatch')));

  write('src/panel-framework/main.tsx', 'export const value = 1;\n');
  write('docs/decision.md', 'unrelated documentation\n');
  write(
    'public/index.html',
    `<div id="app" data-unrelated="changed"></div><link rel="stylesheet" href="/assets/framework/${assets.style.file}"><script src="/assets/framework/${assets.script.file}"></script>\n`
  );
  assert.equal(
    verifyFrameworkAssetIdentity(fixture).pass,
    true,
    'unrelated documentation and generated index changes must not invalidate the bundle'
  );

  writeManifest(original, 1, assets);
  const legacy = verifyFrameworkAssetIdentity(fixture);
  assert.equal(legacy.pass, false, 'legacy manifests must fail closed');
  assert(legacy.reasons.some((reason) => reason.includes('version 2')));

  write('public/assets/framework/manifest.json', JSON.stringify({ version: 2, assets }));
  const missing = verifyFrameworkAssetIdentity(fixture);
  assert.equal(missing.pass, false, 'missing input identity must fail closed');
  assert(missing.reasons.some((reason) => reason.includes('does not record')));

  console.log('[framework-asset-identity] PASS source + bundle + sidecar + public-reference identity');
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}
