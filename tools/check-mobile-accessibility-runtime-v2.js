#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { gitWorktreeIdentity } = require("./worktree-runtime-identity");
const {
  ACTION_TIMEOUT_MS,
  ABORT_CLEANUP_TIMEOUT_MS,
  boundedAbortCleanup,
  closeRuntime,
  launchRuntime,
  login,
  visitRoute,
  withTimeout,
} = require("./acceptance/accessibility-v2/runtime");

const root = path.resolve(__dirname, "..");
const routeRegistryFile = path.join(root, "src", "panel-framework", "routes", "panelRoutes.ts");
const requestedMode = process.argv.includes("--css-text-resize-fixture")
  ? "css-text-resize-fixture"
  : process.argv.includes("--browser-page-scale") || process.argv.includes("--native-page-scale") ||
      process.env.MOBILE_ACCESSIBILITY_RUNTIME_V2_USE_NATIVE_PAGE_SCALE === "1"
    ? "browser-page-scale"
    : "rendered-scale-reflow-fixture";
const onlyReducedMotion = process.argv.includes("--only-reduced-motion");
const reportMode = onlyReducedMotion ? `${requestedMode}-reduced-motion-focus` : requestedMode;
const artifactDir = path.join(root, "_acceptance", "mobile-accessibility-runtime-v2", reportMode);
const reportPath = path.join(artifactDir, "report.json");
const progressPath = path.join(artifactDir, "progress.json");
const configuredTimeoutMs = Number(process.env.MOBILE_ACCESSIBILITY_RUNTIME_V2_TIMEOUT_MS);
const runTimeoutMs = Number.isFinite(configuredTimeoutMs)
  ? Math.min(Math.max(configuredTimeoutMs, 60000), 210000)
  : 180000;

const SCALING_EVIDENCE_BOUNDARIES = {
  "rendered-scale-reflow-fixture": {
    kind: "fixture",
    realBrowserProcess: true,
    proves: "A Chromium layout-pressure fixture at a narrowed CSS viewport with DPR 2. The default run also executes an injected 200% CSS text-resize reflow assertion in a real browser process, including visible-text clipping, reachable primary targets, bounded keyboard focus, and landmark checks.",
    doesNotProve: "Browser-toolbar 200% zoom, iOS Dynamic Type, Android system font size, or any physical OS text-size setting.",
  },
  "browser-page-scale": {
    kind: "page-scale-probe",
    realBrowserProcess: true,
    proves: "Chromium CDP page-scale visual zoom at 2x, including visible-text clipping and keyboard focus checks in the visual viewport.",
    doesNotProve: "Layout reflow from browser-toolbar 200% zoom, iOS Dynamic Type, Android system font size, or any physical OS text-size setting.",
  },
  "css-text-resize-fixture": {
    kind: "css-fixture",
    realBrowserProcess: true,
    proves: "Injected 200% computed text growth and resulting layout pressure, including visible-text clipping and keyboard focus checks.",
    doesNotProve: "Browser zoom, browser-toolbar 200% zoom, iOS Dynamic Type, Android system font size, or any physical OS text-size setting.",
  },
};

function assert(condition, message, evidence) {
  if (condition) return;
  const detail = evidence ? `\n${JSON.stringify(evidence, null, 2)}` : "";
  throw new Error(`${message}${detail}`);
}

const stageProgress = [];
async function runStage(name, operation) {
  const stage = { name, status: "running", startedAt: new Date().toISOString(), elapsedMs: 0 };
  stageProgress.push(stage);
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(progressPath, `${JSON.stringify(stageProgress, null, 2)}\n`, "utf8");
  const startedAt = Date.now();
  try {
    const value = await operation();
    stage.status = "passed";
    return value;
  } catch (error) {
    stage.status = "failed";
    stage.error = String(error?.message || error);
    throw error;
  } finally {
    stage.elapsedMs = Date.now() - startedAt;
    stage.finishedAt = new Date().toISOString();
    fs.writeFileSync(progressPath, `${JSON.stringify(stageProgress, null, 2)}\n`, "utf8");
  }
}

async function inspectAbortCleanupBound() {
  const startedAt = Date.now();
  let caught = null;
  try {
    await boundedAbortCleanup(() => new Promise(() => {}), 75);
  } catch (error) {
    caught = error;
  }
  const evidence = {
    configuredTimeoutMs: ABORT_CLEANUP_TIMEOUT_MS,
    fixtureTimeoutMs: 75,
    elapsedMs: Date.now() - startedAt,
    errorCode: caught?.code || "",
  };
  assert(caught?.code === "ABORT_CLEANUP_TIMEOUT", "accessibility abort cleanup fixture did not settle with its bounded timeout", evidence);
  assert(evidence.elapsedMs >= 60 && evidence.elapsedMs < 1_000, "accessibility abort cleanup fixture escaped its bounded timing envelope", evidence);
  return evidence;
}

const OPERABLE_CONTROL_SELECTOR = [
  "button:not([disabled]):not([aria-disabled='true'])",
  "a[href]:not([aria-disabled='true'])",
  "input:not([type='hidden']):not([disabled]):not([aria-disabled='true'])",
  "select:not([disabled]):not([aria-disabled='true'])",
  "textarea:not([disabled]):not([aria-disabled='true'])",
  "summary:not([aria-disabled='true'])",
  "[role='button']:not([aria-disabled='true'])",
  "[role='link']:not([aria-disabled='true'])",
  "[role='checkbox']:not([aria-disabled='true'])",
  "[role='radio']:not([aria-disabled='true'])",
  "[role='switch']:not([aria-disabled='true'])",
  "[role='combobox']:not([aria-disabled='true'])",
  "[role='menuitem']:not([aria-disabled='true'])",
  "[role='menuitemcheckbox']:not([aria-disabled='true'])",
  "[role='menuitemradio']:not([aria-disabled='true'])",
  "[role='option']:not([aria-disabled='true'])",
  "[role='tab']:not([aria-disabled='true'])",
  "[role='treeitem']:not([aria-disabled='true'])",
  "[role='gridcell']:not([aria-disabled='true'])",
  "[role='slider']:not([aria-disabled='true'])",
  "[role='spinbutton']:not([aria-disabled='true'])",
  "[role='textbox']:not([aria-disabled='true'])",
  "[role='searchbox']:not([aria-disabled='true'])",
  "[contenteditable='true']:not([aria-disabled='true'])",
  "[tabindex]:not([tabindex='-1']):not([aria-disabled='true'])",
].join(",");

async function operableControlNames(page) {
  return page.evaluate((selector) => {
    const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const isVisible = (node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const nameFor = (node) => {
      const ariaLabel = normalize(node.getAttribute("aria-label"));
      if (ariaLabel) return ariaLabel;
      const labelledBy = normalize((node.getAttribute("aria-labelledby") || "").split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent || "").join(" "));
      if (labelledBy) return labelledBy;
      if (node instanceof HTMLInputElement && node.labels) {
        const labels = normalize(Array.from(node.labels, (label) => label.textContent || "").join(" "));
        if (labels) return labels;
      }
      const alt = normalize(node.getAttribute("alt"));
      if (alt) return alt;
      const text = normalize(node.textContent);
      if (text) return text;
      const value = normalize(node.getAttribute("value"));
      if (value) return value;
      return normalize(node.getAttribute("title"));
    };
    return Array.from(document.querySelectorAll(selector))
      .filter(isVisible)
      .map((node) => ({
        tag: node.tagName.toLowerCase(),
        role: node.getAttribute("role") || "",
        name: nameFor(node),
        testId: node.getAttribute("data-domain-next-evidence-action") === "" ? "domain-next-evidence-action" : "",
      }));
  }, OPERABLE_CONTROL_SELECTOR);
}

async function assertOperableControlNames(page, context) {
  const controls = await operableControlNames(page);
  const unnamed = controls.filter((control) => !control.name);
  assert(controls.length > 0, "runtime surface has no visible operable controls", { context, controls });
  assert(unnamed.length === 0, "visible operable control has an empty accessible name", { context, unnamed, controls });
  return controls;
}

function routeRegistry() {
  const source = fs.readFileSync(routeRegistryFile, "utf8");
  const list = source.match(/export const PANEL_ROUTE_IDS = \[([\s\S]*?)\] as const;/);
  if (!list) throw new Error(`PANEL_ROUTE_IDS not found in ${routeRegistryFile}`);
  const ids = Array.from(list[1].matchAll(/"([^"]+)"/g), (match) => match[1]);
  assert(ids.length > 0 && new Set(ids).size === ids.length, "route registry is empty or has duplicate ids", { ids });
  return ids;
}

async function inspectNarrowViewportReflow() {
  // This is deliberately a layout capability, not a text-scale or browser-zoom claim.
  const narrowViewport = { width: 195, height: 422 };
  const runtime = await launchRuntime({ viewport: narrowViewport, screen: narrowViewport, deviceScaleFactor: 2 });
  try {
    await login(runtime.page, runtime.mock.url);
    const routes = ["overview", "interfaces", "logs"];
    const evidence = [];
    for (const route of routes) {
      await visitRoute(runtime.page, runtime.mock.url, route, { requireWorkspace: route !== "overview" });
      evidence.push(await runtime.page.evaluate((expectedRoute) => ({
        route: document.querySelector("[data-panel-app]")?.getAttribute("data-active-section") || "",
        expectedRoute,
        cssViewport: [window.innerWidth, window.innerHeight],
        devicePixelRatio: window.devicePixelRatio,
        layoutOverflow: document.documentElement.scrollWidth - window.innerWidth,
        visibleControls: Array.from(document.querySelectorAll("button, a[href], input, select")).filter((node) => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
        }).length,
      }), route));
    }
    const report = {
      mechanism: "narrow CSS viewport reflow fixture",
      assertionBoundary: "This verifies 195 CSS-pixel layout reflow only; it does not assert browser zoom, OS text size, or 200% text resizing.",
      cssViewport: narrowViewport,
      deviceScaleFactor: 2,
      routes: evidence,
    };
    assert(evidence.every((item) => item.cssViewport[0] === narrowViewport.width), "narrow reflow fixture did not apply its CSS viewport", report);
    assert(evidence.every((item) => item.route === item.expectedRoute), "narrow reflow left a primary route unreachable", report);
    assert(evidence.every((item) => item.layoutOverflow <= 1), "narrow reflow introduced horizontal layout overflow", report);
    assert(evidence.every((item) => item.visibleControls > 0), "narrow reflow left a route without reachable controls", report);
    return report;
  } finally {
    await closeRuntime(runtime);
  }
}

async function inspectReducedMotionWithRuntime(runtime) {
    const routes = ["overview", "interfaces"];
    const evidence = [];
    for (const route of routes) {
      await visitRoute(runtime.page, runtime.mock.url, route, { requireWorkspace: route === "interfaces" });
      evidence.push(await runtime.page.evaluate((activeRoute) => {
      const animations = document.getAnimations({ subtree: true });
      const motionProperties = new Set(["transform", "translate", "left", "right", "top", "bottom", "inset", "insetBlock", "insetInline"]);
      const activeMotion = animations.filter((animation) => {
        if (animation.playState !== "running") return false;
        const frames = animation.effect?.getKeyframes?.() || [];
        return frames.some((frame) => Object.keys(frame).some((property) => motionProperties.has(property)));
      }).map((animation) => ({
        type: animation.constructor?.name || "Animation",
        target: animation.effect?.target instanceof Element ? animation.effect.target.tagName : "",
      }));
      const durationMs = (value) => String(value || "0s").split(",").map((part) => {
        const text = part.trim();
        if (text.endsWith("ms")) return Number.parseFloat(text) || 0;
        if (text.endsWith("s")) return (Number.parseFloat(text) || 0) * 1000;
        return Number.parseFloat(text) || 0;
      });
      const selector = activeRoute === "interfaces"
        ? '[data-mobile-domain-workspace="interfaces"], [data-mobile-domain-workspace="interfaces"] [data-mobile-row-id], [data-section="interfaces"]'
        : '[data-optical-patrol-root], [data-mobile-overview]';
      const surfaces = Array.from(document.querySelectorAll(selector)).slice(0, 3).map((node) => {
        const style = getComputedStyle(node);
        return {
          selector: node.matches('[data-mobile-domain-workspace]') ? "workspace" : node.matches('[data-mobile-row-id]') ? "row" : "task-nav",
          transitionProperty: style.transitionProperty,
          transitionDurationsMs: durationMs(style.transitionDuration),
          animationName: style.animationName,
          animationDurationsMs: durationMs(style.animationDuration),
        };
      });
      return {
        mediaMatches: matchMedia("(prefers-reduced-motion: reduce)").matches,
        noPreferenceMatches: matchMedia("(prefers-reduced-motion: no-preference)").matches,
        animationCount: animations.length,
        activeMotion,
        surfaces,
        route: document.querySelector("[data-panel-app]")?.getAttribute("data-active-section") || "",
        expectedRoute: activeRoute,
      };
      }, route));
    }
    for (const routeEvidence of evidence) {
      assert(routeEvidence.mediaMatches && !routeEvidence.noPreferenceMatches, "reduced-motion runtime media query did not match", routeEvidence);
      assert(routeEvidence.route === routeEvidence.expectedRoute, "reduced-motion runtime probe did not render the expected route", routeEvidence);
      assert(routeEvidence.surfaces.length >= 1, "reduced-motion probe could not find an interactive surface", routeEvidence);
      assert(routeEvidence.activeMotion.length === 0, "reduced-motion leaves a transform/position animation running", routeEvidence);
      assert(routeEvidence.surfaces.every((surface) => (
      surface.transitionDurationsMs.every((duration) => duration <= 20) &&
      surface.animationDurationsMs.every((duration) => duration <= 20)
      )), "reduced-motion owner did not reduce key interactive surface durations to <=20ms", routeEvidence);
    }
    return evidence;
}

