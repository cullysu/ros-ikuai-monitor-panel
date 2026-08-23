const { spawnSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const gates = [
  "check-overview-architecture.js",
  "check-overview-ikuai-static.js",
  "check-mobile-reference-model.js",
  "check-overview-investigation-actions.js",
  "check-mobile-reference-architecture.js",
  "check-normal-verdict-contract.js",
  "check-verdict-truth-contract.js",
  "check-atomic-traffic-history.js",
  "check-locale-invariant-normalization.js",
  "check-desktop-information-efficiency.js",
  "check-desktop-overview-focus-context.js",
  "check-wan-axis-label-integrity-v1.js",
];

for (const gate of gates) {
  console.log(`\n[overview] ${gate}`);
  const result = spawnSync(process.execPath, [path.join(__dirname, gate)], {
    cwd: root,
    env: {
      ...process.env,
      CODEX_MEMORY_LIMIT_MB: "2048",
      NODE_OPTIONS: "--max-old-space-size=2048",
    },
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error) {
    console.error(`[overview] ${gate}: ERROR ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`[overview] ${gate}: FAIL (${result.status})`);
    process.exit(result.status || 1);
  }
}

console.log(`\noverview current contract: PASS (${gates.length} gates)`);
console.log("mobile-telemetry model, isolated semantic ownership, accessibility structure, truth, desktop continuity, and source-built WAN geometry are all required.");
console.log("LIMITATION: mobile telemetry runtime, original-image Product/Visual sign-off, and full release matrices remain separate release gates.");
