# Responsive capability table

- status: `active-step946-incident-lens-local-signoff-pass-release-open`
- validForCommit: Step947 exact clean Incident Split Lens 63-cell runtime, compact-tablet identity repair, responsive provenance and local independent P0/P1/P2 closure; release authorization open
- supersededBy: `null`
- owner: Product Design + Frontend Architecture

This is the only current responsive direction. Numeric thresholds express minimum task capability, not permission to swap unrelated products.

| Available width | Required capability | Navigation | Object/detail relationship | Minimums and fallback |
|---|---|---|---|---|
| 320–599 | phone patrol | four stable bottom destinations plus More | one active layer; object opens a full destination with Back/Forward | 44px targets; no persistent rail or inspector |
| 600–767 | compact workbench | persistent compact rail | 600–659 keeps the active risk/object above its selected evidence in one deliberate reading stack; 660–767 keeps that same selection in an inline master/detail workbench | split only from 660px with a 210px list and 280px evidence minimum; large text always returns to the immediate evidence stack |
| 768–1199 | adaptive tablet workbench | persistent compact rail | normal Overview follows its own 620/700px container capabilities; domain navigator and inspector coexist when the 268px/420px minimums fit; resource trafficLoad uses a single-column two-layer flow at 768–799px and a bounded two-pane list/inspector task at 800px+ | domain navigator 268–336px; inspector min 420px when split; resource 768–799px is an explicit capacity fallback; below 768px compact mode stacks; no duplicate DOM or filler |
| 1200+ | dense operations workbench | desktop navigation using the same task vocabulary | comparison list/table and inspector coexist; Overview may add dense evidence modules | no giant-title mode; layout gains columns/density without changing route semantics or object identity |

## Continuity invariants

- 1199/1200 and 1365/1366 must preserve the same task grammar, navigation vocabulary, selected object, evidence priority, and URL state.
- A breakpoint may reposition or collapse panes; it may not replace a task with an unrelated dashboard/table product.
- Tablet arrangement is container-capability driven, not a viewport label. A normal Overview split requires 620px for 260px+340px task columns; list+inspector master/detail remains a different capability requiring 700px for 280px+400px. Both use one DOM and truthful fallback.
- A domain may stack at an explicit capacity fallback when its minimum panes do not fit; it must not be forced into a squeezed split. trafficLoad stacks at 768–799px after the 64px rail leaves only 704–735px of content, and splits at 800px+ when the 268px navigator plus 420px inspector fit. The Overview compact workbench stacks selected evidence at 600–659px and splits active object/evidence from 660–767px; it is not a widened phone.
- Incident order is risk-driven, not component-driven: the highest-risk object precedes comparison signals on phone, portrait tablet, and short landscape. Interface incidents do not render a WAN chart merely because current samples exist; WAN context may follow only when it changes the next decision. Fleet scale never outranks an active incident.
- No-snapshot coverage may use three columns in the tablet capability band when width permits; phone and large-text modes fall back to one column rather than shrinking type or targets.
- Mobile and desktop presentation roots may remain separate only where interaction truly differs. Typed rows, inspectors, route maturity, action context, evidence language, and tokens are shared when their contracts match.
- Tests cover boundary pairs around every capability transition, including the domain-specific 767/768 pair, and compare semantic landmarks rather than only overflow.
- This table supersedes every 900/1024/1200/1366 threshold statement in historical direction documents.

## Current verification boundary

Step938 exact artifact `188e…` proves ten production boundaries from a single initial state: phone 320/390/430, short-landscape 667/844, tablet 768/899/900/1199 and desktop 1200. The checker restores the real `.op` scroll owner after every reachability probe, records window/document/panel-app/active-root scroll in both cell and screenshot evidence, and fails any capture away from zero. Selected actions are initially complete and clear of fixed navigation; every follow-up scrolls clear and remains hittable. The run passed 10/10 with screenshot dimensions/hashes and both identities, and all four local independent roles returned P0/P1=0 after inspecting the complete 63+10 image set. Product retains one non-blocking sparse-tablet spacing P2. Evidence remains dirty/release-ineligible and cannot open release.

### Historical Step 192 domain-workspace capability correction — superseded by Step609

The original Step192 red contract proved that a 768px viewport with the unchanged 64px task rail leaves too little room for the old 288px navigator plus 420px inspector minimum. The later Step280 two-pane rule is retained as historical evidence, not the final resource capacity policy. Step609 supersedes it for trafficLoad: 768–799px uses a single-column two-layer task, while 800px+ may use master/detail when the minimums fit. Overview retains its independent container-based 620/700 rules.

At 844px the resource domain workbench owns the viewport below the runtime bar, uses a 312px + 468px navigator/inspector split, and keeps object evidence readable. This is focused engineering evidence only; it does not sign Product, Design or Visual QA.


### Step 169 focused evidence

Step 169 measured the Overview workspace rather than inferring from viewport width. At 768×1024 the workspace rect is 672px, so master and inspector now stack at 670px each; at 844×1024 the workspace rect is 748px and the panes split at 313px/433px. Runtime checks also preserve the same Overview route, risk, evidence mode, verdict and freshness across 599/600 and 767/768. The current product contract now treats 1200px as the sole desktop capability threshold; 1366px and 1440px are acceptance viewports.

This focused engineering evidence does **not** close responsive Product Design. The paired board at `_acceptance/step169-responsive-green/responsive-review-board.jpg` still finds a visual product-language cliff at 1199/1200 and weak width utilization at 1366/1440. Those remain blocking P1s rather than being hidden by the runtime pass count.

