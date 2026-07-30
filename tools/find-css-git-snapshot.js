const { execFileSync } = require("node:child_process");
const files = [
  "src/panel-framework/mobile/mobile-patrol.css",
  "src/panel-framework/mobile/mobile-domain.css",
  "src/panel-framework/overview/desktop-overview/styles/desktop-overview.css",
];
const target = [45264, 29123, 24041];
const refs = execFileSync("git", ["fsck", "--full", "--no-reflogs", "--unreachable"], { encoding: "utf8" })
  .split(/\r?\n/).filter((line) => line.includes("unreachable commit ")).map((line) => line.split(" ").pop()).filter(Boolean);
const rows = [];
for (const ref of refs) {
  try {
    const sizes = files.map((file) => execFileSync("git", ["show", `${ref}:${file}`]).length);
    const distance = sizes.reduce((sum, size, index) => sum + Math.abs(size - target[index]), 0);
    rows.push({ ref, sizes, distance });
  } catch {}
}
rows.sort((a, b) => a.distance - b.distance);
for (const row of rows.slice(0, 30)) {
  let subject = "";
  try { subject = execFileSync("git", ["show", "-s", "--format=%ad %s", "--date=iso", row.ref], { encoding: "utf8" }).trim(); } catch {}
  console.log(JSON.stringify({ ...row, subject }));
}
