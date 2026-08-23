#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const reportPath = path.join(root, "_acceptance", "panel-runtime-browser", "report.json");
const report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, "utf8")) : null;

const samples = new Map();
for (const check of report?.checks || []) {
  const detail = check?.detail;
  if (
    check?.name === "mobile composite incident keeps proved interface dependency primary and resource pressure secondary" &&
    detail?.surface === "mobile" &&
    [375, 390].includes(detail?.viewport?.width) &&
    detail?.risk === "interfaces"
  ) {
    samples.set(detail.viewport.width, detail);
  }
}

const sampleValues = [...samples.values()];
const checks = [
  ["fresh 375/390 incident geometry is present", sampleValues.length === 2],
  ["primary risk object remains readable", sampleValues.every((item) => item.primaryRiskRect?.height >= 120)],
  ["follow-up rail is not heavier than the primary risk", sampleValues.every((item) => item.investigationRect?.height <= item.primaryRiskRect?.height + 8)],
  ["follow-up rail has an absolute phone bound", sampleValues.every((item) => item.investigationRect?.height <= 136)],
  ["primary action keeps its 56px task target", sampleValues.every((item) => item.phonePrimaryActionRect?.height === 56)],
  ["secondary investigation is a real disclosure", sampleValues.every((item) => item.secondaryDisclosureOpen === false && item.secondaryDisclosureSummaryRect?.height >= 44)],
  ["visible secondary actions stay between 44px and 48px", sampleValues.every((item) => (item.secondaryActionMinHeights || []).every((height) => height >= 44 && height <= 48))],
  ["fresh incident geometry has no overflow", sampleValues.every((item) => item.overflow === 0)],
];

const failed = checks.filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  pass: failed.length === 0,
  contract: "mobile-incident-rhythm-v2",
  implementationState: failed.length === 0 ? "focused-green" : "expected-red",
  releaseEvidenceEligible: false,
  samples: sampleValues.map((item) => ({
    width: item.viewport?.width,
    primaryRiskHeight: item.primaryRiskRect?.height,
    investigationHeight: item.investigationRect?.height,
    secondaryRiskHeight: item.secondaryRiskRect?.height,
    primaryActionHeight: item.phonePrimaryActionRect?.height,
    secondaryActionHeights: item.secondaryActionMinHeights,
    secondaryDisclosureHeight: item.secondaryDisclosureSummaryRect?.height,
    secondaryDisclosureOpen: item.secondaryDisclosureOpen,
    overflow: item.overflow,
  })),
  checks: Object.fromEntries(checks),
  failed,
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
