#!/usr/bin/env node
"use strict";

/**
 * Write-ahead contract for the next cross-surface visual grammar slice.
 *
 * Mobile and desktop keep separate render trees, but their semantic roles must
 * resolve through one token vocabulary. This is an implementation contract,
 * not Product/Design/Visual sign-off and cannot turn those gates green.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const tokenPath = "src/panel-framework/network-console-visual-tokens.css";
const tokenExists = fs.existsSync(path.join(root, tokenPath));
const tokens = tokenExists ? read(tokenPath) : "";
const mobile = read("src/panel-framework/mobile/mobile-patrol.css");
const desktop = read("src/panel-framework/overview/desktop-overview/styles/desktop-overview-tokens.css");
const mobileScreen = read("src/panel-framework/mobile/MobilePatrolScreen.tsx");
const desktopScreen = read("src/panel-framework/overview/desktop-overview/DesktopOverviewScreen.tsx");
const mobileActions = read("src/panel-framework/mobile/MobilePatrolActions.tsx");
const mobileEvidence = read("src/panel-framework/mobile/MobileEvidenceLedger.tsx");
const desktopTask = read("src/panel-framework/overview/desktop-overview/DesktopOverviewTask.tsx");

const requiredTokens = [
  "--mp-blue",
  "--do-blue",
  "--mp-danger",
  "--do-danger",
];

const checks = [
  ["shared token owner exists", tokenExists],
  ["shared token vocabulary is complete", requiredTokens.every((token) => new RegExp(`${token}\\s*:`).test(tokens))],
  ["mobile state roles resolve through the shared owner", tokens.includes("--mp-blue:") && tokens.includes("--mp-danger:")],
  ["desktop state roles resolve through the shared owner", tokens.includes("--do-blue:") && tokens.includes("--do-danger:")],
  ["both surfaces retain the same decision landmarks", [mobileScreen, desktopScreen].every((source) =>
    source.includes('data-overview-task-landmark="verdict"') &&
    source.includes('data-overview-task-landmark="freshness"'))],
  ["both surfaces retain the same next-action and evidence roles",
    mobileActions.includes("investigation-primary") &&
    desktopTask.includes("investigation-primary") &&
    mobileEvidence.includes('data-overview-task-landmark="evidence-boundary"') &&
    desktopScreen.includes('taskLandmark="evidence-boundary"')],
  ["mobile and desktop remain separate render owners", mobileScreen.includes("data-visual-grammar=\"network-console-v1\"") && desktopScreen.includes("data-visual-grammar=\"network-console-v1\"")],
];

const failures = checks.filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  pass: failures.length === 0,
  contract: "cross-surface-visual-grammar-v3",
  implementationState: failures.length === 0 ? "focused-engineering-green" : "expected-red",
  scope: "shared semantic visual tokens with separate mobile and desktop render trees",
  failures,
  checks: Object.fromEntries(checks),
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
