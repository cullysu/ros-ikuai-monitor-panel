#!/usr/bin/env node
"use strict";

/*
 * Responsive ownership is a product contract, not a screenshot convention.
 * Wide landscape tablets use the browser workbench rather than the phone
 * surface; narrow phones and portrait tablet workspaces remain mobile-owned.
 * Mobile Reference owns portrait and narrow-phone surfaces; desktop owns
 * wide landscape tablets and 1200px and above.
 * above. The required matrix is fail-closed so a partial run cannot publish a
 * stale mobile claim.
 */
const fs = require("node:fs");
const path = require("node:path");
const { gitWorktreeIdentity } = require("./worktree-runtime-identity");
const { ACTION_TIMEOUT_MS, closeRuntime, launchRuntime, login, withTimeout } = require("./acceptance/accessibility-v2/runtime");

const root = path.resolve(__dirname, "..");
const artifactDir = path.join(root, "_acceptance", "responsive-boundary-contract");
const reportPath = path.join(artifactDir, "report.json");
const contract = "responsive-mobile-reference-boundary-runtime-v3";
const RUNTIME_BOUNDARY_TIMEOUT_MS = process.env.CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS ? 900_000 : 180_000;
const cells = [
  { id: "phone320", width: 320, height: 568, owner: "mobile-reference" },
  { id: "phone390", width: 390, height: 844, owner: "mobile-reference" },
  { id: "phone430", width: 430, height: 932, owner: "mobile-reference" },
  { id: "landscape667", width: 667, height: 375, owner: "desktop", landscape: true },
  { id: "landscape844", width: 844, height: 390, owner: "desktop", landscape: true },
  { id: "tablet768", width: 768, height: 1024, owner: "mobile-reference", tablet: true },
  { id: "tablet1199", width: 1199, height: 900, owner: "mobile-reference", tablet: true },
  { id: "desktop1200", width: 1200, height: 900, owner: "desktop" },
];

function serialise(error) {
  return { name: error?.name || "Error", message: String(error?.message || error), stack: String(error?.stack || "").split("\n").slice(0, 6).join("\n") };
}
function assert(condition, message, evidence) {
  if (!condition) throw new Error(`${message}${evidence ? `\n${JSON.stringify(evidence, null, 2)}` : ""}`);
}
function overviewUrl(baseUrl) {
  const url = new URL(baseUrl);
  url.searchParams.set("section", "overview");
  url.searchParams.delete("object");
  url.hash = "";
  return url.toString();
}
function surfaceUrl(baseUrl, owner) {
  const url = new URL(baseUrl);
  url.searchParams.set("surface", owner === "mobile-reference" ? "mobile" : "desktop");
  return url.toString();
}
function sameIdentity(a, b) {
  return a.commit === b.commit && a.artifactKey === b.artifactKey && a.worktreeFingerprint === b.worktreeFingerprint;
}

