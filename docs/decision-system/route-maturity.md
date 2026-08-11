# Public route maturity matrix

- status: `current`
- validForCommit: current clean candidate only; regenerate and bind all release evidence to the exact candidate SHA before sign-off
- supersededBy: `null`
- sourceOfTruth: `src/panel-framework/routes/panelRoutes.ts` plus `src/panel-framework/routes/panelRouteMaturity.ts`
- structuralGate: `tools/check-route-maturity-contract.js --mode=structural` (validates every declared bounded-readonly/unavailable contract without promoting it)
- completePromotionGate: `tools/check-route-maturity-contract.js --mode=complete --routes=<route> --acceptance-record=<absolute-external-path> --acceptance-keyring=<absolute-external-path> --candidate-commit=<40-hex-sha> --evidence-digest=sha256:<64-hex>` (requires independent Accessibility and signed external acceptance for one requested complete route)

Maturity describes implemented operational depth, not URL existence.

| Label | Meaning |
|---|---|
| `complete` | Domain-specific data, search/filter/sort/paging where applicable, object detail that adds evidence, error/recovery, accessibility, and independent acceptance. |
| `bounded-readonly` | Real typed read-only data and bounded inspection exist, but one or more complete-module criteria or independent acceptance remain open. |
| `fallback` | Route is real but reuses a broader model/inspector and provides limited route-specific depth. |
| `unavailable` | Not an operational module; directory or unavailable capability only. |

## Current routes

| Route | Maturity | Current product wording |
|---|---|---|
| overview | bounded-readonly | Operational overview surface |
| interfaces | bounded-readonly | Interface workspace |
| lineStatus | bounded-readonly | WAN line workspace |
| balance | bounded-readonly | WAN distribution view |
| routes | bounded-readonly | Route workspace |
| terminals | bounded-readonly | Terminal workspace |
| dhcp | bounded-readonly | DHCP workspace |
| arp | bounded-readonly | ARP workspace |
| trafficLoad | bounded-readonly | Resource workspace |
| loadAudit | bounded-readonly | Timestamped resource sampling audit workspace |
| trafficAudit | bounded-readonly | Traffic audit workspace |
| connections | bounded-readonly | Connection workspace |
| dns4 | bounded-readonly | IPv4 DNS workspace |
| dns6 | bounded-readonly | IPv6/DNS workspace |
| security | bounded-readonly | Security observation workspace |
| logs | bounded-readonly | Runtime log workspace |
| serviceLogs | bounded-readonly | Service-log workspace |
| readonlyDiagnostics | bounded-readonly | Read-only diagnostics workspace |
| more | unavailable | Tool directory, not a module |

No route is currently labelled `complete`. The structural registry covers all 19 routes with `missing=0`, `extra=0`, `violations=0`; this structural gate may pass while `acceptanceComplete=false` because the public claim is explicitly bounded-readonly rather than complete. Promotion requires direct evidence for every complete criterion and independent acceptance; matrix navigation coverage alone cannot promote a route. `evidenceRefs` are checked for file existence and source tokens by the contract; they do not replace human acceptance.

## External acceptance provenance

The exact candidate is the explicit `--candidate-commit` value, not `HEAD`; the checker requires a resolvable 40-hex Git commit object but deliberately does not require the current worktree to be clean. This lets an independent Route Owner/real AT sign a candidate tree without making their signed record part of that same tree.

For a complete-promotion invocation, the acceptance record and its trusted keyring are both mandatory explicit **absolute paths outside this repository**. Repository-local paths, relative paths, symlinks, malformed keyrings, non-Ed25519 keys, unknown key IDs, route mismatch, candidate-SHA mismatch, evidence-digest mismatch, and invalid signatures remain red. `acceptanceRefs` remain a structural declaration of an external-acceptance boundary; the checker never reads a signed record from them or from the tracked `docs/` tree.

The signed fixed-field `schema-version: 1` record binds repository, route, independent result, the exact reviewed candidate commit, reviewer, key ID, evidence digest, `ed25519`, and the signature over the canonical record bytes. The expected digest is provided as `--evidence-digest`, so a valid signature cannot be reused for different evidence. The external keyring is the explicit trust root for that invocation; no environment-provided key, in-repository fingerprint allowlist, or production private key is used. The standalone verifier is `tools/check-route-maturity-contract.js --verify-external-acceptance --route=<route>` with the same four external inputs. See [external acceptance format](external-acceptance/README.md) for the file formats.

No route is promoted merely by this signature path: the structural registry and all complete criteria still apply. In particular, a `bounded-readonly` route remains bounded-readonly even when a testable external signature verifies.
