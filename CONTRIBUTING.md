# Contributing

This project is still being productized. Keep changes scoped and preserve the
core boundary: read-only RouterOS triage.

By contributing, you agree that your contribution is provided under the project
license in [LICENSE](./LICENSE).

## Before A Change

- Decide whether the change helps semantic triage, onboarding, safety, or
  verification.
- Avoid adding another raw table or page unless it supports a clear operator
  question.
- Do not add RouterOS write behavior without a documented backup and rollback
  path.
- Do not add private OpenWrt/Nikki/local-lab diagnostics to the public default
  profile.

## Local Checks

Run the smallest checks that match your change:

```powershell
.\tools\ci-local.ps1 -SkipWindowsBuild
```

Or run the core checks manually:

```powershell
python -m py_compile app.py tools/check-collector-regressions.py
python tools/check-collector-regressions.py
node tools/check-lan-access-defaults.js
docker compose --env-file .env.docker.example config --quiet
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\check-packaging-preflight.ps1 -StrictInstall
```

For Windows EXE or packaging changes, also run:

```powershell
.\tools\ci-local.ps1
```

For UI changes, include desktop and narrow/mobile screenshots with sensitive
network data redacted.

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

## Public Issue Hygiene

- Use the GitHub issue forms.
- Redact passwords, tokens, public IPs, MAC addresses, PPPoE credentials,
  private hostnames, and full RouterOS exports.
- Include deployment path, commit/version, RouterOS version, reproduction
  steps, and redacted logs when reporting a bug.
- Do not ask maintainers to paste live RouterOS/firewall/routing changes unless
  backup, rollback, and verification are documented.