async function inspectCell(page, cell) {
  await page.setViewportSize({ width: cell.width, height: cell.height });
  await page.goto(overviewUrl(page.__mockUrl), { waitUntil: "domcontentloaded", timeout: ACTION_TIMEOUT_MS });
  const expected = cell.owner === "mobile-reference" ? "[data-mobile-reference-home]" : "[data-desktop-overview]";
  await page.locator(expected).waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
  const evidence = await page.evaluate(({ expectedOwner, landscape, tablet }) => {
    const mobileReference = document.querySelector("[data-mobile-reference-home]");
    const desktop = document.querySelector("[data-desktop-overview]");
    const nav = document.querySelector("[data-mobile-reference-navigation]");
    const active = expectedOwner === "mobile-reference" ? mobileReference : desktop;
    const rect = (node) => node instanceof HTMLElement ? node.getBoundingClientRect().toJSON() : null;
    const visible = (node) => {
      if (!(node instanceof HTMLElement)) return false;
      const style = getComputedStyle(node); const box = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
    };
    const tabs = nav ? [...nav.querySelectorAll("button")].filter(visible).map((button) => ({
      label: (button.getAttribute("aria-label") || button.textContent || "").trim(), rect: button.getBoundingClientRect().toJSON(),
    })) : [];
    const critical = active ? [...active.querySelectorAll("h1,h2,strong,b,time")].filter(visible).map((node) => {
      const style = getComputedStyle(node); const box = node.getBoundingClientRect();
      return { text: (node.textContent || "").trim().slice(0, 72), clipped: style.textOverflow === "ellipsis" && node.scrollWidth > node.clientWidth + 1, left: box.left, right: box.right };
    }) : [];
    const canvas = mobileReference;
    const facts = active ? [...active.querySelectorAll("[data-mobile-reference-tablet-workspace] button")].filter(visible).map(rect) : [];
    const mobileMains = [...document.querySelectorAll('[data-panel-surface="mobile"] main')].filter(visible);
    return {
      inner: { width: innerWidth, height: innerHeight }, expectedOwner,
      mobileReference: visible(mobileReference), desktop: visible(desktop), unexpectedMobileMains: mobileReference ? mobileMains.filter((node) => node !== mobileReference).length : mobileMains.length, nav: nav ? rect(nav) : null, tabs,
      canvas: canvas ? rect(canvas) : null, facts, critical,
      overflowX: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0) - innerWidth,
      tabRows: tabs.length ? new Set(tabs.map((tab) => Math.round(tab.rect.top))).size : 0,
      landscape, tablet,
    };
  }, { expectedOwner: cell.owner, landscape: Boolean(cell.landscape), tablet: Boolean(cell.tablet) });
  assert(evidence.unexpectedMobileMains === 0, "mobile surface mounted an unexpected main landmark", evidence);
  assert(evidence.overflowX <= 1, "responsive surface has horizontal overflow", evidence);
  if (cell.owner === "mobile-reference") {
    assert(evidence.mobileReference && !evidence.desktop, "Mobile Reference boundary mounted the wrong owner", evidence);
    assert(evidence.canvas && evidence.canvas.width > 0, "Mobile Reference layout is missing", evidence);
    assert(evidence.tabs.length === 4 && evidence.tabs.every((tab) => tab.label && tab.rect.width >= 44 && tab.rect.height >= 44), "Mobile Reference navigation must provide four labelled 44px task tabs", evidence);
    assert(evidence.nav.bottom <= evidence.inner.height + 1, "bottom navigation falls outside the viewport", evidence);
    if (cell.landscape) assert(evidence.tabRows <= 2, "landscape must retain a horizontal bottom tab bar", evidence);
    if (cell.id === "phone320") assert(evidence.critical.every((node) => !node.clipped && node.left >= -1 && node.right <= evidence.inner.width + 1), "320px clips or ellipsizes critical Mobile Reference evidence", evidence);
    if (cell.tablet) assert(evidence.canvas.width >= 240 && evidence.facts.length >= 3 && evidence.facts.every((fact) => fact.width >= 110), "tablet lost Mobile Reference capability continuity", evidence);
  } else {
    assert(evidence.desktop && !evidence.mobileReference, "desktop boundary mounted the Mobile Reference owner", evidence);
  }
  return evidence;
}

async function main() {
  const started = Date.now();
  const identityStart = gitWorktreeIdentity(root);
  const results = [];
  const surfaceGroups = [
    cells.filter((cell) => cell.owner === "mobile-reference"),
    cells.filter((cell) => cell.owner === "desktop"),
  ];
  for (const group of surfaceGroups) {
    if (!group.length) continue;
    let runtime = null;
    try {
      const initial = group[0];
      // The production loader chooses a single surface during initial load;
      // resizing a mobile page must not masquerade as a desktop remount.
      runtime = await launchRuntime({ viewport: { width: initial.width, height: initial.height }, screen: { width: initial.width, height: initial.height } });
      // The acceptance context is touch-enabled at every viewport. Select the
      // production loader's explicit surface route so desktop coverage remains
      // a real desktop mount instead of inheriting the touch default.
      runtime.page.__mockUrl = surfaceUrl(runtime.mock.url, initial.owner);
      await login(runtime.page, runtime.page.__mockUrl);
      for (const cell of group) {
        try { results.push({ ...cell, pass: true, evidence: await inspectCell(runtime.page, cell) }); }
        catch (error) { results.push({ ...cell, pass: false, error: serialise(error) }); }
      }
    } finally { if (runtime) await closeRuntime(runtime); }
  }
  const identityEnd = gitWorktreeIdentity(root);
  const complete = results.length === cells.length && results.every((cell) => cell.pass) && sameIdentity(identityStart, identityEnd);
  const report = { pass: complete, complete, contract, source: "mobile-reference", generatedAt: new Date().toISOString(), commit: identityEnd.commit, artifactKey: identityEnd.artifactKey, worktreeFingerprint: identityEnd.worktreeFingerprint, required: cells.length, completed: results.length, cells: results, freshness: sameIdentity(identityStart, identityEnd), elapsedMs: Date.now() - started };
  fs.mkdirSync(artifactDir, { recursive: true }); fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ pass: report.pass, complete: report.complete, contract, failed: results.filter((cell) => !cell.pass).map((cell) => ({ id: cell.id, error: cell.error })), elapsedMs: report.elapsedMs }, null, 2));
  if (!complete) process.exitCode = 1;
}

withTimeout("responsive telemetry boundary", () => main(), RUNTIME_BOUNDARY_TIMEOUT_MS).catch((error) => {
  const identity = gitWorktreeIdentity(root);
  const report = { pass: false, complete: false, contract, source: "mobile-reference", generatedAt: new Date().toISOString(), commit: identity.commit, artifactKey: identity.artifactKey, worktreeFingerprint: identity.worktreeFingerprint, error: serialise(error) };
  fs.mkdirSync(artifactDir, { recursive: true }); fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.error(JSON.stringify(report, null, 2)); process.exitCode = 1;
});
