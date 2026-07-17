'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const failures = [];
function read(file) {
  const target = path.join(root, file);
  if (!fs.existsSync(target)) { failures.push(`missing ${file}`); return ''; }
  return fs.readFileSync(target, 'utf8');
}
function includesAll(text, tokens, label) {
  for (const token of tokens) if (!text.includes(token)) failures.push(`${label}: missing ${JSON.stringify(token)}`);
}
function excludesAll(text, tokens, label) {
  for (const token of tokens) if (text.includes(token)) failures.push(`${label}: forbidden ${JSON.stringify(token)}`);
}

const overview = read('src/panel-framework/overview/OverviewPanel.tsx');
const model = read('src/panel-framework/overview/evidence-model/buildOverviewEvidenceModel.ts');
const mobile = read('src/panel-framework/mobile/MobilePatrolScreen.tsx');
const ledger = read('src/panel-framework/mobile/MobileEvidenceLedger.tsx');
const traffic = read('src/panel-framework/mobile/MobilePatrolTraffic.tsx');
const domain = read('src/panel-framework/mobile/MobileDomainWorkspace.tsx');
const domainModel = read('src/panel-framework/mobile/mobileDomainWorkspaceModel.ts');
const domainDefinitions = read('src/panel-framework/mobile/mobileDomainDefinitions.ts');
const mobileCss = read('src/panel-framework/mobile/mobile-patrol.css') + '\n' + read('src/panel-framework/mobile/mobile-domain.css');
const navigation = read('src/panel-framework/sections/PanelTaskNavigation.tsx');
const sections = read('src/panel-framework/sections/sectionModels.ts');
const seriesChart = read('src/panel-framework/sections/SectionTimeSeriesChart.tsx');
const runtime = read('src/panel-framework/runtime/usePanelRuntime.ts');
const schema = read('src/panel-framework/runtime/panelRuntimeSchema.ts');
const publicShell = read('public/index.html');
const desktop = read('src/panel-framework/overview/desktop-overview/DesktopOverviewScreen.tsx');
const built = read('public/assets/framework/panel-framework.js');

includesAll(overview, ['<MobilePatrolScreen', '<DesktopOverviewScreen', 'data-overview-business-display-boundary'], 'surface composition');
excludesAll(overview, ['MobileOverviewScreen', 'switch (state.scenario)', 'dangerouslySetInnerHTML'], 'surface isolation');

includesAll(model, [
  'if (risk === "evidence")', 'if (risk === "collection")', 'if (risk === "wan")',
  'if (risk === "resource")', 'if (risk === "interfaces")', 'if (risk === "route")',
  '当前变化不可见', '不作当前业务判断', '未记录不等于没有故障',
], 'evidence-first language');
excludesAll(model, ['rows[0]', 'downRate || 0', 'upRate || 0', '网络状态良好', '实时可信'], 'certainty boundaries');

includesAll(mobile, [
  'data-mobile-core-facts', 'data-mobile-incident-center', 'MobileEvidenceLedger',
], 'mobile patrol IA');
includesAll(ledger, [
  'data-mobile-evidence-ledger', 'userOverrideRef', 'fitsEvidence', 'roomyIncident',
], 'mobile evidence disclosure');
includesAll(traffic, [
  '当前读数 · 趋势待采样', 'preserveAspectRatio="xMidYMid meet"',
  '纵轴从 0 到', '横轴从', '<title', '<desc',
], 'mobile chart truth');
includesAll(domain, [
  'type="search"', 'aria-pressed={filter === item.id}', '<select value={sort}',
  'mdw-pagination', 'data-mobile-object-detail',
], 'domain operations');
includesAll(domainModel, ['window.history.pushState', 'window.addEventListener("popstate"', 'rowsFromModel', 'workspaceLabel'], 'domain state and history');
includesAll(domainDefinitions, ['domainDefinitionFor', 'sortWorkspaceRows'], 'domain-specific operations');
includesAll(navigation, ['概览', '网络', '终端', '日志'], 'stable mobile navigation');
includesAll(mobileCss, ['#eef2f4', '.mp-command', '.mp-incident-list', '.mdw-layout', '@media (min-width: 600px) and (max-width: 1180px)'], 'neutral responsive visual system');
excludesAll(mobile + '\n' + traffic + '\n' + domain + '\n' + domainModel + '\n' + mobileCss, [
  'grabber', 'bottom-sheet', 'topology', 'preserveAspectRatio="none"',
  '.mo-verdict', '112px', '!important', 'font-size: 11px', 'font-size: 10px',
], 'rejected mobile patterns');

includesAll(sections, ['resourceVisualization', 'historyTimestamp', '样本摘要，不绘制趋势', 'visualization: undefined'], 'resource evidence model');
includesAll(seriesChart, ['data-section-time-series', '0–100%', 'section-series-threshold', 'preserveAspectRatio="xMidYMid meet"', '<title', '<desc'], 'resource chart');
excludesAll(sections, ['values.map((value) => text(value)).join(" · ")'], 'fake resource series');

includesAll(runtime, ['void refresh("recovery")', '浏览器同时报告互联网不可用（仅作提示）'], 'LAN request recovery');
excludesAll(runtime, ['phase: browserOfflineHint ? "offline"', 'if (!navigator.onLine) return'], 'navigator hint boundary');
includesAll(schema, ['带时区的 RFC 3339', 'validateSnapshotTree', 'MAX_SNAPSHOT_COLLECTION_ROWS', 'validatePercentage'], 'runtime data contract');

includesAll(publicShell, ['<main id="app"', 'panel-framework.js', 'style.css'], 'single public shell');
excludesAll(publicShell, ['#dns', 'panel-legacy', 'Ctrl+K', '搜索'], 'dead public interactions');
includesAll(desktop, ['data-desktop-overview', 'DesktopIncidentDocket', 'DesktopLedger', 'DesktopWanEvidence'], 'desktop console retained');

if (built) {
  includesAll(built, ['data-mobile-overview', 'data-mobile-domain-workspace', 'data-section-time-series', 'data-desktop-overview'], 'production bundle');
  excludesAll(built, ['data-mobile-native', 'mountRouterOverviewPanel', 'preserveAspectRatio="none"'], 'production bundle retired UI');
}

if (failures.length) {
  console.error('overview product static gate: FAIL');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('overview product static gate: PASS evidence-first patrol + domain workspaces + real time-series');
