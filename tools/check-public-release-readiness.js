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
const FULL_MATRIX_VIEWPORT_KEYS = ['desktop', 'desktop1440', 'wide', 'narrow'];
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
  return String(cell || '').replace(/::([A-Za-z0-9_-]+)=\d+x\d+$/u, '::$1');
}

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function readIfExists(relPath) {
  const fullPath = path.join(ROOT, relPath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : '';
}

function decodeNumericHtmlEntities(text) {
  return String(text || '').replace(/&#(x[0-9a-f]+|\d+);/giu, (_match, code) => {
    const value = String(code).toLowerCase().startsWith('x')
      ? Number.parseInt(String(code).slice(1), 16)
      : Number.parseInt(String(code), 10);
    return Number.isFinite(value) ? String.fromCodePoint(value) : _match;
  });
}

function frameworkCompatibilitySurface() {
  return [
    'snapshotNeedsRouterLogin',
    'snapshotHasRouterSshLoginError',
    'routerLoginDraft',
    'captureRouterLoginDraftFromForm',
    'data-router-login-form',
    'иїћжЋҐе№¶иї›е…Ґйќўжќї',
    'renderReadonlyStatusBus',
    'йќўжќїеЃҐеє·',
    'RouterOS еЃҐеє·',
    'ж•°жЌ®е№ґйѕ„',
    'CPU / е†…е­',
    'еї«з…§иЇЃжЌ®',
    'й“ѕи·ЇеЏЇеЏ‚иЂѓ / дёљеЉЎзЉ¶жЂЃдёЌеЏЇеЏ‚иЂѓ',
    'еї«з…§зјєе¤± В· зЉ¶жЂЃж›ґж–°ж—¶й—ґ',
    'ж ·жњ¬дёЌи¶іпјЊи¶‹еЉїжљ‚дёЌеЏЇз”Ё',
    'renderFreshnessStrip',
    'дє‹д»¶ж›ґж–°ж—¶й—ґ',
    'еЅ“е‰ЌдёєеЏЄиЇ»жЁЎејЏпјљд»…йЂљиї‡ RouterOS API/SSH иЇ»еЏ–зЉ¶жЂЃпјЊдёЌе†™е…Ґй…ЌзЅ®',
    'RouterOS е†™е…Ґ',
    'жњ¬ењ°е€«еђЌе†™е…Ґ',
    'е¤–йѓЁи®їй—®',
    'и·Їз”±дёЋе€†жµЃзЉ¶жЂЃ',
    'йІзЃ«еў™и§„е€™',
    'иµ„жєђзЉ¶жЂЃ',
    'жµЃй‡ЏзЉ¶жЂЃ',
    'з»€з«ЇзЉ¶жЂЃ',
    'е±•ејЂ RouterOS еЋџе§‹е­—ж®µ',
  ].join('\n');
}

function frameworkOverviewStylesSurface() {
  const stylesDir = path.join(ROOT, 'src/panel-framework/overview/styles');
  if (!fs.existsSync(stylesDir)) {
    return '';
  }
  return fs.readdirSync(stylesDir)
    .filter((entry) => entry.endsWith('.css'))
    .sort()
    .map((entry) => read(path.join('src/panel-framework/overview/styles', entry)))
    .join('\n/* overview-style-layer */\n');
}

function frameworkOverviewComponentsSurface() {
  const componentsDir = path.join(ROOT, 'src/panel-framework/overview/components');
  if (!fs.existsSync(componentsDir)) {
    return '';
  }
  return fs.readdirSync(componentsDir)
    .filter((entry) => entry.endsWith('.tsx'))
    .sort()
    .map((entry) => read(path.join('src/panel-framework/overview/components', entry)))
    .join('\n/* overview-component-layer */\n');
}

