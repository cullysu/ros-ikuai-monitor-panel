const fs = require("node:fs");
const postcss = require("postcss");

const desiredPath = "_acceptance/min-style.css";
const currentPath = "public/assets/framework/style.css";
const ownerSources = {
  patrol: ["src/panel-framework/mobile/mobile-patrol.css", "_acceptance/css-compaction-recovery/src__panel-framework__mobile__mobile-patrol.css"],
  domain: ["src/panel-framework/mobile/mobile-domain.css", "_acceptance/css-compaction-recovery/src__panel-framework__mobile__mobile-domain.css"],
  desktop: ["src/panel-framework/overview/desktop-overview/styles/desktop-overview.css", "_acceptance/css-compaction-recovery/src__panel-framework__overview__desktop-overview__styles__desktop-overview.css"],
};
const outputFiles = {
  patrol: "_acceptance/property-diff-mobile-patrol.css",
  domain: "_acceptance/property-diff-mobile-domain.css",
  desktop: "_acceptance/property-diff-desktop-overview.css",
};
const norm = (value) => value.replace(/\s+/g, " ").replace(/\s*([>+~:,])\s*/g, "$1").trim();
function walk(root, callback, atRules = []) {
  for (const node of root.nodes || []) {
    if (node.type === "atrule" && node.nodes) walk(node, callback, [...atRules, { name: node.name, params: norm(node.params) }]);
    else if (node.type === "rule") callback(node, atRules);
  }
}
function collect(root) {
  const map = new Map();
  walk(root, (rule, atRules) => {
    for (const selector of rule.selectors) {
      const normalized = norm(selector);
      const key = `${atRules.map((item) => `${item.name}:${item.params}`).join("|")}::${normalized}`;
      const record = map.get(key) || { selector: normalized, atRules, values: new Map() };
      for (const node of rule.nodes) if (node.type === "decl") record.values.set(node.prop, `${node.value}${node.important ? " !important" : ""}`);
      map.set(key, record);
    }
  });
  return map;
}
function owners() {
  const result = Object.fromEntries(Object.keys(ownerSources).map((name) => [name, new Set()]));
  for (const [name, files] of Object.entries(ownerSources)) for (const file of files) if (fs.existsSync(file)) {
    walk(postcss.parse(fs.readFileSync(file, "utf8")), (rule) => rule.selectors.forEach((selector) => result[name].add(norm(selector))));
  }
  return result;
}
function wrap(rule, atRules) {
  let node = rule;
  for (let i = atRules.length - 1; i >= 0; i -= 1) node = postcss.atRule({ name: atRules[i].name, params: atRules[i].params, nodes: [node] });
  return node.toString();
}
const desired = collect(postcss.parse(fs.readFileSync(desiredPath, "utf8")));
const current = collect(postcss.parse(fs.readFileSync(currentPath, "utf8")));
const sourceOwners = owners();
const groups = Object.fromEntries(Object.keys(ownerSources).map((name) => [name, new Map()]));
for (const [key, record] of desired) {
  const owner = Object.keys(sourceOwners).find((name) => sourceOwners[name].has(record.selector));
  if (!owner) continue;
  const currentValues = current.get(key)?.values || new Map();
  const changes = [...record.values].filter(([prop, value]) => currentValues.get(prop) !== value);
  if (!changes.length) continue;
  const body = changes.map(([prop, value]) => `${prop}:${value}`).join(";");
  const groupKey = `${record.atRules.map((item) => `${item.name}:${item.params}`).join("|")}::${body}`;
  const group = groups[owner].get(groupKey) || { selector: [], atRules: record.atRules, changes };
  if (!group.selector.includes(record.selector)) group.selector.push(record.selector);
  groups[owner].set(groupKey, group);
}
for (const [owner, outputPath] of Object.entries(outputFiles)) {
  const chunks = [...groups[owner].values()].map((group) => {
    const rule = postcss.rule({ selector: group.selector.join(",\n  ") });
    for (const [prop, value] of group.changes) {
      const important = value.endsWith(" !important");
      rule.append({ prop, value: important ? value.slice(0, -11) : value, important });
    }
    return wrap(rule, group.atRules);
  });
  const output = `${chunks.join("\n")}\n`;
  fs.writeFileSync(outputPath, output, "utf8");
  console.log(JSON.stringify({ owner, groups: chunks.length, bytes: Buffer.byteLength(output), lines: output.split(/\r?\n/).length }));
}
