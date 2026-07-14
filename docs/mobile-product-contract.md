# Mobile operations product contract

## Problem

The rejected mobile interface behaved like a desktop modal reduced to phone width: large framed cards, weak data priority, separated network/collection tabs, low useful density, and incident pages dominated by explanation instead of operational evidence. Cosmetic CSS changes cannot fix that information architecture.

## Outcome

At 390 × 844, a user can identify the service verdict, scenario-specific primary metrics, WAN traffic when it is valid, collection freshness, REST/SSH state, and the next inspection target in one continuous screen. Detail remains a full-screen drill-down with a predictable back control.

## Research translated into decisions

- Apple layout guidance: safe areas, adaptable hierarchy, readable scaling, and stable top-level navigation—not blur on every surface. [Apple HIG: Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- Apple tab bars represent stable top-level destinations. Two evidence categories that must be judged together are not separate destinations, so this product has no bottom tab bar. [Apple HIG: Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
- MikroTik exposes broad router operations on mobile, but this product is intentionally read-only and reduces the task to patrol and evidence. [MikroTik mobile app](https://mikrotik.com/download?architecture=tile)
- UniFi and Firewalla place current network activity near device/service state, then disclose flow/device evidence. The reusable principle is aggregate-first with direct drill-down, not their brand styling. [UniFi introduction](https://help.ui.com/hc/en-us/articles/360012192813-Introduction-to-UniFi), [Firewalla network flows](https://help.firewalla.com/hc/en-us/articles/24739086338323-Firewalla-Feature-Network-Flows)

## Directions considered

| Direction | Strength | Why it lost or won |
|---|---|---|
| Telemetry first | Maximum chart visibility in normal operation | Loses because charts dominate when evidence is stale, missing, or irrelevant to an incident. |
| Incident console | Strong abnormal-state recognition | Loses because normal patrol becomes an empty alert shell. |
| Status ledger + adaptive incident console | Compact normal scan; scenario-specific metrics; evidence stays in context | **Chosen.** It gives the fastest correct judgment across both normal and abnormal states without tabs or a modal frame. |

## Information architecture

1. Device identity, read-only mode, state, and snapshot timestamp.
2. Factual service verdict.
3. Four scenario-specific primary metrics.
4. WAN traffic with source/window/current/peak semantics, only when valid.
5. Compact impact and next-inspection rows for incidents.
6. Always-visible trust rail: snapshot, REST, SSH, attached endpoint records.
7. One 44 px detail row into a full-screen evidence view.

## Scenario contract

| Scenario | Primary evidence | Traffic rule |
|---|---|---|
| `single` | down/up, WAN online, CPU, route in context | Show current snapshot or measured history. |
| `fleet` | aggregate throughput, WAN online, resource pressure | Show measured aggregate history/current snapshot. |
| `all-offline` | WAN 0/N, default route, service scope, current collection evidence | Hide decorative traffic. Zero is shown only as an observed offline fact. |
| `no-snapshot` | business data hidden, valid snapshot count, failed endpoint count, last record | Never show WAN/resource/business rates or placeholder curves. |
| `collection-down` | stale down/up labeled as previous snapshot, WAN/route context | May show previous snapshot only with stale wording and timestamp. |
| `resource-full` | CPU, memory, disk, connection pressure | Resource metrics precede traffic; duration remains unknown unless sampled. |
| `interfaces-down` | down count, affected interfaces, route consequence, current rates | Show traffic only when the current snapshot remains usable. |

## Visual contract

- Full-bleed cold-neutral canvas; no closed white page frame.
- One low-saturation blue product hue, a precise gray ramp, and low-chroma incident tones.
- Flat grouped ledgers with 1 px dividers and a 7/10 px radius scale; no stacked material shadows.
- Blur is reserved for top chrome where content actually passes behind it.
- Numbers lead, labels support, explanations stay short.
- State remains identifiable by wording, dot, hierarchy, and tonal surface; color is not the only signal.
- Minimum touch target is 44 × 44 px; reduced motion and safe areas are respected.

## Blocking acceptance

- Mobile DOM contains no desktop overview tree and no bottom tab bar.
- All four primary facts and the trust rail are visible in every scenario; unverifiable business values are absent in `no-snapshot`.
- Incident states expose impact and next inspection without a four-row explanatory audit table.
- Normal/resource/interface scenarios show a truthful traffic source; offline/no-snapshot do not show traffic.
- Narrow and landscape screenshots contain no black/transparent canvas, horizontal overflow, clipped primary text, or content hidden by chrome.
- Detail opens, back returns, and evidence/endpoint rows remain reachable with keyboard and touch.
