#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { assertFrameworkAssetIdentity } = require('./framework-asset-identity');
const { assertFrameworkAssetBudget } = require('./framework-asset-budget');
const { gitWorktreeIdentity } = require('./worktree-runtime-identity');
const { cellKey, verifyCellPngEvidence } = require('./png-evidence-identity');
const { sameRuntimeCore, validateRecordedRuntimeIdentity } = require('./runtime-process-identity');
const { validateToolbarReportEvidence } = require('./check-browser-toolbar-zoom200');
const {
  DESKTOP_RESOURCE_REPORT_CONTRACT,
  FOCUSED_REQUIRED_RUNTIME_FILES,
  WAN_AXIS_REPORT_CONTRACT,
  captureProjectIdentity,
  readJsonReport,
  sameWorktreeIdentity,
  validateCurrentSourceRuntimeReport,
} = require('./source-runtime-report-identity');
// Local matrix reports expose a fail-closed iKuai 4 mobile probe.  The
// dedicated iKuai 4 runtime report proves route/detail/More/connection flows.
const MOBILE_REFERENCE_REQUIRED_CHECKS = Object.freeze([
  'ikuai4Root',
  'evidenceMode',
  'scene',
  'currentOnlyRates',
  'fourNavigationRoots',
  'moreDirectory',
  'objectDetail',
  'noRejectedOwner',
  'interfaceRows',
  'resourceRows',
  'noFalseCurrentData',
]);

const ROOT = path.resolve(__dirname, '..');
const READINESS_CHILD_TIMEOUT_MS = 120000;
const FULL_MATRIX_SCENARIOS = [
  'single',
  'fleet',
  'all-offline',
  'no-snapshot',
  'collection-down',
  'resource-full',
  'interfaces-down',
];
const FULL_MATRIX_VIEWPORT_KEYS = ['desktop', 'desktop1440', 'wide', 'narrow'];
const FULL_MATRIX_CELLS = FULL_MATRIX_SCENARIOS.flatMap((scenario) =>
  FULL_MATRIX_VIEWPORT_KEYS.map((viewport) => `public::${scenario}::overview::${viewport}`));
const OVERVIEW_VIEWPORTS = [
  { name: 'desktop', width: 1366, height: 768 },
  { name: 'desktop1440', width: 1440, height: 900 },
  { name: 'wide', width: 844, height: 390 },
  { name: 'narrow', width: 390, height: 844 },
];
const MOBILE_REFERENCE_VIEWPORTS = Object.freeze([
  Object.freeze({ id: 'phone320', width: 320, height: 568 }),
  Object.freeze({ id: 'phone360', width: 360, height: 800 }),
  Object.freeze({ id: 'phone375', width: 375, height: 667 }),
  Object.freeze({ id: 'phone390', width: 390, height: 844 }),
  Object.freeze({ id: 'phone430', width: 430, height: 932 }),
  Object.freeze({ id: 'landscape568', width: 568, height: 320 }),
  Object.freeze({ id: 'tablet768', width: 768, height: 1024 }),
]);
const MOBILE_RUNTIME_REPORT_RELATIVE = path.join('_acceptance', 'mobile-reference-runtime', 'report.json');
const MOBILE_WORKFLOW_NAMES = Object.freeze([
  'wanDetailHistory', 'wanDetailShortPhoneClearance', 'fourRootNavigation', 'networkDirectory',
  'networkWanDetail', 'moreDirectory', 'connectionAddressValidation', 'resourceDetail',
  'resourceRootSelection', 'interfaceDetail', 'workspaceSearchFilterSort', 'collectionRecoveryAction',
  'noSnapshotRecoveryAction', 'refreshFeedback',
]);
const PUBLIC_ROUTES = [
  'overview', 'interfaces', 'terminals', 'dhcp', 'dns4', 'dns6', 'routes', 'lineStatus',
  'balance', 'trafficLoad', 'loadAudit', 'security', 'arp', 'trafficAudit', 'readonlyDiagnostics',
  'logs', 'serviceLogs', 'connections', 'more',
];
const ROUTE_RESPONSIVE_VIEWPORTS = [
  { name: 'desktop', width: 1600, height: 1000 },
  { name: 'laptop', width: 1366, height: 900 },
  { name: 'tablet', width: 1024, height: 900 },
  { name: 'narrow', width: 390, height: 844 },
];
const ROUTE_STATE_VIEWPORTS = [
  { name: 'desktop', width: 1366, height: 768 },
  { name: 'narrow', width: 390, height: 844 },
];
const TOOLBAR_ZOOM200_REPORT_RELATIVE = path.join('_acceptance', 'edge-toolbar-zoom200', 'report.json');
const FOCUSED_SOURCE_RUNTIME_REPORTS = Object.freeze([
  Object.freeze({
    name: 'desktopResourceDensity',
    contract: DESKTOP_RESOURCE_REPORT_CONTRACT,
    reportRelative: path.join('_acceptance', 'desktop-resource-density-v2', 'report.json'),
    runtimeRelative: path.join('_acceptance', 'desktop-resource-density-v2', 'source-runtime'),
    requiredFiles: FOCUSED_REQUIRED_RUNTIME_FILES,
  }),
  Object.freeze({
    name: 'wanAxisLabelIntegrity',
    contract: WAN_AXIS_REPORT_CONTRACT,
    reportRelative: path.join('_acceptance', 'wan-axis-label-integrity-v1', 'report.json'),
    runtimeRelative: path.join('_acceptance', 'wan-axis-label-integrity-v1', 'source-runtime'),
    requiredFiles: FOCUSED_REQUIRED_RUNTIME_FILES,
  }),
]);

function expectedMatrixCells(scenarios, routes, viewports) {
  return scenarios.flatMap((scenario) => routes.flatMap((section) => viewports.map((viewport) => ({
    profile: 'public',
    scaleScenario: scenario,
    section,
    viewport,
  }))));
}

const OVERVIEW_MATRIX_CELLS = expectedMatrixCells(FULL_MATRIX_SCENARIOS, ['overview'], OVERVIEW_VIEWPORTS);
const ROUTE_RESPONSIVE_MATRIX_CELLS = expectedMatrixCells(['single'], PUBLIC_ROUTES, ROUTE_RESPONSIVE_VIEWPORTS);
const ROUTE_STATE_MATRIX_CELLS = expectedMatrixCells(FULL_MATRIX_SCENARIOS, PUBLIC_ROUTES, ROUTE_STATE_VIEWPORTS);
const MOBILE_MATRIX_CELLS = FULL_MATRIX_SCENARIOS.flatMap((scenario) =>
  MOBILE_REFERENCE_VIEWPORTS.map((viewport) => ({ scenario, viewport })));
const MOBILE_MATRIX_CELL_IDS = MOBILE_MATRIX_CELLS.map((cell) => `${cell.scenario}::${cell.viewport.id}`);

