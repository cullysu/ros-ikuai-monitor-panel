const fs = require("node:fs");
const postcss = require("postcss");

const desiredPath = "_acceptance/min-style.css";
const currentPath = "public/assets/framework/style.css";
const outputPath = "_acceptance/css-recovery-diff.css";

const normalize = (value) => value
  .replace(/\s+/g, " ")
  .replace(/\s*([:;,{}>+~])\s*/g, "$1")
  .trim();

function collect(root) {
  const entries = [];
  function visit(container, atRules = []) {
    for (const node of container.nodes || []) {
      if (node.type === "atrule" && node.nodes) {
        visit(node, [...atRules, `@${node.name} ${normalize(node.params)}`]);
      } else if (node.type === "rule") {
        const body = normalize(node.nodes.map((child) => child.toString()).join(";"));
        entries.push({ node, atRules, key: `${atRules.join("|")}::${normalize(node.selector)}{${body}}` });
      }
    }
  }
  visit(root);
  return entries;
}

function wrappedRule(entry) {
  let node = entry.node.clone({ raws: {} });
  for (let index = entry.atRules.length - 1; index >= 0; index -= 1) {
    const separator = entry.atRules[index].indexOf(" ");
    const name = entry.atRules[index].slice(1, separator);
    const params = entry.atRules[index].slice(separator + 1);
    node = postcss.atRule({ name, params, nodes: [node] });
  }
  return node.toString();
}

const desired = collect(postcss.parse(fs.readFileSync(desiredPath, "utf8")));
const currentKeys = new Set(collect(postcss.parse(fs.readFileSync(currentPath, "utf8"))).map((entry) => entry.key));
const missing = desired.filter((entry) => !currentKeys.has(entry.key));
const output = [
  "/* Safe semantic recovery: rules present in the last known-good build but absent from the current source build. */",
  ...missing.map(wrappedRule),
  "",
].join("\n");
fs.writeFileSync(outputPath, output, "utf8");
console.log(JSON.stringify({ desiredRules: desired.length, currentRules: currentKeys.size, missingRules: missing.length, bytes: Buffer.byteLength(output) }, null, 2));
