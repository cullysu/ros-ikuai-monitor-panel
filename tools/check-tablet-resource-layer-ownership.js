const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const checks = [];
const check = (name, pass, detail) => checks.push({ name, pass, ...(detail ? { detail } : {}) });

const signal = read("src/panel-framework/mobile/MobileResourcePressure.tsx");
const history = read("src/panel-framework/mobile/MobileResourceHistory.tsx");
const inspector = read("src/panel-framework/mobile/MobileIncidentWorkspace.tsx");
const domainWorkspace = read("src/panel-framework/mobile/MobileDomainWorkspace.tsx");
const domainInspector = read("src/panel-framework/mobile/mobile-inspector/MobileDomainInspector.tsx");
const resourceInspector = read("src/panel-framework/mobile/mobile-inspector/ResourceInspector.tsx");
const model = read("src/panel-framework/overview/evidence-model/buildOverviewEvidenceModel.ts");

check(
  "resource signal owns current threshold comparison",
  signal.includes('data-resource-layer="signal"') &&
    signal.includes('data-resource-layer-question="current-threshold"') &&
    signal.includes('data-resource-evidence-role="current-threshold"'),
  "signal must explicitly own the question: which resources are over threshold now",
);
check(
  "resource history owns sustained-pressure evidence",
  history.includes('data-resource-layer="history"') &&
    history.includes('data-resource-layer-question="sustained-pressure"'),
  "history must explicitly own the question: does pressure persist across samples",
);
check(
  "selected resource inspector owns object evidence",
  inspector.includes('data-resource-layer={isResource ? "object"') &&
    inspector.includes('data-resource-layer-question={isResource ? "breach-context"') &&
    inspector.includes("data-resource-object-evidence"),
  "the selected object must have an explicit evidence owner instead of an unlabelled replay",
);
check(
  "resource object model exposes sample-range evidence",
  model.includes('{ label: "样本范围", value:') &&
    model.includes('{ label: "采样来源", value:'),
  "object evidence must add source/sample-range facts beyond the current metric headline",
);
check(
  "resource inspector does not mount the aggregate metric list",
  !inspector.includes("<ResourceMetrics") && !inspector.includes("resource.metrics.map"),
  "selected object may retain one current value but must not render the complete aggregate list again",
);
check(
  "trafficLoad list owns current threshold comparison",
  domainWorkspace.includes('data-resource-layer={route === "trafficLoad" ? "signal"') &&
    domainWorkspace.includes('data-resource-layer-question={route === "trafficLoad" ? "current-threshold"'),
  "the real resource workbench list must own current threshold comparison",
);
check(
  "trafficLoad visualization owns sustained-pressure evidence",
  domainWorkspace.includes('data-resource-layer={route === "trafficLoad" && model.visualization ? "history"') &&
    domainWorkspace.includes('data-resource-layer-question={route === "trafficLoad" && model.visualization ? "sustained-pressure"'),
  "the real resource workbench visualization must own sustained pressure",
);
check(
  "trafficLoad domain inspector owns object evidence",
  domainInspector.includes('data-resource-layer={row.evidence.kind === "resource" ? "object"') &&
    domainInspector.includes('data-resource-layer-question={row.evidence.kind === "resource" ? "breach-context"'),
  "the actual selected resource inspector must declare object evidence ownership",
);
check(
  "resource domain inspector keeps source and sample range evidence",
  resourceInspector.includes("样本范围") && resourceInspector.includes("采样来源") &&
    resourceInspector.includes('data-resource-evidence-role="object-facts"'),
  "the route-level object inspector must expose source/sample evidence without metric replay",
);

const failed = checks.filter((item) => !item.pass);
const report = {
  pass: failed.length === 0,
  contract: "tablet-resource-layer-ownership-v1",
  checks,
  failures: failed.map((item) => item.name),
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
