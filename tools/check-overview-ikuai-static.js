'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function fail(label, detail) {
  failures.push(`${label}: ${detail}`);
}

function includesAll(text, tokens, label) {
  for (const token of tokens) {
    if (!text.includes(token)) fail(label, `missing ${JSON.stringify(token)}`);
  }
}

function excludesAll(text, tokens, label) {
  for (const token of tokens) {
    if (text.includes(token)) fail(label, `forbidden ${JSON.stringify(token)}`);
  }
}

function ordered(text, tokens, label) {
  let cursor = -1;
  for (const token of tokens) {
    const next = text.indexOf(token, cursor + 1);
    if (next < 0) {
      fail(label, `missing ${JSON.stringify(token)}`);
      return;
    }
    if (next <= cursor) {
      fail(label, `${JSON.stringify(token)} is out of order`);
      return;
    }
    cursor = next;
  }
}

function lineCount(text) {
  return text.split(/\r?\n/).length;
}

const overview = read('src/panel-framework/overview/OverviewPanel.tsx');
const desktop = read('src/panel-framework/overview/components/DesktopConsole.tsx');
const desktopDecision = read('src/panel-framework/overview/components/DesktopDecisionRail.tsx');
const desktopModule = read('src/panel-framework/overview/components/DesktopModule.tsx');
const wanOfflineFocus = read('src/panel-framework/overview/components/WanOfflineFocus.tsx');
const desktopScenes = read('src/panel-framework/overview/desktopOverviewScenes.tsx');
const desktopDefaultScene = read('src/panel-framework/overview/desktopOverviewDefaultScene.tsx');
const desktopAllOfflineScene = read('src/panel-framework/overview/desktopOverviewAllOfflineScene.tsx');
const desktopHierarchyStyles = read('src/panel-framework/overview/styles/desktop/hierarchy-layout.css');
const desktopWorkspaceStyles = read('src/panel-framework/overview/styles/desktop/workspace-layout.css');
const mobile = read('src/panel-framework/overview/components/MobileOverviewHome.tsx');
const mobileDecision = read('src/panel-framework/overview/components/MobileOverviewDecision.tsx');
const mobileSections = read('src/panel-framework/overview/components/MobileOverviewHomeSections.tsx');
const mobileTabs = read('src/panel-framework/overview/components/BottomTabs.tsx');
const mobileStyles = read('src/panel-framework/overview/styles/mobile/mobile-product.css');
const mobileModel = read('src/panel-framework/overview/mobileOverviewModel.ts');
const mobileChartModel = read('src/panel-framework/overview/mobileOverviewChartModel.ts');
const mobilePolicy = read('src/panel-framework/overview/mobileOverviewPolicy.ts');
const landscapeStyles = read('src/panel-framework/overview/styles/mobile/landscape.css');
const navigationStyles = read('src/panel-framework/overview/styles/mobile/navigation.css');
const incidentStyles = read('src/panel-framework/overview/styles/mobile/incident.css');
const telemetryStyles = read('src/panel-framework/overview/styles/mobile/telemetry.css');
const productShellStyles = read('src/panel-framework/overview/styles/mobile/product-shell.css');
const mobileDecisionStyles = read('src/panel-framework/overview/styles/mobile/decision.css');
const mobileFrameStyles = read('src/panel-framework/overview/styles/mobile/frame.css');
const mobileCoreStyles = read('src/panel-framework/overview/styles/mobile/core.css');
const mobileSurfaceStyles = read('src/panel-framework/overview/styles/mobile/surface.css');
const predeploy = read('tools/local-predeploy-check.js');
const mobileRuntime = read('tools/check-mobile-app-home-runtime.js');

includesAll(overview, [
  '<StatusVerdict snapshot={snapshot} state={state} />',
  '<MobileOverviewHome key={state.scenario} snapshot={snapshot} state={state} />',
  '<DesktopWorkspace snapshot={snapshot} state={state} />',
  'data-overview-business-display-boundary',
  'data-overview-scene-key',
], 'overview composition');
excludesAll(overview, ['switch (state.scenario)', '<table', 'dangerouslySetInnerHTML'], 'overview shell ownership');
excludesAll(overview, [
  'data-overview-chart-standard',
  'data-overview-chart-metadata-coverage',
  'data-overview-mature-visual-standard',
  'data-overview-scene-chart-priority',
  'data-overview-scene-chart-contract',
  'data-overview-chart-color-normal',
  'data-overview-mobile-first-microchart-policy',
  'data-overview-mobile-first-screen-microchart-required',
  'data-overview-mobile-first-microchart-kind',
], 'overview self-certifying probe cleanup');

