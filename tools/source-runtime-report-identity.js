#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { verifyFrameworkAssetIdentity } = require('./framework-asset-identity');
const { gitWorktreeIdentity } = require('./worktree-runtime-identity');

const SOURCE_RUNTIME_REPORT_IDENTITY_SCHEMA = 'source-runtime-report-identity-v1';
const SOURCE_RUNTIME_FILES_SCHEMA = 'source-runtime-files-v1';
const DESKTOP_RESOURCE_REPORT_CONTRACT = 'desktop-resource-density-v4-exact-current';
const WAN_AXIS_REPORT_CONTRACT = 'wan-axis-label-integrity-v3-exact-current';
const FOCUSED_REQUIRED_RUNTIME_FILES = Object.freeze(['panel-framework.js', 'style.css', 'desktop-overview.css']);
const DEFAULT_REPORT_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const MAX_RUNTIME_FILES = 128;
const MAX_RUNTIME_DIRECTORIES = 32;
const MAX_RUNTIME_BYTES = 128 * 1024 * 1024;
const WORKTREE_IDENTITY_FIELDS = Object.freeze([
  'commit',
  'worktreeClean',
  'worktreeFingerprint',
  'reviewContentFingerprint',
  'artifactKey',
  'releaseEvidenceEligible',
  'untrackedFiles',
  'runtimeUntrackedFiles',
  'identityError',
]);

