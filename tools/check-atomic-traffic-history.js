const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const builderPath = path.join(root, "panel_backend", "snapshot_builder.py");
const appPath = path.join(root, "app.py");
const fixturePath = path.join(root, "tools", "local-predeploy-check.js");
const builder = fs.readFileSync(builderPath, "utf8");
const app = fs.readFileSync(appPath, "utf8");
const fixture = fs.readFileSync(fixturePath, "utf8");
const schemaPath = path.join(root, "src", "panel-framework", "runtime", "panelRuntimeSchema.ts");
const typesPath = path.join(root, "src", "panel-framework", "overview", "types.ts");
const evidenceModelPath = path.join(root, "src", "panel-framework", "overview", "evidence-model", "buildOverviewInstruments.ts");
const schema = fs.readFileSync(schemaPath, "utf8");
const types = fs.readFileSync(typesPath, "utf8");
const evidenceModel = fs.readFileSync(evidenceModelPath, "utf8");

const failures = [];
const expectAbsent = (source, pattern, label) => {
  if (pattern.test(source)) failures.push(label);
};
const expectPresent = (source, pattern, label) => {
  if (!pattern.test(source)) failures.push(label);
};
const expectIncludes = (source, text, label) => {
  if (!source.includes(text)) failures.push(label);
};
expectIncludes(schema, "validTimestamp(sample.timestamp)", "traffic sample timestamp validation is missing");
expectIncludes(types, "timestamp: string;", "traffic sample timestamp type is not required");
expectIncludes(types, "export interface OverviewLegacyTrafficHistory", "legacy traffic compatibility boundary is not explicit");
expectIncludes(types, "readonly timestamps?: readonly unknown[];", "legacy timestamps are not read-only");
expectIncludes(types, "readonly uplink?: readonly unknown[];", "legacy uplink values are not read-only");
expectIncludes(types, "readonly downlink?: readonly unknown[];", "legacy downlink values are not read-only");
expectIncludes(evidenceModel, "function atomicTrafficSampleTimestamp", "traffic evidence accepts an unscoped timestamp source");
expectIncludes(evidenceModel, "parseRfc3339Timestamp(value)", "atomic traffic timestamps do not require RFC3339 parsing");
expectAbsent(evidenceModel, /timestampOf\(record\.timestamp\)/, "traffic evidence still accepts numeric or unqualified sample timestamps");
expectAbsent(evidenceModel, /history\.(?:timestamps|uplink|downlink)/, "traffic evidence still reads legacy parallel arrays");
// One timestamped aggregate stream is the only history contract consumed by the UI.
// WAN-row parallel arrays have no per-sample provenance and must not be emitted.
expectPresent(builder, /trafficSamples/, "aggregate trafficSamples producer is missing");
expectPresent(builder, /evidenceMode/, "trafficSamples evidence mode is missing");
expectAbsent(builder, /line_history/, "SnapshotBuilderMixin still owns legacy line_history");
expectAbsent(app, /line_history/, "Collector still owns legacy line_history");
expectAbsent(builder, /history\s*=\s*\{\s*[\"']up[\"']\s*:/s, "WAN builder still creates parallel up/down history");
expectAbsent(builder, /[\"']history[\"']\s*:\s*\{\s*[\"']up[\"']\s*:/s, "WAN rows still expose parallel history fields");
expectAbsent(
  builder,
  /def\s+build_(?:pppoe|wan_lines)\([^)]*(?:update_rate_history|rate_history_break)/s,
  "WAN builders still accept history mutation flags",
);
expectAbsent(fixture, /history\.(?:timestamps|uplink|downlink)\s*=/, "predeploy fixture still mutates legacy traffic arrays");
expectAbsent(fixture, /history\s*:\s*\{[\s\S]{0,400}trafficSamples:\s*\[\],[\s\S]{0,400}(?:uplink|downlink):/, "predeploy no-snapshot fixture still emits parallel traffic arrays");

if (failures.length) {
  console.error(`FAIL atomic traffic history contract (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("PASS atomic traffic history contract");
}
