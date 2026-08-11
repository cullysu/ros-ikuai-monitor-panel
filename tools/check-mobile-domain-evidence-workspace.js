/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const failures = [];
let checks = 0;
const expect = (condition, message) => {
  checks += 1;
  if (!condition) failures.push(message);
};

const workspace = read("src/panel-framework/mobile/MobileDomainWorkspace.tsx");
const evidenceWorkspace = read("src/panel-framework/mobile/MobileDomainEvidenceWorkspace.tsx");
const foundation = read("src/panel-framework/mobile/mobile-domain-foundation.css");
const layout = read("src/panel-framework/mobile/mobile-domain.css");

expect(workspace.includes('import { MobileDomainEvidenceWorkspace } from "./MobileDomainEvidenceWorkspace";'), "MobileDomainWorkspace must own the empty-state evidence workspace");
expect(workspace.includes("const showEvidenceWorkspace = Boolean(recoveryState && !visibleRows.length && !allRows.length);"), "Evidence workspace must activate only for an actual empty recovery collection");
expect(workspace.includes('const deferHistoricalBoundary = recoveryState === "historical" && visibleRows.length > 0;'), "Historical collections must keep inspectable records ahead of advisory recovery copy");
expect(workspace.indexOf("showEvidenceWorkspace ? null : visibleRows.length ?") < workspace.lastIndexOf("deferHistoricalBoundary ? <RouteEvidenceBoundary"), "Deferred historical guidance must follow the object list rather than push records below the fold");
expect(workspace.includes('"tablet-evidence"'), "768–1199 recovery states must have a dedicated tablet evidence layout");
expect(workspace.includes('"phone-evidence"') && workspace.includes('"compact-evidence"'), "Phone and compact recovery states must expose dedicated evidence layouts");
expect(workspace.includes("!showEvidenceWorkspace ? <div className=\"mdw-list-heading\">"), "Recovery evidence layouts must not render a meaningless zero-object toolbar");
expect(workspace.includes("showEvidenceWorkspace ? null : visibleRows.length ?"), "The generic empty illustration must not render alongside the evidence workspace");
expect(workspace.includes("!showEvidenceWorkspace && ((!showInspector && !showCollectionLedger) || model.visualization || showTabletCollectionSummary)"), "Evidence workspace must replace the duplicate metric-summary fallback");
expect(evidenceWorkspace.includes("missingEvidenceLabels(model)"), "Missing scope must derive from the shared evidence model");
expect(evidenceWorkspace.includes('const lastSuccessfulSnapshot = model.observedAt || null;'), "Last-success evidence must never fall back to the failed-attempt update time");
expect(evidenceWorkspace.includes('data-mobile-evidence-workspace-fact="last-success"'), "Recovery evidence must name the last successful business snapshot explicitly");
expect(evidenceWorkspace.includes('<small>最近成功业务快照</small>'), "Recovery evidence must distinguish a successful snapshot from a generic attempt time");
expect(evidenceWorkspace.includes('data-mobile-evidence-workspace-actions="recovery-boundary"'), "Investigation entry must remain the adjacent real recovery boundary");
expect(!evidenceWorkspace.includes("onNavigate"), "Evidence workspace must not duplicate or invent recovery routes");
expect(evidenceWorkspace.includes('className="mdi-facts" role="list"'), "Evidence facts must reuse the bounded inspector grammar instead of adding another card system");
expect((evidenceWorkspace.match(/data-mobile-evidence-workspace-fact=/g) || []).length === 4, "Evidence workspace must expose exactly four distinct facts");
expect(!/\|\|\s*["']?0/.test(evidenceWorkspace), "Missing evidence must never be rewritten as a measured zero");
expect(foundation.includes(".mdw-evidence-workspace"), "Phone empty recovery state needs a continuous evidence workspace");
expect(layout.includes('data-mobile-domain-layout="tablet-evidence"'), "Tablet evidence layout needs an explicit split-pane contract");
expect(layout.includes('data-mobile-domain-layout="phone-evidence"') && layout.includes('data-mobile-domain-layout="compact-evidence"'), "Phone and compact evidence layouts need an explicit one-column contract");
expect(layout.includes("min-height: min(440px, calc(100dvh - 153px))"), "Tablet evidence workspace must occupy bounded task space rather than leaving a blank pane");

if (failures.length) {
  console.error(`mobile domain evidence workspace contract failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`mobile domain evidence workspace contract passed (${checks} checks)`);
}
