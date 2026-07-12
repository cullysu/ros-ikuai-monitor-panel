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
const desktopRefinementFile =
  "src/panel-framework/overview/OverviewPanelDesktopRefinement.css";
const desktopReleaseFile =
  "src/panel-framework/overview/OverviewPanelRelease.css";
const desktopConsoleFile =
  "src/panel-framework/overview/components/DesktopConsole.tsx";
const desktopDecisionRailFile =
  "src/panel-framework/overview/components/DesktopDecisionRail.tsx";
const desktopScenesFile =
  "src/panel-framework/overview/desktopOverviewScenes.tsx";
const desktopHelpersFile =
  "src/panel-framework/overview/desktopOverviewHelpers.tsx";
const desktopRowsFile =
  "src/panel-framework/overview/desktopOverviewRows.ts";
const desktopTrafficRowsFile =
  "src/panel-framework/overview/desktopOverviewTrafficRows.ts";
const desktopNetworkRowsFile =
  "src/panel-framework/overview/desktopOverviewNetworkRows.tsx";
const desktopCredibilityRowsFile =
  "src/panel-framework/overview/desktopOverviewCredibilityRows.tsx";
const desktopTerminalRowsFile =
  "src/panel-framework/overview/desktopOverviewTerminalRows.ts";
const desktopResourceRowsFile =
  "src/panel-framework/overview/desktopResourceRows.ts";
const desktopVisualsFile =
  "src/panel-framework/overview/desktopOverviewVisuals.tsx";
const builtCssFile = "public/assets/framework/style.css";
const mobileHomeFile =
  "src/panel-framework/overview/components/MobileOverviewHome.tsx";
const mobileDecisionFile =
  "src/panel-framework/overview/components/MobileOverviewDecision.tsx";
const mobileHomeSectionsFile =
  "src/panel-framework/overview/components/MobileOverviewHomeSections.tsx";
const mobileStylesFile =
  "src/panel-framework/overview/components/MobileOverviewStyles.tsx";
const mobileModelFile =
  "src/panel-framework/overview/mobileOverviewModel.ts";
