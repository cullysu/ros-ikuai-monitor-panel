# Architecture Decision Record — Truth and cross-surface continuity

- status: `implemented-local-verified-release-pending`
- validForCommit: Step947 exact clean Incident Split Lens architecture, runtime and engineering-readiness evidence; release authorization remains pending
- supersededBy: `null`

## ADR-001 Atomic traffic samples

Replace parallel timestamp/uplink/downlink arrays with ordered atomic samples containing `timestamp`, `uplink`, `downlink`, `source`, and `evidenceMode`. A sample is appended only as one observation. Compatibility parsing occurs at one boundary and may mark data historical/unavailable; consumers never pair array tails.

## ADR-002 Responsive capability, not product swapping

A single capability table owns phone, compact/tablet, and desktop transitions. Breakpoints may change navigation density and pane arrangement, but cannot swap unrelated task grammar in one pixel. Each pane has an explicit minimum width and an ordered collapse path.

## ADR-003 Shared semantics, separate presentation

Mobile and desktop keep independent presentation roots but share typed domain rows, object inspectors where interaction contracts match, evidence vocabulary, action context, route maturity metadata, and visual tokens. Separation forbids hidden DOM, not reuse of domain semantics.

## ADR-004 Canonical identity and URL

Object identity uses locale-independent normalization. Legacy query/hash URLs may be read once, then normalized with `replaceState` to one canonical representation. New navigation emits only canonical URLs.

## ADR-005 Asset containment

Original, Brotli, and gzip paths all pass the same resolved-root containment and symlink policy before serving. Sidecars never receive a weaker path check than source assets.

## ADR-006 Source-to-bundle input identity

The framework manifest records a deterministic SHA-256 identity over the scoped frontend build inputs. Runtime and matrix validators recompute that identity before serving committed public assets and fail read-only when it differs. Validators never silently rebuild, never use unrelated worktree files as bundle inputs, and never accept output-only hashes as proof that the bundle belongs to the current source tree.

## ADR-007 Asset transport and source-ownership budgets

Generated JS/CSS are bounded by raw, gzip and Brotli manifest sizes verified against real files. Source maintainability is governed separately by per-owner file budgets and forbidden override rules. Transport bytes cannot prove source health; source line counts cannot prove product density or visual quality.

## ADR-008 Shared runtime-worktree matrix identity

Matrix producers and readiness consume one implementation of commit, runtime-worktree fingerprint and artifact-key identity. Product, backend, build, test and tool changes are fingerprinted; generated acceptance artifacts and explicitly enumerated governance ledgers are excluded so write-ahead decision logging does not invalidate otherwise unchanged runtime evidence. Repository cleanliness is still measured independently and dirty evidence is never release-eligible. Reports from different fingerprints cannot be merged by HEAD alone.

## ADR-009 One production timestamp protocol

All machine-interpreted production timestamps, including resource history, use timezone-qualified RFC 3339. Numeric epoch and offset-free strings are rejected at the runtime schema and are not guessed by frontend consumers. RouterOS-local strings remain opaque source text until a field-specific parser can prove their timezone.

## ADR-010 Mobile capability and interaction truth

Tablet workbench selection is a width-and-height capability, not a device-width label: `768–1199px` requires at least `700px` available height, otherwise the mobile root keeps one active patrol layer. Runtime chrome commands must navigate to real destinations, and scenario-focus rows must distinguish actionable navigation from non-interactive evidence; chevrons and button semantics are reserved for actions that add information.

## ADR-011 Independent channel trust without silent downgrade

An SSH unknown key or pin mismatch always blocks SSH credentials and may never replace a stored pin through normal login. A REST-only session is permitted only after an explicit request when the same probe proves HTTPS, certificate verification enabled, and REST success. HTTP, TLS verification disabled, and failed REST cannot exercise this path. The choice is request-local, keeps SSH visibly degraded, and does not imply forwarding or business health.

## ADR-012 Accessibility is a route capability, not a marker

Large-text detection, route-title focus and history restoration are shared runtime capabilities owned above individual pages. Primary-route acceptance must exercise real 200% text, 320 CSS px, keyboard navigation, object drill-down and Back/Forward focus against mounted production content. CSS class counts, ARIA source strings and self-authored pass attributes are not acceptance evidence. Visual truncation may remain only where the interactive control preserves a complete accessible name and a real detail destination; 200% visible text must reflow.

