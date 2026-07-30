const fs = require("node:fs");
const file = process.argv[2];
const start = Number(process.argv[3] || 1);
const count = Number(process.argv[4] || 80);
const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
for (let i = start - 1; i < Math.min(lines.length, start - 1 + count); i += 1) console.log(`${i + 1}: ${lines[i]}`);
