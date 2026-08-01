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
  mobileIncidentCenter: "src/panel-framework/mobile/MobilePatrolIncidentCenter.tsx",
  mobileNextEvidenceSlots: "src/panel-framework/mobile/MobileTabletNextEvidenceSlots.tsx",
  mobileNextEvidence: "src/panel-framework/mobile/MobileTabletNextEvidence.tsx",
  mobileProof: "src/panel-framework/mobile/MobileProofStrip.tsx",
  mobileLedger: "src/panel-framework/mobile/MobileEvidenceLedger.tsx",
  mobileIncident: "src/panel-framework/mobile/MobileIncidentWorkspace.tsx",
  mobileConcurrent: "src/panel-framework/mobile/MobileConcurrentRiskQueue.tsx",
  mobileFocus: "src/panel-framework/mobile/MobileFocusObject.tsx",
  mobileSteadyDecisions: "src/panel-framework/mobile/MobileSteadyDecisionLedger.tsx",
  mobileTraffic: "src/panel-framework/mobile/MobilePatrolTraffic.tsx",
  mobileResource: "src/panel-framework/mobile/MobileResourcePressure.tsx",
  mobileResourceHistory: "src/panel-framework/mobile/MobileResourceHistory.tsx",
  mobileObjects: "src/panel-framework/mobile/MobileObjectDetails.tsx",
  mobileDomain: "src/panel-framework/mobile/MobileDomainWorkspace.tsx",
  mobileCollectionLedger: "src/panel-framework/mobile/MobileCollectionLedger.tsx",
  mobileInspector: "src/panel-framework/mobile/mobile-inspector/MobileDomainInspector.tsx",
  mobileRelatedRail: "src/panel-framework/mobile/mobile-inspector/MobileRelatedObjectRail.tsx",
  resourceInspector: "src/panel-framework/mobile/mobile-inspector/ResourceInspector.tsx",
  diagnosticInspector: "src/panel-framework/mobile/mobile-inspector/DiagnosticInspector.tsx",
  networkInspectors: "src/panel-framework/mobile/mobile-inspector/NetworkInspectors.tsx",
  terminalLogInspectors: "src/panel-framework/mobile/mobile-inspector/TerminalLogInspectors.tsx",
  securityDnsInspectors: "src/panel-framework/mobile/mobile-inspector/SecurityDnsInspectors.tsx",
  sectionRowEvidence: "src/panel-framework/sections/sectionRowEvidence.ts",
  sectionRowEvidenceTypes: "src/panel-framework/sections/sectionRowEvidenceTypes.ts",
  serviceLogEvidence: "src/panel-framework/sections/serviceLogEvidence.ts",
  serviceLogEvidenceTypes: "src/panel-framework/sections/serviceLogEvidenceTypes.ts",
  diagnosticModel: "src/panel-framework/sections/diagnosticFailureModel.ts",
  interfaceAssessment: "src/panel-framework/sections/interfaceOperationalAssessment.ts",
  mobileDomainModel: "src/panel-framework/mobile/mobileDomainWorkspaceModel.ts",
  mobileDomainDefinitions: "src/panel-framework/mobile/mobileDomainDefinitions.ts",
  mobileCss: "src/panel-framework/mobile/mobile-patrol.css",
  mobileFoundationCss: "src/panel-framework/mobile/mobile-patrol-foundation.css",
  mobileTabletCss: "src/panel-framework/mobile/mobile-tablet-layout.css",
  mobileDomainCss: "src/panel-framework/mobile/mobile-domain.css",
  mobileDomainFoundationCss: "src/panel-framework/mobile/mobile-domain-foundation.css",
  mobileCollectionLedgerCss: "src/panel-framework/mobile/mobile-collection-ledger.css",
  nav: "src/panel-framework/sections/PanelTaskNavigation.tsx",
  navCss: "src/panel-framework/sections/section-console.css",
  derive: "src/panel-framework/overview/deriveOverviewState.ts",
  evidenceModel: "src/panel-framework/overview/evidence-model/buildOverviewEvidenceModel.ts",
  comparisonBuilder: "src/panel-framework/overview/evidence-model/buildOverviewComparisonObjects.ts",
  operationalDecisions: "src/panel-framework/overview/evidence-model/buildOverviewOperationalDecisions.ts",
  evidenceTypes: "src/panel-framework/overview/evidence-model/overviewEvidenceTypes.ts",
  investigationActions: "src/panel-framework/overview/evidence-model/buildOverviewInvestigationActions.ts",
  riskQueue: "src/panel-framework/overview/evidence-model/buildOverviewRiskQueue.ts",
  evidenceInstruments: "src/panel-framework/overview/evidence-model/buildOverviewInstruments.ts",
  resourceHistorySamples: "src/panel-framework/overview/evidence-model/resourceHistorySamples.ts",
  resourceTimeSeries: "src/panel-framework/sections/resourceTimeSeries.ts",
  resourceModel: "src/panel-framework/sections/sectionModels.ts",
  objectIdentity: "src/panel-framework/sections/panelObjectIdentity.ts",
  resourceChart: "src/panel-framework/sections/SectionTimeSeriesChart.tsx",
  timeSeriesGeometry: "src/panel-framework/sections/timeSeriesGeometry.ts",
  resourceChartCss: "src/panel-framework/sections/section-timeseries.css",
  runtime: "src/panel-framework/runtime/usePanelRuntime.ts",
  runtimeChrome: "src/panel-framework/runtime/PanelRuntimeChrome.tsx",
  runtimeSchema: "src/panel-framework/runtime/panelRuntimeSchema.ts",
  timeContract: "src/panel-framework/timeContract.ts",
  main: "src/panel-framework/main.tsx",
  index: "public/index.html",
  desktop: "src/panel-framework/overview/desktop-overview/DesktopOverviewScreen.tsx",
  desktopModel: "src/panel-framework/overview/desktop-overview/desktopOverviewModel.ts",
  desktopIncident: "src/panel-framework/overview/desktop-overview/DesktopIncidentDocket.tsx",
  desktopTask: "src/panel-framework/overview/desktop-overview/DesktopOverviewTask.tsx",
  desktopCss: "src/panel-framework/overview/desktop-overview/styles/desktop-overview.css",
  desktopTokens: "src/panel-framework/overview/desktop-overview/styles/desktop-overview-tokens.css",
  desktopResponsiveCss: "src/panel-framework/overview/desktop-overview/styles/desktop-overview-responsive.css",
  connectionCss: "src/panel-framework/connection/router-connection.css",
  runtimeCss: "src/panel-framework/runtime/panel-runtime.css",
  operationalPage: "src/panel-framework/sections/OperationalSectionPage.tsx",
  desktopDomain: "src/panel-framework/sections/DesktopDomainWorkspace.tsx",
  desktopInspector: "src/panel-framework/sections/DesktopDomainInspector.tsx",
  desktopDomainCss: "src/panel-framework/sections/desktop-domain.css",
  builtCss: "public/assets/framework/style.css",
  builtJs: "public/assets/framework/panel-framework.js",
};
const source = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));
const frameworkManifest = (() => {
  try { return JSON.parse(read("public/assets/framework/manifest.json")); }
  catch { return null; }
})();
const desktopStyleFile = frameworkManifest?.assets?.desktopStyle?.file;
source.desktopBuiltCss = typeof desktopStyleFile === "string"
  ? read(`public/assets/framework/${desktopStyleFile}`)
  : "";
