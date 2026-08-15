# Mobile Object Cockpit Contract

## Product job

The phone home screen must help a user answer one question within three seconds:

> Which observed object needs my attention now?

It is not a compressed desktop dashboard and it is not a report that must be read from top to bottom.

## Evidence contract

- `current`: current values may render only when the underlying observation is complete.
- `historical`: show the last verified time and historical facts, never current rates.
- `unavailable`: withdraw business numbers and state that the current business condition cannot be confirmed.
- A displayed default route must come from explicit verified route evidence.
- Missing values remain unavailable; an explicit numeric zero remains a valid observation.
- `navigator.onLine` is only a hint and must never stop snapshot requests.

## Phone hierarchy

1. Device identity and two controls: refresh and more.
2. Compact trust capsule: can this evidence be trusted now?
3. One primary object stage: what is happening now?
4. Object switch rail: which peer object can be inspected next?
5. Two or three novel supporting facts: why was this decision made?
6. Four persistent destinations: Overview, Network, Terminals, Logs.

## Scenario ownership

- Normal: verified default WAN.
- Interface incident: highest-risk interface.
- Resource incident: highest-risk resource metric.
- WAN outage: router reachability and WAN chain.
- No snapshot: evidence boundary and last verified observation.
- Collection failure: REST and SSH collection path.
- Fleet: highest-risk device; scale appears only when no risk outranks it.

## Visual system

- 4px spacing baseline.
- Content surfaces are clear and low-contrast; translucent material belongs only to navigation and controls.
- G2-like continuous radii: 12px controls, 16px cells, 24px primary stage, 28px full-screen presentation.
- Verified/action color is restrained teal-blue; normal operation uses green; stale uses amber; risk uses coral red. Status never relies on color alone.
- Typography: 34/40 display, 22/28 title, 17/22 section title, 15/21 body, 13/17 label, 12/16 metadata.
- 44px minimum hit targets do not require 44px-visible buttons or oversized text.

## Interaction system

- Primary stage and object chips are real controls.
- Switching objects updates the stage in place and preserves the Overview route.
- Opening details creates a real URL/history state; Back closes it and Forward reopens it.
- Detail adds novel evidence and never repeats the home stage verbatim.
- Status and object transitions are 160–220ms, interruptible, and disabled or reduced under `prefers-reduced-motion`.
- No fake grabbers, dead search, decorative pills, or controls without behavior.

## Responsive contract

- 320–430 portrait: single-hand object stage; lower-priority evidence moves below the fold.
- Short landscape: object and evidence panes are adjacent; no hidden incident objects and no navigation overlay.
- 768–1199 tablet: persistent object list and selected detail; not a mechanically widened phone column.
- 200% text: fixed heights and ellipsis are forbidden for evidence; grids collapse and charts degrade to textual current/peak/window facts.

## Release blockers

- Any import of `mobile-origin` presentation code from the new owner.
- Any scene that renders the same section order with only text/color changes.
- Any current rate shown for historical or unavailable evidence.
- Any repeated fact across trust capsule, primary stage, and support facts without new information.
- Any 320/375/390/430 screenshot that looks like a desktop table, card grid, or oversized elderly-phone layout.
