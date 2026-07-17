# Atomic Public Release Transaction

This reference exists because a green local tree, a local commit SHA, a staged Git Data commit, a branch update, and an exact-SHA CI/CL result are different facts. The release loop must never collapse them into “pushed.”

## Phase A — read-only preflight

Complete this before uploading source, including an unreferenced test blob.

1. Identify repository owner, visibility, default branch, and current remote parent using read-only APIs.
2. Produce the intended path manifest from the committed candidate tree. Exclude unrelated dirty and untracked files.
3. Review the manifest for credentials, local profiles, screenshots with private data, generated secrets, and accidental external disclosure.
4. Confirm that the available connector is permitted to publish this user-owned project. Permission metadata alone is not enough when the execution policy rejects public disclosure.
5. Confirm the required Linux, Windows, and GHCR workflows exist for the target branch.
6. Check local container capability. An unavailable daemon is recorded as pending, never silently treated as a successful container test.

If a tool rejects publication, do not retry through a shell token, another connector, a temporary branch, or a normal push. Record the gate and continue non-mutating work.

## Phase B — candidate freeze

1. Use a clean isolated worktree or prove that the committed tree excludes every unrelated modification.
2. Record:
   - local commit SHA;
   - local Git tree SHA;
   - verified remote parent SHA;
   - exact changed-path manifest;
   - report paths, timestamps, and their candidate identity.
3. Run the complete local gate set. A report for another SHA is historical only.
4. Any tracked change after freeze creates a new candidate and reopens exact-candidate readiness.

Initialize durable state with:

```text
python scripts/release_checkpoint.py init --workspace <repo> --repository <owner/name> --parent <remote-main-sha> --candidate HEAD
python scripts/release_checkpoint.py verify --workspace <repo>
```

## Phase C — Git Data staging

Only begin after Phase A passes.

1. Upload content-addressed blobs and verify every returned blob SHA.
2. Create the tree from the verified remote base tree and compare it with the frozen local tree.
3. Create the commit with the verified remote parent.
4. Treat an API-created commit SHA as a new identity. Do not relabel reports generated under the old local SHA as exact-SHA reports; retain them only as exact-tree evidence.
5. Persist progress after each batch of blobs and after tree/commit creation with `scripts/release_checkpoint.py mark`; resume by content SHA instead of restarting a monolithic in-memory upload.
6. Cancellation before the ref update leaves `main` unchanged. Record any staged objects; never call the release published.

Git Data staging is part of one release transaction even though workflows cannot run until a ref points at the commit.

## Phase D — atomic ref update and CL

1. Immediately re-read `main`; it must still equal the recorded parent.
2. Update the branch once with `force=false`.
3. Re-read the branch and compare the remote tree with the frozen candidate tree.
4. Wait for exact-remote-SHA Linux validation, Windows packaging, and GHCR/container runs.
5. Missing, queued, running, cancelled, skipped, or failed checks keep release incomplete.
6. If a CL fails, diagnose from its logs, return to the owning loop stage, create a new candidate, and repeat the transaction.

## Long-operation contract

Any operation expected to exceed 60 seconds must:

- write its output under the current workspace;
- expose a durable progress/checkpoint file;
- be safe to cancel between units of work;
- support idempotent resume;
- split browser matrices into bounded reports and reconstruct them only through `scripts/merge_matrix_reports.py`, which validates exact cell identity and input hashes;
- avoid broad parallel fan-out;
- report the exact artifact proving completion.

A cancellable browser matrix or blob upload that exists only inside one tool call fails this contract.
