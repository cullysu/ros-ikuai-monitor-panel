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
const phoneHome = read('src/panel-framework/overview/mobile-native/MobileNativeHome.tsx');
const phoneSignal = read('src/panel-framework/overview/mobile-native/MobileNativeSignal.tsx');
const phoneInspection = read('src/panel-framework/overview/mobile-native/MobileNativeInspection.tsx');
const phoneEvidence = read('src/panel-framework/overview/mobile-native/MobileNativeDetail.tsx');
const phoneIcon = read('src/panel-framework/overview/mobile-native/MobileNativeIcon.tsx');
const phoneFocus = read('src/panel-framework/overview/mobile-native/mobileNativeFocus.ts');
const phoneModel = read('src/panel-framework/overview/mobile-native/mobileNativeModel.ts');
const phoneModelEvidence = read('src/panel-framework/overview/mobile-native/mobileNativeEvidence.ts');
const phoneTypes = read('src/panel-framework/overview/mobile-native/mobileNativeTypes.ts');
const phoneStyles = read('src/panel-framework/overview/mobile-native/styles/mobile-native-tokens.css');
const phoneLayoutStyles = read('src/panel-framework/overview/mobile-native/styles/mobile-native-layout.css');
const phoneResponsiveStyles = read('src/panel-framework/overview/mobile-native/styles/mobile-native-responsive.css');
const phoneStateStyles = read('src/panel-framework/overview/mobile-native/styles/mobile-native-states.css');
const phoneStyleBundle = `${phoneStyles}\n${phoneLayoutStyles}\n${phoneResponsiveStyles}\n${phoneStateStyles}`;
const mobileShellStyles = read('src/panel-framework/mobile-shell.css');
const predeploy = read('tools/local-predeploy-check.js');
const sectionBrowserInspector = read('tools/acceptance/inspect-section-browser.js');
const mobileOverviewInspector = read('tools/acceptance/inspect-overview-mobile.js');
const desktopOverviewLayoutInspector = read('tools/acceptance/inspect-overview-desktop-layout.js');
const acceptanceInspectorBundle = [
  predeploy,
  sectionBrowserInspector,
  mobileOverviewInspector,
  desktopOverviewLayoutInspector,
].join('\n');
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
includesAll(desktopDefaultScene, ['state.scenario === "fleet"', 'const sideRowLimit = isFleet ? 4 : 3;', 'collapsed={isFleet}', 'isFleet ? 4 : 6', 'module="normal-collection-channel"', 'minRows={0} collapsed={isFleet} />', 'bottom: [', 'terminalRanking,'], 'desktop normal/fleet scene ownership');
excludesAll(desktopDefaultScene, ['isFleet ? null : terminalRanking', 'isFleet ? terminalRanking : null'], 'desktop terminal ranking is deferred consistently');
includesAll(desktopAllOfflineScene, ['Math.max(state.facts.wan.total, offlineRows.length)', '<WanOfflineFocus', 'collapsed />'], 'desktop adaptive WAN incident hierarchy');
excludesAll(desktopAllOfflineScene, ['subtitle="0/8', 'compactRows(wanContinuityRows(state), 8)'], 'desktop WAN fixture cleanup');
includesAll(wanOfflineFocus, ['rows.slice(0, 4)', '其余 {hiddenCount} 条线路在详情中', '不展示 0 B/s'], 'desktop WAN incident focus');
if ((desktopDefaultScene.match(/\bcollapsed=\{isFleet\}/g) || []).length < 2) fail('desktop normal hierarchy', 'expected fleet-only interface and resource summaries');
includesAll(desktopWorkspaceStyles, ['.ro-desktop-grid.is-normal-scene', 'grid-template-areas:', '"main side"', '"bottom bottom"', 'grid-template-rows: auto auto', 'align-items: start', 'align-self: start', 'align-items: stretch', 'align-self: stretch', 'flex: 0 0 auto', 'height: auto', '--ro-col-height: auto', '--ro-col-grid-auto-rows: auto', '--ro-col-module-height: auto'], 'desktop normal content-sized workspace');
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
  '<MobileNativePhoneHome',
  '<MobileNativeTabletHome',
  '<MobileNativeDetail',
  'window.history.pushState',
  'window.history.back()',
  'popstate',
], 'isolated native mobile shell');
excludesAll(phoneConsole, ['tabbar', 'BottomTabs', 'activeTab'], 'retired phone tab shell');
excludesAll(`${phoneConsole}\n${phoneHome}\n${phoneSignal}\n${phoneInspection}\n${phoneEvidence}\n${phoneIcon}\n${phoneFocus}\n${phoneModel}\n${phoneModelEvidence}\n${phoneStyleBundle}`, ['ik-mobile-', 'ik-ios-', 'ro-mobile-', 'ro-desktop-', 'rm-app', 'phone-ops'], 'phone namespace isolation');
includesAll(phoneFocus, ['网络可用', '条 WAN 未运行', '当前业务状态不可判断', '当前变化不可见', '资源策略已触发', '个接口'], 'phone factual verdict copy');
includesAll(`${phoneModel}\n${phoneModelEvidence}\n${phoneFocus}\n${phoneTypes}`, ['"current" | "historical" | "unavailable"', 'successfulBusinessAt(snapshot)', 'kind: "rates"', 'kind: "resource"', 'trailingStreak', 'MobileRiskKey'], 'phone source truthfulness');
excludesAll(phoneModel, ['function syntheticTrend(', 'const pattern = {', '网络状态良好', '实时可信'], 'phone unsupported data and copy prohibition');
excludesAll(`${phoneModel}\n${phoneModelEvidence}\n${phoneFocus}`, ['rows[0]', 'downRate || 0', 'upRate || 0'], 'phone fabricated evidence prohibition');
includesAll(phoneHome, ['data-mobile-native-evidence-mode', 'data-mobile-native-proof', 'data-mobile-native-tablet-context', 'role="listbox"', 'role="option"', 'aria-controls="mn-focus-panel"', '<MobileNativeSignal', '<MobileNativeInspection'], 'phone proof, focus, and tablet workspace semantics');
includesAll(phoneSignal, ['data-mobile-native-rates="current"', 'data-mobile-native-resource-signal', 'signal.kind === "rates"', 'signal.kind === "resource"'], 'phone scenario signal substitution');
includesAll(`${phoneHome}\n${phoneInspection}`, ['data-mobile-native-inspection', 'ArrowRight', 'ArrowLeft', 'preventScroll', '<details', '<summary', 'data-mobile-native-open-detail'], 'phone risk focus and disclosure semantics');
excludesAll(phoneHome, ['role="tablist"', 'role="tab"'], 'phone fake tab semantics');
includesAll(phoneEvidence, ['data-mobile-native-detail', 'data-mobile-native-detail-section', 'Escape', 'data-mobile-native-back', 'titleRef.current?.focus({ preventScroll: true })', 'window.scrollTo({ top: 0'], 'phone evidence navigation');
includesAll(phoneStyleBundle, ['--mn-canvas', '.mn-focus-masthead', '.mn-proof-ledger', '.mn-inspection', '.mn-tablet-workspace', '.mn-detail', 'env(safe-area-inset-top)', 'env(safe-area-inset-left)', 'min-height: 44px', 'touch-action: manipulation'], 'phone risk-focus workspace safe area, touch, and responsive styles');
excludesAll(phoneStyleBundle, ['!important', 'radial-gradient(', '.rm-', '.ik-mobile-', '.ro-mobile-', '.phone-ops'], 'phone patch and retired namespace prohibition');
excludesAll(phoneStyleBundle, ['border-left: 3px', 'margin: 0 auto', '.mn-path-evidence'], 'rejected phone ledger and centered tablet cleanup');
includesAll(mobileShellStyles, [':has(#overview.is-mobile-native)', '.ik-rail', '.sidebar', '.topbar'], 'mobile shell ownership');
excludesAll(phoneStyleBundle, ['.ik-rail', '.sidebar', '.topbar'], 'mobile component shell reach-out');

