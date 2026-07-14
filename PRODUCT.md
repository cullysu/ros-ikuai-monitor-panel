# Product context

## Promise

This repository provides a public, read-only RouterOS operations console. It helps an operator decide, in order:

1. whether network service is usable;
2. whether the displayed evidence is current enough to use;
3. which WAN/default route carries traffic;
4. which failure has priority and what evidence to inspect next.

It never implies that REST/SSH reachability proves forwarding-plane or business availability, and it never suggests that the panel can modify router configuration.

## Users and repeated task

- Home and small-network operators checking a router from a phone during an incident.
- Operators comparing WAN, route, interface, resource, and collection evidence from a desktop.
- The repeated mobile task is a 5–10 second patrol: identify service state, current rates, snapshot age, and the highest-priority exception without changing tabs.

## Product principles

- Verifiable facts before broad words such as “healthy”, “real-time”, or “trusted”.
- One source and time window for every current/peak/chart relationship.
- Abnormal states change information priority, not only color and copy.
- Mobile and desktop have separate render trees, style ownership, and visual acceptance evidence.
- Missing business evidence removes business numbers; it does not replace them with zeroes or cached values presented as current.
- Required acceptance matrix completeness is blocking. `matrix.complete=false` means top-level failure.

## Non-goals

- Router configuration, remediation, or write controls.
- A RouterOS/iKuai visual clone.
- A health/fitness-style consumer dashboard.
- Five-tab mobile navigation, desktop tables squeezed into a phone, or decorative charts without data semantics.

## Release constraint

Public readiness requires the full scenario × viewport matrix, architecture and public-boundary checks, security/accessibility review, an exact remote SHA, and successful Linux, Windows, and GHCR checks for that SHA.

The mobile contract is specified in [docs/mobile-product-contract.md](docs/mobile-product-contract.md).
