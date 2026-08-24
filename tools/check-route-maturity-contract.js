"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { TextDecoder } = require("node:util");
const { readBoundedFileSnapshotSync } = require("./lib/bounded-file-snapshot");
const {
  CURRENT_MOBILE_REFERENCE_ROUTE_IDS,
  CURRENT_MOBILE_REFERENCE_ROUTES,
  validateCurrentMobileReferenceRouteManifest,
  validateCurrentMobileReferenceAccessibilitySource,
} = require("./acceptance/mobile-reference-route-manifest");

const root = process.cwd();
const EXTERNAL_ACCEPTANCE_REPOSITORY = "cullysu/ros-ikuai-monitor-panel";
const PUBLIC_RELEASE_SCOPE = "public-release";
const ROUTE_RELEASE_POLICY_PATH = path.join(root, "docs", "decision-system", "external-acceptance", "route-release-policy.json");
const PRODUCT_CONTRACT_PATH = path.join(root, "docs", "full-console-product-contract.md");
const MAX_EXTERNAL_ACCEPTANCE_BYTES = 1024 * 1024;
const EXTERNAL_ACCEPTANCE_FIELDS = [
  "schema-version",
  "repository",
  "scope",
  "product-contract-digest",
  "route-policy-digest",
  "route-manifest-digest",
  "independent-acceptance",
  "reviewed-commit",
  "reviewer-id",
  "key-id",
  "evidence-digest",
  "signature-algorithm",
  "signature",
];
const cliArgs = process.argv.slice(2);
const contractOnly = cliArgs.includes("--contract-only");
const verifyExternalAcceptanceOnly = cliArgs.includes("--verify-external-acceptance");
const modeArg = cliArgs.find((arg) => arg.startsWith("--mode="));
const gateMode = modeArg ? modeArg.slice("--mode=".length) : "structural";
const routesArg = cliArgs.find((arg) => arg.startsWith("--routes="));
const routeArg = cliArgs.find((arg) => arg.startsWith("--route="));
const acceptanceRecordArg = cliArgs.find((arg) => arg.startsWith("--acceptance-record="));
const acceptanceKeyringArg = cliArgs.find((arg) => arg.startsWith("--acceptance-keyring="));
const acceptanceTrustPolicyArg = cliArgs.find((arg) => arg.startsWith("--acceptance-trust-policy="));
const acceptanceTrustPolicySha256Arg = cliArgs.find((arg) => arg.startsWith("--acceptance-trust-policy-sha256="));
const candidateCommitArg = cliArgs.find((arg) => arg.startsWith("--candidate-commit="));
const evidenceDigestArg = cliArgs.find((arg) => arg.startsWith("--evidence-digest="));
const productContractDigestArg = cliArgs.find((arg) => arg.startsWith("--product-contract-digest="));
const routePolicyDigestArg = cliArgs.find((arg) => arg.startsWith("--route-policy-digest="));
const routeManifestDigestArg = cliArgs.find((arg) => arg.startsWith("--route-manifest-digest="));
const verifyExternalAcceptanceStdin = cliArgs.includes("--verify-external-acceptance-stdin");
const printPublicReleaseManifest = cliArgs.includes("--print-public-release-manifest");
const requestedCompleteRoutes = routesArg
  ? [...new Set(routesArg.slice("--routes=".length).split(",").map((route) => route.trim()).filter(Boolean))]
  : [];
assert.ok(["structural", "complete"].includes(gateMode), `unsupported route maturity gate mode: ${gateMode}`);

function canonicalExternalAcceptancePayload(text) {
  if (text.charCodeAt(0) === 0xfeff || text.includes("\r") || !text.endsWith("\n")) return null;
  const lines = text.slice(0, -1).split("\n");
  if (lines.length !== EXTERNAL_ACCEPTANCE_FIELDS.length) return null;
  const entries = lines.map((line) => line.match(/^([a-z][a-z0-9-]*): (.+)$/));
  if (entries.some((entry) => !entry)) return null;
  const keys = entries.map((entry) => entry[1]);
  if (JSON.stringify(keys) !== JSON.stringify(EXTERNAL_ACCEPTANCE_FIELDS)) return null;
  return lines.slice(0, -1).join("\n") + "\n";
}

function parseExternalAcceptanceText(text) {
  const payload = canonicalExternalAcceptancePayload(text);
  if (!payload) return null;
  const lines = text.slice(0, -1).split("\n");
  const fields = Object.fromEntries(lines.map((line) => {
    const [, key, value] = line.match(/^([a-z][a-z0-9-]*): (.+)$/);
    return [key, value];
  }));
  if (fields["schema-version"] !== "2") return null;
  if (fields.repository !== EXTERNAL_ACCEPTANCE_REPOSITORY) return null;
  if (!/^[0-9a-f]{40}$/.test(fields["reviewed-commit"])) return null;
  if (!/^[A-Za-z0-9._-]{1,80}$/.test(fields["reviewer-id"])) return null;
  if (!/^[A-Za-z0-9._-]{1,80}$/.test(fields["key-id"])) return null;
  if (fields["independent-acceptance"] !== "pass") return null;
  for (const field of ["product-contract-digest", "route-policy-digest", "route-manifest-digest", "evidence-digest"]) {
    if (!/^sha256:[0-9a-f]{64}$/.test(fields[field])) return null;
  }
  if (fields["signature-algorithm"] !== "ed25519") return null;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(fields.signature)) return null;
  const signature = Buffer.from(fields.signature, "base64");
  if (signature.length !== 64) return null;
  return { fields, payload, signature };
}

