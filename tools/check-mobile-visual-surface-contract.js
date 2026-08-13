#!/usr/bin/env node
"use strict";

/**
 * Product/design write-ahead contract for the mobile Incident Split Lens.
 *
 * This gate is intentionally affirmative: retirement of Optical Patrol alone
 * is never sufficient. The active mobile owner must project typed evidence,
 * expose its two distinct DOM surfaces, and retain a readable operational
 * workspace at touch and tablet breakpoints.
 */

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const overview = path.join(root, "src", "panel-framework", "overview", "mobile-overview");
const owner = path.join(overview, "incident-lens");
const retiredOwner = path.join(overview, "optical-patrol");
const entry = path.join(overview, "MobileOverviewEntry.tsx");
const failures = [];

function check(pass, name, detail) {
  if (!pass) failures.push({ name, detail });
}

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((item) => {
    const target = path.join(directory, item.name);
    return item.isDirectory() ? walk(target) : [target];
  });
}

function hasRule(source, selector, declaration) {
  const escaped = selector.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  return new RegExp(`${escaped}\\s*\\{[^}]*${declaration}[^}]*\\}`, "s").test(source);
}

const required = [
  "IncidentLens.tsx",
  "PatrolLens.tsx",
  "IncidentWorkspace.tsx",
  "buildIncidentLensModel.ts",
  "types.ts",
  "useIncidentLensSelectionHistory.ts",
];
const sources = walk(owner).filter((file) => /\.(?:ts|tsx|css)$/.test(file));
const ownerSource = sources.map(read).join("\n");
const css = sources.filter((file) => file.endsWith(".css")).map(read).join("\n");
const entrySource = read(entry);
const rootSource = read(path.join(owner, "IncidentLens.tsx"));
const patrolSource = read(path.join(owner, "PatrolLens.tsx"));
const workspaceSource = read(path.join(owner, "IncidentWorkspace.tsx"));
const modelSource = read(path.join(owner, "buildIncidentLensModel.ts"));
const activeSource = `${entrySource}\n${ownerSource}`;

check(fs.existsSync(owner) && required.every((file) => fs.existsSync(path.join(owner, file))),
  "Incident Split Lens owns a complete mobile render/model slice",
  "IncidentLens, PatrolLens, IncidentWorkspace, typed model, types, and selection history must all exist");
check(/export\s+(?:function|const)\s+buildIncidentLensModel\b/.test(modelSource)
    && /surface\s*:\s*incident\s*\?\s*["']incident["']\s*:\s*["']patrol["']/.test(modelSource)
    && /currentNumbersAllowed\s*:\s*evidence\.evidenceMode\s*===\s*["']current["']/.test(modelSource),
  "model projects typed evidence into patrol or incident mode",
  "the model must choose a surface and explicitly withdraw current values outside current evidence");
check(/data-incident-lens-root/.test(rootSource)
    && /data-incident-lens-mode/.test(rootSource)
    && /data-incident-lens-evidence-mode/.test(rootSource)
    && /data-incident-lens-forbids-current/.test(rootSource)
    && /<PatrolLens\b/.test(rootSource)
    && /<IncidentWorkspace\b/.test(rootSource),
  "root DOM exposes evidence state and separate patrol/incident owners",
  "the active root must expose stable acceptance markers and mount distinct render owners");
check(/data-incident-lens-patrol/.test(patrolSource)
    && /data-incident-lens-incident/.test(workspaceSource)
    && /data-incident-lens-impact/.test(workspaceSource)
    && /data-incident-lens-evidence/.test(workspaceSource),
  "Incident Split Lens exposes patrol, impact, and evidence DOM boundaries",
  "the incident surface must be a real split workspace, not recolored shared DOM");
check(["--il-ink:", "--il-muted:", "--il-line:", "--il-surface:", "--il-blue:", "--il-warn:", "--il-danger:"].every((token) => css.includes(token))
    && /data-incident-lens-tone=["']danger["']/.test(css)
    && /data-incident-lens-tone=["']warn["']/.test(css),
  "surface declares operational tokens and explicit state tones",
  "Incident Split Lens must distinguish trust, warning, and danger without a decorative universal wash");
check(/data-incident-lens-evidence-boundary/.test(rootSource)
    && /role=["']status["']/.test(rootSource)
    && /aria-live=["']polite["']/.test(rootSource),
  "evidence boundary remains a live, semantic reading surface",
  "command/evidence status must remain observable to assistive technology");
check(/@media\s*\(min-width:\s*600px\)/.test(css)
    && /\.incident-lens__incident\s*\{[^}]*grid-template-columns:\s*minmax\(0,1\.05fr\)\s+minmax\(300px,\.95fr\)/s.test(css)
    && /\.incident-lens__impact-workspace\s*\{[^}]*grid-column:\s*1/s.test(css)
    && /\.incident-lens__evidence-workspace\s*\{[^}]*grid-column:\s*2/s.test(css)
    && /@media\s*\(min-width:\s*600px\)\s*and\s*\(max-height:\s*500px\)/.test(css),
  "tablet and short-landscape layouts retain an Incident Split workspace",
  "impact and evidence need independent columns beyond phone width");
check(hasRule(css, ".incident-lens__chrome button", "width\\s*:\\s*44px")
    && hasRule(css, ".incident-lens__chrome button", "height\\s*:\\s*44px")
    && hasRule(css, ".incident-lens__nav button", "min-height\\s*:\\s*44px")
    && hasRule(css, ".incident-lens__object-action", "min-height\\s*:\\s*(?:52px|44px)"),
  "Incident Split Lens controls retain touch-sized targets",
  "command, navigation, and action controls must encode at least 44px targets");
check(!fs.existsSync(retiredOwner)
    && !/optical-patrol|OpticalPatrol|opticalPatrol|\bop__|className\s*=\s*["'`]op\b/.test(activeSource),
  "active mobile surface has no Optical Patrol owner",
  "the retired owner must be absent and the active entry/Incident Lens sources must not retain its identifiers");

const report = {
  pass: failures.length === 0,
  contract: "mobile-visual-surface-v3-incident-split-lens",
  owner: path.relative(root, owner).replaceAll("\\", "/"),
  checks: failures.length ? undefined : [
    "model", "DOM", "surface tokens", "evidence boundary", "tablet workspace", "touch targets", "no retired owner",
  ],
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