Forced-colors acceptance must enable the browser capability itself, not a test class. Current/selected/risk semantics need system-color geometry or non-color patterns; author colors may not be preserved with `forced-color-adjust:none`. CDP/Playwright computed accessibility trees prove exposed roles and names but, in the current Chromium APIs, do not expose `aria-current`; therefore current-route state remains a separate DOM semantic assertion and AX evidence must not be mislabeled as screen-reader acceptance.

## ADR-015 Layout capability owns CSS behavior

Responsive JavaScript and CSS consume the same explicit layout state. Width and height media queries determine whether a capability is available; the renderer records the chosen task mode in `data-mobile-domain-layout`; CSS may style workbench, short-stack or phone-detail only through that chosen mode. A broad width rule may not resurrect inactive list/header layers, hide a phone-detail return action or otherwise override the capability decision.

## ADR-016 Preview reason is semantic, never positional

Automatic object preview may use only typed domain reasons: attention, verified route/interface relation, active default route or a valid timestamped latest log. Viewport size, list length, sort position, page position and `rows[0]` are presentation facts, not evidence priority. Without a semantic candidate, the list remains the active task until explicit selection establishes URL, ARIA and history state.

## ADR-017 Interface state and operational impact are separate

An observed interface state cannot prove business or routing impact by itself. One shared operational assessment owns the distinction across Overview, Section rows, mobile preview and inspectors. `running=false` plus administrative disablement is not an incident. `running=false`, explicit enablement and an exact non-disabled default-route gateway/interface relationship may produce a typed configuration-dependency risk. Every other non-running observation remains visible as impact-unverified and cannot create danger attention, a “风险对象” label or implicit selection. Interface names, WAN-like labels, row order and scenario names are forbidden impact heuristics.

## ADR-018 Asset raw baseline follows approved capability, not an exhausted snapshot

An asset ceiling may be re-baselined only after the generated chunk and committed manifest match by input digest, SHA and UTF-8 bytes; all non-product fixtures and honest duplicate ownership are removed; and an adversarial review finds no low-risk deletion path. Raw, compressed transport and source-owner budgets remain separate controls. For the Step 159/160 capability increase, only JavaScript raw changes from 740000 to 768000 bytes. JavaScript gzip/Brotli, all CSS limits, per-owner line budgets and override prohibitions remain unchanged. Additional chunks that are not tracked by the manifest cannot be used to make the primary asset appear smaller.

## ADR-019 Shared task grammar without shared presentation DOM

Mobile/tablet and desktop may retain independent presentation roots, but verdict, freshness, Proof, Signal, Object and investigation context form one cross-surface task grammar. Normal Proof facts come from the shared evidence model. Incident Scenario Focus replaces, rather than repeats, the normal Proof strip. A surface may add domain depth but may not change fact identity or reorder the operator's primary decision.

Workbench capability is conjunctive: viewport height and width select the broad interaction mode, while actual Overview container width decides stacked versus split object/inspector presentation. Acceptance must test both semantic landmarks and geometry at 1199/1200, short landscape, 320px and a 768px viewport whose content width is below the split threshold.

## ADR-020 Screen-owned action composition

The page screen owns investigation-action creation and route context. An incident docket may receive the one existing action node as a composition slot to place it in the task sequence, but it may not instantiate a second action surface or import page-level action ownership. This keeps one DOM/focus/history target, lets the incident task expose the next action in the first viewport, and avoids coupling the evidence container to page orchestration.

Step 175 first proved the 1366×768 collection action was below the fold, then moved the one node without shrinking type, moving breakpoints or increasing asset budgets. Types, build, Overview, production runtime 140/75/76, screenshot geometry, fixed raw/gzip/Brotli budgets, 96-input identity and static assets pass. The worktree remains dirty and release-ineligible; accumulated-diff and independent architecture review remain open.

## ADR-021 Input-truthful desktop verification and one action surface

Desktop acceptance uses a desktop browser context (`isMobile:false`, `hasTouch:false`, DPR1); resizing a touch-tablet page to desktop width is not desktop input evidence. Tablet and desktop screenshots may share semantic assertions but not the same emulated capability context.

The incident docket accepts one `ReactElement` action surface. Runtime acceptance additionally proves exactly one investigation landmark, direct-child placement in the intended task container and unique action routes; type narrowing alone cannot prevent Fragment or wrapper misuse.

