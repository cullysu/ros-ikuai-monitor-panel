#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
function loadTypeScript(module, filename) {
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.NodeJs, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(compiled.outputText, filename);
}
require.extensions[".ts"] = loadTypeScript;
require.extensions[".tsx"] = loadTypeScript;
require.extensions[".css"] = () => {};

const { deriveOverviewState } = require(path.join(root, "src/panel-framework/overview/index.ts"));
const { buildOverviewEvidenceModel } = require(path.join(root, "src/panel-framework/overview/evidence-model/buildOverviewEvidenceModel.ts"));
const surfacePath = path.join(root, "src/panel-framework/mobile-reference-ui/MobileReferenceSurface.tsx");
const surfaceSource = fs.readFileSync(surfacePath, "utf8");
const { buildMobileReferenceModel, mobileEvidenceTimestampLabel } = require(surfacePath);
const { OVERVIEW_SCENARIO_FIXTURES } = require(path.join(root, "src/panel-framework/overview/scenarios.ts"));
const clone = (value) => structuredClone(value);

function modelFor(snapshot, scenarioHint) {
  const state = deriveOverviewState(snapshot, scenarioHint ? { scenarioHint } : undefined);
  const evidence = buildOverviewEvidenceModel(snapshot, state);
  return { state, evidence, mobile: buildMobileReferenceModel(evidence, snapshot, state) };
}

const expectedScenes = { single: "normal", fleet: "interfaces", "all-offline": "outage", "no-snapshot": "unavailable", "collection-down": "collection", "resource-full": "resource", "interfaces-down": "interfaces" };
for (const [scenario, scene] of Object.entries(expectedScenes)) {
  const result = modelFor(OVERVIEW_SCENARIO_FIXTURES[scenario], scenario);
  assert.equal(result.state.scenario, scenario);
  assert.equal(result.mobile.scene, scene, `${scenario} must select the evidence-priority phone scene`);
}

const fleet = modelFor(OVERVIEW_SCENARIO_FIXTURES.fleet, "fleet");
assert.equal(fleet.evidence.risk, "interfaces");
assert.equal(fleet.mobile.scene, "interfaces", "fleet scale must not outrank the highest current risk");
assert.ok(fleet.mobile.interfaces.some((row) => row.tone === "danger"), "fleet risk must remain visible as an affected interface");
assert.match(surfaceSource, /scene === "interfaces" \? <InterfaceList title="接口状态"/, "mixed healthy and failed context rows must not all be labelled as affected interfaces");

const current = modelFor(OVERVIEW_SCENARIO_FIXTURES.single, "single");
assert.equal(current.evidence.evidenceMode, "current");
assert.ok(current.mobile.traffic, "current evidence with a verified route must expose the WAN chart");
assert.equal(current.mobile.wan?.verifiedDefault, true, "normal WAN must be bound to explicit route evidence");

const staleSshSnapshot = clone(OVERVIEW_SCENARIO_FIXTURES.single);
const channelNow = Date.parse("2026-08-20T08:00:00Z");
staleSshSnapshot.meta.realtimeUpdatedAt = "2026-08-20T07:59:58Z";
staleSshSnapshot.meta.slowRestUpdatedAt = "2026-08-20T07:59:58Z";
staleSshSnapshot.meta.staticUpdatedAt = "2026-08-19T08:00:00Z";
staleSshSnapshot.meta.pollSeconds = 60;
const staleSshState = deriveOverviewState(staleSshSnapshot, { scenarioHint: "single", now: channelNow });
assert.equal(staleSshState.facts.collection.rest.status, "current", "fresh REST evidence must remain current");
assert.equal(staleSshState.facts.collection.ssh.status, "degraded", "SSH evidence older than max(300s,poll*5) must not be called current");
assert.equal(staleSshState.facts.collection.channelDegraded, true, "a stale SSH channel must degrade the collection truth boundary");

const absentTraffic = clone(OVERVIEW_SCENARIO_FIXTURES.single);
absentTraffic.wan[0].downRate = null;
absentTraffic.wan[0].upRate = null;
absentTraffic.overview.history.trafficSamples = absentTraffic.overview.history.trafficSamples.map((sample) => ({ ...sample, downlink: null, uplink: null }));
const missing = modelFor(absentTraffic, "single");
assert.equal(missing.evidence.traffic, null, "missing traffic values must remain unavailable instead of becoming zero");
assert.equal(missing.mobile.traffic, null);
assert.equal(JSON.stringify(missing.mobile).includes("0 bps"), false);

