const fs = require("node:fs");
const path = require("node:path");
const sourceFiles = [
  "src/panel-framework/mobile/mobile-patrol.css",
  "src/panel-framework/mobile/mobile-domain.css",
  "src/panel-framework/overview/desktop-overview/styles/desktop-overview.css",
];
const outDir = "_acceptance/css-compaction-recovery";
fs.mkdirSync(outDir, { recursive: true });
for (const file of sourceFiles) {
  const target = path.join(outDir, file.replaceAll("/", "__"));
  fs.copyFileSync(file, target);
  console.log(JSON.stringify({ file, target, bytes: fs.statSync(target).size }));
}
