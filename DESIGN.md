# RouterOS read-only console design system

## Product character

The product is an industrial, read-only network console: calm, exact, compact, and explicit about evidence boundaries. It combines iOS discipline—alignment, safe areas, coherent type/radius scales, purposeful material depth—with iKuai-like operational character—cold blue, gray hierarchy, thin rules, and high scan density. It does not imitate either product.

## Surface ownership

- Desktop and mobile use separate render trees and separate style entry points.
- Desktop is a comparison-oriented console with persistent navigation and dense ledgers.
- Mobile is a one-hand patrol surface with one continuous home and a full-screen evidence drill-down.
- No hidden duplicate DOM, cross-surface selectors, or responsive shrinking of desktop modules.

## Tokens

### Mobile

- Canvas: `#EAF1F4`
- Surface: `#F9FBFC`
- Primary tonal surface: `#E7F0F3`
- Ink: `#102B37`; secondary: `#3B5B68`; muted: `#536F7A`
- Product blue: `#0B678C`; verdict blue: `#153F50`
- Divider: `#D1DEE4`; strong divider: `#B4C8D1`
- Radius: `8px` grouped surface, `7px` compact control
- Spacing rhythm: `4 / 8 / 12 / 16px`

Desktop keeps its existing console token ownership. Mobile tokens must not be imported into desktop styles.

## Hierarchy and density

1. Service verdict, WAN/default route, evidence freshness, timestamp.
2. Current throughput and scenario-specific operational metrics.
3. Impact, next inspection, evidence, endpoints, logs.

Density means more useful decisions per viewport, not tiny body text. Use alignment, compact metric ledgers, inline facts, and 1 px separators before adding cards. Do not use giant verdict cards, nested cards, large explanatory paragraphs, or empty space as “minimalism”.

## Material and shape

- The page canvas is full bleed.
- Grouped data surfaces are flat; they use a boundary and tonal difference, not a shadow stack.
- Blur belongs only to real chrome/overlay depth changes.
- Normal, degraded, unknown, and critical states use low-chroma tonal surfaces plus explicit wording. Avoid saturated traffic-light blocks.
- Use one radius scale consistently. Pill shapes are reserved for short status labels only.

## Typography and data

- System UI fonts are deliberate here: they preserve Chinese legibility and native metric alignment.
- Use tabular numerals for all operational values.
- Mobile primary values are `21–23px`; labels are at least `10–11px`; body text is at least `12px`.
- A number never concatenates a duplicated unit. Current, peak, chart, and time-window values must share a source.

## Charts

Every chart names the series, unit, time window, current value, peak/reference where available, and sampling source. A single snapshot uses compact magnitude bars, not a fabricated trend. Missing evidence removes the chart.

## Interaction and accessibility

- Touch targets are at least `44 × 44px`.
- Back is predictable and labeled for assistive technology.
- Focus is visible; color never carries state alone.
- Safe areas, text scaling, keyboard access, and reduced motion are blocking requirements.
- Automatic refresh must not move focus, collapse disclosure, or replace selected text.

## Prohibited patterns

- Desktop modal or table squeezed into a phone.
- Bottom navigation used to separate facts that belong to one judgment.
- Closed white page frame, stacked soft cards, radial marketing gradients, toy-like tab glow.
- Acceptance-only DOM markers, hidden duplicate content, screenshot offsets, patch scripts, or CSS override sediment.
- Unsupported words such as “实时可信” or “网络良好” without directly visible evidence.
