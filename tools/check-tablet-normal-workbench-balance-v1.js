const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const reportPath = path.join(ROOT, "_acceptance", "panel-runtime-browser", "report.json");
const sourcePath = path.join(ROOT, "src", "panel-framework", "mobile", "MobilePatrolScreen.tsx");
const slotsPath = path.join(ROOT, "src", "panel-framework", "mobile", "MobileTabletNextEvidenceSlots.tsx");
const inspectorPath = path.join(ROOT, "src", "panel-framework", "mobile", "MobileTabletNormalComparisonInspector.tsx");
const report = fs.existsSync(reportPath)
  ? JSON.parse(fs.readFileSync(reportPath, "utf8"))
  : null;
const source = fs.existsSync(sourcePath) ? fs.readFileSync(sourcePath, "utf8") : "";
const slots = fs.existsSync(slotsPath) ? fs.readFileSync(slotsPath, "utf8") : "";
const inspector = fs.existsSync(inspectorPath) ? fs.readFileSync(inspectorPath, "utf8") : "";
const checks = [];

function check(name, pass, detail = "") {
  checks.push({ name, pass: Boolean(pass), detail });
}

const runtime = new Map((report?.checks || []).map((entry) => [entry.name, entry]));
const geometry = runtime.get("tablet normal puts object comparison before supporting columns and keeps relation/evidence after the task workspace")?.detail || null;
const leftBottom = Number(geometry?.left?.bottom);
const rightBottom = Number(geometry?.right?.bottom);
const imbalance = Number.isFinite(leftBottom) && Number.isFinite(rightBottom)
  ? leftBottom - rightBottom
  : Number.POSITIVE_INFINITY;

check(
  "fresh tablet geometry is available",
  report?.pass === true && geometry && Number.isFinite(leftBottom) && Number.isFinite(rightBottom),
  { reportPass: report?.pass ?? null, leftBottom, rightBottom },
);
check(
  "normal tablet columns keep a bounded lower imbalance",
  imbalance <= 96,
  { leftBottom, rightBottom, imbalance, maximum: 96 },
);
check(
  "normal tablet has a separate selected-object inspector owner",
  slots.includes('data-tablet-object-workspace="comparison"')
    && inspector.includes('data-tablet-object-workspace-inspector="true"')
    && !source.includes("normalComparisonInspector"),
  "the selected object evidence must be owned inside the bounded comparison workspace without a detached right-column replay",
);
check(
  "normal tablet does not mount the generic comparison list beside the dedicated workspace",
  !/\{comparisonList\}[\s\S]*\{relationTablet/.test(source),
  "the dedicated master/detail workspace is the single owner of normal tablet comparison evidence",
);

const failed = checks.filter((entry) => !entry.pass).map((entry) => entry.name);
const result = {
  pass: failed.length === 0,
  contract: "tablet-normal-workbench-balance-v1",
  implementationState: failed.length === 0 ? "focused-green" : "expected-red",
  reportPath: path.relative(ROOT, reportPath).replaceAll("\\", "/"),
  checks,
  failed,
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