const mobileStyles = [source.mobileFoundationCss, source.mobileCss, source.mobileTabletCss, source.mobileDomainFoundationCss, source.mobileDomainCss, source.mobileCollectionLedgerCss, source.resourceChartCss, source.navCss].join("\n");
const mobileTree = [source.mobile, source.mobileIncidentCenter, source.mobileNextEvidenceSlots, source.mobileNextEvidence, source.mobileProof, source.mobileLedger, source.mobileIncident, source.mobileConcurrent, source.mobileFocus, source.mobileSteadyDecisions, source.mobileTraffic, source.mobileResource, source.mobileResourceHistory, source.mobileDomain, source.mobileCollectionLedger, source.mobileInspector, source.mobileRelatedRail, source.resourceInspector, source.diagnosticInspector, source.networkInspectors, source.terminalLogInspectors, source.securityDnsInspectors, source.mobileDomainModel, source.mobileDomainDefinitions].join("\n");
const evidenceTruth = [source.derive, source.evidenceModel, source.riskQueue, source.evidenceInstruments, source.resourceHistorySamples, source.interfaceAssessment].join("\n");

includes(source.panel, ["MobilePatrolScreen", "DesktopOverviewScreen", "useMobilePanelSurface", "mobile ?"], "independent overview mount");
includes(source.mobileHook, ['"(max-width: 1199px)"', 'COMPACT_TASK_QUERY', 'TABLET_WORKBENCH_QUERY'], "mobile/tablet capability boundary");
excludes(source.mobileHook, ["wideTablet", "window.innerWidth >= 900"], "overview ownership must not depend on a 900px viewport fork");
excludes(source.panel, ["MobileOverviewScreen", "mobile-overview", "display: none"], "overview mount");
excludes(source.mobile, ["visiblePriorityObjects[0]"], "mobile incident preview must not use array position");
excludes(source.desktopTask, ["objects[0]"], "desktop incident preview must not use array position");
includes(source.investigationActions, ["export function overviewNavigationRisk"], "shared overview risk navigation decision");
includes(source.mobile, ["overviewNavigationRisk(model.investigationActions, route)"], "mobile direct object risk context");
includes(source.desktopTask, ["overviewNavigationRisk(model.investigationActions, selected.route)"], "desktop direct object risk context");
excludes(source.mobile, ["const comparisonObjects: MobileObjectLink[]", 'id: "terminals"', 'id: "connections"', 'title="运行对象" landmark="object-details"'], "mobile comparison must not be an aggregate directory or duplicate object ledger");
excludes(source.mobile, ["const ledgerInPrimary"], "mobile responsive task ownership must not be viewport-boolean routing");
includes(source.mobileIncident, ["aria-current"], "incident object selection must expose current-item semantics");
excludes(source.mobileIncident, ["aria-pressed"], "incident object selection must not masquerade as a toggle");
excludes(source.mobile, [
  "model.coverageObjects",
  "objectListTitle",
  "objectListLandmark",
  "title={objectListTitle}",
  "landmark={objectListLandmark}",
], "mobile Overview must not become the complete Fleet object browser");
includes(source.mobile, [
  "rows={model.comparisonObjects}",
  'state.scale === "fleet"',
  "MobilePatrolActions",
], "mobile Comparison and dense-scope handoff composition");
includes(source.mobile, [
  "MobileFocusDossier",
  'className="mp-tablet-steady"',
  'className="mp-tablet-steady-support"',
  "tablet && !incident",
], "tablet steady Focus-Signal workbench composition");
includes(source.mobileFocus, [
  "export function MobileFocusDossier",
  'className="mp-route-dossier"',
  "object.attributes.map",
], "tablet route dossier owns novel Focus evidence");
includes(source.mobileCss + source.mobileTabletCss, [
  ".mp-tablet-steady",
  ".mp-route-dossier",
  ".mp-tablet-steady-support",
], "tablet steady workbench styles");
includes(source.operationalDecisions, [
  "export function buildOverviewOperationalDecisions",
  '"decision-interfaces"',
  '"decision-resource"',
  '"decision-connections"',
  'state.scale !== "fleet"',
  'mode !== "current" || risk !== "none"',
], "shared normal operational decision semantics");
includes(source.evidenceTypes, [
  "export interface OverviewOperationalDecision",
  "secondaryDecisions: OverviewOperationalDecision[]",
], "shared secondary-decision contract");
includes(source.evidenceModel, [
  "buildOverviewOperationalDecisions",
  "secondaryDecisions:",
], "evidence model owns secondary decisions");
includes(source.mobileSteadyDecisions, [
  "export function MobileSteadyDecisionLedger",
  'className="mp-steady-decisions"',
  "rows.map",
  'className="mp-decision-ledger"',
  'data-overview-task-landmark="decision-ledger"',
  "onOpen(row.route, row.targetObjectId || null, row.id)",
], "phone/tablet secondary decision renderer");
excludes(source.mobileSteadyDecisions, ["MobileObjectList"], "decision ledger must own its section rather than wrap a generic object list");
includes(source.mobile, [
  "MobileSteadyDecisionLedger",
  "model.secondaryDecisions",
  'className="mp-tablet-route-column"',
], "tablet route column consumes shared secondary decisions");
excludes(source.mobile + source.mobileSteadyDecisions, ["snapshot."], "tablet secondary decisions must not derive raw snapshot");
includes(source.desktopModel, ["evidence.secondaryDecisions"], "desktop consumes shared operational decisions");
excludes(source.desktopModel, ["function operationalRows("], "desktop-local operational truth must be removed");
const mobileFoundationStyles = source.mobileFoundationCss + "\n" + source.mobileCss;
const baseTrafficBodyRule = mobileFoundationStyles.match(/\n  \.mp-traffic-body \{([^}]*)\}/)?.[1] || "";
const baseFocusSignalRule = mobileFoundationStyles.match(/\n  \.mp-focus-signal \{([^}]*)\}/)?.[1] || "";
assert(baseTrafficBodyRule.includes("grid-template-columns: 1fr"), "phone Signal base must keep the historical plot in one column");
assert(baseFocusSignalRule.includes("repeat(2, minmax(0, 1fr))"), "current route stage must present two rate cells side by side");
excludes(source.mobileCss, [
  ".mp-workspace-body.is-normal",
], "generic normal tablet split must be deleted rather than patched beside the Focus-Signal owner");
excludes(source.mobile, [
  "snapshot.",
  "coverageObjects",
], "tablet presentation must consume shared evidence rather than raw snapshot or complete coverage");
includes(source.mobileObjects, [
  'heading: string',
  "aria-label={heading}",
  'taskLandmark?: "comparison"',
  'data-overview-task-landmark={taskLandmark}',
  "id={row.id}",
  "onOpen(row.route, row.targetObjectId || null, row.id)",
], "mobile Comparison owns one semantic task and exact return focus");
excludes(source.mobileObjects, ["title:", "landmark:"], "mobile Comparison must not accept Fleet presentation aliases");
includes(source.investigationActions, [
  "scale",
  'risk === "none" && scale === "fleet"',
  '"进入网络工作区"',
  '"WAN、接口与路由对象"',
], "typed Fleet collection handoff");
excludes(source.mobileCss, [".mp-load > div > button:nth-"], "mobile object membership must not be hidden by CSS position");
excludes(source.mobile, ["buildOverviewComparisonObjects"], "mobile renderer must consume shared object semantics");
excludes(source.desktop, ['title="运行对象"'], "desktop comparison must not duplicate real objects under another title");
includes(source.desktop, ['title="对象比较"', 'rows={view.objectRows}', 'taskLandmark="comparison"'], "desktop real object comparison responsibility");
includes(source.desktopModel, ['state.scale === "fleet" ? evidence.coverageObjects : evidence.comparisonObjects'], "desktop coverage/comparison ownership");
includes(source.evidenceTypes, ["coverageObjects: OverviewComparisonObject[]", "comparisonObjects: OverviewComparisonObject[]"], "named object semantic sets");
excludes(source.comparisonBuilder, [".slice("], "comparison candidate normalization must remain lossless");
includes(source.evidenceModel, [
  'const coverageObjects = mode === "current" ? buildOverviewComparisonObjects(snapshot) : []',
  'scale === "fleet"',
  "comparisonObjects: comparisonObjectsFor(coverageObjects",
], "shared coverage/comparison semantic split");

