# Local predeploy checks

This repository has a local-only predeploy smoke runner for changes that should
not touch RouterOS, OpenWrt, or any other network device.

## Run

From the repository root on Windows:

```powershell
.\tools\check-local-predeploy.ps1
```

Equivalent direct Node command:

```powershell
node .\tools\local-predeploy-check.js
```

The default command starts `app.py` on `127.0.0.1` with:

- `ROS_MONITOR_ROUTER_HOST=127.0.0.1`
- `ROS_PANEL_TARGET_IP=127.0.0.1`
- `ROS_PANEL_PROFILE=routeros_only`
- `ROS_MONITOR_ROUTER_PASSWORD=CHANGE_ME`

It does not deploy, run `deploy_linux.sh`, call systemd, or contact real
network devices.

## Useful options

```powershell
.\tools\check-local-predeploy.ps1 -Profile public
.\tools\check-local-predeploy.ps1 -Profile private
.\tools\check-local-predeploy.ps1 -SkipBrowser
.\tools\check-local-predeploy.ps1 -StrictResponsive
.\tools\check-local-predeploy.ps1 -Url http://127.0.0.1:28646/
```

`-Url` is intentionally local-only. The runner refuses non-local hosts.

Direct commands used by the public gate:

```text
.\_acceptance\codex-node.cmd tools\local-predeploy-check.js --profile public --viewports desktop=1600x1000,laptop=1366x900,tablet=1024x900,narrow=390x844 --sections public-release --scale-scenarios single --strict-responsive --out _acceptance/route-matrix-<commit>
.\_acceptance\codex-node.cmd tools\local-predeploy-check.js --profile public --viewports desktop=1366x768,desktop1440=1440x900,wide=844x390,narrow=390x844 --sections overview --scale-scenarios single,fleet,all-offline,no-snapshot,collection-down,resource-full,interfaces-down --strict-responsive --out _acceptance/release-matrix-<commit>
.\_acceptance\codex-node.cmd tools\local-predeploy-check.js --profile public --viewports desktop=1366x768,narrow=390x844 --sections public-release --scale-scenarios single,fleet,all-offline,no-snapshot,collection-down,resource-full,interfaces-down --strict-responsive --out _acceptance/route-state-matrix-<commit>
.\_acceptance\codex-npm.cmd run check:runtime-browser
.\_acceptance\codex-node.cmd tools\check-public-release-readiness.js --require-matrix
```

Use the exact current HEAD for <commit>. The first command verifies every
public route, including the tools hub, at four viewport classes. The second
command is the blocking 7-scenario x 4-viewport overview matrix. The third
verifies all 19 public routes in every scenario at desktop and narrow
viewports. The route-state run validates every DOM/semantic cell but leaves
visual screenshot coverage to the separate 7-scenario x 4-viewport overview
matrix, avoiding hundreds of redundant PNG captures.

`--require-matrix` reads artifacts only; it does not start a browser or rerun
acceptance. It requires exact matrix cells, zero failures, and a direct `HEAD`
commit match. Overview screenshots are derived from the report cells and must
be regular PNG files in that report directory with the exact viewport
dimensions. The route-state report may have `pass: false` because the runner's
overview aggregate is incomplete; its requested cells, `requestedComplete`,
per-cell results, failures, and commit must still be valid. The runtime-browser
report must be all-pass production-runtime evidence for `HEAD`, with
`fixture: false`.

## What it covers

- Python syntax check for `app.py`.
- Safe local backend startup.
- `/api/health`, `/api/snapshot`, and static panel asset availability.
- Public-profile guard rails: readonly diagnostics are disabled, and
  `/api/ip-alias` writes are rejected.
- Browser boot with deterministic injected snapshots, so UI checks do not
  require live RouterOS data.
- Public and private fixture profiles by default.
- Desktop, laptop, tablet, landscape-phone, and portrait-phone probes.
- All 18 public operational routes, including real deep links, distinct page
  content, Back/Forward restoration, focus movement, and unknown-route
  normalization.
- Separate mobile and desktop overview trees with scenario-specific evidence
  checks for normal, fleet, all-offline, no-snapshot, collection-down,
  resource-full, and interfaces-down states.
- Runtime exception and console error detection.
- Horizontal overflow, clipped operational text, minimum readable type,
  touch-target size, and shell overlap detection.
- `--strict-responsive` makes every requested narrow viewport blocking.

## Outputs

Reports and screenshots are written under:

```text
_acceptance/local-predeploy-<timestamp>/
```

The important file is `report.json`. Screenshots are captured for each overview
viewport/profile and for failing sections.

`report.pass` is intentionally false whenever the required public release
matrix for the same commit is incomplete. A route-only run may therefore have
all browser cells green while still reporting an incomplete release matrix;
that is not public-release approval.
