#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { readRuntimeReport, runtimeIdentityDetail } = require("./runtime-report-identity");

const root = path.resolve(__dirname, "..");
const evidenceRoot = path.join(root, "_acceptance", "panel-runtime-browser");
const reportPath = path.join(evidenceRoot, "report.json");
const outputPath = path.join(evidenceRoot, "product-design-visual-packet.json");
const currentStatePath = path.join(root, "docs", "decision-system", "current-state.md");
const currentState = fs.readFileSync(currentStatePath, "utf8");
const currentStepMatch = currentState.match(/^- currentConclusionForStep:\s*`(\d+)`/m);
const decisionStep = Number(process.argv[2] || currentStepMatch?.[1] || 0);
const evidenceFiles = [
  "mobile-runtime-current.png",
  "mobile-composite-risk-390.png",
  "mobile-composite-risk-375.png",
  "mobile-log-explicit-detail-390.png",
  "mobile-visual-430-single.png",
  "mobile-visual-430-resource-full.png",
  "mobile-visual-430-collection-down.png",
  "mobile-visual-430-interfaces-down.png",
  "mobile-visual-667-portrait-single.png",
  "mobile-visual-667-portrait-fleet.png",
  "mobile-visual-667-portrait-all-offline.png",
  "mobile-visual-667-portrait-no-snapshot.png",
  "mobile-visual-667-portrait-collection-down.png",
  "mobile-visual-667-portrait-resource-full.png",
  "mobile-visual-667-portrait-interfaces-down.png",
  "mobile-visual-667-landscape-single.png",
  "mobile-visual-667-landscape-fleet.png",
  "mobile-visual-667-landscape-all-offline.png",
  "mobile-visual-667-landscape-no-snapshot.png",
  "mobile-visual-667-landscape-collection-down.png",
  "mobile-visual-667-landscape-resource-full.png",
  "mobile-visual-667-landscape-interfaces-down.png",
  "tablet-overview-normal-768.png",
  "tablet-overview-master-detail-844.png",
  "tablet-interface-review-844.png",
  "tablet-resource-investigation-context-768.png",
  "overview-normal-task-1366.png",
  "overview-normal-task-1440.png",
  "desktop-resource-timeseries-1366.png",
  "desktop-overview-wan-axis-1366.png",
];

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

if (!Number.isSafeInteger(decisionStep) || decisionStep <= 0) throw new Error("decision step must be a positive integer");
const runtimeBinding = readRuntimeReport(root);
if (!runtimeBinding.current) {
  throw new Error(`panel-runtime-browser/report.json is not current production runtime evidence: ${JSON.stringify(runtimeIdentityDetail(runtimeBinding))}`);
}

const identity = runtimeBinding.identity;
const report = runtimeBinding.report;
for (const field of ["commit", "worktreeFingerprint", "artifactKey", "worktreeClean", "releaseEvidenceEligible"]) {
  if (report[field] !== identity[field]) throw new Error(`runtime report ${field} does not match the current candidate`);
}
if (report.pass !== true) throw new Error("runtime report must be green before preparing the visual packet");

const files = evidenceFiles.map((relative) => {
  const filePath = path.join(evidenceRoot, relative);
  if (!fs.existsSync(filePath)) throw new Error(`visual evidence is missing: ${relative}`);
  return { path: relative, sha256: sha256(filePath) };
});

const packet = {
  packetVersion: 1,
  status: "prepared-not-signed",
  purpose: "independent product design visual review input only",
  validForCommit: identity.commit,
  currentDecisionStep: decisionStep,
  // Keep the release boundary explicit without a bare "closed" value that
  // could be mistaken for a completed release or completed visual signoff.
  currentRelease: "fail-closed-not-eligible",
  claims: {
    product: "scoped-pass-formal-signoff-pending",
    design: "scoped-pass-formal-signoff-pending",
    visualQA: "scoped-pass-formal-signoff-pending",
    selfSignoff: false,
    releaseEligible: false,
  },
  reviewScopes: [
    {
      id: "R07",
      label: "mobile visual maturity",
      viewports: ["390x844", "375x667", "430x932", "667x932", "667x375", "768x1024", "844x390"],
      evidence: ["mobile-runtime-current.png", "mobile-composite-risk-390.png", "mobile-composite-risk-375.png", "mobile-visual-430-single.png", "mobile-visual-430-resource-full.png", "mobile-visual-430-collection-down.png", "mobile-visual-430-interfaces-down.png", "mobile-visual-667-portrait-single.png", "mobile-visual-667-portrait-fleet.png", "mobile-visual-667-portrait-all-offline.png", "mobile-visual-667-portrait-no-snapshot.png", "mobile-visual-667-portrait-collection-down.png", "mobile-visual-667-portrait-resource-full.png", "mobile-visual-667-portrait-interfaces-down.png", "mobile-visual-667-landscape-single.png", "mobile-visual-667-landscape-fleet.png", "mobile-visual-667-landscape-all-offline.png", "mobile-visual-667-landscape-no-snapshot.png", "mobile-visual-667-landscape-collection-down.png", "mobile-visual-667-landscape-resource-full.png", "mobile-visual-667-landscape-interfaces-down.png", "mobile-log-explicit-detail-390.png"],
    },
    {
      id: "R09",
      label: "tablet space and task efficiency",
      viewports: ["768x1024", "844x1024"],
      evidence: ["tablet-overview-normal-768.png", "tablet-overview-master-detail-844.png", "tablet-interface-review-844.png", "tablet-resource-investigation-context-768.png"],
    },
    {
      id: "R10",
      label: "desktop density and task efficiency",
      viewports: ["1366x768", "1440x900"],
      evidence: ["overview-normal-task-1366.png", "overview-normal-task-1440.png", "desktop-resource-timeseries-1366.png", "desktop-overview-wan-axis-1366.png"],
    },
    {
      id: "R14",
      label: "cross-surface product grammar",
      viewports: ["390x844", "768x1024", "1366x768", "1440x900"],
      evidence: ["mobile-runtime-current.png", "tablet-overview-normal-768.png", "overview-normal-task-1366.png", "overview-normal-task-1440.png"],
    },
  ],
  reviewQuestions: [
    "Can a user identify the primary network decision within three seconds?",
    "Does each surface add new evidence instead of replaying proof?",
    "Does the tablet use space for comparison and next action rather than filler?",
    "Do phone and desktop share priority, state grammar and object context without sharing one DOM?",
  ],
  requiredSignatures: ["independent-product-reviewer", "independent-design-reviewer", "independent-visual-reviewer"],
  note: "Automation and implementation-owner inspection may prepare evidence but cannot set these signatures to pass.",
  evidenceRoot: "_acceptance/panel-runtime-browser",
  evidenceReport: "_acceptance/panel-runtime-browser/report.json",
  preparedAt: new Date().toISOString(),
  candidateIdentity: identity,
  evidenceFiles: files,
};

fs.mkdirSync(evidenceRoot, { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: path.relative(root, outputPath).replaceAll("\\", "/"), candidate: identity, currentDecisionStep: decisionStep }, null, 2));