const panel = read(panelFile);
const desktopConsole = read(desktopConsoleFile);
const desktopDecisionRail = read(desktopDecisionRailFile);
const desktopScenes = read(desktopScenesFile);
const panelCss = read(panelCssFile);
const desktopRefinement = read(desktopRefinementFile);
const desktopRelease = read(desktopReleaseFile);
const desktopHelpers = read(desktopHelpersFile);
const desktopRows = read(desktopRowsFile);
const desktopTrafficRows = read(desktopTrafficRowsFile);
const desktopNetworkRows = read(desktopNetworkRowsFile);
const desktopCredibilityRows = read(desktopCredibilityRowsFile);
const desktopTerminalRows = read(desktopTerminalRowsFile);
const desktopResourceRows = read(desktopResourceRowsFile);
const desktopVisuals = read(desktopVisualsFile);
const mobileHome = read(mobileHomeFile);
const mobileDecision = read(mobileDecisionFile);
const mobileHomeSections = read(mobileHomeSectionsFile);
const mobileStyles = read(mobileStylesFile);
const mobileModel = read(mobileModelFile);
const cssRoot = postcss.parse(panelCss, { from: panelCssFile });
const desktopRefinementRoot = postcss.parse(desktopRefinement, {
  from: desktopRefinementFile,
});
const desktopReleaseRoot = postcss.parse(desktopRelease, {
  from: desktopReleaseFile,
});
let declarationCount = 0;
let importantCount = 0;
let ruleCount = 0;
let mobileRuleCount = 0;
let legacyIosSelectorCount = 0;
let legacyMobileSelectorCount = 0;
let versionMarkerCount = 0;
let desktopRefinementImportantCount = 0;
let desktopDecisionRailRuleCount = 0;
let desktopDecisionCellRuleCount = 0;
let desktopWorkspaceGridRuleCount = 0;
let desktopNavRuleCount = 0;
let desktopStatusBusRuleCount = 0;
let desktopLegacyTopbarRuleCount = 0;
let desktopModuleShellRuleCount = 0;
let desktopModuleHeadRuleCount = 0;
let desktopLedgerRuleCount = 0;
let desktopModuleToneRuleCount = 0;
let desktopLedgerToneRuleCount = 0;
let desktopLedgerToneShadowCount = 0;
let desktopReleaseToneResetCount = 0;
let desktopReleaseNonPrimaryNeutralCount = 0;

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
desktopRefinementRoot.walkDecls((decl) => {
  if (decl.important) desktopRefinementImportantCount += 1;
});
desktopRefinementRoot.walkRules((rule) => {
  if (rule.selector.includes(".ro-desktop-thin-kpis")) {
    desktopDecisionRailRuleCount += 1;
  }
  if (/\.ro-desktop-thin-kpi(?!s)/.test(rule.selector)) {
    desktopDecisionCellRuleCount += 1;
  }
  if (
    rule.selector
      .split(",")
      .some((selector) => selector.trim().endsWith(".ro-desktop-grid"))
  ) {
    desktopWorkspaceGridRuleCount += 1;
  }
  if (rule.selector.includes(".ro-desktop-nav")) {
    desktopNavRuleCount += 1;
  }
  if (rule.selector.includes(".ro-topbar")) {
    if (rule.selector.includes("[data-overview-desktop-v1068-status-bus]")) {
      desktopStatusBusRuleCount += 1;
    } else {
      desktopLegacyTopbarRuleCount += 1;
    }
  }
  const selectors = rule.selector.split(",").map((selector) => selector.trim());
  if (
    selectors.length > 0 &&
    selectors.every(
      (selector) => /\.ro-module$/.test(selector) && !selector.includes(">")
    )
  ) {
    desktopModuleShellRuleCount += 1;
  }
  if (
    selectors.length > 0 &&
    selectors.every(
      (selector) =>
        /\.ro-module-head(?:\s+(?:b|span|em))?$/.test(selector) &&
        !selector.includes(".ro-col") &&
        !selector.includes(".ro-module[") &&
        !selector.includes(":is(") &&
        !selector.includes(">")
    )
  ) {
    desktopModuleHeadRuleCount += 1;
  }
  if (
    selectors.length > 0 &&
    selectors.every((selector) => {
      if (
        selector.includes(".ro-col") ||
        selector.includes(".ro-module") ||
        selector.includes("[data-tone") ||
        selector.includes(":hover")
      ) {
        return false;
      }
      return /\.(?:ro-ledger-table(?:\s+(?:th|td))?|ro-ledger-head-cell|ro-ledger-cell(?::first-child|:nth-child\([^)]*\))?(?:\s+small)?|ro-ledger-row(?::not\(\.ro-ledger-head\))?|ro-ledger-head\.ro-ledger-row)$/.test(selector);
    })
  ) {
    desktopLedgerRuleCount += 1;
  }
  if (
    selectors.length > 0 &&
    selectors.every(
      (selector) =>
        selector.includes(".ro-module[data-tone=") &&
        !selector.includes("[data-overview-evidence-weight") &&
        !selector.includes("[data-overview-density-module") &&
        !selector.includes(".ro-col")
    )
  ) {
    desktopModuleToneRuleCount += 1;
  }
  if (
    selectors.length > 0 &&
    selectors.every(
      (selector) =>
        selector.includes(".ro-ledger-row[data-tone=") &&
        !selector.includes(".ro-module") &&
        !selector.includes(".ro-col")
    )
  ) {
    desktopLedgerToneRuleCount += 1;
    rule.walkDecls("box-shadow", () => {
      desktopLedgerToneShadowCount += 1;
    });
  }
});
desktopReleaseRoot.walkRules((rule) => {
  if (
    ["danger", "warn", "missing"].every((tone) =>
      rule.selector.includes(`.ro-ledger-row[data-tone="${tone}"]`)
    ) &&
    rule.nodes?.some(
      (node) => node.type === "decl" && node.prop === "box-shadow" && node.value === "none"
    )
  ) {
    desktopReleaseToneResetCount += 1;
  }
  if (
    rule.selector.includes(":not(:first-child) .ik-overview-cell-text") &&
    ["danger", "warn", "missing"].every((tone) =>
      rule.selector.includes(`.ro-ledger-row[data-tone="${tone}"]`)
    )
  ) {
    desktopReleaseNonPrimaryNeutralCount += 1;
  }
});

