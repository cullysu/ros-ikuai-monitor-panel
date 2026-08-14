const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const overviewRoot = path.join(root, "src", "panel-framework", "overview");
const mobileRoot = path.join(overviewRoot, "mobile-overview");
const desktopRoot = path.join(overviewRoot, "desktop-overview");
const failures = [];

function relative(file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function lines(file) {
  return read(file).split(/\r?\n/).length;
}

function walk(directory, extensions) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(target, extensions);
    return extensions.some((extension) => entry.name.endsWith(extension)) ? [target] : [];
  });
}

const required = [
  "OverviewPanel.tsx",
  "evidence-model/buildOverviewEvidenceModel.ts",
  "evidence-model/buildOverviewRiskQueue.ts",
  "evidence-model/overviewEvidenceTypes.ts",
  "desktop-overview/DesktopOverviewScreen.tsx",
  "desktop-overview/DesktopIncidentDocket.tsx",
  "mobile-overview/MobileOverviewEntry.tsx",
  "mobile-overview/incident-lens/IncidentLens.tsx",
  "mobile-overview/incident-lens/PatrolLens.tsx",
  "mobile-overview/incident-lens/IncidentWorkspace.tsx",
  "mobile-overview/incident-lens/buildIncidentLensModel.ts",
  "mobile-overview/incident-lens/types.ts",
  "mobile-overview/incident-lens/useIncidentLensSelectionHistory.ts",
  "mobile-overview/incident-lens/styles/tokens.css",
  "mobile-overview/incident-lens/styles/patrol-next.css",
  "mobile-overview/incident-lens/styles/incidents-next.css",
  "mobile-overview/incident-lens/styles/shell-next.css",
  "mobile-overview/incident-lens/styles/motion.css",
];

for (const file of required) {
  const absolute = path.join(overviewRoot, file);
  if (!fs.existsSync(absolute)) failures.push(`missing current overview owner: ${file}`);
}

const retired = [
  "src/panel-framework/mobile/MobilePatrolScreen.tsx",
  "src/panel-framework/mobile/MobileEvidenceLedger.tsx",
  "src/panel-framework/mobile/MobileIncidentWorkspace.tsx",
  "src/panel-framework/mobile/MobileConcurrentRiskQueue.tsx",
  "src/panel-framework/mobile/mobile-patrol.css",
  "src/panel-framework/mobile/mobile-patrol-foundation.css",
  "src/panel-framework/overview/mobile-overview/pocket-console",
  "src/panel-framework/overview/mobile-overview/MobileLinkboard.tsx",
  "src/panel-framework/overview/mobile-overview/LinkboardTimeEvidence.tsx",
  "src/panel-framework/overview/mobile-overview/linkboardModel.ts",
  "src/panel-framework/overview/mobile-overview/linkboardTypes.ts",
  "src/panel-framework/overview/mobile-overview/scenes/NativeOperationsCanvas.tsx",
  "src/panel-framework/overview/mobile-overview/scenes/operationsPrimitives.tsx",
  "src/panel-framework/overview/mobile-overview/scenes/LinkboardScene.tsx",
  "src/panel-framework/overview/mobile-overview/scenes/scenePrimitives.tsx",
];

for (const file of retired) {
  if (fs.existsSync(path.join(root, file))) failures.push(`retired presentation owner still exists: ${file}`);
}

const overviewPanel = path.join(overviewRoot, "OverviewPanel.tsx");
if (fs.existsSync(overviewPanel)) {
  const source = read(overviewPanel);
  if (!/import\s+\{\s*MobileOverviewEntry\s*\}/.test(source) || !/<MobileOverviewEntry\b/.test(source)) {
    failures.push("OverviewPanel does not mount the isolated mobile overview entry");
  }
  if (!/import\s+\{\s*DesktopOverviewScreen\s*\}/.test(source) || !/<DesktopOverviewScreen\b/.test(source)) {
    failures.push("OverviewPanel does not preserve the independent desktop overview entry");
  }
  if (/MobilePatrol|mobile-patrol|MobileLinkboard|NativeOperationsCanvas|operationsPrimitives|LinkboardScene|OpticalPatrol|opticalPatrol|optical-patrol/.test(source)) failures.push("OverviewPanel references a retired mobile presentation");
  if (lines(overviewPanel) > 260) failures.push(`OverviewPanel exceeds 260-line ownership budget: ${lines(overviewPanel)}`);
}

