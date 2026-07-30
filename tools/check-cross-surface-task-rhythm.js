#!/usr/bin/env node

/**
 * Red/green contract for the shared cross-surface task rhythm.
 *
 * This is an implementation contract, not Product/Design/Visual sign-off.
 * It prevents mobile and desktop from exposing the same evidence with
 * different visual priorities: verdict first, context second, one discoverable
 * next action, and secondary investigation entries after that.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const mobileScreen = read("src/panel-framework/mobile/MobilePatrolScreen.tsx");
const mobileActions = read("src/panel-framework/mobile/MobilePatrolActions.tsx");
const desktopScreen = read("src/panel-framework/overview/desktop-overview/DesktopOverviewScreen.tsx");
const desktopTask = read("src/panel-framework/overview/desktop-overview/DesktopOverviewTask.tsx");
const runtimePath = path.join(ROOT, "_acceptance", "panel-runtime-browser", "report.json");
const runtime = fs.existsSync(runtimePath) ? JSON.parse(fs.readFileSync(runtimePath, "utf8")) : null;
const desktopRuntime = runtime?.checks?.find((check) => check.name === "1200/1366/1440 normal desktop follows Focus-left Signal-right then full-width current decisions");
const normal1366 = desktopRuntime?.detail?.normal1366;

const checks = [
  ["mobile verdict declares the primary visual level", /data-mobile-verdict[\s\S]*data-overview-visual-level="primary"/.test(mobileScreen)],
  ["desktop verdict declares the primary visual level", /data-desktop-status-bus[\s\S]*data-overview-visual-level="primary"/.test(desktopScreen)],
  ["mobile follow-up surface declares context level", /data-overview-task-landmark="investigation"[\s\S]*data-overview-visual-level="context"/.test(mobileActions)],
  ["desktop follow-up surface declares context level", /data-overview-task-landmark="investigation"[\s\S]*data-overview-visual-level="context"/.test(desktopTask)],
  ["mobile primary action declares the next-task landmark", /data-mobile-action-priority=\{action\.priority\}[\s\S]*data-overview-task-landmark=\{action\.priority === "primary" \? "investigation-primary" : "investigation-secondary"\}[\s\S]*data-overview-visual-level=\{action\.priority === "primary" \? "next" : "context"\}/.test(mobileActions)],
  ["desktop focus action declares the next-task landmark", /data-overview-task-landmark="investigation-primary"[\s\S]*data-overview-visual-level="next"/.test(desktopTask)],
  ["desktop lower investigation surface is not the primary task", /data-overview-task-landmark="investigation"[\s\S]*data-overview-task-surface="secondary"[\s\S]*data-overview-visual-level="context"/.test(desktopTask)],
  ["fresh 1366 desktop exposes the primary next action in the first viewport", Boolean(normal1366?.focusActionInFirstViewport)],
];

const failures = checks.filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  pass: failures.length === 0,
  contract: "cross-surface-task-rhythm-v1",
  implementationState: failures.length === 0 ? "focused-engineering-green" : "expected-red",
  scope: "mobile and desktop overview task hierarchy",
  failures,
  checks: Object.fromEntries(checks),
  runtime: {
    report: runtime ? "present" : "missing",
    normal1366FocusActionInFirstViewport: normal1366?.focusActionInFirstViewport ?? null,
  },
};

console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
