const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const failures = [];

function full(file) { return path.join(root, file); }
function exists(file) { return fs.existsSync(full(file)); }
function read(file) {
  if (!exists(file)) {
    failures.push(`Missing required file: ${file}`);
    return "";
  }
  return fs.readFileSync(full(file), "utf8");
}
function assert(condition, message) { if (!condition) failures.push(message); }
function includes(source, needles, label) {
  for (const needle of needles) assert(source.includes(needle), `${label} must include ${needle}`);
}
function excludes(source, needles, label) {
  for (const needle of needles) assert(!source.includes(needle), `${label} must exclude ${needle}`);
}
function lineCount(source) { return source ? source.split(/\r?\n/).length : 0; }
function fontSizes(source) {
  return [...source.matchAll(/font-size\s*:\s*([0-9.]+)px/gi)].map((match) => Number(match[1]));
}

const files = {
  panel: "src/panel-framework/overview/OverviewPanel.tsx",
  mobileHook: "src/panel-framework/mobile/useMobilePanelSurface.ts",
  mobile: "src/panel-framework/mobile/MobilePatrolScreen.tsx",
  mobileLedger: "src/panel-framework/mobile/MobileEvidenceLedger.tsx",
  mobileIncident: "src/panel-framework/mobile/MobileIncidentWorkspace.tsx",
  mobileFocus: "src/panel-framework/mobile/MobileFocusObject.tsx",
  mobileTraffic: "src/panel-framework/mobile/MobilePatrolTraffic.tsx",
  mobileResource: "src/panel-framework/mobile/MobileResourcePressure.tsx",
  mobileDomain: "src/panel-framework/mobile/MobileDomainWorkspace.tsx",
  mobileDomainModel: "src/panel-framework/mobile/mobileDomainWorkspaceModel.ts",
  mobileDomainDefinitions: "src/panel-framework/mobile/mobileDomainDefinitions.ts",
  mobileCss: "src/panel-framework/mobile/mobile-patrol.css",
  mobileDomainCss: "src/panel-framework/mobile/mobile-domain.css",
  nav: "src/panel-framework/sections/PanelTaskNavigation.tsx",
  navCss: "src/panel-framework/sections/section-console.css",
  evidenceModel: "src/panel-framework/overview/evidence-model/buildOverviewEvidenceModel.ts",
  evidenceInstruments: "src/panel-framework/overview/evidence-model/buildOverviewInstruments.ts",
  resourceModel: "src/panel-framework/sections/sectionModels.ts",
  objectIdentity: "src/panel-framework/sections/panelObjectIdentity.ts",
  resourceChart: "src/panel-framework/sections/SectionTimeSeriesChart.tsx",
  resourceChartCss: "src/panel-framework/sections/section-timeseries.css",
  runtime: "src/panel-framework/runtime/usePanelRuntime.ts",
  runtimeChrome: "src/panel-framework/runtime/PanelRuntimeChrome.tsx",
  runtimeSchema: "src/panel-framework/runtime/panelRuntimeSchema.ts",
  timeContract: "src/panel-framework/timeContract.ts",
  main: "src/panel-framework/main.tsx",
  index: "public/index.html",
  desktop: "src/panel-framework/overview/desktop-overview/DesktopOverviewScreen.tsx",
  desktopCss: "src/panel-framework/overview/desktop-overview/styles/desktop-overview.css",
  desktopTokens: "src/panel-framework/overview/desktop-overview/styles/desktop-overview-tokens.css",
  builtCss: "public/assets/framework/style.css",
  builtJs: "public/assets/framework/panel-framework.js",
};
const source = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));
const mobileStyles = [source.mobileCss, source.mobileDomainCss, source.resourceChartCss, source.navCss].join("\n");
const mobileTree = [source.mobile, source.mobileLedger, source.mobileIncident, source.mobileFocus, source.mobileTraffic, source.mobileResource, source.mobileDomain, source.mobileDomainModel, source.mobileDomainDefinitions].join("\n");
const evidenceTruth = [source.evidenceModel, source.evidenceInstruments].join("\n");

