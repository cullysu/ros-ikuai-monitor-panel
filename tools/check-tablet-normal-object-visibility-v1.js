#!/usr/bin/env node
"use strict";

/**
 * R09 write-ahead contract.
 *
 * A normal tablet may legitimately use a vertical fallback, but that fallback
 * must still let the operator begin an object comparison in the first scan.
 * The contract therefore measures the first real object row, not merely the
 * existence or height of a later object-workspace container.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const reportPath = path.join(root, "_acceptance", "panel-runtime-browser", "report.json");
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const sourceName = "768/844/1199 current normal Overview exposes route/WAN evidence, an early object-focus workspace and one support band";
const source = (report.checks || []).find((item) => item.name === sourceName)?.detail || {};
const widths = ["normal768", "normal844"];
const minimumVisibleRatio = 0.25;
const samples = Object.fromEntries(widths.map((key) => {
  const item = source[key] || {};
  return [key, {
    viewport: item.viewport || null,
    viewportBottom: item.viewportBottom ?? null,
    normalObjectFocusRect: item.normalObjectFocusRect || null,
    firstObjectRowVisibleRatio: item.firstObjectRowVisibleRatio ?? null,
    firstObjectRowInFirstViewport: item.firstObjectRowInFirstViewport ?? null,
    overflow: item.overflow ?? null,
  }];
}));

const checks = {};
for (const key of widths) {
  const item = samples[key];
  checks[`${key} fresh normal runtime is bound`] = Boolean(item.normalObjectFocusRect);
  checks[`${key} first real object row is visible by at least ${minimumVisibleRatio * 100}%`] =
    typeof item.firstObjectRowVisibleRatio === "number" &&
    item.firstObjectRowVisibleRatio >= minimumVisibleRatio &&
    item.firstObjectRowInFirstViewport === true;
  checks[`${key} normal workspace has no overflow`] = item.overflow === 0;
}

const failed = Object.entries(checks)
  .filter(([, pass]) => !pass)
  .map(([name]) => name);
const result = {
  pass: failed.length === 0,
  contract: "tablet-normal-object-visibility-v1",
  implementationState: failed.length === 0 ? "focused-green" : "expected-red",
  source: path.relative(root, reportPath).replaceAll("\\", "/"),
  generatedAt: report.generatedAt || null,
  minimumVisibleRatio,
  samples,
  checks,
  failed,
  releaseEvidenceEligible: false,
};

console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
