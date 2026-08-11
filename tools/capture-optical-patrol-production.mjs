#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  ACTION_TIMEOUT_MS,
  closeRuntime,
  launchRuntime,
  login,
  waitForCurrent,
  withTimeout,
} = require("./acceptance/accessibility-v2/runtime.js");
const { verifyFrameworkAssetIdentity } = require("./framework-asset-identity.js");
const { gitWorktreeIdentity } = require("./worktree-runtime-identity.js");

const ROOT = "[data-optical-patrol-root]";
const CLAIM = `${ROOT} [data-optical-patrol-expanded-claim]`;
const CLAIM_HEADING = `${CLAIM} h2`;
const ACTION = `${CLAIM} .op__object-action`;
const OWNER_SELECTOR = [
  "[data-optical-patrol-root]",
  "[data-desktop-overview]",
].join(",");
const RUN_TIMEOUT_MS = 90_000;
const SETTLE_TIMEOUT_MS = Math.max(ACTION_TIMEOUT_MS, 10_000);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..");
const outputDirectory = path.join(root, "_acceptance", "optical-patrol-production");
const reportPath = path.join(outputDirectory, "report.json");

const scenarios = [
  { id: "single", mock: "", expected: { scene: "single", risk: "none", evidenceMode: "current", claimKind: "route", claimIdIncludes: "route:active-default" } },
  { id: "resource-full", mock: "resource-full", expected: { scene: "resource-full", risk: "resource", evidenceMode: "current", claimKind: "resource", claimIdIncludes: "cpu" } },
];
const viewports = [
  { name: "390x844", width: 390, height: 844 },
  { name: "768x1024", width: 768, height: 1024 },
];
const outputFiles = scenarios.flatMap((scenario) => viewports.map((viewport) => (
  `${scenario.id}-${viewport.name}.png`
)));

function serialiseError(error) {
  return {
    name: error?.name || "Error",
    code: error?.code || null,
    message: String(error?.message || error),
    detail: error?.detail || error?.report || null,
    stack: String(error?.stack || "").split("\n").slice(0, 10).join("\n"),
  };
}

function relativeFromRoot(file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

function reportAssetIdentity(identity) {
  return {
    pass: identity.pass,
    manifestPath: relativeFromRoot(identity.manifestPath),
    manifestVersion: identity.manifestVersion,
    expected: identity.expected,
    actual: identity.actual,
    reasons: identity.reasons,
  };
}

function overviewUrl(baseUrl) {
  const target = new URL(baseUrl);
  target.searchParams.set("section", "overview");
  target.hash = "";
  return target.toString();
}

async function settleAtOrigin(page) {
  await page.evaluate(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.documentElement.scrollLeft = 0;
    document.body.scrollTop = 0;
    document.body.scrollLeft = 0;
  });
  await page.evaluate(() => new Promise((resolve) => (
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  )));
}

