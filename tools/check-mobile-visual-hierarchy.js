const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const files = {
  screen: fs.readFileSync(path.join(ROOT, "src", "panel-framework", "mobile", "MobilePatrolScreen.tsx"), "utf8"),
  proof: fs.readFileSync(path.join(ROOT, "src", "panel-framework", "mobile", "MobileProofStrip.tsx"), "utf8"),
  focus: fs.readFileSync(path.join(ROOT, "src", "panel-framework", "mobile", "MobileFocusObject.tsx"), "utf8"),
  traffic: fs.readFileSync(path.join(ROOT, "src", "panel-framework", "mobile", "MobilePatrolTraffic.tsx"), "utf8"),
  ledger: fs.readFileSync(path.join(ROOT, "src", "panel-framework", "mobile", "MobileSteadyDecisionLedger.tsx"), "utf8"),
  css: fs.readFileSync(path.join(ROOT, "src", "panel-framework", "mobile", "mobile-patrol-foundation.css"), "utf8")
    + "\n"
    + fs.readFileSync(path.join(ROOT, "src", "panel-framework", "mobile", "mobile-patrol.css"), "utf8"),
};

function block(source, selector) {
  const start = source.indexOf(selector + " {");
  if (start < 0) return "";
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return "";
}

const proof = block(files.css, ".mp-proof");
const focus = block(files.css, ".mp-focus > button");
const focusIcon = block(files.css, ".mp-focus-icon");
const traffic = block(files.css, ".mp-traffic");
const checks = {
  verdictHasVisualOwner: /data-mobile-visual-layer="verdict"/.test(files.screen),
  proofHasVisualOwner: /data-mobile-visual-layer="proof"/.test(files.proof),
  focusHasVisualOwner: /data-mobile-visual-layer="focus"/.test(files.focus),
  signalHasVisualOwner: /data-mobile-visual-layer="signal"/.test(files.traffic),
  decisionHasVisualOwner: /data-mobile-visual-layer="decision"/.test(files.ledger),
  verdictHasStateMark: /\.mp-command-icon\s*{[\s\S]*?color:\s*var\(--mp-blue-dark\)/.test(files.css)
    && /\.mp-shell\.is-(?:danger|warn|missing)\s+\.mp-command-icon\s*{[\s\S]*?color:\s*var\(--mp-(?:danger|warn)\)/.test(files.css),
  proofUsesQuietSurface: /background:\s*var\(--mp-surface-quiet\)\s*;/.test(proof),
  focusUsesCalmEdgeSurface: /background:\s*transparent\s*;/.test(focus)
    && !/box-shadow:/.test(focus),
  focusHasObjectMark: /\.mp-focus-icon\s*{[\s\S]*?width:\s*24px;[\s\S]*?height:\s*24px;[\s\S]*?border:\s*0;[\s\S]*?border-radius:\s*0;[\s\S]*?background:\s*transparent/.test(focusIcon),
  focusHasCompactRhythm: /min-height:\s*64px;/.test(focus),
  signalUsesBaseSurface: /background:\s*(?:var\(--mp-surface-base\)|transparent|none)\s*;/.test(traffic),
  noSub12Text: !/(?:font-size|line-height):\s*(?:[0-9]|1[01])px/.test(files.css),
};
const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const report = {
  pass: failed.length === 0,
  contract: "mobile-visual-hierarchy-v3",
  implementationState: reportState(failed),
  checks,
  failed,
};
function reportState(failures) {
  return failures.length ? "expected-red" : "focused-green";
}
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.pass ? 0 : 1;
