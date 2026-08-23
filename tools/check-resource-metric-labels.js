const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const sourcePath = path.join(
  ROOT,
  "src",
  "panel-framework",
  "overview",
  "evidence-model",
  "resourceHistorySamples.ts",
);
const source = fs.readFileSync(sourcePath, "utf8");
const expected = { cpu: "CPU", memory: "内存", disk: "磁盘" };
const definitions = Object.fromEntries(
  [...source.matchAll(/\{\s*key:\s*"(cpu|memory|disk)"\s*,\s*label:\s*"([^"]+)"/g)]
    .map((match) => [match[1], match[2]]),
);
const checks = {
  sharedDefinitionPresent: source.includes("export const RESOURCE_METRIC_DEFINITIONS"),
  exactKeys: Object.keys(definitions).sort().join(",") === "cpu,disk,memory",
  labelsAreCanonical: Object.entries(expected).every(([key, label]) => definitions[key] === label),
};
const failed = Object.entries(checks).filter(([, value]) => !value).map(([name]) => name);
const report = {
  pass: failed.length === 0,
  source: path.relative(ROOT, sourcePath).replaceAll("\\", "/"),
  definitions,
  expected,
  checks,
  failed,
  contract: "shared-resource-metric-labels-v1",
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
