#!/usr/bin/env node
/**
 * Write-ahead contract for the next cross-surface visual rhythm slice.
 * This is deliberately narrower than the shared grammar contract: it checks
 * hierarchy ownership, not whether the surfaces merely use the same marker.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const mobileRisk = read("src/panel-framework/mobile/MobileConcurrentRiskQueue.tsx");
const mobileEvidence = read("src/panel-framework/mobile/MobileEvidenceLedger.tsx");
const mobileCss = read("src/panel-framework/mobile/mobile-patrol-foundation.css") + "\n" + read("src/panel-framework/mobile/mobile-patrol.css");
const desktopOverview = read("src/panel-framework/overview/desktop-overview/DesktopOverviewScreen.tsx");
const runtimePath = path.join(root, "_acceptance/panel-runtime-browser/report.json");
const runtimeReport = JSON.parse(read("_acceptance/panel-runtime-browser/report.json"));
const runtime = runtimeReport.checks.find((check) => check.name === "1200/1366/1440 normal desktop follows Focus-left Signal-right then full-width current decisions");

const checks = [
  ["secondary risk declares its task role", /data-mobile-incident-task-role="secondary-risk"/.test(mobileRisk)],
  ["secondary risk is context visual level", /data-overview-visual-level="context"/.test(mobileRisk)],
  ["evidence boundary declares support visual level", /data-overview-visual-level="support"/.test(mobileEvidence)],
  ["secondary risk header has support rhythm", /\.mp-risk-queue\s*>\s*header\s*\{[\s\S]*?min-height:\s*48px;/.test(mobileCss)],
  ["secondary risk rows have support rhythm", /\.mp-risk-queue\s+\.mp-incident-row\s*\{[\s\S]*?min-height:\s*54px;/.test(mobileCss)],
  ["desktop normal decision band declares support level", /data-desktop-normal-decision-band[^>]*data-overview-visual-level="support"/.test(desktopOverview)],
  ["fresh desktop runtime is bound", Boolean(runtime && runtime.detail?.normal1366 && runtime.detail?.normal1440)],
  ["fresh desktop verdict remains bounded", Boolean(runtime && runtime.detail.normal1366.verdictRect?.height <= 76 && runtime.detail.normal1440.verdictRect?.height <= 76)],
];

const failures = checks.filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  pass: failures.length === 0,
  contract: "cross-surface-visual-rhythm-v2",
  implementationState: failures.length === 0 ? "focused-green" : "expected-red",
  runtimeReport: path.relative(root, runtimePath),
  failures,
  checks: Object.fromEntries(checks.map(([name, pass]) => [name, pass])),
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
