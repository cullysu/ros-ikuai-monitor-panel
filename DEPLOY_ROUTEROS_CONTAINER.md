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
/container/envs/add list=routeros-triage-env key=ROS_PANEL_TARGET_IP value=auto
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

Verify the panel from RouterOS before exposing it to users:

```routeros
/tool/fetch url="http://172.18.0.2:28646/api/health" output=user
```

Expected:

- environment contains `ROS_PANEL_BIND=0.0.0.0`
- environment contains `ROS_PANEL_TARGET_IP=auto` or the explicit LAN host/IP
  you selected
- public read-only guardrails are enabled

## Client Access

There are two supported access modes. Pick one and verify it; do not assume LAN
reachability merely because the container is running.

### Mode A: Routed Container Address

If your management host can route to the container subnet, open:

```text
http://172.18.0.2:28646/
```

Verify from that host:

```bash
curl -fsS http://172.18.0.2:28646/api/health
```

### Mode B: Router LAN Address Exposure

If ordinary LAN clients should open the router's LAN address, add one explicit
LAN exposure rule set after recording current firewall/NAT state. Replace
`<router-lan-ip>` and `<trusted-lan-cidr>` before running:

```routeros
/ip/firewall/nat/add chain=dstnat action=dst-nat protocol=tcp dst-address=<router-lan-ip> dst-port=28646 to-addresses=172.18.0.2 to-ports=28646 comment="routeros-triage container panel LAN exposure"
/ip/firewall/filter/add chain=forward action=accept protocol=tcp src-address=<trusted-lan-cidr> dst-address=172.18.0.2 dst-port=28646 comment="routeros-triage container panel LAN exposure"
```

Then clients open:

```text
http://<panel-host-ip>:28646/
```

where `<panel-host-ip>` is normally the RouterOS LAN IP you used in
`dst-address=`.

`http://127.0.0.1:28646/` only works from the same host that is running or
forwarding the panel. If a different client must use that exact address, the
localhost alias helper is optional, not required for normal LAN access.

Rollback the optional LAN exposure:

```routeros
/ip/firewall/nat/remove [find where comment="routeros-triage container panel LAN exposure"]
/ip/firewall/filter/remove [find where comment="routeros-triage container panel LAN exposure"]
```

Do not paste generic firewall/NAT rules into a production router without
checking current state. Record current NAT/filter rules first, define the target
state, keep the comments above unchanged for rollback, then verify:

```bash
curl -fsS http://<panel-host-ip>:28646/api/health
```

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
