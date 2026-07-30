#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const componentPath = path.join(root, "src", "panel-framework", "mobile", "MobileTabletInterfaceRelations.tsx");
const parentPath = path.join(root, "src", "panel-framework", "mobile", "MobileDomainWorkspace.tsx");
const stylePaths = [
  "mobile-domain-foundation.css",
  "mobile-domain.css"
].map((file) => path.join(root, "src", "panel-framework", "mobile", file));
const component = fs.readFileSync(componentPath, "utf8");
const parent = fs.readFileSync(parentPath, "utf8");
const style = stylePaths.map((file) => fs.readFileSync(file, "utf8")).join("\n");
const failures = [];

function check(name, condition, detail) {
  if (!condition) failures.push({ name, detail });
}

check(
  "next-step is an explicit conditional task",
  /data-tablet-workspace-next-step=\"true\"/.test(component) && /unverifiedCount\s*>\s*0/.test(component),
  "the task must exist only when an interface-to-default-route relation is unverified"
);
check(
  "task has a concrete route-table destination",
  /查看路由表/.test(component) && /onNavigate\(\"routes\"/.test(component),
  "the next step must lead to the actual route table, not a dead action"
);
check(
  "task preserves return context",
  /returnRoute:\s*\"interfaces\"/.test(component) && /evidenceAt/.test(component),
  "route navigation must preserve the originating workspace and evidence timestamp"
);
check(
  "task does not invent an object identity",
  !/objectId/.test(component),
  "no route object may be fabricated when the relation is unverified"
);
check(
  "task does not replay inspector traffic",
  !/rxRate|txRate|rxBytes|txBytes/.test(component),
  "the task strip must add a next action rather than duplicate readings"
);
check(
  "parent supplies navigation and evidence context",
  /MobileTabletInterfaceRelations\s+rows=\{filtered\}\s+onNavigate=\{onNavigate\}\s+evidenceAt=\{evidenceAt\}/.test(parent),
  "the workbench must pass the existing navigation contract and snapshot time"
);
check(
  "task is restricted to current tablet interface evidence",
  /tabletWorkbench\s+&&\s+!largeText\s+&&\s+route\s*===\s*\"interfaces\"\s+&&\s+model\.evidenceMode\s*===\s*\"current\"/.test(parent),
  "the entry must not appear in phone, large-text, stale, or fallback layouts"
);
check(
  "task owns a shared stylesheet",
  /mdw-tablet-next-step-body/.test(component) && /className=\"mdw-reset-controls\"/.test(component) && /\.mdw-reset-controls\s*\{/.test(style) && /min-height:\s*44px/.test(style),
  "the task needs a visible shared mobile owner and a touch-sized route action"
);
check(
  "task avoids a sidecar style patch",
  !fs.existsSync(path.join(root, "src", "panel-framework", "mobile", "mobile-tablet-next-step.css")),
  "extend the existing domain stylesheet instead of adding a one-off patch file"
);

if (failures.length) {
  console.error(JSON.stringify({ pass: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ pass: true, checks: 9, contract: "tablet-next-step-v1" }, null, 2));
