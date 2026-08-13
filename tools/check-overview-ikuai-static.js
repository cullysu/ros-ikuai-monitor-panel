const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const mobile = path.join(root, "src", "panel-framework", "overview", "mobile-overview");
const incidentLens = path.join(mobile, "incident-lens");
const failures = [];

function read(...parts) {
  const file = path.join(...parts);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function requireSource(source, pattern, message) {
  if (!pattern.test(source)) failures.push(message);
}

const entry = read(mobile, "MobileOverviewEntry.tsx");
const owner = read(incidentLens, "IncidentLens.tsx");
const patrol = read(incidentLens, "PatrolLens.tsx");
const workspace = read(incidentLens, "IncidentWorkspace.tsx");
const model = read(incidentLens, "buildIncidentLensModel.ts");
const types = read(incidentLens, "types.ts");
const routes = read(root, "src", "panel-framework", "routes", "panelRoutes.ts");
const navigation = read(root, "src", "panel-framework", "sections", "PanelTaskNavigation.tsx");
const source = [owner, patrol, workspace, model, types].join("\n");

const requiredMarkers = [
  "data-incident-lens-root",
  "data-incident-lens-scenario",
  "data-incident-lens-risk",
  "data-incident-lens-evidence-mode",
  "data-incident-lens-forbids-current",
  "data-incident-lens-evidence-boundary",
  "data-incident-lens-command",
  "data-incident-lens-patrol",
  "data-incident-lens-incident",
  "data-incident-lens-expanded-claim",
  "data-incident-lens-claim-control",
  "data-incident-lens-action",
  "data-incident-lens-evidence-deck",
];
for (const marker of requiredMarkers) {
  if (!source.includes(marker)) failures.push(`missing Incident Split Lens operations marker: ${marker}`);
}

requireSource(entry, /buildIncidentLensModel/, "MobileOverviewEntry must build the typed Incident Split Lens model");
requireSource(entry, /<IncidentLens\b/, "MobileOverviewEntry must mount the Incident Split Lens owner");
requireSource(model, /export\s+function\s+buildIncidentLensModel\b/, "Incident Split Lens must own the structured mobile overview model");
requireSource(model, /currentNumbersAllowed:\s*evidence\.evidenceMode\s*===\s*"current"/, "non-current evidence must withdraw Incident Split Lens current numbers");
requireSource(owner, /data-incident-lens-forbids-current=\{model\.currentNumbersAllowed\s*\?\s*"false"\s*:\s*"true"\}/, "the Incident Split Lens boundary must expose current-value withdrawal");
requireSource(model, /const incident\s*=\s*evidence\.risk\s*===\s*"none"\s*\?\s*null\s*:\s*objectForRisk/, "risk evidence must select an incident object before normal patrol fallback");
requireSource(model, /surface:\s*incident\s*\?\s*"incident"\s*:\s*"patrol"/, "the selected risk must choose the Incident Split Lens structure");
requireSource(model, /signal:\s*currentAllowed\s*&&\s*lead/, "resource geometry must require current evidence");
requireSource(model, /function currentTrafficFacts[\s\S]{0,180}evidence\.evidenceMode\s*!==\s*"current"/, "traffic geometry must require current evidence");
requireSource(types, /route:\s*PanelRouteId/, "Incident Split Lens actions must bind a PanelRoute");
requireSource(types, /id:\s*string/, "Incident Split Lens objects must retain stable object ids");
requireSource(workspace, /data-incident-lens-expanded-claim/, "Incident Split Lens incident workspaces must expose the expanded evidence object");
requireSource(workspace, /data-incident-lens-action/, "Incident Split Lens incident workspaces must attach a real investigation action");
requireSource(patrol, /data-incident-lens-evidence-deck/, "Incident Split Lens patrol composition must expose its evidence workbench");

for (const scene of ["single", "fleet", "interfaces-down", "resource-full", "collection-down", "no-snapshot", "all-offline"]) {
  if (!types.includes(`"${scene}"`) && !model.includes(`"${scene}"`)) failures.push(`Incident Split Lens scene contract is missing: ${scene}`);
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
console.log(`Checked Incident Split Lens ownership, ${requiredMarkers.length} claim/evidence markers, seven-scene current-value withdrawal, object-bound actions, and four stable destinations.`);
console.log("LIMITATION: this static product contract cannot substitute for runtime geometry or original-image Product/Visual sign-off.");
