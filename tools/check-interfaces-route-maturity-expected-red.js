#!/usr/bin/env node
"use strict";

const { execFileSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const checker = path.join(root, "tools", "check-route-maturity-contract.js");
const raw = execFileSync(process.execPath, [checker, "--contract-only"], {
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
  "release remains closed",
  report.releasePass === false,
  "the expected-red guard must fail closed at the release boundary",
);

const result = {
  pass: failures.length === 0,
  expectedRed: true,
  contract: "interfaces-route-maturity-expected-red-v1",
  route: interfaces || null,
  releasePass: report.releasePass,
  failures,
};
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
