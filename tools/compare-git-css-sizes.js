const { execFileSync } = require("node:child_process");
const files = [
  "src/panel-framework/mobile/mobile-patrol.css",
  "src/panel-framework/mobile/mobile-domain.css",
  "src/panel-framework/overview/desktop-overview/styles/desktop-overview.css",
];
for (const ref of ["HEAD", "d1de865", "19497d0", "266d8e5", "ef2f350"]) {
  console.log(ref);
  for (const file of files) {
    try {
      const data = execFileSync("git", ["show", `${ref}:${file}`]);
      console.log(`${data.length}\t${file}`);
    } catch { console.log(`missing\t${file}`); }
  }
}
