const fs = require("node:fs");
const postcss = require("postcss");

const files = [
  "src/panel-framework/mobile/mobile-patrol.css",
  "src/panel-framework/mobile/mobile-domain.css",
  "src/panel-framework/overview/desktop-overview/styles/desktop-overview.css",
];

const declarationKey = (decl) => `${decl.prop}:${decl.value}:${decl.important ? "!" : ""}`;

function canCross(node) {
  return node.type === "rule" || node.type === "comment";
}

for (const file of files) {
  const root = postcss.parse(fs.readFileSync(file, "utf8"), { from: file });
  let merged = 0;
  let saved = 0;

  root.walk((parent) => {
    if (!parent.nodes || parent.type === "rule" || parent.type === "decl") return;

    const rules = parent.nodes.filter((node) => node.type === "rule");
    const groups = new Map();
    rules.forEach((rule) => {
      rule.nodes.forEach((decl) => {
        if (decl.type !== "decl") return;
        const key = declarationKey(decl);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ rule, nodeIndex: parent.nodes.indexOf(rule), decl });
      });
    });

    for (const entries of groups.values()) {
      const duplicateRule = new Set(entries.map((entry) => entry.rule)).size !== entries.length;
      if (duplicateRule) continue;
      let cursor = 0;
      while (cursor < entries.length) {
        const first = entries[cursor];
        const eligible = [first];
        let lastIndex = first.nodeIndex;
        for (let i = cursor + 1; i < entries.length; i += 1) {
          const entry = entries[i];
          const entryNodeIndex = entry.nodeIndex;
          const between = parent.nodes.slice(lastIndex + 1, entryNodeIndex);
          if (between.some((node) => !canCross(node))) break;
          const interveningHasProperty = parent.nodes
            .slice(lastIndex + 1, entryNodeIndex)
            .some((node) => node.type === "rule" && node.nodes.some((decl) => decl.type === "decl" && decl.prop === first.decl.prop));
          if (interveningHasProperty) break;
          eligible.push(entry);
          lastIndex = entryNodeIndex;
        }

        if (eligible.length > 1) {
          const firstRule = eligible[0].rule;
          const selectors = eligible.map((entry) => entry.rule.selector);
          firstRule.selector = `${firstRule.selector},\n  ${selectors.slice(1).join(",\n  ")}`;
          for (const entry of eligible.slice(1)) {
            const original = entry.decl.toString();
            entry.decl.remove();
            merged += 1;
            saved += original.length + 1;
          }
          cursor += eligible.length;
        } else {
          cursor += 1;
        }
      }
    }
  });

  if (merged) fs.writeFileSync(file, root.toString(), "utf8");
  console.log(JSON.stringify({ file, merged, estimatedSaved: saved }));
}
