/* Contract probe: feed vanilla backend snapshot + endpoint samples through the
 * React frontend's real validators (compiled from the source repo).
 * Read-only diagnostics. Outputs JSON report to stdout (redirect to file).
 */
"use strict";
const fs = require("fs");
const path = require("path");

const HERE = __dirname;
const FIXCHECK = path.dirname(HERE);
const { validatePanelSnapshot, snapshotEvidenceTimestamp, snapshotPollSeconds } =
  require(path.join(HERE, "compiled", "runtime", "panelRuntimeSchema.js"));
const { normalizeLegacySnapshot } = require(path.join(HERE, "compiled", "runtime", "legacyContract.js"));
const { parseDnsStaticSupplement, parseHealthFindingSupplement, parseConnectionSearchSupplement, parseRouterLoginBootstrapCompat: _unused } =
  (() => {
    const m = require(path.join(HERE, "compiled", "sections", "routeSupplementSchema.js"));
    return m;
  })();

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(FIXCHECK, name), "utf-8"));
}

// Resolve a dotted/index path like meta.history[2].cpu to the actual value.
function resolvePath(root, p) {
  if (!p || p === "snapshot" || p === "") return { found: true, value: root };
  const tokens = [];
  const re = /([^..\[\]]+)|\[(\d+)\]/g;
  let m0;
  let base = p;
  // split on dots not inside brackets, then indexes
  base.split(".").forEach((seg) => {
    const mm = seg.match(/^([^\[\]]*)((\[\d+\])*)$/);
    if (!mm) { tokens.push(seg); return; }
    if (mm[1]) tokens.push(mm[1]);
    const idx = mm[2] || "";
    const idxRe = /\[(\d+)\]/g;
    let mi;
    while ((mi = idxRe.exec(idx))) tokens.push(Number(mi[1]));
  });
  void m0; void re;
  let cur = root;
  for (const t of tokens) {
    if (cur === null || cur === undefined) return { found: false, value: undefined };
    cur = cur[t];
  }
  return { found: cur !== undefined, value: cur };
}

function summarize(value) {
  if (value === undefined) return "<absent>";
  if (typeof value === "string") return JSON.stringify(value.length > 80 ? value.slice(0, 77) + "..." : value);
  if (Array.isArray(value)) return `Array(len=${value.length})`;
  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    return `Object{${keys.slice(0, 8).join(",")}${keys.length > 8 ? ",..." : ""}}`;
  }
  return JSON.stringify(value);
}

const report = { snapshot: {}, supplements: {}, extras: {} };

