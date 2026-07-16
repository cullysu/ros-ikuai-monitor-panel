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

Saved profiles never contain RouterOS passwords. Environment files and
deployment secret stores that prefill a password remain sensitive and must be
kept outside Git with restricted access. Use a dedicated read-only RouterOS
account.

### Router Transport Identity

RouterOS REST uses verified HTTPS by default. Plain HTTP exposes Basic
credentials in transit, while disabled certificate verification removes server
identity validation; both require explicit acknowledgement and are never silent
fallbacks. SSH requires explicit SHA-256 host-key pinning before password
authentication and blocks a later mismatch.

### Sensitive Snapshots

RouterOS state can reveal IPs, MAC addresses, hostnames, routes, WAN details,
and traffic patterns. Redact snapshots and screenshots before sharing them.

## Safe Deployment Checklist

- Dedicated read-only RouterOS user.
- Panel reachable at `http://127.0.0.1:28646/`.
- Non-loopback browser URLs fail or return `403`.
- Saved profile contains no RouterOS password.
- RouterOS REST uses verified HTTPS unless an insecure mode was explicitly
  reviewed and acknowledged.
- RouterOS SSH host-key fingerprint is verified and pinned.
- Logs and screenshots redacted before sharing.
- RouterOS backup made before trying RouterOS Container.