function publicKeyFingerprint(publicKey) {
  return crypto.createHash("sha256")
    .update(publicKey.export({ format: "der", type: "spki" }))
    .digest("hex");
}

function sha256Digest(bytes) {
  return "sha256:" + crypto.createHash("sha256").update(bytes).digest("hex");
}

function normalizeSha256(value) {
  const normalized = (value || "").trim().toLowerCase();
  return /^sha256:[0-9a-f]{64}$/.test(normalized) ? normalized : null;
}

function validateExternalAcceptanceText(text, trust) {
  const parsed = parseExternalAcceptanceText(text);
  if (!parsed || parsed.fields.scope !== PUBLIC_RELEASE_SCOPE) return false;
  if (!trust || parsed.fields["key-id"] !== trust.keyId || parsed.fields["reviewed-commit"] !== trust.candidateCommit || parsed.fields["evidence-digest"] !== trust.evidenceDigest || parsed.fields["product-contract-digest"] !== trust.productContractDigest || parsed.fields["route-policy-digest"] !== trust.routePolicyDigest || parsed.fields["route-manifest-digest"] !== trust.routeManifestDigest) return false;
  try {
    const publicKey = trust.publicKey.type ? trust.publicKey : crypto.createPublicKey(trust.publicKey);
    if (publicKey.asymmetricKeyType !== "ed25519") return false;
    if (trust.trustedFingerprint && publicKeyFingerprint(publicKey) !== trust.trustedFingerprint) return false;
    return crypto.verify(null, Buffer.from(parsed.payload, "utf8"), publicKey, parsed.signature);
  } catch {
    return false;
  }
}

function isPathInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith(".." + path.sep) && relative !== ".." && !path.isAbsolute(relative));
}

function readExternalFileSnapshot(workspaceRoot, inputPath, label) {
  if (!inputPath || !path.isAbsolute(inputPath)) return { ok: false, reason: `${label} must be an explicit absolute path` };
  try {
    const workspaceRealPath = fs.realpathSync(workspaceRoot);
    const resolved = path.resolve(inputPath);
    const realBefore = fs.realpathSync(resolved);
    if (isPathInside(workspaceRealPath, resolved) || isPathInside(workspaceRealPath, realBefore)) {
      return { ok: false, reason: `${label} must be outside the repository` };
    }
    const frozen = readBoundedFileSnapshotSync(resolved, { maxBytes: MAX_EXTERNAL_ACCEPTANCE_BYTES, decodeUtf8: true });
    const realAfter = fs.realpathSync(resolved);
    if (realBefore !== realAfter) return { ok: false, reason: `${label} changed while being read` };
    return { ok: true, path: realAfter, bytes: Buffer.from(frozen.bytes) };
  } catch (error) {
    if (error?.code === "ERR_BOUNDED_FILE_SNAPSHOT_TOO_LARGE") return { ok: false, reason: `${label} is too large` };
    if (["ERR_BOUNDED_FILE_SNAPSHOT_NOT_REGULAR", "ERR_BOUNDED_FILE_SNAPSHOT_SYMLINK"].includes(error?.code)) return { ok: false, reason: `${label} must be a regular file` };
    return { ok: false, reason: `${label} is unreadable` };
  }
}

function decodeUtf8(bytes, label) {
  try {
    return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    return { ok: false, reason: `${label} is not valid UTF-8` };
  }
}

function parseExternalKeyring(bytes) {
  const decoded = decodeUtf8(bytes, "acceptance keyring");
  if (!decoded.ok) return decoded;
  try {
    const keyring = JSON.parse(decoded.text);
    if (!keyring || keyring["schema-version"] !== 1 || !Array.isArray(keyring.keys) || Object.keys(keyring).some((key) => !["schema-version", "keys"].includes(key))) {
      return { ok: false, reason: "acceptance keyring has an invalid schema" };
    }
    const keys = new Map();
    for (const entry of keyring.keys) {
      if (!entry || Object.keys(entry).some((key) => !["key-id", "public-key"].includes(key)) || !/^[A-Za-z0-9._-]{1,80}$/.test(entry["key-id"]) || typeof entry["public-key"] !== "string" || keys.has(entry["key-id"])) {
        return { ok: false, reason: "acceptance keyring has an invalid key entry" };
      }
      const publicKey = crypto.createPublicKey(entry["public-key"]);
      if (publicKey.asymmetricKeyType !== "ed25519") return { ok: false, reason: "acceptance keyring only permits Ed25519 keys" };
      keys.set(entry["key-id"], { publicKey, trustedFingerprint: publicKeyFingerprint(publicKey) });
    }
    return { ok: true, keys };
  } catch {
    return { ok: false, reason: "acceptance keyring is not valid JSON with Ed25519 public keys" };
  }
}

