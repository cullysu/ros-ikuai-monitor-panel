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
const mobileIncidentCenter = read('src/panel-framework/mobile/MobilePatrolIncidentCenter.tsx');
const mobileProof = read('src/panel-framework/mobile/MobileProofStrip.tsx');
const ledger = read('src/panel-framework/mobile/MobileEvidenceLedger.tsx');
const traffic = read('src/panel-framework/mobile/MobilePatrolTraffic.tsx');
const mobileWanChartContract = read('tools/check-mobile-wan-chart-visibility.js');
const mobileResourceHistory = read('src/panel-framework/mobile/MobileResourceHistory.tsx');
const domain = [
  read('src/panel-framework/mobile/MobileDomainWorkspace.tsx'),
  read('src/panel-framework/mobile/mobile-inspector/MobileDomainInspector.tsx'),
  read('src/panel-framework/mobile/mobile-inspector/NetworkInspectors.tsx'),
  read('src/panel-framework/mobile/mobile-inspector/TerminalLogInspectors.tsx'),
  read('src/panel-framework/mobile/mobile-inspector/SecurityDnsInspectors.tsx'),
].join('\n');
const domainModel = read('src/panel-framework/mobile/mobileDomainWorkspaceModel.ts');
const domainDefinitions = read('src/panel-framework/mobile/mobileDomainDefinitions.ts');
const mobileCss = read('src/panel-framework/mobile/mobile-patrol-foundation.css') + '\n' + read('src/panel-framework/mobile/mobile-patrol.css') + '\n' + read('src/panel-framework/mobile/mobile-domain-foundation.css') + '\n' + read('src/panel-framework/mobile/mobile-domain.css');
const navigation = read('src/panel-framework/sections/PanelTaskNavigation.tsx');
const sections = read('src/panel-framework/sections/sectionModels.ts');
const resourceHistory = read('src/panel-framework/overview/evidence-model/resourceHistorySamples.ts');
const resourceTimeSeries = read('src/panel-framework/sections/resourceTimeSeries.ts');
const seriesChart = read('src/panel-framework/sections/SectionTimeSeriesChart.tsx');
const timeSeriesGeometry = read('src/panel-framework/sections/timeSeriesGeometry.ts');
const seriesCss = read('src/panel-framework/sections/section-timeseries.css');
const runtime = read('src/panel-framework/runtime/usePanelRuntime.ts');
const schema = read('src/panel-framework/runtime/panelRuntimeSchema.ts');
const publicShell = read('public/index.html');
const desktop = read('src/panel-framework/overview/desktop-overview/DesktopOverviewScreen.tsx');
const desktopDomain = read('src/panel-framework/sections/DesktopDomainWorkspace.tsx');
const desktopInspector = read('src/panel-framework/sections/DesktopDomainInspector.tsx');
const operationalPage = read('src/panel-framework/sections/OperationalSectionPage.tsx');
const built = read('public/assets/framework/panel-framework.js');

includesAll(overview, ['<MobilePatrolScreen', '<DesktopOverviewScreen', 'data-overview-business-display-boundary'], 'surface composition');
excludesAll(overview, ['MobileOverviewScreen', 'switch (state.scenario)', 'dangerouslySetInnerHTML'], 'surface isolation');

includesAll(model, [
  'if (risk === "evidence")', 'if (risk === "collection")', 'if (risk === "wan")',
  'if (risk === "resource")', 'if (risk === "interfaces")', 'if (risk === "route")',
  '当前变化不可见', '不作当前业务判断', '未记录不等于没有故障',
], 'evidence-first language');
excludesAll(model, ['rows[0]', 'downRate || 0', 'upRate || 0', '网络状态良好', '实时可信'], 'certainty boundaries');

includesAll(mobile + mobileIncidentCenter, [
  'MobileProofStrip', 'data-mobile-incident-center', 'MobileEvidenceLedger',
], 'mobile patrol IA');
includesAll(mobileProof, ['data-mobile-core-facts', 'data-mobile-core-fact', 'data-overview-task-focus="facts"'], 'mobile proof IA');
includesAll(ledger, [
  'data-mobile-evidence-ledger', 'data-mobile-evidence-row', 'userOverrideRef',
  'availableHeight', 'requiredHeight', 'ResizeObserver',
], 'mobile evidence disclosure');
excludesAll(ledger, ['fitsEvidence', 'roomyIncident', 'estimatedBody'], 'retired heuristic disclosure');
includesAll(traffic, [
  '当前读数 · 趋势待采样', 'preserveAspectRatio="xMidYMid meet"',
  '纵轴从 0 到', '横轴从', '<title', '<desc',
], 'mobile chart truth');
includesAll(mobileWanChartContract, ['mobile-wan-chart-visibility-v1', 'normal390ChartSurface', 'normal390ChartPlot'], 'mobile WAN chart visibility contract');
includesAll(domain, [
  'type="search"', 'aria-pressed={filter === item.id}', '<select value={sort}',
  'mdw-pagination', 'data-mobile-object-detail',
], 'domain operations');
includesAll(domainModel, ['window.history.pushState', 'window.addEventListener("popstate"', 'rowsFromModel', 'workspaceLabel'], 'domain state and history');
includesAll(domainDefinitions, ['domainDefinitionFor', 'sortWorkspaceRows'], 'domain-specific operations');
includesAll(domain, ['InterfaceInspector', 'RouteInspector', 'TerminalInspector', 'LogInspector', 'SecurityInspector', 'DnsInspector'], 'domain-specific inspectors');
excludesAll(domain, ['<dl', 'mdw-detail-fields', 'DetailPane'], 'retired generic detail');
includesAll(navigation, ['概览', '网络', '终端', '日志'], 'stable mobile navigation');
includesAll(mobileCss, ['--mp-surface-base', '.mp-command', '.mp-incident-list', '.mdw-layout', '@media (min-width: 768px) and (max-width: 1199px)'], 'neutral responsive visual system');
excludesAll(mobile + '\n' + traffic + '\n' + domain + '\n' + domainModel + '\n' + mobileCss, [
  'grabber', 'bottom-sheet', 'topology', 'preserveAspectRatio="none"',
  '.mo-verdict', '!important', 'font-size: 11px', 'font-size: 10px',
], 'rejected mobile patterns');

