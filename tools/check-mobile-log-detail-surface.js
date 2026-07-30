const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const inspector = read("src/panel-framework/mobile/mobile-inspector/MobileDomainInspector.tsx");
const logInspector = read("src/panel-framework/mobile/mobile-inspector/TerminalLogInspectors.tsx");
const workspace = read("src/panel-framework/mobile/MobileDomainWorkspace.tsx");
const styles = read("src/panel-framework/mobile/mobile-domain.css");
const runtime = read("tools/check-panel-runtime-browser.js");

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const messageReferences = `${inspector}\n${logInspector}`.match(/(?:logEvidence|evidence)\.message/g) || [];
const hasNovelEvidenceSections = ["事件证据", "相邻事件", "记录身份"].every((title) => logInspector.includes(title));
const hasStableTitle = /logEvidence\s*\?\s*"日志事件"/.test(inspector);
const hasStructuredMessage = /label:\s*"事件正文"/.test(logInspector) &&
  /displayValue\(evidence\.message/.test(logInspector);
const messageNotUsedAsHeading = !/displayValue\(logEvidence\.message/.test(inspector);
const hasDetailOwner = inspector.includes('data-mobile-log-detail="v1"') ||
  inspector.includes('data-mobile-log-detail={logEvidence ? "v1" : undefined}');

expect(hasDetailOwner, "log detail has no explicit v1 surface owner");
expect(inspector.includes("data-mobile-detail-novel-evidence"), "log detail has no novel-evidence marker");
expect(hasNovelEvidenceSections, "log detail does not expose the required new-evidence sections");
expect(hasStableTitle, "log detail does not use the stable 日志事件 title");
expect(hasStructuredMessage, "log detail does not expose the event message in a structured 事件正文 fact");
expect(messageNotUsedAsHeading, "event message is still promoted into the object heading");
expect(messageReferences.length === 1, "event message is not constrained to one structured body reference");
expect(!logInspector.includes("事件记录"), "generic log detail still contains a repeated event-record section");
expect(workspace.includes('data-mobile-detail-surface={selectedRow?.evidence.kind === "log" ? "log" : undefined}'), "workspace does not bind the selected log to the detail surface");
expect(styles.includes('.mdw-shell[data-mobile-log-detail="v1"]'), "mobile log detail has no natural-height surface CSS");
expect(styles.includes("min-height: auto"), "mobile log detail does not release viewport-filler min-height");
expect(runtime.includes("mobile-log-detail-surface-v1"), "runtime browser contract is not bound to mobile-log-detail-surface-v1");

const report = {
  pass: failures.length === 0,
  contract: "mobile-log-detail-surface-v1",
  implementationState: failures.length ? "expected-red" : "focused-green",
  failures,
  checks: {
    surfaceOwner: hasDetailOwner,
    novelEvidence: inspector.includes("data-mobile-detail-novel-evidence") && hasNovelEvidenceSections,
    stableTitle: hasStableTitle,
    structuredMessage: hasStructuredMessage,
    messageNotUsedAsHeading,
    singleStructuredMessage: messageReferences.length === 1,
    noEventRecordReplay: !logInspector.includes("事件记录"),
    workspaceBinding: workspace.includes('data-mobile-detail-surface={selectedRow?.evidence.kind === "log" ? "log" : undefined}'),
    naturalHeight: styles.includes('.mdw-shell[data-mobile-log-detail="v1"]') && styles.includes("min-height: auto"),
    runtimeBinding: runtime.includes("mobile-log-detail-surface-v1"),
  },
};

console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
