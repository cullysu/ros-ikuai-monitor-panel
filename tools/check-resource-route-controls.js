const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = process.cwd();

function loadTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(compiled.outputText, filename);
}

require.extensions[".ts"] = loadTypeScript;
require.extensions[".tsx"] = loadTypeScript;

const definitionPath = path.join(root, "src", "panel-framework", "mobile", "mobileDomainDefinitions.ts");
const definitionSource = fs.readFileSync(definitionPath, "utf8");
const {
  domainDefinitionFor,
  filterWorkspaceRows,
  sortWorkspaceRows,
} = require(definitionPath);

function resourceRow({
  id,
  series,
  values,
  latest,
  threshold,
  delta,
  trailing,
  evidenceAt,
  attention = false,
}) {
  const samples = values.map((value, index) => ({
    timestamp: `2026-07-16T10:0${index}:00Z`,
    value,
  }));
  return {
    id,
    table: "资源证据",
    columns: [],
    values: {},
    primary: id,
    secondary: "",
    trailing: "",
    searchText: id,
    meta: {
      state: attention ? "error" : "neutral",
      attention,
      running: null,
      active: null,
      disabled: null,
      severity: "unknown",
      protocol: "",
      trafficBps: null,
      connections: null,
      timestamp: null,
      address: "",
      targetAddress: "",
      distance: null,
      utilization: latest,
      sampleCount: samples.length,
      ruleOrder: null,
      tags: [],
      identityParts: [id],
      operationalImpact: attention ? "risk" : "none",
      operationalReason: null,
    },
    evidence: {
      kind: "resource",
      sourceTable: "资源证据",
      series,
      values,
      samples,
      sampleCount: samples.length,
      latest,
      threshold,
      delta,
      trailing,
      durationSeconds: null,
      evidenceAt,
    },
    duplicateCount: 1,
  };
}

function ids(rows) {
  return rows.map((row) => row.id);
}

function assertFilter(definition, rows, filterId, expected) {
  assert.deepEqual(
    ids(filterWorkspaceRows(rows, definition, filterId)),
    expected,
    `${filterId} must select the evidence-backed fixture partition`,
  );
}

function assertSort(definition, rows, sortId, expected) {
  assert.deepEqual(
    ids(sortWorkspaceRows(rows, definition, sortId)),
    expected,
    `${sortId} must change the representative fixture order`,
  );
}

for (const id of [
  'filter("overloaded"',
  'filter("cpu"',
  'filter("memory"',
  'filter("disk"',
  'filter("sequence-available"',
  'filter("latest-available"',
  'filter("sequence-only"',
  'sort("latest-desc"',
  'sort("continuity-desc"',
  'sort("newest-desc"',
  'sort("range-desc"',
]) {
  assert.ok(definitionSource.includes(id), `resource control contract missing ${id}`);
}

const rows = [
  resourceRow({
    id: "cpu-pressure",
    series: "cpu",
    values: [40, 75, 95],
    latest: 95,
    threshold: 85,
    delta: 10,
    trailing: 3,
    evidenceAt: "2026-07-16T10:02:00Z",
  }),
  resourceRow({
    id: "memory-normal",
    series: "memory",
    values: [60, 82],
    latest: 82,
    threshold: 85,
    delta: -3,
    trailing: 0,
    evidenceAt: "2026-07-16T10:03:00Z",
  }),
  resourceRow({
    id: "disk-attention",
    series: "disk",
    values: [90, 91, 92],
    latest: 92,
    threshold: 90,
    delta: 2,
    trailing: 1,
    evidenceAt: "2026-07-16T10:01:00Z",
    attention: true,
  }),
  resourceRow({
    id: "history-only",
    series: "cpu",
    values: [51],
    latest: null,
    threshold: 85,
    delta: null,
    trailing: 0,
    evidenceAt: "2026-07-16T10:00:00Z",
  }),
  resourceRow({
    id: "unavailable",
    series: "memory",
    values: [],
    latest: null,
    threshold: 85,
    delta: null,
    trailing: 0,
    evidenceAt: null,
  }),
];

const trafficLoad = domainDefinitionFor("trafficLoad");
assert.deepEqual(
  trafficLoad.filters.map((option) => option.id),
  ["all", "overloaded", "attention", "cpu", "memory", "disk", "unavailable"],
);
assert.deepEqual(
  trafficLoad.sorts.map((option) => option.id),
  ["risk-desc", "latest-desc", "continuity-desc", "samples-desc", "name-asc"],
);
assertFilter(trafficLoad, rows, "overloaded", ["cpu-pressure", "disk-attention"]);
assertFilter(trafficLoad, rows, "attention", ["disk-attention"]);
assertFilter(trafficLoad, rows, "cpu", ["cpu-pressure", "history-only"]);
assertFilter(trafficLoad, rows, "memory", ["memory-normal", "unavailable"]);
assertFilter(trafficLoad, rows, "disk", ["disk-attention"]);
assertFilter(trafficLoad, rows, "unavailable", ["history-only", "unavailable"]);
assertSort(trafficLoad, rows, "risk-desc", ["cpu-pressure", "disk-attention", "memory-normal", "history-only", "unavailable"]);
assertSort(trafficLoad, rows, "latest-desc", ["cpu-pressure", "disk-attention", "memory-normal", "history-only", "unavailable"]);
assertSort(trafficLoad, rows, "continuity-desc", ["cpu-pressure", "disk-attention", "history-only", "memory-normal", "unavailable"]);
assertSort(trafficLoad, rows, "samples-desc", ["cpu-pressure", "disk-attention", "memory-normal", "history-only", "unavailable"]);

const loadAudit = domainDefinitionFor("loadAudit");
assert.deepEqual(
  loadAudit.filters.map((option) => option.id),
  ["all", "sequence-available", "latest-available", "sequence-only", "overloaded", "unavailable"],
);
assert.deepEqual(
  loadAudit.sorts.map((option) => option.id),
  ["samples-desc", "newest-desc", "range-desc", "pressure-desc", "name-asc"],
);
assertFilter(loadAudit, rows, "sequence-available", ["cpu-pressure", "memory-normal", "disk-attention", "history-only"]);
assertFilter(loadAudit, rows, "latest-available", ["cpu-pressure", "memory-normal", "disk-attention"]);
assertFilter(loadAudit, rows, "sequence-only", ["history-only"]);
assertFilter(loadAudit, rows, "overloaded", ["cpu-pressure", "disk-attention"]);
assertFilter(loadAudit, rows, "unavailable", ["unavailable"]);
assertSort(loadAudit, rows, "newest-desc", ["memory-normal", "cpu-pressure", "disk-attention", "history-only", "unavailable"]);
assertSort(loadAudit, rows, "range-desc", ["cpu-pressure", "memory-normal", "disk-attention", "history-only", "unavailable"]);
assertSort(loadAudit, rows, "pressure-desc", ["cpu-pressure", "disk-attention", "history-only", "memory-normal", "unavailable"]);

console.log("resource-route-controls: PASS");
