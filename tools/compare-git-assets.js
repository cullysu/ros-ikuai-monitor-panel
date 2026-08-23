const { execFileSync } = require("node:child_process");
for (const ref of ["HEAD", "d1de865", "19497d0", "266d8e5"]) {
  for (const file of ["public/assets/framework/style.css", "public/assets/framework/style.57f2d81f74fb.css", "public/assets/framework/style.68bbe054f6e3.css"]) {
    try { const b = execFileSync("git", ["show", `${ref}:${file}`]); console.log(JSON.stringify({ref,file,bytes:b.length})); } catch {}
  }
}
