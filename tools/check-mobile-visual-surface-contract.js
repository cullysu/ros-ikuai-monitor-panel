#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const owner = path.join(root, "src", "panel-framework", "mobile-flow-ui");
const failures = [];
const read = (...segments) => {
  const file = path.join(root, ...segments);
  if (!fs.existsSync(file)) { failures.push(`missing Mobile Flow visual surface: ${path.relative(root, file).replace(/\\/g, "/")}`); return ""; }
  return fs.readFileSync(file, "utf8");
};
const check = (pass, name, detail) => { if (!pass) failures.push({ name, detail }); };
const includesEvery = (source, expressions) => expressions.every((expression) => expression.test(source));
const pxFontSizes = (source) => [...source.matchAll(/font-size\s*:\s*([0-9]+(?:\.[0-9]+)?)px\b/gi)].map((match) => Number(match[1]));
const files = {
  overview: read("src", "panel-framework", "mobile-flow-ui", "overview", "MobileFlowOverview.tsx"),
  model: read("src", "panel-framework", "mobile-flow-ui", "overview", "mobileFlowModel.ts"),
  navigation: read("src", "panel-framework", "mobile-flow-ui", "navigation", "MobileFlowNavigation.tsx"),
  workspace: read("src", "panel-framework", "mobile-flow-ui", "workspace", "MobileFlowWorkspace.tsx"),
  routes: read("src", "panel-framework", "mobile-flow-ui", "workspace", "MobileFlowRoutes.tsx"),
  connection: read("src", "panel-framework", "mobile-flow-ui", "connection", "MobileFlowConnection.tsx"),
  app: read("src", "panel-framework", "mobile", "MobilePanelApp.tsx"),
  overviewCss: read("src", "panel-framework", "mobile-flow-ui", "styles", "flow-overview.css"),
  navigationCss: read("src", "panel-framework", "mobile-flow-ui", "styles", "flow-navigation.css"),
  workspaceCss: read("src", "panel-framework", "mobile-flow-ui", "styles", "flow-workspace.css"),
  directoryCss: read("src", "panel-framework", "mobile-flow-ui", "styles", "flow-directory.css"),
  connectionCss: read("src", "panel-framework", "mobile-flow-ui", "styles", "flow-connection.css"),
};
const presentation = Object.values(files).join("\n");
const styles = [files.overviewCss, files.navigationCss, files.workspaceCss, files.directoryCss, files.connectionCss].join("\n");
const rejectedMarker = /MobileNative|mobile-native-ui|data-mobile-native|\bmni-|\bmnw-|\bmnc-|MobileOps|mobile-ops-ui|data-mobile-ops|\bmou-|\bmow-|\bmop-|MobilePulse|mobile-pulse-ui|data-mobile-pulse|MobilePatrol|mobile-patrol|IkuaiMobile|mobile-ikuai4|data-ikuai-mobile|data-origin-navigation/;
const glassSelectors = [...styles.matchAll(/([^{}]+)\{[^{}]*backdrop-filter\s*:\s*(?!none\b)[^{}]*\}/g)].map((match) => match[1]);
const fontSizes = pxFontSizes(styles);

