#!/usr/bin/env node

/**
 * R09/R14 contract: the selected normal tablet comparison object must expose a
 * typed next task, not a generic navigation placeholder. Fresh originals remain
 * required for independent Product/Design/Visual acceptance.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const builder = read("src/panel-framework/overview/evidence-model/buildOverviewInvestigationActions.ts");
const inspector = read("src/panel-framework/mobile/MobileTabletNormalComparisonInspector.tsx");
const evidenceSurface = read("src/panel-framework/mobile/MobileTabletNextEvidence.tsx");

const checks = [
  {
    name: "shared object action builder exists",
    pass: /overviewObjectInvestigationAction/.test(builder),
  },
  {
    name: "inspector consumes the typed action label and note",
    pass: /action\??\.label/.test(inspector) && /action\??\.note/.test(inspector),
  },
  {
    name: "inspector binds route, object and evidence context",
    pass: /data-tablet-normal-object-action/.test(inspector)
      && /objectId/.test(inspector)
      && /evidenceAt/.test(inspector)
      && /returnRoute/.test(inspector),
  },
  {
    name: "screen passes a shared action and evidence timestamp",
    pass: /overviewObjectInvestigationAction/.test(evidenceSurface)
      && /<MobileTabletNormalComparisonInspector[\s\S]{0,700}action=/.test(evidenceSurface)
      && /evidenceAt=/.test(evidenceSurface),
  },
  {
    name: "generic object workspace wording is removed",
    pass: !/进入对象工作区/.test(inspector),
  },
  {
    name: "fresh tablet normal originals are available",
    pass: fs.existsSync(path.join(root, "_acceptance", "panel-runtime-browser", "tablet-overview-normal-768.png"))
      && ["tablet-overview-normal-844.png", "tablet-overview-master-detail-844.png"].some((file) => (
        fs.existsSync(path.join(root, "_acceptance", "panel-runtime-browser", file))
      )),
  },
];

const failures = checks.filter((check) => !check.pass).map((check) => check.name);
const report = {
  pass: failures.length === 0,
  contract: "tablet-normal-object-action-language-v1",
  failures,
  checks,
  releaseEligible: false,
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
