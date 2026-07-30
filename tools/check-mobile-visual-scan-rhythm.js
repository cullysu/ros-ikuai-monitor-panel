#!/usr/bin/env node

/**
 * Write-ahead contract for the R07 mobile visual scan rhythm slice.
 *
 * This is intentionally not a visual sign-off. It binds the product review
 * observation to fresh runtime geometry: the primary incident surface must
 * have visibly more scan weight than the secondary-risk queue.
 */

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const runtime = JSON.parse(read("_acceptance/panel-runtime-browser/report.json"));
const incident = read("src/panel-framework/mobile/MobilePatrolIncidentCenter.tsx");
const secondaryRisk = read("src/panel-framework/mobile/MobileConcurrentRiskQueue.tsx");

const geometryChecks = runtime.checks
  .filter((check) => check.name === "mobile composite incident keeps proved interface dependency primary and resource pressure secondary")
  .map((check) => check.detail)
  .filter((detail) => detail?.viewport?.width === 390 && detail?.viewport?.height === 844)
  .at(-1);

const primaryHeight = geometryChecks?.primaryRect?.height ?? null;
const secondaryHeight = geometryChecks?.queueRect?.height ?? null;
const checks = [
  ["primary incident owns the primary visual level", /data-mobile-incident-task-role="primary-risk"/.test(incident) && /data-mobile-visual-level="primary"/.test(incident)],
  ["secondary risk owns the context visual level", /data-mobile-incident-task-role="secondary-risk"/.test(secondaryRisk) && /data-overview-visual-level="context"/.test(secondaryRisk)],
  ["fresh 390px incident geometry is present", primaryHeight !== null && secondaryHeight !== null],
  ["primary risk has at least 24px more scan weight than secondary risk", primaryHeight !== null && secondaryHeight !== null && primaryHeight >= secondaryHeight + 24],
];

const failures = checks.filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  pass: failures.length === 0,
  contract: "mobile-visual-scan-rhythm-v1",
  implementationState: failures.length === 0 ? "focused-green" : "expected-red",
  geometry: { primaryHeight, secondaryHeight, delta: primaryHeight === null || secondaryHeight === null ? null : primaryHeight - secondaryHeight },
  failures,
  checks: Object.fromEntries(checks),
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