async function inspectProductionOwner(page) {
  return page.evaluate(({ rootSelector, claimSelector, actionSelector, ownerSelector }) => {
    const visible = (node) => {
      if (!(node instanceof HTMLElement)) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const rect = (node) => {
      const value = node?.getBoundingClientRect();
      return value ? {
        left: value.left,
        top: value.top,
        right: value.right,
        bottom: value.bottom,
        width: value.width,
        height: value.height,
      } : null;
    };
    const rootNode = document.querySelector(rootSelector);
    const claim = rootNode?.querySelector("[data-optical-patrol-expanded-claim]") || null;
    const action = rootNode?.querySelector(".op__object-action") || null;
    const owners = [...document.querySelectorAll(ownerSelector)];
    const visibleOwners = owners.filter(visible);
    const topLevelOwners = owners.filter((owner) => !owner.parentElement?.closest(ownerSelector));
    return {
      viewport: { width: innerWidth, height: innerHeight },
      rootCount: document.querySelectorAll(rootSelector).length,
      rootVisible: visible(rootNode),
      scenario: rootNode?.getAttribute("data-optical-patrol-scenario") || "",
      scene: rootNode?.getAttribute("data-optical-patrol-scene") || "",
      risk: rootNode?.getAttribute("data-optical-patrol-risk") || "",
      evidenceMode: rootNode?.getAttribute("data-optical-patrol-evidence-mode") || "",
      owners: owners.map((owner) => ({
        kind: owner.hasAttribute("data-optical-patrol-root")
          ? "optical-patrol"
          : "desktop-overview",
        visible: visible(owner),
        rect: rect(owner),
      })),
      ownerCount: owners.length,
      visibleOwnerCount: visibleOwners.length,
      topLevelOwnerCount: topLevelOwners.length,
      claimCount: rootNode?.querySelectorAll(claimSelector.replace(`${rootSelector} `, "")).length || 0,
      claimId: claim?.getAttribute("data-optical-patrol-expanded-claim") || "",
      claimKind: claim?.getAttribute("data-optical-patrol-claim-kind") || "",
      claimRect: rect(claim),
      actionCount: rootNode?.querySelectorAll(actionSelector.replace(`${claimSelector} `, "")).length || 0,
      actionRect: rect(action),
      actionMinimumTarget: action instanceof HTMLElement
        ? Math.min(action.getBoundingClientRect().width, action.getBoundingClientRect().height)
        : 0,
      scrollY: window.scrollY,
      overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    };
  }, {
    rootSelector: ROOT,
    claimSelector: CLAIM,
    actionSelector: ACTION,
    ownerSelector: OWNER_SELECTOR,
  });
}

async function inspectReachability(page, selector, label) {
  const locator = page.locator(selector);
  if (await locator.count() !== 1) {
    return { label, present: false, initialVisible: false, reachable: false, obscured: null };
  }
  const result = await locator.evaluate(async (node) => {
    if (!(node instanceof HTMLElement)) {
      return { present: false, initialVisible: false, reachable: false, obscured: null };
    }
    const visibleInViewport = () => {
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0
        && box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth;
    };
    const initialVisible = visibleInViewport();
    node.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const box = node.getBoundingClientRect();
    const x = Math.max(0, Math.min(innerWidth - 1, box.left + Math.min(box.width / 2, 24)));
    const y = Math.max(0, Math.min(innerHeight - 1, box.top + Math.min(box.height / 2, 24)));
    const hit = document.elementFromPoint(x, y);
    const reachable = visibleInViewport();
    return {
      present: true,
      initialVisible,
      reachable,
      obscured: reachable ? !(hit && (hit === node || node.contains(hit))) : null,
      rect: { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height },
      scrollY: window.scrollY,
    };
  });
  return { label, ...result };
}

function evaluateChecks(evidence, reachability, expected) {
  const claim = reachability.find((item) => item.label === "expanded-claim-heading");
  const action = reachability.find((item) => item.label === "object-action");
  const checks = {
    rootUnique: evidence.rootCount === 1 && evidence.rootVisible,
    sceneBound: evidence.scene === expected.scene,
    riskBound: evidence.risk === expected.risk,
    evidenceBound: evidence.evidenceMode === expected.evidenceMode,
    ownerUnique: evidence.ownerCount === 1 && evidence.visibleOwnerCount === 1 && evidence.topLevelOwnerCount === 1
      && evidence.owners[0]?.kind === "optical-patrol",
    claimUnique: evidence.claimCount === 1 && Boolean(evidence.claimId),
    primaryClaimBound: evidence.claimKind === expected.claimKind
      && evidence.claimId.includes(expected.claimIdIncludes),
    claimReachable: Boolean(claim?.present && (claim.initialVisible || claim.reachable) && claim.obscured === false),
    actionUnique: evidence.actionCount === 1,
    actionReachable: Boolean(action?.present && (action.initialVisible || action.reachable) && action.obscured === false),
    actionTarget44: evidence.actionMinimumTarget >= 44,
    scrollOrigin: evidence.scrollY === 0,
    overflowXZero: evidence.overflowX === 0,
  };
  return {
    checks,
    failures: Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name),
  };
}

