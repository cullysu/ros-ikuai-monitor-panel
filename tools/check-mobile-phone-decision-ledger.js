#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const screen = read("src/panel-framework/mobile/MobilePatrolScreen.tsx");
const ledger = read("src/panel-framework/mobile/MobileSteadyDecisionLedger.tsx");

const checks = [];
const check = (name, pass, detail) => checks.push({ name, pass: Boolean(pass), detail });

check(
  "phone-normal-ledger-is-current-only",
  /!tablet && model\.scenario === "single" && !incident && model\.evidenceMode === "current" && model\.risk === "none" && model\.secondaryDecisions\.length[\s\S]*MobileSteadyDecisionLedger/.test(screen),
  "normal phone must consume only current, incident-free secondary decisions",
);
check(
  "phone-normal-ledger-renders-before-evidence-boundary",
  /MobileSteadyDecisionLedger[\s\S]*patrolActions[\s\S]*evidenceLedger/.test(screen),
  "Signal must precede the lower evidence boundary without changing incident order",
);
check(
  "ledger-title-describes-judgment",
  /className="mp-decision-ledger"/.test(ledger) && /运行判断/.test(ledger),
  "secondary decisions are judgments, not a generic object list",
);
check(
  "state-and-evidence-use-readable-separator",
  /filter\(Boolean\)\.join\(" · "\)/.test(ledger),
  "state and evidence must use a readable separator",
);

const pass = checks.every((entry) => entry.pass);
console.log(JSON.stringify({ pass, checks }, null, 2));
process.exitCode = pass ? 0 : 1;
