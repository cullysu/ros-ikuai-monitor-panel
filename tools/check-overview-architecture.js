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
const desktopBaseStylesFile =
  "src/panel-framework/overview/styles/overview-desktop.css";
const desktopBaseStyleLayerFiles = [
  desktopBaseStylesFile,
  "src/panel-framework/overview/styles/desktop/density.css",
  "src/panel-framework/overview/styles/desktop/first-screen.css",
  "src/panel-framework/overview/styles/desktop/hierarchy.css",
  "src/panel-framework/overview/styles/desktop/evidence.css",
  "src/panel-framework/overview/styles/desktop/console-skeleton.css",
  "src/panel-framework/overview/styles/desktop/layout.css",
  "src/panel-framework/overview/styles/desktop/console-refinement.css",
];
const desktopRefinementFile =
  "src/panel-framework/overview/styles/desktop/refinement.css";
const desktopReleaseFile =
  "src/panel-framework/overview/styles/desktop/release.css";
const desktopIncidentStylesFile =
  "src/panel-framework/overview/styles/desktop/incidents.css";
const desktopStatusBusStylesFile =
  "src/panel-framework/overview/styles/desktop/status-bus.css";
const desktopWanTrendStylesFile =
  "src/panel-framework/overview/styles/desktop/wan-trend.css";
const desktopConsoleFile =
  "src/panel-framework/overview/components/DesktopConsole.tsx";
const desktopDecisionRailFile =
  "src/panel-framework/overview/components/DesktopDecisionRail.tsx";
const desktopModuleFile =
  "src/panel-framework/overview/components/DesktopModule.tsx";
const statusVerdictFile =
  "src/panel-framework/overview/components/StatusVerdict.tsx";
const desktopScenesFile =
  "src/panel-framework/overview/desktopOverviewScenes.tsx";
const desktopDefaultSceneFile =
  "src/panel-framework/overview/desktopOverviewDefaultScene.tsx";
const desktopResourceSceneFile =
  "src/panel-framework/overview/desktopOverviewResourceScene.tsx";
const desktopHelpersFile =
  "src/panel-framework/overview/desktopOverviewHelpers.tsx";
const routerOsNetworkViewModelFile =
  "src/panel-framework/overview/routerosNetworkViewModel.ts";
const routerOsPresentationViewModelFile =
  "src/panel-framework/overview/routerosPresentationViewModel.ts";
const desktopTrafficRowsFile =
  "src/panel-framework/overview/desktopOverviewTrafficRows.ts";
const desktopRouteRowsFile =
  "src/panel-framework/overview/desktopOverviewRouteRows.ts";
const desktopWanRowsFile =
  "src/panel-framework/overview/desktopOverviewWanRows.tsx";
const desktopInterfaceRowsFile =
  "src/panel-framework/overview/desktopOverviewInterfaceRows.tsx";
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
const mobileTabViewFile =
  "src/panel-framework/overview/components/MobileOverviewTabView.tsx";
const mobileTabRowsFile =
  "src/panel-framework/overview/components/mobileOverviewTabRows.ts";
const mobileBottomTabsFile =
  "src/panel-framework/overview/components/BottomTabs.tsx";
const mobileStylesFile =
  "src/panel-framework/overview/styles/mobile/mobile-product.css";
const mobileProductShellFile =
  "src/panel-framework/overview/styles/mobile/product-shell.css";
const mobileNavigationStylesFile =
  "src/panel-framework/overview/styles/mobile/navigation.css";
const mobileFrameStylesFile =
  "src/panel-framework/overview/styles/mobile/frame.css";
const mobileCoreStylesFile =
  "src/panel-framework/overview/styles/mobile/core.css";
const mobileDecisionStylesFile =
  "src/panel-framework/overview/styles/mobile/decision.css";
const mobileSurfaceStylesFile =
  "src/panel-framework/overview/styles/mobile/surface.css";
const mobileModelFile =
  "src/panel-framework/overview/mobileOverviewModel.ts";
const mobilePolicyFile =
  "src/panel-framework/overview/mobileOverviewPolicy.ts";
