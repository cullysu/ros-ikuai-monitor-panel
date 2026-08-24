#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

function portablePath(value) {
  return String(value || '').split(path.sep).join('/');
}

function resolveRealAbsolute(value) {
  if (!value || typeof value !== 'string') throw new Error('runtime identity path is missing');
  const resolved = path.resolve(value);
  if (!path.isAbsolute(resolved)) throw new Error(`runtime identity path is not absolute: ${resolved}`);
  return fs.realpathSync.native(resolved);
}

function captureRuntimeIdentity(rootDir) {
  const resolvedRoot = path.resolve(rootDir);
  const entrypoint = process.argv[1] ? path.resolve(process.argv[1]) : '';
  return {
    schema: 'mobile-node-runtime-identity-v1',
    execPath: resolveRealAbsolute(process.execPath),
    version: process.version,
    nodeVersion: String(process.versions.node || ''),
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    entrypoint: entrypoint ? resolveRealAbsolute(entrypoint) : '',
    projectRoot: fs.realpathSync.native(resolvedRoot),
    launcherId: String(process.env.MOBILE_RUNTIME_LAUNCHER_ID || ''),
  };
}

function sameRuntimeCore(left, right) {
  return Boolean(left && right && left.schema === right.schema &&
    left.execPath === right.execPath &&
    left.version === right.version &&
    left.nodeVersion === right.nodeVersion &&
    left.platform === right.platform &&
    left.arch === right.arch &&
    left.entrypoint === right.entrypoint &&
    left.projectRoot === right.projectRoot &&
    left.launcherId === right.launcherId);
}

function sameRuntimeIdentity(left, right) {
  return sameRuntimeCore(left, right) && left.pid === right.pid;
}

// The bounded portable launcher stamps its exact absolute path into the child.
// A direct `node tools/check-...` invocation therefore cannot manufacture the
// producer identity by merely setting an arbitrary NODE_OPTIONS value.
function assertRuntimeLaunchContract(rootDir) {
  const identity = captureRuntimeIdentity(rootDir);
  const expectedLauncher = resolveRealAbsolute(path.join(rootDir, 'tools', 'run-mobile-reference-runtime.js'));
  const expectedEntrypoint = resolveRealAbsolute(path.join(rootDir, 'tools', 'check-mobile-reference-runtime.js'));
  if (identity.launcherId !== expectedLauncher) {
    throw new Error('mobile runtime evidence must be launched by tools/run-mobile-reference-runtime.js');
  }
  if (identity.entrypoint !== expectedEntrypoint) {
    throw new Error('mobile runtime evidence was produced by an unexpected entrypoint');
  }
  return identity;
}

function validateRecordedRuntimeIdentity(identity, rootDir) {
  const errors = [];
  if (identity?.schema !== 'mobile-node-runtime-identity-v1') errors.push('runtime identity schema is missing');
  try {
    if (!identity?.execPath || resolveRealAbsolute(identity.execPath) !== path.resolve(identity.execPath)) {
      errors.push('runtime execPath is not a real absolute path');
    }
  } catch {
    errors.push('runtime execPath cannot be resolved');
  }
  if (!identity?.entrypoint || path.resolve(identity.entrypoint) !== path.resolve(rootDir, 'tools', 'check-mobile-reference-runtime.js')) {
    errors.push('runtime entrypoint is not the mobile reference producer');
  }
  if (identity?.launcherId && path.resolve(identity.launcherId) !== path.resolve(rootDir, 'tools', 'run-mobile-reference-runtime.js')) {
    errors.push('runtime launcher identity is not the bounded portable launcher');
  }
  return errors;
}

module.exports = {
  assertRuntimeLaunchContract,
  captureRuntimeIdentity,
  portablePath,
  sameRuntimeCore,
  sameRuntimeIdentity,
  validateRecordedRuntimeIdentity,
};
