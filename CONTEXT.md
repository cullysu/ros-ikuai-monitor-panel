# Router Monitoring Overview

This context defines the product language used to turn RouterOS collection evidence into a public, read-only network overview.

## Language

**Overview Scenario**:
A named operating condition that determines which network judgement and evidence receive visual priority.
_Avoid_: Test case, theme

**Desktop Scene**:
The ordered main, side, and bottom rails selected for one **Overview Scenario**.
_Avoid_: Desktop page, dashboard layout

**Network Judgement**:
A concise, user-facing conclusion about availability, impact, credibility, and the next investigation target.
_Avoid_: Status message, health score

**Evidence Chain**:
The RouterOS, route, collection, snapshot, interface, resource, or terminal facts supporting a **Network Judgement**.
_Avoid_: Raw dump, diagnostics table

**Resource Evidence**:
The threshold, sustained-window, connection-pressure, interface-throughput, and cache observations supporting a resource **Network Judgement**.
_Avoid_: Resource card, CPU table

**Credibility Boundary**:
The explicit limit on which observations remain trustworthy when collection or snapshots are degraded.
_Avoid_: Disclaimer, warning text

**Mobile Module View**:
A dedicated, touch-first WAN, interface, terminal, or collection-log view selected from the mobile bottom navigation. It presents a concise summary and one flat evidence list without reusing a desktop scene.
_Avoid_: Hash target, compressed desktop page, decorative tab

## Relationships

- An **Overview Scenario** selects exactly one **Desktop Scene**.
- A **Desktop Scene** gives the **Network Judgement** priority over its supporting **Evidence Chain**.
- **Resource Evidence** is one focused part of an **Evidence Chain**.
- A degraded **Evidence Chain** narrows the **Credibility Boundary** without automatically changing forwarding-plane availability.
- The mobile home selects a **Mobile Module View** in place; selecting a module replaces the home decision surface while preserving the device header and bottom navigation.

## Example dialogue

> **Dev:** "When the snapshot is missing, should the **Desktop Scene** keep showing WAN rates?"
> **Domain expert:** "No. The **Credibility Boundary** hides those business observations and keeps only the collection **Evidence Chain** visible."

## Flagged ambiguities

- "状态" previously referred to device reachability, collection credibility, and business availability; use **Network Judgement** for the public conclusion and name the supporting plane explicitly.
