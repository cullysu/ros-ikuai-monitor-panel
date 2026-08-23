#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const reportPath = process.argv[2];
if (!reportPath) {
  process.stderr.write("usage: node tools/summarize-acceptance-report.js <report.json>\n");
  process.exit(2);
}

const report = JSON.parse(fs.readFileSync(path.resolve(reportPath), "utf8"));
const checks = Array.isArray(report.browserChecks) ? report.browserChecks : [];
const failedChecks = checks.filter((check) => check && check.pass === false);
const matrix = report.matrix || report.releaseMatrix || {};

process.stdout.write(`${JSON.stringify({
  pass: report.pass,
  complete: report.complete,
  browserChecks: checks.length,
  browserFailures: failedChecks.length,
  failedCells: failedChecks.map((check) => ({
    profile: check.profile,
    scenario: check.scaleScenario || check.scenario,
    viewport: check.viewport?.name || check.viewport,
    section: check.requestedSection || check.section,
    stage: check.stage,
    error: check.error,
  })),
  requestedScopeComplete: matrix.requestedScopeComplete,
  currentRequiredComplete: matrix.currentRequiredComplete,
  aggregateComplete: matrix.aggregateComplete,
  releaseMatrixComplete: matrix.releaseMatrixComplete,
}, null, 2)}\n`);
