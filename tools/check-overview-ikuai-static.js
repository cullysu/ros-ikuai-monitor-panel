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
const desktopScenes = read('src/panel-framework/overview/desktopOverviewScenes.tsx');
const desktopHierarchyStyles = read('src/panel-framework/overview/OverviewPanelDesktopHierarchy.css');
const mobile = read('src/panel-framework/overview/components/MobileOverviewHome.tsx');
const mobileDecision = read('src/panel-framework/overview/components/MobileOverviewDecision.tsx');
const mobileSections = read('src/panel-framework/overview/components/MobileOverviewHomeSections.tsx');
const mobileTabs = read('src/panel-framework/overview/components/BottomTabs.tsx');
const mobileStyles = read('src/panel-framework/overview/components/MobileOverviewStyles.tsx');
const mobileModel = read('src/panel-framework/overview/mobileOverviewModel.ts');
const mobilePolicy = read('src/panel-framework/overview/mobileOverviewPolicy.ts');
const landscapeStyles = read('src/panel-framework/overview/components/MobileOverviewLandscapeStyles.ts');
const navigationStyles = read('src/panel-framework/overview/components/MobileOverviewNavigationStyles.ts');
const incidentStyles = read('src/panel-framework/overview/components/MobileOverviewIncidentStyles.ts');
const productShellStyles = read('src/panel-framework/overview/components/MobileOverviewProductShellStyles.ts');
const decisionRepairStyles = read('src/panel-framework/overview/components/MobileOverviewPublicDecisionRepairStyles.ts');
const predeploy = read('tools/local-predeploy-check.js');
const mobileRuntime = read('tools/check-mobile-app-home-runtime.js');

includesAll(overview, [
  '<StatusVerdict snapshot={snapshot} state={state} />',
  '<MobileOverviewHome snapshot={snapshot} state={state} />',
  '<DesktopWorkspace snapshot={snapshot} state={state} />',
  'data-overview-business-display-boundary',
  'data-overview-no-zero-rate-placeholder',
], 'overview composition');
excludesAll(overview, ['switch (state.scenario)', '<table', 'dangerouslySetInnerHTML'], 'overview shell ownership');

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
  'state.scenario === "fleet"',
  'state.scenario === "all-offline"',
  'state.scenario === "no-snapshot"',
  'state.scenario === "collection-down"',
  'state.scenario === "resource-full"',
  'state.scenario === "interfaces-down"',
], 'desktop scenario ownership');
if ((desktopScenes.match(/\bcollapsed\s*\/>/g) || []).length < 3) fail('desktop normal hierarchy', 'expected three collapsed secondary summaries');
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
  '<PrimaryDecision model={model} />',
  '<CoreFacts model={model} />',
  '<SupportingList model={model} />',
  '<BottomTabs activeId={activeTab} onSelect={setActiveTab} />',
], 'mobile home information order');
includesAll(mobile, [
  'data-overview-mobile-app-home="ikuai40-ios-router-home"',
  'data-overview-mobile-no-desktop-collapse="true"',
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
includesAll(mobileSections, ['export function DeviceBar', 'export function CoreFacts', 'export function SupportingList', 'aria-expanded'], 'mobile semantic sections');

for (const tab of ['home', 'wan', 'interface', 'terminal', 'log']) {
  if (!mobileTabs.includes(`id: "${tab}"`)) fail('mobile navigation semantics', `missing ${tab}`);
}
includesAll(mobileTabs, ['aria-current', 'aria-controls', '路由器监控底部导航'], 'mobile navigation accessibility');

includesAll(mobileStyles, [
  'MOBILE_OVERVIEW_FOUNDATION_STYLES',
  'MOBILE_OVERVIEW_PRODUCT_SHELL_STYLES',
  'MOBILE_OVERVIEW_PUBLIC_DECISION_STYLES',
  'MOBILE_OVERVIEW_PUBLIC_DECISION_REPAIR_STYLES',
  'MOBILE_OVERVIEW_INCIDENT_STYLES',
  'MOBILE_OVERVIEW_NAVIGATION_STYLES',
  'MOBILE_OVERVIEW_LANDSCAPE_STYLES',
  'useInsertionEffect',
], 'mobile style composition');
includesAll(landscapeStyles, ['min-width: 761px', 'max-width: 900px', 'max-height: 520px', '"hero side"'], 'landscape mobile layout');
includesAll(navigationStyles, ['position: fixed', 'height: 52px', 'repeat(5, minmax(0, 1fr))'], 'mobile native navigation');
includesAll(incidentStyles, ['ik-mobile-incident-summary', 'ik-mobile-incident-guidance', 'min-height: 98px'], 'mobile incident hierarchy');
includesAll(productShellStyles, ['ro-desktop-grid', 'ro-mobile-first-screen', '100dvh', 'position: fixed', 'min-height: 44px'], 'mobile/desktop shell isolation');
if (lineCount(decisionRepairStyles) > 500) fail('mobile repair stylesheet budget', `${lineCount(decisionRepairStyles)} lines`);

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
  'waitForAnyJson',
  'terminateBrowserTree',
  'matrixBlocksTopLevelPass',
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
  console.log(`overview ikuai current static gate: PASS desktopContracts=${desktopContractCount} mobileRepairLines=${lineCount(decisionRepairStyles)}`);
}