const explicitZero = clone(OVERVIEW_SCENARIO_FIXTURES.single);
explicitZero.wan[0].downRate = 0;
explicitZero.wan[0].upRate = 0;
explicitZero.overview.history.trafficSamples = explicitZero.overview.history.trafficSamples.map((sample) => ({ ...sample, downlink: 0, uplink: 0 }));
const zero = modelFor(explicitZero, "single");
assert.ok(zero.mobile.traffic, "explicitly observed zero remains a valid current observation");

const missingRoute = clone(OVERVIEW_SCENARIO_FIXTURES.single);
missingRoute.routes = { defaultRoutes: [] };
const routeUnknown = modelFor(missingRoute, "single").mobile;
assert.notEqual(routeUnknown.wan?.verifiedDefault, true, "missing route evidence must not be presented as verified");
assert.equal(routeUnknown.traffic, null, "unverified route must withdraw the current WAN chart");

const reorderedRoutes = clone(OVERVIEW_SCENARIO_FIXTURES.single);
reorderedRoutes.routes.defaultRoutes = [
  { ...reorderedRoutes.routes.defaultRoutes[0], active: false, distance: 1, gateway: "198.51.100.1" },
  { ...reorderedRoutes.routes.defaultRoutes[0], active: true, distance: 2, gateway: "203.0.113.1" },
];
const reorderedRouteState = deriveOverviewState(reorderedRoutes, { scenarioHint: "single" });
assert.equal(reorderedRouteState.facts.route.selected?.gateway, "203.0.113.1", "route selection must rank explicit active evidence ahead of input order");
assert.equal(reorderedRouteState.facts.route.verified, true, "the active explicit default route remains verifiable after input reordering");
assert.doesNotMatch(surfaceSource, /(?:rows|defaultRoutes)\s*\[\s*0\s*\]/, "route selection must not fall back to an arbitrary first row");
assert.match(surfaceSource, /const backRoute = navigationContext\?\.returnRoute \|\| "overview";/, "WAN detail must preserve its originating mobile route");
assert.match(surfaceSource, /onNavigate\(backRoute, \{ objectId: null, replace: true \}\)/, "WAN detail back action must return to the originating mobile route without retaining the selected object");

for (const scenario of ["all-offline", "no-snapshot", "collection-down", "resource-full", "interfaces-down"]) {
  assert.equal(modelFor(OVERVIEW_SCENARIO_FIXTURES[scenario], scenario).mobile.traffic, null, `${scenario} must withdraw normal WAN traffic`);
}
assert.match(surfaceSource, /\["其他接口未运行", `\$\{state\.facts\.interfaces\.down\} 项`/, "all-offline must distinguish offline WAN lines from other non-running interfaces");
assert.match(surfaceSource, /data-mobile-reference-recovery-actions/, "no-snapshot must use available connection, log and diagnostic tasks instead of leaving an empty incident page");
assert.match(surfaceSource, /\["转发状态", "未测量", "muted"\]/, "collection failure must not imply that forwarding is down when the forwarding plane was not measured");

const resource = modelFor(OVERVIEW_SCENARIO_FIXTURES["resource-full"], "resource-full");
assert.deepEqual(resource.evidence.resource.metrics.map((item) => item.key).sort(), ["cpu", "disk", "memory"]);
assert.ok(resource.evidence.resource.metrics.every((item) => item.points.every((point) => Number.isFinite(point.value))), "resource sparklines must use real numeric samples");

const labelNow = new Date(2026, 7, 20, 0, 1, 0).getTime();
assert.equal(mobileEvidenceTimestampLabel(new Date(2026, 7, 20, 0, 0, 30).toISOString(), labelNow), "今日 00:00:30");
assert.equal(mobileEvidenceTimestampLabel(new Date(2026, 7, 19, 23, 59, 30).toISOString(), labelNow), "昨日 23:59:30", "fresh evidence across midnight must not be relabelled as today");
assert.equal(mobileEvidenceTimestampLabel(new Date(2026, 7, 18, 9, 5, 6).toISOString(), labelNow), "2026-08-18 09:05:06");
assert.equal(mobileEvidenceTimestampLabel("2026-08-20 00:00:30", labelNow), "时间未记录", "timezone-less timestamps must remain invalid");

console.log(JSON.stringify({ pass: true, contract: "mobile-reference-model-v1", scenarios: Object.keys(expectedScenes).length }));
