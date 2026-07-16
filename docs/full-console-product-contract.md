# Full RouterOS Read-only Console Product Contract

## Status

- Review baseline: `ced6386`
- Release gate: **closed**
- Current loop stage: Discover
- Baseline failure evidence: `_acceptance/review-ced6386-all-sections/report.json`

The previous overview-only matrices are retained as regression evidence for the overview surface. They are not evidence that the full product is releasable.

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

## Route contract

The legacy 18 identifiers remain valid deep links. They are grouped into task-oriented navigation rather than presented as eighteen equal top-level destinations.

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

- The canonical URL is the hash route, for example `#interfaces`.
- `?section=` is accepted only as a compatibility input and normalized to the canonical hash.
- Clicking navigation pushes browser history.
- Back/Forward restores route and focus.
- Reloading a deep link renders that route directly.
- Desktop rail/sidebar and mobile task navigation are views of the same route state.
- Active navigation state is derived from the router; legacy scripts may not self-assign active state.

## Connection and runtime state

### Connection states

`checking -> unconfigured | ready | error`

`unconfigured` and explicit device switching open the RouterOS connection flow. The flow performs real REST/SSH tests and shows each channel independently.

### Snapshot states

`idle -> loading -> current -> refreshing`

Transitions may also enter `stale`, `offline`, `error`, or `recovering`. A last known snapshot may remain visible only with an explicit historical/stale boundary.

### Refresh rules

- Poll interval comes from validated snapshot metadata, clamped to a safe range.
- Manual refresh is always available on operational routes.
- Visibility restoration refreshes immediately when the last successful request is old enough.
- Browser `online` triggers recovery; `offline` stops current claims.
- Concurrent refreshes are deduplicated or superseded with `AbortController`.

## Mobile information architecture

Primary tasks: `概览 / 接口 / 终端 / 日志 / 更多`.

The independent mobile render tree owns viewports through `899px`. From `900px` upward the desktop work surface must reflow continuously; 1024/1180px widths may not be forced into a phone composition merely to reuse mobile screenshots.

The 390×844 overview first viewport must include:

1. service verdict;
2. evidence time/state;
3. refresh action;
4. three non-repeated core facts;
5. up to three highest-priority affected objects.

An affected-object list is vertical. Selecting an object navigates to its detail; the selected object is not repeated once as a summary card and again in a horizontal carousel.

## Data validation

Unknown JSON is validated before entering route models. Validation must distinguish:

- malformed root payload;
- valid error payload;
- valid partial snapshot;
- valid operational snapshot.

Fixtures are available only through the explicit test injection surface.

## Security contract

- Prefer RouterOS HTTPS REST. HTTP requires explicit, persisted risk acknowledgement and is visibly marked insecure.
- SSH uses a known-host policy. Unknown fingerprints require an explicit first-trust action; changed fingerprints block connection.
- Responses include CSP, `frame-ancestors`, `X-Content-Type-Options`, and Referrer Policy.
- Server version does not expose the Python runtime.
- Session creation is route-scoped and bounded; login attempts are rate-limited.
- Credentials and session material never enter logs, screenshots, reports, or this contract.

## Blocking acceptance

1. All 18 routes at required phone, tablet/landscape, and desktop viewports.
2. Direct deep link, click navigation, Back, Forward, reload, and unknown-route normalization.
3. First connection, failed connection, partial channel success, recovery, device switch, and logout.
4. Initial load, manual refresh, polling, hidden/visible recovery, offline, stale, malformed response, and API failure.
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
