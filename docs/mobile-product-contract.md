# Mobile patrol console release contract

## Status

- status: `current-contract / acceptance-failed`
- validForCommit: Step974 telemetry-canvas direction selected; implementation and fresh acceptance required
- supersededBy: `null`
- Engineering release: `a414f7ae` historically passed exact-SHA Linux, Windows, and GHCR
- Current local review boundary: Step973 independently vetoes the Step972 artifact; its 56-cell evidence is diagnostic only and cannot qualify the product
- Product/design/visual gate: **FAIL-closed after exact-artifact VETO**; final external product/visual acceptance is not closed.
- Current loop stage: **Step974 new isolated telemetry-canvas owner implementation**
- Matrix evidence: current local `mobile-next-runtime-v1` passes seven scenes × eight viewports = 56/56 plus route/detail/connection interactions; final clean-SHA public matrices remain open
- Surface: a read-only RouterOS/iKuai operational console, not a health dashboard or shrunken desktop table

Previous green matrices are regression evidence only. They missed local refresh failure, timezone ambiguity, dead visible controls, an invalid DNS route, and missing mobile workflows.

Step974 keeps the task active with `blocked=false` and GitHub not uploaded. All prior mobile presentation directions, including Mobile Attention Queue, are rejected implementation history.

The current presentation direction is **Edge-to-edge Telemetry Canvas**. It may reuse evidence truth and route contracts, but must use a new isolated render/style owner and cannot retain the rejected grid, three-column rows, More tiles or phone vertical rail.

## Step974 Edge-to-edge Telemetry Canvas

- Five stable top-level destinations: `概览 / 接口 / 终端 / 日志 / 更多`; the fifth destination is a real task list, not a generic tile launcher.
- Normal Overview has one spatial instrument: a verified default-route anchor, current WAN range and current aligned traffic pulse. It is data-backed, not an ornamental topology or generic chart.
- Below the instrument, four compact fact windows expose collection, interfaces, resources and one route/WAN transition. They are subordinate evidence, not equal-weight list rows.
- Incident scenes replace the normal instrument wholesale with the affected plane: evidence boundary, collection, WAN outage, resource pressure or interface dependency. Each answers where, proof, boundary and next real destination.
- 320px uses a 176–188px instrument and never truncates a critical state; 667/844 landscape keeps horizontal bottom navigation and uses width for canvas/evidence juxtaposition, never a vertical phone rail.
- 600–1199px has continuous tablet capability. Portrait preserves a single task sequence with bounded comparison; wide landscape may add one selected-object inspector only when backed by a real relation.
- Liquid Glass/material is restricted to true navigation and transient controls. Content is opaque; navigation cannot cover task content. Reduce Transparency produces an opaque control layer.
- Type is compact for normal vision: 17–20px key values, 14–15px body, 11–13px metadata, 12px absolute normal-scale floor. A 44px hit target is independent of visual bulk.
- More is a single grouped task list with purpose/current availability; object detail is evidence-first with raw fields disclosed; connection remains a real safe setup/verification flow.
- No traffic curve renders unless current aligned points exist. No-snapshot removes every business number rather than displaying zero or history as current.

## User job

Within five seconds a phone patrol must answer:

1. Which router is observed?
2. Is evidence current, historical, or unavailable?
3. Is service usable, degraded, interrupted, or not judgeable?
4. Which WAN/default route carries traffic, when verified?
5. What is the highest-priority affected object?
6. Which workspace should open next?

Read-only is persistent mode text, never a dead button.

## Non-goals

- Do not imitate iOS with blur, large radius, or fake sheet handles.
- Do not reproduce every desktop field in Overview.
- Do not equate REST/SSH reachability with forwarding-plane or business availability.
- Do not render missing observations as zero.
- Do not use fixture names, DOM/character counts, exact screenshots, or exact viewport matches as usability proof.
- Do not retain the legacy HTML shell merely to reduce the diff.

## Runtime truth

### Local refresh during WAN failure

`navigator.onLine` is an upstream browser hint, never an authorization gate for same-origin `/api/*`.

