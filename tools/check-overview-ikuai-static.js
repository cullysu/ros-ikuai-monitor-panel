const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, ...relativePath.split('/')), 'utf8');

const shell = read('public/index.html');
const tsx = read('src/panel-framework/overview/OverviewPanel.tsx');
const css = read('src/panel-framework/overview/OverviewPanel.css');
const predeploy = read('tools/local-predeploy-check.js');

const failures = [];
const assert = (ok, message) => {
  if (!ok) failures.push(message);
};
const between = (source, start, end) => {
  const startIndex = source.indexOf(start);
  if (startIndex < 0) return '';
  const endIndex = source.indexOf(end, startIndex + start.length);
  return endIndex < 0 ? source.slice(startIndex) : source.slice(startIndex, endIndex);
};
const withoutTitles = (source) => source
  .replace(/title:\s*`[^`]*`/g, '')
  .replace(/title="[^"]*"/g, '')
  .replace(/title=\{[^}]*\}/g, '');

const shellLines = shell.split(/\r?\n/).length;
assert(shellLines <= 140, `public/index.html must stay a thin shell, got ${shellLines} lines`);
assert(shell.includes('/assets/framework'), 'shell must load /assets/framework assets');
assert(shell.includes('data-overview-framework-asset="style"'), 'shell must load framework stylesheet');
assert(shell.includes('data-overview-framework-asset="script"'), 'shell must load framework script');
assert(!/function\s+JudgementChart|function\s+OverviewPanel/.test(shell), 'shell must not embed React overview implementation');

const visibleSource = withoutTitles(tsx);
const noSnapshotDesktop = between(tsx, 'function NoSnapshotDesktop', 'function ResourceDesktop');
const appHomeBlock = between(tsx, 'function MobileLedger', 'function ledgerRowToPlainCells');
const bottomTabsBlock = between(tsx, 'function MobileBottomTabs', 'function flatDuration');
const appHomeCss = css.slice(Math.max(
  css.lastIndexOf('Final app-home tightening'),
  css.lastIndexOf('App-home final pass')
));

assert(tsx.includes('MobileIosTopNav'), 'mobile iOS top nav component missing');
assert(tsx.includes('MobileHeroStatusCard'), 'mobile app-home hero card component missing');
assert(tsx.includes('mobileTwinCards'), 'mobile app-home WAN/collection twin cards component missing');
assert(tsx.includes('MobileRingMetrics'), 'mobile app-home KPI ring component missing');
assert(tsx.includes('MobileTrafficRank'), 'mobile app-home visual/rank component missing');
assert(tsx.includes('MobileBottomTabs'), 'mobile app-home bottom tab component missing');

assert(tsx.includes('data-overview-mobile-ios-nav="true"'), 'mobile iOS nav data marker missing');
assert(tsx.includes('data-overview-mobile-app-home="ikuai40-ios-router-home"'), 'mobile app-home marker missing');
assert(tsx.includes('data-overview-mobile-home-mode="ios-app-home"'), 'mobile app-home mode marker missing');
assert(tsx.includes('data-overview-mobile-home-layout="ios-topnav-network-hero-twin-cards-resource-exception-rank-tabs"'), 'mobile app-home layout marker missing');
assert(tsx.includes('data-overview-mobile-first-screen="app-home"'), 'mobile first-screen app-home marker missing');
assert(tsx.includes('data-overview-mobile-first-screen-contract="ios-topnav-network-hero-traffic-metrics-twin-cards-resource-exception-rank-bottom-tab"'), 'mobile first-screen contract marker missing');
assert(tsx.includes('data-overview-mobile-first-screen-no-table="true"'), 'mobile first-screen no-table marker missing');
assert(tsx.includes('data-overview-mobile-first-screen-uses-microchart="true"'), 'mobile first-screen microchart marker missing');
assert(tsx.includes('data-overview-mobile-no-desktop-collapse="true"'), 'mobile app-home must not be desktop/table collapse');
assert(tsx.includes('data-overview-mobile-hero-metrics="download-upload-latency-connections"'), 'mobile hero must expose download/upload/latency/connections metrics');
assert(!tsx.includes('MobileMetricGrid'), 'mobile app-home must not keep the old KPI grid component');
assert(!tsx.includes('data-overview-mobile-kpi-grid'), 'mobile app-home must not keep the old 2x2 KPI grid marker');
assert(!tsx.includes('data-overview-mobile-kpi2x2'), 'mobile app-home must not keep the old kpi2x2 marker');
assert(!appHomeBlock.includes('data-overview-mobile-flat-table') && !/role="table"/.test(appHomeBlock), 'mobile app-home first block must not be flat-ledger/table collapse');

assert(tsx.includes('ik-ios-top-nav'), 'mobile iOS router nav marker missing');
assert(tsx.includes('ik-ios-hero-card'), 'mobile iOS hero marker missing');
assert(tsx.includes('ik-ios-rings-card'), 'mobile iOS rings marker missing');
assert(tsx.includes('ik-ios-rank-card'), 'mobile iOS rank marker missing');
assert(tsx.includes('ik-ios-bottom-tab'), 'mobile iOS bottom tab marker missing');
assert(tsx.includes('ik-mobile-twin-cards'), 'mobile WAN/collection twin card group missing');
assert(tsx.includes('ik-mobile-twin-card'), 'mobile WAN/collection twin card items missing');
assert(tsx.includes('ik-mobile-spark-line'), 'mobile thin sparkline missing');
assert(tsx.includes('ik-ios-ring-grid'), 'mobile ring metric grid missing');
assert(tsx.includes('ik-ios-resource-card'), 'mobile thin resource card missing');
assert(tsx.includes('ik-ios-resource-row'), 'mobile thin resource rows missing');
assert(tsx.includes('ik-ios-rank-row'), 'mobile app-style traffic/rank rows missing');
assert(tsx.includes('data-overview-mobile-first-visual="scenario-insight"'), 'mobile scenario visual marker missing');
['首页', 'WAN', '接口', '资源', '日志'].forEach((label) => {
  assert(bottomTabsBlock.includes(label), `mobile bottom tabs must include ${label}`);
});
['处理器', '内存', '磁盘'].forEach((label) => {
  assert(visibleSource.includes(label), `visible resource copy must use Chinese ${label}`);
});

assert(!/\bMEM\b|\bDISK\b/.test(visibleSource), 'visible overview copy must use Chinese memory/disk labels, not MEM/DISK');
assert(!/active\s+(?:true|false)|disabled\s+(?:true|false)/i.test(appHomeBlock), 'visible app-home summaries must not expose raw RouterOS booleans');
assert(tsx.includes('爱快路由'), 'desktop evidence must keep iKuai backend identity visible');
assert(/处理器|内存|磁盘/.test(visibleSource) && /RouterOS|REST|SSH/.test(noSnapshotDesktop), 'desktop evidence must keep router resource labels and backend evidence visible');
assert(!/WAN\s*速率|WAN速率/.test(noSnapshotDesktop), 'no-snapshot desktop must not fake WAN speed');
assert(!/\b0\s*B\/s\b|\b0\s*Bps\b|\b0Bps\b/i.test(noSnapshotDesktop), 'no-snapshot desktop must not show 0Bps/0 B/s as unavailable data');
assert(tsx.includes('data-overview-scene-key={state.scenario}'), 'overview scene key marker missing');
assert(tsx.includes('data-overview-scene-chart-priority={OVERVIEW_SCENE_CHART_PRIORITY}'), 'overview scene chart priority marker missing');
[
  'traffic-mini-line',
  'resource-mini-trend',
  'collection-status-line',
  'snapshot-channel-matrix',
  'interface-chain',
  'wan-port-matrix',
].forEach((marker) => {
  assert(tsx.includes(marker), `mobile scenario visual marker missing ${marker}`);
});

assert(appHomeCss.includes('.ik-ios-top-nav'), 'iOS top nav CSS missing');
assert(appHomeCss.includes('.ik-ios-hero-card'), 'iOS hero CSS missing');
assert(appHomeCss.includes('.ik-ios-rings-card'), 'iOS rings CSS missing');
assert(appHomeCss.includes('.ik-mobile-twin-cards'), 'iOS twin-card CSS missing');
assert(appHomeCss.includes('.ik-ios-resource-card'), 'iOS resource-card CSS missing');
assert(appHomeCss.includes('.ik-ios-resource-row'), 'iOS resource-row CSS missing');
assert(appHomeCss.includes('.ik-ios-rank-card'), 'iOS rank CSS missing');
assert(appHomeCss.includes('.ik-ios-bottom-tab'), 'iOS bottom tab CSS missing');

assert(predeploy.includes('overviewMobile390AppHomeFirstOk'), 'predeploy must require mobile app-home first screen');
assert(predeploy.includes('overviewMobile390FirstTwoRowsVisibleOk'), 'predeploy must verify first two detail rows');
assert(predeploy.includes('overviewMobile390FirstScreenNoTableOk'), 'predeploy must reject first-screen table visuals');
assert(predeploy.includes('overviewMobile390NoRawBooleanCopyOk'), 'predeploy must reject raw RouterOS booleans');
assert(predeploy.includes('overviewMobile390BottomTabOk'), 'predeploy must keep the bottom tab visible');
assert(predeploy.includes('.ik-ios-top-nav, .ik-ios-hero-card, .ik-mobile-twin-cards, .ik-ios-resource-card, .ik-ios-rank-card, .ik-ios-bottom-tab'), 'predeploy must probe app-home chrome nodes');
assert(predeploy.includes('mobile390AppHomeTwinOk'), 'predeploy must require app-home WAN/collection twin cards instead of 2x2 KPI');
assert(predeploy.includes('mobile390AppHomeHeroMetricsOk'), 'predeploy must require app-home hero metrics');
assert(predeploy.includes('mobile390AppHomeResourceCardOk'), 'predeploy must require app-home resource card');
assert(predeploy.includes('mobile390AppHomeRankCardOk'), 'predeploy must require app-home rank card');
assert(predeploy.includes('mobile390AppHomeBottomTabOk'), 'predeploy must require app-home bottom tab');
assert(predeploy.includes('overviewMobile390NoKpi2x2Ok') && predeploy.includes('mobile390Kpi2x2MarkerNodes'), 'predeploy must reject visible mobile 2x2 KPI markers');
assert(predeploy.includes('overviewMobile390NoOldKpiStackOk'), 'predeploy must reject old mobile KPI field-stack visuals');
assert(!predeploy.includes('mobile390AppHomeKpiOk') && !predeploy.includes('hasKpi2x2'), 'predeploy must not keep old kpi2x2 mobile gate names');
assert(predeploy.includes('overviewDesktopNoMobileAppChromeOk'), 'predeploy must reject mobile app chrome leaking into desktop');
assert(predeploy.includes('overviewDesktopNoToyNavLeakOk'), 'predeploy must reject mobile toy nav leakage on desktop');
assert(predeploy.includes('overviewDesktopHierarchyMarkerOk'), 'predeploy must require desktop conclusion/key-metric/evidence hierarchy markers');
assert(predeploy.includes('overviewDesktopRightFillOk'), 'predeploy must require desktop right-fill coverage');
assert(predeploy.includes('overviewDesktopTopBandOk'), 'predeploy must require a filled desktop top band');
assert(predeploy.includes('overviewDesktopChartReadabilityOk'), 'predeploy must require desktop chart readability and meaningful chart sizing');
assert(predeploy.includes('nodeVisibleInViewport'), 'predeploy must evaluate fixed/sticky bottom tab as viewport chrome');
assert(predeploy.includes('overviewMobile390NoAppHomeTitleClipOk'), 'predeploy must reject title overlap risk / ellipsis on app-home core text');
assert(predeploy.includes('[data-overview-mobile-primary-title]') && predeploy.includes('.ik-ios-nav-title'), 'predeploy must probe app-home titles for clipping risk');
assert(predeploy.includes('mobile390ScenarioVisualNotDecorativeOk'), 'predeploy must reject purely decorative scenario visuals');
assert(predeploy.includes('mobile390ScenarioVisualRecords'), 'predeploy must record scenario visual evidence');
assert(predeploy.includes('mobile390MainProgressBarRecords') && predeploy.includes('height >= 6'), 'predeploy must reject coarse main progress bars');
assert(predeploy.includes('mobile390Kpi2x2GeometryRecords'), 'predeploy must detect visible 2x2 KPI geometry, not just markers');
assert(predeploy.includes('requestedMobile390x844') && predeploy.includes('window.innerWidth >= 375') && predeploy.includes('window.innerWidth <= 430'), 'predeploy must target the 390x844 mobile viewport with browser-tolerant bounds');

assert(!/\ufffd/.test(visibleSource), 'overview source contains replacement characters');
assert(!/\ufffd/.test(appHomeCss), 'final app-home CSS contains replacement characters');

if (failures.length) {
  console.error('overview ikuai static gate: FAIL');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('overview ikuai static gate: PASS');
