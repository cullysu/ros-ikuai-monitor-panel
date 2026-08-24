"use strict";

const CURRENT_MOBILE_REFERENCE_ROUTE_STAGE = "current-mobile-reference-routes";

const CURRENT_MOBILE_REFERENCE_ROUTE_IDS = Object.freeze([
  "overview",
  "interfaces",
  "lineStatus",
  "balance",
  "routes",
  "terminals",
  "dhcp",
  "arp",
  "trafficLoad",
  "loadAudit",
  "trafficAudit",
  "connections",
  "dns4",
  "dns6",
  "security",
  "logs",
  "serviceLogs",
  "readonlyDiagnostics",
]);

const CURRENT_MOBILE_REFERENCE_ROUTES = Object.freeze(CURRENT_MOBILE_REFERENCE_ROUTE_IDS.map((route) => Object.freeze({
  route,
  kind: route === "overview" ? "overview" : route === "lineStatus" ? "network-directory" : "workspace",
  rootSelector: route === "overview"
    ? "[data-mobile-reference-home]"
    : route === "lineStatus"
      ? "[data-mobile-reference-network-directory]"
      : `[data-mobile-reference-workspace="${route}"]`,
  contentSelector: route === "overview"
    ? ".ref-status, .ref-card"
    : route === "lineStatus"
      ? ".ref-status, .ref-interfaces, .ref-network-actions"
      : ".ref-object-list",
})));

function validateCurrentMobileReferenceRouteManifest(
  manifest = CURRENT_MOBILE_REFERENCE_ROUTES,
  expectedRouteIds = CURRENT_MOBILE_REFERENCE_ROUTE_IDS,
) {
  const violations = [];
  const entries = Array.isArray(manifest) ? manifest : [];
  const expected = Array.isArray(expectedRouteIds) ? expectedRouteIds : [];
  if (!Array.isArray(manifest)) violations.push("manifest must be an array");
  if (!Array.isArray(expectedRouteIds)) violations.push("expected route ids must be an array");
  const routes = entries.map((entry) => entry && entry.route).filter((route) => typeof route === "string" && route.length);
  const duplicates = [...new Set(routes.filter((route, index) => routes.indexOf(route) !== index))];
  const missing = expected.filter((route) => !routes.includes(route));
  const extra = routes.filter((route) => !expected.includes(route));
  if (entries.length !== expected.length) violations.push(`manifest must contain exactly ${expected.length} routes`);
  if (duplicates.length) violations.push(`duplicate routes: ${duplicates.join(", ")}`);
  if (missing.length) violations.push(`missing routes: ${missing.join(", ")}`);
  if (extra.length) violations.push(`unexpected routes: ${extra.join(", ")}`);
  entries.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") {
      violations.push(`entry ${index} must be an object`);
      return;
    }
    if (!entry.route || typeof entry.route !== "string") violations.push(`entry ${index} needs a route`);
    if (!entry.rootSelector || typeof entry.rootSelector !== "string") violations.push(`${entry.route || index}: missing root selector`);
    if (!entry.contentSelector || typeof entry.contentSelector !== "string") violations.push(`${entry.route || index}: missing content selector`);
    if (!new Set(["overview", "network-directory", "workspace"]).has(entry.kind)) violations.push(`${entry.route || index}: invalid route kind`);
    const selectorText = `${entry.rootSelector || ""} ${entry.contentSelector || ""}`;
    if (/mobile-(?:inspection|flow|pulse|domain)|data-inspection-workspace/.test(selectorText)) violations.push(`${entry.route || index}: retired selector`);
  });
  return { pass: violations.length === 0, violations, missing, extra, duplicates, routes };
}

function validateCurrentMobileReferenceAccessibilitySource(source) {
  const text = typeof source === "string" ? source : "";
  const required = [
    "CURRENT_MOBILE_REFERENCE_ROUTE_STAGE",
    "CURRENT_MOBILE_REFERENCE_ROUTES",
    "inspectCurrentMobileReferenceRoutes",
    "run(CURRENT_MOBILE_REFERENCE_ROUTE_STAGE",
  ];
  const missing = required.filter((token) => !text.includes(token));
  const retired = ["check-mobile-telemetry-runtime"].filter((token) => text.includes(token));
  const violations = [
    ...missing.map((token) => `accessibility runtime is missing ${token}`),
    ...retired.map((token) => `accessibility runtime contains retired token ${token}`),
  ];
  return { pass: violations.length === 0, violations, missing, retired };
}

module.exports = {
  CURRENT_MOBILE_REFERENCE_ROUTE_STAGE,
  CURRENT_MOBILE_REFERENCE_ROUTE_IDS,
  CURRENT_MOBILE_REFERENCE_ROUTES,
  validateCurrentMobileReferenceRouteManifest,
  validateCurrentMobileReferenceAccessibilitySource,
};
