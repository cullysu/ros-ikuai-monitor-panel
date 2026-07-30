const fs = require("node:fs");
const postcss = require("postcss");

const desiredPath = "_acceptance/min-style.css";
const currentPath = "public/assets/framework/style.css";
const targetFiles = {
  patrol: "src/panel-framework/mobile/mobile-patrol.css",
  domain: "src/panel-framework/mobile/mobile-domain.css",
  desktop: "src/panel-framework/overview/desktop-overview/styles/desktop-overview.css",
};
const ownerSources = {
  patrol: [targetFiles.patrol, "_acceptance/css-compaction-recovery/src__panel-framework__mobile__mobile-patrol.css"],
  domain: [targetFiles.domain, "_acceptance/css-compaction-recovery/src__panel-framework__mobile__mobile-domain.css"],
  desktop: [targetFiles.desktop, "_acceptance/css-compaction-recovery/src__panel-framework__overview__desktop-overview__styles__desktop-overview.css"],
};
const outputFiles = {
  patrol: "_acceptance/merged-css-mobile-patrol.css",
  domain: "_acceptance/merged-css-mobile-domain.css",
  desktop: "_acceptance/merged-css-desktop-overview.css",
};
const norm = (value) => value.replace(/\s+/g, " ").replace(/\s*([>+~:,])\s*/g, "$1").trim();
function walk(root, callback, atRules = []) {
  for (const node of root.nodes || []) {
    if (node.type === "atrule" && node.nodes) walk(node, callback, [...atRules, { name: node.name, params: norm(node.params) }]);
    else if (node.type === "rule") callback(node, atRules);
  }
}
function contextKey(atRules) { return atRules.map((item) => `${item.name}:${item.params}`).join("|"); }
function collect(root) {
  const map = new Map();
  walk(root, (rule, atRules) => {
    for (const selector of rule.selectors) {
      const normalized = norm(selector);
      const key = `${contextKey(atRules)}::${normalized}`;
      const record = map.get(key) || { selector: normalized, atRules, values: new Map() };
      for (const node of rule.nodes) if (node.type === "decl") record.values.set(node.prop, `${node.value}${node.important ? " !important" : ""}`);
      map.set(key, record);
    }
  });
  return map;
}
function ownerSets() {
  const result = Object.fromEntries(Object.keys(ownerSources).map((name) => [name, new Set()]));
  for (const [name, files] of Object.entries(ownerSources)) for (const file of files) if (fs.existsSync(file)) {
    walk(postcss.parse(fs.readFileSync(file, "utf8")), (rule) => rule.selectors.forEach((selector) => result[name].add(norm(selector))));
  }
  return result;
}
function sourceRuleIndex(root) {
  const map = new Map();
  walk(root, (rule, atRules) => {
    for (const selector of rule.selectors) map.set(`${contextKey(atRules)}::${norm(selector)}`, rule);
  });
  return map;
}
function appendNested(root, atRules, rule) {
  let container = root;
  for (const atRule of atRules) {
    let child = (container.nodes || []).find((node) => node.type === "atrule" && node.name === atRule.name && norm(node.params) === atRule.params && node.nodes);
    if (!child) {
      child = postcss.atRule({ name: atRule.name, params: atRule.params, nodes: [] });
      container.append(child);
    }
    container = child;
  }
  container.append(rule);
}
function appendOrUpdate(rule, changes) {
  for (const [prop, value] of changes) {
    const important = value.endsWith(" !important");
    const nextValue = important ? value.slice(0, -11) : value;
    const declarations = rule.nodes.filter((node) => node.type === "decl" && node.prop === prop);
    const declaration = declarations.at(-1);
    if (declaration) {
      declaration.value = nextValue;
      declaration.important = important;
    } else rule.append({ prop, value: nextValue, important });
  }
}
const desired = collect(postcss.parse(fs.readFileSync(desiredPath, "utf8")));
const current = collect(postcss.parse(fs.readFileSync(currentPath, "utf8")));
const owners = ownerSets();
for (const [owner, targetFile] of Object.entries(targetFiles)) {
  const root = postcss.parse(fs.readFileSync(targetFile, "utf8"));
  const index = sourceRuleIndex(root);
  const unresolved = new Map();
  let updatedProperties = 0;
  for (const [key, record] of desired) {
    if (!owners[owner].has(record.selector)) continue;
    const currentValues = current.get(key)?.values || new Map();
    const changes = [...record.values].filter(([prop, value]) => currentValues.get(prop) !== value);
    if (!changes.length) continue;
    const sourceRule = index.get(key);
    if (sourceRule) {
      appendOrUpdate(sourceRule, changes);
      updatedProperties += changes.length;
      continue;
    }
    const groupKey = `${contextKey(record.atRules)}::${changes.map(([prop, value]) => `${prop}:${value}`).join(";")}`;
    const group = unresolved.get(groupKey) || { selectors: [], atRules: record.atRules, changes };
    if (!group.selectors.includes(record.selector)) group.selectors.push(record.selector);
    unresolved.set(groupKey, group);
  }
  for (const group of unresolved.values()) {
    const rule = postcss.rule({ selector: group.selectors.join(",\n  ") });
    appendOrUpdate(rule, group.changes);
    appendNested(root, group.atRules, rule);
  }
  const outputFile = outputFiles[owner];
  fs.writeFileSync(outputFile, root.toString(), "utf8");
  console.log(JSON.stringify({ owner, updatedProperties, unresolvedGroups: unresolved.size, bytes: Buffer.byteLength(root.toString()), lines: root.toString().split(/\r?\n/).length }));
}