function parseTrustPolicy(bytes, expectedSha256) {
  const expected = normalizeSha256(expectedSha256);
  if (!expected) return { ok: false, reason: "acceptance trust policy SHA-256 is invalid" };
  if (sha256Digest(bytes) !== expected) return { ok: false, reason: "acceptance trust policy SHA-256 does not match the frozen policy bytes" };
  const decoded = decodeUtf8(bytes, "acceptance trust policy");
  if (!decoded.ok) return decoded;
  try {
    const policy = JSON.parse(decoded.text);
    if (!policy || policy["schema-version"] !== 1 || !Array.isArray(policy.keys) || Object.keys(policy).some((key) => !["schema-version", "keys"].includes(key)) || policy.keys.length === 0) {
      return { ok: false, reason: "acceptance trust policy has an invalid schema" };
    }
    const keys = new Map();
    for (const entry of policy.keys) {
      if (!entry || Object.keys(entry).some((key) => !["key-id", "public-key", "fingerprint"].includes(key)) || !/^[A-Za-z0-9._-]{1,80}$/.test(entry["key-id"]) || typeof entry["public-key"] !== "string" || !/^[0-9a-f]{64}$/.test(entry.fingerprint) || keys.has(entry["key-id"])) {
        return { ok: false, reason: "acceptance trust policy has an invalid key entry" };
      }
      const publicKey = crypto.createPublicKey(entry["public-key"]);
      if (publicKey.asymmetricKeyType !== "ed25519" || publicKeyFingerprint(publicKey) !== entry.fingerprint) {
        return { ok: false, reason: "acceptance trust policy has an invalid Ed25519 key fingerprint" };
      }
      keys.set(entry["key-id"], { publicKey, trustedFingerprint: entry.fingerprint });
    }
    return { ok: true, keys, sha256: expected };
  } catch {
    return { ok: false, reason: "acceptance trust policy is not valid JSON with Ed25519 public keys" };
  }
}

function candidateCommitExists(workspaceRoot, candidateCommit, commandRunner = spawnSync) {
  if (!/^[0-9a-f]{40}$/.test(candidateCommit || "")) return false;
  const result = commandRunner("git", ["cat-file", "-e", `${candidateCommit}^{commit}`], { cwd: workspaceRoot, encoding: "utf8", stdio: ["ignore", "ignore", "ignore"] });
  return result.status === 0;
}

function verifyExternalAcceptanceSnapshot({ recordBytes, keyringBytes, trustPolicyBytes, trustPolicySha256, candidateCommit, evidenceDigest, productContractDigest, routePolicyDigest, routeManifestDigest }, workspaceRoot = root) {
  const normalizedCommit = (candidateCommit || "").trim().toLowerCase();
  const normalizedDigest = (evidenceDigest || "").trim().toLowerCase();
  const normalizedProductContractDigest = normalizeSha256(productContractDigest);
  const normalizedRoutePolicyDigest = normalizeSha256(routePolicyDigest);
  const normalizedRouteManifestDigest = normalizeSha256(routeManifestDigest);
  if (!candidateCommitExists(workspaceRoot, normalizedCommit)) return { verified: false, reason: "candidate commit must name an existing 40-character commit object" };
  if (!/^sha256:[0-9a-f]{64}$/.test(normalizedDigest)) return { verified: false, reason: "evidence digest must be a sha256 digest" };
  if (!normalizedProductContractDigest || !normalizedRoutePolicyDigest || !normalizedRouteManifestDigest) return { verified: false, reason: "public release contract, policy, and manifest digests must be sha256 digests" };
  if (!Buffer.isBuffer(recordBytes) || !Buffer.isBuffer(keyringBytes) || !Buffer.isBuffer(trustPolicyBytes)) return { verified: false, reason: "acceptance snapshot is invalid" };
  const policy = parseTrustPolicy(trustPolicyBytes, trustPolicySha256);
  if (!policy.ok) return { verified: false, reason: policy.reason };
  const keyring = parseExternalKeyring(keyringBytes);
  if (!keyring.ok) return { verified: false, reason: keyring.reason };
  if (keyring.keys.size !== policy.keys.size || [...keyring.keys].some(([keyId, key]) => policy.keys.get(keyId)?.trustedFingerprint !== key.trustedFingerprint)) {
    return { verified: false, reason: "acceptance keyring does not exactly match the frozen trust policy" };
  }
  const record = decodeUtf8(recordBytes, "acceptance record");
  if (!record.ok) return { verified: false, reason: record.reason };
  const parsed = parseExternalAcceptanceText(record.text);
  if (!parsed) return { verified: false, reason: "acceptance record has an invalid canonical schema" };
  const trustedKey = keyring.keys.get(parsed.fields["key-id"]);
  if (!trustedKey) return { verified: false, reason: "acceptance record key-id is not trusted by the external keyring" };
  const verified = validateExternalAcceptanceText(record.text, {
    ...trustedKey,
    keyId: parsed.fields["key-id"],
    candidateCommit: normalizedCommit,
    evidenceDigest: normalizedDigest,
    productContractDigest: normalizedProductContractDigest,
    routePolicyDigest: normalizedRoutePolicyDigest,
    routeManifestDigest: normalizedRouteManifestDigest,
  });
  return verified
    ? { verified: true, scope: PUBLIC_RELEASE_SCOPE, keyId: parsed.fields["key-id"], candidateCommit: normalizedCommit, evidenceDigest: normalizedDigest, productContractDigest: normalizedProductContractDigest, routePolicyDigest: normalizedRoutePolicyDigest, routeManifestDigest: normalizedRouteManifestDigest, trustPolicySha256: policy.sha256 }
    : { verified: false, reason: "acceptance record does not bind public-release, candidate commit, contract, policy, manifest, evidence digest, and Ed25519 signature" };
}