function comparePortableNames(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function portablePath(value) {
  return String(value || '').split(path.sep).join('/');
}

function sha256(body) {
  return crypto.createHash('sha256').update(body).digest('hex');
}

function selectWorktreeIdentity(identity) {
  return Object.fromEntries(WORKTREE_IDENTITY_FIELDS.map((field) => [field, identity?.[field]]));
}

function selectFrameworkIdentity(report) {
  return {
    pass: report?.pass === true,
    manifestVersion: report?.manifestVersion ?? null,
    expected: report?.expected ?? null,
    actual: report?.actual ?? null,
    reasons: Array.isArray(report?.reasons) ? [...report.reasons] : ['framework identity is unavailable'],
  };
}

function captureProjectIdentity(rootDir) {
  const worktree = selectWorktreeIdentity(gitWorktreeIdentity(rootDir));
  let framework;
  try {
    framework = selectFrameworkIdentity(verifyFrameworkAssetIdentity(rootDir));
  } catch (error) {
    framework = {
      pass: false,
      manifestVersion: null,
      expected: null,
      actual: null,
      reasons: [String(error?.message || error)],
    };
  }
  return {
    capturedAt: new Date().toISOString(),
    worktree,
    framework,
  };
}

function sameWorktreeIdentity(left, right) {
  return WORKTREE_IDENTITY_FIELDS.every((field) => left?.[field] === right?.[field]);
}

function sameFrameworkIdentity(left, right) {
  return left?.pass === right?.pass &&
    left?.manifestVersion === right?.manifestVersion &&
    JSON.stringify(left?.expected ?? null) === JSON.stringify(right?.expected ?? null) &&
    JSON.stringify(left?.actual ?? null) === JSON.stringify(right?.actual ?? null) &&
    JSON.stringify(left?.reasons ?? null) === JSON.stringify(right?.reasons ?? null);
}

function sameProjectIdentity(left, right) {
  return sameWorktreeIdentity(left?.worktree, right?.worktree) &&
    sameFrameworkIdentity(left?.framework, right?.framework);
}

function assertRelativeRuntimeFileName(value) {
  const normalized = portablePath(value).replace(/^\.\//, '');
  if (!normalized || normalized.startsWith('/') || normalized.includes('../') || path.isAbsolute(normalized)) {
    throw new Error(`source runtime required file is not a safe relative path: ${String(value)}`);
  }
  return normalized;
}

function isPathInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function sourceRuntimeFileIdentity(runtimeDirectory, requiredFiles = []) {
  const resolvedDirectory = path.resolve(runtimeDirectory);
  const rootStat = fs.lstatSync(resolvedDirectory);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new Error('source runtime root must be a regular non-symlink directory');
  }
  const realRoot = fs.realpathSync.native(resolvedDirectory);
  const required = [...new Set(requiredFiles.map(assertRelativeRuntimeFileName))].sort(comparePortableNames);
  const pending = [resolvedDirectory];
  const files = [];
  let directories = 0;
  let totalBytes = 0;

  while (pending.length) {
    const current = pending.pop();
    directories += 1;
    if (directories > MAX_RUNTIME_DIRECTORIES) throw new Error('source runtime directory count exceeds the bounded limit');
    const currentStat = fs.lstatSync(current);
    const currentReal = fs.realpathSync.native(current);
    if (currentStat.isSymbolicLink() || !currentStat.isDirectory() || !isPathInside(realRoot, currentReal)) {
      throw new Error(`source runtime directory chain is unsafe: ${portablePath(path.relative(resolvedDirectory, current))}`);
    }
    const entries = fs.readdirSync(current, { withFileTypes: true })
      .sort((left, right) => comparePortableNames(left.name, right.name));
    const childDirectories = [];
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      const stat = fs.lstatSync(absolute);
      if (entry.isSymbolicLink() || stat.isSymbolicLink()) {
        throw new Error(`source runtime cannot contain symlinks: ${portablePath(path.relative(resolvedDirectory, absolute))}`);
      }
      if (entry.isDirectory() && stat.isDirectory()) {
        childDirectories.push(absolute);
        continue;
      }
      if (!entry.isFile() || !stat.isFile()) {
        throw new Error(`source runtime contains a non-regular entry: ${portablePath(path.relative(resolvedDirectory, absolute))}`);
      }
      if (files.length >= MAX_RUNTIME_FILES) throw new Error('source runtime file count exceeds the bounded limit');
      const realFile = fs.realpathSync.native(absolute);
      if (!isPathInside(realRoot, realFile)) throw new Error('source runtime file escapes its owned directory');
      const body = fs.readFileSync(absolute);
      totalBytes += body.length;
      if (totalBytes > MAX_RUNTIME_BYTES) throw new Error('source runtime byte count exceeds the bounded limit');
      files.push({
        path: portablePath(path.relative(resolvedDirectory, absolute)),
        bytes: body.length,
        sha256: sha256(body),
      });
    }
    childDirectories.sort(comparePortableNames);
    for (let index = childDirectories.length - 1; index >= 0; index -= 1) pending.push(childDirectories[index]);
  }

  files.sort((left, right) => comparePortableNames(left.path, right.path));
  const actualNames = new Set(files.map((file) => file.path));
  const missing = required.filter((name) => !actualNames.has(name));
  if (missing.length) throw new Error(`source runtime is incomplete: ${missing.join(', ')}`);
  const digest = crypto.createHash('sha256');
  digest.update(`${SOURCE_RUNTIME_FILES_SCHEMA}\0`, 'utf8');
  for (const file of files) {
    digest.update(`${file.path}\0${file.bytes}\0${file.sha256}\0`, 'utf8');
  }
  return {
    schema: SOURCE_RUNTIME_FILES_SCHEMA,
    directory: path.basename(resolvedDirectory),
    requiredFiles: required,
    files,
    bytes: totalBytes,
    digest: digest.digest('hex'),
  };
}

function readAttestedRuntimeFile(runtimeDirectory, requestPath, sourceRuntime) {
  const relative = assertRelativeRuntimeFileName(decodeURIComponent(String(requestPath || '').replace(/^\/+/, '')));
  const record = Array.isArray(sourceRuntime?.files)
    ? sourceRuntime.files.find((file) => file?.path === relative)
    : null;
  if (!record || !Number.isSafeInteger(record.bytes) || !/^[0-9a-f]{64}$/i.test(String(record.sha256 || ''))) {
    throw new Error(`source runtime request is not covered by the build attestation: ${relative}`);
  }
  const resolvedDirectory = path.resolve(runtimeDirectory);
  const realRoot = fs.realpathSync.native(resolvedDirectory);
  const absolute = path.resolve(resolvedDirectory, ...relative.split('/'));
  if (!isPathInside(resolvedDirectory, absolute)) throw new Error('source runtime request escapes its owned directory');
  const stat = fs.lstatSync(absolute);
  const realFile = fs.realpathSync.native(absolute);
  if (stat.isSymbolicLink() || !stat.isFile() || !isPathInside(realRoot, realFile)) {
    throw new Error(`source runtime request is not a regular owned file: ${relative}`);
  }
  const body = fs.readFileSync(absolute);
  if (body.length !== record.bytes || sha256(body) !== record.sha256) {
    throw new Error(`source runtime request differs from the build attestation: ${relative}`);
  }
  return body;
}

