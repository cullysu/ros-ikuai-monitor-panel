# Mobile risk-focus workspace contract

## Product task

The phone surface supports a five-to-ten-second, read-only network patrol. It must let an operator answer, in order:

1. Which configured target is being observed?
2. Can the evidence support a current-state judgment?
3. What is the highest-priority risk right now?
4. Which observations prove that judgment?
5. What signal should be inspected now?
6. Which object, dependency, or raw record should be opened next?

The interface is not a small desktop console, a generic health dashboard, a four-tab object browser, or a diagnostic specification sheet.

## Selected direction: risk focus

Three new directions were compared after the rejected patrol-brief release:

- **Incident inbox:** strong phone hierarchy, but weak use of tablet space.
- **Evidence timeline:** distinctive causal reading, but the available snapshots do not always support honest temporal comparison.
- **Risk-led object cockpit:** strongest match for risk priority, novel object evidence, and a real tablet master-detail workspace.

The selected direction is a restrained risk-led workspace:

- A single focus surface owns the current highest-risk judgment.
- `fleet` is scope metadata, never a risk that can cover an active incident.
- Phone renders one focus and one next-inspection object. It has no generic object tabs.
- Tablet renders a risk/evidence master and a persistent inspection detail. It is a separate responsive composition inside the mobile render tree, not a widened phone column.
- Raw evidence opens as a full-screen navigation destination.
- Mobile and desktop keep separate render trees and style ownership.

## Non-repetition contract

The home surface has three semantic layers. They are independently testable.

### Proof — why the verdict is allowed

Proof contains two or three concise assertions that establish the verdict. Examples include:

- an explicit `active=true` and not-disabled default route exists;
- all `N` WAN observations are not running;
- three resource classes crossed policy thresholds;
- six trailing samples continuously exceeded a threshold;
- no successful business snapshot exists.

Proof does not list object relationships or repeat the full signal values.

### Signal — what deserves attention now

Signal is one scenario-specific measurement or affected-object view selected by the highest risk:

- complete current down/up observations in a normal state;
- CPU/memory/disk pressure bars during resource pressure;
- named down interfaces during an interface incident;
- independent REST/SSH states during collection degradation;
- named offline WAN objects during an all-offline incident;
- fleet distribution only when no higher risk exists.

There is exactly one signal region. A `fleet` fixture with an interface incident must render the interface signal, not fleet scale.

### Object — what to inspect next

The focused object adds evidence that is absent from proof and signal. It must add at least two of:

- identity or source path;
- parent/child or route dependency;
- verified consequence and an explicit boundary on what is not known;
- sample window, threshold policy, or record count;
- raw flags such as `active`, `disabled`, table, distance, VLAN, PPPoE, endpoint error, attempt time, and success time.

The object layer cannot reproduce the same normalized label/value pairs used by proof. Resource focus cannot repeat CPU/memory/disk current values after the resource signal. Collection focus cannot repeat the REST/SSH summary after the channel signal.

## Risk ordering and focus

Risk order is derived from evidence and operational impact, not from the fixture scenario name:

1. evidence unavailable;
2. all WAN objects offline;
3. current resource threshold breach;
4. current interface failure;
5. collection degradation or historical-only evidence;
6. unverified default route;
7. normal route/WAN observation.

Concurrent risks remain in the model. The first risk selects both the signal and the initial inspection object:

| Primary risk | Signal | Focused object |
|---|---|---|
| evidence unavailable | collection boundary | collection target/channel |
| all WAN offline | named offline WANs | first affected WAN and route consequence |
| resource pressure | resource pressure bars | resource source, policy, and sample window |
| interfaces down | named down interfaces | first affected interface dependency chain |
| collection degraded | independent channels | first failed/degraded channel |
| route unverified | observation availability | route evidence source |
| normal | current rates when complete | explicit active route, otherwise WAN |

`fleet` adds a compact scope line such as WAN and interface object coverage. It never changes the primary risk, signal, or focused object.

## Evidence semantics

### Provenance

- `current`: successful observations from the current collection cycle support the displayed facts.
- `historical`: an earlier successful observation is retained and is never styled or phrased as current.
- `unavailable`: no successful business observation supports current business, forwarding, route, resource, terminal, or rate claims.

`snapshot.updatedAt` is an attempt/state-write time. It is never used as a successful observation time. When no explicit success timestamp exists, the UI says `成功时间未记录`.

REST-derived and SSH-derived channels are assessed independently. Capability flags are not health evidence.

### Route verification

- `verified`: an explicit default-route record has `active=true`, is not disabled, and provenance is current.
- `historical`: an earlier successful observation contains that explicit record.
- `offline`: current evidence establishes all relevant WAN objects are offline and no active default route exists.
- `unknown`: no explicit active record exists or current evidence is unavailable.

There is no first-row route fallback.

### Rates and zero

Rates render only when both observations are present, provenance is current, and the primary risk allows rates. Missing values remain unavailable; explicit numeric zero remains a valid observation.

Rates are suppressed for all-offline, no-snapshot, collection-down, resource-full, unavailable evidence, and any composite risk containing resource pressure.

