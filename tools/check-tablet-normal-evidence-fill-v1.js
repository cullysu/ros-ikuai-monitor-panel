#!/usr/bin/env node
"use strict";

/**
 * R09 expected-red contract: a normal current tablet workbench must make its
 * existing evidence boundary discoverable when the viewport can accommodate
 * it. This is not a request to duplicate facts or force the phone ledger open.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const screen = read("src/panel-framework/mobile/MobilePatrolScreen.tsx");
const ledger = read("src/panel-framework/mobile/MobileEvidenceLedger.tsx");
const original = path.join(root, "_acceptance/panel-runtime-browser/tablet-overview-normal-768.png");
const evidenceSlice = screen.slice(screen.indexOf("const autoOpenEvidenceLedger"), screen.indexOf("const openEvidenceObject"));

const checks = [
  [
    "normal current tablet is an explicit evidence-ledger auto-open case",
    /tablet[\s\S]{0,260}evidenceMode\s*===\s*["']current["'][\s\S]{0,260}risk\s*===\s*["']none["']/.test(evidenceSlice),
  ],
  [
    "the evidence ledger remains the existing owner",
    /<MobileEvidenceLedger/.test(evidenceSlice) && /data-mobile-evidence-ledger/.test(ledger),
  ],
  [
    "manual collapse remains supported",
    /userOverrideRef/.test(ledger) && /data-user-override/.test(ledger),
  ],
  [
    "fresh normal tablet evidence is bound to the contract",
    fs.existsSync(original),
  ],
  [
    "contract does not require phone ledgers to open",
    !/narrowPhone[\s\S]{0,260}autoOpen/.test(evidenceSlice),
  ],
];

const failed = checks.filter(([, pass]) => !pass).map(([name]) => name);
const report = {
  pass: failed.length === 0,
  contract: "tablet-normal-evidence-fill-v1",
  expectedRedBeforeImplementation: true,
  checks: Object.fromEntries(checks),
  failed,
  releaseEligible: false,
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
