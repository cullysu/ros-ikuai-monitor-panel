#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const sourceRoot = path.join(root, "src", "panel-framework");
const mobileOwner = path.join(sourceRoot, "mobile-reference-ui");
const failures = [];
const walk = (dir, files = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file, files);
    else if (/\.(?:ts|tsx)$/.test(entry.name)) files.push(file);
  }
  return files;
};
const relative = (file) => path.relative(root, file).replace(/\\/g, "/");
for (const file of walk(sourceRoot)) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (/\.toLocaleLowerCase\s*\(/.test(line)) failures.push(`${relative(file)}:${index + 1}:locale-sensitive-case-fold`);
  });
}
const workspace = path.join(mobileOwner, "MobileReferenceSurface.tsx");
const model = path.join(sourceRoot, "overview", "evidence-model", "buildOverviewEvidenceModel.ts");
const overviewTypes = path.join(sourceRoot, "overview", "evidence-model", "overviewEvidenceTypes.ts");
const overviewModel = path.join(sourceRoot, "overview", "evidence-model", "buildOverviewEvidenceModel.ts");
function requirePattern(file, pattern, label) {
  if (!fs.existsSync(file) || !pattern.test(fs.readFileSync(file, "utf8"))) failures.push(`${relative(file)}:${label}`);
}
requirePattern(workspace, /const normalized = .*toLowerCase\(\)/, "mobile-inspection-workspace-must-use-toLowerCase-for-display-search-normalization");
requirePattern(workspace, /data-mobile-reference-home/, "mobile-inspection-workspace-must-expose-its-owner-boundary");
requirePattern(model, /activePath/, "route-verification-must-remain-derived-from-evidence");
requirePattern(overviewTypes, /export type OverviewEvidenceRisk/, "overview-risk-must-remain-typed-rather-than-display-normalized");
requirePattern(overviewModel, /state\.facts\.collection/, "collection-boundary-must-remain-derived");
const localeProbe = "I REST SSH";
if (localeProbe.toLowerCase() !== "i rest ssh") failures.push("runtime:locale-neutral-case-fold-probe");
const report = { pass: failures.length === 0, contract: "locale-invariant-normalization-v6-mobile-reference", implementationState: failures.length === 0 ? "blocking-green" : "blocking-red", failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
