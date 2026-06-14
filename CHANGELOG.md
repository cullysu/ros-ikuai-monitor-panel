# Changelog

## Unreleased

- Nothing yet.

## 0.2.1 - 2026-06-14

- Fixed the public first-run flow so an unconfigured or SSH-failing RouterOS
  connection shows the RouterOS login page instead of rendering the dashboard
  homepage.
- Kept RouterOS login form edits stable across background refreshes and failed
  login attempts.
- Added a release-readiness marker check for the RouterOS login gate.

## 0.2.0 - 2026-06-14

- Added a RouterOS Container archive converter for Docker/BuildKit OCI layout
  tarballs so offline imports can be rewritten to legacy Docker archive shape.
- Fixed RouterOS Container env examples to use RouterOS `list=` syntax and
  added preflight checks that catch stale env/archive guidance before release.
- Filtered stale/duplicate health log rows from the homepage load-audit summary
  so old RouterOS log events do not look like current failures.
- Added GHCR container publishing workflow and made Docker installs prefer the
  published image with local-build fallback.
- Added public-release readiness checks and explicit RouterOS Container LAN
  exposure/rollback guidance.
- Fixed collector duration measurements to use a monotonic clock so wall-clock
  changes cannot skew poll timing, rate smoothing, or timeout reporting.

## 0.1.0 - 2026-05-25

- Repositioned the project as a read-only RouterOS semantic triage panel.
- Added backend semantic triage/action queue data.
- Added `/api/action-queue` and `/api/semantic-triage`.
- Added public-profile homepage action queue.
- Safer deployment defaults and cleaner release sync exclusions.
- Added local predeploy smoke/responsive checks.
- Added isolated alternate-host deployment guidance without making a private IP
  a product default.
- Added Dockerfile, Compose, and Docker env template for the recommended public
  deployment path.
- Added local-run, Docker, and RouterOS Container deployment guides.
- Reworked README and Chinese README around public distribution paths instead
  of VM-first deployment.
- Added Windows EXE packaging with PyInstaller, a sidecar
  `routeros-panel.env` config file, and a build script for non-Python users.
- Separated install paths from capability modes in `PRODUCT_MODEL.md`.
- Added scale metadata for high-volume snapshot resources so the UI can disclose
  actual totals, shown rows, `hasMore`, and sampled lists.
- Tightened the scale-adaptive UI after product review: overview is now
  risk/action-first, detail pages use labeled search/filter feedback, compact
  window tables, clear-filter controls, and human-readable scale copy.
- Defaulted the homepage WAN monitor to an all-line aggregate view while keeping
  per-line switching available.
- Added readable chart Y-axis tick labels for rate and percentage trends.
- Preserved missing-data gaps while smoothing chart lines, avoiding false
  zero-value spikes.
- Changed Docker/manual Compose address reporting to derive the active panel URL
  from the browser `Host` header, with proxy headers opt-in.
- Added explicit installer guidance for host firewall TCP `28646` checks without
  silently changing firewall rules.
- Added public-project foundation files: MIT license, support guide, code of
  conduct, GitHub issue forms, pull request template, and CI workflow.
- Rewrote the Chinese README in valid UTF-8 and aligned security/contribution
  docs with the current LAN deployment defaults.
- Added privacy, credential-handling, threat-model, read-only-permission,
  disclaimer, roadmap, and legacy-deployment documentation.
- Added local CI entrypoints for maintainers.
- Made RouterOS password saving opt-in by default for public deployments.
