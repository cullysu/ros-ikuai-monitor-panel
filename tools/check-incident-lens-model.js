#!/usr/bin/env node
"use strict";

// Static model gate for the selected Mobile Incident Split Lens.  It is intentionally
// stricter than a smoke test: a presentation cannot "look" incident-first while
// keeping the retired Optical Patrol truth model underneath it.
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const owner = path.join(root, "src", "panel-framework", "overview", "mobile-overview", "incident-lens");
const modelPath = path.join(owner, "buildIncidentLensModel.ts");
const typesPath = path.join(owner, "types.ts");
const evidenceTypesPath = path.join(root, "src", "panel-framework", "overview", "evidence-model", "overviewEvidenceTypes.ts");
const failures = [];
const scenes = ["single", "fleet", "interfaces-down", "resource-full", "collection-down", "no-snapshot", "all-offline"];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function normalized(value) {
  return String(value || "").replace(/\s+/g, " ");
}

const model = read(modelPath);
const types = read(typesPath);
const evidenceTypes = read(evidenceTypesPath);
const source = `${model}\n${types}\n${evidenceTypes}`;

check(fs.existsSync(modelPath), "missing Incident Split Lens model: buildIncidentLensModel.ts");
check(fs.existsSync(typesPath), "missing Incident Split Lens types: types.ts");
check(/export\s+(?:function|const)\s+buildIncidentLensModel\b/.test(model), "Incident Split Lens must export buildIncidentLensModel");
check(!/optical-patrol|OpticalPatrol|opticalPatrol|\bop__|className\s*=\s*["'`]op\b/.test(source), "Incident Split Lens model/types must not retain Optical Patrol presentation ownership");
check(!/Pocket|pocket|Linkboard|NativeOperationsCanvas/.test(source), "Incident Split Lens model/types must not revive a rejected mobile presentation");
check(!/parseFloat|parseInt/.test(source), "Incident Split Lens must use source numerics, never parse formatted display values");
check(!/\|\|\s*0\b|\?\?\s*0\b/.test(source), "missing measurements must not be rewritten as observed zero");
check(!/rows\s*\[\s*0\s*\]/.test(source), "an arbitrary first route/object must never become a verified default path");
check(!/activeRoute\s*\|\||route\s*\|\|/.test(source), "route selection must not use truthy fallback semantics");

for (const scene of scenes) {
  check(source.includes(`"${scene}"`) || source.includes(`'${scene}'`), `model/types must explicitly cover the ${scene} scene`);
}

check(/["']patrol["']\s*\|\s*["']incident["']/.test(types), "model type must expose patrol | incident surface");
check(/OverviewEvidenceMode/.test(types) && /["']current["']\s*\|\s*["']historical["']\s*\|\s*["']unavailable["']/.test(evidenceTypes), "model type must preserve current | historical | unavailable evidence");
check(/evidenceMode\s*!==\s*["']current["']|evidenceMode\s*===\s*["']current["']/.test(model), "model must branch between current and withdrawn evidence");
check(/currentNumbersAllowed\s*:\s*evidence\.evidenceMode\s*===\s*["']current["']/.test(model), "historical/unavailable evidence must explicitly withdraw current values");
check(/activePath/.test(source) && /verified/i.test(source), "a default route must be derived from explicit activePath evidence and carry verification");
check(/evidenceMode\s*===\s*["']current["'][\s\S]{0,180}routeEvidence\.activePath/.test(source), "only a current explicit activePath may receive route-current treatment");
check(/REST/.test(source) && /SSH/.test(source), "model must retain REST and SSH as independent collection channels");
check(/evidence\.risk\s*===\s*["']resource["'][\s\S]{0,120}resourceObject/.test(model), "resource risk must default to a concrete resource object");
check(/evidence\.risk\s*===\s*["']collection["'][\s\S]{0,180}collectionObject/.test(model), "collection risk must default to a failed collection-channel object");
check(/evidence\.risk\s*===\s*["']interfaces["'][\s\S]{0,180}interfaceObject/.test(model), "interface risk must default to the highest-risk interface object");
check(!/fleet[\s\S]{0,700}(?:return\s+.*fleet|defaultObject.*fleet)/i.test(source), "fleet scale must not preempt an existing incident default object");
check(/trailing/i.test(source) && /consecutive|连续/.test(source), "resource continuity must be named as trailing consecutive evidence");
check(/for\s*\([^)]*index\s*>=\s*0\s*&&\s*metric\.points\[index\]\.value\s*>=\s*metric\.threshold/.test(model), "trailing consecutive evidence must stop at the first non-breaching sample");
check(!/preserveAspectRatio\s*=\s*["']none["']/.test(source), "model must not authorize stretched SVG evidence");

// These semantic requirements are deliberately source-level until the new owner exists.
// They prevent a false-green gate that merely sees labels but has no scene-mode decision.
check(/incident\s*=\s*evidence\.risk\s*===\s*["']none["']\s*\?\s*null\s*:\s*objectForRisk/.test(model) && /surface\s*:\s*incident\s*\?\s*["']incident["']\s*:\s*["']patrol["']/.test(model), "highest current risk must decide incident mode before fleet scale or secondary objects");
check(/INCIDENT_LENS_PUBLIC_SCENARIOS/.test(model) && /["']single["']/.test(model) && /["']fleet["']/.test(model), "single and risk-free fleet scenes must retain an explicit public patrol path");
check(/currentTrafficFacts[\s\S]{0,420}evidenceMode\s*!==\s*["']current["'][\s\S]{0,240}traffic\.status\s*!==\s*["']ready["']/.test(model), "rates must require a complete ready current observation before rendering");

const report = {
  pass: failures.length === 0,
  gate: "incident-split-lens-model-v1",
  owner: path.relative(root, owner).replaceAll("\\\\", "/"),
  checkedScenes: scenes,
  failures: [...new Set(failures)],
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
