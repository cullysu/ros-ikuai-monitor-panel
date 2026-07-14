# Desktop Overview Product Contract

## User decision

The desktop overview must answer, in order:

1. What is true now?
2. Is the default outlet carrying traffic?
3. Can the observation be trusted?
4. Which module should be inspected next?

The page may expose RouterOS evidence, but evidence must not compete with the judgement rail.

## Status bus

### Normal and fleet

The four visible roles are exactly:

1. `conclusion`: a factual WAN statement, never a broad promise such as "network healthy".
2. `route`: the observed default-outlet result from RouterOS route evidence.
3. `collection`: whether management data can currently be read.
4. `snapshot`: the latest successful observation time and freshness boundary.

### Incident scenes

The four visible roles are exactly:

1. `conclusion`
2. `impact`
3. `collection`
4. `snapshot`

The decision rail immediately below must contain one next action and one credibility boundary.

### No snapshot

The six visible roles are exactly:

1. `conclusion`
2. `device`
3. `routeros`
4. `rest`
5. `ssh`
6. `recent-success`

No WAN rate, resource value, terminal ranking, or route availability may be inferred.

## Structural rules

- Mobile and desktop render trees and styles remain independent.
- Status roles are represented by semantic component classes, not acceptance-only DOM claims.
- Four-cell and six-cell buses fill the available width without placeholder columns.
- Raw RouterOS fields remain collapsed secondary evidence.
- A required scenario or viewport missing from the release matrix makes top-level `pass` false.
- GitHub upload is incomplete until Linux, Windows, and GHCR checks pass for the exact remote SHA.

## Evidence

- Source review: `StatusVerdict`, `desktopOverviewTopbar`, and the RouterOS presentation model.
- Runtime review: role order, visible cell count, clipping, and status-bus width at desktop viewports.
- Matrix review: single, fleet, all-offline, no-snapshot, collection-down, resource-full, and interfaces-down at every required viewport.