includes(evidenceTruth, [
  "route.active === true && route.disabled !== true",
  'if (mode !== "current" || (risk !== "none" && risk !== "interfaces" && risk !== "interface-review")) return null',
  '"接口依赖异常期间的 WAN 吞吐"',
  "不证明未运行接口已经影响或没有影响业务",
  "if (rowDown === null || rowUp === null) return null",
  'state.facts.interfaces.confirmedRisk > 0) queue.push({',
  'state.facts.interfaces.impactUnverified > 0) queue.push({',
  'if (!route && !state.facts.wan.allOffline) queue.push({',
  'const risk: OverviewEvidenceRisk = riskQueue[0]?.risk || "none"',
  'observedBoolean(route.disabled) === false',
  'disabled === false && enabledDefaultRouteDependencies.length > 0',
  '"enabled-default-route-not-running"',
  '"impact-not-established"',
  "for (let index = points.length - 1; index >= 0 && points[index].value >= threshold; index -= 1) trailing += 1",
  "Math.abs(latestValue - current) > 1",
  "Math.abs(currentAt - latest.timestamp) > maxAge",
  "if (value === null) break",
], "evidence truth policy");
excludes(evidenceTruth, ["rows[0]", "row.downRate || 0", "row.upRate || 0", "实时可信"], "evidence truth policy");
const orderedRiskTokens = ['risk: "wan"', 'risk: "interfaces"', 'risk: "resource"', 'risk: "interface-review"', 'risk: "route"'];
for (let index = 1; index < orderedRiskTokens.length; index += 1) {
  assert(source.riskQueue.indexOf(orderedRiskTokens[index - 1]) < source.riskQueue.indexOf(orderedRiskTokens[index]), "risk queue must preserve WAN, confirmed interface, resource, review, and route priority");
}