includesAll(desktop, [
  'buildDesktopOverviewScene(snapshot, state)',
  '<DesktopDecisionRail snapshot={snapshot} state={state} />',
  'sections.main',
  'sections.side',
  'sections.bottom',
], 'desktop workspace composition');
excludesAll(desktop, [
  'data-overview-desktop-layout=',
  'data-overview-desktop-skeleton=',
  'data-overview-desktop-left-rail=',
  'data-overview-desktop-right-rail=',
  'data-overview-desktop-bottom-rail=',
  'data-overview-normal-traffic-under-chart=',
  'data-overview-interface-relation-policy=',
], 'desktop synthetic contract cleanup');
const desktopContractCount = (desktop.match(/\bdata-overview-[\w-]+/g) || []).length;
if (desktopContractCount > 24) fail('desktop contract budget', `expected <=24 attributes, found ${desktopContractCount}`);

includesAll(desktopDecision, [
  'case "all-offline"',
  'case "no-snapshot"',
  'case "collection-down"',
  'case "resource-full"',
  'case "interfaces-down"',
  'data-overview-desktop-kpi-row="next-action-credibility"',
  'data-overview-desktop-decision-rail="action-and-credibility"',
  'role: "next-step"',
  'role: "credibility"',
  'data-overview-desktop-decision-role={item.role}',
  'is-${item.role}',
  'label: "下一步"',
  'label: "可信度"',
  '只读判断，不写入 RouterOS',
], 'desktop action rail');
excludesAll(desktopDecision, [
  'label: "结论"',
  'label: "影响"',
  'four-user-decisions',
  'primary-conclusion',
], 'desktop decision deduplication');

includesAll(desktopScenes, [
  'case "all-offline"',
  'case "no-snapshot"',
  'case "collection-down"',
  'case "resource-full"',
  'case "interfaces-down"',
  'return buildDefaultDesktopScene(snapshot, state);',
], 'desktop scenario dispatcher ownership');
includesAll(desktopDefaultScene, ['state.scenario === "fleet"', 'const sideRowLimit = isFleet ? 4 : 3;', 'collapsed={isFleet}', 'isFleet ? 4 : 6', 'isFleet ? null : terminalRanking', 'isFleet ? terminalRanking : null'], 'desktop normal/fleet scene ownership');
includesAll(desktopAllOfflineScene, ['Math.max(state.facts.wan.total, offlineRows.length)', '<WanOfflineFocus', 'collapsed />'], 'desktop adaptive WAN incident hierarchy');
excludesAll(desktopAllOfflineScene, ['subtitle="0/8', 'compactRows(wanContinuityRows(state), 8)'], 'desktop WAN fixture cleanup');
includesAll(wanOfflineFocus, ['rows.slice(0, 4)', '其余 {hiddenCount} 条线路在详情中', '不展示 0 B/s'], 'desktop WAN incident focus');
if ((desktopDefaultScene.match(/\bcollapsed=\{isFleet\}/g) || []).length < 3) fail('desktop normal hierarchy', 'expected three fleet-only collapsed secondary summaries');
includesAll(desktopWorkspaceStyles, ['.ro-desktop-grid.is-normal-scene', 'align-items: start', 'align-self: start', 'grid-template-rows: 25px auto', 'height: auto', '.ro-desktop-grid[data-overview-desktop-scene="single"] > .ro-col.is-bottom > .ro-module:only-child', '--ro-col-height: auto', '--ro-col-grid-auto-rows: auto', '--ro-col-module-height: auto'], 'desktop normal content-sized workspace');
includesAll(desktopModule, ['collapsed ? "ro-secondary-evidence-disclosure ro-compact-summary-disclosure"', 'ro-compact-summary-disclosure', '查看详情'], 'desktop compact disclosure');
const desktopModuleContractCount = (desktopModule.match(/\bdata-(?:overview|routeros)-[\w-]+/g) || []).length;
if (desktopModuleContractCount > 20) fail('desktop module contract budget', `expected <=20 attributes, found ${desktopModuleContractCount}`);
excludesAll(desktopModule, [
  'data-overview-resource-danger-bars-confidence-standard',
  'data-overview-no-snapshot-ledger-parent-judgement',
  'data-overview-top5-row-visual-contract',
  'data-overview-filler-rows',
], 'desktop retired probe cleanup');
includesAll(desktopHierarchyStyles, ['data-overview-desktop-scene="single"', 'data-overview-desktop-scene="fleet"', 'ro-compact-summary-disclosure'], 'desktop focused hierarchy styles');

