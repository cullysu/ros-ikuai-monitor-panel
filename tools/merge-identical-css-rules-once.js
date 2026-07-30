const fs = require("node:fs");
const postcss = require("postcss");

const files = [
  "src/panel-framework/mobile/mobile-patrol.css",
  "src/panel-framework/mobile/mobile-domain.css",
  "src/panel-framework/overview/desktop-overview/styles/desktop-overview.css",
];

const bodyKey = (rule) => rule.nodes
  .map((node) => `${node.type}:${node.prop || ""}:${node.value || ""}:${node.important ? "!" : ""}`)
  .join(";");

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const root = postcss.parse(source, { from: file });
  let merged = 0;
  root.walk((parent) => {
    if (!parent.nodes || parent.type === "rule" || parent.type === "decl") return;
    const groups = new Map();
    for (const node of parent.nodes) {
      if (node.type !== "rule" || !node.nodes?.length) continue;
      const key = bodyKey(node);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(node);
    }
    for (const rules of groups.values()) {
      if (rules.length < 2) continue;
      const first = rules[0];
      for (const later of rules.slice(1)) {
        first.selector = `${first.selector},\n  ${later.selector}`;
        later.remove();
        merged += 1;
      }
    }
  });
  if (merged) fs.writeFileSync(file, root.toString(), "utf8");
  console.log(JSON.stringify({ file, merged }));
}
