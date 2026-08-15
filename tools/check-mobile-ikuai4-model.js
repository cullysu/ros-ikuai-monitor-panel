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
const { deriveOverviewState } = require(path.join(root, "src/panel-framework/overview/index.ts"));
const { buildOverviewEvidenceModel } = require(path.join(root, "src/panel-framework/overview/evidence-model/buildOverviewEvidenceModel.ts"));
const modelPath = path.join(root, "src/panel-framework/mobile-flow-ui/overview/mobileFlowModel.ts");
const modelSource = fs.readFileSync(modelPath, "utf8");
const { buildMobileFlowModel } = require(modelPath);
const { OVERVIEW_SCENARIO_FIXTURES } = require(path.join(root, "src/panel-framework/overview/scenarios.ts"));
const clone = (value) => structuredClone(value);
function modelFor(snapshot, scenarioHint) {
  const state = deriveOverviewState(snapshot, scenarioHint ? { scenarioHint } : undefined);
  const evidence = buildOverviewEvidenceModel(snapshot, state);
  return { state, evidence, mobile: buildMobileFlowModel(evidence) };
}
const expectedScenes = {
  single: "normal", fleet: "interfaces", "all-offline": "wan", "no-snapshot": "unavailable",
  "collection-down": "collection", "resource-full": "resource", "interfaces-down": "interfaces",
};
for (const [scenario, scene] of Object.entries(expectedScenes)) {
  const result = modelFor(OVERVIEW_SCENARIO_FIXTURES[scenario], scenario);
  assert.equal(result.state.scenario, scenario);
  assert.equal(result.mobile.scene, scene, `${scenario} must select the mobile-flow scene`);
  assert.ok(result.mobile.verdict && result.mobile.verdictNote && result.mobile.evidenceTime, `${scenario} must keep a bounded judgement`);
}
const fleet = modelFor(OVERVIEW_SCENARIO_FIXTURES.fleet, "fleet");
assert.equal(fleet.evidence.risk, "interfaces");
assert.equal(fleet.mobile.scene, "interfaces", "fleet scale must not cover an interface incident");
assert.ok(fleet.mobile.objects.length > 0 && fleet.mobile.objects.every((item) => item.destination.route === "interfaces"), "highest interface risk must lead to interface evidence");
const current = modelFor(OVERVIEW_SCENARIO_FIXTURES.single, "single");
assert.equal(current.evidence.evidenceMode, "current");
assert.ok(current.mobile.traffic && current.mobile.traffic.windowLabel && current.mobile.traffic.points.length > 1, "normal current evidence must expose an instrument with a real window");
assert.ok(current.mobile.route, "only an evidence-model active route can be shown as verified");
assert.equal(buildMobileFlowModel({ ...current.evidence, evidenceMode: "historical" }).traffic, null, "historical evidence must not render current traffic");
assert.equal(buildMobileFlowModel({ ...current.evidence, traffic: { ...current.evidence.traffic, status: "loading" } }).traffic, null, "traffic must require current ready atomic evidence");
const absentTraffic = clone(OVERVIEW_SCENARIO_FIXTURES.single);
absentTraffic.wan[0].downRate = null; absentTraffic.wan[0].upRate = null;
absentTraffic.overview.history.trafficSamples = absentTraffic.overview.history.trafficSamples.map((sample) => ({ ...sample, downlink: null, uplink: null }));
const missing = modelFor(absentTraffic).mobile;
assert.equal(missing.traffic, null, "missing traffic values must remain unavailable instead of becoming zero");
assert.equal(JSON.stringify(missing).includes("0 bps"), false, "missing values must never be represented as 0 bps");
const explicitZero = clone(OVERVIEW_SCENARIO_FIXTURES.single);
explicitZero.wan[0].downRate = 0; explicitZero.wan[0].upRate = 0;
explicitZero.overview.history.trafficSamples = explicitZero.overview.history.trafficSamples.map((sample) => ({ ...sample, downlink: 0, uplink: 0 }));
const zero = modelFor(explicitZero).mobile;
assert.ok(zero.traffic, "explicit observed zero is a valid current sample");
assert.equal(zero.traffic.currentDown, "0 bps"); assert.equal(zero.traffic.currentUp, "0 bps");
const missingRoute = clone(OVERVIEW_SCENARIO_FIXTURES.single);
missingRoute.routes = { defaultRoutes: [] };
const routeUnknown = modelFor(missingRoute).mobile;
assert.equal(routeUnknown.route, null, "no active default route must stay unverified; arbitrary row fallback is forbidden");
assert.match(modelSource, /route: evidence\.evidenceMode === "current" \? evidence\.routeEvidence\.activePath : null/, "verified route must come only from current active-path evidence");
assert.doesNotMatch(modelSource, /route:\s*[^\n;]*(?:rows|defaultRoutes)\s*\[\s*0\s*\]/, "route verification must not fall back to an arbitrary route row");
assert.doesNotMatch(modelSource, /routeEvidence\.activePath\s*\|\|/, "route verification must not silently substitute an unverified path");
for (const scenario of ["all-offline", "no-snapshot", "collection-down", "resource-full", "interfaces-down"]) {
  const result = modelFor(OVERVIEW_SCENARIO_FIXTURES[scenario], scenario).mobile;
  assert.equal(result.traffic, null, `${scenario} must structurally withdraw normal traffic`);
  assert.ok(result.objects.length || result.resources.length, `${scenario} must replace traffic with inspectable evidence`);
}
const resourceFull = modelFor(OVERVIEW_SCENARIO_FIXTURES["resource-full"], "resource-full").mobile;
assert.equal(resourceFull.resources.length, 3, "resource-full must expose CPU, memory, and disk as separate inspectable objects");
assert.deepEqual(resourceFull.resources.map((item) => item.label).sort(), ["CPU", "内存", "磁盘"].sort());
assert.match(modelSource, /for \(let index = points\.length - 1; index >= 0 && points\[index\]\.value >= metric\.threshold; index -= 1\) count \+= 1;/, "resource continuity must count only trailing consecutive over-threshold samples");
assert.ok(resourceFull.resources.every((resource) => resource.trailing <= resource.total), "resource continuity cannot exceed observed samples");
const interfaces = modelFor(OVERVIEW_SCENARIO_FIXTURES["interfaces-down"], "interfaces-down").mobile;
assert.match(modelSource, /routeEvidence\.interfaceDependencies\.some\(\(row\) => row\.interfaceId === item\.targetObjectId\)/, "interface incidents must derive route impact only from explicit dependencies");
assert.ok(interfaces.objects.filter((item) => item.kind === "interface").every((item) => typeof item.note === "string" && item.note.trim().length > 0 && item.note !== item.state), "each interface incident must retain a proved or bounded impact statement");
console.log(`[mobile-flow-ui-model] PASS ${Object.keys(expectedScenes).length} scenarios + truth-boundary regressions`);