On a hybrid Windows device, navigator.maxTouchPoints may remain non-zero even when the Playwright context is explicitly hasTouch:false. Desktop capability is therefore accepted from the conjunction of DPR1, non-mobile UA, pointer:fine and hover:hover; max touch points remain report evidence, not a false requirement that touchscreen desktops cannot satisfy. Step 177 passes these checks at 1199/1200/1366/1440 and keeps 768/844 on the separate touch-tablet context.

## Status rule

These directions are accepted and have local implementations, but they do not close the Architecture gate until the latest combined worktree passes integrated regression and visual continuity review.

| ADR | Local state | Direct evidence | Remaining doubt |
|---|---|---|---|
| ADR-001 | implemented | collector, frontend model, mobile model, schema and overview focused regressions | full regenerated runtime/state matrices |
| ADR-002 | focused pass | 77-check runtime plus 4/4 focused and 14/14 seven-scenario browser cells preserve task landmarks across 1199/1200 without moving the breakpoint | canonical release matrix and independent visual review |
| ADR-003 | focused pass | independent roots share route metadata, object identity, evidence model, investigation actions and required task landmarks without hidden duplicate DOM | broader domain reuse, accumulated-diff review and independent visual grammar assessment |
| ADR-004 | implemented | query/hash conflict, canonical output, legacy normalization and locale-casing regressions | latest integrated browser run |
| ADR-005 | implemented | normal sidecars plus external/dangling symlink regressions | latest integrated backend/security run |
| ADR-006 | focused implementation pass | manifest v2 identity, fixture stale-source rejection, static-assets, runtime 77/27/40 and SVG 10/10 | canonical matrices, accumulated-diff review and independent architecture review |
| ADR-007 | focused implementation pass | shared raw/gzip/Brotli verifier, manifest/file mismatch fixture, eight CSS owner ratchets, static-assets and static readiness | canonical matrices, accumulated-diff review and future route-level CSS chunking assessment |
| ADR-008 | focused implementation pass | mixed-fingerprint fixture, shared matrix/runtime-browser identity, explicit dirty engineering mode and clean release failure semantics | fresh same-identity matrices, clean-candidate proof and independent architecture review |
| ADR-009 | focused implementation pass | red numeric-epoch tests plus collector, runtime-schema and section-model RFC 3339 regressions | fresh runtime/matrix evidence and independent architecture review |
| ADR-010 | focused implementation pass | red old behavior; 844×390 7/7 focused cells, portrait abnormal 3/3, model/workspace contracts and runtime browser 78/27/40 | full matrices and independent visual review |
| ADR-011 | focused implementation pass | policy/API/browser tests first failed the missing helper/control, then backend security, types, build, schema and production browser 80/27/40 passed | accumulated-diff and independent security review |
| ADR-012 | focused implementation pass | direct-route focus and cross-route clipping failed first; forced-colors then exposed white-on-white selection, color-only series, clipped axis and end-time overflow. Local fixes use system-color geometry, line patterns and content-sized chart layout; final runtime reaches 86/41/56 | real screen-reader task use, fresh matrices and independent Accessibility review |
| ADR-013 | focused implementation pass | production runtime now enters selected filter/object, selected incident and timestamped resource-full states; three screenshots, geometry, AX names and non-color line patterns pass at 86/41/56 | real screen-reader signoff, fresh integrated matrices and independent re-review remain external/open |
| ADR-014 | focused implementation pass | production runtime 91/45/59; 390 phone preview, 1–3 row short-stack, 20-row workbench, empty tablet-list, 320/landscape boundaries and same-fingerprint 28/76/266 pass | independent visual/product review and accumulated-diff architecture review; dirty evidence is not release evidence |
| ADR-015 | focused implementation pass | old runtime failed with visible list/header, invisible detail/return; current runtime passes visible-layer, 44px return, URL and focus restoration, with bounded 844×390 shards 3/3 + 4/4 | full same-fingerprint matrices and independent architecture/product re-review |
| ADR-016 | focused implementation pass | static/runtime red proved `rows[0]`; current runtime starts 20-row terminals as tablet-list and enters workbench only after stable-ID selection | full same-fingerprint matrices and independent product/architecture re-review |
| ADR-017 | focused implementation pass | model/workspace red-green tests, production runtime 93/46/60, architecture/section gates and a 3/3 phone/tablet/desktop typed-risk shard under fingerprint `5773c777f6f4…` | full same-fingerprint matrices, production-data diversity and independent product/architecture re-review |
| ADR-018 | focused implementation pass | exact UTF-8 attribution `753242=616427 module code units + 117433 wrapper code units + 19382 UTF-8 expansion`; two independent reviews; budget fixture and formal manifest pass with only JS raw reset to 768000 | asset identity, runtime, screenshots and accumulated-diff review after the raw-only ratchet change |
| ADR-019 | focused implementation pass | shared evidence facts, incident Proof replacement, container-aware tablet acceptance, mobile 56/56 and production browser 137/73/74 | independent visual/product review, full matrices and accumulated-diff architecture review |
| ADR-020 | focused implementation pass | one screen-owned action node remains fully visible at 1366×768 without duplicate DOM, compressed type or raised budget | accumulated-diff architecture and product review |
| ADR-021 | focused implementation pass | ReactElement slot plus runtime one-surface/direct-child/unique-route assertions under DPR1 non-mobile fine-pointer/hover context; production browser 140/75/76 | full matrices, hybrid-device diversity and independent architecture review |
## ADR-022 Accessibility scaling keeps stress, zoom and OS evidence separate

