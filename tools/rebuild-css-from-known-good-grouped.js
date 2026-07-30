const fs = require("node:fs");
const postcss = require("postcss");

const desiredPath = "_acceptance/min-style.css";
const ownerSources = {
  patrol: ["src/panel-framework/mobile/mobile-patrol.css", "_acceptance/css-compaction-recovery/src__panel-framework__mobile__mobile-patrol.css"],
  domain: ["src/panel-framework/mobile/mobile-domain.css", "_acceptance/css-compaction-recovery/src__panel-framework__mobile__mobile-domain.css"],
  desktop: ["src/panel-framework/overview/desktop-overview/styles/desktop-overview.css", "_acceptance/css-compaction-recovery/src__panel-framework__overview__desktop-overview__styles__desktop-overview.css"],
};
const outputFiles = {
  patrol: "_acceptance/grouped-css-mobile-patrol.css",
  domain: "_acceptance/grouped-css-mobile-domain.css",
  desktop: "_acceptance/grouped-css-desktop-overview.css",
};
const norm = (value) => value.replace(/\s+/g, " ").replace(/\s*([>+~])\s*/g, "$1").trim();
function ownerSets() {
  const result = Object.fromEntries(Object.keys(ownerSources).map((key) => [key, new Set()]));
  for (const [key, files] of Object.entries(ownerSources)) for (const file of files) if (fs.existsSync(file)) {
    const root = postcss.parse(fs.readFileSync(file, "utf8"));
    root.walkRules((rule) => rule.selectors.forEach((selector) => result[key].add(norm(selector))));
  }
  return result;
}
function walk(root, callback, atRules = []) {
  for (const node of root.nodes || []) {
    if (node.type === "atrule" && node.nodes) walk(node, callback, [...atRules, { name: node.name, params: node.params }]);
    else if (node.type === "rule") callback(node, atRules);
  }
}
function wrap(rule, atRules) {
  let node = rule;
  for (let i = atRules.length - 1; i >= 0; i -= 1) node = postcss.atRule({ name: atRules[i].name, params: atRules[i].params, nodes: [node] });
  return node.toString();
}
const owners = ownerSets();
const groups = Object.fromEntries(Object.keys(ownerSources).map((key) => [key, new Map()]));
walk(postcss.parse(fs.readFileSync(desiredPath, "utf8")), (rule, atRules) => {
  const selectorOwners = new Map();
  for (const selector of rule.selectors) {
    const normalized = norm(selector);
    const owner = Object.keys(owners).find((key) => owners[key].has(normalized));
    if (owner) selectorOwners.set(owner, [...(selectorOwners.get(owner) || []), normalized]);
  }
  if (!selectorOwners.size) return;
  const body = rule.nodes.map((node) => node.toString()).join(";");
  for (const [owner, selectors] of selectorOwners) {
    const key = `${atRules.map((item) => `${item.name}:${norm(item.params)}`).join("|")}::${body}`;
    const group = groups[owner].get(key) || { selectors: [], atRules, nodes: rule.nodes.map((node) => node.clone()) };
    group.selectors.push(...selectors.filter((selector) => !group.selectors.includes(selector)));
    groups[owner].set(key, group);
  }
});
for (const [owner, outputPath] of Object.entries(outputFiles)) {
  const chunks = [...groups[owner].values()].map((group) => wrap(postcss.rule({ selector: group.selectors.join(",\n  "), nodes: group.nodes }), group.atRules));
  const body = `${chunks.join("\n")}\n`;
  fs.writeFileSync(outputPath, body, "utf8");
  console.log(JSON.stringify({ owner, groups: chunks.length, bytes: Buffer.byteLength(body), lines: body.split(/\r?\n/).length }));
}
