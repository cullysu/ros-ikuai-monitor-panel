const path = require("node:path");
const { readRuntimeReport, runtimeIdentityDetail } = require("./runtime-report-identity");

const root = path.resolve(__dirname, "..");
const runtimeBinding = readRuntimeReport(root);
const requireRuntime = process.argv.includes("--require-current-runtime");
const runtimeSkipped = !runtimeBinding.current && !requireRuntime;
const report = runtimeBinding.current ? runtimeBinding.report : null;
const failures = [];
const checks = {
  runtimeIdentityCurrentWhenRequired: !requireRuntime || runtimeBinding.current,
};
if (!checks.runtimeIdentityCurrentWhenRequired) failures.push("current-runtime-identity-required");

const hits = [];
function walk(value, currentPath) {
  if (!value || typeof value !== "object") return;
  if (value.runtimeToolbar && value.surface === "desktop" && value.scenario === "single" && value.risk === "none" && currentPath.join(".").endsWith("normal1366")) {
    hits.push({ path: currentPath.join("."), ...value });
  }
  for (const [key, child] of Object.entries(value)) walk(child, currentPath.concat(key));
}
if (report) walk(report, []);

const witness = hits[0];
checks.witness = runtimeSkipped || Boolean(witness);
if (!checks.witness) failures.push("desktop-normal1366-witness-missing");
checks.statusInFirstViewport = runtimeSkipped || witness?.verdictInFirstViewport === true;
checks.wanInFirstViewport = runtimeSkipped || witness?.chartInFirstViewport === true;
checks.investigationInFirstViewport = runtimeSkipped || witness?.firstInvestigationActionInFirstViewport === true;
checks.decisionInFirstViewport = runtimeSkipped || Boolean(witness?.decisionRect && witness.decisionRect.top < witness.viewportBottom);
checks.fullEvidenceBoundaryInFirstViewport = runtimeSkipped || witness?.evidenceBoundaryInFirstViewport === true;
if (!checks.fullEvidenceBoundaryInFirstViewport) failures.push("full-evidence-boundary-below-first-viewport");

const result = {
  pass: failures.length === 0,
  contract: "desktop-first-scan-economy-v1",
  implementationState: failures.length ? "expected-red" : runtimeBinding.current ? "focused-runtime-green" : "runtime-pending",
  runtimeEvidence: runtimeIdentityDetail(runtimeBinding),
  observed: witness ? {
    path: witness.path,
    viewportBottom: witness.viewportBottom,
    verdict: witness.verdictRect,
    decision: witness.decisionRect,
    evidenceBoundary: witness.evidenceBoundaryRect,
    firstViewport: {
      status: witness.verdictInFirstViewport,
      wan: witness.chartInFirstViewport,
      investigation: witness.firstInvestigationActionInFirstViewport,
      decision: witness.decisionRect ? witness.decisionRect.top < witness.viewportBottom : false,
      evidenceBoundary: witness.evidenceBoundaryInFirstViewport,
    },
  } : null,
  checks,
  failures,
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
