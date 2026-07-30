const fs = require("fs");

const reportPath = "_acceptance/panel-runtime-browser/report.json";
const failures = [];
let report = null;
try {
  report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
} catch (error) {
  failures.push(`runtime-report-unreadable:${error.message}`);
}

const samples = [];
function walk(value) {
  if (!value || typeof value !== "object") return;
  if (
    value.name === "mobile-incident-rhythm-v1: primary-plus-context action rhythm is explicit and visually bounded" &&
    value.detail?.surface === "mobile" &&
    value.detail?.risk === "interfaces" &&
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
    failures.push(`${width}px-incident-sample-missing`);
    continue;
  }
  const primary = sample.primaryRiskRect?.height;
  const followUp = sample.investigationRect?.height;
  const ratio = typeof primary === "number" && primary > 0 && typeof followUp === "number"
    ? followUp / primary
    : null;
  const bounded = ratio !== null && ratio <= 0.82;
  if (!bounded) failures.push(`${width}px-follow-up-too-heavy:${ratio ?? "unavailable"}`);
}

const result = {
  pass: failures.length === 0,
  contract: "mobile-incident-visual-dominance-v1",
  implementationState: failures.length === 0 ? "focused-green" : "expected-red",
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
