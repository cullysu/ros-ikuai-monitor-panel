const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildSync } = require("esbuild");

const root = process.cwd();
const outDir = path.join(root, "_acceptance", "mobile-native-model");
const bundleFile = path.join(outDir, "model-contract.cjs");

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
buildSync({
  stdin: {
    contents: [
      'export { buildMobileNativeModel } from "./src/panel-framework/overview/mobile-native/mobileNativeModel";',
      'export { deriveOverviewState, OVERVIEW_SCENARIO_FIXTURES } from "./src/panel-framework/overview";',
    ].join("\n"),
    loader: "ts",
    resolveDir: root,
    sourcefile: "mobile-native-model-contract.ts",
  },
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node20",
  outfile: bundleFile,
  logLevel: "silent",
});

const { buildMobileNativeModel, deriveOverviewState, OVERVIEW_SCENARIO_FIXTURES } = require(bundleFile);
const clone = (value) => structuredClone(value);
const modelFor = (snapshot) => buildMobileNativeModel(snapshot, deriveOverviewState(snapshot));

const inactiveRoute = clone(OVERVIEW_SCENARIO_FIXTURES.single);
inactiveRoute.routes.defaultRoutes = [{ table: "main", gateway: "198.51.100.1", distance: 1, active: false, disabled: false }];
const inactiveRouteModel = modelFor(inactiveRoute);
assert.equal(inactiveRouteModel.routeVerification, "unknown", "an inactive first route must not be promoted to active");
assert.equal(inactiveRouteModel.routeLabel, "无法确认");
assert.doesNotMatch(inactiveRouteModel.title, /已记录/);

const missingRate = clone(OVERVIEW_SCENARIO_FIXTURES.single);
delete missingRate.wan[0].downRate;
const missingRateModel = modelFor(missingRate);
assert.equal(missingRateModel.showRates, false, "a missing observation must not render as measured zero");
assert.equal(missingRateModel.downRate, "");
assert.equal(missingRateModel.upRate, "");

const measuredZero = clone(OVERVIEW_SCENARIO_FIXTURES.single);
measuredZero.wan[0].downRate = 0;
measuredZero.wan[0].upRate = 0;
const measuredZeroModel = modelFor(measuredZero);
assert.equal(measuredZeroModel.showRates, true, "a numeric zero is a valid current observation");
assert.equal(measuredZeroModel.downRate, "0 bps");
assert.equal(measuredZeroModel.upRate, "0 bps");

const stale = clone(OVERVIEW_SCENARIO_FIXTURES.single);
const old = "2026-01-01T00:00:00.000Z";
stale.updatedAt = old;
stale.meta.realtimeUpdatedAt = old;
stale.meta.slowRestUpdatedAt = old;
stale.meta.staticUpdatedAt = old;
const staleModel = modelFor(stale);
assert.equal(staleModel.evidenceMode, "stale");
assert.equal(staleModel.showRates, false, "historical snapshots must not expose current rates");
assert.match(staleModel.title, /^历史快照/);

const unavailableModel = modelFor(clone(OVERVIEW_SCENARIO_FIXTURES["no-snapshot"]));
assert.equal(unavailableModel.evidenceMode, "unavailable");
assert.equal(unavailableModel.showRates, false);
assert.match(unavailableModel.summary, /已隐藏|停止展示/);

const collectionDownModel = modelFor(clone(OVERVIEW_SCENARIO_FIXTURES["collection-down"]));
assert.equal(collectionDownModel.evidenceMode, "stale");
assert.equal(collectionDownModel.showRates, false);

const interruptedResource = clone(OVERVIEW_SCENARIO_FIXTURES["resource-full"]);
interruptedResource.overview.history.cpu = [90, 90, 20, 90, 90];
interruptedResource.overview.history.memory = [20, 20, 20, 20, 20];
interruptedResource.overview.history.disk = [20, 20, 20, 20, 20];
const resourceModel = modelFor(interruptedResource);
const streak = resourceModel.rows.find((row) => row.label === "连续样本");
assert.equal(streak?.value, "2 个", "continuous evidence must use the trailing streak, not total exceeded samples");
assert.match(streak?.note || "", /共 5 个有效样本/);

const detailTitles = new Set(modelFor(clone(OVERVIEW_SCENARIO_FIXTURES.single)).detailSections.map((section) => section.title));
assert.equal(detailTitles.has("路由原始证据"), true);
assert.equal(detailTitles.has("WAN 对象证据"), true);
assert.equal(detailTitles.has("采集链路证据"), true);
assert.equal(detailTitles.has("只读边界"), true);

console.log("mobile native model contract: PASS cases=8");
