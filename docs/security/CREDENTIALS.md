# Credential Handling

The panel needs RouterOS credentials to collect state. Treat those credentials
as sensitive.

## Recommended RouterOS Account

- Create a dedicated RouterOS user for the panel.
- Do not use `admin`.
- Grant only the read permissions needed for your deployment.
- If RouterOS SSH or API has `allowed-address`, allow only the panel host or
  the source address RouterOS sees from the panel container.

## Password And Profile Storage

The panel never writes RouterOS passwords to its saved-profile store. A saved
profile contains the RouterOS address, REST/SSH ports, TLS-verification choice,
username, and the explicitly verified SSH SHA-256 host-key fingerprint. A new
process session requires the password again unless the operator supplies it
through a protected deployment secret or environment file.

Treat any file or secret store that supplies `ROS_MONITOR_ROUTER_PASSWORD` as a
credential store: keep it outside Git, restrict filesystem permissions, and do
not use it on shared or untrusted hosts.

## Transport Identity

- RouterOS REST defaults to HTTPS with certificate verification enabled.
- Plain HTTP and disabled TLS verification each require an explicit risk
  acknowledgement; there is no automatic downgrade.
- The host field accepts an IP address or hostname, not a URL, so the selected
  transport cannot be silently reinterpreted.
- First SSH contact stops before password authentication and shows the host-key
  algorithm and SHA-256 fingerprint. Verify it through a separate trusted
  channel before pinning it.
- A later SSH host-key mismatch blocks the connection.

## Sharing Logs And Issues

Before opening an issue or sharing a screenshot, remove:

- RouterOS passwords
- SSH/API usernames if sensitive
- public IPs
- private hostnames
- MAC addresses
- PPPoE or ISP account data
- full RouterOS exports

## Rotation

If a password was pasted into an issue, screenshot, chat, or public log, rotate
that RouterOS password immediately and remove the exposed material where
possible.
