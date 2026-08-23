#!/usr/bin/env node

const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const checker = path.join(root, "tools", "check-route-maturity-contract.js");
const routeDocPath = path.join(root, "docs", "decision-system", "route-maturity.md");
const result = spawnSync(process.execPath, [checker, "--contract-only"], {
  cwd: root,
  encoding: "utf8",
  env: {
    ...process.env,
    CODEX_MEMORY_LIMIT_MB: "2048",
    NODE_OPTIONS: "--max-old-space-size=2048",
  },
});

const failures = [];
let report = null;
if (result.error || result.status !== 0) {
  failures.push(`route maturity contract-only command failed: ${result.error?.message || result.status}`);
} else {
  try {
    report = JSON.parse(String(result.stdout || ""));
  } catch (error) {
    failures.push(`route maturity contract-only output is not JSON: ${error.message}`);
  }
}

const routeMaturity = report?.routeMaturity;
const maturityCounts = report?.maturityCounts;
if (!Array.isArray(routeMaturity)) failures.push("routeMaturity must be an explicit per-route array");
if (!maturityCounts || typeof maturityCounts !== "object") failures.push("maturityCounts must be present");
if (Array.isArray(routeMaturity)) {
  if (routeMaturity.length !== 19) failures.push(`routeMaturity must contain 19 routes, received ${routeMaturity.length}`);
  if (new Set(routeMaturity.map((entry) => entry.route)).size !== routeMaturity.length) failures.push("routeMaturity route ids must be unique");
  if (routeMaturity.some((entry) => !["complete", "bounded-readonly", "fallback", "unavailable"].includes(entry.maturity))) failures.push("routeMaturity contains an unknown maturity label");
}

let routeDoc = "";
try {
  routeDoc = require("node:fs").readFileSync(routeDocPath, "utf8");
} catch (error) {
  failures.push(`route maturity authority document is unreadable: ${error.message}`);
}
const documentedMaturity = new Map();
for (const match of routeDoc.matchAll(/^\|\s*([^|]+?)\s*\|\s*(complete|bounded-readonly|fallback|unavailable)\s*\|/gm)) {
  documentedMaturity.set(match[1].trim(), match[2]);
}
if (documentedMaturity.size !== 19) {
  failures.push(`route maturity authority table must contain 19 route rows, received ${documentedMaturity.size}`);
}
const expectedCounts = { complete: 0, "bounded-readonly": 0, fallback: 0, unavailable: 0 };
for (const maturity of documentedMaturity.values()) expectedCounts[maturity] += 1;
for (const [maturity, expected] of Object.entries(expectedCounts)) {
  if (maturityCounts?.[maturity] !== expected) {
    failures.push(`${maturity} route count must match the authority document (${expected}), received ${maturityCounts?.[maturity]}`);
  }
}
if (Array.isArray(routeMaturity)) {
  for (const entry of routeMaturity) {
    if (documentedMaturity.get(entry.route) !== entry.maturity) {
      failures.push(`route maturity authority drift for ${entry.route}: report=${entry.maturity}, document=${documentedMaturity.get(entry.route) || "missing"}`);
    }
  }
}
if (report?.structuralPass !== true) failures.push("structural route report must pass without promoting bounded routes to complete");
if (report?.routePolicyPass !== true) failures.push("bounded public-release policy must match the active route registry");
if (report?.acceptanceComplete !== false) failures.push("contract-only route report must retain acceptanceComplete=false");
if (report?.publicReleasePass !== false) failures.push("acceptanceComplete=false must never produce publicReleasePass=true");
if (Object.hasOwn(report || {}, "releasePass")) failures.push("structural route report must not expose the legacy releasePass field");

const output = {
  pass: failures.length === 0,
  failures,
  expectedCounts,
  report,
};
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
if (failures.length) process.exitCode = 1;
