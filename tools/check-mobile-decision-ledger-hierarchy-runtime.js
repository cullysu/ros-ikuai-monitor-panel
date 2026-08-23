#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const reportPath = path.join(root, "_acceptance", "panel-runtime-browser", "report.json");
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const checks = [];
const check = (name, pass, detail) => checks.push({ name, pass: Boolean(pass), detail });
const runtimeCheck = report.checks?.find((entry) => entry.name === "390/375 normal phone keeps WAN signal before one readable decision ledger with three touch rows and no horizontal overflow");
const screenshotNames = new Set((report.screenshots || []).map((entry) => (
  typeof entry === "string" ? entry : entry.file || entry.name
)));

check("fresh browser report is green", report.pass === true, "the geometry result must come from a green fresh runtime report");
check("390/375 ledger geometry check is present", Boolean(runtimeCheck), "the browser runner must publish the focused geometry result");
check("390/375 ledger geometry check passes", runtimeCheck?.pass === true, runtimeCheck?.detail || "focused geometry check is missing");
check("390 screenshot is registered", screenshotNames.has("overview-normal-task-390.png"), "390px normal phone original must be retained");
check("375 screenshot is registered", screenshotNames.has("overview-normal-task-375.png"), "375px normal phone original must be retained");

const result = {
  pass: checks.every((entry) => entry.pass),
  contract: "mobile-decision-ledger-hierarchy-runtime-v1",
  reportPath: path.relative(root, reportPath),
  checks,
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
