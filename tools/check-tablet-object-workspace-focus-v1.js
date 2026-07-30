#!/usr/bin/env node

/**
 * R09 product/design write-ahead contract.
 *
 * The normal 768px tablet task must present object comparison as one bounded
 * master/detail workbench. A list in one column and a selected-object inspector
 * much later in another evidence stream is not a comparison workspace: it
 * makes the user hold the object identity while scanning unrelated sections.
 * This contract is intentionally expected-red before the implementation slice.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const screen = read("src/panel-framework/mobile/MobilePatrolScreen.tsx");
const slots = read("src/panel-framework/mobile/MobileTabletNextEvidenceSlots.tsx");
const evidence = read("src/panel-framework/mobile/MobileTabletNextEvidence.tsx");
const inspector = read("src/panel-framework/mobile/MobileTabletNormalComparisonInspector.tsx");
const css = read("src/panel-framework/mobile/mobile-tablet-next-evidence.css")
  + read("src/panel-framework/mobile/mobile-tablet-layout.css");

const checks = [
  {
    name: "normal tablet has one explicit object workspace owner",
    pass: /data-tablet-object-workspace="comparison"/.test(slots),
    detail: "the normal object list and selected evidence must share one named workspace",
  },
  {
    name: "object workspace owns both list and selected inspector",
    pass: /data-tablet-object-workspace-list/.test(slots)
      && /showInspector=\{true\}/.test(slots)
      && /data-tablet-object-workspace-inspector/.test(inspector),
    detail: "the inspector cannot remain a detached right-column afterthought",
  },
  {
    name: "selected object identity remains visible in the workspace",
      pass: /data-tablet-next-evidence-selected-object/.test(evidence)
      && /data-tablet-normal-comparison-object/.test(inspector),
    detail: "selection must stay bound to the stable object id while the user compares evidence",
  },
  {
    name: "workspace has a tablet-capacity layout rather than a detached vertical replay",
    pass: /\.mp-tablet-object-workspace[\s\S]*grid-column:\s*1\s*\/\s*-1/.test(css)
      && /\.mp-tablet-object-workspace[\s\S]*grid-template-columns/.test(css),
    detail: "768px must use available width for a bounded master/detail relation",
  },
  {
    name: "detached normal comparison inspector is not mounted outside the workspace",
    pass: !/const normalComparisonInspector[\s\S]*?mp-tablet-right-column/.test(screen),
    detail: "the normal inspector must not be appended after traffic, decisions and route relation evidence",
  },
];

const failed = checks.filter((entry) => !entry.pass).map((entry) => entry.name);
const report = {
  pass: failed.length === 0,
  contract: "tablet-object-workspace-focus-v1",
  implementationState: failed.length === 0 ? "focused-green" : "expected-red",
  releaseEligible: false,
  checks,
  failed,
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