async function runCell(runtime, scenario, viewport) {
  const { page, mock } = runtime;
  const filename = `${scenario.id}-${viewport.name}.png`;
  const screenshotPath = path.join(outputDirectory, filename);
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  mock.state.scenario = scenario.mock;
  await page.goto(overviewUrl(mock.url), { waitUntil: "domcontentloaded", timeout: SETTLE_TIMEOUT_MS });
  await waitForCurrent(page);
  await page.locator(ROOT).waitFor({ state: "visible", timeout: SETTLE_TIMEOUT_MS });
  await page.waitForFunction(
    (expected) => {
      const owner = document.querySelector("[data-optical-patrol-root]");
      return owner?.getAttribute("data-optical-patrol-scene") === expected.scene
        && owner?.getAttribute("data-optical-patrol-risk") === expected.risk
        && owner?.getAttribute("data-optical-patrol-evidence-mode") === expected.evidenceMode;
    },
    scenario.expected,
    { timeout: SETTLE_TIMEOUT_MS },
  );

  await settleAtOrigin(page);
  const reachability = [
    await inspectReachability(page, CLAIM_HEADING, "expanded-claim-heading"),
    await inspectReachability(page, ACTION, "object-action"),
  ];
  await settleAtOrigin(page);
  const evidence = await inspectProductionOwner(page);
  const verdict = evaluateChecks(evidence, reachability, scenario.expected);
  await page.screenshot({
    path: screenshotPath,
    type: "png",
    fullPage: false,
    animations: "disabled",
  });
  return {
    scenario: scenario.id,
    viewport,
    file: filename,
    screenshotPath: relativeFromRoot(screenshotPath),
    pass: verdict.failures.length === 0,
    failures: verdict.failures,
    checks: verdict.checks,
    evidence,
    reachability,
  };
}

async function removePreviousOutputs() {
  await fs.mkdir(outputDirectory, { recursive: true });
  await Promise.all([...outputFiles, "report.json"].map((name) => (
    fs.rm(path.join(outputDirectory, name), { force: true })
  )));
}

async function writeReport(report) {
  await fs.mkdir(outputDirectory, { recursive: true });
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

const identity = gitWorktreeIdentity(root);
const assetIdentity = verifyFrameworkAssetIdentity(root);
const cells = [];
const errors = [];
let runtime = null;

await removePreviousOutputs();

try {
  if (!assetIdentity.pass) {
    const error = new Error(`Current framework asset identity is stale: ${assetIdentity.reasons.join("; ")}`);
    error.code = "FRAMEWORK_ASSET_IDENTITY_MISMATCH";
    error.detail = reportAssetIdentity(assetIdentity);
    throw error;
  }

  await withTimeout("optical-patrol-production-capture", async () => {
    runtime = await launchRuntime({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      colorScheme: "light",
      reducedMotion: "reduce",
    });
    await login(runtime.page, runtime.mock.url);

    for (const scenario of scenarios) {
      for (const viewport of viewports) {
        try {
          cells.push(await runCell(runtime, scenario, viewport));
        } catch (error) {
          const filename = `${scenario.id}-${viewport.name}.png`;
          const screenshotPath = path.join(outputDirectory, filename);
          await runtime.page.screenshot({
            path: screenshotPath,
            type: "png",
            fullPage: false,
            animations: "disabled",
          }).catch(() => {});
          const detail = serialiseError(error);
          errors.push({ scenario: scenario.id, viewport: viewport.name, error: detail });
          cells.push({
            scenario: scenario.id,
            viewport,
            file: filename,
            screenshotPath: relativeFromRoot(screenshotPath),
            pass: false,
            failures: ["capture-error"],
            error: detail,
          });
        }
      }
    }
  }, RUN_TIMEOUT_MS);
} catch (error) {
  errors.push({ stage: "capture", error: serialiseError(error) });
} finally {
  if (runtime) {
    await closeRuntime(runtime).catch((error) => {
      errors.push({ stage: "cleanup", error: serialiseError(error) });
    });
  }
}

const completeMatrix = cells.length === scenarios.length * viewports.length
  && outputFiles.every((name) => cells.some((cell) => cell.file === name));
const report = {
  source: "optical-patrol-production-runtime",
  pass: assetIdentity.pass && completeMatrix && errors.length === 0 && cells.every((cell) => cell.pass),
  commit: identity.commit,
  worktreeClean: identity.worktreeClean,
  worktreeFingerprint: identity.worktreeFingerprint,
  artifactKey: identity.artifactKey,
  generatedAt: new Date().toISOString(),
  assetIdentity: reportAssetIdentity(assetIdentity),
  bounded: {
    globalTimeoutMs: RUN_TIMEOUT_MS,
    actionTimeoutMs: SETTLE_TIMEOUT_MS,
    browser: "managed Chromium production runtime",
    scenarios: scenarios.map(({ id }) => id),
    viewports,
    expectedOriginals: outputFiles,
    originalCount: cells.filter((cell) => cell.screenshotPath).length,
    completeMatrix,
  },
  cells,
  errors,
};

await writeReport(report);
console.log(`Optical Patrol production capture: ${cells.filter((cell) => cell.pass).length}/${scenarios.length * viewports.length} cells PASS`);
console.log(`Report: ${relativeFromRoot(reportPath)}`);
if (!report.pass) process.exitCode = 1;
