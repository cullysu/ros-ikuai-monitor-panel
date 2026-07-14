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
  return text.split(/\r\n|\r|\n/).length;
}

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

const panelFile = "src/panel-framework/overview/OverviewPanel.tsx";
const panelCssFile = "src/panel-framework/overview/OverviewPanel.css";
const desktopBaseStylesFile =
  "src/panel-framework/overview/styles/overview-desktop.css";
const desktopConsoleRefinementStylesFile =
  "src/panel-framework/overview/styles/desktop/console-refinement.css";
const desktopDensityStylesFile =
  "src/panel-framework/overview/styles/desktop/density.css";
const desktopShellChromeStylesFile =
  "src/panel-framework/overview/styles/desktop/shell-chrome.css";
const desktopBaseStyleLayerFiles = [
  desktopBaseStylesFile,
  desktopDensityStylesFile,
  "src/panel-framework/overview/styles/desktop/first-screen.css",
  "src/panel-framework/overview/styles/desktop/hierarchy.css",
  desktopShellChromeStylesFile,
  "src/panel-framework/overview/styles/desktop/evidence.css",
  "src/panel-framework/overview/styles/desktop/console-skeleton.css",
  "src/panel-framework/overview/styles/desktop/layout.css",
  desktopConsoleRefinementStylesFile,
];
const retiredDesktopWorkspaceOwnerFiles = [
  "src/panel-framework/overview/styles/desktop/console-skeleton.css",
  "src/panel-framework/overview/styles/desktop/layout.css",
  desktopConsoleRefinementStylesFile,
  desktopDensityStylesFile,
  "src/panel-framework/overview/styles/desktop/hierarchy.css",
  "src/panel-framework/overview/styles/desktop/hierarchy-layout.css",
];
const overviewRetiredTopbarStyleFiles = [
  "src/panel-framework/overview/styles/overview-states.css",
  "src/panel-framework/overview/styles/desktop/density.css",
  "src/panel-framework/overview/styles/desktop/first-screen.css",
  "src/panel-framework/overview/styles/desktop/hierarchy.css",
  "src/panel-framework/overview/styles/desktop/shell-chrome.css",
  "src/panel-framework/overview/styles/desktop/evidence.css",
  "src/panel-framework/overview/styles/desktop/console-skeleton.css",
  "src/panel-framework/overview/styles/desktop/layout.css",
  "src/panel-framework/overview/styles/desktop/hierarchy-layout.css",
  "src/panel-framework/overview/styles/desktop/release.css",
];
const overviewRetiredDesktopKeyRowStyleFiles = [
  "src/panel-framework/overview/styles/overview-states.css",
  "src/panel-framework/overview/styles/desktop/console-refinement.css",
  "src/panel-framework/overview/styles/desktop/console-skeleton.css",
  "src/panel-framework/overview/styles/desktop/evidence.css",
  "src/panel-framework/overview/styles/desktop/first-screen.css",
  "src/panel-framework/overview/styles/desktop/hierarchy.css",
  "src/panel-framework/overview/styles/desktop/layout.css",
  "src/panel-framework/overview/styles/desktop/refinement.css",
];
const overviewRetiredTimeTabStyleFiles = [
  "src/panel-framework/overview/styles/overview-states.css",
  "src/panel-framework/overview/styles/desktop/console-skeleton.css",
  "src/panel-framework/overview/styles/desktop/hierarchy.css",
];
const overviewRetiredSidebarMiniStatusStyleFiles = [
  "src/panel-framework/overview/styles/desktop/first-screen.css",
  "src/panel-framework/overview/styles/desktop/hierarchy.css",
  "src/panel-framework/overview/styles/desktop/console-skeleton.css",
  "src/panel-framework/overview/styles/desktop/layout.css",
  "src/panel-framework/overview/styles/desktop/refinement.css",
];
const desktopRefinementFile =
  "src/panel-framework/overview/styles/desktop/refinement.css";
const desktopRuntimeStylesFile =
  "src/panel-framework/overview/styles/overview-desktop-runtime.css";
const desktopWorkspaceLayoutFile =
  "src/panel-framework/overview/styles/desktop/workspace-layout.css";
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
const desktopDecisionRailStylesFile =
  "src/panel-framework/overview/styles/desktop/decision-rail.css";
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
const desktopPresentationFile =
  "src/panel-framework/overview/desktopOverviewPresentation.ts";
const desktopTopbarFile =
  "src/panel-framework/overview/desktopOverviewTopbar.ts";
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
const routerMobileAppFile =
  "src/panel-framework/overview/mobile-app/RouterMobileApp.tsx";
const routerMobileScreensFile =
  "src/panel-framework/overview/mobile-app/RouterMobileScreens.tsx";
const routerMobileModelFile =
  "src/panel-framework/overview/mobile-app/routerMobileModel.ts";
const routerMobileStylesFile =
  "src/panel-framework/overview/mobile-app/styles/router-mobile-app.css";
const routerMobileDetailStylesFile =
  "src/panel-framework/overview/mobile-app/styles/router-mobile-detail.css";
const overviewStatesStylesFile =
  "src/panel-framework/overview/styles/overview-states.css";
