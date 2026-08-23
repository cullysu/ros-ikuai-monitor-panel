#!/usr/bin/env node
'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const {
  REQUIRED_INPUT_FILES,
  computeFrameworkInputIdentity,
  verifyFrameworkAssetIdentity,
} = require('./framework-asset-identity');

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'framework-identity-v3-'));

function write(relative, body) {
  const target = path.join(fixture, ...relative.split('/'));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, body);
}

function sha256(body) {
  return crypto.createHash('sha256').update(body).digest('hex');
}

function emit(prefix, extension, body) {
  const digest = sha256(body);
  const file = `${prefix}.${digest.slice(0, 12)}.${extension}`;
  const gzipBody = zlib.gzipSync(body, { level: 9, mtime: 0 });
  const brotliBody = zlib.brotliCompressSync(body);
  write(`public/assets/framework/${file}`, body);
  write(`public/assets/framework/${file}.gz`, gzipBody);
  write(`public/assets/framework/${file}.br`, brotliBody);
  return { file, sha256: digest, bytes: body.length, gzipBytes: gzipBody.length, brotliBytes: brotliBody.length };
}

function writeBuiltAssets() {
  const assets = {
    mobile: {
      script: emit('panel-mobile', 'js', Buffer.from('console.log("mobile");\n')),
      style: emit('mobile', 'css', Buffer.from('.mobile { color: #123; }\n')),
    },
    desktop: {
      script: emit('panel-desktop', 'js', Buffer.from('console.log("desktop");\n')),
      style: emit('desktop', 'css', Buffer.from('.desktop { color: #456; }\n')),
    },
  };
  const loaderBody = Buffer.from([
    assets.mobile.script.file,
    assets.mobile.style.file,
    assets.desktop.script.file,
    assets.desktop.style.file,
  ].map((file) => `/assets/framework/${file}`).join('\n'));
  assets.loader = emit('panel-surface-loader', 'js', loaderBody);
  write('public/index.html', `<div id="app"></div><script src="/assets/framework/${assets.loader.file}"></script>\n`);
  return assets;
}

function writeManifest(inputs, version, assets) {
  write('public/assets/framework/manifest.json', JSON.stringify({ version, inputs, assets }));
}

function restoreIndex(assets, prefix = '<div id="app"></div>') {
  write('public/index.html', `${prefix}<script src="/assets/framework/${assets.loader.file}"></script>\n`);
}

