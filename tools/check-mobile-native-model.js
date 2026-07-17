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
const { deriveOverviewState, OVERVIEW_SCENARIO_FIXTURES } = require(
  path.join(root, "src", "panel-framework", "overview", "index.ts")
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
const { PANEL_ROUTES, routeUrl } = require(
  path.join(root, "src", "panel-framework", "routes", "panelRoutes.ts")
);
const { rowsFromModel } = require(
  path.join(root, "src", "panel-framework", "mobile", "mobileDomainWorkspaceModel.ts")
);
const { domainDefinitionFor, filterWorkspaceRows, sortWorkspaceRows } = require(
  path.join(root, "src", "panel-framework", "mobile", "mobileDomainDefinitions.ts")
);

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
assert.match(
  routeUrl("interfaces", { pathname: "/panel", search: "?mode=public" }, { objectId: "interface-ether9" }),
  /[?&]object=interface-ether9(?:&|#)/,
);

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
assert.match(conflictingDesktopModel.statusItems.find((item) => item.key === "route").value, /198\.51\.100\.2/);
const conflictingRouterOsModel = buildRouterOsRouteEvidenceModel(conflictingRoutes, conflictingRouteState);
assert.equal(conflictingRouterOsModel.businessRows[0].value, "198.51.100.2");
assert.doesNotMatch(conflictingRouterOsModel.summary.note, /198\.51\.100\.[13]/);

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
measuredZero.overview.history.downlink = [0, 0];
measuredZero.overview.history.uplink = [0, 0];
measuredZero.overview.history.timestamps = measuredZero.overview.history.timestamps.slice(-2);
const zeroModel = modelFor(measuredZero);
assert.equal(zeroModel.traffic.status, "ready", "explicit zero observations remain valid");
assert.equal(zeroModel.traffic.currentDown, "0 bps");
assert.equal(zeroModel.traffic.currentUp, "0 bps");

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
assert.equal(partialModel.facts[0].label, "上次通道记录");

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
const resourceModel = modelFor(resource);
assert.equal(resourceModel.risk, "resource");
assert.deepEqual(resourceModel.facts.map((row) => row.key), ["resource-breaches", "resource-trailing", "resource-samples"]);
assert.deepEqual(resourceModel.facts.map((row) => row.value), ["3 / 3", "6 个", "6 个"]);
assert.equal(resourceModel.priorityObjects.length, 1);
assert.equal(resourceModel.priorityObjects[0].route, "trafficLoad");
assert.equal(resourceModel.priorityObjects[0].state, "持续超限");
assert.match(resourceModel.priorityObjects[0].reason, /连接压力.*接口吞吐.*原始采样/);
assert.equal(resourceModel.traffic, null, "resource incidents must not be displaced by an unrelated WAN chart");
assert.equal(resourceModel.resource.status, "ready");
assert.deepEqual(resourceModel.resource.metrics.map((metric) => metric.label), ["CPU", "内存", "磁盘"]);
assert.deepEqual(resourceModel.resource.metrics.map((metric) => metric.threshold), [85, 85, 90]);
assert.equal(resourceModel.resource.points.length, 6, "resource trend requires six real timestamped samples");
const resourceSection = buildSectionModel("trafficLoad", resource);
assert.equal(resourceSection.visualization.kind, "time-series");
assert.equal(resourceSection.visualization.series.length, 3);
assert.equal(resourceSection.visualization.series.every((series) => series.points.length >= 2), true);

const interruptedResource = clone(resource);
interruptedResource.overview.history.cpu = [90, 90, 20, 90, 90];
interruptedResource.overview.history.memory = [20, 20, 20, 20, 20];
interruptedResource.overview.history.disk = [20, 20, 20, 20, 20];
const interruptedModel = modelFor(interruptedResource);
assert.equal(interruptedModel.facts.find((row) => row.key === "resource-trailing").value, "2 个");
assert.equal(interruptedModel.priorityObjects[0].state, "持续超限");

const resourceWithoutTimestamps = clone(resource);
delete resourceWithoutTimestamps.overview.history.timestamps;
const resourceWithoutTimestampsModel = modelFor(resourceWithoutTimestamps);
assert.equal(resourceWithoutTimestampsModel.resource.status, "accumulating");
assert.equal(resourceWithoutTimestampsModel.resource.points.length, 0, "resource values without timestamps are not drawn as a trend");

const noSnapshot = clone(OVERVIEW_SCENARIO_FIXTURES["no-snapshot"]);
noSnapshot.meta.configuredIdentity = "configured-router";
noSnapshot.overview.identity = "无可用快照";
const noSnapshotModel = modelFor(noSnapshot);
assert.equal(noSnapshotModel.device, "configured-router");
assert.match(noSnapshotModel.deviceNote, new RegExp(noSnapshot.meta.routerHost));
assert.deepEqual(noSnapshotModel.facts.map((row) => row.key), ["snapshot", "target", "last-success"]);
assert.doesNotMatch(JSON.stringify(noSnapshotModel.facts), /0 \/ 0|0 bps/);

const fleetModel = modelFor(clone(OVERVIEW_SCENARIO_FIXTURES.fleet));
assert.equal(fleetModel.risk, "none");
assert.equal(fleetModel.traffic.status, "ready");
assert.deepEqual(fleetModel.facts.map((row) => row.key), ["route", "wan", "interfaces"]);
assert.equal(fleetModel.focusObject.route, "routes");

const singleModel = modelFor(clone(OVERVIEW_SCENARIO_FIXTURES.single));
assert.equal(singleModel.focusObject.category, "活动出口");
assert.equal(singleModel.focusObject.route, "routes");
assert.equal(singleModel.focusObject.attributes.length, 3);

const fleetInterfaces = clone(OVERVIEW_SCENARIO_FIXTURES.fleet);
fleetInterfaces.interfaces = [
  { name: "ether1", running: true },
  { name: "ether2", running: false, parent: "switch1", vlan: 20 },
  { name: "ether3", running: false, parent: "switch1", vlan: 30 },
  { name: "ether4", running: false, parent: "switch2", vlan: 40 },
];
const fleetInterfacesModel = modelFor(fleetInterfaces);
assert.equal(fleetInterfacesModel.risk, "interfaces", "real interface risk must outrank fleet scope");
assert.equal(fleetInterfacesModel.priorityObjects.length, 3);
assert.equal(fleetInterfacesModel.priorityTotal, 3);
assert.equal(fleetInterfacesModel.traffic.title, "接口异常期间的 WAN 吞吐");
assert.match(fleetInterfacesModel.traffic.accessibleSummary, /不证明 Down 接口无影响/);

const offlineModel = modelFor(clone(OVERVIEW_SCENARIO_FIXTURES["all-offline"]));
assert.equal(offlineModel.risk, "wan");
assert.equal(offlineModel.priorityTotal, 8);
assert.equal(offlineModel.priorityObjects.length, 3);
assert.equal(offlineModel.priorityObjectsAll.length, 8, "tablet owns the complete incident object list");
assert.equal(offlineModel.priorityObjects.every((row) => row.route === "lineStatus"), true);
assert.equal(offlineModel.traffic, null);

const historicalInterfaces = clone(OVERVIEW_SCENARIO_FIXTURES["interfaces-down"]);
historicalInterfaces.meta.clientEvidenceBoundary = "stale";
const historicalInterfacesModel = modelFor(historicalInterfaces);
assert.equal(historicalInterfacesModel.risk, "collection", "historical objects must not be presented as current incidents");
assert.equal(historicalInterfacesModel.priorityObjects.every((row) => row.route === "readonlyDiagnostics"), true);

const composite = clone(resource);
composite.interfaces = [{ name: "ether2", running: false, parent: "switch1" }];
assert.equal(modelFor(composite).risk, "resource", "resource policy retains precedence over a non-outage interface record");

const outletAndResource = clone(resource);
for (const rows of [outletAndResource.wan, outletAndResource.pppoe]) for (const row of rows) row.running = false;
outletAndResource.routes.defaultRoutes = outletAndResource.routes.defaultRoutes.map((route) => ({ ...route, active: false }));
assert.equal(modelForHint(outletAndResource, "resource-full").risk, "wan", "all-WAN outage outranks resource pressure");

const noTimestamps = clone(OVERVIEW_SCENARIO_FIXTURES.single);
delete noTimestamps.overview.history.timestamps;
assert.equal(modelFor(noTimestamps).traffic.status, "accumulating", "current rates remain visible without fabricating a trend");
assert.equal(modelFor(noTimestamps).traffic.sampleCount, 0);
const noTimestampResource = buildSectionModel("trafficLoad", noTimestamps);
assert.equal(noTimestampResource.visualization, undefined, "resource values without timestamps must not be drawn as a trend");
assert.match(noTimestampResource.tables[0].rows[0].samples, /个$/);

const oneSample = clone(OVERVIEW_SCENARIO_FIXTURES.single);
oneSample.overview.history.timestamps = oneSample.overview.history.timestamps.slice(-1);
oneSample.overview.history.downlink = oneSample.overview.history.downlink.slice(-1);
oneSample.overview.history.uplink = oneSample.overview.history.uplink.slice(-1);
assert.equal(modelFor(oneSample).traffic.status, "accumulating", "one timestamped sample is not drawn as a trend");

const mismatchedHistory = clone(OVERVIEW_SCENARIO_FIXTURES.single);
mismatchedHistory.overview.history.downlink[mismatchedHistory.overview.history.downlink.length - 1] = 999999;
assert.equal(modelFor(mismatchedHistory).traffic.status, "accumulating", "mismatched history is withheld while current rates remain visible");
assert.equal(modelFor(mismatchedHistory).traffic.sampleCount, 0);

for (const [scenario, fixture] of Object.entries(OVERVIEW_SCENARIO_FIXTURES)) {
  const model = modelFor(clone(fixture));
  assert.equal(model.facts.length, 3, `${scenario}: exactly three core facts`);
  assert.equal(model.priorityObjects.length <= 3, true, `${scenario}: first queue is Top 3`);
  assert.equal(model.priorityObjects.every((row) => row.route && row.sourcePath), true, `${scenario}: every preview object has real ownership and source`);
  assert.equal(model.priorityObjectsAll.every((row) => row.route && row.sourcePath), true, `${scenario}: every tablet object has real ownership and source`);
  assert.equal(model.priorityObjectsAll.every((row) => row.attributes.length >= 3), true, `${scenario}: every tablet object exposes novel inspector evidence`);
  const factPairs = new Set(model.facts.map((row) => `${row.label}::${row.value}`));
  assert.equal(model.priorityObjects.some((row) => factPairs.has(`${row.category}::${row.state}`)), false, `${scenario}: queue must not replay a fact pair`);
  assert.equal(model.evidenceRows.find((row) => row.key === "failures").value === "0", false, `${scenario}: failure absence is not displayed as zero`);
  if (model.traffic?.status === "ready") {
    assert.equal(model.traffic.points.length >= 2, true);
    assert.equal(model.evidenceMode, "current");
  }
}

console.log("adaptive mobile overview semantic contract: PASS");
