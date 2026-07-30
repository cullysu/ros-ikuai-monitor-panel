const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(root, "src/panel-framework/mobile/MobileIncidentWorkspace.tsx"),
  "utf8",
);
const evidenceSource = fs.readFileSync(
  path.join(root, "src/panel-framework/mobile/mobileIncidentEvidence.ts"),
  "utf8",
);
const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

expect(source.includes("novelIncidentAttributes"), "incident detail has no novel-evidence selector");
expect(evidenceSource.includes("object.attributes.filter"), "incident detail does not filter summary-repeated attributes");
expect(source.includes("data-mobile-incident-detail"), "incident detail has no detail owner marker");
expect(source.includes("data-mobile-detail-novel-evidence"), "incident detail has no novel-evidence count marker");
expect(source.includes("data-mobile-detail-novel-facts"), "incident detail has no novel-facts landmark");
expect(source.includes("data-mobile-detail-source-path"), "incident detail has no source-path landmark");
expect(source.includes("novelAttributes.length + (object.sourcePath ? 1 : 0)"), "source path is not counted as novel evidence");
expect(!source.includes("<span>{object.reason}</span>"), "incident detail still renders the overview reason as a duplicate paragraph");

const report = {
  pass: failures.length === 0,
  contract: "mobile-detail-novel-evidence-v1",
  failures,
  checks: {
    selector: source.includes("novelIncidentAttributes") && evidenceSource.includes("object.attributes.filter"),
    detailOwner: source.includes("data-mobile-incident-detail"),
    novelCount: source.includes("data-mobile-detail-novel-evidence") && source.includes("novelAttributes.length + (object.sourcePath ? 1 : 0)"),
    novelFacts: source.includes("data-mobile-detail-novel-facts"),
    sourcePath: source.includes("data-mobile-detail-source-path"),
    noReasonReplay: !source.includes("<span>{object.reason}</span>"),
  },
};

console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
