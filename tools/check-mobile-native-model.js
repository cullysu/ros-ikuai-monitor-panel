const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildSync } = require("esbuild");

const root = process.cwd();
const outDir = path.join(root, "_acceptance", "mobile-native-model");
const bundleFile = path.join(outDir, "model-contract.cjs");

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
buildSync({
  stdin: {
    contents: [
      'export { buildMobileNativeModel } from "./src/panel-framework/overview/mobile-native/mobileNativeModel";',
      'export { deriveOverviewState, OVERVIEW_SCENARIO_FIXTURES } from "./src/panel-framework/overview";',
    ].join("\n"),
    loader: "ts",
    resolveDir: root,
    sourcefile: "mobile-native-model-contract.ts",
  },
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node20",
  outfile: bundleFile,
  logLevel: "silent",
});

const { buildMobileNativeModel, deriveOverviewState, OVERVIEW_SCENARIO_FIXTURES } = require(bundleFile);
const clone = (value) => structuredClone(value);
const modelFor = (snapshot) => buildMobileNativeModel(snapshot, deriveOverviewState(snapshot));
const modelForHint = (snapshot, scenarioHint) => buildMobileNativeModel(snapshot, deriveOverviewState(snapshot, { scenarioHint }));
const focusFor = (model, key) => model.focuses.find((focus) => focus.key === key);
const surfaceText = (model) => JSON.stringify({
  device: model.device,
  evidenceLabel: model.evidenceLabel,
  evidenceNote: model.evidenceNote,
  evidenceTime: model.evidenceTime,
  focuses: model.focuses,
});
const pairKey = (row) => `${String(row.label || "").trim()}::${String(row.value || "").trim()}`;
const assertNoProofObjectReplay = (model, label) => {
  for (const focus of model.focuses) {
    const proofPairs = new Set(focus.proofs.map(pairKey));
    const inspections = focus.objectInspections.length ? focus.objectInspections : [focus.inspection];
    const objectPairs = inspections.flatMap((inspection) => [...inspection.relations, ...inspection.rows]).map(pairKey);
    assert.equal(objectPairs.some((pair) => proofPairs.has(pair)), false, `${label}/${focus.key}: object evidence must not replay proof label/value pairs`);
  }
};

const inactiveRoute = clone(OVERVIEW_SCENARIO_FIXTURES.single);
inactiveRoute.routes.defaultRoutes = [{ table: "main", gateway: "198.51.100.1", distance: 1, active: false, disabled: false }];
const inactiveRouteModel = modelFor(inactiveRoute);
assert.equal(inactiveRouteModel.routeVerification, "unknown", "an inactive first route must not be promoted to active");
assert.equal(inactiveRouteModel.initialFocus, "route");
assert.doesNotMatch(focusFor(inactiveRouteModel, "route").title, /已核实/);

const nonDefaultOnly = clone(OVERVIEW_SCENARIO_FIXTURES.single);
nonDefaultOnly.routes = {
  defaultRoutes: [],
  items: [{ dstAddress: "192.0.2.0/24", default: false, table: "main", gateway: "198.51.100.1", distance: 1, active: true, disabled: false }],
};
const nonDefaultOnlyModel = modelFor(nonDefaultOnly);
assert.equal(nonDefaultOnlyModel.routeVerification, "unknown");
assert.doesNotMatch(surfaceText(nonDefaultOnlyModel), /198\.51\.100\.1/);

const missingRate = clone(OVERVIEW_SCENARIO_FIXTURES.single);
delete missingRate.wan[0].downRate;
const missingRateModel = modelFor(missingRate);
assert.equal(missingRateModel.focuses[0].signal.kind, "availability", "missing observations must not render as measured zero");
assert.doesNotMatch(surfaceText(missingRateModel), /0 bps/);

