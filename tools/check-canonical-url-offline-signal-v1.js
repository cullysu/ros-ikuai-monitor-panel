"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const root = process.cwd();
const routesPath = path.join(root, "src", "panel-framework", "routes", "panelRoutes.ts");
const routeHookPath = path.join(root, "src", "panel-framework", "routes", "usePanelRoute.ts");
const runtimePath = path.join(root, "src", "panel-framework", "runtime", "usePanelRuntime.ts");
const panelApiPath = path.join(root, "src", "panel-framework", "runtime", "panelApi.ts");

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

const routes = require(routesPath);
const routeHook = fs.readFileSync(routeHookPath, "utf8");
const runtime = fs.readFileSync(runtimePath, "utf8");

function createWindow(initialUrl) {
  const listeners = new Map();
  const calls = [];
  const location = { pathname: "", search: "", hash: "" };
  const setUrl = (value) => {
    const parsed = new URL(value, "https://panel.local");
    location.pathname = parsed.pathname;
    location.search = parsed.search;
    location.hash = parsed.hash;
  };
  setUrl(initialUrl);
  const window = {
    location,
    history: {
      state: null,
      replaceState(state, _title, value) {
        this.state = state;
        calls.push({ kind: "replace", value });
        setUrl(value);
      },
      pushState(state, _title, value) {
        this.state = state;
        calls.push({ kind: "push", value });
        setUrl(value);
      },
    },
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type) { listeners.delete(type); },
    dispatchEvent() {},
  };
  return { window, listeners, calls, setUrl };
}

function mountRouteHook(browser) {
  const previousWindow = global.window;
  const previousDocument = global.document;
  const previousMutationObserver = global.MutationObserver;
  const react = {
    useState(initial) { return [typeof initial === "function" ? initial() : initial, () => {}]; },
    useRef(current) { return { current }; },
    useEffect(effect) { effect(); },
    useLayoutEffect(effect) { effect(); },
    useCallback(callback) { return callback; },
  };
  const originalLoad = Module._load;
  global.window = browser.window;
  global.document = {
    body: { dataset: {} },
    title: "",
    getElementById() { return null; },
    querySelector() { return null; },
  };
  global.MutationObserver = class { observe() {} disconnect() {} };
  delete require.cache[require.resolve(routeHookPath)];
  Module._load = function load(request, parent, isMain) {
    if (request === "react") return react;
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return {
      controller: require(routeHookPath).usePanelRoute(),
      restore() {
        global.window = previousWindow;
        global.document = previousDocument;
        global.MutationObserver = previousMutationObserver;
      },
    };
  } finally {
    Module._load = originalLoad;
  }
}

assert.equal(
  routes.routeFromLocation({ search: "?section=logs", hash: "#interfaces" }),
  "logs",
  "canonical query route must win when it conflicts with a legacy hash",
);
assert.equal(
  routes.routeFromLocation({ search: "", hash: "#terminals" }),
  "terminals",
  "a legacy hash must remain readable during migration",
);
assert.equal(
  routes.routeUrl("interfaces", { pathname: "/panel", search: "?q=wan" }),
  "/panel?section=interfaces",
  "canonical route URLs must discard a bare query that the destination cannot restore",
);
assert.equal(
  routes.routeUrl("overview", { pathname: "/panel", search: "?section=overview&view=incidents&retired=1" }),
  "/panel?section=overview&view=incidents",
  "the one recognized overview subview must survive canonical Back/Forward normalization",
);
assert.equal(
  routes.routeUrl("overview", { pathname: "/panel", search: "?section=overview&view=attacker" }),
  "/panel?section=overview",
  "unknown overview view values must remain fail-closed",
);

assert.match(
  routeHook,
  /window\.addEventListener\("hashchange", sync\)/,
  "legacy hash navigation must be normalized immediately",
);
assert.match(
  routeHook,
  /const current = `\$\{window\.location\.pathname\}\$\{window\.location\.search\}\$\{window\.location\.hash\}`/,
  "normalization must detect a residual hash instead of maintaining query and hash forever",
);
assert.match(
  routeHook,
  /window\.addEventListener\("popstate", sync\)/,
  "Back and Forward must reconcile through the same canonicalization path",
);
assert.match(
  routeHook,
  /window\.history\.replaceState\([^\n]+canonical\)/,
  "legacy URL migration must replace the traversed entry rather than add history entries",
);