- status: `accepted-current`
- validForCommit: `local unpublished remediation after a414f7aef2a4545c78a9a42e34e9cb6d6cf3aca3`
- supersededBy: `null`

DOM `text-size-adjust:200%` and CDP `setEmulatedOSTextScale(2)` are not accepted as universal OS text-scale proof in the current Windows headless runtime. The former left a 768px sentinel at 16px; the latter and the matching Blink test settings left px/rem/em/medium probes at 16px because the Chromium setting participates in text autosizing rather than general desktop font scaling.

Automated evidence therefore has two explicitly named lanes: a 390px **synthetic text stress** that must demonstrate measured font growth but cannot sign Accessibility, and a **browser 200% zoom equivalent** that halves the CSS viewport at DPR2 while recording both physical and CSS dimensions. Real OS Dynamic Type/text-only scaling remains an external Accessibility requirement. Reports and screenshots may not collapse these three evidence classes into one `text200 pass` claim.

Step 184 implementation evidence: the corrected production runtime passes `157 checks / 82 screenshots / 90 snapshot API calls`. The synthetic lane now doubles measured computed typography deterministically and marks `accessibilitySignoff=false`; the zoom lane records physical/CSS geometry and follows the actual 384px phone-detail path with canonical context and Back/Forward. A bounded document-height/max-scroll settle loop replaced the earlier timing-sensitive overlap probe. Fixed budgets, 98-file identity and static assets pass. This is a focused implementation result only; true OS scaling, independent Accessibility, accumulated architecture review and current release matrices remain open.

Independent Step 184 architecture rereview accepts this focused ownership with P0=0/P1=0. Code Review remains red on two adjacent gate details: public readiness does not yet require every new semantic/metadata check, and overlap controls are captured before settle without an explicit settled proof. These are test/release-contract corrections; they do not reopen the accepted mobile presentation architecture unless their red tests expose a product defect.

## ADR-023 Static release contracts follow the rendering owner

- status: `accepted-current`
- validForCommit: `local unpublished remediation after a414f7aef2a4545c78a9a42e34e9cb6d6cf3aca3`
- supersededBy: `null`

A source-level release assertion may bind a semantic marker to the component that actually renders it, plus an explicit composition edge from its screen. It may not require the marker string to remain in an ancestor shell after ownership has been extracted. For mobile Proof, `MobileProofStrip.tsx` owns the facts container/items/task-focus markers and `MobilePatrolScreen.tsx` owns composition. Public-bundle and production-runtime checks remain required so source ownership cannot replace rendered evidence.

## ADR-024 Comparison novelty is an evidence-model responsibility

- status: `accepted-current`
- validForCommit: `local unpublished remediation after a414f7aef2a4545c78a9a42e34e9cb6d6cf3aca3`
- supersededBy: `null`

`buildOverviewComparisonObjects` owns lossless normalization of WAN/interface candidates. `buildOverviewEvidenceModel` owns whether a current normal candidate still adds evidence beyond the verified Focus and Signal. A renderer, component, stylesheet or viewport may not hide, reorder or deduplicate candidates to manufacture novelty. Exclusion requires an exact, explainable active-route relation and must be invariant to candidate order; an unknown relation remains visible rather than guessed away. When fewer than two novel objects remain, the Comparison task is absent. Mobile and desktop renderers consume the same semantic set while retaining separate presentation trees. Incident priority models do not reuse the normal-state filter.

