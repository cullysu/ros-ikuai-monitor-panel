# Mobile Linkboard design contract

- status: `selected-direction`
- decisionStep: `921`
- releaseEvidence: `false`
- authority: `docs/decision-system/current-state.md`

## Product decision

The new mobile surface is **Linkboard / 运行场**: a network-object comparison workspace that lets an operator identify the highest-risk object, understand its relationship to a route or dependency, and inspect one time-bound signal without reading a diagnostic report.

This is a clean replacement for the rejected mobile presentation. It does not reuse the previous ledger hierarchy, three-cell fact grid, stacked report sections, large verdict block, mobile cards, tablet report columns, or `mp-*` visual grammar. Shared evidence, route, time, read-only, accessibility and navigation contracts remain valid inputs.

## Direction adjudication

| Direction | Strength | Rejected risk / selection reason |
| --- | --- | --- |
| Evidence Pulse | Strong evidence boundary and Apple platform discipline | Rejected as the primary architecture because a vertical evidence narrative can collapse back into the same text-led ledger under normal and incident states. |
| Linkboard / 运行场 | Object-first scanning, semantic comparison, explicit relationships and high operational density | **Selected.** It best expresses iKuai-like operational efficiency while leaving controls/navigation to the iOS functional layer. |
| Evidence River | Strong investigation continuity and historical context | Rejected as the primary architecture because the sequential narrative and gesture model add reading and interaction cost during a five-second patrol. |

The selected direction may use evidence disclosure and continuity principles from the other studies, but its information architecture remains object comparison, not a blended card/ledger composition.

## Information architecture

### Functional layer

Liquid Glass is limited to real controls and navigation:

- the compact device/snapshot toolbar;
- the four-destination task bar;
- transient menus, selection controls and object-detail presentation.

The content layer stays opaque and edge-to-edge. No content section receives blur merely to look like iOS. Reduce Transparency replaces glass with a solid, high-contrast material.

### Content layer

The Overview owns five ordered regions:

1. **Verdict rail** — one evidence-bounded operational sentence, freshness and scope. It is a compact rail, not a hero card.
2. **Object scanner** — horizontally or vertically scannable network objects with identity, role, state and one relevant signal. Highest confirmed risk leads; Fleet scale never overrides risk.
3. **Comparison stage** — exactly two semantically related sides using the same unit or an explicitly named relationship. Single-WAN normal compares current evidence with a trusted baseline, never a fabricated peer.
4. **Time evidence** — one chart or state timeline answering the active comparison question. It includes unit, window, source, current/reference values and missing/stale semantics.
5. **Event pulse** — a compact next investigation plus bounded secondary events. It never repeats the verdict, object state and facts word-for-word.

No three-cell KPI strip, generic numbered judgment ledger, dual-column object directory, repeated proof/signal/object prose, fake topology or dashboard card wall is allowed.

## Phone composition

At `390 × 844`, without navigation:

- the first useful viewport exposes device identity, evidence age, one verdict, the highest-priority object, the comparison question, one current/reference signal and one next inspection;
- body text is at least `15px`, metadata is at least `12px`, and every interactive target is at least `44px`;
- the content viewport contains at most one rounded real grouping surface and no nested cards;
- the object scanner remains reachable with one horizontal gesture, but the selected object is not hidden behind a gesture;
- the task bar floats above the safe area and never obscures content or focused controls;
- supporting source paths, raw attributes and logs use a full-screen detail destination with predictable Back/Forward restoration;
- repeated actions remain immediate; only selection and detail transitions animate.

`320`, `360`, `375`, `390` and `430` widths must reflow by capability. No exact-width product branch or screenshot offset is permitted.

## Tablet composition

At `768 × 1024` and wider mobile workbench sizes:

- a stable task rail owns primary destinations;
- a `200–236px` object index owns scan, search and selection;
- the remaining workspace owns comparison, time evidence and the selected object's inspection context;
- detail replaces or overlays the comparison workspace when needed; a third narrow report column is forbidden;
- a second pane exists only when it adds a stable, non-repeated selection, relationship or next-step task; otherwise the content remains one continuous workspace;
- empty space must preserve focus, not result from an exhausted copied phone column.

The `899/900` and `1199/1200` transitions must preserve the same task and selected object without rebuilding unrelated UI state.

## Scenario recomposition

