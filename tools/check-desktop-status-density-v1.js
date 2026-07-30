#!/usr/bin/env node
"use strict";

/**
 * Write-ahead Product/Design contract for the desktop primary status bus.
 *
 * The desktop console should spend its first-screen height on comparison and
 * next actions, not on a broad verdict/KPI band. This check keeps the type
 * size readable while requiring a tighter vertical rhythm. It is not a
 * Product/Design/Visual sign-off by itself.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(root, "src/panel-framework/overview/desktop-overview/styles/desktop-overview.css"), "utf8");
const screen = fs.readFileSync(path.join(root, "src/panel-framework/overview/desktop-overview/DesktopOverviewScreen.tsx"), "utf8");

const block = (selector) => {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return "";
  const end = css.indexOf("}", start);
  return end < 0 ? css.slice(start) : css.slice(start, end + 1);
};

const verdict = block(".do-verdict");
const cells = block(".do-status-items > div");
const checks = [
  ["desktop status bus keeps a primary task landmark", screen.includes('data-overview-task-landmark="verdict"')],
  ["verdict vertical rhythm is compact without shrinking type", /padding:\s*5px\s+12px\s+4px\s+14px;/.test(verdict)],
  ["status facts use a compact comparison rhythm", /padding:\s*6px\s+10px;/.test(cells)],
  ["desktop operational text remains readable", !/font-size:\s*(?:7|8|9|10|11)px/.test(`${verdict}${cells}`)],
  ["desktop status surface remains a bounded non-card band", !/border-radius:\s*(?:8|9|[1-9][0-9])px/.test(verdict)],
];

const failures = checks.filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  pass: failures.length === 0,
  contract: "desktop-status-density-v1",
  implementationState: failures.length === 0 ? "focused-engineering-green" : "expected-red",
  scope: "desktop primary status bus vertical rhythm and readable first-screen density",
  failures,
  checks: Object.fromEntries(checks),
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
