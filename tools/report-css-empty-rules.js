const fs = require("node:fs");
const postcss = require("postcss");
for (const file of [
  "src/panel-framework/mobile/mobile-patrol.css",
  "src/panel-framework/mobile/mobile-domain.css",
  "src/panel-framework/overview/desktop-overview/styles/desktop-overview.css",
  "public/assets/framework/style.css",
]) {
  const root = postcss.parse(fs.readFileSync(file, "utf8"), { from: file });
  let empty = 0;
  let emptyBytes = 0;
  root.walkRules((rule) => {
    if (rule.nodes.length === 0) { empty += 1; emptyBytes += rule.toString().length; }
  });
  console.log(JSON.stringify({ file, empty, emptyBytes }));
}
