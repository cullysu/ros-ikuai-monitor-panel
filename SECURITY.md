# Security Policy

## Supported Use

The panel is designed for trusted LAN or authenticated reverse-proxy use. Do not
expose it directly to the public internet.

## Baseline Requirements

- Use a dedicated least-privilege RouterOS user.
- Do not use RouterOS `admin`.
- Keep panel credentials out of Git.
- For Docker, keep credentials in local env files or a secrets manager; do not
  bake credentials into images.
- Keep `/etc/default/routeros-panel-*` at mode `0600`.
- Use HTTPS and authentication for any non-local access.
- Use `routeros_only` for public/product-style deployments.
- Treat RouterOS Container deployment as advanced/Beta because it changes live
  RouterOS container, storage, veth, and access-control state.

## Write Boundary

The public profile disables local IP alias writes by default and does not issue
RouterOS configuration changes. If any future feature writes state, it must have
explicit documentation, backup, rollback, and verification.

## Exposure Boundary

Local and Docker examples bind to `127.0.0.1` by default. If you expose the
panel on a LAN address, put it behind an access boundary you understand. If you
expose it across networks, add HTTPS and authentication first.

## Reporting

This is currently a private project. Report security issues through the private
repository owner channel rather than opening public issues with sensitive data.
