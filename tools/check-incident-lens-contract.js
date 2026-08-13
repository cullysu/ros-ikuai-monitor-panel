#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const owner = path.join(root, "src", "panel-framework", "overview", "mobile-overview", "incident-lens");
const failures = [];
const check = (pass, message) => { if (!pass) failures.push(message); };
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
const walk = (directory) => fs.existsSync(directory)
  ? fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const item = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(item) : [item];
  })
  : [];

const required = [
  "IncidentLens.tsx",
  "PatrolLens.tsx",
  "IncidentWorkspace.tsx",
  "buildIncidentLensModel.ts",
  "types.ts",
  "useIncidentLensSelectionHistory.ts",
];

check(fs.existsSync(owner), "incident-lens owner directory is missing");
for (const relative of required) {
  check(fs.existsSync(path.join(owner, relative)), `incident-lens owner is missing ${relative}`);
}

const sources = walk(owner).filter((file) => /\.(?:ts|tsx|css)$/.test(file));
const combined = sources.map(read).join("\n");
const rootSource = read(path.join(owner, "IncidentLens.tsx"));
const modelSource = read(path.join(owner, "buildIncidentLensModel.ts"));
const typeSource = read(path.join(owner, "types.ts"));
const entrySource = read(path.join(root, "src", "panel-framework", "overview", "mobile-overview", "MobileOverviewEntry.tsx"));
const cssSource = sources.filter((file) => file.endsWith(".css")).map(read).join("\n");

check(sources.length >= 7, "incident-lens must own a real render/model/style slice");
check(!/optical-patrol|OpticalPatrol|opticalPatrol|\bop__|className=["'`]op\b/.test(combined), "incident-lens must not import or preserve rejected Optical presentation ownership");
check(!/Pocket|pocket|Linkboard|NativeOperationsCanvas/.test(combined), "incident-lens must not revive older rejected mobile presentations");
check(/data-incident-lens-root/.test(rootSource), "IncidentLens root contract is missing");
check(/data-incident-lens-mode/.test(rootSource), "IncidentLens must expose patrol versus incident mode");
check(/data-incident-lens-evidence-mode/.test(rootSource), "IncidentLens must expose current/historical/unavailable evidence mode");
check(/data-incident-lens-forbids-current/.test(rootSource), "IncidentLens must expose current-value withdrawal");
check(/data-panel-route-title/.test(rootSource), "IncidentLens must participate in shared route focus");
check(/<PatrolLens\b/.test(rootSource) && /<IncidentWorkspace\b/.test(rootSource), "normal patrol and incident investigation require distinct render owners");
check(/(?:mode|surface)\s*===\s*["'](?:patrol|incident)["']/.test(rootSource) || /model\.(?:mode|surface)\s*===\s*["'](?:patrol|incident)["']/.test(rootSource), "IncidentLens must branch between patrol and incident structures");
check(["single", "fleet", "interfaces-down", "resource-full", "collection-down", "no-snapshot", "all-offline"].every((scene) => combined.includes(`"${scene}"`)), "IncidentLens model must own all seven public scenes");
check(/activeScene\(model/.test(rootSource) && /model\.risk\s*===\s*["']interfaces["'][\s\S]{0,100}["']interfaces-down["']/.test(rootSource), "an active incident risk must own the rendered scene while fleet remains scale context");
check(/["']patrol["']\s*\|\s*["']incident["']/.test(typeSource), "IncidentLens surface type is missing");
check(/evidence\.risk\s*===\s*["']resource["'][\s\S]{0,120}resourceObject/.test(modelSource), "resource risk must select a resource owner before rendering");
check(/evidence\.risk\s*===\s*["']collection["'][\s\S]{0,180}collectionObject/.test(modelSource), "collection risk must select a collection owner before rendering");
check(!/parseFloat|parseInt/.test(modelSource), "IncidentLens model must not parse formatted numbers");
check(!/\|\|\s*0|\?\?\s*0/.test(modelSource), "IncidentLens model must not turn missing measurements into observed zero");
check(/targetObjectIdFor\(evidence,\s*["']lineStatus["']\)/.test(modelSource), "normal WAN actions must bind to a real domain object when one exists");
check(/objectId:\s*object\.action\.targetObjectId\s*\|\|\s*null/.test(entrySource), "mobile object actions must not send presentation-only claim ids to domain inspectors");
check(!/preserveAspectRatio=["']none["']/.test(combined), "IncidentLens must not stretch SVG evidence");
check(!/transition:\s*all\b/.test(cssSource), "IncidentLens motion must name exact properties");
check(!/!important/.test(cssSource), "IncidentLens CSS must not start a new override sediment layer");
const fontSizes = Array.from(cssSource.matchAll(/font-size\s*:\s*([0-9]+(?:\.[0-9]+)?)px/gi), (match) => Number(match[1]));
check(fontSizes.every((size) => size >= 12), "IncidentLens operational CSS must keep the 12px readability floor");
check(/min-height:\s*44px/.test(cssSource), "IncidentLens must encode 44px touch targets");
check(/prefers-reduced-motion:\s*reduce/.test(cssSource), "IncidentLens must respect reduced motion");
check(/forced-colors:\s*active/.test(cssSource), "IncidentLens must support forced colors");

const report = {
  pass: failures.length === 0,
  contract: "incident-split-lens-static-v1",
  owner: path.relative(root, owner).replaceAll("\\", "/"),
  files: sources.length,
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
