#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const cssPath = path.join(root, "src", "panel-framework", "mobile", "mobile-tablet-next-evidence.css");
const css = fs.readFileSync(cssPath, "utf8");
const failures = [];

function check(name, pass, detail) {
  if (!pass) failures.push({ name, detail });
}

const narrowOwner = css.match(/@container\s*\(max-width:\s*699px\)[\s\S]{0,2200}/)?.[0] || "";
check(
  "low-capacity tablet has a scoped comparison action owner",
  narrowOwner.includes("mp-tablet-normal-comparison-inspector"),
  "the 768px comparison inspector needs a low-capacity layout owner"
);
check(
  "comparison action moves to a full-width second task row",
  /mp-tablet-normal-comparison-inspector[^{}]*\{[\s\S]*?grid-template-columns[\s\S]*?\}[\s\S]*?mp-tablet-normal-comparison-inspector\s*>\s*button[^{}]*\{[\s\S]*?grid-column:\s*1\s*\/\s*-1/.test(narrowOwner),
  "the object-workspace action must not remain in a shrinking auto column"
);
check(
  "comparison action keeps a readable single-line label",
  /mp-tablet-normal-comparison-inspector\s*>\s*button[^{}]*\{[\s\S]*?white-space:\s*nowrap/.test(narrowOwner),
  "the action label must not degrade into vertical word wrapping"
);
check(
  "comparison action retains the touch contract",
  /mp-tablet-normal-comparison-inspector\s*>\s*button[^{}]*\{[\s\S]*?min-height:\s*44px/.test(narrowOwner),
  "the narrow owner must retain a 44px minimum target"
);

const report = {
  pass: failures.length === 0,
  contract: "tablet-comparison-action-fit-v1",
  file: path.relative(root, cssPath),
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
