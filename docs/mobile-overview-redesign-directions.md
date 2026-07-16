# Mobile patrol console: third redesign directions

## Why the previous direction is rejected

The `212d535` surface improved evidence truth but treated a large verdict band, a three-column fact block, one generic workflow stack, and direct-route matrices as product completion. It remained repetitive, under-filled in incidents, and shallow outside Overview. This direction starts from high-frequency tasks and implemented interaction rather than preserving that composition.

## Research translated into decisions

These are extracted principles, not copied screenshots.

### Apple platform guidance

- Tab bars are stable top-level destinations, retain navigation state, use short labels, and remain available when content is empty. Therefore terminals and logs cannot remain hidden behind a generic Tools tab.
  <https://developer.apple.com/design/human-interface-guidelines/tab-bars>
- Lists are the primary scan-and-drill structure for textual operational objects. Succinct rows, clear disclosure, persistent hierarchy selection, and iPad split views are more native and efficient than stacked desktop cells.
  <https://developer.apple.com/design/human-interface-guidelines/lists-and-tables>

### RouterOS and iKuai operational language

- WebFig monitoring centers on interface state, routing information, statistics, and logs. These remain named domains rather than generic facts.
  <https://help.mikrotik.com/docs/spaces/ROS/pages/328131/WebFig>
- RouterOS interface evidence includes running flags, RX/TX counters, packets, and queue drops. Mobile interface rows put state and counters before explanatory prose.
  <https://help.mikrotik.com/docs/spaces/ROS/pages/139526175/Interface%2Bstats%2Band%2Bmonitor-traffic>
- RouterOS logs are topic- and severity-oriented. Mobile logs require topic/severity filters and timestamped rows.
  <https://help.mikrotik.com/docs/spaces/ROS/pages/328094/Log>
- iKuai System Overview uses compact inspectable system, terminal, resource, and notice objects. Cold-blue character comes from precise grouping and comparison, not tinting every surface.
  <https://www.ikuai8.com/zhic/ymgn/lyym/xtgk.html>

### Current network products

- UniFi exposes direct dashboard troubleshooting entry points and searchable flow objects with source, destination, ports, and traffic evidence.
  <https://help.ui.com/hc/en-us/articles/31628490448151-UniFi-WiFi-Agent-Easily-Diagnose-and-Fix-Common-WiFi-Issues>
  <https://help.ui.com/hc/en-us/articles/32201256219799-Traffic-Flows-and-Traffic-Logging-in-UniFi-Network>
- Firewalla separates WAN quality, LAN/Wi-Fi performance, alarms, devices, and flows. Its summary drills into time-windowed charts and object detail instead of repeating a health slogan.
  <https://help.firewalla.com/hc/en-us/articles/4413511352083-Network-Performance-and-Quality-Monitoring>
  <https://help.firewalla.com/hc/en-us/articles/360006083334-Manage-Alarms>

## Three materially different directions

### A. Patrol Queue

**Structure:** compact status header → three facts → top-three incident queue → selected object. Normal replaces the queue with one WAN instrument.

**Advantages:** fastest incident judgment; clearest phone hierarchy; lowest evidence and accessibility risk.

**Risks:** can feel like an alarm inbox in normal operation; secondary domains must carry the product depth.

### B. Object Console

**Structure:** compact status strip → domain summary → dense WAN/interface/terminal list → selected detail. Overview behaves like a mobile iKuai object console.

**Advantages:** strongest iKuai density; quickest object comparison; naturally becomes list-detail on iPad.

**Risks:** many objects can bury service verdict; one list cannot honestly represent every incident type.

### C. Evidence Timeline

**Structure:** current verdict → ordered collection/change events → affected object → raw evidence.

**Advantages:** strongest explanation of what changed; natural for logs and recovery.

**Risks:** snapshots do not always prove causal order; slower current WAN/default-route judgment.

## Decision matrix

Scores are out of five. Higher implementation score means lower risk.

| Criterion | Weight | A Patrol Queue | B Object Console | C Evidence Timeline |
|---|---:|---:|---:|---:|
| First correct judgment | 20 | 5 | 4 | 3 |
| Incident recognition | 16 | 5 | 4 | 4 |
| Normal monitoring value | 14 | 4 | 5 | 3 |
| Object inspection efficiency | 14 | 4 | 5 | 3 |
| Density without tiny text | 12 | 5 | 4 | 4 |
| Tablet expansion | 10 | 4 | 5 | 4 |
| Evidence truth risk | 8 | 5 | 4 | 3 |
| Implementation ownership | 6 | 5 | 4 | 3 |
| **Weighted / 500** | **100** | **466** | **442** | **342** |

## Chosen direction: Patrol Console

Use **A for Overview hierarchy**, **B for domain workspaces**, and **C only for Logs where ordered events are actual evidence**.

This is not a cosmetic synthesis:

- Delete the 112px verdict hero and replace it with a short status row.
- Delete three generic tabs and add four task destinations.
- Replace fake `查看全部` with a real incident center.
- Retire shared mobile `DataTable` presentation for interfaces, terminals, logs, and connections.
- Normal and incident Overview compositions differ after the evidence header.
- Tablet adds selected-object evidence rather than an empty second column.

## Phone wire hierarchy

### Normal at 390×844

```text
┌ router identity     age    refresh  more ┐  50
├ current evidence · absolute time         ┤  30
├ ✓ default route verified                 ┤  66
│  gateway and service consequence         │
├ default route │ WAN │ collection         ┤  64
├ WAN throughput · 25s              detail ┤
│  31.25 ↓     8.75 ↑   truthful SVG       │ 150
├ focus: pppoe-wan1 · table/gateway/state  ┤  74
├ evidence sources                         ┤  46
└ Overview  Network  Terminals  Logs       ┘  safe area
```

### Incident at 390×844

```text
┌ router identity     age    refresh  more ┐
├ historical/unavailable evidence boundary ┤
├ ! concise incident conclusion            ┤
├ three independent incident facts         ┤
├ top priority                             ┤
│  object 1 · state · consequence          │
│  object 2 · state · consequence          │
│  object 3 · state · consequence          │
├ all incidents / selected object evidence ┤
└ Overview  Network  Terminals  Logs       ┘
```

There is no empty incident placeholder, repeated summary card, or chart when current samples cannot support it.

## Visual language

- Canvas: cold neutral `#eef3f5`; near-white primary surface; blue-gray structural rules.
- Product hue: low-saturation deep cyan-blue for selection, links, and current evidence.
- Incident states use low-chroma accents attached to wording/icons, not full-width wine-red heroes.
- Radius scale: `4 / 6 / 8px`. Navigation chrome may blur; content does not.
- Values use tabular numerals. Body is at least `15px`, metadata `12px`, controls `44px`.
- Dividers express rows and alignment. Cards are reserved for real groups; no nested card stack.

## Prototype gate

Design cannot pass from prose. It needs:

1. Real runtime screenshots for seven scenarios at `320×568`, `390×844`, `430×932`, `844×390`, and `768×1024`.
2. Scenario compositions that visibly change with priority.
3. Browser E2E activation of every visible control.
4. 200% text captures without horizontal clipping.
5. Search/filter/sort/detail evidence for Network, Terminals, Logs, Connections.
6. Actual Back/Forward and focus restoration.
7. Human screenshot review of hierarchy, density, consistency, and remaining P0/P1 findings, separate from DOM probes.
