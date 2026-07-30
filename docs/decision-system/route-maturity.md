# Public route maturity matrix

- status: `current`
- validForCommit: current clean candidate only; regenerate and bind all release evidence to the exact candidate SHA before sign-off
- supersededBy: `null`
- sourceOfTruth: `src/panel-framework/routes/panelRoutes.ts` plus `src/panel-framework/routes/panelRouteMaturity.ts`
- strictGate: `tools/check-route-maturity-contract.js` (default mode is release-strict; `--contract-only` is structural inspection only)

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

No route is currently labelled `complete`. The structural registry covers all 19 routes with `missing=0`, `extra=0`, `violations=0`, but the strict gate remains `pass=false` while operational routes have pending independent Accessibility/acceptance. Promotion requires direct evidence for every complete criterion and independent acceptance; matrix navigation coverage alone cannot promote a route. `evidenceRefs` are checked for file existence and source tokens by the contract; they do not replace human acceptance.

## External acceptance provenance

The expected SHA is trusted only when it equals `git rev-parse HEAD` in a clean worktree. Missing Git identity, dirty worktree, missing key material, stale commit, malformed records, mismatched route identity, symlink/path escape or invalid signatures keep strict acceptance red.
`acceptanceRefs` are not accepted merely because a file exists under the dedicated path. A candidate record must use the fixed-field `schema-version: 1` format, identify the repository, route, exact reviewed candidate commit, reviewer, evidence digest, key-id, declare `signature-algorithm: ed25519`, and carry a signature over the canonical record content. The checker verifies the current candidate SHA, Ed25519 key type, fixed trusted-key fingerprint, path containment and real-file boundary before accepting it. The trusted fingerprint allowlist is empty until a real independent reviewer key is explicitly enrolled; environment variables may supply key material and expected SHA but cannot alter that allowlist. Missing key material, stale commit, malformed records, mismatched route identity, symlink/path escape or invalid signatures keep strict acceptance red. No product code may create or self-sign an acceptance record.
