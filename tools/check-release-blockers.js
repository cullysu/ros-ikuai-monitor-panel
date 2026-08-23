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
const ikuaiMobileHomeSource = source('src/panel-framework/mobile-reference-ui/MobileReferenceSurface.tsx');
const ikuaiMobileNavigationSource = ikuaiMobileHomeSource;
const ikuaiMobileRoutesSource = ikuaiMobileHomeSource;
const ikuaiMobileWorkspaceSource = ikuaiMobileHomeSource;
const ikuaiMobileModelSource = source('src/panel-framework/mobile-reference-ui/MobileReferenceSurface.tsx');
const ikuaiMobileArchitectureSource = source('tools/check-mobile-reference-architecture.js');
const ikuaiMobileModelCheckSource = source('tools/check-mobile-reference-model.js');
const ikuaiMobileConnectionSecuritySource = source('tools/check-mobile-reference-connection-security.js');
const ikuaiMobileRuntimeSource = source('tools/check-mobile-reference-runtime.js');
const ikuaiMobileRuntimeLauncherSource = source('tools/run-mobile-reference-runtime.js');
const sectionModelSource = source('src/panel-framework/sections/sectionModels.ts');
const resourceHistorySource = source('src/panel-framework/overview/evidence-model/resourceHistorySamples.ts');
const resourceTimeSeriesSource = source('src/panel-framework/sections/resourceTimeSeries.ts');
const connectionSource = source('src/panel-framework/mobile-reference-ui/MobileReferenceConnection.tsx');
const apiSchemaSource = source('panel_backend/api_schema.py');
const browserGateSource = source('tools/check-panel-runtime-browser.js');
const browserLifecycleSource = source('tools/check-runtime-browser-lifecycle.js');
const browserLifecycleV2Source = source('tools/acceptance/browser-lifecycle-v2/browser-lifecycle.js');
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
const currentReleaseBoundarySource = source('tools/check-current-release-boundary.js');
const exactShaReleaseSource = source('tools/check-exact-sha-release-cl.js');
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
  'Mobile Reference owns the mobile overview and only exposes measured traffic for current complete evidence',
  ikuaiMobileHomeSource.includes('data-mobile-reference-home') &&
    ikuaiMobileHomeSource.includes('data-evidence-mode') &&
    ikuaiMobileHomeSource.includes('data-mobile-reference-scene') &&
    ikuaiMobileHomeSource.includes('buildMobileReferenceModel') &&
    ikuaiMobileModelSource.includes('evidence.evidenceMode === "current" && evidence.traffic?.status === "ready"') &&
    ikuaiMobileModelCheckSource.includes('missing traffic values must remain unavailable') &&
    !/MobilePulse|mobile-pulse|data-mobile-pulse|MobileNext|mobile-next|data-panel-mobile-next|mnx-/.test([
      ikuaiMobileHomeSource,
      ikuaiMobileModelSource,
    ].join('\n')),
  'the Mobile Reference owner must withhold measured traffic unless evidence is current and complete'
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
  'Mobile Reference connection form makes transport security explicit and blocks unconfirmed risk',
  connectionSource.includes('data-mobile-reference-connection="form"') &&
    /name="host"[\s\S]*?name="user"[\s\S]*?name="password"/.test(connectionSource) &&
    connectionSource.includes('scheme === "http" || !verifyTls') &&
    connectionSource.includes('riskConfirmed') &&
    connectionSource.includes('insecureRestConfirmed') &&
    connectionSource.includes('scheme === "https" && verifyTls'),
  'the form must prioritize address, user, and password while keeping ports, TLS state, and explicit insecure-transport confirmation inspectable'
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
    /await withTimeout\(\s*cdp\.closeTarget\(\),\s*configuredBrowserTimeoutMs\(12_000\),\s*targetLabel\s*\)/.test(localPredeploySource) &&
    localPredeploySource.includes("record(report, targetLabel, false") &&
    /await withTimeout\(\s*browser\.stop\(\),\s*configuredBrowserTimeoutMs\(30_000\),\s*'browser stop',?\s*\)/.test(localPredeploySource) &&
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
  'Mobile Reference blocks false-current values and keeps route uncertainty explicit',
  ['single', 'fleet', 'all-offline', 'no-snapshot', 'collection-down', 'resource-full', 'interfaces-down']
    .every((scenario) => ikuaiMobileRuntimeSource.includes(`"${scenario}"`)) &&
    ikuaiMobileHomeSource.includes('data-mobile-reference-home') &&
    ikuaiMobileHomeSource.includes('data-evidence-mode') &&
    ikuaiMobileModelSource.includes('const active = evidence.evidenceMode === "current" ? evidence.routeEvidence.activePath : null') &&
    !/route:\s*[^\n;]*(?:rows|defaultRoutes)\s*\[\s*0\s*\]/.test(ikuaiMobileModelSource) &&
    ikuaiMobileModelSource.includes('evidence.evidenceMode === "current" && evidence.traffic?.status === "ready"'),
  'the seven-scene runtime must reject stale/absent measurements and report an unverified route instead of selecting an arbitrary row'
);
check(
  'the public release aggregate executes the release blocker and its file-reference regression',
  packageJson.scripts['check:release-blockers'] === 'node --max-old-space-size=2048 tools/check-release-blockers.js' &&
    packageJson.scripts['check:release-gates'].includes('npm run check:release-blockers') &&
    packageJson.scripts['check:package-script-file-references'].includes('tools/test-package-script-file-references.js'),
  'the declared release blocker must run in the aggregate, and nested source() dependencies must fail closed before runtime'
);
check(
  'Mobile Reference keeps four stable roots, More, object workspaces, and WAN detail continuity',
  ikuaiMobileNavigationSource.includes('data-mobile-reference-navigation') &&
    ['概览', '网络', '设备', '日志'].every((label) => ikuaiMobileNavigationSource.includes(`label: "${label}"`)) &&
    ikuaiMobileRoutesSource.includes('data-mobile-reference-directory') &&
    ikuaiMobileRoutesSource.includes('data-mobile-reference-workspace') &&
    ikuaiMobileHomeSource.includes('data-mobile-reference-wan-detail') &&
    ikuaiMobileHomeSource.includes('查看 WAN 详情'),
  'the Mobile Reference owner must keep four stable navigation roots, More, object workspaces, and evidence-backed WAN detail actionable'
);
check(
  'runtime browser invokes the Mobile Reference smoke aggregate exactly once and retains a full 7x8 matrix command',
  packageJson.scripts['check:mobile-incident-lens'] === undefined &&
    packageJson.scripts['check:mobile-linkboard'] === undefined &&
  packageJson.scripts['check:mobile-pocket-console'] === undefined &&
  packageJson.scripts['check:mobile-optical-patrol'] === undefined &&
    typeof packageJson.scripts['check:mobile-telemetry-model'] === 'string' &&
    packageJson.scripts['check:mobile-telemetry-model'].includes('tools/check-mobile-reference-model.js') &&
    packageJson.scripts['check:mobile-telemetry-model'].includes('tools/check-mobile-reference-architecture.js') &&
    packageJson.scripts['check:mobile-telemetry-model'].includes('tools/check-mobile-reference-connection-security.js') &&
    typeof packageJson.scripts['check:mobile-telemetry'] === 'string' &&
    packageJson.scripts['check:mobile-telemetry'].includes('npm run check:mobile-telemetry-model') &&
    packageJson.scripts['check:mobile-telemetry'].includes('tools/run-mobile-reference-runtime.js --smoke') &&
    typeof packageJson.scripts['check:mobile-telemetry:full'] === 'string' &&
    packageJson.scripts['check:mobile-telemetry:full'].includes('npm run check:mobile-telemetry-model') &&
    packageJson.scripts['check:mobile-telemetry:full'].includes('tools/run-mobile-reference-runtime.js') &&
    ikuaiMobileRuntimeLauncherSource.includes('run-mobile-reference-runtime-low-load.cmd') &&
    ikuaiMobileRuntimeLauncherSource.includes('process.env.CI !== "true"') &&
    packageJson.scripts['check:runtime-browser'].includes('npm run check:mobile-telemetry'),
  'runtime browser must use iKuai 4 once for smoke and retain a separate required full-matrix command'
);
check(
  'Mobile Reference full runtime report is identity-bound, includes deep workflows, and is fail-closed',
  ikuaiMobileRuntimeSource.includes('const smoke = process.argv.includes("--smoke")') &&
    ikuaiMobileRuntimeSource.includes('requiredTargets') &&
  ['single', 'fleet', 'all-offline', 'no-snapshot', 'collection-down', 'resource-full', 'interfaces-down']
      .every((scenario) => ikuaiMobileRuntimeSource.includes(`"${scenario}"`)) &&
    ikuaiMobileRuntimeSource.includes('contract: "mobile-reference-runtime-v1"') &&
    ikuaiMobileRuntimeSource.includes('source: "mobile-reference-runtime"') &&
    ikuaiMobileRuntimeSource.includes('Object.values(workflows).every') &&
    ikuaiMobileRuntimeSource.includes('wanDetailHistory') &&
    ikuaiMobileRuntimeSource.includes('moreDirectory') &&
    ikuaiMobileRuntimeSource.includes('connectionAddressValidation') &&
    ikuaiMobileRuntimeSource.includes('const fullCellSet = cells.length === requiredKeys.size') &&
    ikuaiMobileRuntimeSource.includes('const complete = !smoke && fullCellSet') &&
    ikuaiMobileRuntimeSource.includes('gitWorktreeIdentity(root)') &&
    ikuaiMobileRuntimeSource.includes('releaseEvidenceEligible: false') &&
    /path\.join\(output,\s*smoke\s*\?\s*["']report-smoke\.json["']\s*:\s*["']report\.json["']/.test(ikuaiMobileRuntimeSource) &&
    ikuaiMobileArchitectureSource.includes('MobileReferenceSurface.tsx') &&
    ikuaiMobileConnectionSecuritySource.includes('mobile-reference-connection-security-v1'),
  'the required full mobile matrix must identify its exact worktree and remain release-ineligible until an authority-backed clean-SHA release exists'
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
  'current-state authority, exact-SHA CL verification, and the current release boundary keep publication fail-closed',
  packageJson.scripts['check:decision-system'].includes('tools/check-current-state-authority.js') &&
    packageJson.scripts['check:decision-system'].includes('tools/check-current-release-boundary.js') &&
    packageJson.scripts['check:release-gates'].includes('npm run test:exact-sha-release') &&
    ciWorkflowSource.includes('npm run check:decision-system') &&
    localCiPsSource.includes('check-current-state-authority.js') &&
    localCiShSource.includes('check-current-state-authority.js') &&
    localCiPsSource.includes('check-current-release-boundary.js') &&
    localCiShSource.includes('check-current-release-boundary.js') &&
    source('tools/check-decision-truth-integration.js').includes('current release boundary') &&
    currentReleaseBoundarySource.includes('current-release-boundary-v1') &&
    currentReleaseBoundarySource.includes('current product release fail-closed') &&
    exactShaReleaseSource.includes("for (const jobName of ['Linux validation', 'Windows packaging'])") &&
    exactShaReleaseSource.includes("const REQUIRED_CONTAINER_IMAGE_EVIDENCE = 'ghcr-image-evidence'"),
  'publication must stay closed until the authoritative current-state boundary and exact-SHA Linux, Windows, and GHCR evidence all exist'
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
