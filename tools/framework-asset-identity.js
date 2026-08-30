#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const FRAMEWORK_INPUT_SCHEMA = 'framework-inputs-v1';
const REQUIRED_INPUT_FILES = [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tools/build-framework-inline.mjs',
  'tools/framework-asset-identity.js',
];

function portablePath(value) {
  return value.split(path.sep).join('/');
}

function deterministicPathCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function collectFiles(directory, projectRoot, output) {
  const entries = fs.readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => deterministicPathCompare(left.name, right.name));
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error('framework build inputs cannot contain symlinks: ' + absolute);
    }
    if (entry.isDirectory()) {
      collectFiles(absolute, projectRoot, output);
    } else if (entry.isFile()) {
      output.push(portablePath(path.relative(projectRoot, absolute)));
    }
  }
}

function frameworkInputFiles(projectRoot) {
  const resolvedRoot = path.resolve(projectRoot);
  const sourceRoot = path.join(resolvedRoot, 'src', 'panel-framework');
  if (!fs.statSync(sourceRoot, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error('framework source directory is missing: ' + sourceRoot);
  }

  const files = [...REQUIRED_INPUT_FILES];
  collectFiles(sourceRoot, resolvedRoot, files);
  const unique = [...new Set(files)].sort(deterministicPathCompare);
  for (const relative of unique) {
    const absolute = path.join(resolvedRoot, ...relative.split('/'));
    if (!fs.statSync(absolute, { throwIfNoEntry: false })?.isFile()) {
      throw new Error('framework build input is missing: ' + relative);
    }
  }
  return unique;
}

function computeFrameworkInputIdentity(projectRoot) {
  const resolvedRoot = path.resolve(projectRoot);
  const files = frameworkInputFiles(resolvedRoot);
  const hash = crypto.createHash('sha256');
  hash.update(FRAMEWORK_INPUT_SCHEMA, 'utf8');
  hash.update('\0', 'utf8');
  for (const relative of files) {
    const body = fs.readFileSync(path.join(resolvedRoot, ...relative.split('/')));
    hash.update(relative, 'utf8');
    hash.update('\0', 'utf8');
    hash.update(String(body.length), 'utf8');
    hash.update('\0', 'utf8');
    hash.update(body);
    hash.update('\0', 'utf8');
  }
  return {
    algorithm: 'sha256',
    schema: FRAMEWORK_INPUT_SCHEMA,
    digest: hash.digest('hex'),
    files: files.length,
  };
}

function sha256(body) {
  return crypto.createHash('sha256').update(body).digest('hex');
}

function readOwnedAsset(outputRoot, fileName, label, reasons) {
  if (typeof fileName !== 'string' || !fileName || path.basename(fileName) !== fileName) {
    reasons.push(`${label} file must be a single owned basename`);
    return null;
  }
  const absolute = path.resolve(outputRoot, fileName);
  if (path.dirname(absolute) !== outputRoot) {
    reasons.push(`${label} file escapes the framework asset directory`);
    return null;
  }
  let stat;
  try {
    stat = fs.lstatSync(absolute);
  } catch (error) {
    reasons.push(`${label} file is missing: ${error.message}`);
    return null;
  }
  if (stat.isSymbolicLink() || !stat.isFile()) {
    reasons.push(`${label} file must be a regular non-symlink file`);
    return null;
  }
  return { absolute, body: fs.readFileSync(absolute) };
}

function assertOwnedDirectory(projectRoot, directory, reasons) {
  const root = path.resolve(projectRoot);
  const target = path.resolve(directory);
  const relative = path.relative(root, target);
  if (!relative || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
    reasons.push('framework asset directory escapes the project root');
    return false;
  }
  let rootStat;
  try {
    rootStat = fs.lstatSync(root);
  } catch (error) {
    reasons.push(`framework project root is missing: ${error.message}`);
    return false;
  }
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    reasons.push(`framework project root must be a regular directory: ${root}`);
    return false;
  }
  let current = root;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      reasons.push(`framework asset directory is missing: ${error.message}`);
      return false;
    }
    let realCurrent = current;
    try {
      realCurrent = fs.realpathSync.native(current).replace(/^\\\\\?\\/, '');
    } catch (error) {
      reasons.push(`framework asset directory cannot be resolved: ${error.message}`);
      return false;
    }
    const aliasesAnotherPath = process.platform === 'win32'
      ? realCurrent.toLowerCase() !== path.resolve(current).toLowerCase()
      : realCurrent !== path.resolve(current);
    if (stat.isSymbolicLink() || aliasesAnotherPath || !stat.isDirectory()) {
      reasons.push(`framework asset directory chain must contain regular directories: ${current}`);
      return false;
    }
  }
  return true;
}

