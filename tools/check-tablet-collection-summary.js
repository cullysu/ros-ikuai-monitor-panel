const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(root, "src", "panel-framework", "mobile", "MobileDomainWorkspace.tsx"),
  "utf8",
);

const checks = {
  tabletSummaryStateIsCapabilityBound: /const showTabletCollectionSummary\s*=\s*tabletWorkbench/.test(source),
  summaryHasSemanticLandmark: /data-tablet-collection-summary/.test(source),
  summaryUsesCollectionMetrics: /showTabletCollectionSummary[\s\S]*MetricStrip/.test(source),
  summaryExcludesTimeSeries: /showTabletCollectionSummary[\s\S]*!model\.visualization/.test(source),
  summaryExcludesLogs: /showTabletCollectionSummary[\s\S]*route !== "logs"[\s\S]*route !== "serviceLogs"/.test(source),
  summaryDoesNotReplaceInspector: /!showInspector\s*\|\|\s*showTabletCollectionSummary/.test(source),
};

const failed = Object.entries(checks)
  .filter(([, pass]) => !pass)
  .map(([name]) => name);
const report = {
  pass: failed.length === 0,
  checks,
  failed,
  contract: "tablet-collection-summary-v1",
};
console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
