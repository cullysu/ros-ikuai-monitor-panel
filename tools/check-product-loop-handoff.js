#!/usr/bin/env node

/**
 * Keep the Product Loop file as a compact handoff, not a second chronology.
 * The detailed decision history remains in panel-redesign-decision-log.md.
 */

const fs = require("fs");
const path = require("path");
const { assertIndependentReviewRecords } = require("./check-independent-review-records");

const root = path.resolve(__dirname, "..");
const handoffPath = path.join(root, "docs", "product-loop-current.md");
const statePath = path.join(root, ".product-loop", "state.json");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function check(name, pass, detail) {
  return { name, pass: Boolean(pass), detail };
}

function main() {
  const source = read(handoffPath);
  const lines = source.split(/\r?\n/);
  const state = JSON.parse(read(statePath));
  const independentReview = assertIndependentReviewRecords({ root });
  const currentSections = lines.filter((line) => /^## (?:Current handoff:|第\d+步当前交接：)/.test(line));
  const historicalSections = lines.filter((line) => /^## .*历史交接/.test(line));
  const legacyStepSections = lines.filter((line) => /^## (?:第\d+步|上一步|上一轮)/.test(line));
  const gateBoundary = /## Gate boundary[\s\S]*?\| Current product release \| `fail` \|/.test(source);
  const currentStep = Number((source.match(/^- currentHandoffForStep: `?(\d+)/m) || [])[1] || 0);
  const latestStep = Number(state.latest_decision_step || 0);
  const outcome = String(state.latest_decision_outcome || "");
  const declaredOutcome = String((source.match(/^- latestStepOutcome: `([^`]+)`/m) || [])[1] || "");
  const gateStatuses = ["product", "design", "visual-qa"].map((key) => state.gates?.[key]?.status || "");
  const localReviewIsHistorical = independentReview.pass === true &&
    independentReview.releaseEligible === false &&
    independentReview.step < latestStep &&
    independentReview.runtimeReportMatchesReviewedArtifact === false;
  const checks = [
    check("current handoff stays within the compact scan budget", lines.length <= 180, { lines: lines.length, limit: 180 }),
    check("handoff declares current-handoff metadata", /^- status: `current-handoff`/m.test(source) && /validForCommit/.test(source) && /supersededBy/.test(source), null),
    check("handoff has exactly one current step section", currentSections.length === 1, { count: currentSections.length }),
    check("handoff does not absorb historical chronology", historicalSections.length === 0, { count: historicalSections.length }),
    check("handoff does not retain legacy step headings", legacyStepSections.length === 0, { count: legacyStepSections.length }),
    check("handoff declares a bounded release gate table", gateBoundary, null),
    check("handoff points to the sole authority and full history", source.includes("docs/decision-system/current-state.md") && source.includes("docs/panel-redesign-decision-log.md"), null),
    check("handoff carries a fail-closed release boundary", /FAIL overall/i.test(source) && /GitHub.*关闭|GitHub.*closed/i.test(source) && /Product\/Design\/Visual/.test(source), null),
    check("handoff pointer matches machine decision state", currentStep === latestStep && declaredOutcome === outcome, { currentStep, latestStep, declaredOutcome, outcome }),
    check(
      "Product/Design/Visual machine gates match structured independent review records",
      independentReview.pass && (localReviewIsHistorical
        ? gateStatuses.every((status) => status === "pending" || status === "failed")
        : gateStatuses.every((status) => status === "pass")),
      { gateStatuses, scope: independentReview.scope, localReviewIsHistorical }
    ),
    check("handoff does not claim product completion", !/全部完成|产品完成|public product complete/i.test(source), null),
  ];
  const failures = checks.filter((item) => !item.pass).map((item) => item.name);
  const result = {
    pass: failures.length === 0,
    contract: "product-loop-handoff-v1",
    handoffPath,
    checks,
    failures,
    releaseEligible: false,
  };
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.pass ? 0 : 1;
}

main();