const panel = read(panelFile);
const desktopConsole = read(desktopConsoleFile);
const desktopDecisionRail = read(desktopDecisionRailFile);
const desktopDecisionRailStyles = read(desktopDecisionRailStylesFile);
const desktopModule = read(desktopModuleFile);
const statusVerdict = read(statusVerdictFile);
const desktopScenes = read(desktopScenesFile);
const desktopDefaultScene = read(desktopDefaultSceneFile);
const desktopResourceScene = read(desktopResourceSceneFile);
const panelCss = read(panelCssFile);
const desktopBaseStyles = desktopBaseStyleLayerFiles.map(read).join("\n");
const desktopConsoleRefinementStyles = read(desktopConsoleRefinementStylesFile);
const desktopDensityStyles = read(desktopDensityStylesFile);
const desktopShellChromeStyles = read(desktopShellChromeStylesFile);
const desktopEvidenceStyles = read("src/panel-framework/overview/styles/desktop/evidence.css");
const desktopHierarchyLayout = read("src/panel-framework/overview/styles/desktop/hierarchy-layout.css");
const desktopRefinement = read(desktopRefinementFile);
const desktopRuntimeStyles = read(desktopRuntimeStylesFile);
const desktopWorkspaceLayout = read(desktopWorkspaceLayoutFile);
const desktopRelease = read(desktopReleaseFile);
const desktopIncidentStyles = read(desktopIncidentStylesFile);
const desktopStatusBusStyles = read(desktopStatusBusStylesFile);
const desktopWanTrendStyles = read(desktopWanTrendStylesFile);
const desktopSelectorOwnershipStyles = [
  "src/panel-framework/overview/styles/overview-states.css",
  "src/panel-framework/overview/styles/desktop/console-refinement.css",
  "src/panel-framework/overview/styles/desktop/density.css",
  "src/panel-framework/overview/styles/desktop/evidence.css",
  "src/panel-framework/overview/styles/desktop/hierarchy.css",
  "src/panel-framework/overview/styles/desktop/layout.css",
  "src/panel-framework/overview/styles/desktop/refinement.css",
  "src/panel-framework/overview/styles/desktop/release.css",
  "src/panel-framework/overview/styles/desktop/status-bus.css",
  "src/panel-framework/overview/styles/desktop/wan-trend.css",
  "src/panel-framework/overview/styles/desktop/workspace-layout.css",
]
  .map(read)
  .join("\n");
const desktopHelpers = read(desktopHelpersFile);
const desktopPresentation = read(desktopPresentationFile);
const desktopTopbar = read(desktopTopbarFile);
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
const routerMobileApp = read(routerMobileAppFile);
const routerMobileScreens = read(routerMobileScreensFile);
const routerMobileModel = read(routerMobileModelFile);
const routerMobileStyles = read(routerMobileStylesFile);
const routerMobileDetailStyles = read(routerMobileDetailStylesFile);
const routerMobileStyleBundle = `${routerMobileStyles}\n${routerMobileDetailStyles}`;
const overviewStatesStyles = read(overviewStatesStylesFile);
const cssRoot = postcss.parse(panelCss, { from: panelCssFile });
const desktopBaseStylesRoot = postcss.parse(desktopBaseStyles, {
  from: desktopBaseStylesFile,
});
const desktopRefinementRoot = postcss.parse(desktopRefinement, {
  from: desktopRefinementFile,
});
const desktopRuntimeStructureRoot = postcss.parse(
  `${desktopRefinement}\n${desktopWorkspaceLayout}`,
  { from: desktopRuntimeStylesFile }
);
const desktopReleaseRoot = postcss.parse(desktopRelease, {
  from: desktopReleaseFile,
});
const desktopDecisionRailRoot = postcss.parse(desktopDecisionRailStyles, {
  from: desktopDecisionRailStylesFile,
});
const desktopStatusBusRoot = postcss.parse(desktopStatusBusStyles, {
  from: desktopStatusBusStylesFile,
});
const desktopShellChromeRoot = postcss.parse(desktopShellChromeStyles, {
  from: desktopShellChromeStylesFile,
});
let declarationCount = 0;
let importantCount = 0;
let ruleCount = 0;
let mobileRuleCount = 0;
let legacyIosSelectorCount = 0;
let legacyMobileSelectorCount = 0;
let versionMarkerCount = 0;
let desktopRefinementImportantCount = 0;
let desktopWorkspaceLayoutImportantCount = 0;
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
const desktopImpossibleShellDescendantCount = (
  desktopBaseStyles.match(/\.router-overview-framework \.(?:sidebar|topbar|frame|ik-rail)/g) || []
).length;
let desktopDecisionRailRuleCount = 0;
let desktopDecisionCellRuleCount = 0;
let desktopWorkspaceGridRuleCount = 0;
let desktopRefinementWorkspaceGridRuleCount = 0;
let retiredDesktopWorkspaceRootDeclarationCount = 0;
let desktopNavRuleCount = 0;
let desktopStatusBusRuleCount = 0;
let desktopLegacyTopbarRuleCount = 0;
let desktopLegacyRootRuleCount = 0;
let desktopModuleShellRuleCount = 0;
let desktopModuleHeadRuleCount = 0;
let desktopLedgerRuleCount = 0;
let desktopModuleToneRuleCount = 0;
let desktopLedgerToneRuleCount = 0;
let desktopLedgerToneShadowCount = 0;
let desktopModuleChromeLeftBorderDeclarationCount = 0;
let desktopReleaseToneResetCount = 0;
let desktopReleaseNonPrimaryNeutralCount = 0;
let desktopSidebarMiniStatusRuleCount = 0;
let desktopSidebarMiniStatusImportantCount = 0;

