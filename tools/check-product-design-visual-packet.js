#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { gitWorktreeIdentity } = require("./worktree-runtime-identity");

const root = path.resolve(__dirname, "..");
// The review packet is generated evidence, not candidate source. Keeping it under
// _acceptance avoids the impossible self-reference where a tracked packet embeds
// the commit SHA that changes when the packet itself is committed.
const packetPath = path.join(root, "_acceptance", "panel-runtime-browser", "product-design-visual-packet.json");
const packet = JSON.parse(fs.readFileSync(packetPath, "utf8"));
const identity = gitWorktreeIdentity(root);
const failures = [];
const checks = [];
function check(name, pass, detail = null) {
  const item = { name, pass: Boolean(pass), detail };
  checks.push(item);
  if (!item.pass) failures.push(name);
}
function resolveContained(base, relative) {
  const resolved = path.resolve(base, String(relative || ""));
  const rel = path.relative(base, resolved);
  return rel && !rel.startsWith("..") && !path.isAbsolute(rel) ? resolved : null;
}
function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

check("packet status is prepared-not-signed", packet.status === "prepared-not-signed", packet.status);
check(
  "packet release boundary is explicit and fail-closed",
  packet.currentRelease === "fail-closed-not-eligible",
  packet.currentRelease,
);
check("packet never self-signs", packet.claims?.selfSignoff === false && packet.claims?.releaseEligible === false, packet.claims || null);
check("required independent signatures are explicit", JSON.stringify(packet.requiredSignatures) === JSON.stringify([
  "independent-product-reviewer",
  "independent-design-reviewer",
  "independent-visual-reviewer",
]), packet.requiredSignatures || null);
check("packet binds a positive current decision step", Number.isSafeInteger(packet.currentDecisionStep) && packet.currentDecisionStep > 0, packet.currentDecisionStep);
check("packet has a current candidate identity", packet.candidateIdentity && typeof packet.candidateIdentity === "object", packet.candidateIdentity || null);
const candidate = packet.candidateIdentity || {};
for (const field of ["commit", "worktreeFingerprint", "artifactKey"]) {
  check(`candidate identity ${field} matches runtime`, candidate[field] === identity[field], {
    packet: candidate[field] || null,
    runtime: identity[field],
  });
}
for (const field of ["worktreeClean", "releaseEvidenceEligible"]) {
  check(`candidate identity ${field} matches runtime`, candidate[field] === identity[field], {
    packet: candidate[field],
    runtime: identity[field],
  });
}
const evidenceRoot = path.resolve(root, String(packet.evidenceRoot || ""));
check("evidence root exists", fs.existsSync(evidenceRoot) && fs.statSync(evidenceRoot).isDirectory(), evidenceRoot);
const reportPath = resolveContained(evidenceRoot, String(packet.evidenceReport || "").replace(/^.*panel-runtime-browser[\\/]/, ""));
check("evidence report is contained and exists", Boolean(reportPath && fs.existsSync(reportPath)), packet.evidenceReport || null);
let report = null;
if (reportPath && fs.existsSync(reportPath)) report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
for (const field of ["commit", "worktreeFingerprint", "artifactKey", "worktreeClean", "releaseEvidenceEligible"]) {
  check(`evidence report ${field} matches runtime`, report && report[field] === identity[field], { packet: report ? report[field] : null, runtime: identity[field] });
}
check("evidence report is green", report?.pass === true, report?.pass ?? null);

const references = [];
for (const scope of Array.isArray(packet.reviewScopes) ? packet.reviewScopes : []) {
  for (const relative of Array.isArray(scope.evidence) ? scope.evidence : []) references.push({ scope: scope.id, path: relative });
}
const uniqueReferences = [...new Map(references.map((item) => [item.path, item])).values()];
check("all review scopes are named", ["R07", "R09", "R10", "R14"].every((id) => packet.reviewScopes?.some((scope) => scope.id === id)), packet.reviewScopes?.map((scope) => scope.id) || []);
const evidenceFiles = Array.isArray(packet.evidenceFiles) ? packet.evidenceFiles : [];
const evidenceByPath = new Map(evidenceFiles.map((item) => [item.path, item]));
for (const ref of uniqueReferences) {
  const file = resolveContained(evidenceRoot, ref.path);
  check(`evidence file exists: ${ref.path}`, Boolean(file && fs.existsSync(file)), { scope: ref.scope, path: ref.path });
  const item = evidenceByPath.get(ref.path);
  check(`evidence digest is present: ${ref.path}`, Boolean(item && /^[a-f0-9]{64}$/.test(String(item.sha256 || ""))), item || null);
  if (file && fs.existsSync(file) && item) check(`evidence digest matches: ${ref.path}`, sha256(file) === item.sha256, { expected: item.sha256, actual: sha256(file) });
}
check("packet evidence file set is exact", evidenceFiles.length === uniqueReferences.length && evidenceFiles.every((item) => uniqueReferences.some((ref) => ref.path === item.path)), {
  expected: uniqueReferences.length,
  actual: evidenceFiles.length,
});

const result = {
  pass: failures.length === 0,
  contract: "product-design-visual-packet-v1",
  packet: path.relative(root, packetPath).replaceAll("\\", "/"),
  currentIdentity: identity,
  checks,
  failures,
  releaseEligible: false,
  selfSignoff: false,
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