function verifyExternalAcceptanceCandidate({ recordPath, keyringPath, trustPolicyPath, trustPolicySha256, candidateCommit, evidenceDigest, productContractDigest, routePolicyDigest, routeManifestDigest }, workspaceRoot = root) {
  const record = readExternalFileSnapshot(workspaceRoot, recordPath, "acceptance record");
  if (!record.ok) return { verified: false, reason: record.reason };
  const keyring = readExternalFileSnapshot(workspaceRoot, keyringPath, "acceptance keyring");
  if (!keyring.ok) return { verified: false, reason: keyring.reason };
  const policy = readExternalFileSnapshot(workspaceRoot, trustPolicyPath, "acceptance trust policy");
  if (!policy.ok) return { verified: false, reason: policy.reason };
  return verifyExternalAcceptanceSnapshot({
    recordBytes: record.bytes,
    keyringBytes: keyring.bytes,
    trustPolicyBytes: policy.bytes,
    trustPolicySha256,
    candidateCommit,
    evidenceDigest,
    productContractDigest,
    routePolicyDigest,
    routeManifestDigest,
  }, workspaceRoot);
}

function loadTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(compiled.outputText, filename);
}

require.extensions[".ts"] = loadTypeScript;
require.extensions[".tsx"] = loadTypeScript;

const routes = require(path.join(root, "src", "panel-framework", "routes", "panelRoutes.ts"));
const maturity = require(path.join(root, "src", "panel-framework", "routes", "panelRouteMaturity.ts"));
const navigationMaturity = require(path.join(root, "src", "panel-framework", "navigation", "routeMaturity.ts"));

assert.ok(
  maturity.PANEL_ROUTE_MATURITY_EVIDENCE,
  "every route must have an explicit maturity evidence record",
);
assert.equal(typeof maturity.validatePanelRouteMaturity, "function");
assert.strictEqual(
  navigationMaturity.validateRouteMaturityContract,
  maturity.validateRouteMaturityContract,
  "navigation must project the canonical route maturity validator without owning a second implementation",
);
assert.strictEqual(
  navigationMaturity.deriveRouteMaturityContracts,
  maturity.deriveRouteMaturityContracts,
  "navigation must project canonical route maturity contracts",
);

const report = maturity.validatePanelRouteMaturity(routes.PANEL_ROUTES, routes.PANEL_ROUTE_IDS);

const MATURITY_RANK = { unavailable: 0, fallback: 1, "bounded-readonly": 2, complete: 3 };

function buildPublicReleaseManifest() {
  const failures = [];
  let policyBytes;
  let policy;
  try {
    const policySnapshot = readBoundedFileSnapshotSync(ROUTE_RELEASE_POLICY_PATH, { maxBytes: MAX_EXTERNAL_ACCEPTANCE_BYTES, decodeUtf8: true });
    policyBytes = Buffer.from(policySnapshot.bytes);
    policy = JSON.parse(policySnapshot.text);
  } catch {
    return { pass: false, failures: ["route release policy is unreadable or invalid JSON"] };
  }
  if (!policy || policy["schema-version"] !== 1 || policy["policy-id"] !== "bounded-public-release-v1" || !Array.isArray(policy.routes) || Object.keys(policy).some((key) => !["schema-version", "policy-id", "routes"].includes(key))) {
    return { pass: false, failures: ["route release policy schema is invalid"] };
  }
  if (policy.routes.length !== routes.PANEL_ROUTE_IDS.length) failures.push("route release policy must declare every route exactly once");
  const policyRoutes = new Map();
  for (const [index, entry] of policy.routes.entries()) {
    if (!entry || Object.keys(entry).some((key) => !["route", "kind", "minimum-maturity"].includes(key)) || typeof entry.route !== "string" || !["module", "directory"].includes(entry.kind) || !Object.hasOwn(MATURITY_RANK, entry["minimum-maturity"]) || policyRoutes.has(entry.route)) {
      failures.push(`route release policy entry ${index} is invalid`);
      continue;
    }
    if (entry.route !== routes.PANEL_ROUTE_IDS[index]) failures.push(`route release policy order must match PANEL_ROUTE_IDS at ${index}`);
    policyRoutes.set(entry.route, entry);
  }
  for (const route of routes.PANEL_ROUTE_IDS) if (!policyRoutes.has(route)) failures.push(`${route}: route release policy entry is missing`);
  for (const route of policyRoutes.keys()) if (!routes.PANEL_ROUTE_IDS.includes(route)) failures.push(`${route}: route release policy entry is unknown`);

  const manifestRoutes = routes.PANEL_ROUTE_IDS.map((route) => {
    const definition = routes.PANEL_ROUTES[route];
    const evidence = maturity.PANEL_ROUTE_MATURITY_EVIDENCE[route];
    const policyEntry = policyRoutes.get(route);
    if (!definition || !evidence || !policyEntry) return { route, kind: "missing", declaredMaturity: null, minimumMaturity: null, accessibility: null, independentAcceptance: null };
    const expectedKind = definition.placement === "directory" ? "directory" : "module";
    if (policyEntry.kind !== expectedKind) failures.push(`${route}: policy kind does not match route presentation`);
    if (definition.maturity !== policyEntry["minimum-maturity"] && MATURITY_RANK[definition.maturity] < MATURITY_RANK[policyEntry["minimum-maturity"]]) failures.push(`${route}: declared maturity is below policy minimum`);
    if (policyEntry.kind === "directory" && definition.maturity !== "unavailable") failures.push(`${route}: directory policy requires unavailable maturity`);
    return {
      route,
      kind: policyEntry.kind,
      declaredMaturity: definition.maturity,
      minimumMaturity: policyEntry["minimum-maturity"],
      accessibility: evidence.accessibility,
      independentAcceptance: evidence.independentAcceptance,
    };
  });
  let productContractBytes;
  try {
    productContractBytes = Buffer.from(readBoundedFileSnapshotSync(PRODUCT_CONTRACT_PATH, { maxBytes: MAX_EXTERNAL_ACCEPTANCE_BYTES, decodeUtf8: true }).bytes);
  } catch {
    failures.push("full console product contract is unreadable");
    productContractBytes = Buffer.alloc(0);
  }
  const manifest = { "schema-version": 1, "policy-id": policy["policy-id"], routes: manifestRoutes };
  const bytes = Buffer.from(`${JSON.stringify(manifest)}\n`, "utf8");
  return {
    pass: failures.length === 0,
    failures,
    manifest,
    bytes,
    productContractDigest: sha256Digest(productContractBytes),
    routePolicyDigest: sha256Digest(policyBytes),
    routeManifestDigest: sha256Digest(bytes),
  };
}