check(fs.existsSync(owner), "Mobile Flow owns the current mobile presentation", "the isolated mobile-flow-ui owner must exist");
for (const rejected of ["mobile-native-ui", "mobile-ops-ui", "mobile-pulse-ui", "mobile-patrol", "mobile-ikuai4"]) check(!fs.existsSync(path.join(root, "src", "panel-framework", rejected)), `Rejected ${rejected} tree is physically deleted`, "a rejected mobile tree may not remain as a fallback");
check(includesEvery(files.overview, [/data-mobile-flow-overview/, /data-mobile-flow-scene=\{model\.scene\}/, /<EvidenceRail/, /<StatusBand/, /<ObjectStream/]), "overview exposes a flow-owned evidence rail, status band, and object stream", "the first viewport must be a phone patrol flow, not a desktop dashboard compressed into rows");
check(includesEvery(files.overview, [/<NormalInstrument/, /<FleetInstrument/, /<ResourceInstrument/, /<InterfaceInstrument/, /<CollectionInstrument/, /<UnavailableInstrument/, /<WanInstrument/]), "normal, fleet, resource, interface, collection, unavailable, and WAN compositions are structurally distinct", "each exception scene must own a distinct task component rather than recolor a normal card stack");
check(includesEvery(files.overview, [/viewBox=\{`0 0 \$\{width\} \$\{height\}`\}/, /preserveAspectRatio="xMidYMid meet"/, /mflow-chart__down/, /mflow-chart__up/, /traffic\.points/, /traffic\.peak/]) && /traffic\.unit/.test(files.overview), "traffic uses proportional SVG with scale, time range, separate upload/download paths, and units", "phone traffic evidence must stay interpretable under responsive sizing");
check(/\.mflow-chart figcaption[^{}]*\{[^}]*font-size:\s*(?:1[1-9]|[2-9][0-9])px/.test(files.overviewCss) && /\.mflow-chart > div[^{}]*\{[^}]*font-size:\s*(?:1[1-9]|[2-9][0-9])px/.test(files.overviewCss), "chart labels meet the 11px operational floor", "phone charts may not shrink labels below the contract floor");
const roots = files.navigation.match(/const ITEMS:[\s\S]*?\n\];/)?.[0] || "";
check((roots.match(/route:\s*"/g) || []).length === 4 && /route:\s*"overview"/.test(roots) && /route:\s*"lineStatus"/.test(roots) && /route:\s*"dhcp"/.test(roots) && /route:\s*"logs"/.test(roots) && !/route:\s*"more"/.test(roots), "persistent navigation is real and has four stable roots", "navigation must expose four selected work roots rather than a decorative dock");
check(includesEvery(files.navigation, [/data-mobile-flow-navigation/, /aria-current/]), "navigation exposes selected state", "the mobile root navigation must not be decorative");
check(includesEvery(files.navigationCss, [/grid-template-columns:\s*repeat\(4/, /min-height:\s*(?:4[4-9]|[5-9][0-9])px/, /backdrop-filter/, /prefers-reduced-motion/, /prefers-reduced-transparency/, /forced-colors/]), "navigation is compact, touch-sized, and preference-aware", "four stable targets, 44px hit areas, scoped glass, and accessibility preferences are required");
check(includesEvery(files.workspace, [/data-mobile-flow-workspace/, /data-mobile-flow-detail/, /useObjectHistory/, /data-mobile-flow-object-trigger/]), "object workspaces use a phone-owned list/detail path", "objects must be inspectable without a desktop surface fallback");
check(includesEvery(files.connection, [/data-mobile-flow-connection/, /REST/, /SSH/, /TLS/]), "connection keeps a phone-owned dual-channel security boundary", "REST and SSH must remain visibly distinct in the mobile flow");
check(!rejectedMarker.test(presentation), "Mobile Flow surface contains no rejected owner or selector", "new selectors must use data-mobile-flow and mflow semantics only");
check(glassSelectors.length > 0 && glassSelectors.every((selector) => /\.mflow-topbar button|\.mflow-tabs|\.mflow-connection footer/.test(selector)) && !/backdrop-filter\s*:/.test([files.workspaceCss, files.directoryCss].join("\n")), "glass is limited to compact control layers", "data, evidence, workspace, and directory surfaces must stay solid and readable");
check(!/!important\b/i.test(styles) && !/transition\s*:\s*all(?:\s|,|;|$)|transition-property\s*:\s*all\b/i.test(styles), "Mobile Flow CSS has no priority escape hatch or unbounded transition", "mobile polish may not depend on !important or transition-all");
check(fontSizes.length > 0 && Math.min(...fontSizes) >= 11, "visible Mobile Flow text keeps the 11px operational floor", "compact density must not become illegible microcopy");
check(/@media\s*\(max-width:\s*340px\)/.test(files.overviewCss) && /@media\s*\(orientation:\s*landscape\)/.test(files.overviewCss) && /@media\s*\(min-width:\s*600px\)/.test(files.overviewCss) && /data-panel-large-text="true"/.test(files.overviewCss), "small phone, landscape, tablet, and text-scale layouts are explicitly owned", "a mobile UI must reflow intentionally across its supported mobile contexts");
const entryCss = read("src", "panel-framework", "mobile", "mobile-entry.css");
for (const stylesheet of ["flow-overview", "flow-navigation", "flow-workspace", "flow-directory", "flow-connection"]) check(new RegExp(`mobile-flow-ui/styles/${stylesheet}\\.css`).test(entryCss), `mobile shell loads ${stylesheet}`, "the isolated visual surface must be the runtime stylesheet owner");

if (failures.length) {
  console.error("mobile-flow-ui visual surface gate: FAIL");
  failures.forEach((failure) => console.error(`- ${typeof failure === "string" ? failure : `${failure.name}: ${failure.detail}`}`));
  process.exit(1);
}
console.log("mobile-flow-ui visual surface gate: PASS");
console.log("Checked flow-owned scene structure, proportional traffic, compact navigation, scoped glass controls, solid evidence surfaces, and responsive phone/tablet/text-scale ownership.");
