"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = process.cwd();
const checker = path.join(root, "tools", "check-route-maturity-contract.js");
const repository = "cullysu/ros-ikuai-monitor-panel";
const candidateResult = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
assert.equal(candidateResult.status, 0, "test needs a Git candidate commit");
const candidate = candidateResult.stdout.trim().toLowerCase();
const evidenceDigest = "sha256:" + "0".repeat(64);
const manifestResult = spawnSync(process.execPath, [checker, "--print-public-release-manifest"], { cwd: root, encoding: null });
assert.equal(manifestResult.status, 0, "test needs a canonical public-release manifest");
const routeManifestDigest = "sha256:" + crypto.createHash("sha256").update(manifestResult.stdout).digest("hex");
const routePolicyDigest = "sha256:" + crypto.createHash("sha256").update(fs.readFileSync(path.join(root, "docs", "decision-system", "external-acceptance", "route-release-policy.json"))).digest("hex");
const productContractDigest = "sha256:" + crypto.createHash("sha256").update(fs.readFileSync(path.join(root, "docs", "full-console-product-contract.md"))).digest("hex");

function fingerprint(publicKey) {
  return crypto.createHash("sha256").update(publicKey.export({ format: "der", type: "spki" })).digest("hex");
}

function makeRecord(keyPair, { scope = "public-release", digest = evidenceDigest } = {}) {
  const payload = [
    "schema-version: 2",
    "repository: " + repository,
    "scope: " + scope,
    "product-contract-digest: " + productContractDigest,
    "route-policy-digest: " + routePolicyDigest,
    "route-manifest-digest: " + routeManifestDigest,
    "independent-acceptance: pass",
    "reviewed-commit: " + candidate,
    "reviewer-id: release-owner-test",
    "key-id: release-owner-test",
    "evidence-digest: " + digest,
    "signature-algorithm: ed25519",
  ].join("\n") + "\n";
  return payload + "signature: " + crypto.sign(null, Buffer.from(payload, "utf8"), keyPair.privateKey).toString("base64") + "\n";
}

function runVerification(args, input) {
  const result = spawnSync(process.execPath, [checker, "--verify-external-acceptance", ...args], {
    cwd: root,
    encoding: "utf8",
    input,
    env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=2048", CODEX_MEMORY_LIMIT_MB: "2048" },
  });
  assert.equal(result.error, undefined, `checker did not start: ${result.error}`);
  return { ...result, body: JSON.parse(result.stdout) };
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "route-maturity-external-acceptance-"));
try {
  const keyPair = crypto.generateKeyPairSync("ed25519");
  const publicKey = keyPair.publicKey.export({ format: "pem", type: "spki" });
  const recordPath = path.join(tempRoot, "release.acceptance");
  const keyringPath = path.join(tempRoot, "release.keyring.json");
  const policyPath = path.join(tempRoot, "release.trust.json");
  const policy = { "schema-version": 1, keys: [{ "key-id": "release-owner-test", "public-key": publicKey, fingerprint: fingerprint(keyPair.publicKey) }] };
  fs.writeFileSync(recordPath, makeRecord(keyPair), "utf8");
  fs.writeFileSync(keyringPath, JSON.stringify({ "schema-version": 1, keys: [{ "key-id": "release-owner-test", "public-key": publicKey }] }), "utf8");
  fs.writeFileSync(policyPath, JSON.stringify(policy), "utf8");
  const policySha = "sha256:" + crypto.createHash("sha256").update(fs.readFileSync(policyPath)).digest("hex");
  const args = [
    `--acceptance-record=${recordPath}`,
    `--acceptance-keyring=${keyringPath}`,
    `--acceptance-trust-policy=${policyPath}`,
    `--acceptance-trust-policy-sha256=${policySha}`,
    `--candidate-commit=${candidate}`,
    `--evidence-digest=${evidenceDigest}`,
    `--product-contract-digest=${productContractDigest}`,
    `--route-policy-digest=${routePolicyDigest}`,
    `--route-manifest-digest=${routeManifestDigest}`,
  ];

  const positive = runVerification(args);
  assert.equal(positive.status, 0, positive.stderr);
  assert.equal(positive.body.componentSignaturePass, true, "public-release record format and signature component must verify");
  assert.equal(positive.body.signatureVerification.scope, "public-release");
  assert.equal(positive.body.publicReleasePass, false, "caller-supplied trust material cannot authorize release");
  assert.equal(positive.body.releaseComplete, false, "component verification cannot claim exact-SHA CL completion");

  const wrongScopePath = path.join(tempRoot, "overview.acceptance");
  fs.writeFileSync(wrongScopePath, makeRecord(keyPair, { scope: "overview" }), "utf8");
  const wrongScope = runVerification(args.map((arg) => arg.startsWith("--acceptance-record=") ? `--acceptance-record=${wrongScopePath}` : arg));
  assert.notEqual(wrongScope.status, 0, "a valid signature for an arbitrary route must be rejected");

  const legacyRoute = runVerification(["--route=overview", ...args]);
  assert.notEqual(legacyRoute.status, 0, "a caller supplied route must be rejected");

  const badPolicyHash = runVerification(args.map((arg) => arg.startsWith("--acceptance-trust-policy-sha256=") ? `--acceptance-trust-policy-sha256=sha256:${"1".repeat(64)}` : arg));
  assert.notEqual(badPolicyHash.status, 0, "a mismatched policy hash must fail");

  const frozenInput = JSON.stringify({ record: fs.readFileSync(recordPath).toString("base64"), keyring: fs.readFileSync(keyringPath).toString("base64"), trustPolicy: fs.readFileSync(policyPath).toString("base64") });
  fs.writeFileSync(recordPath, "attacker replacement\n");
  const stdinResult = runVerification(["--verify-external-acceptance-stdin", `--acceptance-trust-policy-sha256=${policySha}`, `--candidate-commit=${candidate}`, `--evidence-digest=${evidenceDigest}`, `--product-contract-digest=${productContractDigest}`, `--route-policy-digest=${routePolicyDigest}`, `--route-manifest-digest=${routeManifestDigest}`], frozenInput);
  assert.equal(stdinResult.status, 0, "frozen acceptance bytes must ignore later path replacement");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

console.log("route maturity external acceptance regressions passed");