| Scenario | Lead object / comparison | Primary evidence | Forbidden claim |
| --- | --- | --- | --- |
| `single` | active WAN versus current trusted baseline | throughput window plus route relationship | Internet availability without an external probe |
| `fleet` | highest-risk object versus its healthy peer or baseline | exception-first object scan | Fleet size as the highest-priority signal during an incident |
| `interfaces-down` | affected interface versus confirmed route dependency | state-change timeline and dependency count | Internet outage unless separately proven |
| `resource-full` | leading resource metric versus threshold and recent baseline | threshold band, duration and sample completeness | Network outage inferred from resource pressure |
| `collection-down` | REST and SSH sources, or last confirmed versus current unavailable | last success, failure source and unavailable interval | Current rates or current forwarding state |
| `no-snapshot` | configured target versus last confirmed evidence | identity and last successful timestamp | Zero rates or current operational status |
| `all-offline` | WAN objects versus last confirmed active route | offline state timeline and scope | Successful collection as proof of external reachability |

Abnormal scenarios replace the normal comparison question and chart; they do not merely recolor the normal page.

## Visual language

- Canvas: neutral near-white with a faint cool cast, not a full-page cold-blue wash.
- Ink: deep blue-black; secondary text uses a readable cool neutral.
- Product hue: one low-chroma network blue for selection, relationships and current evidence.
- Severity: low-chroma tonal surfaces plus wording and symbols; confirmed critical state may use a restrained red accent only at the affected object and timeline discontinuity.
- Geometry: concentric radii on interactive chrome; content relies on alignment and spacing rather than rounded containers.
- Typography: one system family, tabular operational numerals, fixed product scale, Dynamic Type/reflow support and no sub-12px operational text.
- Icons: one Lucide/SF-like stroke system; icons identify object class or action and never decorate every row.
- Dividers: only between genuinely comparable values; no page-wide grid or repeated section rules.

## Interaction and motion gate

| Before | After | Why |
| --- | --- | --- |
| Entire regions hard-swap or reflow without context | Selected object and comparison content crossfade/translate within `160–220ms` using a responsive ease-out | Preserves spatial context without slowing repeated patrol use. |
| Pressable rows have no tactile response or rely on color only | Real pressable controls use a subtle `scale(0.98)` or tonal press response for `100–140ms` | Confirms touch input while preserving a `44px` target. |
| Detail navigation can feel like an unrelated page | Detail originates from the selected object and restores object, scroll and focus on Back/Forward | Explains where the evidence came from and supports interruption. |
| Repeated metrics animate for decoration | Metrics update statically or with a short opacity crossfade; charts never sweep in | Motion must not imply unobserved freshness or measurement. |
| Motion remains identical for every user | Reduced Motion removes transforms and keeps only short opacity/tone changes | The task and state remain understandable without motion. |

No pulse, glow, bounce, count-up, breathing glass or animated urgency is permitted.

## Visual acceptance rubric

Every required screenshot must answer these questions without reading source code:

1. Can a reviewer identify the verdict, evidence age, affected object and next inspection within three seconds?
2. Is there exactly one primary visual question, rather than several equal-weight headers?
3. Does the selected comparison name why the two sides are comparable?
4. Does every displayed relationship resolve to verified object/source evidence, with no decorative or inferred link?
5. Does removing decorative borders leave the hierarchy understandable?
6. Are collection success, forwarding evidence and external business reachability visibly separate claims?
7. Does each abnormal scenario materially change the comparison and time evidence?
8. Is glass limited to functional controls/navigation and still legible over the content beneath it?
9. Does the 768px surface behave as an object index plus workspace, not two stretched phone columns?
10. Do `200%` text, keyboard focus, VoiceOver semantics, reduced motion and touch targets remain usable?
11. Is any old `mp-*` ledger selector, component or duplicate hidden mobile/desktop DOM still active?

`collection-down` and `no-snapshot` fail automatically if they show current rates, a current threshold comparison, an active chart or a business-health implication. A blind human review that can accurately describe any first viewport as an administration report, generic monitoring dashboard or AI card stack also fails the visual gate.

Automated geometry and DOM checks cannot pass the design gate without manual review of original `320/390/430/667/768/844` captures in normal, unknown, incident and recovery states.

## Implementation ownership

- New Overview presentation root: `src/panel-framework/overview/mobile-overview/` with one `MobileOverviewEntry.tsx` seam.
- New styles import only Linkboard-owned token, phone, tablet and motion files.
- Shared inputs may come from `overview/evidence-model`, route/navigation contracts, time formatting and read-only runtime state.
- The rejected `MobilePatrol*`, ledger and old mobile overview CSS owners must be removed from the active import graph before the design gate can pass.
- Existing non-Overview mobile domain routes are migration inputs only. They remain operational until their Linkboard-native replacements land, but they cannot receive final Product/Design/Visual signoff in their current presentation.
- Desktop render and style trees remain untouched by Linkboard selectors.
