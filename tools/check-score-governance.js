#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { assertIndependentReviewRecords } = require("./check-independent-review-records");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const failures = [];
const checks = [];

function check(name, pass, detail) {
  const result = { name, pass: Boolean(pass), detail };
  checks.push(result);
  if (!result.pass) failures.push(name);
}

const ledger = read("docs/decision-system/review-adjudication-2026-07-23.md");
const r23Start = ledger.indexOf("### R23");
const r23End = ledger.indexOf("## 本轮结论", r23Start);
const r23 = r23Start >= 0 ? ledger.slice(r23Start, r23End > r23Start ? r23End : undefined) : "";
check("R23 finding is present and fixed", /- status: `fixed`/.test(r23), r23.slice(0, 160));
check("R23 declares scores opinion-only", /opinion only|意见摘要/.test(r23), r23.match(/- decision:.*$/m)?.[0] || "missing decision");
check("R23 keeps governance as a next action", /numeric-score governance contract/.test(r23), r23.match(/- nextAction:.*$/m)?.[0] || "missing nextAction");

const state = JSON.parse(read(".product-loop/state.json"));
const independentReview = assertIndependentReviewRecords({ root });
const currentState = read("docs/decision-system/current-state.md");
const scorePattern = /(?:total_score|综合评分|设计评分|产品分|\b\d{1,3}\/100\b)/i;
for (const gate of ["product", "design", "visual-qa"]) {
  const status = state.gates?.[gate]?.status;
  const note = String(state.gates?.[gate]?.note || "");
  const acceptedWithoutScore = independentReview.pass && !scorePattern.test(note);
  check(`${gate} is not signed by a score`, !["pass", "passed", "complete"].includes(status) || acceptedWithoutScore, { status, acceptedWithoutScore });
}

const currentConclusionStart = currentState.indexOf("## Current conclusion");
const currentConclusionEnd = currentState.indexOf("\n## ", currentConclusionStart + 1);
const currentConclusion = currentConclusionStart >= 0
  ? currentState.slice(currentConclusionStart, currentConclusionEnd > currentConclusionStart ? currentConclusionEnd : undefined)
  : "";
check("current conclusion is explicitly FAIL", /\*\*FAIL(?: overall)?/.test(currentConclusion));
check("current conclusion has no raw numeric score", !/(?:total_score|综合评分|设计评分|产品分|\b\d{1,3}\/100\b)/i.test(currentConclusion), currentConclusion.slice(0, 240));

const currentSurfaces = [
  ["decision README", read("docs/decision-system/README.md")],
  ["product loop handoff", read("docs/product-loop-current.md")],
  ["release journal current header", read("docs/decision-system/release-journal.md")],
].map(([name, text]) => [name, text.slice(0, 2200)]);
for (const [name, text] of currentSurfaces) {
  check(`${name} does not use a raw score as current evidence`, !/(?:total_score|综合评分|设计评分|产品分|\b\d{1,3}\/100\b)/i.test(text), text.slice(0, 180));
}

const readiness = read("tools/check-public-release-readiness.js");
check("release readiness source does not read numeric scores", !/(?:total_score|综合评分|设计评分|产品分|\b\d{1,3}\/100\b)/i.test(readiness), "readiness source score references");
check("critique score sources remain outside release truth", /.impeccable[\\/]critique/.test(ledger) && /opinion only|意见摘要/.test(r23), "critique scores are review material only");

const result = {
  pass: failures.length === 0,
  contract: "numeric-score-governance-v1",
  checks,
  failures,
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
