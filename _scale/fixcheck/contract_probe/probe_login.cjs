
const fs = require("fs");
const { parseRouterLoginBootstrap, parseRouterLoginMutation } = require("./compiled/runtime/panelRuntimeSchema.js");
const { normalizeLegacySnapshot } = require("./compiled/runtime/legacyContract.js");
const bootstrap = JSON.parse(fs.readFileSync("../bootstrap_live.json", "utf-8"));
console.log("bootstrap parse:", JSON.stringify(parseRouterLoginBootstrap(normalizeLegacySnapshot(bootstrap)) ? "ok" : "REJECTED"));
