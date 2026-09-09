# Credential Handling

The panel needs RouterOS credentials to collect state. Treat those credentials
as sensitive.

## Recommended RouterOS Account

- Create a dedicated RouterOS user for the panel.
- Do not use `admin`.
- Grant only the read permissions needed for your deployment.
- If RouterOS SSH or API has `allowed-address`, allow only the panel host or
  the source address RouterOS sees from the panel container.

## Saving Passwords

Password saving is opt-in. If enabled, saved RouterOS logins are stored on the
panel host or in the container data volume as local secrets. This is meant for a
trusted single host or controlled LAN environment.

Do not enable password saving on:

- shared desktops
- untrusted VMs
- public demo hosts
- machines where other users can read the panel data directory

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
