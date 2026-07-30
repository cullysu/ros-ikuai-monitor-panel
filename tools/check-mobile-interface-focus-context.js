#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const componentPath = path.join(root, "src", "panel-framework", "mobile", "MobileInterfaceFocusContext.tsx");
const parentPath = path.join(root, "src", "panel-framework", "mobile", "MobileDomainWorkspace.tsx");
const stylePath = path.join(root, "src", "panel-framework", "mobile", "mobile-domain.css");
const component = fs.existsSync(componentPath) ? fs.readFileSync(componentPath, "utf8") : "";
const parent = fs.readFileSync(parentPath, "utf8");
const style = fs.readFileSync(stylePath, "utf8");
const failures = [];

function check(name, condition, detail) {
  if (!condition) failures.push({ name, detail });
}

check(
  "phone current-object context owner exists",
  /data-mobile-interface-focus-context="true"/.test(component) && /data-mobile-interface-focus-object/.test(component),
  "the phone interface workspace needs one explicit current-object context owner, not a second hidden inspector"
);
check(
  "context derives from typed interface evidence",
  /InterfaceRowEvidence/.test(component) && /defaultRouteRelation/.test(component) && /defaultRoutes/.test(component),
  "object context must come from InterfaceRowEvidence and explicit route relation evidence"
);
check(
  "context exposes operational object facts",
  /running/.test(component) && /parent/.test(component) && /rxRate/.test(component) && /txRate/.test(component),
  "the current object must answer whether it runs and expose only available parent/rate facts"
);
check(
  "single direct object is distinguishable",
  /directRows/.test(component) && /length\s*===\s*1/.test(component) && /查看对象|打开对象/.test(component),
  "a single explicit direct relation may expose a real object entry without guessing"
);
check(
  "multiple direct objects do not auto-select",
  /directRows\.length\s*>\s*1/.test(component) && /选择对象|多个/.test(component) && /directRows\[0\]/.test(component) === false,
  "multi-WAN evidence must remain a choice set and must not fall back to the first row"
);
check(
  "unknown relation remains unknown",
  /未确认|待核对|关系未完整取得/.test(component) && /onNavigate\("routes"/.test(component),
  "without a direct route relation the context must show uncertainty and preserve the real route-table next step"
);
check(
  "real object identity and evidence time are carried",
  (/objectId/.test(component) || /focusRow\.id/.test(component)) && /evidenceAt/.test(component) && /onOpen/.test(component),
  "the object entry must carry the real WorkspaceRow identity and evidence context"
);
check(
  "context renders only on current phone interfaces",
  /MobileInterfaceFocusContext/.test(parent) && /!tabletWorkbench/.test(parent) && /!largeText/.test(parent) && /route\s*===\s*"interfaces"/.test(parent) && /model\.evidenceMode\s*===\s*"current"/.test(parent),
  "do not add the context to tablet/desktop trees or stale/large-text evidence"
);
check(
  "context is not the tablet ledger",
  !/MobileTabletInterfaceRelations/.test(component) && /MobileInterfaceRouteEvidence/.test(parent),
  "keep the phone context distinct from the tablet relation ledger and retain the existing relation section"
);
check(
  "context uses a shared touch-sized primitive",
  /min-height:\s*44px/.test(style),
  "the object entry must use the existing 44px mobile action language"
);
check(
  "no arbitrary first-row fallback",
  !/rows\s*\[0\]/.test(component) && !/interfaceRows\s*\[0\]/.test(component),
  "absence or multiplicity of explicit evidence must never become an arbitrary object"
);

if (failures.length) {
  console.error(JSON.stringify({ pass: false, contract: "mobile-interface-focus-context-v1", failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ pass: true, checks: 11, contract: "mobile-interface-focus-context-v1" }, null, 2));
