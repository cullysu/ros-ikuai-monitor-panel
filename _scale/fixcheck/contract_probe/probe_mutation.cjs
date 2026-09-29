
const fs = require("fs");
const { normalizeLegacySnapshot } = require("./compiled/runtime/legacyContract.js");
const { parseRouterLoginMutation } = require("./compiled/runtime/panelRuntimeSchema.js");
const resp = JSON.parse(fs.readFileSync("../login_mutation_live.json", "utf-8"));
const parsed = parseRouterLoginMutation(normalizeLegacySnapshot(resp));
console.log("mutation parse:", parsed ? "ok" : "REJECTED");
if (!parsed) {
  // instrument: which sub-check fails
  const rec = require("./compiled/runtime/panelRuntimeSchema.js");
  console.log("keys:", Object.keys(resp));
}
