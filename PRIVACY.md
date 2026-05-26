# Privacy And Data Collection

This panel reads RouterOS state so it can explain operational risk. That state
can contain sensitive network information.

## Data The Panel May Read

Depending on RouterOS features and enabled panel sections, snapshots may include:

- Router identity, RouterOS version, uptime, CPU, memory, disk, and connection
  pressure.
- Interfaces, WAN status, traffic counters, drops, errors, IP addresses, IPv6
  addresses, and neighbors.
- Routes, default-route evidence, routing marks, PPPoE clients, DHCP clients,
  DHCP servers, DHCP leases, DNS settings, and DNS static entry counts.
- ARP entries, firewall connection tracking summaries, logs, security hints,
  and sampled terminal/client information.

These values can reveal private IPs, public IPs, MAC addresses, hostnames, ISP
details, network topology, and usage patterns. Redact them before sharing logs,
screenshots, JSON snapshots, or issue reports.

## Storage

The panel keeps local state under its data directory or container volume. Saved
RouterOS logins are local secrets and should be used only on trusted hosts.

Storage location depends on the delivery mode:

- Docker / Compose stores mutable panel data in the `routeros-triage-data`
  volume.
- Windows EXE stores local files next to the extracted EXE unless configured
  otherwise.
- Linux systemd / VM stores mutable panel data under the deployed app `data/`
  directory owned by the non-root service user.
- RouterOS Container stores mutable panel data in the configured container
  mount.

## Network Access

The public profile is RouterOS-only by default. Optional private diagnostics for
OpenWrt/Nikki/local lab integrations are disabled unless explicitly configured.

Latency checks may contact a configured target. Keep that target appropriate for
your environment.

## What The Project Does Not Collect

The project does not include hosted telemetry, cloud upload, or maintainer-side
data collection. If you open a GitHub issue, anything you paste there is your
responsibility to redact.
