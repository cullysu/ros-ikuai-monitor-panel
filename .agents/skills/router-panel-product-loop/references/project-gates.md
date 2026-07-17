# Router Panel Product Gates

## Mobile product contract

- Mobile rendering is independent from desktop rendering; desktop overview DOM is not mounted.
- First screen shows device, state, snapshot time, one decisive verdict, and either four normal metrics or four incident decision rows.
- Normal mode may show current traffic and a truthful history only when real samples exist.
- Incident mode shows exactly: object, impact, credibility, next step. Metrics, traffic charts, and evidence move to detail.
- Evidence remains reachable through a low-chrome detail row.
- Top-level navigation has four stable operator destinations: Overview, Network, Terminals, and Logs. Secondary tools keep one of those destinations selected while their independent workspace group and More placement are represented separately.
- Touch controls are at least 44px; primary tab targets are at least 48px.
- The canvas is always opaque. Translucent material is limited to app chrome and grouped information surfaces, with an opaque fallback color; no floating tab capsule or transparent compositor dependency.
- The visual system uses restrained cold blue, neutral ink, subtle state washes, one consistent radius family, compact 4/8/16 spacing, hairline borders, and no playful glow.
- Frequent patrol interactions stay instant. Any occasional motion follows `emil-design-engineering.md`, remains interruptible, and has a reduced-motion fallback.

## Truth contract

- REST/SSH availability does not prove internet availability.
- A stale snapshot never appears as current.
- No snapshot suppresses WAN, traffic, interface, and resource claims.
- A single snapshot never invents a trend or peak.
- Resource-full copy states that duration is unknown unless history proves duration.
- Interfaces-down copy distinguishes affected interfaces from default-route impact.

## Required scenarios

`single`, `fleet`, `all-offline`, `no-snapshot`, `collection-down`, `resource-full`, `interfaces-down`.

## Required evidence surfaces

- Mobile native contract: 7 scenarios across 320x568, 360x800, 375x667, 390x844, 430x932, 768x1024, 667x375, and 844x390.
- Public overview release matrix: 7 scenarios across 1366x768, 1440x900, 844x390, and 390x844 (28 cells).
- Route responsive matrix: 19 routes across 1600x1000, 1366x900, 1024x900, and 390x844 (76 cells).
- Route state matrix: 19 routes across 7 scenarios and 1366x768 plus 390x844 (266 cells).
- Runtime interaction evidence includes 200% text reflow, touch targets, contrast, Back/Forward, refresh/reorder identity, reduced motion where motion exists, and the 1024/1112/1180 to 1181 capability boundary.
- Human visual review inspects the actual screenshots for hierarchy, density, state differentiation, empty-space use, and iOS/iKuai product character. Automated matrix completion cannot pass this gate by itself.

## Evidence freshness

- Every release report records the candidate commit and Git tree it exercised.
- Reports from another SHA are historical. They may explain a regression but cannot close the current release gate.
- A tracked change after candidate freeze invalidates exact-SHA release readiness. Commit logs remain non-self-referential; final SHA and CL belong in external release evidence.
- Conflicting loop state, report metadata, worktree state, and remote refs force the affected gate to `pending` until reconciled.

## Blocking verification

- type check and production build
- overview architecture/static checks
- focused mobile runtime and workspace checks
- focused desktop checks when desktop code or shared truth changes
- complete 28-cell public overview matrix with screenshots
- complete 76-cell responsive route matrix
- complete 266-cell route/state matrix
- runtime browser interaction contract and screenshot manifest
- release-readiness check tied to the current candidate
- backend security, collector, LAN-default, static-asset, and container configuration checks
- read-only public-disclosure and publication-capability preflight
- GitHub Linux validation, Windows packaging, and GHCR/container checks for the exact remote SHA

`matrix.complete=false`, a missing screenshot, stale candidate identity, failed human visual review, a blocked public-disclosure preflight, or a pending/failed GitHub check always blocks release.