includes(source.mobile + source.mobileIncidentCenter, ["data-mobile-overview", "MobileProofStrip", "data-mobile-incident-center", "MobileEvidenceLedger"], "mobile patrol hierarchy");
includes(source.mobileProof, ["data-mobile-core-facts", "data-mobile-core-fact", "data-overview-task-focus=\"facts\""], "mobile proof ownership");
includes(source.mobileConcurrent, ["data-mobile-secondary-risks", "data-mobile-secondary-risk", "data-mobile-destination", "tasks.map", "mp-incident-row", "mp-incident-mark", "mp-incident-copy"], "mobile concurrent risk queue");
excludes(source.mobileConcurrent, ["mobile-concurrent-risk.css"], "mobile concurrent risk queue ownership");
includes(source.desktopIncident, ["do-task-focus", "do-task-focus-grid", "model.riskQueue.slice(1)"], "desktop concurrent risk queue");
excludes(source.desktop, ["desktop-overview-concurrent-risks.css"], "desktop concurrent risk queue ownership");
includes(source.mobileLedger, ["data-mobile-evidence-ledger", "data-mobile-evidence-row", "userOverrideRef", "open={open}", "availableHeight", "requiredHeight", "ResizeObserver"], "mobile evidence disclosure");
excludes(source.mobileLedger, ["ledger.open ="], "mobile evidence disclosure");
includes(source.mobileTraffic, ["preserveAspectRatio=\"xMidYMid meet\"", "<title", "<desc", "mp-chart-scale", "mp-chart-time"], "mobile WAN chart");
includes(source.mobileResource, ['role={observed ? "meter"', "aria-valuenow={rounded ?? undefined}", "策略阈值", "data-mobile-resource-signal"], "mobile current resource signal");
includes(source.mobileResourceHistory, ["data-mobile-resource-history", "SectionTimeSeriesChart", "embedded", "nativeEvent.isTrusted", "requestAnimationFrame", 'scrollIntoView({ block: "center", behavior: "auto" })'], "mobile resource history");
excludes(source.mobileResourceHistory, ["mp-resource-samples", "逐点样本"], "mobile resource history replay subtraction");
excludes(source.mobileResourceHistory, ["data-resource-latest-sample", "最新可信样本"], "mobile resource history must not replay the latest reading outside the evidence table");
includes(source.mobileDomain, [
  "type=\"search\"",
  "mdw-filter-row",
  "mdw-pagination",
  "MobileDomainInspector",
  "mdw-tools-toggle",
  "useLayoutEffect",
  "detailTitleRef.current?.focus({ preventScroll: true })",
  "rowRefs.current.get(lastTriggerRef.current)?.focus({ preventScroll: true })",
], "mobile domain workspace");
includes(source.mobileInspector, ["data-mobile-object-detail", "data-domain-inspector-kind", "DomainInspectorBody", "EvidenceBoundary"], "mobile domain inspector");
includes(source.resourceInspector, ["ResourceInspector", "变化证据", "样本范围", "采样来源", "原始对象身份"], "resource object evidence dossier");
excludes(source.resourceInspector, ["<InspectorReadings", 'title="当前越阈判断"', "连续证据"], "resource object evidence novelty");
includes(source.diagnosticModel, ["export function diagnosticChannelLabel", "export function diagnosticFailureLabel", "diagnosticChannelSummaries", "diagnosticFailureRows"], "shared diagnostic channel ownership");
includes(source.diagnosticInspector, ["diagnosticChannelLabel", "diagnosticFailureLabel(current)", 'title="记录范围"'], "object-first diagnostic inspector");
excludes(source.diagnosticInspector + source.desktopInspector, ["function diagnosticChannelLabel", 'title="端点路径"'], "diagnostic hierarchy ownership");
includes(source.networkInspectors, ["InterfaceInspector", "RouteInspector", "依赖与路由", "链路质量", "关联接口"], "network domain inspectors");
includes(source.terminalLogInspectors, ["TerminalInspector", "LogInspector", "DHCP / ARP 证据", "事件证据", "相邻事件"], "terminal and log inspectors");
excludes(source.terminalLogInspectors, ['title="事件记录"'], "log inspector event identity ownership");
includes(source.securityDnsInspectors, ["SecurityInspector", "DnsInspector", "匹配条件", "DNS 配置边界"], "security and DNS inspectors");
includes(source.sectionRowEvidenceTypes, ['"interface"', '"route"', '"terminal"', '"log"', '"security"', '"dns"', "defaultRouteRelation", "relatedInterface", "neighbors"], "typed row evidence");
includes(source.sectionRowEvidence + source.serviceLogEvidence, ["buildRouteEvidence", "interfaceRelation", "LogNeighborEvidence", "candidate.item !== row"], "domain relation evidence builders");
excludes(source.mobileDomain + source.mobileInspector, ["<dl", "mdw-detail-fields", "DetailPane"], "domain inspector architecture");
excludes(source.mobileDomain, ["requestAnimationFrame"], "mobile domain deterministic focus");
includes(source.mobileDomainModel, ['window.addEventListener("popstate"', "window.history.pushState", "rowsFromModel", "workspaceLabel"], "mobile domain state model");
includes(source.mobileDomainDefinitions, ["domainDefinitionFor", "sortWorkspaceRows"], "domain-specific controls");
includes(source.mobileDomainCss, [
  '[data-mobile-domain-workspace="trafficLoad"].is-tablet-workbench:not(.is-large-text) .mdw-header',
  '"title status"',
  '"tabs tabs"',
  "min-height: 44px",
], "tablet resource header compacts chrome without shrinking touch targets or large text");
includes(source.objectIdentity, ["stablePanelObjectId", "panelObjectIdForValues"], "stable mobile object identity");
includes(source.nav, ["概览", "网络", "终端", "日志"], "four stable mobile destinations");
excludes(mobileTree, ["DesktopOverview", "grabber", "bottom-sheet", "topology", 'role="tab"'], "mobile rejected patterns");
includes(source.mobileDomain, ['aria-controls="mdw-domain-controls"', 'role="group"'], "mobile filter disclosure relationship");
excludes(mobileStyles, ["!important", "font-size: 11px", "font-size: 10px", "font-size: 9px"], "mobile style contract");
const mobileFontSizes = fontSizes(mobileStyles);
assert(mobileFontSizes.length > 0 && mobileFontSizes.every((size) => size >= 12), `mobile text must be at least 12px; found ${mobileFontSizes.filter((size) => size < 12).join(", ")}`);

