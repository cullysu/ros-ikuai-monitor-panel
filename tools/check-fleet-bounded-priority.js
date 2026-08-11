#!/usr/bin/env node
"use strict";

/*
 * The retired Patrol preview ranked a synthetic object list. Optical Patrol
 * instead projects typed evidence claims; this gate protects the equivalent
 * product contract without reviving the old presentation tree.
 */

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...segments) => fs.readFileSync(path.join(root, ...segments), "utf8");
const model = read("src", "panel-framework", "overview", "mobile-overview", "optical-patrol", "buildOpticalPatrolModel.ts");
const claims = read("src", "panel-framework", "overview", "mobile-overview", "optical-patrol", "OpticalPatrolClaim.tsx");
const responsive = read("src", "panel-framework", "overview", "mobile-overview", "optical-patrol", "styles", "responsive.css");
const failures = [];

function check(name, pass, detail) {
  if (!pass) failures.push({ name, detail });
}

check(
  "fleet scale is a normal-state summary rather than an incident override",
  /if\s*\(evidence\.risk\s*===\s*"none"\s*&&\s*verifiedCurrentRoute\)\s*\{[\s\S]{0,500}?if\s*\(state\.scale\s*===\s*"fleet"\)/.test(model),
  "fleet language must be conditional on no current higher-priority risk",
);
check(
  "risk claims are assembled before normal route or fleet coverage claims",
  /if\s*\(evidence\.risk\s*===\s*"evidence"\)[\s\S]{0,1300}?if\s*\(!claims\.length\)\s*addUnique\(claims,\s*\[routeClaim/.test(model),
  "the selected claim must derive from evidence risk before normal coverage fallback",
);
check(
  "phone follow-up queue has a bounded visible window",
  /const followups\s*=\s*available\.slice\(0,\s*4\)/.test(claims),
  "Optical Patrol must bound secondary claims on phone",
);
check(
  "hidden claims retain an explicit reveal control",
  /data-optical-patrol-overflow-control/.test(claims)
    && /aria-controls=\{overflowPanelId\}/.test(claims)
    && /aria-expanded=\{overflowExpanded\}/.test(claims),
  "a bounded queue must expose its hidden claim set semantically",
);
check(
  "fleet responsive treatment belongs to the Optical Patrol owner",
  /data-optical-patrol-scale="fleet"/.test(responsive),
  "fleet-specific layout may not rely on the retired mobile scope stylesheet",
);

const report = {
  pass: failures.length === 0,
  contract: "fleet-bounded-priority-v2-optical-patrol",
  checks: 5,
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
