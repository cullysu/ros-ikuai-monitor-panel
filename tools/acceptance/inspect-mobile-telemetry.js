"use strict";

function normalize(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

async function inspectMobileTelemetryOverview(page) {
  return page.evaluate(() => {
    const text = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const root = document.querySelector("[data-mobile-pulse-overview]");
    const nav = document.querySelector("[data-origin-navigation]");
    const visible = (node) => {
      if (!(node instanceof HTMLElement || node instanceof SVGElement)) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const box = (node) => {
      const value = node?.getBoundingClientRect();
      return value ? { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height } : null;
    };
    const clipped = (node) => {
      if (!(node instanceof HTMLElement) || !visible(node)) return false;
      const style = getComputedStyle(node);
      return ((style.overflowX === "hidden" || style.overflowX === "clip") && node.scrollWidth > node.clientWidth + 1)
        || ((style.overflowY === "hidden" || style.overflowY === "clip") && node.scrollHeight > node.clientHeight + 1);
    };
    const status = root?.querySelector(".oc-status");
    const signal = root?.querySelector(".oc-signal");
    const objects = root?.querySelector(".oc-objects");
    const firstObject = root?.querySelector(".oc-objects li > button");
    const inspector = root?.querySelector(".oc-inspector");
    const incident = root?.getAttribute("data-origin-scene") !== "none";
    const facts = [...(root?.querySelectorAll(".oc-facts button, .oc-pressure button, .oc-objects li > button") || [])].filter(visible);
    const critical = [...(root?.querySelectorAll(".oc-status h1, .oc-status p, .oc-signal h2, .oc-rates b, .oc-objects h2, .oc-object-copy b, .oc-object-copy em, .oc-object-state strong") || [])]
      .filter(visible)
      .map((node) => ({ text: text(node.textContent), clipped: clipped(node), rect: box(node) }));
    const navButtons = [...(nav?.querySelectorAll("button") || [])].filter(visible).map((node) => ({
      label: node.getAttribute("aria-label") || text(node.textContent),
      rect: box(node),
      current: node.getAttribute("aria-current") || "",
    }));
    const controls = [...document.querySelectorAll("button, a, input, select, summary")].filter(visible).map((node) => {
      const target = node instanceof HTMLInputElement && ["checkbox", "radio"].includes(node.type) ? node.closest("label") || node : node;
      return { label: node.getAttribute("aria-label") || node.getAttribute("name") || text(node.textContent), rect: box(target) };
    });
    return {
      root: Boolean(root),
      scene: root?.getAttribute("data-origin-scene") || "",
      evidenceMode: root?.getAttribute("data-evidence-mode") || "",
      canvasKind: root?.getAttribute("data-origin-scene") === "none" ? "normal" : "incident",
      canvas: box(root),
      factBoxes: facts.map(box),
      factValues: facts.map((node) => text(node.textContent)),
      hasTraffic: Boolean([...root?.querySelectorAll(".oc-rates, .oc-chart") || []].some(visible)),
      phoneSurface: Boolean(root && visible(root)),
      taskWorkspace: Boolean(status && visible(status) && (incident ? objects && visible(objects) : signal && visible(signal))),
      selectedRadio: false,
      selectedDetail: Boolean(incident ? (inspector && visible(inspector)) || (firstObject && visible(firstObject)) : signal && visible(signal)),
      selectedDetailBox: incident ? (visible(inspector) ? box(inspector) : visible(firstObject) ? box(firstObject) : null) : visible(signal) ? box(signal) : null,
      selectedEvidenceBox: visible(signal) ? box(signal) : null,
      priorityObjectBox: visible(firstObject) ? box(firstObject) : null,
      inspectorBox: visible(inspector) ? box(inspector) : null,
      selectedActionBox: box(root?.querySelector(".oc-status-action, .oc-objects li > button, .oc-facts button")),
      incidentPlane: [...(root?.querySelectorAll(".oc-status, .oc-objects") || [])].filter(visible).map((node) => node.className),
      critical,
      nav: box(nav),
      navButtons,
      controls,
      oldOwner: Boolean(document.querySelector("[data-mobile-ops-overview], [data-mobile-ops-navigation], .mop-overview, .mop-route")),
      overflowX: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0) - innerWidth,
      viewport: { width: innerWidth, height: innerHeight },
    };
  });
}

async function inspectMobileTelemetryRoute(page, route) {
  return page.evaluate((expectedRoute) => {
    const text = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const root = document.querySelector(`[data-origin-route][data-panel-route-content="${expectedRoute}"]`);
    const detail = document.querySelector("[data-origin-detail]");
    const title = root?.querySelector("[data-panel-route-title]");
    const row = root?.querySelector(".origin-group li > button");
    const nav = document.querySelector("[data-origin-navigation]");
    const visible = (node) => node instanceof HTMLElement && getComputedStyle(node).display !== "none" && getComputedStyle(node).visibility !== "hidden" && node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0;
    const controls = [...document.querySelectorAll("button, a, input, select, summary")].filter(visible).map((node) => {
      const rect = node.getBoundingClientRect();
      return { label: node.getAttribute("aria-label") || node.getAttribute("name") || text(node.textContent), width: rect.width, height: rect.height };
    });
    return {
      root: Boolean(root),
      route: root?.getAttribute("data-panel-route") || "",
      title: text(title?.textContent),
      hasRow: Boolean(row),
      hasDetail: Boolean(detail),
      navigation: {
        context: nav?.getAttribute("data-current-context") || "",
        selected: [...(nav?.querySelectorAll("button[aria-current='page']") || [])].filter(visible).map((node) => node.getAttribute("data-origin-destination") || text(node.textContent)),
      },
      controls,
      overflowX: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0) - innerWidth,
    };
  }, route);
}

async function inspectMobileTelemetryConnection(page) {
  const owner = page.locator("[data-mobile-pulse-connection]");
  await owner.waitFor({ state: "visible" });
  return owner.evaluate((root) => {
    const text = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const visible = (node) => node instanceof HTMLElement && getComputedStyle(node).display !== "none" && node.getBoundingClientRect().width > 0 && node.getBoundingClientRect().height > 0;
    const controls = [...(root?.querySelectorAll("button, input, select, summary") || [])].filter(visible).map((node) => {
      const target = node instanceof HTMLInputElement && ["checkbox", "radio"].includes(node.type) ? node.closest("label") || node : node;
      const rect = target.getBoundingClientRect();
      return { label: node.getAttribute("aria-label") || node.getAttribute("name") || text(node.textContent), width: rect.width, height: rect.height };
    });
    return {
      root: root instanceof HTMLElement,
      phase: root?.getAttribute("data-mobile-pulse-connection") || "",
      form: Boolean(root?.querySelector("form.ocx-form")),
      restOnly: Boolean(root?.querySelector(".ocx-rest-only")),
      controls,
      overflowX: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0) - innerWidth,
      oldOwner: Boolean(document.querySelector("[data-mobile-ops-connection], .mop-connection-surface")),
    };
  });
}

function assertNoCriticalEllipsis(observation, label) {
  const clipped = observation.critical.filter((entry) => entry.clipped);
  if (clipped.length) throw new Error(`${label}: critical telemetry is clipped ${JSON.stringify(clipped.slice(0, 4))}`);
}

module.exports = { assertNoCriticalEllipsis, inspectMobileTelemetryConnection, inspectMobileTelemetryOverview, inspectMobileTelemetryRoute, normalize };
