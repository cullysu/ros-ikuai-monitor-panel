#!/usr/bin/env node
"use strict";

/**
 * R09 write-ahead contract.
 *
 * The first tablet scan must answer which route carries traffic and what the
 * current WAN window shows. Object comparison remains available immediately
 * after that primary evidence, but it must not displace the primary decision.
 */
const fs = require("node:fs");
const path = require("node:path");
const { readRuntimeReport, runtimeIdentityDetail } = require("./runtime-report-identity");

const root = path.resolve(__dirname, "..");
const runtimeBinding = readRuntimeReport(root);
const reportPath = runtimeBinding.reportPath;
const report = runtimeBinding.current ? runtimeBinding.report : null;
const sourceName = "768/844/899/900/1199 current normal Overview keeps one relation evidence owner in the tablet workbench";
const source = (report?.checks || []).find((item) => item.name === sourceName)?.detail || {};
const widths = ["normal768", "normal844"];
const samples = Object.fromEntries(widths.map((key) => {
  const item = source[key] || {};
  return [key, {
    viewport: item.viewport || null,
    viewportBottom: item.viewportBottom ?? null,
    routeDossierRect: item.routeDossierRect || null,
    signalRect: item.signalRect || null,
    normalObjectFocusRect: item.normalObjectFocusRect || null,
    overflow: item.overflow ?? null,
  }];
}));

const checks = {};
checks.currentRuntimeArtifact = runtimeBinding.current;
for (const key of widths) {
  const item = samples[key];
  checks[`${key} fresh normal runtime is bound`] = Boolean(item.normalObjectFocusRect);
  checks[`${key} route and WAN evidence are fully visible in the first viewport`] =
    Boolean(item.routeDossierRect && item.signalRect) &&
    item.routeDossierRect.bottom <= item.viewportBottom + 1 &&
    item.signalRect.bottom <= item.viewportBottom + 1;
  checks[`${key} object comparison follows route and WAN evidence`] =
    Boolean(item.normalObjectFocusRect && item.routeDossierRect && item.signalRect) &&
    item.normalObjectFocusRect.top >= Math.max(item.routeDossierRect.bottom, item.signalRect.bottom) - 1;
  checks[`${key} normal workspace has no overflow`] = item.overflow === 0;
}

const failed = Object.entries(checks)
  .filter(([, pass]) => !pass)
  .map(([name]) => name);
const result = {
  pass: failed.length === 0,
  contract: "tablet-normal-primary-evidence-visibility-v2",
  implementationState: failed.length === 0 ? "focused-green" : "expected-red",
  source: path.relative(root, reportPath).replaceAll("\\", "/"),
  generatedAt: report?.generatedAt || null,
  runtimeIdentity: runtimeIdentityDetail(runtimeBinding),
  samples,
  checks,
  failed,
  releaseEvidenceEligible: false,
};

console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
