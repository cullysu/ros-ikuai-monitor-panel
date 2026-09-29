
const fs = require("fs");
const { normalizeLegacySnapshot } = require("./compiled/runtime/legacyContract.js");
const { validatePanelSnapshot } = require("./compiled/runtime/panelRuntimeSchema.js");
const snap = JSON.parse(fs.readFileSync(process.argv[2], "utf-8"));
const result = validatePanelSnapshot(normalizeLegacySnapshot(snap));
console.log(JSON.stringify({ok: result.ok, kind: result.kind, issues: (result.issues||[]).slice(0, 20)}, null, 1));
