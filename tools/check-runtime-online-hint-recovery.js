const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");
const targetPath = path.join(ROOT, "src", "panel-framework", "runtime", "usePanelRuntime.ts");
const source = fs.readFileSync(targetPath, "utf8");
const refreshStart = source.indexOf("  const refresh = useCallback");
const refreshTail = refreshStart >= 0 ? source.slice(refreshStart) : "";
const refreshBoundary = /\r?\n  useEffect\(\(\) => \{\r?\n    void retryConnectionStatus\(\);/.exec(refreshTail);
const refreshEnd = refreshBoundary && typeof refreshBoundary.index === "number"
  ? refreshStart + refreshBoundary.index
  : -1;
const refreshSource = refreshStart >= 0 && refreshEnd > refreshStart ? source.slice(refreshStart, refreshEnd) : "";
const failureStart = refreshSource.indexOf("    } catch (error) {");
const failureEnd = refreshSource.indexOf("    } finally {", failureStart);
const snapshotFailureBranch = failureStart >= 0 && failureEnd > failureStart ? refreshSource.slice(failureStart, failureEnd) : "";

function loadHintReducer() {
  const start = source.indexOf("export type BrowserOnlineHintSignal");
  const end = source.indexOf("export interface PanelConnectionState");
  if (start < 0 || end < start) throw new Error("browser online hint reducer was not found");

  const compiled = ts.transpileModule(source.slice(start, end), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "module", compiled)(module.exports, module);
  return module.exports.nextBrowserOnlineHint;
}

const nextBrowserOnlineHint = loadHintReducer();
const checks = [
  ["offline event sets only the browser transport hint", nextBrowserOnlineHint("offline") === false],
  ["online event clears the offline hint", nextBrowserOnlineHint("online") === true],
  ["successful same-origin snapshot response clears a stale offline hint", nextBrowserOnlineHint("offline") === false && nextBrowserOnlineHint("same-origin-response") === true],
  ["snapshot requests are not gated by navigator.onLine", !/if\s*\([^)]*navigator\.onLine[^)]*\)\s*(?:return|throw)/.test(source)],
  ["snapshot success applies the local recovery signal", /await fetchPanelSnapshot\(controller\.signal\);[\s\S]*?setBrowserOnlineHint\(nextBrowserOnlineHint\("same-origin-response"\)\);/.test(source)],
  ["snapshot failure does not assert a RouterOS, WAN, or business outage", snapshotFailureBranch.includes("setSnapshot(") && !snapshotFailureBranch.includes("setConnection(")],
  ["online and offline listeners are registered and cleaned up", source.includes('window.addEventListener("offline", onOffline);')
    && source.includes('window.addEventListener("online", onOnline);')
    && source.includes('window.removeEventListener("offline", onOffline);')
    && source.includes('window.removeEventListener("online", onOnline);')],
];

const failed = checks.filter(([, passed]) => !passed).map(([name]) => name);
const report = {
  pass: failed.length === 0,
  contract: "runtime-online-hint-recovery-v1",
  checks: Object.fromEntries(checks),
  failed,
};

console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
