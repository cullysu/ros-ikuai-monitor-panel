#!/usr/bin/env node

/**
 * Write-ahead contract for the mobile ledger visual grammar.
 *
 * This is intentionally not a Product/Design/Visual sign-off. It only keeps
 * the implementation honest about which surfaces may carry visual weight:
 * proof and real risk may be washed; ordinary rows should remain one
 * continuous operational plane and use typography/spacing/separators.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const screen = fs.readFileSync(path.join(ROOT, "src/panel-framework/mobile/MobilePatrolScreen.tsx"), "utf8");
const css = fs.readFileSync(path.join(ROOT, "src/panel-framework/mobile/mobile-patrol.css"), "utf8")
  + "\n"
  + fs.readFileSync(path.join(ROOT, "src/panel-framework/mobile/mobile-patrol-foundation.css"), "utf8");

function block(source, selector) {
  const start = source.indexOf(`${selector} {`);
  if (start < 0) return "";
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return "";
}

const commandIcon = block(css, ".mp-command-icon");
const incidentMark = block(css, ".mp-incident-mark");
const normalRows = css.match(/\.mp-decision-ledger-row\.is-trust,\s*\.mp-decision-ledger-row\.is-ok\s*\{[\s\S]*?\}/)?.[0] || "";
const commandTitleFocus = block(css, ".mp-command h1:focus");
const checks = [
  {
    name: "mobile patrol declares ledger-v2 visual grammar",
    pass: /data-mobile-visual-grammar="ledger-v2"/.test(screen),
    detail: "the mobile tree must name the visual contract without coupling the desktop tree",
  },
  {
    name: "ordinary command icon is not a card",
    pass: Boolean(commandIcon) && /border-radius\s*:\s*0\s*;/.test(commandIcon) && /background\s*:\s*(?:none|transparent)\s*;/.test(commandIcon) && /box-shadow\s*:\s*none\s*;/.test(commandIcon),
    detail: commandIcon || "the command icon owner is missing",
  },
  {
    name: "incident marker is a state mark, not a halo",
    pass: Boolean(incidentMark) && /width\s*:\s*8px/.test(incidentMark) && /box-shadow\s*:\s*none\s*;/.test(incidentMark),
    detail: incidentMark || "the incident marker owner is missing",
  },
  {
    name: "ordinary decision rows stay on the continuous plane",
    pass: Boolean(normalRows) && !/background\s*:\s*(?:rgba|linear-gradient|radial-gradient)/.test(normalRows),
    detail: normalRows || "ordinary decision row owner is missing",
  },
  {
    name: "route-title focus does not draw a browser-default frame",
    pass: Boolean(commandTitleFocus) && /outline\s*:\s*(?:none|2px\s+solid\s+transparent)\s*;/.test(commandTitleFocus),
    detail: commandTitleFocus || "the focused route title needs an explicit non-visual focus owner",
  },
  {
    name: "proof retains the only ordinary evidence wash",
    pass: /\.mp-proof\s*\{[\s\S]*?background\s*:\s*var\(--mp-surface-quiet\)\s*;/.test(css),
    detail: "proof strip must remain distinguishable without turning every row into a card",
  },
  {
    name: "grammar remains mobile-owned",
    pass: !/DesktopOverview|desktop-overview|overview\/desktop-overview/.test(css),
    detail: "mobile grammar must not import or mutate the desktop render tree",
  },
];

const failed = checks.filter((check) => !check.pass);
const report = {
  pass: failed.length === 0,
  contract: "mobile-ledger-visual-grammar-v1",
  checks,
  failures: failed.map((check) => check.name),
};
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exitCode = 1;
