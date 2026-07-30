const fs = require("node:fs");
const postcss = require("postcss");
const files = [
  "src/panel-framework/mobile/mobile-patrol.css",
  "src/panel-framework/mobile/mobile-domain.css",
  "src/panel-framework/overview/desktop-overview/styles/desktop-overview.css",
];
for (const file of files) {
  const root = postcss.parse(fs.readFileSync(file, "utf8"), { from: file });
  let removed = 0;
  root.walkRules((rule) => {
    const selectors = rule.selectors;
    const unique = [...new Set(selectors)];
    if (unique.length === selectors.length) return;
    removed += selectors.length - unique.length;
    rule.selector = unique.join(",\n  ");
  });
  if (removed) fs.writeFileSync(file, root.toString(), "utf8");
  console.log(JSON.stringify({ file, removed }));
}
