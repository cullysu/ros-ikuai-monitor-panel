#!/usr/bin/env node

/**
 * Write-ahead contract for the mobile next-action rail.
 *
 * The visual review found that incident follow-up actions were still a stack
 * of similarly weighted buttons. The rail must expose explicit task order,
 * keep exactly one primary action, and use a rule/icon distinction rather
 * than a full-width filled card for that primary action.
 */

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const actions = read("src/panel-framework/mobile/MobilePatrolActions.tsx");
const css = read("src/panel-framework/mobile/mobile-patrol.css");
const runtime = JSON.parse(read("_acceptance/panel-runtime-browser/report.json"));

const incidentActionGeometry = runtime.checks
  .filter((check) => check.name === "mobile composite incident keeps proved interface dependency primary and resource pressure secondary")
  .map((check) => check.detail)
  .filter((detail) => detail?.viewport?.width === 390 && detail?.viewport?.height === 844)
  .at(-1);

const checks = [
  ["actions expose stable visual order", /data-mobile-action-order=\{index \+ 1\}/.test(actions)],
  ["order marker is rendered in the action rail", /className=\"mp-action-order\"/.test(actions)],
  ["primary action remains explicitly marked", /data-mobile-action-priority=\{action\.priority\}/.test(actions)],
  ["primary action keeps a compact target", /data-mobile-action-priority=\"primary\"\]\s*\{[\s\S]*?min-height:\s*56px;/.test(css)],
  ["primary action does not paint a full-width card", !/data-mobile-action-priority=\"primary\"\]\s*\{[\s\S]*?background:\s*var\(--mp-blue-soft\);/.test(css)],
  ["primary action uses a task-rail rule", /data-mobile-action-priority=\"primary\"\]\s*\{[\s\S]*?border-top:\s*2px\s+solid\s+var\(--mp-blue\);/.test(css)],
  ["fresh incident keeps the primary action in the first viewport", incidentActionGeometry?.actionInFirstViewport === true],
];

const failures = checks.filter(([, pass]) => !pass).map(([name]) => name);
const report = {
  pass: failures.length === 0,
  contract: "mobile-task-rail-v1",
  implementationState: failures.length === 0 ? "focused-green" : "expected-red",
  failures,
  checks: Object.fromEntries(checks),
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
