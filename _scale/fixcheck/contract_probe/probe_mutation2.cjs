
const fs = require("fs");
const { normalizeLegacySnapshot } = require("./compiled/runtime/legacyContract.js");
const resp = JSON.parse(fs.readFileSync("../login_mutation_live.json", "utf-8"));
const n = normalizeLegacySnapshot(resp);
console.log("routerLogin.updatedAt:", n.routerLogin.updatedAt);
console.log("routerLogin.configured:", n.routerLogin.configured, typeof n.routerLogin.configured);
console.log("routerLogin.sshPort:", n.routerLogin.sshPort, "restPort:", n.routerLogin.restPort, "restScheme:", JSON.stringify(n.routerLogin.restScheme));
console.log("test.ssh:", JSON.stringify(n.test.ssh));
console.log("savedLogins[0]:", JSON.stringify(n.savedLogins[0]));
console.log("savedLogins is array:", Array.isArray(n.savedLogins), "len:", n.savedLogins.length);
console.log("warning:", JSON.stringify(n.warning));
