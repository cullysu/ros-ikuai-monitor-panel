const fs = require("node:fs");
const path = require("node:path");
const files = [
  "src/panel-framework/mobile/mobile-patrol.css",
  "src/panel-framework/mobile/mobile-domain.css",
  "src/panel-framework/overview/desktop-overview/styles/desktop-overview.css",
];
const mode = process.argv[2] || "backup";
const dir = mode === "unmerged" ? "_acceptance/css-compaction-recovery/unmerged" : mode === "recovered" ? "_acceptance/css-compaction-recovery/recovered" : "_acceptance/css-compaction-recovery";
for (const file of files) {
  const name = file.replaceAll("/", "__");
  fs.copyFileSync(path.join(dir, name), file);
  console.log(JSON.stringify({ mode, file, bytes: fs.statSync(file).size }));
}