const publicReleaseManifest = buildPublicReleaseManifest();
assert.deepEqual(report.missing, [], "route maturity evidence must cover every route id exactly once");
assert.deepEqual(report.extra, [], "route maturity evidence must not contain phantom route ids");
assert.deepEqual(report.missingDefinitions, [], "route definitions must cover every route id exactly once");
assert.deepEqual(report.extraDefinitions, [], "route definitions must not contain phantom route ids");
assert.deepEqual(report.violations, [], JSON.stringify(report.violations, null, 2));
assert.deepEqual(
  report.routeMaturity.filter((entry) => entry.maturity === "unavailable").map((entry) => entry.route),
  ["more"],
  "more must remain the only unavailable directory route",
);
assert.equal(report.contractPass, true, "the structural contract should be independently reportable");

for (const [route, evidence] of Object.entries(maturity.PANEL_ROUTE_MATURITY_EVIDENCE)) {
  assert.equal(evidence.evidenceRefs.some((ref) => ref.startsWith("_acceptance/")), false, `${route}: contract must not depend on ignored runtime reports`);
  for (const ref of evidence.evidenceRefs) {
    assert.equal(fs.existsSync(path.join(root, ref)), true, `${route}: evidence ref must exist: ${ref}`);
  }
  assert.equal(fs.existsSync(path.join(root, evidence.modelSource)), true, `${route}: model source must exist`);
  assert.equal(fs.existsSync(path.join(root, evidence.rendererSource)), true, `${route}: renderer source must exist`);
  assert.equal(
    fs.readFileSync(path.join(root, evidence.modelSource), "utf8").includes(evidence.modelToken),
    true,
    `${route}: model token must bind to source`,
  );
  assert.equal(
    fs.readFileSync(path.join(root, evidence.rendererSource), "utf8").includes(evidence.rendererToken),
    true,
    `${route}: renderer token must bind to source`,
  );
  assert.equal(fs.existsSync(path.join(root, evidence.objectDetailSource)), true, `${route}: object-detail source must exist`);
  assert.equal(fs.readFileSync(path.join(root, evidence.objectDetailSource), "utf8").includes(evidence.objectDetailToken), true, `${route}: object-detail token must bind to source`);
  assert.equal(fs.existsSync(path.join(root, evidence.failureRecoverySource)), true, `${route}: failure-recovery source must exist`);
  assert.equal(fs.readFileSync(path.join(root, evidence.failureRecoverySource), "utf8").includes(evidence.failureRecoveryToken), true, `${route}: failure-recovery token must bind to source`);
  if (evidence.accessibility === "automated-only") {
    assert.ok(evidence.automatedAccessibilityRoutes.includes(route), `${route}: automated accessibility scope must include itself`);
    assert.equal(fs.existsSync(path.join(root, evidence.accessibilitySource)), true, `${route}: accessibility source must exist`);
    assert.equal(fs.readFileSync(path.join(root, evidence.accessibilitySource), "utf8").includes(evidence.accessibilityToken), true, `${route}: accessibility token must bind to source`);
  }
  assert.equal(evidence.acceptanceRefs.length, 0, `${route}: route-local acceptance refs cannot establish public-release acceptance`);
}

const expectedAccessibilityRoutes = routes.PANEL_ROUTE_IDS.filter((route) => route !== "more");
const manifestReport = validateCurrentMobileReferenceRouteManifest(CURRENT_MOBILE_REFERENCE_ROUTES, expectedAccessibilityRoutes);
assert.equal(manifestReport.pass, true, JSON.stringify(manifestReport.violations, null, 2));
assert.deepEqual(CURRENT_MOBILE_REFERENCE_ROUTE_IDS, expectedAccessibilityRoutes, "current accessibility manifest order must match the operational route registry");
const accessibilityRuntime = fs.readFileSync(path.join(root, "tools", "check-mobile-reference-accessibility-runtime.js"), "utf8");
const accessibilitySourceReport = validateCurrentMobileReferenceAccessibilitySource(accessibilityRuntime);
assert.equal(accessibilitySourceReport.pass, true, JSON.stringify(accessibilitySourceReport.violations, null, 2));
const declaredAccessibilityRoutes = Object.values(maturity.PANEL_ROUTE_MATURITY_EVIDENCE)
  .flatMap((evidence) => evidence.automatedAccessibilityRoutes);
