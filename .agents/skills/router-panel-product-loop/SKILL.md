---
name: router-panel-product-loop
description: "Run a gated product-company loop for the RouterOS/iKuai monitoring panel: frame the operator job, define a testable product contract, review hierarchy and mobile design, review architecture and data truth, implement one coherent slice, inspect real screenshots, complete the required acceptance matrix, and verify every GitHub check. Use for panel redesigns, mobile UI work, abnormal-state work, architecture changes, public-release preparation, or any request where product, design, engineering, QA, and release decisions must remain aligned."
---

# Router Panel Product Loop

Operate as one small product company with explicit handoffs. Do not imitate a multi-agent runtime and do not install a framework. Execute the roles inline, record the result of every gate, and return failed work to the role that owns it.

Read `references/project-gates.md` before changing the overview product. Read `references/sources.md` only when the origin or rationale of the loop matters.

## Invariants

- Treat mobile and desktop as separate products sharing data models, not markup or layout.
- Never rescue a rejected mobile direction with incremental CSS patches. Delete the rejected presentation and rebuild its owned component/style surface.
- Prefer observable facts over adjectives such as “healthy”, “real-time”, or “trusted”.
- Keep evidence available, but progressively disclose it after the first decision surface.
- Never let a local test redefine the product requirement merely to pass.
- Never set top-level pass when a required scenario, viewport, screenshot, or CI check is missing.
- Do not upload until local gates pass. After any GitHub upload, wait for Linux validation, Windows packaging, and GHCR/container checks.
- Do not use normal `git push` in this repository; follow its atomic connector workflow.

## Loop State

For non-trivial work, maintain `docs/product-loop-current.md` with:

1. operator job and current pain;
2. non-negotiables and explicit non-goals;
3. measurable product contract;
4. current gate table (`pending`, `pass`, or `fail`);
5. evidence paths and failed-check reasons;
6. next owner and next action.

Never mark a gate passed from prose alone. Attach code, test, report, or screenshot evidence.

## Stage 1 — Product Manager

Translate feedback into one product slice before coding.

1. Name the primary operator and the situation they are in.
2. State the job in user language: what decision must be made in the first three seconds?
3. Separate confirmed evidence from hypotheses.
4. Define in-scope, out-of-scope, and deleted legacy behavior.
5. Write measurable acceptance criteria, including happy path, abnormal states, recovery, accessibility, and responsive boundaries.
6. Name the largest product risk and the cheapest evidence that would falsify the plan.

Gate passes only when a reviewer can answer “what is being built, for whom, why, and how do we prove it?” without guessing.

## Stage 2 — Product/CEO Review

Challenge product coherence, not feature count.

1. Identify the one primary value signal.
2. Apply subtraction: remove anything that competes with the operator's first decision.
3. Classify decisions by reversibility and blast radius.
4. Check trust boundaries: management plane, collection plane, forwarding plane, and business reachability must not be conflated.
5. Reject proxy metrics that look impressive but do not prove user value.

Gate passes only when the product has one coherent thesis and the scope contains no decorative or duplicated priority.

## Stage 3 — Product Design Review

Review the system, not a single pleasant screenshot.

1. Inspect relevant real products and current mobile operations patterns before choosing a direction.
2. Write the hierarchy as first, second, third—not as a list of equally weighted cards.
3. Specify typography, spacing, surfaces, state treatment, chart truth, touch targets, safe areas, and navigation behavior.
4. Simulate normal, all-offline, no-snapshot, collection-down, resource-full, interfaces-down, long text, and landscape.
5. Make abnormal layouts change priority, not just color or title.
6. Use a 390px screenshot as a product artifact and an 844x390 screenshot as a distinct layout, not a scaled desktop dialog.

Gate passes only after real screenshots show a three-second scan order, compact density, obvious state, and no desktop chrome or DOM in the mobile product.

## Stage 4 — Engineering Manager

Lock implementation boundaries before editing.

1. Trace raw snapshot → derived state → view model → mobile or desktop renderer → runtime probe.
2. Keep shared truth in models and platform-specific presentation in separate component/style ownership.
3. Name happy, empty, stale, missing, and upstream-error paths.
4. Define focused tests first when practical.
5. Reject patch assets, duplicate render trees, synthetic charts, and CSS selector ownership leaks.
6. Keep the smallest coherent implementation; do not add a framework to simulate company roles.

Gate passes only when architecture, data truth, failure behavior, and verification commands are explicit.

## Stage 5 — Implementation

Implement one vertical slice at a time:

1. write or update a failing product contract;
2. implement the smallest coherent change;
3. run type and static checks;
4. build production assets;
5. run the focused runtime scenario;
6. inspect the screenshot;
7. refactor only code introduced by the slice when the result is structurally wrong.

Do not proceed because automated checks are green if the screenshot still violates the product contract.

## Stage 6 — QA Lead

Verify behavior and visual evidence independently.

1. Exercise every required scenario at every required viewport.
2. Require desktop DOM absence on mobile, truthful chart sources, touch targets, no overflow, and explicit read-only boundaries.
3. Inspect screenshots for hierarchy, clipping, compositor artifacts, density, duplicate facts, and state differentiation.
4. Compare report totals with the required matrix; incomplete means fail.
5. Record each failure as product, design, engineering, test, or environment ownership.

Return a failed item to its owner:

- wrong job/scope → Product Manager;
- wrong hierarchy/visual language → Product Design;
- false data or coupled architecture → Engineering;
- weak probe or incomplete matrix → QA;
- failed GitHub workflow → Release Engineering.

## Stage 7 — Release Engineering

1. Confirm the worktree contains only intended files.
2. Rebuild and rerun required local gates.
3. Confirm the current commit has a complete release-matrix report.
4. Recheck the remote parent immediately before the atomic GitHub ref update.
5. Upload through the repository's connector workflow without force.
6. Wait for Linux validation, Windows packaging, and GHCR/container checks.
7. If any check fails, diagnose it and return to the owning stage. Never call the release complete while CL is pending or red.

## Completion Rule

Complete the loop only when every required gate is `pass`, evidence paths exist, the release matrix is complete, and all three GitHub checks are green. Otherwise report the current failing gate and continue from that stage.