ordered(mobile, [
  '<DeviceBar model={model} />',
  '<PrimaryDecision model={model} onSelectTab={setActiveTab} />',
  '<CoreFacts model={model} />',
  '<SupportingList model={model} onSelectTab={setActiveTab} />',
  '<BottomTabs activeId={activeTab} onSelect={setActiveTab} />',
], 'mobile home information order');
includesAll(mobile, [
  'ik-mobile-public-home',
  'ik-mobile-decision-screen',
  'activeTab === "home"',
  '<MobileOverviewTabView',
], 'mobile app shell');
const mobileContractCount = new Set(mobile.match(/\bdata-overview-[\w-]+/g) || []).size;
if (mobileContractCount > 28) fail('mobile home contract budget', `expected <=28 attributes, found ${mobileContractCount}`);
const mobileDecisionContractCount = new Set(mobileDecision.match(/\bdata-overview-[\w-]+/g) || []).size;
if (mobileDecisionContractCount > 42) fail('mobile decision contract budget', `expected <=42 attributes, found ${mobileDecisionContractCount}`);
const mobileSectionsContractCount = new Set(mobileSections.match(/\bdata-overview-[\w-]+/g) || []).size;
if (mobileSectionsContractCount > 38) fail('mobile sections contract budget', `expected <=38 attributes, found ${mobileSectionsContractCount}`);
excludesAll(mobile, [
  'data-overview-mobile-home-version',
  'data-overview-mobile-no-kpi-card-grid',
  'data-overview-mobile-no-red-orange',
  'data-overview-mobile-no-table-visual',
  'data-overview-mobile-no-red-orange-blocks',
  'data-overview-mobile-layout-contract',
  'data-overview-mobile-first-question',
  'data-overview-mobile-no-snapshot-no-rate-placeholder',
  'data-overview-mobile-app-question',
  'data-overview-mobile-app-trust-boundary',
  'data-overview-mobile-app-ranking-policy',
  'data-overview-mobile-app-abnormal-ia',
  'data-overview-mobile-app-terminal-ranking-state',
], 'mobile home retired probe cleanup');
excludesAll(mobileDecision, [
  'data-overview-mobile-decision-card',
  'data-overview-mobile-next-step',
], 'mobile decision retired probe cleanup');
excludesAll(mobileSections, [
  'data-overview-mobile-evidence-policy',
  'data-overview-mobile-supporting-list',
  'data-overview-mobile-detail-count',
], 'mobile sections retired probe cleanup');
includesAll(mobileModel, ['网络可用', '外网不可用', '业务数据不可判', '采集不完整', '资源过载', '接口异常'], 'mobile factual verdict copy');
includesAll(mobileDecision, ['chart.source === "history" ? "WAN 趋势" : "WAN 当前速率"', 'data-overview-mobile-chart-source={chart.source}', 'ik-mobile-current-rate-snapshot', '无历史序列'], 'mobile chart source disclosure');
includesAll(mobileDecision, ['data-overview-mobile-information-order', 'verdict-telemetry-evidence', 'verdict-resource-evidence-telemetry'], 'mobile abnormal data-first ordering');
includesAll(mobileChartModel, ['source: "current"', 'down: [Math.max(0, rate.down)]', 'up: [Math.max(0, rate.up)]', '"无历史序列"'], 'mobile current snapshot truthfulness');
excludesAll(mobileChartModel, ['function trend(', 'const pattern = {'], 'mobile synthetic trend prohibition');
includesAll(mobileSections, ['export function DeviceBar', 'export function CoreFacts', 'export function SupportingList', 'ik-mobile-supporting-head'], 'mobile semantic sections');

for (const tab of ['home', 'network', 'diagnose']) {
  if (!mobileTabs.includes(`id: "${tab}"`)) fail('mobile navigation semantics', `missing ${tab}`);
}
includesAll(mobileTabs, [
  'aria-current',
  'aria-controls',
  '路由器监控底部导航',
  'fill="none"',
  'stroke="currentColor"',
  'strokeLinecap="round"',
], 'mobile navigation accessibility');

