const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const inspector = fs.readFileSync(
  path.join(root, "src/panel-framework/mobile/mobile-inspector/MobileDomainInspector.tsx"),
  "utf8",
);
const connectionInspector = fs.readFileSync(
  path.join(root, "src/panel-framework/mobile/mobile-inspector/ConnectionInspector.tsx"),
  "utf8",
);
const connectionFunction = connectionInspector;

const checks = [
  {
    name: "connection inspector owns typed navigation input",
    pass: /function ConnectionInspector\(\{[\s\S]*?onNavigate[\s\S]*?\}:\s*\{/.test(connectionFunction),
  },
  {
    name: "domain inspector passes evidence-backed navigation to connection inspector",
    pass: inspector.includes('if (row.evidence.kind === "connection") return <ConnectionInspector row={row} model={model} onNavigate={onNavigate} evidenceAt={originEvidenceAt || model.observedAt} />'),
  },
  {
    name: "connection detail exposes a stable object task action",
    pass: /data-mobile-connection-object-action/.test(connectionInspector),
  },
  {
    name: "connection object task preserves terminal destination and return evidence",
    pass: connectionInspector.includes('onNavigate("terminals"') &&
      connectionInspector.includes('returnRoute: "connections"') &&
      connectionInspector.includes("evidenceAt:"),
  },
];

const report = {
  contract: "mobile-connections-object-task-v1",
  pass: checks.every((check) => check.pass),
  checks,
};

console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