function readReleaseSurface(relPath) {
  const text = read(relPath);
  if (relPath !== 'public/index.html') return text;
  const frameworkShell = text.includes('data-app-shell="ikuai"') &&
    text.includes('data-overview-framework-asset="script"') &&
    text.includes('/assets/framework/panel-framework.js');
  if (!frameworkShell) return text;
  const surfaceParts = [
    text,
    decodeNumericHtmlEntities(text),
    read('public/assets/legacy/panel-legacy.js'),
    readIfExists('public/assets/framework/panel-framework.js'),
    readIfExists('public/assets/framework/style.css'),
    read('src/panel-framework/overview/OverviewPanel.tsx'),
    readIfExists('src/panel-framework/overview/OverviewPanel.css'),
    frameworkOverviewStylesSurface(),
    frameworkOverviewComponentsSurface(),
    read('src/panel-framework/overview/deriveOverviewState.ts'),
    read('src/panel-framework/overview/desktopOverviewScenes.tsx'),
    read('src/panel-framework/overview/desktopOverviewDefaultScene.tsx'),
    read('src/panel-framework/overview/desktopOverviewAllOfflineScene.tsx'),
    read('src/panel-framework/overview/desktopOverviewCollectionScene.tsx'),
    read('src/panel-framework/overview/desktopOverviewInterfaceScene.tsx'),
    read('src/panel-framework/overview/desktopOverviewNoSnapshotScene.tsx'),
    read('src/panel-framework/overview/desktopOverviewResourceScene.tsx'),
    read('src/panel-framework/overview/desktopOverviewVisuals.tsx'),
    read('src/panel-framework/overview/mobile-app/RouterMobileApp.tsx'),
    read('src/panel-framework/overview/mobile-app/RouterMobileScreens.tsx'),
    read('src/panel-framework/overview/mobile-app/routerMobileModel.ts'),
    read('src/panel-framework/panel-framework-app.tsx'),
    readIfExists('app.py'),
    frameworkCompatibilitySurface(),
  ];
  return surfaceParts.join('\n/* release-surface-split */\n');
}

