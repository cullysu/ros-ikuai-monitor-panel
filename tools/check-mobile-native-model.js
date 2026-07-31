const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = process.cwd();

function loadTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(compiled.outputText, filename);
}

require.extensions[".ts"] = loadTypeScript;
require.extensions[".tsx"] = loadTypeScript;

const { buildOverviewEvidenceModel } = require(
  path.join(root, "src", "panel-framework", "overview", "evidence-model", "buildOverviewEvidenceModel.ts")
);
const { buildOverviewComparisonObjects } = require(
  path.join(root, "src", "panel-framework", "overview", "evidence-model", "buildOverviewComparisonObjects.ts")
);
const { deriveOverviewState } = require(
  path.join(root, "src", "panel-framework", "overview", "index.ts")
);
const { OVERVIEW_SCENARIO_FIXTURES } = require(
  path.join(root, "src", "panel-framework", "overview", "scenarios.ts")
);
const { toFiniteNumber } = require(
  path.join(root, "src", "panel-framework", "overview", "deriveOverviewState.ts")
);
const { buildSectionModel } = require(
  path.join(root, "src", "panel-framework", "sections", "sectionModels.ts")
);
const { buildDesktopOverviewModel } = require(
  path.join(root, "src", "panel-framework", "overview", "desktop-overview", "desktopOverviewModel.ts")
);
const { buildRouterOsRouteEvidenceModel } = require(
  path.join(root, "src", "panel-framework", "overview", "routerosEvidenceModel.ts")
);
const { buildRouterOsTrustModel } = require(
  path.join(root, "src", "panel-framework", "overview", "routerosTrustModel.ts")
);
const { routerOsLatestSuccess, routerOsNetworkPriority } = require(
  path.join(root, "src", "panel-framework", "overview", "routerosNetworkViewModel.ts")
);
const { PANEL_ROUTES, navigationContextFromLocation, routeFromLocation, routeUrl } = require(
  path.join(root, "src", "panel-framework", "routes", "panelRoutes.ts")
);
const { rowsFromModel: rowsFromSectionModel } = require(
  path.join(root, "src", "panel-framework", "mobile", "mobileDomainWorkspaceModel.ts")
);
const { domainDefinitionFor, filterWorkspaceRows, sortWorkspaceRows } = require(
  path.join(root, "src", "panel-framework", "mobile", "mobileDomainDefinitions.ts")
);
const { timeSeriesPointX } = require(
  path.join(root, "src", "panel-framework", "sections", "timeSeriesGeometry.ts")
);

const { buildSectionRowEvidence } = require(
  path.join(root, "src", "panel-framework", "sections", "sectionRowEvidence.ts")
);