### Consecutive samples

“Continuous” means the trailing uninterrupted run of threshold-exceeding samples. Total exceeded samples are separate evidence and cannot be described as consecutive.

## Scenario composition

| Scenario | Focus title | Proof | Signal | Focus object adds |
|---|---|---|---|---|
| `single` | route verified or unverified | route flag, WAN availability, collection cycle | complete current rates or observation boundary | table, gateway, distance, carrier relation |
| `fleet` | highest actual risk; otherwise route/WAN scope | same risk proof as any other state | risk signal; fleet distribution only with no risk | independent object scope and source availability |
| `all-offline` | no running external exit | `0/N` WAN, zero active route, evidence provenance | named offline WANs | parent/PPPoE dependency and route consequence |
| `no-snapshot` | current business state cannot be judged | no successful snapshot, configured target, success-time boundary | independent collection boundary | attempt time, endpoint error, source target |
| `collection-down` | current change is not observable | historical provenance, failed current cycle, last explicit success | independent REST/SSH states | channel error, attempt/success timestamps, endpoint records |
| `resource-full` | resource policy breached | classes breached, trailing streak, valid sample count | CPU/memory/disk bars | source path, threshold policy, sample window; no repeated current values |
| `interfaces-down` | named forwarding objects are down | down count, route consequence, WAN scope | named interfaces | parent, VLAN, PPPoE, route relationship |

Abnormal states change composition and visual tone; they do not merely swap copy inside the normal layout.

## Phone composition

The phone uses one continuous page:

1. sticky device chrome with static `只读监控` text;
2. one evidence boundary line;
3. one risk-focus masthead as the unique visual center;
4. a compact proof ledger;
5. one signal region;
6. one focused inspection object with novel evidence;
7. concurrent-risk links when present;
8. one full-screen raw-evidence action.

There is no four-object tablist, three-column proof table, bottom navigation, topology, fake sheet, grabber, giant verdict card, or decorative chart.

## Tablet composition

At `700px+`, the mobile surface becomes a true master-detail workspace:

- the master column contains ordered risks/evidence focuses, stable evidence boundary, and fleet scope metadata;
- the detail column contains the selected focus masthead, proof, signal, focused object, related-source index, and raw-evidence action;
- the selected master item controls one always-mounted detail panel;
- additional width exposes dependency and source evidence, not larger empty margins or duplicated metrics;
- neither column is a hidden desktop surface or a squeezed desktop table.

The master and detail are independently scrollable only when viewport height requires it. Short landscape uses the same master-detail logic when width permits; narrower landscape uses the phone composition without horizontal scrolling.

## Interaction and accessibility

- All touch targets are at least `44 × 44px`.
- Phone risk links and tablet master items expose programmatic current/selected state.
- No control declares an `aria-controls` target that is absent from the DOM.
- The tablet detail region is always mounted and labelled by the selected master item.
- In-place disclosure uses a down chevron; navigation uses a right chevron.
- Opening raw evidence pushes a history state containing the focused object.
- Browser Back closes detail and restores the trigger focus and scroll position.
- Browser Forward reopens the same detail and focused object.
- Focus restoration happens in React layout effects after the home DOM commits; timer polling is prohibited.
- Escape follows the same close path as Back.
- Refresh does not steal focus, collapse disclosure, or replace a user-selected focus. A newly discovered higher risk may be announced politely but does not force selection.
- Forced colors, reduced motion, safe areas, `200%` text enlargement, wrapping, and horizontal-overflow prevention are blocking.

## Visual system

- Restrained cold-neutral canvas and one low-saturation blue product hue.
- Sticky chrome may use purposeful blur; content surfaces do not use decorative glass.
- A solid low-chroma focus surface creates the primary visual center. Danger, historical, and unavailable states use distinct low-chroma tonal surfaces plus explicit wording and icons.
- One consistent Lucide outline icon system supplies object recognition and familiar controls.
- Operational text is at least `12px`; primary titles are `22–24px`; values use tabular numerals.
- Radius is `8px` or less on grouped content; no nested card stack or broad shadows.
- Dividers are used only at real group boundaries. Density comes from decisions per screen, not DOM count, character count, or tiny text.

## Blocking acceptance

- Model tests assert risk-first signal selection, including `fleet + interfaces down` and `fleet + resource pressure` composites.
- Model tests assert the initial focused object matches the highest risk.
- Model tests reject normalized proof/object label-value duplication.
- “失败端点 0” is prohibited; zero recorded endpoint failures must read `未记录` or explicitly `已记录失败端点 0`.
- Runtime tests cover browser Back and Forward, focus restoration without polling, tablet master-detail semantics, touch targets, text scaling, and all present control relationships.
- Acceptance uses semantic and geometry outcomes. Character count, text length, module count, and DOM-node count are not density proxies.
- Required mobile matrix remains seven scenarios × eight viewports = 56 complete cells and screenshots.
- Required public matrix remains seven scenarios × four release viewports = 28 complete cells.
- `matrix.complete=false` forces top-level failure.
- Public release additionally requires collector/security/accessibility checks and exact-remote-SHA Linux, Windows, and GHCR success.
