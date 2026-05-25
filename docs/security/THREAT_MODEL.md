# Threat Model

This document describes the security assumptions for the public MVP.

## In Scope

- Trusted LAN use.
- Local host use.
- Reverse-proxy use where the proxy provides authentication and HTTPS.
- Read-only RouterOS state collection.

## Out Of Scope For The Current MVP

- Direct public-internet exposure.
- Built-in multi-user authentication.
- Built-in TLS termination.
- RBAC.
- Automatic RouterOS configuration repair.
- Hosted telemetry or cloud sync.

## Main Risks

### LAN Exposure

The default public install publishes the panel on `0.0.0.0:28646` so trusted
LAN devices can open `http://<panel-host-ip>:28646/`. This is convenient, but it
means other devices on that LAN may be able to reach the panel unless your host
firewall or network segmentation blocks them.

Do not use this default on untrusted networks.

### Credential Storage

If password saving is enabled, RouterOS credentials become local secrets on the
panel host or container data volume. Use a dedicated read-only RouterOS account
and keep the panel host trusted.

### Sensitive Snapshots

RouterOS state can reveal IPs, MAC addresses, hostnames, routes, WAN details,
and traffic patterns. Redact snapshots and screenshots before sharing them.

### Reverse Proxy Headers

`ROS_PANEL_TRUST_PROXY_HEADERS=0` is the default. Set it to `1` only behind a
trusted reverse proxy that controls `X-Forwarded-Host` and
`X-Forwarded-Proto`.

## Safe Deployment Checklist

- Dedicated read-only RouterOS user.
- Panel reachable only from trusted hosts.
- HTTPS/authentication added before cross-network access.
- Password saving disabled unless the panel host is trusted.
- Logs and screenshots redacted before sharing.
- RouterOS backup made before trying RouterOS Container.
