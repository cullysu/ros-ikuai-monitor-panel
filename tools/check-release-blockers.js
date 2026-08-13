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
const sectionChartSource = source('src/panel-framework/sections/SectionTimeSeriesChart.tsx');
const incidentLensSource = source('src/panel-framework/overview/mobile-overview/incident-lens/IncidentLens.tsx');
const incidentLensModelSource = source('src/panel-framework/overview/mobile-overview/incident-lens/buildIncidentLensModel.ts');
const patrolLensSource = source('src/panel-framework/overview/mobile-overview/incident-lens/PatrolLens.tsx');
const incidentWorkspaceSource = source('src/panel-framework/overview/mobile-overview/incident-lens/IncidentWorkspace.tsx');
const sectionModelSource = source('src/panel-framework/sections/sectionModels.ts');
const resourceHistorySource = source('src/panel-framework/overview/evidence-model/resourceHistorySamples.ts');
const resourceTimeSeriesSource = source('src/panel-framework/sections/resourceTimeSeries.ts');
const connectionSource = source('src/panel-framework/connection/RouterConnectionScreen.tsx');
const apiSchemaSource = source('panel_backend/api_schema.py');
const browserGateSource = source('tools/check-panel-runtime-browser.js');
const browserLifecycleSource = source('tools/check-runtime-browser-lifecycle.js');
const browserLifecycleV2Source = source('tools/acceptance/browser-lifecycle-v2/browser-lifecycle.js');
const incidentLensRuntimeSource = source('tools/check-incident-lens-runtime.js');
const incidentLensRuntimeOwnerSource = source('tools/lib/incident-lens-runtime/runtime.js');
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
  'shared section charts preserve scale, time, units, and accessible summaries',
  !/preserveAspectRatio=["']none["']/.test(sectionChartSource) &&
    sectionChartSource.includes('preserveAspectRatio="xMidYMid meet"') &&
    sectionChartSource.includes('section-timeseries-scale') &&
    sectionChartSource.includes('section-timeseries-axis') &&
    sectionChartSource.includes('series.unit') &&
    sectionChartSource.includes('visualization.accessibleSummary') &&
    sectionChartSource.includes('aria-labelledby'),
  'shared section chart evidence must preserve aspect ratio, retain time/unit labels, and expose summaries'
);
check(
  'Incident Split Lens is the only current mobile overview owner and withdraws non-current data',
  incidentLensSource.includes('data-incident-lens-root') &&
    incidentLensSource.includes('data-incident-lens-evidence-mode') &&
    incidentLensSource.includes('data-incident-lens-forbids-current') &&
    patrolLensSource.includes('data-incident-lens-patrol') &&
    incidentWorkspaceSource.includes('data-incident-lens-impact') &&
    incidentWorkspaceSource.includes('data-incident-lens-evidence') &&
    incidentLensModelSource.includes('buildIncidentLensModel') &&
    /currentNumbersAllowed:\s*evidence\.evidenceMode\s*===\s*"current"/.test(incidentLensModelSource) &&
    !/PocketConsole|pocketConsole|data-pocket|MobileLinkboard|NativeOperationsCanvas/.test([
      incidentLensSource,
      patrolLensSource,
      incidentWorkspaceSource,
      incidentLensModelSource,
    ].join('\n')),
  'Incident Split Lens must expose patrol/impact/evidence current-data boundaries without retaining rejected presentation ownership'
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
    localPredeploySource.includes('launchManagedBrowser') &&
    localPredeploySource.includes('lifecycleBounded') &&
    localPredeploySource.includes('await withTimeout(cdp.closeTarget(), 12_000, targetLabel)') &&
    localPredeploySource.includes("record(report, targetLabel, false") &&
    localPredeploySource.includes("await withTimeout(browser.stop(), 30_000, 'browser stop')") &&
    !localPredeploySource.includes('await context.close().catch(() => {})'),
  'the matrix must use the real Python runtime and one managed browser with bounded per-cell cleanup'
);
check(
  'runtime browser gate uses Playwright with a bounded lifecycle',
  browserGateSource.includes('launchManagedBrowser') &&
     /const testTimeout\s*=\s*Number\.isFinite\(configuredTestTimeout\)[\s\S]*?:\s*480000;/.test(browserGateSource) &&
     /Math\.min\(Math\.max\(configuredTestTimeout,\s*30000\),\s*480000\)/.test(browserGateSource) &&
    browserGateSource.includes('Promise.race([main(), timeout])') &&
    browserGateSource.includes('cleanupRuntime') &&
    browserGateSource.includes('context.close') &&
    browserGateSource.includes('Promise.allSettled') &&
    browserGateSource.includes('browserRuntime.close') &&
    browserLifecycleV2Source.includes("require('playwright-core')") &&
    browserLifecycleV2Source.includes('process-tree.verify') &&
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
  'Incident Split Lens incident priority and short-phone visibility are independently gated',
  incidentLensRuntimeSource.includes('SHORT_PHONE_INCIDENT_SCENES') &&
    incidentWorkspaceSource.includes('data-incident-lens-impact') &&
    incidentWorkspaceSource.includes('data-incident-lens-evidence') &&
    incidentLensRuntimeOwnerSource.includes('expectedScene: "interfaces-down"') &&
    incidentLensRuntimeOwnerSource.includes('expectedScene: "resource-full"') &&
    incidentLensRuntimeOwnerSource.includes('expectedScene: "collection-down"') &&
    incidentLensRuntimeOwnerSource.includes('expectedScene: "all-offline"') &&
    incidentLensRuntimeOwnerSource.includes('expectedScene: "no-snapshot"') &&
    packageJson.scripts['check:mobile-incident-lens'].includes('tools/check-incident-lens-runtime.js'),
  'the current mobile owner must prove incident split semantics and unobscured short-phone investigation'
);
check(
  'the public release aggregate executes the release blocker and its file-reference regression',
  packageJson.scripts['check:release-blockers'] === 'node --max-old-space-size=2048 tools/check-release-blockers.js' &&
    packageJson.scripts['check:release-gates'].includes('npm run check:release-blockers') &&
    packageJson.scripts['check:package-script-file-references'].includes('tools/test-package-script-file-references.js'),
  'the declared release blocker must run in the aggregate, and nested source() dependencies must fail closed before runtime'
);
check(
  'tablet risk focus contract is independently gated',
  tabletRiskFocusSource.includes("tablet-risk-focus-v1") &&
    packageJson.scripts['check:tablet-risk-focus'] === 'node --max-old-space-size=2048 tools/check-tablet-risk-focus.js',
  'the tablet risk-object focus must remain an explicit regression contract'
);
check(
  'runtime browser invokes the current Incident Split Lens aggregate exactly once',
  packageJson.scripts['check:mobile-linkboard'] === undefined &&
    packageJson.scripts['check:mobile-pocket-console'] === undefined &&
    packageJson.scripts['check:mobile-optical-patrol'] === undefined &&
    typeof packageJson.scripts['check:mobile-incident-lens'] === 'string' &&
    packageJson.scripts['check:mobile-incident-lens'].includes('tools/check-incident-lens-contract.js') &&
    packageJson.scripts['check:mobile-incident-lens'].includes('tools/check-incident-lens-model.js') &&
    packageJson.scripts['check:mobile-incident-lens'].includes('tools/check-incident-lens-architecture.js') &&
    packageJson.scripts['check:mobile-incident-lens'].includes('tools/check-incident-lens-accessibility-static.js') &&
    packageJson.scripts['check:mobile-incident-lens'].includes('tools/check-incident-lens-runtime.js') &&
    (packageJson.scripts['check:runtime-browser'].match(/check:mobile-incident-lens/g) || []).length === 1,
  'the current Incident Split Lens aggregate must include static contract, model, architecture, accessibility, and runtime checks exactly once'
);
check(
  'the current Incident Split Lens runtime owns its report namespace and retired mobile runtimes are absent',
  fs.existsSync(path.join(root, 'tools', 'check-incident-lens-runtime.js')) &&
    fs.existsSync(path.join(root, 'tools', 'lib', 'incident-lens-runtime', 'runtime.js')) &&
    source('tools/check-incident-lens-runtime.js').includes('source: "incident-lens-runtime"') &&
    source('tools/lib/incident-lens-runtime/runtime.js').includes('acceptanceDirectory(name = "incident-lens-runtime")') &&
    !fs.existsSync(path.join(root, 'tools', 'check-optical-patrol-runtime.js')) &&
    !fs.existsSync(path.join(root, 'tools', 'lib', 'optical-patrol-runtime', 'runtime.js')) &&
    !fs.existsSync(path.join(root, 'tools', 'check-pocket-console-runtime.js')) &&
    !fs.existsSync(path.join(root, 'tools', 'lib', 'pocket-console-runtime', 'runtime.js')),
  'the release runtime must use only the Incident Split Lens report namespace; rejected runtime owners must not remain executable'
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
