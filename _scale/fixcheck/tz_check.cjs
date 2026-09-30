/* One-shot: feed the live fixed-backend snapshot through the compiled React
 * validators; print contract issues + parsed evidence timestamp. */
"use strict";
const fs = require("fs");
const path = require("path");
const HERE = __dirname;
const { validatePanelSnapshot, snapshotEvidenceTimestamp } =
  require(path.join(HERE, "contract_probe", "compiled", "runtime", "panelRuntimeSchema.js"));
const { normalizeLegacySnapshot } =
  require(path.join(HERE, "contract_probe", "compiled", "runtime", "legacyContract.js"));
const snap = JSON.parse(fs.readFileSync(path.join(HERE, "tz_live_snapshot.json"), "utf-8"));
const norm = normalizeLegacySnapshot(snap);
const issues = validatePanelSnapshot(norm);
console.log("validator issues:", Array.isArray(issues) ? issues.length : issues);
if (Array.isArray(issues) && issues.length) console.log(JSON.stringify(issues.slice(0, 3)));
console.log("evidenceTimestamp(ms):", snapshotEvidenceTimestamp(norm));
