#!/usr/bin/env node

/**
 * Step313 red/green contract for the active query-only route writer.
 * Legacy hashes may be read for migration, but active navigation must not
 * keep two URL writers or two history mutations for one user action.
 */

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const routes = read("src/panel-framework/routes/panelRoutes.ts");
const hook = read("src/panel-framework/routes/usePanelRoute.ts");
const index = read("public/index.html");
const dispatcher = read("panel_backend/http_dispatcher.py");

const navigateStart = hook.indexOf("const navigate = useCallback");
const navigateEnd = hook.indexOf("}, [route]);", navigateStart);
const navigateBlock = navigateStart >= 0 && navigateEnd > navigateStart
  ? hook.slice(navigateStart, navigateEnd)
  : "";
const normalNavigateBlock = navigateBlock.split("if (options.replace)")[0] || "";

const checks = [
  {
    name: "legacy hash is explicitly named as migration input",
    pass: /const legacyHash\s*=/.test(routes) && routes.includes("routeFromLocation"),
  },
  {
    name: "normal navigation has exactly one history writer",
    pass: normalNavigateBlock.includes("overviewReturnFocusRef.current") &&
      !normalNavigateBlock.includes("window.history.replaceState") &&
      (navigateBlock.match(/else window\.history\.pushState\(/g) || []).length === 1,
  },
  {
    name: "return focus is kept outside a pre-push URL mutation",
    pass: hook.includes("overviewReturnFocusRef") && !normalNavigateBlock.includes("window.history.replaceState"),
  },
  {
    name: "public RouterOS entry does not load the retired hash author",
    pass: !index.includes("readonly-diagnostics.js") && dispatcher.includes('private_public_assets = {"readonly-diagnostics.js"}'),
  },
];

for (const check of checks) {
  console.log(`${check.pass ? "PASS" : "FAIL"} ${check.name}`);
}

const failed = checks.filter((check) => !check.pass);
if (failed.length) {
  console.error(`[canonical-route] FAIL ${failed.length}/${checks.length}`);
  process.exitCode = 1;
} else {
  console.log(`[canonical-route] PASS ${checks.length}/${checks.length}`);
}
