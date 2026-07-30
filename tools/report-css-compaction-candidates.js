const fs = require("node:fs");
const postcss = require("postcss");

const files = [
  "src/panel-framework/mobile/mobile-patrol.css",
  "src/panel-framework/mobile/mobile-domain.css",
  "src/panel-framework/overview/desktop-overview/styles/desktop-overview.css",
];

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const root = postcss.parse(source, { from: file });
  const candidates = [];
  root.walk((parent) => {
    if (!parent.nodes || parent.type === "rule" || parent.type === "decl") return;
    const rules = parent.nodes.filter((node) => node.type === "rule");
    for (let firstIndex = 0; firstIndex < rules.length; firstIndex += 1) {
      const first = rules[firstIndex];
      const body = first.nodes.map((node) => `${node.prop}:${node.value}:${node.important ? "!" : ""}`).join(";");
      const props = new Set(first.nodes.map((node) => node.prop));
      for (let laterIndex = firstIndex + 1; laterIndex < rules.length; laterIndex += 1) {
        const later = rules[laterIndex];
        const laterBody = later.nodes.map((node) => `${node.prop}:${node.value}:${node.important ? "!" : ""}`).join(";");
        if (body !== laterBody) continue;
        const intervening = parent.nodes.slice(
          parent.nodes.indexOf(first) + 1,
          parent.nodes.indexOf(later),
        );
        const unsafe = intervening.some((node) => {
          if (node.type !== "rule") return node.type === "atrule";
          return node.nodes.some((child) => child.type === "decl" && props.has(child.prop));
        });
        if (!unsafe || process.argv.includes("--all")) {
          candidates.push({
            first: first.selector,
            later: later.selector,
            saved: later.selector.length + 3,
            context: parent.type === "root" ? "root" : parent.params,
          });
          break;
        }
      }
    }
  });
  console.log(JSON.stringify({ file, candidates, estimatedSaved: candidates.reduce((sum, item) => sum + item.saved, 0) }, null, 2));
}