const measuredZero = clone(OVERVIEW_SCENARIO_FIXTURES.single);
measuredZero.wan[0].downRate = 0;
measuredZero.wan[0].upRate = 0;
const measuredZeroModel = modelFor(measuredZero);
assert.equal(measuredZeroModel.focuses[0].signal.kind, "rates", "numeric zero is a valid explicit current observation");
assert.deepEqual(measuredZeroModel.focuses[0].signal.items.map((item) => item.value), ["0 bps", "0 bps"]);

const staleAfterFailedAttempt = clone(OVERVIEW_SCENARIO_FIXTURES.single);
const old = "2026-01-01T00:00:00.000Z";
staleAfterFailedAttempt.updatedAt = new Date().toISOString();
staleAfterFailedAttempt.status = "error";
staleAfterFailedAttempt.meta.realtimeUpdatedAt = old;
staleAfterFailedAttempt.meta.slowRestUpdatedAt = old;
staleAfterFailedAttempt.meta.staticUpdatedAt = old;
staleAfterFailedAttempt.meta.realtimeError = "current REST attempt failed";
const staleModel = modelFor(staleAfterFailedAttempt);
assert.equal(staleModel.evidenceMode, "historical");
assert.equal(staleModel.initialFocus, "collection");
assert.equal(staleModel.focuses[0].signal.kind, "collection");
assert.match(staleModel.evidenceTime, /^上次成功 /);
assert.doesNotMatch(surfaceText(staleModel), /历史(?:快照|证据)[^\n]*0 秒前/);

const failedWithoutSuccess = clone(OVERVIEW_SCENARIO_FIXTURES.single);
failedWithoutSuccess.status = "error";
failedWithoutSuccess.updatedAt = new Date().toISOString();
failedWithoutSuccess.meta.realtimeError = "REST failed";
failedWithoutSuccess.meta.slowRestError = "REST failed";
failedWithoutSuccess.meta.staticError = "SSH failed";
delete failedWithoutSuccess.meta.realtimeUpdatedAt;
delete failedWithoutSuccess.meta.slowRestUpdatedAt;
delete failedWithoutSuccess.meta.staticUpdatedAt;
const failedWithoutSuccessModel = modelFor(failedWithoutSuccess);
assert.equal(failedWithoutSuccessModel.evidenceMode, "unavailable");
assert.equal(failedWithoutSuccessModel.initialFocus, "evidence");
assert.equal(failedWithoutSuccessModel.evidenceTime, "成功时间未记录");
assert.doesNotMatch(surfaceText(failedWithoutSuccessModel), /最近成功|0 秒前/);

const partialRecovery = clone(OVERVIEW_SCENARIO_FIXTURES["collection-down"]);
partialRecovery.meta.staticError = null;
partialRecovery.meta.staticUpdatedAt = new Date().toISOString();
partialRecovery.meta.capabilities.sshRead = true;
const partialRecoveryModel = modelFor(partialRecovery);
const partialRecoveryState = deriveOverviewState(partialRecovery);
const partialSignalRows = Object.fromEntries(partialRecoveryModel.focuses[0].signal.items.map((item) => [item.label, item]));
assert.equal(partialRecoveryState.facts.collection.rest.status, "failed");
assert.equal(partialRecoveryState.facts.collection.ssh.status, "current");
assert.equal(partialSignalRows.REST.value, "失败");
assert.equal(partialSignalRows.SSH.value, "可用");
assert.doesNotMatch(surfaceText(partialRecoveryModel), /REST \/ SSH 未恢复|REST 失败 · SSH 失败/);

const collectionDownModel = modelFor(clone(OVERVIEW_SCENARIO_FIXTURES["collection-down"]));
const collectionInspection = collectionDownModel.focuses[0].inspection;
assert.equal(collectionInspection.key, "collection");
assert.equal(collectionInspection.relations.some((item) => item.label === "最近尝试"), true);
assert.equal(collectionInspection.relations.some((item) => item.label === "明确成功"), true);
const collectionErrorText = collectionInspection.rows.find((item) => item.key === "collection-error")?.value || "";
assert.equal((collectionErrorText.match(/无可用快照/g) || []).length <= 1, true, "repeated collection clauses must be compacted");

