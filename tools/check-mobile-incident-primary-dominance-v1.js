#!/usr/bin/env node
"use strict";

/**
 * Focused R07 geometry contract.
 *
 * Existing incident-rhythm checks prove that the follow-up plane does not
 * grow without bound. This contract is stricter: the primary risk must have
 * visibly more vertical weight than the next investigation plane. It is
 * bound to fresh production-shaped runtime geometry, not DOM counts or a
 * particular screenshot filename.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const reportPath = path.join(root, "_acceptance", "panel-runtime-browser", "report.json");
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const widths = [375, 390];
const checkName = (width) => `${width}px mobile primary action sits between primary and secondary risk planes`;
const runtimeByWidth = Object.fromEntries(
  widths.map((width) => {
    const entry = (report.checks || []).find((item) => item.name === checkName(width));
    return [width, entry?.detail || null];
  }),
);

const checks = {};
for (const width of widths) {
  const detail = runtimeByWidth[width];
  const primaryHeight = detail?.primaryRiskRect?.height ?? null;
  const followUpHeight = detail?.investigationRect?.height ?? null;
  const secondaryHeight = detail?.secondaryRiskRect?.height ?? null;
  checks[`${width}px fresh runtime is bound`] = Boolean(detail);
  checks[`${width}px primary risk leads follow-up by at least 8px`] =
    typeof primaryHeight === "number" && typeof followUpHeight === "number" &&
    primaryHeight >= followUpHeight + 8;
  checks[`${width}px secondary risk remains visibly subordinate`] =
    typeof primaryHeight === "number" && typeof secondaryHeight === "number" &&
    primaryHeight >= secondaryHeight + 16;
  checks[`${width}px touch and overflow boundaries remain intact`] =
    Boolean(detail) && detail.minimumTarget >= 44 && detail.overflow <= 1 && detail.clippedText?.length === 0;
}

const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  pass: failed.length === 0,
  contract: "mobile-incident-primary-dominance-v1",
  implementationState: failed.length === 0 ? "focused-green" : "expected-red",
  source: path.relative(root, reportPath).replaceAll("\\", "/"),
  geometry: Object.fromEntries(widths.map((width) => [width, {
    primaryRisk: runtimeByWidth[width]?.primaryRiskRect?.height ?? null,
    followUp: runtimeByWidth[width]?.investigationRect?.height ?? null,
    secondaryRisk: runtimeByWidth[width]?.secondaryRiskRect?.height ?? null,
  }])),
  checks,
  failed,
  releaseEvidenceEligible: false,
};

console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
