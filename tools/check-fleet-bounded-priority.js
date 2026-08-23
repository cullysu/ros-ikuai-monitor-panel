#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...segments) => fs.readFileSync(path.join(root, ...segments), "utf8");
const model = read("src", "panel-framework", "overview", "evidence-model", "buildOverviewEvidenceModel.ts");
const overview = read("src", "panel-framework", "mobile-pulse", "MobilePulseHome.tsx");
const runtime = read("tools", "check-mobile-telemetry-runtime.js");
const failures = [];

function check(name, pass, detail) {
  if (!pass) failures.push({ name, detail });
}

check(
  "risk state is projected before normal overview evidence",
  /const riskQueue\s*=\s*buildOverviewRiskQueue\(mode, state, route\)/.test(model)
    && /const risk:\s*OverviewEvidenceRisk\s*=\s*riskQueue\[0\]\?\.risk\s*\|\|\s*"none"/.test(model),
  "the highest-ranked current risk must remain the first model projection",
);
check(
  "priority evidence remains bounded by the shared model and mobile owner",
  /priorityObjects:\s*priority\.rows\.slice\(0, 3\)/.test(model)
    && /priorityObjectsAll:\s*priority\.rows/.test(model)
    && /model\.priorityObjectsAll\.slice\(0, 3\)/.test(overview),
  "the current model and mobile owner must cap the visible priority window before rendering",
);
check(
  "normal overview keeps evidence-gated WAN comparison in its own current DOM",
  /comparisonObjects:\s*comparisonObjectsFor\(coverageObjects, mode, risk, route, state\.scale\)/.test(model)
    && /function OriginSignal/.test(overview)
    && /originVerifiedRoute/.test(overview)
    && /data-mobile-pulse-overview/.test(overview),
  "normal overview comparison must be rendered by the current Mobile Pulse owner",
);
check(
  "the current full report covers fleet alongside every telemetry state",
  /\{ id: "fleet", mock: "fleet-coverage" \}/.test(runtime)
    && /scenarios\.flatMap\(\(scenario\)\s*=>\s*viewports\.map/.test(runtime)
    && /source:\s*"mobile-telemetry-runtime"/.test(runtime),
  "fleet must remain one cell in the current seven-by-seven runtime report",
);

const report = {
  pass: failures.length === 0,
  contract: "fleet-bounded-priority-v5-mobile-pulse",
  owner: "src/panel-framework/mobile-pulse",
  reportMatrix: "49",
  checks: 4,
  failures,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
