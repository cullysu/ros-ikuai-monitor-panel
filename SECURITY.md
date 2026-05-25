# Security Policy

## Supported Use

The panel is designed for trusted LAN or authenticated reverse-proxy use. Do
not expose it directly to the public internet.

## Supported Versions

This project is still an early public MVP. Security fixes are expected to land
on `main` until versioned releases are established.

## Baseline Requirements

- Use a dedicated least-privilege RouterOS user.
- Do not use RouterOS `admin`.
- Keep panel credentials out of Git, issue text, screenshots, and logs.
- For Docker, keep credentials in local env files, the panel data volume, or a
  secrets manager; do not bake credentials into images.
- Keep systemd environment files such as `/etc/default/routeros-panel-*` at
  mode `0600`.
- Use HTTPS and authentication for any non-local or cross-network access.
- Use `routeros_only` for public/product-style deployments.
- Treat RouterOS Container deployment as advanced/Beta because it changes live
  RouterOS container, storage, veth, and access-control state.

## Credential Storage

If you choose to remember RouterOS logins in the panel, treat the panel host or
container volume as a local secrets store. Saved credentials are meant for a
trusted single host or controlled LAN environment, not for shared untrusted
machines.

More detail: [docs/security/CREDENTIALS.md](./docs/security/CREDENTIALS.md).

## Write Boundary

The public profile disables local IP alias writes by default and does not issue
RouterOS configuration changes. If any future feature writes state, it must have
explicit documentation, backup, rollback, and verification.

## Exposure Boundary

Current public install examples publish the panel on `0.0.0.0:28646` so trusted
LAN devices can open:

```text
http://<panel-host-ip>:28646/
```

On the panel host itself, this also works:

```text
http://127.0.0.1:28646/
```

This is a trusted-LAN default, not a public-internet default. If access leaves a
trusted LAN, add HTTPS and authentication first.

The optional localhost alias helper is a client-side convenience only. It is
not required for normal LAN access and should not be treated as an access
control mechanism.

More detail: [docs/security/THREAT_MODEL.md](./docs/security/THREAT_MODEL.md).

## Reporting

Do not open public issues with vulnerability details, credentials, or sensitive
network data. Use the repository security policy / private vulnerability report
path when available, or contact the repository owner privately.
