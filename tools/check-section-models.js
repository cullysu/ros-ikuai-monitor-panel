const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildSync } = require("esbuild");

const root = process.cwd();
const outDir = path.join(root, "_acceptance", "section-model-contract");
const bundleFile = path.join(outDir, "section-model-contract.cjs");

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
buildSync({
  stdin: {
    contents: [
      'export { buildSectionModel } from "./src/panel-framework/sections/sectionModels";',
      'export { OVERVIEW_SCENARIO_FIXTURES } from "./src/panel-framework/overview";',
    ].join("\n"),
    loader: "ts",
    resolveDir: root,
    sourcefile: "section-model-contract.ts",
  },
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node20",
  outfile: bundleFile,
  logLevel: "silent",
});

const { buildSectionModel, OVERVIEW_SCENARIO_FIXTURES } = require(bundleFile);
const clone = (value) => structuredClone(value);
const metric = (model, label) => model.metrics.find((item) => item.label === label);

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

const historical = buildSectionModel("lineStatus", clone(OVERVIEW_SCENARIO_FIXTURES["collection-down"]));
assert.equal(historical.evidenceMode, "historical");
assert.ok(metric(historical, "历史下载"));
assert.match(metric(historical, "历史下载").note, /不代表当前/);
assert.ok(historical.tables.every((item) => /上次成功快照/.test(item.note)));

const unavailable = buildSectionModel("trafficLoad", clone(OVERVIEW_SCENARIO_FIXTURES["no-snapshot"]));
assert.equal(unavailable.evidenceMode, "unavailable");
assert.equal(unavailable.metrics[0].value, "不可用");
assert.match(unavailable.metrics[1].value, /^06-21 02:51$/, "the explicit last-success timestamp remains historical evidence");
assert.equal(unavailable.metrics[2].value, "不可判断");
assert.ok(unavailable.tables.every((item) => item.rows.length === 0));
assert.doesNotMatch(JSON.stringify(unavailable), /0 bps|0%|当前下载|当前上传/);

const pageSource = fs.readFileSync(path.join(root, "src/panel-framework/sections/OperationalSectionPage.tsx"), "utf8");
assert.match(pageSource, /cellValue\(row\[column\.key\]\)/, "table cells must preserve explicit zero strings");
assert.doesNotMatch(pageSource, /row\[column\.key\]\s*\|\|/, "table cells must not convert zero to an em dash");

console.log("section model evidence contract: PASS missing-zero-historical-unavailable");