const forwardingOnlyState = deriveOverviewState(clone(OVERVIEW_SCENARIO_FIXTURES["interfaces-down"]));
assert.equal(forwardingOnlyState.facts.collection.rest.status, "current");
assert.equal(forwardingOnlyState.facts.collection.ssh.status, "current");
const forwardingOnlyModel = modelFor(clone(OVERVIEW_SCENARIO_FIXTURES["interfaces-down"]));
assert.equal(forwardingOnlyModel.initialFocus, "interfaces");
assert.equal(forwardingOnlyModel.routeVerification, "verified");

const mislabeledInterface = modelForHint(clone(OVERVIEW_SCENARIO_FIXTURES.single), "interfaces-down");
assert.equal(mislabeledInterface.initialFocus, "route", "a scenario hint must not invent an interface incident");
assert.equal(mislabeledInterface.focuses[0].signal.kind, "rates");

const mislabeledCollection = modelForHint(clone(OVERVIEW_SCENARIO_FIXTURES.single), "collection-down");
assert.equal(mislabeledCollection.evidenceMode, "current", "a scenario hint must not downgrade current evidence");
assert.equal(mislabeledCollection.initialFocus, "route");

const unavailableWithRetainedObjects = clone(OVERVIEW_SCENARIO_FIXTURES.single);
unavailableWithRetainedObjects.status = "error";
unavailableWithRetainedObjects.updatedAt = new Date().toISOString();
unavailableWithRetainedObjects.meta.realtimeError = "REST failed";
delete unavailableWithRetainedObjects.meta.realtimeUpdatedAt;
delete unavailableWithRetainedObjects.meta.slowRestUpdatedAt;
delete unavailableWithRetainedObjects.meta.staticUpdatedAt;
unavailableWithRetainedObjects.routes.defaultRoutes = [{ table: "main", gateway: "198.51.100.9", distance: 1, active: true, disabled: false }];
const retainedModel = modelFor(unavailableWithRetainedObjects);
assert.equal(retainedModel.routeVerification, "unknown");
assert.equal(retainedModel.initialFocus, "evidence");
assert.equal(retainedModel.focuses[0].inspection.key, "collection");
assert.doesNotMatch(surfaceText(retainedModel), /1 \/ 1|198\.51\.100\.9|distance 1|活动记录/);

const resourceModel = modelFor(clone(OVERVIEW_SCENARIO_FIXTURES["resource-full"]));
const resourceFocus = focusFor(resourceModel, "resource");
assert.equal(resourceModel.initialFocus, "resource");
assert.equal(resourceFocus.signal.kind, "resource");
assert.equal(resourceFocus.inspection.key, "resource");
assert.doesNotMatch(JSON.stringify(resourceFocus), /bps|当前下载|当前上传/);
assert.doesNotMatch(JSON.stringify(resourceFocus.inspection), /CPU 96%|内存 92%|磁盘 97%/);

const interruptedResource = clone(OVERVIEW_SCENARIO_FIXTURES["resource-full"]);
interruptedResource.overview.history.cpu = [90, 90, 20, 90, 90];
interruptedResource.overview.history.memory = [20, 20, 20, 20, 20];
interruptedResource.overview.history.disk = [20, 20, 20, 20, 20];
const interruptedResourceModel = modelFor(interruptedResource);
const streakProof = focusFor(interruptedResourceModel, "resource").proofs.find((proof) => proof.key === "resource-streak");
assert.equal(streakProof.value, "2 个");