assert.deepEqual(declaredAccessibilityRoutes, expectedAccessibilityRoutes, "registry accessibility scope must equal the shared current route manifest");
assert.equal(validateCurrentMobileReferenceRouteManifest(CURRENT_MOBILE_REFERENCE_ROUTES.slice(1), expectedAccessibilityRoutes).pass, false, "a missing accessibility route must fail closed");
assert.equal(validateCurrentMobileReferenceRouteManifest([...CURRENT_MOBILE_REFERENCE_ROUTES, CURRENT_MOBILE_REFERENCE_ROUTES[0]], expectedAccessibilityRoutes).pass, false, "a duplicate accessibility route must fail closed");
assert.equal(validateCurrentMobileReferenceAccessibilitySource(accessibilityRuntime.replace("run(CURRENT_MOBILE_REFERENCE_ROUTE_STAGE", "run(\"retired-route-stage\"")).pass, false, "a missing current runtime stage must fail closed");

const retiredAccessibilityEvidence = { ...maturity.PANEL_ROUTE_MATURITY_EVIDENCE, overview: {
  ...maturity.PANEL_ROUTE_MATURITY_EVIDENCE.overview,
  accessibilitySource: "tools/check-mobile-telemetry-runtime.js",
} };
const retiredAccessibilityReport = maturity.validatePanelRouteMaturity(routes.PANEL_ROUTES, routes.PANEL_ROUTE_IDS, retiredAccessibilityEvidence);
assert.ok(retiredAccessibilityReport.violations.some((item) => item.includes("current Mobile Reference runtime")), "a retired accessibility source must fail closed");

const completeClaim = structuredClone(routes.PANEL_ROUTES);
completeClaim.overview.maturity = "complete";
const completeClaimReport = maturity.validatePanelRouteMaturity(completeClaim, routes.PANEL_ROUTE_IDS);
assert.ok(
  completeClaimReport.violations.length === 0,
  "a source-complete claim may prove implementation eligibility while external acceptance remains separate",
);

const missingRecord = { ...maturity.PANEL_ROUTE_MATURITY_EVIDENCE };
delete missingRecord.interfaces;
const missingRecordReport = maturity.validatePanelRouteMaturity(routes.PANEL_ROUTES, routes.PANEL_ROUTE_IDS, missingRecord);
assert.deepEqual(missingRecordReport.missing, ["interfaces"], "removing one route record must be detected");

const extraRecord = {
  ...maturity.PANEL_ROUTE_MATURITY_EVIDENCE,
  phantom: maturity.PANEL_ROUTE_MATURITY_EVIDENCE.more,
};
const extraRecordReport = maturity.validatePanelRouteMaturity(routes.PANEL_ROUTES, routes.PANEL_ROUTE_IDS, extraRecord);
assert.deepEqual(extraRecordReport.extra, ["phantom"], "adding a phantom evidence record must be detected");

const missingDefinition = { ...routes.PANEL_ROUTES };
delete missingDefinition.interfaces;
const missingDefinitionReport = maturity.validatePanelRouteMaturity(missingDefinition, routes.PANEL_ROUTE_IDS);
assert.deepEqual(missingDefinitionReport.missingDefinitions, ["interfaces"], "removing one route definition must be detected");

const extraDefinition = { ...routes.PANEL_ROUTES, phantom: routes.PANEL_ROUTES.more };
const extraDefinitionReport = maturity.validatePanelRouteMaturity(extraDefinition, routes.PANEL_ROUTE_IDS);
assert.deepEqual(extraDefinitionReport.extraDefinitions, ["phantom"], "adding a phantom route definition must be detected");

const completeEvidence = { ...maturity.PANEL_ROUTE_MATURITY_EVIDENCE, overview: {
  ...maturity.PANEL_ROUTE_MATURITY_EVIDENCE.overview,
  independentAcceptance: "independent-pass",
  acceptanceRefs: [],
} };
const completeAcceptanceReport = maturity.validatePanelRouteMaturity(completeClaim, routes.PANEL_ROUTE_IDS, completeEvidence);
assert.ok(completeAcceptanceReport.violations.some((item) => item.includes("signed public-release manifest")), "candidate source cannot self-declare independent acceptance");

const boundedAcceptanceEvidence = { ...maturity.PANEL_ROUTE_MATURITY_EVIDENCE, overview: {
  ...maturity.PANEL_ROUTE_MATURITY_EVIDENCE.overview,
  independentAcceptance: "independent-pass",
  acceptanceRefs: [],
} };
const boundedAcceptanceReport = maturity.validatePanelRouteMaturity(routes.PANEL_ROUTES, routes.PANEL_ROUTE_IDS, boundedAcceptanceEvidence);
assert.ok(boundedAcceptanceReport.violations.some((item) => item.includes("external promotion authority")), "bounded-readonly source claims must also remain pending");

const fakeAcceptanceEvidence = { ...completeEvidence, overview: {
  ...completeEvidence.overview,
  acceptanceRefs: ["package.json"],
} };
const fakeAcceptanceReport = maturity.validatePanelRouteMaturity(routes.PANEL_ROUTES, routes.PANEL_ROUTE_IDS, fakeAcceptanceEvidence);
assert.ok(fakeAcceptanceReport.violations.some((item) => item.includes("route-local acceptance refs cannot prove")), "an arbitrary local reference must not satisfy independent acceptance");