function createSourceRuntimeReportIdentity(options) {
  const {
    runtimeDirectory,
    requiredFiles,
    start,
    build,
    browser = null,
    end,
    sourceRuntime = sourceRuntimeFileIdentity(runtimeDirectory, requiredFiles),
  } = options;
  return {
    schema: SOURCE_RUNTIME_REPORT_IDENTITY_SCHEMA,
    start,
    build,
    ...(browser ? { browser } : {}),
    end,
    sourceRuntime: JSON.parse(JSON.stringify(sourceRuntime)),
  };
}

function focusedStageReasons(report, contract) {
  const reasons = [];
  if (contract === DESKTOP_RESOURCE_REPORT_CONTRACT) {
    const expectedViewports = ['1366x768', '1440x900'];
    const requiredChecks = [
      'desktopResourceScenario',
      'compactVerdictVisible',
      'resourceEvidenceVisible',
      'resourceTripletTruthful',
      'workspaceStartsInFixedFirstViewport',
      'firstObjectStartsInFixedFirstViewport',
      'resourcePrecedesWorkspace',
      'noReorderHole',
      'noHorizontalOverflow',
    ];
    const results = Array.isArray(report?.results) ? report.results : [];
    const actualViewports = results.map((result) => `${result?.viewport?.width}x${result?.viewport?.height}`);
    if (results.length !== expectedViewports.length ||
        JSON.stringify([...actualViewports].sort(comparePortableNames)) !== JSON.stringify(expectedViewports)) {
      reasons.push('desktop resource results do not contain the exact required viewports');
    }
    for (const result of results) {
      const checks = result?.checks && typeof result.checks === 'object' ? result.checks : {};
      const checkNames = Object.keys(checks).sort(comparePortableNames);
      if (result?.pass !== true ||
          JSON.stringify(checkNames) !== JSON.stringify([...requiredChecks].sort(comparePortableNames)) ||
          requiredChecks.some((field) => checks[field] !== true)) {
        reasons.push(`desktop resource result is failed or structurally incomplete: ${actualViewports[results.indexOf(result)] || '?'}`);
      }
    }
  } else if (contract === WAN_AXIS_REPORT_CONTRACT) {
    const requiredChecks = [
      'directionPeaksAreExact',
      'leftWanUsesCurrentEvidence',
      'bboxInsideViewBox',
      'domRectInsideSvg',
      'domRectInsideChartContainer',
      'labelHasPositiveAxisGap',
    ];
    const checks = report?.checks && typeof report.checks === 'object' ? report.checks : {};
    const checkNames = Object.keys(checks).sort(comparePortableNames);
    if (JSON.stringify(checkNames) !== JSON.stringify([...requiredChecks].sort(comparePortableNames)) ||
        requiredChecks.some((field) => checks[field] !== true)) {
      reasons.push('WAN axis checks are failed or structurally incomplete');
    }
    const geometry = Array.isArray(report?.geometry) ? report.geometry : [];
    const directions = new Set(geometry.map((item) => item?.direction));
    if (geometry.length < 2 || !directions.has('up') || !directions.has('down')) {
      reasons.push('WAN axis geometry lacks both required directions');
    }
  }
  return reasons;
}

function validateGeneratedAt(value, nowMs, maxAgeMs, reasons) {
  const generatedAtMs = Date.parse(String(value || ''));
  if (!Number.isFinite(generatedAtMs)) {
    reasons.push('report generatedAt is missing or invalid');
    return;
  }
  if (generatedAtMs > nowMs + 5 * 60 * 1000) reasons.push('report generatedAt is in the future');
  if (nowMs - generatedAtMs > maxAgeMs) reasons.push('report is stale');
}

