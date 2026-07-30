#!/usr/bin/env node

/**
 * R20 governance contract: the compact discovery index must be derived from
 * the machine state and must never become a second current conclusion.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const indexPath = path.join(ROOT, "docs", "decision-system", "current-index.md");
const statePath = path.join(ROOT, ".product-loop", "state.json");
const currentStatePath = path.join(ROOT, "docs", "decision-system", "current-state.md");
const historyPath = path.join(ROOT, "docs", "panel-redesign-decision-log.md");

const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
const currentState = fs.readFileSync(currentStatePath, "utf8");
const index = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, "utf8") : "";
const latestStep = Number(state.latest_decision_step);
const latestOutcome = String(state.latest_decision_outcome);

const checks = [
  {
    name: "compact index exists",
    pass: Boolean(index),
    detail: index ? path.relative(ROOT, indexPath).replaceAll("\\", "/") : "missing docs/decision-system/current-index.md",
  },
  {
    name: "compact index declares reference status",
    pass: /- status:\s*`reference`/.test(index),
    detail: "the compact index must remain a discovery reference, not a current authority",
  },
  {
    name: "compact index names the sole current authority",
    pass: /authority:\s*`docs\/decision-system\/current-state\.md`/.test(index),
    detail: "current-state.md must remain the only current conclusion source",
  },
  {
    name: "compact index carries current step",
    pass: index.includes(`- currentStep: \`${latestStep}\``),
    detail: `expected currentStep=${latestStep}`,
  },
  {
    name: "compact index carries current outcome",
    pass: index.includes(`- currentOutcome: \`${latestOutcome}\``),
    detail: `expected currentOutcome=${latestOutcome}`,
  },
  {
    name: "compact index carries current boundary",
    pass: index.includes(`- currentBoundary: \`${latestStep}\``),
    detail: `expected currentBoundary=${latestStep}`,
  },
  {
    name: "compact index declares superseded metadata",
    pass: /- supersededBy:\s*`null`/.test(index) && /validForCommit:/.test(index),
    detail: "status/validForCommit/supersededBy are mandatory discovery metadata",
  },
  {
    name: "compact index does not create a second current conclusion",
    pass: !/sole current conclusion|current product conclusion|authorityStatus:\s*`current`/.test(index),
    detail: "reference index cannot claim to own product truth",
  },
  {
    name: "compact index does not absorb historical steps",
    pass: (index.match(/^##\s+第\d+步当前指针/gm) || []).length <= 2 && !/^##\s+第\d+步：/m.test(index),
    detail: "the compact index must not become a second historical journal",
  },
  {
    name: "compact index agrees with current-state authority",
    pass: currentState.includes(`- currentConclusionForStep: \`${latestStep}\``)
      && currentState.includes(`- latestStepOutcome: \`${latestOutcome}\``)
      && /authority: This is the only human-readable current-state source\./.test(currentState),
    detail: "machine state and current-state.md must agree",
  },
  {
    name: "historical journal remains historical",
    pass: /status:\s*`historical-journal`/.test(historyPathExists() ? fs.readFileSync(historyPath, "utf8").slice(0, 1800) : ""),
    detail: "the long chronology must remain explicitly historical",
  },
];

function historyPathExists() {
  return fs.existsSync(historyPath);
}

const failed = checks.filter((check) => !check.pass);
const report = {
  pass: failed.length === 0,
  contract: "decision-current-index-v1",
  latestStep,
  latestOutcome,
  checks,
  failures: failed.map((check) => check.name),
};
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exitCode = 1;
