#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const component = read("src/panel-framework/sections/RouteEvidenceBoundary.tsx");
const policy = read("src/panel-framework/sections/route-recovery/routeRecoveryPolicies.ts");
const state = read("src/panel-framework/sections/route-recovery/routeRecoveryState.ts");
const parent = read("src/panel-framework/mobile/MobileDomainWorkspace.tsx");
const style = read("src/panel-framework/mobile/mobile-interface-recovery.css");
const failures = [];

function check(name, condition, detail) {
  if (!condition) failures.push({ name, detail });
}

check(
  "shared route-specific component exists",
  Boolean(component),
  "interfaces partial, historical and unavailable evidence need an owned recovery boundary",
);
check(
  "parent renders the shared boundary for interfaces",
  /RouteEvidenceBoundary/.test(parent)
    && /<RouteEvidenceBoundary route=\{route\}/.test(parent)
    && !/MobileInterfaceEvidenceBoundary/.test(parent),
  "the mobile workspace must use one recovery owner for interfaces and the other operational routes",
);
check(
  "stable recovery selectors exist",
  /data-route-recovery=\{route\}/.test(component)
    && /data-route-recovery-state=\{state\}/.test(component)
    && /data-route-recovery-action=\{action\.route\}/.test(component),
  "runtime and accessibility checks need stable state/action ownership",
);
check(
  "partial, historical and unavailable states stay distinct",
  /state === "partial"/.test(component)
    && /state === "historical"/.test(component)
    && /evidenceMode === "unavailable"/.test(state),
  "partial collection gaps, stale history and unavailable evidence cannot impersonate each other",
);
check(
  "missing interface values remain explicit",
  /missingEvidenceLabels/.test(component) && /sectionRecoveryState/.test(component),
  "the recovery boundary must name unavailable evidence instead of manufacturing a current value",
);
check(
  "diagnostics and logs are real destinations",
  /interfaces:\s*interfaceRecoveryPolicy/.test(policy)
    && /readonlyDiagnostics/.test(policy)
    && /logs/.test(policy),
  "recovery must expose verifiable read-only investigation destinations",
);
check(
  "return route and evidence time are preserved",
  /returnRoute:\s*route/.test(component)
    && /evidenceAt:\s*model\.observedAt/.test(component),
  "both investigation actions must preserve interfaces context and evidence time",
);
check(
  "partial and unavailable boundaries have one explicit primary action",
  /primaryAction:\s*"[^"]+"/.test(policy)
    && /const primaryActionRoute = copy\.primaryAction/.test(component)
    && /data-route-recovery-action-level=\{actionLevel\}/.test(component),
  "a recovery state must name its one best next investigation rather than render two equal choices",
);
check(
  "phone primary and secondary actions have distinct hierarchy",
  /\.is-mobile \.mdw-interface-recovery-actions button\.is-primary/.test(style)
    && /\.is-mobile \.mdw-interface-recovery-actions button\.is-secondary/.test(style)
    && /grid-template-columns:\s*minmax\(0, 1fr\)/.test(style),
  "phone recovery should expose one prominent next action and retain cross-checks as secondary actions",
);
check(
  "mobile and tablet keep one recovery decision path",
  !/@media \(min-width: 700px\)[\s\S]*mdw-interface-recovery/.test(style)
    && /\.is-mobile \.mdw-interface-recovery-actions\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s.test(style),
  "tablet must not promote the secondary cross-check back to equal visual weight",
);
check(
  "scoped visual owner exists",
  /mdw-interface-recovery/.test(style),
  "the shared recovery boundary needs a restrained local layout owner",
);

if (failures.length) {
  console.error(JSON.stringify({ pass: false, contract: "mobile-interface-evidence-boundary-v2", failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ pass: true, checks: 11, contract: "mobile-interface-evidence-boundary-v2" }, null, 2));
