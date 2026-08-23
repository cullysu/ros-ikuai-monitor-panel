# Overview iKuai 4.0 Completion Audit

- status: `superseded`
- validForCommit: `historical iKuai 4.0 audit`
- supersededBy: `docs/decision-system/current-state.md`

- Task: `edict-overview-ikuai40-visual-20260628`
- Current HEAD during audit: recorded by the latest release-matrix report; do not rely on archived commit labels.
- Static verifier: `node tools/check-overview-ikuai-static.js` -> `PASS (190 markers, 2 inline scripts)`
- CI hooks: `tools/ci-local.ps1` and `tools/ci-local.sh` both run `node tools/check-overview-ikuai-static.js`.
- Framework build output: `vite build` writes the framework bundle to `public/assets/framework`.
- Render matrix status: **not run in this low-load pass** to avoid renewed mouse/desktop lag.

## Verdict

Static implementation evidence is strong, but final product completion is still **not proven** until rendered desktop/mobile overview scenarios are inspected or matrix-gated. Static contracts can prove markup/CSS/branch intent; they cannot prove actual clipping, whitespace, visual density, first-screen composition, or whether the UI feels like a mature iKuai 4.0 console.

## Requirement evidence matrix

| # | Requirement | Static evidence now present | Status | Render proof still needed |
|---|---|---|---|---|
| P0-1 | Trend charts must be judgement surfaces: current / peak / mean / window / threshold / y-axis. | Chart plot contracts, judgement strip, y-axis metadata, current/peak/mean/readout checks in `tools/check-overview-ikuai-static.js`. | Static pass | Confirm labels are readable and not too faint in desktop/mobile screenshots. |
| P0-2 | Normal homepage traffic panel must not leave empty lower area; add WAN Top3 / route / sampling / peak / success. | Normal traffic under-chart facts and no-empty traffic panel gates. | Static pass | Confirm left panel visually fills the intended viewport without blank lower half. |
| P0-3 | Resource-full first screen: danger bars + CPU/MEM/DISK ledger + pressure + interface Top5; avoid duplicate small trends/tables. | Resource branch gate, no duplicate sparkline gate, first-screen structure markers. | Static pass | Confirm DISK/CPU/MEM hierarchy and no fake visual fullness. |
| P0-4 | No-snapshot: compact flow + timeline + 4-column visibility matrix; content-sized modules. | No-snapshot flow/timeline/matrix, no-stretch, no WAN 0B/s placeholder gates. | Static pass | Confirm desktop no-snapshot has no large blank card and no misleading rate table. |
| P0-5 | Collection-down: REST/SSH/snapshot triad + latest success timeline; resource trend downshifted. | Collection first-screen bars/timeline gates; desktop supplement branch forbids resource trend first. | Static pass | Confirm collection-down first screen visually centers collection failure. |
| P0-6 | Mobile first screen must include at least one microchart. | All-scene mobile microchart contract and per-scene routes. | Static pass | Confirm microchart is actually visible above detail tables on 390x844. |
| P0-7 | Interfaces-down top blocks only object + status; parent/bridge/vlan/pppoe relation in table. | Interface relation deferral and visible node template checks. | Static pass | Confirm no `bridgebridge-lan` / `parentpppoe` visual concatenation. |
| P0-8 | Right-side tables must reduce columns to object/current/evidence and avoid badge-column clipping. | Three-column/no-badge/evidence-wrap/no-ellipsis gates. | Static pass | Confirm all-offline and collection-down right columns wrap cleanly. |
| P1-9 | Blue-white flat console; fewer inner boxes/microcards. | Blue-white surface and inner separator CSS gates. | Static pass | Confirm it reads as light console rather than Excel grid. |
| P1-10 | Scene-specific chart priorities. | `OVERVIEW_SCENE_CHART_PRIORITY` and scene chart contract gates. | Static pass | Confirm each scenario actually leads with the right visual. |
| P1-11 | Top5 should be light: bar main value, percent right, secondary tooltip-only. | Top5 flat 3-col and tooltip-only gates. | Static pass | Confirm row height/spacing are readable but not noisy. |
| P1-12 | Fixed color semantics: red danger, orange warning, muted blue normal/reference, gray missing. | `OVERVIEW_CHART_STATUS_COLORS` role map and usage checks. | Static pass | Confirm visual contrast and no blue-as-danger confusion. |
| P1-13 | Topbar hierarchy: conclusion rail, object bold, collection/snapshot demoted. | Topbar role order, rail, priority, secondary demotion gates. | Static pass | Confirm six cells are readable and not visually equal. |
| P1-14 | Cache copy appears once; chart modules use compact tag. | Cache copy policy and forbidden verbose cache phrase checks. | Static pass | Confirm rendered pages do not repeat cache wording as noise. |
| P1-15 | Empty chart states should be graphical dashed-axis + latest success/recovery threshold. | Empty chart contract/readout/recovery threshold gates. | Static pass | Confirm no blank empty chart blocks remain. |
| P1-16 | Mobile entry links low priority, not first-screen content. | Detail-tabs-after-first-screen and first-screen hidden CSS gates. | Static pass | Confirm first screen is dominated by conclusion + microchart. |
| P1-17 | Key facts stay first-screen visible despite lower density. | Normal keyfacts/chart metadata/readout/sample-depth gates. | Static pass | Confirm current/peak/samples/trust/recent success are above fold. |
| P1-18 | No large cards with only 1-2 lines. | Required evidence modules, visible geometry, and content-sized/no-stretch CSS gates. | Static pass | Confirm large boxes are not visually sparse at 1366x768. |

## Required render verification before final completion

Run only when machine load is acceptable. First confirm the command without launching the browser:

    powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\check-overview-ikuai-lite.ps1 -DryRun

Then start with the lite wrapper before the full matrix:

    powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\check-overview-ikuai-lite.ps1

Or through local CI's explicit lite browser switch:

    powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\ci-local.ps1 -LiteBrowser -SkipWindowsBuild
    bash tools/ci-local.sh --lite-browser --skip-docker

Full release matrix, only after the lite pass is clean:

    powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\check-local-predeploy.ps1 -Profile public -Sections overview -Viewports desktop=1366x768,narrow=390x844 -ScaleScenarios single,fleet,all-offline,no-snapshot,collection-down,resource-full,interfaces-down

Minimum scenarios covered by the lite wrapper:

1. single desktop/mobile: traffic trend + under-chart facts, no empty left panel.
2. resource-full desktop/mobile: danger bars + pressure microchart, no duplicate sparklines.
3. no-snapshot desktop/mobile: flow + timeline + visibility matrix, no WAN 0B/s placeholder, no blank stretched card.
4. collection-down desktop/mobile: REST/SSH/snapshot + latest success timeline before resource data.
5. interfaces-down desktop/mobile: object/status-only top nodes, relation table below.
6. all-offline desktop/mobile: WAN/interface status visual before terminal rank, right table wraps.

## Completion rule

Do not mark this goal complete until:

- Static gate passes.
- CI references the static gate.
- Render matrix or screenshot inspection proves the layout requirements above.
- The final commit includes `public/index.html`, `tools/check-overview-ikuai-static.js`, `tools/check-overview-ikuai-lite.ps1`, CI script changes, and the Edict/completion evidence that should be kept.
