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
const opticalCss = [
  "tokens.css",
  "shell.css",
  "claims.css",
  "workbench.css",
  "responsive.css",
  "motion.css",
].map((file) => read("src", "panel-framework", "overview", "mobile-overview", "optical-patrol", "styles", file)).join("\n");
const opticalTokens = read("src", "panel-framework", "overview", "mobile-overview", "optical-patrol", "styles", "tokens.css");
const opticalSource = read("src", "panel-framework", "overview", "mobile-overview", "optical-patrol", "OpticalPatrol.tsx");
const opticalClaim = read("src", "panel-framework", "overview", "mobile-overview", "optical-patrol", "OpticalPatrolClaim.tsx");
const opticalGeometry = read("src", "panel-framework", "overview", "mobile-overview", "optical-patrol", "OpticalPatrolClaimGeometry.tsx");
const opticalEvidenceDeck = read("src", "panel-framework", "overview", "mobile-overview", "optical-patrol", "OpticalPatrolEvidenceDeck.tsx");
const connectionCss = read("src", "panel-framework", "connection", "router-connection.css");
const navigationCss = read("src", "panel-framework", "sections", "section-console.css");
const surface = read("src", "panel-framework", "mobile", "useMobilePanelSurface.ts");
const domainWorkspace = read("src", "panel-framework", "mobile", "MobileDomainWorkspace.tsx");
const definitions = read("src", "panel-framework", "mobile", "mobileDomainDefinitions.ts");
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
assert.match(surface, /COMPACT_WORKBENCH_QUERY.*600px.*767px/s);
assert.match(surface, /COMPACT_TASK_QUERY\s*=\s*COMPACT_WORKBENCH_QUERY/);
assert.match(surface, /TABLET_WORKBENCH_QUERY.*768px.*1199px/s);
assert.match(surface, /DOMAIN_TABLET_WORKBENCH_QUERY.*768px.*1199px/s);
assert.doesNotMatch(
  [domainCss, connectionCss, navigationCss, surface].join("\n"),
  /1023px/,
  "shared mobile ownership must not split at the former 1024px boundary",
);
assert.doesNotMatch(domainCss, /(?:linear|radial)-gradient\(/, "dense domain workspaces use solid operational layers");
assert.doesNotMatch(opticalCss, /radial-gradient\(/, "Optical Patrol must not use decorative radial atmosphere");
assert.equal((opticalCss.match(/linear-gradient\(/g) || []).length, 2, "Optical gradients are limited to chrome specular light and a data-bearing threshold track");
assert.match(opticalCss, /\.op__chrome::after,[\s\S]*?\.op__task-nav::after[\s\S]*?linear-gradient\(/, "one Optical gradient belongs to floating command chrome");
assert.match(opticalCss, /\.op__threshold::before[\s\S]*?linear-gradient\(/, "one Optical gradient encodes threshold and current value");
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
assert.match(opticalTokens, /--op-radius-chrome:\s*22px/, "floating Optical chrome owns the larger radius token");
assert.match(opticalTokens, /--op-radius-focus:\s*12px/, "evidence focus owns a restrained radius token");
assert.match(opticalTokens, /--op-target:\s*44px/, "Optical controls own a 44px minimum target token");
assert.doesNotMatch(opticalCss, /min-height:\s*clamp\(620px/, "tablet workbench must not be stretched for symmetry");
assert.match(opticalSource, /OpticalPatrolEvidenceDeck/, "tablet Optical Patrol mounts a real evidence workbench");
assert.match(opticalEvidenceDeck, /data-optical-patrol-evidence-deck/, "the tablet workbench exposes a semantic evidence owner");
assert.match(opticalGeometry, /data-optical-patrol-relationship/, "object relationships remain inspectable evidence");

for (const [source, prefix, surfaces] of [
  [domainCss, "mdw", ["#fbfdfe", "#eef2f4", "#f2f6f8"]],
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
for (const name of ["ink-secondary", "ink-muted"]) {
  const foreground = token(opticalTokens, "op-" + name);
  for (const background of ["#edf2f3", "#f7faf9"]) {
    assert.ok(contrast(foreground, background) >= 4.5, "--op-" + name + " must reach 4.5:1 on " + background);
  }
}

blockHas(domainCss, ".mdw-search button", "width:\\s*44px");
blockHas(domainCss, ".mdw-search button", "height:\\s*44px");
assert.match(
  domainCss,
  /(?:\.mdw-filter-row button|\.mdw-shell\s+:is\([\s\S]*?\.mdw-controls[\s\S]*?\) button)\s*\{[\s\S]*?min-height:\s*44px/,
  "filter controls must inherit a 44px touch target from their direct or shared control owner",
);
blockHas(domainCss, ".mdw-filter-row > label", "min-height:\\s*44px");
blockHas(domainCss, ".mdw-filter-row select", "min-height:\\s*44px");
blockHas(connectionCss, ".router-field input", "min-height:\\s*44px");
blockHas(connectionCss, ".router-segmented-control button", "min-height:\\s*44px");
blockHas(connectionCss, ".router-saved-select select", "min-height:\\s*44px");
blockHas(navigationCss, ".panel-task-navigation button", "min-height:\\s*52px");
blockHas(opticalCss, ".op__object-action", "min-block-size:\\s*var\\(--op-target\\)");

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
  [domainCss, opticalCss, connectionCss, navigationCss].join("\n"),
  /transition\s*:\s*all\b/i,
  "operations UI must never animate all properties",
);
assert.match(domainCss + opticalCss, /prefers-reduced-motion/);
assert.match(opticalClaim, /data-optical-patrol-action/);
assert.match(opticalClaim, /onOpen\(claim\.action\)/, "Optical actions must open their typed object destination");
assert.match(investigationActions, /action\.mode === "investigation"/);
assert.match(investigationActions, /关联工作区/);
assert.match(investigationActions, /继续核对相关证据/);
assert.doesNotMatch(opticalClaim, /处置入口/, "read-only object actions must not claim remediation context");
assert.doesNotMatch(workspacePreview, /dense-fallback|列表首项/, "dense collections must not label an arbitrary row as evidence");
assert.doesNotMatch(workspacePreview, /rows\s*\[\s*0\s*\]/, "row position is not a semantic preview reason");

console.log("mobile workspace quality contract: PASS");
