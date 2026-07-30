const fs = require("node:fs");
const path = require("node:path");
const file = process.argv[2];
if (!file) throw new Error("file required");
const backup = path.join("_acceptance/css-compaction-recovery", file.replaceAll("/", "__"));
fs.copyFileSync(backup, file);
console.log(JSON.stringify({ file, backup, bytes: fs.statSync(file).size }));
