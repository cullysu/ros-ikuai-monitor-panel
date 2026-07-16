# Mobile patrol console release contract

## Status

- Release gate: **closed**
- Baseline: `212d535d6803fb3e71e8799b0365e5bade755599`
- Last external review baseline: `38/100`
- Current loop stage: **Verify / product review**
- Working-tree evidence: local 56/28/76/266 matrices, 36-check production runtime, security, build and readiness pass; no new exact commit or remote CL exists yet
- Surface: a read-only RouterOS/iKuai operational console, not a health dashboard or shrunken desktop table

Previous green matrices are regression evidence only. They missed local refresh failure, timezone ambiguity, dead visible controls, an invalid DNS route, and missing mobile workflows.

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

### Four stable phone destinations

1. `概览` — verdict, evidence, WAN/default route, incidents
2. `网络` — interfaces, WAN, routes, DNS, connection tracking
3. `终端` — clients, DHCP, ARP
4. `日志` — system, service, collection, security events

Less frequent tools live in a top More menu. Tabs remain visible when empty and preserve history state.

### Overview composition

1. **48–52px runtime chrome** — identity, evidence age, Refresh, More.
2. **28–34px evidence boundary** — current/history/unavailable and absolute time.
3. **58–76px verdict row** — icon, one factual conclusion, one consequence; not a hero.
4. **Three independent facts** — default route, WAN carrier, collection channel.
5. **One primary module** — normal uses an honest WAN instrument; incidents use top three affected objects.
6. **One focus object** — adds dependency, source, impact, or raw flags not repeated above.
7. **Evidence disclosure** after the primary workflow.

Identity, freshness, verdict, metrics, and object values cannot repeat across layers.

### Incident center

`查看全部` opens a real aggregate incident route and never the first object's route.

- Group by domain and order by risk, then identity.
- Rows show severity wording, object, concise evidence, observation time, and real destination.
- Empty means no incident records are present; it does not claim health.

### Scenario substitution

| Scenario | Primary module | Facts and focus |
|---|---|---|
| `single` | current WAN instrument when complete | route, running WAN, collection cycle |
| `fleet` | highest real risk; scale is metadata | affected count and selected object |
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
- Tablet secondary space adds comparison, dependency, history, or detail; never an empty column.
- At 200% text, content reflows vertically without horizontal scrolling or clipped actions.
- Targets are at least `44×44px`; visible controls always work.
- Every link resolves to an existing route.
- Back/Forward restore route, selection, search/filter state, focus, and scroll.
- Search is real or absent; decorative `Ctrl+K` is prohibited.
- Loading, empty, error, stale, offline-hint, and recovery are semantic states.
- Reduced motion, forced colors, safe areas, and 200% text are blocking.

## Schema and trust boundary

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
| Incident center | mixed-risk fixture opens grouped list and real destinations |
| Domain workflows | search/filter/sort/page/detail tests for interfaces, terminals, logs, connections |
| Honest charts | model/screenshots prove aspect ratio, units, samples, scale, evidence mode |
| Schema depth | malformed nested rows, range failures, oversized collections rejected |
| Responsive quality | seven scenarios, required viewports, 200% text, safe areas |
| Public release | exact remote SHA passes Linux, Windows, GHCR, security, accessibility, readiness |

`matrix.complete=false`, any missing cell, stale report, dead control, or P0/P1 finding forces top-level `pass=false`.
