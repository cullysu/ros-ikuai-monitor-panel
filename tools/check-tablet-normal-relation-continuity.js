#!/usr/bin/env node

/**
 * Write-ahead contract for the 620px normal-tablet relation evidence.
 *
 * The relation evidence already exists in the model. This contract only
 * checks whether the tablet layout keeps signal/decisions in the right rail
 * and moves relation evidence into the support flow after object comparison;
 * it does not approve Product, Design, Visual QA, or release readiness.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const css = read("src/panel-framework/mobile/mobile-tablet-layout.css");
const runtimePath = path.join(root, "_acceptance/panel-runtime-browser/report.json");
const runtime = fs.existsSync(runtimePath) ? JSON.parse(fs.readFileSync(runtimePath, "utf8")) : null;
const normalTabletRuntime = runtime?.checks?.find((check) => check.name === "normal tablet Focus-Signal workbench reflows at actual 619/620px content capacity without duplicate task DOM");
const normal620 = normalTabletRuntime?.detail?.normal620;
const relation = normal620?.tabletRelationRect;
const decision = normal620?.decisionRect;
const support = normal620?.steadySupportRect;
const evidenceBoundary = normal620?.evidenceBoundaryRect;
const objectWorkspace = normal620?.normalObjectFocusRect;

const checks = [
  [
    "620px relation evidence is not owned by the right rail",
    !/\.mp-tablet-right-column\s*>\s*\.mp-tablet-relation/.test(css),
  ],
  [
    "620px support ledger remains a full-width closing band",
    /\.mp-shell:not\(\.is-large-text\)\s+\.mp-tablet-steady-support\s*\{[\s\S]*?grid-column:\s*1\s*\/\s*-1;/.test(css),
  ],
  [
    "fresh 620px runtime exposes the relation rail geometry",
    Boolean(relation && decision && support),
  ],
  [
    "fresh 620px relation evidence follows the object workspace before the ledger",
    Boolean(
      relation && decision && support && evidenceBoundary && objectWorkspace &&
      relation.left >= support.left - 1 &&
      relation.right <= support.right + 1 &&
      relation.top >= objectWorkspace.bottom - 1 &&
      relation.bottom <= evidenceBoundary.top + 1,
    ),
  ],
];

const failures = checks.filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  pass: failures.length === 0,
  contract: "tablet-normal-relation-continuity-v1",
  implementationState: failures.length === 0 ? "focused-runtime-green" : "expected-red",
  runtimeReport: path.relative(root, runtimePath),
  failures,
  checks: Object.fromEntries(checks),
  geometry: { relation, decision, support, objectWorkspace, evidenceBoundary },
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
