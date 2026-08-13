#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const overview = path.join(root, "src", "panel-framework", "overview", "mobile-overview");
const owner = path.join(overview, "incident-lens");
const retiredOwner = path.join(overview, "optical-patrol");
const entry = path.join(overview, "MobileOverviewEntry.tsx");
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function walk(directory, predicate = () => true) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((item) => {
    const target = path.join(directory, item.name);
    return item.isDirectory() ? walk(target, predicate) : (predicate(target) ? [target] : []);
  });
}

const required = [
  "IncidentLens.tsx",
  "PatrolLens.tsx",
  "IncidentWorkspace.tsx",
  "buildIncidentLensModel.ts",
  "types.ts",
  "useIncidentLensSelectionHistory.ts",
];
for (const file of required) check(fs.existsSync(path.join(owner, file)), `missing isolated Incident Split Lens owner: ${file}`);

const sources = walk(owner, (file) => /\.(?:ts|tsx|css)$/.test(file));
const components = sources.filter((file) => file.endsWith(".tsx"));
const styles = sources.filter((file) => file.endsWith(".css"));
const allOwnerSource = sources.map(read).join("\n");
const entrySource = read(entry);
const rootSource = read(path.join(owner, "IncidentLens.tsx"));
const patrolSource = read(path.join(owner, "PatrolLens.tsx"));
const incidentSource = read(path.join(owner, "IncidentWorkspace.tsx"));
const css = styles.map(read).join("\n");

check(fs.existsSync(owner), "Incident Split Lens owner directory is missing");
check(fs.existsSync(entry), "mobile overview entry is missing");
check(components.length >= 3 && styles.length >= 1, "Incident Split Lens must own separate render components and an isolated style entry point");
check(!fs.existsSync(retiredOwner), "retired optical-patrol presentation ownership must be deleted, not merely hidden");
check(!/optical-patrol|OpticalPatrol|opticalPatrol|\bop__|className\s*=\s*["'`]op\b/.test(`${entrySource}\n${allOwnerSource}`), "active mobile entry and Incident Split Lens must reject every Optical Patrol import/class");
check(!/Pocket|pocket|Linkboard|NativeOperationsCanvas/.test(`${entrySource}\n${allOwnerSource}`), "active mobile entry must not revive a previously rejected mobile presentation");
check(/incident-lens\//.test(entrySource) && /<IncidentLens\b/.test(entrySource), "MobileOverviewEntry must render IncidentLens as its only mobile overview owner");
check(!/DesktopOverview|desktop-overview/.test(entrySource), "mobile overview entry must not hide a desktop render owner inside the mobile tree");
check(/data-incident-lens-root/.test(rootSource), "IncidentLens must expose a stable root marker");
check(/data-incident-lens-mode/.test(rootSource), "IncidentLens must expose patrol versus incident mode");
check(/data-incident-lens-evidence-mode/.test(rootSource), "IncidentLens must expose current/historical/unavailable evidence mode");
check(/data-incident-lens-forbids-current/.test(rootSource), "IncidentLens must expose current-value withdrawal to acceptance tools");
check(/<PatrolLens\b/.test(rootSource) && /<IncidentWorkspace\b/.test(rootSource), "patrol and incident must use distinct render owners");
check(/model\.(?:mode|surface)\s*===\s*["'](?:patrol|incident)["']/.test(rootSource), "IncidentLens must branch structurally instead of only recoloring a shared DOM");
check(/data-incident-lens-patrol/.test(patrolSource), "PatrolLens must expose its own DOM boundary");
check(/data-incident-lens-incident/.test(incidentSource), "IncidentWorkspace must expose its own DOM boundary");
check(!/data-incident-lens-incident/.test(patrolSource) && !/data-incident-lens-patrol/.test(incidentSource), "patrol and incident components must not be the same DOM with swapped text");
check(/data-incident-lens-impact/.test(incidentSource) && /data-incident-lens-evidence/.test(incidentSource), "incident workspace must put impact and evidence in distinct regions");
check(/data-incident-lens-object/.test(patrolSource), "patrol must expose four object-class scanning rows rather than a generic card grid");
check(/route|路径|WAN/i.test(patrolSource), "patrol must retain a verified route/WAN inspection object");
check(!/(?:card|dashboard)[^{]*\{[^}]*grid-template-columns\s*:\s*repeat\s*\(\s*(?:auto-fit|auto-fill|[2-9])/i.test(css), "Incident Split Lens must not regress to a dashboard card grid");
check(!/backdrop-filter/.test(css.replace(/@media\s*\(prefers-reduced-transparency:\s*reduce\)[\s\S]*/i, "")) || /(?:command|nav|menu|selector)/i.test(css), "glass may be used only for command chrome, navigation, menus, or selectors");
check(!/(?:hero|verdict)[^{]*\{[^}]*min-block-size\s*:\s*(?:1(?:0[0-9]|[2-9][0-9])|[2-9][0-9]{2,})px/i.test(css), "Incident Split Lens must not reintroduce a large hero/verdict block");
check(!/grabber|bottom-sheet|topology|preserveAspectRatio\s*=\s*["']none["']/.test(allOwnerSource), "Incident Split Lens must not reintroduce fake sheet, topology, or stretched charts");
check(/@media\s*\([^)]*(?:min-width\s*:\s*600px|width\s*>=\s*600px)[^)]*\)/.test(css), "styles must include a dedicated 600–899 tablet layout");
check(/@media[^\{]*(?:orientation\s*:\s*landscape|max-height\s*:)[^\{]*\{/.test(css), "styles must include a dedicated short-landscape layout");
check(/(?:grid-template-columns|inline-size)[\s\S]{0,1000}(?:inspector|evidence|impact)/i.test(css), "tablet/landscape layouts must allocate a real second information column");
check(/overflow-wrap\s*:\s*anywhere|min-inline-size\s*:\s*0/.test(css), "styles must encode text reflow safeguards for 200% text");

const report = {
  pass: failures.length === 0,
  gate: "incident-split-lens-architecture-v1",
  owner: path.relative(root, owner).replaceAll("\\\\", "/"),
  componentFiles: components.length,
  styleFiles: styles.length,
  failures: [...new Set(failures)],
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