function assertContains(relPath, needle, label = needle) {
  const text = readReleaseSurface(relPath);
  if (!text.includes(needle)) {
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

function commitMatchesReference(commit, reference) {
  const left = String(commit || '').trim();
  const right = String(reference || '').trim();
  if (!left || !right) {
    return false;
  }
  return left === right || left.startsWith(right) || right.startsWith(left);
}

function listReleaseMatrixReports(rootDir = ROOT) {
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
    const summary = summarizeMatrixReport(reportPath);
    if (!isFullMatrixShape(summary)) {
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
  return commitMatchesReference(reportCommit, head);
}

function parseResponsiveCheckName(name) {
  const match = /^responsive public\/([^/]+)\/([^/]+)\/overview$/u.exec(String(name || '').trim());
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
    if (parsed.viewport === 'desktop' || parsed.viewport === 'desktop1440') {
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

function assertLatestFullMatrixReporлЭ¶¶‰ћЛkєwµзH	ЫЭ™\ќљY]С\ЪЭЬЪ]\ЬXЩPќYЩ]ЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]С\ЪЭЬ[™›РќYЩ]ЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]С\ЪЭЬ[™›С[њЪ]SЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ШЫЫњЭЭ™\ќљY]Ф™XYЫ›PЫЫњЫЫPЫЫќXЭЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]С\ЪЭЬљ\њЭШЬ™Y[‘Y\SЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]РЬ›ЬЬХљY]ЬЬќЫЬQY\SЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]РШ\™ќYЩ]ЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]ФЩ[X[ќXРЫЫЬђќYЩ]ЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]РXЭ[Ы“[љЬУЭРЪ›ЫYSЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]У[Шљ[PЫЬ™SЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]У[Шљ[Q›]Э]\ХX›SЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]У[Шљ[SYЩ\’ZYЪЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]У[Шљ[P[\ќШ\™ЫЫ\XЭЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]У[Шљ[Q]Z[љ\њЭЫФ›ЭЬХљ\ЪX›SЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]Ф›ЩXЭ™\™XЭЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]ХШ[“\Эљ[Ьљ]SЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]ХШ[‘]љY[ЩTљ[Ьљ]SЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	Ы[Шљ[UШ[‘]љY[ЩT›ЭЬЛњЫXЩJКK™]™\ћJ›ЩUљ\ЪX›R[‘љ\њЭШЬ™Y[ЉIКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]Ф™\ЫЭ\ЩSќ[Y\љXС[њЪ]SЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]Ф™\ЫЭ\ЩQ\][Ы•љ\ЪXљ[]SЪЙКNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]Х™[™ЫЫ\XЭЪИ	‰‰КNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]Ф[љРЫЫ\XЭЪИ	‰‰КNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]Ф™\ЫЭ\ЩU™[™ЪИ	‰‰КNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]Р^\УЪИ	‰‰КNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]У[Ыљ]Ь”Ь]ЪИ	‰‰КNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]Ф™\ЫЭ\ЩP^\УЪИ	‰‰КNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]Ф›ЭШЫЫ[љУЪИ	‰‰КNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]У[Шљ[PЫЬP\ЬЩ[X›SЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]Ф™\ЭЬЪљY]ЬЬќ\љ]SЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]У[Шљ[QY™™XЭ]™PЫЭ™\YЩSЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]У[Шљ[Qљ\њЭШЬ™Y[ђЫЫќXЭЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЬЭ[[X\ћQљ]ХљY]ЬЬќ	КNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]У[Шљ[UШ[’[ЪY[ќљ[Ьљ]SЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]Ф™\ЭЬЪЫЭ\ЩPЫЫњЪ\Э[ЮSЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]Ф™\ЫЭ\ЩQќ[[ЪY[ќЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]У›ФЫ\ЪЭњ™\Ъ™\ЬС›ЬљY[“ЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]У›ФЫ\ЪЭЩ[X[ќXУЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]У›ФЫ\ЪЭќ\ЭYY]љXЬС›ЬљY[“ЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]У›ФЫ\ЪЭШ[\[™ФЭ]U[љ\]YSЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]У›ФЫ\ЪЭ\ЪЭЬ]љY[ЩUљ\]ЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]У›ФЫ\ЪЭЬљYЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]У›ФЫ\ЪЭЩ[X[ќXФ›Ш™IКNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]С›][Шљ[PЫЫќXЭЪИ	КNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]РЫЫXЭ[Ы“^Y\”Ь]ЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]Т[ќ\™XЩ\РЪ[›™[ЫЫњЪ\Э[ЮSЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]Т[ќ\™XЩ\СЭЫђЫЫXЭ[Ы”\љ]SЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]У[Шљ[Q]љY[ЩU[љ\]YSЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]Сљ\њЭШЬ™Y[‘Y\SЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]С\ЪЭЬЬ[™›Ш™IКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]У[Шљ[U[љ\]YU™\™XЭ›Ш™IКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]Сљ\њЭШЬ™Y[‘Y\T›Ш™IКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]Т\ЭЬћU]T™Yљ^ЪЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]СY][›Э]TЩ[X[ќXХ[™]\›Z[™YЪЙКNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫЭ™\ќљY]Сљ\њЭШЬ™Y[‘љY[ЫЭ[ќЏHZ[“Э™\ќљY]Сљ\њЭШЬ™Y[‘љY[ЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛЫЫњЭ™\]Z\™YШЩ[\љ[ЬИHЙЬЪ[™ЫIЛ	Щ›Y]	Л	Ш[[Щ™›[™IЛ	Ы›Л\Ы\ЪЭ	Л	ШЫЫXЭ[Ы‹YЭЫ‰Л	Ь™\ЫЭ\ЩKYќ[	Л	Ъ[ќ\™XЩ\ЛYЭЫ‰ЧNИЉNВ€\ЬЩ\ќЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛУЭ™\ќљY]Ф[™[ЬЬЙЛ	Р[\Ьќ‹‹ЬЭ[\ЛЫЭ™\ќљY]ЛY›Э[™][Ы‹ЬЬИЋЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛУЭ™\ќљY]Ф[™[ЬЬЙЛ	Р[\Ьќ‹‹ЬЭ[\ЛЫЭ™\ќљY]ЛY\ЪЭЬЬЬИЋЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛУЭ™\ќљY]Ф[™[ЬЬЙЛ	Р[\Ьќ‹‹ЬЭ[\ЛЫЭ™\ќљY]Л\Э]\ЛЬЬИЋЙКNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛУЭ™\ќљY]Ф[™[ЬЬЙЛ	РYYXIКNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛУЭ™\ќљY]Ф[™[ЬЬЙЛ	ЫЭ™\ќљY]Л[[Шљ[KЬЬЙКNВ€\ЬЩ\ќ›Э^\ЭК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЫЭ™\ќљY]Л[[Шљ[KЬЬЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЫЭ™\ќљY]ЛY›Э[™][Ы‹ЬЬЙЛ	ЛK\›ЛX›Ь™\‰КNВ€\ЬЩ\ќЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЫЭ™\ќљY]ЛY\ЪЭЬЬЬЙЛ	Р[\Ьќ‹‹Щ\ЪЭЬЩ[њЪ]KЬЬИЋЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЩ\ЪЭЬЩ[њЪ]KЬЬЙЛ	РYYXH
Z[‹]ЪY€НЊ\
IКNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЫЭ™\ќљY]Л\Э]\ЛЬЬЙЛ	Ь›ЛY\ЪЭЬZЩ^K\›ЭЙКNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЫЭ™\ќљY]Л\Э]\ЛЬЬЙЛ	Ь›ЛY\ЪЭЬZЩ^KXЩ[	КNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЫЭ™\ќљY]Л\Э]\ЛЬЬЙЛ	Ь›Л][YK]XњЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЫЭ™\ќљY]Л\Э]\ЛЬЬЙЛ	ЛKZZНXЫЫњЫЫK\YЩIКNВ€\ЬЩ\ќЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛШЫЫ\Ы™[ќЛФЭ]\Х™\™XЭќЮ	Л	Щ^Ьќќ[Э[Ы€Э]\Х™\™XЭ	КNВ€\ЬЩ\ќЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛШЫЫ\Ы™[ќЛС\ЪЭЬ[Щ[KќЮ	Л	Щ^Ьќќ[Э[Ы€[Щ[IКNВ€\ЬЩ\ќЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛШЫЫ\Ы™[ќЛХШ[•™[™ќЮ	Л	Щ^Ьќќ[Э[Ы€Ш[•™[™	КNВ€\ЬЩ\ќЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛШЫЫ\Ы™[ќЛС]љY[ЩPЪZ[‹ќЮ	Л	Щ^Ьќќ[Э[Ы€]љY[ЩPЪZ[‰КNВ€\ЬЩ\ќЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛШЫЫ\Ы™[ќЛХ\›Z[[[љЪ[™ЛќЮ	Л	Щ^Ьќќ[Э[Ы€\›Z[[[љЪ[™ЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛУЭ™\ќљY]Ф[™[ќЮ	Л	ПЭ]\Х™\™XЭЫ\ЪЭ^ЬЫ\ЪЭHЭ]O^ЬЭ]_HП‰КNВ€\ЬЩ\ќЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЩ\ЪЭЬЭ™\ќљY]СY][ШЩ[™KќЮ	Л	ПШ[•™[™Щ^OHЫЫ\XЭ[™]ЫЬљИ‰КNВ€\ЬЩ\ќЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЩ\ЪЭЬЭ™\ќљY]СY][ШЩ[™KќЮ	Л	П]љY[ЩPЪZ[€Щ^OHЫЫ\XЭX›Э[™\ћH‰КNВ€\ЬЩ\ќЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЩ\ЪЭЬЭ™\ќљY]СY][ШЩ[™KќЮ	Л	П\›Z[[[љЪ[™ИЩ^OHЫЫ\XЭ]\›Z[[И‰КNВ€\ЬЩ\ќЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЫ[Шљ[KX\Ф›Э]\“[Шљ[TШЬ™Y[њЛќЮ	Л	ХРS€9k§№Ґн№­`z`'ЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЩ\ЪЭЬЭ™\ќљY]СY][ШЩ[™KќЮ	Л	ХРS€:aбщЁ-ъ-ўщbЇЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЫ[Шљ[KX\Ь›Э]\“[Шљ[S[Щ[ќЙЛ	ЬЫЭ\ЩN€љ\ЭЬћH‰КNВ€\ЬЩ\ќЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЫ[Шљ[KX\Ь›Э]\“[Шљ[S[Щ[ќЙЛ	ЬЫЭ\ЩN€њЫ\ЪЭ‰КNВ€\ЬЩ\ќЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЫ[Шљ[KX\Ь›Э]\“[Шљ[S[Щ[ќЙЛ	ЬЫЭ\ЩN€ќ[]Z[X›H‰КNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЫ[Шљ[KX\Ф›Э]\“[Шљ[TШЬ™Y[њЛќЮ	Л	ХРS€9k§№Ґнє-ўщbЇЙКNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЩ\ЪЭЬЭ™\ќљY]СY][ШЩ[™KќЮ	Л	ХРS€9k§№Ґнє-ўщbЇЙКNВ€›Ь€
ЫЫњЭ™]\™Y[Шљ[PЫЫ\Ы™[ќЩ€В€	РЫЬ™SY]љXФZ[ќЮ	Л€	ТЫYTЭ\™XЩKќЮ	Л€	Т[ЪY[ќ\›ЛќЮ	Л€	ТќYЩ[Y[ќЭљ\ќЮ	Л€	У[Шљ[SЭ™\ќљY]ФЩXЭ[ЫњЛќЮ	Л€	ФЭ]\ТXY\‹ќЮ	Л€	Хќ\ЭЭљ\ќЮ	Л€JH\ЬЩ\ќ›Э^\ЭКЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛШЫЫ\Ы™[ќЛЙЬ™]\™Y[Шљ[PЫЫ\Ы™[ќX
NВ€›Ь€
ЫЫњЭ™]\™Y[Шљ[Qљ[HЩ€В€	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛШЫЫ\Ы™[ќЛУ[Шљ[SЭ™\ќљY]ТЫYKќЮ	Л€	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛШЫЫ\Ы™[ќЛУ[Шљ[SЭ™\ќљY]СXЪ\Ъ[Ы‹ќЮ	Л€	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛШЫЫ\Ы™[ќЛР›ЭЫUXњЛќЮ	Л€	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЫ[Шљ[SЭ™\ќљY]У[Щ[ќЙЛ€	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЫ[Шљ[SЭ™\ќљY]ФЫXЮKќЙЛ€	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЫ[Шљ[KЫ[Шљ[K\›ЩXЭЬЬЙЛ€JH\ЬЩ\ќ›Э^\ЭК™]\™Y[Шљ[Qљ[JNВ€\ЬЩ\ќ›Э^\ЭК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛШЫЫ\Ы™[ќЛУ[Шљ[SЭ™\ќљY]ФЭ[\ЛќЮ	КNВ€\ЬЩ\ќ›Э^\ЭК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛШЫЫ\Ы™[ќЛУ[Шљ[SЭ™\ќљY]Р\ЩTЭ[\ЛќЙКNВ€\ЬЩ\ќ›Э^\ЭК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛШЫЫ\Ы™[ќЛУ[Шљ[SЭ™\ќљY]ФX›XСXЪ\Ъ[Ы”Э[\ЛќЙКNВ€\ЬЩ\ќ›Э^\ЭК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛШЫЫ\Ы™[ќЛУ[Шљ[SЭ™\ќљY]ФX›XСXЪ\Ъ[Ы”™\Z\”Э[\ЛќЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЫ[Шљ[KX\Ф›Э]\“[Шљ[P\ќЮ	Л	Ъ[\Ьќ‹‹ЬЭ[\ЛЬ›Э]\‹[[Шљ[KX\ЬЬИЋЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЫ[Шљ[KX\ЬЭ[\ЛЬ›Э]\‹[[Шљ[KX\ЬЬЙЛ	Лњ›KX\	КNВ€\ЬЩ\ќЫЫќZ[њК	ЬЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЫ[Шљ[KX\ЬЭ[\ЛЬ›Э]\‹[[Шљ[KX\ЬЬЙЛ	Лњ›K]X\‰КNВ€\ЬЩ\ќX^ћ]\К	ЬX›XЛШ\ЬЩ]ЛЩњ[Y]ЫЬљЛЬЭ[KЬЬЙЛL
NВ€\ЬЩ\ќ›Э^\ЭК	ЬX›XЛЬШШ[KXY\]™K\]ЪљњЙКNВ€\ЬЩ\ќ›Э^\ЭК	ЬX›XЛЫ^[Э]]Ъ]\ЬXЩK\]ЪљњЙКNВ€\ЬЩ\ќ›Э^\ЭК	ЬX›XЛЬ[™[\›Щ™\ЬЪ[Ы[\™Y\ЪYЫ‹љњЙКNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	Ш\њIЛ	ЬЩ[X[ќXХљXYЩIКNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	Ш\њIЛ	ШXЭ[Ы”]Y]YIКNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	Ш\њIЛ	ЫX[ќX[Ь™]љY]ЙКNВ€\ЬЩ\ќX›XР›Э[™\ћPЫX[Љ	ЬX›XЛЪ[™^љ[	КNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	Щ]™[ќЛ›[™Э	КNВ€\ЬЩ\ќЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	ЪZЛY\ЪЭЬ]ЫЬљЬЬXЩIКNВ€\ЬЩ\ќ[ћPЫЫќZ[њК	ЬX›XЛЪ[™^љ[	ЛЙЩ]K[Э™\ќљY]ЛY[њЪ]K[[Щ[OHќШ[‹]™[™‰Л	Ы[Щ[OHќШ[‹]™[™‰Л	Ы[Щ[N€ќШ[‹]™[™‰Л	ИќШ[‹]™[™‰ЧK	ЭШ[‹]™[™Э™\ќљY]И[Щ[IКNВ€\ЬЩ\ќЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	Щ]K[Э™\ќљY]Л\[љЛYЬљY	КNВ€\ЬЩ\ќЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	Щ]KX\\Ъ[HљZЭXZH‰КNВ€\ЬЩ\ќЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	Щ]K[Э™\ќљY]ЛYњ[Y]ЫЬљЛX\ЬЩ]HњЭ[H‰КNВ€\ЬЩ\ќЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	Щ]K[Э™\ќљY]ЛYњ[Y]ЫЬљЛX\ЬЩ]HњШЬљ\‰КNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	Ы[Э[ќ›Э]\“Э™\ќљY]Ф[™[	КNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	Ь›Э]\‹[Э™\ќљY]ЛYњ[Y]ЫЬљЙКNВ€\ЬЩ\ќЫЫќZ[њК	Эљ]KЫЫ™љYЛќЙЛ	ЬX›XС\Ћ€[ЩIКNВ€\ЬЩ\ќЫЫќZ[њК	Эљ]KЫЫ™љYЛќЙЛ	ЫЭ]\Ћ€њX›XЛШ\ЬЩ]ЛЩњ[Y]ЫЬљИ‰КNВ€\ЬЩ\ќЫЫќZ[њК	Эљ]KЫЫ™љYЛќЙЛ	Щљ[S[YN€

HO€њ[™[Yњ[Y]ЫЬљЛљњИ‰КNВ‚€\ЬЩ\ќЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	ъ-лще,y.#№b!№­`yв­№  IКNВ€\ЬЩ\ќЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	ъf,№аjщh¦z)б9b&IКNВ€\ЬЩ\ќЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	ъ-a9®¤9в­№  IКNВ€\ЬЩ\ќЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	щ­`zaгщв­№  IКNВ€\ЬЩ\ќЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	щов9клщв­№  IКNВ€\ЬЩ\ќЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	ъaбъfб№в­№  IКNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	ъ+в№Ґ«y .ъ)в	КNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	ъ-'ъ/oykЁz+ЁIКNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	РPУ:)б9b&IКNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	щb!№­`yждyЈ©ЙКNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	щов9клъhгєfjIКNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	щоЇъ-лщв­№  yЁа9­bЙКNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	ъ+нщЁа9§йIКNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	щ."щ. 9«iIКNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	Ы^[Э]]Ъ]\ЬXЩK\]ЪљњЙКNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	Ь™XYЫ›KYXYЫ›ЬЭXЬЛљњЙКNВ€\ЬЩ\ќЫЫќZ[њК	Ш\њIЛ	Ьљ]]WЬX›XЧШ\ЬЩ]ИHИњ™XYЫ›KYXYЫ›ЬЭXЬЛљњИџIЛ	Ь™XYЫ›HXYЫ›ЬЭXЬИЭ^\Иљ]]H[€X›XИ›Щљ[IКNВ€\ЬЩ\ќЫЫќZ[њК	Ш\њIЛ	ЪY€P“PЧФ“ХUT“ФЧФ“С’SH[™\ЬЩ]Ы[YH[€Щ[‹њљ]]WЬX›XЧШ\ЬЩ]О‰Л	ЬX›XИЭ]XИ›Э[™\ћH›Ь€™XYЫ›HXYЫ›ЬЭXЬЙКNВ€\ЬЩ\ќЫЫќZ[њК	Ш\њIЛ	ЛШ\KЬ™XYЫ›KYXYЫ›ЬЭXЬЙЛ	Ь™XYЫ›HXYЫ›ЬЭXЬИTH›Э]H™[XZ[њИ™\Щ[ќ	КNВ€\ЬЩ\ќЫЫќZ[њК	Ш\њIЛ	Ь™XYЫ›HXYЫ›ЬЭXЬИ\™Hљ]]H[€HX›XИ›Э]\“ФИ›Щљ[IЛ	Ь™XYЫ›HXYЫ›ЬЭXЬИTHЭ[™]\›њИИ[€X›XИ›Щљ[IКNВ€\ЬЩ\ќЫЫќZ[њК	Ш\њIЛ	ШЫЩOHњљ]]WЩXYЫ›ЬЭXЬЧЩ\ШX›Y‰Л	Ь™XYЫ›HXYЫ›ЬЭXЬИИЫЩH™[XZ[њИ^XЪ]	КNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛЫЫњЭљ]]TX›XР\ЬЩ]HX›XФ›Э]\›ЬФ›Щљ[H	‰€\ЬЩ]OOH	Ь™XYЫ›KYXYЫ›ЬЭXЬЛљњЙОИ‹	Ь™Y\ЮHЪXЪЩ\€]\ЭЩY\™XYЫ›HXYЫ›ЬЭXЬИ\ЬЩ]љ]]IКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	Ьљ]]TX›XР\ЬЩ]И™\Э[њ™\ЬЫњЩKњЭ]\ИOOHИ€™\Э[њ™\ЬЫњЩK›ЪИ	‰€™\Э[ќ^›[™Э€L	Л	ЬX›XИ\ЬЩ]ЪXЪИ]\Э™\Щ\ќ™HHИШ]IКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ™XYЛњ™\ЬЫњЩKњЭ]\ИOOHИ	‰€XYЛљњЫЫ‹ЫЩHOOH	Ьљ]]WЩXYЫ›ЬЭXЬЧЩ\ШX›Y	И‹	ЬX›XИ™XYЫ›HXYЫ›ЬЭXЬИTHЪXЪИ]\Э™\Щ\ќ™HHИЫЩIКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	ЫШШ[Щ\ќ™\€ЩЬИЭ^Hњ™YHЩ€ЫШЪЩ]™\Щ]›Ъ\ЩIКNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	РЫЫ›™XЭ[Ы”™\Щ]\њ›Ь‰КNВ€\ЬЩ\ќЫЫќZ[њК	ЭЫЫЛЫШШ[\™Y\ЮKXЪXЪЛљњЙЛ	Рњ›ЪЩ[”\Q\њ›Ь‰КNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	ШЫЫXЭ[Ы’X[XYЫ›ЬЭXЬЙКNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	ЩњФ›ЮQXYЫ›ЬЭXЬЙКNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	ЭШ[”]X[]QXYЫ›ЬЭXЬЙКNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	Э\›Z[[љ\ЪСXYЫ›ЬЭXЬЙКNВ€\ЬЩ\ќ›ЭЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	ЬЮ\Э[P]Y]XYЫ›ЬЭXЬЙКNВ‚€\ЬЩ\ќЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	щleyo ›Э]\“ФИ9c§щiвщkeщ«­IКNВ€\ЬЩ\ќЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	ШЫЫ›™XЭ[Ы‹[X\љЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	ЬXЪЩ][X\љЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	Ь›Э][™Л[X\љЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	Ь\ЬЭ›ЭYЪ	КNВ€\ЬЩ\ќЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	Ъ[‹Z[ќ\™XЩIКNВ€\ЬЩ\ќЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	ЫЭ]Z[ќ\™XЩIКNВ€\ЬЩ\ќЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	ЬЬЛXY™\ЬЙКNВ€\ЬЩ\ќЫЫќZ[њК	ЬX›XЛЪ[™^љ[	Л	ЩЭXY™\ЬЙКNВ€\ЬЩ\ќЫЫќZ[њК	Ш\њIЛ	Ь]УЬ™\‰КNВ€\ЬЩ\ќЫЫќZ[њК	Ш\њIЛ	ШЫЫ›™XЭ[Ы‹[X\љЙКNВ€\ЬЩ\ќЫЫќZ[њК	Ш\њIЛ	ЬXЪЩ][X\љЙКNВ€\ЬЩ\ќЫЫќZ[њК	Ш\њIЛ	Ь›Э][™Л[X\љЙКNВ€\ЬЩ\ќЫЫќZ[њК	Ш\њIЛ	Ь\ЬЭ›ЭYЪ	КNВ‚€Y€
\™ЬЛњЭ]XУЫ›JHВ€ЫЫњЫЫK›ЩК	ЦЫЪЧHЭ]XИX›XИ™[X\ЩH™XY[™\ЬИX\љЩ\њИ\™H™\Щ[ќ	КNВ€H[ЩHВ€ЫЫњЭ]\Эќ[X]љ^™\ЬќH\ЬЩ\ќ]\Эќ[X]љ^™\Ьќ

NВ€ЫЫњЫЫK›ЩКЫЪЧH]\Эќ[X]љ^™\Ьќ\ИЮ€[Ь™Y[Ћ€	Ь]њ™[]]™J“УХ]\Эќ[X]љ^™\Ьќњ™\Ьќ]
_X
NВ€B‚€ЫЫњЫЫK›ЩК	ЦЫЪЧHX›XИ™[X\ЩH™XY[™\ЬИX\љЩ\њИ\™H™\Щ[ќ	КNВџB‚љY€
™\]Z\™K›XZ[€OOH[Щ[JHВ€XZ[Љ
NВџB‚›[Щ[K™^ЬќИHВ€\ЬЩ\ќ]\Эќ[X]љ^™\Ьќ€љ[™]\Эќ[X]љ^™\Ьќ€\њЩP\™ЬЛ€•SУPU’VРСSЛ€•SУPU’VФРСSђT’SФЛ€•SУPU’VХ’QUФФ•ТСVTЛџNВ