function validateCurrentSourceRuntimeReport(report, options) {
  const reasons = [];
  const {
    rootDir,
    runtimeDirectory,
    requiredFiles = [],
    expectedContract,
    requireFinal = true,
    requireBrowserPhase = requireFinal,
    currentIdentity = captureProjectIdentity(rootDir),
    nowMs = Date.now(),
    maxAgeMs = DEFAULT_REPORT_MAX_AGE_MS,
    errorFields = ['pageErrors', 'consoleErrors', 'requestErrors', 'requestFailures'],
  } = options;

  if (!report || typeof report !== 'object') return { pass: false, complete: false, reasons: ['report is missing or invalid'] };
  if (report.contract !== expectedContract) reasons.push(`report contract mismatch: ${String(report.contract)}`);
  validateGeneratedAt(report.generatedAt, nowMs, maxAgeMs, reasons);
  if (report.stagePass !== true) reasons.push('report stagePass is not true');
  if (requireFinal) {
    if (report.phase !== 'browser') reasons.push('final report phase must be browser');
    if (report.pass !== true) reasons.push('final report pass is not true');
    if (report.complete !== true) reasons.push('final report complete is not true');
    reasons.push(...focusedStageReasons(report, expectedContract));
  } else {
    if (report.phase !== 'build-only') reasons.push('attestation phase must be build-only');
    if (report.pass !== false) reasons.push('build-only attestation pass must remain false');
    if (report.complete !== false) reasons.push('build-only attestation complete must remain false');
  }

  const envelope = report.identity;
  if (!envelope || envelope.schema !== SOURCE_RUNTIME_REPORT_IDENTITY_SCHEMA) {
    reasons.push('source-runtime report identity is missing or has the wrong schema');
  } else {
    const phases = ['start', 'build', 'end'];
    if (requireBrowserPhase) phases.push('browser');
    for (const phaseName of phases) {
      const phase = envelope[phaseName];
      if (!phase || typeof phase !== 'object') {
        reasons.push(`identity phase is missing: ${phaseName}`);
        continue;
      }
      if (!sameProjectIdentity(phase, currentIdentity)) reasons.push(`identity phase is stale: ${phaseName}`);
    }
    if (currentIdentity?.worktree?.identityError) reasons.push('current worktree identity is unavailable');
    if (currentIdentity?.framework?.pass !== true) reasons.push('current framework asset identity is not valid');
    try {
      const currentRuntime = sourceRuntimeFileIdentity(runtimeDirectory, requiredFiles);
      if (JSON.stringify(envelope.sourceRuntime) !== JSON.stringify(currentRuntime)) {
        reasons.push('source runtime files are missing, stale, or tampered');
      }
    } catch (error) {
      reasons.push(`source runtime identity cannot be verified: ${String(error?.message || error)}`);
    }
  }

  for (const field of errorFields) {
    if (!Array.isArray(report[field])) {
      reasons.push(`report ${field} must be an array`);
    } else if (report[field].length) {
      reasons.push(`report ${field} is contaminated (${report[field].length})`);
    }
  }
  return { pass: reasons.length === 0, complete: requireFinal && reasons.length === 0, reasons };
}

function readJsonReport(reportPath) {
  if (!fs.existsSync(reportPath)) return { report: null, error: 'report is missing' };
  try {
    return { report: JSON.parse(fs.readFileSync(reportPath, 'utf8')), error: '' };
  } catch (error) {
    return { report: null, error: `report is invalid JSON: ${String(error?.message || error)}` };
  }
}

module.exports = {
  DESKTOP_RESOURCE_REPORT_CONTRACT,
  DEFAULT_REPORT_MAX_AGE_MS,
  FOCUSED_REQUIRED_RUNTIME_FILES,
  SOURCE_RUNTIME_FILES_SCHEMA,
  SOURCE_RUNTIME_REPORT_IDENTITY_SCHEMA,
  WAN_AXIS_REPORT_CONTRACT,
  captureProjectIdentity,
  createSourceRuntimeReportIdentity,
  focusedStageReasons,
  readAttestedRuntimeFile,
  readJsonReport,
  sameProjectIdentity,
  sameWorktreeIdentity,
  sourceRuntimeFileIdentity,
  validateCurrentSourceRuntimeReport,
};