includesAll(sections, ['resourceEvidenceWindow(snapshot)', 'const resourceMetrics', 'points.map', 'resourceTimeSeries({ metrics: resourceMetrics })', 'visualization: undefined'], 'resource evidence model');
excludesAll(sections, ['function resourceVisualization'], 'resource evidence shared ownership');
includesAll(resourceHistory, ['hasOwnProperty.call(history, "resourceSamples")', 'sample.evidenceMode !== "current"', 'timestamp <= points[points.length - 1].timestamp', 'Math.abs(latestValue - current) > 1', 'Math.abs(currentAt - latest.timestamp) > maxAge'], 'atomic resource history');
includesAll(resourceTimeSeries, ['resourcePercentDomain', '[metric.threshold, ...metric.points.map', '...domain'], 'shared resource time-series');
includesAll(mobileResourceHistory, ['SectionTimeSeriesChart', 'embedded', 'nativeEvent.isTrusted', 'requestAnimationFrame', 'scrollIntoView({ block: "center", behavior: "auto" })'], 'mobile resource history');
excludesAll(mobileResourceHistory, ['data-resource-latest-sample', '最新可信样本', 'mp-resource-samples', '逐点样本'], 'mobile resource history latest-reading replay');
includesAll(seriesChart, ['data-section-time-series', 'data-section-threshold', 'data-section-series', 'preserveAspectRatio="xMidYMid meet"', 'const { min, max } = visualization', '局部刻度 ', '<title', '<desc'], 'resource chart');
includesAll(timeSeriesGeometry, ['timeSeriesPointX', 'percentagePointY', 'min = 0, max = 100', 'resourcePercentDomain', 'timestamp', 'start', 'end'], 'shared time geometry');
includesAll(seriesCss, ['.section-series-line.is-memory', 'stroke-dasharray: 9 4', '.section-series-line.is-disk', 'stroke-dasharray: 2 4'], 'resource chart non-color identity');
excludesAll(sections, ['values.map((value) => text(value)).join(" · ")'], 'fake resource series');

includesAll(runtime, ['void refresh("recovery")', '浏览器同时报告互联网不可用（仅作提示）'], 'LAN request recovery');
excludesAll(runtime, ['phase: browserOfflineHint ? "offline"', 'if (!navigator.onLine) return'], 'navigator hint boundary');
includesAll(schema, ['带时区的 RFC 3339', 'validateSnapshotTree', 'MAX_SNAPSHOT_COLLECTION_ROWS', 'validatePercentage'], 'runtime data contract');

includesAll(publicShell, ['<div id="app"', 'data-overview-framework-asset="script"', 'data-overview-framework-asset="style"'], 'single public shell');
excludesAll(publicShell, ['<main id="app"'], 'neutral public shell mount');
if (!/\/assets\/framework\/panel-framework\.[0-9a-f]{12}\.js/.test(publicShell)) failures.push('single public shell: missing content-addressed framework script');
if (!/\/assets\/framework\/style\.[0-9a-f]{12}\.css/.test(publicShell)) failures.push('single public shell: missing content-addressed framework style');
excludesAll(publicShell, ['#dns', 'panel-legacy', 'Ctrl+K', '搜索'], 'dead public interactions');
includesAll(desktop, ['data-desktop-overview', 'DesktopIncidentDocket', 'DesktopLedger', 'DesktopWanEvidence'], 'desktop console retained');
includesAll(desktopDomain, ['data-desktop-domain-workspace', 'type="search"', 'filterWorkspaceRows', 'sortWorkspaceRows', 'DesktopDomainInspector'], 'desktop object operations');
includesAll(desktopInspector, ['data-desktop-object-detail', 'InterfaceEvidence', 'RouteEvidence', 'LogEvidence', '相邻事件'], 'desktop domain evidence');
excludesAll(operationalPage, ['DataTable', 'panel-section-tables'], 'retired desktop table shell');

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