includes(source.resourceModel, ["resourceEvidenceWindow(snapshot)", "const resourceMetrics", "points.map", "resourceTimeSeries({ metrics: resourceMetrics })", "没有配套时间戳时只显示样本摘要，不绘制趋势", "visualization: undefined"], "resource time-series contract");
excludes(source.resourceModel, ["function resourceVisualization"], "resource time-series shared ownership");
includes(source.resourceHistorySamples, ["hasOwnProperty.call(history, \"resourceSamples\")", 'sample.evidenceMode !== "current"', "timestamp <= points[points.length - 1].timestamp", "resourceEvidenceWindow"], "atomic resource history contract");
includes(source.resourceHistorySamples, [
  "export function compareResourceRisk",
  "right.trailing - left.trailing",
  "(right.latest as number) - (left.latest as number)",
], "shared resource priority comparator");
includes(source.evidenceModel, [
  "compareResourceRisk",
  "window.metrics[left.key].evidence",
  "window.metrics[right.key].evidence",
], "overview primary consumes shared resource priority");
includes(source.evidenceInstruments, [
  "compareResourceRisk",
  "window.metrics[left.key].evidence",
  "window.metrics[right.key].evidence",
], "resource instrument consumes shared resource priority");
includes(source.mobileDomainDefinitions, [
  "compareResourceRisk",
  "ResourceRowEvidence",
  "left.evidence as ResourceRowEvidence",
  "right.evidence as ResourceRowEvidence",
], "trafficLoad queue consumes shared resource priority");
includes(source.resourceTimeSeries, ["resourceTimeSeries", "resource.metrics.filter", "[metric.threshold, ...metric.points.map", "resourcePercentDomain", "...domain", "resource.accessibleSummary"], "shared resource time-series adapter");
excludes(source.resourceModel, ['values.map((value) => text(value)).join(" · ")'], "resource model");
includes(source.resourceChart, ["preserveAspectRatio=\"xMidYMid meet\"", "const { min, max } = visualization", "局部刻度 ", "percentagePointY(point.value, 6, bottom, min, max)", "data-section-threshold", "data-section-series", "<title", "<desc"], "resource SVG chart");
includes(source.timeSeriesGeometry, ["timeSeriesPointX", "percentagePointY", "min = 0, max = 100", "resourcePercentDomain", "Math.min(...values)", "timestamp", "start", "end"], "shared time-series geometry");
includes(source.resourceChartCss, [".section-series-line.is-memory", "stroke-dasharray: 9 4", ".section-series-line.is-disk", "stroke-dasharray: 2 4"], "resource SVG non-color series identity");