desktopShellChromeRoot.walkRules((rule) => {
  if (!rule.selector.includes(".ik-sidebar-mini-status")) return;
  desktopSidebarMiniStatusRuleCount += 1;
  rule.walkDecls((decl) => {
    if (decl.important) desktopSidebarMiniStatusImportantCount += 1;
  });
});
const retiredSidebarMiniStatusSelectorCount = overviewRetiredSidebarMiniStatusStyleFiles
  .map(read)
  .reduce(
    (count, styles) => count + (styles.match(/\.ik-sidebar-mini-status/g) || []).length,
    0
  );
const overviewStateSidebarMiniStatusSelectorCount = (
  read("src/panel-framework/overview/styles/overview-states.css").match(/\.ik-sidebar-mini-status/g) || []
).length;

for (const file of retiredDesktopWorkspaceOwnerFiles) {
  const root = postcss.parse(read(file), { from: file });
  root.walkRules((rule) => {
    const ownsBaseWorkspace = rule.selector
      .split(",")
      .map((selector) => selector.trim())
      .some(
        (selector) =>
          !selector.includes("[data-overview-desktop-scene") &&
          !selector.includes("[data-overview-scene-key") &&
          /\.ro-desktop-grid(?:\.ik-home-layout)?(?:\.ik-desktop-workspace)?$/.test(selector)
      );
    if (!ownsBaseWorkspace) return;
    rule.walkDecls((decl) => {
      if (
        [
          "display",
          "grid-template-columns",
          "grid-template-areas",
          "grid-template-rows",
          "gap",
          "align-content",
          "align-items",
          "height",
          "min-height",
          "overflow",
        ].includes(decl.prop)
      ) {
        retiredDesktopWorkspaceRootDeclarationCount += 1;
      }
    });
  });
}

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
postcss.parse(desktopWorkspaceLayout, { from: desktopWorkspaceLayoutFile }).walkDecls((decl) => {
  if (decl.important) desktopWorkspaceLayoutImportantCount += 1;
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
  if (
    rule.selector
      .split(",")
      .some((selector) => selector.trim().endsWith(".ro-desktop-grid"))
  ) {
    desktopRefinementWorkspaceGridRuleCount += 1;
  }
});
desktopRuntimeStructureRoot.walkRules((rule) => {
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
  if (rule.selector.includes("flat-dense-readonly-console")) {
    desktopLegacyRootRuleCount += 1;
  }
  if (rule.selector.includes(".ro-topbar")) {
    desktopLegacyTopbarRuleCount += 1;
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
[desktopBaseStylesRoot, desktopRuntimeStructureRoot].forEach((root) => {
  root.walkRules((rule) => {
    const ownsModuleChrome = rule.selector.split(",").some((selector) => {
      const trimmed = selector.trim();
      const moduleIndex = trimmed.lastIndexOf(".ro-module");
      return moduleIndex >= 0 && !/\s/.test(trimmed.slice(moduleIndex + ".ro-module".length));
    });
    if (!ownsModuleChrome) return;
    rule.walkDecls((decl) => {
      if (decl.prop.startsWith("border-left")) {
        desktopModuleChromeLeftBorderDeclarationCount += 1;
      }
    });
  });
});
desktopDecisionRailRoot.walkRules((rule) => {
  if (rule.selector.trim().endsWith(".ro-desktop-decision-rail")) {
    desktopDecisionRailRuleCount += 1;
  }
  if (rule.selector.includes(".ro-desktop-decision-rail .ro-desktop-thin-kpi")) {
    desktopDecisionCellRuleCount += 1;
  }
});
desktopStatusBusRoot.walkRules((rule) => {
  if (rule.selector.includes(".ro-status-bus")) {
    desktopStatusBusRuleCount += 1;
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
  lines(desktopStatusBusStyles) <= 130 &&
    desktopStatusBusStyles.includes(".ro-status-bus") &&
    panel.includes('import "./styles/desktop/status-bus.css";') &&
    !desktopRefinement.includes(".ro-status-bus") &&
    !desktopConsoleRefinementStyles.includes(".ro-topbar"),
  "Desktop status bus must have one canonical component layer, not a refinement shadow"
);
assert(
  lines(desktopWanTrendStyles) <= 120 &&
    desktopWanTrendStyles.includes('[data-overview-density-module="wan-trend"]') &&
    panel.includes('import "./styles/overview-desktop-runtime.css";') &&
    (desktopWanTrendStyles.match(/!important/g) || []).length === 0 &&
    desktopDensityStyles.includes('.ro-module:not([data-overview-density-module="wan-trend"]) .ro-judgement-row') &&
    desktopRefinement.includes('.ro-module:not([data-overview-density-module="wan-trend"]) .ro-judgement-chart') &&
    desktopRefinement.includes('.ro-module:not([data-overview-density-module="wan-trend"]) .ro-judgement-row') &&
    !/ro-col\.is-main > \.ro-module(?::first-child)?\s*\{[^}]*max-height/.test(desktopEvidenceStyles) &&
    !desktopHierarchyLayout.includes('data-overview-density-module="wan-trend"') &&
    !desktopRefinement.includes('Desktop WAN readable product chart'),
  "Desktop WAN trend styles must stay focused without override priorities"
);
assert(
  (routerMobileStyleBundle.match(/!important/g) || []).length === 0 &&
    !/ik-v\d+|\.ik-mobile-|\.ro-/.test(routerMobileStyleBundle),
  "Router mobile stylesheet must remain isolated and must not use override priorities"
);
assert(
  lines(desktopHelpers) <= 320,
  `desktopOverviewHelpers.tsx exceeds 320 lines: ${lines(desktopHelpers)}`
);
assert(
  lines(desktopTopbar) <= 130 &&
    (desktopTopbar.match(/desktopPresentation\(/g) || []).length === 1 &&
    statusVerdict.includes('from "../desktopOverviewTopbar"'),
  "Desktop status-bus presentation must be isolated and build the view model once"
);
assert(
  lines(desktopPresentation) <= 12 &&
    desktopPresentation.includes("buildRouterOsPresentationViewModel") &&
    !desktopHelpers.includes("buildRouterOsPresentationViewModel") &&
    desktopDecisionRail.includes('from "../desktopOverviewPresentation"') &&
    desktopVisuals.includes('from "./desktopOverviewPresentation"'),
  "Desktop presentation access must stay in one adapter shared by verdict, rail, and visuals"
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
      "shell-chrome.css",
      "evidence.css",
      "console-skeleton.css",
      "layout.css",
      "console-refinement.css",
    ].every((file) => read(desktopBaseStylesFile).includes(`@import \"./desktop/${file}\";`)),
  "Desktop CSS entry must compose named density, hierarchy, evidence, layout, and console layers"
);
assert(
  !/\b(?:ik-v\d+|ik-app-home-v\d+)\b/.test(
    read("src/panel-framework/overview/styles/desktop/hierarchy.css")
  ),
  "Desktop hierarchy styles must not retain versioned mobile containment patches"
);
assert(
  !read("src/panel-framework/overview/styles/desktop/hierarchy.css").includes(
    "flat-dense-readonly-console"
  ),
  "Desktop hierarchy source must not retain archived flat-dense root styles"
);
assert(
  overviewRetiredTopbarStyleFiles.every(
    (file) => !/\.ro-topbar(?:-cell)?\b|\.ik-home-flat-topbar\b/.test(read(file))
  ),
  "Overview style sources must not retain selectors for the retired topbar renderer"
);
assert(
  overviewRetiredDesktopKeyRowStyleFiles.every(
    (file) => !/\.ro-desktop-(?:key-row|key-cell|severe-evidence)\b/.test(read(file))
  ),
  "Overview style sources must not retain selectors for retired desktop key-row or key-cell renderers"
);
assert(
  overviewRetiredTimeTabStyleFiles.every(
    (file) => !/\.ro-time-tabs\b/.test(read(file))
  ),
  "Overview style sources must not retain selectors for the retired time-tab renderer"
);
const desktopBaseStyleLayerLimits = new Map([
  ["src/panel-framework/overview/styles/desktop/density.css", 900],
  ["src/panel-framework/overview/styles/desktop/first-screen.css", 550],
  ["src/panel-framework/overview/styles/desktop/hierarchy.css", 800],
  ["src/panel-framework/overview/styles/desktop/shell-chrome.css", 140],
  ["src/panel-framework/overview/styles/desktop/evidence.css", 650],
  ["src/panel-framework/overview/styles/desktop/console-skeleton.css", 650],
  ["src/panel-framework/overview/styles/desktop/layout.css", 550],
  ["src/panel-framework/overview/styles/desktop/console-refinement.css", 700],
]);
for (const [file, limit] of desktopBaseStyleLayerLimits) {
  assert(exists(file) && lines(read(file)) <= limit, `${file} exceeds ${limit} lines`);
}
assert(
  !desktopShellChromeStyles.includes("!important") &&
    !desktopShellChromeStyles.includes(".ro-col.is-main > .ro-module:first-child") &&
    !desktopShellChromeStyles.includes("data-overview-density-module"),
  "Desktop shell chrome must own only shell and scrollbar styling, without evidence or module overrides"
);
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
assert(lines(routerMobileApp) <= 100, `RouterMobileApp.tsx exceeds 100 lines: ${lines(routerMobileApp)}`);
assert(lines(routerMobileScreens) <= 180, `RouterMobileScreens.tsx exceeds 180 lines: ${lines(routerMobileScreens)}`);
assert(lines(routerMobileModel) <= 520, `routerMobileModel.ts exceeds 520 lines: ${lines(routerMobileModel)}`);
assert(lines(routerMobileStyles) <= 800, `router-mobile-app.css exceeds 800 lines: ${lines(routerMobileStyles)}`);
assert(lines(routerMobileDetailStyles) <= 220, `router-mobile-detail.css exceeds 220 lines: ${lines(routerMobileDetailStyles)}`);
assert(
  routerMobileApp.includes('className="rm-app"') &&
    routerMobileApp.includes('className="rm-header"') &&
    !routerMobileApp.includes('className="rm-tabbar"') &&
    !routerMobileApp.includes('RouterMobileTab'),
  "RouterMobileApp must own an isolated single-surface app shell without bottom tabs"
);
assert(
  routerMobileScreens.includes('className="rm-verdict"') &&
    routerMobileScreens.includes('className="rm-metric-ledger"') &&
    routerMobileScreens.includes('className="rm-traffic"') &&
    routerMobileScreens.includes('className="rm-trust-rail"') &&
    routerMobileScreens.includes('className="rm-evidence"'),
  "Router mobile screens must expose verdict, metrics, truthful traffic, integrated trust, and evidence regions"
);
assert(
  desktopConsole.includes("ik-desktop-workspace") &&
    desktopConsole.includes("ik-desktop-evidence") &&
    !/data-overview-desktop-(?:hierarchy|hierarchy-tier|detail|workspace)/.test(desktopConsole) &&
    !desktopConsole.includes("data-overview-no-snapshot-detail"),
  "Desktop workspace must expose semantic structure, not self-certifying hierarchy attributes"
);
assert(!panel.includes("ik-ios-"), "OverviewPanel.tsx reintroduced legacy ik-ios classes");
assert(!panel.includes("ik-mobile-"), "OverviewPanel.tsx reintroduced legacy ik-mobile classes");
assert(
  panel.includes('from "./mobile-app/RouterMobileApp"') &&
    panel.includes("useMobileOverview") &&
    panel.includes("router-mobile-app-mount") &&
    panel.includes("{mobile ? (") &&
    panel.includes("<DesktopWorkspace snapshot={snapshot} state={state} />"),
  "OverviewPanel must conditionally mount the isolated mobile app instead of hiding duplicate desktop DOM"
);
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
  panel.includes(
    'mobile ? "is-mobile-product" : "ro-desktop-console ro-desktop-hierarchy"'
  ) &&
    !/data-overview-(?:ikuai40-density|desktop-hierarchy-contract)/.test(panel) &&
    !/data-overview-(?:ikuai40-density|desktop-hierarchy-contract)/.test(
      desktopSelectorOwnershipStyles
    ),
  "Desktop selector ownership must use semantic desktop-only classes, not self-certifying root attributes"
);
assert(
  desktopTopbar.includes("buildRouterOsNetworkViewModel(snapshot, state)") &&
    desktopTopbar.includes("desktopPresentation(snapshot, state, network)") &&
    desktopPresentation.includes("buildRouterOsPresentationViewModel(snapshot, state, network)"),
  "Desktop topbar must build the RouterOS network model once and share it with its presentation adapter"
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
  routerOsPresentationViewModel.includes('return "WAN 出口在线";') &&
    routerOsNetworkViewModel.includes('value: "转发可用"'),
  "Desktop presentation must lead with a factual WAN judgement while keeping forwarding availability as evidence"
);
assert(
  !desktopDecisionRail.includes("style={") &&
    panel.includes('import "./styles/desktop/decision-rail.css";') &&
    panel.indexOf('import "./styles/desktop/decision-rail.css";') >
      panel.indexOf('import "./styles/desktop/status-bus.css";') &&
    !desktopBaseStyles.includes('@import "./desktop/decision-rail.css";') &&
    !desktopDecisionRailStyles.includes("!important"),
  "DesktopDecisionRail must own a final component layer without inline styles or !important"
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
  !/data-overview-desktop-v\d+|data-overview-(?:summary|status-bus|verdict-status-bus|status-bar|summary-main|desktop-top|status-cell-contract|status-no-table-header|status-value-rail|topbar-priority-contract|topbar-fixed-six)/.test(statusVerdict) &&
  statusVerdict.includes('className={`ro-status-bus ${') &&
    statusVerdict.includes('"is-channel-audit" : "is-summary"') &&
    statusVerdict.includes('className={`ro-status-cell is-${item.role}`}') &&
    !statusVerdict.includes("data-overview-status-role") &&
    !statusVerdict.includes("ro-topbar") &&
    !statusVerdict.includes("ik-home-flat") &&
    !statusVerdict.includes("ro-contract-hidden") &&
    (statusVerdict.match(/\bdata-overview-[\w-]+/g) || []).length <= 18,
  "StatusVerdict.tsx must use semantic status-bus classes, not self-certifying layout claims"
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
  [
    "data-overview-chart-grammar",
    "data-overview-chart-semantic",
    "data-overview-chart-judgement-contract",
    "data-overview-plot-contract",
    "data-overview-chart-raw-fields",
    "data-overview-chart-summary",
    "data-overview-chart-judgement-visible",
    "data-overview-chart-judgement-strip",
    "data-overview-chart-judgement-strip-visible",
    "data-overview-mobile-first-chart-readout",
    "data-overview-desktop-wan-integrated",
    "data-overview-ikuai-wan-chart-integrated",
    "data-overview-desktop-chart-product-contract",
    "data-overview-wan-integrated-chart",
    "data-overview-wan-chart-contract",
    "data-overview-wan-single-surface",
    "data-overview-wan-decision-rail",
    "data-overview-wan-decision-source",
    "data-overview-wan-decision",
    "data-overview-desktop-wan-top-outlet",
    "data-overview-chart-has-current",
    "data-overview-chart-has-peak",
    "data-overview-chart-has-mean",
    "data-overview-chart-has-window",
    "data-overview-chart-has-threshold",
    "data-overview-chart-has-trust",
    "data-overview-y-axis",
    "data-overview-chart-focus",
    "data-overview-collection-channel-bars",
    "data-overview-collection-matrix",
    "data-overview-desktop-incident-summary",
    "data-overview-matrix-evidence",
    "data-overview-no-snapshot-collection-timeline-parent-judgement",
    "data-overview-no-snapshot-compact-flow",
    "data-overview-no-snapshot-four-col-matrix",
    "data-overview-no-snapshot-module-matrix-parent-judgement",
    "data-overview-no-snapshot-success-timeline",
    "data-overview-collection-incident-timeline-parent-judgement",
    "data-overview-resource-danger-card-judgement",
    "data-overview-resource-danger-order-bars",
    "data-overview-resource-primary-pressure",
    "data-overview-resource-spark-row-judgement",
    "data-overview-traffic-judgement",
    "data-overview-trend-readout",
  ].every((attribute) => !desktopVisuals.includes(attribute)) &&
    desktopVisuals.includes('className="ro-wan-integrated-visual"') &&
    desktopVisuals.includes('className="ro-wan-integrated-decision"'),
  "Desktop visuals must prove chart structure through semantic classes and rendered data, not product-contract attributes"
);
assert(
  ["fleet", "all-offline", "no-snapshot", "collection-down", "resource-full", "interfaces-down"].every((scenario) =>
    routerMobileModel.includes(`"${scenario}"`)
  ) && routerMobileModel.includes("default:") && routerMobileModel.includes("buildRouterMobileModel"),
  "Router mobile model must map every required scenario into the isolated mobile contract"
);
assert(
  routerMobileModel.includes('snapshotLabel: "当前快照" | "缓存快照" | "仅仪表状态"') &&
    routerMobileModel.includes('{ status: "缓存快照", tone: "degraded" }') &&
    routerMobileModel.includes('当前仅能参考缓存快照') &&
    routerMobileApp.includes('data-tone={model.device.tone}'),
  "Router mobile chrome must distinguish network state from current versus cached collection evidence"
);
assert(
  routerMobileStyles.includes("grid-template-rows: auto minmax(0, 1fr);") &&
    routerMobileStyles.includes("padding: calc(8px + env(safe-area-inset-top)) 14px 8px;") &&
    routerMobileStyles.includes("padding: 10px 12px calc(14px + env(safe-area-inset-bottom));") &&
    !/\.rm-header\s*\{[^}]*position:\s*absolute/s.test(routerMobileStyles) &&
    !/\.rm-content\s*\{[^}]*position:\s*absolute/s.test(routerMobileStyles),
  "Router mobile safe areas must expand layout flow instead of overlapping a fixed content offset"
);
assert(
  lines(overviewStatesStyles) <= 2700 &&
    !overviewStatesStyles.includes("ik-app-home-v") &&
    !overviewStatesStyles.includes("ik-ios-router-home") &&
    !overviewStatesStyles.includes("ik-v214-app") &&
    !overviewStatesStyles.includes("Mobile overview v"),
  "Retired mobile app CSS must not return to the shared overview state layer"
);
assert(
  routerMobileModel.includes('source: "history"') &&
    routerMobileModel.includes('source: "snapshot"') &&
    routerMobileModel.includes('source: "unavailable"') &&
    routerMobileScreens.includes('trend.source === "unavailable"') &&
    routerMobileScreens.includes('data-router-mobile-traffic={trend.source}'),
  "Router mobile traffic must distinguish measured history, single snapshot, and hidden unavailable data"
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
  desktopDefaultScene.includes('minRows={0} collapsed />') &&
    desktopDefaultScene.includes("bottom: [") &&
    desktopDefaultScene.includes("terminalRanking,") &&
    /module="normal-collection-channel"[^>]*\bcollapsed\b/.test(desktopDefaultScene) &&
    !desktopDefaultScene.includes("isFleet ? null : terminalRanking") &&
    !desktopBaseStyles.includes('.ro-col.is-bottom [data-overview-density-module="terminal-ranking"]'),
  "Normal desktop scenes must defer a visible collapsed terminal ranking below the decision modules"
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
  routerMobileApp.includes('import "./styles/router-mobile-app.css";') &&
    routerMobileApp.includes('import "./styles/router-mobile-detail.css";') &&
    !routerMobileApp.includes("useInsertionEffect") &&
    !routerMobileApp.includes("style>") &&
    !/\b(?:ro|ik-mobile|ik-ios)-/.test(`${routerMobileApp}\n${routerMobileScreens}\n${routerMobileModel}\n${routerMobileStyleBundle}`),
  "Router mobile app must use isolated build-time stylesheets and no legacy desktop/mobile namespace"
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
  lines(desktopWorkspaceLayout) <= 220 &&
    desktopRuntimeStyles.indexOf('@import "./desktop/refinement.css";') >= 0 &&
    desktopRuntimeStyles.indexOf('@import "./desktop/workspace-layout.css";') >
      desktopRuntimeStyles.indexOf('@import "./desktop/refinement.css";') &&
    desktopRuntimeStyles.indexOf('@import "./desktop/wan-trend.css";') >
      desktopRuntimeStyles.indexOf('@import "./desktop/workspace-layout.css";') &&
    desktopRefinementWorkspaceGridRuleCount === 0,
  `Desktop workspace layout must own the canonical grid after refinement: lines=${lines(desktopWorkspaceLayout)} refinementGridRules=${desktopRefinementWorkspaceGridRuleCount}`
);
assert(
  desktopWorkspaceLayout.includes("align-items: stretch;") &&
    desktopWorkspaceLayout.includes("align-self: stretch;") &&
    !desktopWorkspaceLayout.includes(".ro-module:only-child"),
  "Normal desktop primary modules must fill their grid column without single-child layout patches"
);
assert(
  desktopWorkspaceLayoutImportantCount === 0,
  `Desktop workspace layout must not use override priorities: ${desktopWorkspaceLayoutImportantCount}`
);
assert(
  desktopRefinementShadowedDeclarationCount === 0,
  `Desktop refinement must not redeclare the same property in a later identical selector context: ${desktopRefinementShadowedDeclarationCount}`
);
assert(
  desktopDecisionRailRuleCount === 1 && desktopDecisionCellRuleCount <= 7 &&
    !desktopConsoleRefinementStyles.includes(".ro-desktop-thin-kpi") &&
    !desktopDensityStyles.includes(".ro-desktop-thin-kpi") &&
    !desktopRefinement.includes(".ro-desktop-thin-kpi"),
  `Desktop decision rail must stay consolidated: railRules=${desktopDecisionRailRuleCount} cellRules=${desktopDecisionCellRuleCount}`
);
assert(
  desktopWorkspaceGridRuleCount === 1 && desktopNavRuleCount === 0,
  `Desktop workspace grid must stay canonical and must not duplicate shell navigation: gridRules=${desktopWorkspaceGridRuleCount} navRules=${desktopNavRuleCount}`
);
assert(
  desktopImpossibleShellDescendantCount === 0,
  `Overview styles must not claim sibling shell nodes: ${desktopImpossibleShellDescendantCount}`
);
assert(
  retiredDesktopWorkspaceRootDeclarationCount === 0,
  `Retired desktop layers must not reclaim the base workspace grid: ${retiredDesktopWorkspaceRootDeclarationCount}`
);
assert(
  !desktopBaseStyles.includes("min-height: 760px !important") &&
    !desktopBaseStyles.includes("align-content: stretch !important"),
  "Retired desktop hierarchy layers must not stretch the canonical workspace or manufacture empty grid space"
);
assert(
  desktopLegacyRootRuleCount === 0,
  `Desktop base styles must not ship inactive flat-dense root rules: ${desktopLegacyRootRuleCount}`
);
assert(
  desktopStatusBusRuleCount === 11 && desktopLegacyTopbarRuleCount === 0,
  `Desktop status bus must stay canonical: statusBusRules=${desktopStatusBusRuleCount} legacyTopbarRules=${desktopLegacyTopbarRuleCount}`
);
assert(
  !desktopConsoleRefinementStyles.includes(".sidebar::after") &&
    !desktopRefinement.includes(".sidebar::after"),
  "Desktop sidebar trust facts must stay semantic; CSS pseudo-content is forbidden"
);
assert(
  desktopSidebarMiniStatusRuleCount === 4 &&
    desktopSidebarMiniStatusImportantCount === 0 &&
    retiredSidebarMiniStatusSelectorCount === 0 &&
    overviewStateSidebarMiniStatusSelectorCount === 4,
  `Desktop sidebar mini status must have one priority-free owner: rules=${desktopSidebarMiniStatusRuleCount} important=${desktopSidebarMiniStatusImportantCount} retired=${retiredSidebarMiniStatusSelectorCount} foundation=${overviewStateSidebarMiniStatusSelectorCount}`
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
  desktopModuleToneRuleCount === 0 &&
    !desktopWorkspaceLayout.includes('.ro-module[data-tone=') &&
    desktopModuleChromeLeftBorderDeclarationCount === 0 &&
    desktopLedgerToneRuleCount === 3 &&
    desktopLedgerToneShadowCount === 0,
  `Desktop tone hierarchy must stay restrained: moduleToneRules=${desktopModuleToneRuleCount} moduleLeftBorders=${desktopModuleChromeLeftBorderDeclarationCount} ledgerToneRules=${desktopLedgerToneRuleCount} ledgerToneShadows=${desktopLedgerToneShadowCount}`
);
assert(
  desktopReleaseToneResetCount === 1 && desktopReleaseNonPrimaryNeutralCount === 1,
  `Desktop release tone reset must neutralize row chrome and non-primary text: resets=${desktopReleaseToneResetCount} nonPrimary=${desktopReleaseNonPrimaryNeutralCount}`
);
assert(
  !desktopRelease.includes("@media (max-width") &&
    !desktopRelease.includes("ik-v420") &&
    !desktopRelease.includes("ik-v620") &&
    !desktopRelease.includes("v1072"),
  "Desktop release layer must not carry inactive mobile patch styles"
);
assert(
  versionMarkerCount <= 159,
  `OverviewPanel.css version marker count regressed above 159: ${versionMarkerCount}`
);
const retiredMobilePaths = [
  "src/panel-framework/overview/components/MobileOverviewHome.tsx",
  "src/panel-framework/overview/components/MobileOverviewDecision.tsx",
  "src/panel-framework/overview/components/MobileOverviewHomeSections.tsx",
  "src/panel-framework/overview/components/MobileOverviewTabView.tsx",
  "src/panel-framework/overview/components/BottomTabs.tsx",
  "src/panel-framework/overview/mobileOverviewModel.ts",
  "src/panel-framework/overview/mobileOverviewPolicy.ts",
  "src/panel-framework/overview/mobileOverviewTokens.ts",
  "src/panel-framework/overview/styles/mobile/mobile-product.css",
];
assert(
  retiredMobilePaths.every((file) => !exists(file)),
  "Retired mobile component, model, or patch-stack files must stay deleted"
);
assert(
  !panel.includes("data-overview-low-noise-console-token-contract"),
  "OverviewPanel must prove console tokens through computed styles, not a self-certifying DOM contract"
);
assert(
  !`${statusVerdict}\n${desktopModule}`.includes("data-overview-desktop-tier") &&
    !statusVerdict.includes("data-overview-status-priority") &&
    !statusVerdict.includes("data-overview-desktop-primary") &&
    !desktopTopbar.includes("topbarPriority"),
  "Desktop hierarchy probes must derive from semantic roles and structure, not self-certifying priority attributes"
);
assert(
  bytes(routerMobileStylesFile) + bytes(routerMobileDetailStylesFile) <= 30000,
  `Router mobile styles exceed 30 KB: ${bytes(routerMobileStylesFile) + bytes(routerMobileDetailStylesFile)}`
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
  assert(builtLegacyMobileSelectorCount === 0, `Built style.css contains ${builtLegacyMobileSelectorCount} legacy ik-mobile selector rules`);
  assert(
    builtCss.includes(".rm-app") && builtCss.includes(".rm-trust-rail") && !builtCss.includes(".rm-tabbar"),
    "Built style.css must contain the isolated single-surface router mobile stylesheet without retired tab navigation"
  );
}

if (failures.length > 0) {
  console.error("overview architecture gate: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `overview architecture gate: PASS panel=${lines(panel)} lines desktop=${lines(desktopConsole)} lines desktopDecision=${lines(desktopDecisionRail)} lines scenes=${lines(desktopScenes)} lines helper=${lines(desktopHelpers)} lines presentation=${lines(desktopPresentation)} lines topbar=${lines(desktopTopbar)} lines trafficRows=${lines(desktopTrafficRows)} lines routeRows=${lines(desktopRouteRows)} lines wanRows=${lines(desktopWanRows)} lines interfaceRows=${lines(desktopInterfaceRows)} lines credibilityRows=${lines(desktopCredibilityRows)} lines terminalRows=${lines(desktopTerminalRows)} lines resourceRows=${lines(desktopResourceRows)} lines visuals=${lines(desktopVisuals)} lines mobileApp=${lines(routerMobileApp)} lines mobileScreens=${lines(routerMobileScreens)} lines mobileModel=${lines(routerMobileModel)} lines mobileStyles=${bytes(routerMobileStylesFile) + bytes(routerMobileDetailStylesFile)} bytes css=${bytes(panelCssFile)} bytes desktopBase=${lines(desktopBaseStyles)} lines desktopBaseImportant=${desktopBaseImportantCount} important=${importantShare.toFixed(4)} desktopImportant=${desktopRefinementImportantCount} workspaceImportant=${desktopWorkspaceLayoutImportantCount} decisionRailRules=${desktopDecisionRailRuleCount} decisionCellRules=${desktopDecisionCellRuleCount} workspaceGridRules=${desktopWorkspaceGridRuleCount} navRules=${desktopNavRuleCount} shellDescendantRules=${desktopImpossibleShellDescendantCount} statusBusRules=${desktopStatusBusRuleCount} legacyTopbarRules=${desktopLegacyTopbarRuleCount} sidebarStatusRules=${desktopSidebarMiniStatusRuleCount} sidebarStatusImportant=${desktopSidebarMiniStatusImportantCount} moduleShellRules=${desktopModuleShellRuleCount} moduleHeadRules=${desktopModuleHeadRuleCount} ledgerRules=${desktopLedgerRuleCount} moduleToneRules=${desktopModuleToneRuleCount} ledgerToneRules=${desktopLedgerToneRuleCount} ledgerToneShadows=${desktopLedgerToneShadowCount} releaseToneResets=${desktopReleaseToneResetCount} releaseNonPrimary=${desktopReleaseNonPrimaryNeutralCount} mobile=${mobileRuleShare.toFixed(4)}`
);
