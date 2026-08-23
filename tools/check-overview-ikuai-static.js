"use strict";

const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const ownerPath = "src/panel-framework/mobile-reference-ui";
const surface = read(`${ownerPath}/MobileReferenceSurface.tsx`);
const connection = read(`${ownerPath}/MobileReferenceConnection.tsx`);
const styles = read(`${ownerPath}/mobile-reference.css`);
const mobileApp = read("src/panel-framework/mobile/MobilePanelApp.tsx");
const fallbackApp = read("src/panel-framework/panel-framework-app.tsx");
const source = [surface, connection, styles, mobileApp, fallbackApp].join("\n");
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

expect(fs.existsSync(path.join(root, ownerPath)), "Mobile Reference owner must exist");
for (const rejected of ["mobile-situation-ui", "mobile-flow-ui", "mobile-native-ui", "mobile-ops-ui", "mobile-pulse-ui", "mobile-patrol", "mobile-ikuai-ui", "mobile-inspection-ui"]) expect(!fs.existsSync(path.join(root, "src/panel-framework", rejected)), `rejected ${rejected} tree must be physically absent`);
for (const marker of ["data-mobile-reference-home", "data-mobile-reference-scene", "data-mobile-reference-wan-detail", "data-mobile-reference-directory", "data-mobile-reference-workspace", "data-mobile-reference-navigation"]) expect(surface.includes(marker), `surface must expose ${marker}`);
expect(/buildMobileReferenceModel/.test(surface), "surface must project shared evidence through Mobile Reference");
expect(/scene === "normal"/.test(surface) && /scene === "resource"/.test(surface) && /scene === "interfaces"/.test(surface), "normal, resource and interface scenes must have distinct modules");
expect(/preserveAspectRatio="xMidYMid meet"/.test(surface) && /ref-chart__down/.test(surface) && /ref-chart__up/.test(surface) && /traffic\.unit/.test(surface), "WAN chart must preserve aspect ratio and expose two named series");
expect(/evidence\.evidenceMode === "current" && evidence\.traffic\?\.status === "ready"/.test(surface), "traffic may render only from current ready evidence");
expect(!/(?:rows|defaultRoutes)\s*\[\s*0\s*\]/.test(surface) && !/verified\s*\|\|\s*rows\s*\[/.test(surface), "route truth must have no first-row fallback");
expect(/const active = evidence\.evidenceMode === "current" \? evidence\.routeEvidence\.activePath : null/.test(surface), "route evidence must be current-only");
expect(/const order = \{ cpu: 0, memory: 1, disk: 2 \}/.test(surface) && /ResourceSparkline/.test(surface), "resource rows must use stable CPU/memory/disk order and real sample sparklines");
expect(/resourceImpactRows/.test(surface) && !/priorityObjectsAll\.slice\(0, 3\)/.test(surface), "resource affected objects must not simply repeat resource proof rows");
expect(/label: "概览"/.test(surface) && /label: "网络"/.test(surface) && /label: "设备"/.test(surface) && /label: "日志"/.test(surface), "navigation must retain four stable roots");
expect(/data-mobile-reference-connection/.test(connection) && /REST/.test(connection) && /SSH/.test(connection), "connection must remain a mobile-owned dual-channel flow");
expect(/password.*useState|useState.*password/.test(connection), "connection password must stay in component memory");
expect(/MobileReferenceSurface/.test(mobileApp) && /MobileReferenceNavigation/.test(mobileApp) && /MobileReferenceConnection/.test(mobileApp) && /MobileReferenceSurface/.test(fallbackApp), "all mobile entry owners must mount the reference surface");
expect(/prefers-reduced-motion/.test(styles) && /prefers-reduced-transparency/.test(styles) && /forced-colors/.test(styles), "mobile styles must retain adaptive accessibility rules");
expect(!/!important/.test(styles) && !/transition\s*:\s*all/.test(styles), "mobile styles cannot depend on patch sediment");
expect(!/MobileSituation|mobile-situation-ui|MobileFlow|mobile-flow-ui|MobileNative|mobile-native-ui|MobileOps|mobile-ops-ui|MobilePulse|mobile-pulse-ui|MobilePatrol|mobile-patrol|IkuaiMobile|mobile-ikuai-ui|mobile-inspection-ui/.test(source), "current entry cannot retain a rejected owner marker");

if (failures.length) {
  console.error("mobile-reference-ui static gate: FAIL");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("mobile-reference-ui static gate: PASS");
console.log("Checked sole owner, scene separation, chart/evidence truth, navigation, connection ownership and rejected-owner absence.");