const noSnapshot = clone(OVERVIEW_SCENARIO_FIXTURES["no-snapshot"]);
noSnapshot.meta.configuredIdentity = "configured-router";
noSnapshot.overview.identity = "无可用快照";
const noSnapshotModel = modelFor(noSnapshot);
assert.equal(noSnapshotModel.device, "configured-router");
assert.match(noSnapshotModel.deviceNote, new RegExp(noSnapshot.meta.routerHost));
assert.equal(noSnapshotModel.focuses[0].inspection.key, "collection");
assert.doesNotMatch(noSnapshotModel.deviceNote, /当前不可达|无可用快照/);
assert.deepEqual(noSnapshotModel.scopeFacts.slice(0, 2).map((fact) => fact.value), ["不可判断", "不可判断"]);
assert.doesNotMatch(JSON.stringify(noSnapshotModel.scopeFacts), /0 \/ 0/);

const fleetModel = modelFor(clone(OVERVIEW_SCENARIO_FIXTURES.fleet));
assert.equal(fleetModel.initialFocus, "fleet-scope");
assert.equal(fleetModel.focuses[0].signal.kind, "fleet", "fleet distribution is allowed only when no higher risk exists");

const fleetInterfaces = clone(OVERVIEW_SCENARIO_FIXTURES.fleet);
fleetInterfaces.interfaces = [
  { name: "ether1", running: true },
  { name: "ether2", running: false, parent: "switch1", vlan: 20, pppoeOut: "pppoe-out20" },
  { name: "ether3", running: false, parent: "switch1", vlan: 30, pppoeOut: "pppoe-out30" },
];
const fleetInterfacesModel = modelFor(fleetInterfaces);
assert.equal(fleetInterfacesModel.initialFocus, "interfaces", "fleet scope must not cover an interface incident");
assert.equal(fleetInterfacesModel.focuses[0].signal.kind, "interfaces");
assert.equal(fleetInterfacesModel.focuses[0].inspection.key, "interface");
assert.match(fleetInterfacesModel.focuses[0].scope, /多对象范围/);
assert.deepEqual(
  fleetInterfacesModel.focuses[0].signal.items.map((item) => item.objectId),
  fleetInterfacesModel.focuses[0].objectInspections.map((inspection) => inspection.objectId),
  "interface selector IDs must map one-to-one to inspection objects",
);
assert.equal(fleetInterfacesModel.focuses[0].objectInspections[1].objectPosition, "对象 2 / 2");
assert.equal(fleetInterfacesModel.focuses[0].objectInspections[1].sourcePath, "interfaces[2]");
assert.equal(fleetInterfacesModel.focuses[0].objectInspections.every((inspection) => inspection.detailRows.length > 0), true);

const offlineModel = modelFor(clone(OVERVIEW_SCENARIO_FIXTURES["all-offline"]));
const offlineFocus = focusFor(offlineModel, "wan-offline");
assert.deepEqual(
  offlineFocus.signal.items.map((item) => item.objectId),
  offlineFocus.objectInspections.map((inspection) => inspection.objectId),
  "WAN selector IDs must map one-to-one to inspection objects",
);
assert.equal(offlineFocus.objectInspections.every((inspection) => inspection.sourcePath.startsWith("wan[") || inspection.sourcePath.startsWith("pppoe[")), true);

const fleetResource = clone(OVERVIEW_SCENARIO_FIXTURES.fleet);
fleetResource.overview.cpuLoad = 96;
fleetResource.overview.memoryUsage = 92;
fleetResource.overview.diskUsage = 97;
fleetResource.overview.history.cpu = [90, 92, 94, 96];
fleetResource.overview.history.memory = [88, 89, 91, 92];
fleetResource.overview.history.disk = [92, 94, 96, 97];
const fleetResourceModel = modelFor(fleetResource);
assert.equal(fleetResourceModel.initialFocus, "resource");
assert.equal(fleetResourceModel.focuses[0].signal.kind, "resource");

const historicalInterfaces = clone(OVERVIEW_SCENARIO_FIXTURES["collection-down"]);
historicalInterfaces.interfaces = [{ name: "ether2", running: false, parent: "switch1", vlan: 20 }];
const historicalInterfacesModel = modelFor(historicalInterfaces);
assert.equal(historicalInterfacesModel.initialFocus, "interfaces", "an observed object risk must lead the historical collection boundary");
assert.equal(historicalInterfacesModel.focuses[0].signal.kind, "interfaces");
assert.equal(Boolean(focusFor(historicalInterfacesModel, "collection")), true);
assert.doesNotMatch(surfaceText(historicalInterfacesModel), /当前对象/);

