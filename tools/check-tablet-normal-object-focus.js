const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(ROOT, "src/panel-framework/mobile/MobilePatrolScreen.tsx"), "utf8");
const slots = fs.readFileSync(path.join(ROOT, "src/panel-framework/mobile/MobileTabletNextEvidenceSlots.tsx"), "utf8");
const evidence = fs.readFileSync(path.join(ROOT, "src/panel-framework/mobile/MobileTabletNextEvidence.tsx"), "utf8");
const checks = [];

function check(name, pass, detail = "") {
  checks.push({ name, pass: Boolean(pass), detail });
}

check(
  "normal tablet declares one early object-focus owner",
  slots.includes('data-tablet-object-workspace="comparison"'),
  "normal tablet must name one bounded object comparison workspace",
);
check(
  "normal tablet builds a dedicated object-focus render slot",
  source.includes("{tabletNextEvidence}") &&
    slots.includes('data-tablet-object-workspace-owner="object-list-and-inspector"'),
  "the slot must be an explicit capability-bound composition, not a CSS reorder",
);

const normalStart = source.indexOf('data-tablet-space-surface="normal"');
const incidentStart = source.indexOf('data-tablet-space-surface="incident"');
const normalBranch = normalStart >= 0 && incidentStart > normalStart
  ? source.slice(normalStart, incidentStart)
  : "";
check(
  "object focus is rendered in the normal tablet workspace",
  normalBranch.includes("{tabletNextEvidence}") &&
    normalBranch.includes("<MobileSteadyDecisionLedger"),
  "selection and the decision ledger must remain in the same normal tablet task composition",
);
check(
  "incident next-evidence workspace remains separately owned",
  source.includes("{incident ? tabletNextEvidence : null}") &&
    evidence.includes('data-tablet-next-evidence-workspace={kind}'),
  "incident keeps its own next-evidence kind while normal owns the comparison workspace",
);

const failures = checks.filter((entry) => !entry.pass).map((entry) => entry.name);
const report = {
  pass: failures.length === 0,
  contract: "tablet-normal-object-focus-v1",
  implementationState: failures.length === 0 ? "focused-green" : "expected-red",
  failures,
  checks,
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
process.exitCode = report.pass ? 0 : 1;
