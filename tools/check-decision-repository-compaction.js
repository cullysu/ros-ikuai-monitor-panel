#!/usr/bin/env node

/**
 * R20 governance contract: current discovery surfaces stay small and point
 * to the complete history instead of becoming a second decision journal.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const files = {
  index: ["docs", "decision-system", "current-index.md"],
  readme: ["docs", "decision-system", "README.md"],
  release: ["docs", "decision-system", "release-journal.md"],
};
const budgets = { index: 80, readme: 120, release: 140 };
const sources = Object.fromEntries(Object.entries(files).map(([key, parts]) => [
  key,
  fs.readFileSync(path.join(ROOT, ...parts), "utf8"),
]));

const lineCount = (source) => source.split(/\r?\n/).length;
const historicalHeading = /^##\s+(?:第\d+步|Step\d+|Historical|历史)/im;
const failures = [];
const checks = [];

for (const [key, source] of Object.entries(sources)) {
  const count = lineCount(source);
  const budget = budgets[key];
  const withinBudget = count <= budget;
  checks.push({
    name: `${key} stays within current-surface budget`,
    pass: withinBudget,
    detail: { lines: count, budget },
  });
  if (!withinBudget) failures.push(`${key} exceeds ${budget} lines`);

  const hasHistory = historicalHeading.test(source);
  checks.push({
    name: `${key} does not absorb historical step sections`,
    pass: !hasHistory,
    detail: hasHistory ? "historical heading detected" : "none",
  });
  if (hasHistory) failures.push(`${key} contains a historical step heading`);
}

const requiredLinks = [
  ["index", "docs/decision-system/current-state.md"],
  ["readme", "docs/decision-system/current-state.md"],
  ["release", "docs/decision-system/current-state.md"],
  ["index", "panel-redesign-decision-log.md"],
  ["readme", "panel-redesign-decision-log.md"],
  ["release", "panel-redesign-decision-log.md"],
];
for (const [key, link] of requiredLinks) {
  const pass = sources[key].includes(link);
  checks.push({ name: `${key} links ${link}`, pass, detail: link });
  if (!pass) failures.push(`${key} missing ${link}`);
}

const roleChecks = [
  ["index", /status:\s*`reference`/, "reference status"],
  ["readme", /status:\s*`current-index`/, "current-index status"],
  ["release", /status:\s*`current-journal`/, "current-journal status"],
];
for (const [key, pattern, label] of roleChecks) {
  const pass = pattern.test(sources[key]);
  checks.push({ name: `${key} declares ${label}`, pass });
  if (!pass) failures.push(`${key} missing ${label}`);
}

const result = {
  pass: failures.length === 0,
  contract: "decision-repository-compaction-v1",
  budgets,
  lineCounts: Object.fromEntries(Object.entries(sources).map(([key, source]) => [key, lineCount(source)])),
  checks,
  failures,
};
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
