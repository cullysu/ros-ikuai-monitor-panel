# Mobile v3 challenge record

## Executive lens

**Decision:** keep the release closed. A read-only monitor loses its reason to exist if WAN failure prevents local refresh or if timestamps can drift by eight hours.

**Remove:** legacy HTML chrome, decorative search/read-only controls, the oversized verdict hero, the generic Tools tab, and direct-route coverage presented as interaction coverage.

**Public promise:** current facts are explicitly observed, historical facts are labelled, unavailable facts disappear, and every visible command works.

## Product lens

**Primary task:** a five-second phone patrol followed by one-object drilldown.

**Chosen hierarchy:** identity/evidence → concise verdict → three independent facts → current instrument or top-three incidents → focus object.

**Stable destinations:** Overview, Network, Terminals, Logs. These are repeated tasks, not arbitrary feature categories.

**Required depth:** interfaces, terminals, logs, and connections gain search/filter/sort/bounded-list/detail behavior. “View all” becomes a real incident center.

**Rejected interpretation:** information density does not mean replaying the same CPU, WAN, or channel values at three levels. Each layer must answer a new question.

## Adversarial lens

1. If `navigator.onLine=false`, can the user still request the local API? A real browser test must prove it.
2. Can an offset-free timestamp enter the operational model? The validator must reject it.
3. Can every visible control be activated and produce a route/state change? E2E must enumerate them.
4. Can mixed risks make “View all” lie? The aggregate route must contain every incident.
5. Can a malformed nested row pass because the root looks valid? Deep schema tests must fail it.
6. Can host text inject URL credentials/query/fragments? Strict host normalization must reject delimiters.
7. Can a corrupt profile file masquerade as no saved devices? It must surface a recoverable error and preserve the file.
8. Can a tablet split view end with an empty half-screen? Geometry and content-value checks must reject it.
9. Can 200% text hide Refresh, facts, or bottom navigation? Reflow screenshots and control activation must prove otherwise.
10. Can previous exact-SHA green checks be reused? No; all release checks rerun for the new exact SHA.

## Resolved decisions

- Product/spec gates reopen before design/build.
- The three P0 runtime defects are fixed before visual polish.
- The new Overview is a structural rewrite, not a CSS patch.
- Mobile domain pages are separate render ownership from desktop tables.
- Playwright interaction tests now replace both the main runtime gate and the focused desktop hand-rolled CDP path; each run is bounded and performs explicit context/browser cleanup.
- No GitHub update occurs until local P0, design, runtime, security, accessibility, and full matrix gates pass.
