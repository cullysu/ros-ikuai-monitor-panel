# Full RouterOS Read-only Console Product Contract

## Status

- status: `current-contract / acceptance-failed`
- validForCommit: Step947 exact local acceptance and engineering readiness; whole-product release acceptance remains failed
- supersededBy: `null`
- Current local review boundary: Step947 has four records bound to exact clean runtime artifact `d45b428535d9beadd5abbe980d6485c77338d483`; they are local evidence only, not external promotion acceptance, and `releaseEligible=false`
- Engineering release: `a414f7ae` historically passed exact-SHA Linux, Windows, and GHCR
- Product release gate: **FAIL — local four-role acceptance, exact matrices and engineering readiness are closed, but route maturity, real RouterOS soak, trusted promotion and current remote-SHA CL are not closed**
- Current loop stage: Verify release evidence
- Baseline failure evidence: `_acceptance/review-ced6386-all-sections/report.json`

The previous overview-only matrices are retained as regression evidence for the overview surface. They are not evidence that the full product is releasable.

Step947 records an exact clean-SHA whole-product replay and local independent acceptance. It still requires real RouterOS read-only soak, route-owner maturity/acceptance, trusted promotion authorization, GitHub publication and exact uploaded-SHA Linux/Windows/GHCR CL. GitHub is not uploaded; the task is active with `blocked=false`.

## Operator jobs

1. Connect the panel to one RouterOS device without silently weakening transport trust.
2. Decide whether service is usable and whether the evidence is current.
3. Move directly to the affected object: WAN, route, interface, terminal, resource, connection, DNS, security finding, or log entry.
4. Refresh, recover from an error, switch device, deep-link a module, and use browser Back/Forward without losing context.
5. Understand what is observed, historical, unavailable, or outside the panel's read-only boundary.

## Product invariants

- Production API failures never render scenario fixtures.
- `current` evidence expires as time passes; it is not a permanent label assigned at mount time.
- A navigation item is not valid unless URL, title, content, focus, and data ownership all change together.
- Every formal route has loading, empty, stale, partial, error, and recovery behavior where applicable.
- Mobile and desktop may share route/data semantics but do not share a hidden presentation tree.
- No RouterOS write API is introduced.
- Public readiness remains false while any required route, state, viewport, accessibility, security, or exact-SHA CL cell is missing.

## Release gate semantics

`structuralPass` only means that the route registry and its local evidence records are internally consistent. It is an engineering result, never a public-release verdict. Ordinary readiness reports `engineeringReadinessPass` only.

The versioned `bounded-public-release-v1` policy declares the 18 operational routes as `module` routes with minimum maturity `bounded-readonly`; `more` is explicitly a `directory` route with maturity `unavailable`. A public release additionally requires a clean exact-SHA candidate, the complete runtime matrix, external reviews, RouterOS read-only soak, and a trusted `public-release` signature. That signature binds the raw product-contract digest, raw route-policy digest, and a canonical 19-route manifest recomputed from `PANEL_ROUTE_IDS`, `PANEL_ROUTES`, and route-maturity evidence. The external review bundle must carry exactly those manifest bytes as `route-manifest.json`.

The repository candidate checker can report only `candidateEvidenceShapePass`; it always keeps `candidateEvidencePass=false`, `publicReleasePass=false`, and `releaseComplete=false` because candidate code cannot authenticate caller-supplied reviewer or assistive-technology identities. Promotion authorization belongs to a controller outside the candidate repository with a fixed trust root and promotion policy. Even that authorization is pre-publication evidence: `releaseComplete` remains false until the uploaded exact SHA passes Linux, Windows, and GHCR CL. Local `acceptanceRefs` are forbidden as acceptance proof.

## Route contract

All 19 formal route identifiers remain valid deep links. They are grouped into task-oriented navigation rather than presented as nineteen equal top-level destinations.

