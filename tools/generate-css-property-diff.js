const fs = require("node:fs");
const postcss = require("postcss");

const desiredPath = "_acceptance/min-style.css";
const currentPath = "public/assets/framework/style.css";
const outputPath = "src/panel-framework/recovered-style-overrides.css";
const ownerSources = {
  patrol: [
    "src/panel-framework/mobile/mobile-patrol.css",
    "_acceptance/css-compaction-recovery/src__panel-framework__mobile__mobile-patrol.css",
  ],
  domain: [
    "src/panel-framework/mobile/mobile-domain.css",
    "_acceptance/css-compaction-recovery/src__panel-framework__mobile__mobile-domain.css",
  ],
  desktop: [
    "src/panel-framework/overview/desktop-overview/styles/desktop-overview.css",
    "_acceptance/css-compaction-recovery/src__panel-framework__overview__desktop-overview__styles__desktop-overview.css",
  ],
};

const normalize = (value) => value
  .replace(/\s+/g, " ")
  .replace(/\s*([>+~:,])\s*/g, "$1")
  .trim();

function walk(root, callback, atRules = []) {
  for (const node of root.nodes || []) {
    if (node.type === "atrule" && node.nodes) walk(node, callback, [...atRules, `${node.name}:${normalize(node.params)}`]);
    else if (node.type === "rule") callback(node, atRules);
  }
}

function selectorOwners() {
  const owners = Object.fromEntries(Object.keys(ownerSources).map((name) => [name, new Set()]));
  for (const [name, files] of Object.entries(ownerSources)) {
    for (const file of files) {
      if (!fs.existsSync(file)) continue;
      walk(postcss.parse(fs.readFileSync(file, "utf8")), (rule) => {
        for (const selector of rule.selectors) owners[name].add(normalize(selector));
      });
    }
  }
  return owners;
}

function records(root) {
  const map = new Map();
  walk(root, (rule, atRules) => {
    for (const selector of rule.selectors) {
      const key = `${atRules.join("|")}::${normalize(selector)}`;
      const declarations = map.get(key) || { selector: normalize(selector), atRules, values: new Map() };
      for (const child of rule.nodes) {
        if (child.type !== "decl") continue;
        declarations.values.set(child.prop, `${child.value}${child.important ? " !important" : ""}`);
      }
      map.set(key, declarations);
    }
  });
  return map;
}

function ownerFor(selector, owners) {
  const matches = Object.keys(owners).filter((name) => owners[name].has(selector));
  return matches.length === 1 ? matches[0] : null;
}

function wrap(rule, atRules) {
  let node = rule;
  for (let index = atRules.length - 1; index >= 0; index -= 1) {
    const separator = atRules[index].indexOf(":");
    node = postcss.atRule({ name: atRules[index].slice(0, separator), params: atRules[index].slice(separator + 1), nodes: [node] });
  }
  return node.toString();
}

const desired = records(postcss.parse(fs.readFileSync(desiredPath, "utf8")));
const current = records(postcss.parse(fs.readFileSync(currentPath, "utf8")));
const owners = selectorOwners();
const changes = new Map();
for (const [key, record] of desired) {
  const owner = ownerFor(record.selector, owners);
  if (!owner) continue;
  const currentValues = current.get(key)?.values || new Map();
  const changed = [...record.values].filter(([prop, value]) => currentValues.get(prop) !== value);
  if (!changed.length) continue;
  const changeKey = `${owner}::${key}`;
  const item = changes.get(changeKey) || { owner, selector: record.selector, atRules: record.atRules, values: new Map() };
  for (const [prop, value] of changed) item.values.set(prop, value);
  changes.set(changeKey, item);
}

const chunks = [];
for (const item of changes.values()) {
  const rule = postcss.rule({ selector: item.selector });
  for (const [prop, value] of item.values) {
    const important = value.endsWith(" !important");
    rule.append({ prop, value: important ? value.slice(0, -11) : value, important });
  }
  chunks.push(wrap(rule, item.atRules));
}
const output = [
  "/* Semantically derived overrides from the last known-good production stylesheet. */",
  ...chunks,
  "",
].join("\n");
fs.writeFileSync(outputPath, output, "utf8");
console.log(JSON.stringify({ desiredRules: desired.size, currentRules: current.size, changedRules: changes.size, bytes: Buffer.byteLength(output) }, null, 2));
