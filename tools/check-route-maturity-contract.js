"use strict";

const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const root = process.cwd();
const EXTERNAL_ACCEPTANCE_REPOSITORY = "cullysu/ros-ikuai-monitor-panel";
const EXTERNAL_ACCEPTANCE_FIELDS = [
  "schema-version",
  "repository",
  "route",
  "independent-acceptance",
  "reviewed-commit",
  "reviewer-id",
  "key-id",
  "evidence-digest",
  "signature-algorithm",
  "signature",
];
const TRUSTED_EXTERNAL_ACCEPTANCE_KEY_FINGERPRINTS = Object.freeze({});

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
  if (fields["schema-version"] !== "1") return null;
  if (fields.repository !== EXTERNAL_ACCEPTANCE_REPOSITORY) return null;
  if (!/^[0-9a-f]{40}$/.test(fields["reviewed-commit"])) return null;
  if (!/^[A-Za-z0-9._-]{1,80}$/.test(fields["reviewer-id"])) return null;
  if (!/^[A-Za-z0-9._-]{1,80}$/.test(fields["key-id"])) return null;
  if (fields["independent-acceptance"] !== "pass") return null;
  if (!/^sha256:[0-9a-f]{64}$/.test(fields["evidence-digest"])) return null;
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

function isExactCandidateBinding(candidateCommit, expectedCommit, worktreeClean) {
  return worktreeClean && /^[0-9a-f]{40}$/.test(candidateCommit || "") && candidateCommit === expectedCommit;
}

