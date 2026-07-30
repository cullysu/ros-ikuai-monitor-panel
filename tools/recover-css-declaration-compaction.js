const fs = require("node:fs");
const path = require("node:path");
const postcss = require("postcss");

const files = [
  "src/panel-framework/mobile/mobile-patrol.css",
  "src/panel-framework/mobile/mobile-domain.css",
  "src/panel-framework/overview/desktop-overview/styles/desktop-overview.css",
];
const backupDir = "_acceptance/css-compaction-recovery";
const outputDir = "_acceptance/css-compaction-recovery/recovered";
fs.mkdirSync(outputDir, { recursive: true });

function key(decl) { return `${decl.prop}:${decl.value}:${decl.important ? "!" : ""}`; }
function canCross(node) { return node.type === "rule" || node.type === "comment"; }

for (const file of files) {
  const backupName = file.replaceAll("/", "__");
  const root = postcss.parse(fs.readFileSync(path.join(backupDir, backupName), "utf8"), { from: file });
  let restored = 0;
  let splitSelectors = 0;

  root.walk((parent) => {
    if (!parent.nodes || parent.type === "rule" || parent.type === "decl") return;
    const rules = parent.nodes.filter((node) => node.type === "rule");
    const records = rules.map((rule) => ({ rule, nodeIndex: parent.nodes.indexOf(rule) }));
    const selectorRecords = new Map();
    for (const record of records) {
      for (const selector of record.rule.selectors) {
        if (!selectorRecords.has(selector)) selectorRecords.set(selector, []);
        selectorRecords.get(selector).push(record);
      }
    }

    for (const first of records) {
      const declarations = first.rule.nodes.filter((node) => node.type === "decl");
      const usedKeys = new Set();
      const retained = [];
      for (const [selectorIndex, selector] of first.rule.selectors.entries()) {
        const later = (selectorRecords.get(selector) || []).find((record) => record.nodeIndex > first.nodeIndex && record.rule !== first.rule);
        if (!later || selectorIndex === 0) {
          retained.push(selector);
          continue;
        }

        const candidates = declarations.filter((decl) => {
          const candidateKey = key(decl);
          if (usedKeys.has(candidateKey)) return false;
          const laterKeys = later.rule.nodes.filter((node) => node.type === "decl").map(key);
          if (laterKeys.includes(candidateKey)) return false;
          const between = parent.nodes.slice(first.nodeIndex + 1, later.nodeIndex);
          if (between.some((node) => !canCross(node))) return false;
          if (between.some((node) => node.type === "rule" && node.nodes.some((node) => node.type === "decl" && node.prop === decl.prop))) return false;
          return true;
        });
        const chosen = candidates[0];
        if (!chosen) {
          retained.push(selector);
          continue;
        }
        const clone = chosen.clone();
        later.rule.append(clone);
        usedKeys.add(key(chosen));
        restored += 1;
        splitSelectors += 1;
      }
      if (retained.length !== first.rule.selectors.length) first.rule.selector = retained.join(",\n  ");
    }
  });

  const target = path.join(outputDir, backupName);
  fs.writeFileSync(target, root.toString(), "utf8");
  console.log(JSON.stringify({ file, target, restored, splitSelectors, bytes: fs.statSync(target).size }));
}