includesAll(acceptanceInspectorBundle, [
  'compactLandscapeOverview',
  "const mobileOverviewAppViewport = sectionName === 'overview' && window.innerWidth <= 1199",
  "sectionRoot?.querySelector('[data-mobile-native-console]')",
  "routerMobileEvidence?.getAttribute('data-mobile-native-evidence-mode')",
  'if (mobileNativeResult) return mobileNativeResult',
  'Object.values(routerMobileChecks).every(Boolean)',
  'const pass = mobileOverviewAppHomePass',
  'const pass = legacyOrDesktopPass',
  'routerMobileSmallTextNodes.length === 0',
  'waitForAnyJson',
  'terminateBrowserTree',
  'matrixBlocksTopLevelPass',
  'inspectScreenshotBlackPixels',
  'unexpected black pixels',
  'overviewDesktopFocusedHierarchyOk',
  'report.pass = report.failures.length === 0 && !matrixBlocksTopLevelPass',
  'process.exitCode = report.exitCodeShouldFail ? 1 : 0',
], 'release gate integrity');
excludesAll(acceptanceInspectorBundle, [
  'const pass = routerMobileRoot ? mobileOverviewAppHomePass : legacyOrDesktopPass',
  'sampleRectCoverage',
  'elementFromPoint',
  'contentFillRatio',
  'rightFillRatio',
  'overviewVisualBalanceTypeCount',
  'overviewDesktopTableAreaRatio',
  'overviewDesktopChartMatrixAreaRatio',
  'overviewDesktopKpiBalanceOk',
], 'release gate semantic evidence integrity');
includesAll(acceptanceInspectorBundle, [
  'sceneCoreGeometry',
  'semanticGeometry',
  'overviewVisualCenterEvidenceOk',
  'overviewSceneSpecificDesktopEvidenceOk',
], 'release gate semantic geometry');
includesAll(phoneRuntime, [
  'scenarios',
  'p320: \'320x568\'',
  'p360: \'360x800\'',
  'p375: \'375x667\'',
  'p390: \'390x844\'',
  'p430: \'430x932\'',
  'tablet: \'768x1024\'',
  'ipad1024: \'1024x768\'',
  'ipad1180: \'1180x820\'',
  'l667: \'667x375\'',
  'l844: \'844x390\'',
  'expectedCells',
  'report.matrix?.complete',
  'screenshots.length',
], 'phone 70-cell runtime matrix coverage');

for (const [file, text, limit] of [
  ['OverviewPanel.tsx', overview, 120],
  ['DesktopConsole.tsx', desktop, 120],
  ['DesktopDecisionRail.tsx', desktopDecision, 120],
  ['MobileNativeConsole.tsx', phoneConsole, 180],
  ['MobileNativeHome.tsx', phoneHome, 320],
  ['MobileNativeSignal.tsx', phoneSignal, 100],
  ['MobileNativeInspection.tsx', phoneInspection, 100],
  ['MobileNativeDetail.tsx', phoneEvidence, 100],
  ['MobileNativeIcon.tsx', phoneIcon, 100],
  ['mobileNativeFocus.ts', phoneFocus, 460],
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