includes(source.panel, ["MobilePatrolScreen", "DesktopOverviewScreen", "useMobilePanelSurface", "mobile ?"], "independent overview mount");
includes(source.mobileHook, ['"(max-width: 1180px)"'], "mobile/tablet capability boundary");
excludes(source.panel, ["MobileOverviewScreen", "mobile-overview", "display: none"], "overview mount");

includes(evidenceTruth, [
  "route.active === true && route.disabled !== true",
  'if (mode !== "current" || (risk !== "none" && risk !== "interfaces")) return null',
  '"接口异常期间的 WAN 吞吐"',
  "不证明 Down 接口无影响",
  "if (rowDown === null || rowUp === null) return null",
  'state.facts.interfaces.down > 0) return "interfaces"',
  "for (let index = observed.length - 1; index >= 0 && observed[index] === true; index -= 1)",
], "evidence truth policy");
excludes(evidenceTruth, ["rows[0]", "row.downRate || 0", "row.upRate || 0", "实时可信"], "evidence truth policy");
assert(source.evidenceModel.indexOf('state.facts.interfaces.down > 0) return "interfaces"') < source.evidenceModel.indexOf('if (state.scale === "fleet")'), "real risk must outrank fleet scope");

includes(source.mobile, ["data-mobile-overview", "data-mobile-core-facts", "data-mobile-incident-center", "MobileEvidenceLedger"], "mobile patrol hierarchy");
includes(source.mobileLedger, ["data-mobile-evidence-ledger", "userOverrideRef", "open={open}", "available"], "mobile evidence disclosure");
excludes(source.mobileLedger, ["ledger.open ="], "mobile evidence disclosure");
includes(source.mobileTraffic, ["preserveAspectRatio=\"xMidYMid meet\"", "<title", "<desc", "mp-chart-scale", "mp-chart-time"], "mobile WAN chart");
includes(source.mobileResource, ["preserveAspectRatio=\"xMidYMid meet\"", "role=\"meter\"", "策略阈值", "样本明细"], "mobile resource signal");
includes(source.mobileDomain, [
  "type=\"search\"",
  "mdw-filter-row",
  "mdw-pagination",
  "data-mobile-object-detail",
  "useLayoutEffect",
  "detailTitleRef.current?.focus({ preventScroll: true })",
  "trigger?.focus({ preventScroll: true })",
], "mobile domain workspace");
excludes(source.mobileDomain, ["requestAnimationFrame"], "mobile domain deterministic focus");
includes(source.mobileDomainModel, ['window.addEventListener("popstate"', "window.history.pushState", "rowsFromModel", "workspaceLabel"], "mobile domain state model");
includes(source.mobileDomainDefinitions, ["domainDefinitionFor", "sortWorkspaceRows"], "domain-specific controls");
includes(source.objectIdentity, ["stablePanelObjectId", "panelObjectIdForValues"], "stable mobile object identity");
includes(source.nav, ["概览", "网络", "终端", "日志"], "four stable mobile destinations");
excludes(mobileTree, ["DesktopOverview", "grabber", "bottom-sheet", "topology", 'role="tab"', 'aria-controls='], "mobile rejected patterns");
excludes(mobileStyles, ["!important", "font-size: 11px", "font-size: 10px", "font-size: 9px"], "mobile style contract");
const mobileFontSizes = fontSizes(mobileStyles);
assert(mobileFontSizes.length > 0 && mobileFontSizes.every((size) => size >= 12), `mobile text must be at least 12px; found ${mobileFontSizes.filter((size) => size < 12).join(", ")}`);

includes(source.resourceModel, ["resourceVisualization", "historyTimestamp", "没有配套时间戳时只显示样本摘要，不绘制趋势", "visualization: undefined"], "resource time-series contract");
excludes(source.resourceModel, ['values.map((value) => text(value)).join(" · ")'], "resource model");
includes(source.resourceChart, ["preserveAspectRatio=\"xMidYMid meet\"", "0–100%", "section-series-threshold", "<title", "<desc"], "resource SVG chart");

