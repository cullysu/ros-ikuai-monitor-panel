#!/usr/bin/env node

/**
 * The current-state page is an authority surface, not a second historical
 * journal. Keep it short enough to scan and send chronology to the journal
 * and archive index.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const file = path.join(root, "docs", "decision-system", "current-state.md");
const source = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
const lines = source.split(/\r?\n/);
const currentStep = source.match(/^- currentConclusionForStep:\s*`(\d+)`/m)?.[1] || "";
const stepHeadings = lines.filter((line) => /^##\s+第\s*\d+\s*步/.test(line)
  && !new RegExp(`^##\\s+第\\s*${currentStep}\\s*步当前结论`).test(line));
const checks = [
  { name: "current-state exists", pass: Boolean(source) },
  { name: "current-state stays within scan budget", pass: lines.length <= 180, detail: { lines: lines.length, limit: 180 } },
  { name: "current-state does not contain historical step headings", pass: stepHeadings.length === 0, detail: { count: stepHeadings.length } },
  { name: "current-state declares role metadata", pass: /- status:\s*`current`/.test(source) && /validForCommit:/.test(source) && /supersededBy:\s*`null`/.test(source) },
  { name: "current-state declares sole authority", pass: /authority: This is the only human-readable current-state source\./.test(source) },
  { name: "current-state carries a current pointer", pass: /- currentConclusionForStep:\s*`\d+`/.test(source) && /- latestStepOutcome:\s*`\d+:/.test(source) },
  { name: "current-state keeps product fail closed", pass: /## Current conclusion/.test(source) && /\*\*FAIL(?: overall)?/.test(source) },
  { name: "current-state points to history", pass: /panel-redesign-decision-log\.md/.test(source) && /historical-index\.md/.test(source) },
  { name: "current-state exposes open review boundaries", pass: /R07/.test(source) && /R09/.test(source) && /R10/.test(source) && /R14/.test(source) },
];
const failures = checks.filter((check) => !check.pass).map((check) => check.name);
const report = { pass: failures.length === 0, contract: "current-state-compact-v1", file: path.relative(root, file), checks, failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
