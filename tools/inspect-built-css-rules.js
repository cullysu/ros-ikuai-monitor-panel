const fs = require("node:fs");
const postcss = require("postcss");
const root = postcss.parse(fs.readFileSync("public/assets/framework/style.css", "utf8"));
let duplicateSelectors = 0;
let multiRules = 0;
let empty = 0;
root.walkRules((rule) => {
  if (rule.nodes.length === 0) empty += 1;
  const selectors = rule.selectors;
  if (selectors.length > 1) multiRules += 1;
  duplicateSelectors += selectors.length - new Set(selectors).size;
});
console.log(JSON.stringify({ rules: root.nodes.length, multiRules, duplicateSelectors, empty }));
