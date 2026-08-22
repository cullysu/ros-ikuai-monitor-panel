"use strict";

const { closeRuntime, launchRuntime, login, visitRoute } = require("./acceptance/accessibility-v2/runtime");

const cells = [
  { id: "landscape667", width: 667, height: 375 },
  { id: "landscape844", width: 844, height: 390 },
];

async function runCell(cell) {
  let runtime = null;
  try {
    runtime = await launchRuntime({ headless: true, viewport: { width: cell.width, height: cell.height }, screen: { width: cell.width, height: cell.height }, isMobile: false, hasTouch: false });
    const url = new URL(runtime.mock.url);
    url.searchParams.set("surface", "desktop");
    url.searchParams.set("section", "overview");
    await login(runtime.page, url.toString());
    runtime.mock.state.scenario = "single";
    await runtime.page.locator("main[data-desktop-overview]").waitFor({ state: "visible", timeout: 30_000 });
    await visitRoute(runtime.page, runtime.mock.url, "interfaces", { requireWorkspace: true, runtimePhase: "current" });
    await runtime.page.locator('main[data-panel-route="interfaces"]').waitFor({ state: "visible", timeout: 30_000 });
    return { id: cell.id, width: cell.width, height: cell.height, pass: true, overview: true, interfaces: true };
  } finally {
    if (runtime) await closeRuntime(runtime);
  }
}

(async () => {
  const results = [];
  for (const cell of cells) {
    try { results.push(await runCell(cell)); }
    catch (error) { results.push({ id: cell.id, pass: false, error: String(error?.message || error) }); }
  }
  const report = { pass: results.length === cells.length && results.every((cell) => cell.pass), contract: "wide-landscape-browser-owner-v1", cells: results };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.pass) process.exitCode = 1;
})().catch((error) => { process.stderr.write(`${error?.stack || error}\n`); process.exitCode = 1; });
