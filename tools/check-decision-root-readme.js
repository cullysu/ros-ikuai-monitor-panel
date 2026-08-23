#!/usr/bin/env node

/**
 * Decision-repository discoverability contract.
 *
 * The D-drive root README is a human entry point, not a second authority.
 * It must remain current enough to lead a reader to the real state, history,
 * handoff, release boundary, and mirror proof.
 */

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = path.resolve(__dirname, "..");
const statePath = path.join(ROOT, ".product-loop", "state.json");
const currentStatePath = path.join(ROOT, "docs", "decision-system", "current-state.md");
const templatePath = path.join(ROOT, "docs", "decision-system", "mirror-root-readme.md");
const mirrorPath = path.join("D:\\想法\\面板", "README.md");

const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
const currentState = fs.readFileSync(currentStatePath, "utf8");
const template = fs.existsSync(templatePath) ? fs.readFileSync(templatePath, "utf8") : "";
const mirror = fs.existsSync(mirrorPath) ? fs.readFileSync(mirrorPath, "utf8") : "";
const latestStep = Number(state.latest_decision_step);
const latestOutcome = String(state.latest_decision_outcome);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

const checks = [
  {
    name: "source root README exists",
    pass: Boolean(template),
    detail: path.relative(ROOT, templatePath).replaceAll("\\", "/"),
  },
  {
    name: "root README is mirrored byte-for-byte",
    pass: Boolean(mirror) && sha256(template) === sha256(mirror),
    detail: "D:\\想法\\面板\\README.md must be generated from mirror-root-readme.md",
  },
  {
    name: "root README carries current step",
    pass: template.includes(`- currentStep: \`${latestStep}\``),
    detail: `expected currentStep=${latestStep}`,
  },
  {
    name: "root README carries current outcome",
    pass: template.includes(`- currentOutcome: \`${latestOutcome}\``),
    detail: `expected currentOutcome=${latestOutcome}`,
  },
  {
    name: "root README carries current fail boundary",
    pass: template.includes(`- currentBoundary: \`${latestStep}\``)
      && /当前(?:产品)?结论[^\n]*FAIL/.test(template),
    detail: "current boundary must be explicit and remain FAIL while release is closed",
  },
  {
    name: "root README names the sole current authority",
    pass: template.includes("decision-system\\current-state.md")
      && template.includes("唯一当前结论"),
    detail: "the root entry must lead to current-state.md without becoming an authority",
  },
  {
    name: "root README exposes the detailed process",
    pass: template.includes("面板重做决策日志.md")
      && template.includes("D:\\想法\\面板\\面板重做决策日志.md"),
    detail: "the complete auditable history must be directly discoverable",
  },
  {
    name: "root README exposes the process contract",
    pass: ["触发/问题", "观察事实", "决策", "理由与拒绝项", "验证", "边界/心得"].every((term) => template.includes(term)),
    detail: "entry must explain what every decision record contains",
  },
  {
    name: "root README does not advertise stale pointers",
    pass: !/截至\s*Step\d+|13\s*份|Step383/.test(template),
    detail: "old step/file-count claims make the repository appear unwritten",
  },
  {
    name: "root README agrees with current-state authority",
    pass: currentState.includes(`- currentConclusionForStep: \`${latestStep}\``)
      && currentState.includes(`- latestStepOutcome: \`${latestOutcome}\``)
      && currentState.includes("authority: This is the only human-readable current-state source."),
    detail: "machine pointer and current-state.md must agree",
  },
];

const failures = checks.filter((check) => !check.pass);
const report = {
  pass: failures.length === 0,
  contract: "decision-root-readme-freshness-v1",
  latestStep,
  latestOutcome,
  checks,
  failures: failures.map((check) => check.name),
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
