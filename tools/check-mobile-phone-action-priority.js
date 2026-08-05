#!/usr/bin/env node

/**
 * Step312 red/green contract.
 *
 * This checks the source composition boundary only. Runtime geometry and
 * independent product/visual review remain separate gates.
 */

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const screen = fs.readFileSync(
  path.join(root, "src/panel-framework/mobile/MobilePatrolScreen.tsx"),
  "utf8",
);
const mobileActions = fs.readFileSync(
  path.join(root, "src/panel-framework/mobile/MobilePatrolActions.tsx"),
  "utf8",
);
const desktopActions = fs.readFileSync(
  path.join(root, "src/panel-framework/overview/desktop-overview/DesktopOverviewTask.tsx"),
  "utf8",
);
const actionTypes = fs.readFileSync(
  path.join(root, "src/panel-framework/overview/evidence-model/overviewEvidenceTypes.ts"),
  "utf8",
);
const actionBuilder = fs.readFileSync(
  path.join(root, "src/panel-framework/overview/evidence-model/buildOverviewInvestigationActions.ts"),
  "utf8",
);
const mobileCss = fs.readFileSync(
  path.join(root, "src/panel-framework/mobile/mobile-patrol.css"),
  "utf8",
);
const mobilePriorityCss = mobileCss;

const primaryStart = screen.indexOf('<div className="mp-workspace-primary">');
const primaryEnd = screen.indexOf("</div>", primaryStart);
const primary = primaryStart >= 0 && primaryEnd > primaryStart
  ? screen.slice(primaryStart, primaryEnd)
  : "";
const contextStart = screen.indexOf('<div className="mp-workspace-context">');
const contextEnd = screen.indexOf("</div>", contextStart);
const context = contextStart >= 0 && contextEnd > contextStart
  ? screen.slice(contextStart, contextEnd)
  : "";

const checks = [
  {
    name: "normal phone operational decisions have a named composition owner",
    pass: screen.includes("const normalPhoneSteadyDecisions ="),
  },
  {
    name: "normal phone primary work area renders WAN signal before secondary decisions",
    pass: primary.includes("{normalPhoneSteadyDecisions}") &&
      primary.indexOf("{trafficSignal}") < primary.indexOf("{normalPhoneSteadyDecisions}"),
  },
  {
    name: "normal phone primary next step stays before secondary decisions",
    pass: primary.includes("{normalPhoneNextStep}") &&
      primary.indexOf("{normalPhoneNextStep}") < primary.indexOf("{normalPhoneSteadyDecisions}"),
  },
  {
    name: "normal phone decision owner is not hidden in the context column",
    pass: !context.includes("MobileSteadyDecisionLedger"),
  },
  {
    name: "shared action model declares a required primary or secondary priority",
    pass: /OverviewInvestigationActionPriority\s*=\s*"primary"\s*\|\s*"secondary"/.test(actionTypes) &&
      /priority:\s*OverviewInvestigationActionPriority/.test(actionTypes),
  },
  {
    name: "action builder assigns one primary and keeps the remaining actions secondary",
    pass: /const actions:\s*DraftAction\[\]\s*=\s*\(\(\)\s*=>/.test(actionBuilder) &&
      /priority:\s*index\s*===\s*0\s*\?\s*"primary"\s*:\s*"secondary"/.test(actionBuilder),
  },
  {
    name: "mobile action surface exposes the shared priority",
    pass: /data-mobile-action-priority/.test(mobileActions) &&
      /action\.priority/.test(mobileActions),
  },
  {
    name: "desktop action surface consumes the same priority",
    pass: /data-desktop-action-priority/.test(desktopActions) &&
      /action\.priority/.test(desktopActions),
  },
  {
    name: "mobile styles distinguish primary from secondary without hiding follow-ups",
    pass: /data-mobile-action-priority=\\?['"]primary/.test(`${mobileCss}\n${mobilePriorityCss}`) &&
      /data-mobile-action-priority=\\?['"]secondary/.test(`${mobileCss}\n${mobilePriorityCss}`),
  },
];

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.name}`);
}

const failed = checks.filter((check) => !check.pass);
if (failed.length) {
  console.error(`[mobile-phone-action-priority] FAIL ${failed.length}/${checks.length}`);
  process.exitCode = 1;
} else {
  console.log(`[mobile-phone-action-priority] PASS ${checks.length}/${checks.length}`);
}
