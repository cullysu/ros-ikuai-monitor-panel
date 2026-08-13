#!/usr/bin/env node
"use strict";

/*
 * Incident Split Lens keeps fleet coverage as a normal patrol fact. A concrete
 * incident must remain the first investigation object, and the phone follow-up
 * set must be bounded by construction rather than silently hidden by CSS.
 */

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...segments) => fs.readFileSync(path.join(root, ...segments), "utf8");
const model = read("src", "panel-framework", "overview", "mobile-overview", "incident-lens", "buildIncidentLensModel.ts");
const workspace = read("src", "panel-framework", "overview", "mobile-overview", "incident-lens", "IncidentWorkspace.tsx");
const patrol = read("src", "panel-framework", "overview", "mobile-overview", "incident-lens", "PatrolLens.tsx");
const failures = [];

function check(name, pass, detail) {
  if (!pass) failures.push({ name, detail });
}

check(
  "fleet scale is a normal-state summary rather than an incident override",
  /scopeFacts:\s*state\.scale\s*===\s*"fleet"\s*&&\s*!incident\s*\?/.test(model),
  "fleet facts must require the absence of a selected incident",
);
check(
  "risk object selection happens before fleet coverage projection",
  /const incident\s*=\s*evidence\.risk\s*===\s*"none"\s*\?\s*null\s*:\s*objectForRisk[\s\S]{0,2000}scopeFacts:\s*state\.scale\s*===\s*"fleet"\s*&&\s*!incident/.test(model),
  "the incident object must derive from evidence risk before normal fleet facts",
);
check(
  "phone investigation follow-ups have an explicit bounded visible window",
  /model\.secondaryObjects\.slice\(0,\s*3\)\.map/.test(workspace) && /patrolObjects\.filter\([\s\S]{0,180}\.slice\(0,\s*3\)/.test(model),
  "the model and incident workspace must both keep follow-ups to three visible evidence objects",
);
check(
  "bounded follow-ups remain native selectable controls",
  /data-incident-lens-claim-control[\s\S]{0,280}aria-pressed=\{selectedId\s*===\s*object\.id\}/.test(workspace),
  "each bounded follow-up must remain an explicit, stateful investigation control",
);
check(
  "patrol scale facts belong to the Incident Split Lens owner",
  /data-incident-lens-scope-facts/.test(patrol) && /data-incident-lens-scale=\{model\.scale\}/.test(read("src", "panel-framework", "overview", "mobile-overview", "incident-lens", "IncidentLens.tsx")),
  "fleet-specific treatment must remain attached to Incident Split Lens evidence ownership",
);

const report = {
  pass: failures.length === 0,
  contract: "fleet-bounded-priority-v3-incident-split-lens",
  checks: 5,
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
