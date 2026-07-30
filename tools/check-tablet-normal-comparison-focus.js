#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const screen = fs.readFileSync(path.join(root, "src", "panel-framework", "mobile", "MobilePatrolScreen.tsx"), "utf8");
const slots = fs.readFileSync(path.join(root, "src", "panel-framework", "mobile", "MobileTabletNextEvidenceSlots.tsx"), "utf8");
const evidence = fs.readFileSync(path.join(root, "src", "panel-framework", "mobile", "MobileTabletNextEvidence.tsx"), "utf8");
const inspector = fs.readFileSync(path.join(root, "src", "panel-framework", "mobile", "MobileTabletNormalComparisonInspector.tsx"), "utf8");
const failures = [];

function check(name, condition, detail) {
  if (!condition) failures.push({ name, detail });
}

check(
  "normal tablet comparison owns a stable selection state",
  /selectedComparisonId/.test(screen) && /setSelectedComparisonId/.test(screen),
  "the steady tablet task needs a selected comparison object independent of the incident selection state"
);
check(
  "normal comparison receives selected identity and selection handler",
  /kind=\"normal\"[\s\S]*selectedObjectId=/.test(slots) && /kind=\"normal\"[\s\S]*onSelectObject=/.test(slots),
  "normal comparison rows must be able to select an object without immediately leaving the tablet task"
);
check(
  "normal comparison row exposes selected state",
  /is-selected/.test(evidence) && /selectedObjectId\s*===\s*object\.id/.test(evidence),
  "a list of navigational rows is not an object comparison focus without a selected state"
);
check(
  "normal comparison selection preserves object identity",
  /data-tablet-next-evidence-selected-object/.test(evidence) && /object\.id/.test(evidence),
  "the selected row and detail surface must remain bound to the stable comparison object id"
);
check(
  "normal comparison renders object-level relation evidence",
  /data-tablet-normal-comparison-inspector/.test(inspector) && /source|evidence/.test(inspector),
  "selection must add object-level relationship/source evidence rather than only navigate away"
);
check(
  "normal selection can still enter the real object workspace",
  /action: OverviewInvestigationAction/.test(inspector) && /onOpen\(action\)/.test(inspector),
  "comparison selection must preserve a typed contextual route entry rather than reverting to a generic object navigation"
);

if (failures.length) {
  console.error(JSON.stringify({ pass: false, contract: "tablet-normal-comparison-focus-v1", failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ pass: true, contract: "tablet-normal-comparison-focus-v1", checks: 6 }, null, 2));