includesAll(mobileStyles, [
  '@import "./core.css";',
  '@import "./product-shell.css";',
  '@import "./frame.css";',
  '@import "./decision.css";',
  '@import "./surface.css";',
  '@import "./incident.css";',
  '@import "./telemetry.css";',
  '@import "./navigation.css";',
  '@import "./landscape.css";',
], 'mobile style composition');
excludesAll(mobileStyles, [
  'foundation',
  'public-decision-home',
  'repair',
], 'mobile retired style layer cleanup');
includesAll(landscapeStyles, ['min-width: 761px', 'max-width: 900px', 'max-height: 520px', '"hero side"'], 'landscape mobile layout');
includesAll(navigationStyles, ['position: fixed', 'repeat(3, minmax(0, 1fr))', 'height: 58px', 'rgba(241, 247, 251, .82)', 'backdrop-filter: blur(20px)'], 'mobile native navigation positioning');
includesAll(incidentStyles, ['ik-mobile-incident-summary', 'ik-mobile-incident-guidance', 'min-height: 95px', 'min-height: 45px'], 'mobile incident hierarchy');
includesAll(telemetryStyles, ['ik-mobile-incident-telemetry', 'grid-template-columns: repeat(4, minmax(0, 1fr))', 'grid-template-rows: 64px', 'min-height: 64px'], 'mobile incident telemetry');
includesAll(productShellStyles, ['ro-desktop-grid', 'ro-mobile-first-screen', '100dvh', 'position: fixed', 'min-height: 44px'], 'mobile/desktop shell isolation');
includesAll(mobileFrameStyles, ['ik-mobile-decision-screen', 'ik-mobile-device-bar', 'linear-gradient(155deg, #e7f2f8', 'backdrop-filter: blur(18px)', 'border-radius: 0', 'background: transparent'], 'mobile frame styles');
includesAll(mobileDecisionStyles, ['ik-mobile-decision-card', 'background-color: rgba(247, 252, 255, .74)', 'linear-gradient(145deg, rgba(255, 255, 255, .8)', 'backdrop-filter: blur(16px)', 'ik-mobile-decision-trend', 'ik-mobile-resource-incident-stack'], 'mobile decision styles');
includesAll(mobileCoreStyles, ['ik-mobile-core-facts', 'grid-template-columns: repeat(4, minmax(0, 1fr))', 'grid-template-rows: 66px', 'border-radius: 0', 'background: transparent'], 'mobile core fact ownership');
excludesAll(mobileSurfaceStyles, ['ik-mobile-core-facts'], 'mobile surface ownership');
includesAll(mobileSurfaceStyles, ['ik-mobile-supporting-surface', 'ik-mobile-supporting-head', 'ik-mobile-supporting-detail-rows'], 'mobile surface styles');

includesAll(mobilePolicy, [
  'normal-operations-first',
  'wan-offline-default-route-collection-success-first',
  'trust-boundary-no-business-data',
  'collection-boundary-first',
  'resource-pressure-evidence-first',
  'interface-carrier-impact-first',
], 'mobile scenario view model');

includesAll(predeploy, [
  'compactLandscapeOverview',
  'overviewMobileLandscapeAppOk',
  "mobileLandscapeTabs.querySelectorAll('button').length === 3",
  'waitForAnyJson',
  'terminateBrowserTree',
  'matrixBlocksTopLevelPass',
  'inspectScreenshotBlackPixels',
  'unexpected black pixels',
  'overviewDesktopFocusedHierarchyOk',
  'report.pass = report.failures.length === 0 && !matrixBlocksTopLevelPass',
  'process.exitCode = report.exitCodeShouldFail ? 1 : 0',
], 'release gate integrity');
includesAll(mobileRuntime, ['compact landscape app home', 'mobileNavigationNoSnapshot', 'mobileDetailDrilldown', 'mobileIncidentDrilldown'], 'mobile runtime coverage');

for (const [file, text, limit] of [
  ['OverviewPanel.tsx', overview, 120],
  ['DesktopConsole.tsx', desktop, 120],
  ['DesktopDecisionRail.tsx', desktopDecision, 120],
  ['MobileOverviewHome.tsx', mobile, 120],
]) {
  if (lineCount(text) > limit) fail('component line budget', `${file} has ${lineCount(text)} lines (limit ${limit})`);
}

if (failures.length) {
  console.error('overview ikuai current static gate: FAIL');
  for (const item of failures) console.error(`- ${item}`);
  process.exitCode = 1;
} else {
  console.log(`overview ikuai current static gate: PASS desktopContracts=${desktopContractCount} mobileStyleOwnership=frame-decision-surface`);
}
