const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const exists = (...parts) => fs.existsSync(path.join(root, ...parts));
const domainCss = [
  "mobile-domain-foundation.css",
  "mobile-domain.css",
  "mobile-domain-next-evidence.css",
  "mobile-domain-large-text.css",
].map((file) => read("src", "panel-framework", "mobile", file)).join("\n");
const incidentRoot = ["src", "panel-framework", "overview", "mobile-overview", "incident-lens"];
const incidentCss = ["tokens.css", "patrol-next.css", "incidents-next.css", "shell-next.css", "motion.css"]
  .map((file) => read(...incidentRoot, "styles", file)).join("\n");
const incidentTokens = read(...incidentRoot, "styles", "tokens.css");
const incidentSource = read(...incidentRoot, "IncidentLens.tsx");
const patrolSource = read(...incidentRoot, "PatrolLens.tsx");
const incidentWorkspace = read(...incidentRoot, "IncidentWorkspace.tsx");
const incidentModel = read(...incidentRoot, "buildIncidentLensModel.ts");
const incidentTypes = read(...incidentRoot, "types.ts");
const entry = read("src", "panel-framework", "overview", "mobile-overview", "MobileOverviewEntry.tsx");
const connectionCss = read("src", "panel-framework", "connection", "router-connection.css");
const navigationCss = read("src", "panel-framework", "sections", "section-console.css");
const surface = read("src", "panel-framework", "mobile", "useMobilePanelSurface.ts");
const domainWorkspace = read("src", "panel-framework", "mobile", "MobileDomainWorkspace.tsx");
const definitions = read("src", "panel-framework", "mobile", "mobileDomainDefinitions.ts");
const investigationActions = read("src", "panel-framework", "overview", "evidence-model", "buildOverviewInvestigationActions.ts");
const workspacePreview = read("src", "panel-framework", "mobile", "mobileWorkspacePreview.ts");
const retiredOwner = ["src", "panel-framework", "overview", "mobile-overview", "optical-patrol"];