const browser = createWindow("/panel#terminals");
const routeHookMount = mountRouteHook(browser);
const routeController = routeHookMount.controller;
assert.equal(routeController.route, "terminals", "initial legacy hash route must render before it is migrated");
assert.deepEqual(browser.calls, [{ kind: "replace", value: "/panel?section=terminals" }], "legacy hash migration must replace, never push");

browser.setUrl("/panel?section=interfaces#logs");
browser.listeners.get("popstate")();
browser.setUrl("/panel?section=logs#interfaces");
browser.listeners.get("popstate")();
assert.deepEqual(
  browser.calls.slice(1),
  [
    { kind: "replace", value: "/panel?section=interfaces" },
    { kind: "replace", value: "/panel?section=logs" },
  ],
  "Back and Forward traversal must canonicalize each restored URL in place with query precedence",
);
routeHookMount.restore();

assert.match(runtime, /const result = await fetchPanelSnapshot\(controller\.signal\)/, "snapshot refresh must always issue its request after panel readiness checks");
assert.doesNotMatch(runtime, /if\s*\(\s*!navigator\.onLine\s*\)\s*(?:\{\s*)?return/, "navigator.onLine=false must never short-circuit a snapshot request");
assert.doesNotMatch(runtime, /phase:\s*browserOfflineHint\s*\?\s*["']offline["']/, "browser online state must not become a snapshot transport phase");
assert.match(runtime, /browserOnlineHint: boolean/, "browser online state is exposed only as a UI hint");

const refreshStart = runtime.indexOf("const refresh = useCallback");
const snapshotRequest = runtime.indexOf("const result = await fetchPanelSnapshot(controller.signal)", refreshStart);
const refreshFailure = runtime.indexOf("} catch (error) {", snapshotRequest);
const browserHint = runtime.indexOf("const browserOfflineHint", refreshFailure);
assert.ok(refreshStart >= 0 && snapshotRequest > refreshStart, "runtime refresh must contain the snapshot request");
assert.doesNotMatch(
  runtime.slice(refreshStart, snapshotRequest),
  /navigator\.onLine/,
  "browser online hint must not decide whether a ready panel issues /api/snapshot",
);
assert.ok(
  browserHint > refreshFailure,
  "browser connectivity is read only after a real snapshot request has failed",
);
assert.match(
  runtime.slice(refreshFailure, refreshFailure + 900),
  /phase:\s*current\.data\s*\?\s*[\"']recovering[\"']\s*:\s*[\"']error[\"']/,
  "only the failed request path may move an existing snapshot to recovering/error",
);
assert.match(
  runtime,
  /const onOffline = \(\) => \{[\s\S]{0,300}setBrowserOnlineHint\(false\)[\s\S]{0,300}void refresh\([\"']recovery[\"']\)/,
  "browser offline events must update the hint and still schedule a bounded recovery request",
);

async function verifyBrowserOfflineRemainsATransportHint() {
  const fetchDescriptor = Object.getOwnPropertyDescriptor(global, "fetch");
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(global, "navigator");
  const requests = [];
  Object.defineProperty(global, "navigator", {
    configurable: true,
    value: { onLine: false },
  });
  Object.defineProperty(global, "fetch", {
    configurable: true,
    writable: true,
    value: async (input) => {
      requests.push(String(input));
      throw new Error("same-origin transport rejected request");
    },
  });

  try {
    delete require.cache[require.resolve(panelApiPath)];
    const { fetchPanelSnapshot, PanelApiError } = require(panelApiPath);
    await assert.rejects(
      fetchPanelSnapshot(),
      (error) => error instanceof PanelApiError && error.code === "network_error",
      "a real request failure must surface as a transport failure rather than an offline pre-check",
    );
    assert.deepEqual(
      requests,
      ["/api/snapshot"],
      "navigator.onLine=false must still issue the same-origin snapshot request exactly once",
    );
  } finally {
    if (fetchDescriptor) Object.defineProperty(global, "fetch", fetchDescriptor);
    else delete global.fetch;
    if (navigatorDescriptor) Object.defineProperty(global, "navigator", navigatorDescriptor);
    else delete global.navigator;
  }
}

verifyBrowserOfflineRemainsATransportHint()
  .then(() => console.log("canonical URL + offline signal gate: PASS"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