An absent task must also mean no empty presentation shell. A renderer may conditionally omit the Comparison component when the shared model supplies zero rows; this is task composition, not candidate deduplication. It may not inspect names, gateways, rates or viewport width to reach that decision.

## ADR-025 Coverage and Comparison are different semantic sets

- status: `accepted-current`
- validForCommit: `local unpublished remediation after a414f7aef2a4545c78a9a42e34e9cb6d6cf3aca3`
- supersededBy: `null`

Independent Step186 review proved that the previous candidate builder truncated to eight objects before novelty and that Fleet “current object coverage” consumed the filtered Comparison field. The selected architecture is:

1. `buildOverviewComparisonObjects` performs complete normalization and deterministic ordering; it does not impose a presentation count.
2. `OverviewEvidenceModel.coverageObjects` owns the complete current object set used by Fleet coverage.
3. `OverviewEvidenceModel.comparisonObjects` exists only for non-Fleet current normal novelty after exact route-relation exclusion; stale/unavailable, incident and Fleet states expose no normal Comparison task.
4. Mobile and desktop select between these named semantic fields by product state; they may not rebuild, filter or silently cap the sets. Future pagination or progressive disclosure requires its own explicit model and visible total.

Sorting before truncation and renderer-side Fleet reconstruction are rejected: the former remains lossy; the latter duplicates domain ownership across presentation trees.

## ADR-026 Mobile Overview owns coverage judgement, not complete object browsing

- status: `accepted-focused-verified`
- validForCommit: `local unpublished remediation after a414f7aef2a4545c78a9a42e34e9cb6d6cf3aca3`
- supersededBy: `null`

`OverviewEvidenceModel.coverageObjects` remains the complete, deterministic and lossless Fleet object set. Counts, state distribution and risk exceptions are shared domain facts. A mobile or tablet renderer may not select members, truncate, paginate implicitly, hide rows with CSS, or reconstruct the set from raw snapshot data.

For current normal Fleet scope, mobile Overview owns the judgement surface: coverage totals, exceptions, Focus, Signal, evidence boundary and one typed collection-level handoff. The existing network workspace owns complete WAN/interface/route browsing. The handoff targets the canonical `interfaces` route and carries return/focus/evidence context but no fabricated single-object identity. Desktop Overview may keep consuming complete coverage because it has a comparison-capable task surface; this capacity difference does not change semantic membership.

`MobileObjectList` is narrowed to non-Fleet Comparison. Fleet title/landmark branches and mobile coverage-row composition are deleted rather than hidden. All Overview-to-workspace triggers, including retained Comparison rows, own a stable trigger ID and pass that ID as `focusId`; browser Back restores the exact control and Forward re-enters the same canonical destination.

Future mobile previews, grouping, paging or expansion require an explicit model with visible total, membership, ordering, refresh/history behavior and URL/focus semantics. Renderer-side Top-N, array-order priority, `nth-*` hiding and viewport-dependent membership are forbidden. This ADR does not claim that the wider tablet master/detail architecture is complete.

Red evidence confirms the ownership leak: mobile composition reads `coverageObjects`; `MobileObjectList` accepts Fleet presentation aliases; the risk-none Fleet model returns three context-free actions; 390/768/844 production pages inline all twelve objects and expose no canonical handoff. Desktop still preserves the complete set. The first implementation is therefore limited to adding scale-aware typed handoff semantics, deleting mobile coverage composition, specializing Comparison, and restoring exact trigger focus. CSS hiding and changes to desktop membership are outside the accepted correction.

First implementation exposes a navigation-boundary correction. `PanelNavigateOptions` may carry collection context when and only when `returnRoute` is present and `evidenceAt` passes the existing timezone-qualified evidence validator. `usePanelRoute` must treat that validated pair as contextual even when `objectId` and `risk` are both absent; `routeUrl` remains the canonical emitter. This does not authorize partial or arbitrary context, and it does not promote the collection to a selected object. Back/Forward history state and exact focus remain unchanged.

The Step187 action trigger contract is the real control identity plus behavior, not multiple acceptance-only aliases. Mobile action buttons retain a stable `id`, accessible name, at least 44px target, canonical route URL and exact history focus. Runtime probes must verify those properties and the destination workspace directly. Duplicate `data-mobile-patrol-action` / `data-mobile-destination` / `data-overview-task-action` identities on the same control may be deleted; a test may not require production metadata whose only purpose is to report that the test should pass. Comparison keeps its stable object identity for deep linking, while a destination alias that is absent for every real object is not an ownership contract.