const missingAutomatedAccessibilityEvidence = { ...maturity.PANEL_ROUTE_MATURITY_EVIDENCE, overview: {
  ...maturity.PANEL_ROUTE_MATURITY_EVIDENCE.overview,
  accessibility: "pending",
} };
const missingAutomatedAccessibilityReport = maturity.validatePanelRouteMaturity(completeClaim, routes.PANEL_ROUTE_IDS, missingAutomatedAccessibilityEvidence);
assert.ok(missingAutomatedAccessibilityReport.violations.some((item) => item.includes("automated accessibility coverage")), "complete implementation eligibility requires automated accessibility before external AT review");

const forgedExternalAcceptance = [
  "route: public-release",
  "independent-acceptance: pass",
  `reviewed-commit: ${"a".repeat(40)}`,
  "reviewer-id: forged",
].join("\n");
assert.equal(
  validateExternalAcceptanceText(forgedExternalAcceptance),
  false,
  "a record-like text marker must not count without a trusted external key",
);

const positiveKeyPair = crypto.generateKeyPairSync("ed25519");
const positivePublicKey = positiveKeyPair.publicKey;
const positiveCommit = "b".repeat(40);
const positiveTrust = {
  publicKey: positivePublicKey,
  keyId: "test-reviewer",
  candidateCommit: positiveCommit,
  evidenceDigest: "sha256:" + "0".repeat(64),
  productContractDigest: publicReleaseManifest.productContractDigest,
  routePolicyDigest: publicReleaseManifest.routePolicyDigest,
  routeManifestDigest: publicReleaseManifest.routeManifestDigest,
  trustedFingerprint: publicKeyFingerprint(positivePublicKey),
};
function makeSignedAcceptanceText(keyPair, keyId, reviewedCommit) {
  const payload = [
    "schema-version: 2",
    "repository: " + EXTERNAL_ACCEPTANCE_REPOSITORY,
    "scope: " + PUBLIC_RELEASE_SCOPE,
    "product-contract-digest: " + positiveTrust.productContractDigest,
    "route-policy-digest: " + positiveTrust.routePolicyDigest,
    "route-manifest-digest: " + positiveTrust.routeManifestDigest,
    "independent-acceptance: pass",
    "reviewed-commit: " + reviewedCommit,
    "reviewer-id: test-reviewer",
    "key-id: " + keyId,
    "evidence-digest: sha256:" + "0".repeat(64),
    "signature-algorithm: ed25519",
  ].join("\n") + "\n";
  const signature = crypto.sign(null, Buffer.from(payload, "utf8"), keyPair.privateKey).toString("base64");
  return payload + "signature: " + signature + "\n";
}
const positiveAcceptanceText = makeSignedAcceptanceText(positiveKeyPair, positiveTrust.keyId, positiveCommit);
assert.equal(
  validateExternalAcceptanceText(positiveAcceptanceText, positiveTrust),
  true,
  "a valid Ed25519 external acceptance must verify",
);
assert.equal(
  validateExternalAcceptanceText(positiveAcceptanceText.replace("evidence-digest: sha256:" + "0".repeat(64), "evidence-digest: sha256:" + "1".repeat(64)), positiveTrust),
  false,
  "tampering with the signed payload must fail",
);
assert.equal(
  validateExternalAcceptanceText(positiveAcceptanceText.replace("scope: public-release", "scope: overview"), positiveTrust),
  false,
  "a record outside public-release must fail",
);
assert.equal(
  validateExternalAcceptanceText(positiveAcceptanceText.replace(positiveCommit, "c".repeat(40)), positiveTrust),
  false,
  "a signed record for a stale commit must fail",
);
assert.equal(
  validateExternalAcceptanceText(positiveAcceptanceText.replace("reviewer-id: test-reviewer\n", "reviewer-id: test-reviewer\nreviewer-id: duplicate\n"), positiveTrust),
  false,
  "duplicate fields must fail the fixed schema",
);
assert.equal(isPathInside(root, path.join(root, "package.json")), true, "repository path detection must include direct files");
assert.equal(isPathInside(root, path.resolve(root, "..", "outside")), false, "repository path detection must reject external files");

const ed448KeyPair = crypto.generateKeyPairSync("ed448");
const ed448PublicKey = ed448KeyPair.publicKey;
const ed448Trust = {
  publicKey: ed448PublicKey,
  keyId: "test-ed448",
  candidateCommit: positiveCommit,
  evidenceDigest: "sha256:" + "0".repeat(64),
  trustedFingerprint: publicKeyFingerprint(ed448PublicKey),
};
const ed448AcceptanceText = makeSignedAcceptanceText(ed448KeyPair, ed448Trust.keyId, positiveCommit);
assert.equal(
  validateExternalAcceptanceText(ed448AcceptanceText, ed448Trust),
  false,
  "an Ed448 key must not satisfy the Ed25519 contract",
);

