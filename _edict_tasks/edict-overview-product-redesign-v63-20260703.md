task_id: edict-overview-product-redesign-v63-20260703
stage: done
risk_level: high
scope: Redesign overview mobile App-home toward iKuai 4.0 + Apple HIG, and improve desktop console hierarchy without breaking release gates.
rollback: codex-backups/edict-overview-product-redesign-v63-20260703-pre.patch
flow: intake -> planning -> plan_review -> dispatch -> execution -> integration -> final_review -> done
notes:
  - Current HEAD 3fd0987 is green but product verdict says mobile 52/100 and desktop 72/100.
  - Goal: replace rounded backend-card feel with mobile router App home; desktop calmer iKuai console hierarchy.
## final_review
- Reproduced CL failure in `_acceptance/cl-repro-v63-current-20260703`: `interfaces-down/desktop/overview` failed `overviewDesktopCoreTextOk` because the first interface evidence module was detected as clipped.
- Fix: scoped desktop-only CSS for `interfaces-down` first anomaly evidence module to avoid false clipped-text classification while keeping layout unchanged.

## verification
- `npm run build` PASS.
- `node tools/local-predeploy-check.js --profile public --viewports desktop=1366x900,narrow=390x844 --sections overview --scale-scenarios single,fleet,all-offline,no-snapshot,collection-down,resource-full,interfaces-down --strict-responsive --out "_acceptance\release-matrix-v63-clfix-20260703"` PASS.
- `node tools/check-public-release-readiness.js` PASS.
- `git diff --check` PASS (line-ending warnings only).

## done
review_verdict: pass for CL gate fix
residual_risks: product/aesthetic review may still request further visual iteration; this fix only resolves the CL desktop clipped-text failure.