const mobileEntry = path.join(mobileRoot, "MobileOverviewEntry.tsx");
const incidentLensRoot = path.join(mobileRoot, "incident-lens");
const incidentLensEntry = path.join(incidentLensRoot, "IncidentLens.tsx");
const incidentLensHistory = path.join(incidentLensRoot, "useIncidentLensSelectionHistory.ts");
const incidentLensModel = path.join(incidentLensRoot, "buildIncidentLensModel.ts");
if (fs.existsSync(mobileEntry)) {
  const source = read(mobileEntry);
  if (!/incident-lens/.test(source) || !/<IncidentLens\b/.test(source)) failures.push("MobileOverviewEntry does not mount the Incident Split Lens owner");
  if (/OpticalPatrol|opticalPatrol|optical-patrol/.test(source)) failures.push("MobileOverviewEntry references retired Optical Patrol ownership");
}
if (fs.existsSync(incidentLensEntry)) {
  const source = read(incidentLensEntry);
  if (!/data-incident-lens-root/.test(source) || !/data-incident-lens-evidence-mode/.test(source)) failures.push("Incident Split Lens owner does not expose its root and evidence boundaries");
}
if (fs.existsSync(incidentLensModel) && !/export\s+function\s+buildIncidentLensModel\b/.test(read(incidentLensModel))) {
  failures.push("Incident Split Lens does not export its typed model owner");
}
if (fs.existsSync(incidentLensHistory)) {
  const source = read(incidentLensHistory);
  if (!/panelIncidentLens/.test(source) || !/pushState/.test(source) || !/popstate/.test(source) || !/scrollTop/.test(source)) {
    failures.push("Incident Split Lens does not retain scoped selection history ownership");
  }
}

const mobileSources = walk(mobileRoot, [".ts", ".tsx"]);
const desktopSources = walk(desktopRoot, [".ts", ".tsx"]);
for (const file of mobileSources) {
  const source = read(file);
  if (/desktop-overview|DesktopOverview/.test(source)) failures.push(`mobile tree imports desktop ownership: ${relative(file)}`);
  if (/MobilePatrol|mobile-patrol|lbs__|MobileLinkboard|NativeOperationsCanvas|operationsPrimitives|LinkboardTimeEvidence|linkboardModel|PocketConsole|pocketConsole|data-pocket|\.pc__|OpticalPatrol|opticalPatrol|optical-patrol/.test(source)) failures.push(`mobile tree references retired presentation grammar: ${relative(file)}`);
  const budget = file.endsWith(".tsx") ? 330 : 500;
  if (lines(file) > budget) failures.push(`mobile module exceeds ${budget}-line budget: ${relative(file)} (${lines(file)})`);
}
for (const file of desktopSources) {
  if (/mobile-overview|NativeOperationsCanvas|MobileLinkboard|PocketConsole|pocketConsole|OpticalPatrol|opticalPatrol|optical-patrol/.test(read(file))) {
    failures.push(`desktop tree imports mobile presentation ownership: ${relative(file)}`);
  }
}

const mobileCss = walk(path.join(mobileRoot, "incident-lens", "styles"), [".css"]);
let mobileCssLines = 0;
for (const file of mobileCss) {
  const source = read(file);
  mobileCssLines += lines(file);
  if (/!important/.test(source)) failures.push(`mobile overview CSS uses !important: ${relative(file)}`);
  for (const match of source.matchAll(/([^{}]+)\{([^{}]*(?:linear|radial|conic)-gradient\s*\([^{}]*)\}/gi)) {
    const selector = match[1].trim();
    const functionalGradient = /\.incident-lens__(?:chrome|nav)(?::|\b)/.test(selector)
      || /\.incident-lens__meter::before/.test(selector);
    if (!functionalGradient) {
      failures.push(`mobile overview CSS uses a decorative content gradient: ${relative(file)} (${selector})`);
    }
  }
  for (const match of source.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)px/gi)) {
    if (Number(match[1]) < 12) failures.push(`mobile overview text below 12px in ${relative(file)}: ${match[1]}px`);
  }
  if (lines(file) > 900) failures.push(`mobile stylesheet exceeds 900-line budget: ${relative(file)} (${lines(file)})`);
}
if (mobileCssLines > 2100) failures.push(`mobile overview CSS exceeds 2100-line aggregate budget: ${mobileCssLines}`);

const evidenceOwner = path.join(overviewRoot, "evidence-model", "buildOverviewEvidenceModel.ts");
if (fs.existsSync(evidenceOwner) && lines(evidenceOwner) > 650) {
  failures.push(`shared evidence model exceeds 650-line budget: ${lines(evidenceOwner)}`);
}

const polluted = walk(mobileRoot, [".bak", ".tmp", ".orig"]).map(relative);
if (polluted.length) failures.push(`temporary mobile artifacts remain: ${polluted.join(", ")}`);

if (failures.length) {
  console.error("overview architecture gate: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("overview architecture gate: PASS");
console.log(`Checked ${required.length} current owners, ${retired.length} retired owners, ${mobileSources.length} mobile modules, and ${mobileCssLines} mobile CSS lines.`);
console.log("LIMITATION: static ownership and maintainability evidence only; runtime and human visual acceptance are separate gates.");
