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
const resourceHistorySource = source('src/panel-framework/overview/evidence-model/resourceHistorySamples.ts');
const resourceTimeSeriesSource = source('src/panel-framework/sections/resourceTimeSeries.ts');
const connectionSource = source('src/panel-framework/connection/RouterConnectionScreen.tsx');
const apiSchemaSource = source('panel_backend/api_schema.py');
const browserGateSource = source('tools/check-panel-runtime-browser.js');
const browserLifecycleSource = source('tools/check-runtime-browser-lifecycle.js');
const mobileIncidentVisualWeightSource = source('tools/check-mobile-incident-visual-weight.js');
const tabletRiskFocusSource = source('tools/check-tablet-risk-focus.js');
const desktopBrowserGateSource = source('tools/check-resource-trend-balance.js');
const desktopRuntimeWrapperSource = [
  source('tools/check-desktop-v1030-runtime.js'),
  source('tools/check-desktop-no-snapshot-runtime.js'),
  source('tools/check-desktop-incident-hierarchy-runtime.js'),
].join('\n');
const ciWorkflowSource = source('.github/workflows/ci.yml');
const packagingPreflightSource = source('tools/check-packaging-preflight.ps1');
const localPredeploySource = source('tools/local-predeploy-check.js');
const localCiPsSource = source('tools/ci-local.ps1');
const localCiShSource = source('tools/ci-local.sh');
const quarantineSource = source('tools/check-acceptance-report-quarantine.js');
const artifactIdentitySource = source('tools/check-acceptance-artifact-identity.js');
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
   ciWorkflowSource.includes("if ($indexText -notmatch '<div\\s+id=\"app\"(?:\\s|>)')") &&
    ciWorkflowSource.includes('Bundled frontend still contains retired legacy shell markers.') &&
    packagingPreflightSource.includes('$reactShell = (') &&
    packagingPreflightSource.includes("$indexText -notmatch 'data-app-shell=\"ikuai\"'"),
  'Windows CL and local packaging preflight must validate the neutral <div id="app"> mount and reject legacy shell markers'
);
check(
  'Linux CL executes the current release blockers, deterministic build, and all desktop contracts',
  ciWorkflowSource.includes('python tools/check-backend-release-blockers.py') &&
    ciWorkflowSource.includes('node tools/check-release-blockers.js') &&
    ciWorkflowSource.includes('npm run build') &&
    ciWorkflowSource.includes('git diff --exit-code -- public/index.html public/assets/framework') &&
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
  resourceHistorySource.includes('const timestamp = parseRfc3339Timestamp(observedAt);') &&
    resourceHistorySource.includes('export function resourceHistoryPoints') &&
    resourceTimeSeriesSource.includes('metric.points.length >= 2') &&
    /visualization:\s*resourceTimeSeries\(\{\s*metrics:\s*resourceMetrics\s*\}\)/.test(sectionModelSource),
  'resource points must be timestamp-parsed by the evidence owner and the current time-series owner must require at least two aligned points'
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
    localPredeploySource.includes("await withTimeout(browser.stop(), 30000, 'browser stop')"),
  'the matrix must use the real Python runtime and reuse one Playwright browser with per-cell context cleanup'
);
check(
  'runtime browser gate uses Playwright with a bounded lifecycle',
  browserGateSource.includes("require('playwright-core')") &&
     /const testTimeout\s*=\s*Number\.isFinite\(configuredTestTimeout\)[\s\S]*?:\s*480000;/.test(browserGateSource) &&
     /Math\.min\(Math\.max\(configuredTestTimeout,\s*30000\),\s*480000\)/.test(browserGateSource) &&
    browserGateSource.includes('Promise.race([main(), timeout])') &&
    browserGateSource.includes('cleanupRuntime') &&
    browserGateSource.includes('context.close') &&
    browserGateSource.includes('browser.close') &&
    !browserGateSource.includes('new WebSocket') &&
    !browserGateSource.includes('remote-debugging-port'),
  'runtime validation must use one bounded Playwright lifecycle with explicit cleanup'
);
check(
  'runtime browser lifecycle contract is independently gated',
  browserLifecycleSource.includes("runtime-browser-lifecycle-v1") &&
    browserLifecycleSource.includes('process\\.exit') &&
    packageJson.scripts['check:runtime-browser-lifecycle'] === 'node --max-old-space-size=2048 tools/check-runtime-browser-lifecycle.js',
  'the runtime gate must verify process completion separately from report contents'
);
check(
  'mobile incident visual weight contract is independently gated',
  mobileIncidentVisualWeightSource.includes("mobile-incident-visual-weight-v1") &&
    packageJson.scripts['check:mobile-incident-visual-weight'] === 'node --max-old-space-size=2048 tools/check-mobile-incident-visual-weight.js',
  'the mobile incident scan hierarchy must remain an explicit regression contract'
);
check(
  'tablet risk focus contract is independently gated',
  tabletRiskFocusSource.includes("tablet-risk-focus-v1") &&
    packageJson.scripts['check:tablet-risk-focus'] === 'node --max-old-space-size=2048 tools/check-tablet-risk-focus.js',
  'the tablet risk-object focus must remain an explicit regression contract'
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
check(
  'historical false-green acceptance reports are quarantined before release evidence',
  fs.existsSync(path.join(root, 'tools', 'acceptance', 'report-quarantine-policy.json')) &&
    quarantineSource.includes("acceptance-report-quarantine-v1") &&
    quarantineSource.includes('allowAsCurrentReleaseInput') &&
    packageJson.scripts['check:report-truth'].includes('check-acceptance-report-quarantine.js') &&
    ciWorkflowSource.includes('node tools/check-acceptance-report-quarantine.js'),
  'historical root-pass/child-fail reports must be explicitly classified and never consumed as current release evidence'
);
check(
  'ambiguous acceptance artifact identities are forbidden as current release evidence',
  artifactIdentitySource.includes('acceptance-artifact-identity-v1') &&
    artifactIdentitySource.includes('allowAsCurrentReleaseInput') &&
    packageJson.scripts['check:report-truth'].includes('check-acceptance-artifact-identity.js') &&
    ciWorkflowSource.includes('node tools/check-acceptance-artifact-identity.js') &&
    localCiPsSource.includes('check-acceptance-artifact-identity.js') &&
    localCiShSource.includes('check-acceptance-artifact-identity.js'),
  'reports with current/worktree/working-tree directory labels require explicit historical/worktree identity and must never become current release input'
);
check(
  'current-state authority and current release boundary are wired into every release validation path; current product release remains fail-closed',
  packageJson.scripts['check:decision-system'].includes('tools/check-current-state-authority.js') &&
    packageJson.scripts['check:decision-system'].includes('tools/check-current-release-boundary.js') &&
    ciWorkflowSource.includes('npm run check:decision-system') &&
    localCiPsSource.includes('check-current-state-authority.js') &&
    localCiShSource.includes('check-current-state-authority.js') &&
    localCiPsSource.includes('check-current-release-boundary.js') &&
    localCiShSource.includes('check-current-release-boundary.js') &&
    source('tools/check-decision-truth-integration.js').includes('current release boundary'),
  'current-state authority and current release boundary must be executed by package/CI and remain fail-closed'
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
