#!/usr/bin/env node

/**
 * Blocking contract for the single query URL writer. Legacy hashes are input
 * only: migration replaces the current entry, while user navigation performs
 * exactly one intentional history mutation.
 */

"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const routes = read("src/panel-framework/routes/panelRoutes.ts");
const hook = read("src/panel-framework/routes/usePanelRoute.ts");
const index = read("public/index.html");
const dispatcher = read("panel_backend/http_dispatcher.py");
const mobileRoute = read("src/panel-framework/mobile-reference-ui/MobileReferenceSurface.tsx");
const routeHookPath = path.join(root, "src", "panel-framework", "routes", "usePanelRoute.ts");
const panelRoutesPath = path.join(root, "src", "panel-framework", "routes", "panelRoutes.ts");
const objectHistoryPath = path.join(root, "src", "panel-framework", "domain-workspace", "workspaceHistory.ts");

function loadTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filename,
  });
  module._compile(compiled.outputText, filename);
}

require.extensions[".ts"] = loadTypeScript;

function createBrowser(initialUrl) {
  const calls = [];
  const scrolls = [];
  const listeners = new Map();
  const location = { pathname: "", search: "", hash: "" };
  const setUrl = (value) => {
    const parsed = new URL(value, "https://panel.local");
    location.pathname = parsed.pathname;
    location.search = parsed.search;
    location.hash = parsed.hash;
  };
  setUrl(initialUrl);
  const entries = [{ value: `${location.pathname}${location.search}${location.hash}`, state: null }];
  let index = 0;
  let window;
  const emitPopState = () => window.dispatchEvent(new global.PopStateEvent("popstate", { state: entries[index].state }));
  const writeEntry = (value, state, replace) => {
    setUrl(value);
    const entry = { value, state };
    if (replace) entries[index] = entry;
    else {
      entries.splice(index + 1);
      entries.push(entry);
      index = entries.length - 1;
    }
  };
  window = {
    location,
    scrollY: 240,
    history: {
      get state() { return entries[index].state; },
      replaceState(state, _title, value) {
        calls.push({ kind: "replace", value });
        writeEntry(value, state, true);
      },
      pushState(state, _title, value) {
        calls.push({ kind: "push", value });
        writeEntry(value, state, false);
      },
      back() {
        if (index <= 0) return;
        index -= 1;
        setUrl(entries[index].value);
        emitPopState();
      },
      forward() {
        if (index >= entries.length - 1) return;
        index += 1;
        setUrl(entries[index].value);
        emitPopState();
      },
    },
    scrollTo(optionsOrX, y) {
      const top = typeof optionsOrX === "object" ? optionsOrX.top : y;
      this.scrollY = Number(top) || 0;
      scrolls.push(this.scrollY);
    },
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type) { listeners.delete(type); },
    dispatchEvent(event) { listeners.get(event.type)?.(event); },
  };
  return { calls, scrolls, location, setUrl, window };
}

function createReactHarness(browser, focused) {
  const slots = [];
  let cursor = 0;
  const nextSlot = () => cursor++;
  const dependenciesChanged = (left, right) => !left || left.length !== right.length || left.some((value, index) => value !== right[index]);
  return {
    react: {
      useState(initial) {
        const slot = nextSlot();
        if (!slots[slot]) slots[slot] = { value: typeof initial === "function" ? initial() : initial };
        return [slots[slot].value, (value) => { slots[slot].value = typeof value === "function" ? value(slots[slot].value) : value; }];
      },
      useRef(current) {
        const slot = nextSlot();
        if (!slots[slot]) slots[slot] = { current };
        return slots[slot];
      },
      useLayoutEffect(effect, dependencies) {
        const slot = nextSlot();
        const previous = slots[slot];
        if (previous && !dependenciesChanged(previous.dependencies, dependencies)) return;
        previous?.cleanup?.();
        slots[slot] = { dependencies, cleanup: effect() };
      },
      useEffect(effect, dependencies) {
        const slot = nextSlot();
        const previous = slots[slot];
        if (previous && !dependenciesChanged(previous.dependencies, dependencies)) return;
        previous?.cleanup?.();
        slots[slot] = { dependencies, cleanup: effect() };
      },
      useCallback(callback, dependencies) {
        const slot = nextSlot();
        const previous = slots[slot];
        if (previous && !dependenciesChanged(previous.dependencies, dependencies)) return previous.callback;
        slots[slot] = { dependencies, callback };
        return callback;
      },
    },
    render(usePanelRoute) {
      cursor = 0;
      return usePanelRoute();
    },
    cleanup() {
      for (const slot of slots) slot?.cleanup?.();
    },
    document: {
      body: { dataset: {} },
      title: "",
      addEventListener() {},
      removeEventListener() {},
      getElementById(id) {
        return id === "overview-return-focus" ? { focus() { focused.push(id); } } : null;
      },
      querySelector() { return null; },
      querySelectorAll() { return []; },
    },
    window: browser.window,
  };
}

