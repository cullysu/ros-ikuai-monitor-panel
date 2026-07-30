const fs = require("node:fs");
const postcss = require("postcss");
for (const file of [
  "src/panel-framework/mobile/mobile-patrol.css",
  "src/panel-framework/mobile/mobile-domain.css",
  "src/panel-framework/overview/desktop-overview/styles/desktop-overview.css",
]) {
  const root = postcss.parse(fs.readFileSync(file, "utf8"), { from: file });
  let duplicates = 0;
  let saved = 0;
  root.walkRules((rule) => {
    const selectors = rule.selectors;
    const unique = [...new Set(selectors)];
    if (unique.length === selectors.length) return;
    duplicates += selectors.length - unique.length;
    saved += rule.selector.length - unique.join(",\n  ").length;
  });
  console.log(JSON.stringify({ file, duplicateSelectors: duplicates, estimatedSaved: saved }));
}
