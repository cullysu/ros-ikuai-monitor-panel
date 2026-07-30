#!/usr/bin/env node

/**
 * R07 write-ahead contract for the phone incident task rhythm.
 *
 * This is deliberately not visual sign-off. It only prevents the primary
 * investigation path from looking identical to secondary context while
 * preserving the existing evidence/order contract.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");
const screen = read("src/panel-framework/mobile/MobilePatrolScreen.tsx");
const actions = read("src/panel-framework/mobile/MobilePatrolActions.tsx");
const priorityCss = read("src/panel-framework/mobile/mobile-patrol.css");
const patrolCss = read("src/panel-framework/mobile/mobile-patrol.css");
const runtime = read("tools/check-panel-runtime-browser.js");

const failures = [];
const expect = (pass, message) => {
  if (!pass) failures.push(message);
};

expect(screen.includes('data-mobile-visual-rhythm={incident ? "incident-ledger-v1" : "steady-ledger-v1"}'),
  "mobile patrol root does not expose the incident-ledger-v1 rhythm contract");
expect(actions.includes('data-mobile-action-rhythm="primary-plus-context"'),
  "investigation actions do not declare the primary-plus-context rhythm");
expect(actions.includes('data-mobile-primary-action-visual={action.priority === "primary" ? "accent" : undefined}'),
  "primary investigation action has no explicit accent visual owner");
expect(/\.mp-action-list\s*>\s*button\[data-mobile-action-priority=["']primary["']\][\s\S]*?\.mp-action-icon\s*\{[\s\S]*?color:\s*var\(--mp-blue-dark\)/.test(priorityCss),
  "primary investigation action has no restrained accent treatment");
expect(/\.mp-action-list\s*>\s*button\[data-mobile-action-priority=["']secondary["']\][\s\S]*?min-height:\s*(?:4[4-8]|[1-3]\d)px/.test(patrolCss),
  "secondary investigation actions are not compactly bounded");
expect(runtime.includes("mobile-incident-rhythm-v1"),
  "runtime browser contract is not bound to mobile-incident-rhythm-v1");

const report = {
  pass: failures.length === 0,
  contract: "mobile-incident-rhythm-v1",
  implementationState: failures.length ? "expected-red" : "focused-green",
  releaseEvidenceEligible: false,
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
