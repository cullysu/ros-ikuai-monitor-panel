# Changelog

## 0.4.0 - 2026-09-30

### Security

- Fixed a stored XSS: DNS server lists are now HTML-escaped everywhere they
  render (found by full-field XSS spraying during scale testing).
- The REST credential probe no longer counts a WebFig HTML shell as a working
  REST API; only a JSON payload counts, so routers without the REST API can no
  longer produce a false "REST ok" connection result.
- Added a request rate guard (429 + Retry-After) on the connection search API.

### Fixed

- Active connections, terminal traffic rates and the per-IP traffic ranking
  work for the first time: connection endpoints are `ip:port` strings and were
  silently dropped before parsing (this is why "终端流量排行：当前未采集到"
  appeared on real deployments).
- A single malformed interface record (missing/None/numeric name) no longer
  crashes the whole snapshot; sorting is type-safe.
- Logs now show the newest window. RouterOS returns logs oldest-first, so the
  previous head-slice displayed only the oldest entries on chatty routers.
- 64-bit counter wraparound is counted instead of being treated as a reset, so
  big-traffic lines no longer show 0 Bps once per wrap.
- Hybrid deployments keep DHCP/static WAN lines visible when PPPoE exists.
- CPU/memory/disk readings are clamped to 0-100 with an explicit
  "data anomaly" notice instead of rendering 250% or negative values.
- REST/API error messages no longer leak full request URLs.
- Fixed PPPoE line ordering that was hardcoded to one deployment's line names
  (`pppoe-out10..80`); ordering is now purely natural by suffix number.
- SSH capture drains buffered output when exit-status arrives before data.
- RouterOS v6 uptime/date formats are normalized for display.
- Router clock skew greater than 15 minutes raises a visible warning.
- A single online line with zero traffic shows a 100% share instead of 0.0%.
- Home page line-share bars disclose how many lines are not shown.

### Added

- React desktop frontend (iKuai NTR RouterOS) is now the default UI: a surface
  loader picks the desktop or mobile bundle automatically, and the previous
  vanilla interface remains available as `index.legacy.html`.
- Five readonly diagnostics feature pages (collection health, DNS/proxy
  checks, WAN quality, terminal risk ranking, system audit) plus a diagnostics
  overview with cross-links.
- New read-only APIs: `/api/health-findings` and `/api/connection-search`
  (precise IP search with per-client rate limiting), consumed by the desktop.
- "Remember device profile" on login stores host/user/ports without the
  password (DPAPI-protected login store on Windows).
- Snapshot scale metadata surfaced across the desktop UI ("显示 x / 共 y"
  badges) and LAN-scope explanation when terminals show zero.
- Panel access URL in the desktop topbar; load audit admin-session and health
  event tables; single-IP drill-down on the traffic audit page.
- Inline IP alias (custom device name) editing in the desktop terminals/ARP
  tables, behind the existing write-enable switch.
- 54 unit tests (backend boundaries, contract probes, Windows DPAPI) wired
  into CI on both Linux and Windows.

### Changed

- Performance at scale (10k interfaces, measured on the scale harness):
  snapshot payload sampled at the boundary (9.7 MB -> 524 KB, WAN rows kept,
  `ROS_PANEL_SNAPSHOT_ROW_CAP` adjustable), API responses gzipped when the
  client accepts it (9.7 MB -> 208 KB on the wire, 46x), and list rendering
  paginated in the desktop tables.
- Backend reorganized into the `ros_panel` package (collector, server, config,
  router config/store with DPAPI, panel access guards, endpoints, semantic
  triage, diagnostics, model, util); `app.py` remains as a 323-line entry
  point and all import contracts are preserved.
- Frontend consolidated: the four stacked legacy scripts are folded into a
  single served script; stale layers removed; `index.legacy.html` keeps the
  previous UI.
- API JSON error text is compact and URL-free; listen backlog raised.
- RouterOS v6 uptime/date display formats normalized; legacy login store
  entries without REST scheme/port fall back to secure defaults.

### Upgrade

Replace the previous release with the matching platform asset; keep the
existing `routeros-panel.env`. The React desktop is served by default and the
previous interface stays reachable at `index.legacy.html`.

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