const TEXT_RESIZE_SELECTOR = [
  "h1", "h2", "h3", "h4", "p", "small", "b", "strong", "em", "dt", "dd", "label", "button", "summary", "span", "time", "code", "a", "input", "select",
].join(",");
const LANDMARK_SELECTOR = "main, [role='main'], nav, [role='navigation'], header[role='banner'], [role='banner'], footer[role='contentinfo'], [role='contentinfo']";
const MAX_LANDMARKS = 16;
const MAX_FOCUS_STEPS = 24;
const REQUIRED_FOCUS_STEPS = 4;

async function resetNativePageScale(cdp) {
  try {
    await cdp.send("Emulation.resetPageScaleFactor");
  } catch {
    // Older Chromium builds omit the reset command; a scale factor of 1 is equivalent.
    try { await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 }); } catch { /* unavailable */ }
  }
}

async function applyAuditableTextResize(page, rootSelector, percent = 200) {
  return page.evaluate(({ selector, value, textSelector }) => {
    const root = document.querySelector(selector);
    if (!(root instanceof HTMLElement)) throw new Error(`text-resize root missing: ${selector}`);
    const factor = value / 100;
    const visible = (node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    // Measure every node before mutating any ancestor. Reading descendants
    // after their parent has already doubled would compound inherited sizes
    // and turn a 200% fixture into 400% or 800% text.
    const measurements = Array.from(root.querySelectorAll(textSelector))
      .filter((node) => node instanceof HTMLElement && visible(node) && !node.dataset.a11yTextResizeBase)
      .map((node) => {
      const style = getComputedStyle(node);
      const fontSize = Number.parseFloat(style.fontSize);
      const lineHeight = Number.parseFloat(style.lineHeight);
        return { node, fontSize, lineHeight };
      })
      .filter(({ fontSize }) => Number.isFinite(fontSize) && fontSize > 0);
    const samples = measurements.slice(0, 8).map(({ node, fontSize }) => ({
      tag: node.tagName.toLowerCase(),
      text: (node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 48),
      before: fontSize,
    }));
    for (const { node, fontSize, lineHeight } of measurements) {
      node.dataset.a11yTextResizeBase = String(fontSize);
      node.style.setProperty("font-size", `${fontSize * factor}px`, "important");
      if (Number.isFinite(lineHeight) && lineHeight > 0) {
        node.style.setProperty("line-height", `${lineHeight * factor}px`, "important");
      }
    }
    root.dataset.a11yTextResize = String(value);
    root.dataset.a11yTextResizeFixture = "user-text-resize";
    return {
      rootSelector: selector,
      percent: value,
      adjustedTextNodes: root.querySelectorAll("[data-a11y-text-resize-base]").length,
      samples,
    };
  }, { selector: rootSelector, value: percent, textSelector: TEXT_RESIZE_SELECTOR });
}

async function captureTextBaseline(page, rootSelector) {
  return page.evaluate(({ selector, textSelector }) => {
    const root = document.querySelector(selector);
    if (!(root instanceof HTMLElement)) throw new Error(`text baseline root missing: ${selector}`);
    const visible = (node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const isIntentionalAssistiveOnlyText = (node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      const hasAssistiveSemantics = node.matches('[aria-live], [role="status"], [role="alert"], [role="log"], [role="timer"], .op__sr-only, [data-visually-hidden="true"]');
      const isTinyPositionedBox = (style.position === "absolute" || style.position === "fixed") && rect.width <= 2 && rect.height <= 2;
      const clipsEntireBox = (style.clip && style.clip !== "auto") || (style.clipPath && style.clipPath !== "none");
      const clipsOverflow = style.overflowX !== "visible" && style.overflowY !== "visible";
      return hasAssistiveSemantics && isTinyPositionedBox && clipsEntireBox && clipsOverflow;
    };
    const sampleNodes = Array.from(root.querySelectorAll(textSelector)).filter((node) => (
      node instanceof HTMLElement && visible(node) && !isIntentionalAssistiveOnlyText(node)
    )).slice(0, 12);
    const sampleOccurrences = new Map();
    const samples = sampleNodes.map((node) => {
      const key = `${node.tagName.toLowerCase()}:${(node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 48)}`;
      const occurrence = sampleOccurrences.get(key) || 0;
      sampleOccurrences.set(key, occurrence + 1);
      return {
        key,
        occurrence,
        fontSize: Number.parseFloat(getComputedStyle(node).fontSize),
      };
    });
    const title = root.querySelector("[data-panel-route-title], h1, h2");
    return { samples, title: title ? Number.parseFloat(getComputedStyle(title).fontSize) : 0 };
  }, { selector: rootSelector, textSelector: TEXT_RESIZE_SELECTOR });
}

async function inspectTextResizeSurface(page, { label, rootSelector, expectedViewport, mode, nativeScale = 1, nativeBaseline = null }) {
  const evidence = await page.evaluate(({ labelValue, selector, viewport, resizeMode, scale, nativeBaseline: baseline }) => {
    const root = document.querySelector(selector);
    if (!(root instanceof HTMLElement)) throw new Error(`text-resize evidence root missing: ${selector}`);
    const isVisible = (node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const isIntentionalAssistiveOnlyText = (node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      const hasAssistiveSemantics = node.matches('[aria-live], [role="status"], [role="alert"], [role="log"], [role="timer"], .op__sr-only, [data-visually-hidden="true"]');
      const isTinyPositionedBox = (style.position === "absolute" || style.position === "fixed") && rect.width <= 2 && rect.height <= 2;
      const clipsEntireBox = (style.clip && style.clip !== "auto") || (style.clipPath && style.clipPath !== "none");
      const clipsOverflow = style.overflowX !== "visible" && style.overflowY !== "visible";
      return hasAssistiveSemantics && isTinyPositionedBox && clipsEntireBox && clipsOverflow;
    };
    const isVisuallyInspectableText = (node) => isVisible(node) && !isIntentionalAssistiveOnlyText(node);
    const textClipEvidence = (node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      const clippedWithinSelf = (node.scrollWidth > node.clientWidth + 1 && style.overflowX !== "visible") ||
        (node.scrollHeight > node.clientHeight + 1 && style.overflowY !== "visible");
      const outsideViewport = rect.left < -1 || rect.right > innerWidth + 1;
      let clippedByAncestor = false;
      let clippingAncestor = "";
      let scrollReachableByAncestor = false;
      let scrollAncestor = "";
      for (let ancestor = node.parentElement; ancestor; ancestor = ancestor.parentElement) {
        const ancestorStyle = getComputedStyle(ancestor);
        const ancestorRect = ancestor.getBoundingClientRect();
        const clipsX = ["auto", "clip", "hidden", "scroll"].includes(ancestorStyle.overflowX);
        const clipsY = ["auto", "clip", "hidden", "scroll"].includes(ancestorStyle.overflowY);
        const beyondX = rect.left < ancestorRect.left - 1 || rect.right > ancestorRect.right + 1;
        const beyondY = rect.top < ancestorRect.top - 1 || rect.bottom > ancestorRect.bottom + 1;
        const scrollableX = ["auto", "scroll"].includes(ancestorStyle.overflowX) && ancestor.scrollWidth > ancestor.clientWidth + 1;
        const scrollableY = ["auto", "scroll"].includes(ancestorStyle.overflowY) && ancestor.scrollHeight > ancestor.clientHeight + 1;
        if ((beyondX && scrollableX) || (beyondY && scrollableY)) {
          scrollReachableByAncestor = true;
          scrollAncestor ||= ancestor.className || ancestor.tagName.toLowerCase();
          if ((!beyondX || scrollableX) && (!beyondY || scrollableY)) {
            if (ancestor === root) break;
            continue;
          }
        }
        if ((clipsX && beyondX) || (clipsY && beyondY)) {
          clippedByAncestor = true;
          clippingAncestor = ancestor.className || ancestor.tagName.toLowerCase();
          break;
        }
        if (ancestor === root) break;
      }
      return {
        clipped: clippedWithinSelf || outsideViewport || clippedByAncestor,
        clippedWithinSelf,
        outsideViewport,
        clippedByAncestor,
        clippingAncestor,
        scrollReachableByAncestor,
        scrollAncestor,
      };
    };
    const hasClippedText = (node) => textClipEvidence(node).clipped;

    // Keep every classifier branch honest: assistive-only content is excluded,
    // while self, ancestor, and viewport clipping each have a positive fixture.
    const assistiveFixture = document.createElement("span");
    assistiveFixture.setAttribute("role", "status");
    assistiveFixture.setAttribute("aria-live", "polite");
    assistiveFixture.textContent = "assistive-only classification fixture";
    assistiveFixture.style.cssText = "position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap";
    const visibleClippingFixture = document.createElement("span");
    visibleClippingFixture.textContent = "visible clipping classification fixture";
    visibleClippingFixture.style.cssText = "position:absolute;left:0;top:0;width:20px;height:20px;overflow:hidden;white-space:nowrap;font-size:16px";
    const ancestorClippingFixture = document.createElement("div");
    ancestorClippingFixture.style.cssText = "position:absolute;left:0;top:24px;width:20px;height:20px;overflow:hidden;white-space:nowrap;font-size:16px";
    const ancestorClippedText = document.createElement("span");
    ancestorClippedText.textContent = "ancestor clipping classification fixture";
    ancestorClippingFixture.append(ancestorClippedText);
    const viewportClippingFixture = document.createElement("span");
    viewportClippingFixture.textContent = "viewport clipping classification fixture";
    viewportClippingFixture.style.cssText = "position:fixed;left:calc(100vw + 8px);top:0;white-space:nowrap;font-size:16px";
    document.body.append(assistiveFixture, visibleClippingFixture, ancestorClippingFixture, viewportClippingFixture);
    const ancestorClip = textClipEvidence(ancestorClippedText);
    const viewportClip = textClipEvidence(viewportClippingFixture);
    const textVisibilityClassifierProbe = {
      assistiveOnlyDetected: isIntentionalAssistiveOnlyText(assistiveFixture),
      assistiveOnlyExcludedFromVisualInspection: !isVisuallyInspectableText(assistiveFixture),
      visibleTextRemainsInspectable: isVisuallyInspectableText(visibleClippingFixture),
      visibleClippingDetected: hasClippedText(visibleClippingFixture),
      ancestorClippingDetected: ancestorClip.clippedByAncestor,
      viewportClippingDetected: viewportClip.outsideViewport,
    };
    assistiveFixture.remove();
    visibleClippingFixture.remove();
    ancestorClippingFixture.remove();
    viewportClippingFixture.remove();
    const controls = Array.from(root.querySelectorAll("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), summary, [tabindex]:not([tabindex='-1'])"))
      .filter(isVisible)
      .map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          tag: node.tagName.toLowerCase(),
          label: (node.getAttribute("aria-label") || node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
          width: Math.round(rect.width * 10) / 10,
          height: Math.round(rect.height * 10) / 10,
          tabIndex: Number(node.getAttribute("tabindex") || 0),
        };
      });
    const resizedNodes = Array.from(root.querySelectorAll("[data-a11y-text-resize-base]")).slice(0, 8);
    const liveTextNodes = Array.from(root.querySelectorAll("h1,h2,h3,h4,p,small,b,strong,em,dt,dd,label,button,summary,span,time,code,a,input,select"))
      .filter((node) => node instanceof HTMLElement && isVisuallyInspectableText(node)).slice(0, 8);
    const textSamples = (resizeMode === "css-text-resize-fixture" ? resizedNodes : liveTextNodes).map((node, index) => {
      const key = `${node.tagName.toLowerCase()}:${(node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 48)}`;
      const occurrence = liveTextNodes.slice(0, index).filter((candidate) => (
        `${candidate.tagName.toLowerCase()}:${(candidate.textContent || "").replace(/\s+/g, " ").trim().slice(0, 48)}` === key
      )).length;
      const baselineSample = baseline?.samples?.find?.((sample) => sample?.key === key && Number(sample?.occurrence || 0) === occurrence) || baseline?.samples?.[index];
      const before = resizeMode === "css-text-resize-fixture"
        ? Number(node.getAttribute("data-a11y-text-resize-base"))
        : Number(typeof baselineSample === "object" ? baselineSample.fontSize : baselineSample || 0);
      const after = Number.parseFloat(getComputedStyle(node).fontSize);
      const renderedScale = resizeMode === "browser-page-scale"
        ? (window.visualViewport?.scale || 1)
        : resizeMode === "rendered-scale-reflow-fixture"
          ? window.devicePixelRatio
          : 1;
      const effectiveRatio = before ? (after * renderedScale) / before : 0;
      return { before, after, effectiveRatio, text: (node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 48), occurrence };
    });
    const title = root.querySelector("[data-panel-route-title], h1, h2");
    const titleBefore = resizeMode === "css-text-resize-fixture"
      ? Number(title?.getAttribute("data-a11y-text-resize-base"))
      : Number(baseline?.title || 0);
    const titleAfter = title ? Number.parseFloat(getComputedStyle(title).fontSize) : 0;
    const titleRenderedScale = resizeMode === "browser-page-scale"
      ? (window.visualViewport?.scale || 1)
      : resizeMode === "rendered-scale-reflow-fixture"
        ? window.devicePixelRatio
        : 1;
    const titleEffectiveRatio = titleBefore ? (titleAfter * titleRenderedScale) / titleBefore : null;
    const visualViewport = window.visualViewport;
    const taskNavigation = root.querySelector(".panel-task-navigation");
    const focusedRouteTitle = title instanceof HTMLElement ? (() => {
      const style = getComputedStyle(title);
      const rect = title.getBoundingClientRect();
      const navigationRect = taskNavigation?.getBoundingClientRect() || null;
      const outlineWidth = Number.parseFloat(style.outlineWidth || "0") || 0;
      const outlineOffset = Number.parseFloat(style.outlineOffset || "0") || 0;
      const outlineExtent = style.outlineStyle === "none" ? 0 : Math.max(0, outlineWidth + outlineOffset);
      const visualRect = {
        left: rect.left - outlineExtent,
        top: rect.top - outlineExtent,
        right: rect.right + outlineExtent,
        bottom: rect.bottom + outlineExtent,
        width: rect.width + outlineExtent * 2,
        height: rect.height + outlineExtent * 2,
      };
      const overlapsTaskNavigation = navigationRect ? !(
        visualRect.right <= navigationRect.left ||
        visualRect.left >= navigationRect.right ||
        visualRect.bottom <= navigationRect.top ||
        visualRect.top >= navigationRect.bottom
      ) : false;
      const scrollAncestors = [];
      for (let ancestor = title.parentElement; ancestor; ancestor = ancestor.parentElement) {
        const ancestorStyle = getComputedStyle(ancestor);
        if (!/(auto|scroll)/.test(ancestorStyle.overflowY)) continue;
        const ancestorRect = ancestor.getBoundingClientRect();
        scrollAncestors.push({
          className: ancestor.className || "",
          rect: { top: ancestorRect.top, bottom: ancestorRect.bottom, height: ancestorRect.height },
          scrollTop: ancestor.scrollTop,
          scrollHeight: ancestor.scrollHeight,
          clientHeight: ancestor.clientHeight,
        });
      }
      return {
        focused: document.activeElement === title,
        focusVisible: title.matches(":focus-visible"),
        rect: visualRect,
        navigationRect: navigationRect ? {
          left: navigationRect.left,
          top: navigationRect.top,
          right: navigationRect.right,
          bottom: navigationRect.bottom,
          width: navigationRect.width,
          height: navigationRect.height,
        } : null,
        fullyInsideViewport: visualRect.left >= -1 && visualRect.top >= -1 && visualRect.right <= innerWidth + 1 && visualRect.bottom <= innerHeight + 1,
        overlapsTaskNavigation,
        outline: { width: outlineWidth, offset: outlineOffset, style: style.outlineStyle },
        scrollAncestors,
      };
    })() : null;
    const clippedText = Array.from(root.querySelectorAll("h1,h2,h3,h4,p,small,b,strong,em,dt,dd,label,button,summary,span,time,code,a"))
      .filter((node) => node instanceof HTMLElement && !node.closest('[aria-hidden="true"]') && isVisuallyInspectableText(node) && (node.textContent || "").replace(/\s+/g, " ").trim())
      .filter(hasClippedText)
      .map((node) => ({
        tag: node.tagName.toLowerCase(),
        text: (node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120),
        className: typeof node.className === "string" ? node.className : "",
        client: [node.clientWidth, node.clientHeight],
        scroll: [node.scrollWidth, node.scrollHeight],
        clipping: textClipEvidence(node),
      }));
    return {
      label: labelValue,
      mode: resizeMode,
      rootSelector: selector,
      cssViewport: [window.innerWidth, window.innerHeight],
      expectedViewport: viewport,
      visualViewport: visualViewport ? { width: visualViewport.width, height: visualViewport.height, scale: visualViewport.scale } : null,
      devicePixelRatio: window.devicePixelRatio,
      screen: { width: window.screen.width, height: window.screen.height },
      requestedNativeScale: scale,
      largeTextMode: root.getAttribute("data-panel-large-text"),
      pageScrollY: window.scrollY,
      layoutOverflow: document.documentElement.scrollWidth - window.innerWidth,
      textSamples,
      title: { before: titleBefore || null, after: titleAfter || null, effectiveRatio: titleEffectiveRatio },
      focusedRouteTitle,
      controls,
      sub44CssControls: controls.filter((control) => control.width < 44 || control.height < 44),
      positiveTabIndexes: controls.filter((control) => control.tabIndex > 0),
      clippedText,
      textVisibilityClassifierProbe,
    };
  }, { labelValue: label, selector: rootSelector, viewport: [expectedViewport.width, expectedViewport.height], resizeMode: mode, scale: nativeScale, nativeBaseline });
  assert(evidence.cssViewport[0] === expectedViewport.width && evidence.cssViewport[1] === expectedViewport.height, "text-resize changed the CSS layout viewport", evidence);
  assert(evidence.layoutOverflow <= 1, "text-resize introduced horizontal layout overflow", evidence);
  assert(evidence.textVisibilityClassifierProbe.assistiveOnlyDetected && evidence.textVisibilityClassifierProbe.assistiveOnlyExcludedFromVisualInspection, "assistive-only live-region fixture was misclassified as visible text", evidence);
  assert(evidence.textVisibilityClassifierProbe.visibleTextRemainsInspectable && evidence.textVisibilityClassifierProbe.visibleClippingDetected, "visible clipping fixture no longer exercises the blocking path", evidence);
  assert(evidence.textVisibilityClassifierProbe.ancestorClippingDetected, "ancestor clipping fixture no longer exercises the blocking path", evidence);
  assert(evidence.textVisibilityClassifierProbe.viewportClippingDetected, "viewport clipping fixture no longer exercises the blocking path", evidence);
  assert(evidence.clippedText.length === 0, "text-resize clipped visible text within itself, an ancestor, or the viewport", evidence);
  if (mode === "css-text-resize-fixture" && label === "optical-patrol-phone-320") {
    assert(evidence.focusedRouteTitle?.focused === true, "320px 200% text resize lost programmatic route-title focus", evidence);
    assert(evidence.focusedRouteTitle?.focusVisible === true, "320px 200% text resize hid the route-title focus indicator", evidence);
    assert(evidence.focusedRouteTitle?.fullyInsideViewport === true, "320px 200% text resize left the focused route title outside the viewport", evidence);
    assert(evidence.focusedRouteTitle?.overlapsTaskNavigation === false, "320px 200% text resize obscured the focused route title behind task navigation", evidence);
    assert(evidence.pageScrollY <= 1, "320px 200% route-title focus scrolled the persistent runtime chrome off screen", evidence);
  }
  assert(evidence.controls.length > 0, "text-resize left a surface without reachable controls", evidence);
  if (mode !== "rendered-scale-reflow-fixture") {
    assert(evidence.controls.every((control) => control.width >= 44 && control.height >= 44), "text-resize reduced a control below 44x44px", evidence);
  }
  assert(evidence.positiveTabIndexes.length === 0, "text-resize surface has a positive tabindex focus-order override", evidence);
  if (mode === "css-text-resize-fixture") {
    assert(evidence.textSamples.length >= 1, "text-resize fixture did not adjust measurable text", evidence);
    assert(evidence.textSamples.every((sample) => sample.effectiveRatio >= 1.9 && sample.effectiveRatio <= 2.1), "text-resize fixture did not produce approximately 200% computed text", evidence);
    assert(evidence.title.effectiveRatio !== null && evidence.title.effectiveRatio >= 1.9 && evidence.title.effectiveRatio <= 2.1, "text-resize fixture did not double the route title", evidence);
  } else if (mode === "browser-page-scale") {
    assert(evidence.visualViewport && evidence.visualViewport.scale >= 1.9 && evidence.visualViewport.scale <= 2.1, "CDP native page scale did not produce a 2x visual viewport", evidence);
    assert(evidence.textSamples.length >= 1 && evidence.textSamples.every((sample) => sample.effectiveRatio >= 1.9 && sample.effectiveRatio <= 2.1), "native page scale did not produce approximately 200% rendered text", evidence);
    assert(evidence.title.effectiveRatio !== null && evidence.title.effectiveRatio >= 1.9 && evidence.title.effectiveRatio <= 2.1, "native page scale did not double the rendered route title", evidence);
  } else if (mode === "rendered-scale-reflow-fixture") {
    assert(Math.abs(evidence.devicePixelRatio - 2) <= 0.1, "rendered-scale fixture did not expose a 2x rendered pixel ratio", evidence);
    assert(evidence.visualViewport && Math.abs(evidence.visualViewport.scale - 1) <= 0.1, "rendered-scale fixture unexpectedly used page scale instead of narrowed-layout pressure", evidence);
    assert(evidence.textSamples.length >= 1 && evidence.textSamples.every((sample) => sample.effectiveRatio >= 1.9 && sample.effectiveRatio <= 2.1), "rendered-scale fixture did not expose approximately 2x rendered text", evidence);
    assert(evidence.title.effectiveRatio !== null && evidence.title.effectiveRatio >= 1.9 && evidence.title.effectiveRatio <= 2.1, "rendered-scale fixture did not expose the route title at approximately 2x rendered scale", evidence);
  }
  return evidence;
}

async function inspectLandmarks(page, rootSelector, label) {
  const evidence = await page.evaluate(({ selector, landmarkSelector, maxLandmarks, labelValue }) => {
    const root = document.querySelector(selector);
    if (!(root instanceof HTMLElement)) throw new Error(`landmark root missing: ${selector}`);
    const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const isVisible = (node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const landmarkName = (node) => {
      const ariaLabel = normalize(node.getAttribute("aria-label"));
      if (ariaLabel) return ariaLabel;
      const labelledBy = (node.getAttribute("aria-labelledby") || "").split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent || "").join(" ");
      return normalize(labelledBy);
    };
    const candidates = Array.from(document.querySelectorAll(landmarkSelector)).filter(isVisible);
    const landmarks = candidates.slice(0, maxLandmarks).map((node) => ({
      tag: node.tagName.toLowerCase(),
      role: node.getAttribute("role") || (node.tagName.toLowerCase() === "main" ? "main" : node.tagName.toLowerCase() === "nav" ? "navigation" : ""),
      name: landmarkName(node),
      containsRoot: node.contains(root),
      withinRoot: root.contains(node),
    }));
    const mains = landmarks.filter((landmark) => landmark.role === "main");
    const navigations = landmarks.filter((landmark) => landmark.role === "navigation");
    const heading = Array.from(root.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading']"))
      .find((node) => isVisible(node) && normalize(node.textContent));
    return {
      label: labelValue,
      rootSelector: selector,
      totalVisibleLandmarks: candidates.length,
      maxLandmarks,
      landmarks,
      mains,
      navigations,
      rootHeading: heading ? normalize(heading.textContent) : "",
    };
  }, { selector: rootSelector, landmarkSelector: LANDMARK_SELECTOR, maxLandmarks: MAX_LANDMARKS, labelValue: label });
  assert(evidence.totalVisibleLandmarks <= MAX_LANDMARKS, "text-resize landmark check exceeded its bounded inventory", evidence);
  assert(evidence.mains.length === 1 && (evidence.mains[0].containsRoot || evidence.mains[0].withinRoot), "text-resize surface is not associated with one visible main landmark", evidence);
  assert(evidence.navigations.every((landmark) => landmark.name), "text-resize surface has an unnamed visible navigation landmark", evidence);
  const navigationNames = evidence.navigations.map((landmark) => landmark.name);
  assert(new Set(navigationNames).size === navigationNames.length, "text-resize surface has duplicate visible navigation landmark names", evidence);
  assert(evidence.rootHeading, "text-resize surface has no visible named heading", evidence);
  return evidence;
}

async function inspectKeyboardReachability(page, rootSelector, label) {
  const rootInventory = await page.evaluate(({ selector, requiredFocusSteps }) => {
    const root = document.querySelector(selector);
    if (!(root instanceof HTMLElement)) throw new Error(`keyboard root missing: ${selector}`);
    const visible = (node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const controls = Array.from(root.querySelectorAll("button:not([disabled]):not([tabindex='-1']), a[href]:not([tabindex='-1']), input:not([type='hidden']):not([disabled]):not([tabindex='-1']), select:not([disabled]):not([tabindex='-1']), textarea:not([disabled]):not([tabindex='-1']), summary:not([tabindex='-1']), [tabindex]:not([tabindex='-1'])"))
      .filter(visible);
    if (controls[0] instanceof HTMLElement) controls[0].focus();
    return controls.slice(0, requiredFocusSteps).length;
  }, { selector: rootSelector, requiredFocusSteps: REQUIRED_FOCUS_STEPS });
  if (rootInventory > 0) {
    // Re-enter the first in-surface control through keyboard navigation so the
    // browser's :focus-visible heuristic is exercised rather than inferred from
    // a programmatic focus call.
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
  }
  const traversal = [];
  for (let index = 0; index < MAX_FOCUS_STEPS && traversal.length < Math.min(REQUIRED_FOCUS_STEPS, rootInventory); index += 1) {
    if (index > 0) await page.keyboard.press("Tab");
    const step = await page.evaluate((selector) => {
      const root = document.querySelector(selector);
      const active = document.activeElement;
      const rect = active instanceof HTMLElement ? active.getBoundingClientRect() : null;
      const style = active instanceof HTMLElement ? getComputedStyle(active) : null;
      return {
        tag: active?.tagName || "",
        label: (active?.getAttribute?.("aria-label") || active?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
        visible: Boolean(rect && style && style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0),
        // Long 200% text controls may be taller than the viewport. They remain
        // keyboard-reachable when the focused control intersects the viewport
        // and stays within its horizontal bounds; requiring the entire control
        // to fit would reject valid reflow instead of catching a lost focus.
        focusReachable: Boolean(rect && rect.bottom > 0 && rect.top < window.innerHeight && rect.left >= -1 && rect.right <= window.innerWidth + 1),
        rect: rect ? { left: Math.round(rect.left), top: Math.round(rect.top), right: Math.round(rect.right), bottom: Math.round(rect.bottom) } : null,
        focusVisible: active instanceof Element && active.matches(":focus-visible"),
        insideRoot: active instanceof Node && root instanceof HTMLElement && root.contains(active),
      };
    }, rootSelector);
    // Chromium returns focus to body after the last document control. That is a
    // normal end-of-order boundary, not an invisible interactive target.
    if (step.tag === "BODY") break;
    if (step.insideRoot) traversal.push(step);
  }
  const requiredSteps = Math.min(REQUIRED_FOCUS_STEPS, rootInventory);
  const evidence = { label, rootSelector, maxFocusSteps: MAX_FOCUS_STEPS, rootInventory, requiredSteps, traversal, unreachableFocusSteps: traversal.filter((step) => !step.focusReachable) };
  assert(rootInventory > 0, "text-resize surface has no focusable controls in its tested root", evidence);
  assert(traversal.length >= requiredSteps, "text-resize keyboard traversal did not reach enough in-surface focusable controls within its bounded search", evidence);
  assert(traversal.every((step) => step.visible && step.focusVisible), "text-resize keyboard traversal reached an invisible or unfocused control", evidence);
  assert(evidence.unreachableFocusSteps.length === 0, "text-resize keyboard traversal reached a focus target outside the visible viewport", evidence);
  assert(new Set(traversal.map((step) => `${step.tag}:${step.label}`)).size >= requiredSteps, "text-resize keyboard traversal did not advance through a usable in-surface focus order", evidence);
  return evidence;
}

async function inspectResizedControlReachability(page, rootSelector, label) {
  const maxControls = 48;
  const evidence = await page.evaluate(({ selector, limit, labelValue }) => {
    const root = document.querySelector(selector);
    if (!(root instanceof HTMLElement)) throw new Error(`control reachability root missing: ${selector}`);
    const visible = (node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const allControls = Array.from(root.querySelectorAll("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), summary, [tabindex]:not([tabindex='-1'])"))
      .filter((node) => node instanceof HTMLElement && visible(node));
    const controls = allControls.slice(0, limit);
    const rows = controls.map((node) => {
      node.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
      const rect = node.getBoundingClientRect();
      const navigation = document.querySelector(".panel-task-navigation");
      const navRect = navigation instanceof HTMLElement && visible(navigation) ? navigation.getBoundingClientRect() : null;
      const belongsToNavigation = navigation instanceof HTMLElement && navigation.contains(node);
      const overlapsNavigation = Boolean(navRect && !belongsToNavigation && rect.left < navRect.right - 1 && rect.right > navRect.left + 1 && rect.top < navRect.bottom - 1 && rect.bottom > navRect.top + 1);
      const visibleLeft = Math.max(0, rect.left);
      const visibleRight = Math.min(innerWidth, rect.right);
      const visibleTop = Math.max(0, rect.top);
      const visibleBottom = Math.min(innerHeight, rect.bottom);
      const point = visibleRight > visibleLeft && visibleBottom > visibleTop
        ? { x: (visibleLeft + visibleRight) / 2, y: (visibleTop + visibleBottom) / 2 }
        : null;
      const hit = point ? document.elementFromPoint(point.x, point.y) : null;
      return {
        tag: node.tagName.toLowerCase(),
        label: (node.getAttribute("aria-label") || node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 100),
        rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
        belongsToNavigation,
        overlapsNavigation,
        intersectsViewport: visibleRight > visibleLeft && visibleBottom > visibleTop,
        hitOwned: Boolean(hit && (hit === node || node.contains(hit))),
      };
    });
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    return { label: labelValue, rootSelector: selector, totalControls: allControls.length, maxControls: limit, rows };
  }, { selector: rootSelector, limit: maxControls, labelValue: label });
  assert(evidence.totalControls <= evidence.maxControls, "text-resize control reachability exceeded its bounded inventory", evidence);
  assert(evidence.rows.every((row) => row.intersectsViewport), "text-resize left an interactive control unreachable by scrolling", evidence);
  assert(evidence.rows.every((row) => !row.overlapsNavigation), "text-resize left an interactive control under fixed task navigation", evidence);
  assert(evidence.rows.every((row) => row.hitOwned), "text-resize interactive control failed center-point hit testing", evidence);
  return evidence;
}

async function inspectTextResize(modeRequested = requestedMode, afterInspection = null) {
  const runtime = await launchRuntime();
  let cdp = null;
  try {
    await login(runtime.page, runtime.mock.url);
    cdp = await runtime.context.newCDPSession(runtime.page);
    const page = runtime.page;
    const phone320Viewport = { width: 320, height: 568 };
    const phoneViewport = { width: 390, height: 844 };
    const phone430Viewport = { width: 430, height: 932 };
    const shortLandscapeViewport = { width: 667, height: 375 };
    const tabletViewport = { width: 768, height: 1024 };

    await page.setViewportSize(phoneViewport);
    await visitRoute(page, runtime.mock.url, "overview", { requireWorkspace: false });
    const nativeProbe = await (async () => {
      try {
        await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 });
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        return await page.evaluate(() => ({ scale: window.visualViewport?.scale || 1, cssViewport: [window.innerWidth, window.innerHeight] }));
      } catch (error) {
        return { scale: 1, error: String(error?.message || error), cssViewport: [0, 0] };
      } finally {
        await resetNativePageScale(cdp);
      }
    })();
    const nativePageScaleAvailable = nativeProbe.scale >= 1.9 && nativeProbe.scale <= 2.1 &&
      nativeProbe.cssViewport[0] === phoneViewport.width;
    if (modeRequested === "browser-page-scale") {
      assert(nativePageScaleAvailable, "native 200% page-scale evidence was required but Chromium did not expose it", nativeProbe);
    }
    const useNativePageScale = modeRequested === "browser-page-scale";
    const mode = useNativePageScale ? "browser-page-scale" : "css-text-resize-fixture";
    const cases = [];

    runtime.mock.state.scenario = "";
    await page.setViewportSize({ width: 1366, height: 768 });
    await visitRoute(page, runtime.mock.url, "overview", { requireWorkspace: false });
    await page.locator(".panel-text-scale-sentinel").first().waitFor({ state: "attached" });
    const desktopTextScaleSentinel = await page.evaluate(() => {
      const sentinel = document.querySelector(".panel-text-scale-sentinel");
      if (!(sentinel instanceof HTMLElement)) return null;
      const style = getComputedStyle(sentinel);
      const rect = sentinel.getBoundingClientRect();
      const toolbarRect = document.querySelector("[data-panel-runtime-toolbar='desktop']")?.getBoundingClientRect() || null;
      return {
        ariaHidden: sentinel.getAttribute("aria-hidden"),
        position: style.position,
        opacity: Number.parseFloat(style.opacity),
        clipPath: style.clipPath,
        pointerEvents: style.pointerEvents,
        measurable: rect.width > 0 && rect.height > 0,
        rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
        toolbarTop: toolbarRect?.top ?? null,
      };
    });
    assert(
      desktopTextScaleSentinel?.ariaHidden === "true" &&
        desktopTextScaleSentinel.position === "fixed" &&
        desktopTextScaleSentinel.opacity === 0 &&
        desktopTextScaleSentinel.clipPath !== "none" &&
        desktopTextScaleSentinel.pointerEvents === "none" &&
        desktopTextScaleSentinel.measurable === true &&
        Math.abs(desktopTextScaleSentinel.toolbarTop || 0) <= 1,
      "desktop runtime exposed the measurable text-scale sentinel or let it shift visible chrome",
      desktopTextScaleSentinel,
    );

    async function openOpticalScenario(expectedScene, { expanded = false } = {}) {
      const target = new URL(runtime.mock.url);
      target.searchParams.set("section", "overview");
      target.hash = "";
      await page.goto(target.toString(), { waitUntil: "domcontentloaded" });
      const scene = page.locator(`[data-optical-patrol-scene="${expectedScene}"]`);
      await scene.waitFor();
      if (expanded) await scene.locator("[data-optical-patrol-expanded-claim]").waitFor();
    }

    async function inspectCase({ label, viewport, scenario, open, rootSelector }) {
      runtime.mock.state.scenario = scenario;
      await page.setViewportSize(viewport);
      await open();
      const nativeBaseline = useNativePageScale ? await captureTextBaseline(page, rootSelector) : null;
      let fixture = null;
      if (useNativePageScale) {
        await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 });
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      } else {
        fixture = await applyAuditableTextResize(page, rootSelector);
        if (label === "optical-patrol-phone-320") {
          await page.waitForFunction(() => (
            document.querySelector("[data-panel-runtime-phase]")?.getAttribute("data-panel-large-text") === "true"
          ));
        }
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      }
      try {
        let surface;
        try {
          surface = await inspectTextResizeSurface(page, { label, rootSelector, expectedViewport: viewport, mode, nativeScale: 2, nativeBaseline });
        } catch (error) {
          fs.mkdirSync(artifactDir, { recursive: true });
          await page.screenshot({ path: path.join(artifactDir, `${label}-failure.png`), animations: "disabled" });
          throw error;
        }
        const landmarks = await inspectLandmarks(page, rootSelector, label);
        fs.mkdirSync(artifactDir, { recursive: true });
        const screenshotPath = path.join(artifactDir, `${label}.png`);
        await page.screenshot({ path: screenshotPath, animations: "disabled" });
        const screenshot = {
          file: path.relative(root, screenshotPath).replace(/\\/g, "/"),
          sha256: crypto.createHash("sha256").update(fs.readFileSync(screenshotPath)).digest("hex"),
        };
        const controlReachability = await inspectResizedControlReachability(page, rootSelector, label);
        const keyboard = await inspectKeyboardReachability(page, rootSelector, label);
        cases.push({ ...surface, fixture, screenshot, controlReachability, keyboard, landmarks });
      } finally {
        if (useNativePageScale) await resetNativePageScale(cdp);
      }
    }

    await inspectCase({
      label: "optical-patrol-phone-320",
      viewport: phone320Viewport,
      scenario: "",
      rootSelector: "[data-panel-runtime-phase]",
      open: () => openOpticalScenario("single"),
    });
    await inspectCase({
      label: "optical-patrol-phone-390",
      viewport: phoneViewport,
      scenario: "",
      rootSelector: "[data-panel-runtime-phase]",
      open: () => openOpticalScenario("single"),
    });
    await inspectCase({
      label: "resource-optical-patrol-phone-430",
      viewport: phone430Viewport,
      scenario: "resource-full",
      rootSelector: "[data-panel-runtime-phase]",
      open: () => openOpticalScenario("resource-full", { expanded: true }),
    });
    await inspectCase({
      label: "resource-optical-patrol-phone-320",
      viewport: phone320Viewport,
      scenario: "resource-full",
      rootSelector: "[data-panel-runtime-phase]",
      open: () => openOpticalScenario("resource-full", { expanded: true }),
    });
    await inspectCase({
      label: "fleet-optical-patrol-phone-320",
      viewport: phone320Viewport,
      scenario: "fleet-coverage",
      rootSelector: "[data-panel-runtime-phase]",
      open: () => openOpticalScenario("fleet"),
    });
    await inspectCase({
      label: "no-snapshot-optical-patrol-phone-390",
      viewport: phoneViewport,
      scenario: "no-snapshot",
      rootSelector: "[data-panel-runtime-phase]",
      open: () => openOpticalScenario("no-snapshot"),
    });
    await inspectCase({
      label: "collection-down-optical-patrol-phone-320",
      viewport: phone320Viewport,
      scenario: "collection-down",
      rootSelector: "[data-panel-runtime-phase]",
      open: () => openOpticalScenario("collection-down"),
    });
    await inspectCase({
      label: "interfaces-down-optical-patrol-phone-390",
      viewport: phoneViewport,
      scenario: "interfaces-down",
      rootSelector: "[data-panel-runtime-phase]",
      open: () => openOpticalScenario("interfaces-down"),
    });
    await inspectCase({
      label: "offline-optical-patrol-short-landscape-667",
      viewport: shortLandscapeViewport,
      scenario: "all-offline",
      rootSelector: "[data-panel-runtime-phase]",
      open: () => openOpticalScenario("all-offline"),
    });
    await inspectCase({
      label: "optical-patrol-tablet-768",
      viewport: tabletViewport,
      scenario: "",
      rootSelector: "[data-panel-runtime-phase]",
      open: () => openOpticalScenario("single"),
    });
    runtime.mock.state.scenario = "";
    const afterInspectionEvidence = typeof afterInspection === "function"
      ? await afterInspection(runtime)
      : null;
    return {
      mechanism: mode,
      assertionBoundary: useNativePageScale
        ? "Verified Chromium CDP page-scale visual zoom. It does not prove browser-toolbar zoom reflow or physical OS text-size evidence."
        : "Real-browser CSS text-resize reflow assertion: it injects 200% computed text growth into the rendered product surface, then verifies reflow, bounded in-surface keyboard focus, and landmarks. It is not browser-toolbar zoom or OS text-size evidence.",
      nativeProbe,
      desktopTextScaleSentinel,
      requestedTextScale: 2,
      cases,
      afterInspectionEvidence,
    };
  } finally {
    if (cdp) await resetNativePageScale(cdp);
    await closeRuntime(runtime);
  }
}

function pngDimensions(buffer) {
  assert(buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), "zoom evidence screenshot is not a PNG");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

async function inspectRenderedScaleReflowFixture() {
  // Chromium has no stable CDP command for the browser chrome's zoom menu.
  // This is therefore a bounded 2x rendered-scale geometry fixture, not proof
  // that the browser toolbar was set to 200%. It exercises the same layout
  // pressure in a real browser process:
  // physical browser output remains fixed while the CSS layout viewport halves and DPR
  // doubles. It uses desktop/tablet browser classes because SC 1.4.4 browser zoom
  // is not a substitute for a phone's pinch zoom or OS text setting. It is deliberately separate from both page-scale (pinch/visual)
  // and the CSS text injection fixture below.
  const outputViewport = { width: 844, height: 1024 };
  const zoomViewport = { width: 422, height: 512 };
  const tabletOutputViewport = { width: 768, height: 1024 };
  const tabletZoomViewport = { width: 384, height: 512 };
  const baselineRuntime = await launchRuntime({
    viewport: outputViewport,
    screen: outputViewport,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  });
  const zoomRuntime = await launchRuntime({
    viewport: zoomViewport,
    screen: outputViewport,
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
  });
  const cleanup = { baseline: null, zoom: null };
  try {
    await login(baselineRuntime.page, baselineRuntime.mock.url);
    await login(zoomRuntime.page, zoomRuntime.mock.url);
    const cases = [];
    const capabilityCases = [];

    async function inspectCase({ label, viewport, output, scenario, open, rootSelector, primaryTargetSelector }) {
      baselineRuntime.mock.state.scenario = scenario;
      zoomRuntime.mock.state.scenario = scenario;
      await baselineRuntime.page.setViewportSize(output);
      await zoomRuntime.page.setViewportSize(viewport);
      const baselineGeometry = await baselineRuntime.page.evaluate(() => ({
        cssViewport: [window.innerWidth, window.innerHeight],
        visualViewportScale: window.visualViewport?.scale || 1,
        devicePixelRatio: window.devicePixelRatio,
      }));
      assert(
        baselineGeometry.cssViewport[0] === output.width && baselineGeometry.cssViewport[1] === output.height &&
          Math.abs(baselineGeometry.devicePixelRatio - 1) <= 0.1 && Math.abs(baselineGeometry.visualViewportScale - 1) <= 0.1,
        "rendered-scale baseline did not expose the unscaled physical output geometry",
        { label, output, baselineGeometry },
      );
      // At 100%, a wide output can legitimately select a desktop composition.
      // Return the baseline page to the zoomed CSS width before sampling mobile
      // typography; the geometry assertion above remains the 100% evidence.
      await baselineRuntime.page.setViewportSize(viewport);
      await open(baselineRuntime.page, baselineRuntime.mock.url);
      const baseline = await captureTextBaseline(baselineRuntime.page, rootSelector);
      await open(zoomRuntime.page, zoomRuntime.mock.url);
      const surface = await inspectTextResizeSurface(zoomRuntime.page, {
        label,
        rootSelector,
        expectedViewport: viewport,
         mode: "rendered-scale-reflow-fixture",
        nativeScale: 2,
        nativeBaseline: baseline,
      });
      assert(
        surface.cssViewport[0] * 2 === baselineGeometry.cssViewport[0] &&
          surface.cssViewport[1] * 2 === baselineGeometry.cssViewport[1],
         "2x rendered-scale fixture did not halve the baseline CSS layout viewport",
        { label, baselineGeometry, surface },
      );
      const target = zoomRuntime.page.locator(`${rootSelector} :is(${primaryTargetSelector}):visible`).first();
      await target.waitFor();
      await target.scrollIntoViewIfNeeded();
      const primaryAction = await target.evaluate((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return {
          label: (node.getAttribute("aria-label") || node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
          rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
          fullyVisible: rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth,
          visible: style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0,
        };
      });
      const actionEvidence = { label, rootSelector, primaryTargetSelector, primaryAction };
       assert(primaryAction.visible && primaryAction.fullyVisible, "2x rendered-scale fixture left the task target clipped or unreachable", actionEvidence);
       assert(primaryAction.rect.width >= 44 && primaryAction.rect.height >= 44, "2x rendered-scale fixture reduced the task target below 44 CSS px", actionEvidence);
      const keyboard = await inspectKeyboardReachability(zoomRuntime.page, rootSelector, label);
      fs.mkdirSync(artifactDir, { recursive: true });
      const screenshotPath = path.join(artifactDir, `${label}.png`);
      await zoomRuntime.page.screenshot({ path: screenshotPath, animations: "disabled" });
      const screenshotBytes = fs.readFileSync(screenshotPath);
      const screenshot = {
        file: path.relative(root, screenshotPath).replace(/\\/g, "/"),
        sha256: crypto.createHash("sha256").update(screenshotBytes).digest("hex"),
        dimensions: pngDimensions(screenshotBytes),
      };
       assert(screenshot.dimensions.width === output.width && screenshot.dimensions.height === output.height, "2x rendered-scale fixture did not preserve physical output dimensions", { label, output, screenshot });
       cases.push({ ...surface, baselineGeometry, primaryAction, keyboard, screenshot });
     }

    async function inspectCapabilityCase({ label, viewport, expectedLayout }) {
      baselineRuntime.mock.state.scenario = "";
      await baselineRuntime.page.setViewportSize(viewport);
      await visitRoute(baselineRuntime.page, baselineRuntime.mock.url, "interfaces");
      const rootLocator = baselineRuntime.page.locator('[data-mobile-domain-workspace="interfaces"]');
      await rootLocator.waitFor();
      const evidence = await baselineRuntime.page.evaluate(() => {
        const root = document.querySelector('[data-mobile-domain-workspace="interfaces"]');
        const firstRow = root?.querySelector(
          '[data-mobile-interface-focus-object] button, [data-mobile-row-id]'
        );
        const rect = firstRow?.getBoundingClientRect();
        const style = firstRow ? getComputedStyle(firstRow) : null;
        return {
          viewport: [innerWidth, innerHeight],
          layout: root?.getAttribute("data-mobile-domain-layout") || "",
          overflowX: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
          firstRow: rect ? {
            top: rect.top,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
            taskKind: firstRow?.closest('[data-mobile-interface-focus-object]') ? "current-interface-object" : "object-list-row",
            visible: style?.display !== "none" && style?.visibility !== "hidden" && rect.width > 0 && rect.height > 0,
            inFirstViewport: rect.top >= 0 && rect.top < innerHeight && rect.bottom <= innerHeight,
          } : null,
        };
      });
      fs.mkdirSync(artifactDir, { recursive: true });
      const capabilityScreenshotPath = path.join(artifactDir, `${label}.png`);
      await baselineRuntime.page.screenshot({ path: capabilityScreenshotPath, animations: "disabled" });
      evidence.screenshot = path.relative(root, capabilityScreenshotPath).replace(/\\/g, "/");
      assert(evidence.layout === expectedLayout, "responsive capability selected the wrong mobile domain task", { label, expectedLayout, evidence });
      assert(evidence.overflowX <= 1, "responsive capability introduced horizontal overflow", { label, evidence });
      assert(evidence.firstRow?.visible && evidence.firstRow.inFirstViewport, "first inspectable object is not fully available in the first viewport", { label, evidence });
      assert(evidence.firstRow.width >= 44 && evidence.firstRow.height >= 44, "first inspectable object is below the 44px task target", { label, evidence });
      capabilityCases.push({ label, expectedLayout, evidence });
    }

    await inspectCase({
      label: "optical-patrol-browser-844",
      viewport: zoomViewport,
      output: outputViewport,
       scenario: "",
       rootSelector: "[data-optical-patrol-root]",
       primaryTargetSelector: "[data-optical-patrol-claim-control]",
       open: async (page, baseUrl) => { await visitRoute(page, baseUrl, "overview", { requireWorkspace: false }); await page.locator('[data-optical-patrol-scene="single"]').waitFor(); },
     });
     await inspectCase({
       label: "offline-optical-patrol-browser-844",
       viewport: zoomViewport,
       output: outputViewport,
       scenario: "all-offline",
       rootSelector: "[data-optical-patrol-root]",
       primaryTargetSelector: "[data-optical-patrol-claim-control]",
       open: async (page, baseUrl) => { await visitRoute(page, baseUrl, "overview", { requireWorkspace: false }); await page.locator('[data-optical-patrol-scene="all-offline"]').waitFor(); },
    });
    await inspectCase({
       label: "resource-optical-patrol-browser-844",
      viewport: zoomViewport,
      output: outputViewport,
       scenario: "resource-full",
       rootSelector: "[data-optical-patrol-root]",
       primaryTargetSelector: "[data-optical-patrol-action]",
       open: async (page, baseUrl) => { await visitRoute(page, baseUrl, "overview", { requireWorkspace: false }); await page.locator('[data-optical-patrol-scene="resource-full"] [data-optical-patrol-expanded-claim]').waitFor(); },
    });
    await inspectCase({
      label: "interfaces-workspace-browser-768",
      viewport: tabletZoomViewport,
      output: tabletOutputViewport,
      scenario: "",
      rootSelector: "[data-mobile-domain-workspace=\"interfaces\"]",
       primaryTargetSelector: "[data-mobile-row-id]",
      open: async (page, baseUrl) => { await visitRoute(page, baseUrl, "interfaces"); await page.locator("[data-mobile-domain-workspace=\"interfaces\"]").waitFor(); },
    });
    await inspectCapabilityCase({ label: "interfaces-short-landscape-667x375", viewport: { width: 667, height: 375 }, expectedLayout: "phone-list" });
    await inspectCapabilityCase({ label: "interfaces-compact-600x800", viewport: { width: 600, height: 800 }, expectedLayout: "compact-list" });
    await inspectCapabilityCase({ label: "interfaces-tablet-768x1024", viewport: { width: 768, height: 1024 }, expectedLayout: "workbench" });
    return {
      mechanism: "Chromium 2x rendered-scale layout-pressure fixture",
      assertionBoundary: "Verified layout pressure in a real Chromium process while physical output stays fixed and CSS viewport halves at DPR 2. This is not proof of browser-toolbar 200% zoom, phone pinch zoom, or physical iOS/Android text size; those require a separately identified acceptance record.",
      physicalOutputViewport: { phone: outputViewport, tablet: tabletOutputViewport },
      zoomedCssViewport: { phone: zoomViewport, tablet: tabletZoomViewport },
      requestedTextScale: 2,
      cases,
      capabilityCases,
      cleanup,
    };
  } finally {
    await closeRuntime(baselineRuntime);
    cleanup.baseline = { closed: baselineRuntime.closed, steps: baselineRuntime.cleanup };
    await closeRuntime(zoomRuntime);
    cleanup.zoom = { closed: zoomRuntime.closed, steps: zoomRuntime.cleanup };
  }
}

async function inspectOfflineOpticalPatrolAccessibilityWithRuntime(runtime) {
  runtime.mock.state.scenario = "all-offline";
  await visitRoute(runtime.page, runtime.mock.url, "overview", { requireWorkspace: false });
  await runtime.page.locator('[data-optical-patrol-scene="all-offline"]').waitFor();

  const initial = await runtime.page.evaluate(() => {
    const root = document.querySelector("[data-optical-patrol-root]");
    const targets = Array.from(root?.querySelectorAll("button:not([disabled]), a[href]") || [])
      .filter((node) => node instanceof HTMLElement && !node.closest("[hidden]") && node.getClientRects().length > 0)
      .map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        label: node.getAttribute("aria-label") || node.textContent?.replace(/\s+/g, " ").trim() || "",
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10,
      };
      });
    const labelledSections = Array.from(root?.querySelectorAll("section[aria-labelledby]") || []).map((section) => {
      const id = section.getAttribute("aria-labelledby") || "";
      return { id, targetExists: Boolean(id && document.getElementById(id)) };
    });
    const times = Array.from(root?.querySelectorAll("time") || []).map((time) => time.getAttribute("datetime"));
    const animations = document.getAnimations({ subtree: true }).filter((animation) => animation.playState === "running");
    const animationDetails = animations.map((animation) => {
      const effect = animation.effect;
      const target = effect && "target" in effect ? effect.target : null;
      return {
        type: animation.constructor?.name || "Animation",
        animationName: animation.animationName || "",
        transitionProperty: animation.transitionProperty || "",
        target: target instanceof Element ? {
          tag: target.tagName.toLowerCase(),
          className: typeof target.className === "string" ? target.className : "",
          label: (target.getAttribute("aria-label") || target.textContent || "").replace(/\s+/g, " ").trim().slice(0, 100),
        } : null,
        timing: effect?.getTiming?.() || null,
      };
    });
    return {
      url: location.href,
      evidenceMode: root?.getAttribute("data-optical-patrol-evidence-mode") || "",
      scene: root?.getAttribute("data-optical-patrol-scene") || "",
      forbidsCurrentData: root?.getAttribute("data-optical-patrol-forbids-current") === "true",
      selectedClaimId: root?.querySelector("[data-optical-patrol-expanded-claim]")?.getAttribute("data-optical-patrol-expanded-claim") || "",
      selectedFocusId: root?.querySelector("[data-optical-patrol-expanded-claim]")?.id || "",
      history: window.history.state?.panelOpticalPatrol || null,
      semanticStatus: (() => {
        const status = root?.querySelector("[data-optical-patrol-semantic-status]");
        return {
          count: root?.querySelectorAll("[data-optical-patrol-semantic-status]").length || 0,
          role: status?.getAttribute("role") || "",
          live: status?.getAttribute("aria-live") || "",
          atomic: status?.getAttribute("aria-atomic") || "",
          text: status?.textContent?.replace(/\s+/g, " ").trim() || "",
        };
      })(),
      selectedClaimTitle: root?.querySelector("[data-optical-patrol-expanded-claim] .op__claim-name h2")?.textContent?.replace(/\s+/g, " ").trim() || "",
      selectedClaimState: root?.querySelector("[data-optical-patrol-expanded-claim] .op__claim-state")?.textContent?.replace(/\s+/g, " ").trim() || "",
      evidenceLabel: root?.querySelector("[data-optical-patrol-evidence-boundary] strong")?.textContent?.replace(/\s+/g, " ").trim() || "",
      decisionLabel: root?.querySelector("[data-optical-patrol-decision] > span")?.textContent?.replace(/\s+/g, " ").trim() || "",
      nextClaimAvailable: Boolean(root?.querySelector("button[data-optical-patrol-claim-control]")),
      expandedClaimLabelled: Boolean(root?.querySelector("[data-optical-patrol-expanded-claim][aria-labelledby]")),
      currentMeasurementsPresent: Boolean(root?.querySelector("[data-optical-patrol-traffic-geometry], [data-optical-patrol-resource-geometry]")),
      targets,
      labelledSections,
      times,
      runningAnimations: animations.length,
      animationDetails,
      meaningfulRunningAnimations: animationDetails.filter((animation) => Number(animation.timing?.duration || 0) > 20).length,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  assert([null, "overview"].includes(new URL(initial.url).searchParams.get("section")), "offline Optical Patrol did not remain on the canonical overview URL", initial);
  assert(initial.scene === "all-offline", "offline Optical Patrol did not select its expected scene", initial);
  assert(["current", "historical", "unavailable"].includes(initial.evidenceMode) && initial.forbidsCurrentData === (initial.evidenceMode !== "current"), "Optical Patrol current-data boundary contradicted its evidence mode", initial);
  assert(initial.selectedClaimId && initial.selectedFocusId === `optical-claim-${encodeURIComponent(initial.selectedClaimId)}` && initial.expandedClaimLabelled,
    "offline Optical Patrol did not expose a labelled selected claim with its stable focus id", initial);
  assert(
    initial.history?.version === 1 && typeof initial.history?.scope === "string" && initial.history.scope.length > 0 &&
      initial.history.selectedId === initial.selectedClaimId,
    "offline Optical Patrol initial claim is not represented by its scoped history state",
    initial,
  );
  assert(
    initial.semanticStatus.count === 1 && initial.semanticStatus.role === "status" && initial.semanticStatus.live === "polite" && initial.semanticStatus.atomic === "true" &&
      initial.semanticStatus.text.includes(initial.evidenceLabel) && initial.semanticStatus.text.includes(initial.decisionLabel) &&
      initial.semanticStatus.text.includes(initial.selectedClaimTitle) && initial.semanticStatus.text.includes(initial.selectedClaimState),
    "Optical Patrol did not expose one atomic polite semantic status for evidence, decision, and selected object state",
    initial,
  );
  assert(initial.nextClaimAvailable, "offline Optical Patrol did not expose a native follow-up claim for history verification", initial);
  assert(!initial.forbidsCurrentData || !initial.currentMeasurementsPresent, "offline Optical Patrol leaked current measurements across its evidence boundary", initial);
  assert(initial.targets.every((target) => target.width >= 44 && target.height >= 44), "offline Optical Patrol has a touch target below 44x44px", initial);
  assert(initial.labelledSections.every((section) => section.targetExists), "offline Optical Patrol has a dangling aria-labelledby relationship", initial);
  assert(initial.times.every((value) => value === null || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)), "offline Optical Patrol rendered a non-RFC3339 datetime", initial);
  assert(initial.meaningfulRunningAnimations === 0, "offline Optical Patrol leaves motion longer than 20ms running under reduced-motion", initial);
  assert(initial.overflow <= 1, "offline Optical Patrol introduced horizontal overflow", initial);

  const savedInitialScroll = await runtime.page.evaluate(() => {
    const root = document.querySelector("[data-optical-patrol-root]");
    if (!(root instanceof HTMLElement)) return null;
    const target = Math.min(180, Math.max(0, root.scrollHeight - root.clientHeight));
    root.scrollTo({ top: target, left: 0, behavior: "instant" });
    return { target, rootTop: root.scrollTop, windowTop: window.scrollY };
  });
  assert(savedInitialScroll && savedInitialScroll.rootTop >= 40, "offline Optical Patrol did not provide enough owner scroll range for history restoration verification", savedInitialScroll);
  await runtime.page.locator("button[data-optical-patrol-claim-control]").first().click();
  await runtime.page.waitForFunction((previousId) => {
    const selected = document.querySelector("[data-optical-patrol-expanded-claim]")?.getAttribute("data-optical-patrol-expanded-claim") || "";
    return Boolean(selected && selected !== previousId && document.activeElement === document.querySelector("[data-optical-patrol-expanded-claim]"));
  }, initial.selectedClaimId);
  const opened = await runtime.page.evaluate(() => ({
    selectedClaimId: document.querySelector("[data-optical-patrol-expanded-claim]")?.getAttribute("data-optical-patrol-expanded-claim") || "",
    focusId: document.activeElement?.id || "",
    history: window.history.state?.panelOpticalPatrol || null,
    scroll: (() => {
      const root = document.querySelector("[data-optical-patrol-root]");
      return root instanceof HTMLElement ? { rootTop: root.scrollTop, windowTop: window.scrollY } : null;
    })(),
  }));
  await runtime.page.goBack({ waitUntil: "domcontentloaded" });
  await runtime.page.waitForFunction((id) => document.querySelector("[data-optical-patrol-expanded-claim]")?.getAttribute("data-optical-patrol-expanded-claim") === id && document.activeElement === document.querySelector("[data-optical-patrol-expanded-claim]"), initial.selectedClaimId);
  const back = await runtime.page.evaluate(() => ({
    selectedClaimId: document.querySelector("[data-optical-patrol-expanded-claim]")?.getAttribute("data-optical-patrol-expanded-claim") || "",
    focusId: document.activeElement?.id || "",
    history: window.history.state?.panelOpticalPatrol || null,
    scroll: (() => {
      const root = document.querySelector("[data-optical-patrol-root]");
      return root instanceof HTMLElement ? { rootTop: root.scrollTop, windowTop: window.scrollY } : null;
    })(),
  }));
  await runtime.page.goForward({ waitUntil: "domcontentloaded" });
  await runtime.page.waitForFunction((id) => document.querySelector("[data-optical-patrol-expanded-claim]")?.getAttribute("data-optical-patrol-expanded-claim") === id && document.activeElement === document.querySelector("[data-optical-patrol-expanded-claim]"), opened.selectedClaimId);
  const forward = await runtime.page.evaluate(() => ({
    selectedClaimId: document.querySelector("[data-optical-patrol-expanded-claim]")?.getAttribute("data-optical-patrol-expanded-claim") || "",
    focusId: document.activeElement?.id || "",
    history: window.history.state?.panelOpticalPatrol || null,
    scroll: (() => {
      const root = document.querySelector("[data-optical-patrol-root]");
      return root instanceof HTMLElement ? { rootTop: root.scrollTop, windowTop: window.scrollY } : null;
    })(),
  }));
  const evidence = { initial, savedInitialScroll, opened, back, forward };
  assert(opened.selectedClaimId && opened.selectedClaimId !== initial.selectedClaimId && opened.focusId === `optical-claim-${encodeURIComponent(opened.selectedClaimId)}`, "Optical Patrol selection did not open and focus its expanded claim", evidence);
  assert(opened.history?.version === 1 && opened.history?.scope === initial.history?.scope && opened.history?.selectedId === opened.selectedClaimId,
    "opening an Optical Patrol claim did not create the matching scoped history entry", evidence);
  assert(
    opened.history?.scroll && back.history?.scroll && opened.scroll &&
      Math.abs(back.history.scroll.rootTop - savedInitialScroll.rootTop) <= 1 &&
      Math.abs(opened.history.scroll.rootTop - opened.scroll.rootTop) <= 1 &&
      Number.isFinite(back.history.scroll.windowTop) && Number.isFinite(opened.history.scroll.windowTop) &&
      Math.abs(back.history.scroll.rootTop - opened.history.scroll.rootTop) >= 24,
    "Optical Patrol did not persist materially different owner and window-fallback scroll positions for history entries",
    evidence,
  );
  assert(back.selectedClaimId === initial.selectedClaimId && back.focusId === initial.selectedFocusId, "Back did not restore the Optical Patrol selection and focus", evidence);
  assert(back.history?.version === 1 && back.history?.scope === initial.history?.scope && back.history?.selectedId === initial.selectedClaimId,
    "Back did not restore the scoped Optical Patrol history entry", evidence);
  assert(Math.abs(back.scroll.rootTop - back.history.scroll.rootTop) <= 1 && Math.abs(back.scroll.windowTop - back.history.scroll.windowTop) <= 1,
    "Back did not restore the saved Optical Patrol owner and window scroll positions", evidence);
  assert(forward.selectedClaimId === opened.selectedClaimId && forward.focusId === opened.focusId, "Forward did not restore the Optical Patrol selection and focus", evidence);
  assert(forward.history?.version === 1 && forward.history?.scope === initial.history?.scope && forward.history?.selectedId === opened.selectedClaimId,
    "Forward did not restore the scoped Optical Patrol history entry", evidence);
  assert(Math.abs(forward.scroll.rootTop - opened.history.scroll.rootTop) <= 1 && Math.abs(forward.scroll.windowTop - opened.history.scroll.windowTop) <= 1,
    "Forward did not restore the saved Optical Patrol owner and window scroll positions", evidence);
  return evidence;
}

async function inspectReducedMotionAndOffline() {
  const runtime = await launchRuntime({ reducedMotion: "reduce" });
  try {
    await login(runtime.page, runtime.mock.url);
    const offlineOpticalPatrol = await inspectOfflineOpticalPatrolAccessibilityWithRuntime(runtime);
    runtime.mock.state.scenario = "";
    const reducedMotion = await inspectReducedMotionWithRuntime(runtime);
    return { offlineOpticalPatrol, reducedMotion };
  } finally {
    await closeRuntime(runtime);
  }
}

async function tabTo(page, label, predicate) {
  for (let index = 0; index < 80; index += 1) {
    await page.keyboard.press("Tab");
    const evidence = await page.evaluate(() => {
      const active = document.activeElement;
      const style = active instanceof Element ? getComputedStyle(active) : null;
      const rect = active instanceof Element ? active.getBoundingClientRect() : null;
      let clippedByAncestor = false;
      let clippingAncestor = "";
      if (active instanceof Element && rect) {
        for (let ancestor = active.parentElement; ancestor; ancestor = ancestor.parentElement) {
          const ancestorStyle = getComputedStyle(ancestor);
          const ancestorRect = ancestor.getBoundingClientRect();
          const clipsX = ["auto", "clip", "hidden", "scroll"].includes(ancestorStyle.overflowX);
          const clipsY = ["auto", "clip", "hidden", "scroll"].includes(ancestorStyle.overflowY);
          const beyondX = rect.left < ancestorRect.left - 1 || rect.right > ancestorRect.right + 1;
          const beyondY = rect.top < ancestorRect.top - 1 || rect.bottom > ancestorRect.bottom + 1;
          if ((clipsX && beyondX) || (clipsY && beyondY)) {
            clippedByAncestor = true;
            clippingAncestor = ancestor.className || ancestor.tagName.toLowerCase();
            break;
          }
        }
      }
      return {
        tag: active?.tagName || "",
        section: active?.getAttribute("data-section") || "",
        rowId: active?.getAttribute("data-mobile-row-id") || "",
        opticalClaimId: active?.getAttribute("data-optical-patrol-claim-control") || "",
        focusVisible: active instanceof Element && active.matches(":focus-visible"),
        outline: { width: Number.parseFloat(style?.outlineWidth || "0"), style: style?.outlineStyle || "none" },
        rect: rect ? { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height } : null,
        viewportVisible: Boolean(rect && rect.left >= 0 && rect.top >= 0 && rect.right <= window.innerWidth && rect.bottom <= window.innerHeight),
        clippedByAncestor,
        clippingAncestor,
      };
    });
    if (predicate(evidence)) return evidence;
  }
  throw new Error(`keyboard Tab traversal could not reach ${label}`);
}

async function inspectKeyboardFocusVisibleWithRuntime(runtime) {
  await visitRoute(runtime.page, runtime.mock.url, "overview", { requireWorkspace: false });
  await runtime.page.locator("[data-optical-patrol-root]").waitFor();
  const claimCount = await runtime.page.locator("[data-optical-patrol-claim-control]").count();
  assert(claimCount >= 1, "Optical Patrol keyboard test requires a follow-up claim control", { claimCount });
  const claimFocus = await tabTo(runtime.page, "Optical Patrol follow-up claim control", (item) => Boolean(item.opticalClaimId));
  assert(
    claimFocus.focusVisible && claimFocus.outline.width >= 2 && claimFocus.outline.style !== "none" &&
      claimFocus.rect?.width >= 44 && claimFocus.rect?.height >= 44 && claimFocus.viewportVisible && !claimFocus.clippedByAncestor,
    "keyboard-focused Optical Patrol claim control lacks a visible, unclipped 44px :focus-visible target",
    claimFocus,
  );
  const initialSelection = await runtime.page.locator("[data-optical-patrol-expanded-claim]").getAttribute("data-optical-patrol-expanded-claim");
  await runtime.page.keyboard.press("Enter");
  await runtime.page.waitForFunction((id) => {
    const expanded = document.querySelector("[data-optical-patrol-expanded-claim]");
    const selectedId = expanded?.getAttribute("data-optical-patrol-expanded-claim") || "";
    return Boolean(selectedId && selectedId !== id && document.activeElement === expanded);
  }, initialSelection);
  const selection = await runtime.page.evaluate(() => {
    const root = document.querySelector("[data-optical-patrol-root]");
    const expanded = root?.querySelector("[data-optical-patrol-expanded-claim]");
    const selectedId = expanded?.getAttribute("data-optical-patrol-expanded-claim") || "";
    const active = document.activeElement;
    const style = active instanceof Element ? getComputedStyle(active) : null;
    const history = window.history.state?.panelOpticalPatrol || null;
    return {
      selectedClaimId: selectedId,
      expandedClaimId: expanded?.id || "",
      expectedFocusId: selectedId ? `optical-claim-${encodeURIComponent(selectedId)}` : "",
      focusedId: active?.id || "",
      focusVisible: active instanceof Element && active.matches(":focus-visible"),
      outline: { width: Number.parseFloat(style?.outlineWidth || "0"), style: style?.outlineStyle || "none" },
      history,
    };
  });
  assert(
    selection.selectedClaimId && selection.expandedClaimId === selection.expectedFocusId &&
      selection.focusedId === selection.expectedFocusId && selection.focusVisible &&
      selection.outline.width >= 2 && selection.outline.style !== "none",
    "keyboard claim selection did not focus its matching Optical Patrol expanded claim",
    { claimFocus, initialSelection, selection },
  );
  assert(
    selection.history?.version === 1 && typeof selection.history?.scope === "string" && selection.history.scope.length > 0 &&
      selection.history.selectedId === selection.selectedClaimId,
    "keyboard claim selection did not write the Optical Patrol scoped history state",
    { claimFocus, initialSelection, selection },
  );
  return { claimFocus, initialSelection, selection };
}

async function selectedItemEvidence(page, cdp, route) {
  const row = page.locator(`[data-mobile-domain-workspace="${route}"] [data-mobile-row-id]`).first();
  const rowId = await row.getAttribute("data-mobile-row-id");
  const accessibleName = ((await row.getAttribute("aria-label")) || (await row.textContent()) || "").replace(/\s+/g, " ").trim();
  await row.click();
  const detail = page.locator(`[data-mobile-object-detail="${rowId}"]`);
  await detail.waitFor();
  const dom = await page.evaluate(({ activeRoute, id }) => {
    const selected = Array.from(document.querySelectorAll(`[data-mobile-domain-workspace="${activeRoute}"] [data-mobile-row-id][aria-current="true"]`));
    const rowNode = document.querySelector(`[data-mobile-row-id="${CSS.escape(id)}"]`);
    const style = rowNode ? getComputedStyle(rowNode) : null;
    return {
      forcedColorsActive: matchMedia("(forced-colors: active)").matches,
      selectedCount: selected.length,
      selectedIds: selected.map((node) => node.getAttribute("data-mobile-row-id") || ""),
      ariaCurrent: rowNode?.getAttribute("aria-current") || "",
      forcedColorAdjust: style?.forcedColorAdjust || "",
      outlineWidth: Number.parseFloat(style?.outlineWidth || "0"),
      borderWidth: Number.parseFloat(style?.borderTopWidth || "0") + Number.parseFloat(style?.borderRightWidth || "0") +
        Number.parseFloat(style?.borderBottomWidth || "0") + Number.parseFloat(style?.borderLeftWidth || "0"),
      detailId: document.querySelector("[data-mobile-object-detail]")?.getAttribute("data-mobile-object-detail") || "",
    };
  }, { activeRoute: route, id: rowId });
  const detailTitle = ((await detail.locator("[data-panel-route-title], h1, h2").first().textContent()) || "")
    .replace(/\s+/g, " ").trim();
  const axTree = await cdp.send("Accessibility.getFullAXTree");
  const axHeadings = axTree.nodes.filter((item) => !item.ignored && item.role?.value === "heading")
    .map((item) => String(item.name?.value || "").replace(/\s+/g, " ").trim());
  const controlNames = await assertOperableControlNames(page, { route, surface: "object-detail", rowId });
  const evidence = { route, rowId, accessibleName, detailTitle, dom, controlNames, axDetailHeading: axHeadings.includes(detailTitle), axHeadings };
  assert(dom.forcedColorsActive, "forced-colors runtime media query did not match", evidence);
  assert(dom.selectedCount === 1 && dom.selectedIds[0] === rowId && dom.ariaCurrent === "true", "selected object lacks one explicit aria-current=true item", evidence);
  assert(dom.forcedColorAdjust !== "none" && (dom.outlineWidth >= 2 || dom.borderWidth >= 2), "forced-colors selected item lacks a non-color-only visual indicator", evidence);
  assert(dom.detailId === rowId, "selected aria-current item did not open its matching detail", evidence);
  assert(evidence.axDetailHeading, "opened selected object detail lacks a named AX heading", evidence);
  return evidence;
}

async function waitForRouteInventoryStable(page, route) {
  await page.waitForFunction((candidate) => {
    const supplement = document.querySelector(`[data-supplemental-surface="${candidate}"]`);
    // DNS and health evidence start automatically after mount. Their idle DOM
    // is transitional and can expose snapshot rows that the accepted
    // supplemental collection replaces on the next React commit.
    if (candidate === "dns4" || candidate === "security") {
      if (!supplement) return false;
      const requestStatus = supplement.getAttribute("data-supplemental-request") || "";
      return requestStatus === "success" || requestStatus === "error";
    }
    return !supplement || supplement.getAttribute("data-supplemental-request") !== "loading";
  }, route);
}

async function supplementalDnsForcedColorsEvidence(page) {
  const focusTarget = page.locator(
    '[data-supplemental-surface="dns4"] [data-supplemental-next-page]:not([disabled]), ' +
      '[data-supplemental-surface="dns4"] [data-supplemental-prev-page]:not([disabled])',
  ).first();
  await focusTarget.focus();
  const evidence = await page.evaluate(() => {
    const surface = document.querySelector('[data-supplemental-surface="dns4"]');
    const list = surface?.querySelector('.mrs-dns-list');
    const buttons = Array.from(surface?.querySelectorAll('.mrs-pager button') || []);
    const active = document.activeElement;
    const style = active instanceof Element ? getComputedStyle(active) : null;
    return {
      forcedColorsActive: matchMedia('(forced-colors: active)').matches,
      requestStatus: surface?.getAttribute('data-supplemental-request') || '',
      uiState: surface?.getAttribute('data-supplemental-state') || '',
      kind: surface?.getAttribute('data-supplemental-kind') || '',
      listPresent: Boolean(list),
      rowCount: list?.querySelectorAll('article').length || 0,
      pagerButtonCount: buttons.length,
      namedPagerButtons: buttons.filter((button) => Boolean(button.getAttribute('aria-label')?.trim())).length,
      focusedPager: active?.hasAttribute('data-supplemental-next-page') || active?.hasAttribute('data-supplemental-prev-page') || false,
      focusVisible: active instanceof Element && active.matches(':focus-visible'),
      outlineWidth: Number.parseFloat(style?.outlineWidth || '0'),
      outlineStyle: style?.outlineStyle || 'none',
      forcedColorAdjust: style?.forcedColorAdjust || '',
    };
  });
  assert(
    evidence.forcedColorsActive && evidence.requestStatus === 'success' &&
      ['ready', 'empty'].includes(evidence.uiState) && evidence.kind === 'dns-static' &&
      evidence.listPresent && evidence.rowCount > 0,
    'accepted supplemental DNS collection did not remain available in forced colors',
    evidence,
  );
  assert(
    evidence.pagerButtonCount === 2 && evidence.namedPagerButtons === 2 && evidence.focusedPager &&
      evidence.focusVisible && evidence.forcedColorAdjust !== 'none' &&
      evidence.outlineWidth >= 2 && evidence.outlineStyle !== 'none',
    'supplemental DNS pagination lacks a named, non-color-only forced-colors focus indicator',
    evidence,
  );
  return evidence;
}

async function inspectForcedColorsRouteDetails() {
  const runtime = await launchRuntime({ forcedColors: "active" });
  try {
    await login(runtime.page, runtime.mock.url);
    const cdp = await runtime.context.newCDPSession(runtime.page);
    await cdp.send("Accessibility.enable");
    const registry = routeRegistry();
    const detailRoutes = [];
    const notApplicable = [];
    for (const route of registry) {
      await visitRoute(runtime.page, runtime.mock.url, route, { requireWorkspace: false });
      await waitForRouteInventoryStable(runtime.page, route);
      const controlNames = await assertOperableControlNames(runtime.page, { route, surface: "route" });
      const inventory = await runtime.page.evaluate((candidate) => {
        const workspace = document.querySelector(`[data-mobile-domain-workspace="${candidate}"]`);
        const rows = workspace ? workspace.querySelectorAll("[data-mobile-row-id]").length : 0;
        const supplement = document.querySelector(`[data-supplemental-surface="${candidate}"]`);
        const supplementalDnsOwnsCollection = candidate === 'dns4' &&
          supplement?.getAttribute('data-supplemental-request') === 'success' &&
          ['ready', 'empty'].includes(supplement?.getAttribute('data-supplemental-state') || '') &&
          supplement?.getAttribute('data-supplemental-kind') === 'dns-static' &&
          Boolean(supplement.querySelector('.mrs-dns-list'));
        return {
          activeRoute: document.querySelector("[data-panel-app]")?.getAttribute("data-active-section") || "",
          hash: location.hash,
          workspace: Boolean(workspace),
          rows,
          directory: Boolean(document.querySelector("[data-mobile-more-directory]")),
          supplementalDnsOwnsCollection,
        };
      }, route);
      assert(inventory.activeRoute === route && !inventory.hash, "route inventory was not canonical at runtime", { route, inventory });
      const supplementalEvidence = inventory.supplementalDnsOwnsCollection
        ? await supplementalDnsForcedColorsEvidence(runtime.page)
        : null;
      if (!inventory.supplementalDnsOwnsCollection && inventory.workspace && inventory.rows > 0) detailRoutes.push(route);
      else notApplicable.push({
        route,
        reason: inventory.supplementalDnsOwnsCollection
          ? "accepted supplemental DNS collection owns the list; paginated DNS evidence rows do not implement generic object-detail history"
          : route === "more"
          ? "registry marks this as the directory route and runtime has zero [data-mobile-row-id] objects"
          : inventory.directory
          ? "runtime rendered a directory surface, not an object-detail workspace"
          : inventory.workspace
            ? "runtime workspace has zero [data-mobile-row-id] objects in the mock snapshot"
            : "runtime rendered no mobile domain workspace or object rows",
        ...inventory,
        controlNames,
        supplementalEvidence,
      });
    }
    assert(detailRoutes.length > 0, "runtime inventory found no detail-capable routes", { registry, notApplicable });
    const evidence = [];
    for (const route of detailRoutes) {
      await visitRoute(runtime.page, runtime.mock.url, route);
      await waitForRouteInventoryStable(runtime.page, route);
      const selection = await selectedItemEvidence(runtime.page, cdp, route);
      await runtime.page.goBack({ waitUntil: "domcontentloaded" });
      await runtime.page.locator(`[data-mobile-domain-workspace="${route}"]`).waitFor();
      const back = await runtime.page.evaluate((id) => {
        const active = document.activeElement;
        const style = active instanceof Element ? getComputedStyle(active) : null;
        return {
        route: document.querySelector("[data-panel-app]")?.getAttribute("data-active-section") || "",
        hash: location.hash,
        detailPresent: Boolean(document.querySelector("[data-mobile-object-detail]")),
        focusedRow: active?.getAttribute("data-mobile-row-id") || "",
        focusOutline: { width: Number.parseFloat(style?.outlineWidth || "0"), style: style?.outlineStyle || "none" },
        expectedId: id,
        };
      }, selection.rowId);
      await runtime.page.goForward({ waitUntil: "domcontentloaded" });
      await runtime.page.locator(`[data-mobile-object-detail="${selection.rowId}"]`).waitFor();
      const forward = await runtime.page.evaluate((id) => {
        const active = document.activeElement;
        const style = active instanceof Element ? getComputedStyle(active) : null;
        return {
        route: document.querySelector("[data-panel-app]")?.getAttribute("data-active-section") || "",
        hash: location.hash,
        detailId: document.querySelector("[data-mobile-object-detail]")?.getAttribute("data-mobile-object-detail") || "",
        focusedDetailTitle: active?.id === "mdw-detail-title",
        expectedId: id,
        };
      }, selection.rowId);
      const routeEvidence = { ...selection, back, forward };
      assert(back.route === route && !back.hash && !back.detailPresent && back.focusedRow === selection.rowId, "Back did not restore the selected list object and focus", routeEvidence);
      assert(forward.route === route && !forward.hash && forward.detailId === selection.rowId, "Forward did not restore the selected object detail", routeEvidence);
      assert(forward.focusedDetailTitle, "Forward did not restore focus to the opened detail title", routeEvidence);
      evidence.push({ ...routeEvidence, routeControlNames: await assertOperableControlNames(runtime.page, { route, surface: "object-detail-restored" }) });
    }
    await cdp.send("Accessibility.disable");
    return { registry, detailRoutes, notApplicable, evidence };
  } finally {
    await closeRuntime(runtime);
  }
}

async function inspectExpandedOpticalClaimAccessibleNameWithRuntime(runtime) {
  await visitRoute(runtime.page, runtime.mock.url, "overview", { requireWorkspace: false });
  const selector = "[data-optical-patrol-expanded-claim]";
  const claim = runtime.page.locator(selector);
  await claim.waitFor();
  const dom = await claim.evaluate((node) => ({
    claimId: node.getAttribute("data-optical-patrol-expanded-claim") || "",
    domId: node.id || "",
    visibleName: (node.textContent || "").replace(/\s+/g, " ").trim(),
    labelledBy: node.getAttribute("aria-labelledby") || "",
    heading: document.getElementById(node.getAttribute("aria-labelledby") || "")?.textContent?.replace(/\s+/g, " ").trim() || "",
    history: window.history.state?.panelOpticalPatrol || null,
  }));
  const cdp = await runtime.page.context().newCDPSession(runtime.page);
  await cdp.send("Accessibility.enable");
  const documentNode = await cdp.send("DOM.getDocument", { depth: 0, pierce: true });
  const queried = await cdp.send("DOM.querySelector", { nodeId: documentNode.root.nodeId, selector });
  assert(queried.nodeId > 0, "expanded Optical Patrol claim was not addressable in the accessibility tree", { dom });
  const partialTree = await cdp.send("Accessibility.getPartialAXTree", { nodeId: queried.nodeId, fetchRelatives: false });
  const claimNode = partialTree.nodes.find((node) => !node.ignored && ["region", "generic", "group"].includes(String(node.role?.value || "")));
  const accessibleName = String(claimNode?.name?.value || "").replace(/\s+/g, " ").trim();
  const tree = await cdp.send("Accessibility.getFullAXTree");
  const headings = tree.nodes.filter((node) => !node.ignored && node.role?.value === "heading")
    .map((node) => String(node.name?.value || "").replace(/\s+/g, " ").trim());
  await cdp.send("Accessibility.disable");
  const evidence = {
    ...dom,
    accessibleName,
    headings,
    normalizedVisibleName: dom.visibleName.replace(/\s+/g, ""),
    normalizedAccessibleName: accessibleName.replace(/\s+/g, ""),
  };
  assert(
    dom.claimId && dom.domId === `optical-claim-${encodeURIComponent(dom.claimId)}` && dom.labelledBy && dom.heading,
    "expanded Optical Patrol claim lacks its stable id or labelled heading",
    evidence,
  );
  assert(
    headings.includes(dom.heading) && (accessibleName.includes(dom.heading) || evidence.normalizedVisibleName.includes(dom.heading.replace(/\s+/g, ""))),
    "accessibility tree omitted the expanded Optical Patrol claim heading",
    evidence,
  );
  assert(
    dom.history?.version === 1 && typeof dom.history?.scope === "string" && dom.history.scope.length > 0 && dom.history.selectedId === dom.claimId,
    "expanded Optical Patrol claim is not reflected by its scoped history state",
    evidence,
  );
  return evidence;
}

async function inspectStandardInteractionAccessibility() {
  const viewport = { width: 390, height: 844 };
  const runtime = await launchRuntime({ viewport, screen: viewport });
  try {
    await login(runtime.page, runtime.mock.url);
    return await inspectStandardInteractionAccessibilityWithRuntime(runtime);
  } finally {
    await closeRuntime(runtime);
  }
}

async function inspectStandardInteractionAccessibilityWithRuntime(runtime) {
  const expandedOpticalClaimAccessibleName = await inspectExpandedOpticalClaimAccessibleNameWithRuntime(runtime);
  const keyboardFocusVisible = await inspectKeyboardFocusVisibleWithRuntime(runtime);
  return { expandedOpticalClaimAccessibleName, keyboardFocusVisible };
}

async function main() {
  const startedAt = Date.now();
  fs.rmSync(artifactDir, { recursive: true, force: true });
  if (onlyReducedMotion) {
    const evidence = await runStage("reduced-motion-and-offline", inspectReducedMotionAndOffline);
    const report = {
      pass: true,
      contract: "mobile-accessibility-runtime-v2-reduced-motion-focus",
      generatedAt: new Date().toISOString(),
      identity: gitWorktreeIdentity(root),
      stageProgress,
      evidence,
      elapsedMs: Date.now() - startedAt,
    };
    fs.mkdirSync(artifactDir, { recursive: true });
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify({ pass: true, reportPath, elapsedMs: report.elapsedMs }, null, 2)}\n`);
    return;
  }
  const abortCleanupBound = await runStage("abort-cleanup-bound", inspectAbortCleanupBound);
  const narrowViewportReflow = await runStage("narrow-viewport-reflow", inspectNarrowViewportReflow);
  const renderedScaleReflowFixture = requestedMode === "rendered-scale-reflow-fixture"
    ? await runStage("rendered-scale-reflow", inspectRenderedScaleReflowFixture)
    : null;
  const textResize = requestedMode === "rendered-scale-reflow-fixture"
    ? null
    : await runStage("requested-text-resize", () => inspectTextResize(
      requestedMode,
      inspectStandardInteractionAccessibilityWithRuntime,
    ));
  // The primary runtime command must carry an actual 200% computed-text reflow
  // assertion, not merely infer text scale from DPR/viewport geometry.
  const browserTextResizeReflow = requestedMode === "rendered-scale-reflow-fixture"
    ? await runStage("css-text-resize-reflow", () => inspectTextResize(
      "css-text-resize-fixture",
      inspectStandardInteractionAccessibilityWithRuntime,
    ))
    : requestedMode === "css-text-resize-fixture"
      ? textResize
      : null;
  const reducedMotionAndOffline = await runStage("reduced-motion-and-offline", inspectReducedMotionAndOffline);
  const offlineOpticalPatrol = reducedMotionAndOffline.offlineOpticalPatrol;
  const reducedMotion = reducedMotionAndOffline.reducedMotion;
  const standardInteractions = browserTextResizeReflow?.afterInspectionEvidence || textResize?.afterInspectionEvidence ||
    await runStage("standard-interactions", inspectStandardInteractionAccessibility);
  const expandedOpticalClaimAccessibleName = standardInteractions.expandedOpticalClaimAccessibleName;
  const keyboardFocusVisible = standardInteractions.keyboardFocusVisible;
  const forcedColors = await runStage("forced-colors-route-details", inspectForcedColorsRouteDetails);
  const report = {
    pass: true,
    contract: "mobile-accessibility-runtime-v2",
    generatedAt: new Date().toISOString(),
    identity: gitWorktreeIdentity(root),
    evidenceMode: reportMode,
    evidenceClassification: {
      selectedMode: {
        mode: reportMode,
        ...SCALING_EVIDENCE_BOUNDARIES[reportMode],
      },
      browserToolbarZoom200: {
        status: "not-proven",
        boundary: "This runner never drives the browser toolbar zoom control. Browser-toolbar 200% zoom requires a separately identified manual or browser-UI acceptance record.",
      },
      physicalOsTextSize: {
        status: "not-proven",
        boundary: "Physical iOS Dynamic Type and Android system font-size require a device-level manual acceptance record; this automated Chromium runner does not claim either.",
      },
    },
    bounded: {
      timeoutMs: runTimeoutMs,
      contexts: browserTextResizeReflow ? 9 : 8,
      registryRoutes: forcedColors.registry,
      detailRoutes: forcedColors.detailRoutes,
      notApplicableRoutes: forcedColors.notApplicable,
      viewport: { width: 390, height: 844 },
    },
    abortCleanupBound,
    stageProgress,
    narrowViewportReflow,
    scalingEvidence: {
      renderedScaleReflowFixture: renderedScaleReflowFixture || {
        status: "not-run",
        boundary: "Run npm run check:mobile-accessibility-runtime-v2 for the Chromium 2x rendered-scale layout-pressure fixture; it does not prove browser-toolbar 200% zoom or OS text size.",
      },
      browserTextResizeReflow: browserTextResizeReflow || {
        status: "not-run",
        boundary: "Run npm run check:mobile-accessibility-runtime-v2 for the real-browser 200% CSS text-resize reflow assertion. It is intentionally distinct from browser-toolbar zoom and physical OS text-size evidence.",
      },
      browserPageScale: requestedMode === "browser-page-scale" ? textResize : {
        status: "not-run",
        boundary: "Browser page-scale is a visual zoom probe only; it does not establish browser-toolbar reflow or OS text size.",
      },
      cssTextResizeFixture: requestedMode === "css-text-resize-fixture" ? textResize : {
        status: "not-run",
        boundary: "The CSS fixture is diagnostic only and must never be reported as browser zoom, browser-toolbar 200% zoom, or OS text-size evidence.",
      },
      physicalOsTextSize: {
        status: "not-proven",
        boundary: "Physical iOS Dynamic Type and Android system font-size require a device-level manual acceptance record; this automated Chromium gate does not claim either.",
      },
    },
    offlineOpticalPatrol,
    expandedOpticalClaimAccessibleName,
    keyboardFocusVisible,
    reducedMotion,
    forcedColors: forcedColors.evidence,
    elapsedMs: Date.now() - startedAt,
  };
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ pass: true, reportPath, evidenceMode: report.evidenceMode, elapsedMs: report.elapsedMs }, null, 2)}\n`);
}

withTimeout("mobile accessibility runtime v2", main, runTimeoutMs).catch((error) => {
  const report = {
    pass: false,
    contract: "mobile-accessibility-runtime-v2",
    generatedAt: new Date().toISOString(),
    identity: gitWorktreeIdentity(root),
    evidenceMode: reportMode,
    error: String(error && (error.stack || error.message) || error),
    detail: error?.detail || null,
  };
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stderr.write(`${error && (error.stack || error.message) || error}${error?.detail ? `\n${JSON.stringify(error.detail, null, 2)}` : ""}\n`);
  process.exitCode = 1;
  // Browser close promises can leave Chromium transport handles alive after a
  // bounded cleanup failure. The report is already durable; terminate this
  // failed gate rather than letting CI hang indefinitely on detached handles.
  setTimeout(() => process.exit(1), 500);
});
