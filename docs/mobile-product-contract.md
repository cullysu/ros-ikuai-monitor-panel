# Mobile evidence-first operations contract

## Product problem

The phone surface supports a 5–10 second read-only patrol. The operator must decide, in order:

1. whether the evidence is current enough to use;
2. the highest-priority network conclusion or incident;
3. the three facts that prove that conclusion;
4. whether current rates are actually observable;
5. which lower-priority raw record to inspect next.

The previous topology-sheet direction failed because decorative path geometry occupied the first viewport while freshness and operational facts were compressed below it. A visual difference from the old dashboard is not a product goal by itself. Legibility, evidence truth, scan speed, and predictable touch behavior are blocking outcomes.

## Selected direction: evidence-first operations ledger

The phone home is a compact native operations ledger, not a desktop dialog, a card dashboard, or a concept topology.

- The first surface is the evidence mode: `current`, `stale`, or `unavailable`.
- The operational verdict, three proof facts, optional current rates, and decision rows follow in one reading path.
- Network objects and route relationships are a collapsed secondary disclosure below the decision surface.
- Raw route, WAN, collection, interface, resource, and read-only-boundary records open as a separate navigation destination.
- There is no tab bar, fake sheet grabber, home-page chart, decorative terminal glyph, metric-card grid, or hidden desktop overview tree.
- Mobile and desktop use separate render trees. They share evidence vocabulary, cool-neutral tokens, tabular-number treatment, and status semantics—not layout markup.

## Evidence semantics

### Evidence mode

- `current`: the current collection cycle supports the displayed facts. Only this mode may display rate numbers.
- `stale`: retained historical records may explain the last known state but must never be phrased or styled as current. Rate numbers are suppressed.
- `unavailable`: no business snapshot can support a present-state judgment. Business, forwarding, resource, route, terminal, and rate numbers are suppressed where they would imply knowledge.

### Route verification

- `verified`: at least one route record explicitly has `active=true` and is not disabled.
- `offline`: the all-offline scenario has no active default route.
- `unknown`: no explicit active record exists or the snapshot is unavailable.

The implementation must never fall back to the first route row. Missing WAN rate fields remain unavailable; they are not converted to measured zero. Numeric zero remains a valid observation when the source explicitly supplied it.

### Continuous samples

“Continuous” means the trailing uninterrupted run of threshold-exceeding samples. Total exceeded samples may be shown separately but must not be described as consecutive.

## First-screen hierarchy

1. device identity and persistent read-only mode;
2. prominent evidence mode, freshness, and trust boundary;
3. scenario-specific operational verdict;
4. exactly three high-value proof facts;
5. current rates only when the evidence mode is `current` and all required observations exist;
6. two normal-state or three incident-state decision rows;
7. one detail destination;
8. collapsed path/object evidence.

No visual element may overlap or cover an earlier level. Freshness cannot be reduced to a corner timestamp when evidence is stale or unavailable.

## Scenario priority

| Scenario | First decision | Required proof | Suppressed data |
|---|---|---|---|
| `single` | explicit active-route record or “unable to confirm” | route, WAN online/total, current evidence/resource fact | rates when observations are incomplete or stale |
| `fleet` | WAN scope and independently verified route | WAN, connection records, route verification | any diagram implying one WAN carries the whole fleet |
| `all-offline` | all WAN objects are not running | WAN 0/N, active routes 0, evidence boundary | all rates |
| `no-snapshot` | current business state cannot be judged | REST, SSH, failed endpoints | business, forwarding, resource, route, terminal, and rate metrics |
| `collection-down` | current change is invisible | historical mode, failed endpoints, historical route status | all rate numbers and current-state claims |
| `resource-full` | current or historical resource threshold breach | CPU, memory, disk, trailing continuous samples | decorative traffic content that competes with resource evidence |
| `interfaces-down` | named interfaces are not running | Down count, explicit route consequence, WAN state | unsupported business impact claims |

## Detail contract

Opening detail must add evidence rather than replay the home:

- raw default-route records, including table, gateway, distance, active, and disabled semantics;
- individual WAN objects and source-observation availability;
- collection channels, timestamps, endpoint failures, and errors;
- interface parent/VLAN/PPPoE dependencies for interface incidents;
- thresholds plus observed, exceeded, and trailing-consecutive sample counts for resource incidents;
- the read-only boundary.

The destination receives focus, supports Escape and a visible back control, and does not repeat the home heading, three-fact strip, or rate strip.

## Visual and interaction rules

- Cool-neutral canvas, restrained low-saturation blue, 1 px rules, 8 px maximum surface radius, and tabular numeric alignment.
- System typography and a 12 px minimum for operational text; compactness comes from alignment and grouping, never unreadably small type.
- Blur is allowed only on real sticky navigation chrome. False affordances such as a non-draggable sheet handle are prohibited.
- Touch targets are at least 44 px. Safe areas, forced colors, reduced motion, keyboard focus, wrapping, and horizontal-overflow prevention are blocking.
- Portrait and short landscape preserve one ordered ledger. Landscape widens and centers that ledger instead of inventing an empty split pane or compressing a desktop console.

## Blocking acceptance

- Required phone matrix: seven scenarios at `320x568`, `360x800`, `375x667`, `390x844`, `430x932`, `768x1024`, `667x375`, and `844x390`; all 56 cells and screenshots must pass.
- Runtime qualification is based on mounted components and capabilities, not exact viewport identity or screenshot-name shortcuts.
- `matrix.complete=false` forces top-level failure. A native mobile root cannot short-circuit deeper semantic, legibility, interaction, or overflow checks.
- Every visible operational text node is at least 12 px. The title, evidence banner, facts, rates, and rows must not clip or overlap.
- Only `data-mobile-native-rates="current"` is valid. Stale, unavailable, all-offline, and incomplete observations have no rate node or rate-like text.
- Route verification must match raw route semantics; arbitrary-row fallback is a release blocker.
- The path disclosure is collapsed initially and follows the home in normal document flow.
- Detail has at least three scenario-relevant evidence sections and contains evidence not rendered on the home.
- The complete public 28-cell desktop/mobile release matrix, collector/security regressions, and exact-SHA Linux, Windows, and GHCR checks must pass before publication.
