#!/usr/bin/env node

/**
 * R20 archive discoverability contract.
 *
 * The long decision journal remains append-only evidence. This checker makes
 * the separate historical index useful without allowing it to become another
 * current-state authority.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const statePath = path.join(ROOT, ".product-loop", "state.json");
const historyPath = path.join(ROOT, "docs", "panel-redesign-decision-log.md");
const indexPath = path.join(ROOT, "docs", "decision-system", "historical-index.md");
const currentStatePath = path.join(ROOT, "docs", "decision-system", "current-state.md");

const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
const history = fs.existsSync(historyPath) ? fs.readFileSync(historyPath, "utf8") : "";
const index = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, "utf8") : "";
const currentState = fs.existsSync(currentStatePath) ? fs.readFileSync(currentStatePath, "utf8") : "";
const headingSteps = history
  .split(/\r?\n/)
  .filter((line) => line.startsWith("## "))
  .map((line) => line.match(/(\d+)/)?.[1])
  .filter(Boolean)
  .map(Number);
const minStep = headingSteps.length ? Math.min(...headingSteps) : null;
const maxStep = headingSteps.length ? Math.max(...headingSteps) : null;
const latestStep = Number(state.latest_decision_step);

const checks = [
  {
    name: "historical index exists",
    pass: Boolean(index),
    detail: "docs/decision-system/historical-index.md",
  },
  {
    name: "historical index declares historical identity",
    pass: /- status:\s*`historical-index`/.test(index)
      && /validForCommit:/.test(index)
      && /supersededBy:\s*`null`/.test(index),
    detail: "the archive map is reference evidence, not current implementation authority",
  },
  {
    name: "historical index names the sole current authority",
    pass: /Current truth lives only in `current-state\.md`/.test(index)
      && /authority:\s*`docs\/decision-system\/current-state\.md`/.test(index),
    detail: "current-state.md remains the only current conclusion source",
  },
  {
    name: "historical journal remains append-only historical evidence",
    pass: /status:\s*`historical-journal`/.test(history.slice(0, 1800))
      && /当前权威来源：`docs\/decision-system\/current-state\.md`/.test(history.slice(0, 1800)),
    detail: "the chronology must retain its historical boundary",
  },
  {
    name: "archive map covers the journal range",
    pass: index.includes(`- coveredStepMin: \`${minStep}\``)
      && index.includes(`- coveredStepMax: \`${maxStep}\``)
      && minStep !== null
      && maxStep === latestStep,
    detail: `expected coveredStepMin=${minStep}, coveredStepMax=${maxStep}, current=${latestStep}`,
  },
  {
    name: "archive map has multiple topic ranges",
    pass: (index.match(/^\|\s*\d+\s*-\s*\d+\s*\|/gm) || []).length >= 4,
    detail: "at least four topic/step ranges are required for a long journal",
  },
  {
    name: "every topic range names its role and successor",
    pass: (index.match(/^\|\s*\d+\s*-\s*\d+\s*\|[^\n]+\|[^\n]+\|[^\n]+\|/gm) || []).length >= 4
      && /successor/i.test(index)
      && /role|用途/.test(index),
    detail: "a range must explain why it exists and where current decisions live",
  },
  {
    name: "archive map has no second current conclusion",
    pass: !/##\s+Current conclusion|currentConclusionForStep|latestStepOutcome/.test(index),
    detail: "historical index may point to current-state but cannot own current truth",
  },
  {
    name: "current-state agrees with the archive boundary",
    pass: currentState.includes(`- currentConclusionForStep: \`${latestStep}\``)
      && currentState.includes("authority: This is the only human-readable current-state source."),
    detail: "the archive map cannot override the current-state authority",
  },
  {
    name: "archive map points readers to the full chronology",
    pass: index.includes("../panel-redesign-decision-log.md")
      && /chronology|complete|完整|历史/i.test(index),
    detail: "the map must remain a navigation layer over the complete journal",
  },
];

const failures = checks.filter((check) => !check.pass);
const report = {
  pass: failures.length === 0,
  contract: "decision-history-archive-map-v1",
  latestStep,
  journalRange: { minStep, maxStep, headingCount: headingSteps.length },
  checks,
  failures: failures.map((check) => check.name),
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