const importantShare = importantCount / Math.max(1, declarationCount);
const mobileRuleShare = mobileRuleCount / Math.max(1, ruleCount);
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
  lines(desktopConsole) <= 800,
  `DesktopConsole.tsx exceeds 800 lines: ${lines(desktopConsole)}`
);
assert(
  lines(desktopDecisionRail) <= 90,
  `DesktopDecisionRail.tsx exceeds 90 lines: ${lines(desktopDecisionRail)}`
);
assert(
  lines(desktopScenes) <= 350,
  `desktopOverviewScenes.tsx exceeds 350 lines: ${lines(desktopScenes)}`
);
assert(
  lines(desktopHelpers) <= 450,
  `desktopOverviewHelpers.tsx exceeds 450 lines: ${lines(desktopHelpers)}`
);
assert(
  lines(desktopRows) <= 10,
  `desktopOverviewRows.ts must remain a narrow compatibility facade: ${lines(desktopRows)} lines`
);
assert(
  lines(desktopTrafficRows) <= 280,
  `desktopOverviewTrafficRows.ts exceeds 280 lines: ${lines(desktopTrafficRows)}`
);
assert(
  lines(desktopNetworkRows) <= 340,
  `desktopOverviewNetworkRows.tsx exceeds 340 lines: ${lines(desktopNetworkRows)}`
);
assert(
  lines(desktopCredibilityRows) <= 320,
  `desktopOverviewCredibilityRows.tsx exceeds 320 lines: ${lines(desktopCredibilityRows)}`
);
assert(
  lines(desktopTerminalRows) <= 110,
  `desktopOverviewTerminalRows.ts exceeds 110 lines: ${lines(desktopTerminalRows)}`
);
assert(
  lines(desktopResourceRows) <= 250,
  `desktopResourceRows.ts exceeds 250 lines: ${lines(desktopResourceRows)}`
);
assert(
  lines(desktopVisuals) <= 400,
  `desktopOverviewVisuals.tsx exceeds 400 lines: ${lines(desktopVisuals)}`
);
assert(bytes(panelCssFile) <= 1830000, `OverviewPanel.css exceeds 1.83 MB: ${bytes(panelCssFile)}`);
assert(lines(mobileHome) <= 120, `MobileOverviewHome.tsx exceeds 120 lines: ${lines(mobileHome)}`);
assert(
  lines(mobileDecision) <= 270,
  `MobileOverviewDecision.tsx exceeds 270 lines: ${lines(mobileDecision)}`
);
assert(
  lines(mobileHomeSections) <= 170,
  `MobileOverviewHomeSections.tsx exceeds 170 lines: ${lines(mobileHomeSections)}`
);
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
  panel.includes('from "./components/DesktopConsole"'),
  "OverviewPanel.tsx must compose the extracted desktop console boundary"
);
assert(
  desktopHelpers.includes("buildRouterOsPresentationViewModel"),
  "desktopOverviewHelpers.tsx must consume the RouterOS presentation view model"
);
assert(
  desktopConsole.includes('from "../desktopOverviewScenes"') &&
    desktopConsole.includes("buildDesktopOverviewScene(snapshot, state)"),
  "DesktopConsole.tsx must delegate scenario composition to the desktop scene module"
);
assert(
  desktopConsole.includes('from "./DesktopDecisionRail"') &&
    desktopConsole.includes("<DesktopDecisionRail"),
  "DesktopConsole.tsx must compose the desktop object/impact/action/credibility rail"
);
assert(
  desktopScenes.includes('from "./desktopOverviewVisuals"'),
  "desktopOverviewScenes.tsx must compose the extracted desktop visual layer"
);
assert(
  [
    "desktopOverviewTrafficRows",
    "desktopOverviewNetworkRows",
    "desktopOverviewCredibilityRows",
    "desktopOverviewTerminalRows",
  ].every((moduleName) => desktopRows.includes(`export * from "./${moduleName}"`)) &&
    !desktopRows.includes("export function"),
  "desktopOverviewRows.ts must only expose the four domain row modules"
);
assert(
  desktopScenes.includes('from "./desktopOverviewRows"'),
  "desktopOverviewScenes.tsx must consume the extracted desktop row layer"
);
assert(
  desktopScenes.includes('from "./desktopResourceRows"'),
  "desktopOverviewScenes.tsx must consume the resource evidence row module"
);
assert(
  desktopVisuals.includes('from "./desktopOverviewRows"'),
  "desktopOverviewVisuals.tsx must consume shared desktop row builders"
);
assert(
  mobileHome.includes("buildMobileOverviewModel") &&
    mobileHome.includes("PrimaryDecision") &&
    mobileHome.includes("DeviceBar") &&
    mobileHome.includes("CoreFacts") &&
    mobileHome.includes("SupportingList") &&
    mobileHome.includes("BottomTabs"),
  "MobileOverviewHome.tsx must remain a small mobile-home composition boundary"
);
assert(
  mobileDecision.includes("model.hero.title") &&
    mobileDecision.includes("DecisionVisual") &&
    mobileHomeSections.includes("model.coreMetrics") &&
    mobileHomeSections.includes("model.primaryList.rows"),
  "Mobile home modules must consume decision and supporting evidence from the view model"
);
assert(
  mobileStyles.includes("MOBILE_OVERVIEW_STYLE_LAYERS") &&
    mobileStyles.includes("foundation") &&
    mobileStyles.includes("product-shell"),
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
  desktopRefinementImportantCount <= 802,
  `Desktop refinement !important count regressed above 802: ${desktopRefinementImportantCount}`
);
assert(
  desktopDecisionRailRuleCount === 1 && desktopDecisionCellRuleCount <= 4,
  `Desktop decision rail must stay consolidated: railRules=${desktopDecisionRailRuleCount} cellRules=${desktopDecisionCellRuleCount}`
);
assert(
  desktopWorkspaceGridRuleCount === 1 && desktopNavRuleCount === 0,
  `Desktop workspace grid must stay canonical and must not duplicate shell navigation: gridRules=${desktopWorkspaceGridRuleCount} navRules=${desktopNavRuleCount}`
);
assert(
  desktopStatusBusRuleCount === 8 && desktopLegacyTopbarRuleCount === 0,
  `Desktop status bus must stay canonical: statusBusRules=${desktopStatusBusRuleCount} legacyTopbarRules=${desktopLegacyTopbarRuleCount}`
);
assert(
  desktopModuleShellRuleCount === 1 && desktopModuleHeadRuleCount === 3,
  `Desktop module shell/head must stay canonical: shellRules=${desktopModuleShellRuleCount} headRules=${desktopModuleHeadRuleCount}`
);
assert(
  desktopLedgerRuleCount === 6 && !desktopRefinement.includes("nth-child(odd)"),
  `Desktop ledger must stay canonical and zebra-free: ledgerRules=${desktopLedgerRuleCount}`
);
assert(
  desktopModuleToneRuleCount === 2 &&
    desktopLedgerToneRuleCount === 3 &&
    desktopLedgerToneShadowCount === 0,
  `Desktop tone hierarchy must stay restrained: moduleToneRules=${desktopModuleToneRuleCount} ledgerToneRules=${desktopLedgerToneRuleCount} ledgerToneShadows=${desktopLedgerToneShadowCount}`
);
assert(
  desktopReleaseToneResetCount === 1 && desktopReleaseNonPrimaryNeutralCount === 1,
  `Desktop release tone reset must neutralize row chrome and non-primary text: resets=${desktopReleaseToneResetCount} nonPrimary=${desktopReleaseNonPrimaryNeutralCount}`
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
  "src/panel-framework/overview/components/MobileOverviewProductShellStyles.ts",
  "src/panel-framework/overview/components/MobileOverviewPublicDecisionStyles.ts",
  "src/panel-framework/overview/components/MobileOverviewPublicDecisionRepairStyles.ts",
];
const mobileStyleLineLimits = new Map([
  ["src/panel-framework/overview/components/MobileOverviewBaseStyles.ts", 2750],
  ["src/panel-framework/overview/components/MobileOverviewProductShellStyles.ts", 260],
  ["src/panel-framework/overview/components/MobileOverviewPublicDecisionStyles.ts", 650],
  ["src/panel-framework/overview/components/MobileOverviewPublicDecisionRepairStyles.ts", 500],
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
  if (!rel.includes("MobileOverviewPublicDecision") && !rel.includes("MobileOverviewProductShell")) {
    assert(
      !layer.includes(".ik-mobile-") && !layer.includes(".ik-ios-"),
      `${rel} reintroduced legacy ik-mobile/ik-ios selectors`
    );
  }
}
assert(
  mobileStyleByteTotal <= 275000,
  `Mobile overview style layers exceed 275 KB: ${mobileStyleByteTotal}`
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
  assert(bytes(builtCssFile) <= 1766000, `Built style.css exceeds 1.766 MB: ${bytes(builtCssFile)}`);
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
  `overview architecture gate: PASS panel=${lines(panel)} lines desktop=${lines(desktopConsole)} lines desktopDecision=${lines(desktopDecisionRail)} lines scenes=${lines(desktopScenes)} lines helper=${lines(desktopHelpers)} lines rowsFacade=${lines(desktopRows)} lines trafficRows=${lines(desktopTrafficRows)} lines networkRows=${lines(desktopNetworkRows)} lines credibilityRows=${lines(desktopCredibilityRows)} lines terminalRows=${lines(desktopTerminalRows)} lines resourceRows=${lines(desktopResourceRows)} lines visuals=${lines(desktopVisuals)} lines mobileHome=${lines(mobileHome)} lines mobileDecision=${lines(mobileDecision)} lines mobileSections=${lines(mobileHomeSections)} lines css=${bytes(panelCssFile)} bytes mobileStyles=${mobileStyleByteTotal} bytes important=${importantShare.toFixed(4)} desktopImportant=${desktopRefinementImportantCount} decisionRailRules=${desktopDecisionRailRuleCount} decisionCellRules=${desktopDecisionCellRuleCount} workspaceGridRules=${desktopWorkspaceGridRuleCount} navRules=${desktopNavRuleCount} statusBusRules=${desktopStatusBusRuleCount} legacyTopbarRules=${desktopLegacyTopbarRuleCount} moduleShellRules=${desktopModuleShellRuleCount} moduleHeadRules=${desktopModuleHeadRuleCount} ledgerRules=${desktopLedgerRuleCount} moduleToneRules=${desktopModuleToneRuleCount} ledgerToneRules=${desktopLedgerToneRuleCount} ledgerToneShadows=${desktopLedgerToneShadowCount} releaseToneResets=${desktopReleaseToneResetCount} releaseNonPrimary=${desktopReleaseNonPrimaryNeutralCount} mobile=${mobileRuleShare.toFixed(4)}`
);
