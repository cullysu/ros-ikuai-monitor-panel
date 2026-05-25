# Changelog

## Unreleased

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
