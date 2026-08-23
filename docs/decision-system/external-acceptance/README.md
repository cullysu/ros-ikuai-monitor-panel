# External public-release acceptance format

This repository is **not** a release trust authority. In particular, `trusted-reviewers.json` is not read by the release-candidate gate and cannot authorize a release. The commands below are structural component verifiers: because candidate code can be changed and caller-supplied identities cannot be authenticated here, their success can establish only `candidateEvidenceShapePass`. They must keep `candidateEvidencePass=false`, `publicReleasePass=false`, and `releaseComplete=false`.

The authoritative promotion controller must live outside the candidate repository, pin its own promotion policy and trust-policy digest, reject caller-supplied trust roots, and independently recompute the candidate, route manifest, evidence bundle, soak, and signature bindings. The repository tools may receive explicit external paths for regression checking, but those arguments do not become a trust anchor merely because their bytes and caller-supplied digest agree.

## Candidate review bundle

The external candidate bundle must contain five distinct review roles with distinct reviewers:

- `product-information-architecture`
- `visual-interaction`
- `accessibility-interaction`
- `engineering-code-review`
- `route-owner`

The Route Owner record must enumerate every operational route in `route-manifest.json` and accept each route at its exact declared maturity claim, including `bounded-readonly` claims as well as any `complete` claims. Missing or duplicate operational routes, maturity mismatches, and non-pass outcomes fail closed. Directory-only or `unavailable` entries are not operational-route acceptance claims.

The Accessibility/Interaction record must cover every operational route through real assistive-technology testing. Each test uses `assistive-technology-session/v1`, a reproducible session id and positive UTC interval, separate product and version fields for the OS, assistive technology, and browser/host, the fixed manual protocol id, unique interaction modes, and unique per-route results linked to evidence paths in the frozen bundle. Automated checks, source inspection, screenshots, or agent review alone are not real AT acceptance. The repository checker validates this structure and coverage only; the external controller must authenticate the reviewer and establish that the described manual AT session actually occurred. Missing metadata, generic versions, duplicate or incomplete route coverage, candidate mismatch, or any non-pass outcome fails closed.

The source registry does not own these review results. It owns implementation maturity and keeps `independentAcceptance: "pending"` with `acceptanceRefs: []`, including for an implementation declared `complete`. `tools/check-route-maturity-contract.js --mode=complete --routes=<route>` is an implementation-eligibility check only; it must not consume external acceptance inputs or assert external acceptance, public-release authorization, or release completion.

This section defines the required external contract; it does not assert that any candidate currently has the five records, complete route coverage, real AT evidence, or Route Owner acceptance.

## Signature component command

The only signature scope is global `public-release`; callers cannot select a route. This authorization is separate from the five candidate-review roles and from implementation maturity.

```text
node --max-old-space-size=2048 tools/check-route-maturity-contract.js --verify-external-acceptance --acceptance-record=<absolute-external-record-path> --acceptance-keyring=<absolute-external-keyring-path> --acceptance-trust-policy=<absolute-external-policy-path> --acceptance-trust-policy-sha256=sha256:<64-hex> --candidate-commit=<40-hex-sha> --evidence-digest=sha256:<64-hex> --product-contract-digest=sha256:<64-hex> --route-policy-digest=sha256:<64-hex> --route-manifest-digest=sha256:<64-hex>
```

The command above exists for format and signature regression tests. Its caller supplies both trust material and its asserted digest, so its success is named only as a component signature result and must never be consumed as release authority.

`tools/check-public-release-readiness.js --release-candidate` accepts only the candidate SHA, external review directory, RouterOS soak report, optional equality assertion for the evidence digest, and soak limits. It may return `candidateEvidenceShapePass=true` after freezing the review bundle and soak once through bounded file handles, validating their structure and exact candidate identity, and recomputing the manifest/evidence digests. It must still return `candidateEvidencePass=false`, `publicReleasePass=false`, and `releaseComplete=false`. Reviewer authenticity, real-AT attestation, signature trust, and promotion authorization are exclusively the external controller's job.

Inside these repository tools, the policy digest is only a caller assertion about bytes controlled outside the candidate repository. A policy path with a mismatched SHA-256, a repository path, a symlink, or a malformed policy fails the component check, but matching caller-controlled policy and digest is not promotion authority. The external controller must select and pin the trust policy itself. The keyring must exactly match that frozen policy's Ed25519 key IDs and public-key fingerprints.

## Evidence digest

```text
node --max-old-space-size=2048 tools/check-release-candidate-evidence.js --compute-evidence-digest --independent-review-dir=<absolute-external-review-dir> --soak-report=<absolute-soak-report>
```

Every regular file in the external review directory and the separate soak report bytes are included in one deterministic, path-aware SHA-256 bundle. The review directory must contain one top-level `route-manifest.json` whose bytes exactly equal `tools/check-route-maturity-contract.js --print-public-release-manifest` for the candidate. The signed record must bind the computed full-bundle digest; a supplied `--evidence-digest` is only an equality assertion.

## Signed record (`schema-version: 2`)

The record is UTF-8, has no BOM or carriage returns, ends in exactly one newline, and contains each field once in this order. The signature is base64 Ed25519 over every line before `signature`, including the trailing newline.

```text
schema-version: 2
repository: cullysu/ros-ikuai-monitor-panel
scope: public-release
product-contract-digest: sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
route-policy-digest: sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
route-manifest-digest: sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
independent-acceptance: pass
reviewed-commit: 0123456789abcdef0123456789abcdef01234567
reviewer-id: release-owner-name
key-id: release-owner-key-2026
evidence-digest: sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
signature-algorithm: ed25519
signature: <base64-ed25519-signature>
```

`scope` is fixed to `public-release`; arbitrary routes and `--route` signature selection are rejected. `reviewed-commit` must equal the clean current candidate HEAD; `evidence-digest` must equal the frozen full evidence-bundle digest; and the three route/product digests must equal the candidate's raw product contract, tracked bounded-release policy, and canonical 19-route manifest bytes. A route-local `acceptanceRefs` path is never acceptance proof, and this global signature does not change source-registry maturity or replace Route Owner and real-AT evidence.

## External trust policy and keyring

The trust policy is UTF-8 JSON and must be hashed as raw bytes before invocation:

```json
{
  "schema-version": 1,
  "keys": [{
    "key-id": "release-owner-key-2026",
    "public-key": "-----BEGIN PUBLIC KEY-----\\n...\\n-----END PUBLIC KEY-----\\n",
    "fingerprint": "<sha256-of-spki-der-hex>"
  }]
}
```

The external keyring uses the same `schema-version` and `keys`, with `key-id` and `public-key` only. Private keys, candidate-controlled trust policy copies, and signed records must not be stored in this repository.
