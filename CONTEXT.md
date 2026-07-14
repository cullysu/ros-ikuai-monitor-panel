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

**Mobile Operations Home**:
A dedicated, touch-first decision surface that combines the current **Network Judgement**, four scenario-specific facts, valid traffic evidence, and the **Credibility Boundary** in one continuous screen. It never renders or restyles a **Desktop Scene**.
_Avoid_: Compressed desktop page, card dashboard, decorative tab shell

**Mobile Evidence Detail**:
A full-screen drill-down reached from the single detail row on the **Mobile Operations Home**. It preserves device context, provides a predictable back action, and contains the lower-priority **Evidence Chain** without introducing bottom navigation.
_Avoid_: Modal, audit dump, top-level tab destination

## Relationships

- An **Overview Scenario** selects exactly one **Desktop Scene**.
- A **Desktop Scene** gives the **Network Judgement** priority over its supporting **Evidence Chain**.
- **Resource Evidence** is one focused part of an **Evidence Chain**.
- A degraded **Evidence Chain** narrows the **Credibility Boundary** without automatically changing forwarding-plane availability.
- The **Mobile Operations Home** owns its render tree, styles, scenario ordering, and trust wording independently from every **Desktop Scene**.
- The **Mobile Evidence Detail** is subordinate to the home judgement; it never splits network and collection evidence into competing top-level destinations.

## Example dialogue

> **Dev:** "When the snapshot is missing, should the **Desktop Scene** keep showing WAN rates?"
> **Domain expert:** "No. The **Credibility Boundary** hides those business observations and keeps only the collection **Evidence Chain** visible."

## Flagged ambiguities

- "状态" previously referred to device reachability, collection credibility, and business availability; use **Network Judgement** for the public conclusion and name the supporting plane explicitly.