Mobile and desktop investigation renderers remain separate, but their duplicated six-way Lucide icon selector is one legitimate shared presentation primitive: it receives only semantic icon identity and size and owns no layout, spacing, text, routing or state. Sharing that primitive reduces real duplication without reintroducing a shared mobile/desktop UI tree. Action probes scope to `.mp-actions` or `.do-task-actions` and read the existing route button IDs; the cross-surface investigation landmark remains, while surface-specific acceptance aliases are removed.

## ADR-027 Tablet steady Overview owns a Focus–Signal workbench, not a stretched phone grid

- status: `accepted-focused-runtime-verified-visual-review-pending`
- validForCommit: `local unpublished remediation after a414f7aef2a4545c78a9a42e34e9cb6d6cf3aca3`
- supersededBy: `null`

The generic `mp-workspace-primary / mp-workspace-context` split is not a tablet architecture. For `768–1199 + current + risk=none`, the presentation may enter a named steady workbench only when the shared evidence model supplies a verified Focus and a current WAN instrument. The workbench has three owned regions: route dossier, WAN signal and support band. It does not infer membership from viewport width and does not consume complete Fleet coverage.

Shared evidence ownership remains unchanged: the model owns Focus identity, candidate semantics, route attributes, evidence time, current traffic samples and canonical investigation actions. A tablet renderer may arrange those facts but may not read the raw snapshot, choose `rows[0]`, invent a route relation, reclassify historical samples or duplicate Proof. If multiple route candidates exist, the model must expose that ambiguity/priority explicitly; presentation cannot call one record the unique path merely because it sorts first.

Phone and tablet may share stateless primitives and the evidence model, but not hidden markup. The compact 390 `MobileFocusObject` and the tablet dossier are capability-specific presentations; only one mounts. Desktop keeps its independent Overview tree. Incident master/detail remains separate from the steady workbench because highest-risk object selection has a different state machine and scan order.

The support band owns progressive disclosure to the existing real Network workspace plus the evidence boundary. It may not embed domain tabs, object lists or a workspace inspector inside Overview. Browser history and focus remain owned by the canonical navigation layer. The tablet workbench adds no internal tab/selection URL and therefore no second Back/Forward state machine.

Layout must be content-driven. Fixed/minimum height used to occupy the viewport, pseudo-element fillers, repeated values, invisible duplicate DOM and screenshot-specific offsets are forbidden. At large text or effective narrow geometry, the same mounted facts reflow into one column in semantic order; they are not replaced by a second hidden tree.

Implementation must delete or narrow the superseded generic normal-tablet branch before adding the focused dossier. The fixed asset ceiling cannot be raised, but payload size cannot redefine product semantics. Architecture passes this slice only after static ownership, no-fallback/multi-candidate model tests, production 768/844 journeys, 390/1200 separation and deterministic asset identity/budget all pass, followed by independent review.

Unchanged-product red validates the ADR boundary. At 619px content width the generic surface stacks and ends at y=913; at 620px the same facts switch to `42/58`, end at y=689 and shrink the WAN SVG to 157×45px. No named workbench/dossier owner exists, and the model omits active-candidate semantics. Implementation is therefore authorized only to add that shared truth, mount one capability-specific dossier/workbench and delete the generic normal split. A second breakpoint patch or viewport filler would violate this ADR even if the screenshot looked fuller.

The shared-truth portion is now implemented: `activeCandidates` counts only active, enabled default-route candidates and is passed into Focus without changing route selection. The model fixture/runtime-mock gateway mismatch is explicitly a test-data boundary; architecture forbids translating `1.1.1.1` into `pppoe-wan1` or mutating the fixture merely to satisfy a copied literal. Presentation must display the selected route value supplied by the model.

The first workbench owner also passes static architecture and types: it consumes shared Focus/Signal only, mounts one dossier on tablet and deletes the generic normal split. Fixed assets remain red (`+142` JS Brotli, `+123` CSS Brotli). Architectural reduction therefore targets acceptance-only aliases on a noninteractive surface, a semantically unreachable incident Focus child and duplicated typography. Raising ceilings, merging phone/tablet render trees, hiding DOM, deleting candidate truth or weakening route evidence are rejected.

The first reduction lowered raw bytes but worsened Brotli to JS `133262` and CSS `18132`; compression output, not source count, remains authoritative. A shared Focus identity helper is allowed because it owns only identical icon/time/name/note markup. The compact button and dossier section remain distinct renderers and roles. The unconsumed `data-mobile-focus-object` alias may be deleted because `data-overview-task-focus-object` remains the sole semantic identity used by current production probes.

