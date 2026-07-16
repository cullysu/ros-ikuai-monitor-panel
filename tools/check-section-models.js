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

const { buildSectionModel } = require(path.join(
  root,
  "src",
  "panel-framework",
  "sections",
  "sectionModels.ts",
));
const { OVERVIEW_SCENARIO_FIXTURES } = require(path.join(
  root,
  "src",
  "panel-framework",
  "overview",
  "index.ts",
));
const { rowsFromModel } = require(path.join(
  root,
  "src",
  "panel-framework",
  "mobile",
  "mobileDomainWorkspaceModel.ts",
));

const clone = (value) => structuredClone(value);
const metric = (model, label) => model.metrics.find((item) => item.label === label);
const localShortTimestamp = (value) => {
  const date = new Date(value);
  const pad = (part) => String(part).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const missingRate = clone(OVERVIEW_SCENARIO_FIXTURES.single);
delete missingRate.wan[0].downRate;
delete missingRate.pppoe[0].downRate;
const missingRateModel = buildSectionModel("lineStatus", missingRate);
assert.equal(missingRateModel.evidenceMode, "current");
assert.equal(metric(missingRateModel, "当前下载").value, "未取得", "missing WAN rate must remain unavailable");
assert.equal(metric(missingRateModel, "当前上传").value, "未取得", "an incomplete aggregate must not mix observed and missing rates");

const zeroRate = clone(OVERVIEW_SCENARIO_FIXTURES.single);
zeroRate.wan[0].downRate = 0;
zeroRate.wan[0].upRate = 0;
zeroRate.pppoe[0].downRate = 0;
zeroRate.pppoe[0].upRate = 0;
const zeroRateModel = buildSectionModel("lineStatus", zeroRate);
assert.equal(metric(zeroRateModel, "当前下载").value, "0 bps", "explicit zero must remain a measured zero");
assert.equal(metric(zeroRateModel, "当前上传").value, "0 bps", "explicit zero must remain a measured zero");

const missingConnections = clone(OVERVIEW_SCENARIO_FIXTURES.single);
delete missingConnections.connections.total;
assert.equal(metric(buildSectionModel("connections", missingConnections), "连接总数").value, "未取得");
missingConnections.connections.total = 0;
assert.equal(metric(buildSectionModel("connections", missingConnections), "连接总数").value, "0");

const routeModel = buildSectionModel("routes", clone(OVERVIEW_SCENARIO_FIXTURES.single));
assert.equal(metric(routeModel, "默认路由").value, "1", "defaultRoutes collection is itself default-route evidence");

const productionTerminalShape = clone(OVERVIEW_SCENARIO_FIXTURES.single);
productionTerminalShape.terminals = [{
  ip: "192.0.2.21",
  mac: "02:00:00:00:00:21",
  hostname: "workstation",
  status: "reachable",
  connections: 7,
  downRate: 1200,
  upRate: 300,
}];
const terminalModel = buildSectionModel("terminals", productionTerminalShape);
assert.equal(metric(terminalModel, "在线标记").value, "1", "RouterOS reachable state is current terminal evidence");
assert.equal(metric(terminalModel, "连接合计").value, "7", "production connections field must be aggregated");

const productionConnectionShape = clone(OVERVIEW_SCENARIO_FIXTURES.single);
productionConnectionShape.connections.active = [{
  localIp: "192.0.2.21",
  remoteIp: "198.51.100.8",
  protocol: "TCP",
  totalRate: 1500,
}];
const connectionModel = buildSectionModel("connections", productionConnectionShape);
assert.equal(connectionModel.tables[0].rows[0].source, "192.0.2.21", "production localIp must be the connection source");
assert.equal(connectionModel.tables[0].rows[0].target, "198.51.100.8 / TCP", "production remoteIp and protocol must identify the connection target");
const connectionRows = rowsFromModel("connections", connectionModel);
assert.equal(connectionRows[0].primary, "192.0.2.21");
assert.equal(connectionRows[0].secondary, "198.51.100.8 / TCP");
assert.equal(connectionRows[0].trailing, "1500");

const securityShape = clone(OVERVIEW_SCENARIO_FIXTURES.single);
securityShape.security = {
  filters: [{
    chain: "input",
    action: "accept",
    comment: "allow established",
    packets: 12,
    bytes: 1024,
    disabled: false,
  }],
  alerts: [],
  addressLists: [],
};
const securityRows = rowsFromModel("security", buildSectionModel("security", securityShape));
assert.equal(securityRows[0].primary, "allow established", "rule comments must be the scannable object identity");
assert.equal(securityRows[0].secondary, "input · accept", "chain and action must remain visible without opening detail");
assert.equal(securityRows[0].trailing, "accept", "missing rule order must not become the primary label");

const logShape = clone(OVERVIEW_SCENARIO_FIXTURES.single);
logShape.logs = {
  all: [{ time: "12:00:01", topics: "system,info", message: "link state changed" }],
  system: [{ time: "12:00:01", topics: "system,info", message: "link state changed" }],
  firewall: [],
  dhcp: [],
  dns: [],
};
const logRows = rowsFromModel("logs", buildSectionModel("logs", logShape));
assert.equal(logRows[0].primary, "link state changed", "log message must be scannable before opening detail");
assert.equal(logRows[0].secondary, "12:00:01");
assert.equal(logRows[0].trailing, "system,info");

const historical = buildSectionModel("lineStatus", clone(OVERVIEW_SCENARIO_FIXTURES["collection-down"]));
assert.equal(historical.evidenceMode, "historical");
assert.ok(metric(historical, "历史下载"));
assert.match(metric(historical, "历史下载").note, /不代表当前/);
assert.ok(historical.tables.every((item) => /上次成功快照/.test(item.note)));

const unavailableFixture = clone(OVERVIEW_SCENARIO_FIXTURES["no-snapshot"]);
const unavailable = buildSectionModel("trafficLoad", unavailableFixture);
assert.equal(unavailable.evidenceMode, "unavailable");
assert.equal(unavailable.metrics[0].value, "不可用");
assert.equal(
  unavailable.metrics[1].value,
  localShortTimestamp(unavailableFixture.meta.realtimeUpdatedAt),
  "the explicit last-success timestamp remains historical evidence in the viewer's local timezone",
);
assert.notEqual(
  unavailable.metrics[1].value,
  localShortTimestamp(unavailableFixture.updatedAt),
  "the failed attempt time must not replace the last successful evidence time",
);
assert.equal(unavailable.metrics[2].value, "不可判断");
assert.ok(unavailable.tables.every((item) => item.rows.length === 0));
assert.doesNotMatch(JSON.stringify(unavailable), /0 bps|0%|当前下载|当前上传/);

const pageSource = fs.readFileSync(path.join(root, "src/panel-framework/sections/OperationalSectionPage.tsx"), "utf8");
assert.match(pageSource, /cellValue\(row\[column\.key\]\)/, "table cells must preserve explicit zero strings");
assert.doesNotMatch(pageSource, /row\[column\.key\]\s*\|\|/, "table cells must not convert zero to an em dash");

console.log("section model evidence contract: PASS missing-zero-historical-unavailable");
