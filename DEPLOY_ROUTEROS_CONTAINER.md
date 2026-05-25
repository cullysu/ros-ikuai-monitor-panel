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

Build and push an image that matches your RouterOS CPU architecture.

Example for a registry you control:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ghcr.io/YOUR_ORG/routeros-triage-panel:TAG \
  --push .
```

RouterOS devices vary by architecture. Publish only the platforms you have
tested.

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
/container/envs/add name=routeros-triage-env key=ROS_PANEL_BIND value=0.0.0.0
/container/envs/add name=routeros-triage-env key=ROS_PANEL_PORT value=28646
/container/envs/add name=routeros-triage-env key=ROS_PANEL_TARGET_IP value=127.0.0.1
/container/envs/add name=routeros-triage-env key=ROS_PANEL_PROFILE value=routeros_only
/container/envs/add name=routeros-triage-env key=ROS_PANEL_IP_ALIAS_WRITE_ENABLED value=0
/container/envs/add name=routeros-triage-env key=ROS_PANEL_EXPOSE_ADMIN_SESSIONS value=0
/container/envs/add name=routeros-triage-env key=ROS_MONITOR_ROUTER_HOST value=172.18.0.1
/container/envs/add name=routeros-triage-env key=ROS_MONITOR_ROUTER_USER value=ros-panel-readonly
/container/envs/add name=routeros-triage-env key=ROS_MONITOR_ROUTER_PASSWORD value=CHANGE_ME
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

```routeros
/container/config/set registry-url=https://ghcr.io tmpdir=disk1/container-tmp
/container/add remote-image=ghcr.io/YOUR_ORG/routeros-triage-panel:TAG interface=veth-routeros-triage root-dir=disk1/routeros-triage mounts=routeros-triage-data envlist=routeros-triage-env logging=yes
/container/start [find where remote-image~"routeros-triage-panel"]
```

## Verify From RouterOS

Confirm the container is running first:

```routeros
/container/print detail
```

Expected:

- environment contains `ROS_PANEL_BIND=0.0.0.0`
- environment contains `ROS_PANEL_TARGET_IP=127.0.0.1`
- public read-only guardrails are enabled

## Client Access

The documented browser-facing URL remains:

```text
http://127.0.0.1:28646/
```

If the client is not the router/container host, install the localhost alias on
that client and point it at whatever host address can reach the containerized
panel in your topology.

Do not paste generic firewall/NAT rules into a production router. Record current
state, define the target state, create a rollback path, then add the minimum
rule needed for your topology.

## Rollback

Stop and remove only the pieces created for this deployment:

```routeros
/container/stop [find where remote-image~"routeros-triage-panel"]
/container/remove [find where remote-image~"routeros-triage-panel"]
/container/envs/remove [find where name=routeros-triage-env]
/container/mounts/remove [find where name=routeros-triage-data]
/interface/bridge/port/remove [find where interface=veth-routeros-triage]
/interface/veth/remove [find where name=veth-routeros-triage]
/ip/address/remove [find where comment="routeros-triage container gateway"]
/interface/bridge/remove [find where name=bridge-containers]
```

If you changed `/ip/service`, firewall, NAT, routing, DNS, or container
device-mode settings, roll those back using the backup/export you made before
starting.
