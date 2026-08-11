# Mobile Optical Patrol design contract

## Status

- status: `selected direction / implementation pending`
- selectedAtStep: `934`
- releaseEligible: `false`
- supersedes presentation ownership: `mobile-overview/pocket-console`
- preserves: shared evidence model, route truth, RFC3339 time, read-only and navigation contracts

The selected mobile direction is **Optical Patrol / 光学巡检台**. It combines the Patrol Claim Stack information architecture with an Apple 27-style functional chrome layer and an opaque iKuai operational evidence canvas. The prototype is a design decision, not public-release evidence.

## Owner job

Within five seconds the first useful phone viewport must answer:

1. which device or fleet scope is being observed;
2. whether evidence is current, historical, or unavailable;
3. the strongest supportable service/management conclusion;
4. the highest-priority operational claim and affected object;
5. the decisive evidence and its time/source boundary;
6. the object-bound next action.

## Non-goals

- Do not reuse Pocket Console composition, `.pc__*` selectors, bottom-nav appearance, pale-blue row fills, list/detail/comparison ownership, or pixel layout.
- Do not build a topology concept image, status-card dashboard, health app, modal phone shell, or dense table shrunk to mobile.
- Do not use glass in content, metrics, alerts, rows, charts, or evidence blocks.
- Do not animate telemetry values or imply unobserved freshness.
- Do not infer current values from historical/unavailable evidence or rewrite missing values as zero.

## Product architecture

### Phone: continuous claim canvas

Order:

1. floating optical runtime toolbar;
2. evidence boundary;
3. one factual decision statement;
4. one expanded primary claim;
5. decisive evidence attached to that claim;
6. one inline object-bound workspace action;
7. two or more compact follow-up claims when they exist;
8. stable four-destination task navigation: Overview, Network, Terminals, Logs.

There is no separate home object list followed by a duplicate details panel. Selecting another claim changes the expanded claim in place and preserves browser history/focus.

### Tablet: decision + focus + evidence workbench

At `768–1199px`:

- stable task navigation becomes a narrow side rail containing navigation only;
- a `278–312px` decision/follow-up column owns scope, evidence, verdict, and the next claims;
- a flexible focus column owns the selected claim, decisive evidence, measurement, and inline action;
- a lower evidence deck spans the workbench and adds sources, judgment boundaries, object relationships, sampling credibility, or history;
- no vertical action text, stretched phone inspector, duplicated hidden DOM, or empty decorative panel.

At large text sizes or insufficient width, the workbench returns to a single continuous column.

## Visual language

### Material ownership

- **Optical chrome:** runtime toolbar, stable task navigation, temporary menus/sheets. It may use bounded blur, diffusion, a darker separating edge, and a subtle specular highlight.
- **Operational canvas:** opaque, matte, high-legibility standard material. Structure comes from alignment, typography, source rails, measurement baselines, and sparse separators.
- **Status color:** limited to state glyphs, values, threshold marks, and compact state text. No full-surface blue/red/green fills.

### Typography

- Decision: `25–31px`, strong weight, semantic phrase wrapping.
- Primary measured value: up to `50px` only when the scenario is measurement-led.
- Object: `15–19px`.
- Body: minimum `13px`; operational labels may not be reduced to create density.
- Numeric evidence uses tabular figures; monospace is limited to addresses, identifiers, and raw source paths.

### Geometry and iconography

- 4pt spacing grid; phone horizontal margin about `16px`.
- Content rows have no decorative rounded-card container.
- Floating chrome uses one coherent concentric radius system; content uses square/low-radius structural geometry.
- Use Lucide/system-style rounded line icons at a consistent `20–23px` scale. An icon background denotes focus, not object type.
- Chevrons appear only for real navigation.

### Motion

| Before | After | Why |
| --- | --- | --- |
| Persistent navigation mixed with a large contextual CTA | Stable navigation; object action remains inside evidence | Separates destination from object command |
| Repeated list/detail transitions | One in-place primary claim change | Preserves spatial continuity without duplicate content |
| Generic scale/slide decoration | `80–220ms` interruptible feedback only on real controls | Emil gate: motion must explain state or space |
| Motion-dependent hierarchy | Reduced Motion removes transforms while wording and structure remain complete | Accessibility carries meaning without animation |

Telemetry refresh is immediate and unanimated. Press feedback is subtle and does not shrink the 44px hit target.

## Scenario substitution

| Scenario | Primary claim | Decisive evidence | Object action | Forbidden claim |
| --- | --- | --- | --- | --- |
| `single` | verified active default route | destination, gateway, table, same-window WAN rate | inspect default route | internet/business healthy |
| `fleet` | highest real incident across the fleet | device identity, affected object, verified dependency/count | inspect affected object | fleet scale implies health |
| `interfaces-down` | highest-priority down dependency | admin/running state, route dependency, impact scope | inspect interface and route | internet definitely down |
| `resource-full` | largest policy exceedance | current, threshold, delta, trailing consecutive samples, window | open resource load | forwarding is interrupted |
| `collection-down` | failed collection boundary | REST/SSH separately, last success, withdrawn values | inspect read-only diagnostics | current business state |
| `no-snapshot` | unavailable current snapshot | what was not observed, last valid evidence if any | inspect evidence boundary | any current rate/resource/interface value |
| `all-offline` | observed non-running WAN scope | named WANs, verified/unknown route consequence, historical boundary | open WAN workspace | external internet definitely unavailable |

Normal and abnormal scenes must differ in primary object, evidence geometry, measurement priority, action, and forbidden conclusion—not only color or copy.

## Accessibility and interaction blockers

- 44×44px minimum hit areas for every control.
- 200% browser text and maximum Dynamic Type must not clip within self, ancestor, or viewport.
- VoiceOver order follows scope → evidence → decision → primary claim → evidence → action → follow-ups.
- Back/Forward restores selected claim, scroll, and focus; temporary menus do not pollute history.
- Reduce Transparency replaces optical chrome with opaque high-contrast material.
- Reduced Motion removes scale/translation; forced colors preserves hierarchy and severity beyond color.
- Safe-area and fixed navigation never obscure focus, final content, or object actions.

## Required design and release evidence

Design slice before production expansion:

- `single` and `resource-full` at `390×844` and `768×1024`;
- independent Product and Visual review with P0/P1=0;
- source screenshots under `_acceptance/mobile-vnext-directions/`.

Implementation acceptance:

- all seven scenarios at `320×568`, `390×844`, `430×932`, `667×375`, `768×1024`, `844×390`, and `1199×900`;
- 200%, keyboard/history/focus, Reduced Motion, Reduce Transparency, dark and forced colors;
- no hidden Pocket or desktop presentation owner;
- automatic matrices plus independent review of original screenshots.

Full public release additionally requires route/security/recovery matrices, RouterOS read-only soak, clean exact SHA, authorized atomic Git Data publication, and exact-SHA Linux/Windows/GHCR CL.

## Direction adjudication evidence

- A — Patrol Claim Stack + optical chrome: selected after P1 remediation.
- B — Optical Instrument Ledger: rejected because it retained list/detail grammar and tablet admin-table character.
- C — Five-Key Briefing Board: rejected because it became low-density status tiles and a large dashboard card.
- Final A originals: `_acceptance/mobile-vnext-directions/a-*.png`.
- Prototype geometry report: `_acceptance/mobile-vnext-directions/report.json` (`12/12`).