function parseArgs(argv = process.argv.slice(2)) {
  const candidateEvidencePrefixes = [
    '--candidate-commit=',
    '--independent-review-dir=',
    '--soak-report=',
    '--evidence-digest=',
    '--min-soak-seconds=',
    '--min-soak-samples=',
    '--soak-verifier-timeout-ms=',
  ];
  const args = {
    staticOnly: false,
    allowDirtyEngineering: false,
    releaseCandidate: false,
    edgeEvidenceGatedBy: '',
    candidateEvidenceArgs: [],
    help: false,
  };
  for (const item of argv) {
    if (item.startsWith('--edge-evidence-gated-by=')) {
      args.edgeEvidenceGatedBy = item.slice('--edge-evidence-gated-by='.length).trim();
    } else if (item === '--static-only' || item === '--skip-matrix') {
      args.staticOnly = true;
    } else if (item === '--require-matrix' || item === '--full-matrix') {
      args.staticOnly = false;
      args.allowDirtyEngineering = false;
    } else if (item === '--engineering-worktree' || item === '--allow-dirty-engineering') {
      args.staticOnly = false;
      args.allowDirtyEngineering = true;
    } else if (item === '--release-candidate') {
      args.staticOnly = false;
      args.allowDirtyEngineering = false;
      args.releaseCandidate = true;
    } else if (candidateEvidencePrefixes.some((prefix) => item.startsWith(prefix))) {
      args.candidateEvidenceArgs.push(item);
    } else if (item === '--help' || item === '-h') {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${item}`);
    }
  }
  if (args.candidateEvidenceArgs.length && !args.releaseCandidate) {
    throw new Error('Candidate evidence arguments require --release-candidate');
  }
  if (args.releaseCandidate && (args.staticOnly || args.allowDirtyEngineering)) {
    throw new Error('--release-candidate cannot be combined with static-only or dirty engineering modes');
  }
  if (args.edgeEvidenceGatedBy && args.releaseCandidate) {
    throw new Error('--edge-evidence-gated-by cannot be combined with --release-candidate: release-candidate evidence must include the real Edge toolbar report');
  }
  if (args.edgeEvidenceGatedBy && args.staticOnly) {
    throw new Error('--edge-evidence-gated-by is a matrix-evidence boundary and cannot be combined with static-only');
  }
  return args;
}

function usage() {
  return `
Usage:
  node tools/check-public-release-readiness.js [--static-only|--require-matrix|--engineering-worktree|--release-candidate]

Options:
  --static-only     Check static release markers only; skip local browser matrix evidence.
  --skip-matrix     Alias for --static-only.
  --require-matrix   Force the full release-matrix evidence check, even in CI.
  --full-matrix     Alias for --require-matrix.
  --engineering-worktree  Validate current dirty-worktree engineering evidence without granting release eligibility.
  --allow-dirty-engineering  Alias for --engineering-worktree.
  --release-candidate  Require clean exact-SHA matrices plus external review/RouterOS-soak candidate evidence; external promotion authority remains separate.
  --edge-evidence-gated-by=<job>  Delegate the real Edge toolbar 200% report to the named CI job on the same commit; every other matrix evidence requirement stays enforced.
  Candidate evidence options use --name=value and are forwarded to tools/check-release-candidate-evidence.js.
`.trim();
}

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function readIfExists(relPath) {
  const fullPath = path.join(ROOT, relPath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
}

function readReleaseSurface(relPath) {
  return read(relPath);
}

function assertContains(relPath, needle, label = needle) {
  const text = readReleaseSurface(relPath);
  if (!text.includes(needle)) {
    throw new Error(`${relPath} is missing ${label}`);
  }
}

function assertMatches(relPath, pattern, label = pattern.toString()) {
  const text = readReleaseSurface(relPath);
  if (!pattern.test(text)) {
    throw new Error(`${relPath} is missing ${label}`);
  }
}

function hasPinnedDockerBuildPushActionV7(workflowSource) {
  return /^\s*uses:\s*docker\/build-push-action@[0-9a-f]{40}\s+#\s*v7(?:\s|$)/im.test(workflowSource);
}

function assertPinnedDockerBuildPushActionV7(relPath) {
  if (!hasPinnedDockerBuildPushActionV7(readReleaseSurface(relPath))) {
    throw new Error(`${relPath} is missing a SHA-pinned docker/build-push-action v7`);
  }
}

function assertAnyContains(relPath, needles, label = needles.join(' / ')) {
  const text = readReleaseSurface(relPath);
  if (!needles.some((needle) => text.includes(needle))) {
    throw new Error(`${relPath} is missing ${label}`);
  }
}

function assertNotContains(relPath, needle, label = needle) {
  const text = read(relPath);
  if (text.includes(needle)) {
    throw new Error(`${relPath} still contains ${label}`);
  }
}

function assertNotExists(relPath) {
  const filePath = path.join(ROOT, relPath);
  if (fs.existsSync(filePath)) {
    throw new Error(`${relPath} should not exist`);
  }
}

function assertMatches(relPath, pattern, label = pattern) {
  const text = readReleaseSurface(relPath);
  if (!pattern.test(text)) {
    throw new Error(`${relPath} is missing ${label}`);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function isExplicitNotApplicableCheck(check) {
  return Boolean(
    check &&
    typeof check === 'object' &&
    check.applicable === false &&
    check.status === 'not_applicable' &&
    check.pass === null &&
    typeof check.reason === 'string' &&
    check.reason.trim()
  );
}

function reportNestedPassFalsePaths(value, currentPath = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => reportNestedPassFalsePaths(item, currentPath + '/' + index));
  }
  if (!value || typeof value !== 'object') return [];
  const paths = [];
  for (const [key, child] of Object.entries(value)) {
    const childPath = currentPath + '/' + key;
    if (key === 'pass' && child === false) paths.push(childPath);
    paths.push(...reportNestedPassFalsePaths(child, childPath));
  }
  return paths;
}

function runReadinessChild(phase, command, args, options = {}) {
  const { cwd = ROOT, ...childOptions } = options;
  const startedAt = Date.now();
  const result = spawnSync(command, args, {
    ...childOptions,
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: READINESS_CHILD_TIMEOUT_MS,
    killSignal: 'SIGTERM',
    windowsHide: true,
  });
  const elapsedMs = Date.now() - startedAt;
  return {
    ...result,
    phase,
    elapsedMs,
    timedOut: result.error?.code === 'ETIMEDOUT',
  };
}

function readinessChildDiagnostic(result) {
  return `[phase=${result.phase} elapsedMs=${result.elapsedMs} timeoutMs=${READINESS_CHILD_TIMEOUT_MS} status=${result.status ?? 'null'} signal=${result.signal ?? 'none'} timedOut=${result.timedOut}]`;
}

function currentHead(rootDir = ROOT) {
  const result = runReadinessChild('git:rev-parse-head', 'git', ['rev-parse', 'HEAD'], { cwd: rootDir });
  if (result.error) throw new Error(`git identity lookup failed ${readinessChildDiagnostic(result)}\n${result.error.message}`);
  return result.status === 0 ? String(result.stdout || '').trim() : '';
}

function assertNodeContract(relPath, args = []) {
  const result = runReadinessChild(`node:${relPath}`, process.execPath, [path.join(ROOT, relPath), ...args], {
    env: {
      ...process.env,
      CODEX_MEMORY_LIMIT_MB: '2048',
      NODE_OPTIONS: '--max-old-space-size=2048',
    },
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `${relPath} contract failed ${readinessChildDiagnostic(result)}\n${String(result.stdout || '')}${String(result.stderr || '')}${result.error ? `\n${result.error.message}` : ''}`
    );
  }
  try {
    return JSON.parse(String(result.stdout || ""));
  } catch {
    return null;
  }
}

function assertDecisionLedgerFreshness(rootDir = ROOT) {
  const python =
    process.env.PYTHON_EXECUTABLE ||
    (process.platform === 'win32'
      ? 'C:\\Users\\cully\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe'
      : 'python3');
  const args = [path.join(rootDir, 'tools', 'check-decision-ledger-sync.py')];
  const result = runReadinessChild('python:decision-ledger-sync', python, args, { cwd: rootDir });
  if (result.error || result.status !== 0) {
    throw new Error(
      `Decision repository freshness failed ${readinessChildDiagnostic(result)}\n${String(result.stdout || '')}${String(result.stderr || '')}${result.error ? `\n${result.error.message}` : ''}`
    );
  }
  return JSON.parse(result.stdout);
}

function listAcceptanceReports(rootDir = ROOT) {
  const acceptanceDir = path.join(rootDir, '_acceptance');
  if (!fs.existsSync(acceptanceDir)) {
    return [];
  }
  const reports = [];
  for (const entry of fs.readdirSync(acceptanceDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const reportPath = path.join(acceptanceDir, entry.name, 'report.json');
    if (!fs.existsSync(reportPath)) {
      continue;
    }
    const stat = fs.statSync(reportPath);
    if (!stat.isFile()) {
      continue;
    }
    reports.push({ reportPath, mtimeMs: stat.mtimeMs });
  }
  return reports.sort((a, b) => b.mtimeMs - a.mtimeMs || b.reportPath.localeCompare(a.reportPath));
}

function viewportKey(viewport) {
  return `${viewport.name}=${viewport.width}x${viewport.height}`;
}

function matrixCellId(cell) {
  return `${cell?.profile || ''}::${cell?.scaleScenario || ''}::${cell?.section || ''}::${cell?.viewportKey || ''}`;
}

function browserCellId(cell) {
  const viewport = cell?.viewport || {};
  return `${cell?.profile || ''}::${cell?.scaleScenario || ''}::${cell?.requestedSection || ''}::${viewport.name || ''}=${viewport.width}x${viewport.height}`;
}

function expectedCellId(cell) {
  return `${cell.profile}::${cell.scaleScenario}::${cell.section}::${viewportKey(cell.viewport)}`;
}

function listDifference(actual, expected) {
  const actualSet = new Set(actual);
  return expected.filter((item) => !actualSet.has(item));
}

function pngDimensions(filePath) {
  const file = fs.openSync(filePath, 'r');
  try {
    const header = Buffer.alloc(24);
    if (fs.readSync(file, header, 0, header.length, 0) !== header.length) return null;
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (!signature.every((value, index) => header[index] === value)) return null;
    if (header.readUInt32BE(8) !== 13 || header.toString('ascii', 12, 16) !== 'IHDR') return null;
    return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
  } finally {
    fs.closeSync(file);
  }
}

function validateOverviewScreenshots(reportPath, browserChecks, expectedCells) {
  const errors = [];
  const expectedIds = expectedCells.map(expectedCellId);
  const actualIds = browserChecks.map(browserCellId);
  const missingCells = listDifference(actualIds, expectedIds);
  const unexpectedCells = listDifference(expectedIds, actualIds);
  if (browserChecks.length !== expectedIds.length || missingCells.length || unexpectedCells.length) {
    errors.push(`browser cells do not exactly match overview matrix (missing=${missingCells.length}, unexpected=${unexpectedCells.length}, total=${browserChecks.length})`);
    return errors;
  }

  const checksByCell = new Map(browserChecks.map((check) => [browserCellId(check), check]));
  const reportDir = path.dirname(reportPath);
  for (const expected of expectedCells) {
    const id = expectedCellId(expected);
    const check = checksByCell.get(id);
    const fileName = `${expected.profile}-${expected.scaleScenario}-${expected.viewport.name}-${expected.section}.png`;
    if (!check || check.pass !== true) {
      errors.push(`${id} browser cell did not pass`);
      continue;
    }
    if (check.screenshot !== fileName) {
      errors.push(`${id} reports screenshot ${JSON.stringify(check.screenshot)} instead of ${fileName}`);
      continue;
    }
    const filePath = path.resolve(reportDir, fileName);
    const relative = path.relative(reportDir, filePath);
    if (path.isAbsolute(relative) || relative === '..' || relative.startsWith(`..${path.sep}`)) {
      errors.push(`${id} screenshot path escapes report directory`);
      continue;
    }
    let stat;
    try {
      stat = fs.lstatSync(filePath);
    } catch {
      errors.push(`${id} screenshot is missing: ${fileName}`);
      continue;
    }
    if (!stat.isFile() || stat.isSymbolicLink()) {
      errors.push(`${id} screenshot is not a regular file: ${fileName}`);
      continue;
    }
    const dimensions = pngDimensions(filePath);
    if (!dimensions || dimensions.width !== expected.viewport.width || dimensions.height !== expected.viewport.height) {
      errors.push(`${id} screenshot is not a ${expected.viewport.width}x${expected.viewport.height} PNG: ${fileName}`);
    }
  }
  return errors;
}

function validateMatrixReport(reportPath, expectedCells, head, options = {}) {
  const errors = [];
  let report;
  try {
    report = readJson(reportPath);
  } catch (error) {
    return { errors: [`invalid JSON: ${error.message}`] };
  }
  const matrix = report?.matrix;
  const cells = Array.isArray(matrix?.cells) ? matrix.cells : [];
  const browserChecks = Array.isArray(report?.browserChecks) ? report.browserChecks : [];
  const expectedIds = expectedCells.map(expectedCellId);
  const actualIds = cells.map(matrixCellId);
  const browserIds = browserChecks.map(browserCellId);
  const missingCells = listDifference(actualIds, expectedIds);
  const unexpectedCells = listDifference(expectedIds, actualIds);
  const missingBrowserChecks = listDifference(browserIds, expectedIds);
  const unexpectedBrowserChecks = listDifference(expectedIds, browserIds);
  const boundedScopePass = Boolean(
    options.allowBoundedScope &&
    report?.boundedPass === true &&
    matrix?.requestedComplete === true &&
    matrix?.failed === 0
  );
  if (!matrix || matrix.commit !== head) errors.push(`matrix.commit must equal current HEAD ${head}`);
  if (options.requiredWorktreeIdentity) {
    const identity = options.requiredWorktreeIdentity;
    for (const field of ['commit', 'worktreeFingerprint', 'artifactKey', 'worktreeClean', 'releaseEvidenceEligible']) {
      if (matrix?.[field] !== identity[field]) {
        errors.push(`matrix.${field} must equal current runtime worktree identity ${JSON.stringify(identity[field])}`);
      }
    }
  }
  if (matrix?.requestedComplete !== true) errors.push('matrix.requestedComplete must be true');
  if (!boundedScopePass && matrix?.complete !== true) errors.push('matrix.complete must be true');
  if (!Array.isArray(report.failures) || report.failures.length !== 0) errors.push('report.failures must be an empty array');
  if (!boundedScopePass && report.exitCodeShouldFail !== false) errors.push('report.exitCodeShouldFail must be false');
  if (options.allowBoundedScope && report?.boundedPass !== true) errors.push('report.boundedPass must be true');
  if (matrix?.failed !== 0) errors.push('matrix.failed must be 0');
  const nestedFalsePasses = reportNestedPassFalsePaths(report)
    .filter((item) => {
      if (boundedScopePass && (item === '/pass' || item === '/matrix/complete')) return false;
      return options.requireReportPass || item !== '/pass';
    });
  if (nestedFalsePasses.length) {
    errors.push('report contains nested pass=false evidence: ' + nestedFalsePasses.slice(0, 8).join(', '));
  }
  if (!Array.isArray(report.checks)) {
    errors.push('report.checks must be an array');
  } else {
    const failedChecks = report.checks.filter(
      (check) => !isExplicitNotApplicableCheck(check) && (!check || check.pass !== true),
    );
    if (failedChecks.length) {
      errors.push('report checks contain failures: ' + failedChecks.map((check) => check?.name || '(unnamed)').slice(0, 8).join(', '));
    }
  }
  if (cells.length !== expectedIds.length || missingCells.length || unexpectedCells.length) {
    errors.push(`matrix.cells does not exactly match the requested matrix (missing=${missingCells.length}, unexpected=${unexpectedCells.length}, total=${cells.length})`);
  }
  if (!Array.isArray(report.browserChecks) || browserChecks.length !== expectedIds.length || missingBrowserChecks.length || unexpectedBrowserChecks.length) {
    errors.push(`browserChecks does not exactly match the requested matrix (missing=${missingBrowserChecks.length}, unexpected=${unexpectedBrowserChecks.length}, total=${browserChecks.length})`);
  }
  for (const cell of cells) {
    if (cell.pass !== true) errors.push(`${matrixCellId(cell)} did not pass`);
  }
  for (const check of browserChecks) {
    if (check?.pass !== true) errors.push(`${browserCellId(check)} browser check did not pass`);
  }
  if (!boundedScopePass && report.pass !== true) errors.push('report.pass must be true');
  if (options.requireSemanticGates) {
    const checks = Array.isArray(report.checks) ? report.checks.filter(Boolean) : [];
    const checkNames = new Set(checks.map((check) => String(check.name || '').trim()).filter(Boolean));
    const expectedCheckNames = FULL_MATRIX_SCENARIOS.flatMap((scenario) =>
      FULL_MATRIX_VIEWPORT_KEYS.flatMap((viewport) => [
        `browser boot public/${scenario}/${viewport}`,
        `responsive public/${scenario}/${viewport}/overview`,
      ]));
    const missingChecks = listDifference([...checkNames], expectedCheckNames);
    const failedChecks = checks.filter((check) => check.pass !== true).map((check) => check.name || '(unnamed)');
    const gateFailures = collectGateDetailFailures({ checks });
    if (missingChecks.length) errors.push(`overview checks are missing: ${missingChecks.join(', ')}`);
    if (failedChecks.length) errors.push(`overview checks failed: ${failedChecks.join(', ')}`);
    if (Object.values(gateFailures).some((failures) => failures.length)) errors.push('overview semantic gate details are incomplete');
  }
  if (options.requireOverviewScreenshots) {
    if (!Array.isArray(report.browserChecks)) errors.push('report.browserChecks must be an array');
    else errors.push(...validateOverviewScreenshots(reportPath, report.browserChecks, expectedCells));
  }
  return { report, errors };
}

const MAX_MATRIX_REPORT_CANDIDATES = 6;

const MATRIX_REPORT_ALIAS_NAMES = {
  overview: new Set([
    'release-matrix-current',
    'release-matrix-working-tree',
    'release-matrix-worktree',
  ]),
  responsive: new Set([
    'route-matrix-current',
    'route-matrix-working-tree',
    'route-matrix-worktree',
  ]),
  state: new Set([
    'route-state-matrix-current',
    'route-state-matrix-working-tree',
    'route-state-matrix-worktree',
  ]),
};

function matrixReportKind(label) {
  const normalized = String(label || '').toLowerCase();
  if (normalized.includes('route responsive')) return 'responsive';
  if (normalized.includes('route-state')) return 'state';
  return 'overview';
}

function reportNameMatchesKind(name, kind) {
  if (kind === 'responsive') return name.startsWith('route-matrix-');
  if (kind === 'state') return name.startsWith('route-state-matrix-');
  return name.startsWith('release-matrix-');
}

function assertPythonDependencyLockContract(rootDir = ROOT) {
  const python =
    process.env.PYTHON_EXECUTABLE ||
    (process.platform === 'win32'
      ? 'C:\\Users\\cully\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe'
      : 'python3');
  const args = [path.join(rootDir, 'tools', 'check-python-dependency-lock.py')];
  const result = runReadinessChild('python:dependency-lock', python, args, { cwd: rootDir });
  if (result.error || result.status !== 0) {
    throw new Error(
      `Python dependency lock contract failed ${readinessChildDiagnostic(result)}\n${String(result.stdout || '')}${String(result.stderr || '')}${result.error ? `\n${result.error.message}` : ''}`
    );
  }
  let report;
  try {
    report = JSON.parse(String(result.stdout || ''));
  } catch {
    throw new Error('Python dependency lock contract did not return JSON.');
  }
  const supportedContracts = new Set([
    'python-runtime-lock-v1',
    'python-runtime-and-windows-build-lock-v2',
  ]);
  if (
    report?.pass !== true ||
    !supportedContracts.has(report?.contract) ||
    report?.hashLocked !== true ||
    (report?.contract === 'python-runtime-and-windows-build-lock-v2' && report?.windowsBuildHashLocked !== true)
  ) {
    throw new Error('Python dependency lock contract did not confirm the immutable runtime lock.');
  }
  return report;
}

function scoreCurrentMatrixReportCandidate(candidate, kind, head, requiredWorktreeIdentity) {
  const name = path.basename(path.dirname(candidate.reportPath)).toLowerCase();
  const aliases = MATRIX_REPORT_ALIAS_NAMES[kind] || new Set();
  if (!reportNameMatchesKind(name, kind)) return null;

  const artifactKey = String(requiredWorktreeIdentity?.artifactKey || '').toLowerCase();
  if (artifactKey && name.includes(artifactKey)) return 0;

  if (aliases.has(name)) return 1;

  const commitPrefix = String(head || '').toLowerCase().slice(0, 12);
  if (commitPrefix && name.includes(commitPrefix)) return 2;

  if (/(?:^|-)(current|working-tree|worktree)(?:-|$)/.test(name)) return 3;
  return null;
}

function findCurrentMatrixReport(rootDir, label, expectedCells, options = {}) {
  const head = currentHead(rootDir);
  const kind = matrixReportKind(label);
  const candidates = listAcceptanceReports(rootDir)
    .map((candidate) => ({
      ...candidate,
      priority: scoreCurrentMatrixReportCandidate(candidate, kind, head, options.requiredWorktreeIdentity),
    }))
    .filter((candidate) => candidate.priority !== null)
    .sort((left, right) => left.priority - right.priority || right.mtimeMs - left.mtimeMs)
    .slice(0, MAX_MATRIX_REPORT_CANDIDATES);
  const failures = [];
  for (const candidate of candidates) {
    const result = validateMatrixReport(candidate.reportPath, expectedCells, head, options);
    if (result.errors.length === 0) return { reportPath: candidate.reportPath, report: result.report };
    failures.push(`${path.relative(rootDir, candidate.reportPath)}: ${result.errors.join('; ')}`);
  }
  const detail = failures.slice(0, 3).join(' | ');
  throw new Error(`No current ${label} evidence report was found for HEAD ${head || '(unknown)'}; report discovery was bounded to ${candidates.length}/${MAX_MATRIX_REPORT_CANDIDATES} candidates. ${detail}`);
}

function assertToolbarZoom200Report(rootDir = ROOT, currentIdentity = gitWorktreeIdentity(rootDir)) {
  const reportPath = path.join(rootDir, TOOLBAR_ZOOM200_REPORT_RELATIVE);
  if (!fs.existsSync(reportPath)) {
    throw new Error(`actual Edge toolbar 200% report is missing: ${path.relative(rootDir, reportPath)}`);
  }
  let report;
  try {
    report = readJson(reportPath);
  } catch (error) {
    throw new Error(`actual Edge toolbar 200% report is invalid JSON: ${error.message}`);
  }
  const validation = validateToolbarReportEvidence(report, currentIdentity);
  if (!validation.pass) {
    throw new Error(`actual Edge toolbar 200% report is failed, stale, or structurally incomplete: ${validation.errors.join('; ')}`);
  }
  return { reportPath, report };
}

function parseResponsiveCheckName(name) {
  const match = /^responsive public\/([^/]+)\/([^/]+)\/overview$/u.exec(String(name || '').trim());
  return match ? { scenario: match[1], viewport: match[2] } : null;
}

function collectGateDetailFailures(latest) {
  const gateFailures = {
    desktopSemantic: [],
    noSnapshotSemantic: [],
    mobileSemantic: [],
  };
  for (const check of Array.isArray(latest && latest.checks) ? latest.checks : []) {
    if (!check) continue;
    const parsed = parseResponsiveCheckName(check.name);
    if (!parsed) continue;
    const detail = check.detail && typeof check.detail === 'object' ? check.detail : {};
    const pushFailure = (bucket, field, value) => {
      gateFailures[bucket].push({
        check: String(check.name || '').trim(),
        field,
        value,
      });
    };
    const assertProbeChecks = (bucket, probe) => {
      const entries = Object.entries(probe && typeof probe.checks === 'object' ? probe.checks : {});
      if (!entries.length) pushFailure(bucket, 'probe.checks', null);
      for (const [field, value] of entries) {
        if (value !== true) pushFailure(bucket, `checks.${field}`, value);
      }
    };

    if (parsed.viewport === 'desktop' || parsed.viewport === 'desktop1440' || parsed.viewport === 'wide') {
      const probe = detail.desktopOverviewLedgerProbe && typeof detail.desktopOverviewLedgerProbe === 'object'
        ? detail.desktopOverviewLedgerProbe
        : {};
      if (check.pass !== true) pushFailure('desktopSemantic', 'check.pass', check.pass);
      if (detail.surface !== 'desktop-overview') pushFailure('desktopSemantic', 'surface', detail.surface);
      if (probe.contract !== 'legacy-desktop-task-v1') pushFailure('desktopSemantic', 'contract', probe.contract);
      if (probe.visualGrammar !== 'ikuai-4-ipad') pushFailure('desktopSemantic', 'visualGrammar', probe.visualGrammar);
      assertProbeChecks('desktopSemantic', probe);
      if (parsed.scenario === 'no-snapshot') {
        if (probe.evidenceMode !== 'unavailable') pushFailure('noSnapshotSemantic', 'evidenceMode', probe.evidenceMode);
        if (probe.risk !== 'evidence') pushFailure('noSnapshotSemantic', 'risk', probe.risk);
      }
    }

    if (parsed.viewport === 'narrow') {
      const probe = detail.mobileReferenceGateProbe && typeof detail.mobileReferenceGateProbe === 'object'
        ? detail.mobileReferenceGateProbe
        : {};
      if (check.pass !== true) pushFailure('mobileSemantic', 'check.pass', check.pass);
      if (detail.surface !== 'mobile-overview') pushFailure('mobileSemantic', 'surface', detail.surface);
      if (probe.contract !== 'mobile-reference-runtime-v1') pushFailure('mobileSemantic', 'contract', probe.contract);
      if (probe.appHomePass !== true) pushFailure('mobileSemantic', 'appHomePass', probe.appHomePass);
      assertProbeChecks('mobileSemantic', probe);
      const reportedRequiredChecks = Array.isArray(probe.requiredChecks)
        ? probe.requiredChecks.map((field) => String(field || '').trim()).filter(Boolean)
        : [];
      const duplicateRequiredChecks = [...new Set(reportedRequiredChecks.filter(
        (field, index) => reportedRequiredChecks.indexOf(field) !== index
      ))];
      const actualCheckFields = Object.keys(probe.checks && typeof probe.checks === 'object' ? probe.checks : {});
      const missingRequiredChecks = listDifference(reportedRequiredChecks, MOBILE_REFERENCE_REQUIRED_CHECKS);
      const unexpectedRequiredChecks = listDifference(MOBILE_REFERENCE_REQUIRED_CHECKS, reportedRequiredChecks);
      const missingActualChecks = listDifference(actualCheckFields, MOBILE_REFERENCE_REQUIRED_CHECKS);
      const unexpectedActualChecks = listDifference(MOBILE_REFERENCE_REQUIRED_CHECKS, actualCheckFields);
      if (duplicateRequiredChecks.length) {
        pushFailure('mobileSemantic', 'requiredChecks.duplicates', duplicateRequiredChecks);
      }
      if (missingRequiredChecks.length) {
        pushFailure('mobileSemantic', 'requiredChecks.missing', missingRequiredChecks);
      }
      if (unexpectedRequiredChecks.length) {
        pushFailure('mobileSemantic', 'requiredChecks.unexpected', unexpectedRequiredChecks);
      }
      if (missingActualChecks.length) {
        pushFailure('mobileSemantic', 'checks.missing', missingActualChecks);
      }
      if (unexpectedActualChecks.length) {
        pushFailure('mobileSemantic', 'checks.unexpected', unexpectedActualChecks);
      }
      for (const field of MOBILE_REFERENCE_REQUIRED_CHECKS) {
        if (probe.checks?.[field] !== true) {
          pushFailure('mobileSemantic', `checks.${field}`, probe.checks?.[field]);
        }
      }
      if (parsed.scenario === 'no-snapshot') {
        if (probe.truthMode !== 'unavailable') pushFailure('noSnapshotSemantic', 'truthMode', probe.truthMode);
        if (probe.risk !== 'evidence') pushFailure('noSnapshotSemantic', 'risk', probe.risk);
        if (probe.checks?.noFalseCurrentData !== true) {
          pushFailure('noSnapshotSemantic', 'checks.noFalseCurrentData', probe.checks?.noFalseCurrentData);
        }
      }
    }
  }
  return gateFailures;
}

function mobileCellId(cell) {
  return `${cell?.scenario}::${cell?.viewport?.id}`;
}

function validateMobileRuntimeReport(reportPath, currentIdentity, options = {}) {
  let report;
  try {
    report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  } catch (error) {
    return { report: null, errors: [`invalid mobile runtime JSON: ${error.message}`] };
  }

  const errors = [];
  const evidenceRoot = path.resolve(reportPath, '..', '..', '..');
  const push = (message) => errors.push(message);
  const matrix = report?.matrix;
  const cells = Array.isArray(report?.cells) ? report.cells : [];
  const actualCellIds = cells.map(mobileCellId);
  const actualSet = new Set(actualCellIds);
  const missingCells = MOBILE_MATRIX_CELL_IDS.filter((id) => !actualSet.has(id));
  const unexpectedCells = actualCellIds.filter((id) => !MOBILE_MATRIX_CELL_IDS.includes(id));

  if (report?.contract !== 'mobile-reference-runtime-v1') push(`contract must be mobile-reference-runtime-v1: ${JSON.stringify(report?.contract)}`);
  if (report?.evidenceContract !== 'mobile-decoded-png-runtime-v1') push('decoded PNG evidence contract is missing or stale');
  if (!Number.isFinite(Date.parse(report?.generatedAt || ''))) push('generatedAt is missing or invalid');
  else if (Date.parse(report.generatedAt) > Date.now() + 5 * 60 * 1000) push('generatedAt is in the future');
  else if (Date.now() - Date.parse(report.generatedAt) > 24 * 60 * 60 * 1000) push('mobile runtime report is older than 24 hours');
  if (report?.pass !== true || report?.complete !== true || report?.smokePass !== true) push('mobile runtime report is not a passing complete run');
  if (report?.mode !== undefined || matrix?.mode !== 'full') push('mobile evidence is not marked as a full run');
  if (matrix?.append !== false) push('final mobile evidence may not come from an unresolved append request');
  const relativeOutput = path.relative(evidenceRoot, path.resolve(evidenceRoot, String(report?.outputDirectory || '')));
  if (relativeOutput.startsWith('..') || path.isAbsolute(relativeOutput) || relativeOutput.replace(/\\/g, '/') !== '_acceptance/mobile-reference-runtime') {
    push('full mobile evidence output directory is missing or mixed with smoke evidence');
  }
  if (path.basename(reportPath) !== 'report.json') push('full mobile report must use report.json in its isolated full directory');

  for (const field of ['commit', 'worktreeFingerprint', 'artifactKey', 'reviewContentFingerprint', 'worktreeClean', 'releaseEvidenceEligible']) {
    if (report?.[field] !== currentIdentity[field]) {
      push(`report.${field} must equal current runtime worktree identity ${JSON.stringify(currentIdentity[field])}`);
    }
  }
  if (report?.freshness !== true || report?.runtimeFreshness !== true) push('source or Node runtime identity changed during production');
  if (!Array.isArray(report?.evidenceErrors) || report.evidenceErrors.length) push('recorded decoded-PNG evidence errors are present');
  if (matrix?.required !== 49 || matrix?.completed !== 49 || matrix?.failed !== 0 || matrix?.remaining !== 0) {
    push(`matrix is not exactly 49 verified cells: required=${matrix?.required}, completed=${matrix?.completed}, failed=${matrix?.failed}, remaining=${matrix?.remaining}`);
  }
  if (missingCells.length || unexpectedCells.length || actualSet.size !== actualCellIds.length) {
    push(`mobile cells do not exactly match 7x7 (missing=${missingCells.length}, unexpected=${unexpectedCells.length}, total=${actualCellIds.length})`);
  }

  const workflowNames = Object.keys(report?.workflows || {});
  if (workflowNames.length !== MOBILE_WORKFLOW_NAMES.length || MOBILE_WORKFLOW_NAMES.some((name) => report.workflows[name] !== true)) {
    push('one or more real interaction workflows are missing or failed');
  }

  const runtimeStart = report?.runtimeStart;
  const runtimeEnd = report?.runtimeEnd;
  if (!sameRuntimeCore(runtimeStart, runtimeEnd)) push('runtime identity phases do not describe one producer');
  for (const phaseError of validateRecordedRuntimeIdentity(runtimeEnd, evidenceRoot)) push(phaseError);
  if (runtimeEnd && !path.isAbsolute(String(runtimeEnd.execPath || ''))) push('runtime execPath is not absolute');

  const viewportByName = new Map(MOBILE_REFERENCE_VIEWPORTS.map((viewport) => [viewport.id, viewport]));
  for (let index = 0; index < Math.max(cells.length, MOBILE_MATRIX_CELLS.length); index += 1) {
    const cell = cells[index];
    const expected = MOBILE_MATRIX_CELLS[index];
    if (!expected) break;
    if (!cell || mobileCellId(cell) !== mobileCellId(expected)) continue;
    if (cell.pass !== true) push(`${mobileCellId(expected)} did not pass`);
    errors.push(...verifyCellPngEvidence(cell, evidenceRoot, expected.viewport.width, expected.viewport.height)
      .map((item) => `${item} (release evidence)`));
  }
  if (!MOBILE_MATRIX_CELLS.every((expected) => {
    const cell = cells.find((candidate) => mobileCellId(candidate) === mobileCellId(expected));
    return Boolean(cell);
  })) push('every one of the 49 required PNGs must exist before release validation continues');

  if (options.requireReleaseEligibility === true && report?.releaseEvidenceEligible !== true) {
    push('mobile runtime evidence is not eligible for public release');
  }
  return { report, errors: [...new Set(errors)] };
}

function assertMobileRuntimeReport(rootDir = ROOT, currentIdentity = gitWorktreeIdentity(rootDir), options = {}) {
  const reportPath = path.join(rootDir, MOBILE_RUNTIME_REPORT_RELATIVE);
  const validated = validateMobileRuntimeReport(reportPath, currentIdentity, options);
  if (validated.errors.length) {
    throw new Error(`Current 7x7 mobile runtime evidence is incomplete: ${validated.errors.slice(0, 10).join(" | ")}`);
  }
  return { reportPath, report: validated.report };
}

function assertLatestFullMatrixReport(rootDir = ROOT, requiredWorktreeIdentity = null) {
  return findCurrentMatrixReport(rootDir, '7x4 overview visual matrix', OVERVIEW_MATRIX_CELLS, {
    requireReportPass: true,
    requireSemanticGates: true,
    requireOverviewScreenshots: true,
    requiredWorktreeIdentity,
  });
}

function assertMatrixEvidenceIdentity(evidence, currentIdentity) {
  const names = ['overview', 'routeResponsive', 'routeState', 'mobileReference'];
  const rows = names.map((name) => ({ name, matrix: evidence?.[name]?.report?.matrix }));
  const missing = rows.filter((row) => !row.matrix).map((row) => row.name);
  if (missing.length) throw new Error(`Matrix identity is missing for: ${missing.join(', ')}`);
  const fields = ['commit', 'worktreeFingerprint', 'artifactKey', 'worktreeClean', 'releaseEvidenceEligible'];
  const mismatches = [];
  for (const row of rows) {
    for (const field of fields) {
      if (row.matrix[field] !== currentIdentity[field]) {
        mismatches.push(`${row.name}.${field}=${JSON.stringify(row.matrix[field])}`);
      }
    }
  }
  if (mismatches.length) {
    throw new Error(`Matrix reports do not share the current runtime worktree identity: ${mismatches.join(', ')}`);
  }
  return {
    ...currentIdentity,
    releaseEvidenceEligible: currentIdentity.releaseEvidenceEligible === true && rows.every((row) => row.matrix.releaseEvidenceEligible === true),
  };
}

function matrixEvidenceStatusMessage(identity, overviewReportPath = '') {
  const location = overviewReportPath ? `: ${overviewReportPath}` : '';
  return identity.releaseEvidenceEligible
    ? `[ok] current clean-SHA release matrix evidence is complete${location}`
    : `[ok] current worktree engineering matrix evidence is complete; release ineligible${location}`;
}

function assertEvidenceModeEligibility(identity, { allowDirtyEngineering = false } = {}) {
  if (identity.releaseEvidenceEligible !== true && !allowDirtyEngineering) {
    throw new Error('Public release readiness requires clean worktree/commit evidence; use --engineering-worktree only for explicitly release-ineligible local verification');
  }
  return identity;
}

function assertFocusedSourceRuntimeReports(rootDir = ROOT, options = {}) {
  const currentIdentity = options.currentIdentity || captureProjectIdentity(rootDir);
  const reports = {};
  const failures = [];
  for (const definition of FOCUSED_SOURCE_RUNTIME_REPORTS) {
    const reportPath = path.join(rootDir, definition.reportRelative);
    const runtimeDirectory = path.join(rootDir, definition.runtimeRelative);
    const loaded = readJsonReport(reportPath);
    if (!loaded.report) {
      failures.push(`${definition.name}: ${loaded.error || 'report is missing'}`);
      continue;
    }
    const validation = validateCurrentSourceRuntimeReport(loaded.report, {
      rootDir,
      runtimeDirectory,
      requiredFiles: definition.requiredFiles,
      expectedContract: definition.contract,
      currentIdentity,
      ...(Number.isFinite(options.nowMs) ? { nowMs: options.nowMs } : {}),
      ...(Number.isFinite(options.maxAgeMs) ? { maxAgeMs: options.maxAgeMs } : {}),
    });
    if (!validation.pass || !validation.complete) {
      failures.push(`${definition.name}: ${validation.reasons.join('; ')}`);
      continue;
    }
    reports[definition.name] = { reportPath, runtimeDirectory, report: loaded.report, validation };
  }
  if (failures.length) {
    throw new Error(`Focused exact-current desktop evidence is incomplete: ${failures.join(' | ')}`);
  }
  return reports;
}

function assertRequiredMatrixEvidence(rootDir = ROOT, options = {}) {
  const evidence = {};
  const failures = [];
  const currentIdentity = gitWorktreeIdentity(rootDir);
  if (currentIdentity.identityError) {
    throw new Error(`Current runtime worktree identity is unavailable: ${currentIdentity.identityError}`);
  }
  const focusedCurrentIdentity = captureProjectIdentity(rootDir);
  if (!sameWorktreeIdentity(currentIdentity, focusedCurrentIdentity.worktree)) {
    throw new Error('Current runtime worktree identity changed while release evidence validation started');
  }
  const collect = (name, assertion) => {
    try {
      evidence[name] = assertion();
    } catch (error) {
      failures.push(error.message);
    }
  };
  collect('overview', () => assertLatestFullMatrixReport(rootDir, currentIdentity));
  collect('mobileReference', () => assertMobileRuntimeReport(rootDir, currentIdentity, {
    requireReleaseEligibility: !options.allowDirtyEngineering,
  }));
  collect('routeResponsive', () => findCurrentMatrixReport(
    rootDir,
    '19x4 single-scenario route responsive matrix',
    ROUTE_RESPONSIVE_MATRIX_CELLS,
    { requiredWorktreeIdentity: currentIdentity, allowBoundedScope: true }
  ));
  collect('routeState', () => findCurrentMatrixReport(
    rootDir,
    '19x7x2 route-state matrix',
    ROUTE_STATE_MATRIX_CELLS,
    { requiredWorktreeIdentity: currentIdentity, allowBoundedScope: true }
  ));
  if (options.edgeEvidenceGatedBy) {
    evidence.toolbarZoom200 = {
      delegated: true,
      gatedByJob: options.edgeEvidenceGatedBy,
      boundary: `real Edge toolbar 200% evidence is gated by the "${options.edgeEvidenceGatedBy}" CI job on commit ${currentIdentity.commit}`,
    };
  } else {
    collect('toolbarZoom200', () => assertToolbarZoom200Report(rootDir, currentIdentity));
  }
  collect('focusedSourceRuntime', () => assertFocusedSourceRuntimeReports(rootDir, {
    currentIdentity: focusedCurrentIdentity,
  }));
  if (failures.length) throw new Error(`Required current-HEAD release evidence is incomplete: ${failures.join(' | ')}`);
  const endIdentity = captureProjectIdentity(rootDir);
  if (!sameWorktreeIdentity(currentIdentity, endIdentity.worktree) ||
      JSON.stringify(focusedCurrentIdentity.framework) !== JSON.stringify(endIdentity.framework)) {
    throw new Error('Current source/framework identity changed during release evidence validation');
  }
  evidence.focusedSourceRuntime = assertFocusedSourceRuntimeReports(rootDir, {
    currentIdentity: endIdentity,
  });
  evidence.matrixIdentity = assertMatrixEvidenceIdentity(evidence, currentIdentity);
  assertEvidenceModeEligibility(evidence.matrixIdentity, options);
  return evidence;
}

function assertPublicBoundaryClean(relPath) {
  const banned = [
    'semanticTriage',
    'actionQueue',
    'manual_review',
    'nextStep',
    '处理建议',
    '风险优先队列',
    '诊断主线',
    '数据新鲜',
    '当前数据新鲜',
  ];
  for (const needle of banned) {
    assertNotContains(relPath, needle);
  }
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(usage());
    return;
  }
  assertDecisionLedgerFreshness();
  assertFrameworkAssetIdentity(ROOT);
  assertFrameworkAssetBudget(ROOT);
  assertNodeContract('tools/check-public-release-readiness-lifecycle.js');
  assertNodeContract('tools/test-framework-asset-budget.js');
  const routeMaturityReport = assertNodeContract('tools/check-route-maturity-contract.js', ['--contract-only']);
  assertNodeContract('tools/check-route-maturity-report.js');
  assertNodeContract('tools/test-local-predeploy-matrix-contract.js');
  assertNodeContract('tools/check-report-truth.js');
  assertNodeContract('tools/check-public-readiness-report-truth.js');
  assertNodeContract('tools/test-public-release-semantic-gates.js');
  assertNodeContract('tools/test-browser-toolbar-zoom200-readiness.js');

  const ghcrImage = 'ghcr.io/cullysu/ros-ikuai-monitor-panel:sha-<40-hex-commit-sha>';
  const immutableGhcrImagePattern = /ghcr\.io\/cullysu\/ros-ikuai-monitor-panel:sha-<40-hex-commit-sha>/;

  assertContains('.github/workflows/container-image.yml', 'packages: write');
  assertPinnedDockerBuildPushActionV7('.github/workflows/container-image.yml');
  assertContains('.github/workflows/container-image.yml', 'platforms: linux/amd64,linux/arm64');
  assertContains('.github/workflows/container-image.yml', 'ghcr.io/${{ github.repository }}');
  assertContains('.github/workflows/container-image.yml', 'name: ghcr-image-evidence-${{ github.event.workflow_run.head_sha }}');
  assertContains('.github/workflows/container-image.yml', 'oci_index_digest: pushDigest');
  assertContains('.github/workflows/container-image.yml', 'actions/upload-artifact@65c4c4a1ddee5b72f698fdd19549f0f0fb45cf08');
  assertContains('tools/check-exact-sha-release-cl.js', "REQUIRED_CONTAINER_IMAGE_EVIDENCE = 'ghcr-image-evidence'");
  assertContains('tools/check-exact-sha-release-cl.js', "get('docker-content-digest')");
  assertContains('.github/workflows/ci.yml', '--scale-scenarios single,fleet,all-offline,no-snapshot,collection-down,resource-full,interfaces-down');
  assertContains('.github/workflows/ci.yml', '--sections overview');
  assertNotContains('.github/workflows/ci.yml', '--sections overview-edge-cases');
  assertContains('.github/workflows/ci.yml', '--viewports desktop=1366x768,desktop1440=1440x900,wide=844x390,narrow=390x844');

  assertContains('compose.yml', '${ROS_PANEL_IMAGE:-routeros-triage-panel:local}');
  assertContains('.env.docker.example', 'ROS_PANEL_IMAGE=routeros-triage-panel:local');
  assertContains('.env.docker.example', `# ROS_PANEL_IMAGE=${ghcrImage}`);
  assertContains('install.sh', 'DEFAULT_LOCAL_IMAGE="routeros-triage-panel:local"');
  assertContains('install.sh', '[[ "$image" =~ ^ghcr\\.io/cullysu/ros-ikuai-monitor-panel:sha-[0-9a-f]{40}$ ]]');
  assertContains('install.sh', '--prebuilt requires --image ghcr.io/cullysu/ros-ikuai-monitor-panel:sha-<40-hex-commit-sha>');
  assertContains('install.sh', 'pull routeros-triage');
  assertContains('install.sh', 'Could not pull the requested immutable prebuilt image. Use --build-local to build from source.');
  assertNotContains('install.sh', 'falling back to local Docker build');
  assertContains('install.sh', '--prebuilt');
  assertContains('install.sh', '--build-local');
  assertContains('install.sh', '--local-only');
  assertContains('install.sh', 'PUBLISHED_ADDR="127.0.0.1"');
  assertContains('install.sh', '--lan is not supported by the public installer');
  assertContains('install.sh', 'exposure:   localhost-only');
  assertContains('install.sh', 'ROS_PANEL_TRUST_PROXY_HEADERS');
  assertContains('install.sh', 'ROS_PANEL_ALLOW_DOCKER_HOST_FORWARD');
  assertContains('install.sh', 'ROS_PANEL_ALLOW_LOCALHOST_HOST_FORWARD');
  assertContains('install.sh', 'ROS_PANEL_IP_ALIAS_WRITE_ENABLED');
  assertContains('install.sh', 'ROS_PANEL_EXPOSE_ADMIN_SESSIONS');
  assertContains('install.sh', 'ROS_PANEL_LOCAL_SETTINGS_WRITE_ENABLED');

  assertContains('PRODUCT_MODEL.md', '## Public Delivery Contract');
  assertContains('PRODUCT_MODEL.md', 'Docker / Compose');
  assertContains('PRODUCT_MODEL.md', 'Windows EXE');
  assertContains('PRODUCT_MODEL.md', 'Linux systemd / VM');
  assertContains('PRODUCT_MODEL.md', 'RouterOS Container');
  assertContains('README.md', '## Public Delivery Matrix');
  assertContains('README.zh-CN.md', '## 公开交付矩阵');
  assertContains('DEPLOY_DOCKER.md', 'Docker / Compose is one of the four public delivery modes');
  assertContains('DEPLOY_WINDOWS_EXE.md', 'Windows EXE is one of the four public delivery modes');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', 'RouterOS Container is one of the four public delivery modes');
  assertContains('DEPLOY_LOCAL.md', 'Local Python is a development and trial path');

  assertContains('tools/build-routeros-container-archive.sh', 'docker buildx build');
  assertContains('tools/build-routeros-container-archive.sh', 'docker save');
  assertContains('tools/check-container-host-ingress-smoke.py', 'ROS_PANEL_ALLOW_DOCKER_HOST_FORWARD=1');
  assertContains('tools/check-container-host-ingress-smoke.py', 'session write without CSRF');
  assertContains('tools/check-container-host-ingress-smoke.py', "headers={'Host':'127.0.0.1:28646'}");
  assertContains('.github/workflows/ci.yml', 'Docker host-ingress smoke gate');
  assertContains('.github/workflows/ci.yml', 'python3 tools/check-container-host-ingress-smoke.py');
  assertContains('.github/workflows/ci.yml', 'python -m compileall -q app.py panel_backend tools');
  assertContains('tools/build-routeros-container-archive.sh', '--provenance=false');
  assertContains('tools/build-routeros-container-archive.sh', 'convert-oci-to-routeros-docker-archive.py');
  assertContains('tools/build-routeros-container-archive.sh', 'Use a client-local forwarder');
  assertContains('tools/convert-oci-to-routeros-docker-archive.py', 'IMAGE_INDEX_MEDIA_TYPES');
  assertContains('.gitignore', '/*.tar');
  assertContains('DEPLOY_DOCKER.md', ghcrImage);
  assertContains('README.md', ghcrImage);
  assertContains('README.md', 'Default public path: build a RouterOS-friendly archive locally');
  assertMatches('DEPLOY_ROUTEROS_CONTAINER.md', immutableGhcrImagePattern);
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', 'The default public path is to build a RouterOS-friendly archive locally');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', 'Local archive, default public path');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', 'Optional registry image, only after the exact immutable GHCR package is public');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', 'connect-routeros-container-localhost.ps1');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', 'http://127.0.0.1:28646/');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', 'Host header guard');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', 'ROS_PANEL_ALLOW_LOCALHOST_HOST_FORWARD=1');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', 'ROS_PANEL_LOCALHOST_FORWARD_TOKEN');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', '--forward-token');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', 'Host: 127.0.0.1:28646');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', 'and running');
  assertContains('tools/build-routeros-container-archive.sh', 'wait until it is not running');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', '/container/start [find where root-dir="disk1/routeros-triage"]');
  assertNotContains('DEPLOY_ROUTEROS_CONTAINER.md', 'YOUR_ORG/routeros-triage-panel:TAG');
  assertNotContains('DEPLOY_ROUTEROS_CONTAINER.md', 'remote-image~"routeros-triage-panel"');
  assertNotContains('DEPLOY_ROUTEROS_CONTAINER.md', ':main');
  assertNotContains('DEPLOY_ROUTEROS_CONTAINER.md', ':latest');

  assertContains('Dockerfile', 'USER panel');
  assertPythonDependencyLockContract();
  assertContains('Dockerfile', 'ROS_PANEL_ALLOW_LOCALHOST_HOST_FORWARD=0');
  assertContains('Dockerfile', 'ROS_PANEL_ALLOW_DOCKER_HOST_FORWARD=0');
  assertNotContains('Dockerfile', 'ROS_PANEL_LOCALHOST_FORWARD_TOKEN=', 'forward token baked into image defaults');
  assertContains('Dockerfile', 'ROS_PANEL_LOCAL_SETTINGS_WRITE_ENABLED=0');
  assertContains('Dockerfile', 'chown -R root:root /app');
  assertContains('Dockerfile', 'COPY panel_backend ./panel_backend');
  assertContains('Dockerfile', 'chown panel:panel /app/data');
  assertContains('Dockerfile', 'chmod 0750 /app/data');
  assertContains('compose.yml', 'read_only: true');
  assertContains('compose.yml', '127.0.0.1:${ROS_PANEL_PUBLISHED_PORT:-28646}:${ROS_PANEL_PORT:-28646}');
  assertNotContains('compose.yml', '${ROS_PANEL_PUBLISHED_ADDR:-', 'overridable Docker host bind');
  assertContains('compose.yml', 'ROS_PANEL_ALLOW_LOCALHOST_HOST_FORWARD: "${ROS_PANEL_ALLOW_LOCALHOST_HOST_FORWARD:-0}"');
  assertContains('compose.yml', 'ROS_PANEL_ALLOW_DOCKER_HOST_FORWARD: "${ROS_PANEL_ALLOW_DOCKER_HOST_FORWARD:-1}"');
  assertContains('compose.yml', 'ROS_PANEL_LOCALHOST_FORWARD_TOKEN: "${ROS_PANEL_LOCALHOST_FORWARD_TOKEN:-}"');
  assertContains('compose.yml', 'ROS_PANEL_LOCAL_SETTINGS_WRITE_ENABLED: "${ROS_PANEL_LOCAL_SETTINGS_WRITE_ENABLED:-0}"');
  assertContains('compose.yml', 'no-new-privileges:true');
  assertContains('deploy_linux.sh', 'useradd --system --user-group');
  assertContains('deploy_linux.sh', 'ROS_PANEL_LOCAL_SETTINGS_WRITE_ENABLED="${ROS_PANEL_LOCAL_SETTINGS_WRITE_ENABLED:-0}"');
  assertContains('deploy_linux.sh', 'sudo chown -R root:root "${APP_DIR}"');
  assertContains('deploy_linux.sh', 'sudo chown -R "${PANEL_RUNTIME_USER}:${PANEL_RUNTIME_GROUP}" "${APP_DIR}/data"');
  assertContains('deploy_linux.sh', 'curl -fsS "http://127.0.0.1:${ROS_PANEL_PORT}/api/health"');
  assertContains('routeros-panel.service', 'User=routeros-panel');
  assertContains('routeros-panel.service', 'Group=routeros-panel');
  assertNotContains('routeros-panel.service', 'ros-panel-ip.service', 'implicit IP helper dependency');
  assertContains('routeros-panel@.service', 'User=routeros-panel');
  assertContains('routeros-panel@.service', 'Group=routeros-panel');
  assertNotContains('routeros-panel@.service', 'ros-panel-ip@.service', 'implicit template IP helper dependency');
  assertContains('tools/build-windows-exe.ps1', 'ROS_PANEL_BIND=127.0.0.1');
  assertContains('tools/build-windows-exe.ps1', 'ROS_PANEL_LOCAL_SETTINGS_WRITE_ENABLED=1');
  assertContains('app.py', 'PANEL_LOCAL_SETTINGS_ENV_KEYS = ("ROS_PANEL_BIND", "ROS_PANEL_PORT", "ROS_PANEL_TARGET_IP")');
  assertContains('app.py', '"routerosConfigWrites": False');
  assertContains('README.zh-CN.md', '不会向 RouterOS 写入任何路由、防火墙、接口或其他配置');
  assertContains('.github/workflows/ci.yml', 'Windows env is missing loopback bind default');
  assertContains('.github/workflows/ci.yml', 'Windows env is missing panel address write default');
  assertContains('src/panel-framework/connection/RouterConnectionScreen.tsx', 'data-router-login-form');
  assertContains('src/panel-framework/connection/RouterConnectionScreen.tsx', '连接并进入面板');
  assertContains('src/panel-framework/connection/RouterConnectionScreen.tsx', '确认并固定此指纹；以后发生变化时阻断连接');
  assertContains('src/panel-framework/connection/RouterConnectionScreen.tsx', 'REST 使用 HTTPS 并验证证书；不会自动降级到 HTTP。');
  assertContains('src/panel-framework/connection/RouterConnectionScreen.tsx', 'name="rememberProfile"');
  assertContains('src/panel-framework/runtime/panelApi.ts', '/api/router-login');
  assertContains('src/panel-framework/runtime/panelApi.ts', 'rememberProfile: input.rememberProfile');
  assertContains('src/panel-framework/runtime/panelRuntimeSchema.ts', 'export function validatePanelSnapshot');
  assertContains('src/panel-framework/runtime/usePanelRuntime.ts', 'window.setTimeout(() => void refresh');
  assertContains('src/panel-framework/runtime/usePanelRuntime.ts', 'window.addEventListener("offline"');
  assertContains('src/panel-framework/runtime/usePanelRuntime.ts', 'window.addEventListener("online"');
  assertContains('src/panel-framework/runtime/usePanelRuntime.ts', 'document.addEventListener("visibilitychange"');
  assertContains('src/panel-framework/mobile/MobilePanelApp.tsx', '<PanelSnapshotContractError issues={validated.issues} />');
  assertContains('src/panel-framework/surface/PanelSurfaceShared.tsx', 'clientEvidenceBoundary: boundary');

  assertContains('README.md', '# RouterOS Read-only Status Panel');
  assertContains('README.zh-CN.md', '# RouterOS 只读状态面板');
  assertContains('README.md', 'status visibility');
  assertContains('README.md', 'not configuration management');
  assertContains('README.zh-CN.md', '不做配置管理');
  assertContains('PRODUCT_MODEL.md', 'Public UI should not imply automatic repair, configuration management, or');

  for (const route of [
    'overview', 'interfaces', 'terminals', 'dhcp', 'dns4', 'dns6', 'routes', 'lineStatus',
    'balance', 'trafficLoad', 'loadAudit', 'security', 'arp', 'trafficAudit', 'readonlyDiagnostics',
    'logs', 'serviceLogs', 'connections', 'more',
  ]) assertContains('src/panel-framework/routes/panelRoutes.ts', `"${route}"`);
  assertContains('src/panel-framework/routes/panelRoutes.ts', 'primaryDestination');
  assertContains('src/panel-framework/routes/panelRoutes.ts', 'workspaceGroup');
  assertContains('src/panel-framework/routes/panelRoutes.ts', 'placement');
  assertContains('src/panel-framework/routes/usePanelRoute.ts', 'window.addEventListener("popstate"');
  assertContains('src/panel-framework/routes/usePanelRoute.ts', 'window.history.pushState');
  assertContains('src/panel-framework/routes/usePanelRoute.ts', 'window.history.replaceState');
  assertNotContains('src/panel-framework/routes/usePanelRoute.ts', 'querySelectorAll<HTMLElement>("[data-section]")', 'legacy DOM route ownership');
  assertContains('src/panel-framework/mobile/MobilePanelApp.tsx', 'route === "overview"');
  assertContains('src/panel-framework/mobile/MobilePanelApp.tsx', '<MobileReferenceSurface route={route}');
  assertContains('src/panel-framework/desktop/DesktopPanelApp.tsx', '<OperationalSectionPage route={route}');
  assertContains('tools/acceptance/inspect-panel-routes.js', 'history.forward()');
  assertContains('tools/acceptance/inspect-panel-routes.js', 'canonicalUnknown');

  assertContains('public/assets/framework/panel-mobile.js', 'data-mobile-reference-home');
  assertContains('public/assets/framework/panel-mobile.js', 'data-evidence-mode');
  assertContains('public/assets/framework/panel-mobile.js', 'data-mobile-reference-navigation');
   assertContains('public/assets/framework/panel-mobile.js', 'data-mobile-reference-workspace');
  assertContains('public/assets/framework/panel-mobile.js', 'data-mobile-reference-connection');
  assertNotContains('public/assets/framework/panel-mobile.js', 'data-mobile-ops-overview', 'retired mobile owner leaked into mobile bundle');
  assertNotContains('public/assets/framework/panel-mobile.js', 'data-desktop-overview', 'desktop owner leaked into mobile bundle');
  assertContains('public/assets/framework/panel-desktop.js', 'data-desktop-overview');
  assertContains('public/assets/framework/panel-desktop.js', 'data-panel-route-content');
  assertNotContains('public/assets/framework/panel-desktop.js', 'data-mobile-reference-home', 'mobile owner leaked into desktop bundle');
  for (const asset of ['public/assets/framework/panel-mobile.js', 'public/assets/framework/panel-desktop.js']) {
    assertNotContains(asset, 'data-panel-mobile-next', 'retired mobile-next owner');
    assertNotContains(asset, 'data-mobile-native');
    assertNotContains(asset, 'mn-topology');
    assertNotContains(asset, 'mn-sheet');
    assertNotContains(asset, 'data-linkboard-root');
    assertNotContains(asset, 'data-pocket-console-root', 'superseded Pocket Console owner');
  }
  assertContains('src/panel-framework/mobile/MobilePanelApp.tsx', '<MobileReferenceSurface');
  assertContains('src/panel-framework/mobile/MobilePanelApp.tsx', '<MobileReferenceNavigation');
  assertContains('src/panel-framework/mobile/MobilePanelApp.tsx', '<MobileReferenceSurface');
  assertContains('src/panel-framework/mobile/MobilePanelApp.tsx', '<MobileReferenceConnection');
  assertContains('src/panel-framework/mobile-reference-ui/MobileReferenceSurface.tsx', 'data-mobile-reference-home');
  assertContains('src/panel-framework/mobile-reference-ui/MobileReferenceSurface.tsx', 'data-evidence-mode={evidence.evidenceMode}');
  assertContains('src/panel-framework/mobile-reference-ui/MobileReferenceSurface.tsx', 'evidence.evidenceMode === "current" && evidence.traffic?.status === "ready"');
  assertContains('src/panel-framework/mobile-reference-ui/MobileReferenceSurface.tsx', 'evidence.routeEvidence.activePath');
  assertContains('src/panel-framework/mobile-reference-ui/MobileReferenceSurface.tsx', 'data-mobile-reference-navigation');
  assertContains('src/panel-framework/mobile-reference-ui/MobileReferenceSurface.tsx', 'data-mobile-reference-directory');
  assertContains('src/panel-framework/mobile-reference-ui/MobileReferenceConnection.tsx', 'data-mobile-reference-connection="form"');
  assertNotExists('src/panel-framework/mobile-pulse');
  assertNotExists('src/panel-framework/overview/mobile-overview/pocket-console');
  assertNotExists('src/panel-framework/overview/mobile-overview/MobileLinkboard.tsx');
  assertNotExists('src/panel-framework/overview/mobile-overview/LinkboardTimeEvidence.tsx');
  assertNotExists('src/panel-framework/overview/mobile-overview/linkboardModel.ts');
  assertNotExists('src/panel-framework/overview/mobile-overview/scenes/NativeOperationsCanvas.tsx');
  assertNotExists('src/panel-framework/overview/mobile-overview/scenes/operationsPrimitives.tsx');
  assertContains('src/panel-framework/domain-workspace/workspaceHistory.ts', 'window.history.pushState');
  assertContains('src/panel-framework/domain-workspace/workspaceHistory.ts', 'window.addEventListener("popstate"');
  assertContains('src/panel-framework/domain-workspace/domainDefinitions.ts', 'domainDefinitionFor');
  assertContains('src/panel-framework/domain-workspace/domainDefinitions.ts', 'sortWorkspaceRows');
  assertContains('src/panel-framework/sections/DesktopDomainWorkspace.tsx', 'data-desktop-domain-workspace');
  assertContains('src/panel-framework/sections/DesktopDomainWorkspace.tsx', 'type="search"');
  assertContains('src/panel-framework/sections/DesktopDomainWorkspace.tsx', 'filterWorkspaceRows');
  assertContains('src/panel-framework/sections/DesktopDomainWorkspace.tsx', 'sortWorkspaceRows');
  assertContains('src/panel-framework/sections/DesktopDomainInspector.tsx', 'data-desktop-object-detail');
  assertContains('src/panel-framework/sections/DesktopDomainInspector.tsx', 'InterfaceEvidence');
  assertContains('src/panel-framework/sections/DesktopDomainInspector.tsx', 'LogEvidence');
  assertNotContains('src/panel-framework/sections/OperationalSectionPage.tsx', 'DataTable', 'retired generic desktop data table');
  assertContains('src/panel-framework/domain-workspace/workspaceHistory.ts', 'panelObject');
  assertNotContains('src/panel-framework/domain-workspace/workspaceHistory.ts', 'mobileObject', 'surface-specific history state');
  assertContains('src/panel-framework/sections/panelObjectIdentity.ts', 'stablePanelObjectId');
  assertContains('src/panel-framework/sections/panelObjectIdentity.ts', 'panelObjectIdForValues');
  assertContains('.agents/skills/router-panel-product-loop/SKILL.md', 'emil-design-engineering.md');
  assertContains('.agents/skills/router-panel-product-loop/references/emil-design-engineering.md', 'emilkowalski/skills');
  assertContains('tools/check-mobile-reference-accessibility-runtime.js', 'MobileReferenceSurface.tsx');
  assertContains('tools/check-mobile-reference-accessibility-runtime.js', 'data-mobile-reference-navigation');
  assertContains('tools/check-mobile-reference-accessibility-runtime.js', 'MobileReferenceSurface.tsx');
  assertContains('tools/check-mobile-reference-accessibility-runtime.js', 'MobileReferenceConnection.tsx');
  assertContains('tools/check-mobile-reference-accessibility-runtime.js', 'page.goForward(');
  assertNotContains('src/panel-framework/mobile-reference-ui/mobile-reference.css', '!important');
  assertNotContains('src/panel-framework/sections/section-timeseries.css', '!important');

  assertContains('src/panel-framework/overview/desktop-overview/LegacyDesktopOverview.tsx', 'data-desktop-overview');
  assertContains('src/panel-framework/overview/desktop-overview/LegacyDesktopOverview.tsx', 'data-desktop-status-bus');
  assertContains('src/panel-framework/overview/desktop-overview/LegacyDesktopOverview.tsx', 'data-visual-grammar="ikuai-4-ipad"');
  assertContains('src/panel-framework/overview/desktop-overview/LegacyDesktopOverview.tsx', 'viewBox={`0 0 ${WIDTH} ${HEIGHT}`}');
  assertContains('src/panel-framework/overview/desktop-overview/LegacyDesktopOverview.tsx', '<title id={titleId}>');
  assertContains('src/panel-framework/overview/desktop-overview/LegacyDesktopOverview.tsx', '<desc id={descId}>');
  assertNotExists('src/panel-framework/overview/desktop-overview/DesktopLedger.tsx');
  assertNotExists('src/panel-framework/overview/desktop-overview/DesktopWanEvidence.tsx');

  assertContains('src/panel-framework/overview/evidence-model/overviewEvidenceTypes.ts', '"current" | "historical" | "unavailable"');
  assertContains('src/panel-framework/overview/deriveOverviewState.ts', 'route.active === true && route.disabled !== true');
  assertContains('src/panel-framework/overview/evidence-model/buildOverviewInstruments.ts', 'if (rowDown === null || rowUp === null) return null;');
  assertContains('src/panel-framework/overview/evidence-model/resourceHistorySamples.ts', 'for (let index = points.length - 1;', 'shared trailing resource continuity owner');
  assertContains('src/panel-framework/overview/evidence-model/buildOverviewEvidenceModel.ts', 'resourceEvidenceWindow(snapshot)', 'Overview shared resource evidence consumer');
  assertContains('src/panel-framework/overview/evidence-model/buildOverviewInstruments.ts', 'Math.abs(snapshotAt - last.timestamp)');
  assertNotContains('src/panel-framework/overview/evidence-model/buildOverviewEvidenceModel.ts', 'rows[0]');
  assertContains('tools/check-mobile-reference-model.js', 'missing traffic values must remain unavailable instead of becoming zero');
  assertContains('tools/check-mobile-reference-model.js', 'fleet scale must not outrank the highest current risk');
  assertContains('tools/check-mobile-reference-architecture.js', 'MobileReferenceSurface.tsx');
  assertContains('tools/check-mobile-reference-architecture.js', 'MobileReferenceSurface.tsx');
  assertContains('tools/check-mobile-reference-architecture.js', 'MobileReferenceSurface.tsx');
  assertContains('tools/check-mobile-reference-architecture.js', 'MobileReferenceSurface.tsx');
  assertContains('tools/check-mobile-reference-connection-security.js', 'sshHostKeyFingerprint');
  assertContains('tools/check-mobile-reference-connection-security.js', 'sshHostKeyFingerprint');
  assertContains('tools/check-mobile-reference-runtime.js', 'contract: "mobile-reference-runtime-v1"');
  assertContains('tools/check-mobile-reference-runtime.js', 'wanDetailHistory');
  assertContains('tools/check-mobile-reference-runtime.js', 'moreDirectory');
  assertContains('tools/check-mobile-reference-runtime.js', 'connectionAddressValidation');
  assertContains('tools/check-mobile-reference-runtime.js', 'releaseEvidenceEligible: false');
  assertNotExists('src/panel-framework/mobile-next');
  assertNotExists('tools/check-mobile-next-runtime.js');
  assertNotExists('tools/check-pocket-console-runtime.js');
  assertNotExists('tools/lib/pocket-console-runtime/runtime.js');
  assertContains('src/panel-framework/overview/desktop-overview/LegacyDesktopOverview.tsx', 'data-overview-task-contract="legacy-desktop-task-v1"');
  assertContains('tools/acceptance/inspect-overview-desktop-layout.js', "getAttribute('data-overview-task-contract')");
  assertContains('tools/acceptance/inspect-overview-desktop-layout.js', "=== 'legacy-desktop-task-v1'");
  assertNotContains('tools/acceptance/inspect-overview-desktop-layout.js', 'cold-blue-operations-ledger', 'superseded desktop visual-label contract');
  assertContains('.github/workflows/ci.yml', 'node tools/test-local-predeploy-matrix-contract.js');
  assertContains('.github/workflows/ci.yml', 'node tools/test-public-release-semantic-gates.js');
  assertContains('.github/workflows/ci.yml', '--sections public-release');
  assertContains('.github/workflows/ci.yml', '_acceptance/route-matrix-${{ github.sha }}');
  {
    const ciWorkflow = readReleaseSurface('.github/workflows/ci.yml');
    const scripts = JSON.parse(readReleaseSurface('package.json')).scripts || {};
    const invokesRuntimeBrowser = ciWorkflow.includes('npm run check:runtime-browser') || (
      ciWorkflow.includes('npm run check:release-gates') &&
      String(scripts['check:release-gates'] || '').includes('npm run check:runtime-browser')
    );
    if (!invokesRuntimeBrowser) {
      throw new Error('.github/workflows/ci.yml does not invoke check:runtime-browser directly or through check:release-gates');
    }
  }
  assertContains('.github/workflows/ci.yml', 'python tools/check-backend-security.py');
  assertContains('.github/workflows/ci.yml', 'python tools/check-static-assets.py');

  for (const inspector of [
    'tools/local-predeploy-check.js',
    'tools/acceptance/inspect-section-browser.js',
    'tools/check-mobile-reference-accessibility-runtime.js',
    'tools/acceptance/inspect-overview-desktop-layout.js',
  ]) {
    for (const fakeDensityToken of [
      'sampleRectCoverage',
      'elementFromPoint',
      'contentFillRatio',
      'rightFillRatio',
      'overviewVisualBalanceTypeCount',
      'overviewDesktopTableAreaRatio',
      'overviewDesktopChartMatrixAreaRatio',
      'overviewDesktopKpiBalanceOk',
      'overviewFirstScreenFieldCount >= minOverviewFirstScreenFields',
    ]) assertNotContains(inspector, fakeDensityToken);
  }

  for (const retiredNativeFile of [
    'MobileNativeConsole.tsx', 'MobileNativeHome.tsx', 'MobileNativeSignal.tsx',
    'MobileNativeInspection.tsx', 'MobileNativeDetail.tsx', 'MobileNativeObjectSelector.tsx',
    'MobileNativeTopology.tsx', 'MobileNativeSheet.tsx', 'mobileNativeModel.ts',
    'mobileNativeEvidence.ts', 'mobileNativeTypes.ts',
  ]) assertNotExists(`src/panel-framework/overview/mobile-native/${retiredNativeFile}`);
  assertNotExists('src/panel-framework/overview/desktopOverviewScenes.tsx');
  assertNotExists('src/panel-framework/overview/styles/overview-mobile.css');
  assertNotExists('public/scale-adaptive-patch.js');
  assertNotExists('public/layout-whitespace-patch.js');
  assertNotExists('public/panel-professional-redesign.js');
  assertContains('public/index.html', '<div id="app"', 'neutral app mount');
  assertNotContains('public/index.html', '<main id="app"', 'nested app main mount');
  assertContains('public/index.html', 'data-deploy-channel="public"');
  assertContains('public/index.html', 'data-overview-framework-asset="surface-loader"');
  assertMatches('public/index.html', /\/assets\/framework\/panel-surface-loader\.[0-9a-f]{12}\.js/, 'content-addressed surface loader URL');
  assertNotContains('public/index.html', 'rel="stylesheet" href="/assets/framework/', 'surface CSS must be selected by the loader');
  assertNotContains('public/index.html', 'http-equiv="Cache-Control"', 'cache-control meta override');
  assertContains('public/assets/framework/manifest.json', '"version": 3');
  assertContains('public/assets/framework/manifest.json', '"mobile"');
  assertContains('public/assets/framework/manifest.json', '"desktop"');
  assertContains('public/assets/framework/manifest.json', '"loader"');
  assertContains('public/assets/framework/manifest.json', '"inputs"');
  assertNotContains('public/index.html', 'layout-whitespace-patch.js');
  assertNotContains('public/index.html', 'readonly-diagnostics.js');
  assertContains('vite.config.ts', 'publicDir: false');
  assertContains('vite.config.ts', 'outDir: "public/assets/framework"');
  assertContains('vite.config.ts', 'src/panel-framework/${surface}/main.tsx');
  assertContains('vite.config.ts', 'fileName: () => `panel-${surface}.js`');
  assertContains('tools/check-surface-asset-isolation.js', 'mobile script');

  assertContains('panel_backend/config_store.py', 'passwords are never persisted');
  assertContains('panel_backend/api_schema.py', 'Request JSON body must be an object');
  assertContains('panel_backend/collector_transport.py', 'allow_redirects=False');
  assertContains('panel_backend/collector_evidence.py', 'class ConnectionEvidenceParser');
  assertContains('panel_backend/collector_service.py', 'class CollectorServiceMixin');
  assertContains('panel_backend/collector_service.py', 'def update_state(self, fresh_counter_sample=False):');
  assertContains('panel_backend/snapshot_builder.py', 'class SnapshotBuilderMixin');
  assertContains('panel_backend/snapshot_builder.py', 'def build_snapshot(self, rest, ssh, fresh_counter_sample=False):');
  assertContains('app.py', 'class Collector(SnapshotBuilderMixin, CollectorServiceMixin)');
  assertNotContains('app.py', 'def build_maps(self, rest):', 'embedded snapshot builder');
  assertNotContains('app.py', 'def update_state(self, fresh_counter_sample=False):', 'embedded collector service');
  assertContains('panel_backend/static_assets.py', 'public, max-age=31536000, immutable');
  assertContains('panel_backend/static_assets.py', 'vary_accept_encoding');
  assertContains('panel_backend/http_dispatcher.py', 'class PanelRequestHandler(BaseHTTPRequestHandler)');
  assertContains('app.py', 'Handler = create_panel_handler(sys.modules[__name__])');
  assertNotContains('app.py', 'class Handler(BaseHTTPRequestHandler)', 'embedded HTTP dispatcher');
  assertContains('panel_backend/http_dispatcher.py', 'resolve_static_asset(');
  assertContains('panel_backend/http_dispatcher.py', 'self.headers.get("If-None-Match")');
  assertContains('panel_backend/http_dispatcher.py', '"Cache-Control", asset.cache_control');
  assertContains('tools/build-framework-inline.mjs', 'brotliCompressSync');
  assertContains('tools/build-framework-inline.mjs', 'manifest.json');
  assertContains('tools/check-static-assets.py', 'assert_built_assets');
  assertContains('tools/check-backend-security.py', 'assert_collector_transport_contract');
  assertContains('tools/check-backend-security.py', 'assert_api_schema_contract');

  assertContains('panel_backend/http_dispatcher.py', 'private_public_assets = {"readonly-diagnostics.js"}', 'readonly diagnostics stays private in public profile');
  assertContains('panel_backend/http_dispatcher.py', 'if self.runtime.PUBLIC_ROUTEROS_PROFILE and asset_name in self.private_public_assets:', 'public static boundary for readonly diagnostics');
  assertContains('panel_backend/http_dispatcher.py', '/api/readonly-diagnostics', 'readonly diagnostics API route remains present');
  assertContains('panel_backend/http_dispatcher.py', 'readonly diagnostics are private in the public RouterOS profile', 'readonly diagnostics API still returns 403 in public profile');
  assertContains('panel_backend/http_dispatcher.py', 'code="private_diagnostics_disabled"', 'readonly diagnostics 403 code remains explicit');
  assertContains('tools/local-predeploy-check.js', "const privatePublicAsset = publicRouterosProfile && asset === 'readonly-diagnostics.js';", 'predeploy checker must keep readonly diagnostics asset private');
  assertContains('tools/local-predeploy-check.js', 'function finalizeReportTruth', 'predeploy reports must derive truth from all applicable checks');
  assertContains('tools/local-predeploy-check.js', 'privatePublicAsset ? result.response.status === 403 : result.response.ok && result.text.length > 1000', 'public asset check must preserve the 403 gate');
  assertContains('tools/local-predeploy-check.js', "diag.response.status === 403 && diag.json.code === 'private_diagnostics_disabled'", 'public readonly diagnostics API check must preserve the 403 code');
  assertContains('tools/local-predeploy-check.js', 'local server logs stay free of socket reset noise');
  assertContains('tools/local-predeploy-check.js', 'ConnectionResetError');
  assertContains('tools/local-predeploy-check.js', 'BrokenPipeError');
  assertContains('panel_backend/snapshot_builder.py', 'rawOrder');
  assertContains('panel_backend/snapshot_builder.py', 'connection-mark');
  assertContains('panel_backend/snapshot_builder.py', 'packet-mark');
  assertContains('panel_backend/snapshot_builder.py', 'routing-mark');
  assertContains('panel_backend/snapshot_builder.py', 'passthrough');

  if (args.staticOnly) {
    console.log('[ok] static engineering contracts are present');
  } else {
    const evidence = assertRequiredMatrixEvidence(ROOT, {
      allowDirtyEngineering: args.allowDirtyEngineering,
      edgeEvidenceGatedBy: args.edgeEvidenceGatedBy,
    });
    if (evidence.toolbarZoom200?.delegated) {
      console.log(`[boundary] ${evidence.toolbarZoom200.boundary}`);
    }
    console.log(matrixEvidenceStatusMessage(
      evidence.matrixIdentity,
      path.relative(ROOT, evidence.overview.reportPath)
    ));
  }

  if (routeMaturityReport?.structuralPass !== true || routeMaturityReport?.routePolicyPass !== true) {
    throw new Error(`route maturity engineering gate remains closed\n${JSON.stringify(routeMaturityReport, null, 2)}`);
  }

  if (args.releaseCandidate) {
    const candidateEvidence = assertNodeContract(
      'tools/check-release-candidate-evidence.js',
      args.candidateEvidenceArgs
    );
    if (candidateEvidence?.candidateEvidenceShapePass !== true || candidateEvidence?.candidateEvidencePass !== false || candidateEvidence?.publicReleasePass !== false) {
      throw new Error(`release candidate evidence gate remains closed\n${JSON.stringify(candidateEvidence, null, 2)}`);
    }
    console.log(JSON.stringify({
      engineeringReadinessPass: true,
      candidateEvidenceShapePass: true,
      candidateEvidencePass: false,
      publicReleasePass: false,
      releaseComplete: false,
      promotionAuthority: 'external-controller-required',
    }));
    return;
  }

  console.log(JSON.stringify({ engineeringReadinessPass: true }));
}

if (require.main === module) {
  main();
}

module.exports = {
  FOCUSED_SOURCE_RUNTIME_REPORTS,
  MOBILE_REFERENCE_REQUIRED_CHECKS,
  MATRIX_REPORT_ALIAS_NAMES,
  MOBILE_MATRIX_CELLS,
  MOBILE_WORKFLOW_NAMES,
  assertDecisionLedgerFreshness,
  assertLatestFullMatrixReport,
  assertEvidenceModeEligibility,
  assertFocusedSourceRuntimeReports,
  assertMatrixEvidenceIdentity,
  assertMobileRuntimeReport,
  assertRequiredMatrixEvidence,
  assertToolbarZoom200Report,
  collectGateDetailFailures,
  hasPinnedDockerBuildPushActionV7,
  matrixEvidenceStatusMessage,
  parseArgs,
  reportNameMatchesKind,
  validateMatrixReport,
  validateMobileRuntimeReport,
  FULL_MATRIX_CELLS,
  FULL_MATRIX_SCENARIOS,
  FULL_MATRIX_VIEWPORT_KEYS,
  OVERVIEW_MATRIX_CELLS,
  ROUTE_RESPONSIVE_MATRIX_CELLS,
  ROUTE_STATE_MATRIX_CELLS,
};
