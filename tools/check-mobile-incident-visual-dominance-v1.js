const fs = require("fs");
const path = require("node:path");
const { readRuntimeReport, runtimeIdentityDetail } = require('./runtime-report-identity');

const root = path.resolve(__dirname, '..');
const requireCurrentRuntime = process.argv.includes('--require-current-runtime');
const runtimeBinding = readRuntimeReport(root);
const reportPath = runtimeBinding.reportPath;
const failures = [];
const report = ['current', 'red'].includes(runtimeBinding.status) ? runtimeBinding.report : null;
const runtimeSkipped = !report;

if (requireCurrentRuntime && !runtimeBinding.current) failures.push('runtime-identity-not-current');

const samples = [];
function walk(value) {
  if (!value || typeof value !== "object") return;
  if (
    value.pass === true &&
    value.detail?.surface === "mobile" &&
    value.detail?.risk === "interfaces" &&
    value.detail?.primaryRiskRect &&
    value.detail?.investigationRect &&
    [375, 390].includes(value.detail?.viewport?.width)
  ) {
    samples.push(value.detail);
  }
  for (const child of Object.values(value)) walk(child);
}
if (report) walk(report);

const byWidth = new Map(samples.map((sample) => [sample.viewport.width, sample]));
for (const width of [375, 390]) {
  const sample = byWidth.get(width);
  if (!sample) {
    if (!runtimeSkipped) failures.push(`${width}px-incident-sample-missing`);
    continue;
  }
  const primary = sample.primaryRiskRect?.height;
  const followUp = sample.investigationRect?.height;
  const ratio = typeof primary === "number" && primary > 0 && typeof followUp === "number"
    ? followUp / primary
    : null;
  const bounded = ratio !== null && ratio <= 0.82;
  if (!runtimeSkipped && !bounded) failures.push(`${width}px-follow-up-too-heavy:${ratio ?? "unavailable"}`);
}

const result = {
  pass: failures.length === 0,
  contract: "mobile-incident-visual-dominance-v1",
  implementationState: failures.length ? "expected-red" : runtimeBinding.current ? "focused-green" : "static-green-runtime-pending",
  runtimeIdentity: runtimeIdentityDetail(runtimeBinding),
  runtimeChecksApplied: Boolean(report),
  policy: "on phone incident surfaces, the primary risk must clearly outweigh the follow-up action plane without shrinking the 56px primary action or 44px secondary targets",
  observed: [375, 390].map((width) => {
    const sample = byWidth.get(width);
    const primary = sample?.primaryRiskRect?.height ?? null;
    const followUp = sample?.investigationRect?.height ?? null;
    return { width, primary, followUp, ratio: primary ? followUp / primary : null };
  }),
  failures,
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