| Route | Product destination | Primary snapshot/API evidence | Mobile task group |
|---|---|---|---|
| `overview` | Operational overview | snapshot verdict, freshness, WAN, route, rates | 概览 |
| `interfaces` | Interface inventory and incidents | `snapshot.interfaces` | 接口 |
| `lineStatus` | WAN line state | `snapshot.wan`, `snapshot.pppoe` | 接口 |
| `balance` | WAN distribution and policy | `snapshot.loadBalance`, routes, WAN | 接口 |
| `routes` | Route table and active defaults | `snapshot.routes` | 更多 |
| `terminals` | Terminal inventory | `snapshot.terminals` | 终端 |
| `dhcp` | DHCP leases and clients | `snapshot.dhcp` | 终端 |
| `arp` | ARP inventory and identity conflicts | `snapshot.arp` | 终端 |
| `trafficLoad` | CPU, memory, disk, interface throughput | `snapshot.overview`, interfaces | 概览 |
| `loadAudit` | Resource history and pressure evidence | `snapshot.overview.history` | 更多 |
| `trafficAudit` | Protocol and top-client traffic | `snapshot.connections` | 更多 |
| `connections` | Active connection inspection | snapshot plus `/api/connection-search` | 更多 |
| `dns4` | IPv4 DNS service and static rules | `snapshot.dns`, `/api/dns-static` | 更多 |
| `dns6` | IPv6 ND/DHCP/DNS evidence | `snapshot.dns.ipv6Nd`, `ipv6DhcpClients` | 更多 |
| `security` | Read-only security findings | `snapshot.security`, findings API | 更多 |
| `logs` | Operational log stream | `snapshot.logs.all` | 日志 |
| `serviceLogs` | Logs grouped by service | `snapshot.logs` | 日志 |
| `readonlyDiagnostics` | Explicitly bounded diagnostics | `/api/readonly-diagnostics` or an honest disabled state | 更多 |

Unknown routes resolve to `overview` and replace the invalid URL; they never display overview while claiming another route is active.

## Navigation behavior

- The canonical deep link keeps route state in `?section=interfaces` only; a legacy `#interfaces` may be read once for compatibility and is then removed with `replaceState`. Query state wins if both are present.
- Route changes emit only the canonical query representation; reload, copied links, and old hash-only links normalize to the same destination.
- Clicking navigation pushes browser history.
- Back/Forward restores route and focus.
- Reloading a deep link renders that route directly.
- Desktop back/object commands and compact task navigation consume the same route and object-history state, while keeping separate presentation trees.
- Active navigation state is derived from the router; legacy scripts may not self-assign active state.

## Connection and runtime state

### Connection states

`checking -> unconfigured | ready | error`

`unconfigured` and explicit device switching open the RouterOS connection flow. The flow performs real REST/SSH tests and shows each channel independently.

### Snapshot states

`idle -> loading -> current -> refreshing`

Transitions may also enter `stale`, `error`, or `recovering`. A last known snapshot may remain visible only with an explicit historical/stale boundary. `navigator.onLine` is never a formal snapshot state.

### Refresh rules

- Poll interval comes from validated snapshot metadata, clamped to a safe range.
- Manual refresh is always available on operational routes.
- Visibility restoration refreshes immediately when the last successful request is old enough.
- Browser `online` and `offline` events are hints that trigger status messaging or recovery attempts; they never block a real LAN snapshot request or independently decide RouterOS reachability.
- Concurrent refreshes are deduplicated or superseded with `AbortController`.

## Mobile information architecture

Four stable compact destinations are `概览 / 网络 / 终端 / 日志`; lower-frequency routes live in the real `更多` directory rather than a fifth persistent tab.

The independent compact render tree owns viewports through `1199px`. From `600px` upward it may introduce task navigation and object/detail capability only when both usable width and height can hold them; short landscape keeps the continuous patrol grammar. The dense desktop work surface starts at `1200px`. The 1199/1200 boundary may change pane arrangement, but must preserve task vocabulary, selected object, evidence priority and URL state; 1365/1366 must therefore remain semantically continuous.

