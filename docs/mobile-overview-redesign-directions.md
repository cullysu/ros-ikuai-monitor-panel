# Mobile Overview Redesign Directions

## Status

- Review baseline: `ced6386`
- Decision: **replace the rejected mobile Overview; do not patch its composition**
- Release gate: closed
- Surface ownership: independent mobile render tree through `899px`; desktop owns `900px+`

## Research basis

The redesign uses product behavior rather than copying screenshots.

- Apple layout guidance: prioritize content in reading order, respect safe areas, adapt to context, and use progressive disclosure rather than shrinking everything.  
  <https://developer.apple.com/design/human-interface-guidelines/layout>
- Apple typography guidance: create hierarchy through size, weight, and color; retain legibility and Dynamic Type reflow.  
  <https://developer.apple.com/design/human-interface-guidelines/typography>
- Apple tab-bar guidance: reserve tabs for stable top-level destinations, keep them limited, labelled, and persistent.  
  <https://developer.apple.com/design/human-interface-guidelines/tab-bars>
- Apple disclosure guidance: essential information stays visible; disclosure reveals genuinely additional detail.  
  <https://developer.apple.com/design/human-interface-guidelines/disclosure-controls>
- Apple chart guidance: use a chart only for a decision or trend, with explicit scale, labels, annotations, and an accessible alternative.  
  <https://developer.apple.com/cn/design/human-interface-guidelines/charts>  
  <https://developer.apple.com/cn/design/human-interface-guidelines/charting-data>
- iKuai System Overview: monitoring value comes from compact operational status—version, binding/notice, CPU, temperature/load, memory, and up/down evidence—rather than decorative illustration.  
  <https://www.ikuai8.com/zhic/ymgn/lyym/xtgk.html>
- UniFi Traffic Flows: operational scanning is object-based—source, destination, risk, policy, bytes, duration—with a focused property view after selection.  
  <https://help.ui.com/hc/en-us/articles/32201256219799-Traffic-Flows-and-Traffic-Logging-in-UniFi-Network>

## Rejected-baseline findings

1. Runtime app bar and Overview device/evidence header repeat identity and freshness.
2. A large dark verdict block consumes attention without adding evidence.
3. Proof, signal, selected object, and detail replay the same values.
4. Horizontal object selection is slower than a vertical risk queue.
5. Normal, resource, collection, and interface states retain nearly the same composition.
6. The 768px split view becomes an under-filled sidebar plus empty work area.
7. The existing `900–1180px` desktop surface clips labels, uses microscopic type, and leaves large unused regions.

## Three independent directions

### A. Operations Ledger

One vertical operational ledger: app bar, evidence strip, compact verdict, three fact rows, Top 3 objects, and expandable evidence below the fold.

**Strengths**

- Fastest scanning and simplest reflow from `320–899px`.
- Lowest duplication risk.
- Strongest accessibility and text-zoom resilience.

**Weaknesses**

- Healthy state risks feeling like a static specification sheet.
- Does not answer the user's explicit need for a useful, legible monitoring graphic.

### B. Patrol Queue + Object Drilldown

Overview is a prioritized inspection queue. Selecting a row enters the owning object route; at wide mobile widths the selected evidence can appear beside the queue.

**Strengths**

- Best incident-to-object workflow.
- Highest-risk object naturally controls the default route and detail.
- Avoids summary-card plus carousel duplication.

**Weaknesses**

- A persistent two-pane layout at 768px can recreate the rejected empty-workspace problem when the selected evidence is short.
- Healthy mode needs a useful non-incident pivot without manufacturing risk.

### C. Live Network Instrument

Compact verdict and three facts are followed by one truthful WAN SVG chart; incident objects remain vertical.

**Strengths**

- Strongest normal-state monitoring value and product identity.
- Makes chart purpose, sampling window, units, and current value explicit.
- Removes the old decorative CSS-line graphics.

**Weaknesses**

- A chart in every scenario would compete with incident response.
- Requires a strict sample contract; one value cannot be dressed up as a trend.

## Decision score

Scores are out of 5. Duplication and implementation-risk scores are reversed: higher is safer.

| Criterion | Weight | A Ledger | B Queue | C Instrument |
|---|---:|---:|---:|---:|
| Time to truthful judgment | 20 | 5 | 5 | 4 |
| Incident-to-object efficiency | 18 | 4 | 5 | 4 |
| Non-repeating information layers | 14 | 5 | 4 | 4 |
| Normal-state monitoring value | 12 | 3 | 3 | 5 |
| `320–899px` resilience | 12 | 5 | 4 | 4 |
| Accessibility / text zoom | 10 | 5 | 4 | 4 |
| Visual product identity | 8 | 3 | 4 | 5 |
| Implementation truthfulness risk | 6 | 5 | 4 | 3 |
| **Weighted total / 500** | **100** | **446** | **426** | **413** |

No single proposal fully solves both normal monitoring and incident response. The chosen direction is therefore a constrained synthesis, not a visual compromise.

## Chosen direction: Adaptive Operations Instrument

Use the **Ledger** as the permanent structure, the **Queue** as the incident workflow, and exactly one **Instrument** only when current samples support it.

### Ownership rule