includes(source.timeContract, ["RFC3339_WITH_TIMEZONE", "parseRfc3339Timestamp", "formatRfc3339Local"], "frontend time contract");
includes(source.runtimeSchema, ["validateSnapshotTree", "带时区的 RFC 3339", "MAX_SNAPSHOT_COLLECTION_ROWS", "validatePercentage"], "deep runtime schema");
includes(source.runtimeChrome, ["当前快照", "快照刷新中", "历史快照", "快照恢复中"], "runtime snapshot time-domain language");
excludes(source.runtime, ['phase: browserOfflineHint ? "offline"', 'return; // navigator.onLine'], "LAN monitoring request policy");
excludes(source.runtimeChrome, ['phase === "offline"'], "runtime phase model");

includes(source.main, ["createRoot", "PanelFrameworkApp", "router-panel-mounted"], "single React shell");
excludes(source.main, ["legacyBridge", "mountRouterOverviewPanel", "preserveLegacyFallback"], "single React shell");
includes(source.index, ['<div id="app"'], "neutral public shell mount");
excludes(source.index, ['<main id="app"'], "neutral public shell mount");
excludes(source.index, ["#dns", "panel-legacy", "Ctrl+K", "legacy"], "public shell");

includes(source.desktop, ["data-desktop-overview", "DesktopIncidentDocket", "DesktopLedger", "DesktopWanEvidence"], "desktop console");
includes(source.desktopIncident, ["ReactElement", "investigationActions: ReactElement"], "desktop incident action slot");
excludes(source.desktopIncident, ["ReactNode"], "desktop incident action slot");
includes(source.desktopTask, ["overviewInvestigationHeading"], "desktop action context language");
includes(source.investigationActions, ['action.mode === "investigation"', "关联工作区", "继续核对相关证据"], "shared action context language");
includes(source.desktopCss + source.desktopTokens, ["@media (min-width: 1200px)"], "desktop boundary");
includes(source.operationalPage, ["DesktopDomainWorkspace", "model={model}", "data-metric-count={model.metrics.length}", "metricColumnCount", "gridTemplateColumns"], "desktop operational mount and metric comparison");
excludes(source.operationalPage, ["DataTable", "panel-section-tables"], "retired generic desktop table");
includes(source.desktopDomain, ["data-desktop-domain-workspace", "type=\"search\"", "filterWorkspaceRows", "sortWorkspaceRows", "第 {activePage} / {pageCount} 页", "DesktopDomainInspector"], "desktop domain workspace");
includes(source.desktopInspector, ["data-desktop-object-detail", "InterfaceEvidence", "RouteEvidence", "TerminalEvidence", "LogEvidence", "SecurityEvidence", "DnsEvidence"], "desktop domain inspector");
includes(source.desktopDomainCss, [".ddw-toolbar", ".ddw-table-pane", ".ddw-inspector", ".ddi-facts"], "desktop domain visual system");
excludes(source.desktopDomainCss, ["!important", "font-size: 10px", "font-size: 9px"], "desktop domain readable style");
const desktopDomainFontSizes = fontSizes(source.desktopDomainCss);
assert(desktopDomainFontSizes.length > 0 && Math.min(...desktopDomainFontSizes) >= 11, "desktop domain text must stay at least 11px");
includes(source.mobileDomainModel, ["panelObject"], "shared object history state");
excludes(source.mobileDomainModel, ["mobileObject"], "surface-neutral object history state");

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
  [files.mobileIncidentCenter, source.mobileIncidentCenter, 120],
  [files.mobileNextEvidenceSlots, source.mobileNextEvidenceSlots, 100],
  [files.mobileNextEvidence, source.mobileNextEvidence, 150],
  [files.mobileProof, source.mobileProof, 40],
  [files.mobileLedger, source.mobileLedger, 90],
  [files.mobileIncident, source.mobileIncident, 90],
  [files.mobileConcurrent, source.mobileConcurrent, 90],
  [files.mobileFocus, source.mobileFocus, 90],
  [files.mobileTraffic, source.mobileTraffic, 130],
  [files.mobileResource, source.mobileResource, 140],
  [files.mobileResourceHistory, source.mobileResourceHistory, 140],
  [files.mobileDomain, source.mobileDomain, 420],
  [files.mobileCollectionLedger, source.mobileCollectionLedger, 140],
  [files.mobileInspector, source.mobileInspector, 240],
  [files.resourceInspector, source.resourceInspector, 100],
  [files.diagnosticInspector, source.diagnosticInspector, 100],
  [files.networkInspectors, source.networkInspectors, 260],
  [files.terminalLogInspectors, source.terminalLogInspectors, 220],
  [files.securityDnsInspectors, source.securityDnsInspectors, 260],
  [files.sectionRowEvidence, source.sectionRowEvidence, 440],
  [files.sectionRowEvidenceTypes, source.sectionRowEvidenceTypes, 220],
  [files.diagnosticModel, source.diagnosticModel, 130],
  [files.mobileDomainModel, source.mobileDomainModel, 320],
  [files.mobileDomainDefinitions, source.mobileDomainDefinitions, 420],
  [files.objectIdentity, source.objectIdentity, 220],
  [files.desktopDomain, source.desktopDomain, 240],
  [files.desktopInspector, source.desktopInspector, 280],
  [files.desktopDomainCss, source.desktopDomainCss, 540],
  [files.mobileCss, source.mobileCss, 1950],
  [files.mobileFoundationCss, source.mobileFoundationCss, 1100],
  [files.mobileTabletCss, source.mobileTabletCss, 260],
  [files.mobileDomainCss, source.mobileDomainCss, 1280],
  [files.mobileDomainFoundationCss, source.mobileDomainFoundationCss, 1100],
  [files.mobileCollectionLedgerCss, source.mobileCollectionLedgerCss, 120],
  [files.desktopCss, source.desktopCss, 1160],
  [files.navCss, source.navCss, 560],
  [files.resourceChartCss, source.resourceChartCss, 230],
  [files.connectionCss, source.connectionCss, 450],
  [files.runtimeCss, source.runtimeCss, 130],
  [files.desktopResponsiveCss, source.desktopResponsiveCss, 120],
  [files.evidenceModel, source.evidenceModel, 520],
  [files.riskQueue, source.riskQueue, 110],
  [files.evidenceInstruments, source.evidenceInstruments, 220],
  [files.resourceChart, source.resourceChart, 150],
  [files.timeSeriesGeometry, source.timeSeriesGeometry, 80],
  [files.resourceTimeSeries, source.resourceTimeSeries, 50],
];
for (const [file, body, max] of budgets) assert(lineCount(body) <= max, `${file} exceeds maintainability budget ${max}: ${lineCount(body)}`);