includes(source.timeContract, ["RFC3339_WITH_TIMEZONE", "parseRfc3339Timestamp"], "frontend time contract");
includes(source.runtimeSchema, ["validateSnapshotTree", "带时区的 RFC 3339", "MAX_SNAPSHOT_COLLECTION_ROWS", "validatePercentage"], "deep runtime schema");
excludes(source.runtime, ['phase: browserOfflineHint ? "offline"', 'return; // navigator.onLine'], "LAN monitoring request policy");
excludes(source.runtimeChrome, ['phase === "offline"'], "runtime phase model");

includes(source.main, ["createRoot", "PanelFrameworkApp", "router-panel-mounted"], "single React shell");
excludes(source.main, ["legacyBridge", "mountRouterOverviewPanel", "preserveLegacyFallback"], "single React shell");
includes(source.index, ['<main id="app"'], "public shell");
excludes(source.index, ["#dns", "panel-legacy", "Ctrl+K", "legacy"], "public shell");

includes(source.desktop, ["data-desktop-overview", "DesktopIncidentDocket", "DesktopLedger", "DesktopWanEvidence"], "desktop console");
includes(source.desktopCss + source.desktopTokens, ["@media (min-width: 1181px)"], "desktop boundary");

const rejected = [
  "src/panel-framework/legacyBridge.ts",
  "src/panel-framework/overview/mobile-overview/MobileOverviewScreen.tsx",
  "src/panel-framework/overview/mobile-overview/MobilePriorityQueue.tsx",
  "src/panel-framework/overview/mobile-overview/MobileWanInstrument.tsx",
  "src/panel-framework/overview/mobile-overview/styles/mobile-overview.css",
  "public/assets/legacy/panel-legacy.js",
  "public/assets/legacy/panel-legacy.css",
  "src/panel-framework/overview/mobile-native/MobileNativeConsole.tsx",
  "src/panel-framework/overview/mobile-native/MobileNativeSheet.tsx",
  "src/panel-framework/overview/mobile-native/MobileNativeTopology.tsx",
];
for (const file of rejected) assert(!exists(file), `rejected UI artifact must remain deleted: ${file}`);

const budgets = [
  [files.panel, source.panel, 100],
  [files.mobile, source.mobile, 240],
  [files.mobileLedger, source.mobileLedger, 90],
  [files.mobileIncident, source.mobileIncident, 90],
  [files.mobileFocus, source.mobileFocus, 40],
  [files.mobileTraffic, source.mobileTraffic, 130],
  [files.mobileResource, source.mobileResource, 140],
  [files.mobileDomain, source.mobileDomain, 420],
  [files.mobileDomainModel, source.mobileDomainModel, 320],
  [files.mobileDomainDefinitions, source.mobileDomainDefinitions, 420],
  [files.objectIdentity, source.objectIdentity, 220],
  [files.evidenceModel, source.evidenceModel, 520],
  [files.evidenceInstruments, source.evidenceInstruments, 220],
  [files.resourceChart, source.resourceChart, 150],
];
for (const [file, body, max] of budgets) assert(lineCount(body) <= max, `${file} exceeds maintainability budget ${max}: ${lineCount(body)}`);

if (source.builtJs) {
  includes(source.builtJs, ["data-mobile-overview", "data-mobile-domain-workspace", "data-desktop-overview", "data-section-time-series"], "built JavaScript");
  excludes(source.builtJs, ["data-mobile-native", "mountRouterOverviewPanel", "MobileOverviewScreen", "preserveAspectRatio=\"none\""], "built JavaScript");
}
if (source.builtCss) {
  includes(source.builtCss, [".mp-shell", ".mdw-shell", ".section-timeseries", ".do-shell"], "built CSS");
  excludes(source.builtCss, [".mo-shell", ".mn-topology"], "built CSS");
  const builtImportant = (source.builtCss.match(/!important/g) || []).length;
  assert(builtImportant === 0, `built CSS must not contain !important overrides: ${builtImportant}`);
}

if (failures.length) {
  console.error("overview architecture gate: FAIL");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`overview architecture gate: PASS mobile=${lineCount(source.mobile)} domain=${lineCount(source.mobileDomain)} evidence=${lineCount(source.evidenceModel)} minMobileText=${Math.min(...mobileFontSizes)}px`);