function luminance(hex) {
  const channels = [1, 3, 5]
    .map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((left, right) => right - left);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function token(source, name) {
  const match = source.match(new RegExp("--" + name + ":\\s*(#[0-9a-f]{6})", "i"));
  assert.ok(match, "missing color token --" + name);
  return match[1];
}

function blockHas(source, selector, declaration) {
  const escaped = selector.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const block = source.match(new RegExp(escaped + "\\s*\\{[^}]*" + declaration + "[^}]*\\}", "s"));
  assert.ok(block, selector + " must include " + declaration);
}

assert.ok(exists(...incidentRoot), "Incident Split Lens owner directory is required");
for (const file of ["IncidentLens.tsx", "PatrolLens.tsx", "IncidentWorkspace.tsx", "buildIncidentLensModel.ts", "types.ts", "useIncidentLensSelectionHistory.ts"]) {
  assert.ok(exists(...incidentRoot, file), "missing Incident Split Lens owner: " + file);
}
assert.equal(exists(...retiredOwner), false, "retired Optical Patrol owner must not remain beside Incident Split Lens");
assert.doesNotMatch(`${entry}\n${incidentSource}\n${patrolSource}\n${incidentWorkspace}\n${incidentModel}\n${incidentCss}`,
  /optical-patrol|OpticalPatrol|opticalPatrol|\bop__|className\s*=\s*["'`]op\b/,
  "active mobile entry and Incident Split Lens must not retain Optical Patrol ownership");

assert.match(surface, /max-width:\s*1199px/);
assert.match(surface, /COMPACT_WORKBENCH_QUERY.*600px.*767px/s);
assert.match(surface, /COMPACT_TASK_QUERY\s*=\s*COMPACT_WORKBENCH_QUERY/);
assert.match(surface, /TABLET_WORKBENCH_QUERY.*768px.*1199px/s);
assert.match(surface, /DOMAIN_TABLET_WORKBENCH_QUERY.*768px.*1199px/s);
assert.doesNotMatch([domainCss, connectionCss, navigationCss, surface].join("\n"), /1023px/,
  "shared mobile ownership must not split at the former 1024px boundary");
assert.doesNotMatch(domainCss, /(?:linear|radial)-gradient\(/, "dense domain workspaces use solid operational layers");
assert.doesNotMatch(incidentCss, /transition\s*:\s*all\b/i, "Incident Split Lens motion must name exact properties");
assert.match(incidentCss, /prefers-reduced-motion:\s*reduce/);
assert.match(incidentCss, /forced-colors:\s*active/);

assert.match(incidentModel, /export\s+(?:function|const)\s+buildIncidentLensModel\b/);
assert.match(incidentModel, /incident\s*=\s*evidence\.risk\s*===\s*["']none["']\s*\?\s*null\s*:\s*objectForRisk/,
  "highest typed risk must choose the incident object before rendering");
assert.match(incidentModel, /surface\s*:\s*incident\s*\?\s*["']incident["']\s*:\s*["']patrol["']/,
  "model must make a real patrol-versus-incident decision");
assert.match(incidentModel, /currentNumbersAllowed\s*:\s*evidence\.evidenceMode\s*===\s*["']current["']/,
  "historical or unavailable evidence must withdraw current numbers");
assert.match(incidentTypes, /["']patrol["']\s*\|\s*["']incident["']/,
  "Incident Split Lens type must expose both surface modes");
assert.match(incidentSource, /data-incident-lens-root/);
assert.match(incidentSource, /data-incident-lens-evidence-mode/);
assert.match(incidentSource, /data-incident-lens-forbids-current/);
assert.match(incidentSource, /<PatrolLens\b/,
  "root must own a dedicated patrol render branch");
assert.match(incidentSource, /<IncidentWorkspace\b/,
  "root must own a dedicated incident render branch");
assert.match(patrolSource, /data-incident-lens-patrol/);
assert.match(incidentWorkspace, /data-incident-lens-incident/);
assert.match(incidentWorkspace, /data-incident-lens-impact/);
assert.match(incidentWorkspace, /data-incident-lens-evidence/);

assert.match(incidentCss, /@media\s*\(min-width:\s*600px\)/, "Incident Split Lens needs a tablet workspace breakpoint");
assert.match(incidentCss,
  /\.incident-lens__incident--next\s*\{[^}]*grid-template-columns:\s*minmax\(230px,\s*\.72fr\)\s+minmax\(0,\s*1\.28fr\)/s,
  "tablet incident workspace must allocate independent object and decision columns");
blockHas(incidentCss, ".incident-lens__incident--next > .incident-lens__next-objects", "grid-column:\\s*1");
blockHas(incidentCss, ".incident-lens__incident--next > .incident-lens__next-case", "grid-column:\\s*2");
assert.match(incidentCss, /@media\s*\(min-width:\s*600px\)\s*and\s*\(max-height:\s*500px\)/,
  "Incident Split Lens needs a short-landscape workspace mode");

for (const [source, prefix, surfaces] of [
  [domainCss, "mdw", ["#fbfdfe", "#eef2f4", "#f2f6f8"]],
  [incidentTokens, "il", ["#eef3f5"]],
]) {
  for (const name of prefix === "il" ? ["ink", "muted"] : ["muted", "faint"]) {
    const foreground = token(source, prefix + "-" + name);
    for (const background of surfaces) {
      const minimum = prefix === "il" && name === "muted" ? 3 : 4.5;
      assert.ok(contrast(foreground, background) >= minimum, "--" + prefix + "-" + name + " must reach " + minimum + ":1 on " + background);
    }
  }
}

blockHas(domainCss, ".mdi-domain-body", "margin:\\s*0");
blockHas(domainCss, ".mdi-domain-body", "border:\\s*0");
blockHas(domainCss, ".mdi-domain-body", "border-radius:\\s*0");
blockHas(domainCss, ".mdi-section", "border:\\s*0");
blockHas(incidentCss, ".incident-lens__chrome button", "inline-size:\\s*44px");
blockHas(incidentCss, ".incident-lens__chrome button", "block-size:\\s*44px");
blockHas(incidentCss, ".incident-lens .patrol-next__object-control", "min-block-size:\\s*52px");
blockHas(incidentCss, ".incident-lens .patrol-next__action", "min-block-size:\\s*52px");
blockHas(connectionCss, ".router-field input", "min-height:\\s*44px");
blockHas(connectionCss, ".router-segmented-control button", "min-height:\\s*44px");
blockHas(connectionCss, ".router-saved-select select", "min-height:\\s*44px");
blockHas(navigationCss, ".panel-task-navigation button", "min-height:\\s*52px");

assert.doesNotMatch(domainWorkspace, /visibleRows\.length\s*(?:<=|<)\s*4|shortTabletList/,
  "tablet task architecture must follow viewport capability, not sparse object count");
assert.doesNotMatch(workspacePreview, /dense-fallback|列表首项|rows\s*\[\s*0\s*\]/,
  "dense collections must not label an arbitrary row as evidence");
assert.match(investigationActions, /action\.mode === "investigation"/);
assert.match(investigationActions, /关联工作区/);
assert.match(investigationActions, /继续核对相关证据/);
for (const required of [
  'defaultSort: "time-desc"',
  '"severity-error"',
  '"severity-warning"',
  'defaultSort: "traffic-desc"',
  '"connections-desc"',
  '"address-asc"',
  'searchPlaceholder: "告警、链、动作或说明"',
]) {
  assert.ok(definitions.includes(required), "missing domain-specific control: " + required);
}

console.log("mobile workspace quality contract: PASS (Incident Split Lens)");
