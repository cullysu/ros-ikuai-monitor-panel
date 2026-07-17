# Emil Design Engineering — Router Panel Adapter

This reference adapts the official `emilkowalski/skills` design-engineering guidance to this repository. It is deliberately narrower than the upstream skill: this product is a high-frequency, read-only operations console, so evidence clarity and response speed outrank decorative motion.

Source: <https://github.com/emilkowalski/skills/tree/main/skills/emil-design-eng> (MIT). Upstream remains authoritative for the general design-engineering philosophy; this file records the project-specific decisions that belong in the panel loop.

## Decision order

Before adding any transition or animated state, answer in this order:

1. **Frequency** — if an operator may trigger it tens or hundreds of times per day, prefer no animation or near-instant feedback.
2. **Purpose** — accept motion only for spatial continuity, state feedback, explanation, or preventing a genuinely jarring change. “Looks polished” is not a purpose.
3. **Interruption** — rapid repeat input, Back/Forward, Escape, resize, and data refresh must be able to retarget or finish without leaving stale state.
4. **Performance** — prefer CSS transitions on `transform` and `opacity`; never use `transition: all` and do not animate layout dimensions in a data-heavy list.
5. **Accessibility** — preserve focus, honor `prefers-reduced-motion`, keep a complete non-motion state, and never make meaning depend on animation.

## Panel-specific motion budget

| Interaction frequency | Panel rule |
|---|---|
| Telemetry refresh, list filtering, keyboard navigation | Instant; no entrance choreography |
| Row press and compact commands | Immediate visual feedback, normally 100–160ms and subtle |
| Small anchored menu or tooltip | 125–200ms, strong ease-out, origin-aware |
| Object inspector transition | At most 180–240ms when spatial continuity helps; keyboard navigation may be instant |
| Rare modal or connection boundary | 200–300ms; longer only when a physical gesture must remain interruptible |

Recommended curves when motion is justified:

```css
--ease-panel-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-panel-move: cubic-bezier(0.77, 0, 0.175, 1);
```

Do not add a motion library for these effects. The existing CSS/React stack is sufficient.

## Invisible-detail review

For each changed control, verify all of the following rather than judging only a screenshot:

- the whole visible row is a real target and is at least 44×44px;
- press, hover, focus, disabled, loading, selected, stale, and unavailable states are distinct where applicable;
- an icon or grabber never promises an interaction that does not exist;
- anchored surfaces originate near their trigger; full-screen destinations do not pretend to be popovers;
- Back and Forward restore the same route, selected object, focus target, filter, and sort state where the product contract promises continuity;
- refresh and reorder do not animate an object into a different identity;
- telemetry values do not tween through invented intermediate numbers;
- reduced-motion mode removes non-essential transforms without removing state feedback.

## Review format

Visible-interaction reviews use one compact table so the proposed change and its reason can be compared directly:

| Before | After | Why |
|---|---|---|
| Repeated list rows animate on every refresh | Refresh is instant; only the changed state marker updates | High-frequency monitoring must not feel delayed |

Every row must identify a concrete user cost or benefit. Do not use this reference to justify decoration, gradients, oversized surfaces, or additional abstraction.