const externalAcceptanceRequest = {
  recordPath: acceptanceRecordArg?.slice("--acceptance-record=".length),
  keyringPath: acceptanceKeyringArg?.slice("--acceptance-keyring=".length),
  trustPolicyPath: acceptanceTrustPolicyArg?.slice("--acceptance-trust-policy=".length),
  trustPolicySha256: acceptanceTrustPolicySha256Arg?.slice("--acceptance-trust-policy-sha256=".length),
  candidateCommit: candidateCommitArg?.slice("--candidate-commit=".length),
  evidenceDigest: evidenceDigestArg?.slice("--evidence-digest=".length),
  productContractDigest: productContractDigestArg?.slice("--product-contract-digest=".length),
  routePolicyDigest: routePolicyDigestArg?.slice("--route-policy-digest=".length),
  routeManifestDigest: routeManifestDigestArg?.slice("--route-manifest-digest=".length),
};

function decodeFrozenAcceptanceEnvelope() {
  try {
    const encoded = fs.readFileSync(0);
    if (encoded.length > MAX_EXTERNAL_ACCEPTANCE_BYTES * 4) throw new Error("too_large");
    const envelope = JSON.parse(encoded.toString("utf8"));
    if (!envelope || Object.keys(envelope).some((key) => !["record", "keyring", "trustPolicy"].includes(key)) || !["record", "keyring", "trustPolicy"].every((key) => typeof envelope[key] === "string" && /^[A-Za-z0-9+/]+={0,2}$/.test(envelope[key]))) throw new Error("invalid");
    const decode = (value) => Buffer.from(value, "base64");
    return { ok: true, recordBytes: decode(envelope.record), keyringBytes: decode(envelope.keyring), trustPolicyBytes: decode(envelope.trustPolicy) };
  } catch {
    return { ok: false, reason: "frozen acceptance stdin snapshot is invalid" };
  }
}

function verifyRequestedExternalAcceptance() {
  if (routeArg) return { verified: false, reason: "release scope is fixed to public-release; --route is not accepted" };
  if (verifyExternalAcceptanceStdin) {
    const snapshot = decodeFrozenAcceptanceEnvelope();
    return snapshot.ok
      ? verifyExternalAcceptanceSnapshot({ ...snapshot, ...externalAcceptanceRequest })
      : { verified: false, reason: snapshot.reason };
  }
  return verifyExternalAcceptanceCandidate(externalAcceptanceRequest);
}

if (printPublicReleaseManifest) {
  if (!publicReleaseManifest.pass) {
    console.error(JSON.stringify({ failures: publicReleaseManifest.failures }, null, 2));
    process.exitCode = 1;
  } else {
    process.stdout.write(publicReleaseManifest.bytes);
  }
} else if (verifyExternalAcceptanceOnly) {
  const externalAcceptance = verifyRequestedExternalAcceptance();
  console.log(JSON.stringify({
    mode: "verify-signature-component",
    scope: PUBLIC_RELEASE_SCOPE,
    signatureVerification: externalAcceptance,
    componentSignaturePass: externalAcceptance.verified,
    publicReleasePass: false,
    releaseComplete: false,
  }, null, 2));
  if (!externalAcceptance.verified) process.exitCode = 1;
} else {
  const completeTargets = requestedCompleteRoutes.length ? requestedCompleteRoutes : report.completeRoutes;
  const completeGateFailures = [];
  if (gateMode === "complete") {
    if (externalAcceptanceRequest.recordPath || externalAcceptanceRequest.keyringPath || externalAcceptanceRequest.trustPolicyPath || externalAcceptanceRequest.trustPolicySha256 || externalAcceptanceRequest.candidateCommit || externalAcceptanceRequest.evidenceDigest || verifyExternalAcceptanceStdin || routeArg) {
      completeGateFailures.push("public-release acceptance must be verified separately and cannot certify an individual route");
    }
    for (const route of completeTargets) {
      const routeReport = report.routeMaturity.find((entry) => entry.route === route);
      const evidence = maturity.PANEL_ROUTE_MATURITY_EVIDENCE[route];
      if (!routeReport) {
        completeGateFailures.push(`${route}: unknown route`);
        continue;
      }
      if (routeReport.maturity !== "complete") completeGateFailures.push(`${route}: route is not declared complete`);
      if (evidence?.dataDepth !== "domain-specific") completeGateFailures.push(`${route}: domain-specific data is missing`);
      if (evidence?.objectDetail !== "novel") completeGateFailures.push(`${route}: novel object detail is missing`);
      if (evidence?.failureRecovery !== "route-specific") completeGateFailures.push(`${route}: route-specific failure/recovery is missing`);
      if (evidence?.accessibility !== "automated-only") completeGateFailures.push(`${route}: automated accessibility coverage is missing`);
      if (evidence?.independentAcceptance !== "pending") completeGateFailures.push(`${route}: candidate source must leave independent acceptance pending`);
    }
  }
  const structuralPass = report.contractPass === true;
  const routePolicyPass = publicReleaseManifest.pass === true;
  const completeGatePass = gateMode !== "complete" || (structuralPass && completeGateFailures.length === 0);
  const { pass: _legacyPass, ...reportWithoutPass } = report;
  const result = {
    ...reportWithoutPass,
    structuralPass,
    routePolicyPass,
    publicReleasePass: false,
    externalAcceptanceRequired: true,
    gateMode,
    completeTargets,
    completeGateFailures,
    ...(contractOnly ? {} : { pass: completeGatePass }),
  };
  console.log(JSON.stringify(result, null, 2));
  if (!contractOnly && !completeGatePass) process.exitCode = 1;
}
