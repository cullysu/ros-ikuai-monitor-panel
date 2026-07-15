# Mobile patrol brief and object workspace contract

## Product problem

The phone surface supports a five-to-ten-second read-only patrol. It is not a small desktop dashboard and it is not a table of all available fields. The operator must be able to answer, in order:

1. Which configured router am I looking at?
2. Can the displayed evidence support a present-state judgment?
3. Is service usable, and what is the highest business-impacting risk?
4. Which WAN/default-route/collection/resource facts prove that conclusion?
5. Which network object or raw record should I inspect next?

Visual novelty is not a goal. Truthful evidence, scan speed, object clarity, touch predictability, and readable density are release-blocking outcomes.

## Selected direction: patrol brief plus object workspace

Three materially different directions were compared at `390x844` and `768x1024`:

- **Patrol brief:** strongest continuous reading order, but too close to a generic status ledger.
- **Object workspace:** strongest WAN/route/collection relationship and native navigation semantics, but needs an incident-priority layer.
- **Incident workspace:** strongest dense scanning and tablet split, but its coded queue feels less native on a phone.

The selected product combines the object workspace with the incident workspace's priority model:

- A full-width patrol brief owns the first reading path: configured identity, evidence boundary, verdict, proof facts, and scenario-specific signal.
- A compact object switcher exposes `WAN`, `路由`, `采集`, and `资源` after the primary judgment. It changes the evidence workspace; it is not decorative navigation.
- On compact phones the object workspace follows the brief in document flow. On a `700px+` mobile/tablet viewport the brief and workspace become a balanced two-pane mobile split view.
- Raw evidence opens as a separate navigation destination, adds information, restores focus on return, and preserves the selected object and disclosure state.
- Mobile and desktop have separate render trees and styles. They share evidence vocabulary and source data only.

The surface has no outer card, topology illustration, fake sheet, grabber, bottom tab bar, hero metric card, noninteractive status pill, nested card stack, or hidden desktop DOM.

## Authoritative evidence semantics

### Observation provenance

- `current`: successful observations from the current collection cycle support the displayed facts.
- `historical`: an earlier successful observation is retained. It may explain the last known state but cannot be phrased or styled as current.
- `unavailable`: no successful business observation supports the fact. Current business, forwarding, route, resource, terminal, and rate claims are prohibited.

`snapshot.updatedAt` is the time of the collector attempt/state write. It is never a proxy for successful observation time. A label containing `最近成功` or an age such as `12 秒前` must be derived from an explicit successful channel timestamp. If none exists, the UI says `成功时间未记录`.

### Collection channels

REST-derived and SSH-derived channels are assessed independently from their own timestamps and errors. A REST failure cannot force SSH to failed, and an SSH failure cannot force REST to failed. Capability flags describe configured ability, not proof of current health.

The UI may show both:

- latest attempt: when the collector last tried;
- latest success: when a channel last returned usable evidence.

Those labels must never be interchanged.

### Route verification

- `verified`: a default-route record explicitly has `active=true` and is not disabled, and the observation provenance is `current`.
- `historical`: an earlier successful record contains an explicit active default route.
- `offline`: current evidence establishes that all relevant WAN objects are offline and there is no active default route.
- `unknown`: no explicit active record exists or current evidence is unavailable.

The implementation must never fall back to the first route row. In `unavailable`, retained WAN counts, gateways, distances, route flags, and rates are not current facts and therefore cannot appear in the patrol brief or collapsed object summary.

### Rates and zero

Rate numbers render only when both required observations exist and their provenance is `current`. Missing values remain unavailable; they are never converted to measured zero. Explicit numeric zero remains a valid observation.

Rates are suppressed for `all-offline`, `no-snapshot`, `collection-down`, `resource-full`, and any composite incident containing resource pressure or unavailable evidence. Resource pressure replaces the rate region with CPU, memory, disk, threshold, and trailing-consecutive-sample evidence.

### Composite risk

The legacy scenario key may select a fixture or primary presentation, but it cannot erase concurrent facts. The mobile model exposes an ordered risk set. For example, `interfaces down + resource full` must show both risks, prioritize the higher business impact, and suppress rates.

“Continuous” means the trailing uninterrupted run of threshold-exceeding samples. Total exceeded samples may be shown separately but cannot be described as consecutive.

