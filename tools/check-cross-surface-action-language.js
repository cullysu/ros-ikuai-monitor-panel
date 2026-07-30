#!/usr/bin/env node
"use strict";

/**
 * Write-ahead contract for cross-surface object-task language.
 *
 * Mobile and desktop own different render trees, but an operator moving from
 * one to the other must not be handed a different first task for the same
 * object. This contract is intentionally narrower than Product/Design/Visual
 * sign-off: it proves the action language is model-bound, not that the two
 * surfaces are aesthetically identical.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const mobile = read("src/panel-framework/mobile/MobilePatrolActions.tsx");
const desktop = read("src/panel-framework/overview/desktop-overview/DesktopOverviewTask.tsx");
const model = read("src/panel-framework/overview/evidence-model/buildOverviewInvestigationActions.ts");

const checks = [
  ["shared investigation action model exists", model.includes("export function buildOverviewInvestigationActions")],
  ["mobile renders the shared action label", /displayLabel/.test(mobile) && /action\.label/.test(mobile)],
  ["mobile renders the shared action note", /displayNote/.test(mobile) && /action\.note/.test(mobile)],
  ["desktop resolves the selected route from the shared action model", /model\.investigationActions\.find\(\(action\) => action\.route === selected\.route\)/.test(desktop)],
  ["desktop renders the shared selected action label", /selectedAction\?\.label/.test(desktop)],
  ["desktop renders the shared selected action note", /selectedAction\?\.note/.test(desktop)],
  ["desktop marks the inspector action as shared or explicit fallback", /data-desktop-inspector-action-language/.test(desktop)],
  ["desktop has no generic workspace replacement label", !desktop.includes("进入${selected.category}工作区")],
  ["desktop maps primary action to the shared next visual level", /data-overview-visual-level=\{action\.priority\s*===\s*"primary"\s*\?\s*"next"\s*:\s*"context"\}/.test(desktop)],
  ["desktop maps secondary action to the shared context visual level", /action\.priority\s*===\s*"primary"\s*\?\s*"next"\s*:\s*"context"/.test(desktop)],
  ["desktop does not hardcode every action as context", !/<button\b[^>]*data-overview-visual-level="context"/.test(desktop)],
  ["mobile maps primary and secondary actions to next/context", /data-overview-visual-level=\{action\.priority\s*===\s*"primary"\s*\?\s*"next"\s*:\s*"context"\}/.test(mobile)],
];

const failures = checks.filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  pass: failures.length === 0,
  contract: "cross-surface-action-language-v1",
  implementationState: failures.length === 0 ? "focused-engineering-green" : "expected-red",
  scope: "same incident object must expose one model-bound first task on mobile and desktop",
  failures,
  checks: Object.fromEntries(checks),
  releaseEvidenceEligible: false,
};

console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
