#!/usr/bin/env node

/**
 * Product/Design write-ahead contract for the mobile overview surface.
 *
 * This is deliberately narrower than visual sign-off: it prevents a CSS
 * implementation from collapsing every state into the same blue wash and
 * prevents the navigation from advertising a decorative selection line.
 * Human Product/Design/Visual review remains a separate gate.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const patrolCss = fs.readFileSync(path.join(ROOT, "src/panel-framework/mobile/mobile-patrol-foundation.css"), "utf8")
  + "\n"
  + fs.readFileSync(path.join(ROOT, "src/panel-framework/mobile/mobile-patrol.css"), "utf8");
const navigationCss = fs.readFileSync(path.join(ROOT, "src/panel-framework/sections/section-console.css"), "utf8");

function block(source, selector) {
  const start = source.indexOf(selector);
  if (start < 0) return "";
  const end = source.indexOf("}", start);
  return end < 0 ? source.slice(start) : source.slice(start, end + 1);
}

const normalRow = block(patrolCss, ".mp-decision-ledger-row.is-ok");
const neutralRow = /\.mp-decision-ledger-row\s*\{[\s\S]*?background\s*:\s*(?:none|transparent|var\(--mp-surface-(?:base|raised|quiet)\))/.test(patrolCss);
const activeNavigation = block(navigationCss, ".panel-task-navigation button.is-active {");
const checks = [
  {
    name: "mobile surface tiers are explicit",
    pass: ["--mp-surface-base:", "--mp-surface-raised:", "--mp-surface-quiet:", "--mp-accent-wash:"].every((token) => patrolCss.includes(token)),
    detail: "base/raised/quiet/accent-wash tokens must be declared by the mobile surface owner",
  },
  {
    name: "normal decision rows do not use accent wash",
    pass: Boolean(normalRow) && !/background\s*:\s*rgba\(47\s*,\s*113\s*,\s*143\s*,\s*0\.045\s*\)/.test(normalRow),
    detail: normalRow || "normal decision-row rule is missing",
  },
  {
    name: "normal decision rows resolve to a neutral surface",
    pass: neutralRow,
    detail: normalRow || "normal decision-row rule is missing",
  },
  {
    name: "active navigation owns a selected surface",
    pass: Boolean(activeNavigation) && /background\s*:\s*(var\(--mobile-nav-active-surface\)|#[0-9a-fA-F]{6})/.test(activeNavigation) && /border-radius\s*:\s*(10|11|12|13|14|15|16)px/.test(activeNavigation),
    detail: activeNavigation || "active navigation rule is missing",
  },
  {
    name: "active navigation has no decorative underline pseudo-element",
    pass: !/\.panel-task-navigation button\.is-active::before\s*\{[\s\S]*?background\s*:\s*#2f718f/.test(navigationCss),
    detail: "active state must be a usable selected surface, not a top/side decoration line",
  },
];

const failed = checks.filter((check) => !check.pass);
const report = {
  pass: failed.length === 0,
  contract: "mobile-visual-surface-v1",
  checks,
  failures: failed.map((check) => check.name),
};
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exitCode = 1;
