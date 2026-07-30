const fs = require("node:fs");
const path = require("node:path");
const postcss = require("postcss");

const desiredPath = "_acceptance/min-style.css";
const sourceFiles = {
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
const outputFiles = {
  patrol: "_acceptance/recovered-css-mobile-patrol.css",
  domain: "_acceptance/recovered-css-mobile-domain.css",
  desktop: "_acceptance/recovered-css-desktop-overview.css",
};

const normalizeSelector = (value) => value
  .replace(/\s+/g, " ")
  .replace(/\s*([>+~])\s*/g, "$1")
  .trim();

function selectorSet(files) {
  const set = new Set();
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const root = postcss.parse(fs.readFileSync(file, "utf8"));
    root.walkRules((rule) => rule.selectors.forEach((selector) => set.add(normalizeSelector(selector))));
  }
  return set;
}

const owners = Object.fromEntries(Object.entries(sourceFiles).map(([name, files]) => [name, selectorSet(files)]));

function collectDesired(root) {
  const entries = [];
  function visit(container, atRules = []) {
    for (const node of container.nodes || []) {
      if (node.type === "atrule" && node.nodes) visit(node, [...atRules, { name: node.name, params: node.params }]);
      else if (node.type === "rule") entries.push({ node, atRules });
    }
  }
  visit(root);
  return entries;
}

function wrap(rule, atRules) {
  let node = rule;
  for (let index = atRules.length - 1; index >= 0; index -= 1) {
    node = postcss.atRule({ name: atRules[index].name, params: atRules[index].params, nodes: [node] });
  }
  return node.toString();
}

const desired = collectDesired(postcss.parse(fs.readFileSync(desiredPath, "utf8")));
const output = { patrol: [], domain: [], desktop: [] };
const seen = { patrol: new Set(), domain: new Set(), desktop: new Set() };

for (const entry of desired) {
  for (const selector of entry.node.selectors) {
    const normalized = normalizeSelector(selector);
    const owner = Object.keys(owners).find((name) => owners[name].has(normalized));
    if (!owner) continue;
    const rule = postcss.rule({ selector: normalized });
    rule.append(entry.node.nodes.map((child) => child.clone()));
    const rendered = wrap(rule, entry.atRules);
    if (!seen[owner].has(rendered)) {
      seen[owner].add(rendered);
      output[owner].push(rendered);
    }
  }
}

const targets = {
  patrol: "src/panel-framework/mobile/mobile-patrol.css",
  domain: "src/panel-framework/mobile/mobile-domain.css",
  desktop: "src/panel-framework/overview/desktop-overview/styles/desktop-overview.css",
};
for (const [name, file] of Object.entries(outputFiles)) {
  const body = `${output[name].join("\n")}\n`;
  fs.writeFileSync(file, body, "utf8");
  console.log(JSON.stringify({ name, target: targets[name], rules: output[name].length, bytes: Buffer.byteLength(body) }));
}