function currentGitCandidateCommit(workspaceRoot, commandRunner = spawnSync) {
  const head = commandRunner("git", ["rev-parse", "HEAD"], { cwd: workspaceRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const status = commandRunner("git", ["status", "--porcelain", "--untracked-files=all"], { cwd: workspaceRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  const candidateCommit = head.status === 0 ? String(head.stdout || "").trim().toLowerCase() : "";
  const worktreeClean = status.status === 0 && String(status.stdout || "").trim() === "";
  return isExactCandidateBinding(candidateCommit, candidateCommit, worktreeClean) ? candidateCommit : null;
}

function resolveExternalAcceptanceTrust(workspaceRoot = root) {
  const keyId = process.env.PANEL_EXTERNAL_ACCEPTANCE_KEY_ID || "";
  const expectedCommit = (process.env.PANEL_EXTERNAL_ACCEPTANCE_EXPECTED_COMMIT || "").trim().toLowerCase();
  const publicKeyText = (process.env.PANEL_EXTERNAL_ACCEPTANCE_PUBLIC_KEY || "").replace(/\\n/g, "\n");
  const candidateCommit = currentGitCandidateCommit(workspaceRoot);
  if (!/^[A-Za-z0-9._-]{1,80}$/.test(keyId) || !/^[0-9a-f]{40}$/.test(expectedCommit) || !publicKeyText || !isExactCandidateBinding(candidateCommit, expectedCommit, Boolean(candidateCommit))) return null;
  try {
    const publicKey = crypto.createPublicKey(publicKeyText);
    if (publicKey.asymmetricKeyType !== "ed25519") return null;
    const fingerprint = publicKeyFingerprint(publicKey);
    if (TRUSTED_EXTERNAL_ACCEPTANCE_KEY_FINGERPRINTS[keyId] !== fingerprint) return null;
    return { publicKey, keyId, expectedCommit, trustedFingerprint: fingerprint };
  } catch {
    return null;
  }
}

function validateExternalAcceptanceText(route, ref, text, trustOverride = null) {
  if (!ref.startsWith(maturity.PANEL_EXTERNAL_ACCEPTANCE_PREFIX)) return false;
  const parsed = parseExternalAcceptanceText(text);
  if (!parsed || parsed.fields.route !== route) return false;
  const trust = trustOverride || resolveExternalAcceptanceTrust();
  if (!trust || parsed.fields["key-id"] !== trust.keyId || parsed.fields["reviewed-commit"] !== trust.expectedCommit) return false;
  try {
    const publicKey = trust.publicKey.type ? trust.publicKey : crypto.createPublicKey(trust.publicKey);
    if (publicKey.asymmetricKeyType !== "ed25519") return false;
    if (trust.trustedFingerprint && publicKeyFingerprint(publicKey) !== trust.trustedFingerprint) return false;
    return crypto.verify(null, Buffer.from(parsed.payload, "utf8"), publicKey, parsed.signature);
  } catch {
    return false;
  }
}

function isContainedExternalAcceptancePath(externalRoot, resolved, realExternalRoot, realResolved) {
  const relative = path.relative(externalRoot, resolved);
  const realRelative = path.relative(realExternalRoot, realResolved);
  const inside = (candidate) => candidate && candidate !== ".." && !candidate.startsWith(".." + path.sep) && !path.isAbsolute(candidate);
  return inside(relative) && inside(realRelative) && realResolved.toLowerCase() === resolved.toLowerCase();
}

function resolveExternalAcceptancePath(workspaceRoot, ref) {
  if (!ref.startsWith(maturity.PANEL_EXTERNAL_ACCEPTANCE_PREFIX) || ref.includes("\\") || ref.includes("//")) return null;
  const externalRoot = path.resolve(workspaceRoot, maturity.PANEL_EXTERNAL_ACCEPTANCE_PREFIX);
  const resolved = path.resolve(workspaceRoot, ref);
  try {
    if (!fs.existsSync(externalRoot) || !fs.existsSync(resolved) || !fs.lstatSync(resolved).isFile()) return null;
    const realExternalRoot = fs.realpathSync(externalRoot);
    const realResolved = fs.realpathSync(resolved);
    if (!isContainedExternalAcceptancePath(externalRoot, resolved, realExternalRoot, realResolved)) return null;
    return resolved;
  } catch {
    return null;
  }
}

function validateExternalAcceptanceRef(route, ref, workspaceRoot = root, trustOverride = null) {
  const resolved = resolveExternalAcceptancePath(workspaceRoot, ref);
  if (!resolved) return false;
  return validateExternalAcceptanceText(route, ref, fs.readFileSync(resolved, "utf8"), trustOverride);
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

assert.ok(
  maturity.PANEL_ROUTE_MATURITY_EVIDENCE,
  "every route must have an explicit maturity evidence record",
);
assert.equal(typeof maturity.validatePanelRouteMaturity, "function");

const report = maturity.validatePanelRouteMaturity(routes.PANEL_ROUTES, routes.PANEL_ROUTE_IDS);
assert.deepEqual(report.missing, [], "route maturity evidence must cover every route id exactly once");
assert.deepEqual(report.extra, [], "route maturity evidence must not contain phantom route ids");
assert.deepEqual(report.missingDefinitions, [], "route definitions must cover every route id exactly once");
assert.deepEqual(report.extraDefinitions, [], "route definitions must not contain phantom route ids");
assert.deepEqual(report.violations, [], JSON.stringify(report.violations, null, 2));
assert.equal(report.completeRoutes.length, 0, "no route may claim complete without independent proof");
assert.equal(report.contractPass, true, "the structural contract should be independently reportable");
assert.equal(report.acceptanceComplete, false, "pending independent acceptance must remain incomplete");
assert.equal(report.pass, false, "pending acceptance must not produce a top-level green release result");

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
  if (evidence.accessibility === "independent-pass") {
    assert.ok(evidence.accessibilitySource && evidence.accessibilityToken, `${route}: independent accessibility needs a source token`);
    assert.equal(fs.existsSync(path.join(root, evidence.accessibilitySource)), true, `${route}: independent accessibility source must exist`);
    assert.equal(fs.readFileSync(path.join(root, evidence.accessibilitySource), "utf8").includes(evidence.accessibilityToken), true, `${route}: independent accessibility token must bind to source`);
  }
  if (evidence.independentAcceptance === "independent-pass") {
    assert.ok(evidence.acceptanceRefs.length > 0, `${route}: independent acceptance needs explicit refs`);
    assert.ok(evidence.acceptanceRefs.every((ref) => ref.startsWith(maturity.PANEL_EXTERNAL_ACCEPTANCE_PREFIX)), `${route}: independent acceptance refs must use the external boundary`);
  }
  for (const ref of evidence.acceptanceRefs) {
    assert.equal(validateExternalAcceptanceRef(route, ref), true, `${route}: acceptance ref must be externally signed and route-bound`);
  }
}

const accessibilityRuntime = fs.readFileSync(path.join(root, "tools", "check-panel-runtime-browser.js"), "utf8");
const accessibilityBlock = accessibilityRuntime.match(/const accessibilityRoutes = \[(.*?)\];/s);
assert.ok(accessibilityBlock, "runtime checker must expose its accessibility route scope");
const actualAccessibilityRoutes = [...accessibilityBlock[1].matchAll(/route:\s*'([^']+)'/g)].map((match) => match[1]).sort();
const declaredAccessibilityRoutes = [...new Set(
  Object.values(maturity.PANEL_ROUTE_MATURITY_EVIDENCE).flatMap((evidence) => evidence.automatedAccessibilityRoutes),
)].sort();
assert.deepEqual(declaredAccessibilityRoutes, actualAccessibilityRoutes, "registry accessibility scope must equal the real checker scope");

const completeClaim = structuredClone(routes.PANEL_ROUTES);
completeClaim.overview.maturity = "complete";
const completeClaimReport = maturity.validatePanelRouteMaturity(completeClaim, routes.PANEL_ROUTE_IDS);
assert.ok(
  completeClaimReport.violations.some((item) => item.includes("overview: complete route needs independent accessibility pass")),
  "a complete claim without real accessibility proof must remain red",
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
  accessibility: "independent-pass",
  independentAcceptance: "independent-pass",
  acceptanceRefs: [],
} };
const completeAcceptanceReport = maturity.validatePanelRouteMaturity(completeClaim, routes.PANEL_ROUTE_IDS, completeEvidence);
assert.ok(completeAcceptanceReport.violations.some((item) => item.includes("overview: independent acceptance needs explicit refs")), "independent pass without acceptance refs must remain red");

const fakeAcceptanceEvidence = { ...completeEvidence, overview: {
  ...completeEvidence.overview,
  acceptanceRefs: ["package.json"],
} };
const fakeAcceptanceReport = maturity.validatePanelRouteMaturity(routes.PANEL_ROUTES, routes.PANEL_ROUTE_IDS, fakeAcceptanceEvidence);
assert.ok(fakeAcceptanceReport.violations.some((item) => item.includes("external-acceptance boundary")), "arbitrary existing files must not satisfy independent acceptance");

const fakeIndependentAccessibilityEvidence = { ...completeEvidence, overview: {
  ...completeEvidence.overview,
  accessibilityToken: "",
  acceptanceRefs: ["package.json"],
} };
const fakeIndependentAccessibilityReport = maturity.validatePanelRouteMaturity(routes.PANEL_ROUTES, routes.PANEL_ROUTE_IDS, fakeIndependentAccessibilityEvidence);
assert.ok(fakeIndependentAccessibilityReport.violations.some((item) => item.includes("independent accessibility needs a source token")), "independent accessibility must retain source binding");

const forgedExternalAcceptance = [
  "route: overview",
  "independent-acceptance: pass",
  `reviewed-commit: ${"a".repeat(40)}`,
  "reviewer-id: forged",
].join("\n");
assert.equal(
  validateExternalAcceptanceText("overview", `${maturity.PANEL_EXTERNAL_ACCEPTANCE_PREFIX}forged.md`, forgedExternalAcceptance),
  false,
  "a legal external-acceptance path and text marker must not count without an external signature",
);

const positiveKeyPair = crypto.generateKeyPairSync("ed25519");
const positivePublicKey = positiveKeyPair.publicKey;
const positiveCommit = "b".repeat(40);
const positiveTrust = {
  publicKey: positivePublicKey,
  keyId: "test-reviewer",
  expectedCommit: positiveCommit,
  trustedFingerprint: publicKeyFingerprint(positivePublicKey),
};
function makeSignedAcceptanceText(keyPair, keyId, reviewedCommit) {
  const payload = [
    "schema-version: 1",
    "repository: " + EXTERNAL_ACCEPTANCE_REPOSITORY,
    "route: overview",
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
  validateExternalAcceptanceText("overview", maturity.PANEL_EXTERNAL_ACCEPTANCE_PREFIX + "positive.md", positiveAcceptanceText, positiveTrust),
  true,
  "a valid Ed25519 external acceptance must verify",
);
assert.equal(
  validateExternalAcceptanceText("overview", maturity.PANEL_EXTERNAL_ACCEPTANCE_PREFIX + "tampered.md", positiveAcceptanceText.replace("evidence-digest: sha256:" + "0".repeat(64), "evidence-digest: sha256:" + "1".repeat(64)), positiveTrust),
  false,
  "tampering with the signed payload must fail",
);
assert.equal(
  validateExternalAcceptanceText("interfaces", maturity.PANEL_EXTERNAL_ACCEPTANCE_PREFIX + "wrong-route.md", positiveAcceptanceText, positiveTrust),
  false,
  "a signed record for another route must fail",
);
assert.equal(
  validateExternalAcceptanceText("overview", maturity.PANEL_EXTERNAL_ACCEPTANCE_PREFIX + "stale.md", positiveAcceptanceText.replace(positiveCommit, "c".repeat(40)), positiveTrust),
  false,
  "a signed record for a stale commit must fail",
);
assert.equal(
  validateExternalAcceptanceText("overview", maturity.PANEL_EXTERNAL_ACCEPTANCE_PREFIX + "duplicate.md", positiveAcceptanceText.replace("reviewer-id: test-reviewer\n", "reviewer-id: test-reviewer\nreviewer-id: duplicate\n"), positiveTrust),
  false,
  "duplicate fields must fail the fixed schema",
);
assert.equal(
  resolveExternalAcceptancePath(root, maturity.PANEL_EXTERNAL_ACCEPTANCE_PREFIX + "../package.json"),
  null,
  "external acceptance paths must not escape their directory",
);
assert.equal(isExactCandidateBinding("b".repeat(40), "b".repeat(40), true), true, "matching clean candidate SHA must bind");
assert.equal(isExactCandidateBinding("b".repeat(40), "b".repeat(40), false), false, "dirty worktrees must not bind acceptance");
assert.equal(isExactCandidateBinding("b".repeat(40), "c".repeat(40), true), false, "stale candidate SHA must not bind acceptance");
const fakeCleanGitRunner = (_command, args) => args[1] === "HEAD"
  ? { status: 0, stdout: "b".repeat(40) + "\n" }
  : { status: 0, stdout: "" };
const fakeDirtyGitRunner = (_command, args) => args[1] === "HEAD"
  ? { status: 0, stdout: "b".repeat(40) + "\n" }
  : { status: 0, stdout: " M package.json\n" };
const fakeMissingGitRunner = () => ({ status: 1, stdout: "" });
assert.equal(currentGitCandidateCommit(root, fakeCleanGitRunner), "b".repeat(40), "clean Git candidate must be directly testable");
assert.equal(currentGitCandidateCommit(root, fakeDirtyGitRunner), null, "dirty Git candidate must be directly rejected");
assert.equal(currentGitCandidateCommit(root, fakeMissingGitRunner), null, "missing Git candidate must be directly rejected");
const boundaryRoot = path.join(root, "docs", "decision-system", "external-acceptance");
const boundaryTarget = path.join(boundaryRoot, "record.md");
const outsideTarget = path.join(root, "package.json");
assert.equal(isContainedExternalAcceptancePath(boundaryRoot, boundaryTarget, boundaryRoot, boundaryTarget), true, "real path inside the boundary must pass");
assert.equal(isContainedExternalAcceptancePath(boundaryRoot, boundaryTarget, boundaryRoot, outsideTarget), false, "real path outside the boundary must fail");

const ed448KeyPair = crypto.generateKeyPairSync("ed448");
const ed448PublicKey = ed448KeyPair.publicKey;
const ed448Trust = {
  publicKey: ed448PublicKey,
  keyId: "test-ed448",
  expectedCommit: positiveCommit,
  trustedFingerprint: publicKeyFingerprint(ed448PublicKey),
};
const ed448AcceptanceText = makeSignedAcceptanceText(ed448KeyPair, ed448Trust.keyId, positiveCommit);
assert.equal(
  validateExternalAcceptanceText("overview", maturity.PANEL_EXTERNAL_ACCEPTANCE_PREFIX + "ed448.md", ed448AcceptanceText, ed448Trust),
  false,
  "an Ed448 key must not satisfy the Ed25519 contract",
);

const positiveAcceptanceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "route-maturity-"));
try {
  const positiveAcceptanceRef = maturity.PANEL_EXTERNAL_ACCEPTANCE_PREFIX + "positive.md";
  const positiveAcceptancePath = path.join(positiveAcceptanceRoot, positiveAcceptanceRef);
  fs.mkdirSync(path.dirname(positiveAcceptancePath), { recursive: true });
  fs.writeFileSync(positiveAcceptancePath, positiveAcceptanceText, "utf8");
  assert.equal(
    validateExternalAcceptanceRef("overview", positiveAcceptanceRef, positiveAcceptanceRoot, positiveTrust),
    true,
    "a valid acceptance file must pass the real path validator",
  );
  const outsideAcceptancePath = path.join(positiveAcceptanceRoot, "outside.md");
  const symlinkRef = maturity.PANEL_EXTERNAL_ACCEPTANCE_PREFIX + "linked.md";
  const symlinkPath = path.join(positiveAcceptanceRoot, symlinkRef);
  fs.writeFileSync(outsideAcceptancePath, positiveAcceptanceText, "utf8");
  try {
    fs.symlinkSync(outsideAcceptancePath, symlinkPath, "file");
    assert.equal(
      validateExternalAcceptanceRef("overview", symlinkRef, positiveAcceptanceRoot, positiveTrust),
      false,
      "a real symlink escape must be rejected",
    );
  } catch (error) {
    assert.ok(["EPERM", "EACCES"].includes(error.code), `symlink regression unavailable only for an explicit platform permission error: ${error.code}`);
  }
} finally {
  fs.rmSync(positiveAcceptanceRoot, { recursive: true, force: true });
}

const contractOnly = process.argv.includes("--contract-only");
const { pass: releasePass, ...reportWithoutPass } = report;
const result = contractOnly
  ? { ...reportWithoutPass, releasePass: false }
  : { ...reportWithoutPass, pass: releasePass };
console.log(JSON.stringify(result, null, 2));
if (!contractOnly && !result.pass) process.exitCode = 1;
