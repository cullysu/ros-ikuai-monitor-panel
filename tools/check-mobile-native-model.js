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
const surfaceText = (model) => JSON.stringify({
  device: model.device,
  evidenceLabel: model.evidenceLabel,
  evidenceNote: model.evidenceNote,
  evidenceTime: model.evidenceTime,
  title: model.title,
  summary: model.summary,
  facts: model.facts,
  signal: model.signal,
  decisions: model.decisions,
  objects: model.objects,
});

const inactiveRoute = clone(OVERVIEW_SCENARIO_FIXTURES.single);
inactiveRoute.routes.defaultRoutes = [{ table: "main", gateway: "198.51.100.1", distance: 1, active: false, disabled: false }];
const inactiveRouteModel = modelFor(inactiveRoute);
assert.equal(inactiveRouteModel.routeVerification, "unknown", "an inactive first route must not be promoted to active");
assert.doesNotMatch(inactiveRouteModel.title, /已核实/);
assert.doesNotMatch(inactiveRouteModel.facts.find((fact) => fact.label === "默认路由")?.value || "", /活动|已核实/);

const nonDefaultOnly = clone(OVERVIEW_SCENARIO_FIXTURES.single);
nonDefaultOnly.routes = {
  defaultRoutes: [],
  items: [{ dstAddress: "192.0.2.0/24", default: false, table: "main", gateway: "198.51.100.1", distance: 1, active: true, disabled: false }],
};
const nonDefaultOnlyModel = modelFor(nonDefaultOnly);
assert.equal(nonDefaultOnlyModel.routeVerification, "unknown", "an active non-default route must never verify the default route");
assert.doesNotMatch(surfaceText(nonDefaultOnlyModel), /198\.51\.100\.1/);

const missingRate = clone(OVERVIEW_SCENARIO_FIXTURES.single);
delete missingRate.wan[0].downRate;
const missingRateModel = modelFor(missingRate);
assert.equal(missingRateModel.signal.kind, "availability", "a missing observation must not render as measured zero");
assert.doesNotMatch(surfaceText(missingRateModel), /0 bps/);

const measuredZero = clone(OVERVIEW_SCENARIO_FIXTURES.single);
measuredZero.wan[0].downRate = 0;
measuredZero.wan[0].upRate = 0;
const measuredZeroModel = modelFor(measuredZero);
assert.equal(measuredZeroModel.signal.kind, "rates", "numeric zero is a valid explicit current observation");
assert.deepEqual(measuredZeroModel.signal.items.map((item) => item.value), ["0 bps", "0 bps"]);

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
assert.equal(staleModel.signal.kind, "collection");
assert.match(staleModel.evidenceTime, /^上次成功 /);
assert.doesNotMatch(surfaceText(staleModel), /历史快照[^\n]*0 秒前|历史证据[^\n]*0 秒前/);

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
assert.equal(failedWithoutSuccessModel.evidenceTime, "成功时间未记录");
assert.doesNotMatch(surfaceText(failedWithoutSuccessModel), /最近成功|0 秒前/);

const partialRecovery = clone(OVERVIEW_SCENARIO_FIXTURES["collection-down"]);
partialRecovery.meta.staticError = null;
partialRecovery.meta.staticUpdatedAt = new Date().toISOString();
partialRecovery.meta.capabilities.sshRead = true;
const partialRecoveryModel = modelFor(partialRecovery);
const partialRecoveryState = deriveOverviewState(partialRecovery);
const collectionObject = partialRecoveryModel.objects.find((object) => object.key === "collection");
assert.equal(partialRecoveryState.facts.collection.rest.status, "failed");
assert.equal(partialRecoveryState.facts.collection.ssh.status, "current");
assert.match(collectionObject?.status || "", /REST 失败/);
assert.match(collectionObject?.status || "", /SSH 可用/);
assert.doesNotMatch(surfaceText(partialRecoveryModel), /REST \/ SSH 未恢复|REST 失败 · SSH 失败/);

