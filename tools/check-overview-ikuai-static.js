'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];

function read(file) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) {
    failures.push(`missing ${file}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

function includesAll(text, tokens, label) {
  for (const token of tokens) if (!text.includes(token)) failures.push(`${label}: missing ${JSON.stringify(token)}`);
}

function excludesAll(text, tokens, label) {
  for (const token of tokens) if (text.includes(token)) failures.push(`${label}: forbidden ${JSON.stringify(token)}`);
}

const overview = read('src/panel-framework/overview/OverviewPanel.tsx');
const evidenceModel = read('src/panel-framework/overview/evidence-model/buildOverviewEvidenceModel.ts');
const mobile = read('src/panel-framework/overview/mobile-overview/MobileOverviewScreen.tsx');
const mobileQueue = read('src/panel-framework/overview/mobile-overview/MobilePriorityQueue.tsx');
const mobileChart = read('src/panel-framework/overview/mobile-overview/MobileWanInstrument.tsx');
const mobileCss = [
  read('src/panel-framework/overview/mobile-overview/styles/mobile-overview-tokens.css'),
  read('src/panel-framework/overview/mobile-overview/styles/mobile-overview.css'),
  read('src/panel-framework/overview/mobile-overview/styles/mobile-overview-responsive.css'),
].join('\n');
const desktop = read('src/panel-framework/overview/desktop-overview/DesktopOverviewScreen.tsx');
const desktopModel = read('src/panel-framework/overview/desktop-overview/desktopOverviewModel.ts');
const desktopIncident = read('src/panel-framework/overview/desktop-overview/DesktopIncidentDocket.tsx');
const desktopLedger = read('src/panel-framework/overview/desktop-overview/DesktopLedger.tsx');
const desktopChart = read('src/panel-framework/overview/desktop-overview/DesktopWanEvidence.tsx');
const desktopCss = [
  read('src/panel-framework/overview/desktop-overview/styles/desktop-overview-tokens.css'),
  read('src/panel-framework/overview/desktop-overview/styles/desktop-overview.css'),
  read('src/panel-framework/overview/desktop-overview/styles/desktop-overview-responsive.css'),
].join('\n');
const routes = read('src/panel-framework/routes/panelRoutes.ts');
const shell = read('src/panel-framework/sections/section-console.css');
const built = read('public/assets/framework/panel-framework.js');
const builtCss = read('public/assets/framework/style.css');

includesAll(overview, [
  '<MobileOverviewScreen',
  '<DesktopOverviewScreen',
  'data-overview-business-display-boundary',
  'data-overview-scene-key',
  '(max-width: 899px)',
], 'surface composition');
excludesAll(overview, ['switch (state.scenario)', 'dangerouslySetInnerHTML', '<DesktopWorkspace', '<StatusVerdict'], 'surface shell ownership');

includesAll(evidenceModel, [
  'if (mode === "current")',
  'if (mode === "historical")',
  'if (risk === "evidence")',
  'if (risk === "collection")',
  'if (risk === "wan")',
  'if (risk === "resource")',
  'if (risk === "interfaces")',
  'if (risk === "route")',
  'active === true && route.disabled !== true',
  'latestBusinessSuccessTime(snapshot)',
  '当前变化不可见',
  '不作当前业务判断',
  '未记录不等于没有故障',
], 'evidence-first product language');
excludesAll(evidenceModel, [
  'rows[0]',
  'downRate || 0',
  'upRate || 0',
  '网络状态良好',
  '实时可信',
  '实时数据',
], 'fabricated certainty prohibition');

includesAll(mobile, [
  'data-mobile-overview',
  'data-mobile-core-facts',
  '<MobilePriorityQueue',
  '<MobileWanInstrument',
  'data-mobile-evidence-ledger',
], 'mobile patrol hierarchy');
includesAll(mobileQueue, ['data-mobile-priority-object', 'data-mobile-priority-route', 'onNavigate(object.route)'], 'mobile real-object navigation');
includesAll(mobileChart, ['<svg', 'viewBox', '<title', '<desc', 'traffic.currentDown', 'traffic.currentUp', 'traffic.peak'], 'mobile chart truthfulness');
includesAll(mobileCss, ['--mo-blue', '.mo-verdict', '.mo-facts', '.mo-priority-list', '.mo-evidence-ledger', 'env(safe-area-inset-top)', 'min-height: 44px'], 'mobile cold-blue task surface');
excludesAll(`${mobile}\n${mobileQueue}\n${mobileChart}\n${mobileCss}`, [
  'DesktopOverview',
  '.do-',
  'role="tab"',
  'role="tablist"',
  'grabber',
  'bottom-sheet',
  'carousel',
  'topology',
  '!important',
], 'mobile rejected-pattern isolation');

includesAll(desktop, [
  'data-desktop-overview',
  'data-desktop-status-bus',
  '<DesktopIncidentDocket',
  '<DesktopWanEvidence',
  'title="运行判断"',
  'title="来源与操作边界"',
  'state.scale !== "fleet"',
], 'desktop operations ledger hierarchy');
includesAll(desktopModel, [
  'buildOverviewEvidenceModel',
  'row.active === true && row.disabled !== true',
  '管理面',
  '转发面',
  '业务面',
  '不以零值代替缺失',
  'overview.cpuLoad + memoryUsage + diskUsage',
], 'desktop decision ownership');
includesAll(desktopIncident, ['处置证据', '不重复顶层结论', 'sourcePath'], 'desktop incident substitution');
includesAll(desktopLedger, ['role="table"', 'role="columnheader"', 'data-desktop-ledger-row', 'onNavigate'], 'desktop accessible evidence ledger');
includesAll(desktopChart, [
  '<svg',
  'viewBox',
  'role="img"',
  '<title',
  '<desc',
  'traffic.windowLabel',
  'traffic.sampleCount',
  'traffic.currentDown',
  'traffic.currentUp',
  'traffic.peak',
  'data-unit="bit/s"',
], 'desktop current-window SVG');
excludesAll(desktopChart, ['阈值', 'threshold', '<canvas', 'style={{ width', 'style={{ left'], 'desktop chart decoration prohibition');
includesAll(desktopCss, ['--do-blue', '.do-status-bus', '.do-main-grid', '.do-ledger-row', '.do-wan-chart', '@media (min-width: 900px)'], 'desktop cold-blue ledger system');
excludesAll(`${desktop}\n${desktopModel}\n${desktopIncident}\n${desktopLedger}\n${desktopChart}\n${desktopCss}`, [
  'MobileOverview',
  '.mo-',
  'DesktopWorkspace',
  'StatusVerdict',
  'DesktopDecisionRail',
  'desktopOverviewScenes',
  '!important',
], 'desktop rejected-pattern isolation');

includesAll(routes, [
  '"overview"', '"interfaces"', '"lineStatus"', '"balance"', '"routes"', '"terminals"', '"dhcp"', '"arp"',
  '"trafficLoad"', '"loadAudit"', '"trafficAudit"', '"connections"', '"dns4"', '"dns6"', '"security"', '"logs"',
  '"serviceLogs"', '"readonlyDiagnostics"', '"more"',
], 'real console route inventory');
includesAll(shell, ['@media (max-width: 899px)', '.panel-task-navigation', 'backdrop-filter: blur(18px)'], 'mobile task navigation shell');

includesAll(built, ['data-mobile-overview', 'data-desktop-overview', 'data-desktop-wan-evidence'], 'production bundle surfaces');
excludesAll(built, ['data-mobile-native', 'DesktopWorkspace', 'StatusVerdict'], 'production bundle retired UI');
includesAll(builtCss, ['.mo-shell', '.do-shell', '.do-wan-chart'], 'production bundle styles');
excludesAll(builtCss, ['.mn-', '.ro-desktop-', '\\n.router', '!important'], 'production bundle patch sediment');

if (failures.length) {
  console.error('overview product static gate: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('overview product static gate: PASS mobile=isolated-patrol desktop=cold-blue-ledger evidence=current-historical-unavailable');
