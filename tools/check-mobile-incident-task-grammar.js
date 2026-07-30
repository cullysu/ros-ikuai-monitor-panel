#!/usr/bin/env node

/**
 * R07/R14 contract: an incident surface may use a different render tree from
 * desktop, but it must not hide an available next task or end in an
 * unexplained evidence-only void. This is a structural contract; fresh
 * screenshots remain required for product/design sign-off.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const mobileScreen = read("src/panel-framework/mobile/MobilePatrolScreen.tsx");
const mobileIncident = read("src/panel-framework/mobile/MobilePatrolIncidentCenter.tsx");
const mobileActions = read("src/panel-framework/mobile/MobilePatrolActions.tsx");
const mobileEvidence = read("src/panel-framework/mobile/MobileEvidenceLedger.tsx");
const mobileLandmarks = [mobileScreen, mobileIncident, mobileActions, mobileEvidence].join("\n");
const desktopLandmarks = [
  read("src/panel-framework/overview/desktop-overview/DesktopOverviewScreen.tsx"),
  read("src/panel-framework/overview/desktop-overview/DesktopOverviewTask.tsx"),
  read("src/panel-framework/overview/desktop-overview/DesktopLedger.tsx"),
].join("\n");

const actionVisibilitySource = mobileScreen.slice(
  mobileScreen.indexOf("const showPatrolActions"),
  mobileScreen.indexOf("const evidenceLedger"),
);
const landmarkNames = ["verdict", "freshness", "risk-objects", "investigation", "evidence-boundary"];
const hasLandmark = (source, name, surface) => {
  if (surface === "desktop" && name === "evidence-boundary") {
    return source.includes('taskLandmark="evidence-boundary"')
      && source.includes("data-overview-task-landmark={taskLandmark}");
  }
  return source.includes(`data-overview-task-landmark="${name}"`);
};
const checks = [
  {
    name: "mobile incident task grammar declares v2",
    pass: /data-mobile-incident-task-space/.test(mobileScreen) && /v2/.test(mobileScreen),
  },
  {
    name: "mobile incident primary task owns the risk object list",
    pass: /data-mobile-incident-task-role/.test(mobileIncident) && /primary-risk/.test(mobileIncident),
  },
  {
    name: "non-none mobile risk keeps an investigation task visible",
    pass: /model\.risk\s*!==\s*[\"']none[\"']/.test(actionVisibilitySource),
  },
  {
    name: "mobile follow-up and evidence boundary have explicit ownership",
    pass: /data-mobile-incident-task-role/.test(mobileActions)
      && /follow-up/.test(mobileActions)
      && /data-mobile-incident-task-role/.test(mobileEvidence)
      && /evidence-boundary/.test(mobileEvidence),
  },
  {
    name: "mobile and desktop retain the same five task landmarks",
    pass: landmarkNames.every((name) => (
      hasLandmark(mobileLandmarks, name, "mobile")
      && hasLandmark(desktopLandmarks, name, "desktop")
    )),
    detail: landmarkNames,
  },
  {
    name: "fresh composite incident originals are bound to this contract",
    pass: ["mobile-composite-risk-390.png", "mobile-composite-risk-375.png"].every((file) => (
      fs.existsSync(path.join(root, "_acceptance", "panel-runtime-browser", file))
    )),
    detail: ["mobile-composite-risk-390.png", "mobile-composite-risk-375.png"],
  },
];

const failures = checks.filter((check) => !check.pass).map((check) => check.name);
const report = {
  pass: failures.length === 0,
  contract: "mobile-incident-task-grammar-v2",
  failures,
  checks,
  source: [
    "src/panel-framework/mobile/MobilePatrolScreen.tsx",
    "src/panel-framework/mobile/MobilePatrolIncidentCenter.tsx",
    "src/panel-framework/mobile/MobilePatrolActions.tsx",
    "src/panel-framework/mobile/MobileEvidenceLedger.tsx",
    "src/panel-framework/overview/desktop-overview/DesktopOverviewScreen.tsx",
    "src/panel-framework/overview/desktop-overview/DesktopOverviewTask.tsx",
  ],
  releaseEligible: false,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
