# Mobile native operations contract

## Product problem

The rejected phone implementations preserved a dashboard template: a verdict card, a metric grid, a trend chart, and an evidence list. Changing colors, radius, or copy could not turn that structure into a native mobile operations product.

The repeated task is a 5-10 second phone patrol. The operator must identify the active network path, whether its evidence is current, the highest-priority exception, and the next evidence target without changing tabs.

## Selected direction: topology sheet

The phone home uses a network topology as its primary canvas and a native-style bottom sheet as its decision surface.

- Internet, active WAN/default route, RouterOS, and client scope have a spatial relationship.
- Down/up values attach to the WAN path instead of becoming dashboard cards.
- Normal and fleet states use a partial sheet.
- Incident states expand the sheet, suppress secondary topology detail, and reorder evidence by incident type.
- Landscape becomes topology-left and sheet-right. It is not a compressed desktop console.
- Evidence opens as a navigation destination with a predictable back control, not as a desktop modal.

## Directions rejected

- **Grouped native ledger:** familiar and compact, but too generic and weak at showing route consequence during an incident.
- **Operations feed:** useful for history, but current state competes with events and loses first-screen priority.
- **Dashboard refresh:** rejected outright because it preserves the previous information architecture under new styling.

## Data semantics

- A current rate appears only when a current snapshot supports it.
- A retained rate is labeled `上次`; it is never presented as current.
- `all-offline` and `no-snapshot` remove rate values from the phone home.
- `no-snapshot` removes business, forwarding, resource, and terminal numbers that cannot be verified.
- `collection-down` names the retained timestamp and separates management, collection, forwarding, and business evidence.
- Current, cached, offline, and unknown paths use wording and structure in addition to tone.
- Broad claims such as `网络良好`, `实时可信`, or `正在承载` are prohibited without directly visible evidence.

## Scenario priority

| Scenario | Sheet priority | Topology behavior |
|---|---|---|
| `single` | route record, WAN count, snapshot age | full path and current/cached rates |
| `fleet` | WAN scope, connections, active route | full aggregate path |
| `all-offline` | WAN 0/N, active routes 0, impact, physical/PPPoE inspection | path shown as offline; rates removed |
| `no-snapshot` | unverifiable scope, last success, failed channels | path unknown; business nodes de-emphasized; rates removed |
| `collection-down` | retained timestamp, failed endpoints, channel recovery order | path explicitly cached |
| `resource-full` | CPU, memory, disk, sustained sample count, likely impact | topology is secondary |
| `interfaces-down` | affected interfaces, dependencies, route consequence | topology is secondary |

## Visual and interaction rules

- Full-bleed cold-neutral canvas; no closed page frame, card stack, bottom tab bar, or home-page line chart.
- System typography, tabular data, 4/8 px spacing rhythm, and one restrained cold-blue product hue.
- Blur is reserved for the real depth transition of the sheet and navigation chrome.
- The sheet is the only large-radius surface. Grouped evidence uses compact 10 px radii and 1 px rules.
- Touch targets are at least 44 px. Safe areas, reduced motion, focus, Escape/back, and text wrapping are blocking.
- Mobile and desktop have separate render trees, selectors, runtime checks, and screenshots.

## Blocking acceptance

- Required phone matrix: seven scenarios at `390x844` and `844x390`; all 14 cells and screenshots must pass.
- `matrix.complete=false` forces top-level failure.
- Phone DOM contains no desktop overview tree, old mobile namespace, hidden duplicate content, metric grid, bottom tabs, or decorative chart.
- Incident states use an expanded sheet with three scenario-specific decision rows; normal states use a partial sheet with two trust rows.
- `all-offline` and `no-snapshot` contain no rate node. `collection-down` rate mode is `cached`.
- Primary titles and row values cannot clip or cause horizontal overflow.
- Detail opens through a 44 px target, receives focus, closes through back or Escape, and remains usable in portrait and landscape.
- Public release remains blocked until the full 28-cell public matrix and exact-SHA Linux, Windows, and GHCR checks pass.
