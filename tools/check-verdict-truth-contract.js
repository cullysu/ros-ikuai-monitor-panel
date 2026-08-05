const fs = require("node:fs");
const path = require("node:path");

const file = path.resolve(__dirname, "../src/panel-framework/overview/evidence-model/buildOverviewEvidenceModel.ts");
const source = fs.readFileSync(file, "utf8");
const fleetBranch = source.indexOf('if (state.scale === "fleet")');
const normalStart = source.indexOf("return {", fleetBranch);
const normalEnd = source.indexOf("\n  };\n}", normalStart);
const normalBlock = normalStart >= 0 && normalEnd > normalStart
  ? source.slice(normalStart, normalEnd)
  : "";

const checks = [
  ["normal branch found", normalBlock.length > 0],
  ["normal title leads with verified management evidence", normalBlock.includes('title: "默认出口与采集已核实"')],
  ["normal label names evidence boundary", normalBlock.includes("当前出口证据")],
  ["normal summary preserves unprobed business boundary", normalBlock.includes("外部业务") && normalBlock.includes("未探测")],
  ["normal tone remains trust for current evidence", normalBlock.includes('tone: "trust"')],
  ["old route-first title is absent from normal branch", !normalBlock.includes('title: "默认路由已核实"')],
  ["risk branches retain their explicit titles", [
    "当前业务状态不可判断",
    "当前采集状态不可确认",
    "默认路由无法核实",
    "资源策略已触发",
    "配置依赖未运行",
  ].every((title) => source.includes(title))],
];

const failed = checks.filter(([, pass]) => !pass);
for (const [name, pass] of checks) console.log((pass ? "PASS " : "FAIL ") + name);
if (failed.length) {
  console.error("verdict truth contract: FAIL " + failed.length + "/" + checks.length);
  process.exit(1);
}
console.log("verdict truth contract: PASS " + checks.length + "/" + checks.length);