const historicalOffline = clone(OVERVIEW_SCENARIO_FIXTURES["all-offline"]);
historicalOffline.status = "error";
historicalOffline.meta.realtimeError = "current collection failed";
const historicalOfflineModel = modelFor(historicalOffline);
assert.equal(historicalOfflineModel.initialFocus, "collection");
assert.equal(historicalOfflineModel.focuses[0].signal.kind, "collection");
assert.equal(Boolean(focusFor(historicalOfflineModel, "wan-offline")), true);

const historicalResource = clone(OVERVIEW_SCENARIO_FIXTURES["resource-full"]);
historicalResource.status = "error";
historicalResource.meta.realtimeError = "current collection failed";
const historicalResourceModel = modelFor(historicalResource);
assert.equal(historicalResourceModel.initialFocus, "resource", "resource policy evidence must lead the collection boundary");
assert.equal(Boolean(focusFor(historicalResourceModel, "collection")), true);
assert.equal(focusFor(historicalResourceModel, "resource").tone, "warn");

const composite = clone(OVERVIEW_SCENARIO_FIXTURES["resource-full"]);
composite.interfaces = [
  { name: "ether1", running: true },
  { name: "ether2", running: false, parent: "switch1", vlan: 20 },
];
const compositeModel = modelFor(composite);
assert.deepEqual(compositeModel.risks.slice(0, 2), ["resource", "interfaces"]);
assert.equal(compositeModel.initialFocus, "resource");
assert.equal(focusFor(compositeModel, "resource").signal.kind, "resource");
assert.equal(focusFor(compositeModel, "interfaces").inspection.key, "interface");

const outletAndResource = clone(OVERVIEW_SCENARIO_FIXTURES["resource-full"]);
for (const rows of [outletAndResource.wan, outletAndResource.pppoe]) {
  for (const row of rows) row.running = false;
}
outletAndResource.routes.defaultRoutes = outletAndResource.routes.defaultRoutes.map((route) => ({ ...route, active: false }));
const outletAndResourceModel = modelForHint(outletAndResource, "resource-full");
assert.deepEqual(outletAndResourceModel.risks.slice(0, 2), ["wan-offline", "resource"]);
assert.equal(outletAndResourceModel.initialFocus, "wan-offline", "all-WAN outage must outrank resource pressure regardless of scenario hint");
assert.equal(outletAndResourceModel.routeVerification, "offline");
assert.equal(outletAndResourceModel.focuses[0].signal.kind, "wan");

for (const [scenario, fixture] of Object.entries(OVERVIEW_SCENARIO_FIXTURES)) {
  const model = modelFor(clone(fixture));
  assertNoProofObjectReplay(model, scenario);
  assert.deepEqual(model.scopeFacts.map((fact) => fact.key), ["scope-wan", "scope-interface", "scope-risk"]);
  assert.equal(model.focuses.every((focus) => !focus.inspection.actionTitle.includes("原始证据")), true, `${scenario}: detail action must not overclaim raw evidence`);
  const failureRows = model.focuses.flatMap((focus) => focus.signal.items).filter((item) => item.label === "失败端点");
  assert.equal(failureRows.some((item) => item.value === "0" || item.value === "0 个"), false, `${scenario}: zero failures must not read as no fault`);
}

const detailKeys = new Set(resourceModel.detailSections.map((section) => section.key));
for (const key of ["target", "route", "wan", "collection", "resource", "boundary"]) assert.equal(detailKeys.has(key), true);
assert.deepEqual(focusFor(resourceModel, "resource").detailSectionKeys, ["resource", "collection", "boundary"]);

console.log("mobile risk-focus semantic contract: PASS");
