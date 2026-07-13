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
const desktopBaseStyleLayerFiles = [
  desktopBaseStylesFile,
  desktopDensityStylesFile,
  "src/panel-framework/overview/styles/desktop/first-screen.css",
  "src/panel-framework/overview/styles/desktop/hierarchy.css",
  "src/panel-framework/overview/styles/desktop/shell-chrome.css",
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
  "src/panel-framework/overview/styles/mobile/product-shell.css",
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
const mobileTrendStylesFile =
  "src/panel-framework/overview/styles/mobile/trend.css";
const mobileSurfaceStylesFile =
  "src/panel-framework/overview/styles/mobile/surface.css";
const mobileIncidentStylesFile =
  "src/panel-framework/overview/styles/mobile/incident.css";
const mobileLandscapeStylesFile =
  "src/panel-framework/overview/styles/mobile/landscape.css";
const mobileModelFile =
  "src/panel-framework/overview/mobileOverviewModel.ts";
const mobilePolicyFile =
  "src/panel-framework/overview/mobileOverviewPolicy.ts";
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
const desktopRefinement = read(desktopRefinementFile);
const desktopRuntimeStyles = read(desktopRuntimeStylesFile);
const desktopWorkspaceLayout = read(desktopWorkspaceLayoutFile);
const desktopRelease = read(desktopReleaseFile);
const desktopIncidentStyles = read(desktopIncidentStylesFile);
const desktopStatusBusStyles = read(desktopStatusBusStylesFile);
const desktopWanTrendStyles = read(desktopWanTrendStylesFile);
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
const mobileTrendStyles = read(mobileTrendStylesFile);
const mobileSurfaceStyles = read(mobileSurfaceStylesFile);
const mobileIncidentStyles = read(mobileIncidentStylesFile);
const mobileLandscapeStyles = read(mobileLandscapeStylesFile);
const mobileModel = read(mobileModelFile);
const mobilePolicy = read(mobilePolicyFile);
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
let desktopReleaseToneResetCount = 0;
let desktopReleaseNonPrimaryNeutralCount = 0;

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
  :Ч~mўG§ІЪоќЖ­yЫ\ЪY]›Э[›[™H”Ц‚ЉNВ\ЬЩ\ќ
€\ЪЭЬЫЫњЫЫKљ[ЫY\К	Щњ›ЫH‹‹‹Щ\ЪЭЬЭ™\ќљY]ФШЩ[™\И‰КH	‰‚€\ЪЭЬЫЫњЫЫKљ[ЫY\КќZ[\ЪЭЬЭ™\ќљY]ФШЩ[™JЫ\ЪЭЭ]JHЉK€‘\ЪЭЬЫЫњЫЫKќЮ]\Э[YШ]HШЩ[\љ[ИЫЫ\ЬЪ][Ы€ИH\ЪЭЬШЩ[™H[Щ[H‚ЉNВ\ЬЩ\ќ
€KЩ]K[Э™\ќљY]ЛY\ЪЭЬ]—
Я]K[Э™\ќљY]ЛY\ЪЭЬ\™Y[™K[X\љЩ\њЯ]K[Э™\ќљY]ЛY\ЪЭЬYљ^Y\ЪЩ[]Ыџ]K[Э™\ќљY]Л\ЪYK]X›K[[ЩKЛќ\Э
\ЪЭЬЫЫњЫЫJK€‘\ЪЭЬЫЫњЫЫKќЮ]\Э›ЭШ\њћH™\њЪ[Ы™YЬ€Щ[‹XЩ\ќYћZ[™ИXШЩ\[ЩHX\љЩ\њИ‚ЉNВ\ЬЩ\ќ
€KЩ]K[Э™\ќљY]ЛY\ЪЭЬ]—
Я]K\›Э]\›ЬЛ]—
ЛЛќ\Э
\ЪЭЬ[Щ[JK€‘\ЪЭЬ[Щ[KќЮ]\Э^ЬЩHЩ[X[ќXИ]љY[ЩH]љXќ]\ИЫ›H‚ЉNВ\ЬЩ\ќ
€KЩ]K[Э™\ќљY]ЛY\ЪЭЬ]—
Я]K[Э™\ќљY]ЛJОњЭ[[X\ћ_Э]\ЛXќ\Я™\™XЭ\Э]\ЛXќ\ЯЭ]\ЛX\џЭ[[X\ћK[XZ[џ\ЪЭЬ]ЬЭ]\ЛXЩ[XЫЫќXЭЭ]\Л[›Л]X›KZXY\џЭ]\Л][YK\Z[Ь\‹\љ[Ьљ]KXЫЫќXЭЬ\‹Yљ^Y\Ъ^
KЛќ\Э
Э]\Х™\™XЭ
H	‰‚€Э]\Х™\™XЭљ[ЫY\К	ШЫ\ЬУ[YOHњ›Л\Э]\ЛXќ\И‰КH	‰‚€Э]\Х™\™XЭљ[ЫY\К	ШЫ\ЬУ[YOHњ›Л\Э]\ЛXЩ[‰КH	‰‚€\Э]\Х™\™XЭљ[ЫY\Књ›Л]Ь\€ЉH	‰‚€\Э]\Х™\™XЭљ[ЫY\КљZЛZЫYKY›]ЉH	‰‚€\Э]\Х™\™XЭљ[ЫY\Књ›ЛXЫЫќXЭZY[€ЉH	‰‚€
Э]\Х™\™XЭ›X]Ъ
Ч™]K[Э™\ќљY]ЛVЧЛWJЛЩКHЧJK›[™ЭHN€”Э]\Х™\™XЭќЮ]\Э\ЩHЩ[X[ќXИЭ]\ЛXќ\ИЫ\ЬЩ\Л›ЭЩ[‹XЩ\ќYћZ[™И^[Э]ЫZ[\И‚ЉNВ\ЬЩ\ќ
€VЩ\ЪЭЬ›Э]T›ЭЬЛ\ЪЭЬШ[”›ЭЬЛ\ЪЭЬ[ќ\™XЩT›ЭЬЧKњЫЫYJ
ЫЭ\ЩJHO‚€Щ]K[Э™\ќљY]ЛY\ЪЭЬ]—
Я]K\›Э]\›ЬЛ]—
ЛЛќ\Э
ЫЭ\ЩJB€
K€‘\ЪЭЬ›Э]KРS‹[™[ќ\™XЩH›ЭИ[Щ[\И]\Э^ЬЩHЩ[X[ќXИ]љY[ЩH]љXќ]\ИЫ›H‚ЉNВ\ЬЩ\ќ
€KЩ]K[Э™\ќљY]ЛY\ЪЭЬ]—
Я]K\›Э]\›ЬЛ]—
ЛЛќ\Э
\ЪЭЬљ\ЭX[КK€™\ЪЭЬЭ™\ќљY]Хљ\ЭX[ЛќЮ]\Э^ЬЩHЩ[X[ќXИљ\ЭX[]љXќ]\ИЫ›H‚ЉNВ\ЬЩ\ќ
€[Шљ[S[Щ[љ[ЫY\Књ™\ЫЫ™S[Шљ[R[ЪY[ќXЭ[Ы€ЉH	‰‚€[[Шљ[S[Щ[љ[ЫY\К™ќ[Э[Ы€X››Ь›X[XЪ\Ъ[Ы“™^XЭ[Ы€ЉH	‰‚€[[Шљ[S[Щ[љ[ЫY\К™ќ[Э[Ы€X››Ь›X[XЪ\Ъ[ЫђXЭ[Ы“›ЭHЉH	‰‚€[[Шљ[S[Щ[љ[ЫY\К™ќ[Э[Ы€X››Ь›X[XЪ\Ъ[Ы•\™Щ]X€ЉK€›[Шљ[SЭ™\ќљY]У[Щ[ќИ]\Э[YШ]H[ЪY[ќXЭ[Ы€ЫЬH[™X€\™Щ]ИИH[Шљ[HЫXЮH[Щ[H‚ЉNВ\ЬЩ\ќ
€И№§йznж:+©9aо№cиИ‹№§йzaбъfб№в­№  H‹№§йyЈ©ycищўoъ/oH‹№§йzaбъfбє`&є`dИ—K™]™\ћJ
ЫЬJHO‚€[Шљ[TЫXЮKљ[ЫY\КЫЬJB€
K€›[Шљ[SЭ™\ќљY]ФЫXЮKќИ]\ЭЭЫ€Шљ™XЭ\ЬXЪYљXИ[ЪY[ќXЭ[Ы€ЫЬH‚ЉNВ\ЬЩ\ќ
€
\ЪЭЬЫЫњЫЫK›X]Ъ
Щ]K[Э™\ќљY]ЛKЩКHЧJK›[™ЭH‹€‘\ЪЭЬЫЫњЫЫKќЮ]\ЭЩY\Ы›HЭќXЭ\[Э™\ќљY]И]љXќ]\И‚ЉNВ\ЬЩ\ќ
€\ЪЭЬЫЫњЫЫKљ[ЫY\К	Щњ›ЫH‹‹С\ЪЭЬXЪ\Ъ[Ы”Z[‰КH	‰‚€\ЪЭЬЫЫњЫЫKљ[ЫY\КЏ\ЪЭЬXЪ\Ъ[Ы”Z[ЉK€‘\ЪЭЬЫЫњЫЫKќЮ]\ЭЫЫ\ЬЩHH\ЪЭЬШљ™XЭЪ[\XЭШXЭ[Ы‹ШЬ™YXљ[]HZ[‚ЉNВ\ЬЩ\ќ
€В€™\ЪЭЬЭ™\ќљY]Р[Щ™›[™TШЩ[™H‹€™\ЪЭЬЭ™\ќљY]РЫЫXЭ[Ы”ШЩ[™H‹€™\ЪЭЬЭ™\ќљY]СY][ШЩ[™H‹€™\ЪЭЬЭ™\ќљY]Т[ќ\™XЩTШЩ[™H‹€™\ЪЭЬЭ™\ќљY]У›ФЫ\ЪЭШЩ[™H‹€™\ЪЭЬЭ™\ќљY]Ф™\ЫЭ\ЩTШЩ[™H‹€K™]™\ћJ
[Щ[S[YJHO€\ЪЭЬШЩ[™\Лљ[ЫY\Књ›ЫH‹‹ЙЫ[Щ[S[Y_H
JH	‰‚€И››Л\Ы\ЪЭ‹њ™\ЫЭ\ЩKYќ[‹ЫЫXЭ[Ы‹YЭЫ€‹љ[ќ\™XЩ\ЛYЭЫ€‹[[Щ™›[™H—K™]™\ћJ
ШЩ[\љ[КHO‚€\ЪЭЬШЩ[™\Лљ[ЫY\КШ\ЩH‰ЬШЩ[\љ[ЯHЋ
B€
H	‰‚€\ЪЭЬШЩ[™\Лљ[ЫY\Књ™]\›€ќZ[Y][\ЪЭЬШЩ[™JЫ\ЪЭЭ]JNИЉK€™\ЪЭЬЭ™\ќљY]ФШЩ[™\ЛќЮ]\Э\Ь]Ъ]™\ћH\ЪЭЬШЩ[\љ[ИИ[€\ЫЫ]YШЩ[™H[Щ[H‚ЉNВ\ЬЩ\ќ
€\ЪЭЬY][ШЩ[™Kљ[ЫY\К	Щњ›ЫH‹‹Щ\ЪЭЬЭ™\ќљY]Хљ\ЭX[И‰КK€™\ЪЭЬЭ™\ќљY]СY][ШЩ[™KќЮ]\ЭЫЫ\ЬЩHH^XЭY\ЪЭЬљ\ЭX[^Y\€‚ЉNВ\ЬЩ\ќ
€\ЪЭЬY][ШЩ[™Kљ[ЫY\К	Щњ›ЫH‹‹Щ\ЪЭЬЭ™\ќљY]ХY™љXФ›ЭЬИ‰КH	‰‚€\ЪЭЬY][ШЩ[™Kљ[ЫY\К	Щњ›ЫH‹‹Щ\ЪЭЬЭ™\ќљY]Ф›Э]T›ЭЬИ‰КH	‰‚€\ЪЭЬY][ШЩ[™Kљ[ЫY\К	Щњ›ЫH‹‹Щ\ЪЭЬЭ™\ќљY]Т[ќ\™XЩT›ЭЬИ‰КH	‰‚€\ЪЭЬY][ШЩ[™Kљ[ЫY\К	Щњ›ЫH‹‹Щ\ЪЭЬЭ™\ќљY]РЬ™YXљ[]T›ЭЬИ‰КH	‰‚€\ЪЭЬY][ШЩ[™Kљ[ЫY\К	Щњ›ЫH‹‹Щ\ЪЭЬЭ™\ќљY]Х\›Z[[›ЭЬИ‰КK€™\ЪЭЬЭ™\ќљY]СY][ШЩ[™KќЮ]\ЭЫЫњЭ[YHH›ЭИ[Щ[\И]ЭЫ€]И]љY[ЩH‚ЉNВ\ЬЩ\ќ
€\ЪЭЬY][ШЩ[™Kљ[ЫY\К	Щњ›ЫH‹‹Щ\ЪЭЬ™\ЫЭ\ЩT›ЭЬИ‰КK€™\ЪЭЬЭ™\ќљY]СY][ШЩ[™KќЮ]\ЭЫЫњЭ[YHH™\ЫЭ\ЩH]љY[ЩH›ЭИ[Щ[H‚ЉNВ\ЬЩ\ќ
€Ы[Щ[OHњ™\ЫЭ\ЩKZ[ќ\™XЩK]ЬH–ЧЏ—J—ЫЫ\ЩY‹Лќ\Э
\ЪЭЬ™\ЫЭ\ЩTШЩ[™JH	‰‚€Ы[Щ[OH››Ь›X[[ЬЛ[YЩ\€–ЧЏ—J—ЫЫ\ЩY‹Лќ\Э
\ЪЭЬ™\ЫЭ\ЩTШЩ[™JK€”™\ЫЭ\ЩKYќ[\ЪЭЬШЩ[™H]\ЭY™\€[ќ\™XЩH›ЭYЪ][™™XЩ[ќY]™[ќYЩ\њИ™[ЭИH™\ЫЭ\ЩHќYЩ[Y[ќ‚ЉNВ\ЬЩ\ќ
€\ЪЭЬљ\ЭX[Лљ[ЫY\К	Щњ›ЫH‹‹Щ\ЪЭЬЭ™\ќљY]ХY™љXФ›ЭЬИ‰КK€™\ЪЭЬЭ™\ќљY]Хљ\ЭX[ЛќЮ]\ЭЫЫњЭ[YHHY™љXИ›ЭИ[Щ[H\™XЭH‚ЉNВ\ЬЩ\ќ
€[Шљ[RЫYKљ[ЫY\КќZ[[Шљ[SЭ™\ќљY]У[Щ[ЉH	‰‚€[Шљ[RЫYKљ[ЫY\К”љ[X\ћQXЪ\Ъ[Ы€ЉH	‰‚€[Шљ[RЫYKљ[ЫY\К‘]љXЩP\€ЉH	‰‚€[Шљ[RЫYKљ[ЫY\КђЫЬ™QXЭИЉH	‰‚€[Шљ[RЫYKљ[ЫY\К”Э\Ьќ[™У\ЭЉH	‰‚€[Шљ[RЫYKљ[ЫY\Кђ›ЭЫUXњИЉK€“[Шљ[SЭ™\ќљY]ТЫYKќЮ]\Э™[XZ[€HЫX[[Шљ[KZЫYHЫЫ\ЬЪ][Ы€›Э[™\ћH‚ЉNВ\ЬЩ\ќ
€[Шљ[QXЪ\Ъ[Ы‹љ[ЫY\К›[Щ[љ\›Лќ]HЉH	‰‚€[Шљ[QXЪ\Ъ[Ы‹љ[ЫY\К‘XЪ\Ъ[Ы•љ\ЭX[ЉH	‰‚€[Шљ[RЫYTЩXЭ[ЫњЛљ[ЫY\К›[Щ[ЫЬ™SY]љXЬИЉH	‰‚€[Шљ[RЫYTЩXЭ[ЫњЛљ[ЫY\К›[Щ[њљ[X\ћS\Эњ›ЭЬИЉK€“[Шљ[HЫYH[Щ[\И]\ЭЫЫњЭ[YHXЪ\Ъ[Ы€[™Э\Ьќ[™И]љY[ЩHњ›ЫHHљY]И[Щ[‚ЉNВ\ЬЩ\ќ
€ИЫЬ™KЬЬИ‹њ›ЩXЭ\Ъ[ЬЬИ‹™њ[YKЬЬИ‹™XЪ\Ъ[Ы‹ЬЬИ‹ќ™[™ЬЬИ‹њЭ\™XЩKЬЬИ‹љ[ЪY[ќЬЬИ‹›]љYШ][Ы‹ЬЬИ‹›[™ШШ\KЬЬИ‹›[™ШШ\K]™[™ЬЬИ‹›[™ШШ\K\™\ЫЭ\ЩKЬЬИ—B€™]™\ћJ
љ[JHO€[Шљ[TЭ[\Лљ[ЫY\К[\Ьќ‹‹ЙЩљ[_HЋШ
JK€“[Шљ[HќZ[][YHФФИ]\Э\ЩHЩ[X[ќXИЫЫ\Ы™[ќ^Y\њИ‚ЉNВ\ЬЩ\ќ
€[[Шљ[RЫYKљ[ЫY\К“[Шљ[SЭ™\ќљY]ФЭ[\ИЉH	‰‚€[[Шљ[RЫYKљ[ЫY\Кќ\ЩR[њЩ\ќ[Ы‘Y™™XЭЉH	‰‚€[Шљ[RЫYKљ[ЫY\К	Ъ[\Ьќ‹‹‹ЬЭ[\ЛЫ[Шљ[KЫ[Шљ[K\›ЩXЭЬЬИЋЙКK€“[Шљ[HЫYH]\Э\ЩHќZ[][YHФФИЪ]Э]ќ[ќ[YHЭ[H[љ™XЭ[Ы€‚ЉNВ\ЬЩ\ќ
€[\Ьќ[ќЪ\™HHЋ‹€Э™\ќљY]Ф[™[ЬЬИ[\Ьќ[ќЪ\™H™YЬ™\ЬЩYX›Э™HЌ‰N€	Ъ[\Ьќ[ќЪ\™KќСљ^Y

_XЉNВ\ЬЩ\ќ
€[Шљ[Tќ[TЪ\™HHЊLK€Э™\ќљY]Ф[™[ЬЬИ[Шљ[Hќ[HЪ\™H™YЬ™\ЬЩYX›Э™HLIN€	Ы[Шљ[Tќ[TЪ\™KќСљ^Y

_XЉNВ\ЬЩ\ќ
€\ЪЭЬ™Yљ[™[Y[ќ[\Ьќ[ќЫЭ[ќHЌL€\ЪЭЬ™Yљ[™[Y[ќZ[\Ьќ[ќЫЭ[ќ™YЬ™\ЬЩYX›Э™HЌL€	Щ\ЪЭЬ™Yљ[™[Y[ќ[\Ьќ[ќЫЭ[ќXЉNВ\ЬЩ\ќ
€[™\К\ЪЭЬЫЬљЬЬXЩS^[Э]
HHЊЊ	‰‚€\ЪЭЬќ[ќ[YTЭ[\Лљ[™^ЩЉ	Р[\Ьќ‹‹Щ\ЪЭЬЬ™Yљ[™[Y[ќЬЬИЋЙКHЏH	‰‚€\ЪЭЬќ[ќ[YTЭ[\Лљ[™^ЩЉ	Р[\Ьќ‹‹Щ\ЪЭЬЭЫЬљЬЬXЩK[^[Э]ЬЬИЋЙКH‚€\ЪЭЬќ[ќ[YTЭ[\Лљ[™^ЩЉ	Р[\Ьќ‹‹Щ\ЪЭЬЬ™Yљ[™[Y[ќЬЬИЋЙКH	‰‚€\ЪЭЬќ[ќ[YTЭ[\Лљ[™^ЩЉ	Р[\Ьќ‹‹Щ\ЪЭЬЭШ[‹]™[™ЬЬИЋЙКH‚€\ЪЭЬќ[ќ[YTЭ[\Лљ[™^ЩЉ	Р[\Ьќ‹‹Щ\ЪЭЬЭЫЬљЬЬXЩK[^[Э]ЬЬИЋЙКH	‰‚€\ЪЭЬ™Yљ[™[Y[ќЫЬљЬЬXЩQЬљYќ[PЫЭ[ќOOH€\ЪЭЬЫЬљЬЬXЩH^[Э]]\ЭЭЫ€HШ[›ЫљXШ[ЬљYYќ\€™Yљ[™[Y[ќ€[™\ПIЫ[™\К\ЪЭЬЫЬљЬЬXЩS^[Э]
_H™Yљ[™[Y[ќЬљYќ[\ПIЩ\ЪЭЬ™Yљ[™[Y[ќЫЬљЬЬXЩQЬљYќ[PЫЭ[ќXЉNВ\ЬЩ\ќ
€\ЪЭЬЫЬљЬЬXЩS^[Э][\Ьќ[ќЫЭ[ќOOH€\ЪЭЬЫЬљЬЬXЩH^[Э]]\Э›Э\ЩHЭ™\њљYHљ[Ьљ]Y\О€	Щ\ЪЭЬЫЬљЬЬXЩS^[Э][\Ьќ[ќЫЭ[ќXЉNВ\ЬЩ\ќ
€\ЪЭЬ™Yљ[™[Y[ќЪYЭЩYXЫ\][ЫђЫЭ[ќOOH€\ЪЭЬ™Yљ[™[Y[ќ]\Э›Э™YXЫ\™HHШ[YH›Ь\ќH[€H]\€Y[ќXШ[Щ[XЭЬ€ЫЫќ^€	Щ\ЪЭЬ™Yљ[™[Y[ќЪYЭЩYXЫ\][ЫђЫЭ[ќXЉNВ\ЬЩ\ќ
€\ЪЭЬXЪ\Ъ[Ы”Z[ќ[PЫЭ[ќOOHH	‰€\ЪЭЬXЪ\Ъ[ЫђЩ[ќ[PЫЭ[ќHИ	‰‚€Y\ЪЭЬЫЫњЫЫT™Yљ[™[Y[ќЭ[\Лљ[ЫY\К‹њ›ЛY\ЪЭЬ][‹ZЬHЉH	‰‚€Y\ЪЭЬ[њЪ]TЭ[\Лљ[ЫY\К‹њ›ЛY\ЪЭЬ][‹ZЬHЉH	‰‚€Y\ЪЭЬ™Yљ[™[Y[ќљ[ЫY\К‹њ›ЛY\ЪЭЬ][‹ZЬHЉK€\ЪЭЬXЪ\Ъ[Ы€Z[]\ЭЭ^HЫЫњЫЫY]Y€Z[ќ[\ПIЩ\ЪЭЬXЪ\Ъ[Ы”Z[ќ[PЫЭ[ќHЩ[ќ[\ПIЩ\ЪЭЬXЪ\Ъ[ЫђЩ[ќ[PЫЭ[ќXЉNВ\ЬЩ\ќ
€\ЪЭЬЫЬљЬЬXЩQЬљYќ[PЫЭ[ќOOHH	‰€\ЪЭЬ]”ќ[PЫЭ[ќOOH€\ЪЭЬЫЬљЬЬXЩHЬљY]\ЭЭ^HШ[›ЫљXШ[[™]\Э›Э\XШ]HЪ[]љYШ][ЫЋ€ЬљYќ[\ПIЩ\ЪЭЬЫЬљЬЬXЩQЬљYќ[PЫЭ[ќH]”ќ[\ПIЩ\ЪЭЬ]”ќ[PЫЭ[ќXЉNВ\ЬЩ\ќ
€™]\™Y\ЪЭЬЫЬљЬЬXЩT›ЫЭXЫ\][ЫђЫЭ[ќOOH€™]\™Y\ЪЭЬ^Y\њИ]\Э›Э™XЫZ[HH\ЩHЫЬљЬЬXЩHЬљY€	Ь™]\™Y\ЪЭЬЫЬљЬЬXЩT›ЫЭXЫ\][ЫђЫЭ[ќXЉNВ\ЬЩ\ќ
€\ЪЭЬYШXЮT›ЫЭќ[PЫЭ[ќOOH€\ЪЭЬ\ЩHЭ[\И]\Э›ЭЪ\[XЭ]™H›]Y[њЩH›ЫЭќ[\О€	Щ\ЪЭЬYШXЮT›ЫЭќ[PЫЭ[ќXЉNВ\ЬЩ\ќ
€\ЪЭЬЭ]\Рќ\Фќ[PЫЭ[ќOOHL	‰€\ЪЭЬYШXЮUЬ\”ќ[PЫЭ[ќOOH€\ЪЭЬЭ]\Иќ\И]\ЭЭ^HШ[›ЫљXШ[€Э]\Рќ\Фќ[\ПIЩ\ЪЭЬЭ]\Рќ\Фќ[PЫЭ[ќHYШXЮUЬ\”ќ[\ПIЩ\ЪЭЬYШXЮUЬ\”ќ[PЫЭ[ќXЉNВ\ЬЩ\ќ
€\ЪЭЬ[Щ[TЪ[ќ[PЫЭ[ќOOHH	‰€\ЪЭЬ[Щ[RXYќ[PЫЭ[ќOOHЛ€\ЪЭЬ[Щ[HЪ[ЪXY]\ЭЭ^HШ[›ЫљXШ[€Ъ[ќ[\ПIЩ\ЪЭЬ[Щ[TЪ[ќ[PЫЭ[ќHXYќ[\ПIЩ\ЪЭЬ[Щ[RXYќ[PЫЭ[ќXЉNВ\ЬЩ\ќ
€\ЪЭЬYЩ\”ќ[PЫЭ[ќOOH€	‰€Y\ЪЭЬ™Yљ[™[Y[ќљ[ЫY\К›ќXЪ[
Щ
HЉK€\ЪЭЬYЩ\€]\ЭЭ^HШ[›ЫљXШ[[™™XњKYњ™YN€YЩ\”ќ[\ПIЩ\ЪЭЬYЩ\”ќ[PЫЭ[ќXЉNВ\ЬЩ\ќ
€\ЪЭЬ[Щ[UЫ™Tќ[PЫЭ[ќOOH€	‰‚€\ЪЭЬYЩ\•Ы™Tќ[PЫЭ[ќOOHИ	‰‚€\ЪЭЬYЩ\•Ы™TЪYЭРЫЭ[ќOOH€\ЪЭЬЫ™HY\\ЪH]\ЭЭ^H™\ЭZ[™Y€[Щ[UЫ™Tќ[\ПIЩ\ЪЭЬ[Щ[UЫ™Tќ[PЫЭ[ќHYЩ\•Ы™Tќ[\ПIЩ\ЪЭЬYЩ\•Ы™Tќ[PЫЭ[ќHYЩ\•Ы™TЪYЭЬПIЩ\ЪЭЬYЩ\•Ы™TЪYЭРЫЭ[ќXЉNВ\ЬЩ\ќ
€\ЪЭЬ™[X\ЩUЫ™T™\Щ]ЫЭ[ќOOHH	‰€\ЪЭЬ™[X\ЩS›Ы”љ[X\ћS™]][ЫЭ[ќOOHK€\ЪЭЬ™[X\ЩHЫ™H™\Щ]]\Э™]][^™H›ЭИЪ›ЫYH[™›Ы‹\љ[X\ћH^€™\Щ]ПIЩ\ЪЭЬ™[X\ЩUЫ™T™\Щ]ЫЭ[ќH›Ы”љ[X\ћOIЩ\ЪЭЬ™[X\ЩS›Ы”љ[X\ћS™]][ЫЭ[ќXЉNВ\ЬЩ\ќ
€Y\ЪЭЬ™[X\ЩKљ[ЫY\КђYYXH
X^]ЪYЉH	‰‚€Y\ЪЭЬ™[X\ЩKљ[ЫY\КљZЛ]ЌЊЉH	‰‚€Y\ЪЭЬ™[X\ЩKљ[ЫY\КљZЛ]ЌЊЊЉH	‰‚€Y\ЪЭЬ™[X\ЩKљ[ЫY\КќЊLМ€ЉK€‘\ЪЭЬ™[X\ЩH^Y\€]\Э›ЭШ\њћH[XЭ]™H[Шљ[H]ЪЭ[\И‚ЉNВ\ЬЩ\ќ
€™\њЪ[Ы“X\љЩ\ђЫЭ[ќHMNK€Э™\ќљY]Ф[™[ЬЬИ™\њЪ[Ы€X\љЩ\€ЫЭ[ќ™YЬ™\ЬЩYX›Э™HMNN€	Э™\њЪ[Ы“X\љЩ\ђЫЭ[ќXЉNВ\ЬЩ\ќ
€[[Шљ[TЭ[\Лљ[ЫY\К™›Э[™][Ы€ЉH	‰€[[Шљ[TЭ[\Лљ[ЫY\Књ™\Z\€ЉK€“[Шљ[HФФИ[ќћH™Z[ќ›ЩXЩYЪ›Ы›ЫЩЪXШ[]Ъ^Y\њИ‚ЉNВЫЫњЭ[Шљ[TЭ[S^Y\‘љ[\ИHВ€њЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЫ[Шљ[KШЫЬ™KЬЬИ‹€њЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЫ[Шљ[KЩњ[YKЬЬИ‹€њЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЫ[Шљ[KЩXЪ\Ъ[Ы‹ЬЬИ‹€њЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЫ[Шљ[KЭ™[™ЬЬИ‹€њЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЫ[Шљ[KЬЭ\™XЩKЬЬИ‹€њЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЫ[Шљ[KЬ›ЩXЭ\Ъ[ЬЬИ‹€њЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЫ[Шљ[KЪ[ЪY[ќЬЬИ‹€њЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЫ[Шљ[KЫ]љYШ][Ы‹ЬЬИ‹€њЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЫ[Шљ[KЫ[™ШШ\KЬЬИ‹€њЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЫ[Шљ[KЫ[™ШШ\K]™[™ЬЬИ‹€њЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЫ[Шљ[KЫ[™ШШ\K\™\ЫЭ\ЩKЬЬИ‹—NВЫЫњЭ[Шљ[TЭ[S[™S[Z]ИH™]ИX\
В€ИњЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЫ[Шљ[KШЫЬ™KЬЬИ‹K€ИњЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЫ[Шљ[KЩњ[YKЬЬИ‹LK€ИњЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЫ[Шљ[KЩXЪ\Ъ[Ы‹ЬЬИ‹ММK€ИњЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЫ[Шљ[KЭ™[™ЬЬИ‹LK€ИњЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЫ[Шљ[KЬЭ\™XЩKЬЬИ‹ЊЊK€ИњЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЫ[Шљ[KЬ›ЩXЭ\Ъ[ЬЬИ‹МЊK€ИњЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЫ[Шљ[KЪ[ЪY[ќЬЬИ‹LЊK€ИњЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЫ[Шљ[KЫ]љYШ][Ы‹ЬЬИ‹K€ИњЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЫ[Шљ[KЫ[™ШШ\KЬЬИ‹K€ИњЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЫ[Шљ[KЫ[™ШШ\K]™[™ЬЬИ‹K€ИњЬЛЬ[™[Yњ[Y]ЫЬљЛЫЭ™\ќљY]ЛЬЭ[\ЛЫ[Шљ[KЫ[™ШШ\K\™\ЫЭ\ЩKЬЬИ‹K—JNВ›][Шљ[TЭ[Pћ]UЭ[HВ™›Ь€
ЫЫњЭ™[Щ€[Шљ[TЭ[S^Y\‘љ[\КHВ€Y€
Y^\ЭК™[
JHЫЫќ[ќYNВ€ЫЫњЭ^Y\€H™XY
™[
NВ€[Шљ[TЭ[Pћ]UЭ[
ПHћ]\К™[
NВ€\ЬЩ\ќ
€[™\К^Y\ЉHH[Шљ[TЭ[S[™S[Z]Л™Щ]
™[
K€	Ь™[H^ЩYYИ	Ы[Шљ[TЭ[S[™S[Z]Л™Щ]
™[
_H[™\О€	Ы[™\К^Y\Љ_X€
NВџB\ЬЩ\ќ
€[Шљ[TЭ[Pћ]UЭ[HL€[Шљ[HЭ™\ќљY]ИЭ[H^Y\њИ^ЩYYLРЋ€	Ы[Шљ[TЭ[Pћ]UЭ[XЉNВ‚‚љY€
^\ЭКќZ[ЬЬСљ[JJHВ€ЫЫњЭќZ[ЬЬИH™XY
ќZ[ЬЬСљ[JNВ€ЫЫњЭќZ[ЬЬФ›ЫЭHЬЭЬЬЛњ\њЩJќZ[ЬЬЛИњ›ЫN€ќZ[ЬЬСљ[HJNВ€]ќZ[YШXЮR[ЬФЩ[XЭЬђЫЭ[ќHВ€]ќZ[YШXЮS[Шљ[TЩ[XЭЬђЫЭ[ќHВ€ќZ[ЬЬФ›ЫЭќШ[Фќ[\К
ќ[JHO€В€Y€
ќ[KњЩ[XЭЬ‹љ[ЫY\К‹љZЛZ[ЬЛHЉJHќZ[YШXЮR[ЬФЩ[XЭЬђЫЭ[ќ
ПHNВ€Y€
ќ[KњЩ[XЭЬ‹љ[ЫY\К‹љZЛ[[Шљ[KHЉJHќZ[YШXЮS[Шљ[TЩ[XЭЬђЫЭ[ќ
ПHNВ€JNВ€\ЬЩ\ќ
ћ]\КќZ[ЬЬСљ[JHHLќZ[Э[KЬЬИ^ЩYYИLРЋ€	Шћ]\КќZ[ЬЬСљ[J_X
NВ€\ЬЩ\ќ
€ќZ[YШXЮR[ЬФЩ[XЭЬђЫЭ[ќOOH€ќZ[Э[KЬЬИЫЫќZ[њИ	ШќZ[YШXЮR[ЬФЩ[XЭЬђЫЭ[ќHYШXЮHZЛZ[ЬИЩ[XЭЬ€ќ[\Ш€
NВ€\ЬЩ\ќ
€ќZ[YШXЮS[Шљ[TЩ[XЭЬђЫЭ[ќ€	‰€ќZ[YШXЮS[Шљ[TЩ[XЭЬђЫЭ[ќHЊЊ€ќZ[Э[KЬЬИ[Шљ[HЩ[XЭЬ€ќYЩ]]\ЭЭ^HЪ][€K‹ЊЊЊќ[\О€	ШќZ[YШXЮS[Шљ[TЩ[XЭЬђЫЭ[ќX€
NВџB‚љY€
Z[\™\Л›[™Э€
HВ€ЫЫњЫЫK™\њ›ЬЉ›Э™\ќљY]И\Ъ]XЭ\™HШ]N€ђRSЉNВ€›Ь€
ЫЫњЭZ[\™HЩ€Z[\™\КHЫЫњЫЫK™\њ›ЬЉH	ЩZ[\™_X
NВ€›ШЩ\ЬЛ™^]
JNВџB‚ЫЫњЫЫK›ЩК€Э™\ќљY]И\Ъ]XЭ\™HШ]N€TФИ[™[IЫ[™\К[™[
_H[™\И\ЪЭЬIЫ[™\К\ЪЭЬЫЫњЫЫJ_H[™\И\ЪЭЬXЪ\Ъ[ЫЏIЫ[™\К\ЪЭЬXЪ\Ъ[Ы”Z[
_H[™\ИШЩ[™\ПIЫ[™\К\ЪЭЬШЩ[™\К_H[™\И[\ЏIЫ[™\К\ЪЭЬ[\њК_H[™\И™\Щ[ќ][ЫЏIЫ[™\К\ЪЭЬ™\Щ[ќ][ЫЉ_H[™\ИЬ\ЏIЫ[™\К\ЪЭЬЬ\Љ_H[™\ИY™љXФ›ЭЬПIЫ[™\К\ЪЭЬY™љXФ›ЭЬК_H[™\И›Э]T›ЭЬПIЫ[™\К\ЪЭЬ›Э]T›ЭЬК_H[™\ИШ[”›ЭЬПIЫ[™\К\ЪЭЬШ[”›ЭЬК_H[™\И[ќ\™XЩT›ЭЬПIЫ[™\К\ЪЭЬ[ќ\™XЩT›ЭЬК_H[™\ИЬ™YXљ[]T›ЭЬПIЫ[™\К\ЪЭЬЬ™YXљ[]T›ЭЬК_H[™\И\›Z[[›ЭЬПIЫ[™\К\ЪЭЬ\›Z[[›ЭЬК_H[™\И™\ЫЭ\ЩT›ЭЬПIЫ[™\К\ЪЭЬ™\ЫЭ\ЩT›ЭЬК_H[™\Иљ\ЭX[ПIЫ[™\К\ЪЭЬљ\ЭX[К_H[™\И[Шљ[RЫYOIЫ[™\К[Шљ[RЫYJ_H[™\И[Шљ[QXЪ\Ъ[ЫЏIЫ[™\К[Шљ[QXЪ\Ъ[ЫЉ_H[™\И[Шљ[TЩXЭ[ЫњПIЫ[™\К[Шљ[RЫYTЩXЭ[ЫњК_H[™\И[Шљ[UX•љY]ПIЫ[™\К[Шљ[UX•љY]К_H[™\И[Шљ[UX”›ЭЬПIЫ[™\К[Шљ[UX”›ЭЬК_H[™\ИЬЬПIШћ]\К[™[ЬЬСљ[J_Hћ]\И\ЪЭЬ\ЩOIЫ[™\К\ЪЭЬ\ЩTЭ[\К_H[™\И\ЪЭЬ\ЩR[\Ьќ[ќIЩ\ЪЭЬ\ЩR[\Ьќ[ќЫЭ[ќH[Шљ[TЭ[\ПIЫ[Шљ[TЭ[Pћ]UЭ[Hћ]\И[\Ьќ[ќIЪ[\Ьќ[ќЪ\™KќСљ^Y

_H\ЪЭЬ[\Ьќ[ќIЩ\ЪЭЬ™Yљ[™[Y[ќ[\Ьќ[ќЫЭ[ќHЫЬљЬЬXЩR[\Ьќ[ќIЩ\ЪЭЬЫЬљЬЬXЩS^[Э][\Ьќ[ќЫЭ[ќHXЪ\Ъ[Ы”Z[ќ[\ПIЩ\ЪЭЬXЪ\Ъ[Ы”Z[ќ[PЫЭ[ќHXЪ\Ъ[ЫђЩ[ќ[\ПIЩ\ЪЭЬXЪ\Ъ[ЫђЩ[ќ[PЫЭ[ќHЫЬљЬЬXЩQЬљYќ[\ПIЩ\ЪЭЬЫЬљЬЬXЩQЬљYќ[PЫЭ[ќH]”ќ[\ПIЩ\ЪЭЬ]”ќ[PЫЭ[ќHЭ]\Рќ\Фќ[\ПIЩ\ЪЭЬЭ]\Рќ\Фќ[PЫЭ[ќHYШXЮUЬ\”ќ[\ПIЩ\ЪЭЬYШXЮUЬ\”ќ[PЫЭ[ќH[Щ[TЪ[ќ[\ПIЩ\ЪЭЬ[Щ[TЪ[ќ[PЫЭ[ќH[Щ[RXYќ[\ПIЩ\ЪЭЬ[Щ[RXYќ[PЫЭ[ќHYЩ\”ќ[\ПIЩ\ЪЭЬYЩ\”ќ[PЫЭ[ќH[Щ[UЫ™Tќ[\ПIЩ\ЪЭЬ[Щ[UЫ™Tќ[PЫЭ[ќHYЩ\•Ы™Tќ[\ПIЩ\ЪЭЬYЩ\•Ы™Tќ[PЫЭ[ќHYЩ\•Ы™TЪYЭЬПIЩ\ЪЭЬYЩ\•Ы™TЪYЭРЫЭ[ќH™[X\ЩUЫ™T™\Щ]ПIЩ\ЪЭЬ™[X\ЩUЫ™T™\Щ]ЫЭ[ќH™[X\ЩS›Ы”љ[X\ћOIЩ\ЪЭЬ™[X\ЩS›Ы”љ[X\ћS™]][ЫЭ[ќH[Шљ[OIЫ[Шљ[Tќ[TЪ\™KќСљ^Y

_XЉNВ