# RouterOS Container Deployment

RouterOS Container is an advanced/Beta deployment path for operators who want
the panel to run close to the router without a separate VM.

Do not treat this as the default install path. It changes RouterOS container,
storage, virtual interface, and possibly firewall/API access state. Read and
adapt every command before running it.

Official references:

- <https://help.mikrotik.com/docs/display/ROS/Container>
- <https://help.mikrotik.com/docs/display/ROS/Device-mode>

## Product Guidance

Use this path only if:

- your RouterOS device supports containers
- you have enough RAM and persistent storage
- you can recover the router if a container or veth setup is wrong
- you already understand RouterOS bridge, address, firewall, and service
  restrictions

For most users, Docker on a NAS/Linux host is the safer deployment path.

## Current State To Record First

Before changing RouterOS, export and save:

```routeros
/export show-sensitive file=before-routeros-triage-container
/system/backup/save name=before-routeros-triage-container
/system/resource/print
/interface/print
/ip/address/print
/ip/firewall/filter/print
/ip/firewall/nat/print
/ip/service/print
/container/print detail
```

Download the `.rsc` and `.backup` files before continuing.

## Image Build

The default public path is to build a RouterOS-friendly archive locally from
the source tree, then upload that tar to RouterOS storage. This avoids making
RouterOS Container installs depend on any registry package visibility.

Build an archive that matches your RouterOS CPU architecture:

```bash
bash tools/build-routeros-container-archive.sh \
  --platform linux/amd64 \
  --output routeros-triage-panel-routeros.tar
```

Use `--platform linux/arm64` or `--platform linux/arm/v7` when that matches
your RouterOS device.

Build from the repository root so the Dockerfile copies the current `app.py`
and `public/` assets into the image. Do not build from an unpacked `dist/`,
`_staging_*`, or other static snapshot; recent public UI fixes ship through the
repository `public/` directory and `COPY public ./public`.

Optional registry image, only after anonymous pulls are confirmed to work:

```text
ghcr.io/cullysu/ros-ikuai-monitor-panel:main
```

Verify before using `remote-image=`:

```bash
docker pull ghcr.io/cullysu/ros-ikuai-monitor-panel:main
```

Example for your own public registry or fork:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ghcr.io/YOUR_ORG/ros-ikuai-monitor-panel:TAG \
  --push .
```

RouterOS devices vary by architecture. Publish only the platforms you have
tested. If the registry pull fails or requires authentication, use the local
archive path above instead of `remote-image=`.

### Archive Compatibility

RouterOS Container import is stricter than many desktop Docker tools. When you
use `/container/add file=...`, the archive should look like a legacy Docker
archive:

- top-level `manifest.json`
- top-level `repositories`
- one directory per layer, each containing `layer.tar`

If the tar instead contains `oci-layout`, `index.json`, and `blobs/sha256/...`,
it is an OCI layout archive. On RouterOS 7.20.x this shape can fail during
import with an error like `failed to load next entry`.

The helper script above already emits a Docker archive through `docker save`.
If you produce an archive through another tool and need offline/local import,
verify or convert the archive first:

```bash
python tools/convert-oci-to-routeros-docker-archive.py \
  routeros-triage-panel-oci.tar \
  routeros-triage-panel-routeros.tar \
  --tag routeros-triage-panel:routeros \
  --platform linux/amd64
```

Then upload the converted tar to RouterOS storage and import it with `file=`.
Use `--platform linux/arm64` or another matching platform for non-amd64
RouterOS devices.

Before publishing a release image, run the local packaging preflight from a
workstation:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\check-packaging-preflight.ps1 -SkipDocker -SkipInstall
```

The preflight is local-only. It checks that public UI fix markers are present
and that shared deployment paths, including the RouterOS Container image path,
use the repository `public/` assets.

## RouterOS Safety Gates

RouterOS container support may require a package install, device-mode setting,
physical confirmation, and reboot depending on your device and RouterOS version.
Follow MikroTik's official documentation for your platform.

Stop here if:

- you do not have a fresh RouterOS backup
- you do not have console/physical recovery access
- your router is already CPU, RAM, disk, or conntrack constrained
- you cannot explain how to remove the veth/container pieces afterward

## Template Network Shape

This example keeps the container in a small dedicated subnet for RouterOS-side
container networking. The panel process listens on all container interfaces:

- RouterOS container bridge: `172.18.0.1/24`
- Container veth: `172.18.0.2/24`
- First-run panel listener inside the container: `0.0.0.0:28646`

Adapt names and subnets to your router. Do not reuse an existing subnet.

```routeros
/interface/bridge/add name=bridge-containers comment="routeros-triage container bridge"
/ip/address/add address=172.18.0.1/24 interface=bridge-containers comment="routeros-triage container gateway"
/interface/veth/add name=veth-routeros-triage address=172.18.0.2/24 gateway=172.18.0.1
/interface/bridge/port/add bridge=bridge-containers interface=veth-routeros-triage
```

If your RouterOS API service is restricted by address, the container source IP
must be allowed to read RouterOS. Do not broaden API access to the whole LAN.

## Environment Template

