#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
require.extensions[".ts"] = function loadTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filename,
  });
  module._compile(compiled.outputText, filename);
};

const { ROUTE_RECOVERY_POLICY_ROUTES, routeRecoveryPolicyFor } = require(path.join(
  root,
  "src/panel-framework/sections/route-recovery/routeRecoveryPolicies.ts",
));
const { sectionRecoveryState } = require(path.join(
  root,
  "src/panel-framework/sections/route-recovery/routeRecoveryState.ts",
));

const expectedRoutes = [
  "interfaces", "lineStatus", "balance", "routes", "terminals", "dhcp", "arp",
  "trafficLoad", "loadAudit", "trafficAudit", "connections", "dns4", "dns6",
  "security", "logs", "serviceLogs", "readonlyDiagnostics",
];
assert.deepEqual([...ROUTE_RECOVERY_POLICY_ROUTES].sort(), [...expectedRoutes].sort());

for (const route of expectedRoutes) {
  const policy = routeRecoveryPolicyFor(route);
  assert.ok(policy, `${route} must have a route-specific recovery policy`);
  for (const state of ["partial", "historical", "unavailable"]) {
    assert.ok(policy[state].title.trim(), `${route}/${state} needs a title`);
    assert.ok(policy[state].body.trim().length >= 24, `${route}/${state} needs an evidence boundary`);
    assert.doesNotMatch(policy[state].body, /网络状态良好|业务状态良好|互联网当前可用|实时可信/);
  }
  assert.equal(policy.actions.length, 2);
  assert.equal(new Set(policy.actions.map((action) => action.route)).size, 2);
  assert.ok(policy.actions.every((action) => action.route !== "more" && action.route !== route));
  for (const state of ["partial", "unavailable"]) {
    const primaryAction = policy[state].primaryAction;
    assert.ok(primaryAction, `${route}/${state} must explicitly declare one primary recovery action`);
    assert.equal(
      policy.actions.filter((action) => action.route === primaryAction).length,
      1,
      `${route}/${state} primary action must resolve to exactly one route action`,
    );
  }
  assert.equal(
    policy.historical.primaryAction,
    undefined,
    `${route}/historical must not manufacture a primary investigation action`,
  );
}

const model = (evidenceMode, metrics = [], tables = []) => ({
  title: "test",
  description: "test",
  updatedAt: "2026-08-10T00:00:00Z",
  observedAt: "2026-08-10T00:00:00Z",
  evidenceMode,
  status: "test",
  statusTone: "trust",
  metrics,
  tables,
});
assert.equal(sectionRecoveryState(model("current", [{ label: "对象", value: "0", tone: "trust" }])), null);
assert.equal(sectionRecoveryState(model("current", [{ label: "对象", value: "未取得", tone: "missing" }])), "partial");
assert.equal(sectionRecoveryState(model("current", [], [{ title: "对象", columns: [], rows: [], empty: "未取得该对象集合" }])), "partial");
assert.equal(sectionRecoveryState(model("historical")), "historical");
assert.equal(sectionRecoveryState(model("unavailable")), "unavailable");

const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const component = read("src/panel-framework/sections/RouteEvidenceBoundary.tsx");
const desktop = read("src/panel-framework/sections/DesktopDomainWorkspace.tsx");
const mobileSurface = read("src/panel-framework/mobile-reference-ui/MobileReferenceSurface.tsx");
const maturity = read("src/panel-framework/routes/panelRouteMaturity.ts");
const css = read("src/panel-framework/sections/route-evidence-boundary.css");
assert.match(component, /data-route-recovery=\{route\}/);
assert.match(component, /returnRoute: route, evidenceAt: model\.observedAt/);
assert.match(component, /const primaryActionRoute = state === "historical" \? undefined : copy\.primaryAction/);
assert.match(component, /data-route-recovery-action-level=\{actionLevel\}/);
assert.match(component, /className=\{`is-\$\{actionLevel\}`\}/);
assert.match(component, /state === "historical" \? copy\.title : policy\.heading/);
assert.match(component, /state === "historical" \? null : <b>\{copy\.title\}<\/b>/);
assert.match(component, /data-route-recovery-explanation=\{state === "historical" \? "compact-history" : "full"\}/);
assert.match(component, /HISTORICAL_BOUNDARY_SUMMARY = "仅说明记录时刻已采集的内容；不代表当前状态，先核对最新采集时间。"/);
assert.match(component, /state === "historical" \? HISTORICAL_BOUNDARY_SUMMARY : copy\.body/);
assert.match(desktop, /<RouteEvidenceBoundary route=\{route\} model=\{model\} onNavigate=\{onNavigate\} surface="desktop"/);
assert.match(mobileSurface, /buildSectionModel\(route, snapshot\)/);
assert.match(mobileSurface, /data-mobile-reference-workspace=\{route\}/);
assert.match(maturity, /failureRecovery:\s*"route-specific"/);
assert.match(css, /min-height:\s*44px/);
assert.match(css, /\.is-historical \.mdw-interface-recovery-actions \{\s*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)/);
assert.match(css, /\.is-historical \.mdw-interface-recovery-actions button \{\s*min-height:\s*44px/);
assert.match(css, /\.is-historical \.mdw-interface-recovery-copy \{\s*padding-block:\s*7px/);

console.log(`route recovery integration: PASS routes=${expectedRoutes.length} surfaces=desktop-boundary+mobile-reference-workspace`);
