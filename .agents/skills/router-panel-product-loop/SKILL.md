---
name: router-panel-product-loop
description: "Run a gated product-company loop for the RouterOS/iKuai monitoring panel: frame the operator job, define a testable product contract, review hierarchy and mobile design, review architecture and data truth, implement one coherent slice, inspect real screenshots, complete the required acceptance matrix, and verify every GitHub check. Use for panel redesigns, mobile UI work, abnormal-state work, architecture changes, public-release preparation, or any request where product, design, engineering, QA, and release decisions must remain aligned."
---

# Router Panel Product Loop

Operate as one small product company with explicit handoffs. Do not imitate a multi-agent runtime and do not install a framework. Execute the roles inline, record the result of every gate, and return failed work to the role that owns it.

Read `references/project-gates.md` before changing the overview product. For any visible or interactive UI change, also read `references/emil-design-engineering.md`; it adapts Emil Kowalski's design-engineering rules to a high-frequency read-only operations console. Before release work, read `references/release-transaction.md` and maintain its durable state with `scripts/release_checkpoint.py`. Read `references/sources.md` only when the origin or rationale of the loop matters.

## Invariants

- Treat mobile and desktop as separate products sharing data models, not markup or layout.
- Never rescue a rejected mobile direction with incremental CSS patches. Delete the rejected presentation and rebuild its owned component/style surface.
- Prefer observable facts over adjectives such as “healthy”, “real-time”, or “trusted”.
- Keep evidence available, but progressively disclose it after the first decision surface.
- Never let a local test redefine the product requirement merely to pass.
- Never set top-level pass when a required scenario, viewport, screenshot, or CI check is missing.
- Never set top-level pass when any applicable descendant check is false. Aggregation may preserve explicitly non-applicable checks, but it may not erase or outvote failures.
- Product, Design, and Visual QA cannot be self-signed by the implementation loop. They remain `fail` or `pending` until independent acceptance evidence exists.
- Do not upload until local gates pass. After any GitHub upload, wait for Linux validation, Windows packaging, and GHCR/container checks.
- Do not use normal `git push` in this repository; follow its atomic connector workflow.
- Bind evidence to both the candidate commit and its Git tree. A later commit is not the same release candidate even when runtime files appear unchanged.
- A release receipt proves the final identity and gate results; it never replaces the decision rationale. Record every material choice, rejected alternative, evidence-triggered change, and lesson in `docs/panel-redesign-decision-log.md`.
- Keep `D:\想法\面板\面板重做决策日志.md` as a byte-identical mirror of the repository decision log whenever that path is available. A post-release log entry must say explicitly that it is not contained in the already-published SHA.
- Decision logging is write-ahead, not end-of-turn cleanup. Before moving from one material implementation slice to the next, append the slice's problem, decision, rejected alternatives, evidence, remaining doubt, and next action to the repository log, synchronize the D-drive mirror, and verify byte identity. Code may not keep advancing while the decision ledger is knowingly stale.
- Treat public-repository publication as external disclosure. Complete the read-only disclosure and capability preflight before uploading the first blob; never use source uploads as a capability probe.
- Long-running matrices and publication transactions must have durable checkpoints and a cancellation-safe resume path. Use `scripts/merge_matrix_reports.py` for strict reconstruction from scenario-sized matrix reports; a monolithic in-memory loop is not a release procedure.

## Loop State

For non-trivial work, maintain `docs/product-loop-current.md` with:

1. operator job and current pain;
2. non-negotiables and explicit non-goals;
3. measurable product contract;
4. current gate table (`pending`, `pass`, or `fail`);
5. evidence paths and failed-check reasons;
6. next owner and next action.
7. inspected local commit/tree and verified remote parent;
8. evidence freshness, including which candidate generated each report;
9. public-disclosure and publication-capability status.
10. latest recorded decision step and D-drive mirror verification status.

The only current human conclusion for this repository lives in `docs/decision-system/current-state.md`. Product contracts and journals must carry `status`, `validForCommit`, and `supersededBy`; historical prose may not override current state.

Never mark a gate passed from prose alone. Attach code, test, report, or screenshot evidence.
If this file disagrees with `.product-loop/state.json`, a current report, the worktree, or the remote ref, mark the affected gate stale immediately instead of choosing the more convenient record.
Before ending a non-trivial continuation, reconcile the decision log, its D-drive mirror, this handoff, and machine state. A checkpoint or ignored acceptance receipt is additional evidence, not permission to leave those records stale.

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
7. Run the restrained-interaction review from `references/emil-design-engineering.md`: decide whether motion is warranted before choosing a curve, keep frequent patrol actions instant, and verify press/focus/interrupt/reduced-motion behavior.

Gate passes only after real screenshots show a three-second scan order, compact density, obvious state, and no desktop chrome or DOM in the mobile product. An interaction also fails this gate when it adds latency, fake affordance, non-interruptible motion, or motion without a stated purpose.

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
6. Keep human visual review separate from DOM, screenshot-dimension, and matrix checks. A technically complete matrix cannot award its own aesthetic or product sign-off.

Return a failed item to its owner:

- wrong job/scope → Product Manager;
- wrong hierarchy/visual language → Product Design;
- false data or coupled architecture → Engineering;
- weak probe or incomplete matrix → QA;
- failed GitHub workflow → Release Engineering.

## Stage 7 — Release Engineering

1. Run the read-only preflight from `references/release-transaction.md`: repository visibility, intended diff, secret/credential exclusion, connector capability, and external-disclosure policy.
2. If publication is policy- or authorization-gated, stop remote writes without retrying through another tool. Continue local product work and keep the release gate pending or failed.
3. Confirm a clean, isolated candidate tree contains only intended files; unrelated dirty files may not ride along.
4. Initialize `scripts/release_checkpoint.py`, then record the local commit, Git tree, verified remote parent, intended path manifest, report paths, and report timestamps before the expensive full matrices.
5. Rebuild and rerun every exact-candidate gate. A report named for another SHA is historical evidence only.
6. If the publication API synthesizes a new commit SHA, do not call the old local SHA the uploaded SHA. Establish and verify the remote commit/tree identity as specified in the release transaction.
7. Recheck the remote parent immediately before one non-force atomic ref update. Never use a test blob or temporary branch as an authorization probe.
8. Fetch or compare the resulting remote ref and tree, then wait for Linux validation, Windows packaging, and GHCR/container checks for that exact remote SHA.
9. A missing local Docker daemon remains `pending`; only the exact-SHA GHCR job can close the container gate in that case.
10. If any check fails, diagnose it and return to the owning stage. Never call the release complete while CL is pending, missing, cancelled, or red.
11. After the exact remote SHA finishes all three checks, write the final reasoning and outcome to the decision log and synchronize the D-drive mirror. If that write occurs after publication, label it local/unpublished instead of creating or claiming an unverified successor SHA.
12. Use `release_checkpoint.py verify-progress` while staging or waiting. Only `release_checkpoint.py verify --final`, which requires exact remote tree/commit/ref plus Linux, Windows, and container pass evidence, can close the engineering release transaction.

## Completion Rule

Complete the loop only when every required gate is `pass`, evidence paths exist and match the final candidate identity, the release matrix is complete, public-disclosure preflight passed, all three exact-SHA GitHub checks are green, and the decision log/loop state are reconciled with an explicit publication boundary. Otherwise report the current failing gate and continue from that stage.
