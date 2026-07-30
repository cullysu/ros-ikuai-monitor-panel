const { execFileSync } = require("node:child_process");
const refs = execFileSync("git", ["fsck", "--full", "--no-reflogs", "--unreachable"], { encoding: "utf8" })
  .split(/\r?\n/).filter((line) => line.includes("unreachable blob ")).map((line) => line.split(" ").pop()).filter(Boolean);
for (const ref of refs) {
  try {
    const size = Number(execFileSync("git", ["cat-file", "-s", ref], { encoding: "utf8" }).trim());
    if ([45264,29123,24041,50255,33664,28346].includes(size)) console.log(JSON.stringify({ ref, size }));
  } catch {}
}
