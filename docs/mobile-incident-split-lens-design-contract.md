# Mobile Incident Split Lens design contract

- status: `superseded / owner rejected / historical only`
- decisionStep: `947`
- supersedesPresentation: `overview/mobile-overview/optical-patrol`
- desktopBoundary: desktop Overview remains isolated at 1200+
- releaseBoundary: superseded by Step968 Mobile Attention Queue; never a public promotion authorization

## Product thesis

The mobile Overview has two genuinely different task surfaces:

1. **Patrol Lens** for current normal evidence: confirm freshness, verified default path, four object classes and the next inspectable object without celebration or a large verdict.
2. **Incident Split Lens** for any highest-risk state: show the risk identity, its impact and the evidence boundary together; secondary objects cannot outrank the incident.

This direction is selected over Object Matrix because a matrix risks another generic dashboard/card grammar, and over Route Timeline because the current evidence contract does not guarantee a complete event stream. The implementation must not invent chronology.

## Non-negotiable truth

- Preserve `current | historical | unavailable` and RFC3339 source time.
- Render rates only for complete current observations; missing is never zero.
- A route is verified only by explicit route/WAN evidence; no first-row fallback.
- REST and SSH remain independent.
- Resource continuity uses trailing consecutive samples only.
- Fleet scale never outranks the highest current risk.
- Mobile and desktop keep separate render trees, style entry points and acceptance evidence.

## Visual and interaction grammar

- No large outlined verdict, dark hero block, topology, fake chart, fake sheet/grabber or card grid.
- Functional glass belongs only to command chrome, navigation, menus and selectors.
- Operational content uses dense object-aligned rows, cold neutral surfaces, one-pixel separators and small-area state accents.
- Four stable routes remain `概览 / 网络 / 终端 / 日志`.
- Every interactive target is at least 44px; operational text is at least 12px; 200% text remains reflowable.
- Motion is optional and task-bound: 150–220ms, transform/opacity only, interruptible, and disabled under reduced motion. No stagger blocks interaction.

## Capability layouts

### 320–430 portrait

- Command strip: evidence mode/time + highest risk/path, maximum two compact lines.
- Normal: four-object patrol summary, verified route object and at most two inspectable changes/objects.
- Incident: risk identity first, then Impact Lens and Evidence Lens as compact consecutive regions, then at most two next actions and a secondary object strip.
- No long title may consume more than two lines; no fixed navigation overlap.

### 600–719 compact tablet

- Use one ordered task column: patrol list → inspector → cross-check, or impact → evidence/next step → cross-check.
- Category, object and state text must remain horizontally scannable; per-glyph vertical stacking is a blocking defect.
- Existing evidence remains reachable by natural vertical scroll; empty second columns are forbidden.

### 720–899 tablet

- Normal: patrol/object list on the left, selected object inspector on the right.
- Incident: object and impact on the left; evidence boundary and next investigation on the right.
- Both columns must add new information. Empty comparison shells and stretched evidence ledgers are forbidden.

### 600+ short landscape

- Command state merges into the top chrome.
- Risk/impact and evidence/next investigation remain side-by-side.
- Secondary objects form a compact horizontal strip; long declarations and unused right columns are forbidden.

## Scene ownership

| Scene | Primary lens | Default object | Current numeric policy |
|---|---|---|---|
| single | Patrol | verified default WAN/route | complete current values only |
| fleet | Patrol unless risk exists | highest-risk object, else fleet route scope | scale is secondary |
| interfaces-down | Incident | highest-risk interface | affected rates only when current |
| resource-full | Incident | highest-pressure resource | threshold + consecutive evidence |
| collection-down | Incident | failed collection channel | dependent business values withdrawn |
| no-snapshot | Incident | evidence boundary | no current values |
| all-offline | Incident | offline route/device scope | no fabricated path or rate |

## Acceptance

- Required originals: seven scenes × 320, 360, 375, 390, 430, 600, 667×375, 768, 844×390 and 1199 as applicable to the current matrix contract.
- 390 normal must expose current/path, four object classes and one inspectable object in the first viewport.
- 390 incidents must expose risk identity plus both impact and evidence before secondary objects.
- 600 must preserve horizontal identity readability; 768 and 844×390 must have no ownerless column or mechanically stretched phone module.
- Back/Forward restores selected object, real scroll owner and focus.
- Product, Visual, Accessibility and Engineering independent reviews require P0/P1=`0` on one exact artifact before release work resumes.

## Step947 implementation evidence

- Owner: `src/panel-framework/overview/mobile-overview/incident-lens` with independent TSX/style/runtime contracts; rejected Optical presentation ownership is physically deleted.
- Exact clean runtime artifact: `d45b428535d9beadd5abbe980d6485c77338d483`.
- Runtime: seven scenes × nine viewports = 63/63; responsive boundary 10/10; rendered/page scale and actual Edge toolbar 200% 22/22 pass.
- Whole-product local evidence: Overview 28/28, bounded route 76/76, route-state 266/266 and engineering readiness pass.
- Four distinct independent reviewers inspected all 63 originals and reported Product, Visual, Accessibility and Engineering P0/P1/P2=`0`.
- This closes local implementation/design acceptance only. Route maturity, real RouterOS soak, trusted publication authorization and current remote-SHA Linux/Windows/GHCR CL remain mandatory.
