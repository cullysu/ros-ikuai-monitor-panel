# Threat Model

This document describes the security assumptions for the public MVP.

## In Scope

- Local host use.
- Read-only RouterOS state collection.

## Out Of Scope For The Current MVP

- Direct public-internet exposure.
- Direct LAN browser exposure.
- Built-in multi-user authentication.
- Built-in TLS termination.
- RBAC.
- Reverse-proxy/cross-network publication.
- Automatic RouterOS configuration repair.
- Hosted telemetry or cloud sync.

## Main Risks

### Localhost-only Default

The default public install publishes the panel only on `127.0.0.1:28646`. Other
IP browser entrypoints should not be able to reach the panel. The backend also
rejects non-loopback `Host` headers.

### Credential Storage

If password saving is enabled, RouterOS credentials become local secrets on the
panel host or container data volume. Use a dedicated read-only RouterOS account
and keep the panel host trusted.

### Sensitive Snapshots

RouterOS state can reveal IPs, MAC addresses, hostnames, routes, WAN details,
and traffic patterns. Redact snapshots and screenshots before sharing them.

## Safe Deployment Checklist

- Dedicated read-only RouterOS user.
- Panel reachable at `http://127.0.0.1:28646/`.
- Non-loopback browser URLs fail or return `403`.
- Password saving disabled unless the panel host is trusted.
- Logs and screenshots redacted before sharing.
- RouterOS backup made before trying RouterOS Container.
