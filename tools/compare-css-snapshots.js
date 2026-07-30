const fs = require("node:fs");
const crypto = require("node:crypto");
const files = [
  ["_acceptance/mobile-domain-css-new.b64", "src/panel-framework/mobile/mobile-domain.css"],
  ["_acceptance/inspector-primitives.b64", "src/panel-framework/mobile/mobile-patrol.css"],
];
for (const [snapshot, current] of files) {
  if (!fs.existsSync(snapshot)) continue;
  const decoded = Buffer.from(fs.readFileSync(snapshot, "utf8").replace(/\s+/g, ""), "base64");
  const actual = fs.readFileSync(current);
  console.log(JSON.stringify({ snapshot, decodedBytes: decoded.length, currentBytes: actual.length, snapshotSha: crypto.createHash("sha256").update(decoded).digest("hex"), currentSha: crypto.createHash("sha256").update(actual).digest("hex"), equal: decoded.equals(actual) }));
}
