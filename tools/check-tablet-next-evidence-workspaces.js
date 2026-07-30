const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));
const failures = [];
const checks = {};
const check = (name, condition, detail = "") => {
  checks[name] = Boolean(condition);
  if (!condition) failures.push({ name, detail });
};

const screen = read("src/panel-framework/mobile/MobilePatrolScreen.tsx");
const slots = read("src/panel-framework/mobile/MobileTabletNextEvidenceSlots.tsx");
const componentPath = "src/panel-framework/mobile/MobileTabletNextEvidence.tsx";
const component = exists(componentPath) ? read(componentPath) : "";

check("component exists", exists(componentPath), componentPath);
check(
  "normal workspace owner",
  (screen + slots).includes("MobileTabletNextEvidence") && (screen + slots).includes('kind="normal"'),
  "tablet normal branch must own a next-evidence workspace",
);
check(
  "incident workspace owner",
  (screen + slots).includes("MobileTabletNextEvidence") && (screen + slots).includes('kind="incident"'),
  "tablet incident branch must own a next-evidence workspace",
);
check(
  "normal source collection",
  component.includes("comparisonObjects")
    && component.includes('data-tablet-next-evidence-kind={isNormal ? "object-coverage"')
    && slots.includes("comparisonObjects={model.tabletComparisonObjects}"),
  "normal workspace must compare the model's real comparison objects and expose the object-coverage kind",
);
check(
  "incident source collection",
  component.includes("priorityObjects") && component.includes("impact-trace"),
  "incident workspace must compare real priority objects",
);
check(
  "fresh evidence context",
  component.includes("evidenceAt") && component.includes("sourcePath"),
  "each workspace must expose evidence time and source path",
);
check(
  "no metric filler",
  !/min-height\s*:\s*\d{3,}px|repeat\([^)]*metric|dummy|placeholder/i.test(component),
  "workspace must not be a metric/filler surface",
);
check(
  "new decision marker",
  component.includes("data-tablet-next-evidence-new-decision") && component.includes('"true"'),
  "workspace must declare its novel decision surface",
);

const report = {
  pass: failures.length === 0,
  contract: "tablet-next-evidence-workspaces-v1",
  checks,
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
