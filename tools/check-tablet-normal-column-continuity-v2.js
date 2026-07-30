/**
 * R09 focused contract: the 768px normal tablet workbench keeps the two task
 * streams independent. The left column owns route evidence and follow-up, the
 * right column owns signal and decisions, one spanning object workspace owns
 * comparison, and the support band then owns relation/evidence in that order.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const screen = read("src/panel-framework/mobile/MobilePatrolScreen.tsx");
const css = read("src/panel-framework/mobile/mobile-tablet-layout.css");
const runtime = JSON.parse(read("_acceptance/panel-runtime-browser/report.json"));
const runtimeCheck = (runtime.checks || []).find((check) => check.name.startsWith("normal patrol actions"));
const normal = runtimeCheck?.detail?.normal768 || null;
const leftObject = normal?.normalObjectFocusRect || null;
const relation = normal?.tabletRelationRect || null;
const decision = normal?.decisionRect || null;
const investigation = normal?.investigationRect || null;
const evidence = normal?.evidenceBoundaryRect || null;
const close = (a, b, tolerance = 12) => typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= tolerance;
const supportBody = screen.match(/<div className="mp-tablet-steady-support">([\s\S]*?)<\/div>/)?.[1] || "";
const leftColumnBody = screen.match(/<div className="mp-tablet-left-column"[\s\S]*?>([\s\S]*?)<\/div>\s*<div className="mp-tablet-right-column"/)?.[1] || "";
const rightColumnBody = screen.match(/<div className="mp-tablet-right-column"[\s\S]*?>([\s\S]*?)<\/div>\s*\{tabletNextEvidence\}\s*<div className="mp-tablet-steady-support"/)?.[1] || "";

const checks = {
  sourceLeftColumnOwnsFollowUp: Boolean(leftColumnBody) && leftColumnBody.includes("focusDossier") && leftColumnBody.includes("tabletVerticalTask"),
  sourceRightColumnDoesNotOwnRelation: Boolean(rightColumnBody) && !rightColumnBody.includes("relationTablet") && !rightColumnBody.includes("MobileTabletRelationRail"),
  sourceObjectWorkspaceSpansTask: screen.includes("{tabletNextEvidence}") && screen.includes('data-tablet-space-surface="normal"'),
  sourceSupportOwnsRelationThenEvidence: Boolean(supportBody) && supportBody.indexOf("relationTablet") >= 0 && supportBody.indexOf("evidenceLedger") > supportBody.indexOf("relationTablet") && !supportBody.includes("tabletVerticalTask") && !supportBody.includes("tabletNextEvidence"),
  sourceSplitsSupportAtNarrowCapacity: /@container\s*\(min-width:\s*620px\)\s*and\s*\(max-width:\s*899px\)[\s\S]*?\.mp-tablet-steady-support\s*\{[\s\S]*?display:\s*contents/.test(css),
  freshRuntimeIsBound: Boolean(normal),
  followUpFollowsLeftRouteFocus: Boolean(investigation && normal?.routeDossierRect) && investigation.top >= normal.routeDossierRect.bottom - 1,
  relationFollowsObjectWorkspace: Boolean(relation && leftObject) && relation.top >= leftObject.bottom - 1,
  followUpOccupiesShortColumn: Boolean(normal?.routeDossierRect && investigation) && close(investigation.left, normal.routeDossierRect.left) && close(investigation.right, normal.routeDossierRect.right),
  evidenceBoundaryFollowsRelation: Boolean(evidence && relation) && evidence.top >= relation.bottom - 1,
  noSecondTabletRenderTree: !/<MobilePatrolScreen\s*\/>/.test(screen),
};
const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  pass: failed.length === 0,
  contract: "tablet-normal-column-continuity-v2",
  implementationState: failed.length === 0 ? "focused-runtime-green" : "expected-red",
  geometry: {
    leftObjectBottom: leftObject?.bottom ?? null,
    decisionBottom: decision?.bottom ?? null,
    relationTop: relation?.top ?? null,
    relationBottom: relation?.bottom ?? null,
    investigationTop: investigation?.top ?? null,
    investigationLeft: investigation?.left ?? null,
    investigationRight: investigation?.right ?? null,
    investigationBottom: investigation?.bottom ?? null,
    evidenceTop: evidence?.top ?? null,
  },
  checks,
  failed,
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
