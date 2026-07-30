#!/usr/bin/env node
"use strict";

/**
 * Write-ahead contract for the phone incident next-action surface.
 *
 * The fixed bottom navigation is part of the usable viewport.  A primary
 * investigation action that is merely inside `innerHeight` but underneath the
 * navigation is not available to the operator.  This contract is product
 * geometry, not a visual sign-off and cannot make release eligible.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const screenSource = read("src/panel-framework/mobile/MobilePatrolScreen.tsx");
const actionsSource = read("src/panel-framework/mobile/MobilePatrolActions.tsx");
const report = JSON.parse(read("_acceptance/panel-runtime-browser/report.json"));

const names = [
  "375px mobile incident primary action is fully above fixed navigation",
  "390px mobile incident primary action is fully above fixed navigation",
];
const runtimeChecks = names.map((name) => report.checks.find((check) => check.name === name));
const runtimeDetails = runtimeChecks.map((check) => check?.detail || null);
const runtimePass = runtimeDetails.every((detail) =>
  detail &&
  detail.actionAboveNavigation === true &&
  detail.actionVisibleRatio === 1 &&
  detail.actionRect?.bottom <= detail.navigationRect?.top
);

const checks = {
  "primary action has an explicit visibility landmark":
    actionsSource.includes("data-mobile-incident-primary-action=") &&
    actionsSource.includes('action.priority === "primary"'),
  "screen owns the phone incident visibility contract":
    screenSource.includes("data-mobile-incident-primary-action-visibility"),
  "fresh 375 and 390 geometry records exist": runtimeDetails.every(Boolean),
  "primary action is fully usable above fixed navigation": runtimePass,
};

const failures = Object.entries(checks)
  .filter(([, pass]) => !pass)
  .map(([name]) => name);
const result = {
  pass: failures.length === 0,
  contract: "mobile-incident-action-visibility-v1",
  implementationState: failures.length === 0 ? "focused-green" : "expected-red",
  scope: "phone incident primary investigation action and fixed navigation occlusion",
  runtime: runtimeDetails,
  checks,
  failures,
  releaseEvidenceEligible: false,
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
