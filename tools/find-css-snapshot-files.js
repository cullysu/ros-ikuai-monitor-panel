const fs = require("node:fs");
const path = require("node:path");
const roots = ["C:/Users/cully/Documents", "C:/Users/cully/AppData/Local/Temp", "D:/想法"];
const names = new Set(["style.68bbe054f6e3.css", "style.68bbe054f6e3.css.gz", "style.68bbe054f6e3.css.br", "mobile-patrol.css", "mobile-domain.css", "desktop-overview.css"]);
const found = [];
function walk(dir, depth) {
  if (depth > 8) return;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && names.has(entry.name)) found.push(full);
    else if (entry.isDirectory() && !entry.name.startsWith("node_modules") && entry.name !== ".git" && entry.name !== "python-deps") walk(full, depth + 1);
  }
}
for (const root of roots) walk(root, 0);
console.log(found.join("\n"));
