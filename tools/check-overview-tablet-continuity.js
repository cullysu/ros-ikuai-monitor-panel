const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const screen = read("src/panel-framework/mobile/MobilePatrolScreen.tsx");
const css = `${read("src/panel-framework/mobile/mobile-patrol.css")}\n${read("src/panel-framework/mobile/mobile-tablet-layout.css")}`;
const failures = [];

function expect(name, condition) {
  if (!condition) failures.push(name);
}

// The same interfaces-down task must have one explicit tablet composition owner.
expect(
  "incident branch declares one tablet task-flow layout",
  /data-tablet-overview-layout=\"split\"/.test(screen),
);
expect(
  "incident branch declares a real follow-up band",
  /data-tablet-overview-followup=\"evidence-and-actions\"/.test(screen),
);
expect(
  "task-flow marker is limited to the tablet incident branch",
  /tablet && incident[\s\S]{0,500}data-tablet-overview-layout/.test(screen),
);
expect(
  "tablet split owns both panes when the workspace can hold them",
  /@media \(min-width: 768px\) and \(max-width: 1199px\)[\s\S]*?\.mp-tablet-master-detail\s*\{[\s\S]*?grid-template-columns:\s*minmax\(240px,\s*0.38fr\)\s+minmax\(400px,\s*0.62fr\);/.test(css),
);
expect(
  "narrow tablet workspaces stack instead of splitting below the minimum inspector width",
  /@container \(max-width: 639px\)[\s\S]*?\.mp-tablet-master-detail\s*\{[\s\S]*?grid-template-columns:\s*1fr;/.test(css),
);
expect(
  "old container-width product switch is removed",
  !/@container \(min-width: 700px\)[\s\S]*?\.mp-shell:not\(\.is-large-text\) \.mp-tablet-master-detail\s*\{[\s\S]*?grid-template-columns:\s*42%\s+58%;/.test(css),
);
expect(
  "tablet task flow retains evidence and action owners",
  /data-tablet-overview-followup=\"evidence-and-actions\"/.test(screen) && /mp-tablet-support/.test(css),
);

if (failures.length) {
  console.error(JSON.stringify({
    pass: false,
    contract: "overview-tablet-continuity-v1",
    failures,
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  pass: true,
  contract: "overview-tablet-continuity-v1",
  checks: 6,
}, null, 2));
