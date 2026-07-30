#!/usr/bin/env node
"use strict";

/**
 * Focused write-ahead contract for the mobile incident scan order.
 *
 * The verdict/current-evidence header remains first. On phone incident
 * surfaces the primary risk object must precede the full proof strip, so the
 * first decision is about the affected object rather than its explanation.
 * This is an engineering contract, not Product/Design/Visual sign-off.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const screen = fs.readFileSync(path.join(root, "src/panel-framework/mobile/MobilePatrolScreen.tsx"), "utf8");

const proofCondition = screen.match(/const proofFollowsIncident\s*=\s*Boolean\(([^;]+)\);/s)?.[1] || "";
const workspaceStart = screen.indexOf('<div className="mp-workspace-primary">');
const incidentRender = screen.indexOf("{incidentCenter}", workspaceStart);
const proofRender = screen.indexOf("{proofFollowsIncident ? proofStrip", workspaceStart);

const checks = [
  {
    name: "phone incident proof follows the primary risk condition",
    pass: proofCondition.includes("!tablet && incident") && !proofCondition.includes("narrowPhone"),
    detail: proofCondition || "proofFollowsIncident condition not found",
  },
  {
    name: "primary incident renders before the proof strip in the phone workspace",
    pass: workspaceStart >= 0 && incidentRender > workspaceStart && proofRender > incidentRender,
    detail: { workspaceStart, incidentRender, proofRender },
  },
  {
    name: "runtime surface exposes the selected incident scan order",
    pass: screen.includes('data-mobile-incident-proof-order={proofFollowsIncident ? "incident-before-proof" : "proof-default"}'),
    detail: "the runtime must expose the rule for browser inspection",
  },
  {
    name: "the contract does not require a duplicate incident object",
    pass: (screen.match(/<MobilePatrolIncidentCenter/g) || []).length === 1,
    detail: "one incident-center owner must remain in the render tree",
  },
];

const failed = checks.filter((check) => !check.pass);
const result = {
  pass: failed.length === 0,
  contract: "mobile-incident-proof-order-v1",
  implementationState: failed.length === 0 ? "focused-engineering-green" : "expected-red",
  checks,
  failed: failed.map((check) => check.name),
  releaseEvidenceEligible: false,
};

console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
