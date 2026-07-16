const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const failures = [];

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function exists(relativePath) {
  return fs.existsSync(absolute(relativePath));
}

function read(relativePath) {
  if (!exists(relativePath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(absolute(relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function lineCount(source) {
  return source ? source.split(/\r?\n/).length : 0;
}

function assertIncludes(source, needles, label) {
  for (const needle of needles) assert(source.includes(needle), `${label} must include ${needle}`);
}

function assertExcludes(source, needles, label) {
  for (const needle of needles) assert(!source.includes(needle), `${label} must exclude ${needle}`);
}

function cssFontSizes(source) {
  return [...source.matchAll(/font-size\s*:\s*([0-9.]+)px/gi)].map((match) => Number(match[1]));
}

const files = {
  panel: "src/panel-framework/overview/OverviewPanel.tsx",
  panelCss: "src/panel-framework/overview/OverviewPanel.css",
  types: "src/panel-framework/overview/types.ts",
  evidenceModel: "src/panel-framework/overview/evidence-model/buildOverviewEvidenceModel.ts",
  evidenceTypes: "src/panel-framework/overview/evidence-model/overviewEvidenceTypes.ts",
  mobile: "src/panel-framework/overview/mobile-overview/MobileOverviewScreen.tsx",
  mobileQueue: "src/panel-framework/overview/mobile-overview/MobilePriorityQueue.tsx",
  mobileChart: "src/panel-framework/overview/mobile-overview/MobileWanInstrument.tsx",
  mobileTokens: "src/panel-framework/overview/mobile-overview/styles/mobile-overview-tokens.css",
  mobileCss: "src/panel-framework/overview/mobile-overview/styles/mobile-overview.css",
  mobileResponsive: "src/panel-framework/overview/mobile-overview/styles/mobile-overview-responsive.css",
  desktop: "src/panel-framework/overview/desktop-overview/DesktopOverviewScreen.tsx",
  desktopModel: "src/panel-framework/overview/desktop-overview/desktopOverviewModel.ts",
  desktopLedger: "src/panel-framework/overview/desktop-overview/DesktopLedger.tsx",
  desktopIncident: "src/panel-framework/overview/desktop-overview/DesktopIncidentDocket.tsx",
  desktopChart: "src/panel-framework/overview/desktop-overview/DesktopWanEvidence.tsx",
  desktopTokens: "src/panel-framework/overview/desktop-overview/styles/desktop-overview-tokens.css",
  desktopCss: "src/panel-framework/overview/desktop-overview/styles/desktop-overview.css",
  desktopResponsive: "src/panel-framework/overview/desktop-overview/styles/desktop-overview-responsive.css",
  builtCss: "public/assets/framework/style.css",
  builtJs: "public/assets/framework/panel-framework.js",
};

const source = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));
const mobileBundle = [source.mobile, source.mobileQueue, source.mobileChart].join("\n");
const mobileStyles = [source.mobileTokens, source.mobileCss, source.mobileResponsive].join("\n");
const desktopBundle = [source.desktop, source.desktopModel, source.desktopLedger, source.desktopIncident, source.desktopChart].join("\n");
const desktopStyles = [source.desktopTokens, source.desktopCss, source.desktopResponsive].join("\n");
const activeStyles = [source.panelCss, mobileStyles, desktopStyles].join("\n");

assertIncludes(source.panel, [
  'const MOBILE_OVERVIEW_QUERY = "(max-width: 899px)"',
  "<MobileOverviewScreen",
  "<DesktopOverviewScreen",
  "mobile ?",
], "OverviewPanel independent surface mount");
assertExcludes(source.panel, ["DesktopWorkspace", "StatusVerdict", "data-mobile-native", "display: none"], "OverviewPanel");
assert(source.types.includes("export interface OverviewPanelProps"), "Shared overview props must live with shared overview types");

assertIncludes(source.evidenceTypes, [
  '"current" | "historical" | "unavailable"',
  '"evidence" | "collection" | "wan" | "resource" | "interfaces" | "route" | "none"',
  "OverviewPriorityObject",
  "OverviewTrafficInstrument",
], "shared evidence types");
assertIncludes(source.evidenceModel, [
  "route.active === true && route.disabled !== true",
  'if (mode !== "current" || risk !== "none") return null',
  "if (rowDown === null || rowUp === null) return null",
  "for (let index = observed.length - 1; index >= 0 && observed[index] === true; index -= 1)",
  'state.facts.interfaces.down > 0) return "interfaces"',
], "shared evidence policy");
assertExcludes(source.evidenceModel, ["rows[0]", "row.downRate || 0", "row.upRate || 0", "实时可信"], "shared evidence policy");
assert(source.evidenceModel.indexOf('state.facts.interfaces.down > 0) return "interfaces"') < source.evidenceModel.indexOf('if (state.scale === "fleet")'), "Real interface risk must outrank Fleet scale presentation");

assertIncludes(source.mobile, [
  "data-mobile-overview",
  "data-mobile-core-facts",
  "MobilePriorityQueue",
  "MobileWanInstrument",
  "data-mobile-evidence-ledger",
], "mobile overview");
assertIncludes(source.mobileChart, ["<svg", "viewBox", "<title", "<desc", "data-mobile-traffic-samples"], "mobile WAN SVG");
assertExcludes(mobileBundle, ["DesktopOverview", "do-shell", "role=\"tab\"", "data-mobile-native", "grabber", "topology"], "mobile render tree");
assert(mobileStyles.includes("@media (max-width: 899px)"), "Mobile styles must be bounded to max-width 899px");
assertExcludes(mobileStyles, [".do-", ".ro-", ".mn-", "!important", "radial-gradient("], "mobile styles");

assertIncludes(source.desktop, [
  "data-desktop-overview",
  "data-desktop-status-bus",
  "DesktopIncidentDocket",
  "DesktopLedger",
  "DesktopWanEvidence",
  'const incident = model.risk !== "none"',
  'state.scale !== "fleet"',
], "desktop overview");
assertIncludes(source.desktopModel, [
  "buildOverviewEvidenceModel",
  "row.active === true && row.disabled !== true",
  "boundaryRows",
  "operationalRows",
  "objectRows",
  "不以零值代替缺失",
], "desktop view model");
assertIncludes(source.desktopChart, [
  "<svg",
  "viewBox",
  'role="img"',
  "<title",
  "<desc",
  "data-sample-count",
  'data-unit="bit/s"',
  "traffic.currentDown",
  "traffic.currentUp",
  "traffic.peak",
], "desktop WAN SVG");
assertExcludes(source.desktopChart, ["threshold", "阈值", "<canvas", "style={{ width", "style={{ left"], "desktop WAN SVG");
assertIncludes(source.desktopLedger, ["role=\"table\"", "role=\"row\"", "role=\"columnheader\"", "role=\"cell\""], "desktop ledger semantics");
assertExcludes(desktopBundle, ["MobileOverview", "mo-shell", "DesktopWorkspace", "StatusVerdict", "DesktopDecisionRail", "desktopOverviewScenes"], "desktop render tree");
assert(desktopStyles.includes("@media (min-width: 900px)"), "Desktop styles must be bounded to min-width 900px");
assertExcludes(desktopStyles, [".mo-", ".ro-", ".mn-", "!important", "radial-gradient("], "desktop styles");

const retiredFiles = [
  "src/panel-framework/overview/mobile-native/MobileNativeConsole.tsx",
  "src/panel-framework/overview/mobile-native/MobileNativeHome.tsx",
  "src/panel-framework/overview/components/DesktopConsole.tsx",
  "src/panel-framework/overview/components/DesktopDecisionRail.tsx",
  "src/panel-framework/overview/components/StatusVerdict.tsx",
  "src/panel-framework/overview/desktopOverviewScenes.tsx",
  "src/panel-framework/overview/desktopOverviewVisuals.tsx",
  "src/panel-framework/overview/styles/overview-desktop.css",
  "src/panel-framework/overview/styles/overview-states.css",
  "src/panel-framework/overview/styles/desktop/refinement.css",
];
for (const file of retiredFiles) assert(!exists(file), `Rejected UI artifact must remain deleted: ${file}`);

assertExcludes(activeStyles, ["!important", "\\n.router", "final pass", "EOF", "v814", "v825", "v1000"], "active overview styles");
const fontSizes = cssFontSizes(activeStyles);
assert(fontSizes.length > 0, "Active overview styles must declare readable typography");
assert(fontSizes.every((size) => size >= 12), `Active overview styles must not use sub-12px text; found ${fontSizes.filter((size) => size < 12).join(", ")}`);

const budgets = [
  [files.panel, source.panel, 100],
  [files.mobile, source.mobile, 130],
  [files.desktop, source.desktop, 210],
  [files.desktopModel, source.desktopModel, 430],
  [files.desktopChart, source.desktopChart, 150],
  [files.evidenceModel, source.evidenceModel, 500],
];
for (const [file, fileSource, max] of budgets) assert(lineCount(fileSource) <= max, `${file} exceeds maintainability budget ${max}: ${lineCount(fileSource)}`);

if (source.builtCss) {
  assertIncludes(source.builtCss, [".mo-shell", ".do-shell", ".do-wan-chart"], "built overview CSS");
  assertExcludes(source.builtCss, [".mn-sheet", ".mn-topology", ".ro-desktop-console", "\\n.router", "!important"], "built overview CSS");
}
if (source.builtJs) {
  assertIncludes(source.builtJs, ["data-mobile-overview", "data-desktop-overview", "data-desktop-wan-evidence"], "built overview JavaScript");
  assertExcludes(source.builtJs, ["data-mobile-native", "DesktopWorkspace", "data-overview-chart=\"css\""], "built overview JavaScript");
}

if (failures.length) {
  console.error("overview architecture gate: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `overview architecture gate: PASS sharedModel=${lineCount(source.evidenceModel)} mobile=${lineCount(source.mobile)} desktop=${lineCount(source.desktop)} desktopModel=${lineCount(source.desktopModel)} activeCss=${Math.round(Buffer.byteLength(activeStyles) / 1024)}kB important=0 minText=${Math.min(...fontSizes)}px`,
);
