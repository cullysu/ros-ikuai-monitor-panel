#!/usr/bin/env node

/**
 * R07 contract: on a narrow-phone incident, the first model-bound task must
 * stay next to the highest-priority risk instead of being pushed behind a
 * secondary risk. This is a source contract; fresh 390/375 originals remain
 * required for Product/Design/Visual acceptance.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(root, "src/panel-framework/mobile/MobilePatrolScreen.tsx"),
  "utf8",
);
const phoneBranchStart = source.indexOf('<div className="mp-workspace-body">');
const phoneBranch = phoneBranchStart >= 0 ? source.slice(phoneBranchStart) : "";
const indexOf = (needle) => phoneBranch.indexOf(needle);

const checks = [
  {
    name: "phone primary action has an explicit proximity landmark",
    pass: /data-mobile-primary-task-proximity="after-primary-risk"/.test(source),
  },
  {
    name: "primary action is model-bound and restricted to non-compact incidents",
    pass: /incident\s*&&\s*!compactIncident[\s\S]{0,260}data-mobile-primary-task-proximity="after-primary-risk"[\s\S]{0,260}patrolActions/.test(source),
  },
  {
    name: "phone order is primary risk then primary action then secondary risk",
    pass: indexOf("{incidentCenter}") >= 0
      && indexOf("{phonePrimaryAction}") > indexOf("{incidentCenter}")
      && indexOf("{concurrentRiskQueue}") > indexOf("{phonePrimaryAction}"),
  },
  {
    name: "incident action is not also rendered in the phone context rail",
    pass: /compactIncident\s*\|\|\s*incident\s*\?\s*null\s*:\s*patrolActions/.test(source),
  },
  {
    name: "fresh incident originals are available",
    pass: ["mobile-composite-risk-390.png", "mobile-composite-risk-375.png"].every((file) => (
      fs.existsSync(path.join(root, "_acceptance", "panel-runtime-browser", file))
    )),
  },
];

const failures = checks.filter((check) => !check.pass).map((check) => check.name);
const report = {
  pass: failures.length === 0,
  contract: "mobile-primary-task-proximity-v1",
  failures,
  checks,
  releaseEligible: false,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
