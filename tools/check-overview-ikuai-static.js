const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const mobile = path.join(root, "src", "panel-framework", "overview", "mobile-overview");
const optical = path.join(mobile, "optical-patrol");
const failures = [];

function read(...parts) {
  return fs.readFileSync(path.join(...parts), "utf8");
}

const entry = read(mobile, "MobileOverviewEntry.tsx");
const owner = read(optical, "OpticalPatrol.tsx");
const claims = read(optical, "OpticalPatrolClaim.tsx");
const claimGeometry = read(optical, "OpticalPatrolClaimGeometry.tsx");
const evidenceDeck = read(optical, "OpticalPatrolEvidenceDeck.tsx");
const model = read(optical, "buildOpticalPatrolModel.ts");
const types = read(optical, "opticalPatrolTypes.ts");
const routes = read(root, "src", "panel-framework", "routes", "panelRoutes.ts");
const navigation = read(root, "src", "panel-framework", "sections", "PanelTaskNavigation.tsx");
const source = [entry, owner, claims, claimGeometry, evidenceDeck, model, types].join("\n");

const requiredMarkers = [
  "data-optical-patrol-root",
  "data-optical-patrol-scene",
  "data-optical-patrol-risk",
  "data-optical-patrol-evidence-mode",
  "data-optical-patrol-forbids-current",
  "data-optical-patrol-evidence-boundary",
  "data-optical-patrol-decision",
  "data-optical-patrol-expanded-claim",
  "data-optical-patrol-claim-control",
  "data-optical-patrol-action",
  "data-optical-patrol-evidence-deck",
];
for (const marker of requiredMarkers) {
  if (!source.includes(marker)) failures.push(`missing current Optical Patrol operations marker: ${marker}`);
}

if (!entry.includes("./optical-patrol/OpticalPatrol") || !entry.includes("./optical-patrol/buildOpticalPatrolModel")) {
  failures.push("MobileOverviewEntry must mount the Optical Patrol owner and typed model");
}
if (/pocket-console|PocketConsole|pocketConsole/.test(entry)) {
  failures.push("MobileOverviewEntry still mounts the superseded Pocket Console owner");
}
if (!/buildOpticalPatrolModel/.test(model)) failures.push("Optical Patrol must own the structured mobile overview model");
if (!/forbidsCurrentData:\s*evidence\.evidenceMode\s*!==\s*"current"/.test(model)) {
  failures.push("non-current evidence does not withdraw Optical Patrol current data");
}
if (!/const currentAllowed\s*=\s*!forbidsCurrentData\s*&&\s*claim\.evidenceMode\s*===\s*"current"/.test(claimGeometry)) {
  failures.push("Optical Patrol claim geometry must require both model and claim current-evidence permission");
}
if (!/currentAllowed\s*\?\s*<ResourceGeometry/.test(claimGeometry) || !/currentAllowed\s*\?\s*<TrafficGeometry/.test(claimGeometry)) {
  failures.push("resource and traffic geometry must remain gated by current evidence");
}
if (!/route:\s*PanelRouteId/.test(types) || !/objectId:\s*string/.test(types)) {
  failures.push("Optical Patrol actions must bind a PanelRoute and objectId");
}
if (!/data-optical-patrol-expanded-claim/.test(claims) || !/data-optical-patrol-action/.test(claims)) {
  failures.push("Optical Patrol must attach one real action to the expanded primary claim");
}
if (!/data-optical-patrol-evidence-deck/.test(evidenceDeck)) {
  failures.push("Optical Patrol tablet composition must expose the evidence workbench");
}
for (const scene of ["single", "fleet", "interfaces-down", "resource-full", "collection-down", "no-snapshot", "all-offline"]) {
  if (!types.includes(`"${scene}"`) && !model.includes(`"${scene}"`)) failures.push(`Optical Patrol scene contract is missing: ${scene}`);
}
if (/\b(?:PocketConsole|panelPocketConsole|ObjectList|SelectionDetail|buildPocketConsoleComparison)\b|data-pocket|\.pc__/.test(source)) {
  failures.push("superseded Pocket/list-detail ownership remains in the current mobile overview");
}

for (const phrase of ["网络状态良好", "实时可信", "互联网正常", "业务正常"]) {
  if (source.includes(phrase)) failures.push(`unverifiable public verdict remains: ${phrase}`);
}

for (const [id, title] of [["overview", "概览"], ["terminals", "终端"], ["logs", "日志"]]) {
  const pattern = new RegExp(`${id}:\\s*\\{[^}]*shortTitle:\\s*"${title}"`);
  if (!pattern.test(routes)) failures.push(`stable mobile destination missing: ${title}`);
}
if (!/interfaces:\s*\{\s*label:\s*"网络"/.test(navigation)) failures.push("stable mobile network destination missing");

if (failures.length) {
  console.error("overview product/static gate: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("overview product/static gate: PASS");
console.log(`Checked Optical Patrol ownership, ${requiredMarkers.length} claim/evidence markers, seven-scene truth withdrawal, object-bound actions, and four stable destinations.`);
console.log("LIMITATION: this static product contract cannot substitute for runtime geometry or original-image Product/Visual sign-off.");
