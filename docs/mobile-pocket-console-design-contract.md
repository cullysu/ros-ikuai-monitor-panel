# Mobile Pocket Console design contract

- status: `selected-direction`
- owner: `mobile-overview-only`
- desktopReuse: `forbidden`
- selectedAtStep: `930`
- releaseEligible: `false`

## Product sentence

The mobile Overview is a pocket operations console: scan the objects that currently matter, understand what is proven and when, then move directly into the selected object's real workspace.

It is not a dashboard, health report, topology poster, card gallery, or shrunk desktop page.

## Source principles

- Apple released iOS and iPadOS 27 design kits with updated Liquid Glass, expanded component states and adaptive sizing: <https://developer.apple.com/news/?id=e2lxw9l1>.
- Apple Materials guidance assigns Liquid Glass to controls and navigation above content and explicitly warns against using it in the content layer: <https://developer.apple.com/design/human-interface-guidelines/materials>.
- Apple layout guidance requires controls and navigation to sit above content while adapting across window sizes: <https://developer.apple.com/design/human-interface-guidelines/layout>.
- iKuai status monitoring groups operational destinations around line, terminal, protocol, policy and load monitoring: <https://www.ikuai8.com/support/ymgn/lyym/ztjk.html>.

These sources inform hierarchy and task grammar. The web UI does not imitate Apple proprietary assets or copy the visual skin of an iKuai console.

## Non-negotiable truth

- Preserve `current | historical | unavailable` evidence modes.
- An active default route exists only when an explicit current row is active and not disabled.
- Missing observations remain unavailable; they never become measured zero.
- Collection, management, forwarding and external-business reachability remain separate claims.
- Current rate and live trend disappear when evidence is historical, partial or unavailable.
- All timestamps are RFC 3339 with explicit zone provenance.
- The surface is read-only and never implies that selecting an object modifies RouterOS.

## Phone anatomy

From top to bottom:

1. `MobileConsoleToolbar`: device/scope identity, evidence age, refresh and More. No hero title.
2. `EvidenceStatusBar`: one compact, literal statement of evidence mode and absolute time.
3. `DecisionLine`: one verified operational conclusion, maximum two lines.
4. `OperationalObjectList`: route, WAN, collection, resource or interface rows ordered by the current scene policy.
5. `InlineInspection`: at most one selected object's bounded comparison or evidence relation; no home-page chart.
6. `ObjectBoundAction`: one action attached to the selected row/workspace, not a detached CTA strip.
7. `PrimaryDestinationBar`: Overview / Network / Terminals / Logs; destinations only.

The first viewport must identify the scope, evidence mode, primary object, its state and the next inspection without reading repeated summaries.

## Object row grammar

Every high-frequency row has one stable reading order:

`symbol → object identity/role → one primary state or value → evidence/relationship metadata → disclosure`

- One row owns one object and one route.
- A number may repeat only when the second occurrence adds a different comparison, source or action.
- Primary values use tabular numerals; labels use system text hierarchy.
- State is never color-only and never represented by a decorative glowing dot.
- No object pills, KPI tiles, nested mini-cards or fake topology rails.

## Scene policy

| Scene | First visible object group | Required evidence | Forbidden claim |
|---|---|---|---|
| steady/single | active default route, carrying WAN, collection | route row plus one current WAN signal | internet/business availability |
| fleet | highest-risk device/object exceptions | coverage and scope as metadata | fleet size outranking an incident |
| interfaces-down | affected interfaces ordered by verified dependency | explicit interface-to-route relation or `unverified` | internet outage inferred from interface state |
| resource-full | CPU/memory/disk ordered by threshold excess | current, threshold, delta, trailing sample boundary | network outage inferred from resource pressure |
| collection-down | REST and SSH evidence channels | last success/failure source and plane boundary | current rates or business health |
| all-offline | offline WAN objects and active-route absence | last confirmed path only when timestamped | historical path presented as current |
| no-snapshot | collection target and last successful observation | explicit unavailable boundary | any current WAN/resource/interface number |

Changing only title, color or one metric does not constitute a different scene.

## Responsive capability

- `320–599px`: one edge-to-edge operational list and push navigation.
- `600–767px`: compact-width list-first layout; short landscape may expose a selected summary only when both panes remain useful.
- `768–1199px`: real two-column selection/detail workspace. Left index is 224–280px; right side owns exactly one selected inspection. It is not two enlarged phone sections.
- `>=1200px`: separate desktop render owner. Mobile CSS and DOM do not leak into desktop.

More width must not remove a capability that was available below the boundary.

## iOS 27 material and motion

- Standard solid/adaptive materials own content.
- Liquid Glass is limited to real navigation and transient controls; one primary floating control group per edge is the default ceiling.
- No content card uses backdrop blur.
- No repeated 18–24px radius white cards or soft dashboard shadows.
- Use platform-safe system font stacks, tabular numerals and Dynamic Type-compatible line wrapping.
- Touch targets are at least 44×44 CSS px.
- Direct feedback uses interruptible transform/opacity transitions under 220ms.
- Reduced Motion removes spatial movement and blur; state change remains immediate and perceivable.

## Explicit deletions

The active mobile Overview must not retain:

- `MobileLinkboard` hero verdict presentation;
- `NativeOperationsCanvas` five report-like scene trees;
- `operationsPrimitives` report headings/surfaces;
- horizontal object pill selectors;
- home-page WAN chart and three-KPI block;
- large rounded white report cards;
- pseudo topology/path rails;
- detached `NextInspection` and three-column context summaries;
- red progress-meter dashboard treatment;
- tablet vertical glass rail plus enlarged report card.

Evidence and stable routing contracts may be reimplemented in a new model; formatted display strings must not be parsed back into semantic numbers.

## Acceptance

Automation is necessary but cannot sign visual quality.

- Required originals: 320×568, 390×844, 430×932, 667×375, 844×390, 768×1024 and 1199 boundary across all seven scenarios.
- Required interaction evidence: object selection, real detail, Back, Forward, focus restoration, 200% text, Reduced Motion, dark appearance and forced colors.
- Each incident must change primary object order, evidence form, action and prohibited claim.
- Automated checks must measure truth, semantics, geometry and behavior; DOM counts, source character counts, token presence and foreground-pixel ratios cannot establish Product/Visual pass.
- Two independent reviewers receive only immutable originals/recordings and task prompts. Either reviewer may veto a Product or Visual gate. A third reviewer adjudicates disagreement.
- Release remains closed until Product, Visual, Accessibility, Engineering, complete matrices, clean exact SHA, RouterOS soak and exact remote-SHA Linux/Windows/GHCR CL all pass.
