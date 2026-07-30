#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const componentPath = path.join(root, "src", "panel-framework", "mobile", "MobileInterfaceEvidenceBoundary.tsx");
const parentPath = path.join(root, "src", "panel-framework", "mobile", "MobileDomainWorkspace.tsx");
const stylePath = path.join(root, "src", "panel-framework", "mobile", "mobile-interface-recovery.css");
const component = fs.existsSync(componentPath) ? fs.readFileSync(componentPath, "utf8") : "";
const parent = fs.readFileSync(parentPath, "utf8");
const style = fs.readFileSync(stylePath, "utf8");
const failures = [];

function check(name, condition, detail) {
  if (!condition) failures.push({ name, detail });
}

check(
  "route-specific component exists",
  Boolean(component),
  "interfaces stale/unavailable evidence needs an owned recovery boundary"
);
check(
  "parent imports and renders the boundary",
  /MobileInterfaceEvidenceBoundary/.test(parent)
    && /route === \"interfaces\"/.test(parent)
    && /model\.evidenceMode !== \"current\"/.test(parent),
  "the boundary must be mounted only for interfaces and non-current evidence"
);
check(
  "stable recovery selectors exist",
  /data-mobile-interface-recovery/.test(component)
    && /data-mobile-interface-recovery-state/.test(component)
    && /data-mobile-interface-recovery-action/.test(component),
  "runtime and accessibility checks need stable state/action ownership"
);
check(
  "historical and unavailable states stay distinct",
  /historical/.test(component) && /unavailable/.test(component),
  "stale history cannot be presented as unavailable, and unavailable cannot be presented as history"
);
check(
  "current interface numbers are not asserted",
  /当前接口业务数字|历史快照不代表当前运行状态|不显示接口业务数字/.test(component),
  "the recovery boundary must state the evidence limit instead of manufacturing a current value"
);
check(
  "diagnostics and logs are real destinations",
  /onNavigate\(\"readonlyDiagnostics\"/.test(component)
    && /onNavigate\(\"logs\"/.test(component),
  "recovery must expose verifiable read-only investigation destinations"
);
check(
  "return route and evidence time are preserved",
  (component.match(/returnRoute:\s*\"interfaces\"/g) || []).length >= 2
    && /evidenceAt/.test(component),
  "both investigation actions must preserve interfaces context and evidence time"
);
check(
  "scoped visual owner exists",
  /mdw-interface-recovery/.test(style),
  "the route-specific boundary needs a restrained local layout owner"
);

if (failures.length) {
  console.error(JSON.stringify({ pass: false, contract: "mobile-interface-evidence-boundary-v1", failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ pass: true, checks: 8, contract: "mobile-interface-evidence-boundary-v1" }, null, 2));
