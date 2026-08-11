#!/usr/bin/env node
"use strict";

/**
 * Write-ahead contract for the desktop shell-to-overview vertical boundary.
 *
 * The runtime toolbar and the Overview state bus are separate owners, but the
 * first viewport must not contain an unexplained empty band between them.
 * This is a geometry guard, not a visual sign-off.
 */
const fs = require("node:fs");
const path = require("node:path");
const { readRuntimeReport, runtimeIdentityDetail } = require("./runtime-report-identity");

const root = path.resolve(__dirname, "..");
const runtimeBinding = readRuntimeReport(root);
const report = runtimeBinding.current ? runtimeBinding.report : null;
const runtimeCheck = (report?.checks || []).find(
  (check) => check.name === "1200/1366/1440 normal desktop follows Focus-left Signal-right then full-width current decisions",
);
const normal1366 = runtimeCheck?.detail?.normal1366 || null;
const normal1440 = runtimeCheck?.detail?.normal1440 || null;
const firstViewportTopLimit = 90;
const topOf = (item) => item?.verdictRect?.top ?? null;
const checks = {
  currentRuntimeArtifact: runtimeBinding.current,
  freshRuntimeIsBound: Boolean(normal1366 && normal1440 && report?.generatedAt),
  desktopRuntimeToolbarIsPresent: [normal1366, normal1440].every((item) => item?.runtimeToolbar === "desktop"),
  overviewStatusStartsNearShell: [normal1366, normal1440].every((item) => {
    const top = topOf(item);
    return typeof top === "number" && top <= firstViewportTopLimit;
  }),
  overviewHasNoViewportOverflow: [normal1366, normal1440].every((item) => item?.overflow <= 1),
  overviewRootIsUnique: [normal1366, normal1440].every((item) => item?.overviewRootCount === 1),
};
const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  pass: failed.length === 0,
  contract: "desktop-top-shell-continuity-v1",
  implementationState: failed.length === 0 ? "focused-runtime-green" : "expected-red",
  scope: "desktop normal overview shell-to-status boundary at 1366x768 and 1440x900",
  geometry: {
    firstViewportTopLimit,
    verdictTop1366: topOf(normal1366),
    verdictTop1440: topOf(normal1440),
  },
  checks,
  runtimeIdentity: runtimeIdentityDetail(runtimeBinding),
  failed,
  releaseEvidenceEligible: false,
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
