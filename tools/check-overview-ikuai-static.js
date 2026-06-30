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
const count = (source, pattern) => (source.match(pattern) || []).length;
const between = (source, start, end) => {
  const startIndex = source.indexOf(start);
  if (startIndex < 0) return '';
  const endIndex = source.indexOf(end, startIndex + start.length);
  return endIndex < 0 ? source.slice(startIndex) : source.slice(startIndex, endIndex);
};

const shellLines = shell.split(/\r?\n/).length;
assert(shellLines <= 140, `public/index.html must stay a thin shell, got ${shellLines} lines`);
assert(shell.includes('/assets/framework'), 'shell must load /assets/framework assets');
assert(shell.includes('data-overview-framework-asset="style"'), 'shell must load framework stylesheet');
assert(shell.includes('data-overview-framework-asset="script"'), 'shell must load framework script');
const inlineBlocks = [...shell.matchAll(/<(script|style)(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/\1>/gi)];
inlineBlocks.forEach((match, index) => {
  const kind = match[1];
  const body = (match[2] || '').trim();
  assert(body.length <= 200, `shell inline ${kind} block #${index + 1} must stay tiny, got ${body.length} chars`);
});
assert(!shell.includes('data-overview-chart-has-current'), 'shell must not contain overview business/chart implementation');
assert(!/function\s+JudgementChart|function\s+OverviewPanel/.test(shell), 'shell must not embed React overview implementation');

[
  'OVERVIEW_IKUAI40_CHART_STANDARD',
  'OVERVIEW_CHART_METADATA_COVERAGE',
  'OVERVIEW_IKUAI40_MATURE_VISUAL_STANDARD',
  'OVERVIEW_SCENE_CHART_CONTRACT',
  'data-overview-chart-has-current="true"',
  'data-overview-chart-has-peak="true"',
  'data-overview-chart-has-mean="true"',
  'data-overview-chart-has-window="true"',
  'data-overview-chart-has-threshold="true"',
  'data-overview-chart-has-trust="true"',
  'data-overview-chart-judgement-strip="current-peak-mean-window-sample-threshold-confidence"',
  'data-overview-y-axis',
  'ik-overview-current-label',
].forEach((needle) => assert(tsx.includes(needle), `chart judgement contract missing ${needle}`));

assert(tsx.includes('data-overview-hard-standard="desktop-chart-state-45plus-mobile-microchart-required-chart-meta-sample-depth-required-no-short-large-card"'), 'hard standard marker missing');
assert(tsx.includes('data-overview-mobile-first-microchart-policy="required-before-detail"'), 'mobile first microchart policy missing');
assert(tsx.includes('data-overview-mobile-first-screen-microchart-required="all-scenes"'), 'all-scene mobile microchart policy missing');
assert(tsx.includes('data-overview-mobile-microchart="true"'), 'mobile microbar chart marker missing');
assert(tsx.includes('data-overview-mobile-no-snapshot-microchart'), 'mobile no-snapshot microchart marker missing');

const noSnapshotBlock = between(tsx, 'function NoSnapshotDesktop', 'function ResourceDesktop');
[
  'no-snapshot-summary',
  'no-snapshot-channel-status',
  'no-snapshot-recent-success',
  'no-snapshot-module-visibility',
  'no-snapshot-summary-chain',
].forEach((needle) => assert(noSnapshotBlock.includes(needle), `no-snapshot must render ${needle}`));
assert(noSnapshotBlock.includes('VisibilityMatrixVisual'), 'no-snapshot must render graphical visibility matrix');
assert(tsx.includes('data-overview-no-snapshot-density-contract={state.scenario === "no-snapshot" ? "chain-ledger-timeline-visibility-judgement-strip"'), 'no-snapshot density contract missing');
assert(tsx.includes('data-overview-no-snapshot-no-stretch-cards={state.scenario === "no-snapshot" ? "auto-height-content"'), 'no-snapshot no-stretch contract missing');
assert(tsx.includes('data-overview-no-snapshot-no-wan-rate-placeholder={state.scenario === "no-snapshot" ? "business-rates-hidden"'), 'no-snapshot no-WAN-rate contract missing');
assert(!/WAN速率|上行 0 B\/s|下行 0 B\/s|0 B\/s/.test(noSnapshotBlock), 'no-snapshot must not fake WAN rate or zero traffic');
assert(noSnapshotBlock.includes('失败端点'), 'no-snapshot must keep failure endpoint in the chain ledger');
assert(noSnapshotBlock.includes('未记录'), 'no-snapshot must keep failure endpoint as 未记录');
assert(count(noSnapshotBlock, /只读边界/g) <= 1, 'no-snapshot must not repeat read-only boundary blocks');

const resourceBlock = between(tsx, 'function ResourceDesktop', 'function InterfacesDesktop');
assert(resourceBlock.includes('resource-risk-priority'), 'resource-full must render danger/resource priority module');
assert(resourceBlock.includes('ResourceTriCards'), 'resource-full must render CPU/MEM/DISK pressure cards');
assert(resourceBlock.includes('resource-pressure-bars'), 'resource-full must render connection/complement pressure bars');
assert(resourceBlock.includes('resource-interface-top5'), 'resource-full must render interface throughput Top5');
assert(!resourceBlock.includes('terminal-rank'), 'resource-full first screen must not spend space on terminal rank');
assert(tsx.includes('data-overview-resource-first-screen={state.scenario === "resource-full" ? "danger-bars-three-metric-ledger-pressure-interface-top5"'), 'resource first-screen structure marker missing');

const collectionBlock = between(tsx, 'function CollectionDesktop', 'function AllOfflineDesktop');
assert(collectionBlock.includes('collection-cache-ledger'), 'collection-down must lead with REST/SSH/snapshot channel bars');
assert(collectionBlock.includes('collection-success-timeline'), 'collection-down must render recent-success timeline');
assert(tsx.includes('data-overview-collection-channel-priority={state.scenario === "collection-down" ? "rest-ssh-snapshot-before-resource"'), 'collection channel priority marker missing');
assert(tsx.includes('data-overview-collection-resource-deferred={state.scenario === "collection-down" ? "true"'), 'collection resource deferred marker missing');

const interfaceBlock = between(tsx, 'function InterfacesDesktop', 'function CollectionDesktop');
const interfaceRowsBlock = between(tsx, 'function interfaceRows', 'function interfaceRelationRows');
assert(interfaceBlock.includes('interface-forwarding'), 'interfaces-down must render forwarding evidence first');
assert(interfaceBlock.includes('interface-relation-carrier'), 'interfaces-down must move parent/bridge/vlan/pppoe details to carrier table');
assert(!interfaceBlock.includes('terminal-rank'), 'interfaces-down first screen must not show terminal rank');
assert(!interfaceRowsBlock.includes('pppoe-out'), 'interface top rows must not squeeze long pppoe relation chains');
assert(tsx.includes('data-overview-interface-relation-policy={state.scenario === "interfaces-down" ? "top-object-status-details-in-carrier-table"'), 'interface relation policy marker missing');

const normalBlock = between(tsx, 'function NormalDesktop', 'function DesktopWorkspace');
assert(normalBlock.includes('traffic-trend'), 'normal desktop must render traffic trend');
assert(normalBlock.includes('WAN Top3'), 'normal traffic ledger must expose WAN Top3');
assert(normalBlock.includes('采样可信度'), 'normal traffic ledger must expose sampling confidence');
assert(normalBlock.includes('最近峰值'), 'normal traffic ledger must expose recent peak');
assert(tsx.includes('data-overview-normal-traffic-under-chart={state.scenario === "single" || state.scenario === "fleet" ? "current-wan-top3-route-sampling-samples-peak-success"'), 'normal under-chart fact strip marker missing');

assert(css.includes('--ro-blue: #3f7fbd'), 'normal/reference chart blue must be muted iKuai blue');
assert(css.includes('--ro-danger: #d93025'), 'danger chart color must use fixed red');
assert(css.includes('--ro-warn: #f08c00'), 'warn chart color must use fixed orange');
assert(css.includes('.ro-chart-readout'), 'chart readout CSS missing');
assert(css.includes('grid-template-columns: 1.08fr .94fr .94fr 1.12fr .96fr .86fr .9fr'), 'chart readout must be visible multi-field strip');
assert(css.includes('border-left: 2px dashed var(--ro-danger)'), 'threshold line must be visually strong');
assert(css.includes('.ro-module[data-overview-three-col-table="true"] .ro-ledger-row'), 'three-column evidence table CSS missing');
assert(css.includes('grid-auto-rows: auto;'), 'desktop grid must use auto rows, not stretched equal-height cards');
assert(css.includes('height: auto;'), 'modules/columns must allow content-sized height');
assert(!/grid-auto-rows:\s*minmax\(0,\s*1fr\)/.test(css), 'desktop modules must not stretch every card to equal height');

assert(predeploy.includes('overviewChartReadabilityOk'), 'local predeploy must include chart readability gate');
assert(predeploy.includes('mobileCoreChartMetaOk'), 'local predeploy must include mobile microchart metadata gate');
assert(predeploy.includes('overviewNoSnapshotNoWanRateCardOk'), 'local predeploy must include no-snapshot WAN-rate redline');

if (failures.length) {
  console.error('overview ikuai static gate: FAIL');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('overview ikuai static gate: PASS');
