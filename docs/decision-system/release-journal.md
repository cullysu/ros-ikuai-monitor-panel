# Release Journal
- status: `current-journal`
- validForCommit: Step839 mobile order and governance update is being committed; 2bc0ff7 exact evidence must be rebound on the next clean SHA; formal external gates remain open; not a public release approval
- supersededBy: null
- currentStep: `839`
- currentOutcome: 839:active-mobile-first-viewport-decision-before-action-formal-signoff-open
- latestStepOutcome: 839:active-mobile-first-viewport-decision-before-action-formal-signoff-open
- authority: docs/decision-system/current-state.md
- fullHistory: panel-redesign-decision-log.md

- Step836: route-evidence remediation focused checks pass; exact runtime/matrix/packet evidence is stale until a new clean SHA is committed. Formal Product/Design/Visual, independent Accessibility, route-owner maturity, RouterOS soak and exact-SHA CL remain open.
- Step837: folded-control accessibility regression was fixed and full production runtime was green; superseded by Step838 governance rebinding.
- Step838: evidence-boundary wording P1 is fixed; b543cbb scoped engineering/visual evidence is green; the governance commit invalidates that exact evidence until the next clean SHA is rebound. Formal Product/Design/Visual, independent Accessibility, route-owner maturity, RouterOS soak and exact-SHA CL remain open.
- Step839: normal-phone running judgment now precedes the next-step action to keep the 375px first viewport decision-first. The 2bc0ff7 exact evidence is stale until a new clean SHA is rebound; formal Product/Design/Visual, independent Accessibility, route-owner maturity, RouterOS soak and exact-SHA CL remain open.

- Historical Step793: scoped independent Design and Visual review closed with PASS; Product remained open.
- Historical Step796: scoped Product/Architecture/Visual review was recorded while the public boundary remained fail-closed.
- Historical Step810 evidence (superseded): Overview 28/28, route-responsive 76/76 bounded cells, route-state 266/266, and browser runtime 257 checks / 101 screenshots / 132 snapshot API calls. The unsigned packet binds current commit da5e0c3a221cfeec4f180041ddfb912ff3d5b6ca and all 12 refreshed screenshot digests.
- Historical Step810 boundary (superseded): scoped Product/Visual review is closed with P0/P1=0; formal Product/Design/Visual, Accessibility, route-owner, RouterOS soak, clean-candidate and external exact-SHA Linux/Windows/GHCR CL acceptance remain open. Current product release and GitHub/public release remain closed.

- Step820 current-identity full matrix and independent scoped review

- Current candidate 80f5113849dc7af3f865a73005a2f71ea1614a43; runtime 257/140/169; full public route matrix 532/532; Overview 28/28; route-state 266/266; route-responsive 76/76 bounded.
- Runtime fingerprint 33950af70105c717b4981200e1d84d874847f52d3ce303dfb7d7be5263291353; artifact worktree-80f5113849dc-33950af70105; packet and all 12 current screenshot digests are rebound.
- Direct readiness passes engineering matrix evidence and stops at route maturity: 0 complete / 18 bounded-readonly / 0 fallback / 1 unavailable. No RouterOS soak, trusted Ed25519, exact-SHA Linux/Windows/GHCR CL or GitHub upload is claimed.

- Step821: the exact e22b244 evidence set passed its declared matrices and readiness stopped at route maturity; ambiguous `*-current` artifact names were replaced with exact-SHA directories, and the unsigned visual packet was moved to generated ignored evidence to avoid tracked-packet self-reference. The source/tool refresh invalidated the old evidence.
- Step828: 32ed025 exact runtime, packet, Overview 28/28, route-responsive 76/76, route-state 266/266, public 532/532 and local hygiene pass; scoped independent visual/product review is P0=0/P1=0; readiness remains at route maturity 0/18/0/1. Formal independent acceptance, RouterOS soak and exact-SHA CL remain open.

- Step831: 100148c exact clean runtime `257/140/170`, Overview `28/28`, route-responsive `76/76` bounded, route-state `266/266`, full public `532/532`, packet `12/12` and local release hygiene pass. The extra 390–430px CSS patch was removed after the first candidate hit the style budget; final raw style is `119994`. Readiness correctly stops at route maturity `0/18/0/1`. Independent read-only review is scoped PASS with P0/P1=0 and three P2 boundaries; formal Product/Design/Visual, independent Accessibility, route-owner acceptance, RouterOS soak and exact-SHA CL remain open.
- Step832: 603a27f exact clean runtime `257/140/169`, Overview `28/28`, route-responsive full `532/532`, route-state `266/266`, full public `532/532`, packet `12/12` and local release hygiene pass. The route-responsive single-scenario 76/76 shard remained available for readiness discovery, while the complete multi-scenario report closed the prior P1. Readiness correctly stops at route maturity `0/18/0/1`. Independent read-only review is scoped PASS with P0/P1=0; formal Product/Design/Visual, independent Accessibility, route-owner acceptance, RouterOS soak and exact-SHA CL remain open.
- Step835: 382a145 exact clean runtime `257/140/170`, Overview `28/28`, route-state `266/266`, full route-responsive `532/532`, full public `532/532`, packet `12/12` and local release hygiene pass. A fresh independent read-only review returned scoped PASS with P0/P1=0 and three P2 boundaries. Readiness correctly stops at route maturity `0/18/0/1`; formal Product/Design/Visual, independent Accessibility, route-owner acceptance, RouterOS soak and exact-SHA CL remain open.

## Release rule

Only a clean, independently accepted candidate with complete current-identity matrices, real RouterOS soak evidence and exact-SHA Linux/Windows/GHCR CL may open the release boundary. Engineering green and scoped Design/Visual PASS are not Product or public-release approval.


- Step805 current identity refresh: missing-rate pseudo-zero regression and 320px proof layout slice are fixed; scoped Visual P1 is closed.
- Step805 boundary: formal signoff, route maturity, RouterOS soak, clean candidate and external CL remain open.

- Step806: source/build commit a7f96674ddecd3d12193ecf35d2f979f452054cc; scoped Product and Visual PASS recorded; formal public signoff remains pending and release remains closed.

- Step810: current SHA overview/runtime/packet refresh and scoped Product/Visual PASS recorded; formal signoff and release remain closed.


- Historical Step811: candidate 7ded037c617fbe92b6cdc672b0e9bb28f72c1713; full public 532/532, Overview 28/28, route-state 266/266, route-responsive 76/76 and runtime 257/101/130 pass. Short-phone first decision row moved from 600px to 579px at 375x667 while chart/time/touch contracts remain intact.
- Step811 boundary: packet is being rebound and remains prepared-not-signed; worktreeClean=false, releaseEvidenceEligible=false, route maturity 0/18/0/1, formal independent signoff, RouterOS soak and exact-SHA Linux/Windows/GHCR CL remain open.
