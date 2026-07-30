#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const slots = fs.readFileSync(path.join(root, "src", "panel-framework", "mobile", "MobileTabletNextEvidenceSlots.tsx"), "utf8");
const builder = fs.readFileSync(path.join(root, "src", "panel-framework", "overview", "evidence-model", "buildTabletComparisonObjects.ts"), "utf8");
const failures = [];

function check(name, condition, detail) {
  if (!condition) failures.push({ name, detail });
}

check(
  "normal tablet rows consume the selected comparison collection",
  /comparisonObjects=\{model\.tabletComparisonObjects\}/.test(slots),
  "rows and the selection hook must consume the same model-owned comparison collection"
);
check(
  "normal tablet rows do not reintroduce coverage/comparison split ownership",
  !/coverageObjects=\{model\.coverageObjects\}/.test(slots),
  "coverageObjects must not be a second data source for the normal comparison workspace"
);
check(
  "comparison builder keeps a real two-object fallback when the gateway exclusion leaves one related object",
  /export function buildTabletComparisonObjects[\s\S]*if \(novel\.length >= 2\) return novel[\s\S]*return \[routeAnchor, novel\[0\]\]/.test(builder),
  "the default route must retain an explicit route anchor when gateway exclusion leaves one related object"
);

if (failures.length) {
  console.error(JSON.stringify({ pass: false, contract: "tablet-normal-comparison-runtime-data-binding-v1", failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ pass: true, contract: "tablet-normal-comparison-runtime-data-binding-v1", checks: 3 }, null, 2));
