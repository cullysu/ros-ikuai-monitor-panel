# Overview framework migration bridge

This note documents the bridge that lets the new framework mount coexist with
the current legacy overview entry.

## Goal

- Add a framework mount contract without changing `public/index.html` yet.
- Keep the static gate split between the HTML shell and the legacy assets during rollout.
- Keep the legacy static overview recoverable during rollout.
- Make the framework mount callable from `window` for future host wiring.

## Public API

The bridge exposes these globals once the module is loaded:

- `window.mountRouterOverviewPanel(container, snapshot, options)`
- `window.unmountRouterOverviewPanel(container)`

The mount call returns a handle:

```ts
{
  container: HTMLElement;
  host: HTMLDivElement;
  snapshot: unknown;
  options: Readonly<RouterOverviewPanelMountOptions>;
  unmount(): void;
}
```

## Mount lifecycle

1. The bridge snapshots the container's current child nodes.
2. It replaces the container contents with a framework host node.
3. It mounts the React panel into that host.
4. The handle's `unmount()` restores the original child nodes when legacy
   fallback is enabled.

If mount fails, the bridge restores the original legacy children before
rethrowing the error.

## Legacy fallback preservation

The default behavior is to keep the current static overview markup recoverable.
That means:

- the bridge does not delete the old DOM permanently,
- `unmount()` puts the legacy children back,
- and a failed mount also returns the container to its pre-mount state.

This keeps the static page available while the framework host is introduced in
parallel. The legacy path remains the safety net until the host page is updated
to call the new mount API directly.

In practice, the rollout is a framework split:

- `public/index.html` remains the shell that the static gate reads first.
- `public/assets/legacy/panel-legacy.css` and `public/assets/legacy/panel-legacy.js`
  remain the legacy-only surface the gate appends for coverage.
- The framework mount is introduced beside that split instead of replacing the
  legacy path in one step.
- The shell stays thin: chart judgement markers (`data-overview-judgement-chart`,
  `ro-judgement-chart`, `data-overview-chart-has-current`) must live in the
  React/Vite framework source, not inline in `public/index.html`.
- The lite acceptance matrix stays fixed to the overview scenarios
  `single,fleet,all-offline,no-snapshot,collection-down,resource-full,interfaces-down`
  so framework and redline coverage stay aligned across release checks.

If a caller wants a throwaway framework mount, it can pass
`preserveLegacyFallback: false`. That is not the default.

## Example host snippet

The host page can stay minimal and still keep the old markup intact until the
bridge is in place:

```html
<div id="overview-panel-shell">
  <!-- legacy static overview markup stays here for now -->
</div>

<script type="module">
  import { mountRouterOverviewPanel } from "/src/panel-framework/legacyBridge.ts";

  const container = document.getElementById("overview-panel-shell");
  const snapshot = window.__PANEL_TEST_SNAPSHOT__ ?? null;

  const panel = mountRouterOverviewPanel(container, snapshot, {
    preserveLegacyFallback: true,
    hostId: "router-overview-panel-root",
  });

  window.addEventListener("beforeunload", () => panel.unmount(), { once: true });
</script>
```

## Migration notes

- Keep `public/index.html` unchanged until the framework host is validated.
- Route new host wiring through `window.mountRouterOverviewPanel(...)`.
- Use the handle's `unmount()` when the panel needs to be swapped out or
  cleaned up.
- Once the host page is ready, the same bridge can replace the legacy static
  fallback in a controlled step instead of a big-bang cutover.
