const fs = require("fs");
const path = require("path");
const postcss = require("postcss");

function read(rel) {
  return fs.readFileSync(path.join(process.cwd(), rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(process.cwd(), rel));
}

function bytes(rel) {
  return fs.statSync(path.join(process.cwd(), rel)).size;
}

function lines(text) {
  return text.split(/\r?\n/).length;
}

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

const panelFile = "src/panel-framework/overview/OverviewPanel.tsx";
const panelCssFile = "src/panel-framework/overview/OverviewPanel.css";
const desktopHelpersFile =
  "src/panel-framework/overview/desktopOverviewHelpers.tsx";
const desktopRowsFile =
  "src/panel-framework/overview/desktopOverviewRows.tsx";
const desktopVisualsFile =
  "src/panel-framework/overview/desktopOverviewVisuals.tsx";
const builtCssFile = "public/assets/framework/style.css";
const mobileHomeFile =
  "src/panel-framework/overview/components/MobileOverviewHome.tsx";
const mobileStylesFile =
  "src/panel-framework/overview/components/MobileOverviewStyles.tsx";
const mobileModelFile =
  "src/panel-framework/overview/mobileOverviewModel.ts";
const panel = read(panelFile);
const panelCss = read(panelCssFile);
const desktopHelpers = read(desktopHelpersFile);
const desktopRows = read(desktopRowsFile);
const desktopVisuals = read(desktopVisualsFile);
const mobileHome = read(mobileHomeFile);
const mobileStyles = read(mobileStylesFile);
const mobileModel = read(mobileModelFile);
const cssRoot = postcss.parse(panelCss, { from: panelCssFile });
let declarationCount = 0;
let importantCount = 0;
let ruleCount = 0;
let mobileRuleCount = 0;
let legacyIosSelectorCount = 0;
let legacyMobileSelectorCount = 0;
let versionMarkerCount = 0;

cssRoot.walkRules((rule) => {
  ruleCount += 1;
  if (rule.selector.includes(".ik-ios-")) legacyIosSelectorCount += 1;
  if (rule.selector.includes(".ik-mobile-")) legacyMobileSelectorCount += 1;
  let parent = rule.parent;
  while (parent) {
    if (
      parent.type === "atrule" &&
      parent.name === "media" &&
      /max-width\s*:\s*(?:760|768|820|860|900)px/i.test(parent.params)
    ) {
      mobileRuleCount += 1;
      break;
    }
    parent = parent.parent;
  }
});
cssRoot.walkDecls((decl) => {
  declarationCount += 1;
  if (decl.important) importantCount += 1;
});
cssRoot.walkComments((comment) => {
  if (/\bv\d{3,4}\b/i.test(comment.text)) versionMarkerCount += 1;
});

const importantShare = importantCount / Math.max(1, declarationCount);
const mobileRuleShare = mobileRuleCount / Math.max(1, ruleCount);
const requiredMobileComponents = [
  "StatusHeader",
  "TrustStrip",
  "IncidentHero",
  "CoreMetricRail",
  "HomeSurface",
  "BottomTabs",
];
const requiredComponentFiles = requiredMobileComponents.map(
  (name) => `src/panel-framework/overview/components/${name}.tsx`
);
const legacyFunctions = [
  "MobileLedger",
  "MobileHeroStatusCard",
  "MobileTrafficRank",
  "NoSnapshotDesktop",
  "NormalDesktop",
  "MobileDetail",
  "MobileContinuation",
  "MobileLeadHeads",
];

assert(lines(panel) <= 800, `OverviewPanel.tsx exceeds 800 lines: ${lines(panel)}`);
assert(
  lines(desktopHelpers) <= 450,
  `desktopOverviewHelpers.tsx exceeds 450 lines: ${lines(desktopHelpers)}`
);
assert(
  lines(desktopRows) <= 1050,
  `desktopOverviewRows.tsx exceeds 1050 lines: ${lines(desktopRows)}`
);
assert(
  lines(desktopVisuals) <= 400,
  `desktopOverviewVisuals.tsx exceeds 400 lines: ${lines(desktopVisuals)}`
);
assert(bytes(panelCssFile) <= 1830000, `OverviewPanel.css exceeds 1.83 MB: ${bytes(panelCssFile)}`);
assert(lines(mobileHome) <= 200, `MobileOverviewHome.tsx exceeds 200 lines: ${lines(mobileHome)}`);
assert(lines(mobileModel) <= 900, `mobileOverviewModel.ts exceeds 900 lines: ${lines(mobileModel)}`);
assert(!panel.includes("ik-ios-"), "OverviewPanel.tsx reintroduced legacy ik-ios classes");
assert(!panel.includes("ik-mobile-"), "OverviewPanel.tsx reintroduced legacy ik-mobile classes");
assert(
  legacyIosSelectorCount === 0,
  `OverviewPanel.css reintroduced ${legacyIosSelectorCount} legacy ik-ios selector rules`
);
assert(
  legacyMobileSelectorCount === 0,
  `OverviewPanel.css reintroduced ${legacyMobileSelectorCount} legacy ik-mobile selector rules`
);
assert(
  legacyFunctions.every((name) => !panel.includes(`function ${name}`)),
  "OverviewPanel.tsx reintroduced a legacy renderer function"
);
assert(
  panel.includes("buildRouterOsPresentationViewModel"),
  "OverviewPanel.tsx must consume the RouterOS presentation view model"
);
assert(
  panel.includes('from "./desktopOverviewVisuals"'),
  "OverviewPanel.tsx must compose the extracted desktop visual layer"
);
assert(
  panel.includes('from "./desktopOverviewRows"'),
  "OverviewPanel.tsx must consume the extracted desktop row layer"
);
assert(
  desktopVisuals.includes('from "./desktopOverviewRows"'),
  "desktopOverviewVisuals.tsx must consume shared desktop row builders"
);
assert(
  requiredComponentFiles.every(exists),
  "Mobile overview component boundary file is missing"
);
assert(
  requiredMobileComponents.every((name) => mobileHome.includes(name)),
  "MobileOverviewHome.tsx must compose the six public app components"
);
assert(
  mobileStyles.includes("MOBILE_OVERVIEW_STYLE_LAYERS") &&
    mobileStyles.includes("foundation") &&
    mobileStyles.includes("information-architecture") &&
    mobileStyles.includes("release-contract") &&
    mobileStyles.includes("native-product") &&
    mobileStyles.includes("decision-home"),
  "Mobile style injection must use semantic style layers"
);
assert(
  !mobileStyles.includes("import * as P") &&
    !mobileStyles.includes("P.V10"),
  "Mobile style injection must not compose chronological namespace patches"
);
assert(
  importantShare <= 0.886,
  `OverviewPanel.css important share regressed above 88.6%: ${importantShare.toFixed(4)}`
);
assert(
  mobileRuleShare <= 0.11,
  `OverviewPanel.css mobile rule share regressed above 11%: ${mobileRuleShare.toFixed(4)}`
);
assert(
  versionMarkerCount <= 159,
  `OverviewPanel.css version marker count regressed above 159: ${versionMarkerCount}`
);
assert(
  !mobileStyles.includes(".ik-mobile-") && !mobileStyles.includes(".ik-ios-"),
  "Mobile style modules reintroduced legacy ik-mobile/ik-ios selectors"
);
const mobileStyleLayerFiles = [
  "src/panel-framework/overview/components/MobileOverviewBaseStyles.ts",
  "src/panel-framework/overview/components/MobileOverviewAppPolishStyles.ts",
  "src/panel-framework/overview/components/MobileOverviewRefinementStyles.ts",
  "src/panel-framework/overview/components/MobileOverviewReleaseStyles.ts",
  "src/panel-framework/overview/components/MobileOverviewDecisionStyles.ts",
];
const mobileStyleLineLimits = new Map([
  ["src/panel-framework/overview/components/MobileOverviewBaseStyles.ts", 2750],
  ["src/panel-framework/overview/components/MobileOverviewAppPolishStyles.ts", 1300],
  ["src/panel-framework/overview/components/MobileOverviewRefinementStyles.ts", 550],
  ["src/panel-framework/overview/components/MobileOverviewReleaseStyles.ts", 450],
  ["src/panel-framework/overview/components/MobileOverviewDecisionStyles.ts", 700],
]);
let mobileStyleByteTotal = 0;
for (const rel of mobileStyleLayerFiles) {
  if (!exists(rel)) continue;
  const layer = read(rel);
  mobileStyleByteTotal += bytes(rel);
  assert(
    lines(layer) <= mobileStyleLineLimits.get(rel),
    `${rel} exceeds ${mobileStyleLineLimits.get(rel)} lines: ${lines(layer)}`
  );
  assert(
    !layer.includes(".ik-mobile-") && !layer.includes(".ik-ios-"),
    `${rel} reintroduced legacy ik-mobile/ik-ios selectors`
  );
}
assert(
  mobileStyleByteTotal <= 235000,
  `Mobile overview style layers exceed 235 KB: ${mobileStyleByteTotal}`
);


if (exists(builtCssFile)) {
  const builtCss = read(builtCssFile);
  const builtCssRoot = postcss.parse(builtCss, { from: builtCssFile });
  let builtLegacyIosSelectorCount = 0;
  let builtLegacyMobileSelectorCount = 0;
  builtCssRoot.walkRules((rule) => {
    if (rule.selector.includes(".ik-ios-")) builtLegacyIosSelectorCount += 1;
    if (rule.selector.includes(".ik-mobile-")) builtLegacyMobileSelectorCount += 1;
  });
  assert(bytes(builtCssFile) <= 1765000, `Built style.css exceeds 1.765 MB: ${bytes(builtCssFile)}`);
  assert(
    builtLegacyIosSelectorCount === 0,
    `Built style.css contains ${builtLegacyIosSelectorCount} legacy ik-ios selector rules`
  );
  assert(
    builtLegacyMobileSelectorCount === 0,
    `Built style.css contains ${builtLegacyMobileSelectorCount} legacy ik-mobile selector rules`
  );
}

if (failures.length > 0) {
  console.error("overview architecture gate: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `overview architecture gate: PASS panel=${lines(panel)} lines helper=${lines(desktopHelpers)} lines rows=${lines(desktopRows)} lines visuals=${lines(desktopVisuals)} lines css=${bytes(panelCssFile)} bytes mobileStyles=${mobileStyleByteTotal} bytes important=${importantShare.toFixed(4)} mobile=${mobileRuleShare.toFixed(4)}`
);