## First-screen hierarchy

1. configured device identity, target address, and static `只读监控` mode text;
2. one evidence boundary line with provenance, successful observation time, and age;
3. operational verdict and highest-priority risk;
4. exactly three scenario-specific proof facts;
5. one scenario-specific signal region;
6. compact decision/risk rows, including concurrent P1 facts;
7. the object workspace and one raw-evidence navigation action.

Evidence wording appears once in the brief. A timestamp cannot be reduced to quiet corner text when evidence is historical or unavailable.

## Scenario-specific signal

| State | Primary judgment | Required signal | Prohibited first-screen content |
|---|---|---|---|
| normal single | explicit active route or `无法核实` | complete current down/up rates; otherwise observation availability | decorative topology and historical rates |
| fleet | WAN scope plus independently verified default route | compact WAN/object distribution | one-path diagram implying a single carrier |
| all offline | all WAN objects are not running | WAN object states and active-route count | all rates |
| no snapshot | present business state cannot be judged | independent REST/SSH attempt and success facts | business, forwarding, route, resource, terminal, and rate metrics |
| collection down | current change is not observable | per-channel failure/recovery and historical-success time | all current-state claims and rates |
| resource full | resource threshold breach | CPU/memory/disk bars, threshold, trailing streak | rate module and terminal ranking |
| interfaces down | named forwarding objects are not running | affected interfaces and verified route consequence | unsupported business-impact claims |

Configured identity must survive every state. `无可用快照`, `不可达`, and error text are statuses, never device names.

## Object workspace and detail behavior

- `WAN`, `路由`, `采集`, and `资源` are real selectable views with programmatic selected state and 44px touch targets.
- The object tablist supports Left/Right and Home/End keyboard navigation; focus follows selection without changing the page scroll position.
- The selected view exposes object identity, status, relationship, and source availability. It must not repeat the three proof facts verbatim.
- A downward disclosure indicator expands content in place. A right-pointing chevron navigates to a new destination. The two affordances are never interchangeable.
- Raw detail adds route table/gateway/distance/flags, individual WAN source fields, per-channel timestamps/errors, interface parent/VLAN/PPPoE dependencies, resource threshold/sample records, and read-only boundaries.
- Detail supports a visible back control, Escape, browser history, focus restoration, and scroll/selection preservation.

## Visual and interaction rules

- Full-width cool-neutral surfaces, restrained low-saturation blue, 1px rules, and no decorative side stripe.
- System typography, tabular numeric alignment, and at least 12px operational text. Density comes from alignment, grouping, and scenario substitution—not tiny type.
- Radius is reserved for actual controls or modal destinations and does not exceed 8px. There is no page-enclosing white rectangle.
- Touch targets are at least 44px. Safe areas, 200% text enlargement, keyboard focus, forced colors, reduced motion, wrapping, and horizontal-overflow prevention are blocking.
- iPhone portrait preserves one ordered brief. Short landscape uses a compact two-region flow without covering evidence. `700px+` mobile/tablet widths use a real two-pane workspace rather than centering a narrow phone card in empty space.

## Independent blocking acceptance

- Negative semantic fixtures are authoritative and independent from implementation-produced labels:
  - failed attempt with no successful timestamps cannot contain `最近成功` or `0 秒前`;
  - REST failed and SSH recovered must not be summarized as both failed;
  - unavailable evidence with retained WAN/route rows cannot expose current counts, gateway, distance, or activity;
  - historical evidence plus a new failed attempt cannot report `历史快照，0 秒前`;
  - resource pressure and any resource composite cannot mount a rate module or rate-like text;
  - no-snapshot preserves configured target identity;
  - interface failure plus resource pressure exposes both risks and suppresses rates.
- Required mobile matrix: seven base scenarios at `320x568`, `360x800`, `375x667`, `390x844`, `430x932`, `768x1024`, `667x375`, and `844x390`; all 56 cells and screenshots must pass.
- Runtime qualification is based on mounted components, data provenance, semantics, accessibility, and geometry—not exact viewport names or screenshot shortcuts.
- `matrix.complete=false` forces top-level failure. A mounted mobile root cannot short-circuit deeper checks.
- The complete public 28-cell desktop/mobile matrix, collector/security regressions, accessibility checks, and exact-SHA Linux, Windows, and GHCR CL must pass before publication.
