# Contributing

This project is still being productized. Keep changes scoped and preserve the
core boundary: read-only RouterOS triage.

## Before A Change

- Decide whether the change helps semantic triage, onboarding, safety, or
  verification.
- Avoid adding another raw table or page unless it supports a clear operator
  question.
- Do not add RouterOS write behavior without a documented backup and rollback
  path.

## Local Checks

```powershell
.\tools\check-local-predeploy.ps1
```

## Product Bar

Good changes answer at least one of these:

- What is risky right now?
- What changed or failed to collect?
- What evidence should the operator inspect next?
- How can a new user deploy this safely?

Avoid:

- Clone-style branding.
- Hardcoded private LAN assumptions.
- Public deployment recipes without authentication and HTTPS guidance.
- New diagnostics that cannot be explained in one operator sentence.
