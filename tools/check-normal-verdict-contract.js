const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "src", "panel-framework", "overview", "evidence-model", "buildOverviewEvidenceModel.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const branchStart = source.indexOf("  return {\n    label: state.scale === \"fleet\"");
const branchEnd = source.indexOf("\n  };\n}", branchStart);
const normalBranch = branchStart >= 0 && branchEnd >= 0 ? source.slice(branchStart, branchEnd) : "";
const checks = {
  normalBranchFound: normalBranch.length > 0,
  businessBoundaryTitle: /title:\s*\"业务可用性尚未判定\"/.test(normalBranch),
  managementEvidenceInSummary: /默认路由|采集通道/.test(normalBranch),
  externalProbeBoundaryInSummary: /外部业务.*未探测|未探测.*外部业务/.test(normalBranch),
  oldRouteFirstTitleRemoved: !/title:\s*\"默认路由已核实\"/.test(normalBranch),
};
const failed = Object.entries(checks).filter(([, value]) => !value).map(([name]) => name);
const report = {
  pass: failed.length === 0,
  checks,
  failed,
  contract: "normal-verdict-business-boundary-v1",
  source: path.relative(root, sourcePath).replaceAll("\\", "/"),
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
