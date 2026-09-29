/* Parity probe: run the live vanilla /api/health-findings and /api/connection-search
 * payloads through the React frontend's real strict parsers (routeSupplementSchema.ts
 * compiled to CJS). Exit 1 when either payload is not "accepted".
 * Usage: node _scale/fixcheck/parity_probe.cjs
 */
"use strict";
const fs = require("fs");
const path = require("path");

const HERE = __dirname;
const { parseHealthFindingSupplement, parseConnectionSearchSupplement } = require(
  path.join(HERE, "contract_probe", "compiled", "sections", "routeSupplementSchema.js")
);

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(HERE, name), "utf-8"));
}

let failed = false;

const health = load("health-findings-live.json");
const healthResult = parseHealthFindingSupplement(health);
console.log("parseHealthFindingSupplement:", JSON.stringify({
  parseStatus: healthResult.parseStatus,
  evidenceMode: healthResult.evidenceMode,
  source: healthResult.source,
  sourceStatus: healthResult.sourceStatus,
  coverage: healthResult.coverage,
  generatedAt: healthResult.generatedAt,
  observedAt: healthResult.observedAt,
  reason: healthResult.reason,
  findingCount: healthResult.data ? healthResult.data.findings.length : null,
  firstFindingId: healthResult.data && healthResult.data.findings[0] ? healthResult.data.findings[0].id : null,
}));
if (healthResult.parseStatus !== "accepted") failed = true;

const search = load("connection-search-live.json");
const searchResult = parseConnectionSearchSupplement(search);
console.log("parseConnectionSearchSupplement:", JSON.stringify({
  parseStatus: searchResult.parseStatus,
  evidenceMode: searchResult.evidenceMode,
  source: searchResult.source,
  sourceStatus: searchResult.sourceStatus,
  coverage: searchResult.coverage,
  generatedAt: searchResult.generatedAt,
  observedAt: searchResult.observedAt,
  reason: searchResult.reason,
  targetIp: searchResult.data ? searchResult.data.targetIp : null,
  matchCount: searchResult.data ? searchResult.data.matchCount : null,
}));
if (searchResult.parseStatus !== "accepted") failed = true;

console.log(failed ? "RESULT: FAILED" : "RESULT: ALL ACCEPTED");
process.exit(failed ? 1 : 0);
