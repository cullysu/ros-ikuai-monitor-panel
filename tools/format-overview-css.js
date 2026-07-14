const fs = require("node:fs");
const path = require("node:path");
const postcss = require("postcss");

const files = [
  "src/panel-framework/overview/OverviewPanel.css",
  "src/panel-framework/overview/styles/overview-desktop.css",
  "src/panel-framework/overview/styles/overview-desktop-runtime.css",
  "src/panel-framework/overview/styles/desktop/tokens.css",
  "src/panel-framework/overview/styles/desktop/status-bus.css",
  "src/panel-framework/overview/styles/desktop/decision-rail.css",
  "src/panel-framework/overview/styles/desktop/density.css",
  "src/panel-framework/overview/styles/desktop/first-screen.css",
  "src/panel-framework/overview/styles/desktop/hierarchy.css",
  "src/panel-framework/overview/styles/desktop/shell-chrome.css",
  "src/panel-framework/overview/styles/desktop/evidence.css",
  "src/panel-framework/overview/styles/desktop/console-skeleton.css",
  "src/panel-framework/overview/styles/desktop/layout.css",
  "src/panel-framework/overview/styles/desktop/console-refinement.css",
  "src/panel-framework/overview/styles/desktop/refinement.css",
  "src/panel-framework/overview/styles/desktop/release.css",
  "src/panel-framework/overview/styles/desktop/hierarchy-layout.css",
  "src/panel-framework/overview/styles/desktop/incidents.css",
  "src/panel-framework/overview/styles/desktop/wan-trend.css",
  "src/panel-framework/overview/mobile-native/styles/mobile-native-tokens.css",
  "src/panel-framework/overview/mobile-native/styles/mobile-native-layout.css",
  "src/panel-framework/overview/mobile-native/styles/mobile-native-states.css",
];

function indent(depth) {
  return "  ".repeat(depth);
}

function normalize(value) {
  return value.replace(/\r\n?/g, "\n");
}

function formatNodes(nodes, depth) {
  const formatted = nodes
    .map((node) => ({ node, source: formatNode(node, depth) }))
    .filter(({ source }) => source);
  if (depth > 0) return formatted.map(({ source }) => source).join("\n");
  return formatted.reduce((output, { node, source }, index) => {
    if (index === 0) return source;
    const previous = formatted[index - 1].node;
    const isImportPair = previous.type === "atrule" && previous.name === "import" && node.type === "atrule" && node.name === "import";
    return `${output}${isImportPair ? "\n" : "\n\n"}${source}`;
  }, "");
}

function formatNode(node, depth) {
  const pad = indent(depth);
  if (node.type === "comment") return `${pad}/*${normalize(node.text)}*/`;
  if (node.type === "decl") {
    return `${pad}${node.prop}: ${normalize(node.value)}${node.important ? " !important" : ""};`;
  }
  if (node.type === "rule") {
    return `${pad}${normalize(node.selector).trim()} {\n${formatNodes(node.nodes || [], depth + 1)}\n${pad}}`;
  }
  if (node.type === "atrule") {
    const header = `${pad}@${node.name}${node.params ? ` ${normalize(node.params)}` : ""}`;
    return node.nodes ? `${header} {\n${formatNodes(node.nodes, depth + 1)}\n${pad}}` : `${header};`;
  }
  throw new Error(`Unsupported CSS node: ${node.type}`);
}

function formatCss(source, from) {
  const root = postcss.parse(source, { from });
  return `${formatNodes(root.nodes || [], 0)}\n`;
}

const write = process.argv.includes("--write");
const unexpectedArgs = process.argv.slice(2).filter((argument) => argument !== "--write" && argument !== "--check");
if (unexpectedArgs.length > 0) {
  console.error(`Unknown argument(s): ${unexpectedArgs.join(", ")}`);
  process.exit(2);
}

const unformatted = [];
for (const relativePath of files) {
  const absolutePath = path.join(process.cwd(), relativePath);
  const source = fs.readFileSync(absolutePath, "utf8");
  const formatted = formatCss(source, relativePath);
  if (normalize(source) === formatted) continue;
  if (write) {
    fs.writeFileSync(absolutePath, formatted, "utf8");
    console.log(`formatted ${relativePath}`);
  } else {
    unformatted.push(relativePath);
  }
}

if (unformatted.length > 0) {
  console.error("overview CSS formatting: FAIL");
  for (const relativePath of unformatted) console.error(`- ${relativePath}`);
  console.error("Run: node --max-old-space-size=2048 tools/format-overview-css.js --write");
  process.exit(1);
}

console.log(`overview CSS formatting: PASS files=${files.length}`);
