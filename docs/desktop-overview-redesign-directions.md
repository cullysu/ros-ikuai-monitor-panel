# Desktop Overview redesign directions

## Baseline finding

The current 1024/1180 Overview is rejected. It uses 7–10px operational text, CSS rulers posing as trends, clipped threshold copy, and uneven columns that leave useful workspace empty. Mobile and desktop must remain separate render trees; they may share only evidence policy and typed data.

## Direction A — Operations Ledger

A light cold-blue, ruled control-room ledger. One datum has one home. Normal/current uses a single real WAN SVG; route/interface, resource, collection, terminal and provenance ledgers use aligned rows. Incidents structurally replace the normal trend and ranking.

**Strengths:** closest to iKuai scanning rhythm; readable at 1024; clear module ownership; restrained visual language.  
**Risk:** can regress into a conventional report if the priority object path is weak.

## Direction B — Evidence Workbench

A case-file workspace centered on an ownership trace from router to interface, active route, next hop and affected object. The lower half is an evidence/object ledger. It foregrounds causality and uncertainty.

**Strengths:** strongest route ownership story; distinguishes offline, missing evidence and collection failure.  
**Risk:** a complete ownership chain is not always available; drawing one without evidence would recreate the rejected topology problem.

## Direction C — Patrol Queue Command Console

A status bus above an impact-ordered object queue with a persistent source trail. Stable objects collapse; incident objects dominate. The queue is the primary unit, not metric cards.

**Strengths:** fastest incident scanning; naturally removes normal noise; good 1024/1180 behaviour.  
**Risk:** a dark command-center treatment would split the product visually from the light mobile console and existing shell.

## Selected synthesis — Cold-blue Operations Ledger

Use Direction A as the permanent structure, Direction C for incident ordering, and only the source-backed parts of Direction B.

### Permanent rules

1. Desktop starts at 900px and never mounts the mobile tree.
2. Light cold-blue/neutral canvas, 2–6px corners, hairline rules, almost no shadow.
3. Standard operational text is 13–14px; visible metadata is never below 12px.
4. The top status bus answers conclusion, evidence mode/time, route state and collection state.
5. The normal workbench uses a 7/5 grid: WAN evidence left, decision/source ledger right.
6. The lower workbench uses object/activity evidence to occupy both columns; no decorative blank quadrant.
7. A single accessible SVG WAN trend renders only for coherent current evidence and no active incident.
8. Historical and unavailable evidence never show a live-looking chart, threshold comparison or zero-value fallback.
9. Active incidents replace the normal chart with an incident docket and real affected-object rows.
10. Fleet scope is an attribute. A real interface/resource/WAN incident outranks fleet scale.
11. No decorative topology. Route ownership is textual unless every relationship is explicitly observed.
12. All controls are inspection/navigation only; the Overview remains read-only.

### Responsive desktop contract

- **900–1039:** compact two-column ledger with 16px workspace padding; secondary evidence may span both columns.
- **1040–1199:** 7/5 main grid, 16px gap; object ledger spans full width when needed.
- **1200–1365:** 7/5 main grid and 7/5 lower grid; longer source and route labels remain visible.
- **1366–1440:** same hierarchy, more table width and provenance detail; no third decorative column.

### Scenario substitution

- **single/current:** WAN SVG + route/collection decision ledger + resource/interface/object ledgers.
- **fleet/current without incident:** scope counts and object coverage replace any fleet-average chart.
- **all-offline:** WAN incident docket and affected WAN rows; no trend.
- **no-snapshot:** evidence-gap record and expected-source ledger; no business numbers.
- **collection-down:** source failure docket and retained-success provenance; no current network claim.
- **resource-full:** CPU/memory/disk values, thresholds and trailing consecutive samples; no WAN chart.
- **interfaces-down:** affected interface rows and route ownership evidence; no WAN chart.

### Blocking acceptance

- At 1024, 1180, 1366 and 1440: no horizontal overflow, no clipped threshold text, and no empty lower-right work area.
- Exactly one business trend SVG in normal/current; none in incident, historical or unavailable scenes.
- SVG has `viewBox`, `<title>`, `<desc>`, timestamps, units, current, peak and sample count.
- Every priority object has a real route destination and source path.
- Back/Forward, keyboard focus, 200% zoom, and 12px minimum text remain valid.
- The old desktop scene stack and active patch CSS are removed from the build before release.