const panel = read(panelFile);
const desktopConsole = read(desktopConsoleFile);
const desktopDecisionRail = read(desktopDecisionRailFile);
const desktopModule = read(desktopModuleFile);
const statusVerdict = read(statusVerdictFile);
const desktopScenes = read(desktopScenesFile);
const desktopDefaultScene = read(desktopDefaultSceneFile);
const desktopResourceScene = read(desktopResourceSceneFile);
const panelCss = read(panelCssFile);
const desktopBaseStyles = desktopBaseStyleLayerFiles.map(read).join("\n");
const desktopRefinement = read(desktopRefinementFile);
const desktopRelease = read(desktopReleaseFile);
const desktopIncidentStyles = read(desktopIncidentStylesFile);
const desktopStatusBusStyles = read(desktopStatusBusStylesFile);
const desktopWanTrendStyles = read(desktopWanTrendStylesFile);
const desktopHelpers = read(desktopHelpersFile);
const routerOsNetworkViewModel = read(routerOsNetworkViewModelFile);
const routerOsPresentationViewModel = read(routerOsPresentationViewModelFile);
const desktopTrafficRows = read(desktopTrafficRowsFile);
const desktopRouteRows = read(desktopRouteRowsFile);
const desktopWanRows = read(desktopWanRowsFile);
const desktopInterfaceRows = read(desktopInterfaceRowsFile);
const desktopCredibilityRows = read(desktopCredibilityRowsFile);
const desktopTerminalRows = read(desktopTerminalRowsFile);
const desktopResourceRows = read(desktopResourceRowsFile);
const desktopVisuals = read(desktopVisualsFile);
const mobileHome = read(mobileHomeFile);
const mobileDecision = read(mobileDecisionFile);
const mobileHomeSections = read(mobileHomeSectionsFile);
const mobileTabView = read(mobileTabViewFile);
const mobileTabRows = read(mobileTabRowsFile);
const mobileBottomTabs = read(mobileBottomTabsFile);
const mobileStyles = read(mobileStylesFile);
const mobileProductShell = read(mobileProductShellFile);
const mobileNavigationStyles = read(mobileNavigationStylesFile);
const mobileFrameStyles = read(mobileFrameStylesFile);
const mobileCoreStyles = read(mobileCoreStylesFile);
const mobileDecisionStyles = read(mobileDecisionStylesFile);
const mobileSurfaceStyles = read(mobileSurfaceStylesFile);
const mobileModel = read(mobileModelFile);
const mobilePolicy = read(mobilePolicyFile);
const cssRoot = postcss.parse(panelCss, { from: panelCssFile });
const desktopBaseStylesRoot = postcss.parse(desktopBaseStyles, {
  from: desktopBaseStylesFile,
});
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
let desktopRefinementShadowedDeclarationCount = 0;
let desktopBaseImportantCount = 0;

function countShadowedDeclarations(root) {
  let count = 0;
  const propertiesBySelector = new Map();
  root.walkRules((rule) => {
    const atRuleContext = [];
    for (let parent = rule.parent; parent && parent.type !== "root"; parent = parent.parent) {
      if (parent.type === "atrule") atRuleContext.unshift(`@${parent.name} ${parent.params}`);
    }
    const selectorContext = `${atRuleContext.join(" > ")}\n${rule.selector}`;
    const earlierProperties = propertiesBySelector.get(selectorContext) || new Set();
    const currentProperties = new Set();
    rule.nodes.filter((node) => node.type === "decl").forEach((decl) => {
      const propertyKey = `${decl.prop}\n${decl.important}`;
      if (earlierProperties.has(propertyKey)) count += 1;
      currentProperties.add(propertyKey);
    });
    currentProperties.forEach((propertyKey) => earlierProperties.add(propertyKey));
    propertiesBySelector.set(selectorContext, earlierProperties);
  });
  return count;
}

