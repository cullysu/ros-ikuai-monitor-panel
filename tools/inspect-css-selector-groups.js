const fs = require("node:fs");
const postcss = require("postcss");
for (const file of [
  "src/panel-framework/mobile/mobile-patrol.css",
  "src/panel-framework/mobile/mobile-domain.css",
  "src/panel-framework/overview/desktop-overview/styles/desktop-overview.css",
]) {
  const root = postcss.parse(fs.readFileSync(file, "utf8"), { from: file });
  const rows = [];
  root.walkRules((rule) => {
    const selectors = rule.selectors;
    if (selectors.length > 1) rows.push({ selectorCount: selectors.length, selector: rule.selector, declarations: rule.nodes.filter((n) => n.type === "decl").map((n) => `${n.prop}:${n.value}`) });
  });
  rows.sort((a, b) => b.selectorCount - a.selectorCount);
  console.log(JSON.stringify({ file, multiRules: rows.length, top: rows.slice(0, 20) }, null, 2));
}