### Step 181 write-ahead contract

Step 180 screenshots prove that reusing a 700px inspector threshold for normal Overview creates a false 768→844 architecture transition. Step 181 implemented separate normal summary columns (620px) and master/detail columns (700px), assigns `Signal → Comparison` to Primary and `Focus → Investigation → Evidence boundary` to Context, and keeps one copy of each current module. Its focused runtime passed 148 checks / 78 screenshots / 79 API calls. Independent review correctly rejected signoff at that point because a legacy JavaScript 900px dead branch still encoded forbidden ownership, exact container pairs and DOM cardinality were unproved, and 1199/1200 remained visually different products. Step 182 closes the first two engineering gaps; the product-language cliff remains failed.

### Step 182 active remediation contract

The only active responsive thresholds are task capabilities measured in the Overview workspace: 620px for normal summary columns and 700px for list/inspector. A 900px viewport branch is not an active capability and must not change module ownership. Exact actual-container 619/620 and 699/700 pairs, single-DOM cardinality, and 844/1199 real 200% text fallback are required before Architecture can sign this slice. Visual continuity across the separate mobile and desktop roots is a following Design slice; Step 182 does not merge those roots or move the 1200 desktop threshold.

Step 182 focused implementation now proves this contract in production runtime `152 checks / 80 screenshots / 87 snapshot API calls`. Actual container content width 619 stacks normal Primary/Context and 620 splits them with each core landmark exactly once; 699 stacks collection list/inspector and 700 splits them at 294/406px. Collection risk truthfully has `focusObjectCount=0`, while Scenario Focus, risk-object surface, selected Inspector, Investigation, Evidence boundary and Overview root are each exactly one at 699/700 and semantically identical at 899/900. Real 200% text at 844/1199 doubles 20px to 40px, stacks the task, keeps overflow 0 and 44px controls, and leaves all four navigation labels on one visible line. The 844/1199 screenshots were inspected after the first run exposed and the final CSS fixed single-glyph rail wrapping.

The implementation uses one `tablet` capability signal, no `wideTablet` or `innerWidth >= 900`, and current-item selection uses `aria-current` rather than toggle semantics. Fixed assets remain under immutable limits: JS `753037 / 154559 / 131702`, CSS `118352 / 19625 / 17980`; 98-input identity digest is `1c3d4179e608c0253308d8204d9e807b53651a00938cae34f97f64c4595b9387`. This is focused Architecture evidence only. Product/Design/Visual remain failed on the 1199/1200 product-language cliff and require a separate Step 183 review.


### Historical Step 173 focused evidence — superseded responsive rule

Normal 1199 and 1200 now consume the same `route / wan / collection` Proof facts and preserve the same verdict → freshness → Proof → Signal → Object task grammar. Incident states intentionally omit the normal Proof strip and start with Scenario Focus, so collection failures no longer repeat two evidence summaries before the affected objects.

At Step 173 the JavaScript workbench used `min-width: 768px`, `max-width: 1199px`, `min-height: 700px`, and an additional `min-width: 900px` branch for Focus placement. **That 900px rule is historical and was removed by Step 182.** CSS now measures the actual Overview workspace for the 620px normal and 700px master/detail capabilities.

Focused evidence is mobile 56/56 and production browser 137/73/74 under worktree fingerprint `dfb26dc88466a734c7136da98a7aac43d7faeb92a94f2350cd72bbd2470e3038`. Internal boards show improved task continuity and real 1366→1440 width use. Independent Product/Design/Visual acceptance, full release matrices and exact-SHA CL remain open.

### Historical Step 175 focused evidence

Density is now measured as task capacity. The 768px Overview keeps a stacked risk-to-inspector sequence because its real workspace is below 700px; 844px preserves master/detail with the highest-risk object, novel object evidence, source and action. Desktop normal and collection journeys explicitly use 1366×768 and 1440×900 rather than an inherited height.

The first 1366×768 collection run proved a real failure: its first investigation action began at 998px. The single existing action surface now composes inside the incident task; final geometry is 709–761px with no duplicate DOM, reduced text, breakpoint move or budget increase. Production browser passes 140/75/76, fixed assets and 96-input identity pass, and the focused report is `_acceptance/step175-task-density-green/report.json`. Product/Design/Visual acceptance and full release matrices remain open.

## Step947 current mobile Overview capability

| Capability | Layout ownership | Blocking evidence |
|---|---|---|
| 320–430 portrait | one continuous Patrol or Incident task sequence | full identity/impact/evidence/action reachability, 44px controls, no fixed-navigation clipping |
| 600–719 tall compact tablet | one ordered task column | category and object title remain horizontally scannable; no empty second column |
| 720–899 tall tablet | object/impact and evidence/investigation split | both columns add novel evidence; 768 remains the reference split |
| 600+ short landscape | compact side-by-side task with merged command state | complete primary action and provenance, no long-label collision |
| 900–1199 mobile workbench | expanded mobile owner with the same task vocabulary | no product swap at 1199/1200 |
| 1200+ desktop | independent desktop presentation owner | shared evidence semantics and route/action context |

The former fixed “600 means two columns” rule is superseded. Exact clean `d45b428…` passes all seven scenes at 600×960 and 768×1024; the first is single-column, the second remains split. `incidentIdentityReadable` is required by both the runtime report and public readiness.