The 390×844 overview first viewport must include:

1. service verdict;
2. evidence time/state;
3. refresh action;
4. three non-repeated core facts;
5. up to three highest-priority affected objects.

An affected-object list is vertical. Selecting an object navigates to its detail; the selected object is not repeated once as a summary card and again in a horizontal carousel.

## Desktop domain workspaces

At `1200px` and above, as defined by `docs/decision-system/responsive-capabilities.md`, operational routes use a desktop-only object workspace rather than the compact render tree or a generic read-only table. `1366px` and `1440px` are required desktop acceptance viewports, not additional product thresholds. Every formal domain route provides real search, typed filters, typed sorting, pagination state, comparable object rows, and an evidence inspector. Normal interface pages automatically preview the verified default-route carrier; incidents preview the highest-risk object. Explicit object selection is represented in the URL and Back/Forward history.

Interface, route, terminal, log, security, and DNS inspectors expose domain-specific relationships. Connection and resource inspectors expose their bounded evidence; a low-frequency object may use a clearly labelled generic fallback only while its domain model is incomplete. The desktop return command is visible and functional.

## Data validation

安全边界的窄表述是：这是一个**公开分发、默认仅本机访问、只读边界已验证**的产品；这不等于任意公网部署都安全。HTTPS 风险确认、SSH 指纹 trust、host/port/scheme/fingerprint/expiry 绑定和损坏配置错误都必须以实际检查为准。

Unknown JSON is validated before entering route models. Validation must distinguish:

- malformed root payload;
- valid error payload;
- valid partial snapshot;
- valid operational snapshot.

Fixtures are available only through the explicit test injection surface.

## Security contract

- Prefer RouterOS HTTPS REST. HTTP requires explicit, persisted risk acknowledgement and is visibly marked insecure.
- SSH uses a known-host policy. Unknown fingerprints require an explicit first-trust action; changed fingerprints block connection.
- SSH trust failure never sends SSH credentials or replaces a stored pin. When and only when HTTPS REST succeeds with certificate verification enabled, the operator may explicitly continue REST-only for that request; this keeps SSH visibly blocked and is not persisted or interpreted as network health.
- Responses include CSP, `frame-ancestors`, `X-Content-Type-Options`, and Referrer Policy.
- Server version does not expose the Python runtime.
- Session creation is route-scoped and bounded; login attempts are rate-limited.
- Credentials and session material never enter logs, screenshots, reports, or this contract.

## Blocking acceptance

1. All 19 routes at required phone, tablet/landscape, and desktop viewports.
2. Direct deep link, click navigation, Back, Forward, reload, and unknown-route normalization.
3. First connection, failed connection, partial channel success, recovery, device switch, and logout.
4. Initial load, manual refresh, polling, hidden/visible recovery, browser connectivity hints, stale evidence, malformed response, and API failure; LAN requests continue regardless of `navigator.onLine`.
5. Required overview scenarios remain covered.
6. Keyboard, touch target, focus, screen-reader relation, contrast, text zoom/reflow, and reduced-motion checks.
7. Security headers, session cap/rate limit, HTTPS-risk acknowledgement, and SSH fingerprint behavior.
8. Exact remote SHA Linux validation, Windows packaging, and GHCR publication.

No character count, DOM count, data attribute slogan, or black-pixel ratio can independently satisfy a product gate.

## Initial vertical slice

The first implementation slice must prove the architecture with:

- canonical route state and history;
- distinct real pages for `overview`, `interfaces`, `terminals`, `trafficLoad`, and `logs`;
- honest grouped destinations for the remaining deep links using their own snapshot evidence;
- a route acceptance test that fails when two routes render the same primary content;
- no change to RouterOS configuration.