- Initial load, polling, recovery, visibility refresh, and manual refresh still request `/api/snapshot` when `navigator.onLine === false`.
- Refresh is disabled only while an equivalent request is in flight.
- An `offline` event may annotate the hint but cannot erase current or historical RouterOS evidence.
- A failed local request enters a retryable API boundary; it cannot assert RouterOS, WAN, or business outage.
- Polling continues with bounded backoff while the local panel is open.

### Time protocol

Every backend timestamp crossing the API is RFC 3339 with an explicit offset; UTC uses `Z`.

- `2026-07-16 16:18:23` is malformed API data.
- Frontend validation requires an explicit offset before parsing.
- Freshness uses the instant and formats only for display.
- UTC and Asia/Taipei tests produce identical age and ordering semantics.
- Attempt, successful collection, snapshot write, and device time remain distinct.

### Evidence and route semantics

- `current`: a successful observation in the current credibility window supports the claim.
- `historical`: an earlier success is retained and labelled as history.
- `unavailable`: no successful observation supports the claim.
- Only current evidence renders current rates. Explicit zero is valid; absent, non-finite, or partial rates stay unavailable.
- A route is verified only from an explicit current default-route record with `active=true` and not disabled. There is no first-row fallback.

## Information architecture

### Five stable phone destinations

1. `概览` — evidence canvas, verified default route, WAN/current rate, incident plane
2. `接口` — interface/WAN objects and route relationships
3. `终端` — clients, DHCP, ARP
4. `日志` — system, service, collection, security events
5. `更多` — routes, DNS, connections, resource/load and read-only diagnostics

Tabs remain stable across routes and preserve navigation state. Global tools do not disappear outside Overview.

### Overview composition

1. **Runtime control layer** — device identity, real history, refresh, connection and stable tab navigation; no content-covering ornament.
2. **Evidence strip** — current/history/unavailable, absolute time and collection coverage.
3. **Normal telemetry canvas or incident plane canvas** — mutually exclusive; no normal grid remains behind an incident.
4. **Fact windows and investigation transitions** — compact, source-backed and non-repeating.
5. **Full-screen object detail** — relationships, samples, identity or raw fields not already stated on Overview.

Identity, freshness, verdict and object evidence cannot be repeated merely to fill space. The current product has no fake aggregate incident destination: the queue is the incident index and each actionable row opens its actual domain/object.

### Scenario substitution

| Scenario | Primary module | Facts and focus |
|---|---|---|
| `single` | verified default path, then complete current WAN sample | collection, interfaces and resource summaries |
| `fleet` | highest real risk; otherwise WAN/interface scope | scale remains secondary to any affected object |
| `all-offline` | named offline WANs | scope, active-route count, last success |
| `no-snapshot` | collection/evidence boundary | exactly which business values cannot be judged |
| `collection-down` | independent REST/SSH rows | management, collection, forwarding, business planes stay separate |
| `resource-full` | CPU/memory/disk pressure with threshold/duration | sample window/source; rankings demoted |
| `interfaces-down` | affected interfaces and route consequence | parent, VLAN/PPPoE, traffic change, impact |

Abnormal states change composition and priority, not merely text and color.

## Domain workspaces

Each high-frequency domain owns its list model, filters, sorting, row summary, and detail.

### Network

- Search interface, role, address, gateway, table, protocol, or DNS.
- Filter interfaces by running/down/disabled and type.
- Sort interfaces/connections by rate, object, state, or count where meaningful.
- Interface rows show state, role/type, RX/TX, dependency; detail adds counters and route relationships.
- Connection tracking supports protocol/search and a bounded result count.

### Terminals

- Search hostname, IP, MAC, vendor, or DHCP identity.
- Filter current/history/offline when supported.
- Sort by traffic, connections, name, or address.
- Use bounded pages or incremental disclosure.
- Detail adds lease, ARP, interface, traffic, and connection evidence.

### Logs

- Search text and filter topic/severity/source.
- Newest-first is explicit and reversible.
- Rows keep time, topic/severity, and message scannable.
- Detail exposes the full record without replaying Overview facts.

