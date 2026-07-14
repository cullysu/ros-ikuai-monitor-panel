# Mobile product loop review

## Decision

The rejected mobile shell was removed rather than restyled. The replacement is an independent single-surface operations console with integrated collection evidence and a full-screen detail route. It is ready for GitHub/CL verification, but it is not declared publicly releasable until the exact uploaded SHA completes Linux, Windows, and GHCR checks.

## Independent review lenses

- **Executive:** kept the read-only patrol task; removed bottom navigation and the separate collection destination because both increased interaction cost without adding a user decision.
- **Product:** the first screen now answers WAN state, default route, current traffic when valid, snapshot age, REST/SSH state, and the highest-priority incident.
- **Adversarial:** visual review found that the interface incident fixture could show `WAN 0/4` while claiming the default route was normal, and that a normal fixture could show an unconfirmed route while claiming it was active. Both claims now derive from route and WAN facts.
- **Design:** selected “status ledger + adaptive incident console” over telemetry-first and incident-only directions. Flat grouped ledgers replace the closed modal/card stack; blur is restricted to top chrome.
- **Architecture:** mobile owns `RouterMobileApp`, `RouterMobileScreens`, `routerMobileModel`, and two mobile-only style files. Runtime and static gates reject desktop DOM, legacy namespaces, the retired tab bar, gradients, and shadow sediment.
- **QA:** the final 28-cell `7 scenarios × 4 viewports` matrix passed at `_acceptance/release-matrix-mobile-independent-final2/report.json`; `matrix.complete=false` remains a top-level blocker.
- **Security:** the public runtime rejected external diagnostics and IP-alias writes, used the safe local profile, and passed collector regressions.
- **Accessibility:** interactive detail/back controls are semantic buttons with visible focus; touch targets are at least 44 px; status is expressed with text and tone rather than color alone; muted text was darkened to `#5B727D`, giving at least `4.52:1` against the mobile canvas.

## Remaining release gate

Only remote publication checks remain: exact-parent atomic upload, Linux validation, Windows packaging, and GHCR/container completion for the uploaded SHA.