```routeros
/container/envs/add list=routeros-triage-env key=ROS_PANEL_BIND value=0.0.0.0
/container/envs/add list=routeros-triage-env key=ROS_PANEL_PORT value=28646
/container/envs/add list=routeros-triage-env key=ROS_PANEL_TARGET_IP value=127.0.0.1
/container/envs/add list=routeros-triage-env key=ROS_PANEL_PROFILE value=routeros_only
/container/envs/add list=routeros-triage-env key=ROS_PANEL_IP_ALIAS_WRITE_ENABLED value=0
/container/envs/add list=routeros-triage-env key=ROS_PANEL_EXPOSE_ADMIN_SESSIONS value=0
/container/envs/add list=routeros-triage-env key=ROS_MONITOR_ROUTER_HOST value=172.18.0.1
/container/envs/add list=routeros-triage-env key=ROS_MONITOR_ROUTER_USER value=ros-panel-readonly
/container/envs/add list=routeros-triage-env key=ROS_MONITOR_ROUTER_PASSWORD value=CHANGE_ME
```

The password above is a placeholder. Do not store a privileged RouterOS password
here.

## Persistent Data Mount

Use external or persistent storage recommended for your device:

```routeros
/container/mounts/add name=routeros-triage-data src=disk1/routeros-triage-data dst=/app/data
```

The exact `src=` path depends on your RouterOS storage layout.

## Add And Start Container

Local archive, default public path:

Upload `routeros-triage-panel-routeros.tar` to RouterOS storage, then run:

```routeros
/container/add file=routeros-triage-panel-routeros.tar interface=veth-routeros-triage root-dir=disk1/routeros-triage mounts=routeros-triage-data envlist=routeros-triage-env logging=yes
/container/start [find where root-dir="disk1/routeros-triage"]
```

Optional registry image, only after the GHCR package is public and anonymous
pulls work:

```routeros
/container/config/set registry-url=https://ghcr.io tmpdir=disk1/container-tmp
/container/add remote-image=ghcr.io/cullysu/ros-ikuai-monitor-panel:main interface=veth-routeros-triage root-dir=disk1/routeros-triage mounts=routeros-triage-data envlist=routeros-triage-env logging=yes
/container/start [find where root-dir="disk1/routeros-triage"]
```

## Verify From RouterOS

Confirm the container is running first:

```routeros
/container/print detail
```

The container-side address is not a browser URL. The backend includes a
`Host header guard`, so direct access by `172.18.0.2` or a router LAN address
is not the public verification path.

Expected:

- environment contains `ROS_PANEL_BIND=0.0.0.0`
- environment contains `ROS_PANEL_TARGET_IP=127.0.0.1`
- public read-only guardrails are enabled

## Client Access

The default public browser URL is still:

```text
http://127.0.0.1:28646/
```

Do not present the container veth address as the browser URL. `172.18.0.2` is
only the RouterOS/container-side service address used for health checks and
forwarding.

Because a browser's `127.0.0.1` is always the client machine itself, RouterOS
Container access needs a local forwarder on the client that is opening the UI.
Use one of these patterns from the client:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\connect-routeros-container-localhost.ps1 `
  -TargetHost 172.18.0.2 `
  -TargetPort 28646 `
  -ListenPort 28646
```

```bash
python3 tools/connect-routeros-container-localhost.py \
  --target-host 172.18.0.2 \
  --target-port 28646 \
  --listen-port 28646
```

Then open:

```text
http://127.0.0.1:28646/
```

Verify from that client:

```bash
curl -fsS http://127.0.0.1:28646/api/health
```

If you want to prevent other LAN clients from bypassing the localhost forwarder
and opening the container veth address directly, restrict forwarding to the
management client(s) that run the local forwarder:

```routeros
/ip/firewall/address-list/add list=routeros_triage_panel_localhost_forwarder_clients address=<management-client-ip>
/ip/firewall/filter/add chain=forward action=drop protocol=tcp src-address-list=!routeros_triage_panel_localhost_forwarder_clients dst-address=172.18.0.2 dst-port=28646 comment="routeros-triage-panel-block-direct-non-localhost-lan-access"
```

Rollback:

```routeros
/ip/firewall/filter/remove [find where comment="routeros-triage-panel-block-direct-non-localhost-lan-access"]
/ip/firewall/address-list/remove [find where list=routeros_triage_panel_localhost_forwarder_clients]
```

Do not add NAT or firewall rules that turn the RouterOS LAN address into a
panel browser URL. The public project contract stays localhost-only.

## Rollback

Stop and remove only the pieces created for this deployment:

```routeros
/container/stop [find where root-dir="disk1/routeros-triage"]
/container/remove [find where root-dir="disk1/routeros-triage"]
/container/envs/remove [find where list=routeros-triage-env]
/container/mounts/remove [find where name=routeros-triage-data]
/interface/bridge/port/remove [find where interface=veth-routeros-triage]
/interface/veth/remove [find where name=veth-routeros-triage]
/ip/address/remove [find where comment="routeros-triage container gateway"]
/interface/bridge/remove [find where name=bridge-containers]
```

If you changed `/ip/service`, firewall, NAT, routing, DNS, or container
device-mode settings, roll those back using the backup/export you made before
starting.
