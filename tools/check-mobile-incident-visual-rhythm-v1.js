#!/usr/bin/env node
"use strict";

/**
 * R07 write-ahead contract.
 *
 * The existing primary-dominance contract only proves a 8px lead. This
 * contract makes the product/design concern falsifiable: the primary risk
 * plane must have a materially stronger visual lead, while touch and text
 * boundaries remain intact. It intentionally reads fresh runtime geometry,
 * not screenshot filenames or DOM counts.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const reportPath = path.join(root, "_acceptance", "panel-runtime-browser", "report.json");
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const widths = [375, 390];
const minimumLead = 16;
const checkName = (width) => `${width}px mobile primary action sits between primary and secondary risk planes`;

const geometry = Object.fromEntries(widths.map((width) => {
  const detail = (report.checks || []).find((item) => item.name === checkName(width))?.detail || null;
  return [width, {
    bound: Boolean(detail),
    primary: detail?.primaryRiskRect?.height ?? null,
    investigation: detail?.investigationRect?.height ?? null,
    secondary: detail?.secondaryRiskRect?.height ?? null,
    minimumTarget: detail?.minimumTarget ?? null,
    overflow: detail?.overflow ?? null,
    clippedText: detail?.clippedText ?? null,
  }];
}));

const checks = {};
for (const width of widths) {
  const item = geometry[width];
  checks[`${width}px fresh runtime is bound`] = item.bound;
  checks[`${width}px primary risk leads investigation by at least ${minimumLead}px`] =
    typeof item.primary === "number" && typeof item.investigation === "number" &&
    item.primary >= item.investigation + minimumLead;
  checks[`${width}px secondary risk remains subordinate`] =
    typeof item.primary === "number" && typeof item.secondary === "number" &&
    item.primary >= item.secondary + minimumLead;
  checks[`${width}px touch and overflow boundaries remain intact`] =
    item.bound && item.minimumTarget >= 44 && item.overflow <= 1 &&
    Array.isArray(item.clippedText) && item.clippedText.length === 0;
}

const failed = Object.entries(checks)
  .filter(([, pass]) => !pass)
  .map(([name]) => name);
const result = {
  pass: failed.length === 0,
  contract: "mobile-incident-visual-rhythm-v1",
  implementationState: failed.length === 0 ? "focused-green" : "expected-red",
  minimumLead,
  source: path.relative(root, reportPath).replaceAll("\\", "/"),
  generatedAt: report.generatedAt || null,
  geometry,
  checks,
  failed,
  releaseEvidenceEligible: false,
};

console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
