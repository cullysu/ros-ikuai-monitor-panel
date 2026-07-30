const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const resourceInspector = read("src/panel-framework/mobile/mobile-inspector/ResourceInspector.tsx");
const domainInspector = read("src/panel-framework/mobile/mobile-inspector/MobileDomainInspector.tsx");
const workspace = read("src/panel-framework/mobile/MobileDomainWorkspace.tsx");
const css = read("src/panel-framework/mobile/mobile-domain.css")
  + read("src/panel-framework/mobile/mobile-domain-next-evidence.css");
const workspaceInspector = workspace.match(/<MobileDomainInspector[\s\S]*?\/>/)?.[0] || "";
const checks = [];
const failures = [];

function check(name, condition, detail = "") {
  const pass = Boolean(condition);
  checks.push({ name, pass, detail });
  if (!pass) failures.push({ name, detail });
}

const inspectorOwnsNextEvidence = resourceInspector.includes("data-domain-next-evidence")
  && resourceInspector.includes("下一项核对")
  && resourceInspector.includes("打开采样审计");
check(
  "resource inspector owns a novel next-evidence region",
  inspectorOwnsNextEvidence,
  "ResourceInspector must own a domain-level next-evidence region instead of relying on overview task surfaces",
);

check(
  "resource inspector exposes navigation context",
  /onNavigate/.test(resourceInspector)
    && /objectId/.test(resourceInspector)
    && /evidenceAt/.test(resourceInspector)
    && /returnRoute/.test(resourceInspector),
  "next evidence must retain selected object, evidence time and return route",
);

check(
  "domain inspector receives and forwards navigation",
  /onNavigate\??\s*:\s*PanelNavigate/.test(domainInspector)
    && /<ResourceInspector[^>]*onNavigate/.test(domainInspector),
  "MobileDomainInspector must pass the navigation contract to ResourceInspector",
);

check(
  "workspace forwards current evidence context",
  /onNavigate=\{onNavigate\}/.test(workspaceInspector)
    && /(?:evidenceAt|originEvidenceAt)=\{currentEvidenceAt(?:\s*\|\|\s*[^}]+)?\}/.test(workspaceInspector),
  "workspace must pass the current route context and successful snapshot time",
);

check(
  "canonical load-audit object navigation",
  /onNavigate\(\s*["']loadAudit["']/.test(resourceInspector)
    && /objectId/.test(resourceInspector)
    && /returnRoute/.test(resourceInspector),
  "the next action must target the existing loadAudit route with object context",
);

check(
  "next-evidence target is touch-sized",
  /\.mdi-next-evidence[\s\S]*min-height:\s*44px/.test(css),
  "domain next-evidence action must preserve a 44px minimum touch target",
);

check(
  "next-evidence does not become metric filler",
  !/mdi-next-evidence[\s\S]*(min-height:\s*(?:1\d{2,}|auto)|重复指标|placeholder|dummy)/i.test(css + resourceInspector),
  "do not use fixed-height filler or repeated metrics to fill the tablet viewport",
);

const report = {
  pass: failures.length === 0,
  contract: "tablet-domain-space-efficiency-v1",
  checks,
  failures,
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