function tagAttributes(source) {
  const attributes = new Map();
  const duplicates = new Set();
  const pattern = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = pattern.exec(source))) {
    const name = match[1].toLowerCase();
    if (attributes.has(name)) {
      duplicates.add(name);
      continue;
    }
    attributes.set(name, match[2] ?? match[3] ?? match[4] ?? '');
  }
  return { attributes, duplicates };
}

function publicAssetReferences(indexSource) {
  const activeMarkup = indexSource.replace(/<!--[\s\S]*?-->/g, '');
  const scriptSources = [];
  const stylesheetHrefs = [];
  const issues = [];
  let match;
  const scriptPattern = /<script\b([^>]*)>/gi;
  while ((match = scriptPattern.exec(activeMarkup))) {
    const parsed = tagAttributes(match[1]);
    if (parsed.duplicates.size) {
      issues.push(`script tag contains duplicate attributes: ${[...parsed.duplicates].sort().join(', ')}`);
      continue;
    }
    const type = (parsed.attributes.get('type') || '').trim().toLowerCase();
    if (type && !['module', 'text/javascript', 'application/javascript'].includes(type)) continue;
    const source = parsed.attributes.get('src');
    if (source) scriptSources.push(source);
  }
  const linkPattern = /<link\b([^>]*)>/gi;
  while ((match = linkPattern.exec(activeMarkup))) {
    const parsed = tagAttributes(match[1]);
    if (parsed.duplicates.size) {
      issues.push(`link tag contains duplicate attributes: ${[...parsed.duplicates].sort().join(', ')}`);
      continue;
    }
    const attributes = parsed.attributes;
    const rel = (attributes.get('rel') || '').toLowerCase().split(/\s+/).filter(Boolean);
    const href = attributes.get('href');
    const media = (attributes.get('media') || '').trim().toLowerCase();
    const scopedFrameworkStylesheet = attributes.get('data-overview-framework-asset') === 'desktop-style';
    if (
      href && rel.includes('stylesheet') && !attributes.has('disabled') &&
      ((!media || media === 'all') || scopedFrameworkStylesheet)
    ) stylesheetHrefs.push(href);
  }
  return { scriptSources, stylesheetHrefs, issues };
}

