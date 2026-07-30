#!/usr/bin/env node

/**
 * Write-ahead contract for the single-item secondary-risk task rail.
 *
 * This is a product/interaction contract, not visual sign-off. It ensures a
 * single concurrent risk reads as context after the primary incident instead
 * of inheriting a second full incident header.
 */

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const runtime = JSON.parse(read("_acceptance/panel-runtime-browser/report.json"));
const source = read("src/panel-framework/mobile/MobileConcurrentRiskQueue.tsx");
const style = read("src/panel-framework/mobile/mobile-patrol.css");

const geometry = (runtime.checks || [])
  .filter((check) => check.name === "mobile composite incident keeps proved interface dependency primary and resource pressure secondary")
  .map((check) => check.detail)
  .find((detail) => detail?.surface === "mobile" && detail?.viewport?.width === 390 && detail?.viewport?.height === 844);

const primaryHeight = geometry?.primaryRect?.height ?? null;
const secondaryHeight = geometry?.queueRect?.height ?? null;
const checks = [
  ["component declares single-item secondary-risk density", /data-mobile-secondary-risk-density/.test(source)],
  ["single-item secondary risk has an explicit compact owner", /is-single/.test(source) && /tasks\.length === 1/.test(source)],
  ["single-item copy uses context wording instead of a second incident title", /同时发生/.test(source)],
  ["active mobile CSS owner exists outside the component markup", /\.mp-risk-queue\.is-single/.test(style)],
  ["fresh 390px secondary queue is materially lighter than primary risk", secondaryHeight !== null && primaryHeight !== null && secondaryHeight <= primaryHeight - 40],
  ["secondary risk keeps object navigation and evidence context", /overviewRiskTaskNavigation\(task, evidenceAt\)/.test(source)],
];

const failures = checks.filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  pass: failures.length === 0,
  contract: "mobile-secondary-risk-compact-v1",
  implementationState: failures.length === 0 ? "focused-green" : "expected-red",
  geometry: { primaryHeight, secondaryHeight, delta: primaryHeight === null || secondaryHeight === null ? null : primaryHeight - secondaryHeight },
  failures,
  checks: Object.fromEntries(checks),
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
