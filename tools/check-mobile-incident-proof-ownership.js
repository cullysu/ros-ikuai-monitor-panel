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
const { readRuntimeReport, runtimeIdentityDetail } = require('./runtime-report-identity');

const ROOT = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), "utf8");
const model = read("src/panel-framework/overview/evidence-model/buildOverviewEvidenceModel.ts");
const runtimeBinding = readRuntimeReport(ROOT);
const requireCurrentRuntime = process.argv.includes('--require-current-runtime');
const runtime = ['current', 'red'].includes(runtimeBinding.status) ? runtimeBinding.report : null;
const runtimeSkipped = !runtime;

const runtimeDetails = [375, 390]
  .map((width) => (runtime?.checks || []).find((check) => (
    check.pass === true
      && check.detail?.surface === 'mobile'
      && check.detail?.risk === 'interfaces'
      && check.detail?.viewport?.width === width
      && typeof check.detail?.proofText === 'string'
      && typeof check.detail?.objectText === 'string'
  )))
  .filter(Boolean)
  .map((check) => check.detail);

const interfaceBranch = model.match(/if \(risk === "interfaces"\) return \[[\s\S]*?\n  \];/);
const reviewBranch = model.match(/if \(risk === "interface-review"\) return \[[\s\S]*?\n  \];/);
const interfaceBranchText = interfaceBranch?.[0] || "";
const reviewBranchText = reviewBranch?.[0] || "";

const checks = [
  ["interface Proof does not own the incident count", !/fact\("interfaces",\s*"配置依赖未运行"/.test(interfaceBranchText)],
  ["interface-review Proof does not own the unverified count", !/fact\("interfaces",\s*"未运行观测"/.test(reviewBranchText)],
  ["runtime identity is current when required", !requireCurrentRuntime || runtimeBinding.current],
  ["fresh 375/390 incident runtime details are present", runtimeSkipped || runtimeDetails.length >= 2],
  ["fresh Proof text contains no interface risk status", runtimeSkipped || (runtimeDetails.length >= 2 && runtimeDetails.every((detail) => !/(配置依赖未运行|未运行观测)/.test(detail.proofText || "")))],
  ["fresh object text retains the interface risk evidence", runtimeSkipped || (runtimeDetails.length >= 2 && runtimeDetails.every((detail) => /配置依赖|运行标志/.test(detail.objectText || "")))],
];

const failed = checks.filter(([, pass]) => !pass).map(([name]) => name);
const report = {
  pass: failed.length === 0,
  contract: "mobile-incident-proof-ownership-v1",
  implementationState: failed.length ? "expected-red" : runtimeBinding.current ? "focused-green" : "static-green-runtime-pending",
  runtimeIdentity: runtimeIdentityDetail(runtimeBinding),
  runtimeChecksApplied: Boolean(runtime),
  runtimeViewports: runtimeDetails.map((detail) => detail.viewport),
  failures: failed,
  checks: Object.fromEntries(checks),
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
