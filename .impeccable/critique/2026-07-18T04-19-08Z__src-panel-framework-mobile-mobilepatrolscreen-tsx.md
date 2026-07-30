---
timestamp: 2026-07-18T04-19-08Z
slug: src-panel-framework-mobile-mobilepatrolscreen-tsx
target: src/panel-framework/mobile/MobilePatrolScreen.tsx
total_score: 65
p0_count: 0
p1_count: 2
---
Method: dual-agent (A: 019f7364-fa9a-7ba1-b9a3-b8b808df01bb · B: 019f736a-fafc-76b3-8618-37bd03b7494a)

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 3 | Current/history/unavailable and absolute time are clear; runtime chrome evidence is separate from the overview matrix. |
| 2 | Match System / Real World | 3 | WAN, route, collection and resource language is operationally credible. |
| 3 | User Control and Freedom | 2 | Production runtime has Refresh and connection controls, but the contracted More entry is absent from Overview. |
| 4 | Consistency and Standards | 2 | 844×390 changes the phone patrol into a tablet master/detail interaction solely from width. |
| 5 | Error Prevention | 3 | No-snapshot and collection-down preserve evidence boundaries instead of inventing numbers. |
| 6 | Recognition Rather Than Recall | 3 | Most objects and times are visible; short landscape requires context matching across panes. |
| 7 | Flexibility and Efficiency | 2 | Portrait patrol is fast; short landscape spends scarce height on workbench chrome. |
| 8 | Aesthetic and Minimalist Design | 3 | Restrained industrial language works; repeated fact tiles begin to look templated. |
| 9 | Error Recovery | 2 | Refresh exists in live runtime, but low-frequency navigation/recovery is not complete or jointly evidenced. |
| 10 | Help and Documentation | 2 | Evidence notes help, while ellipsized abnormal explanations hide causality. |
| **Total** |  | **25/40** | **Significant improvement still required** |

## Anti-Patterns Verdict

**LLM assessment:** The current Overview does not read as generic SaaS or an iOS imitation. It avoids marketing gradients, fake glass, oversized health cards and fabricated trends. The remaining AI-pattern risk is structural: abnormal facts are repeatedly rendered as equal icon/text/chevron tiles, which turns operational causality into a card directory.

**Deterministic scan:** `detect.mjs --json src/panel-framework/mobile` exited 2 with two `side-tab` findings at `mobile-domain.css:760` and `:763` (`border-left: 3px solid ...`). They are outside the `MobilePatrolScreen` style entry, so they are false positives for the Overview target, but real design-system findings in the adjacent mobile domain inspector.

**Visual overlays:** Browser mutation/injection was unavailable inside assessment B, so no reliable user-visible overlay was created. The fallback evidence was the 14 current Overview screenshots in `_acceptance/identity-overview-step134`.

## Overall Impression

The 390px portrait surface finally has a credible operations-console skeleton and truthful abnormal states. The largest opportunity is no longer cosmetic: capability selection, runtime chrome and abnormal information grammar must become one coherent mobile task system.

## What's Working

1. Abnormal states genuinely reorder content: all-offline, no-snapshot, collection-down, resource-full and interfaces-down are not normal pages recolored red.
2. Portrait establishes a usable three-second order: freshness, factual verdict, default route/WAN/collection evidence and the highest-priority object.
3. Emil-style high-frequency behavior is restrained: immediate press feedback, short disclosure motion and reduced-motion coverage, with no invented telemetry tweening.

## Priority Issues

### [P1] Short landscape is misclassified as a tablet workbench

- **Why it matters:** At 844×390 the selected-object master/detail layout consumes the shortest viewport and changes row activation semantics. Landscape is slower than portrait during an incident.
- **Evidence:** `useMobilePanelSurface.ts:9-10`, `MobilePatrolScreen.tsx:57-65`, `mobile-patrol.css:1542-1557`; `public-fleet-wide-overview.png`, `public-all-offline-wide-overview.png`, `public-resource-full-wide-overview.png`.
- **Fix:** Gate the tablet workbench by both usable width and height. Short landscape keeps the continuous patrol and direct object destination.
- **Suggested command:** `$impeccable adapt`

### [P1] Overview runtime chrome does not complete the contracted navigation/recovery surface

- **Why it matters:** The live runtime proves Refresh and connection switching, but no More entry is visible on Overview. The overview matrix uses a static snapshot shell and therefore cannot, by itself, prove the complete runtime chrome.
- **Evidence:** `mobile-runtime-current.png`; `PanelRuntimeChrome.tsx`; `panel-framework-app.tsx:34-49,93-99`; contract `mobile-product-contract.md:78,82`.
- **Fix:** Add a real, accessible More directory trigger to live Overview chrome and bind the runtime-browser artifact to the same worktree identity as matrix evidence. Keep content matrices and runtime-chrome evidence explicitly separate.
- **Suggested command:** `$impeccable harden`

### [P2] Abnormal facts are over-directoryized and truncate causality

- **Why it matters:** Equal chevron rows make scope, impact and historical reference look like four equivalent destinations. Ellipsis hides the exact reason during no-snapshot/collection failure.
- **Evidence:** `MobileScenarioFocus.tsx:29-56`, `mobile-patrol.css:302-401`; no-snapshot, collection-down and all-offline portrait screenshots.
- **Fix:** Keep one factual judgment and at most two actionable rows. Render non-action evidence as compact ledger text and allow critical consequence copy to wrap to two lines.
- **Suggested command:** `$impeccable distill`

### [P2] Adjacent mobile inspector uses forbidden side-stripe status accents

- **Why it matters:** The 3px left stripe is a detector-confirmed generic alert trope and breaks the otherwise restrained full-surface status language.
- **Evidence:** `mobile-domain.css:760,763`.
- **Fix:** Use a full low-chroma tonal section surface plus icon/label/state wording; remove the asymmetric stripe.
- **Suggested command:** `$impeccable quieter`

### [P3] Resource-full leaves its next investigation step implicit

- **Why it matters:** Pressure, samples and the resource object are visible, but the remaining first-screen slack does not say which evidence/source should be inspected next.
- **Evidence:** `public-resource-full-narrow-overview.png`; `MobilePatrolScreen.tsx:126-139,194-230`.
- **Fix:** Add one compact line for sustained window/source/next object rather than another card.
- **Suggested command:** `$impeccable clarify`

## Persona Red Flags

**Alex (power operator):** Rotating to 844×390 changes a direct patrol into a list/inspector pairing task and reduces scan speed.

**Sam (accessibility-dependent operator):** Runtime and matrix artifacts do not yet jointly prove the complete Refresh/More/focus contract; truncated abnormal explanations increase reliance on opening detail.

**Casey (distracted mobile operator):** Portrait targets are generally reachable, but equal-weight abnormal rows force extra taps to reconstruct cause and impact.

## Minor Observations

- The cold-blue restrained palette and 12px minimum text are a real improvement.
- The current production runtime screenshot includes Refresh; the static overview screenshot does not. Treating either artifact as the whole product is misleading.
- Detector findings are not Overview findings, but should be fixed before calling the mobile visual system coherent.

## Questions to Consider

- Why should a 390px-high phone inherit a tablet object inspector merely because it is wide?
- Which abnormal facts are decisions, which are evidence, and which are navigation? They should not share one component by default.
- Can the user reach every low-frequency tool from Overview without turning the four stable destinations back into five tabs?
