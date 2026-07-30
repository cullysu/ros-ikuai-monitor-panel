const fs = require("node:fs");

const foundation = fs.readFileSync(
  "src/panel-framework/mobile/mobile-patrol-foundation.css",
  "utf8",
);
const patrol = fs.readFileSync(
  "src/panel-framework/mobile/mobile-patrol.css",
  "utf8",
);
const forcedColors = fs.readFileSync(
  "src/panel-framework/mobile/mobile-forced-colors.css",
  "utf8",
);

function rule(text, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "s"))?.[1] || "";
}

const incidentProof = rule(patrol, ".mp-shell .mp-proof");
const primaryRisk = rule(patrol, '.mp-incident[data-mobile-incident-task-role="primary-risk"]');
const checks = [
  {
    name: "incident proof leaves the primary risk scan anchor",
    pass: /background:\s*none/.test(incidentProof),
    detail: "the three factual proof cells must not form a second filled incident plane",
  },
  {
    name: "primary risk keeps the state surface",
    pass: /background:\s*var\(--mp-surface-base\)/.test(primaryRisk),
    detail: "the primary object remains the only filled risk surface",
  },
  {
    name: "incident proof remains separated by a quiet rule",
    pass: /border-top:\s*1px\s+solid\s+var\(--mp-line\)/.test(incidentProof),
    detail: "flattening the proof rail must not erase its group boundary",
  },
  {
    name: "forced-colors keeps incident proof legible",
    pass: /forced-colors:\s*active/.test(forcedColors) &&
      /background:\s*Canvas/.test(forcedColors),
    detail: "the flattened proof rail inherits the forced-colors Canvas plane without adding a duplicate rule",
  },
  {
    name: "proof cells retain touch-safe sizing",
    pass: /\.mp-proof\s*>\s*div\s*\{[^}]*padding:\s*12px\s+11px\s+13px/s.test(foundation),
    detail: "surface reduction must not reduce the facts below the existing touch-safe rhythm",
  },
];

const result = {
  pass: checks.every((check) => check.pass),
  contract: "mobile-incident-proof-relief-v3",
  checks,
  failures: checks.filter((check) => !check.pass).map((check) => check.name),
};
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
