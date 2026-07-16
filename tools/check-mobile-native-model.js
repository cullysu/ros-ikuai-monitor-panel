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
const { buildSectionModel } = require(
  path.join(root, "src", "panel-framework", "sections", "sectionModels.ts")
);

const clone = (value) => structuredClone(value);
const modelFor = (snapshot) => buildOverviewEvidenceModel(snapshot, deriveOverviewState(snapshot));
const modelForHint = (snapshot, scenarioHint) => buildOverviewEvidenceModel(snapshot, deriveOverviewState(snapshot, { scenarioHint }));
const textOf = (model) => JSON.stringify(model);

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

const interfacesModel = modelFor(clone(OVERVIEW_SCENARIO_FIXTURES["interfaces-down"]));
assert.equal(interfacesModel.risk, "interfaces");
assert.equal(interfacesModel.priorityTotal, 2);
assert.equal(interfacesModel.priorityObjects[0].route, "interfaces");
assert.equal(interfacesModel.facts.find((row) => row.key === "route").value, "已核实");

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
