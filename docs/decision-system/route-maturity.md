# Public route maturity matrix

- status: `current`
- validForCommit: current clean candidate only; regenerate and bind all release evidence to the exact candidate SHA before sign-off
- supersededBy: `null`
- sourceOfTruth: `src/panel-framework/routes/panelRoutes.ts` plus `src/panel-framework/routes/panelRouteMaturity.ts`
- structuralGate: `tools/check-route-maturity-contract.js --mode=structural` (validates every declared implementation-maturity contract without promoting it)
- completeImplementationEligibilityGate: `tools/check-route-maturity-contract.js --mode=complete --routes=<route>` (checks implementation eligibility only; it cannot consume or assert external acceptance, public-release authorization, or release completion)

Maturity describes implemented operational depth, not URL existence.

| Label | Meaning |
|---|---|
| `complete` | The implementation provides domain-specific data, search/filter/sort/paging where applicable, object detail that adds evidence, error/recovery, and implementation-level accessibility support. External acceptance remains a separate release-evidence concern. |
| `bounded-readonly` | Real typed read-only data and bounded inspection exist, but one or more complete implementation criteria remain open. |
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

No route is currently labelled `complete`. The structural registry covers all 19 routes with `missing=0`, `extra=0`, `violations=0`; this structural gate may pass while `acceptanceComplete=false`. Matrix navigation coverage alone cannot change a route's implementation maturity. `evidenceRefs` are checked for file existence and source tokens by the contract; they do not replace human acceptance.

The source registry owns implementation maturity only. For every operational route, including any route declared `complete`, tracked evidence keeps `independentAcceptance: "pending"` and `acceptanceRefs: []`. Repository-local references, generated reports, and candidate-controlled files must not be used to turn that pending state into an acceptance claim. `--mode=complete` is therefore an implementation-eligibility check: it may verify that a requested route is declared `complete` and meets the implementation criteria, but it must not accept signature inputs or report independent acceptance, `publicReleasePass`, or release completion.

## External acceptance provenance

External acceptance is candidate-wide, not a route-scoped signature flow. The exact candidate is the explicit `--candidate-commit` 40-hex SHA. Its external candidate bundle must contain five distinct review roles: Product/Information Architecture, Visual/Interaction, Accessibility/Interaction, Engineering/Code Review, and Route Owner. These reviews are evidence inputs only; none is created or trusted merely because it is referenced by the source registry.

The Route Owner record must enumerate every operational route and accept that route at the exact maturity claimed by the candidate manifest, whether `bounded-readonly` or `complete`. Missing routes, duplicate routes, an undeclared maturity, a claim mismatch, or a non-pass result remains red. The `more` directory is not an operational route and must remain governed by its declared `unavailable` boundary unless the implementation contract itself changes.

The Accessibility/Interaction record must cover every operational route with real assistive-technology testing. At minimum it must identify the assistive technology and version, operating system, browser or host, device context, interaction modes exercised, exact routes covered, per-route outcomes, exact candidate identity, and referenced evidence. Automated accessibility checks, screenshots, source tokens, or an agent-only review cannot be relabelled as real AT acceptance. Missing metadata, incomplete route coverage, candidate mismatch, or any non-pass result remains red.

The candidate bundle and its evidence digest remain separate from global public-release authorization. A trusted Ed25519 `public-release` authorization is issued and verified only by an external promotion controller that pins its own policy and trust root and independently recomputes all bindings. Repository component checks cannot grant that authority. No route-scoped `schema-version: 1` record or `--route` signature invocation is part of this contract. See [external acceptance format](external-acceptance/README.md) for the candidate-bundle and global authorization boundaries.
