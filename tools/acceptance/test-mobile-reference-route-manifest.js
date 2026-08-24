#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  CURRENT_MOBILE_REFERENCE_ROUTE_STAGE,
  CURRENT_MOBILE_REFERENCE_ROUTE_IDS,
  CURRENT_MOBILE_REFERENCE_ROUTES,
  validateCurrentMobileReferenceRouteManifest,
  validateCurrentMobileReferenceAccessibilitySource,
} = require("./mobile-reference-route-manifest");
const { mobileReferenceOwnsViewport } = require("./inspect-overview-mobile");

assert.equal(CURRENT_MOBILE_REFERENCE_ROUTE_IDS.length, 18);
assert.equal(validateCurrentMobileReferenceRouteManifest().pass, true);
assert.equal(validateCurrentMobileReferenceRouteManifest(CURRENT_MOBILE_REFERENCE_ROUTES.slice(1)).pass, false);
assert.equal(validateCurrentMobileReferenceRouteManifest([...CURRENT_MOBILE_REFERENCE_ROUTES, CURRENT_MOBILE_REFERENCE_ROUTES[0]]).pass, false);
assert.equal(validateCurrentMobileReferenceRouteManifest([...CURRENT_MOBILE_REFERENCE_ROUTES.slice(0, -1), { ...CURRENT_MOBILE_REFERENCE_ROUTES[0], route: "phantom" }]).pass, false);
assert.equal(validateCurrentMobileReferenceRouteManifest([{ ...CURRENT_MOBILE_REFERENCE_ROUTES[0], rootSelector: "[data-mobile-domain-workspace]" }], ["overview"]).pass, false);

const validSource = `
  const { CURRENT_MOBILE_REFERENCE_ROUTE_STAGE, CURRENT_MOBILE_REFERENCE_ROUTES } = require("./acceptance/mobile-reference-route-manifest");
  async function inspectCurrentMobileReferenceRoutes() { return CURRENT_MOBILE_REFERENCE_ROUTES; }
  run(CURRENT_MOBILE_REFERENCE_ROUTE_STAGE, inspectCurrentMobileReferenceRoutes);
`;
assert.equal(validateCurrentMobileReferenceAccessibilitySource(validSource).pass, true);
assert.equal(validateCurrentMobileReferenceAccessibilitySource(validSource.replace("run(CURRENT_MOBILE_REFERENCE_ROUTE_STAGE", "run(\"legacy-stage\"")).pass, false);
assert.equal(CURRENT_MOBILE_REFERENCE_ROUTE_STAGE, "current-mobile-reference-routes");
assert.equal(mobileReferenceOwnsViewport(599, 550), true);
assert.equal(mobileReferenceOwnsViewport(600, 320), false);
assert.equal(mobileReferenceOwnsViewport(1199, 1366), true);
assert.equal(mobileReferenceOwnsViewport(1200, 1366), false);
const sectionInspectorSource = fs.readFileSync(path.join(__dirname, "inspect-section-browser.js"), "utf8");
assert.match(sectionInspectorSource, /mobileReferenceViewportOwner\s*=\s*window\.innerWidth\s*<=\s*599\s*\|\|\s*\(window\.innerWidth\s*<=\s*1199\s*&&\s*window\.innerHeight\s*>=\s*window\.innerWidth\)/);
assert.match(sectionInspectorSource, /desktopReferenceViewportOwner\s*=\s*!mobileReferenceViewportOwner/);
assert.match(sectionInspectorSource, /sectionName\s*===\s*'overview'\s*&&\s*desktopReferenceViewportOwner/);
assert.doesNotMatch(sectionInspectorSource, /window\.innerWidth\s*>=\s*900\s*\|\|\s*wideLandscapeBrowserOwner/);

console.log(JSON.stringify({ pass: true, routes: CURRENT_MOBILE_REFERENCE_ROUTE_IDS.length, stage: CURRENT_MOBILE_REFERENCE_ROUTE_STAGE }));
