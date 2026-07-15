# Mobile risk-focus design decision

Date: 2026-07-15

## Why the previous direction failed

The previous patrol brief was truthful but visually flat and structurally repetitive. Proof, signal, decisions, and four object tabs often restated the same measurements. The `fleet` branch could replace a higher-risk interface signal, the object workspace did not reliably add evidence, and the tablet layout widened two short columns without creating a real work surface.

## Product research translated into principles

- Apple’s Human Interface Guidelines emphasize hierarchy, consistency, legibility, predictable navigation, and adaptation across display sizes. We adopt those interaction disciplines, not decorative glass or an imitation iOS skin: <https://developer.apple.com/design/human-interface-guidelines>
- Apple’s typography guidance sets an iOS minimum of 11 pt and recommends weight, size, and color as hierarchy tools. This product keeps operational web text at 12px or above and tests text enlargement: <https://developer.apple.com/design/human-interface-guidelines/typography>
- Apple treats tab bars as top-level navigation. Four network objects are not top-level app destinations, so the generic object tablist is removed: <https://developer.apple.com/design/human-interface-guidelines/tab-bars>
- UniFi Site Manager prioritizes multi-site scope and direct access to deployments. We retain scope as compact context but do not let it replace incident priority: <https://help.ui.com/hc/en-us/articles/20680072882967-UniFi-Remote-Management-via-Site-Manager>
- Firewalla’s mobile flows and alarms move from a concise event to relevant object/detail evidence. We adopt the decision-to-evidence progression while preserving this product’s stricter read-only boundary: <https://help.firewalla.com/hc/en-us/articles/24739086338323-Firewalla-Feature-Network-Flows> and <https://help.firewalla.com/hc/en-us/articles/360006083334-Manage-Alarms>
- The iKuai app groups monitoring and network diagnostic tools around operational tasks. We retain its restrained cold-blue and object-oriented character without cloning its product: <https://www.ikuai8.com/product/software/client-app.html>

## Directions compared

### A. Incident inbox

One opened incident dominates the phone page. This creates a strong phone hierarchy and clean next action. It lost because its document-like expansion does not make enough use of a 768px operational workspace.

### B. Evidence timeline

Signal, proof, and objects follow a causal event rail. This is visually distinctive and easy to trace. It lost because many snapshots do not provide honest before/after observations; an event timeline would tempt the interface to manufacture chronology or leave large holes.

### C. Risk-led object cockpit — selected

The highest risk selects one signal and one inspection object. When an incident contains several WAN or interface objects, a compact horizontal selector changes the inspection object without changing the risk. Phone renders a single focused composition; the 700–1199px tablet surface exposes a persistent risk/evidence master and object detail. This direction best satisfies fast patrol, object evidence, concurrent risk, tablet utilization, and truthful data boundaries.

## Named visual rationale

**Cold focus, quiet evidence.**

One low-chroma focus surface makes the highest-risk judgment unmistakable. Proof is a short ledger, signal is the only measurement region, and object evidence is one purposeful inspection surface. Cold neutrals and restrained blue preserve operational character; low-chroma warning and danger tones change the page rhythm without turning it into a consumer health app.

## Architectural consequences

- Replace global `facts`, `signal`, `decisions`, and fixed object tabs with ordered focus views.
- Add `interface` as a first-class inspection object.
- Select signal and initial inspection from ordered risk, never directly from `scenario === "fleet"`.
- Derive route verification, evidence mode, and browser gate priority from observations rather than scenario labels; keep scenario fixtures isolated and test composite precedence separately.
- Render separate phone and tablet compositions from the same evidence model.
- Keep iPad-class widths in the tablet composition and reserve the desktop console for 1200px and above.
- Replace the boolean detail history implementation with a state-derived navigation view that supports Back and Forward.
- Make evidence detail identify the selected object, source path, sample time, and recorded fields instead of claiming every transformed row is raw evidence.
- Replace timer-polled focus restoration with a layout-effect transition.
- Rewrite acceptance around semantics, geometry, and interaction rather than text or DOM volume.

## Rejected shortcuts

- Restyling the existing four tabs.
- Adding more cards, blur, or rounded status pills.
- Filling tablet space with duplicate metrics.
- Keeping fleet signal precedence and changing only its copy.
- Satisfying “density” by lowering font size or increasing DOM/text counts.
