#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

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
const FULL_MATRIX_VIEWPORT_KEYS = ['desktop', 'narrow'];
const FULL_MATRIX_CELLS = FULL_MATRIX_SCENARIOS.flatMap((scenario) =>
  FULL_MATRIX_VIEWPORT_KEYS.map((viewport) => `public::${scenario}::overview::${viewport}`));

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

function normalizeMatrixCell(cell) {
  return String(cell || '').replace(/::(desktop|narrow)=\d+x\d+$/u, '::$1');
}

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function assertContains(relPath, needle, label = needle) {
  const text = read(relPath);
  if (!text.includes(needle)) {
    throw new Error(`${relPath} is missing ${label}`);
  }
}

function assertNotContains(relPath, needle, label = needle) {
  const text = read(relPath);
  if (text.includes(needle)) {
    throw new Error(`${relPath} still contains ${label}`);
  }
}

function assertMatches(relPath, pattern, label = pattern) {
  const text = read(relPath);
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

function listReleaseMatrixReports(rootDir = ROOT) {
  const acceptanceDir = path.join(rootDir, '_acceptance');
  if (!fs.existsSync(acceptanceDir)) {
    return [];
  }
  const reports = [];
  for (const entry of fs.readdirSync(acceptanceDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith('release-matrix-')) {
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

function summarizeMatrixReport(reportPath) {
  const report = readJson(reportPath);
  const matrix = report && report.matrix && typeof report.matrix === 'object' ? report.matrix : null;
  const checks = Array.isArray(report && report.checks) ? report.checks.filter(Boolean) : [];
  const requiredCells = Array.isArray(matrix?.requiredCells) ? matrix.requiredCells.map(normalizeMatrixCell) : [];
  const passedCells = Array.isArray(matrix?.passedCells) ? matrix.passedCells.map(normalizeMatrixCell) : [];
  const requiredScenarios = Array.isArray(matrix?.requiredScenarios) ? matrix.requiredScenarios : [];
  const passedScenarios = Array.isArray(matrix?.passedScenarios) ? matrix.passedScenarios : [];
  const scenarios = Array.isArray(matrix?.scenarios) ? matrix.scenarios : [];
  return {
    reportPath,
    mtimeMs: fs.statSync(reportPath).mtimeMs,
    report,
    matrix,
    checks,
    requiredCells,
    passedCells,
    requiredScenarios,
    passedScenarios,
    scenarios,
    total: Number.isFinite(matrix?.total) ? matrix.total : null,
    passed: Number.isFinite(matrix?.passed) ? matrix.passed : null,
    failed: Number.isFinite(matrix?.failed) ? matrix.failed : null,
    complete: Boolean(matrix?.complete),
    reportPass: Boolean(report.pass),
    failedChecks: checks.filter((check) => check && !check.pass).map((check) => check.name),
    passedChecks: checks.filter((check) => check && check.pass).map((check) => check.name),
  };
}

function summaryMatchesHead(summary, head) {
  const reportCommit = String(summary && summary.matrix && summary.matrix.commit || '').trim();
  return Boolean(head && reportCommit && head.startsWith(reportCommit));
}

function parseResponsiveCheckName(name) {
  const match = /^responsive public\/([^/]+)\/(desktop|narrow)\/overview$/u.exec(String(name || '').trim());
  return match ? { scenario: match[1], viewport: match[2] } : null;
}

function collectGateDetailFailures(latest) {
  const gateFailures = {
    desktopDensity: [],
    noSnapshotSemantic: [],
    mobileActionCopy: [],
  };
  for (const check of Array.isArray(latest && latest.checks) ? latest.checks : []) {
    if (!check) {
      continue;
    }
    const parsed = parseResponsiveCheckName(check.name);
    if (!parsed) {
      continue;
    }
    const detail = check.detail && typeof check.detail === 'object' ? check.detail : {};
    const pushMissing = (bucket, field) => {
      if (detail[field] !== true) {
        gateFailures[bucket].push({
          check: String(check.name || '').trim(),
          field,
          value: detail[field],
        });
      }
    };
    const recordCheckFailure = (bucket) => {
      if (check.pass !== true) {
        gateFailures[bucket].push({
          check: String(check.name || '').trim(),
          field: 'check.pass',
          value: check.pass,
        });
      }
    };
    if (parsed.viewport === 'desktop') {
      recordCheckFailure('desktopDensity');
      pushMissing('desktopDensity', 'overviewDesktopDensityOk');
      pushMissing('desktopDensity', 'overviewDesktopTableDensityOk');
      pushMissing('desktopDensity', 'overviewDesktopInfoDensityOk');
      pushMissing('desktopDensity', 'overviewStatusBusFixedGrammarOk');
      pushMissing('desktopDensity', 'overviewResourceFirstScreenPriorityOk');
      pushMissing('desktopDensity', 'overviewCollectionContradictionOk');
      pushMissing('desktopDensity', 'overviewCollectionTrustMarkersOk');
      pushMissing('desktopDensity', 'overviewInterfacesForwardingFirstOk');
      pushMissing('desktopDensity', 'overviewDefaultRouteRawFactsOk');
    }
    if (parsed.scenario === 'no-snapshot') {
      recordCheckFailure('noSnapshotSemantic');
      pushMissing('noSnapshotSemantic', 'overviewNoSnapshotSemanticOk');
      pushMissing('noSnapshotSemantic', 'overviewNoSnapshotFreshnessForbiddenOk');
      pushMissing('noSnapshotSemantic', 'overviewNoSnapshotSamplingStateUniqueOk');
      pushMissing('noSnapshotSemantic', 'overviewNoSnapshotDesktopEvidenceTripletOk');
      pushMissing('noSnapshotSemantic', 'overviewNoSnapshotTrustedMetricsForbiddenOk');
      if (detail.overviewNoSnapshotGridOk !== true && detail.overviewNoSnapshotFiveBlocksOk !== true) {
        pushMissing('noSnapshotSemantic', 'overviewNoSnapshotGridOk');
        pushMissing('noSnapshotSemantic', 'overviewNoSnapshotFiveBlocksOk');
      }
      pushMissing('noSnapshotSemantic', 'overviewNoSnapshotDowngradeReasonsOk');
      pushMissing('noSnapshotSemantic', 'overviewNoSnapshotRepetitionBudgetOk');
    }
    if (parsed.viewport === 'narrow') {
      recordCheckFailure('mobileActionCopy');
      pushMissing('mobileActionCopy', 'overviewMobileActionLinksUniqueOk');
      pushMissing('mobileActionCopy', 'overviewMobileCopyAssemblyOk');
      pushMissing('mobileActionCopy', 'overviewMobilePrimaryConclusionUniqueOk');
      pushMissing('mobileActionCopy', 'overviewMobileLedgerHeightOk');
      pushMissing('mobileActionCopy', 'overviewPrimaryConclusionNoEllipsisOk');
      pushMissing('mobileActionCopy', 'overviewSuggestionCopyUniqueOk');
    }
  }
  return gateFailures;
}

function isFullMatrixShape(summary) {
  if (!summary) {
    return false;
  }
  const requiredCells = [...new Set(summary.requiredCells)];
  const requiredScenarios = [...new Set(summary.requiredScenarios)];
  const checksPass = Array.isArray(summary.failedChecks) && summary.failedChecks.length === 0;
  return requiredCells.length === FULL_MATRIX_CELLS.length &&
    requiredScenarios.length === FULL_MATRIX_SCENARIOS.length &&
    summary.complete &&
    checksPass &&
    summary.reportPass &&
    summary.total === FULL_MATRIX_CELLS.length &&
    summary.passed === FULL_MATRIX_CELLS.length &&
    summary.failed === 0 &&
    FULL_MATRIX_CELLS.every((cell) => requiredCells.includes(cell)) &&
    FULL_MATRIX_SCENARIOS.every((scenario) => requiredScenarios.includes(scenario));
}

function findLatestFullMatrixReport(rootDir = ROOT) {
  const head = currentHead(rootDir);
  const summaries = listReleaseMatrixReports(rootDir)
    .map((item) => summarizeMatrixReport(item.reportPath))
    .filter((summary) => summaryMatchesHead(summary, head));
  if (!summaries.length) {
    throw new Error(`No release matrix report.json for current HEAD ${head || '(unknown)'} was found under _acceptance/release-matrix-*/report.json`);
  }
  summaries.sort((a, b) => b.mtimeMs - a.mtimeMs || b.reportPath.localeCompare(a.reportPath));
  return summaries[0];
}

function assertLatestFullMatrixReport(rootDir = ROOT) {
  const latest = findLatestFullMatrixReport(rootDir);
  const head = currentHead(rootDir);
  const checkNames = new Set(latest.checks.map((check) => String(check.name || '').trim()).filter(Boolean));
  const expectedCheckNames = FULL_MATRIX_SCENARIOS.flatMap((scenario) =>
    FULL_MATRIX_VIEWPORT_KEYS.flatMap((viewport) => [
      `browser boot public/${scenario}/${viewport}`,
      `responsive public/${scenario}/${viewport}/overview`,
    ]));
  const missingChecks = expectedCheckNames.filter((checkName) => !checkNames.has(checkName));
  const passedCells = new Set(latest.passedCells);
  const missingCells = FULL_MATRIX_CELLS.filter((cell) => !passedCells.has(cell));
  const reportCommit = String(latest.matrix.commit || '').trim();
  const commitMatchesHead = Boolean(head && reportCommit && head.startsWith(reportCommit));
  const aggregate = latest.matrix && latest.matrix.aggregate && typeof latest.matrix.aggregate === 'object'
    ? latest.matrix.aggregate
    : {};
  const releaseEvidenceOk = Boolean(
    String(aggregate.commit || latest.matrix.commit || '').trim() &&
    (head ? head.startsWith(String(aggregate.commit || latest.matrix.commit || '').trim()) || String(aggregate.commit || latest.matrix.commit || '').trim().startsWith(head) : true) &&
    String(aggregate.screenshotDir || '').trim() &&
    Array.isArray(aggregate.screenshots) &&
    aggregate.screenshots.length >= FULL_MATRIX_CELLS.length &&
    Array.isArray(aggregate.scenarioMatrix) &&
    aggregate.scenarioMatrix.length >= FULL_MATRIX_SCENARIOS.length &&
    Array.isArray(aggregate.requiredCells) &&
    Array.isArray(aggregate.passedCells)
  );
  const failedChecks = latest.failedChecks;
  const gateFailures = collectGateDetailFailures(latest);
  const failedCheckBuckets = {
    desktopDensity: gateFailures.desktopDensity.map((item) => item.check),
    noSnapshotSemantic: gateFailures.noSnapshotSemantic.map((item) => item.check),
    mobileActionCopy: gateFailures.mobileActionCopy.map((item) => item.check),
  };
  const checksPass = failedChecks.length === 0 && gateFailures.desktopDensity.length === 0 && gateFailures.noSnapshotSemantic.length === 0 && gateFailures.mobileActionCopy.length === 0 && missingChecks.length === 0 && releaseEvidenceOk;
  const reportPassMatchesChecks = Boolean(latest.reportPass) === checksPass;
  if (!commitMatchesHead || !latest.matrix || !checksPass || !reportPassMatchesChecks || !latest.complete || latest.total !== FULL_MATRIX_CELLS.length || latest.passed !== FULL_MATRIX_CELLS.length || latest.failed !== 0 || missingCells.length || missingChecks.length) {
    throw new Error(`Latest full matrix report is not 7x2 all green: ${JSON.stringify({
      reportPath: path.relative(rootDir, latest.reportPath),
      head,
      reportCommit,
      commitMatchesHead,
      releaseEvidenceOk,
      releaseEvidence: {
        aggregateCommit: aggregate.commit || '',
        screenshotDir: aggregate.screenshotDir || '',
        screenshotCount: Array.isArray(aggregate.screenshots) ? aggregate.screenshots.length : null,
        scenarioMatrixCount: Array.isArray(aggregate.scenarioMatrix) ? aggregate.scenarioMatrix.length : null,
        requiredCellCount: Array.isArray(aggregate.requiredCells) ? aggregate.requiredCells.length : null,
        passedCellCount: Array.isArray(aggregate.passedCells) ? aggregate.passedCells.length : null,
      },
      reportPass: latest.reportPass,
      reportPassMatchesChecks,
      complete: latest.complete,
      total: latest.total,
      passed: latest.passed,
      failed: latest.failed,
      checksPass,
      failedChecks,
      missingChecks,
      requiredCells: latest.requiredCells.length,
      passedCells: latest.passedCells.length,
      missingCells,
      failedCheckBuckets,
      gateFailures,
      failedScenarios: latest.scenarios.filter((scenario) => scenario && scenario.failed).map((scenario) => `${scenario.scaleScenario}:${scenario.failed}`),
    })}`);
  }
  return latest;
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
  assertContains('.github/workflows/ci.yml', '--scale-scenarios single,fleet');
  assertContains('.github/workflows/ci.yml', '--scale-scenarios all-offline,no-snapshot,collection-down,resource-full,interfaces-down');
  assertContains('.github/workflows/ci.yml', '--sections main-menu');
  assertContains('.github/workflows/ci.yml', '--sections overview-edge-cases');
  assertContains('.github/workflows/ci.yml', '--viewports desktop=1366x900,narrow=390x844');

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
  assertContains('install.sh', 'ROS_PANEL_NETWORK_WRITE_ENABLED');

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
  assertContains('Dockerfile', 'ROS_PANEL_NETWORK_WRITE_ENABLED=0');
  assertContains('Dockerfile', 'chown -R root:root /app');
  assertContains('Dockerfile', 'chown panel:panel /app/data');
  assertContains('Dockerfile', 'chmod 0750 /app/data');
  assertContains('compose.yml', 'read_only: true');
  assertContains('compose.yml', 'ROS_PANEL_ALLOW_LOCALHOST_HOST_FORWARD: "${ROS_PANEL_ALLOW_LOCALHOST_HOST_FORWARD:-0}"');
  assertContains('compose.yml', 'ROS_PANEL_LOCALHOST_FORWARD_TOKEN: "${ROS_PANEL_LOCALHOST_FORWARD_TOKEN:-}"');
  assertContains('compose.yml', 'ROS_PANEL_NETWORK_WRITE_ENABLED: "${ROS_PANEL_NETWORK_WRITE_ENABLED:-0}"');
  assertContains('compose.yml', 'no-new-privileges:true');
  assertContains('deploy_linux.sh', 'useradd --system --user-group');
  assertContains('deploy_linux.sh', 'ROS_PANEL_NETWORK_WRITE_ENABLED="${ROS_PANEL_NETWORK_WRITE_ENABLED:-0}"');
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
  assertContains('tools/build-windows-exe.ps1', 'ROS_PANEL_NETWORK_WRITE_ENABLED=1');
  assertContains('.github/workflows/ci.yml', 'Windows env is missing loopback bind default');
  assertContains('.github/workflows/ci.yml', 'Windows env is missing panel address write default');
  assertContains('public/index.html', 'snapshotNeedsRouterLogin');
  assertContains('public/index.html', 'snapshotHasRouterSshLoginError');
  assertContains('public/index.html', 'routerLoginDraft');
  assertContains('public/index.html', 'captureRouterLoginDraftFromForm');
  assertContains('public/index.html', 'data-router-login-form');
  assertContains('public/index.html', '/api/router-login');
  assertContains('public/index.html', 'rememberPassword');
  assertContains('public/index.html', '连接并进入面板');

  assertContains('README.md', '# RouterOS Read-only Status Panel');
  assertContains('README.zh-CN.md', '# RouterOS 只读状态面板');
  assertContains('README.md', 'status visibility');
  assertContains('README.md', 'not configuration management');
  assertContains('README.md', 'troubleshooting automation');
  assertContains('README.zh-CN.md', '不做配置管理');
  assertContains('README.zh-CN.md', '暂时不做排障工具');
  assertContains('PRODUCT_MODEL.md', 'Public UI should not imply automatic repair, configuration management, or');

  assertContains('public/index.html', 'renderReadonlyStatusBus');
  assertContains('public/index.html', '面板健康');
  assertContains('public/index.html', 'RouterOS 健康');
  assertContains('public/index.html', '数据年龄');
  assertMatches('public/index.html', /WAN\s*线路/);
  assertContains('public/index.html', 'CPU / 内存');
  assertContains('public/index.html', '最高异常');
  assertContains('public/index.html', 'mobileSectionSelect');
  assertContains('public/index.html', 'data-overview-mobile-flat-status');
  assertContains('public/index.html', 'data-overview-mobile-status-table');
  assertContains('public/index.html', 'data-overview-mobile-alert');
  assertContains('public/index.html', 'data-overview-mobile-alarm');
  assertContains('public/index.html', 'data-overview-action-label');
  assertContains('public/index.html', 'ik-mobile-flat-link');
  assertContains('public/index.html', 'mobileOverviewActionLabels');
  assertContains('public/index.html', "lineStatus: 'WAN明细'");
  assertContains('public/index.html', "readonlyDiagnostics: '采集状态'");
  assertContains('public/index.html', "loadAudit: '资源阈值'");
  assertContains('public/index.html', "routes: '路由快照'");
  assertContains('public/index.html', '快照缺失');
  assertContains('public/index.html', '快照证据');
  assertContains('public/index.html', 'RouterOS 当前不可达');
  assertContains('public/index.html', '无业务快照，业务数据不展示');
  assertContains('public/index.html', '链路可参考 / 业务状态不可参考');
  assertNotContains('public/index.html', '数据可信度不可判定');
  assertNotContains('public/index.html', '业务数据不可判定');
  assertNotContains('public/index.html', '业务数值隐藏');
  assertContains('public/index.html', '快照缺失 · 状态更新时间');
  assertNotContains('public/index.html', '建议查看');
  assertNotContains('public/index.html', '建议：');
  assertNotContains('public/index.html', 'endpoint failure');
  assertContains('public/index.html', '样本不足，趋势暂不可用');
  assertContains('public/index.html', 'ops-threshold-line');
  assertContains('tools/local-predeploy-check.js', "loadAuditResourceText.includes('持续')");
  assertContains('public/index.html', 'renderFreshnessStrip');
  assertContains('public/index.html', '事件更新时间');
  assertContains('public/index.html', '业务快照时间');
  assertContains('public/index.html', '业务快照年龄');
  assertContains('public/index.html', '失败端点');
  assertContains('public/index.html', '当前为只读模式：仅通过 RouterOS API/SSH 读取状态，不写入配置。');
  assertContains('public/index.html', 'RouterOS 写入');
  assertContains('public/index.html', '本地别名写入');
  assertContains('public/index.html', 'REST 状态');
  assertContains('public/index.html', 'SSH 状态');
  assertContains('public/index.html', '外部访问');
  assertContains('app.py', 'statusFindings');
  assertContains('app.py', 'healthFindings');
  assertContains('tools/local-predeploy-check.js', 'main-menu');
  assertContains('tools/local-predeploy-check.js', 'loadAudit');
  assertContains('tools/local-predeploy-check.js', 'readonlyDiagnostics');
  assertContains('tools/local-predeploy-check.js', 'security');
  assertContains('tools/local-predeploy-check.js', 'buildMatrixSummary');
  assertContains('tools/local-predeploy-check.js', 'report.matrix = buildMatrixSummary(report.browserChecks, args);');
  assertContains('tools/local-predeploy-check.js', 'unified release scenario matrix covers required scenarios');
  assertContains('tools/local-predeploy-check.js', 'release-matrix-');
  assertContains('tools/local-predeploy-check.js', 'function gitFullHead()');
  assertContains('tools/local-predeploy-check.js', 'commit: gitFullHead() || gitShortHead(),');
  assertContains('tools/local-predeploy-check.js', 'releaseMatrixComplete = explicitOverviewReleaseMatrix ? report.matrix.complete : matrixAggregate.complete');
  assertContains('tools/local-predeploy-check.js', 'explicitOverviewReleaseMatrix');
  assertContains('tools/local-predeploy-check.js', 'OVERVIEW_RELEASE_VIEWPORTS');
  assertContains('tools/local-predeploy-check.js', 'viewportCellKey');
  assertContains('tools/check-public-release-readiness.js', 'normalizeMatrixCell');
  assertContains('tools/local-predeploy-check.js', '--viewports <list>          Comma list like desktop=1366x900,narrow=390x844.');
  assertContains('tools/local-predeploy-check.js', 'aggregateComplete: matrixAggregate.complete,');
  assertContains('tools/local-predeploy-check.js', 'screenshotDir: args.out');
  assertContains('tools/local-predeploy-check.js', 'scenarioMatrix:');
  assertContains('tools/local-predeploy-check.js', 'screenshots: listScreenshotFiles(args.out)');
  assertContains('tools/local-predeploy-check.js', 'overviewDesktopSamplingStateUniqueOk');
  assertContains('tools/local-predeploy-check.js', 'overviewDesktopTopConclusionUniqueOk');
  assertContains('tools/local-predeploy-check.js', 'overviewMobileSamplingStateUniqueOk');
  assertContains('tools/local-predeploy-check.js', 'overviewMobileActionLinksUniqueOk');
  assertContains('tools/local-predeploy-check.js', 'overviewDesktopActionLinksUniqueOk');
  assertContains('tools/local-predeploy-check.js', 'overviewMobilePrimaryConclusionUniqueOk');
  assertContains('tools/local-predeploy-check.js', "const mobileAllowedActionLabels = new Set(['WAN明细', '采集状态', '资源阈值', '路由快照']);");
  assertContains('tools/local-predeploy-check.js', 'overviewPrimaryConclusionNoEllipsisOk');
  assertContains('tools/local-predeploy-check.js', 'overviewCollectionContradictionOk');
  assertContains('tools/local-predeploy-check.js', 'overviewCollectionTrustMarkersOk');
  assertContains('tools/local-predeploy-check.js', 'overviewInterfacesForwardingFirstOk');
  assertContains('tools/local-predeploy-check.js', 'overviewStatusBusFixedGrammarOk');
  assertContains('tools/local-predeploy-check.js', 'overviewResourceFirstScreenPriorityOk');
  assertContains('tools/local-predeploy-check.js', 'overviewDefaultRouteRawFactsOk');
  assertContains('tools/local-predeploy-check.js', 'overviewNoSnapshotDowngradeReasonsOk');
  assertContains('tools/local-predeploy-check.js', 'overviewNoSnapshotFiveBlocksOk');
  assertContains('tools/local-predeploy-check.js', 'overviewChineseUiNoEngineeringEnglishOk');
  assertContains('tools/local-predeploy-check.js', 'overviewFirstScreenCoverageOk');
  assertContains('tools/local-predeploy-check.js', 'overviewDesktopDensityOk');
  assertContains('tools/local-predeploy-check.js', 'overviewDesktopTopBandOk');
  assertContains('tools/local-predeploy-check.js', 'overviewDesktopFlatStatusBarOk');
  assertContains('tools/local-predeploy-check.js', 'overviewDesktopTableDensityOk');
  assertContains('tools/local-predeploy-check.js', "const overviewFlatDesktopContractOk = sectionName === 'overview' && isDesktopOverview && Boolean(");
  assertContains('tools/local-predeploy-check.js', "const overviewFlatMobileContractOk = sectionName === 'overview' && isMobileOverview && Boolean(");
  assertContains('tools/local-predeploy-check.js', 'overviewDesktopDetailFirstTwoRowsVisibleOk');
  assertContains('tools/local-predeploy-check.js', 'overviewDesktopModuleSpreadOk');
  assertContains('tools/local-predeploy-check.js', 'overviewBlankAreaOk');
  assertContains('tools/local-predeploy-check.js', 'overviewDesktopNo72vhBlankOk');
  assertContains('tools/local-predeploy-check.js', 'overviewMobileNo72vhBlankOk');
  assertContains('tools/local-predeploy-check.js', 'overviewDesktopWhitespaceBudgetOk');
  assertContains('tools/local-predeploy-check.js', 'overviewDesktopInfoBudgetOk');
  assertContains('tools/local-predeploy-check.js', 'overviewDesktopInfoDensityOk');
  assertContains('tools/local-predeploy-check.js', 'overviewReadonlyConsoleContractOk &&');
  assertContains('tools/local-predeploy-check.js', 'overviewDesktopFirstScreenDedupeOk');
  assertContains('tools/local-predeploy-check.js', 'overviewCrossViewportCopyDedupeOk');
  assertContains('tools/local-predeploy-check.js', 'overviewCardBudgetOk');
  assertContains('tools/local-predeploy-check.js', 'overviewSemanticColorBudgetOk');
  assertContains('tools/local-predeploy-check.js', 'overviewActionLinksLowChromeOk');
  assertContains('tools/local-predeploy-check.js', 'overviewMobileCoreOk');
  assertContains('tools/local-predeploy-check.js', 'overviewMobileFlatStatusTableOk');
  assertContains('tools/local-predeploy-check.js', 'overviewMobileLedgerHeightOk');
  assertContains('tools/local-predeploy-check.js', 'overviewMobileAlertCardCompactOk');
  assertContains('tools/local-predeploy-check.js', 'overviewMobileDetailFirstTwoRowsVisibleOk');
  assertContains('tools/local-predeploy-check.js', 'overviewProductVerdictOk');
  assertContains('tools/local-predeploy-check.js', 'overviewWanListPriorityOk');
  assertContains('tools/local-predeploy-check.js', 'overviewWanEvidencePriorityOk');
  assertContains('tools/local-predeploy-check.js', 'mobileWanEvidenceRows.slice(0, 3).every(nodeVisibleInFirstScreen)');
  assertContains('tools/local-predeploy-check.js', 'overviewResourceNumericDensityOk');
  assertContains('tools/local-predeploy-check.js', 'overviewResourceDurationVisibilityOk');
  assertNotContains('tools/local-predeploy-check.js', 'overviewTrendCompactOk &&');
  assertNotContains('tools/local-predeploy-check.js', 'overviewRankCompactOk &&');
  assertNotContains('tools/local-predeploy-check.js', 'overviewResourceTrendOk &&');
  assertNotContains('tools/local-predeploy-check.js', 'overviewAxesOk &&');
  assertNotContains('tools/local-predeploy-check.js', 'overviewMonitorSplitOk &&');
  assertNotContains('tools/local-predeploy-check.js', 'overviewResourceAxisOk &&');
  assertNotContains('tools/local-predeploy-check.js', 'overviewProtocolRankOk &&');
  assertContains('tools/local-predeploy-check.js', 'overviewMobileCopyAssemblyOk');
  assertContains('tools/local-predeploy-check.js', 'overviewRestSshViewportParityOk');
  assertContains('tools/local-predeploy-check.js', 'overviewMobileEffectiveCoverageOk');
  assertContains('tools/local-predeploy-check.js', 'overviewMobileFirstScreenContractOk');
  assertContains('tools/local-predeploy-check.js', 'overviewMobileWanIncidentPriorityOk');
  assertContains('tools/local-predeploy-check.js', 'overviewRestSshSourceConsistencyOk');
  assertContains('tools/local-predeploy-check.js', 'overviewResourceFullIncidentOk');
  assertContains('tools/local-predeploy-check.js', 'overviewNoSnapshotFreshnessForbiddenOk');
  assertContains('tools/local-predeploy-check.js', 'overviewNoSnapshotSemanticOk');
  assertContains('tools/local-predeploy-check.js', 'overviewNoSnapshotTrustedMetricsForbiddenOk');
  assertContains('tools/local-predeploy-check.js', 'overviewNoSnapshotSamplingStateUniqueOk');
  assertContains('tools/local-predeploy-check.js', 'overviewNoSnapshotDesktopEvidenceTripletOk');
  assertContains('tools/local-predeploy-check.js', 'overviewNoSnapshotGridOk');
  assertContains('tools/local-predeploy-check.js', 'overviewNoSnapshotSemanticProbe');
  assertNotContains('tools/local-predeploy-check.js', 'overviewFlatMobileContractOk ||');
  assertContains('tools/local-predeploy-check.js', 'overviewCollectionLayerSplitOk');
  assertContains('tools/local-predeploy-check.js', 'overviewInterfacesChannelConsistencyOk');
  assertContains('tools/local-predeploy-check.js', 'overviewInterfacesDownCollectionParityOk');
  assertContains('tools/local-predeploy-check.js', 'overviewMobileEvidenceUniqueOk');
  assertContains('tools/local-predeploy-check.js', 'overviewFirstScreenDedupeOk');
  assertContains('tools/local-predeploy-check.js', 'overviewDesktopTopBandProbe');
  assertContains('tools/local-predeploy-check.js', 'overviewMobileUniqueVerdictProbe');
  assertContains('tools/local-predeploy-check.js', 'overviewFirstScreenDedupeProbe');
  assertContains('tools/local-predeploy-check.js', 'overviewHistoryTitlePrefixOk');
  assertContains('tools/local-predeploy-check.js', 'overviewDefaultRouteSemanticUndeterminedOk');
  assertNotContains('tools/local-predeploy-check.js', 'overviewFirstScreenFieldCount >= minOverviewFirstScreenFields');
  assertContains('tools/local-predeploy-check.js', "const requiredScenarios = ['single', 'fleet', 'all-offline', 'no-snapshot', 'collection-down', 'resource-full', 'interfaces-down'];");
  assertContains('public/scale-adaptive-patch.js', '平均值');
  assertNotContains('app.py', 'semanticTriage');
  assertNotContains('app.py', 'actionQueue');
  assertNotContains('app.py', 'manual_review');
  assertPublicBoundaryClean('public/index.html');
  assertPublicBoundaryClean('public/scale-adaptive-patch.js');
  assertPublicBoundaryClean('public/layout-whitespace-patch.js');
  assertNotContains('public/index.html', 'events.length');
  assertContains('public/index.html', 'data-overview-desktop-workspace');
  assertContains('public/index.html', 'data-overview-density-module="wan-trend"');
  assertContains('public/index.html', 'data-overview-rank-grid');

  assertContains('public/index.html', '路由与分流状态');
  assertContains('public/index.html', '防火墙规则');
  assertContains('public/index.html', '资源状态');
  assertContains('public/index.html', '流量状态');
  assertContains('public/index.html', '终端状态');
  assertContains('public/index.html', '采集状态');
  assertNotContains('public/index.html', '诊断总览');
  assertNotContains('public/index.html', '负载审计');
  assertNotContains('public/index.html', 'ACL 规则');
  assertNotContains('public/index.html', '分流监控');
  assertNotContains('public/index.html', '终端风险');
  assertNotContains('public/index.html', '线路状态检测');
  assertNotContains('public/index.html', '请检查');
  assertNotContains('public/index.html', '下一步');
  assertNotContains('public/index.html', 'layout-whitespace-patch.js');
  assertNotContains('public/index.html', 'readonly-diagnostics.js');
  assertContains('app.py', 'private_public_assets = {"readonly-diagnostics.js"}', 'readonly diagnostics stays private in public profile');
  assertContains('app.py', 'if PUBLIC_ROUTEROS_PROFILE and asset_name in self.private_public_assets:', 'public static boundary for readonly diagnostics');
  assertContains('app.py', '/api/readonly-diagnostics', 'readonly diagnostics API route remains present');
  assertContains('app.py', 'readonly diagnostics are private in the public RouterOS profile', 'readonly diagnostics API still returns 403 in public profile');
  assertContains('app.py', 'code="private_diagnostics_disabled"', 'readonly diagnostics 403 code remains explicit');
  assertContains('tools/local-predeploy-check.js', "const privatePublicAsset = publicRouterosProfile && asset === 'readonly-diagnostics.js';", 'predeploy checker must keep readonly diagnostics asset private');
  assertContains('tools/local-predeploy-check.js', 'privatePublicAsset ? result.response.status === 403 : result.response.ok && result.text.length > 1000', 'public asset check must preserve the 403 gate');
  assertContains('tools/local-predeploy-check.js', "diag.response.status === 403 && diag.json.code === 'private_diagnostics_disabled'", 'public readonly diagnostics API check must preserve the 403 code');
  assertContains('tools/local-predeploy-check.js', 'local server logs stay free of socket reset noise');
  assertContains('tools/local-predeploy-check.js', 'ConnectionResetError');
  assertContains('tools/local-predeploy-check.js', 'BrokenPipeError');
  assertNotContains('public/index.html', 'collectionHealthDiagnostics');
  assertNotContains('public/index.html', 'dnsProxyDiagnostics');
  assertNotContains('public/index.html', 'wanQualityDiagnostics');
  assertNotContains('public/index.html', 'terminalRiskDiagnostics');
  assertNotContains('public/index.html', 'systemAuditDiagnostics');

  assertContains('public/index.html', '展开 RouterOS 原始字段');
  assertContains('public/index.html', 'connection-mark');
  assertContains('public/index.html', 'packet-mark');
  assertContains('public/index.html', 'routing-mark');
  assertContains('public/index.html', 'passthrough');
  assertContains('public/index.html', 'in-interface');
  assertContains('public/index.html', 'out-interface');
  assertContains('public/index.html', 'src-address');
  assertContains('public/index.html', 'dst-address');
  assertContains('app.py', 'rawOrder');
  assertContains('app.py', 'connection-mark');
  assertContains('app.py', 'packet-mark');
  assertContains('app.py', 'routing-mark');
  assertContains('app.py', 'passthrough');

  if (args.staticOnly) {
    console.log('[ok] static public release readiness markers are present');
  } else {
    const latestFullMatrixReport = assertLatestFullMatrixReport();
    console.log(`[ok] latest full matrix report is 7x2 all green: ${path.relative(ROOT, latestFullMatrixReport.reportPath)}`);
  }

  console.log('[ok] public release readiness markers are present');
}

if (require.main === module) {
  main();
}

module.exports = {
  assertLatestFullMatrixReport,
  findLatestFullMatrixReport,
  parseArgs,
  FULL_MATRIX_CELLS,
  FULL_MATRIX_SCENARIOS,
  FULL_MATRIX_VIEWPORT_KEYS,
};
