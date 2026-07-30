#!/usr/bin/env node

/**
 * Write-ahead Product/Design contract for R07 incident fact ownership.
 *
 * Proof owns global context. The highest-risk object owns the incident fact
 * that explains why the object is present. A passing visual hierarchy check
 * is not enough if the same risk sentence is rendered in both surfaces.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");
const model = read("src/panel-framework/overview/evidence-model/buildOverviewEvidenceModel.ts");
const runtime = JSON.parse(read("_acceptance/panel-runtime-browser/report.json"));

const runtimeDetails = runtime.checks
  .filter((check) => check.name === "mobile composite incident keeps proved interface dependency primary and resource pressure secondary")
  .map((check) => check.detail)
  .filter((detail) => detail?.surface === "mobile" && [375, 390].includes(detail.viewport?.width));

const interfaceBranch = model.match(/if \(risk === "interfaces"\) return \[[\s\S]*?\n  \];/);
const reviewBranch = model.match(/if \(risk === "interface-review"\) return \[[\s\S]*?\n  \];/);
const interfaceBranchText = interfaceBranch?.[0] || "";
const reviewBranchText = reviewBranch?.[0] || "";

const checks = [
  ["interface Proof does not own the incident count", !/fact\("interfaces",\s*"配置依赖未运行"/.test(interfaceBranchText)],
  ["interface-review Proof does not own the unverified count", !/fact\("interfaces",\s*"未运行观测"/.test(reviewBranchText)],
  ["fresh 375/390 incident runtime details are present", runtimeDetails.length >= 2],
  ["fresh Proof text contains no interface risk status", runtimeDetails.length >= 2 && runtimeDetails.every((detail) => !/(配置依赖未运行|未运行观测)/.test(detail.proofText || ""))],
  ["fresh object text retains the interface risk evidence", runtimeDetails.length >= 2 && runtimeDetails.every((detail) => /配置依赖|运行标志/.test(detail.objectText || ""))],
];

const failed = checks.filter(([, pass]) => !pass).map(([name]) => name);
const report = {
  pass: failed.length === 0,
  contract: "mobile-incident-proof-ownership-v1",
  implementationState: failed.length === 0 ? "focused-green" : "expected-red",
  runtimeViewports: runtimeDetails.map((detail) => detail.viewport),
  failures: failed,
  checks: Object.fromEntries(checks),
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
