const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const inspectorPath = path.join(ROOT, "src", "panel-framework", "mobile", "mobile-inspector", "ResourceInspector.tsx");
const source = fs.readFileSync(inspectorPath, "utf8");

const checks = [
  ["object layer leads with change evidence", /<InspectorSection title="变化证据"/.test(source)],
  ["object layer keeps provenance evidence", /样本范围/.test(source) && /采样来源/.test(source) && /有效样本/.test(source)],
  ["object layer does not replay current breach readings", !/<InspectorReadings/.test(source) && !/title="当前越阈判断"/.test(source)],
  ["object layer retains related-object comparison", /<InspectorRelations/.test(source) && /相关资源比较/.test(source)],
  ["object layer retains the bounded next audit", /data-domain-next-evidence="loadAudit"/.test(source)],
];

const failed = checks.filter(([, pass]) => !pass).map(([name]) => name);
const report = {
  pass: failed.length === 0,
  contract: "resource-object-evidence-novelty-v1",
  checks: Object.fromEntries(checks),
  failed,
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
