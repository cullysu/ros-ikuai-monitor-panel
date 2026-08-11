#!/usr/bin/env node

/**
 * Write-ahead contract for the shared incident priority grammar.
 *
 * The desktop incident surface must not place a secondary queue before the
 * object that the operator is expected to inspect first. This is a semantic
 * order contract, not a Product/Design/Visual sign-off.
 */
const fs = require("node:fs");
const path = require("node:path");
const { readRuntimeReport, runtimeIdentityDetail } = require("./runtime-report-identity");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "src", "panel-framework", "overview", "desktop-overview", "DesktopIncidentDocket.tsx");
const workspaceSourcePath = path.join(root, "src", "panel-framework", "overview", "desktop-overview", "DesktopOverviewTask.tsx");
const source = fs.readFileSync(sourcePath, "utf8");
const workspaceSource = fs.readFileSync(workspaceSourcePath, "utf8");
const runtimeBinding = readRuntimeReport(root);
const requireRuntime = process.argv.includes("--require-current-runtime");
const runtimeSkipped = !runtimeBinding.current && !requireRuntime;
const report = runtimeBinding.current ? runtimeBinding.report : null;
const desktopDetails = (report?.checks || [])
  .filter((check) => check.name === "desktop composite task keeps the approved primary-secondary relationship without clipping or overflow")
  .map((check) => check.detail)
  .filter((detail) => detail?.viewport?.width >= 1200);

const sourceWorkspace = source.indexOf("<DesktopIncidentWorkspace");
const sourceSecondary = source.indexOf("{secondaryRisks}");
const sourceHasExplicitOwner = /data-desktop-incident-priority="primary-object"/.test(workspaceSource) &&
  /data-desktop-incident-priority="secondary-queue"/.test(source);
const runtimeRecords = desktopDetails.map((detail) => ({
  viewport: detail.viewport,
  workspaceTop: detail.desktopWorkspaceTop ?? null,
  queueTop: detail.queueRect?.top ?? null,
  queueBottom: detail.queueRect?.bottom ?? null,
  queueBeforeWorkspace: Boolean(
    typeof detail.desktopWorkspaceTop === "number" && typeof detail.queueRect?.top === "number" &&
      detail.queueRect.top < detail.desktopWorkspaceTop
  ),
}));

const checks = {
  sourceRendersPrimaryWorkspaceBeforeSecondaryQueue: sourceWorkspace >= 0 && sourceSecondary > sourceWorkspace,
  sourceDeclaresExplicitPriorityOwners: sourceHasExplicitOwner,
  runtimeIdentityIsCurrentWhenRequired: !requireRuntime || runtimeBinding.current,
  freshDesktopCompositeRecordsPresent: runtimeSkipped || runtimeRecords.length >= 2,
  freshDesktopCompositeRendersWorkspaceBeforeQueue: runtimeSkipped || (runtimeRecords.length >= 2 && runtimeRecords.every((record) => !record.queueBeforeWorkspace)),
};

const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  pass: failed.length === 0,
  contract: "cross-surface-incident-priority-v1",
  implementationState: failed.length === 0 ? runtimeSkipped ? "static-pending" : "focused-engineering-green" : "expected-red",
  scope: "desktop composite interface incident at 1200px+; mobile relationship remains the reference evidence",
  sourceOrder: { workspace: sourceWorkspace, secondaryQueue: sourceSecondary },
  runtimeRecords,
  runtimeIdentity: runtimeIdentityDetail(runtimeBinding),
  checks,
  failed,
  releaseEvidenceEligible: false,
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.pass ? 0 : 1;
