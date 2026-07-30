#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const ledgerPath = path.join(root, "docs", "decision-system", "review-adjudication-2026-07-23.md");
const statePath = path.join(root, ".product-loop", "state.json");
const currentStatePath = path.join(root, "docs", "decision-system", "current-state.md");
const allowedStatuses = new Set(["fixed", "stale", "open", "unproven"]);
const allowedSeverities = new Set(["P0", "P1", "P2"]);

function fail(message) {
  console.error(`review-adjudication: FAIL — ${message}`);
  process.exit(1);
}

if (!fs.existsSync(ledgerPath)) fail(`missing ${path.relative(root, ledgerPath)}`);
const text = fs.readFileSync(ledgerPath, "utf8");
const headings = [...text.matchAll(/^### (R\d{2}) — .+$/gm)];
if (headings.length !== 23) fail(`expected 23 finding headings, got ${headings.length}`);

const ids = headings.map((match) => match[1]);
if (new Set(ids).size !== 23) fail("finding IDs must be unique");
const findingStatuses = [];
for (let index = 0; index < 23; index += 1) {
  const expected = `R${String(index + 1).padStart(2, "0")}`;
  if (ids[index] !== expected) fail(`finding order must be ${expected} at index ${index + 1}, got ${ids[index]}`);
  const start = headings[index].index + headings[index][0].length;
  const end = index + 1 < headings.length ? headings[index + 1].index : text.length;
  const body = text.slice(start, end);
  const severity = body.match(/^- severity: `([^`]+)`$/m)?.[1];
  const status = body.match(/^- status: `([^`]+)`$/m)?.[1];
  const evidence = body.match(/^- evidence: (.+)$/m)?.[1]?.trim();
  const decision = body.match(/^- decision: (.+)$/m)?.[1]?.trim();
  const nextAction = body.match(/^- nextAction: (.+)$/m)?.[1]?.trim();
  if (!allowedSeverities.has(severity)) fail(`${ids[index]} has invalid severity ${severity}`);
  if (!allowedStatuses.has(status)) fail(`${ids[index]} has invalid status ${status}`);
  findingStatuses.push(status);
  if (!evidence || evidence.length < 20) fail(`${ids[index]} has no auditable evidence binding`);
  if (!decision || decision.length < 20) fail(`${ids[index]} has no decision rationale`);
  if (!nextAction || nextAction.length < 15) fail(`${ids[index]} has no next action`);
}

const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
const gates = state.gates || {};
for (const name of ["product", "design", "visual-qa"]) {
  const status = gates[name]?.status;
  if (["pass", "passed", "complete"].includes(status)) fail(`${name} cannot be marked pass by this ledger`);
}
if (!/\*\*FAIL(?: overall)?/.test(fs.readFileSync(currentStatePath, "utf8"))) {
  fail("current-state must retain an overall FAIL boundary");
}
if (!/productGate: `failed`/.test(text) || !/designGate: `failed`/.test(text) || !/visualGate: `failed`/.test(text)) {
  fail("ledger must explicitly retain Product/Design/Visual failed gates");
}
if (!/numeric-score governance contract/.test(text)) fail("numeric-score governance must remain explicit");

const summary = Object.fromEntries([...allowedStatuses].map((status) => [status, findingStatuses.filter((value) => value === status).length]));
console.log(JSON.stringify({ pass: true, findingCount: headings.length, statusCounts: summary, productDesignVisualPass: false }, null, 2));
