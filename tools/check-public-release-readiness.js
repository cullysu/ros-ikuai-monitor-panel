#!/usr/bin/env node
'use strict';

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { spawnSync } = require('child_process');
const { RUNTIME_SCREENSHOT_CONTRACT } = require('./runtime-screenshot-contract');

const ROOT = path.resolve(__dirname, '..');
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

function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    staticOnly: false,
    help: false,
  };
  for (const item of argv) {
    if (item === '--static-only' || item === '--skip-matrix') {
      args.staticOnly = true;
    } else if (item === '--require-matrix' || item === '--full-matrix') {
      args.staticOnly = false;
    } else if (item === '--help' || item === '-h') {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${item}`);
    }
  }
  return args;
}

function usage() {
  return `
Usage:
  node tools/check-public-release-readiness.js [--static-only|--require-matrix]

Options:
  --static-only     Check static release markers only; skip local browser matrix evidence.
  --skip-matrix     Alias for --static-only.
  --require-matrix   Force the full release-matrix evidence check, even in CI.
  --full-matrix     Alias for --require-matrix.
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

function assertMaxBytes(relPath, maxBytes) {
  const filePath = path.join(ROOT, relPath);
  const size = fs.statSync(filePath).size;
  if (size > maxBytes) {
    throw new Error(`${relPath} exceeds ${maxBytes} bytes (found ${size})`);
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

function currentHead(rootDir = ROOT) {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return result.status === 0 ? String(result.stdout || '').trim() : '';
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
  const expectedIds = expectedCells.map(expectedCellId);
  const actualIds = cells.map(matrixCellId);
  const missingCells = listDifference(actualIds, expectedIds);
  const unexpectedCells = listDifference(expectedIds, actualIds);
  if (!matrix || matrix.commit !== head) errors.push(`matrix.commit must equal current HEAD ${head}`);
  if (matrix?.requestedComplete !== true) errors.push('matrix.requestedComplete must be true');
  if (!Array.isArray(report.failures) || report.failures.length !== 0) errors.push('report.failures must be an empty array');
  if (matrix?.failed !== 0) errors.push('matrix.failed must be 0');
  if (cells.length !== expectedIds.length || missingCells.length || unexpectedCells.length) {
    errors.push(`matrix.cells does not exactly match the requested matrix (missing=${missingCells.length}, unexpected=${unexpectedCells.length}, total=${cells.length})`);
  }
  for (const cell of cells) {
    if (cell.pass !== true) errors.push(`${matrixCellId(cell)} did not pass`);
  }
  if (options.requireReportPass && report.pass !== true) errors.push('report.pass must be true');
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

function findCurrentMatrixReport(rootDir, label, expectedCells, options = {}) {
  const head = currentHead(rootDir);
  const candidates = listAcceptanceReports(rootDir);
  const failures = [];
  for (const candidate of candidates) {
    const result = validateMatrixReport(candidate.reportPath, expectedCells, head, options);
    if (result.errors.length === 0) return { reportPath: candidate.reportPath, report: result.report };
    failures.push(`${path.relative(rootDir, candidate.reportPath)}: ${result.errors.join('; ')}`);
  }
  const detail = failures.slice(0, 3).join(' | ');
  throw new Error(`No current ${label} evidence report was found for HEAD ${head || '(unknown)'}. ${detail}`);
}

function assertRuntimeBrowserReport(rootDir = ROOT) {
  const head = currentHead(rootDir);
  const reportPath = path.join(rootDir, '_acceptance', 'panel-runtime-browser', 'report.json');
  if (!fs.existsSync(reportPath)) throw new Error('panel-runtime-browser/report.json is missing');
  const report = readJson(reportPath);
  const checks = Array.isArray(report.checks) ? report.checks : [];
  const allChecksPass = checks.length > 0 && checks.every((check) => check && check.pass === true);
  const requiredChecks = [
    'production runtime has no scenario fixture',
    'validated snapshot renders the overview without overflow',
    'automatic polling refreshes the validated snapshot',
    'manual evidence disclosure survives viewport changes',
    'stable business identity preserves the exact object across snapshot reorder',
    'connections keeps its domain workspace and primary destination',
    'routes opens a domain-specific evidence inspector',
    'connections opens a domain-specific evidence inspector',
    'dns4 opens a domain-specific evidence inspector',
    'dns6 opens a domain-specific evidence inspector',
    'security opens a domain-specific evidence inspector',
    'terminals opens a domain-specific evidence inspector',
    'logs opens a domain-specific evidence inspector',
    'trafficLoad opens a domain-specific evidence inspector',
    'dns4 keeps its domain workspace and primary destination',
    'dns6 keeps its domain workspace and primary destination',
    'security keeps its domain workspace and primary destination',
    'terminals keeps its domain workspace and primary destination',
    'logs keeps its domain workspace and primary destination',
    'trafficLoad keeps its domain workspace and primary destination',
    'browser 200% text adjustment reflows without horizontal loss',
    'malformed snapshot is rejected while last valid evidence remains visible',
    'snapshot API error never inserts a scenario fixture',
    'old evidence is labeled historical and current traffic is withheld',
    'navigator.onLine=false does not block a reachable same-origin snapshot',
    'manual refresh remains operational while navigator reports offline',
    'tablet overview selects incident evidence beside the full object list without navigation',
    '768px tablet uses a persistent task rail with list and inspector',
    '1024–1365 keeps the compact task workspace and 1366 switches once to desktop',
    'desktop connection owns a dedicated workspace',
    'browser emitted no uncaught page errors',
  ];
  const checkNames = new Set(checks.map((check) => check?.name));
  const missingChecks = requiredChecks.filter((name) => !checkNames.has(name));
  const screenshotMetadata = Array.isArray(report.screenshotMetadata) ? report.screenshotMetadata : [];
  const requiredScreenshots = RUNTIME_SCREENSHOT_CONTRACT;
  const metadataStates = screenshotMetadata.map((item) => item?.state);
  const metadataByState = new Map(screenshotMetadata.map((item) => [item?.state, item]));
  const screenshotErrors = [];
  const runtimeDir = path.dirname(reportPath);
  if (screenshotMetadata.length !== requiredScreenshots.length || new Set(metadataStates).size !== screenshotMetadata.length) {
    screenshotErrors.push('runtime screenshot states must be present exactly once');
  }
  const expectedFiles = requiredScreenshots.map((item) => item.file);
  if (!Array.isArray(report.screenshots) || report.screenshots.length !== expectedFiles.length ||
      expectedFiles.some((file, index) => report.screenshots[index] !== file)) {
    screenshotErrors.push('runtime screenshot list does not match the required state order');
  }
  for (const expected of requiredScreenshots) {
    const { state } = expected;
    const item = metadataByState.get(state);
    if (!item) {
      screenshotErrors.push(`${state} metadata is missing`);
      continue;
    }
    if (item.file !== expected.file || path.basename(String(item.path || '')) !== expected.file) {
      screenshotErrors.push(`${state} is not bound to ${expected.file}`);
      continue;
    }
    if (item.viewport?.width !== expected.viewport.width || item.viewport?.height !== expected.viewport.height) {
      screenshotErrors.push(`${state} viewport does not match ${expected.viewport.width}x${expected.viewport.height}`);
    }
    const filePath = path.resolve(rootDir, String(item.path || ''));
    const relative = path.relative(runtimeDir, filePath);
    if (path.isAbsolute(relative) || relative === '..' || relative.startsWith(`..${path.sep}`)) {
      screenshotErrors.push(`${state} screenshot escapes the runtime report directory`);
      continue;
    }
    let stat;
    try {
      stat = fs.lstatSync(filePath);
    } catch {
      screenshotErrors.push(`${state} screenshot is missing`);
      continue;
    }
    if (!stat.isFile() || stat.isSymbolicLink()) {
      screenshotErrors.push(`${state} screenshot is not a regular file`);
      continue;
    }
    const dimensions = pngDimensions(filePath);
    const expectedImage = item.image && typeof item.image === 'object' ? item.image : {};
    const digest = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
    if (!dimensions || dimensions.width !== expectedImage.width || dimensions.height !== expectedImage.height) {
      screenshotErrors.push(`${state} PNG dimensions do not match metadata`);
    }
    if (stat.size !== item.bytes || digest !== item.sha256) {
      screenshotErrors.push(`${state} PNG bytes or SHA-256 do not match metadata`);
    }
  }
  if (new Set(screenshotMetadata.map((item) => item?.sha256).filter(Boolean)).size !== requiredScreenshots.length) {
    screenshotErrors.push('runtime states must not reuse the same screenshot bytes');
  }
  if (report.pass !== true || report.commit !== head || report.source !== 'playwright-production-runtime' || report.fixture !== false || !allChecksPass || missingChecks.length || screenshotErrors.length) {
    throw new Error(`panel-runtime-browser report is not current Playwright production-runtime evidence: ${JSON.stringify({
      head,
      pass: report.pass,
      commit: report.commit,
      source: report.source,
      fixture: report.fixture,
      checkCount: checks.length,
      missingChecks,
      failedChecks: checks.filter((check) => !check || check.pass !== true).map((check) => check?.name || '(unnamed)'),
      screenshotErrors,
    })}`);
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

    if (parsed.viewport === 'desktop' || parsed.viewport === 'desktop1440') {
      const probe = detail.desktopOverviewLedgerProbe && typeof detail.desktopOverviewLedgerProbe === 'object'
        ? detail.desktopOverviewLedgerProbe
        : {};
      if (check.pass !== true) pushFailure('desktopSemantic', 'check.pass', check.pass);
      if (detail.surface !== 'desktop-overview') pushFailure('desktopSemantic', 'surface', detail.surface);
      if (probe.contract !== 'cold-blue-operations-ledger') pushFailure('desktopSemantic', 'contract', probe.contract);
      assertProbeChecks('desktopSemantic', probe);
      if (parsed.scenario === 'no-snapshot') {
        if (probe.evidenceMode !== 'unavailable') pushFailure('noSnapshotSemantic', 'evidenceMode', probe.evidenceMode);
        if (probe.risk !== 'evidence') pushFailure('noSnapshotSemantic', 'risk', probe.risk);
      }
    }

    if (parsed.viewport === 'wide' || parsed.viewport === 'narrow') {
      const probe = detail.mobileOverviewAppHomeGateProbe && typeof detail.mobileOverviewAppHomeGateProbe === 'object'
        ? detail.mobileOverviewAppHomeGateProbe
        : {};
      if (check.pass !== true) pushFailure('mobileSemantic', 'check.pass', check.pass);
      if (detail.surface !== 'mobile-overview') pushFailure('mobileSemantic', 'surface', detail.surface);
      if (probe.contract !== 'mobile-patrol-console-v3') pushFailure('mobileSemantic', 'contract', probe.contract);
      if (probe.appHomePass !== true) pushFailure('mobileSemantic', 'appHomePass', probe.appHomePass);
      assertProbeChecks('mobileSemantic', probe);
      if (parsed.scenario === 'no-snapshot') {
        if (probe.evidenceMode !== 'unavailable') pushFailure('noSnapshotSemantic', 'evidenceMode', probe.evidenceMode);
        if (probe.risk !== 'evidence') pushFailure('noSnapshotSemantic', 'risk', probe.risk);
        if (probe.checks?.unavailableBoundary !== true) {
          pushFailure('noSnapshotSemantic', 'checks.unavailableBoundary', probe.checks?.unavailableBoundary);
        }
      }
    }
  }
  return gateFailures;
}

function assertLatestFullMatrixReport(rootDir = ROOT) {
  return findCurrentMatrixReport(rootDir, '7x4 overview visual matrix', OVERVIEW_MATRIX_CELLS, {
    requireReportPass: true,
    requireSemanticGates: true,
    requireOverviewScreenshots: true,
  });
}

function assertRequiredMatrixEvidence(rootDir = ROOT) {
  const evidence = {};
  const failures = [];
  const collect = (name, assertion) => {
    try {
      evidence[name] = assertion();
    } catch (error) {
      failures.push(error.message);
    }
  };
  collect('overview', () => assertLatestFullMatrixReport(rootDir));
  collect('routeResponsive', () => findCurrentMatrixReport(
    rootDir,
    '19x4 single-scenario route responsive matrix',
    ROUTE_RESPONSIVE_MATRIX_CELLS
  ));
  collect('routeState', () => findCurrentMatrixReport(
    rootDir,
    '19x7x2 route-state matrix',
    ROUTE_STATE_MATRIX_CELLS
  ));
  collect('runtimeBrowser', () => assertRuntimeBrowserReport(rootDir));
  if (failures.length) throw new Error(`Required current-HEAD release evidence is incomplete: ${failures.join(' | ')}`);
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

  const ghcrImage = 'ghcr.io/cullysu/ros-ikuai-monitor-panel:main';

  assertContains('.github/workflows/container-image.yml', 'packages: write');
  assertContains('.github/workflows/container-image.yml', 'docker/build-push-action@v7');
  assertContains('.github/workflows/container-image.yml', 'platforms: linux/amd64,linux/arm64');
  assertContains('.github/workflows/container-image.yml', 'ghcr.io/${{ github.repository }}');
  assertContains('.github/workflows/ci.yml', '--scale-scenarios single,fleet,all-offline,no-snapshot,collection-down,resource-full,interfaces-down');
  assertContains('.github/workflows/ci.yml', '--sections overview');
  assertNotContains('.github/workflows/ci.yml', '--sections overview-edge-cases');
  assertContains('.github/workflows/ci.yml', '--viewports desktop=1366x768,desktop1440=1440x900,wide=844x390,narrow=390x844');

  assertContains('compose.yml', '${ROS_PANEL_IMAGE:-routeros-triage-panel:local}');
  assertContains('.env.docker.example', 'ROS_PANEL_IMAGE=routeros-triage-panel:local');
  assertContains('.env.docker.example', `# ROS_PANEL_IMAGE=${ghcrImage}`);
  assertContains('install.sh', 'DEFAULT_LOCAL_IMAGE="routeros-triage-panel:local"');
  assertContains('install.sh', `DEFAULT_PREBUILT_IMAGE="${ghcrImage}"`);
  assertContains('install.sh', 'pull routeros-triage');
  assertContains('install.sh', 'falling back to local Docker build');
  assertContains('install.sh', '--prebuilt');
  assertContains('install.sh', '--build-local');
  assertContains('install.sh', '--local-only');
  assertContains('install.sh', 'PUBLISHED_ADDR="127.0.0.1"');
  assertContains('install.sh', '--lan is not supported by the public installer');
  assertContains('install.sh', 'exposure:   localhost-only');
  assertContains('install.sh', 'ROS_PANEL_TRUST_PROXY_HEADERS');
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
  assertContains('tools/build-routeros-container-archive.sh', '--provenance=false');
  assertContains('tools/build-routeros-container-archive.sh', 'convert-oci-to-routeros-docker-archive.py');
  assertContains('tools/build-routeros-container-archive.sh', 'Use a client-local forwarder');
  assertContains('tools/convert-oci-to-routeros-docker-archive.py', 'IMAGE_INDEX_MEDIA_TYPES');
  assertContains('.gitignore', '/*.tar');
  assertContains('DEPLOY_DOCKER.md', ghcrImage);
  assertContains('README.md', ghcrImage);
  assertContains('README.md', 'Default public path: build a RouterOS-friendly archive locally');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', ghcrImage);
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', 'The default public path is to build a RouterOS-friendly archive locally');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', 'Local archive, default public path');
  assertContains('DEPLOY_ROUTEROS_CONTAINER.md', 'Optional registry image, only after the GHCR package is public');
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

  assertContains('Dockerfile', 'USER panel');
  assertContains('Dockerfile', 'ROS_PANEL_ALLOW_LOCALHOST_HOST_FORWARD=0');
  assertNotContains('Dockerfile', 'ROS_PANEL_LOCALHOST_FORWARD_TOKEN=', 'forward token baked into image defaults');
  assertContains('Dockerfile', 'ROS_PANEL_LOCAL_SETTINGS_WRITE_ENABLED=0');
  assertContains('Dockerfile', 'chown -R root:root /app');
  assertContains('Dockerfile', 'COPY panel_backend ./panel_backend');
  assertContains('Dockerfile', 'chown panel:panel /app/data');
  assertContains('Dockerfile', 'chmod 0750 /app/data');
  assertContains('compose.yml', 'read_only: true');
  assertContains('compose.yml', 'ROS_PANEL_ALLOW_LOCALHOST_HOST_FORWARD: "${ROS_PANEL_ALLOW_LOCALHOST_HOST_FORWARD:-0}"');
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
  assertContains('src/panel-framework/panel-framework-app.tsx', '<SnapshotContractError issues={validated.issues} />');
  assertContains('src/panel-framework/panel-framework-app.tsx', 'clientEvidenceBoundary: runtimeBoundary');

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
  assertContains('src/panel-framework/panel-framework-app.tsx', 'route === "overview"');
  assertContains('src/panel-framework/panel-framework-app.tsx', '<OperationalSectionPage route={route}');
  assertContains('tools/acceptance/inspect-panel-routes.js', 'history.forward()');
  assertContains('tools/acceptance/inspect-panel-routes.js', 'canonicalUnknown');

  assertContains('public/assets/framework/panel-framework.js', 'data-mobile-overview');
  assertContains('public/assets/framework/panel-framework.js', 'data-desktop-overview');
  assertContains('public/assets/framework/panel-framework.js', 'data-panel-route-content');
  assertContains('public/assets/framework/panel-framework.js', '当前业务状态不可判断');
  assertNotContains('public/assets/framework/panel-framework.js', 'data-mobile-native');
  assertNotContains('public/assets/framework/panel-framework.js', 'mn-topology');
  assertNotContains('public/assets/framework/panel-framework.js', 'mn-sheet');
  assertNotContains('public/assets/framework/panel-framework.js', 'role: "tablist"');

  assertContains('src/panel-framework/mobile/MobilePatrolScreen.tsx', 'data-mobile-overview');
  assertContains('src/panel-framework/mobile/MobilePatrolScreen.tsx', 'data-mobile-core-fact');
  assertContains('src/panel-framework/mobile/MobilePatrolScreen.tsx', 'MobileEvidenceLedger');
  assertContains('src/panel-framework/mobile/MobileEvidenceLedger.tsx', 'data-mobile-evidence-ledger');
  assertContains('src/panel-framework/mobile/MobileIncidentWorkspace.tsx', 'data-mobile-incident-object');
  assertContains('src/panel-framework/mobile/MobileIncidentWorkspace.tsx', 'data-mobile-incident-route');
  assertContains('src/panel-framework/mobile/MobileEvidenceLedger.tsx', 'userOverrideRef');
  assertContains('src/panel-framework/mobile/MobileEvidenceLedger.tsx', 'fitsEvidence');
  assertContains('src/panel-framework/mobile/MobilePatrolTraffic.tsx', 'preserveAspectRatio="xMidYMid meet"');
  assertContains('src/panel-framework/mobile/MobilePatrolTraffic.tsx', '<title id="mp-traffic-chart-title">');
  assertContains('src/panel-framework/mobile/MobilePatrolTraffic.tsx', '<desc id="mp-traffic-chart-desc">');
  assertContains('src/panel-framework/mobile/MobileDomainWorkspace.tsx', 'type="search"');
  assertContains('src/panel-framework/mobile/mobile-inspector/MobileDomainInspector.tsx', 'data-mobile-object-detail');
  assertContains('src/panel-framework/mobile/MobileDomainWorkspace.tsx', 'pageSize = 20');
  assertContains('src/panel-framework/mobile/mobileDomainWorkspaceModel.ts', 'window.history.pushState');
  assertContains('src/panel-framework/mobile/mobileDomainWorkspaceModel.ts', 'window.addEventListener("popstate"');
  assertContains('src/panel-framework/mobile/mobileDomainDefinitions.ts', 'domainDefinitionFor');
  assertContains('src/panel-framework/mobile/mobileDomainDefinitions.ts', 'sortWorkspaceRows');
  assertContains('src/panel-framework/sections/DesktopDomainWorkspace.tsx', 'data-desktop-domain-workspace');
  assertContains('src/panel-framework/sections/DesktopDomainWorkspace.tsx', 'type="search"');
  assertContains('src/panel-framework/sections/DesktopDomainWorkspace.tsx', 'filterWorkspaceRows');
  assertContains('src/panel-framework/sections/DesktopDomainWorkspace.tsx', 'sortWorkspaceRows');
  assertContains('src/panel-framework/sections/DesktopDomainInspector.tsx', 'data-desktop-object-detail');
  assertContains('src/panel-framework/sections/DesktopDomainInspector.tsx', 'InterfaceEvidence');
  assertContains('src/panel-framework/sections/DesktopDomainInspector.tsx', 'LogEvidence');
  assertNotContains('src/panel-framework/sections/OperationalSectionPage.tsx', 'DataTable', 'retired generic desktop data table');
  assertContains('src/panel-framework/mobile/mobileDomainWorkspaceModel.ts', 'panelObject');
  assertNotContains('src/panel-framework/mobile/mobileDomainWorkspaceModel.ts', 'mobileObject', 'surface-specific history state');
  assertContains('src/panel-framework/sections/panelObjectIdentity.ts', 'stablePanelObjectId');
  assertContains('src/panel-framework/sections/panelObjectIdentity.ts', 'panelObjectIdForValues');
  assertContains('.agents/skills/router-panel-product-loop/SKILL.md', 'emil-design-engineering.md');
  assertContains('.agents/skills/router-panel-product-loop/references/emil-design-engineering.md', 'emilkowalski/skills');
  assertNotContains('src/panel-framework/mobile/MobileDomainWorkspace.tsx', 'aria-controls=');
  assertNotContains('src/panel-framework/mobile/mobile-patrol.css', '!important');
  assertNotContains('src/panel-framework/mobile/mobile-domain.css', '!important');
  assertNotContains('src/panel-framework/sections/section-timeseries.css', '!important');

  assertContains('src/panel-framework/overview/desktop-overview/DesktopOverviewScreen.tsx', 'data-desktop-overview');
  assertContains('src/panel-framework/overview/desktop-overview/DesktopOverviewScreen.tsx', 'data-desktop-status-bus');
  assertContains('src/panel-framework/overview/desktop-overview/DesktopLedger.tsx', 'data-desktop-ledger');
  assertContains('src/panel-framework/overview/desktop-overview/DesktopLedger.tsx', 'role="table"');
  assertContains('src/panel-framework/overview/desktop-overview/DesktopWanEvidence.tsx', 'viewBox={`0 0 ${WIDTH} ${HEIGHT}`}');
  assertContains('src/panel-framework/overview/desktop-overview/DesktopWanEvidence.tsx', '<title id={titleId}>');
  assertContains('src/panel-framework/overview/desktop-overview/DesktopWanEvidence.tsx', '<desc id={descId}>');

  assertContains('src/panel-framework/overview/evidence-model/overviewEvidenceTypes.ts', '"current" | "historical" | "unavailable"');
  assertContains('src/panel-framework/overview/deriveOverviewState.ts', 'route.active === true && route.disabled !== true');
  assertContains('src/panel-framework/overview/evidence-model/buildOverviewInstruments.ts', 'if (rowDown === null || rowUp === null) return null;');
  assertContains('src/panel-framework/overview/evidence-model/buildOverviewEvidenceModel.ts', 'observed.length - 1');
  assertContains('src/panel-framework/overview/evidence-model/buildOverviewInstruments.ts', 'Math.abs(snapshotAt - last.timestamp)');
  assertNotContains('src/panel-framework/overview/evidence-model/buildOverviewEvidenceModel.ts', 'rows[0]');
  assertContains('tools/check-mobile-native-model.js', 'missing current rate must not produce a trend');
  assertContains('tools/check-mobile-native-model.js', 'explicit zero observations remain valid');

  assertContains('tools/acceptance/inspect-overview-mobile.js', "contract: 'mobile-patrol-console-v3'");
  assertContains('tools/acceptance/inspect-overview-mobile.js', 'Object.values(checks).every(Boolean)');
  assertContains('tools/acceptance/inspect-overview-mobile.js', 'stableTaskNavigation: taskButtons.length === 4');
  assertContains('tools/acceptance/inspect-overview-mobile.js', 'smallText.length === 0');
  assertContains('tools/acceptance/inspect-overview-desktop-layout.js', "contract: 'cold-blue-operations-ledger'");
  assertContains('tools/local-predeploy-check.js', 'panelRouteRuntimeOk: routeProbe?.pass === true');
  assertContains('tools/local-predeploy-check.js', 'report.matrix = buildMatrixSummary(report.browserChecks, args);');
  assertContains('tools/local-predeploy-check.js', 'matrixBlocksTopLevelPass');
  assertContains('tools/local-predeploy-check.js', 'report.pass = report.failures.length === 0 && !matrixBlocksTopLevelPass;');
  assertContains('tools/local-predeploy-check.js', "const requiredScenarios = ['single', 'fleet', ...EDGE_SCALE_SCENARIOS];");
  assertContains('.github/workflows/ci.yml', '--sections public-release');
  assertContains('.github/workflows/ci.yml', '_acceptance/route-matrix-${{ github.sha }}');
  assertContains('.github/workflows/ci.yml', 'npm run check:runtime-browser');
  assertContains('tools/check-panel-runtime-browser.js', 'desktop object inspector preserves Back and Forward history');
  assertContains('.github/workflows/ci.yml', 'python tools/check-backend-security.py');
  assertContains('.github/workflows/ci.yml', 'python tools/check-static-assets.py');

  for (const inspector of [
    'tools/local-predeploy-check.js',
    'tools/acceptance/inspect-section-browser.js',
    'tools/acceptance/inspect-overview-mobile.js',
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
  assertMaxBytes('public/assets/framework/style.css', 100000);
  assertContains('public/index.html', '<main id="app"');
  assertContains('public/index.html', 'data-deploy-channel="public"');
  assertContains('public/index.html', 'data-overview-framework-asset="style"');
  assertContains('public/index.html', 'data-overview-framework-asset="script"');
  assertMatches('public/index.html', /\/assets\/framework\/style\.[0-9a-f]{12}\.css/, 'content-addressed framework style URL');
  assertMatches('public/index.html', /\/assets\/framework\/panel-framework\.[0-9a-f]{12}\.js/, 'content-addressed framework script URL');
  assertNotContains('public/index.html', 'http-equiv="Cache-Control"', 'cache-control meta override');
  assertContains('public/assets/framework/manifest.json', '"version": 1');
  assertNotContains('public/index.html', 'layout-whitespace-patch.js');
  assertNotContains('public/index.html', 'readonly-diagnostics.js');
  assertContains('vite.config.ts', 'publicDir: false');
  assertContains('vite.config.ts', 'outDir: "public/assets/framework"');
  assertContains('vite.config.ts', 'fileName: () => "panel-framework.js"');

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
    console.log('[ok] static public release readiness markers are present');
  } else {
    const evidence = assertRequiredMatrixEvidence();
    console.log(`[ok] current release evidence is complete: ${path.relative(ROOT, evidence.overview.reportPath)}`);
  }

  console.log('[ok] public release readiness markers are present');
}

if (require.main === module) {
  main();
}

module.exports = {
  assertLatestFullMatrixReport,
  assertRequiredMatrixEvidence,
  assertRuntimeBrowserReport,
  parseArgs,
  FULL_MATRIX_CELLS,
  FULL_MATRIX_SCENARIOS,
  FULL_MATRIX_VIEWPORT_KEYS,
  OVERVIEW_MATRIX_CELLS,
  ROUTE_RESPONSIVE_MATRIX_CELLS,
  ROUTE_STATE_MATRIX_CELLS,
};
