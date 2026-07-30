const fs = require("node:fs");
const path = require("node:path");
const roots = ["C:/Users/cully/AppData/Roaming/Code/User/History", "C:/Users/cully/AppData/Roaming/Cursor/User/History", "C:/Users/cully/AppData/Local/Temp"];
const needles = ["mp-shell", "mdw-layout", "do-shell"];
const found = [];
function walk(dir, depth) {
  if (depth > 6) return;
  let entries; try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, depth + 1);
    else if (entry.isFile()) {
      try {
        const data = fs.readFileSync(full);
        if (needles.some((needle) => data.includes(Buffer.from(needle)))) found.push({ file: full, bytes: data.length });
      } catch {}
    }
  }
}
for (const root of roots) walk(root, 0);
console.log(found.map((row) => JSON.stringify(row)).join("\n"));
