# Mobile Router Panel Product Loop

## Operator job

A phone user opening the panel during a network incident must decide within three seconds whether the internet path is usable, whether the data is current enough to trust, what object is affected, and what to inspect next.

## Non-negotiables

- Delete the rejected phone presentation rather than patch it.
- Keep mobile presentation fully separate from desktop presentation.
- Use a compact, flat, cold-blue operations console—not a scaled dialog, health app, floating-card dashboard, or decorative iOS imitation.
- Normal first screen: one verdict, four metrics, truthful traffic, one detail entry.
- Incident first screen: one verdict, object, impact, credibility, next step, one detail entry.
- Keep evidence and diagnostics available only after drilldown.
- Required matrix and all GitHub checks are blocking.

## Non-goals

- Reworking unrelated desktop modules in the mobile slice.
- Adding marketing copy, decorative illustration, synthetic charts, or extra top-level tabs.
- Installing a multi-agent runtime or allowing it to alter global Codex configuration.

## Product contract

See `.agents/skills/router-panel-product-loop/references/project-gates.md`.

## Gate status

| Gate | Status | Evidence / reason |
|---|---|---|
| Product manager | pass | Operator job, non-negotiables, scenarios, and measurable first-screen contract recorded above. |
| Product/CEO | pass | One primary decision surface; evidence and secondary modules are removed from summary. |
| Product design | pass | Portrait and landscape screenshots use one cold-blue material system; normal and incident summaries fit without scrolling or desktop chrome. |
| Engineering | pass | Separate mobile app/model/screens/style ownership; desktop DOM absence is runtime-tested. |
| Focused QA | pass | `check:types`, `build`, `check:overview`, and all mobile runtime scenarios pass locally. |
| Full QA | pass | `_acceptance/release-matrix-mobile-product-loop-final/report.json` passes all 28 required cells and captures every required screenshot. |
| Release | pass | Remote commit `e5d8d3e` passed Linux validation, Windows packaging, and GHCR image publication. |

## Current return owner

Engineering owns the next action: retire remaining self-certifying desktop selectors and reduce the legacy `!important` patch layer without changing the verified mobile product.
