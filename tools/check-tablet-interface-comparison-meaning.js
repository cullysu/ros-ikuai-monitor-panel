#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const componentPath = path.join(root, "src", "panel-framework", "mobile", "MobileTabletInterfaceRelations.tsx");
const runtimePath = path.join(root, "tools", "check-tablet-interface-relations-runtime.js");
const reportPath = path.join(root, "_acceptance", "tablet-interface-relation-runtime", "report.json");
const component = fs.readFileSync(componentPath, "utf8");
const runtime = fs.readFileSync(runtimePath, "utf8");
const report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, "utf8")) : null;
const failures = [];

function check(name, condition, detail) {
  if (!condition) failures.push({ name, detail });
}

check(
  "aggregate relation block uses truthful summary label",
  /关系摘要/.test(component),
  "the block contains aggregate coverage/source facts, so it must be named 关系摘要"
);
check(
  "aggregate block does not claim object comparison",
  !/<small>对象比较<\/small>/.test(component),
  "对象比较 is reserved for a real object-level comparison target and interaction"
);
check(
  "relation summary owner remains bound",
  /data-tablet-interface-comparison/.test(component),
  "keep a stable owner for the relation summary"
);
check(
  "runtime captures the visible summary label",
  /comparisonLabel/.test(runtime) && /关系摘要/.test(runtime),
  "runtime evidence must assert the text the operator actually sees"
);
check(
  "runtime report binds the visible summary label",
  Boolean(report?.pass) && Array.isArray(report.evidence) && report.evidence.every((item) => item.comparisonLabel === "关系摘要"),
  "both 768px and 844px evidence cells must bind the same truthful label"
);
check(
  "runtime report keeps both tablet screenshots",
  Boolean(report?.pass) && Array.isArray(report.screenshots) && report.screenshots.some((file) => file.endsWith("tablet-interface-relations-768.png")) && report.screenshots.some((file) => file.endsWith("tablet-interface-relations-844.png")),
  "do not replace fresh 768/844 evidence with a static text-only check"
);

const result = {
  pass: failures.length === 0,
  contract: "tablet-interface-comparison-meaning-v1",
  checks: 6,
  failures,
};
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