const collectionDownModel = modelFor(clone(OVERVIEW_SCENARIO_FIXTURES["collection-down"]));
const collectionSignalRows = Object.fromEntries(collectionDownModel.signal.items.map((item) => [item.label, item]));
assert.match(collectionSignalRows.REST?.note || "", /上次成功/, "REST failure evidence must retain its own latest success time");
assert.match(collectionSignalRows.SSH?.note || "", /上次成功/, "SSH failure evidence must retain its own latest success time");

const forwardingOnlyState = deriveOverviewState(clone(OVERVIEW_SCENARIO_FIXTURES["interfaces-down"]));
assert.equal(forwardingOnlyState.facts.collection.rest.status, "current", "forwarding failure must not fabricate a REST failure");
assert.equal(forwardingOnlyState.facts.collection.ssh.status, "current", "forwarding failure must not fabricate an SSH failure");

const unavailableWithRetainedObjects = clone(OVERVIEW_SCENARIO_FIXTURES.single);
unavailableWithRetainedObjects.status = "error";
unavailableWithRetainedObjects.updatedAt = new Date().toISOString();
unavailableWithRetainedObjects.meta.realtimeError = "REST failed";
delete unavailableWithRetainedObjects.meta.realtimeUpdatedAt;
delete unavailableWithRetainedObjects.meta.slowRestUpdatedAt;
delete unavailableWithRetainedObjects.meta.staticUpdatedAt;
unavailableWithRetainedObjects.routes.defaultRoutes = [{ table: "main", gateway: "198.51.100.9", distance: 1, active: true, disabled: false }];
const retainedModel = modelFor(unavailableWithRetainedObjects);
const retainedWan = retainedModel.objects.find((object) => object.key === "wan");
const retainedRoute = retainedModel.objects.find((object) => object.key === "route");
assert.equal(retainedModel.routeVerification, "unknown");
assert.equal(retainedWan?.status, "无当前证据");
assert.equal(retainedRoute?.status, "无当前证据");
assert.doesNotMatch(JSON.stringify({ facts: retainedModel.facts, signal: retainedModel.signal, wan: retainedWan, route: retainedRoute }), /1 \/ 1|198\.51\.100\.9|distance 1|活动记录/);

const resourceModel = modelFor(clone(OVERVIEW_SCENARIO_FIXTURES["resource-full"]));
assert.equal(resourceModel.signal.kind, "resource", "resource pressure must replace the rate region");
assert.equal(resourceModel.risks.includes("resource"), true);
assert.doesNotMatch(JSON.stringify({ facts: resourceModel.facts, signal: resourceModel.signal, decisions: resourceModel.decisions }), /bps|当前下载|当前上传/);

const interruptedResource = clone(OVERVIEW_SCENARIO_FIXTURES["resource-full"]);
interruptedResource.overview.history.cpu = [90, 90, 20, 90, 90];
interruptedResource.overview.history.memory = [20, 20, 20, 20, 20];
interruptedResource.overview.history.disk = [20, 20, 20, 20, 20];
const interruptedResourceModel = modelFor(interruptedResource);
assert.match(interruptedResourceModel.signal.note, /尾部连续 2 个样本/);
assert.match(interruptedResourceModel.signal.note, /共 5 个有效样本/);

const noSnapshot = clone(OVERVIEW_SCENARIO_FIXTURES["no-snapshot"]);
noSnapshot.meta.configuredIdentity = "configured-router";
noSnapshot.overview.identity = "无可用快照";
const noSnapshotModel = modelFor(noSnapshot);
assert.equal(noSnapshotModel.device, "configured-router", "configured identity must survive no-snapshot state");
assert.match(noSnapshotModel.deviceNote, new RegExp(noSnapshot.meta.routerHost), "router target address must remain visible independently");
assert.doesNotMatch(noSnapshotModel.deviceNote, /当前不可达|无可用快照/);

