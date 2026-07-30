#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const componentPath = path.join(root, "src", "panel-framework", "mobile", "MobileInterfaceRouteEvidence.tsx");
const parentPath = path.join(root, "src", "panel-framework", "mobile", "MobileDomainWorkspace.tsx");
const stylePath = path.join(root, "src", "panel-framework", "mobile", "mobile-domain.css");
const component = fs.readFileSync(componentPath, "utf8");
const parent = fs.readFileSync(parentPath, "utf8");
const style = fs.readFileSync(stylePath, "utf8");
const failures = [];

function check(name, condition, detail) {
  if (!condition) failures.push({ name, detail });
}

check(
  "mobile relation owner exists",
  /data-mobile-interface-route-evidence=\"true\"/.test(component) && /data-mobile-interface-route-row/.test(component),
  "the phone surface must own a stable interface-to-route evidence section and row identity"
);
check(
  "mobile relation uses typed evidence",
  /InterfaceRowEvidence/.test(component) && /defaultRouteRelation/.test(component) && /defaultRoutes/.test(component),
  "relation labels must come from the existing evidence model, not interface names or roles"
);
check(
  "mobile relation preserves missing boundaries",
  /已关联/.test(component) && /待核对/.test(component) && /未取得/.test(component) && /不自动选择默认出口/.test(component),
  "direct, unverified and missing route details must remain visibly distinct"
);
check(
  "route evidence uses a real destination",
  /route\.destination/.test(component) && /route\.gateway/.test(component),
  "the compact row must expose actual route evidence when it exists"
);
check(
  "mobile action preserves navigation context",
  /onNavigate\(\"routes\"/.test(component) && /returnRoute:\s*\"interfaces\"/.test(component) && /evidenceAt/.test(component),
  "the route-table action must retain origin route and snapshot time"
);
check(
  "mobile action has a touch-sized shared owner",
  /mdw-reset-controls/.test(component) && /min-height:\s*44px/.test(style),
  "reuse the existing 44px shared action primitive instead of adding a tiny mobile-only control"
);
check(
  "mobile render is current phone-only",
  /!tabletWorkbench/.test(parent) && /!largeText/.test(parent) && /route\s*===\s*\"interfaces\"/.test(parent) && /model\.evidenceMode\s*===\s*\"current\"/.test(parent),
  "the compact relation section must not duplicate the tablet ledger or appear for stale/large-text evidence"
);
check(
  "mobile render passes visible rows and context",
  /MobileInterfaceRouteEvidence\s+rows=\{visibleRows\}\s+onNavigate=\{onNavigate\}\s+evidenceAt=\{(?:evidenceAt|currentEvidenceAt)\}/.test(parent),
  "the section must follow filtering/pagination and preserve the existing navigation contract"
);
check(
  "mobile relation does not replay traffic",
  !/rxRate|txRate|rxBytes|txBytes/.test(component),
  "the phone evidence section must add route relationship facts, not duplicate readings"
);
check(
  "no one-off style sidecar was added",
  !fs.existsSync(path.join(root, "src", "panel-framework", "mobile", "mobile-interface-route-evidence.css")),
  "reuse existing mobile primitives and keep the fixed asset/style budget intact"
);

if (failures.length) {
  console.error(JSON.stringify({ pass: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ pass: true, checks: 10, contract: "mobile-interface-route-evidence-v1" }, null, 2));
