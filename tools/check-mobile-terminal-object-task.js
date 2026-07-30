const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const terminalInspector = fs.readFileSync(
  path.join(root, "src/panel-framework/mobile/mobile-inspector/TerminalLogInspectors.tsx"),
  "utf8",
);
const domainInspector = fs.readFileSync(
  path.join(root, "src/panel-framework/mobile/mobile-inspector/MobileDomainInspector.tsx"),
  "utf8",
);

const checks = [
  {
    name: "terminal inspector owns typed navigation input",
    pass: /export function TerminalInspector\(\{[\s\S]*?onNavigate[\s\S]*?\}:\s*\{/.test(terminalInspector),
  },
  {
    name: "domain inspector passes navigation owner to terminal inspector",
    pass: domainInspector.includes("<TerminalInspector") &&
      domainInspector.includes("onNavigate={onNavigate}") &&
      domainInspector.includes("evidenceAt={originEvidenceAt || model.observedAt}"),
  },
  {
    name: "terminal detail exposes a stable object action selector",
    pass: /data-mobile-terminal-object-action/.test(terminalInspector),
  },
  {
    name: "terminal object action preserves destination and evidence context",
    pass: terminalInspector.includes('onNavigate("interfaces"') &&
      terminalInspector.includes('onNavigate("connections"') &&
      terminalInspector.includes('returnRoute: "terminals"') &&
      terminalInspector.includes("evidenceAt,"),
  },
];

const report = {
  contract: "mobile-terminal-object-task-v1",
  pass: checks.every((check) => check.pass),
  checks,
};

console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