function rowsFromModel(route, model) {
  const tables = model.tables.map((table) => {
    if (table.rowEvidence && table.rowEvidence.length >= table.rows.length) return table;
    return { ...table, rowEvidence: table.rows.map((row) => buildSectionRowEvidence(route, table.title, row)) };
  });
  return rowsFromSectionModel(route, { ...model, tables });
}
const mobilePatrolSource = fs.readFileSync(
  path.join(root, "src", "panel-framework", "mobile", "MobilePatrolScreen.tsx"),
  "utf8",
);
const tabletRelationSource = fs.readFileSync(
  path.join(root, "src", "panel-framework", "mobile", "MobileTabletRelationRail.tsx"),
  "utf8",
);
assert.match(mobilePatrolSource, /MobileTabletRelationRail/, "normal tablet must mount the relation evidence rail");
assert.match(tabletRelationSource, /data-overview-task-landmark=\"relation-evidence\"/, "relation rail must expose a semantic task landmark");

const clone = (value) => structuredClone(value);
const modelFor = (snapshot) => buildOverviewEvidenceModel(snapshot, deriveOverviewState(snapshot));
const modelForHint = (snapshot, scenarioHint) => buildOverviewEvidenceModel(snapshot, deriveOverviewState(snapshot, { scenarioHint }));
const textOf = (model) => JSON.stringify(model);
const workspaceMeta = (overrides = {}) => ({
  state: "neutral",
  attention: false,
  running: null,
  active: null,
  disabled: null,
  severity: "unknown",
  protocol: "",
  trafficBps: null,
  connections: null,
  timestamp: null,
  address: "",
  targetAddress: "",
  distance: null,
  utilization: null,
  sampleCount: null,
  ruleOrder: null,
  tags: [],
  identityParts: [],
  ...overrides,
});

for (const missing of [null, undefined, "", "   ", true, false]) {
  assert.equal(toFiniteNumber(missing), null, `${JSON.stringify(missing)} must remain unavailable`);
}
assert.equal(toFiniteNumber(0), 0);
assert.equal(toFiniteNumber("0"), 0);
assert.equal(toFiniteNumber("1.25e3"), 1250);

assert.equal(timeSeriesPointX(0, 0, 30_000, 4, 316), 4);
assert.equal(timeSeriesPointX(5_000, 0, 30_000, 4, 316), 56, "irregular samples use elapsed time, not array index");
assert.equal(timeSeriesPointX(30_000, 0, 30_000, 4, 316), 316);
assert.equal(timeSeriesPointX(60_000, 0, 30_000, 4, 316), 316, "out-of-window samples clamp to the plot");

assert.deepEqual(
  {
    primaryDestination: PANEL_ROUTES.security.primaryDestination,
    workspaceGroup: PANEL_ROUTES.security.workspaceGroup,
    placement: PANEL_ROUTES.security.placement,
  },
  { primaryDestination: "interfaces", workspaceGroup: "security", placement: "more" },
);
assert.deepEqual(
  {
    primaryDestination: PANEL_ROUTES.dns4.primaryDestination,
    workspaceGroup: PANEL_ROUTES.dns4.workspaceGroup,
    placement: PANEL_ROUTES.dns4.placement,
  },
  { primaryDestination: "interfaces", workspaceGroup: "dns", placement: "more" },
);
assert.deepEqual(
  {
    primaryDestination: PANEL_ROUTES.connections.primaryDestination,
    workspaceGroup: PANEL_ROUTES.connections.workspaceGroup,
    placement: PANEL_ROUTES.connections.placement,
  },
  { primaryDestination: "interfaces", workspaceGroup: "network", placement: "more" },
);
const routeMaturityValues = new Set(["complete", "bounded-readonly", "fallback", "unavailable"]);
for (const definition of Object.values(PANEL_ROUTES)) {
  assert.ok(routeMaturityValues.has(definition.maturity), `${definition.id} must declare an explicit route maturity`);
}
assert.equal(PANEL_ROUTES.more.maturity, "unavailable", "the More directory is not an operational module");
assert.equal(PANEL_ROUTES.balance.maturity, "bounded-readonly", "bounded WAN-balance evidence must remain below complete maturity");
assert.equal(
  Object.values(PANEL_ROUTES).filter((definition) => definition.maturity === "complete").length,
  0,
  "implementation-loop evidence cannot self-promote a route to complete",
);
assert.equal(
  routeUrl("interfaces", { pathname: "/panel", search: "?mode=public" }, { objectId: "interface-ether9" }),
  "/panel?mode=public&section=interfaces&object=interface-ether9",
  "new navigation emits one canonical query URL without a duplicate hash route",
);
const contextualRoute = routeUrl(
  "interfaces",
  { pathname: "/panel", search: "?mode=public" },
  {
    objectId: "interface-ether9",
    returnRoute: "overview",
    evidenceAt: "2026-07-18T07:03:01Z",
  },
);
assert.equal(
  contextualRoute,
  "/panel?mode=public&section=interfaces&object=interface-ether9&from=overview&evidenceAt=2026-07-18T07%3A03%3A01Z",
  "object navigation must preserve its source route and timezone-qualified evidence time",
);
assert.deepEqual(
  navigationContextFromLocation({ search: contextualRoute.split("?")[1] ? `?${contextualRoute.split("?")[1]}` : "" }),
  { objectId: "interface-ether9", query: null, risk: null, returnRoute: "overview", evidenceAt: "2026-07-18T07:03:01Z" },
);
const riskContextRoute = routeUrl(
  "interfaces",
  { pathname: "/panel", search: "?mode=public" },
  {
    risk: "interfaces",
    returnRoute: "overview",
    evidenceAt: "2026-07-18T07:03:01Z",
  },
);
assert.equal(
  riskContextRoute,
  "/panel?mode=public&section=interfaces&risk=interfaces&from=overview&evidenceAt=2026-07-18T07%3A03%3A01Z",
  "a collection risk must preserve source and evidence time without inventing an object",
);
assert.deepEqual(
  navigationContextFromLocation({ search: `?${riskContextRoute.split("?")[1]}` }),
  { objectId: null, query: null, risk: "interfaces", returnRoute: "overview", evidenceAt: "2026-07-18T07:03:01Z" },
);
assert.equal(
  routeUrl("interfaces", {
    pathname: "/panel",
    search: "?mode=public&risk=not-a-risk&from=overview&evidenceAt=2026-07-18%2007%3A03%3A01",
  }),
  "/panel?mode=public&section=interfaces",
  "unknown risks and timezone-free evidence times cannot create navigation context",
);
assert.equal(
  routeUrl("interfaces", {
    pathname: "/panel",
    search: "?mode=public&object=interface-ether9&from=not-a-route&evidenceAt=2026-07-18%2007%3A03%3A01",
  }),
  "/panel?mode=public&object=interface-ether9&section=interfaces",
  "invalid return routes and timezone-free evidence timestamps must be removed during canonicalization",
);
assert.equal(
  routeFromLocation({ search: "?section=interfaces", hash: "#logs" }),
  "interfaces",
  "canonical query state wins if a legacy hash conflicts",
);
assert.equal(routeFromLocation({ search: "", hash: "#logs" }), "logs", "legacy hash-only links remain readable before normalization");

const rfc3339WithTimezone = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
for (const [scenario, snapshot] of Object.entries(OVERVIEW_SCENARIO_FIXTURES)) {
  const samples = snapshot.overview?.history?.trafficSamples || [];
  for (const sample of samples) {
    assert.equal(typeof sample.timestamp, "string", `${scenario} traffic timestamps must not use ambiguous numeric epochs`);
    assert.match(sample.timestamp, rfc3339WithTimezone, `${scenario} traffic timestamps must be timezone-qualified RFC 3339`);
  }
  const activeWan = (snapshot.wan || []).filter((row) => row.running !== false && row.disabled !== true);
  if (!samples.length || !activeWan.length) continue;
  const expectedDown = activeWan.reduce((sum, row) => sum + Number(row.downRate), 0);
  const expectedUp = activeWan.reduce((sum, row) => sum + Number(row.upRate), 0);
  const lastSample = samples[samples.length - 1];
  assert.equal(lastSample.downlink, expectedDown, `${scenario} final downlink sample must match the current WAN aggregate`);
  assert.equal(lastSample.uplink, expectedUp, `${scenario} final uplink sample must match the current WAN aggregate`);
}

const missingWan = clone(OVERVIEW_SCENARIO_FIXTURES.single);
delete missingWan.wan;
delete missingWan.pppoe;
const missingWanState = deriveOverviewState(missingWan);
assert.equal(missingWanState.facts.wan.available, false, "missing WAN arrays are not an observed empty collection");
assert.equal(missingWanState.facts.wan.online, 0);
assert.equal(missingWanState.facts.wan.offline, 0);
assert.equal(missingWanState.facts.wan.unknown, 0);
assert.equal(missingWanState.facts.wan.label, "WAN 未采集");
assert.doesNotMatch(JSON.stringify(missingWanState.facts.wan), /WAN 可用|0\/0/);
assert.equal(modelFor(missingWan).evidenceMode, "historical", "missing WAN evidence must stop a current/complete claim");
const missingWanTrust = buildRouterOsTrustModel(missingWan, missingWanState);
assert.equal(missingWanTrust.forwarding.value, "不可判");
assert.equal(missingWanTrust.business.value, "不可判");

const offsetFreeSnapshot = clone(OVERVIEW_SCENARIO_FIXTURES.single);
offsetFreeSnapshot.updatedAt = "2026-07-16 10:00:00";
offsetFreeSnapshot.meta = {};
const offsetFreeState = deriveOverviewState(offsetFreeSnapshot);
assert.equal(
  buildRouterOsTrustModel(offsetFreeSnapshot, offsetFreeState).snapshot.note,
  "未记录",
  "trust view must not let the browser guess an offset-free snapshot instant",
);
assert.equal(
  routerOsLatestSuccess(offsetFreeSnapshot, offsetFreeState),
  "未记录",
  "network view must not let the browser guess an offset-free snapshot instant",
);

const unknownWan = clone(OVERVIEW_SCENARIO_FIXTURES.single);
delete unknownWan.wan[0].running;
const unknownWanState = deriveOverviewState(unknownWan);
assert.equal(unknownWanState.facts.wan.online, 0, "running=undefined is not online");
assert.equal(unknownWanState.facts.wan.offline, 0, "running=undefined is not offline");
assert.equal(unknownWanState.facts.wan.unknown, 1);
assert.equal(unknownWanState.facts.wan.label, "WAN 状态未完整");
assert.equal(modelFor(unknownWan).evidenceMode, "historical");
assert.doesNotMatch(textOf(modelFor(unknownWan)), /业务采样完整/);

const missingInterfaces = clone(OVERVIEW_SCENARIO_FIXTURES.single);
delete missingInterfaces.interfaces;
const missingInterfacesState = deriveOverviewState(missingInterfaces);
assert.equal(missingInterfacesState.facts.interfaces.available, false);
assert.equal(missingInterfacesState.facts.interfaces.online, 0);
assert.equal(missingInterfacesState.facts.interfaces.down, 0);
assert.equal(missingInterfacesState.facts.interfaces.unknown, 0);
assert.equal(missingInterfacesState.facts.interfaces.label, "接口未采集");
assert.doesNotMatch(missingInterfacesState.facts.interfaces.text, /接口在线/);

const unknownInterface = clone(OVERVIEW_SCENARIO_FIXTURES.single);
delete unknownInterface.interfaces[0].running;
const unknownInterfaceState = deriveOverviewState(unknownInterface);
assert.equal(unknownInterfaceState.facts.interfaces.online, 0, "unknown interface state is not running");
assert.equal(unknownInterfaceState.facts.interfaces.down, 0);
assert.equal(unknownInterfaceState.facts.interfaces.unknown, 1);
assert.equal(unknownInterfaceState.facts.interfaces.label, "接口状态未完整");
assert.doesNotMatch(unknownInterfaceState.facts.interfaces.text, /接口在线/);

const partialResource = clone(OVERVIEW_SCENARIO_FIXTURES.single);
partialResource.overview.cpuLoad = 99;
delete partialResource.overview.memoryUsage;
delete partialResource.overview.diskUsage;
const partialResourceState = deriveOverviewState(partialResource);
assert.equal(partialResourceState.facts.resource.available, true, "one observed resource is still evidence");
assert.equal(partialResourceState.facts.resource.complete, false);
assert.equal(partialResourceState.facts.resource.observed, 1);
assert.equal(partialResourceState.facts.resource.cpu, 99);
assert.equal(partialResourceState.facts.resource.memory, null);
assert.equal(partialResourceState.facts.resource.disk, null);
assert.equal(partialResourceState.facts.resource.level, "danger", "observed CPU 99% must not be hidden by missing disk");
assert.equal(partialResourceState.scenario, "resource-full");
const partialResourceModel = modelFor(partialResource);
assert.equal(partialResourceModel.risk, "resource");
assert.equal(partialResourceModel.facts.find((row) => row.key === "resource-breaches").value, "1 / 1");
assert.deepEqual(partialResourceModel.resource.metrics.map((metric) => metric.value), [99, null, null]);

const auxiliaryFailure = clone(OVERVIEW_SCENARIO_FIXTURES.single);
auxiliaryFailure.meta.connectionDetailError = "connection detail failed";
const auxiliaryFailureModel = modelFor(auxiliaryFailure);
assert.equal(auxiliaryFailureModel.evidenceMode, "historical", "auxiliary REST degradation must stop a current claim");
assert.equal(auxiliaryFailureModel.risk, "collection");
assert.doesNotMatch(auxiliaryFailureModel.evidenceNote, /业务采样完整/);

const endpointFailure = clone(OVERVIEW_SCENARIO_FIXTURES.single);
endpointFailure.meta.detailEndpointFailures = [{ group: "connections", name: "detail", message: "timeout" }];
const endpointFailureModel = modelFor(endpointFailure);
assert.equal(endpointFailureModel.evidenceMode, "historical", "recorded endpoint failures must stop a complete claim");
assert.equal(endpointFailureModel.risk, "collection");
assert.equal(endpointFailureModel.evidenceRows.find((row) => row.key === "failures").value, "已记录 1");

const conflictingRoutes = clone(OVERVIEW_SCENARIO_FIXTURES.single);
conflictingRoutes.routes = {
  defaultRoutes: [
    { dstAddress: "0.0.0.0/0", gateway: "198.51.100.1", distance: 1, active: false, disabled: false },
    { dstAddress: "0.0.0.0/0", gateway: "198.51.100.2", distance: 10, active: true, disabled: false },
    { dstAddress: "192.0.2.0/24", gateway: "198.51.100.3", distance: 0, active: true, disabled: false },
  ],
};
const conflictingRouteState = deriveOverviewState(conflictingRoutes);
const conflictingRouteModel = modelFor(conflictingRoutes);
assert.equal(conflictingRouteState.facts.route.label, "活动默认路由");
assert.match(conflictingRouteState.facts.route.text, /198\.51\.100\.2/);
assert.match(conflictingRouteState.facts.route.rawSummary, /198\.51\.100\.2/);
assert.doesNotMatch(conflictingRouteState.facts.route.text, /198\.51\.100\.[13]/);
assert.equal(conflictingRouteModel.focusObject.name, "198.51.100.2");
assert.equal(conflictingRouteModel.risk, "none");
const conflictingDesktopModel = buildDesktopOverviewModel(conflictingRoutes, conflictingRouteState);
assert.equal(conflictingDesktopModel.activeRoute.gateway, "198.51.100.2");
assert.equal(
  conflictingDesktopModel.statusItems.find((item) => item.key === "route").value,
  "已核实",
  "the Proof strip confirms route evidence while the selected gateway remains owned by Focus",
);
const conflictingRouterOsModel = buildRouterOsRouteEvidenceModel(conflictingRoutes, conflictingRouteState);
assert.equal(conflictingRouterOsModel.businessRows[0].value, "198.51.100.2");
assert.doesNotMatch(conflictingRouterOsModel.summary.note, /198\.51\.100\.[13]/);

const multipleActiveRoutes = clone(OVERVIEW_SCENARIO_FIXTURES.single);
multipleActiveRoutes.routes.defaultRoutes = [
  { dstAddress: "0.0.0.0/0", gateway: "pppoe-wan1", distance: 1, table: "main", active: true, disabled: false },
  { dstAddress: "0.0.0.0/0", gateway: "pppoe-wan2", distance: 2, table: "main", active: true, disabled: false },
];
const multipleActiveRouteModel = modelFor(multipleActiveRoutes);
const multipleActiveCandidateFact = multipleActiveRouteModel.focusObject?.attributes
  .find((attribute) => attribute.label === "活动候选");
assert.equal(
  multipleActiveCandidateFact?.value,
  "2 条 · 当前按 distance 核对",
  "Step188 Focus must expose multi-active candidate semantics instead of presenting the sorted first record as the only path",
);

const focusedComparison = clone(OVERVIEW_SCENARIO_FIXTURES.single);
focusedComparison.routes.defaultRoutes = [{
  dstAddress: "0.0.0.0/0",
  gateway: "pppoe-out10",
  distance: 1,
  active: true,
  disabled: false,
}];
focusedComparison.interfaces = [
  { name: "pppoe-out10", type: "pppoe-out", running: true, rxRate: 3400, txRate: 1200 },
  { name: "bridge-lan", type: "bridge", running: true, rxRate: 1800, txRate: 900 },
];
const focusedComparisonModel = modelFor(focusedComparison);
assert.equal(focusedComparisonModel.risk, "none");
assert.equal(focusedComparisonModel.focusObject.name, "pppoe-out10");
assert.deepEqual(
  focusedComparisonModel.comparisonObjects,
  [],
  "one unrelated object cannot turn the active route WAN and its same interface into a three-row Comparison",
);

const multiComparison = clone(focusedComparison);
multiComparison.wan = [
  focusedComparison.wan[0],
  { name: "pppoe-out20", parent: "ether2", running: true, upRate: 800, downRate: 2100 },
  { name: "pppoe-out30", parent: "ether3", running: true, upRate: 700, downRate: 1900 },
];
multiComparison.pppoe = clone(multiComparison.wan);
const multiComparisonModel = modelFor(multiComparison);
assert.deepEqual(
  multiComparisonModel.comparisonObjects.map((row) => row.object).sort(),
  ["bridge-lan", "pppoe-out20", "pppoe-out30"],
  "Comparison contains only objects that add evidence beyond the verified route gateway",
);
assert.equal(
  multiComparisonModel.comparisonObjects.some((row) => row.object === "pppoe-out10"),
  false,
  "the Focus gateway cannot be replayed as either WAN or interface comparison evidence",
);

const reorderedComparison = clone(multiComparison);
reorderedComparison.wan.reverse();
reorderedComparison.pppoe.reverse();
reorderedComparison.interfaces.reverse();
assert.deepEqual(
  modelFor(reorderedComparison).comparisonObjects.map((row) => row.object).sort(),
  multiComparisonModel.comparisonObjects.map((row) => row.object).sort(),
  "Focus exclusion is invariant to candidate order and cannot depend on rows[0]",
);

const unknownComparisonRelation = clone(multiComparison);
unknownComparisonRelation.routes.defaultRoutes[0].gateway = "198.51.100.2";
assert.deepEqual(
  modelFor(unknownComparisonRelation).comparisonObjects.map((row) => `${row.category}:${row.object}`).sort(),
  [
    "WAN:pppoe-out10",
    "WAN:pppoe-out20",
    "WAN:pppoe-out30",
    "接口:bridge-lan",
    "接口:pppoe-out10",
  ],
  "an IP gateway does not prove an interface relation, so candidates remain visible instead of being guessed away",
);

const manyComparisonCandidates = clone(focusedComparison);
manyComparisonCandidates.wan = [
  { name: "pppoe-out10", parent: "ether1", running: true, upRate: 1200, downRate: 3400 },
  { name: "pppoe-out20", parent: "ether2", running: true, upRate: 0, downRate: 0 },
  { name: "pppoe-out30", parent: "ether3", running: true, upRate: 0, downRate: 0 },
  { name: "pppoe-out40", parent: "ether4", running: true, upRate: 0, downRate: 0 },
];
manyComparisonCandidates.pppoe = clone(manyComparisonCandidates.wan);
manyComparisonCandidates.interfaces = [
  { name: "pppoe-out10", type: "pppoe-out", running: true, rxRate: 3400, txRate: 1200 },
  { name: "bridge-lan", type: "bridge", running: true, rxRate: 1800, txRate: 900 },
  ...[2, 3, 4, 5, 6, 7].map((index) => ({
    name: `ether${index}`,
    type: "ether",
    running: true,
    rxRate: 1000 + index,
    txRate: 500 + index,
  })),
];
const reorderedManyComparisonCandidates = clone(manyComparisonCandidates);
reorderedManyComparisonCandidates.wan.reverse();
reorderedManyComparisonCandidates.pppoe.reverse();
reorderedManyComparisonCandidates.interfaces.reverse();
const completeCandidates = buildOverviewComparisonObjects(manyComparisonCandidates);
const reorderedCompleteCandidates = buildOverviewComparisonObjects(reorderedManyComparisonCandidates);
const fleetCoverageModel = modelFor(manyComparisonCandidates);
const step186ArchitectureFailures = [];
if (completeCandidates.length !== 12) {
  step186ArchitectureFailures.push(`candidate normalization retained ${completeCandidates.length}/12 objects`);
}
if (
  completeCandidates.map((row) => `${row.category}:${row.object}`).join("|") !==
  reorderedCompleteCandidates.map((row) => `${row.category}:${row.object}`).join("|")
) {
  step186ArchitectureFailures.push("candidate output changes when the same >8 objects are reordered");
}
if (fleetCoverageModel.scenario !== "fleet") {
  step186ArchitectureFailures.push(`large current snapshot derived ${fleetCoverageModel.scenario} instead of fleet`);
}
if ((fleetCoverageModel.coverageObjects || []).length !== 12) {
  step186ArchitectureFailures.push(`Fleet coverage retained ${(fleetCoverageModel.coverageObjects || []).length}/12 objects`);
}
if (fleetCoverageModel.comparisonObjects.length !== 0) {
  step186ArchitectureFailures.push(`Fleet leaked ${fleetCoverageModel.comparisonObjects.length} objects into normal Comparison semantics`);
}
for (const scenario of ["all-offline", "no-snapshot", "collection-down", "resource-full", "interfaces-down"]) {
  const incidentModel = modelFor(clone(OVERVIEW_SCENARIO_FIXTURES[scenario]));
  if (incidentModel.comparisonObjects.length !== 0) {
    step186ArchitectureFailures.push(`${scenario} exposed a normal Comparison task`);
  }
}
assert.deepEqual(
  step186ArchitectureFailures,
  [],
  `Step186 coverage/comparison architecture contract failed:\n${step186ArchitectureFailures.join("\n")}`,
);

const fleetHandoffAction = (model) => model.investigationActions.map((action) => ({
  route: action.route,
  mode: action.mode,
  label: action.label,
  note: action.note,
  icon: action.icon,
  objectId: action.navigation?.objectId || null,
  risk: action.navigation?.risk || null,
  returnRoute: action.navigation?.returnRoute || null,
  evidenceAt: action.navigation?.evidenceAt || null,
}));
const expectedFleetHandoff = [{
  route: "interfaces",
  mode: "workspace",
  label: "进入网络工作区",
  note: "WAN、接口与路由对象",
  icon: "network",
  objectId: null,
  risk: null,
  returnRoute: "overview",
  evidenceAt: fleetCoverageModel.evidenceAt,
}];
assert.deepEqual(
  fleetHandoffAction(fleetCoverageModel),
  expectedFleetHandoff,
  "Step187 Fleet Overview must expose one collection-level network workspace handoff without inventing an object",
);
assert.deepEqual(
  fleetHandoffAction(modelFor(reorderedManyComparisonCandidates)),
  expectedFleetHandoff,
  "Step187 Fleet handoff and evidence context must not depend on object input order",
);
const fleetWorkspaceUrl = routeUrl(
  fleetCoverageModel.investigationActions[0].route,
  { pathname: "/panel", search: "?mode=public" },
  fleetCoverageModel.investigationActions[0].navigation,
);
assert.equal(
  fleetWorkspaceUrl,
  `/panel?mode=public&section=interfaces&from=overview&evidenceAt=${encodeURIComponent(fleetCoverageModel.evidenceAt)}`,
  "a collection-level Fleet handoff preserves source and evidence time without inventing object or risk",
);
assert.deepEqual(
  navigationContextFromLocation({ search: `?${fleetWorkspaceUrl.split("?")[1]}` }),
  { objectId: null, query: null, risk: null, returnRoute: "overview", evidenceAt: fleetCoverageModel.evidenceAt },
  "canonical parsing retains the validated collection context",
);

const inactiveRoute = clone(OVERVIEW_SCENARIO_FIXTURES.single);
inactiveRoute.routes.defaultRoutes = [{ table: "main", gateway: "198.51.100.1", distance: 1, active: false, disabled: false }];
const inactiveRouteModel = modelFor(inactiveRoute);
assert.equal(inactiveRouteModel.risk, "route");
assert.equal(inactiveRouteModel.verdictTitle, "默认路由无法核实");
assert.equal(inactiveRouteModel.focusObject, null);
assert.doesNotMatch(textOf(inactiveRouteModel), /198\.51\.100\.1/);

const nonDefaultOnly = clone(OVERVIEW_SCENARIO_FIXTURES.single);
nonDefaultOnly.routes = {
  defaultRoutes: [],
  items: [{ dstAddress: "192.0.2.0/24", default: false, gateway: "198.51.100.2", active: true, disabled: false }],
};
const nonDefaultModel = modelFor(nonDefaultOnly);
assert.equal(nonDefaultModel.risk, "route");
assert.doesNotMatch(textOf(nonDefaultModel), /198\.51\.100\.2/);

const missingRate = clone(OVERVIEW_SCENARIO_FIXTURES.single);
delete missingRate.wan[0].downRate;
const missingRateModel = modelFor(missingRate);
assert.equal(missingRateModel.traffic, null, "missing current rate must not produce a trend");
assert.doesNotMatch(textOf(missingRateModel), /0 bps/);

const measuredZero = clone(OVERVIEW_SCENARIO_FIXTURES.single);
measuredZero.wan[0].downRate = 0;
measuredZero.wan[0].upRate = 0;
measuredZero.overview.history.trafficSamples = measuredZero.overview.history.trafficSamples.slice(-2).map((sample) => ({
  ...sample,
  downlink: 0,
  uplink: 0,
}));
const zeroModel = modelFor(measuredZero);
assert.equal(zeroModel.traffic.status, "ready", "explicit zero observations remain valid");
assert.equal(zeroModel.traffic.currentDown, "0 bps");
assert.equal(zeroModel.traffic.currentUp, "0 bps");

for (const { scale, expectedUnit } of [
  { scale: 1, expectedUnit: "Kbps" },
  { scale: 1_000, expectedUnit: "Mbps" },
  { scale: 1_000_000, expectedUnit: "Gbps" },
]) {
  const scaledTraffic = clone(OVERVIEW_SCENARIO_FIXTURES.single);
  scaledTraffic.overview.history.trafficSamples = scaledTraffic.overview.history.trafficSamples.map((sample) => ({
    ...sample,
    downlink: sample.downlink * scale,
    uplink: sample.uplink * scale,
  }));
  for (const rows of [scaledTraffic.wan, scaledTraffic.pppoe]) {
    for (const row of rows) {
      row.downRate *= scale;
      row.upRate *= scale;
    }
  }
  assert.equal(
    modelFor(scaledTraffic).traffic.unit,
    expectedUnit,
    `traffic instrument exposes ${expectedUnit} as structured evidence instead of display-string parsing`,
  );
}

const stale = clone(OVERVIEW_SCENARIO_FIXTURES.single);
stale.meta.clientEvidenceBoundary = "stale";
const staleModel = modelFor(stale);
assert.equal(staleModel.evidenceMode, "historical");
assert.equal(staleModel.risk, "collection");
assert.equal(staleModel.traffic, null);
assert.match(staleModel.evidenceTime, /^上次成功 /);
assert.equal(staleModel.verdictTitle, "当前采集状态不可确认");
assert.equal(staleModel.facts[0].label, "上次通道记录");
assert.equal(staleModel.facts[0].note, "仅作历史对照");

const failedWithoutSuccess = clone(OVERVIEW_SCENARIO_FIXTURES.single);
failedWithoutSuccess.status = "error";
failedWithoutSuccess.meta.realtimeError = "REST failed";
failedWithoutSuccess.meta.slowRestError = "REST failed";
failedWithoutSuccess.meta.staticError = "SSH failed";
delete failedWithoutSuccess.meta.realtimeUpdatedAt;
delete failedWithoutSuccess.meta.slowRestUpdatedAt;
delete failedWithoutSuccess.meta.staticUpdatedAt;
const unavailableModel = modelFor(failedWithoutSuccess);
assert.equal(unavailableModel.evidenceMode, "unavailable");
assert.equal(unavailableModel.risk, "evidence");
assert.equal(unavailableModel.verdictTitle, "当前业务状态不可判断");
assert.equal(unavailableModel.scenarioFocus?.kind, "coverage");
assert.deepEqual(unavailableModel.scenarioFocus?.items.map((item) => item.key), ["target", "current-withheld", "history"]);
assert.deepEqual(unavailableModel.scenarioFocus?.items.map((item) => item.actionable), [true, false, true]);
assert.deepEqual(unavailableModel.evidenceRows.map((row) => row.key), ["boundary"], "coverage owns target and time; the ledger keeps only novel evidence");
assert.equal(unavailableModel.traffic, null);

const partialRecovery = clone(OVERVIEW_SCENARIO_FIXTURES["collection-down"]);
partialRecovery.meta.staticError = null;
partialRecovery.meta.staticUpdatedAt = new Date().toISOString();
partialRecovery.meta.capabilities.sshRead = true;
const partialModel = modelFor(partialRecovery);
assert.equal(partialModel.risk, "collection");
assert.deepEqual(partialModel.facts.map((row) => row.key), ["collection-channels", "last-success", "failed-endpoints"]);
assert.equal(partialModel.facts[0].value, "1 / 2");
assert.equal(partialModel.verdictTitle, "当前采集状态不可确认");
assert.equal(partialModel.scenarioFocus?.kind, "planes");
assert.deepEqual(partialModel.scenarioFocus?.items.map((item) => item.key), ["management", "collection", "forwarding", "business"]);
assert.deepEqual(partialModel.scenarioFocus?.items.map((item) => item.actionable), [true, false, true, false]);
assert.equal(partialModel.facts[0].label, "上次通道记录");

const unclassifiedInterfaceSnapshot = clone(OVERVIEW_SCENARIO_FIXTURES.single);
unclassifiedInterfaceSnapshot.interfaces = [
  { name: "ether1", type: "ether", running: true, disabled: false, bridge: "bridge-lan" },
  { name: "ether9", type: "ether", running: false, disabled: false, bridge: "bridge-lan" },
];
const unclassifiedInterfaceModel = modelFor(unclassifiedInterfaceSnapshot);
assert.equal(
  unclassifiedInterfaceModel.risk,
  "interface-review",
  "running=false without an exact enabled default-route dependency is an observation to review, not a proved risk",
);
assert.equal(unclassifiedInterfaceModel.verdictTone, "warn");
assert.match(unclassifiedInterfaceModel.verdictTitle, /影响未判定/);
assert.equal(unclassifiedInterfaceModel.priorityLabel, "待确认接口");
assert.equal(unclassifiedInterfaceModel.priorityObjects[0].tone, "warn");
assert.equal(unclassifiedInterfaceModel.priorityObjects[0].state, "影响未判定");
const unclassifiedInterfaceSection = buildSectionModel("interfaces", unclassifiedInterfaceSnapshot);
const unclassifiedInterfaceRows = rowsFromModel("interfaces", unclassifiedInterfaceSection);
const ether9 = unclassifiedInterfaceRows.find((row) => row.primary === "ether9");
assert.ok(ether9, "unclassified non-running interface remains discoverable in the object list");
assert.equal(ether9.meta.attention, false, "unclassified observation must not enter the proved-risk attention queue");
assert.equal(ether9.meta.state, "warning", "unclassified observation uses review emphasis rather than incident emphasis");
assert.equal(ether9.evidence.kind, "interface");
assert.equal(ether9.evidence.operationalImpact, "unverified");
assert.equal(ether9.evidence.operationalReason, "impact-not-established");

const disabledInterfaceSnapshot = clone(OVERVIEW_SCENARIO_FIXTURES.single);
disabledInterfaceSnapshot.interfaces = [
  { name: "ether1", type: "ether", running: true, disabled: false },
  { name: "ether8", type: "ether", running: false, disabled: true },
];
const disabledInterfaceModel = modelFor(disabledInterfaceSnapshot);
assert.equal(disabledInterfaceModel.risk, "none", "an administratively disabled interface is not an incident");
const disabledInterfaceRows = rowsFromModel("interfaces", buildSectionModel("interfaces", disabledInterfaceSnapshot));
const ether8 = disabledInterfaceRows.find((row) => row.primary === "ether8");
assert.ok(ether8);
assert.equal(ether8.meta.attention, false);
assert.equal(ether8.evidence.kind, "interface");
assert.equal(ether8.evidence.operationalImpact, "none");
assert.equal(ether8.evidence.operationalReason, "administratively-disabled");

const interfacesModel = modelFor(clone(OVERVIEW_SCENARIO_FIXTURES["interfaces-down"]));
assert.equal(interfacesModel.risk, "interfaces");
assert.equal(interfacesModel.priorityTotal, 2);
assert.equal(interfacesModel.priorityObjects[0].route, "interfaces");
assert.equal(interfacesModel.facts.find((row) => row.key === "route").value, "已核实");

const interfaceSection = buildSectionModel("interfaces", clone(OVERVIEW_SCENARIO_FIXTURES["interfaces-down"]));
const interfaceRows = rowsFromModel("interfaces", interfaceSection);
const reorderedInterfaceSection = {
  ...interfaceSection,
  tables: interfaceSection.tables.map((item) => ({ ...item, rows: [...item.rows].reverse(), rowMeta: [...item.rowMeta].reverse() })),
};
const reorderedInterfaceRows = rowsFromModel("interfaces", reorderedInterfaceSection);
assert.deepEqual(
  new Map(interfaceRows.map((row) => [row.primary, row.id])),
  new Map(reorderedInterfaceRows.map((row) => [row.primary, row.id])),
  "object IDs must survive refresh reordering",
);
assert.equal(
  interfaceRows.some((row) => row.id === interfacesModel.priorityObjects[0].targetObjectId),
  true,
  "incident deep link must select the exact interface object",
);

const terminalDefinition = domainDefinitionFor("terminals");
assert.equal(terminalDefinition.defaultSort, "traffic-desc");
assert.deepEqual(
  terminalDefinition.sorts.map((item) => item.id),
  ["traffic-desc", "connections-desc", "address-asc", "name-asc"],
);
const terminalRows = [
  { id: "slow", table: "终端对象", columns: [], values: { traffic: "100 Gbps", connections: "999", address: "203.0.113.1 / aa" }, primary: "slow", secondary: "", trailing: "", searchText: "", meta: workspaceMeta({ trafficBps: 1_000_000, connections: 50, address: "192.168.1.20", identityParts: ["slow"] }), duplicateCount: 1 },
  { id: "fast", table: "终端对象", columns: [], values: { traffic: "1 bps", connections: "1", address: "203.0.113.2 / bb" }, primary: "fast", secondary: "", trailing: "", searchText: "", meta: workspaceMeta({ trafficBps: 20_000_000, connections: 10, address: "192.168.1.10", identityParts: ["fast"] }), duplicateCount: 1 },
];
assert.equal(sortWorkspaceRows(terminalRows, terminalDefinition, "traffic-desc")[0].id, "fast");
assert.equal(sortWorkspaceRows(terminalRows, terminalDefinition, "connections-desc")[0].id, "slow");
assert.equal(sortWorkspaceRows(terminalRows, terminalDefinition, "address-asc")[0].id, "fast");

const logDefinition = domainDefinitionFor("logs");
assert.equal(logDefinition.defaultSort, "time-desc");
assert.equal(logDefinition.filters.some((item) => item.id === "severity-error"), true);
const logRows = [
  { id: "old", table: "最近日志", columns: [], values: { time: "2099-01-01T00:00:00Z", topics: "system", message: "error counter reset" }, primary: "old", secondary: "", trailing: "", searchText: "system error counter reset", meta: workspaceMeta({ timestamp: Date.parse("2026-07-16T08:00:00Z"), severity: "info", tags: ["topic-system"], identityParts: ["old"] }), duplicateCount: 1 },
  { id: "new", table: "最近日志", columns: [], values: { time: "2000-01-01T00:00:00Z", topics: "warning", message: "new" }, primary: "new", secondary: "", trailing: "", searchText: "warning new", meta: workspaceMeta({ timestamp: Date.parse("2026-07-16T09:00:00Z"), severity: "warning", attention: true, tags: ["topic-warning"], identityParts: ["new"] }), duplicateCount: 1 },
];
assert.equal(sortWorkspaceRows(logRows, logDefinition, "time-desc")[0].id, "new");
const infoErrorTextRows = filterWorkspaceRows(logRows, logDefinition, "severity-error");
assert.equal(infoErrorTextRows.some((row) => row.id === "old"), false, "display text must not manufacture log severity");

const ecmpSection = {
  title: "路由表",
  description: "",
  updatedAt: "",
  evidenceMode: "current",
  status: "",
  statusTone: "trust",
  metrics: [],
  tables: [{
    title: "路由记录",
    columns: [{ key: "destination", label: "目的" }, { key: "gateway", label: "网关" }, { key: "table", label: "表" }, { key: "distance", label: "距离" }],
    rows: [
      { destination: "0.0.0.0/0", gateway: "198.51.100.1", table: "main", distance: "1" },
      { destination: "0.0.0.0/0", gateway: "198.51.100.1", table: "main", distance: "2" },
    ],
    rowMeta: [
      workspaceMeta({ active: true, distance: 1, identityParts: ["0.0.0.0/0", "198.51.100.1", "main", "1", "static"] }),
      workspaceMeta({ active: true, distance: 2, identityParts: ["0.0.0.0/0", "198.51.100.1", "main", "2", "static"] }),
    ],
    empty: "",
  }],
};
const ecmpRows = rowsFromModel("routes", ecmpSection);
const reorderedEcmpSection = {
  ...ecmpSection,
  tables: ecmpSection.tables.map((item) => ({ ...item, rows: [...item.rows].reverse(), rowMeta: [...item.rowMeta].reverse() })),
};
const reorderedEcmpRows = rowsFromModel("routes", reorderedEcmpSection);
assert.equal(new Set(ecmpRows.map((row) => row.id)).size, 2, "ECMP route identities must not collide");
assert.deepEqual(
  new Map(ecmpRows.map((row) => [row.values.distance, row.id])),
  new Map(reorderedEcmpRows.map((row) => [row.values.distance, row.id])),
  "ECMP identities must survive source reordering",
);

const duplicateLogSection = {
  ...ecmpSection,
  tables: [{
    title: "最近日志",
    columns: [{ key: "time", label: "时间" }, { key: "topics", label: "主题" }, { key: "message", label: "内容" }],
    rows: [
      { time: "2026-07-16T09:00:00Z", topics: "system", message: "same" },
      { time: "2026-07-16T09:00:00Z", topics: "system", message: "same" },
    ],
    rowMeta: [
      workspaceMeta({ timestamp: Date.parse("2026-07-16T09:00:00Z"), identityParts: ["2026-07-16T09:00:00Z", "system", "same"] }),
      workspaceMeta({ timestamp: Date.parse("2026-07-16T09:00:00Z"), identityParts: ["2026-07-16T09:00:00Z", "system", "same"] }),
    ],
    empty: "",
  }],
};
const duplicateLogRows = rowsFromModel("logs", duplicateLogSection);
assert.equal(duplicateLogRows.length, 1, "exact duplicate immutable logs collapse deterministically");
assert.equal(duplicateLogRows[0].duplicateCount, 2);

const mislabeledInterfaces = modelForHint(clone(OVERVIEW_SCENARIO_FIXTURES.single), "interfaces-down");
assert.equal(mislabeledInterfaces.risk, "none", "scenario hints must not invent object risk");
const mislabeledCollection = modelForHint(clone(OVERVIEW_SCENARIO_FIXTURES.single), "collection-down");
assert.equal(mislabeledCollection.evidenceMode, "current", "scenario hints must not downgrade evidence");
assert.equal(mislabeledCollection.risk, "none");

const resource = clone(OVERVIEW_SCENARIO_FIXTURES["resource-full"]);
const resourceTimestamps = resource.overview.history.timestamps;
const resourceCpu = resource.overview.history.cpu;
const resourceMemory = resource.overview.history.memory;
const resourceDisk = resource.overview.history.disk;
resource.overview.history.resourceSamples = resourceTimestamps.map((timestamp, index) => ({
  timestamp,
  cpu: resourceCpu[index],
  memory: resourceMemory[index],
  disk: resourceDisk[index],
  source: "scenario-fixture",
  evidenceMode: "current",
}));
resource.overview.history.cpu = resourceCpu.map(() => 0);
resource.overview.history.memory = resourceMemory.map(() => 0);
resource.overview.history.disk = resourceDisk.map(() => 0);
const resourceModel = modelFor(resource);
assert.equal(resourceModel.risk, "resource");
assert.deepEqual(resourceModel.facts.map((row) => row.key), ["resource-breaches", "resource-trailing", "resource-samples"]);
assert.deepEqual(resourceModel.facts.map((row) => row.value), ["3 / 3", "25 秒", "原子序列"]);
assert.equal(resourceModel.priorityObjects.length, 1);
assert.equal(resourceModel.priorityObjects[0].route, "trafficLoad");
assert.equal(resourceModel.priorityObjects[0].name, "CPU", "resource incident ownership belongs to the leading breached metric, not the router");
assert.match(resourceModel.priorityObjects[0].state, /96%.*85%/, "resource incident state carries current value and threshold once");
assert.match(resourceModel.priorityObjects[0].reason, /高出 11 个百分点.*连续 6 \/ 6 个样本.*25 秒/, "resource incident adds threshold delta and per-metric time evidence");
assert.equal(resourceModel.traffic, null, "resource incidents must not be displaced by an unrelated WAN chart");
assert.equal(resourceModel.resource.status, "ready");
assert.deepEqual(
  resourceModel.resource.metrics.map((metric) => metric.label),
  ["CPU", "磁盘", "内存"],
  "resource instrument uses delta, continuity and current value in the same order as the primary object",
);
assert.deepEqual(resourceModel.resource.metrics.map((metric) => metric.threshold), [85, 90, 85]);
assert.equal(resourceModel.resource.points.length, 6, "resource trend requires six real timestamped samples");
assert.deepEqual(
  resourceModel.resource.points.map((point) => [point.cpu, point.memory, point.disk]),
  resourceCpu.map((cpu, index) => [cpu, resourceMemory[index], resourceDisk[index]]),
  "atomic resource samples must outrank incompatible legacy parallel arrays",
);

const resourcePriorityFixture = ({ cpu, memory, disk }) => {
  const fixture = clone(resource);
  fixture.overview.cpuLoad = cpu[cpu.length - 1];
  fixture.overview.memoryUsage = memory[memory.length - 1];
  fixture.overview.diskUsage = disk[disk.length - 1];
  fixture.overview.history.resourceSamples = fixture.overview.history.resourceSamples.map((sample, index) => ({
    ...sample,
    cpu: cpu[index],
    memory: memory[index],
    disk: disk[index],
  }));
  return fixture;
};

const diskPrimaryResource = resourcePriorityFixture({
  cpu: [86, 87, 88, 89, 90, 90],
  memory: [86, 88, 89, 90, 91, 91],
  disk: [91, 94, 96, 98, 99, 100],
});
const diskPrimaryModel = modelFor(diskPrimaryResource);
assert.equal(diskPrimaryModel.priorityObjects[0].name, "磁盘", "a non-CPU metric with the largest threshold delta owns the incident");
assert.equal(diskPrimaryModel.resource.metrics[0].label, "磁盘", "the resource instrument starts with the same non-CPU primary metric");
assert.deepEqual(
  diskPrimaryModel.resource.metrics.slice(1).map((metric) => metric.label),
  ["内存", "CPU"],
  "related resource comparison excludes whichever metric is primary rather than a CPU special case",
);

const continuityPriorityResource = resourcePriorityFixture({
  cpu: [70, 70, 70, 70, 95, 95],
  memory: [95, 95, 95, 95, 95, 95],
  disk: [80, 80, 100, 100, 100, 100],
});
const continuityPriorityModel = modelFor(continuityPriorityResource);
assert.equal(
  continuityPriorityModel.priorityObjects[0].name,
  "内存",
  "when threshold deltas tie, longer trailing continuity outranks a higher current value",
);
assert.deepEqual(
  continuityPriorityModel.resource.metrics.map((metric) => metric.label),
  ["内存", "磁盘", "CPU"],
  "the instrument applies the continuity tie-break before current value",
);
assert.deepEqual(
  sortWorkspaceRows(
    rowsFromModel("trafficLoad", buildSectionModel("trafficLoad", continuityPriorityResource)),
    domainDefinitionFor("trafficLoad"),
    "risk-desc",
  ).map((row) => row.primary),
  ["内存", "磁盘", "CPU"],
  "the trafficLoad queue consumes the same continuity-first priority order",
);

const currentValuePriorityResource = resourcePriorityFixture({
  cpu: [95, 95, 95, 95, 95, 95],
  memory: [95, 95, 95, 95, 95, 95],
  disk: [100, 100, 100, 100, 100, 100],
});
const currentValuePriorityModel = modelFor(currentValuePriorityResource);
assert.equal(
  currentValuePriorityModel.priorityObjects[0].name,
  "磁盘",
  "when threshold delta and continuity tie, the higher current value owns the incident",
);
assert.equal(currentValuePriorityModel.resource.metrics[0].label, "磁盘");
assert.equal(
  sortWorkspaceRows(
    rowsFromModel("trafficLoad", buildSectionModel("trafficLoad", currentValuePriorityResource)),
    domainDefinitionFor("trafficLoad"),
    "risk-desc",
  )[0].primary,
  "磁盘",
  "the queue uses the same current-value tie-break",
);
const resourceWithExplicitEmptyAtomicHistory = clone(OVERVIEW_SCENARIO_FIXTURES["resource-full"]);
resourceWithExplicitEmptyAtomicHistory.overview.history.resourceSamples = [];
const explicitEmptyAtomicModel = modelFor(resourceWithExplicitEmptyAtomicHistory);
assert.equal(explicitEmptyAtomicModel.resource.status, "accumulating");
assert.equal(explicitEmptyAtomicModel.resource.points.length, 0, "an explicit empty atomic stream must not fall back to legacy arrays");
const resourceWithoutSource = clone(resource);
resourceWithoutSource.overview.history.resourceSamples[0].source = "";
const resourceWithoutSourceModel = modelFor(resourceWithoutSource);
assert.equal(resourceWithoutSourceModel.resource.points.length, 0, "atomic resource samples require a non-empty acquisition source");

const resourceSection = buildSectionModel("trafficLoad", resource);
assert.equal(resourceSection.visualization.kind, "time-series");
assert.equal(resourceSection.visualization.series.length, 3);
assert.equal(resourceSection.visualization.series.every((series) => series.points.length >= 2), true);
const resourceRows = rowsFromModel("trafficLoad", resourceSection);
const cpuResourceRow = resourceRows.find((row) => row.primary === "CPU");
assert.ok(cpuResourceRow, "resource workspace exposes the concrete CPU object");
assert.equal(cpuResourceRow.evidence.kind, "resource");
assert.equal(cpuResourceRow.evidence.threshold, 85);
assert.equal(cpuResourceRow.evidence.latest, 96);
assert.equal(cpuResourceRow.evidence.delta, 11);
assert.equal(cpuResourceRow.evidence.trailing, 6);
assert.equal(cpuResourceRow.evidence.durationSeconds, 25);
assert.match(cpuResourceRow.evidence.evidenceAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/);

const interruptedResource = clone(resource);
interruptedResource.overview.history.resourceSamples = interruptedResource.overview.history.resourceSamples.slice(0, 5).map((sample, index) => ({
  ...sample,
  cpu: [90, 90, 20, 90, 90][index],
  memory: 20,
  disk: 20,
}));
const interruptedModel = modelFor(interruptedResource);
assert.equal(interruptedModel.facts.find((row) => row.key === "resource-trailing").value, "未取得");
assert.equal(interruptedModel.facts.find((row) => row.key === "resource-samples").value, "未取得");
assert.equal(interruptedModel.priorityObjects[0].state, "96% · 阈值 85%");
assert.match(interruptedModel.priorityObjects[0].reason, /连续性未取得/);
const interruptedSection = buildSectionModel("trafficLoad", interruptedResource);
const interruptedCpuRow = rowsFromModel("trafficLoad", interruptedSection).find((row) => row.primary === "CPU");
assert.ok(interruptedCpuRow, "mismatched history still exposes the current CPU object");
assert.equal(interruptedCpuRow.evidence.latest, 96, "deep links use the current snapshot value");
assert.equal(interruptedCpuRow.evidence.sampleCount, 0, "mismatched history cannot prove continuity");
assert.equal(interruptedCpuRow.evidence.trailing, 0);
assert.deepEqual(interruptedCpuRow.evidence.values, []);

const staleResource = clone(resource);
const staleAnchor = Date.parse(staleResource.updatedAt) - 10 * 60 * 1000;
staleResource.overview.history.resourceSamples = staleResource.overview.history.resourceSamples.map((sample, index, rows) => ({
  ...sample,
  timestamp: new Date(staleAnchor - (rows.length - 1 - index) * 5000).toISOString(),
}));
const staleResourceModel = modelFor(staleResource);
assert.equal(staleResourceModel.facts.find((row) => row.key === "resource-trailing").value, "未取得");
assert.match(staleResourceModel.priorityObjects[0].reason, /连续性未取得/);
const staleCpuRow = rowsFromModel("trafficLoad", buildSectionModel("trafficLoad", staleResource)).find((row) => row.primary === "CPU");
assert.equal(staleCpuRow.evidence.latest, 96);
assert.equal(staleCpuRow.evidence.sampleCount, 0, "stale history cannot become current continuity");

const highPollStaleResource = clone(staleResource);
highPollStaleResource.meta.pollSeconds = 300;
const highPollStaleModel = modelFor(highPollStaleResource);
assert.equal(
  highPollStaleModel.facts.find((row) => row.key === "resource-trailing").value,
  "未取得",
  "a legal slow poll interval cannot turn ten-minute-old history into current continuity",
);
const highPollStaleCpuRow = rowsFromModel("trafficLoad", buildSectionModel("trafficLoad", highPollStaleResource)).find((row) => row.primary === "CPU");
assert.equal(highPollStaleCpuRow.evidence.sampleCount, 0, "the absolute stale cap also applies to direct resource deep links");

const incompleteMetricResource = clone(resource);
incompleteMetricResource.overview.history.resourceSamples[incompleteMetricResource.overview.history.resourceSamples.length - 1].memory = null;
const incompleteMetricModel = modelFor(incompleteMetricResource);
assert.equal(incompleteMetricModel.facts.find((row) => row.key === "resource-trailing").value, "25 秒", "missing memory does not erase CPU continuity");
const partialSection = buildSectionModel("trafficLoad", incompleteMetricResource);
const partialRows = rowsFromModel("trafficLoad", partialSection);
const partialCpu = partialRows.find((row) => row.primary === "CPU");
const partialMemory = partialRows.find((row) => row.primary === "内存");
const partialDisk = partialRows.find((row) => row.primary === "磁盘");
assert.equal(partialCpu.evidence.sampleCount, 6);
assert.equal(partialMemory.evidence.sampleCount, 0, "missing latest memory only invalidates memory continuity");
assert.equal(partialDisk.evidence.sampleCount, 6);
assert.deepEqual(partialSection.visualization.series.map((series) => series.key).sort(), ["cpu", "disk"], "valid metric histories remain drawable");

const resourceWithoutTimestamps = clone(resource);
resourceWithoutTimestamps.overview.history.resourceSamples = resourceWithoutTimestamps.overview.history.resourceSamples.map(({ timestamp, ...sample }) => sample);
const resourceWithoutTimestampsModel = modelFor(resourceWithoutTimestamps);
assert.equal(resourceWithoutTimestampsModel.resource.status, "accumulating");
assert.equal(resourceWithoutTimestampsModel.resource.points.length, 0, "resource values without timestamps are not drawn as a trend");

const noSnapshot = clone(OVERVIEW_SCENARIO_FIXTURES["no-snapshot"]);
noSnapshot.meta.configuredIdentity = "configured-router";
noSnapshot.overview.identity = "无可用快照";
noSnapshot.meta.realtimeError = "RouterOS 当前不可达；无可用快照";
noSnapshot.meta.slowRestError = "无可用快照";
noSnapshot.meta.connectionDetailError = "无可用快照";
const noSnapshotModel = modelFor(noSnapshot);
assert.equal(noSnapshotModel.device, "configured-router");
assert.match(noSnapshotModel.deviceNote, new RegExp(noSnapshot.meta.routerHost));
assert.deepEqual(noSnapshotModel.facts.map((row) => row.key), ["snapshot", "target", "last-success"]);
assert.doesNotMatch(JSON.stringify(noSnapshotModel.facts), /0 \/ 0|0 bps/);
const noSnapshotRest = noSnapshotModel.priorityObjects.find((row) => row.name === "REST");
assert.equal(noSnapshotRest.reason, "RouterOS 当前不可达；无可用快照", "repeated endpoint phrases must be normalized once at the shared model boundary");
assert.equal(noSnapshotModel.priorityLabel, "恢复入口");
assert.equal(noSnapshotModel.priorityTitle, "恢复当前快照");
assert.deepEqual(noSnapshotModel.evidenceRows.map((row) => row.key), ["failures", "boundary"]);

const collectionModel = modelFor(clone(OVERVIEW_SCENARIO_FIXTURES["collection-down"]));
const collectionRest = collectionModel.priorityObjects.find((row) => row.name === "REST");
const collectionPhrases = collectionRest.reason.split("；");
assert.equal(new Set(collectionPhrases).size, collectionPhrases.length, "collection diagnostics must not repeat identical phrases");
assert.match(collectionRest.reason, /连接明细 REST 采集失败/, "distinct auxiliary evidence must remain visible");
assert.equal(collectionModel.priorityLabel, "断链通道");
assert.equal(collectionModel.priorityTitle, "定位断开的采集通道");
assert.deepEqual(collectionModel.evidenceRows.map((row) => row.key), ["target", "failures", "boundary"]);

const fleetModel = modelFor(clone(OVERVIEW_SCENARIO_FIXTURES.fleet));
assert.equal(fleetModel.risk, "none");
assert.equal(fleetModel.traffic.status, "ready");
assert.deepEqual(fleetModel.facts.map((row) => row.key), ["route", "wan", "interfaces"]);
assert.equal(fleetModel.focusObject.route, "routes");

const singleModel = modelFor(clone(OVERVIEW_SCENARIO_FIXTURES.single));
assert.equal(singleModel.verdictLabel, "当前出口证据");
assert.equal(singleModel.verdictTitle, "业务可用性尚未判定");
assert.equal(singleModel.verdictSummary, "已核实默认路由与采集通道；未探测外部业务。");
assert.doesNotMatch(singleModel.verdictTitle, /出口路径已核实/);
assert.equal(singleModel.scenarioFocus, null);
assert.equal(singleModel.focusObject.category, "活动默认路由");
assert.equal(singleModel.focusObject.route, "routes");
assert.deepEqual(
  singleModel.focusObject.attributes,
  [
    { label: "路由表", value: "main" },
    { label: "网关", value: "1.1.1.1" },
    { label: "distance", value: "1" },
    { label: "活动候选", value: "1 条" },
  ],
  "Step188 tablet dossier requires novel route facts plus explicit active-candidate semantics",
);
assert.deepEqual(singleModel.evidenceRows.map((row) => row.key), ["target", "boundary"], "recency belongs to the evidence line, not a duplicate ledger row");
assert.equal(Array.isArray(singleModel.secondaryDecisions), true, "Step189 requires shared normal secondary decisions");
assert.deepEqual(
  singleModel.secondaryDecisions.map((row) => row.id),
  ["decision-interfaces", "decision-resource", "decision-connections"],
  "single normal decisions add interface, resource and connection facts without replaying Proof/Focus/Signal",
);
assert.deepEqual(
  singleModel.secondaryDecisions.map((row) => row.route),
  ["interfaces", "trafficLoad", "connections"],
  "secondary decisions retain their canonical operational destinations",
);
assert.deepEqual(
  fleetModel.secondaryDecisions.map((row) => row.id),
  ["decision-resource", "decision-connections"],
  "Fleet omits the interface count already owned by Proof",
);
for (const [name, unavailableModel] of [
  ["no-snapshot", noSnapshotModel],
  ["collection-down", collectionModel],
  ["resource-full", resourceModel],
]) {
  assert.deepEqual(
    unavailableModel.secondaryDecisions,
    [],
    `${name} must not mount normal current secondary decisions`,
  );
}

const fleetInterfaces = clone(OVERVIEW_SCENARIO_FIXTURES.fleet);
fleetInterfaces.interfaces = [
  { name: "ether1", running: true, disabled: false },
  { name: "ether2", running: false, disabled: false, parent: "switch1", vlan: 20 },
  { name: "ether3", running: false, disabled: false, parent: "switch1", vlan: 30 },
  { name: "ether4", running: false, disabled: false, parent: "switch2", vlan: 40 },
];
fleetInterfaces.routes = {
  defaultRoutes: [
    { default: true, dstAddress: "0.0.0.0/0", gateway: "ether1", active: true, disabled: false, distance: 1, table: "main" },
    { default: true, dstAddress: "0.0.0.0/0", gateway: "ether2", active: false, disabled: false, distance: 2, table: "main" },
    { default: true, dstAddress: "0.0.0.0/0", gateway: "ether3", active: false, disabled: false, distance: 3, table: "main" },
    { default: true, dstAddress: "0.0.0.0/0", gateway: "ether4", active: false, disabled: false, distance: 4, table: "main" },
  ],
};
const fleetInterfacesModel = modelFor(fleetInterfaces);
assert.equal(fleetInterfacesModel.risk, "interfaces", "real interface risk must outrank fleet scope");
assert.equal(fleetInterfacesModel.priorityObjects.length, 3);
assert.equal(fleetInterfacesModel.priorityTotal, 3);
assert.equal(fleetInterfacesModel.traffic.title, "接口依赖异常期间的 WAN 吞吐");
assert.match(fleetInterfacesModel.traffic.accessibleSummary, /不证明未运行接口已经影响或没有影响业务/);

const forcedFleetInterfacesState = deriveOverviewState(fleetInterfaces, { scenarioHint: "fleet" });
assert.equal(
  routerOsNetworkPriority(forcedFleetInterfacesState),
  "interface-down",
  "Fleet scope must not mask an interface-down priority in the network presentation model",
);
const forcedFleetResourceState = deriveOverviewState(clone(OVERVIEW_SCENARIO_FIXTURES["resource-full"]), { scenarioHint: "fleet" });
assert.equal(
  routerOsNetworkPriority(forcedFleetResourceState),
  "resource-full",
  "Fleet scope must not mask resource pressure in the network presentation model",
);
assert.equal(
  routerOsNetworkPriority(deriveOverviewState(clone(OVERVIEW_SCENARIO_FIXTURES.fleet))),
  "normal",
  "an incident-free Fleet remains a normal scope presentation",
);

const offlineModel = modelFor(clone(OVERVIEW_SCENARIO_FIXTURES["all-offline"]));
assert.equal(offlineModel.risk, "wan");
assert.equal(offlineModel.scenarioFocus?.kind, "outage");
assert.deepEqual(offlineModel.scenarioFocus?.items.map((item) => item.key), ["impact", "route", "last-success", "recovery"]);
assert.deepEqual(offlineModel.scenarioFocus?.items.map((item) => item.actionable), [true, true, false, false]);
assert.equal(offlineModel.scenarioFocus?.items.filter((item) => item.actionable).length, 2, "scenario focus exposes at most two first-layer actions");
assert.equal(offlineModel.priorityTotal, 8);
assert.equal(offlineModel.priorityObjects.length, 3);
assert.equal(offlineModel.priorityObjectsAll.length, 8, "tablet owns the complete incident object list");
assert.equal(offlineModel.priorityObjects.every((row) => row.route === "lineStatus"), true);
assert.equal(offlineModel.priorityLabel, "离线 WAN");
assert.equal(offlineModel.priorityTitle, "逐条核对 WAN 链路");
assert.deepEqual(offlineModel.evidenceRows.map((row) => row.key), ["target", "boundary"]);
assert.equal(offlineModel.traffic, null);

const investigationContractFailures = [];
const recordInvestigationContract = (condition, id, actual) => {
  if (!condition) investigationContractFailures.push({ id, actual });
};
const inspectInvestigationAction = (action) => {
  const url = routeUrl(
    action.route,
    { pathname: "/panel", search: "?mode=public" },
    action.navigation || {},
  );
  return {
    action,
    url,
    context: navigationContextFromLocation({ search: new URL(url, "https://panel.local").search }),
  };
};
const interfacesInvestigation = inspectInvestigationAction(
  interfacesModel.investigationActions.find((action) => action.route === "interfaces"),
);
recordInvestigationContract(
  interfacesInvestigation.action.mode === "investigation",
  "interfaces-mode",
  interfacesInvestigation,
);
recordInvestigationContract(
  interfacesInvestigation.context.risk === "interfaces" &&
    interfacesInvestigation.context.objectId === null &&
    interfacesInvestigation.context.returnRoute === "overview" &&
    interfacesInvestigation.context.evidenceAt === interfacesModel.evidenceAt,
  "interfaces-context",
  interfacesInvestigation,
);
const resourceInvestigation = inspectInvestigationAction(
  resourceModel.investigationActions.find((action) => action.route === "trafficLoad"),
);
recordInvestigationContract(
  resourceInvestigation.action.mode === "investigation",
  "resource-mode",
  resourceInvestigation,
);
recordInvestigationContract(
  resourceInvestigation.context.risk === "resource" &&
    resourceInvestigation.context.objectId === resourceModel.priorityObjects[0].targetObjectId &&
    resourceInvestigation.context.returnRoute === "overview" &&
    resourceInvestigation.context.evidenceAt === resourceModel.evidenceAt,
  "resource-context",
  resourceInvestigation,
);
const multiWanWorkspace = inspectInvestigationAction(
  offlineModel.investigationActions.find((action) => action.route === "lineStatus"),
);
recordInvestigationContract(
  multiWanWorkspace.action.mode === "workspace" && multiWanWorkspace.action.navigation === undefined,
  "multi-wan-no-first-row-fallback",
  multiWanWorkspace,
);
const unsupportedLogsWorkspace = inspectInvestigationAction(
  collectionModel.investigationActions.find((action) => action.route === "logs"),
);
recordInvestigationContract(
  unsupportedLogsWorkspace.action.mode === "workspace" && unsupportedLogsWorkspace.action.navigation === undefined,
  "unsupported-logs-no-context",
  unsupportedLogsWorkspace,
);
assert.deepEqual(
  investigationContractFailures,
  [],
  "overview investigation actions must carry only context their target route can consume: " + JSON.stringify(investigationContractFailures),
);

const historicalInterfaces = clone(OVERVIEW_SCENARIO_FIXTURES["interfaces-down"]);
historicalInterfaces.meta.clientEvidenceBoundary = "stale";
const historicalInterfacesModel = modelFor(historicalInterfaces);
assert.equal(historicalInterfacesModel.risk, "collection", "historical objects must not be presented as current incidents");
assert.equal(historicalInterfacesModel.priorityObjects.every((row) => row.route === "readonlyDiagnostics"), true);

const composite = clone(resource);
composite.interfaces = [{ name: "ether2", running: false, disabled: false, parent: "switch1" }];
composite.routes.defaultRoutes.push({ default: true, dstAddress: "0.0.0.0/0", gateway: "ether2", active: false, disabled: false, distance: 2, table: "main" });
const compositeModel = modelFor(composite);
assert.equal(compositeModel.risk, "interfaces", "proved default-route interface dependency outranks resource pressure that does not prove network interruption");
assert.deepEqual(
  compositeModel.riskQueue.map((item) => item.risk),
  ["interfaces", "resource"],
  "resource pressure remains discoverable after the proved route-path risk",
);
const compositeInterfaceTask = compositeModel.riskQueue[0];
assert.ok(compositeInterfaceTask.targetObjectId, "one proved interface risk may deep-link to that exact object");
assert.equal(typeof compositeInterfaceTask.targetObjectId, "string");
assert.ok(compositeInterfaceTask.targetObjectId.length > 0);

const outletAndResource = clone(resource);
for (const rows of [outletAndResource.wan, outletAndResource.pppoe]) for (const row of rows) row.running = false;
outletAndResource.routes.defaultRoutes = outletAndResource.routes.defaultRoutes.map((route) => ({ ...route, active: false }));
const outletAndResourceModel = modelForHint(outletAndResource, "resource-full");
assert.equal(outletAndResourceModel.risk, "wan", "all-WAN outage outranks resource pressure");
assert.deepEqual(
  outletAndResourceModel.riskQueue.map((item) => item.risk),
  ["wan", "resource"],
  "resource pressure remains visible while the derived missing route is not duplicated after a WAN outage",
);

const mixedInterfaceAndRoute = clone(OVERVIEW_SCENARIO_FIXTURES.single);
mixedInterfaceAndRoute.interfaces = [
  { name: "ether2", running: false, disabled: false, parent: "switch1" },
  { name: "ether3", running: false, disabled: false, parent: "switch1" },
];
mixedInterfaceAndRoute.routes.defaultRoutes = [
  { default: true, dstAddress: "0.0.0.0/0", gateway: "ether2", active: false, disabled: false, distance: 2, table: "main" },
];
const mixedInterfaceAndRouteModel = modelFor(mixedInterfaceAndRoute);
assert.equal(mixedInterfaceAndRouteModel.risk, "interfaces");
assert.deepEqual(
  mixedInterfaceAndRouteModel.riskQueue.map((item) => item.risk),
  ["interfaces", "interface-review", "route"],
  "all independent current risks remain ordered and discoverable",
);
const mixedReviewTask = mixedInterfaceAndRouteModel.riskQueue[1];
const mixedRouteTask = mixedInterfaceAndRouteModel.riskQueue[2];
assert.ok(mixedReviewTask.targetObjectId, "one unverified interface observation may identify its exact object");
assert.ok(mixedReviewTask.targetObjectId);
assert.equal(mixedRouteTask.targetObjectId, undefined, "an unverified route concept must not fabricate an object ID");
const noTimestamps = clone(OVERVIEW_SCENARIO_FIXTURES.single);
delete noTimestamps.overview.history.timestamps;
noTimestamps.overview.history.resourceSamples = noTimestamps.overview.history.resourceSamples.map(({ timestamp, ...sample }) => sample);
const noTimestampResource = buildSectionModel("trafficLoad", noTimestamps);
assert.equal(noTimestampResource.visualization, undefined, "resource values without timestamps must not be drawn as a trend");
assert.equal(noTimestampResource.tables[0].rows[0].samples, "未取得", "resource values without timestamps are not counted as historical samples");

const legacyTrafficHistory = clone(OVERVIEW_SCENARIO_FIXTURES.single);
delete legacyTrafficHistory.overview.history.trafficSamples;
legacyTrafficHistory.overview.history.timestamps = [1, 2, 3];
legacyTrafficHistory.overview.history.downlink = [2100, 2600, 3400];
legacyTrafficHistory.overview.history.uplink = [800, 920, 1200];
assert.equal(modelFor(legacyTrafficHistory).traffic, null, "legacy parallel arrays are withheld instead of being labelled as a current trend");

const oneSample = clone(OVERVIEW_SCENARIO_FIXTURES.single);
oneSample.overview.history.trafficSamples = oneSample.overview.history.trafficSamples.slice(-1);
assert.equal(modelFor(oneSample).traffic.status, "accumulating", "one timestamped sample is not drawn as a trend");

const nonRateRefresh = clone(OVERVIEW_SCENARIO_FIXTURES.single);
nonRateRefresh.overview.history.timestamps.push(9999999999);
nonRateRefresh.overview.history.downlink = [2100, 2600, 2300, 3100, 2900, 999999];
nonRateRefresh.overview.history.uplink = [800, 920, 760, 1080, 1010, 999999];
const nonRateRefreshModel = modelFor(nonRateRefresh);
assert.equal(nonRateRefreshModel.traffic.status, "ready", "non-rate refresh cannot shift atomic traffic samples onto a newer resource timestamp");
assert.deepEqual(
  nonRateRefreshModel.traffic.points.map((point) => ({ timestamp: point.timestamp, down: point.down, up: point.up })),
  nonRateRefresh.overview.history.trafficSamples.map((sample) => ({
    timestamp: Date.parse(sample.timestamp),
    down: sample.downlink,
    up: sample.uplink,
  })),
  "traffic charts consume only atomic rate samples, never legacy parallel arrays",
);

const inconsistentAtomicTraffic = clone(OVERVIEW_SCENARIO_FIXTURES.single);
inconsistentAtomicTraffic.overview.history.trafficSamples[inconsistentAtomicTraffic.overview.history.trafficSamples.length - 1].downlink = 999999;
assert.equal(modelFor(inconsistentAtomicTraffic).traffic, null, "an atomic sample that disagrees with the current observed rate is withheld");

const counterResetBoundary = clone(OVERVIEW_SCENARIO_FIXTURES.single);
const resetSamples = counterResetBoundary.overview.history.trafficSamples.slice(-2);
const latestResetTimestamp = Date.parse(resetSamples[1].timestamp);
const resetTimestamp = (offsetSeconds) => new Date(latestResetTimestamp + offsetSeconds * 1000).toISOString();
counterResetBoundary.overview.history.trafficSamples = [
  { ...resetSamples[0], timestamp: resetTimestamp(-15) },
  { timestamp: resetTimestamp(-10), uplink: null, downlink: null, source: "counter-delta", evidenceMode: "unavailable" },
  { ...resetSamples[0], timestamp: resetTimestamp(-5) },
  { ...resetSamples[1], timestamp: resetTimestamp(0) },
];
const counterResetModel = modelFor(counterResetBoundary);
assert.equal(counterResetModel.traffic.status, "ready");
assert.deepEqual(
  counterResetModel.traffic.points.map((point) => point.timestamp),
  [latestResetTimestamp - 5_000, latestResetTimestamp],
  "counter-reset samples split the atomic trend instead of connecting generations",
);

for (const [scenario, fixture] of Object.entries(OVERVIEW_SCENARIO_FIXTURES)) {
  const model = modelFor(clone(fixture));
  assert.equal(model.facts.length, 3, `${scenario}: exactly three core facts`);
  assert.equal(model.priorityObjects.length <= 3, true, `${scenario}: first queue is Top 3`);
  assert.equal(model.priorityObjects.every((row) => row.route && row.sourcePath), true, `${scenario}: every preview object has real ownership and source`);
  assert.equal(model.priorityObjectsAll.every((row) => row.route && row.sourcePath), true, `${scenario}: every tablet object has real ownership and source`);
  assert.equal(model.priorityObjectsAll.every((row) => row.attributes.length >= 3), true, `${scenario}: every tablet object exposes novel inspector evidence`);
  const factPairs = new Set(model.facts.map((row) => `${row.label}::${row.value}`));
  assert.equal(model.priorityObjects.some((row) => factPairs.has(`${row.category}::${row.state}`)), false, `${scenario}: queue must not replay a fact pair`);
  const failureEvidence = model.evidenceRows.find((row) => row.key === "failures");
  assert.equal(!failureEvidence || /^已记录 [1-9]\d*$/.test(failureEvidence.value), true, `${scenario}: failure evidence is absent or a positive recorded count`);
  assert.equal(model.evidenceRows.some((row) => row.key === "success"), false, `${scenario}: recency must not be repeated in the evidence ledger`);
  if (model.traffic?.status === "ready") {
    assert.equal(model.traffic.points.length >= 2, true);
    assert.equal(model.evidenceMode, "current");
  }
}

console.log("adaptive mobile overview semantic contract: PASS");
