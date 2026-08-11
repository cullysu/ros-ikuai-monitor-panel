#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { readRuntimeReport, runtimeIdentityDetail } = require("./runtime-report-identity");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const checks = [];
const check = (name, pass, detail) => checks.push({ name, pass: Boolean(pass), detail });

const surface = read("src/panel-framework/mobile/useMobilePanelSurface.ts");
const workspace = read("src/panel-framework/mobile/MobileDomainWorkspace.tsx");
const css = read("src/panel-framework/mobile/mobile-domain.css");
const capabilityTable = read("docs/decision-system/responsive-capabilities.md");
const runtimeBinding = readRuntimeReport(root);
const requireRuntime = process.argv.includes("--require-current-runtime");
const runtime = runtimeBinding.current ? runtimeBinding.report : null;
const reportedRuntime = runtimeBinding.report;
const runtimeIdentity = runtimeBinding.identity;
const runtimeSkipped = !runtimeBinding.current && !requireRuntime;
const screenshots = new Set(Array.isArray(runtime?.screenshots) ? runtime.screenshots : []);
const inspectorBlock = css.match(/\.is-tablet-workbench \.mdw-inspector\s*\{([\s\S]*?)\n\s*\}/)?.[1] || "";
const releaseEvidenceEligible = runtimeBinding.current
  && runtime?.source === "playwright-production-runtime"
  && runtime.pass === true
  && runtime.commit === runtimeIdentity.commit
  && runtime.worktreeClean === true
  && runtimeIdentity.worktreeClean === true
  && runtime.worktreeFingerprint === runtimeIdentity.worktreeFingerprint
  && runtime.releaseEvidenceEligible === true;

check("active responsive capability table", /^- status:\s*`active[^`]*`/m.test(capabilityTable));
check("tablet workbench query is explicit", /DOMAIN_TABLET_WORKBENCH_QUERY\s*=\s*"\(min-width: 768px\) and \(max-width: 1199px\) and \(min-height: 700px\)"/.test(surface));
check(
  "compact fallback remains explicit",
  /COMPACT_WORKBENCH_QUERY\s*=\s*"\(min-width: 600px\) and \(max-width: 767px\) and \(min-height: 700px\)"/.test(surface)
    && /COMPACT_TASK_QUERY\s*=\s*COMPACT_WORKBENCH_QUERY/.test(surface),
  "compact mode owns 600–767px only when at least 700px of vertical task space is available",
);
check(
  "compact/workbench boundaries are adjacent and exclusive",
  /COMPACT_WORKBENCH_QUERY\s*=\s*"\(min-width: 600px\) and \(max-width: 767px\) and \(min-height: 700px\)"/.test(surface)
    && /COMPACT_TASK_QUERY\s*=\s*COMPACT_WORKBENCH_QUERY/.test(surface)
    && /DOMAIN_TABLET_WORKBENCH_QUERY\s*=\s*"\(min-width: 768px\) and \(max-width: 1199px\) and \(min-height: 700px\)"/.test(surface),
  "at qualifying heights the capability queries have no 767/768 gap or overlap",
);
check(
  "short landscape remains a continuous phone task",
  !/COMPACT_WORKBENCH_QUERY[^\n]*max-height/.test(surface)
    && !/DOMAIN_TABLET_WORKBENCH_QUERY[^\n]*max-height/.test(surface)
    && /COMPACT_WORKBENCH_QUERY[^\n]*min-height: 700px/.test(surface)
    && /DOMAIN_TABLET_WORKBENCH_QUERY[^\n]*min-height: 700px/.test(surface),
  "below 700px neither split capability matches, so 667×375 and 844×390 retain the phone flow",
);
check(
  "narrow tablet resource workbench keeps two bounded panes",
  !/@media \(min-width: 768px\) and \(max-width: 799px\)[\s\S]{0,1800}trafficLoad[\s\S]{0,700}display:\s*flex[\s\S]{0,220}flex-direction:\s*column/.test(css)
    && /\.is-tablet-workbench\s+\.mdw-layout[\s\S]{0,900}grid-template-columns:\s*minmax\(268px[\s\S]*minmax\(420px/.test(css),
  "768–799px resource workspaces use the shared bounded grid; they do not push object evidence below the signal column",
);
check("workbench source has one capability owner", /const tabletWorkbench = useMediaCapability\(DOMAIN_TABLET_WORKBENCH_QUERY\)/.test(workspace));
check(
  "object count does not select layout",
  !/short-stack/.test(workspace) && !/layoutMode[\s\S]{0,500}visibleRows\.length/.test(workspace),
);
check("list pane owns natural height", /\.is-tablet-workbench \.mdw-list-pane\s*\{[\s\S]*?align-self:\s*start;[\s\S]*?height:\s*fit-content;/.test(css));
check("inspector pane owns natural height", /\.is-tablet-workbench \.mdw-inspector\s*\{[\s\S]*?align-self:\s*start;[\s\S]*?height:\s*fit-content;/.test(css), inspectorBlock);
check("inspector pane bounds long evidence", /\.is-tablet-workbench \.mdw-inspector\s*\{[\s\S]*?max-height:\s*calc\(/.test(css), inspectorBlock);
check(
  "runtime identity is current when runtime evidence is required",
  !requireRuntime || runtimeBinding.current,
  runtimeIdentityDetail(runtimeBinding),
);
check(
  "current runtime artifact provides tablet support evidence when applied",
  runtimeSkipped || Boolean(runtime),
  runtimeIdentityDetail(runtimeBinding),
);
check("tablet screenshot set is present when runtime evidence is applied", runtimeSkipped || [
  "tablet-network-768.png",
  "tablet-network-844.png",
  "tablet-resource-investigation-context-768.png",
  "tablet-object-continuity-1199.png",
].every((name) => screenshots.has(name)));

const failed = checks.filter((entry) => !entry.pass).map((entry) => entry.name);
const report = {
  pass: failed.length === 0,
  contract: "tablet-layout-capability-v2",
  implementationState: failed.length ? "expected-red" : runtimeBinding.current ? "focused-runtime-green" : "static-green-runtime-pending",
  evidenceOnly: true,
  releaseEligible: releaseEvidenceEligible,
  runtimeIdentity: runtimeIdentityDetail(runtimeBinding),
  runtimeChecksApplied: runtimeBinding.current,
  runtimeArtifact: {
    commit: reportedRuntime?.commit || null,
    worktreeFingerprint: reportedRuntime?.worktreeFingerprint || null,
    generatedAt: reportedRuntime?.generatedAt || null,
    reportWorktreeClean: reportedRuntime?.worktreeClean ?? null,
    currentWorktreeClean: runtimeIdentity.worktreeClean,
    fingerprintMatches: reportedRuntime?.worktreeFingerprint === runtimeIdentity.worktreeFingerprint,
    releaseEvidenceEligible: reportedRuntime?.releaseEvidenceEligible ?? null,
  },
  checks,
  failed,
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failed.length) process.exitCode = 1;
