- status: `current-journal`
- validForCommit: false; Step1201 bounds the WAN rail and rebinds machine gate notes, repairs the landscape clipping, and re-syncs the report-truth contract; the next candidate is not yet published
- supersededBy: null
- currentStep: `1208`
- currentOutcome: `1208:ci-and-container-fully-green-on-main-cl-verifier-aligned-github-packages-auth-pending`
- latestStepOutcome: `1208:ci-and-container-fully-green-on-main-cl-verifier-aligned-github-packages-auth-pending`
- authority: docs/decision-system/current-state.md
- fullHistory: ../panel-redesign-decision-log.md

## Current release boundary

- Product release: **FAIL / CLOSED**.
- The accepted four-screen mobile reference and the user-selected 192.168.3.5 / iPad desktop direction remain unchanged.
- Run `33316260102` failed the Windows Edge toolbar 200% gate at `phone-320::normal` because `find-zoom-in` found zero Zoom in controls after bounded search.
- The Linux run for that candidate was cancelled without a terminal product result; no CL/GHCR result is current evidence.
- The second popup-search correction is locally static-validated but is not yet committed or pushed. No upload may be treated as release evidence until the next exact SHA has fresh Linux, Windows and CL/GHCR results.

## Current decision record

- Step1197 is the current operational boundary. The full append-only chronology remains in `../panel-redesign-decision-log.md`.
- Current decision authority is `current-state.md`; `current-index.md`, `README.md` and this journal are navigation surfaces only.
- Historical review, matrix and CI results remain historical unless they bind to the next exact candidate SHA.
- The next action is to commit the verified correction and synchronized state documents, then inspect only the new exact-SHA Linux, Windows and CL/GHCR results. Fix the first fresh failure before proceeding.

## Release rule

Only a clean, independently accepted candidate with complete current-identity matrices, real RouterOS read-only soak, trusted promotion authority and exact-SHA Linux/Windows/GHCR CL may open publication. Normal `git push` is forbidden for this project.
