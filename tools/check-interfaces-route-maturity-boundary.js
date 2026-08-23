#!/usr/bin/env node
"use strict";

const { execFileSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const checker = path.join(root, "tools", "check-route-maturity-contract.js");
const raw = execFileSync(process.execPath, [checker, "--contract-only", "--mode=structural"], {
  cwd: root,
  encoding: "utf8",
  env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=2048", CODEX_MEMORY_LIMIT_MB: "2048" },
});
const report = JSON.parse(raw);
const interfaces = report.routeMaturity?.find((entry) => entry.route === "interfaces");
const failures = [];

function check(name, condition, detail) {
  if (!condition) failures.push({ name, detail });
}

check(
  "interfaces remains bounded until independent review",
  interfaces?.maturity === "bounded-readonly",
  "an automated local check must not promote the route to complete",
);
check(
  "interfaces accessibility boundary is explicit",
  interfaces?.accessibility === "automated-only",
  "the route has automated browser evidence but no independent accessibility sign-off",
);
check(
  "interfaces independent acceptance remains pending",
  interfaces?.independentAcceptance === "pending",
  "external acceptance must be supplied by an independent reviewer, never manufactured locally",
);
check(
  "bounded-readonly product gate is structurally green",
  report.releasePass === true && report.acceptanceComplete === false,
  "a bounded route may ship under its honest label without being promoted to complete",
);

const result = {
  pass: failures.length === 0,
  contract: "interfaces-route-maturity-boundary-v2",
  route: interfaces || null,
  structuralReleasePass: report.releasePass,
  completePromotionPending: interfaces?.maturity !== "complete",
  failures,
};
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
