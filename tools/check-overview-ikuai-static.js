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
const mobile = read('src/panel-framework/overview/mobile-app/RouterMobileApp.tsx');
const mobileScreens = read('src/panel-framework/overview/mobile-app/RouterMobileScreens.tsx');
const mobileModel = read('src/panel-framework/overview/mobile-app/routerMobileModel.ts');
const mobileStyles = read('src/panel-framework/overview/mobile-app/styles/router-mobile-app.css');
const predeploy = read('tools/local-predeploy-check.js');
const mobileRuntime = read('tools/check-mobile-app-home-runtime.js');

includesAll(overview, [
  '<StatusVerdict snapshot={snapshot} state={state} />',
  '<RouterMobileApp key={state.scenario} snapshot={snapshot} state={state} />',
  '<DesktopWorkspace snapshot={snapshot} state={state} />',
  '{mobile ? (',
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

ordered(mobileScreens, [
  '<section className="rm-verdict"',
  '<MetricGrid metrics={model.metrics} />',
  '<LiveTraffic trend={model.trend} />',
  '<EvidenceList title={model.evidenceTitle} rows={model.evidence} />',
], 'mobile network information order');
includesAll(mobile, [
  'className="rm-app"',
  'className="rm-header"',
  'className="rm-tabbar"',
  'activeTab === "network"',
  'activeTab === "collection"',
  'aria-current',
  '只读监控',
], 'isolated mobile app shell');
excludesAll(`${mobile}\n${mobileScreens}\n${mobileModel}\n${mobileStyles}`, ['ik-mobile-', 'ik-ios-', 'ro-mobile-', 'ro-desktop-'], 'mobile namespace isolation');
includesAll(mobileModel, ['网络出口可用', '全部 WAN 已离线', '业务状态不可判断', '当前数据不是实时值', '资源已进入高压区', '个接口停止运行'], 'mobile factual verdict copy');
includesAll(mobileModel, ['source: "history"', 'source: "snapshot"', 'source: "unavailable"', '当前只有单次资源快照'], 'mobile source truthfulness');
excludesAll(mobileModel, ['function trend(', 'const pattern = {'], 'mobile synthetic trend prohibition');
includesAll(mobileScreens, ['data-router-mobile-traffic="history"', 'data-router-mobile-traffic="snapshot"', 'data-router-mobile-traffic="unavailable"'], 'mobile chart source disclosure');
includesAll(mobileStyles, ['--rm-canvas', '.rm-header', '.rm-verdict', '.rm-metric-grid', '.rm-evidence-list', '.rm-tabbar', 'background: rgba(239, 247, 251, .82)', 'min-height: 44px', 'max-width: 900px', 'max-height: 520px'], 'mobile material, density, touch, and responsive styles');

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
  ['RouterMobileApp.tsx', mobile, 100],
  ['RouterMobileScreens.tsx', mobileScreens, 180],
]) {
  if (lineCount(text) > limit) fail('component line budget', `${file} has ${lineCount(text)} lines (limit ${limit})`);
}

if (failures.length) {
  console.error('overview ikuai current static gate: FAIL');
  for (const item of failures) console.error(`- ${item}`);
  process.exitCode = 1;
} else {
  console.log(`overview ikuai current static gate: PASS desktopContracts=${desktopContractCount} mobileStyleOwnership=isolated-router-app`);
}
