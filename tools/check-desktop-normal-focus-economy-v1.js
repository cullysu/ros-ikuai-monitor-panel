#!/usr/bin/env node

/**
 * Write-ahead product-density contract for the normal desktop route focus.
 *
 * The route focus and WAN chart may share a row, but the route evidence must
 * not be stretched into an empty card just to match the chart's height. This
 * remains a geometry contract, not an independent Design/Visual sign-off.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const screenPath = path.join(root, "src", "panel-framework", "overview", "desktop-overview", "DesktopOverviewScreen.tsx");
const reportPath = path.join(root, "_acceptance", "panel-runtime-browser", "report.json");
const screen = fs.readFileSync(screenPath, "utf8");
const runtime = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, "utf8")) : null;
const runtimeCheck = runtime?.checks?.find((check) => check.name === "1200/1366/1440 normal desktop follows Focus-left Signal-right then full-width current decisions");
const targetWidths = ["normal1200", "normal1366", "normal1440"];
const target = 32;

const geometry = Object.fromEntries(targetWidths.map((key) => {
  const normal = runtimeCheck?.detail?.[key] || null;
  const focus = normal?.focusObjectRect || null;
  const action = normal?.focusActionRect || null;
  const trailingSpace = focus && action ? focus.bottom - action.bottom : null;
  return [key, {
    viewport: normal ? { width: normal.viewport?.width || null, height: normal.viewport?.height || null } : null,
    focusHeight: focus?.height ?? null,
    focusBottom: focus?.bottom ?? null,
    actionBottom: action?.bottom ?? null,
    trailingSpace,
    actionInFirstViewport: normal?.focusActionInFirstViewport ?? false,
    overflow: normal?.overflow ?? null,
  }];
}));

const checks = {
  sourceDeclaresNormalFocusEconomyOwner: /data-desktop-normal-top-band/.test(screen) && /data-desktop-normal-density="compact"/.test(screen),
  freshRuntimeIsBound: Boolean(runtimeCheck) && targetWidths.every((key) => geometry[key].focusHeight !== null),
  allTargetViewportsKeepActionInFirstViewport: targetWidths.every((key) => geometry[key].actionInFirstViewport === true),
  allTargetViewportsKeepNoOverflow: targetWidths.every((key) => geometry[key].overflow !== null && geometry[key].overflow <= 1),
  focusTailSpaceIsBounded: targetWidths.every((key) => geometry[key].trailingSpace !== null && geometry[key].trailingSpace <= target),
};

const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  pass: failed.length === 0,
  contract: "desktop-normal-focus-economy-v1",
  implementationState: failed.length === 0 ? "focused-engineering-green" : "expected-red",
  scope: "desktop normal overview at 1200/1366/1440",
  targetTrailingSpacePx: target,
  geometry,
  checks,
  failed,
  releaseEvidenceEligible: false,
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