const fleetModel = modelFor(clone(OVERVIEW_SCENARIO_FIXTURES.fleet));
assert.equal(fleetModel.signal.kind, "fleet", "fleet must expose a compact WAN/object distribution signal");
assert.equal(fleetModel.signal.items.some((item) => item.label === "WAN 范围"), true);
assert.equal(fleetModel.signal.items.some((item) => item.label === "默认路由"), true);

const historicalInterfaces = clone(OVERVIEW_SCENARIO_FIXTURES["collection-down"]);
historicalInterfaces.interfaces = [{ name: "ether2", running: false, parent: "switch1", vlan: 20 }];
const historicalInterfacesModel = modelFor(historicalInterfaces);
assert.equal(historicalInterfacesModel.signal.kind, "collection", "collection provenance must dominate a historical interface record");
assert.equal(historicalInterfacesModel.risks.includes("interfaces"), true, "the concurrent interface record must remain visible");
assert.doesNotMatch(surfaceText(historicalInterfacesModel), /当前对象/);
assert.match(historicalInterfacesModel.decisions.find((row) => row.key === "interfaces")?.title || "", /历史记录/);

const historicalOffline = clone(OVERVIEW_SCENARIO_FIXTURES["all-offline"]);
historicalOffline.status = "error";
historicalOffline.meta.realtimeError = "current collection failed";
const historicalOfflineModel = modelFor(historicalOffline);
assert.equal(historicalOfflineModel.signal.kind, "collection", "historical provenance must dominate retained all-offline rows");
assert.equal(historicalOfflineModel.risks.includes("wan-offline"), true);
assert.match(historicalOfflineModel.decisions.find((row) => row.key === "wan-offline")?.title || "", /历史记录/);
assert.doesNotMatch(surfaceText(historicalOfflineModel), /当前对象记录/);

const historicalResource = clone(OVERVIEW_SCENARIO_FIXTURES["resource-full"]);
historicalResource.status = "error";
historicalResource.meta.realtimeError = "current collection failed";
const historicalResourceModel = modelFor(historicalResource);
const historicalResourceObject = historicalResourceModel.objects.find((object) => object.key === "resource");
assert.equal(historicalResourceModel.signal.kind, "collection", "historical provenance must dominate retained resource pressure");
assert.equal(historicalResourceModel.risks.includes("resource"), true);
assert.match(historicalResourceModel.decisions.find((row) => row.key === "resource")?.title || "", /历史记录/);
assert.equal(historicalResourceModel.decisions.find((row) => row.key === "resource")?.tone, "warn");
assert.match(historicalResourceObject?.status || "", /不代表当前/);
assert.doesNotMatch(surfaceText(historicalResourceModel), /资源达到阻断阈值|需要处理/);

const composite = clone(OVERVIEW_SCENARIO_FIXTURES["resource-full"]);
composite.interfaces = [
  { name: "ether1", running: true },
  { name: "ether2", running: false, parent: "switch1", vlan: 20 },
];
const compositeModel = modelFor(composite);
assert.equal(compositeModel.risks.includes("resource"), true);
assert.equal(compositeModel.risks.includes("interfaces"), true, "a primary scenario must not erase concurrent interface risk");
assert.equal(compositeModel.signal.kind, "resource");
assert.equal(compositeModel.decisions.some((row) => row.key === "interfaces"), true);

const detailTitles = new Set(modelFor(clone(OVERVIEW_SCENARIO_FIXTURES.single)).detailSections.map((section) => section.title));
assert.equal(detailTitles.has("路由原始证据"), true);
assert.equal(detailTitles.has("WAN 对象原始证据"), true);
assert.equal(detailTitles.has("采集链路原始证据"), true);
assert.equal(detailTitles.has("只读边界"), true);

console.log("mobile native semantic contract: PASS cases=21");
