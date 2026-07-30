const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const domainCss = [
  "mobile-domain-foundation.css",
  "mobile-domain.css",
  "mobile-domain-next-evidence.css",
  "mobile-domain-large-text.css",
].map((file) => read("src", "panel-framework", "mobile", file)).join("\n");
const patrolCss = [
  "mobile-patrol-foundation.css",
  "mobile-patrol.css",
].map((file) => read("src", "panel-framework", "mobile", file)).join("\n");
const connectionCss = read("src", "panel-framework", "connection", "router-connection.css");
const navigationCss = read("src", "panel-framework", "sections", "section-console.css");
const surface = read("src", "panel-framework", "mobile", "useMobilePanelSurface.ts");
const domainWorkspace = read("src", "panel-framework", "mobile", "MobileDomainWorkspace.tsx");
const ledger = read("src", "panel-framework", "mobile", "MobileEvidenceLedger.tsx");
const definitions = read("src", "panel-framework", "mobile", "mobileDomainDefinitions.ts");
const patrolActions = read("src", "panel-framework", "mobile", "MobilePatrolActions.tsx");
const investigationActions = read("src", "panel-framework", "overview", "evidence-model", "buildOverviewInvestigationActions.ts");
const workspacePreview = read("src", "panel-framework", "mobile", "mobileWorkspacePreview.ts");
const productLoop = read(".agents", "skills", "router-panel-product-loop", "SKILL.md");
const emilAdapter = read(".agents", "skills", "router-panel-product-loop", "references", "emil-design-engineering.md");

function luminance(hex) {
  const channels = [1, 3, 5]
    .map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((left, right) => right - left);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function token(source, name) {
  const match = source.match(new RegExp("--" + name + ":\\s*(#[0-9a-f]{6})", "i"));
  assert.ok(match, "missing color token --" + name);
  return match[1];
}

function blockHas(source, selector, declaration) {
  const escaped = selector.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const block = source.match(new RegExp(escaped + "\\s*\\{[^}]*" + declaration + "[^}]*\\}", "s"));
  assert.ok(block, selector + " must include " + declaration);
}

assert.match(surface, /max-width:\s*1199px/);
assert.match(surface, /COMPACT_TASK_QUERY.*600px.*767px/s);
assert.match(surface, /TABLET_WORKBENCH_QUERY.*768px.*1199px/s);
assert.match(surface, /DOMAIN_TABLET_WORKBENCH_QUERY.*768px.*1199px/s);
assert.doesNotMatch(
  [domainCss, patrolCss, connectionCss, navigationCss, surface].join("\n"),
  /1023px/,
  "the compact workspace must not split at 1024px",
);
assert.doesNotMatch(domainCss + patrolCss, /(?:linear|radial)-gradient\(/, "mobile operations surfaces use solid layers");
assert.doesNotMatch(
  domainWorkspace,
  /visibleRows\.length\s*(?:<=|<)\s*4|shortTabletList/,
  "tablet task architecture must follow viewport capability, not sparse object count",
);
assert.doesNotMatch(
  domainCss,
  /\.mdi-section\.is-(?:warn|danger)\s*\{[^}]*border-left:\s*(?:[2-9]|\d{2,})px/si,
  "inspector severity must not add a decorative side tab to an already-labeled evidence group",
);
blockHas(domainCss, ".mdi-domain-body", "margin:\\s*0");
blockHas(domainCss, ".mdi-domain-body", "border:\\s*0");
blockHas(domainCss, ".mdi-domain-body", "border-radius:\\s*0");
blockHas(domainCss, ".mdi-section", "border:\\s*0");
const patrolRadii = [...patrolCss.matchAll(/border-radius:\s*([^;]+);/g)]
  .map((match) => match[1].trim());
assert.deepEqual(
  [...new Set(patrolRadii)].sort(),
  ["0", "2px", "8px", "50%", "inherit"].sort(),
  "mobile patrol radii must stay within the compact surface/indicator family",
);
assert.doesNotMatch(patrolCss, /min-height:\s*clamp\(620px/, "tablet columns must not be stretched for symmetry");
assert.match(ledger, /userOverrideRef/);
assert.match(ledger, /open=\{open\}/);
assert.doesNotMatch(ledger, /ledger\.open\s*=/, "resize must not mutate the native disclosure behind the user");

for (const [source, prefix, surfaces] of [
  [domainCss, "mdw", ["#fbfdfe", "#eef2f4", "#f2f6f8"]],
  [patrolCss, "mp", ["#fbfdfe", "#eef2f4", "#f3f7f9"]],
]) {
  for (const name of ["muted", "faint"]) {
    const foreground = token(source, prefix + "-" + name);
    for (const background of surfaces) {
      assert.ok(
        contrast(foreground, background) >= 4.5,
        "--" + prefix + "-" + name + " must reach 4.5:1 on " + background,
      );
    }
  }
}

blockHas(domainCss, ".mdw-search button", "width:\\s*44px");
blockHas(domainCss, ".mdw-search button", "height:\\s*44px");
blockHas(domainCss, ".mdw-filter-row button", "min-height:\\s*44px");
blockHas(domainCss, ".mdw-filter-row > label", "min-height:\\s*44px");
blockHas(domainCss, ".mdw-filter-row select", "min-height:\\s*44px");
blockHas(connectionCss, ".router-field input", "min-height:\\s*44px");
blockHas(connectionCss, ".router-segmented-control button", "min-height:\\s*44px");
blockHas(connectionCss, ".router-saved-select select", "min-height:\\s*44px");
blockHas(navigationCss, ".panel-task-navigation button", "min-height:\\s*52px");

for (const required of [
  'defaultSort: "time-desc"',
  '"severity-error"',
  '"severity-warning"',
  'defaultSort: "traffic-desc"',
  '"connections-desc"',
  '"address-asc"',
  'searchPlaceholder: "告警、链、动作或说明"',
]) {
  assert.ok(definitions.includes(required), "missing domain-specific control: " + required);
}

assert.match(productLoop, /emil-design-engineering\.md/);
for (const required of ["emilkowalski/skills", "Frequency", "Interruption", "prefers-reduced-motion", "MIT"]) {
  assert.ok(emilAdapter.includes(required), "missing Emil design-engineering adapter contract: " + required);
}
assert.doesNotMatch(
  [domainCss, patrolCss, connectionCss, navigationCss].join("\n"),
  /transition\s*:\s*all\b/i,
  "operations UI must never animate all properties",
);
assert.match(domainCss + patrolCss, /prefers-reduced-motion/);
assert.match(patrolActions, /overviewInvestigationHeading/);
assert.match(investigationActions, /action\.mode === "investigation"/);
assert.match(investigationActions, /关联工作区/);
assert.match(investigationActions, /继续核对相关证据/);
assert.doesNotMatch(patrolActions, /处置入口/, "route-only actions must not claim object-level remediation context");
assert.doesNotMatch(workspacePreview, /dense-fallback|列表首项/, "dense collections must not label an arbitrary row as evidence");
assert.doesNotMatch(workspacePreview, /rows\s*\[\s*0\s*\]/, "row position is not a semantic preview reason");

console.log("mobile workspace quality contract: PASS");