if (source.builtJs) {
  includes(source.builtJs, ["data-mobile-overview", "data-mobile-domain-workspace", "data-desktop-overview", "data-desktop-domain-workspace", "data-desktop-object-detail", "data-section-time-series"], "built JavaScript");
  excludes(source.builtJs, ["data-mobile-native", "mountRouterOverviewPanel", "MobileOverviewScreen", "preserveAspectRatio=\"none\""], "built JavaScript");
}
if (source.builtCss) {
  includes(source.builtCss, [".mp-shell", ".mdw-shell", ".desktop-domain-workspace", ".section-timeseries"], "built CSS");
  excludes(source.builtCss, [".mo-shell", ".mn-topology"], "built CSS");
  const builtImportant = (source.builtCss.match(/!important/g) || []).length;
  assert(builtImportant === 0, `built CSS must not contain !important overrides: ${builtImportant}`);
}
if (source.desktopBuiltCss) {
  includes(source.desktopBuiltCss, [".do-shell", ".do-status-bus", ".do-ledger"], "desktop overview CSS");
  excludes(source.desktopBuiltCss, [".mo-shell", ".mn-topology", "!important"], "desktop overview CSS");
}

if (failures.length) {
  console.error("overview architecture gate: FAIL");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`overview architecture gate: PASS mobile=${lineCount(source.mobile)} domain=${lineCount(source.mobileDomain)} evidence=${lineCount(source.evidenceModel)} minMobileText=${Math.min(...mobileFontSizes)}px`);