function verifyBuiltAssets(resolvedRoot, manifest, reasons) {
  const outputRoot = path.join(resolvedRoot, 'public', 'assets', 'framework');
  const indexPath = path.join(resolvedRoot, 'public', 'index.html');
  if (!assertOwnedDirectory(resolvedRoot, outputRoot, reasons)) return;
  let indexSource = '';
  try {
    indexSource = fs.readFileSync(indexPath, 'utf8');
  } catch (error) {
    reasons.push('public index is missing or unreadable: ' + error.message);
  }
  const indexReferences = publicAssetReferences(indexSource);
  reasons.push(...indexReferences.issues.map((issue) => `public index ${issue}`));
  const assets = manifest && manifest.assets && typeof manifest.assets === 'object'
    ? manifest.assets
    : null;
  if (!assets) {
    reasons.push('framework manifest does not record built assets');
    return;
  }

  const definitions = [
    { kind: 'mobile script', record: assets.mobile?.script, pattern: /^panel-mobile\.([0-9a-f]{12})\.js$/, type: 'script' },
    { kind: 'mobile style', record: assets.mobile?.style, pattern: /^mobile\.([0-9a-f]{12})\.css$/, type: 'style' },
    { kind: 'desktop script', record: assets.desktop?.script, pattern: /^panel-desktop\.([0-9a-f]{12})\.js$/, type: 'script' },
    { kind: 'desktop style', record: assets.desktop?.style, pattern: /^desktop\.([0-9a-f]{12})\.css$/, type: 'style' },
    { kind: 'surface loader', record: assets.loader, pattern: /^panel-surface-loader\.([0-9a-f]{12})\.js$/, type: 'loader' },
  ];
  const loaderRecord = assets.loader;
  const loaderAsset = loaderRecord && typeof loaderRecord === 'object'
    ? readOwnedAsset(outputRoot, loaderRecord.file, 'surface loader asset', reasons)
    : null;
  const loaderSource = loaderAsset ? loaderAsset.body.toString('utf8') : '';
  for (const definition of definitions) {
    const { kind, record } = definition;
    if (!record || typeof record !== 'object') {
      reasons.push(`framework manifest is missing ${kind} asset identity`);
      continue;
    }
    const match = typeof record.file === 'string' ? definition.pattern.exec(record.file) : null;
    if (!match) {
      reasons.push(`${kind} asset file name is not content-addressed`);
      continue;
    }
    if (typeof record.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(record.sha256)) {
      reasons.push(`${kind} asset sha256 is invalid`);
      continue;
    }
    if (match[1] !== record.sha256.slice(0, 12)) {
      reasons.push(`${kind} asset file name digest does not match manifest sha256`);
    }
    const asset = readOwnedAsset(outputRoot, record.file, `${kind} asset`, reasons);
    if (!asset) continue;
    const actualDigest = sha256(asset.body);
    if (actualDigest !== record.sha256) {
      reasons.push(`${kind} asset sha256 mismatch: manifest=${record.sha256} current=${actualDigest}`);
    }
    if (!Number.isSafeInteger(record.bytes) || record.bytes !== asset.body.length) {
      reasons.push(`${kind} asset byte count mismatch: manifest=${String(record.bytes)} current=${asset.body.length}`);
    }
    const expectedPublicPath = `/assets/framework/${record.file}`;
    if (definition.type === 'loader') {
      if (!indexReferences.scriptSources.includes(expectedPublicPath)) {
        reasons.push('public index does not load the manifest surface loader asset through script src');
      }
    } else {
      if (!loaderSource.includes(record.file) || !loaderSource.includes('/assets/framework/')) {
        reasons.push(`surface loader does not reference the manifest ${kind} asset`);
      }
      if (indexReferences.scriptSources.includes(expectedPublicPath) || indexReferences.stylesheetHrefs.includes(expectedPublicPath)) {
        reasons.push(`public index must not eagerly load the ${kind} asset`);
      }
    }

    const sidecars = [
      { suffix: 'gz', field: 'gzipBytes', decompress: zlib.gunzipSync },
      { suffix: 'br', field: 'brotliBytes', decompress: zlib.brotliDecompressSync },
    ];
    for (const sidecarDefinition of sidecars) {
      const sidecar = readOwnedAsset(
        outputRoot,
        `${record.file}.${sidecarDefinition.suffix}`,
        `${kind} ${sidecarDefinition.suffix} sidecar`,
        reasons
      );
      if (!sidecar) continue;
      const expectedBytes = record[sidecarDefinition.field];
      if (!Number.isSafeInteger(expectedBytes) || expectedBytes !== sidecar.body.length) {
        reasons.push(
          `${kind} ${sidecarDefinition.suffix} sidecar byte count mismatch: ` +
          `manifest=${String(expectedBytes)} current=${sidecar.body.length}`
        );
      }
      try {
        const decompressed = sidecarDefinition.decompress(sidecar.body);
        if (!decompressed.equals(asset.body)) {
          reasons.push(`${kind} ${sidecarDefinition.suffix} sidecar does not decode to the manifest asset`);
        }
      } catch (error) {
        reasons.push(`${kind} ${sidecarDefinition.suffix} sidecar is invalid: ${error.message}`);
      }
    }
  }
}

function verifyFrameworkAssetIdentity(projectRoot) {
  const resolvedRoot = path.resolve(projectRoot);
  const manifestPath = path.join(resolvedRoot, 'public', 'assets', 'framework', 'manifest.json');
  const reasons = [];
  let manifest = null;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    reasons.push('framework manifest is missing or invalid: ' + error.message);
  }

  const actual = computeFrameworkInputIdentity(resolvedRoot);
  const expected = manifest && manifest.inputs && typeof manifest.inputs === 'object'
    ? manifest.inputs
    : null;
  if (!manifest || manifest.version !== 3) {
    reasons.push('framework manifest version 3 is required');
  }
  if (!expected) {
    reasons.push('framework manifest does not record build input identity');
  } else {
    for (const key of ['algorithm', 'schema', 'digest', 'files']) {
      if (expected[key] !== actual[key]) {
        reasons.push(`framework input ${key} mismatch: manifest=${String(expected[key])} current=${String(actual[key])}`);
      }
    }
  }
  verifyBuiltAssets(resolvedRoot, manifest, reasons);

  return {
    pass: reasons.length === 0,
    manifestPath,
    manifestVersion: manifest && manifest.version,
    expected,
    actual,
    reasons,
  };
}

function assertFrameworkAssetIdentity(projectRoot) {
  const report = verifyFrameworkAssetIdentity(projectRoot);
  if (!report.pass) {
    const error = new Error(
      'public framework assets do not belong to the current frontend inputs; run `npm run build`. ' +
      report.reasons.join('; ')
    );
    error.code = 'FRAMEWORK_ASSET_IDENTITY_MISMATCH';
    error.report = report;
    throw error;
  }
  return report;
}

module.exports = {
  FRAMEWORK_INPUT_SCHEMA,
  REQUIRED_INPUT_FILES,
  assertFrameworkAssetIdentity,
  assertOwnedDirectory,
  computeFrameworkInputIdentity,
  frameworkInputFiles,
  verifyFrameworkAssetIdentity,
};
