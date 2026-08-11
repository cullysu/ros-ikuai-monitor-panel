#!/usr/bin/env node

/**
 * Write-ahead contract for the desktop normal-state task surface.
 *
 * This is deliberately a geometry contract, not a visual sign-off. It keeps
 * the normal desktop path from spending the first viewport on structural
 * whitespace while the next inspection step sits exactly on the fold.
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
const focusHeight = normal?.focusObjectRect?.height ?? null;
const followUpTop = normal?.firstInvestigationActionRect?.top ?? null;
const followUpBottom = normal?.firstInvestigationActionRect?.bottom ?? null;
const viewportBottom = normal?.viewportBottom ?? null;
const checks = {
  sourceDeclaresNormalDensityOwner: /data-desktop-normal-density="compact"/.test(screen),
  runtimeIdentityIsCurrentWhenRequired: !requireRuntime || runtimeBinding.current,
  freshRuntimeIsBound: runtimeSkipped || Boolean(normal),
  normalTopBandStaysCompact: runtimeSkipped || (typeof topBandHeight === "number" && topBandHeight <= 260),
  normalFocusObjectStaysCompact: runtimeSkipped || (typeof focusHeight === "number" && focusHeight <= 260),
  firstFollowUpActionFitsFirstViewport: runtimeSkipped || (typeof followUpTop === "number" && typeof followUpBottom === "number" && typeof viewportBottom === "number" && followUpTop <= viewportBottom - 8 && followUpBottom <= viewportBottom),
};

const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  pass: failed.length === 0,
  contract: "desktop-normal-density-v1",
  implementationState: failed.length === 0 ? runtimeSkipped ? "static-pending" : "focused-engineering-green" : "expected-red",
  scope: "desktop normal overview at 1366x768",
  geometry: { topBandHeight, focusHeight, followUpTop, followUpBottom, viewportBottom },
  checks,
  runtimeIdentity: runtimeIdentityDetail(runtimeBinding),
  failed,
  releaseEvidenceEligible: false,
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