## ADR-028 Framework Brotli sidecars use maximum text quality without changing fixed budgets

- status: `accepted-focused-verified`
- validForCommit: `local unpublished remediation after a414f7aef2a4545c78a9a42e34e9cb6d6cf3aca3`
- supersededBy: `null`

Two coherent source reductions lowered raw JS by 880 bytes but changed quality-9 Brotli from `132142` to `133273`; CSS raw fell while its Brotli also rose. Near this dictionary boundary, micro-pruning is not a stable architecture strategy. The build may instead encode the exact same hashed JS/CSS bytes with Node's `BROTLI_MODE_TEXT` at quality 11 rather than 9. Budget ceilings remain `132000` script and `18000` style, and gzip/raw budgets remain unchanged.

This decision affects only transport sidecars. Decompression must equal the hashed source byte-for-byte, manifest/file sizes must match, input identity must remain stable, and two same-input builds must emit identical asset identity and sidecars. Build-time cost is measured. Future exact-SHA Linux/Windows/GHCR validation remains mandatory; local passage cannot claim cross-platform determinism. Raising ceilings, weakening raw/gzip checks, or deleting product evidence merely to shape the quality-9 dictionary remain rejected.

Focused result: two builds with input digest `0533f4ec…6420` emitted identical raw hashes, identical Brotli hashes and stable sizes. JS is `754533/154973/121348`; CSS is `119612/19794/16920`. Budget, decompression, 99-file asset identity and static br/gzip/ETag checks pass. Local build duration remains about 7.4s end-to-end. Cross-platform exact-SHA CL remains unproved until a future authorized upload, and the 27-byte gzip margin remains architectural P2.

ADR-027 runtime boundary clarification: semantic parity across 1199/1200 does not mean container parity. At 1199, `steady-support` must own Investigation and Evidence boundary while dossier and Signal are siblings; generic Primary/Context are absent. At 1200, desktop Primary owns Signal and Context owns Focus/Investigation/Boundary. Acceptance must verify one copy of every task, action/identity parity and no overflow under these distinct owners. The prior assertion requiring desktop containers on both widths is superseded.

Copy parity is also not semantic parity. Tablet dossier label `当前出口` describes a route-specific evidence role; desktop `当前核对对象` describes the broader Focus slot. Acceptance must compare stable Focus identity/title/name and the absence of manufactured Comparison while allowing these explicit presentation labels.

Column-ratio parity is not required across independent renderers either. Tablet workbench owns a 38/62 dossier–Signal relation and therefore has no `primaryShare`; desktop owns a roughly 49/51 Primary–Context relation. Acceptance reads unit text from actual rendered footer/axis nodes and requires Mbps on both, rather than querying an acceptance-only or nonexistent class.

ADR-027 does not supersede ADR-025. When `comparisonObjects` is nonempty, tablet must render that shared semantic task exactly once; it may not disappear merely because steady workbench owns a new top row. The Comparison is a full-width row after dossier–Signal and before support, not a member of the support band. Empty sets mount no shell, and Fleet coverage remains a collection handoff rather than Comparison reconstruction.

Capability state must be truthful on first client render. A hook may share generic `matchMedia` subscription mechanics, but it must initialize from the current query rather than a temporary false value that mounts the wrong tree and invalidates focus. Route focus remains DOM-agnostic and mutation-aware; it must not add retries to compensate for a capability hook that knowingly remounts the control after success.

Focused runtime result: the shared private media-capability primitive initializes from the real query and owns one listener/cleanup path without merging presentation trees. Production browser passes `159/89/102`, including 390/768 exact Back focus and Forward URL, 619/620 reflow, 768/844/1199 workbench ownership, six-view nonempty Comparison, Fleet/empty controls and the existing scenario/accessibility representatives. Current fixed assets pass at JS `754382/154985/121416` and CSS `119696/19804/16884`; the 15-byte JS gzip margin remains architectural P2. ADR-027 is focused-runtime verified, not visually or globally accepted, and final-HEAD asset identity/static checks must be rerun after the last source edit.


## ADR-029 Normal operational decisions are shared semantics, not desktop-owned truth or tablet filler

- status: `accepted-focused-runtime-verified`
- validForCommit: `local unpublished remediation after a414f7aef2a4545c78a9a42e34e9cb6d6cf3aca3`
- supersededBy: `null`

