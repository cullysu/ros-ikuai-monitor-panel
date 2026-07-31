#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const checks = [];

function check(name, pass, detail = "") {
  checks.push({ name, pass: Boolean(pass), detail });
}

const screen = read("src/panel-framework/mobile/MobilePatrolScreen.tsx");
const css = `${read("src/panel-framework/mobile/mobile-patrol.css")}\n${read("src/panel-framework/mobile/mobile-tablet-layout.css")}`;
const runtimePath = "_acceptance/panel-runtime-browser/report.json";
const runtime = exists(runtimePath) ? JSON.parse(read(runtimePath)) : null;
const runtimeNames = new Set((runtime?.checks || []).map((entry) => entry?.name).filter(Boolean));
const screenshots = new Set(runtime?.screenshots || []);

check(
  "tablet overview declares one task-space owner",
  screen.includes('data-tablet-task-space="v2"'),
  "expected data-tablet-task-space=\"v2\" on the overview owner",
);
check(
  "normal tablet task has explicit primary, relation and follow-up roles",
  screen.includes('data-tablet-space-surface="normal"') &&
    screen.includes('data-tablet-space-primary="route-evidence"') &&
    screen.includes('data-tablet-space-relation="object-coverage"') &&
    screen.includes('data-tablet-space-follow-up="next-inspection"'),
  "normal task roles must be visible in the rendered tree",
);
check(
  "incident tablet task has explicit primary, relation and follow-up roles",
  screen.includes('data-tablet-space-surface="incident"') &&
    screen.includes('data-tablet-space-primary="impact-list"') &&
    screen.includes('data-tablet-space-relation="selected-evidence"') &&
    screen.includes('data-tablet-space-follow-up="evidence-and-actions"'),
  "incident task roles must be visible in the rendered tree",
);
check(
  "both tablet tasks expose an evidence boundary",
  screen.includes('data-tablet-space-boundary="evidence-ledger"'),
  "the lower boundary must be owned by the evidence ledger rather than empty height",
);
check(
  "768px capacity has an honest stacked fallback",
  /@container \(max-width: 639px\)[\s\S]*?\.mp-tablet-master-detail\s*\{[\s\S]*?grid-template-columns:\s*1fr;/.test(css),
  "below the 640px content capacity the master/detail task must stack",
);
check(
  "640px capacity preserves the bounded split",
  /\.mp-tablet-master-detail\s*\{[\s\S]*?grid-template-columns:\s*minmax\(240px,\s*0.38fr\)\s+minmax\(400px,\s*0.62fr\);/.test(css),
  "the split requires a readable object pane and a readable inspector pane",
);
check(
  "incident rows own mark, object copy and action columns",
  /\.mp-incident-row\s*\{[\s\S]*?grid-template-columns:\s*10px\s+minmax\(0,\s*1fr\)\s+auto;/.test(css),
  "an implicit grid column centers the risk mark and wastes tablet task space",
);
check(
  "tablet task contract rejects decorative filler",
  !/data-tablet-space-filler|tablet-space-filler|重复指标/.test(screen),
  "no filler marker or duplicate-metric escape hatch is allowed",
);

check(
  "fresh tablet runtime report is available and has explicit release eligibility",
  runtime?.source === "playwright-production-runtime" &&
    runtime?.pass === true &&
    typeof runtime?.releaseEvidenceEligible === "boolean",
  { source: runtime?.source ?? null, pass: runtime?.pass ?? null, releaseEvidenceEligible: runtime?.releaseEvidenceEligible ?? null },
);

const requiredScreenshots = [
  "tablet-overview-normal-768.png",
  "tablet-overview-master-detail-768.png",
  "tablet-overview-master-detail-844.png",
  "tablet-network-844.png",
];
check(
  "768/844 normal and incident tablet originals are registered",
  requiredScreenshots.every((name) => screenshots.has(name)),
  { requiredScreenshots, missing: requiredScreenshots.filter((name) => !screenshots.has(name)) },
);

const requiredRuntimeChecks = [
  "tablet normal vertical task surface binds a patrol sequence without metric filler",
  "tablet incident vertical task surface binds impact follow-up without metric filler",
  "tablet normal next-evidence workspace compares object coverage without repeating traffic metrics",
  "tablet incident next-evidence workspace compares impact sources without repeating traffic metrics",
  "768px tablet domain workspace exposes a split object task with semantic preview",
  "844px tablet keeps the object list visible beside selected evidence",
];
for (const name of requiredRuntimeChecks) {
  check(`fresh runtime owns: ${name}`, runtimeNames.has(name) && runtime.checks.find((entry) => entry.name === name)?.pass === true, {
    present: runtimeNames.has(name),
    pass: runtime?.checks?.find((entry) => entry.name === name)?.pass ?? null,
  });
}

const failures = checks.filter((entry) => !entry.pass).map((entry) => entry.name);
const report = {
  pass: failures.length === 0,
  contract: "tablet-task-space-v2",
  releaseEligible: false,
  failures,
  checks,
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exitCode = report.pass ? 0 : 1;
