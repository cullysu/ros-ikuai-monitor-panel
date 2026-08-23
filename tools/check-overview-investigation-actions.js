#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
function loadTypeScript(module, filename) {
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
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

const {
  buildOverviewInvestigationActions,
} = require(path.join(root, "src/panel-framework/overview/evidence-model/buildOverviewInvestigationActions.ts"));

const evidenceAt = "2026-08-15T00:00:00Z";
const priorityObject = (route, targetObjectId) => ({ route, targetObjectId });

function primaryAction(risk, priorityObjects) {
  return buildOverviewInvestigationActions({ risk, scale: "single", evidenceAt, priorityObjects })[0];
}

for (const [risk, route, targets] of [
  ["wan", "lineStatus", ["wan:uplink-a", "wan:uplink-b"]],
  ["interfaces", "interfaces", ["interface:ether9", "interface:vlan30"]],
]) {
  const action = primaryAction(risk, targets.map((target) => priorityObject(route, target)));
  assert.equal(action.mode, "investigation", `${risk} primary action must keep object investigation mode`);
  assert.equal(action.scope, "object", `${risk} primary action must target one ranked object`);
  assert.equal(action.route, route, `${risk} primary action must keep its owning route`);
  assert.equal(action.navigation?.objectId, targets[0], `${risk} primary action must target the stable first ranked object`);
  assert.equal(action.navigation?.returnRoute, "overview", `${risk} object navigation must preserve overview return history`);
  assert.equal(action.navigation?.evidenceAt, evidenceAt, `${risk} object navigation must preserve its evidence timestamp`);
}

const unrelatedFirst = primaryAction("interfaces", [
  priorityObject("lineStatus", "wan:uplink-a"),
  priorityObject("interfaces", "interface:ether9"),
  priorityObject("interfaces", "interface:vlan30"),
]);
assert.equal(unrelatedFirst.navigation?.objectId, "interface:ether9", "route matching must not redirect an interface action to a WAN object");

const unverified = buildOverviewInvestigationActions({
  risk: "wan",
  scale: "single",
  evidenceAt: null,
  priorityObjects: [priorityObject("lineStatus", "wan:uplink-a"), priorityObject("lineStatus", "wan:uplink-b")],
})[0];
assert.equal(unverified.mode, "workspace", "missing evidence timestamp must not create object-detail navigation");
assert.equal(unverified.navigation, undefined, "missing evidence timestamp must retain the truth-safe workspace fallback");

console.log("[overview-investigation-actions] PASS multi-object WAN/interface primary navigation");
