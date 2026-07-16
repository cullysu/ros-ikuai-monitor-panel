#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const failures = [];

function source(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function check(name, condition, detail) {
  if (!condition) failures.push({ name, detail });
}

const runtimeSource = source('src/panel-framework/runtime/usePanelRuntime.ts');
const chromeSource = source('src/panel-framework/runtime/PanelRuntimeChrome.tsx');
const indexSource = source('public/index.html');
const chartSource = source('src/panel-framework/mobile/MobilePatrolTraffic.tsx');
const sectionChartSource = source('src/panel-framework/sections/SectionTimeSeriesChart.tsx');
const sectionModelSource = source('src/panel-framework/sections/sectionModels.ts');
const connectionSource = source('src/panel-framework/connection/RouterConnectionScreen.tsx');
const apiSchemaSource = source('panel_backend/api_schema.py');
const browserGateSource = source('tools/check-panel-runtime-browser.js');
const desktopBrowserGateSource = source('tools/check-resource-trend-balance.js');
const desktopRuntimeWrapperSource = [
  source('tools/check-desktop-v1030-runtime.js'),
  source('tools/check-desktop-no-snapshot-runtime.js'),
  source('tools/check-desktop-incident-hierarchy-runtime.js'),
].join('\n');
const ciWorkflowSource = source('.github/workflows/ci.yml');
const packagingPreflightSource = source('tools/check-packaging-preflight.ps1');
const localPredeploySource = source('tools/local-predeploy-check.js');
const packageJson = JSON.parse(source('package.json'));

check(
  'same-origin snapshot requests are not short-circuited by navigator.onLine',
  !/if\s*\([^)]*navigator\.onLine[^)]*\)\s*\{[\s\S]{0,220}?return;/.test(runtimeSource),
  'usePanelRuntime must attempt /api/snapshot even when the browser reports upstream offline'
);
check(
  'manual refresh remains available under an offline browser hint',
  !/disabled=\{[^}]*!runtime\.online/.test(chromeSource),
  'Refresh can be disabled for in-flight work, never for navigator.onLine'
);
check(
  'the public HTML has one React shell and no legacy behavior script',
  !indexSource.includes('/assets/legacy/panel-legacy.js') &&
    !indexSource.includes('/assets/legacy/panel-legacy.css') &&
    !indexSource.includes('data-quick-search-open') &&
    !indexSource.includes('data-readonly-info-open'),
  'dead search/read-only controls and the legacy shell must be removed'
);
check(
  'Windows packaging validates the current React root instead of the retired shell',
  ciWorkflowSource.includes("if ($indexText -notmatch '<main\\s+id=\"app\"(?:\\s|>)')") &&
    ciWorkflowSource.includes('Bundled frontend still contains retired legacy shell markers.') &&
    packagingPreflightSource.includes('$reactShell = (') &&
    packagingPreflightSource.includes("$indexText -notmatch 'data-app-shell=\"ikuai\"'"),
  'Windows CL and local packaging preflight must validate <main id="app"> and reject legacy shell markers'
);
check(
  'Linux CL executes the current release blockers, deterministic build, and all desktop contracts',
  ciWorkflowSource.includes('python tools/check-backend-release-blockers.py') &&
    ciWorkflowSource.includes('node tools/check-release-blockers.js') &&
    ciWorkflowSource.includes('npm run build') &&
    ciWorkflowSource.includes('git diff --exit-code -- public/assets/framework/panel-framework.js public/assets/framework/style.css') &&
    ciWorkflowSource.includes('npm run check:desktop-v1030') &&
    ciWorkflowSource.includes('npm run check:desktop-no-snapshot') &&
    ciWorkflowSource.includes('npm run check:desktop-incident-hierarchy'),
  'Linux CL must execute the same production time, artifact, and desktop browser contracts used locally'
);
check(
  'every visible DNS destination resolves to a real route',
  !/href=["']#dns["']/.test(indexSource),
  '#dns is not a registered route; use dns4/dns6 through the React router'
);
check(
  'mobile and section SVGs preserve their time axes and expose scale labels',
  !/preserveAspectRatio=["']none["']/.test(chartSource + sectionChartSource) &&
    chartSource.includes('mp-chart-scale') &&
    chartSource.includes('mp-chart-time') &&
    sectionChartSource.includes('section-timeseries-scale') &&
    sectionChartSource.includes('section-timeseries-axis'),
  'time-series charts must preserve their viewBox and expose time/unit scales'
);
check(
  'resource visualization requires timestamped samples',
  /const timestamps = Array\.isArray\(history\.timestamps\)/.test(sectionModelSource) &&
    /if \(timestamps\.length < 2\) return undefined;/.test(sectionModelSource),
  'resource values without at least two timestamps must not be joined into a trend'
);
check(
  'password-free profile naming has no rememberPassword compatibility alias',
  !apiSchemaSource.includes('rememberPassword'),
  'the API may remember connection metadata, never a field named as saved password state'
);
check(
  'connection form keeps transport details behind real progressive disclosure',
  /name="host"[\s\S]*?name="user"[\s\S]*?name="password"[\s\S]*?<details[^>]*data-router-advanced-settings[\s\S]*?name="sshPort"[\s\S]*?name="restPort"[\s\S]*?<\/details>/.test(connectionSource) &&
    browserGateSource.includes('advanced connection settings are disclosed on demand'),
  'the default form must prioritize address, user, and password while keeping ports and transport security inspectable on demand'
);
check(
  'local browser matrix has deterministic Python and one bounded browser lifecycle',
  localPredeploySource.includes('CODEX_PYTHON_PATH') &&
    localPredeploySource.includes('codex-primary-runtime') &&
    localPredeploySource.includes("path.join(ROOT, '_acceptance', 'python-deps')") &&
    (localPredeploySource.match(/await launchBrowser\(args, report\)/g) || []).length === 1 &&
    /async function runBrowserChecks[\s\S]*?const browser = await launchBrowser\(args, report\);[\s\S]*?try\s*\{[\s\S]*?for \(const profile/.test(localPredeploySource) &&
    localPredeploySource.includes('await context.close().catch(() => {})') &&
    localPredeploySource.includes("await withTimeout(browser.stop(), 8000, 'browser stop')"),
  'the matrix must use the real Python runtime and reuse one Playwright browser with per-cell context cleanup'
);
check(
  'runtime browser gate uses Playwright with a bounded lifecycle',
  browserGateSource.includes("require('playwright-core')") &&
    /const testTimeout\s*=\s*120000;/.test(browserGateSource) &&
    browserGateSource.includes('Promise.race([main(), timeout])') &&
    browserGateSource.includes('cleanupRuntime') &&
    browserGateSource.includes('context.close') &&
    browserGateSource.includes('browser.close') &&
    !browserGateSource.includes('new WebSocket') &&
    !browserGateSource.includes('remote-debugging-port'),
  'runtime validation must use one bounded Playwright lifecycle with explicit cleanup'
);
check(
  'focused desktop browser gates use one bounded Playwright lifecycle',
  desktopBrowserGateSource.includes("require('playwright-core')") &&
    desktopBrowserGateSource.includes('Promise.race([main(), timeout])') &&
    desktopBrowserGateSource.includes('cleanupRuntime') &&
    desktopBrowserGateSource.includes('context.close') &&
    desktopBrowserGateSource.includes('browser.close') &&
    !desktopBrowserGateSource.includes('new WebSocket') &&
    !desktopBrowserGateSource.includes('remote-debugging-port'),
  'focused desktop checks must use Playwright, bounded timeout cleanup, and no manual CDP transport'
);
check(
  'focused desktop wrappers never retry away a browser failure',
  !/\bretry\b/i.test(desktopRuntimeWrapperSource) &&
    !/attempt\s*(?:<=|<)/.test(desktopRuntimeWrapperSource),
  'each desktop runtime contract must run once and surface the original failure'
);
check(
  'package has a public release version',
  typeof packageJson.version === 'string' && packageJson.version !== '0.0.0',
  '0.0.0 is not a releasable product version'
);
check(
  'public install metadata exists',
  fs.existsSync(path.join(root, 'public', 'manifest.webmanifest')) &&
    fs.existsSync(path.join(root, 'public', 'apple-touch-icon.png')),
  'manifest and Apple touch icon are required'
);

const schemaPath = path.join(root, 'src', 'panel-framework', 'runtime', 'panelRuntimeSchema.ts');
const timeContractPath = path.join(root, 'src', 'panel-framework', 'timeContract.ts');
const compiledTimeContract = ts.transpileModule(source('src/panel-framework/timeContract.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, strict: true },
  fileName: timeContractPath,
});
const timeContractModule = { exports: {} };
new Function('exports', 'module', 'require', compiledTimeContract.outputText)(
  timeContractModule.exports,
  timeContractModule,
  require
);
const compiled = ts.transpileModule(source('src/panel-framework/runtime/panelRuntimeSchema.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, strict: true },
  fileName: schemaPath,
});
const moduleBox = { exports: {} };
const schemaRequire = (request) => request === '../timeContract' ? timeContractModule.exports : require(request);
new Function('exports', 'module', 'require', compiled.outputText)(moduleBox.exports, moduleBox, schemaRequire);
const schema = moduleBox.exports;
const naiveTimestamp = schema.validatePanelSnapshot({
  status: 'ok',
  updatedAt: '2026-07-16 16:18:23',
  meta: { pollSeconds: 5, realtimeUpdatedAt: '2026-07-16 16:18:23' },
  overview: { identity: 'lab-router', cpuLoad: 2 },
  interfaces: [],
  wan: [],
});
check(
  'offset-free API timestamps are rejected',
  naiveTimestamp.ok === false,
  'Date.parse accepts local-looking strings; the protocol must require RFC3339 Z or offset'
);

if (failures.length) {
  for (const failure of failures) {
    console.error('[release-blocker] FAIL ' + failure.name + ': ' + failure.detail);
  }
  process.exitCode = 1;
} else {
  console.log('[release-blocker] PASS P0 runtime/time/shell and public packaging contracts');
}
