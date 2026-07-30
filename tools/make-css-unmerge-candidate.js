const fs = require("node:fs");
const path = require("node:path");
const postcss = require("postcss");
const files = [
  "src/panel-framework/mobile/mobile-patrol.css",
  "src/panel-framework/mobile/mobile-domain.css",
  "src/panel-framework/overview/desktop-overview/styles/desktop-overview.css",
];
const backupDir = "_acceptance/css-compaction-recovery";
const outputDir = "_acceptance/css-compaction-recovery/unmerged";
fs.mkdirSync(outputDir, { recursive: true });
for (const file of files) {
  const name = file.replaceAll("/", "__");
  const root = postcss.parse(fs.readFileSync(path.join(backupDir, name), "utf8"), { from: file });
  let removed = 0;
  root.walk((parent) => {
    if (!parent.nodes || parent.type === "rule" || parent.type === "decl") return;
    const rules = parent.nodes.filter((node) => node.type === "rule");
    const selectorsInLaterRules = new Set();
    for (const rule of rules) for (const selector of rule.selectors) selectorsInLaterRules.add(selector);
    for (const rule of rules) {
      const selectors = rule.selectors;
      if (selectors.length < 2) continue;
      const retained = selectors.filter((selector, index) => index === 0 || !selectorsInLaterRules.has(selector));
      if (retained.length !== selectors.length && retained.length > 0) {
        removed += selectors.length - retained.length;
        rule.selector = [...new Set(retained)].join(",\n  ");
      }
    }
  });
  const target = path.join(outputDir, name);
  fs.writeFileSync(target, root.toString(), "utf8");
  console.log(JSON.stringify({ file, target, removed, bytes: fs.statSync(target).size }));
}
