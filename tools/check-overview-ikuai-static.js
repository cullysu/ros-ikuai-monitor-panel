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
const phoneConsole = read('src/panel-framework/overview/mobile-native/MobileNativeConsole.tsx');
const phoneTopology = read('src/panel-framework/overview/mobile-native/MobileNativeTopology.tsx');
const phoneSheet = read('src/panel-framework/overview/mobile-native/MobileNativeSheet.tsx');
const phoneEvidence = read('src/panel-framework/overview/mobile-native/MobileNativeDetail.tsx');
const phoneModel = read('src/panel-framework/overview/mobile-native/mobileNativeModel.ts');
const phoneStyles = read('src/panel-framework/overview/mobile-native/styles/mobile-native-tokens.css');
const phoneLayoutStyles = read('src/panel-framework/overview/mobile-native/styles/mobile-native-layout.css');
const phoneStateStyles = read('src/panel-framework/overview/mobile-native/styles/mobile-native-states.css');
const phoneStyleBundle = `${phoneStyles}\n${phoneLayoutStyles}\n${phoneStateStyles}`;
const predeploy = read('tools/local-predeploy-check.js');
const phoneRuntime = read('tools/check-mobile-native-runtime.js');

includesAll(overview, [
  '<StatusVerdict snapshot={snapshot} state={state} />',
  '<MobileNativeConsole key={state.scenario} snapshot={snapshot} state={state} />',
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
  'role: "next-step"',
  'role: "credibility"',
  'className="ro-desktop-decision-rail"',
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
includesAll(desktopDefaultScene, ['state.scenario === "fleet"', 'const sideRowLimit = isFleet ? 4 : 3;', 'collapsed={isFleet}', 'isFleet ? 4 : 6', 'module="normal-collection-channel"', 'minRows={0} collapsed />', 'bottom: [', 'terminalRanking,'], 'desktop normal/fleet scene ownership');
excludesAll(desktopDefaultScene, ['isFleet ? null : terminalRanking', 'isFleet ? terminalRanking : null'], 'desktop terminal ranking is deferred consistently');
includesAll(desktopAllOfflineScene, ['Math.max(state.facts.wan.total, offlineRows.length)', '<WanOfflineFocus', 'collapsed />'], 'desktop adaptive WAN incident hierarchy');
excludesAll(desktopAllOfflineScene, ['subtitle="0/8', 'compactRows(wanContinuityRows(state), 8)'], 'desktop WAN fixture cleanup');
includesAll(wanOfflineFocus, ['rows.slice(0, 4)', '其余 {hiddenCount} 条线路在详情中', '不展示 0 B/s'], 'desktop WAN incident focus');
if ((desktopDefaultScene.match(/\bcollapsed=\{isFleet\}/g) || []).length < 2) fail('desktop normal hierarchy', 'expected fleet-only interface and resource summaries');
includesAll(desktopWorkspaceStyles, ['.ro-desktop-grid.is-normal-scene', 'align-items: start', 'align-self: start', 'align-items: stretch', 'align-self: stretch', 'grid-template-rows: 25px auto', 'height: auto', '--ro-col-height: auto', '--ro-col-grid-auto-rows: auto', '--ro-col-module-height: auto'], 'desktop normal content-sized workspace');
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

includesAll(phoneConsole, [
  'data-mobile-native-console',
  '<MobileNativeTopology',
  '<MobileNativeSheet',
  '<MobileNativeDetail',
], 'isolated native mobile shell');
excludesAll(phoneConsole, ['tabbar', 'BottomTabs', 'activeTab'], 'retired phone tab shell');
excludesAll(`${phoneConsole}\n${phoneTopology}\n${phoneSheet}\n${phoneEvidence}\n${phoneModel}\n${phoneStyleBundle}`, ['ik-mobile-', 'ik-ios-', 'ro-mobile-', 'ro-desktop-', 'rm-app', 'phone-ops'], 'phone namespace isolation');
includesAll(phoneModel, ['默认路由有活动记录', '条 WAN 未运行', '当前业务状态不可判断', '采集链路尚未恢复', '资源连续', '未运行'], 'phone factual verdict copy');
includesAll(phoneModel, ['ratePrefix: cached ? "上次" : "当前"', 'showRates: false', '最后成功', 'resourceSamples'], 'phone source truthfulness');
excludesAll(phoneModel, ['function syntheticTrend(', 'const pattern = {', '网络状态良好', '实时可信'], 'phone unsupported data and copy prohibition');
includesAll(phoneTopology, ['data-mobile-native-topology', 'data-mobile-native-rates', 'model.showRates ?'], 'phone topology and rate semantics');
includesAll(phoneSheet, ['data-mobile-native-sheet', 'model.facts.map', 'model.rows.map', 'data-mobile-native-open-detail'], 'phone adaptive sheet ownership');
includesAll(phoneEvidence, ['data-mobile-native-detail', 'Escape', 'data-mobile-native-back', 'backRef.current?.focus()'], 'phone evidence navigation');
includesAll(phoneStyleBundle, ['--mn-canvas', '.mn-topology', '.mn-sheet', '.mn-facts', '.mn-detail', 'env(safe-area-inset-top)', 'min-height: 44px', 'touch-action: manipulation'], 'phone native sheet, safe area, touch, and responsive styles');
excludesAll(phoneStyleBundle, ['!important', 'radial-gradient(', '.rm-', '.ik-mobile-', '.ro-mobile-', '.phone-ops'], 'phone patch and retired namespace prohibition');

includesAll(predeploy, [
  'compactLandscapeOverview',
  'overviewMobileLandscapeAppOk',
  "sectionRoot?.querySelector('[data-mobile-native-console]')",
  "routerMobileSheet?.getAttribute('data-mobile-native-sheet')",
  'waitForAnyJson',
  'terminateBrowserTree',
  'matrixBlocksTopLevelPass',
  'inspectScreenshotBlackPixels',
  'unexpected black pixels',
  'overviewDesktopFocusedHierarchyOk',
  'report.pass = report.failures.length === 0 && !matrixBlocksTopLevelPass',
  'process.exitCode = report.exitCodeShouldFail ? 1 : 0',
], 'release gate integrity');
includesAll(phoneRuntime, ['scenarios', 'viewports', 'expectedCells', 'report.matrix?.complete', 'screenshots.length'], 'phone runtime matrix coverage');

for (const [file, text, limit] of [
  ['OverviewPanel.tsx', overview, 120],
  ['DesktopConsole.tsx', desktop, 120],
  ['DesktopDecisionRail.tsx', desktopDecision, 120],
  ['MobileNativeConsole.tsx', phoneConsole, 80],
  ['MobileNativeTopology.tsx', phoneTopology, 80],
  ['MobileNativeSheet.tsx', phoneSheet, 90],
  ['MobileNativeDetail.tsx', phoneEvidence, 100],
]) {
  if (lineCount(text) > limit) fail('component line budget', `${file} has ${lineCount(text)} lines (limit ${limit})`);
}

if (failures.length) {
  console.error('overview ikuai current static gate: FAIL');
  for (const item of failures) console.error(`- ${item}`);
  process.exitCode = 1;
} else {
  console.log(`overview ikuai current static gate: PASS desktopContracts=${desktopContractCount} phoneStyleOwnership=isolated-mobile-native`);
}