function withRouteHook(initialUrl, test) {
  const browser = createBrowser(initialUrl);
  const focused = [];
  const harness = createReactHarness(browser, focused);
  const originalLoad = Module._load;
  const originals = {
    window: global.window,
    document: global.document,
    MutationObserver: global.MutationObserver,
    PopStateEvent: global.PopStateEvent,
    requestAnimationFrame: global.requestAnimationFrame,
    cancelAnimationFrame: global.cancelAnimationFrame,
  };
  global.window = harness.window;
  global.document = harness.document;
  global.MutationObserver = class { observe() {} disconnect() {} };
  global.PopStateEvent = class { constructor(type, init = {}) { this.type = type; this.state = init.state; } };
  global.requestAnimationFrame = () => 1;
  global.cancelAnimationFrame = () => {};
  delete require.cache[require.resolve(routeHookPath)];
  Module._load = function load(request, parent, isMain) {
    if (request === "react") return harness.react;
    if (request === "lucide-react") return new Proxy({}, { get: () => function Icon() {} });
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    const { usePanelRoute } = require(routeHookPath);
    return test({ browser, focused, render: () => harness.render(usePanelRoute) });
  } finally {
    Module._load = originalLoad;
    harness.cleanup();
    global.window = originals.window;
    global.document = originals.document;
    global.MutationObserver = originals.MutationObserver;
    global.PopStateEvent = originals.PopStateEvent;
    global.requestAnimationFrame = originals.requestAnimationFrame;
    global.cancelAnimationFrame = originals.cancelAnimationFrame;
  }
}

function withObjectHistory(initialUrl, route, test) {
  const browser = createBrowser(initialUrl);
  const focused = [];
  const harness = createReactHarness(browser, focused);
  const originalLoad = Module._load;
  const originals = {
    window: global.window,
    document: global.document,
    MutationObserver: global.MutationObserver,
    PopStateEvent: global.PopStateEvent,
    requestAnimationFrame: global.requestAnimationFrame,
    cancelAnimationFrame: global.cancelAnimationFrame,
  };
  global.window = harness.window;
  global.document = harness.document;
  global.MutationObserver = class { observe() {} disconnect() {} };
  global.PopStateEvent = class { constructor(type, init = {}) { this.type = type; this.state = init.state; } };
  global.requestAnimationFrame = () => 1;
  global.cancelAnimationFrame = () => {};
  delete require.cache[require.resolve(objectHistoryPath)];
  Module._load = function load(request, parent, isMain) {
    if (request === "react") return harness.react;
    if (request === "lucide-react") return new Proxy({}, { get: () => function Icon() {} });
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    const { useObjectHistory } = require(objectHistoryPath);
    return test({ browser, render: () => harness.render(() => useObjectHistory(route)) });
  } finally {
    Module._load = originalLoad;
    harness.cleanup();
    global.window = originals.window;
    global.document = originals.document;
    global.MutationObserver = originals.MutationObserver;
    global.PopStateEvent = originals.PopStateEvent;
    global.requestAnimationFrame = originals.requestAnimationFrame;
    global.cancelAnimationFrame = originals.cancelAnimationFrame;
  }
}

