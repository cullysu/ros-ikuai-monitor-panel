const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const screen = fs.readFileSync(path.join(ROOT, "src/panel-framework/overview/desktop-overview/DesktopOverviewScreen.tsx"), "utf8");
const docket = fs.readFileSync(path.join(ROOT, "src/panel-framework/overview/desktop-overview/DesktopIncidentDocket.tsx"), "utf8");

const checks = [
  {
    name: "normal and incident share the primary status-band grid",
    pass: /className=\"do-status-bus has-proof\"/.test(screen),
    detail: "incident state must not remove the shared facts column from the primary status bus",
  },
  {
    name: "core facts are owned by the status bus without an incident conditional",
    pass: /<dl className=\"do-status-items\" data-desktop-core-facts/.test(screen) &&
      !/\{!incident\s*\?\s*\(\s*<dl className=\"do-status-items\"/.test(screen),
    detail: "the same verdict/freshness/facts entrance must serve normal and incident desktop states",
  },
  {
    name: "incident docket does not reintroduce a generic facts band",
    pass: !/do-incident-facts/.test(docket),
    detail: "generic facts belong to the status bus; resource/scenario evidence remains specialized",
  },
  {
    name: "specialized incident evidence remains available",
    pass: /DesktopResourceEvidence/.test(docket) && /DesktopScenarioFocus/.test(docket),
    detail: "the slice may not hide resource or scenario-specific evidence",
  },
  {
    name: "shared facts keep a primary task landmark",
    pass: /data-desktop-core-facts/.test(screen) && /data-overview-task-focus=\"facts\"/.test(screen),
    detail: "the shared facts must remain inspectable as primary evidence, not test-only decoration",
  },
];

const failures = checks.filter((check) => !check.pass);
const report = {
  pass: failures.length === 0,
  contract: "desktop-incident-band-v1",
  implementationState: failures.length === 0 ? "focused-green" : "expected-red",
  releaseEvidenceEligible: false,
  scope: "desktop primary status-band rhythm only; not R10/Product/Design/Visual sign-off",
  checks,
  failures: failures.map((check) => check.name),
};

console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