- The live runtime app bar owns device identity, refresh, connection access, and current client phase.
- The Overview must not repeat that live identity/phase block.
- Static fixture rendering may provide a fixture toolbar adapter, but the underlying Overview composition remains the same.
- Overview owns the business evidence timestamp and business verdict because these are snapshot facts, not merely client-runtime state.

### 390×844 normal first viewport

1. Global app bar: identity, runtime age, Refresh, device connection.
2. One-line business evidence strip: state + absolute sample time.
3. Compact verdict band: title plus one verified consequence; no giant hero.
4. Three distinct facts in one divided ledger group.
5. One current WAN SVG trace, only with at least two timestamped samples.
6. No empty incident section.
7. Three stable task destinations only: 运行 / 网络 / 工具. Terminals, logs,
   routes, and diagnostics remain real routes inside the task index rather than
   consuming permanent tab-bar slots.

### 390×844 incident first viewport

1. Global app bar.
2. Business evidence strip.
3. Compact incident verdict.
4. Three state-specific, non-repeated facts.
5. Vertical Top 3 affected objects, each a real route target.
6. Chart moves below the incident queue or is omitted when irrelevant/stale.
7. The same three-destination task navigation; incidents deep-link to their
   owning route without manufacturing another tab.

### Information-layer contract

| Layer | Question answered | Forbidden content |
|---|---|---|
| Verdict | What is the operator-facing conclusion? | metric grids, object lists, evidence-time repetition |
| Three facts | Which three independent facts justify that conclusion? | selected object identity, repeated verdict wording |
| Instrument | What changed over a real time window? | one-point pseudo-trends, stale/current ambiguity |
| Queue | Which object should be inspected next, and why? | aggregate facts already shown above |
| Detail route | What raw evidence, dependency, impact, and source support this object? | replay of the Overview verdict/facts |

### Chart truth contract

- Responsive SVG with `viewBox`; no CSS-box pseudo-chart.
- At least two current timestamped samples from one coherent window.
- Download and upload are separately labelled.
- Window, unit, sample count, latest values, and scale are visible or in the accessible summary.
- No smoothing, prediction, decorative grid, or flat-zero fallback.
- One current sample renders `流量证据累积中`; stale/unavailable evidence removes the chart from the primary hierarchy.

## Scenario hierarchy

| Scenario | Verdict | Three facts | Primary queue / instrument |
|---|---|---|---|
| Normal | 出口路径已核实 | verified route; WAN running; collection complete | current WAN instrument; no fake incident list |
| Fleet / multi-object | highest real risk, not “fleet” | affected count; route state; observation scope | Top 3 affected objects; fleet is scope metadata |
| All offline | 出口中断 | WAN 0/N; active default 0; collection boundary | Top 3 offline WAN objects |
| No snapshot | 当前业务状态不可判断 | snapshot unavailable; target identity; last successful business evidence | collection/evidence objects only; no business rates |
| Collection down | 当前变化不可见 or 采集部分可用 | REST; SSH; last successful business evidence | failed/degraded channels; historical business objects excluded |
| Resource full | 资源策略已触发 | breached classes; trailing consecutive samples; valid sample count | one resource object whose detail adds thresholds/source; no percentage replay in queue |
| Interfaces down | N 个接口未运行 | down scope; default route state; WAN scope | Top 3 interfaces by dependency/blast radius |

## Responsive contract

### 320–359px

- Single column.
- Facts become three full-width rows to retain 16px values.
- Metadata remains at least 13px; controls remain at least 44×44px.

### 360–599px

- One divided three-fact group.
- Vertical queue rows; at most two text lines per object reason.
- Normal-state chart spans the ledger width.

### 600–899px

- Keep the independent mobile tree and task navigation.
- Use a centered `720px` maximum ledger.
- Normal state may pair facts and instrument only when neither becomes cramped.
- Incident state may show queue and selected evidence side by side only when both columns remain meaningfully populated; otherwise use one continuous ledger. No permanent empty pane.

### 900–1180px

- Desktop work-surface ownership begins.
- Use continuous container reflow, readable type, and balanced evidence columns.
- Do not solve clipping by shrinking below the type contract or by re-entering the phone tree.

## Accessibility and interaction contract

- Body/value text at least 16px; metadata at least 13px.
- Named landmarks and textual status labels; color is redundant.
- 44×44px minimum interactive targets and visible keyboard focus.
- Back/Forward restores route, selected object, focus, and Overview scroll.
- No fake sheet handle, horizontal content carousel, hover-only evidence, or gesture-only action.
- Polling updates do not move focus or scroll; only meaningful state transitions enter the polite live region.
- At 200% zoom, the page grows vertically without horizontal clipping.

## Blocking prototype acceptance

Before implementation can be called design-complete:

1. Visual captures at 320, 360, 390, 430, 768, 1024, and 1180 widths.
2. Normal plus all six abnormal scenarios.
3. 390 first viewport contains verdict, business evidence, Refresh, three facts, and Top 3 affected objects when they exist.
4. No repeated identity/freshness bars in live runtime.
5. No fact value appears unchanged in verdict, fact group, queue, and detail.
6. Chart gate proves sample count, timestamps, units, scale, current values, and stale omission.
7. Text zoom, keyboard, touch, reduced motion, ARIA relationships, Back, and Forward checks pass.