desktopBaseStylesRoot.walkDecls((decl) => {
  if (decl.important) desktopBaseImportantCount += 1;
});
const desktopBaseShadowedDeclarationCount = countShadowedDeclarations(desktopBaseStylesRoot);
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
const desktopRefinementPropertiesBySelector = new Map();
desktopRefinementRoot.walkRules((rule) => {
  const atRuleContext = [];
  for (let parent = rule.parent; parent && parent.type !== "root"; parent = parent.parent) {
    if (parent.type === "atrule") atRuleContext.unshift(`@${parent.name} ${parent.params}`);
  }
  const selectorContext = `${atRuleContext.join(" > ")}\n${rule.selector}`;
  const earlierProperties = desktopRefinementPropertiesBySelector.get(selectorContext) || new Set();
  const currentProperties = new Set();
  rule.nodes
    .filter((node) => node.type === "decl")
    .forEach((decl) => {
      const propertyKey = `${decl.prop}\n${decl.important}`;
      if (earlierProperties.has(propertyKey)) desktopRefinementShadowedDeclarationCount += 1;
      currentProperties.add(propertyKey);
    });
  currentProperties.forEach((propertyKey) => earlierProperties.add(propertyKey));
  desktopRefinementPropertiesBySelector.set(selectorContext, earlierProperties);
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
    if (rule.selector.includes('[data-overview-status-bus="control-console-summary-bus-flat-critical-value-rail"]')) {
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
  lines(desktopIncidentStyles) <= 150,
  `desktop incident styles exceed 150 lines: ${lines(desktopIncidentStyles)}`
);
assert(
  (desktopIncidentStyles.match(/!important/g) || []).length === 0,
  "Desktop incident styles must not use override priorities"
);
assert(
  lines(desktopStatusBusStyles) <= 100 &&
    desktopStatusBusStyles.includes(".ro-topbar.ik-home-flat-topbar") &&
    panel.includes('import "./styles/desktop/status-bus.css";'),
  "Desktop status-bus styles must live in the focused component layer"
);
assert(
  lines(desktopWanTrendStyles) <= 120 &&
    desktopWanTrendStyles.includes('[data-overview-density-module="wan-trend"]') &&
    panel.includes('import "./styles/overview-desktop-runtime.css";') &&
    (desktopWanTrendStyles.match(/!important/g) || []).length === 0 &&
    !desktopRefinement.includes('Desktop WAN readable product chart'),
  "Desktop WAN trend styles must stay focused without override priorities"
);
assert(
  (mobileProductShell.match(/!important/g) || []).length === 0 &&
    (mobileNavigationStyles.match(/!important/g) || []).length === 0 &&
    (mobileFrameStyles.match(/!important/g) || []).length === 0 &&
    (mobileCoreStyles.match(/!important/g) || []).length === 0 &&
    (mobileDecisionStyles.match(/!important/g) || []).length === 0 &&
    (mobileSurfaceStyles.match(/!important/g) || []).length === 0,
  "Mobile product shell, frame, core, decision, surface, and navigation must not use override priorities"
);
assert(
  lines(desktopHelpers) <= 450,
  `desktopOverviewHelpers.tsx exceeds 450 lines: ${lines(desktopHelpers)}`
);
assert(
  lines(desktopTrafficRows) <= 280,
  `desktopOverviewTrafficRows.ts exceeds 280 lines: ${lines(desktopTrafficRows)}`
);
assert(
  lines(desktopRouteRows) <= 150,
  `desktopOverviewRouteRows.ts exceeds 150 lines: ${lines(desktopRouteRows)}`
);
assert(
  lines(desktopWanRows) <= 80,
  `desktopOverviewWanRows.tsx exceeds 80 lines: ${lines(desktopWanRows)}`
);
assert(
  lines(desktopInterfaceRows) <= 250,
  `desktopOverviewInterfaceRows.tsx exceeds 250 lines: ${lines(desktopInterfaceRows)}`
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
assert(
  lines(read(desktopBaseStylesFile)) <= 12 &&
    [
      "density.css",
      "first-screen.css",
      "hierarchy.css",
      "evidence.css",
      "console-skeleton.css",
      "layout.css",
      "console-refinement.css",
    ].every((file) => read(desktopBaseStylesFile).includes(`@import \"./desktop/${file}\";`)),
  "Desktop CSS entry must compose named density, hierarchy, evidence, layout, and console layers"
);
const desktopBaseStyleLayerLimits = new Map([
  ["src/panel-framework/overview/styles/desktop/density.css", 900],
  ["src/panel-framework/overview/styles/desktop/first-screen.css", 550],
  ["src/panel-framework/overview/styles/desktop/hierarchy.css", 800],
  ["src/panel-framework/overview/styles/desktop/evidence.css", 650],
  ["src/panel-framework/overview/styles/desktop/console-skeleton.css", 650],
  ["src/panel-framework/overview/styles/desktop/layout.css", 550],
  ["src/panel-framework/overview/styles/desktop/console-refinement.css", 700],
]);
for (const [file, limit] of desktopBaseStyleLayerLimits) {
  assert(exists(file) && lines(read(file)) <= limit, `${file} exceeds ${limit} lines`);
}
assert(
  lines(desktopBaseStyles) <= 4700,
  `overview-desktop.css exceeds 4700 lines: ${lines(desktopBaseStyles)}`
);
assert(
  desktopBaseImportantCount <= 2000,
  `overview-desktop.css important count regressed above 2000: ${desktopBaseImportantCount}`
);
assert(
  desktopBaseShadowedDeclarationCount === 0,
  `overview-desktop.css must not redeclare the same property in a later identical selector context: ${desktopBaseShadowedDeclarationCount}`
);
assert(lines(mobileHome) <= 120, `MobileOverviewHome.tsx exceeds 120 lines: ${lines(mobileHome)}`);
assert(
  !/data-overview-mobile-v\d+|data-overview-mobile-design-token-system/.test(mobileHome),
  "MobileOverviewHome.tsx must not expose versioned or self-certifying design-token attributes"
);
assert(
  lines(mobileDecision) <= 270,
  `MobileOverviewDecision.tsx exceeds 270 lines: ${lines(mobileDecision)}`
);
assert(
  !/ik-v\d+/.test(mobileDecision),
  "Mobile decision card must not inherit legacy hero, chart, or incident classes"
);
assert(
  lines(mobileHomeSections) <= 170,
  `MobileOverviewHomeSections.tsx exceeds 170 lines: ${lines(mobileHomeSections)}`
);
assert(
  mobileHomeSections.includes("ik-mobile-device-status") &&
    mobileHomeSections.includes('className="ik-mobile-core-facts"') &&
    !/className="[^"]*ik-v(?:240|420)-(?:nav|status|facts|strip)/.test(mobileHomeSections) &&
    !/className={`ik-v(?:240|420)-(?:surface|list|app-list|list-row)/.test(mobileHomeSections),
  "Mobile home sections must not inherit legacy navigation, facts, or supporting-list classes"
);
assert(
  lines(mobileTabView) <= 150,
  `MobileOverviewTabView.tsx exceeds 150 lines: ${lines(mobileTabView)}`
);
assert(
  lines(mobileTabRows) <= 150 &&
    mobileTabView.includes('from "./mobileOverviewTabRows"') &&
    ["mobileWanRows", "mobileInterfaceRows", "mobileTerminalRows", "mobileLogRows"].every((name) => mobileTabRows.includes(`function ${name}`)),
  "Mobile detail tabs must keep row extraction outside the React view component"
);
assert(
  mobileBottomTabs.includes('className="ik-mobile-bottom-tabs"') &&
    !/ik-v(?:240|420)-tabs/.test(mobileBottomTabs),
  "Mobile bottom navigation must not inherit legacy desktop tab classes"
);
assert(lines(mobileModel) <= 900, `mobileOverviewModel.ts exceeds 900 lines: ${lines(mobileModel)}`);
assert(!panel.includes("ik-ios-"), "OverviewPanel.tsx reintroduced legacy ik-ios classes");
assert(!panel.includes("ik-mobile-"), "OverviewPanel.tsx reintroduced legacy ik-mobile classes");
assert(
  !/data-overview-desktop-v\d+/.test(panel),
  "OverviewPanel.tsx must not expose versioned desktop acceptance attributes"
);
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
  panel.includes('import "./styles/desktop/incidents.css";'),
  "OverviewPanel.tsx must load the semantic desktop incident layer"
);
assert(
  (panel.match(/\bdata-overview-[\w-]+/g) || []).length <= 12 &&
    !/data-overview-(?:hard-standard|mobile-home-acceptance|no-snapshot-(?:density-contract|content-sized|content-packed|big-wan-rate-guard))/.test(panel),
  "OverviewPanel.tsx must keep root attributes structural or state-derived, not self-certifying release claims"
);
assert(
  desktopHelpers.includes('from "./routerosPresentationViewModel"') &&
    desktopHelpers.includes("buildRouterOsPresentationViewModel"),
  "desktopOverviewHelpers.tsx must consume the RouterOS presentation view model"
);
assert(
  desktopHelpers.includes('return "当前采样";') &&
    !desktopHelpers.includes('return "实时";'),
  "Desktop evidence modules must label healthy observations as current samples, not realtime guarantees"
);
assert(
  lines(routerOsNetworkViewModel) <= 300 &&
    !routerOsNetworkViewModel.includes("buildRouterOsPresentationViewModel"),
  "routerosNetworkViewModel.ts must stay focused on network evidence, not presentation copy"
);
assert(
  lines(routerOsPresentationViewModel) <= 110 &&
    routerOsPresentationViewModel.includes("buildRouterOsPresentationViewModel"),
  "routerosPresentationViewModel.ts must own the bounded desktop presentation policy"
);
assert(
  routerOsPresentationViewModel.includes('return "网络可用";') &&
    routerOsNetworkViewModel.includes('value: "转发可用"'),
  "Desktop presentation must lead with a public network judgement while keeping forwarding availability as evidence"
);
assert(
  !desktopDecisionRail.includes("style={") &&
    desktopBaseStyles.includes('@import "./desktop/decision-rail.css";') &&
    exists("src/panel-framework/overview/styles/desktop/decision-rail.css"),
  "DesktopDecisionRail layout must live in its desktop component stylesheet, not inline JSX"
);
assert(
  desktopConsole.includes('from "../desktopOverviewScenes"') &&
    desktopConsole.includes("buildDesktopOverviewScene(snapshot, state)"),
  "DesktopConsole.tsx must delegate scenario composition to the desktop scene module"
);
assert(
  !/data-overview-desktop-v\d+|data-overview-desktop-redline-markers|data-overview-desktop-fixed-skeleton|data-overview-side-table-mode/.test(desktopConsole),
  "DesktopConsole.tsx must not carry versioned or self-certifying acceptance markers"
);
assert(
  !/data-overview-desktop-v\d+|data-routeros-v\d+/.test(desktopModule),
  "DesktopModule.tsx must expose semantic evidence attributes only"
);
assert(
  !/data-overview-desktop-v\d+|data-overview-(?:status-no-table-header|status-value-rail|topbar-priority-contract|topbar-fixed-six)/.test(statusVerdict) &&
    (statusVerdict.match(/\bdata-overview-[\w-]+/g) || []).length <= 18,
  "StatusVerdict.tsx must keep only structural status-bus roles, not self-certifying layout claims"
);
assert(
  ![desktopRouteRows, desktopWanRows, desktopInterfaceRows].some((source) =>
    /data-overview-desktop-v\d+|data-routeros-v\d+/.test(source)
  ),
  "Desktop route, WAN, and interface row modules must expose semantic evidence attributes only"
);
assert(
  !/data-overview-desktop-v\d+|data-routeros-v\d+/.test(desktopVisuals),
  "desktopOverviewVisuals.tsx must expose semantic visual attributes only"
);
assert(
  mobileModel.includes("resolveMobileIncidentAction") &&
    !mobileModel.includes("function abnormalDecisionNextAction") &&
    !mobileModel.includes("function abnormalDecisionActionNote") &&
    !mobileModel.includes("function abnormalDecisionTargetTab"),
  "mobileOverviewModel.ts must delegate incident action copy and tab targets to the mobile policy module"
);
assert(
  ["查默认出口", "查采集状态", "查接口承载", "查采集通道"].every((copy) =>
    mobilePolicy.includes(copy)
  ),
  "mobileOverviewPolicy.ts must own object-specific incident action copy"
);
assert(
  (desktopConsole.match(/data-overview-/g) || []).length <= 6,
  "DesktopConsole.tsx must keep only structural overview attributes"
);
assert(
  desktopConsole.includes('from "./DesktopDecisionRail"') &&
    desktopConsole.includes("<DesktopDecisionRail"),
  "DesktopConsole.tsx must compose the desktop object/impact/action/credibility rail"
);
assert(
  [
    "desktopOverviewAllOfflineScene",
    "desktopOverviewCollectionScene",
    "desktopOverviewDefaultScene",
    "desktopOverviewInterfaceScene",
    "desktopOverviewNoSnapshotScene",
    "desktopOverviewResourceScene",
  ].every((moduleName) => desktopScenes.includes(`from "./${moduleName}"`)) &&
    ["no-snapshot", "resource-full", "collection-down", "interfaces-down", "all-offline"].every((scenario) =>
      desktopScenes.includes(`case "${scenario}":`)
    ) &&
    desktopScenes.includes("return buildDefaultDesktopScene(snapshot, state);"),
  "desktopOverviewScenes.tsx must dispatch every desktop scenario to an isolated scene module"
);
assert(
  desktopDefaultScene.includes('from "./desktopOverviewVisuals"'),
  "desktopOverviewDefaultScene.tsx must compose the extracted desktop visual layer"
);
assert(
  desktopDefaultScene.includes('from "./desktopOverviewTrafficRows"') &&
    desktopDefaultScene.includes('from "./desktopOverviewRouteRows"') &&
    desktopDefaultScene.includes('from "./desktopOverviewInterfaceRows"') &&
    desktopDefaultScene.includes('from "./desktopOverviewCredibilityRows"') &&
    desktopDefaultScene.includes('from "./desktopOverviewTerminalRows"'),
  "desktopOverviewDefaultScene.tsx must consume the row modules that own its evidence"
);
assert(
  desktopDefaultScene.includes('from "./desktopResourceRows"'),
  "desktopOverviewDefaultScene.tsx must consume the resource evidence row module"
);
assert(
  /module="resource-interface-top5"[^>]*\bcollapsed\b/.test(desktopResourceScene) &&
    /module="normal-ops-ledger"[^>]*\bcollapsed\b/.test(desktopResourceScene),
  "Resource-full desktop scene must defer interface throughput and recent-event ledgers below the resource judgement"
);
assert(
  desktopVisuals.includes('from "./desktopOverviewTrafficRows"'),
  "desktopOverviewVisuals.tsx must consume the traffic row module directly"
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
  ["core.css", "product-shell.css", "frame.css", "decision.css", "surface.css", "incident.css", "navigation.css", "landscape.css"]
    .every((file) => mobileStyles.includes(`@import "./${file}";`)),
  "Mobile build-time CSS must use semantic component layers"
);
assert(
  !mobileHome.includes("MobileOverviewStyles") &&
    !mobileHome.includes("useInsertionEffect") &&
    mobileHome.includes('import "../styles/mobile/mobile-product.css";'),
  "Mobile home must use build-time CSS without runtime style injection"
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
  desktopRefinementImportantCount <= 650,
  `Desktop refinement !important count regressed above 650: ${desktopRefinementImportantCount}`
);
assert(
  desktopRefinementShadowedDeclarationCount === 0,
  `Desktop refinement must not redeclare the same property in a later identical selector context: ${desktopRefinementShadowedDeclarationCount}`
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
  !mobileStyles.includes("foundation") && !mobileStyles.includes("repair"),
  "Mobile CSS entry reintroduced chronological patch layers"
);
const mobileStyleLayerFiles = [
  "src/panel-framework/overview/styles/mobile/core.css",
  "src/panel-framework/overview/styles/mobile/frame.css",
  "src/panel-framework/overview/styles/mobile/decision.css",
  "src/panel-framework/overview/styles/mobile/surface.css",
  "src/panel-framework/overview/styles/mobile/product-shell.css",
  "src/panel-framework/overview/styles/mobile/incident.css",
  "src/panel-framework/overview/styles/mobile/navigation.css",
  "src/panel-framework/overview/styles/mobile/landscape.css",
];
const mobileStyleLineLimits = new Map([
  ["src/panel-framework/overview/styles/mobile/core.css", 80],
  ["src/panel-framework/overview/styles/mobile/frame.css", 100],
  ["src/panel-framework/overview/styles/mobile/decision.css", 330],
  ["src/panel-framework/overview/styles/mobile/surface.css", 220],
  ["src/panel-framework/overview/styles/mobile/product-shell.css", 320],
  ["src/panel-framework/overview/styles/mobile/incident.css", 120],
  ["src/panel-framework/overview/styles/mobile/navigation.css", 80],
  ["src/panel-framework/overview/styles/mobile/landscape.css", 80],
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
}
assert(
  mobileStyleByteTotal <= 50000,
  `Mobile overview style layers exceed 50 KB: ${mobileStyleByteTotal}`
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
  assert(bytes(builtCssFile) <= 500000, `Built style.css exceeds 500 KB: ${bytes(builtCssFile)}`);
  assert(
    builtLegacyIosSelectorCount === 0,
    `Built style.css contains ${builtLegacyIosSelectorCount} legacy ik-ios selector rules`
  );
  assert(
    builtLegacyMobileSelectorCount > 0 && builtLegacyMobileSelectorCount <= 220,
    `Built style.css mobile selector budget must stay within 1..220 rules: ${builtLegacyMobileSelectorCount}`
  );
}

if (failures.length > 0) {
  console.error("overview architecture gate: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `overview architecture gate: PASS panel=${lines(panel)} lines desktop=${lines(desktopConsole)} lines desktopDecision=${lines(desktopDecisionRail)} lines scenes=${lines(desktopScenes)} lines helper=${lines(desktopHelpers)} lines trafficRows=${lines(desktopTrafficRows)} lines routeRows=${lines(desktopRouteRows)} lines wanRows=${lines(desktopWanRows)} lines interfaceRows=${lines(desktopInterfaceRows)} lines credibilityRows=${lines(desktopCredibilityRows)} lines terminalRows=${lines(desktopTerminalRows)} lines resourceRows=${lines(desktopResourceRows)} lines visuals=${lines(desktopVisuals)} lines mobileHome=${lines(mobileHome)} lines mobileDecision=${lines(mobileDecision)} lines mobileSections=${lines(mobileHomeSections)} lines mobileTabView=${lines(mobileTabView)} lines mobileTabRows=${lines(mobileTabRows)} lines css=${bytes(panelCssFile)} bytes desktopBase=${lines(desktopBaseStyles)} lines desktopBaseImportant=${desktopBaseImportantCount} mobileStyles=${mobileStyleByteTotal} bytes important=${importantShare.toFixed(4)} desktopImportant=${desktopRefinementImportantCount} decisionRailRules=${desktopDecisionRailRuleCount} decisionCellRules=${desktopDecisionCellRuleCount} workspaceGridRules=${desktopWorkspaceGridRuleCount} navRules=${desktopNavRuleCount} statusBusRules=${desktopStatusBusRuleCount} legacyTopbarRules=${desktopLegacyTopbarRuleCount} moduleShellRules=${desktopModuleShellRuleCount} moduleHeadRules=${desktopModuleHeadRuleCount} ledgerRules=${desktopLedgerRuleCount} moduleToneRules=${desktopModuleToneRuleCount} ledgerToneRules=${desktopLedgerToneRuleCount} ledgerToneShadows=${desktopLedgerToneShadowCount} releaseToneResets=${desktopReleaseToneResetCount} releaseNonPrimary=${desktopReleaseNonPrimaryNeutralCount} mobile=${mobileRuleShare.toFixed(4)}`
);
