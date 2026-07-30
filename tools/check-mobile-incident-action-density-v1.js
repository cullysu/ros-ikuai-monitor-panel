#!/usr/bin/env node

/**
 * R07 write-ahead contract for the phone incident follow-up rail.
 *
 * The incident primary task is already visible and touch-safe, but the phone
 * rail still spends three rows on actions with almost identical weight. At
 * 375–599 CSS px the primary action should own one full row and the secondary
 * context actions may share a compact row. The 320/360 class of phones and
 * large-text mode must keep the readable one-column fallback.
 */

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const screen = read("src/panel-framework/mobile/MobilePatrolScreen.tsx");
const css = read("src/panel-framework/mobile/mobile-patrol.css");
const priority = read("src/panel-framework/mobile/mobile-patrol.css");
const runtime = JSON.parse(read("_acceptance/panel-runtime-browser/report.json"));

const incidentChecks = runtime.checks
  .filter((check) => check.name === "mobile composite incident keeps proved interface dependency primary and resource pressure secondary")
  .map((check) => check.detail)
  .filter((detail) => detail?.viewport?.width === 375 || detail?.viewport?.width === 390)
  .map((detail) => ({
    viewport: detail.viewport,
    investigationHeight: detail.investigationRect?.height ?? null,
    primaryHeight: detail.phonePrimaryActionRect?.height ?? null,
    actionVisible: detail.actionInFirstViewport === true,
    overflow: detail.overflow,
  }));

const compactOwner = /className="mp-primary-task-proximity mp-compact-incident-actions"/.test(screen);
const compactRail = /@media\s*\(min-width:\s*375px\)\s*and\s*\(max-width:\s*767px\)[\s\S]*?\.mp-compact-action-list\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(css);
const primarySpan = /\.mp-compact-action-list > button\[data-mobile-action-priority="primary"\]\s*\{[\s\S]*?grid-column:\s*1\s*\/\s*-1;/.test(css);
const primaryTouch = /\.mp-action-list > button\[data-mobile-action-priority="primary"\]\s*\{[\s\S]*?min-height:\s*56px;/.test(priority);
const secondaryTouch = /\.mp-compact-action-list > button\s*\{[\s\S]*?min-height:\s*(?:4[4-9]|[5-9][0-9]|[1-9][0-9]{2,})px;/.test(css);
const largeTextFallback = /\.mp-shell\.is-large-text \.mp-compact-action-list\s*\{[\s\S]*?grid-template-columns:\s*1fr/.test(css);
const narrowFallback = /@media\s*\(max-width:\s*359px\)[\s\S]*?\.mp-compact-action-list\s*\{[\s\S]*?grid-template-columns:\s*1fr/.test(css);
const actionContract = /data-mobile-action-priority=\{action\.priority\}/.test(read("src/panel-framework/mobile/MobilePatrolActions.tsx"))
  && /data-mobile-action-order=\{index \+ 1\}/.test(read("src/panel-framework/mobile/MobilePatrolActions.tsx"));

const checks = {
  "compact phone rail is explicitly two-column": compactRail,
  "phone incident rail uses the compact action owner": compactOwner,
  "primary task spans the compact rail and remains 56px": primarySpan && primaryTouch,
  "secondary actions remain touch-safe": secondaryTouch,
  "large-text mode falls back to one column": largeTextFallback,
  "narrow phones fall back to one column": narrowFallback,
  "action order and priority remain semantic": actionContract,
  "fresh 375/390 incident rail is materially shorter than the old 189px stack": incidentChecks.length === 2
    && incidentChecks.every((detail) => detail.investigationHeight !== null && detail.investigationHeight <= 160 && detail.primaryHeight >= 56 && detail.actionVisible && detail.overflow === 0),
};

const failures = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const report = {
  pass: failures.length === 0,
  contract: "mobile-incident-action-density-v1",
  implementationState: failures.length === 0 ? "focused-green" : "expected-red",
  observedBeforeEdit: incidentChecks,
  checks,
  failures,
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