try {
  for (const relative of REQUIRED_INPUT_FILES) write(relative, relative + '\n');
  write('src/panel-framework/main.tsx', 'export const value = 1;\n');
  write('src/panel-framework/styles.css', ':root { color: #123; }\n');

  const original = computeFrameworkInputIdentity(fixture);
  const assets = writeBuiltAssets();
  writeManifest(original, 3, assets);
  assert.equal(verifyFrameworkAssetIdentity(fixture).pass, true, 'matching v3 inputs must pass');

  const frameworkDirectory = path.join(fixture, 'public', 'assets', 'framework');
  const backup = path.join(fixture, 'framework-directory-backup');
  const external = path.join(fixture, 'external-framework-directory');
  fs.mkdirSync(external, { recursive: true });
  fs.renameSync(frameworkDirectory, backup);
  let linked = false;
  try {
    fs.symlinkSync(external, frameworkDirectory, 'junction');
    linked = true;
  } catch (error) {
    if (!['EPERM', 'EACCES', 'EINVAL'].includes(error.code)) throw error;
  }
  if (linked) {
    const report = verifyFrameworkAssetIdentity(fixture);
    assert.equal(report.pass, false, 'framework output directory symlink must fail closed');
    assert(report.reasons.some((reason) => reason.includes('directory chain')));
    fs.unlinkSync(frameworkDirectory);
  }
  fs.renameSync(backup, frameworkDirectory);

  const mobileScriptPath = `public/assets/framework/${assets.mobile.script.file}`;
  const originalScript = fs.readFileSync(path.join(fixture, ...mobileScriptPath.split('/')));
  const mutatedScript = Buffer.from(originalScript);
  mutatedScript[0] ^= 1;
  write(mobileScriptPath, mutatedScript);
  assert(verifyFrameworkAssetIdentity(fixture).reasons.some((reason) => reason.includes('sha256 mismatch')));
  write(mobileScriptPath, originalScript);

  const gzipPath = `${mobileScriptPath}.gz`;
  const originalGzip = fs.readFileSync(path.join(fixture, ...gzipPath.split('/')));
  const mutatedGzip = Buffer.from(originalGzip);
  mutatedGzip[mutatedGzip.length - 1] ^= 1;
  write(gzipPath, mutatedGzip);
  assert(verifyFrameworkAssetIdentity(fixture).reasons.some((reason) => reason.includes('gz sidecar')));
  write(gzipPath, originalGzip);

  write('public/index.html', '<div id="app"></div>\n');
  assert(verifyFrameworkAssetIdentity(fixture).reasons.some((reason) => reason.includes('does not load')));
  write('public/index.html', `<div id="app"></div><!-- <script src="/assets/framework/${assets.loader.file}"></script> -->\n`);
  assert.equal(verifyFrameworkAssetIdentity(fixture).pass, false, 'comment-only loader reference must fail');
  write('public/index.html', `<div data-loader="${assets.loader.file}"></div>\n`);
  assert.equal(verifyFrameworkAssetIdentity(fixture).pass, false, 'inert loader reference must fail');
  write('public/index.html', `<img src="/assets/framework/${assets.loader.file}">\n`);
  assert.equal(verifyFrameworkAssetIdentity(fixture).pass, false, 'wrong loader tag must fail');
  write('public/index.html', `<script src="/wrong.js" src="/assets/framework/${assets.loader.file}"></script>\n`);
  assert.equal(verifyFrameworkAssetIdentity(fixture).pass, false, 'duplicate loader src must fail');
  write('public/index.html', `<script type="application/json" src="/assets/framework/${assets.loader.file}"></script>\n`);
  assert.equal(verifyFrameworkAssetIdentity(fixture).pass, false, 'inert loader type must fail');
  restoreIndex(assets, `<link rel="stylesheet" href="/assets/framework/${assets.mobile.style.file}">`);
  assert(verifyFrameworkAssetIdentity(fixture).reasons.some((reason) => reason.includes('must not eagerly load')));
  restoreIndex(assets);

  const brotliPath = `${mobileScriptPath}.br`;
  const originalBrotli = fs.readFileSync(path.join(fixture, ...brotliPath.split('/')));
  const mutatedBrotli = Buffer.from(originalBrotli);
  mutatedBrotli[mutatedBrotli.length - 1] ^= 1;
  write(brotliPath, mutatedBrotli);
  assert(verifyFrameworkAssetIdentity(fixture).reasons.some((reason) => reason.includes('br sidecar')));
  write(brotliPath, originalBrotli);

  write('src/panel-framework/main.tsx', 'export const value = 2;\n');
  assert(verifyFrameworkAssetIdentity(fixture).reasons.some((reason) => reason.includes('digest mismatch')));
  write('src/panel-framework/main.tsx', 'export const value = 1;\n');
  write('docs/decision.md', 'unrelated documentation\n');
  restoreIndex(assets, '<div id="app" data-unrelated="changed"></div>');
  assert.equal(verifyFrameworkAssetIdentity(fixture).pass, true, 'unrelated documentation and index markup must not invalidate the bundle');

  writeManifest(original, 2, assets);
  const legacy = verifyFrameworkAssetIdentity(fixture);
  assert.equal(legacy.pass, false, 'legacy manifests must fail closed');
  assert(legacy.reasons.some((reason) => reason.includes('version 3')));

  write('public/assets/framework/manifest.json', JSON.stringify({ version: 3, assets }));
  const missing = verifyFrameworkAssetIdentity(fixture);
  assert.equal(missing.pass, false, 'missing input identity must fail closed');
  assert(missing.reasons.some((reason) => reason.includes('does not record')));

  console.log('[framework-asset-identity] PASS v3 dual-surface assets + loader + sidecars + public references');
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}
