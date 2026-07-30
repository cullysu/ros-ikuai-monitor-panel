#!/usr/bin/env node

/**
 * Keep the mobile and desktop overview surfaces on one product grammar.
 * This is a focused product/design contract, not a visual sign-off.
 */

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const files = {
  mobileTsx: path.join(root, "src", "panel-framework", "mobile", "MobilePatrolScreen.tsx"),
  mobileActionsTsx: path.join(root, "src", "panel-framework", "mobile", "MobilePatrolActions.tsx"),
  desktopTsx: path.join(root, "src", "panel-framework", "overview", "desktop-overview", "DesktopOverviewScreen.tsx"),
  mobileCss: path.join(root, "src", "panel-framework", "mobile", "mobile-patrol.css"),
  mobileFoundationCss: path.join(root, "src", "panel-framework", "mobile", "mobile-patrol-foundation.css"),
  desktopCss: path.join(root, "src", "panel-framework", "overview", "desktop-overview", "styles", "desktop-overview.css"),
  desktopRecoveredCss: path.join(root, "src", "panel-framework", "overview", "desktop-overview", "styles", "desktop-overview-recovered.css"),
  runtimeReport: path.join(root, "_acceptance", "panel-runtime-browser", "report.json"),
};

const read = (file) => fs.readFileSync(file, "utf8");
const mobileTsx = read(files.mobileTsx);
const mobileActionsTsx = read(files.mobileActionsTsx);
const desktopTsx = read(files.desktopTsx);
const mobileCss = read(files.mobileCss);
const mobileFoundationCss = read(files.mobileFoundationCss);
const desktopCss = read(files.desktopCss);
const desktopRecoveredCss = read(files.desktopRecoveredCss);
const runtimeReport = JSON.parse(read(files.runtimeReport));
const desktopRuntime = runtimeReport.checks.find((check) => check.name === "1200/1366/1440 normal desktop follows Focus-left Signal-right then full-width current decisions");
const normal1366VerdictHeight = desktopRuntime?.detail?.normal1366?.verdictRect?.height ?? null;
const normal1440VerdictHeight = desktopRuntime?.detail?.normal1440?.verdictRect?.height ?? null;

const checks = [
  ["mobile declares the shared grammar", /data-visual-grammar=\"network-console-v1\"/.test(mobileTsx)],
  ["desktop declares the shared grammar", /data-visual-grammar=\"network-console-v1\"/.test(desktopTsx)],
  ["both surfaces keep verdict and evidence landmarks", [mobileTsx, desktopTsx].every((source) => source.includes('data-overview-task-landmark="verdict"') && source.includes('data-overview-task-landmark="freshness"'))],
  ["mobile incident rows have a bounded compact rhythm", /\.mp-incident-row\s*\{[\s\S]*?min-height:\s*72px;/.test(`${mobileFoundationCss}\n${mobileCss}`)],
  ["mobile action rows do not become oversized cards", /data-mobile-action-priority=\{action.priority\}/.test(mobileActionsTsx) && /\.mp-action-list > button\[data-mobile-action-priority=\"primary\"\]\s*\{[\s\S]*?min-height:\s*56px;/.test(mobileCss)],
  ["desktop verdict is a compact status bar", /\.do-verdict\s*\{[\s\S]*?padding:\s*7px 14px 6px 16px;/.test(desktopRecoveredCss) && /\.do-verdict-icon\s*\{[\s\S]*?width:\s*28px;[\s\S]*?height:\s*28px;/.test(desktopRecoveredCss)],
  ["fresh desktop verdict stays within the compact band", normal1366VerdictHeight !== null && normal1440VerdictHeight !== null && normal1366VerdictHeight <= 76 && normal1440VerdictHeight <= 76],
];

const failures = checks.filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  pass: failures.length === 0,
  contract: "cross-surface-visual-grammar-owner-v2",
  failures,
  checks: Object.fromEntries(checks.map(([name, pass]) => [name, pass])),
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
