#!/usr/bin/env node

/**
 * Write-ahead contract for mobile state marks.
 *
 * The mobile console uses a restrained operations grammar: state is carried
 * by a small mark plus explicit text, not by repeated vertical color bars.
 * This is an implementation guard only; it is not Product/Design/Visual
 * sign-off.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const cssFiles = [
  "src/panel-framework/mobile/mobile-domain-foundation.css",
  "src/panel-framework/mobile/mobile-domain.css",
  "src/panel-framework/mobile/mobile-domain-large-text.css",
  "src/panel-framework/mobile/mobile-collection-ledger.css",
  "src/panel-framework/mobile/mobile-patrol.css",
  "src/panel-framework/mobile/mobile-patrol-foundation.css",
];
const css = cssFiles.map((file) => fs.readFileSync(path.join(ROOT, file), "utf8")).join("\n");
const failures = [];
const checks = [];

function check(name, pass, detail) {
  const result = { name, pass: Boolean(pass), detail };
  checks.push(result);
  if (!result.pass) failures.push(name);
}

const rowMark = css.match(/\.mdw-row-mark\s*\{[\s\S]*?\}/)?.[0] || "";
check(
  "domain state mark is a compact dot",
  /width\s*:\s*8px/.test(rowMark)
    && /height\s*:\s*8px/.test(rowMark)
    && /border-radius\s*:\s*50%/.test(rowMark)
    && !/height\s*:\s*30px/.test(rowMark),
  rowMark || "missing .mdw-row-mark owner",
);

check(
  "domain list grid does not reserve a stripe column",
  !/grid-template-columns:\s*3px/.test(css),
  "all mobile domain list variants must use the compact mark column",
);

check(
  "patrol command has no colored side stripe",
  !/\.mp-command\s*\{[\s\S]*?border-inline-start:\s*3px/.test(css),
  "verdict state is already named and icon-led; do not add a decorative side stripe",
);

check(
  "patrol focus action has no colored side stripe",
  !/\.mp-focus\s*>\s*button\s*\{[\s\S]*?border-inline-start:\s*3px/.test(css),
  "focus actions must use surface and typography hierarchy rather than a vertical rail",
);

const decisionRow = css.match(/\.mp-decision-ledger-row\s*\{[\s\S]*?\}/)?.[0] || "";
check(
  "decision ledger row has no colored side stripe",
  !/border-left\s*:\s*3px/.test(decisionRow) && !/border-left-color\s*:/.test(css),
  decisionRow || "missing .mp-decision-ledger-row owner",
);

const decisionMark = css.match(/\.mp-decision-ledger-mark\s*\{[\s\S]*?\}/)?.[0] || "";
check(
  "decision ledger state mark is a compact dot",
  /width\s*:\s*8px/.test(decisionMark)
    && /height\s*:\s*8px/.test(decisionMark)
    && /border-radius\s*:\s*50%/.test(decisionMark),
  decisionMark || "missing .mp-decision-ledger-mark owner",
);

check(
  "decision ledger state mark maps every decision tone",
  /\.mp-decision-ledger-row\.is-danger[\s\S]*?--mp-decision-mark\s*:\s*var\(--mp-danger\)/.test(css)
    && /\.mp-decision-ledger-row\.is-warn[\s\S]*?--mp-decision-mark\s*:\s*var\(--mp-warn\)/.test(css)
    && /\.mp-decision-ledger-row\.is-missing[\s\S]*?--mp-decision-mark\s*:\s*var\(--mp-warn\)/.test(css)
    && /\.mp-decision-ledger-row\.is-trust[\s\S]*?--mp-decision-mark\s*:\s*var\(--mp-blue\)/.test(css)
    && /\.mp-decision-ledger-row\.is-ok[\s\S]*?--mp-decision-mark\s*:\s*var\(--mp-blue\)/.test(css)
    && /\.mp-decision-ledger-mark\s*\{[\s\S]*?background\s*:\s*var\(--mp-decision-mark/.test(css),
  "danger, warn, missing, trust, and ok must each map to an explicit visual mark variable",
);

const report = {
  pass: failures.length === 0,
  contract: "mobile-state-mark-grammar-v1",
  checks,
  failures,
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
