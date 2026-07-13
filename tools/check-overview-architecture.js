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
const mobileStylesFile =
  "src/panel-framework/overview/styles/mobile/mobile-product.css";
const mobileProductShellFile =
  "src/panel-framework/overview/styles/mobile/product-shell.css";
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
const mobileStyles = read(mobileStylesFile);
const mobileProductShell = read(mobileProductShellFile);
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
 ×žv¶‰žËkºwµç]—
ËË\Ý
[™[
Kˆ“Ý™\šY]Ô[™[Þ]\Ý›Ý^ÜÙH™\œÚ[Û™Y\ÚÝÜXØÙ\[˜ÙH]šX]\È‚ŠNÂ˜\ÜÙ\
ˆYØXÞR[ÜÔÙ[XÝÜÛÝ[OOHˆÝ™\šY]Ô[™[˜ÜÜÈ™Z[›ÙXÙY	ÛYØXÞR[ÜÔÙ[XÝÜÛÝ[HYØXÞHZËZ[ÜÈÙ[XÝÜˆ[\ØŠNÂ˜\ÜÙ\
ˆYØXÞS[Øš[TÙ[XÝÜÛÝ[OOHˆÝ™\šY]Ô[™[˜ÜÜÈ™Z[›ÙXÙY	ÛYØXÞS[Øš[TÙ[XÝÜÛÝ[HYØXÞHZË[[Øš[HÙ[XÝÜˆ[\ØŠNÂ˜\ÜÙ\
ˆYØXÞQ[˜Ý[ÛœË™]™\žJ
˜[YJHOˆ\[™[š[˜ÛY\Ê[˜Ý[Ûˆ	Û˜[Y_X
JKˆ“Ý™\šY]Ô[™[Þ™Z[›ÙXÙYHYØXÞH™[™\™\ˆ[˜Ý[Ûˆ‚ŠNÂ˜\ÜÙ\
ˆ[™[š[˜ÛY\Ê	Ùœ›ÛH‹‹ØÛÛ\Û™[ËÑ\ÚÝÜÛÛœÛÛH‰ÊKˆ“Ý™\šY]Ô[™[Þ]\ÝÛÛ\ÜÙHH^˜XÝY\ÚÝÜÛÛœÛÛH›Ý[™\žH‚ŠNÂ˜\ÜÙ\
ˆ[™[š[˜ÛY\Ê	Ú[\Ü‹‹ÜÝ[\ËÙ\ÚÝÜÚ[˜ÚY[Ë˜ÜÜÈŽÉÊKˆ“Ý™\šY]Ô[™[Þ]\ÝØYHÙ[X[XÈ\ÚÝÜ[˜ÚY[^Y\ˆ‚ŠNÂ˜\ÜÙ\
ˆ
[™[›X]Ú
×™]K[Ý™\šY]ËV×ËWJËÙÊH×JK›[™ÝHLˆ	‰‚ˆKÙ]K[Ý™\šY]ËJÎš\™\Ý[™\™[Øš[KZÛYKXXØÙ\[˜Ù_›Ë\Û˜\ÚÝJÎ™[œÚ]KXÛÛ˜XÝÛÛ[\Ú^™YÛÛ[\XÚÙYšYË]Ø[‹\˜]KYÝX\™
JKË\Ý
[™[
Kˆ“Ý™\šY]Ô[™[Þ]\ÝÙY\›ÛÝ]šX]\ÈÝXÝ\˜[ÜˆÝ]KY\š]™Y›ÝÙ[‹XÙ\YžZ[™È™[X\ÙHÛZ[\È‚ŠNÂ˜\ÜÙ\
ˆ\ÚÝÜ[\œËš[˜ÛY\Ê	Ùœ›ÛH‹‹Ü›Ý]\›ÜÔ™\Ù[][Û•šY]Ó[Ù[‰ÊH	‰‚ˆ\ÚÝÜ[\œËš[˜ÛY\Ê˜Z[›Ý]\“ÜÔ™\Ù[][Û•šY]Ó[Ù[ŠKˆ™\ÚÝÜÝ™\šY]Ò[\œËÞ]\ÝÛÛœÝ[YHH›Ý]\“ÔÈ™\Ù[][ÛˆšY]È[Ù[‚ŠNÂ˜\ÜÙ\
ˆ\ÚÝÜ[\œËš[˜ÛY\Ê	Ü™]\›ˆ¹odùbczaáù¨-ÈŽÉÊH	‰‚ˆY\ÚÝÜ[\œËš[˜ÛY\Ê	Ü™]\›ˆ¹k§¹¥íˆŽÉÊKˆ‘\ÚÝÜ]šY[˜ÙH[Ù[\È]\ÝX™[X[HØœÙ\˜][ÛœÈ\ÈÝ\œ™[Ø[\\Ë›Ý™X[[YHÝX\˜[Y\È‚ŠNÂ˜\ÜÙ\
ˆ[™\Ê›Ý]\“ÜÓ™]ÛÜšÕšY]Ó[Ù[
HHÌ	‰‚ˆ\›Ý]\“ÜÓ™]ÛÜšÕšY]Ó[Ù[š[˜ÛY\Ê˜Z[›Ý]\“ÜÔ™\Ù[][Û•šY]Ó[Ù[ŠKˆœ›Ý]\›ÜÓ™]ÛÜšÕšY]Ó[Ù[È]\ÝÝ^H›ØÝ\ÙYÛˆ™]ÛÜšÈ]šY[˜ÙK›Ý™\Ù[][ÛˆÛÜH‚ŠNÂ˜\ÜÙ\
ˆ[™\Ê›Ý]\“ÜÔ™\Ù[][Û•šY]Ó[Ù[
HHLL	‰‚ˆ›Ý]\“ÜÔ™\Ù[][Û•šY]Ó[Ù[š[˜ÛY\Ê˜Z[›Ý]\“ÜÔ™\Ù[][Û•šY]Ó[Ù[ŠKˆœ›Ý]\›ÜÔ™\Ù[][Û•šY]Ó[Ù[È]\ÝÝÛˆH›Ý[™Y\ÚÝÜ™\Ù[][ÛˆÛXÞH‚ŠNÂ˜\ÜÙ\
ˆ›Ý]\“ÜÔ™\Ù[][Û•šY]Ó[Ù[š[˜ÛY\Ê	Ü™]\›ˆ¹ïdyîç9cëùå*ŽÉÊH	‰‚ˆ›Ý]\“ÜÓ™]ÛÜšÕšY]Ó[Ù[š[˜ÛY\Ê	Ý˜[YNˆº/k9cäycëùå*‰ÊKˆ‘\ÚÝÜ™\Ù[][Ûˆ]\ÝXYÚ]HX›XÈ™]ÛÜšÈYÙ[Y[Ú[HÙY\[™È›ÜØ\™[™È]˜Z[Xš[]H\È]šY[˜ÙH‚ŠNÂ˜\ÜÙ\
ˆY\ÚÝÜXÚ\Ú[Û”˜Z[š[˜ÛY\ÊœÝ[O^ÈŠH	‰‚ˆ\ÚÝÜ˜\ÙTÝ[\Ëš[˜ÛY\Ê	Ð[\Ü‹‹Ù\ÚÝÜÙXÚ\Ú[Û‹\˜Z[˜ÜÜÈŽÉÊH	‰‚ˆ^\ÝÊœÜ˜ËÜ[™[Yœ˜[Y]ÛÜšËÛÝ™\šY]ËÜÝ[\ËÙ\ÚÝÜÙXÚ\Ú[Û‹\˜Z[˜ÜÜÈŠKˆ‘\ÚÝÜXÚ\Ú[Û”˜Z[^[Ý]]\Ý]™H[ˆ]È\ÚÝÜÛÛ\Û™[Ý[\ÚY]›Ý[›[™H”Ö‚ŠNÂ˜\ÜÙ\
ˆ\ÚÝÜÛÛœÛÛKš[˜ÛY\Ê	Ùœ›ÛH‹‹‹Ù\ÚÝÜÝ™\šY]ÔØÙ[™\È‰ÊH	‰‚ˆ\ÚÝÜÛÛœÛÛKš[˜ÛY\Ê˜Z[\ÚÝÜÝ™\šY]ÔØÙ[™JÛ˜\ÚÝÝ]JHŠKˆ‘\ÚÝÜÛÛœÛÛKÞ]\Ý[YØ]HØÙ[˜\š[ÈÛÛ\ÜÚ][ÛˆÈH\ÚÝÜØÙ[™H[Ù[H‚ŠNÂ˜\ÜÙ\
ˆKÙ]K[Ý™\šY]ËY\ÚÝÜ]—
ß]K[Ý™\šY]ËY\ÚÝÜ\™Y[™K[X\šÙ\œß]K[Ý™\šY]ËY\ÚÝÜYš^Y\ÚÙ[]ÛŸ]K[Ý™\šY]Ë\ÚYK]X›K[[ÙKË\Ý
\ÚÝÜÛÛœÛÛJKˆ‘\ÚÝÜÛÛœÛÛKÞ]\Ý›ÝØ\œžH™\œÚ[Û™YÜˆÙ[‹XÙ\YžZ[™ÈXØÙ\[˜ÙHX\šÙ\œÈ‚ŠNÂ˜\ÜÙ\
ˆKÙ]K[Ý™\šY]ËY\ÚÝÜ]—
ß]K\›Ý]\›ÜË]—
ËË\Ý
\ÚÝÜ[Ù[JKˆ‘\ÚÝÜ[Ù[KÞ]\Ý^ÜÙHÙ[X[XÈ]šY[˜ÙH]šX]\ÈÛ›H‚ŠNÂ˜\ÜÙ\
ˆKÙ]K[Ý™\šY]ËY\ÚÝÜ]—
ß]K[Ý™\šY]ËJÎœÝ]\Ë[›Ë]X›KZXY\ŸÝ]\Ë]˜[YK\˜Z[Ü˜\‹\š[Üš]KXÛÛ˜XÝÜ˜\‹Yš^Y\Ú^
KË\Ý
Ý]\Õ™\™XÝ
H	‰‚ˆ
Ý]\Õ™\™XÝ›X]Ú
×™]K[Ý™\šY]ËV×ËWJËÙÊH×JK›[™ÝHNˆ”Ý]\Õ™\™XÝÞ]\ÝÙY\Û›HÝXÝ\˜[Ý]\ËX\È›Û\Ë›ÝÙ[‹XÙ\YžZ[™È^[Ý]ÛZ[\È‚ŠNÂ˜\ÜÙ\
ˆVÙ\ÚÝÜ›Ý]T›ÝÜË\ÚÝÜØ[”›ÝÜË\ÚÝÜ[\™˜XÙT›ÝÜ×KœÛÛYJ
ÛÝ\˜ÙJHO‚ˆÙ]K[Ý™\šY]ËY\ÚÝÜ]—
ß]K\›Ý]\›ÜË]—
ËË\Ý
ÛÝ\˜ÙJBˆ
Kˆ‘\ÚÝÜ›Ý]KÐS‹[™[\™˜XÙH›ÝÈ[Ù[\È]\Ý^ÜÙHÙ[X[XÈ]šY[˜ÙH]šX]\ÈÛ›H‚ŠNÂ˜\ÜÙ\
ˆKÙ]K[Ý™\šY]ËY\ÚÝÜ]—
ß]K\›Ý]\›ÜË]—
ËË\Ý
\ÚÝÜš\ÝX[ÊKˆ™\ÚÝÜÝ™\šY]Õš\ÝX[ËÞ]\Ý^ÜÙHÙ[X[XÈš\ÝX[]šX]\ÈÛ›H‚ŠNÂ˜\ÜÙ\
ˆ[Øš[S[Ù[š[˜ÛY\Êœ™\ÛÛ™S[Øš[R[˜ÚY[XÝ[ÛˆŠH	‰‚ˆ[[Øš[S[Ù[š[˜ÛY\Ê™[˜Ý[ÛˆX››Ü›X[XÚ\Ú[Û“™^XÝ[ÛˆŠH	‰‚ˆ[[Øš[S[Ù[š[˜ÛY\Ê™[˜Ý[ÛˆX››Ü›X[XÚ\Ú[ÛXÝ[Û“›ÝHŠH	‰‚ˆ[[Øš[S[Ù[š[˜ÛY\Ê™[˜Ý[ÛˆX››Ü›X[XÚ\Ú[Û•\™Ù]XˆŠKˆ›[Øš[SÝ™\šY]Ó[Ù[È]\Ý[YØ]H[˜ÚY[XÝ[ÛˆÛÜH[™Xˆ\™Ù]ÈÈH[Øš[HÛXÞH[Ù[H‚ŠNÂ˜\ÜÙ\
ˆÈ¹§éznæ:+©9aî¹cèÈ‹¹§ézaáúfá¹â­¹  H‹¹§éy£©ycèù¢oú/oH‹¹§ézaáúfáº`&º`dÈ—K™]™\žJ
ÛÜJHO‚ˆ[Øš[TÛXÞKš[˜ÛY\ÊÛÜJBˆ
Kˆ›[Øš[SÝ™\šY]ÔÛXÞKÈ]\ÝÝÛˆØš™XÝ\ÜXÚYšXÈ[˜ÚY[XÝ[ÛˆÛÜH‚ŠNÂ˜\ÜÙ\
ˆ
\ÚÝÜÛÛœÛÛK›X]Ú
Ù]K[Ý™\šY]ËKÙÊH×JK›[™ÝH‹ˆ‘\ÚÝÜÛÛœÛÛKÞ]\ÝÙY\Û›HÝXÝ\˜[Ý™\šY]È]šX]\È‚ŠNÂ˜\ÜÙ\
ˆ\ÚÝÜÛÛœÛÛKš[˜ÛY\Ê	Ùœ›ÛH‹‹Ñ\ÚÝÜXÚ\Ú[Û”˜Z[‰ÊH	‰‚ˆ\ÚÝÜÛÛœÛÛKš[˜ÛY\Ê\ÚÝÜXÚ\Ú[Û”˜Z[ŠKˆ‘\ÚÝÜÛÛœÛÛKÞ]\ÝÛÛ\ÜÙHH\ÚÝÜØš™XÝÚ[\XÝØXÝ[Û‹ØÜ™YXš[]H˜Z[‚ŠNÂ˜\ÜÙ\
ˆÂˆ™\ÚÝÜÝ™\šY]Ð[Ù™›[™TØÙ[™H‹ˆ™\ÚÝÜÝ™\šY]ÐÛÛXÝ[Û”ØÙ[™H‹ˆ™\ÚÝÜÝ™\šY]ÑY˜][ØÙ[™H‹ˆ™\ÚÝÜÝ™\šY]Ò[\™˜XÙTØÙ[™H‹ˆ™\ÚÝÜÝ™\šY]Ó›ÔÛ˜\ÚÝØÙ[™H‹ˆ™\ÚÝÜÝ™\šY]Ô™\ÛÝ\˜ÙTØÙ[™H‹ˆK™]™\žJ
[Ù[S˜[YJHOˆ\ÚÝÜØÙ[™\Ëš[˜ÛY\Êœ›ÛH‹‹ÉÛ[Ù[S˜[Y_H˜
JH	‰‚ˆÈ››Ë\Û˜\ÚÝ‹œ™\ÛÝ\˜ÙKY[‹˜ÛÛXÝ[Û‹YÝÛˆ‹š[\™˜XÙ\ËYÝÛˆ‹˜[[Ù™›[™H—K™]™\žJ
ØÙ[˜\š[ÊHO‚ˆ\ÚÝÜØÙ[™\Ëš[˜ÛY\ÊØ\ÙH‰ÜØÙ[˜\š[ßHŽ˜
Bˆ
H	‰‚ˆ\ÚÝÜØÙ[™\Ëš[˜ÛY\Êœ™]\›ˆZ[Y˜][\ÚÝÜØÙ[™JÛ˜\ÚÝÝ]JNÈŠKˆ™\ÚÝÜÝ™\šY]ÔØÙ[™\ËÞ]\Ý\Ü]Ú]™\žH\ÚÝÜØÙ[˜\š[ÈÈ[ˆ\ÛÛ]YØÙ[™H[Ù[H‚ŠNÂ˜\ÜÙ\
ˆ\ÚÝÜY˜][ØÙ[™Kš[˜ÛY\Ê	Ùœ›ÛH‹‹Ù\ÚÝÜÝ™\šY]Õš\ÝX[È‰ÊKˆ™\ÚÝÜÝ™\šY]ÑY˜][ØÙ[™KÞ]\ÝÛÛ\ÜÙHH^˜XÝY\ÚÝÜš\ÝX[^Y\ˆ‚ŠNÂ˜\ÜÙ\
ˆ\ÚÝÜY˜][ØÙ[™Kš[˜ÛY\Ê	Ùœ›ÛH‹‹Ù\ÚÝÜÝ™\šY]Õ˜Y™šXÔ›ÝÜÈ‰ÊH	‰‚ˆ\ÚÝÜY˜][ØÙ[™Kš[˜ÛY\Ê	Ùœ›ÛH‹‹Ù\ÚÝÜÝ™\šY]Ô›Ý]T›ÝÜÈ‰ÊH	‰‚ˆ\ÚÝÜY˜][ØÙ[™Kš[˜ÛY\Ê	Ùœ›ÛH‹‹Ù\ÚÝÜÝ™\šY]Ò[\™˜XÙT›ÝÜÈ‰ÊH	‰‚ˆ\ÚÝÜY˜][ØÙ[™Kš[˜ÛY\Ê	Ùœ›ÛH‹‹Ù\ÚÝÜÝ™\šY]ÐÜ™YXš[]T›ÝÜÈ‰ÊH	‰‚ˆ\ÚÝÜY˜][ØÙ[™Kš[˜ÛY\Ê	Ùœ›ÛH‹‹Ù\ÚÝÜÝ™\šY]Õ\›Z[˜[›ÝÜÈ‰ÊKˆ™\ÚÝÜÝ™\šY]ÑY˜][ØÙ[™KÞ]\ÝÛÛœÝ[YHH›ÝÈ[Ù[\È]ÝÛˆ]È]šY[˜ÙH‚ŠNÂ˜\ÜÙ\
ˆ\ÚÝÜY˜][ØÙ[™Kš[˜ÛY\Ê	Ùœ›ÛH‹‹Ù\ÚÝÜ™\ÛÝ\˜ÙT›ÝÜÈ‰ÊKˆ™\ÚÝÜÝ™\šY]ÑY˜][ØÙ[™KÞ]\ÝÛÛœÝ[YHH™\ÛÝ\˜ÙH]šY[˜ÙH›ÝÈ[Ù[H‚ŠNÂ˜\ÜÙ\
ˆÛ[Ù[OHœ™\ÛÝ\˜ÙKZ[\™˜XÙK]ÜH–×—J—˜ÛÛ\ÙY‹Ë\Ý
\ÚÝÜ™\ÛÝ\˜ÙTØÙ[™JH	‰‚ˆÛ[Ù[OH››Ü›X[[ÜË[YÙ\ˆ–×—J—˜ÛÛ\ÙY‹Ë\Ý
\ÚÝÜ™\ÛÝ\˜ÙTØÙ[™JKˆ”™\ÛÝ\˜ÙKY[\ÚÝÜØÙ[™H]\ÝY™\ˆ[\™˜XÙH›ÝYÚ][™™XÙ[Y]™[YÙ\œÈ™[ÝÈH™\ÛÝ\˜ÙHYÙ[Y[‚ŠNÂ˜\ÜÙ\
ˆ\ÚÝÜš\ÝX[Ëš[˜ÛY\Ê	Ùœ›ÛH‹‹Ù\ÚÝÜÝ™\šY]Õ˜Y™šXÔ›ÝÜÈ‰ÊKˆ™\ÚÝÜÝ™\šY]Õš\ÝX[ËÞ]\ÝÛÛœÝ[YHH˜Y™šXÈ›ÝÈ[Ù[H\™XÝH‚ŠNÂ˜\ÜÙ\
ˆ[Øš[RÛYKš[˜ÛY\Ê˜Z[[Øš[SÝ™\šY]Ó[Ù[ŠH	‰‚ˆ[Øš[RÛYKš[˜ÛY\Ê”š[X\žQXÚ\Ú[ÛˆŠH	‰‚ˆ[Øš[RÛYKš[˜ÛY\Ê‘]šXÙP˜\ˆŠH	‰‚ˆ[Øš[RÛYKš[˜ÛY\ÊÛÜ™Q˜XÝÈŠH	‰‚ˆ[Øš[RÛYKš[˜ÛY\Ê”Ý\Ü[™Ó\ÝŠH	‰‚ˆ[Øš[RÛYKš[˜ÛY\Ê›ÝÛUXœÈŠKˆ“[Øš[SÝ™\šY]ÒÛYKÞ]\Ý™[XZ[ˆHÛX[[Øš[KZÛYHÛÛ\ÜÚ][Ûˆ›Ý[™\žH‚ŠNÂ˜\ÜÙ\
ˆ[Øš[QXÚ\Ú[Û‹š[˜ÛY\Ê›[Ù[š\›Ë]HŠH	‰‚ˆ[Øš[QXÚ\Ú[Û‹š[˜ÛY\Ê‘XÚ\Ú[Û•š\ÝX[ŠH	‰‚ˆ[Øš[RÛYTÙXÝ[ÛœËš[˜ÛY\Ê›[Ù[˜ÛÜ™SY]šXÜÈŠH	‰‚ˆ[Øš[RÛYTÙXÝ[ÛœËš[˜ÛY\Ê›[Ù[œš[X\žS\Ýœ›ÝÜÈŠKˆ“[Øš[HÛYH[Ù[\È]\ÝÛÛœÝ[YHXÚ\Ú[Ûˆ[™Ý\Ü[™È]šY[˜ÙHœ›ÛHHšY]È[Ù[‚ŠNÂ˜\ÜÙ\
ˆÈ˜ÛÜ™K˜ÜÜÈ‹œ›ÙXÝ\Ú[˜ÜÜÈ‹™œ˜[YK˜ÜÜÈ‹™XÚ\Ú[Û‹˜ÜÜÈ‹œÝ\™˜XÙK˜ÜÜÈ‹š[˜ÚY[˜ÜÜÈ‹›˜]šYØ][Û‹˜ÜÜÈ‹›[™ØØ\K˜ÜÜÈ—Bˆ™]™\žJ
š[JHOˆ[Øš[TÝ[\Ëš[˜ÛY\Ê[\Ü‹‹ÉÙš[_HŽØ
JKˆ“[Øš[HZ[][YHÔÔÈ]\Ý\ÙHÙ[X[XÈÛÛ\Û™[^Y\œÈ‚ŠNÂ˜\ÜÙ\
ˆ[[Øš[RÛYKš[˜ÛY\Ê“[Øš[SÝ™\šY]ÔÝ[\ÈŠH	‰‚ˆ[[Øš[RÛYKš[˜ÛY\Ê\ÙR[œÙ\[Û‘Y™™XÝŠH	‰‚ˆ[Øš[RÛYKš[˜ÛY\Ê	Ú[\Ü‹‹‹ÜÝ[\ËÛ[Øš[KÛ[Øš[K\›ÙXÝ˜ÜÜÈŽÉÊKˆ“[Øš[HÛYH]\Ý\ÙHZ[][YHÔÔÈÚ]Ý][[YHÝ[H[š™XÝ[Ûˆ‚ŠNÂ˜\ÜÙ\
ˆ[\Ü[Ú\™HHŽ‹ˆÝ™\šY]Ô[™[˜ÜÜÈ[\Ü[Ú\™H™YÜ™\ÜÙYX›Ý™H‰Nˆ	Ú[\Ü[Ú\™KÑš^Y

_XŠNÂ˜\ÜÙ\
ˆ[Øš[T[TÚ\™HHŒLKˆÝ™\šY]Ô[™[˜ÜÜÈ[Øš[H[HÚ\™H™YÜ™\ÜÙYX›Ý™HLINˆ	Û[Øš[T[TÚ\™KÑš^Y

_XŠNÂ˜\ÜÙ\
ˆ\ÚÝÜ™Yš[™[Y[[\Ü[ÛÝ[HLˆ\ÚÝÜ™Yš[™[Y[Z[\Ü[ÛÝ[™YÜ™\ÜÙYX›Ý™HLˆ	Ù\ÚÝÜ™Yš[™[Y[[\Ü[ÛÝ[XŠNÂ˜\ÜÙ\
ˆ\ÚÝÜ™Yš[™[Y[ÚYÝÙYXÛ\˜][ÛÛÝ[OOHˆ\ÚÝÜ™Yš[™[Y[]\Ý›Ý™YXÛ\™HHØ[YH›Ü\H[ˆH]\ˆY[XØ[Ù[XÝÜˆÛÛ^ˆ	Ù\ÚÝÜ™Yš[™[Y[ÚYÝÙYXÛ\˜][ÛÛÝ[XŠNÂ˜\ÜÙ\
ˆ\ÚÝÜXÚ\Ú[Û”˜Z[[PÛÝ[OOHH	‰ˆ\ÚÝÜXÚ\Ú[ÛÙ[[PÛÝ[Hˆ\ÚÝÜXÚ\Ú[Ûˆ˜Z[]\ÝÝ^HÛÛœÛÛY]Yˆ˜Z[[\ÏIÙ\ÚÝÜXÚ\Ú[Û”˜Z[[PÛÝ[HÙ[[\ÏIÙ\ÚÝÜXÚ\Ú[ÛÙ[[PÛÝ[XŠNÂ˜\ÜÙ\
ˆ\ÚÝÜÛÜšÜÜXÙQÜšY[PÛÝ[OOHH	‰ˆ\ÚÝÜ˜]”[PÛÝ[OOHˆ\ÚÝÜÛÜšÜÜXÙHÜšY]\ÝÝ^HØ[›ÛšXØ[[™]\Ý›Ý\XØ]HÚ[˜]šYØ][ÛŽˆÜšY[\ÏIÙ\ÚÝÜÛÜšÜÜXÙQÜšY[PÛÝ[H˜]”[\ÏIÙ\ÚÝÜ˜]”[PÛÝ[XŠNÂ˜\ÜÙ\
ˆ\ÚÝÜÝ]\Ð\Ô[PÛÝ[OOH	‰ˆ\ÚÝÜYØXÞUÜ˜\”[PÛÝ[OOHˆ\ÚÝÜÝ]\È\È]\ÝÝ^HØ[›ÛšXØ[ˆÝ]\Ð\Ô[\ÏIÙ\ÚÝÜÝ]\Ð\Ô[PÛÝ[HYØXÞUÜ˜\”[\ÏIÙ\ÚÝÜYØXÞUÜ˜\”[PÛÝ[XŠNÂ˜\ÜÙ\
ˆ\ÚÝÜ[Ù[TÚ[[PÛÝ[OOHH	‰ˆ\ÚÝÜ[Ù[RXY[PÛÝ[OOHËˆ\ÚÝÜ[Ù[HÚ[ÚXY]\ÝÝ^HØ[›ÛšXØ[ˆÚ[[\ÏIÙ\ÚÝÜ[Ù[TÚ[[PÛÝ[HXY[\ÏIÙ\ÚÝÜ[Ù[RXY[PÛÝ[XŠNÂ˜\ÜÙ\
ˆ\ÚÝÜYÙ\”[PÛÝ[OOHˆ	‰ˆY\ÚÝÜ™Yš[™[Y[š[˜ÛY\Ê›XÚ[
Ù
HŠKˆ\ÚÝÜYÙ\ˆ]\ÝÝ^HØ[›ÛšXØ[[™™Xœ˜KYœ™YNˆYÙ\”[\ÏIÙ\ÚÝÜYÙ\”[PÛÝ[XŠNÂ˜\ÜÙ\
ˆ\ÚÝÜ[Ù[UÛ™T[PÛÝ[OOHˆ	‰‚ˆ\ÚÝÜYÙ\•Û™T[PÛÝ[OOHÈ	‰‚ˆ\ÚÝÜYÙ\•Û™TÚYÝÐÛÝ[OOHˆ\ÚÝÜÛ™HY\˜\˜ÚH]\ÝÝ^H™\Ý˜Z[™Yˆ[Ù[UÛ™T[\ÏIÙ\ÚÝÜ[Ù[UÛ™T[PÛÝ[HYÙ\•Û™T[\ÏIÙ\ÚÝÜYÙ\•Û™T[PÛÝ[HYÙ\•Û™TÚYÝÜÏIÙ\ÚÝÜYÙ\•Û™TÚYÝÐÛÝ[XŠNÂ˜\ÜÙ\
ˆ\ÚÝÜ™[X\ÙUÛ™T™\Ù]ÛÝ[OOHH	‰ˆ\ÚÝÜ™[X\ÙS›Û”š[X\žS™]]˜[ÛÝ[OOHKˆ\ÚÝÜ™[X\ÙHÛ™H™\Ù]]\Ý™]]˜[^™H›ÝÈÚ›ÛYH[™›Û‹\š[X\žH^ˆ™\Ù]ÏIÙ\ÚÝÜ™[X\ÙUÛ™T™\Ù]ÛÝ[H›Û”š[X\žOIÙ\ÚÝÜ™[X\ÙS›Û”š[X\žS™]]˜[ÛÝ[XŠNÂ˜\ÜÙ\
ˆ™\œÚ[Û“X\šÙ\ÛÝ[HMNKˆÝ™\šY]Ô[™[˜ÜÜÈ™\œÚ[ÛˆX\šÙ\ˆÛÝ[™YÜ™\ÜÙYX›Ý™HMNNˆ	Ý™\œÚ[Û“X\šÙ\ÛÝ[XŠNÂ˜\ÜÙ\
ˆ[[Øš[TÝ[\Ëš[˜ÛY\Ê™›Ý[™][ÛˆŠH	‰ˆ[[Øš[TÝ[\Ëš[˜ÛY\Êœ™\Z\ˆŠKˆ“[Øš[HÔÔÈ[žH™Z[›ÙXÙYÚ›Û›ÛÙÚXØ[]Ú^Y\œÈ‚ŠNÂ˜ÛÛœÝ[Øš[TÝ[S^Y\‘š[\ÈHÂˆœÜ˜ËÜ[™[Yœ˜[Y]ÛÜšËÛÝ™\šY]ËÜÝ[\ËÛ[Øš[KØÛÜ™K˜ÜÜÈ‹ˆœÜ˜ËÜ[™[Yœ˜[Y]ÛÜšËÛÝ™\šY]ËÜÝ[\ËÛ[Øš[KÙœ˜[YK˜ÜÜÈ‹ˆœÜ˜ËÜ[™[Yœ˜[Y]ÛÜšËÛÝ™\šY]ËÜÝ[\ËÛ[Øš[KÙXÚ\Ú[Û‹˜ÜÜÈ‹ˆœÜ˜ËÜ[™[Yœ˜[Y]ÛÜšËÛÝ™\šY]ËÜÝ[\ËÛ[Øš[KÜÝ\™˜XÙK˜ÜÜÈ‹ˆœÜ˜ËÜ[™[Yœ˜[Y]ÛÜšËÛÝ™\šY]ËÜÝ[\ËÛ[Øš[KÜ›ÙXÝ\Ú[˜ÜÜÈ‹ˆœÜ˜ËÜ[™[Yœ˜[Y]ÛÜšËÛÝ™\šY]ËÜÝ[\ËÛ[Øš[KÚ[˜ÚY[˜ÜÜÈ‹ˆœÜ˜ËÜ[™[Yœ˜[Y]ÛÜšËÛÝ™\šY]ËÜÝ[\ËÛ[Øš[KÛ˜]šYØ][Û‹˜ÜÜÈ‹ˆœÜ˜ËÜ[™[Yœ˜[Y]ÛÜšËÛÝ™\šY]ËÜÝ[\ËÛ[Øš[KÛ[™ØØ\K˜ÜÜÈ‹—NÂ˜ÛÛœÝ[Øš[TÝ[S[™S[Z]ÈH™]ÈX\
ÂˆÈœÜ˜ËÜ[™[Yœ˜[Y]ÛÜšËÛÝ™\šY]ËÜÝ[\ËÛ[Øš[KØÛÜ™K˜ÜÜÈ‹KˆÈœÜ˜ËÜ[™[Yœ˜[Y]ÛÜšËÛÝ™\šY]ËÜÝ[\ËÛ[Øš[KÙœ˜[YK˜ÜÜÈ‹LKˆÈœÜ˜ËÜ[™[Yœ˜[Y]ÛÜšËÛÝ™\šY]ËÜÝ[\ËÛ[Øš[KÙXÚ\Ú[Û‹˜ÜÜÈ‹ÌÌKˆÈœÜ˜ËÜ[™[Yœ˜[Y]ÛÜšËÛÝ™\šY]ËÜÝ[\ËÛ[Øš[KÜÝ\™˜XÙK˜ÜÜÈ‹ŒKˆÈœÜ˜ËÜ[™[Yœ˜[Y]ÛÜšËÛÝ™\šY]ËÜÝ[\ËÛ[Øš[KÜ›ÙXÝ\Ú[˜ÜÜÈ‹ÌŒKˆÈœÜ˜ËÜ[™[Yœ˜[Y]ÛÜšËÛÝ™\šY]ËÜÝ[\ËÛ[Øš[KÚ[˜ÚY[˜ÜÜÈ‹LŒKˆÈœÜ˜ËÜ[™[Yœ˜[Y]ÛÜšËÛÝ™\šY]ËÜÝ[\ËÛ[Øš[KÛ˜]šYØ][Û‹˜ÜÜÈ‹KˆÈœÜ˜ËÜ[™[Yœ˜[Y]ÛÜšËÛÝ™\šY]ËÜÝ[\ËÛ[Øš[KÛ[™ØØ\K˜ÜÜÈ‹K—JNÂ›][Øš[TÝ[Pž]UÝ[HÂ™›Üˆ
ÛÛœÝ™[Ùˆ[Øš[TÝ[S^Y\‘š[\ÊHÂˆYˆ
Y^\ÝÊ™[
JHÛÛ[YNÂˆÛÛœÝ^Y\ˆH™XY
™[
NÂˆ[Øš[TÝ[Pž]UÝ[
ÏHž]\Ê™[
NÂˆ\ÜÙ\
ˆ[™\Ê^Y\ŠHH[Øš[TÝ[S[™S[Z]Ë™Ù]
™[
Kˆ	Ü™[H^ÙYYÈ	Û[Øš[TÝ[S[™S[Z]Ë™Ù]
™[
_H[™\Îˆ	Û[™\Ê^Y\Š_Xˆ
NÂŸB˜\ÜÙ\
ˆ[Øš[TÝ[Pž]UÝ[HLˆ[Øš[HÝ™\šY]ÈÝ[H^Y\œÈ^ÙYYLÐŽˆ	Û[Øš[TÝ[Pž]UÝ[XŠNÂ‚‚šYˆ
^\ÝÊZ[ÜÜÑš[JJHÂˆÛÛœÝZ[ÜÜÈH™XY
Z[ÜÜÑš[JNÂˆÛÛœÝZ[ÜÜÔ›ÛÝHÜÝÜÜËœ\œÙJZ[ÜÜËÈœ›ÛNˆZ[ÜÜÑš[HJNÂˆ]Z[YØXÞR[ÜÔÙ[XÝÜÛÝ[HÂˆ]Z[YØXÞS[Øš[TÙ[XÝÜÛÝ[HÂˆZ[ÜÜÔ›ÛÝØ[Ô[\Ê
[JHOˆÂˆYˆ
[KœÙ[XÝÜ‹š[˜ÛY\Ê‹šZËZ[ÜËHŠJHZ[YØXÞR[ÜÔÙ[XÝÜÛÝ[
ÏHNÂˆYˆ
[KœÙ[XÝÜ‹š[˜ÛY\Ê‹šZË[[Øš[KHŠJHZ[YØXÞS[Øš[TÙ[XÝÜÛÝ[
ÏHNÂˆJNÂˆ\ÜÙ\
ž]\ÊZ[ÜÜÑš[JHHLZ[Ý[K˜ÜÜÈ^ÙYYÈLÐŽˆ	Øž]\ÊZ[ÜÜÑš[J_X
NÂˆ\ÜÙ\
ˆZ[YØXÞR[ÜÔÙ[XÝÜÛÝ[OOHˆZ[Ý[K˜ÜÜÈÛÛZ[œÈ	ØZ[YØXÞR[ÜÔÙ[XÝÜÛÝ[HYØXÞHZËZ[ÜÈÙ[XÝÜˆ[\Øˆ
NÂˆ\ÜÙ\
ˆZ[YØXÞS[Øš[TÙ[XÝÜÛÝ[ˆ	‰ˆZ[YØXÞS[Øš[TÙ[XÝÜÛÝ[HŒŒˆZ[Ý[K˜ÜÜÈ[Øš[HÙ[XÝÜˆYÙ]]\ÝÝ^HÚ][ˆK‹ŒŒŒ[\Îˆ	ØZ[YØXÞS[Øš[TÙ[XÝÜÛÝ[Xˆ
NÂŸB‚šYˆ
˜Z[\™\Ë›[™Ýˆ
HÂˆÛÛœÛÛK™\œ›ÜŠ›Ý™\šY]È\˜Ú]XÝ\™HØ]NˆRSŠNÂˆ›Üˆ
ÛÛœÝ˜Z[\™HÙˆ˜Z[\™\ÊHÛÛœÛÛK™\œ›ÜŠH	Ù˜Z[\™_X
NÂˆ›ØÙ\ÜË™^]
JNÂŸB‚˜ÛÛœÛÛK›ÙÊˆÝ™\šY]È\˜Ú]XÝ\™HØ]NˆTÔÈ[™[IÛ[™\Ê[™[
_H[™\È\ÚÝÜIÛ[™\Ê\ÚÝÜÛÛœÛÛJ_H[™\È\ÚÝÜXÚ\Ú[ÛIÛ[™\Ê\ÚÝÜXÚ\Ú[Û”˜Z[
_H[™\ÈØÙ[™\ÏIÛ[™\Ê\ÚÝÜØÙ[™\Ê_H[™\È[\IÛ[™\Ê\ÚÝÜ[\œÊ_H[™\È˜Y™šXÔ›ÝÜÏIÛ[™\Ê\ÚÝÜ˜Y™šXÔ›ÝÜÊ_H[™\È›Ý]T›ÝÜÏIÛ[™\Ê\ÚÝÜ›Ý]T›ÝÜÊ_H[™\ÈØ[”›ÝÜÏIÛ[™\Ê\ÚÝÜØ[”›ÝÜÊ_H[™\È[\™˜XÙT›ÝÜÏIÛ[™\Ê\ÚÝÜ[\™˜XÙT›ÝÜÊ_H[™\ÈÜ™YXš[]T›ÝÜÏIÛ[™\Ê\ÚÝÜÜ™YXš[]T›ÝÜÊ_H[™\È\›Z[˜[›ÝÜÏIÛ[™\Ê\ÚÝÜ\›Z[˜[›ÝÜÊ_H[™\È™\ÛÝ\˜ÙT›ÝÜÏIÛ[™\Ê\ÚÝÜ™\ÛÝ\˜ÙT›ÝÜÊ_H[™\Èš\ÝX[ÏIÛ[™\Ê\ÚÝÜš\ÝX[Ê_H[™\È[Øš[RÛYOIÛ[™\Ê[Øš[RÛYJ_H[™\È[Øš[QXÚ\Ú[ÛIÛ[™\Ê[Øš[QXÚ\Ú[ÛŠ_H[™\È[Øš[TÙXÝ[ÛœÏIÛ[™\Ê[Øš[RÛYTÙXÝ[ÛœÊ_H[™\È[Øš[UX•šY]ÏIÛ[™\Ê[Øš[UX•šY]Ê_H[™\È[Øš[UX”›ÝÜÏIÛ[™\Ê[Øš[UX”›ÝÜÊ_H[™\ÈÜÜÏIØž]\Ê[™[ÜÜÑš[J_Hž]\È\ÚÝÜ˜\ÙOIÛ[™\Ê\ÚÝÜ˜\ÙTÝ[\Ê_H[™\È\ÚÝÜ˜\ÙR[\Ü[IÙ\ÚÝÜ˜\ÙR[\Ü[ÛÝ[H[Øš[TÝ[\ÏIÛ[Øš[TÝ[Pž]UÝ[Hž]\È[\Ü[IÚ[\Ü[Ú\™KÑš^Y

_H\ÚÝÜ[\Ü[IÙ\ÚÝÜ™Yš[™[Y[[\Ü[ÛÝ[HXÚ\Ú[Û”˜Z[[\ÏIÙ\ÚÝÜXÚ\Ú[Û”˜Z[[PÛÝ[HXÚ\Ú[ÛÙ[[\ÏIÙ\ÚÝÜXÚ\Ú[ÛÙ[[PÛÝ[HÛÜšÜÜXÙQÜšY[\ÏIÙ\ÚÝÜÛÜšÜÜXÙQÜšY[PÛÝ[H˜]”[\ÏIÙ\ÚÝÜ˜]”[PÛÝ[HÝ]\Ð\Ô[\ÏIÙ\ÚÝÜÝ]\Ð\Ô[PÛÝ[HYØXÞUÜ˜\”[\ÏIÙ\ÚÝÜYØXÞUÜ˜\”[PÛÝ[H[Ù[TÚ[[\ÏIÙ\ÚÝÜ[Ù[TÚ[[PÛÝ[H[Ù[RXY[\ÏIÙ\ÚÝÜ[Ù[RXY[PÛÝ[HYÙ\”[\ÏIÙ\ÚÝÜYÙ\”[PÛÝ[H[Ù[UÛ™T[\ÏIÙ\ÚÝÜ[Ù[UÛ™T[PÛÝ[HYÙ\•Û™T[\ÏIÙ\ÚÝÜYÙ\•Û™T[PÛÝ[HYÙ\•Û™TÚYÝÜÏIÙ\ÚÝÜYÙ\•Û™TÚYÝÐÛÝ[H™[X\ÙUÛ™T™\Ù]ÏIÙ\ÚÝÜ™[X\ÙUÛ™T™\Ù]ÛÝ[H™[X\ÙS›Û”š[X\žOIÙ\ÚÝÜ™[X\ÙS›Û”š[X\žS™]]˜[ÛÝ[H[Øš[OIÛ[Øš[T[TÚ\™KÑš^Y

_XŠNÂ