function expectSingleWrite(calls, kind, value, message) {
  assert.deepEqual(calls, [{ kind, value }], message);
}

function expectWrites(calls, expected, message) {
  assert.deepEqual(calls, expected, message);
}

function assertOverviewFocusPrecedesPush() {
  const sourceFile = ts.createSourceFile(routeHookPath, hook, ts.ScriptTarget.ES2020, true);
  const focusAssignments = [];
  const pushCalls = [];
  const visit = (node) => {
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && node.left.getText(sourceFile) === "overviewReturnFocusRef.current") {
      focusAssignments.push(node.getStart(sourceFile));
    }
    if (ts.isCallExpression(node) && node.expression.getText(sourceFile) === "window.history.pushState") {
      pushCalls.push(node.getStart(sourceFile));
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  assert(focusAssignments.length > 0, "overview return focus must be recorded for overview-originated navigation");
  assert(pushCalls.length === 1, "the route hook must retain one explicit push writer");
  assert(focusAssignments.some((position) => position < pushCalls[0]), "overview return focus must be recorded before the user navigation push");
}

function ordinaryNavigationAndMigration() {
  withRouteHook("/panel?section=overview", ({ browser, render }) => {
    const controller = render();
    assert.deepEqual(browser.calls, [], "already canonical initial URL must not write history");
    controller.navigate("interfaces", { focusId: "overview-return-focus" });
    expectWrites(browser.calls, [
      { kind: "replace", value: "/panel?section=overview" },
      { kind: "push", value: "/panel?section=interfaces" },
    ], "ordinary navigation must persist its source state once, then push exactly one destination entry");
  });

  withRouteHook("/panel#terminals", ({ browser, render }) => {
    render();
    expectSingleWrite(browser.calls, "replace", "/panel?section=terminals", "legacy migration must replace its current entry once");
    browser.calls.length = 0;
    render().navigate("interfaces");
    expectWrites(browser.calls, [
      { kind: "replace", value: "/panel?section=terminals" },
      { kind: "push", value: "/panel?section=interfaces" },
    ], "migration replacement must not become a second destination write after source-state capture");
  });

  withRouteHook("/panel?section=interfaces#logs", ({ browser, render }) => {
    render();
    expectSingleWrite(browser.calls, "replace", "/panel?section=interfaces", "a query route must win over and remove a conflicting legacy hash on initial load");
  });
}

function malformedLegacyHashFallsBackWithoutThrowing() {
  delete require.cache[require.resolve(panelRoutesPath)];
  const { routeFromLocation } = require(panelRoutesPath);
  assert.equal(routeFromLocation({ search: "", hash: "#%" }), "overview");
  assert.equal(routeFromLocation({ search: "", hash: "#%E0%A4%A" }), "overview");
  assert.equal(routeFromLocation({ search: "?section=dns4", hash: "#%" }), "dns4");
}

function canonicalQueryContextSurvivesOnlyWhenLive() {
  delete require.cache[require.resolve(panelRoutesPath)];
  const { routeUrl } = require(panelRoutesPath);
  const evidenceAt = "2026-08-10T05:51:31Z";

  assert.equal(
    routeUrl("interfaces", { pathname: "/panel", search: "?section=interfaces&q=ether" }),
    "/panel?section=interfaces",
    "a bare q must be removed because no current route surface restores it",
  );
  assert.equal(
    routeUrl("interfaces", { pathname: "/panel", search: "?section=interfaces&object=ether1&q=ether&retired=1" }),
    "/panel?section=interfaces&object=ether1&q=ether",
    "an object-backed q must survive while unrelated query state is discarded",
  );
  assert.equal(
    routeUrl("trafficLoad", { pathname: "/panel", search: `?section=trafficLoad&q=cpu&risk=resource&from=overview&evidenceAt=${encodeURIComponent(evidenceAt)}` }),
    `/panel?section=trafficLoad&q=cpu&risk=resource&from=overview&evidenceAt=${encodeURIComponent(evidenceAt)}`,
    "risk and evidence-backed return context must preserve q",
  );

  let refreshedDeepLink = "";
  withRouteHook("/panel?section=interfaces&q=stale", ({ browser, render }) => {
    render();
    expectSingleWrite(browser.calls, "replace", "/panel?section=interfaces", "a direct stale-q deep link must normalize once");
    refreshedDeepLink = `${browser.location.pathname}${browser.location.search}${browser.location.hash}`;
  });
  withRouteHook(refreshedDeepLink, ({ browser, render }) => {
    render();
    assert.deepEqual(browser.calls, [], "refreshing an already normalized deep link must not write history again");
  });

  withRouteHook("/panel?section=interfaces&object=ether1&q=ether", ({ browser, render }) => {
    render();
    assert.deepEqual(browser.calls, [], "a direct object-backed q deep link must remain canonical");
    browser.window.history.pushState({}, "", "/panel?section=interfaces&q=stale");
    browser.calls.length = 0;

    browser.window.history.back();
    assert.deepEqual(browser.calls, [], "Back must restore the valid object-backed context without rewriting it");
    browser.window.history.forward();
    expectSingleWrite(browser.calls, "replace", "/panel?section=interfaces", "Forward must normalize a stale-q history entry once");
    browser.calls.length = 0;
    browser.window.history.back();
    browser.window.history.forward();
    assert.deepEqual(browser.calls, [], "normalized Back/Forward entries must stay stable after their first repair");
  });
}

function replaceAndHashCleanup() {
  withRouteHook("/panel?section=interfaces", ({ browser, render }) => {
    browser.window.scrollY = 360;
    render().navigate("logs", { replace: true });
    expectSingleWrite(browser.calls, "replace", "/panel?section=logs", "options.replace navigation must replace exactly once");
    assert.equal(browser.window.scrollY, 0, "explicit replace navigation must reset scroll to the top");
  });

  withRouteHook("/panel?section=interfaces", ({ browser, render }) => {
    render();
    browser.setUrl("/panel?section=interfaces#legacy");
    browser.window.scrollY = 360;
    render().navigate("interfaces");
    expectWrites(browser.calls, [
      { kind: "replace", value: "/panel?section=interfaces#legacy" },
      { kind: "replace", value: "/panel?section=interfaces" },
    ], "same-route residual hash cleanup must capture its source once, then replace the canonical entry once");
    assert.equal(browser.window.scrollY, 360, "same-route residual hash cleanup must not masquerade as a new top navigation");
  });
}

function explicitNavigationScrollsToTop() {
  withRouteHook("/panel?section=overview", ({ browser, render }) => {
    const controller = render();
    browser.window.scrollY = 640;
    controller.navigate("interfaces", { focusId: "overview-return-focus" });
    assert.equal(browser.window.scrollY, 0, "route navigate must reset stale page scroll before route focus runs");
    assert.deepEqual(browser.scrolls, [0], "route navigate must perform one deterministic top scroll");
  });
}

function objectHistoryBackForwardAndScroll() {
  withObjectHistory("/panel?section=interfaces", "interfaces", ({ browser, render }) => {
    const controller = render();
    assert.equal(controller.selectedId, "", "plain route starts with no selected object");
    browser.window.scrollY = 720;
    controller.open("interfaces-row-1");
    assert.equal(browser.window.scrollY, 0, "explicit object open must reset stale list scroll");
    assert.equal(new URLSearchParams(browser.location.search).get("object"), "interfaces-row-1");
    assert.equal(render().selectedId, "interfaces-row-1", "object query opens the detail route");
    browser.window.history.back();
    assert.equal(new URLSearchParams(browser.location.search).get("object"), null, "browser Back closes object detail");
    assert.equal(render().selectedId, "", "Back returns to the list state");
    browser.window.history.forward();
    assert.equal(new URLSearchParams(browser.location.search).get("object"), "interfaces-row-1", "browser Forward restores object detail URL");
    assert.equal(render().selectedId, "interfaces-row-1", "Forward reopens the selected detail");
  });
}

function returnFocusSurvivesHashCleanup() {
  assertOverviewFocusPrecedesPush();
  withRouteHook("/panel?section=overview", ({ browser, focused, render }) => {
    render().navigate("interfaces", { focusId: "overview-return-focus" });
    browser.calls.length = 0;
    browser.setUrl("/panel?section=interfaces#legacy");
    render().navigate("interfaces");
    expectWrites(browser.calls, [
      { kind: "replace", value: "/panel?section=interfaces#legacy" },
      { kind: "replace", value: "/panel?section=interfaces" },
    ], "hash-only cleanup must capture its source once, then repair the current entry without a push");
    browser.calls.length = 0;
    render().navigate("overview");
    expectWrites(browser.calls, [
      { kind: "replace", value: "/panel?section=interfaces" },
      { kind: "push", value: "/panel?section=overview" },
    ], "return navigation must preserve source state once and retain one normal overview push");
    render();
    assert.deepEqual(focused, ["overview-return-focus"], "overview return focus must be recorded before the first push and survive later hash cleanup");
  });
}

const checks = [
  {
    name: "legacy hash is explicitly named as migration input",
    run: () => assert.match(routes, /const legacyHash\s*=/),
  },
  {
    name: "ordinary navigation pushes once and migration does not double-write it",
    run: ordinaryNavigationAndMigration,
  },
  {
    name: "malformed legacy hashes fail closed without crashing route startup",
    run: malformedLegacyHashFallsBackWithoutThrowing,
  },
  {
    name: "canonical URLs rebuild live query context across direct links, refresh, and Back/Forward",
    run: canonicalQueryContextSurvivesOnlyWhenLive,
  },
  {
    name: "replace and residual-hash navigation replace once while return focus survives",
    run: () => {
      explicitNavigationScrollsToTop();
      replaceAndHashCleanup();
      returnFocusSurvivesHashCleanup();
    },
  },
  {
    name: "object detail history resets explicit scroll and survives Back/Forward",
    run: objectHistoryBackForwardAndScroll,
  },
  {
    name: "Mobile Reference workspace renders bounded route objects",
    run: () => {
      assert.match(mobileRoute, /data-mobile-reference-workspace=\{route\}/);
      assert.match(mobileRoute, /ref-object-list/);
       assert.match(mobileRoute, /(?:rows|visibleRows)\.map\(\(row\) =>/);
      assert.doesNotMatch(mobileRoute, /data-inspection-object-trigger|useObjectHistory\(route\)/);
    },
  },
  {
    name: "Mobile Reference navigation targets mounted surfaces",
    run: () => {
      assert.match(mobileRoute, /data-mobile-reference-navigation/);
      assert.match(mobileRoute, /data-mobile-reference-directory/);
      assert.match(mobileRoute, /data-mobile-reference-wan-detail/);
      assert.match(mobileRoute, /onNavigate\(target\)/);
    },
  },
  {
    name: "public RouterOS entry does not load the retired hash author",
    run: () => assert(!index.includes("readonly-diagnostics.js") && dispatcher.includes('private_public_assets = {"readonly-diagnostics.js"}')),
  },
];

const failed = [];
for (const check of checks) {
  try {
    check.run();
    console.log(`PASS ${check.name}`);
  } catch (error) {
    failed.push(check);
    console.log(`FAIL ${check.name}`);
    console.error(error instanceof Error ? error.message : error);
  }
}

if (failed.length) {
  console.error(`[canonical-route] FAIL ${failed.length}/${checks.length}`);
  process.exitCode = 1;
} else {
  console.log(`[canonical-route] PASS ${checks.length}/${checks.length}`);
}
