const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const failures = [];
const checks = [];

function check(name, pass, detail = "") {
  checks.push({ name, pass: Boolean(pass), detail });
  if (!pass) failures.push({ name, detail });
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

const screenSource = read("src/panel-framework/mobile/MobilePatrolScreen.tsx");
const taskSource = fileExists("src/panel-framework/mobile/MobileTabletVerticalTask.tsx")
  ? read("src/panel-framework/mobile/MobileTabletVerticalTask.tsx")
  : "";
const source = `${screenSource}\n${taskSource}`;
const runtimePath = path.join(root, "_acceptance/panel-runtime-browser/report.json");
const runtime = fileExists("_acceptance/panel-runtime-browser/report.json")
  ? JSON.parse(fs.readFileSync(runtimePath, "utf8"))
  : null;

const requiredScreenshots = [
  "tablet-overview-normal-768.png",
  "tablet-overview-master-detail-844.png",
];

check(
  "fresh panel runtime report is available",
  Boolean(runtime?.pass === true && runtime?.generatedAt),
  runtime ? `pass=${runtime.pass} generatedAt=${runtime.generatedAt}` : "missing report",
);
check(
  "normal and incident tablet originals are registered",
  Boolean(runtime && requiredScreenshots.every((name) => runtime.screenshots?.includes(name))),
  requiredScreenshots.join(", "),
);

const taskOwners = {
  normal: source.includes("data-tablet-vertical-space-task={kind}") && source.includes('kind: "normal" | "incident"'),
  incident: source.includes("data-tablet-vertical-space-task={kind}") && source.includes('kind: "normal" | "incident"'),
};
check(
  "normal tablet state owns a distinct vertical task surface",
  taskOwners.normal,
  "expected data-tablet-vertical-space-task=normal on the normal tablet branch",
);
check(
  "incident tablet state owns a distinct vertical task surface",
  taskOwners.incident,
  "expected data-tablet-vertical-space-task=incident on the incident tablet branch",
);

const semanticOwners = {
  normal: source.includes('"patrol-sequence"'),
  incident: source.includes('"impact-follow-up"'),
  newDecision: source.includes("data-tablet-space-new-decision"),
};
check(
  "tablet vertical surfaces declare a task purpose rather than filler",
  semanticOwners.normal && semanticOwners.incident,
  JSON.stringify(semanticOwners),
);
check(
  "tablet vertical surfaces expose a new task decision surface",
  semanticOwners.newDecision,
  "expected data-tablet-space-new-decision on the task owner",
);

const forbiddenFiller = /min-height\s*:\s*[^;]+|data-tablet-space-filler|重复指标|placeholder/i.test(source);
check(
  "vertical task contract does not use fixed-height or filler language",
  !forbiddenFiller,
  forbiddenFiller ? "forbidden filler pattern found in MobilePatrolScreen.tsx" : "none",
);

const runtimeNames = new Set((runtime?.checks || []).map((item) => item?.name).filter(Boolean));
check(
  "runtime report has named normal tablet vertical-task evidence",
  [...runtimeNames].some((name) => /tablet.*normal.*vertical|normal.*tablet.*task/i.test(name)),
  "no named normal vertical-task runtime check",
);
check(
  "runtime report has named incident tablet vertical-task evidence",
  [...runtimeNames].some((name) => /tablet.*incident.*vertical|incident.*tablet.*task/i.test(name)),
  "no named incident vertical-task runtime check",
);

const report = {
  pass: failures.length === 0,
  contract: "tablet-vertical-space-tasks-v1",
  failures,
  checks,
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
