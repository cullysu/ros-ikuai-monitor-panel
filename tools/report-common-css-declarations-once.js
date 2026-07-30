const fs = require("node:fs");
const postcss = require("postcss");

const files = [
  "src/panel-framework/mobile/mobile-patrol.css",
  "src/panel-framework/mobile/mobile-domain.css",
  "src/panel-framework/overview/desktop-overview/styles/desktop-overview.css",
];

for (const file of files) {
  const root = postcss.parse(fs.readFileSync(file, "utf8"), { from: file });
  const groups = [];
  root.walk((parent) => {
    if (!parent.nodes || parent.type === "rule" || parent.type === "decl") return;
    const rules = parent.nodes.filter((node) => node.type === "rule");
    const byKey = new Map();
    rules.forEach((rule, index) => rule.nodes.forEach((decl) => {
      if (decl.type !== "decl") return;
      const key = `${decl.prop}:${decl.value}:${decl.important ? "!" : ""}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push({ rule, index, decl });
    }));
    for (const [key, entries] of byKey) {
      if (entries.length < 2) continue;
      const first = entries[0];
      const eligible = [first];
      for (const entry of entries.slice(1)) {
        const interveningHasProperty = rules
          .slice(first.index + 1, entry.index)
          .some((rule) => rule.nodes.some((decl) => decl.type === "decl" && decl.prop === first.decl.prop));
        if (interveningHasProperty) break;
        eligible.push(entry);
      }
      const saved = eligible.slice(1).reduce((sum, entry) => sum + entry.decl.toString().length + 1, 0) - (eligible.length > 1 ? 1 : 0);
      if (eligible.length > 1) groups.push({ key, selectors: eligible.map((entry) => entry.rule.selector), count: eligible.length, saved });
    }
  });
  console.log(JSON.stringify({ file, groups, estimatedSaved: groups.reduce((sum, group) => sum + group.saved, 0) }, null, 2));
}
