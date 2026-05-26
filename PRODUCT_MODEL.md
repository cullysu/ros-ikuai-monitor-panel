# Product Model

This project has two separate axes:

1. **Install paths**: how the panel is started.
2. **Capability modes**: how much RouterOS context the UI exposes.

Do not treat an install path as a product version. The same capability mode can
run from Windows EXE, Docker, local Python, systemd, or RouterOS Container.

## Install Paths

| Path | Purpose | Default stance |
|------|---------|----------------|
| Windows EXE | First trial for non-Python Windows users | Recommended first trial |
| Docker / Compose | Normal localhost deployment on NAS, mini PC, Linux, or OpenWrt Docker | Recommended deployment |
| Local Python | Development and operator debugging | Supported |
| Linux systemd / VM | Managed service when Docker is not allowed | Professional / explicit |
| RouterOS Container | One-box advanced deployment near RouterOS | Beta / advanced |

RouterOS Container is not the default because it changes RouterOS container,
storage, veth, and possibly API/firewall access state.

## Public Delivery Contract

The public product has four delivery modes. They must expose the same read-only
RouterOS-only behavior even though their packaging differs:

| Delivery mode | Runtime default | Browser access contract | Validation |
|---------------|-----------------|-------------------------|------------|
| Docker / Compose | Container binds `0.0.0.0`; host publishes `127.0.0.1:28646` | Open `http://127.0.0.1:28646/` on the Docker host | `docker compose --env-file .env.docker.example config --quiet` |
| Windows EXE | EXE binds `127.0.0.1:28646` | Open `http://127.0.0.1:28646/` on the Windows host | `tools/build-windows-exe.ps1` packaging check |
| Linux systemd / VM | Managed service binds `127.0.0.1:28646` as a non-root service user | Open `http://127.0.0.1:28646/` on the systemd host | `bash -n deploy_linux.sh` and unit marker checks |
| RouterOS Container | Container process binds `0.0.0.0:28646` inside RouterOS container networking and enables localhost Host-forward mode | Open `http://127.0.0.1:28646/` only through a client-local forwarder | `tools/build-routeros-container-archive.sh` archive build |

In all four modes, public defaults are `routeros_only`,
`ROS_PANEL_TRUST_PROXY_HEADERS=0`, local IP-alias writes disabled, admin-session
exposure disabled, no built-in auth/TLS, and no RouterOS configuration writes.
Panel address writes are deployment-owned: Docker, Linux systemd/VM, and
RouterOS Container keep `ROS_PANEL_NETWORK_WRITE_ENABLED=0`; Windows EXE uses a
user-writable sidecar env file and may save loopback-only address settings.

`127.0.0.1` is always the machine running the browser. A different client device
cannot use its own `127.0.0.1` to reach a panel running elsewhere unless that
client also runs an explicit local forwarder or tunnel.
RouterOS Container is the only public mode that enables
`ROS_PANEL_ALLOW_LOCALHOST_HOST_FORWARD=1`; this keeps direct LAN/veth browser
URLs rejected while allowing a client-local forwarder that preserves
`Host: 127.0.0.1:28646` and injects the matching
`ROS_PANEL_LOCALHOST_FORWARD_TOKEN`.

## Capability Modes

| Mode | Audience | UI behavior |
|------|----------|-------------|
| `home` | Small or simple networks | Show risk, router health, WAN status, DNS/DHCP basics, top traffic users |
| `multiwan` | Multi-line, PCDN, or advanced operators | Add WAN binding, route/PCC evidence, CGNAT/UPnP/inbound-readiness evidence, upload saturation |
| `scale_adaptive` | Any network whose lists are too large for cards | Use grouped summaries, search, filters, pagination, and sampled-data labels |
| `private_ops` | Operator's private lab with OpenWrt/Nikki helpers | May show private diagnostics when explicitly enabled |

Public/product-style deployments should default to RouterOS-only semantics.
OpenWrt/Nikki/private helpers are optional advanced diagnostics, not the public
default product.

## Scale Contract

The product does not hard-code a "1 / 8 / 100 WAN" model. Those numbers are only
test examples. The UI must preserve the real counts and then adapt presentation.

Every high-volume list should expose:

- `actualCount` / `totalCount`: the real or best-known total.
- `shownCount`: rows currently rendered or returned.
- `limit`: the current page/sample limit.
- `hasMore`: whether more rows exist.
- `sampled`: whether the rows are a sample rather than a complete set.
- `sampleMethod`: how the sample was selected.
- `bucket`: none, single, small, medium, large, or fleet.

Overview pages should show risk, action, and aggregate health first. Full detail
belongs in searchable, grouped, paged, or virtualized detail surfaces.

## UI Information Architecture

The public UI optimizes for practical triage rather than decorative dashboards:

- **Usability**: the first screen should answer "what is wrong?" and "what do I
  do next?", then route users into the right detail page.
- **Visibility**: search, filters, page windows, total counts, and sample status
  must be visible while the user works, not hidden in developer-only metadata.
- **Consistency**: detail pages should share the same search/filter/paging
  grammar so users do not relearn controls per section.
- **Applicability**: single-WAN, multi-WAN, and large deployments should keep the
  same product model but adapt density and page size.
- **Simplicity**: overview must not duplicate large detail lists.
- **Feedback**: search and filters must show result counts and provide a clear
  reset action.

## Current Boundaries

- The panel remains read-only for RouterOS configuration.
- The current server is still a single-process snapshot collector. Large-scale
  use should rely on summaries and samples until section APIs and storage are
  split out.
- Built-in auth/TLS/RBAC is not implemented yet. Keep the public deployment on
  `127.0.0.1:28646` unless a future reviewed design adds authenticated remote
  access.