The current desktop `operationalRows(snapshot, state)` owns interface, resource and connection decisions that are valid across surfaces. Keeping this derivation inside `desktopOverviewModel.ts` forces tablet either to omit legitimate evidence or to read raw snapshot and duplicate truth. The selected boundary moves the builder and row type into the shared Overview evidence layer. Desktop and tablet consume the same semantic rows through separate renderers and styles.

The shared builder emits rows only for current normal evidence. It preserves explicit zero, missing values, source, tone and canonical route. Single includes interface/resource/connections; Fleet omits interface because Fleet Proof already owns that count. Presentation may not slice membership by viewport, choose `rows[0]`, synthesize values, or call these controls remediation. Historical, unavailable, collection failure and every incident emit no normal secondary rows.

Tablet owns one route column containing the existing dossier followed by an independent compact decision-ledger component; Signal remains the sibling. No fixed/minimum viewport-filling height is introduced. Phone does not mount the tablet ledger. Its Signal base layout instead becomes two rate cells followed by a full-width plot, while tablet overrides remain capability-specific. Desktop keeps its independent ledger DOM and removes only the duplicate semantic builder.

Architecture passage requires model novelty/absence controls, static no-raw-snapshot ownership, deletion of the desktop-local builder, 390/430 plot/value geometry, 768/844/1199 route-column evidence, independent 1200 desktop behavior, Back/Forward/focus and exact asset gates. Visual acceptance remains separate.


ADR-029 red result: model contract fails because `secondaryDecisions` is absent; architecture reports 23 explicit ownership failures; production measures the phone plot at 109×31px with a two-line download value, and all three tablet widths have no route column/secondary rows. The Range-based text probe supersedes the initial false-negative line-height heuristic. This authorizes only the named vertical slice; no runtime or visual pass exists yet.


ADR-029 shared-ownership atom passes model and TypeScript. The shared builder owns interface/resource/connection semantics and Fleet novelty; desktop consumes the evidence-model rows and no longer defines `operationalRows()`. Architecture now fails only the ten expected presentation/CSS requirements. The next atom may change mobile/tablet presentation but not shared membership or desktop semantics.

ADR-029 focused result: shared membership, desktop migration, tablet owner and phone Signal all pass model/static/types/build/production runtime. The tablet renderer delegates row mechanics to the existing list primitive but owns `MobileSteadyDecisionLedger` and does not claim the `comparison` task landmark. Stable decision IDs are canonical hyphenated control IDs; routes remain model-owned and no presentation mapping reads raw snapshot.

The 619/620 regression proved that capability overrides must beat later broad-width CSS without duplicating facts. Final 768/844/1199 compacts existing evidence rather than stretching Signal or adding filler. Phone acceptance measures the full chart surface separately from the SVG data plane so a truthful y-axis is not treated as wasted width. Fixed budgets remain unchanged; exact-limit JS gzip is P2. This ADR is focused-runtime verified only and cannot sign Product, Design or Visual QA.

## Step229 — Resource decision ownership

Resource priority belongs to the shared section model, not desktop JSX. `resourceModel` may select only a current over-threshold metric and must reuse the established `compareResourceRisk` ordering over delta, trailing count and latest value. The model exposes structured evidence and an existing route destination; desktop owns its decision-band markup, while mobile retains its independent resource renderer. This avoids duplicated risk derivation, arbitrary table-row fallback and cross-surface DOM coupling.

## ADR-030 Compact-tablet identity capability and release-consumer binding

At tall `600–719px`, the available post-navigation width cannot reliably hold the Incident impact and evidence owners side-by-side. This capability therefore uses one ordered column; `720–899px` may use the split workbench, and short landscape retains its separate compact rule.

The runtime inspector records category/title rendered lines. Public Overview acceptance additionally computes `incidentIdentityReadable`: legitimate abbreviations of at most three characters use a 20px minimum, longer labels use 32px, and both remain within the bounded line-height geometry. The same field is listed in `MOBILE_OVERVIEW_REQUIRED_CHECKS`, so readiness fails when a producer adds or removes it without synchronizing the consumer.

This architecture was verified on exact clean commit `d45b428535d9beadd5abbe980d6485c77338d483` by Incident63, responsive10, Overview28, route76, route-state266, Edge22, public readiness and four independent P0/P1/P2=0 reviews. It does not alter the external promotion boundary.
