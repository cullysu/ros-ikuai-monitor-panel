#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const componentPath = path.join(root, "src", "panel-framework", "mobile", "MobileTabletInterfaceRelations.tsx");
const component = fs.readFileSync(componentPath, "utf8");
const sharedStyle = [
  "mobile-domain-foundation.css",
  "mobile-domain.css"
].map((file) => fs.readFileSync(path.join(root, "src", "panel-framework", "mobile", file), "utf8")).join("\n");
const failures = [];

function check(name, condition, detail) {
  if (!condition) failures.push({ name, detail });
}

check(
  "tablet interface comparison has an explicit owner",
  /data-tablet-interface-comparison/.test(component),
  "the left tablet pane needs a cross-object comparison owner, not only per-row text"
);
check(
  "comparison is based on route evidence",
  /defaultRoutes/.test(component) && /data-tablet-interface-route-evidence/.test(component),
  "comparison must expose the actual interface-to-default-route evidence"
);
check(
  "comparison preserves unverified boundaries",
  /defaultRouteRelation/.test(component) && /待核对|未取得/.test(component),
  "missing route association must remain explicit instead of being inferred"
);
check(
  "comparison keeps object identity",
  /data-tablet-interface-relation-row/.test(component) && /row\.id/.test(component),
  "each evidence row must remain bound to a stable object identity"
);
check(
  "comparison does not replay traffic metrics",
  !/rxRate|txRate|rxBytes|txBytes/.test(component),
  "the left comparison must add relationship evidence rather than duplicate the inspector's readings"
);
check(
  "comparison has a compact tablet layout owner",
  /mdw-metrics/.test(component) && /mdw-list-heading/.test(component) &&
    /\.mdw-metrics\s*\{/.test(sharedStyle) && /\.mdw-list-heading\s*\{/.test(sharedStyle),
  "comparison and route ledger must use the shared mobile metric and heading primitives"
);

if (failures.length) {
  console.error(JSON.stringify({ pass: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ pass: true, checks: 6, contract: "tablet-interface-comparison-v1" }, null, 2));
