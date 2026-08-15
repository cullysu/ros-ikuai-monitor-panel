#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (relative) => { const target = path.join(root, relative); return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : ""; };
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };
const ownerPath = "src/panel-framework/mobile-flow-ui";
const overview = read(`${ownerPath}/overview/MobileFlowOverview.tsx`);
const model = read(`${ownerPath}/overview/mobileFlowModel.ts`);
const navigation = read(`${ownerPath}/navigation/MobileFlowNavigation.tsx`);
const workspace = read(`${ownerPath}/workspace/MobileFlowWorkspace.tsx`);
const history = read("src/panel-framework/domain-workspace/workspaceHistory.ts");
const routes = read(`${ownerPath}/workspace/MobileFlowRoutes.tsx`);
const connection = read(`${ownerPath}/connection/MobileFlowConnection.tsx`);
const mobileApp = read("src/panel-framework/mobile/MobilePanelApp.tsx");
const fallbackApp = read("src/panel-framework/panel-framework-app.tsx");
const source = [overview, model, navigation, workspace, connection, mobileApp, fallbackApp].join("\n");

expect(fs.existsSync(path.join(root, ownerPath)), "Mobile Flow owner must exist");
for (const rejected of ["mobile-native-ui", "mobile-ops-ui", "mobile-pulse-ui", "mobile-patrol", "mobile-ikuai4"]) expect(!fs.existsSync(path.join(root, "src/panel-framework", rejected)), `rejected ${rejected} tree must be physically deleted`);
expect(/data-mobile-flow-overview/.test(overview) && /data-mobile-flow-scene=\{model\.scene\}/.test(overview), "overview must expose flow owner and scene boundaries");
expect(/<EvidenceRail/.test(overview) && /<StatusBand/.test(overview) && /<ObjectStream/.test(overview), "evidence, status, and related object flow must remain distinct");
expect(/buildMobileFlowModel\(evidence\)/.test(overview), "overview must project shared evidence through Mobile Flow");
expect(/model\.scene === "normal"[\s\S]*model\.scene === "resource"[\s\S]*model\.scene === "interfaces"[\s\S]*model\.scene === "collection"[\s\S]*model\.scene === "unavailable"[\s\S]*model\.scene === "fleet"/.test(overview), "scene-owned task trees must be structurally exclusive");
expect(/viewBox=\{`0 0 \$\{width\} \$\{height\}`\}/.test(overview) && /preserveAspectRatio="xMidYMid meet"/.test(overview) && /traffic\.peak/.test(overview) && /traffic\.points/.test(overview) && /traffic\.unit/.test(overview), "traffic must preserve aspect ratio, peak units, samples, and time evidence");
expect(/MobileFlowScene = "normal" \| "fleet" \| "resource" \| "interfaces" \| "collection" \| "unavailable" \| "wan"/.test(model), "model must retain normal, Fleet, and incident scenes");
expect(/scene === "normal" && evidence\.evidenceMode === "current" && evidence\.traffic\?\.status === "ready"/.test(model), "traffic may render only from current ready evidence");
expect(/route: evidence\.evidenceMode === "current" \? evidence\.routeEvidence\.activePath : null/.test(model) && !/route:\s*[^\n;]*(?:rows|defaultRoutes)\s*\[\s*0\s*\]/.test(model) && !/routeEvidence\.activePath\s*\|\|/.test(model), "route truth must have no first-row fallback");
expect(["interfaces", "resource", "collection", "wan"].every((risk) => model.includes(`evidence.risk === "${risk}"`)), "risk states must remain explicit mobile scenes");
expect(/scene === "normal" \? normalObjects\(evidence\) : scene === "fleet" \? evidence\.coverageObjects/.test(model), "normal, Fleet, and incident queues must have separate ownership");
expect(/routeEvidence\.interfaceDependencies\.some\(\(row\) => row\.interfaceId === item\.targetObjectId\)/.test(model) && /dependent \?/.test(model), "interface risk must depend on explicit route relationships");
expect(/for \(let index = points\.length - 1; index >= 0 && points\[index\]\.value >= metric\.threshold; index -= 1\) count \+= 1;/.test(model), "resource continuity must count trailing adjacent samples only");
expect(/evidence\.scenario === "fleet" && evidence\.coverageObjects\.length/.test(model), "Fleet must not outrank higher-priority risk scenes");
const roots = navigation.match(/const ITEMS:[\s\S]*?\n\];/)?.[0] || "";
expect((roots.match(/route:\s*"/g) || []).length === 4 && /route:\s*"overview"/.test(roots) && /route:\s*"lineStatus"/.test(roots) && /route:\s*"dhcp"/.test(roots) && /route:\s*"logs"/.test(roots) && !/route:\s*"more"/.test(roots), "navigation must retain four stable roots and More must not become a fifth root");
expect(/data-mobile-flow-navigation/.test(navigation) && /aria-current/.test(navigation), "navigation must expose selected state");
expect(/data-mobile-flow-workspace/.test(workspace) && /data-mobile-flow-detail/.test(workspace), "workspace must expose list and detail boundaries");
expect(/useObjectHistory/.test(workspace) && /window\.addEventListener\("popstate"/.test(history) && /window\.history\.pushState/.test(history) && /window\.history\.back\(\)/.test(history), "object inspection must honour Back and Forward");
expect(/function normalized\(value: string\): string \{ return value\.trim\(\)\.toLowerCase\(\); \}/.test(workspace) && !/toLocaleLowerCase/.test(workspace), "search normalization must be locale invariant");
expect([/观测边界/, /时间/, /来源/, /对象证据/, /row\.columns/].every((pattern) => pattern.test(workspace)), "detail must add evidence beyond the list summary");
expect(/data-mobile-flow-connection/.test(connection) && /REST/.test(connection) && /SSH/.test(connection), "connection must remain a mobile-owned dual-channel flow");
expect(/password.*useState|useState.*password/.test(connection), "connection password must stay in component memory");
for (const component of ["MobileFlowOverview", "MobileFlowNavigation", "MobileFlowRoutes", "MobileFlowConnection"]) expect(mobileApp.includes(component) && fallbackApp.includes(component), `all mobile entry owners must mount ${component}`);
expect(/MobileFlowWorkspace/.test(routes), "Mobile Flow routes must own the object workspace");
expect(!/MobileNative|mobile-native-ui|data-mobile-native|MobileOps|mobile-ops-ui|data-mobile-ops|MobilePulse|mobile-pulse-ui|data-mobile-pulse|MobilePatrol|mobile-patrol|data-mobile-patrol|IkuaiMobile|mobile-ikuai4/.test(source), "current entry cannot retain a rejected owner marker");
if (failures.length) {
  console.error("mobile-flow-ui static gate: FAIL");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("mobile-flow-ui static gate: PASS");
console.log("Checked scene ownership, evidence truth, stable navigation, history, connection ownership, and rejected-owner absence.");