// ---- 1. snapshot through validatePanelSnapshot ----
const snap = load("vanilla_snapshot.json");
const result = validatePanelSnapshot(normalizeLegacySnapshot(snap));
report.snapshot.ok = result.ok;
report.snapshot.kind = result.ok ? result.kind : "malformed";
if (!result.ok) {
  report.snapshot.issueCount = result.issues.length;
  report.snapshot.issues = result.issues.map((issue) => {
    // issues look like "<path> <expectation>" (path may be absent for bare ones)
    let p = null;
    const known = [
      "meta.pollSeconds", "connections.total", "overview.history.timestamps",
      "overview.history.resourceSamples", "trafficSamples", "resourceSamples 必须是数组",
      "overview.history", "meta", "overview", "routes", "connections", "dns", "dhcp",
      "arp", "loadBalance", "security", "logs", "interfaces", "pppoe", "wan", "terminals",
      "status", "updatedAt", "error",
    ];
    for (const k of known) {
      if (issue === k || issue.startsWith(k + " ")) { p = k; break; }
    }
    if (p === null) {
      // try longest dotted prefix with optional [n]
      const mm = issue.match(/^([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*(?:\[\d+\])*(?:\.[A-Za-z0-9_]+)*(?:\[\d+\])*) (?!必须是对象$)/);
      if (mm && resolvePath(snap, mm[1]).found) p = mm[1];
    }
    let actual = null;
    if (p) {
      const r = resolvePath(snap, p);
      actual = summarize(r.value);
      // for row-level issues, show the specific field value if path ends with .field on an array item
      if (/\[\d+\]/.test(p)) {
        const m2 = p.match(/^(.*\[\d+\])\.([A-Za-z0-9_]+)$/);
        if (m2) {
          const row = resolvePath(snap, m2[1]);
          if (row.found && row.value && typeof row.value === "object") {
            actual = summarize(row.value[m2[2]]);
          }
        }
      }
    }
    return { issue, path: p, actual };
  });
} else {
  report.snapshot.issueCount = 0;
}
report.snapshot.evidenceTimestamp = snapshotEvidenceTimestamp(snap);
report.snapshot.pollSeconds = snapshotPollSeconds(snap);
report.snapshot.status = snap.status;
report.snapshot.updatedAt = snap.updatedAt;

// ---- 2. timestamp-bearing keys inventory (what TIMESTAMP_FIELD catches) ----
const TS_KEY_RE = /^(?:observedAt|timestamp|updatedAt|generatedAt|sourceUpdatedAt|cachedAt|lastUsedAt|createdAt|systemTime|.*At|.*Timestamp)$/;
const tsKeys = [];
(function walk(node, p, depth) {
  if (depth > 8) return;
  if (Array.isArray(node)) { node.forEach((it, i) => walk(it, `${p}[${i}]`, depth + 1)); return; }
  if (!node || typeof node !== "object") return;
  for (const [k, v] of Object.entries(node)) {
    const np = p ? `${p}.${k}` : k;
    if (TS_KEY_RE.test(k) && v !== null && typeof v !== "object") {
      tsKeys.push({ path: np, value: typeof v === "string" ? v : JSON.stringify(v), key: k });
    }
    if (v && typeof v === "object") walk(v, np, depth + 1);
  }
})(snap, "", 0);
// unique by key+format sample
const seen = new Map();
for (const t of tsKeys) {
  const sig = `${t.key} :: ${String(t.value).replace(/\d/g, "9")}`;
  if (!seen.has(sig)) seen.set(sig, { key: t.key, samplePath: t.path, sampleValue: t.value, count: 0 });
  seen.get(sig).count += 1;
}
report.extras.timestampKeyInventory = [...seen.values()];

// ---- 3. logs.*.time samples (special-cased in validator) ----
const logTimeSamples = [];
if (snap.logs && typeof snap.logs === "object") {
  for (const [k, v] of Object.entries(snap.logs)) {
    if (Array.isArray(v) && v.length && v[0] && typeof v[0] === "object" && "time" in v[0]) {
      logTimeSamples.push({ logsKey: k, rowLength: v.length, sampleTime: v[0].time, sampleKeys: Object.keys(v[0]) });
    } else if (Array.isArray(v)) {
      logTimeSamples.push({ logsKey: k, rowLength: v.length, sampleKeys: v[0] && typeof v[0] === "object" ? Object.keys(v[0]) : typeof v[0] });
    }
  }
}
report.extras.logsShape = logTimeSamples;

// ---- 4. supplements ----
const dns = load("vanilla_dns-static.json");
const dnsRes = parseDnsStaticSupplement(dns);
report.supplements.dnsStatic = {
  parseStatus: dnsRes.parseStatus, evidenceMode: dnsRes.evidenceMode, reason: dnsRes.reason,
  response: dns,
};

const hf = load("vanilla_health-findings.json");
report.supplements.healthFindings = { httpStatus: 404, response: hf, note: "endpoint missing on vanilla" };

const cs = load("vanilla_connection-search.json");
report.supplements.connectionSearch = { httpStatus: 404, response: cs, note: "endpoint missing on vanilla" };

// ---- 5. router-login bootstrap through the React parser (from panelRuntimeSchema) ----
const { parseRouterLoginBootstrap, parseRouterLoginMutation } =
  require(path.join(HERE, "compiled", "runtime", "panelRuntimeSchema.js"));
const rl = load("vanilla_router-login.json");
const boot = parseRouterLoginBootstrap(rl);
report.extras.routerLoginBootstrap = {
  parsesOk: boot !== null,
  profileStorageAvailableRaw: rl.profileStorageAvailable === undefined ? "<absent on vanilla>" : rl.profileStorageAvailable,
  parsedProfileStorageAvailable: boot ? boot.profileStorageAvailable : null,
  vanillaKeys: Object.keys(rl),
  routerLoginKeys: Object.keys(rl.routerLogin || {}),
  reactProfileExpectedKeys: ["configured","host","user","sshPort","sshHostKeyFingerprint","restScheme","restPort","restVerifyTls","insecureRestConfirmed","source","savedId","updatedAt","passwordSet","lastTest"],
  missingInVanillaProfile: ["sshHostKeyFingerprint","restVerifyTls","insecureRestConfirmed"].filter((k) => !(k in (rl.routerLogin || {}))),
};

// ---- 6. structural inventory for the three-state table ----
function typeOf(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}
function collectShapes(node, p, depth, out) {
  if (depth > 4 || !node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    if (node.length && node[0] && typeof node[0] === "object") {
      out.push({ path: `${p}[]`, kind: "array-of-object", len: node.length, keys: Object.keys(node[0]) });
    } else {
      out.push({ path: `${p}[]`, kind: `array-of-${typeOf(node[0])}`, len: node.length });
    }
    return;
  }
  for (const [k, v] of Object.entries(node)) {
    const np = p ? `${p}.${k}` : k;
    if (v && typeof v === "object") {
      collectShapes(v, np, depth + 1, out);
    } else {
      out.push({ path: np, kind: typeOf(v), sample: typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? String(v).slice(0, 60) : String(v) });
    }
  }
}
const shapes = [];
collectShapes(snap, "", 0, shapes);
report.extras.snapshotShapes = shapes;

process.stdout.write(JSON.stringify(report, null, 2));
