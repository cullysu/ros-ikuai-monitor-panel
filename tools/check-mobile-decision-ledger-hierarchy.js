#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const ledger = read("src/panel-framework/mobile/MobileSteadyDecisionLedger.tsx");
const screen = read("src/panel-framework/mobile/MobilePatrolScreen.tsx");
const css = [
  read("src/panel-framework/mobile/mobile-patrol-foundation.css"),
  read("src/panel-framework/mobile/mobile-patrol.css")
].join("\n");
const checks = [];
const check = (name, pass, detail) => checks.push({ name, pass: Boolean(pass), detail });

check("phone decision ledger owns its own section", /className=\"mp-decision-ledger\"/.test(ledger), "generic object-list ownership must not define the phone decision surface");
check("decision landmark is explicit", /data-overview-task-landmark=\"decision-ledger\"/.test(ledger), "the patrol sequence needs a stable semantic landmark");
check("decision count is visible", /data-mobile-decision-count/.test(ledger), "the header must expose how many decisions are present");
check("row tone is exposed", /data-mobile-decision-tone/.test(ledger), "existing evidence tone must create a restrained scan hierarchy");
check("rows remain actionable", /onClick=\{\(\) => onOpen\(row\.route, row\.targetObjectId \|\| null, row\.id\)\}/.test(ledger), "each decision row must preserve its real destination and focus id");
check("screen uses the owned ledger", /<MobileSteadyDecisionLedger\s+rows=\{model\.secondaryDecisions\}/.test(screen), "normal phone and tablet must still receive the typed decision rows");
check("phone header has a compact owner", /\.mp-decision-ledger\s*>\s*header[\s\S]{0,240}min-height:\s*48px/.test(css), "phone decision header should be compact without shrinking body text");
check("phone row preserves touch size", /\.mp-decision-ledger-row[\s\S]{0,220}min-height:\s*58px/.test(css), "phone rows must remain comfortably tappable");
check("phone text stays readable", !/\.mp-decision-ledger[^}]*font-size:\s*(?:[0-9]|1[01])px/.test(css), "the hierarchy fix must not use sub-12px operational text");

const failed = checks.filter((entry) => !entry.pass);
const result = { pass: failed.length === 0, contract: "mobile-decision-ledger-hierarchy-v1", checks, failed: failed.map((entry) => entry.name) };
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