Low-frequency routes may share primitives but cannot use “hide the table header and stack every cell” as mobile design.

## Chart contract

Charts are optional route/detail evidence, not a required Overview decoration. A route that renders no chart has no chart obligation. Any rendered chart must satisfy all rules below.

- Responsive SVG preserves intrinsic aspect ratio.
- Download/upload have stable named encodings.
- Window, unit, sample count, current values, peak/reference, and accessible summary are explicit.
- Scale comes from the same current sample window as visible values.
- One sample renders accumulation, not a pseudo-trend.
- Historical/unavailable evidence never looks current.
- Resource samples use the chart primitive instead of punctuation-joined values.

## Responsive and accessibility

- Phone: `320×568`, `360×800`, `375×667`, `390×844`, `430×932`.
- Landscape: `667×375`, `844×390`.
- Tablet: `768×1024`, `1024×768`, `1180×820`.
- Tablet uses a side task rail and may compare real queue objects in two columns. It must not create an empty detail column, duplicate facts or fake charts merely to fill the remaining viewport background.
- At 200% text, content reflows vertically without horizontal scrolling or clipped actions.
- Targets are at least `44×44px`; visible controls always work.
- Every link resolves to an existing route.
- Back/Forward restore route, selection, search/filter state, focus, and scroll.
- Search is real or absent; decorative `Ctrl+K` is prohibited.
- Loading, empty, error, stale, offline-hint, and recovery are semantic states.
- Reduced motion, forced colors, safe areas, and 200% text are blocking.

## Schema and trust boundary

安全边界的窄表述是：这是一个**公开分发、默认仅本机访问、只读边界已验证**的产品；这不等于任意公网部署都安全。HTTPS 风险确认、SSH 指纹 trust、host/port/scheme/fingerprint/expiry 绑定和损坏配置错误都必须以实际检查为准。

- A versioned backend snapshot schema is authoritative.
- Frontend types and validators are generated from or mechanically checked against it.
- Validate nested rows, required identity, finite/ranged numbers, explicit-offset timestamps, and collection limits.
- Invalid nested rows fail or are quarantined; they are never cast to a complete snapshot.
- Router hosts accept valid IP literals or DNS hostnames only. Reject URL delimiters, credentials, paths, queries, fragments, embedded ports, and whitespace.
- A corrupt profile store raises a recoverable configuration error and preserves the file; it never becomes an empty list.
- Passwords stay memory-only. Persistence is named `rememberProfile`; no field implies password storage.

## Architecture and packaging

- `public/index.html` contains metadata and one React root only.
- Remove legacy sidebars, top bars, dead controls/scripts, and cross-surface `:has()` ownership.
- Mobile and desktop keep separate overview trees/styles while sharing validated models/tokens.
- App mount has no legacy-child restore path.
- Backend extraction follows owned seams: serialization, session/API, collector orchestration, configuration.
- Use a real package version, manifest, install metadata, favicon, and Apple touch icon.
- CSP and read-only boundaries remain blocking.

## Blocking acceptance

| Requirement | Direct evidence |
|---|---|
| Local refresh under offline hint | override `navigator.onLine=false`, click Refresh, observe local snapshot request |
| Timezone protocol | backend contract plus UTC/Asia-Taipei tests; reject offset-free value |
| No fake controls/routes | E2E activates every visible phone and desktop control |
| Four tasks | semantic/geometry checks in portrait, landscape, tablet |
| Risk destinations | mixed-risk fixtures keep the highest verified risk first and every actionable row opens its real route/object |
| Domain workflows | search/filter/sort/page/detail tests for interfaces, terminals, logs, connections |
| Honest charts | model/screenshots prove aspect ratio, units, samples, scale, evidence mode |
| Schema depth | malformed nested rows, range failures, oversized collections rejected |
| Responsive quality | seven scenarios, required viewports, 200% text, safe areas |
| Public release | exact remote SHA passes Linux, Windows, GHCR, security, accessibility, readiness |

`matrix.complete=false`, any missing cell, stale report, dead control, or P0/P1 finding forces top-level `pass=false`.
