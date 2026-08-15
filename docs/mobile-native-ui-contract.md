# Mobile Pulse UI contract

## Status

- Decision step: `1037`
- Product state: prior phone presentation owners are rejected and physically removed; Mobile Pulse is the only mobile presentation owner.
- Release state: `FAIL / CLOSED`
- Scope: mobile presentation only. Desktop keeps a separate render and style owner.

## What a phone UI means here

The phone is not a narrow desktop console. It is a one-thumb patrol tool with four stable roots: overview, network, terminals, and logs. Every screen has one primary question, one clear next tap, and a real push-navigation destination.

The iKuai 4.0 reference contributes object identity, same-line state comparison, WAN evidence, resource/terminal counts, compact charts, and explicit monitoring intervals. Apple contributes navigation hierarchy, safe-area behavior, touch feedback, adaptive tab/sidebar behavior, and a distinct floating control layer. Neither reference is copied literally.

## Visual language

- Content layer: solid grouped surfaces, 12px outer gutter on phones, 14–16px surface radius, hairline separators only inside a related group.
- Control layer: restrained translucent material only for the floating tab bar and compact utility controls. Never glaze the data itself.
- Accent: iKuai blue is reserved for active navigation, verified paths, and explicit links. It must not tint every surface.
- State: green, amber, and red are compact semantic signals. Large saturated incident blocks are forbidden.
- Type: 20–22px screen title, 16–18px decision title, 24–28px primary live rate, 13–15px body, 11–12px metadata. No oversized “old-person” dashboard typography and no sub-11px operational text.
- Icons: familiar Lucide/SF-Symbol-like objects with consistent 18–20px optical size. Decorative network diagrams are forbidden.

## Phone overview geometry

At `390×844`, the initial viewport must show:

1. compact device/navigation title;
2. a 64–76px decision pulse containing verdict, evidence mode, and age;
3. three same-line iKuai-style object signals for WAN, collection, and resources/interfaces;
4. either a compact current-traffic instrument with real time/unit axes, or the highest-risk object queue;
5. at least one directly tappable object/action before the floating tab bar.

The normal scene may show traffic. Incident, no-snapshot, and collection-down scenes withdraw traffic and structurally replace it with the relevant object queue and evidence boundary.

## Information ownership

- Decision pulse answers: “what can I conclude now?”
- Signal strip answers: “which object families support that conclusion?”
- Instrument/queue answers: “what changed and where should I tap?”
- Detail answers: “what new object evidence is available?” It must not repeat the overview verbatim.

## Navigation and interaction

- Four stable roots remain visible in a floating bottom tab bar on iPhone.
- A selected tab uses a compact liquid selector; the bar is navigation only, never an action bar.
- Object inspection uses push navigation with a standard back affordance and working browser Back/Forward restoration.
- Press feedback is `transform: scale(.98)` over 140–180ms; no bounce, fake grabber, ornamental drawer, or hover-only behavior.
- Reduced motion and reduced transparency keep equivalent hierarchy and contrast.

## Responsive contract

- `320–430px portrait`: one-column thumb path; no desktop tables or multi-column forms.
- short landscape: compact top controls plus horizontal task composition; never a shrunken portrait page or desktop rail.
- `600–899px`: iPad task board with adaptive sidebar/tab control and a content grid that uses the whole workspace. A list/detail pair is used only when an object is actually selected.
- `900px` and above: desktop owns the render tree. No mobile DOM is hidden behind desktop CSS.

## Architecture

- New isolated owner: `src/panel-framework/mobile-pulse-ui/`.
- Shared inputs are limited to evidence/domain models, route contracts, runtime controller, and time formatting.
- The rejected `src/panel-framework/mobile-native-ui/` and `src/panel-framework/mobile-patrol/` presentation trees must be physically deleted after the new owner is mounted and focused verification passes.
- New acceptance selectors use `data-mobile-pulse-*` and `mpu-*`; no gate may pass through a retired-owner OR shortcut. The old `mnui-*`, `mnw-*`, `mnu-*`, and `mnc-*` marker families are forbidden in the current mobile presentation.

## Blocking acceptance

- 7 scenarios × 8 mobile/tablet viewports, plus route, detail, connection, Back/Forward, 200% text, reduced-motion, reduced-transparency, and forced-colors checks.
- Explicit proof that missing values remain unavailable, route verification never falls back to an arbitrary row, and traffic is rendered only from complete current atomic samples.
- Fresh independent Product and Visual review of the exact screenshot set with P0/P1 = 0.
- This contract cannot open publication. Full public matrices, security, clean candidate, and exact-SHA Linux/Windows/GHCR CL remain separate release gates.
