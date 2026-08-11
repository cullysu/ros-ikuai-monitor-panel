#!/usr/bin/env node

/**
 * Current geometry contract for the desktop normal-state task surface.
 *
 * The normal top band now owns the route focus and its immediate investigation
 * rail on the left, with WAN signal evidence on the right. The band is allowed
 * to be taller than the historical v1 cap only when that height is explained by
 * those real task surfaces; unexplained filler and fold loss remain failures.
 */
const fs = require("node:fs");
const path = require("node:path");
const { readRuntimeReport, runtimeIdentityDetail } = require("./runtime-report-identity");

const root = path.resolve(__dirname, "..");
const screenPath = path.join(root, "src", "panel-framework", "overview", "desktop-overview", "DesktopOverviewScreen.tsx");
const screen = fs.readFileSync(screenPath, "utf8");
const runtimeBinding = readRuntimeReport(root);
const requireRuntime = process.argv.includes("--require-current-runtime");
const runtimeSkipped = !runtimeBinding.current && !requireRuntime;
const runtime = runtimeBinding.current ? runtimeBinding.report : null;
const runtimeCheck = runtime?.checks?.find((check) => check.name === "1200/1366/1440 normal desktop follows Focus-left Signal-right then full-width current decisions");
const normal = runtimeCheck?.detail?.normal1366 || null;

const topBandHeight = normal?.normalTopBandRect?.height ?? null;
const signalHeight = normal?.signalRect?.height ?? null;
const focusHeight = normal?.focusObjectRect?.height ?? null;
const investigationHeight = normal?.investigationRect?.height ?? null;
const followUpTop = normal?.firstInvestigationActionRect?.top ?? null;
const followUpBottom = normal?.firstInvestigationActionRect?.bottom ?? null;
const viewportBottom = normal?.viewportBottom ?? null;
const explainedTaskHeight = typeof focusHeight === "number" && typeof investigationHeight === "number"
  ? focusHeight + investigationHeight + 24
  : null;
const signalBudgetHeight = typeof signalHeight === "number" ? signalHeight + 24 : null;
const checks = {
  sourceDeclaresNormalDensityOwner: /data-desktop-normal-density="compact"/.test(screen),
  sourceDeclaresFocusBandActionOwner: /has-focus-task/.test(screen),
  runtimeIdentityIsCurrentWhenRequired: !requireRuntime || runtimeBinding.current,
  freshRuntimeIsBound: runtimeSkipped || Boolean(normal),
  normalTopBandHasBoundedContent: runtimeSkipped || (typeof topBandHeight === "number" && typeof explainedTaskHeight === "number" && typeof signalBudgetHeight === "number" &&
    topBandHeight <= Math.max(explainedTaskHeight, signalBudgetHeight)),
  normalTopBandStaysWithinTaskBudget: runtimeSkipped || (typeof topBandHeight === "number" && topBandHeight <= 336),
  normalFocusObjectStaysCompact: runtimeSkipped || (typeof focusHeight === "number" && focusHeight <= 260),
  followUpRailBelongsToFocusBand: runtimeSkipped || normal?.investigationNestedInNormalFocusBand === true,
  firstFollowUpActionFitsFirstViewport: runtimeSkipped || (typeof followUpTop === "number" && typeof followUpBottom === "number" && typeof viewportBottom === "number" && followUpTop <= viewportBottom - 8 && followUpBottom <= viewportBottom),
};

const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  pass: failed.length === 0,
  contract: "desktop-normal-density-v2",
  implementationState: failed.length === 0 ? runtimeSkipped ? "static-pending" : "focused-engineering-green" : "expected-red",
  scope: "desktop normal overview at 1366x768",
  geometry: { topBandHeight, signalHeight, focusHeight, investigationHeight, explainedTaskHeight, signalBudgetHeight, followUpTop, followUpBottom, viewportBottom },
  checks,
  runtimeIdentity: runtimeIdentityDetail(runtimeBinding),
  failed,
  releaseEvidenceEligible: false,
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
