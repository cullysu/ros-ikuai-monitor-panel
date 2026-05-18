(() => {
  const FLAG = "__panelProfessionalRedesignV1";
  const STYLE_ID = "panel-professional-redesign-style";
  const ROOT_CLASS = "panel-professional-redesign";
  const READONLY_FLUID_CLASS = "panel-professional-redesign-readonly-fluid";
  const WAN_DENSITY_SINGLE_CLASS = "wan-density-single";
  const WAN_DENSITY_MULTI_CLASS = "wan-density-multi";

  if (window[FLAG]) return;
  window[FLAG] = true;

  const deployChannel = String(document.body?.dataset?.deployChannel || '').trim();
  const publicProfile = String(document.body?.dataset?.publicProfile || '').trim() === 'true';
  if (publicProfile || deployChannel !== '.3.7-preview') {
    return;
  }

  const STYLE_TEXT = `
    html.${ROOT_CLASS},
    body.${ROOT_CLASS} {
      --pro-page-bg: #eef3f8;
      --pro-page-bg-deep: #e7edf5;
      --pro-shell-bg: #f6f9fc;
      --pro-surface: #ffffff;
      --pro-surface-soft: #f7fafe;
      --pro-surface-tint: #f1f5fa;
      --pro-rail-bg: #121a28;
      --pro-rail-bg-soft: #182336;
      --pro-border: #d7e0ea;
      --pro-border-strong: #c8d3df;
      --pro-border-soft: #e7edf4;
      --pro-text: #162234;
      --pro-text-soft: #4c6178;
      --pro-text-dim: #73859b;
      --pro-accent: #2a63d4;
      --pro-accent-soft: #e8f0ff;
      --pro-accent-glow: rgba(42, 99, 212, 0.14);
      --pro-success: #23804f;
      --pro-warn: #a26c19;
      --pro-danger: #b54d4d;
      --pro-shadow: 0 14px 32px rgba(17, 28, 45, 0.08);
      --pro-shadow-soft: 0 6px 18px rgba(17, 28, 45, 0.05);
      --pro-radius: 14px;
      --pro-radius-soft: 12px;
      --pro-radius-tight: 10px;
      --pro-rail-width: 60px;
      --pro-sidebar-width: 188px;
      --pro-shell-min-width: 1680px;
      --app-wide-min-width: var(--pro-shell-min-width);
    }

    html.${ROOT_CLASS} {
      min-width: var(--pro-shell-min-width);
      background:
        linear-gradient(180deg, var(--pro-page-bg) 0%, var(--pro-page-bg-deep) 100%);
    }

    body.${ROOT_CLASS} {
      min-width: var(--pro-shell-min-width);
      overflow-x: auto;
      color: var(--pro-text);
      background:
        radial-gradient(circle at 0 0, rgba(42, 99, 212, 0.08), transparent 26%),
        radial-gradient(circle at 100% 18%, rgba(20, 50, 94, 0.08), transparent 20%),
        linear-gradient(180deg, var(--pro-page-bg) 0%, var(--pro-page-bg-deep) 100%);
      font-family: "Segoe UI Variable Text", "Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif;
      font-variant-numeric: tabular-nums;
    }

    html.${ROOT_CLASS}.${READONLY_FLUID_CLASS},
    body.${ROOT_CLASS}.${READONLY_FLUID_CLASS} {
      min-width: 0 !important;
      width: 100% !important;
    }

    body.${ROOT_CLASS}.${READONLY_FLUID_CLASS} {
      overflow-x: hidden !important;
    }

    body.${ROOT_CLASS}.${READONLY_FLUID_CLASS} .app.ik-shell {
      min-width: 0 !important;
      width: 100% !important;
    }

    body.${ROOT_CLASS}.${READONLY_FLUID_CLASS} .app.ik-shell .frame,
    body.${ROOT_CLASS}.${READONLY_FLUID_CLASS} .app.ik-shell.home-sidebar-hidden .frame {
      min-width: 0 !important;
      width: auto !important;
    }

    body.${ROOT_CLASS}.${READONLY_FLUID_CLASS} .readonly-diagnostics-section,
    body.${ROOT_CLASS}.${READONLY_FLUID_CLASS} .readonly-diagnostics-root,
    body.${ROOT_CLASS}.${READONLY_FLUID_CLASS} .readonly-diagnostics-shell,
    body.${ROOT_CLASS}.${READONLY_FLUID_CLASS} .readonly-workbench-body,
    body.${ROOT_CLASS}.${READONLY_FLUID_CLASS} .readonly-readable-flow,
    body.${ROOT_CLASS}.${READONLY_FLUID_CLASS} .readonly-feature-sticky,
    body.${ROOT_CLASS}.${READONLY_FLUID_CLASS} .readonly-summary-sticky,
    body.${ROOT_CLASS}.${READONLY_FLUID_CLASS} .readonly-section-band,
    body.${ROOT_CLASS}.${READONLY_FLUID_CLASS} .readonly-band-body,
    body.${ROOT_CLASS}.${READONLY_FLUID_CLASS} .readonly-feature-nav,
    body.${ROOT_CLASS}.${READONLY_FLUID_CLASS} .readonly-global-strip,
    body.${ROOT_CLASS}.${READONLY_FLUID_CLASS} .readonly-summary-grid {
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
      box-sizing: border-box !important;
    }

    body.${ROOT_CLASS}.${READONLY_FLUID_CLASS} .readonly-diagnostics-shell > .ops-page-stack,
    body.${ROOT_CLASS}.${READONLY_FLUID_CLASS} .readonly-band-body > *,
    body.${ROOT_CLASS}.${READONLY_FLUID_CLASS} .readonly-readable-flow > * {
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
      box-sizing: border-box !important;
    }

    body.${ROOT_CLASS}.${READONLY_FLUID_CLASS} .readonly-feature-brief {
      grid-template-columns: minmax(240px, 0.72fr) minmax(0, 1.28fr) !important;
      width: 100% !important;
      max-width: none !important;
    }

    body.${ROOT_CLASS}.${READONLY_FLUID_CLASS} .readonly-selfcheck-card-wide .readonly-selfcheck-layout {
      grid-template-columns: minmax(240px, 0.72fr) minmax(0, 1.28fr) !important;
      width: 100% !important;
      max-width: none !important;
    }

    body.${ROOT_CLASS}.${READONLY_FLUID_CLASS} .readonly-uneven-grid {
      grid-template-columns: minmax(0, 1.25fr) minmax(220px, 0.75fr) !important;
      width: 100% !important;
      max-width: none !important;
    }

    body.${ROOT_CLASS}::before {
      background:
        linear-gradient(90deg, rgba(255, 255, 255, 0.22) 0, rgba(255, 255, 255, 0.22) 1px, transparent 1px, transparent 72px),
        linear-gradient(180deg, rgba(18, 26, 40, 0.02), rgba(18, 26, 40, 0));
      opacity: 0.55;
    }

    body.${ROOT_CLASS} .app.ik-shell {
      grid-template-columns: var(--pro-rail-width) var(--pro-sidebar-width) minmax(0, 1fr) !important;
      min-width: var(--pro-shell-min-width);
      background:
        linear-gradient(
          90deg,
          var(--pro-rail-bg) 0 var(--pro-rail-width),
          var(--pro-shell-bg) var(--pro-rail-width) calc(var(--pro-rail-width) + var(--pro-sidebar-width)),
          transparent calc(var(--pro-rail-width) + var(--pro-sidebar-width))
        ) !important;
    }

    body.${ROOT_CLASS} .app.ik-shell.home-sidebar-hidden {
      grid-template-columns: var(--pro-rail-width) minmax(0, 1fr) !important;
      background:
        linear-gradient(
          90deg,
          var(--pro-rail-bg) 0 var(--pro-rail-width),
          transparent var(--pro-rail-width)
        ) !important;
    }

    body.${ROOT_CLASS} .app.ik-shell .ik-rail {
      position: fixed !important;
      top: 0 !important;
      left: calc(0px - var(--pro-window-scroll-x, 0px)) !important;
      bottom: 0 !important;
      grid-column: 1 !important;
      align-self: start !important;
      width: var(--pro-rail-width) !important;
      min-width: var(--pro-rail-width) !important;
      max-width: var(--pro-rail-width) !important;
      height: 100vh !important;
      overflow-x: hidden !important;
      overflow-y: hidden !important;
      overscroll-behavior: none !important;
      z-index: 8 !important;
      padding: 12px 0 16px !important;
      gap: 12px !important;
      background:
        linear-gradient(180deg, var(--pro-rail-bg) 0%, var(--pro-rail-bg-soft) 100%) !important;
      border-right: 1px solid rgba(198, 213, 232, 0.12) !important;
      box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.03);
    }

    body.${ROOT_CLASS} .app.ik-shell .ik-rail::-webkit-scrollbar {
      display: none;
    }

    body.${ROOT_CLASS} .ik-rail-button,
    body.${ROOT_CLASS} .ik-rail-logo {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      border: 1px solid transparent;
      color: rgba(225, 233, 245, 0.72);
      background: transparent;
      transition:
        background-color 160ms ease,
        border-color 160ms ease,
        color 160ms ease,
        transform 160ms ease,
        box-shadow 160ms ease;
    }

    body.${ROOT_CLASS} .ik-rail-logo {
      height: 34px;
      background: linear-gradient(180deg, #2e67dc 0%, #1c4fb7 100%);
      color: #ffffff;
      box-shadow: 0 8px 18px rgba(28, 79, 183, 0.32);
    }

    body.${ROOT_CLASS} .ik-rail-button:hover,
    body.${ROOT_CLASS} .ik-rail-button.is-active,
    body.${ROOT_CLASS} .ik-rail-logo:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(194, 212, 234, 0.18);
      transform: translateY(-1px);
      box-shadow: 0 8px 18px rgba(9, 15, 26, 0.18);
    }

    body.${ROOT_CLASS} .ik-rail-logo.is-active {
      background: linear-gradient(180deg, #2e67dc 0%, #1c4fb7 100%);
      border-color: transparent;
    }

    body.${ROOT_CLASS} .ik-rail-glyph,
    body.${ROOT_CLASS} .ik-menu-icon {
      border-color: currentColor;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.04) 100%);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
    }

    body.${ROOT_CLASS} .app.ik-shell .sidebar {
      position: fixed !important;
      top: 0 !important;
      left: calc(var(--pro-rail-width) - var(--pro-window-scroll-x, 0px)) !important;
      bottom: 0 !important;
      grid-column: 2 !important;
      align-self: start !important;
      width: var(--pro-sidebar-width) !important;
      min-width: var(--pro-sidebar-width) !important;
      max-width: var(--pro-sidebar-width) !important;
      height: 100vh !important;
      overflow-x: hidden !important;
      overflow-y: auto !important;
      z-index: 7 !important;
      padding: 0 10px 18px !important;
      background:
        linear-gradient(180deg, rgba(248, 250, 253, 0.98) 0%, rgba(243, 247, 251, 0.98) 100%) !important;
      border-right: 1px solid var(--pro-border) !important;
      box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.88);
    }

    body.${ROOT_CLASS} .app.ik-shell .sidebar .ik-brand,
    body.${ROOT_CLASS} .app.ik-shell .sidebar .ik-search-pill {
      display: flex !important;
    }

    body.${ROOT_CLASS} .ik-brand {
      position: sticky;
      top: 0;
      z-index: 4;
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
      padding: 14px 6px 12px;
      margin: 0 -2px 10px;
      border-bottom: 1px solid rgba(200, 211, 223, 0.92);
      background:
        linear-gradient(180deg, rgba(248, 250, 253, 0.98) 0%, rgba(245, 248, 252, 0.94) 100%);
      backdrop-filter: blur(10px);
    }

    body.${ROOT_CLASS} .ik-brand-left {
      justify-content: space-between;
      width: 100%;
      gap: 10px;
    }

    body.${ROOT_CLASS} .ik-brand-title {
      color: var(--pro-text);
      font-size: 20px;
      letter-spacing: -0.04em;
    }

    body.${ROOT_CLASS} .ik-brand-chip {
      height: 22px;
      padding: 0 9px;
      border-color: rgba(42, 99, 212, 0.18);
      background: rgba(42, 99, 212, 0.08);
      color: var(--pro-accent);
      font-size: 11px;
      font-weight: 700;
    }

    body.${ROOT_CLASS} .ik-brand-user {
      width: 28px;
      height: 28px;
      border-radius: 10px;
      background:
        linear-gradient(180deg, rgba(42, 99, 212, 0.12) 0%, rgba(42, 99, 212, 0.04) 100%);
      border: 1px solid rgba(42, 99, 212, 0.12);
    }

    body.${ROOT_CLASS} .ik-search-pill {
      align-items: center;
      justify-content: space-between;
      width: 100%;
      height: 38px;
      padding: 0 12px;
      border-radius: 12px;
      border: 1px solid rgba(200, 211, 223, 0.92);
      background: rgba(255, 255, 255, 0.88);
      color: var(--pro-text-soft);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
      font-size: 12px;
      font-weight: 600;
    }

    body.${ROOT_CLASS} .ik-search-pill strong {
      color: var(--pro-text);
      font-size: 11px;
      letter-spacing: 0.02em;
    }

    body.${ROOT_CLASS} #ikMenuPanel {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    body.${ROOT_CLASS} .nav-label {
      padding: 0 10px 0;
      color: var(--pro-text-dim);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.12em;
    }

    body.${ROOT_CLASS} .ik-menu-item {
      gap: 10px;
      padding: 10px 12px;
      border: 1px solid transparent;
      border-radius: 12px;
      color: var(--pro-text-soft);
      background: transparent;
      transition:
        background-color 160ms ease,
        border-color 160ms ease,
        box-shadow 160ms ease,
        color 160ms ease,
        transform 160ms ease;
    }

    body.${ROOT_CLASS} .ik-menu-item:hover,
    body.${ROOT_CLASS} .ik-menu-item.is-active {
      color: var(--pro-text);
      background: rgba(255, 255, 255, 0.88);
      border-color: rgba(200, 211, 223, 0.92);
      box-shadow: var(--pro-shadow-soft);
      transform: translateY(-1px);
    }

    body.${ROOT_CLASS} .ik-menu-item.is-active .ik-menu-icon,
    body.${ROOT_CLASS} .ik-menu-item:hover .ik-menu-icon {
      color: var(--pro-accent);
      border-color: rgba(42, 99, 212, 0.22);
      background: linear-gradient(180deg, rgba(42, 99, 212, 0.14) 0%, rgba(42, 99, 212, 0.04) 100%);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.7);
    }

    body.${ROOT_CLASS} .ik-menu-copy {
      min-width: 0;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.01em;
    }

    body.${ROOT_CLASS} .app.ik-shell .frame {
      grid-column: 3;
      min-width: calc(var(--pro-shell-min-width) - var(--pro-rail-width) - var(--pro-sidebar-width));
      background: transparent;
    }

    body.${ROOT_CLASS} .app.ik-shell.home-sidebar-hidden .frame {
      grid-column: 2;
      min-width: calc(var(--pro-shell-min-width) - var(--pro-rail-width));
    }

    body.${ROOT_CLASS} .app.ik-shell .topbar {
      padding: 14px 20px 12px !important;
      background:
        linear-gradient(180deg, rgba(246, 249, 252, 0.96) 0%, rgba(243, 247, 251, 0.92) 100%) !important;
      border-bottom: 1px solid rgba(200, 211, 223, 0.88) !important;
      box-shadow: 0 10px 24px rgba(17, 28, 45, 0.05);
      backdrop-filter: blur(14px) saturate(130%);
    }

    body.${ROOT_CLASS} .topbar-header {
      align-items: center;
      gap: 18px;
    }

    body.${ROOT_CLASS} .page-title {
      color: var(--pro-text);
      font-size: 25px;
      font-weight: 800;
      letter-spacing: -0.04em;
      line-height: 1.08;
    }

    body.${ROOT_CLASS} .topbar-actions {
      gap: 10px;
      align-items: flex-end;
    }

    body.${ROOT_CLASS} .toolbar-line,
    body.${ROOT_CLASS} .refresh-toolbar {
      gap: 10px;
      align-items: center;
    }

    body.${ROOT_CLASS} .deploy-pill,
    body.${ROOT_CLASS} .update-pill,
    body.${ROOT_CLASS} .refresh-meta {
      border: 1px solid rgba(200, 211, 223, 0.92);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.84);
      color: var(--pro-text-soft);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.92);
    }

    body.${ROOT_CLASS} .deploy-pill,
    body.${ROOT_CLASS} .update-pill {
      height: 28px;
      padding: 0 12px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    body.${ROOT_CLASS} .refresh-meta {
      height: 34px;
      padding: 0 12px;
      font-size: 11px;
      font-weight: 700;
    }

    body.${ROOT_CLASS} #refreshModeText {
      color: var(--pro-text-dim);
    }

    body.${ROOT_CLASS} #nextRefreshText {
      color: var(--pro-text);
      font-size: 12px;
    }

    body.${ROOT_CLASS} .action-btn.primary {
      height: 34px;
      padding: 0 14px;
      border: 1px solid rgba(31, 75, 164, 0.12);
      border-radius: 12px;
      background: linear-gradient(180deg, #2d6ae0 0%, #1f57bf 100%);
      color: #ffffff;
      box-shadow: 0 10px 20px rgba(31, 87, 191, 0.22);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.02em;
    }

    body.${ROOT_CLASS} .app.ik-shell .content {
      padding: 18px 22px 30px !important;
      background: transparent !important;
    }

    body.${ROOT_CLASS} .section {
      margin-bottom: 22px;
    }

    body.${ROOT_CLASS} .section-head {
      margin-bottom: 10px;
      padding: 0 2px 6px;
      border-bottom: 1px solid rgba(200, 211, 223, 0.76);
      align-items: flex-end;
    }

    body.${ROOT_CLASS} .section-title {
      color: var(--pro-text);
      font-size: 16px;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.1;
    }

    body.${ROOT_CLASS} .section-title::before {
      content: attr(data-panel-kicker);
      display: block;
      margin-bottom: 4px;
      color: var(--pro-text-dim);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.12em;
      line-height: 1.1;
    }

    body.${ROOT_CLASS} .section-title:not([data-panel-kicker])::before,
    body.${ROOT_CLASS} .section-title[data-panel-kicker=""]::before {
      display: none;
      content: none;
    }

    body.${ROOT_CLASS} .frame.overview-title-only #overview > .section-head {
      display: none !important;
    }

    body.${ROOT_CLASS} .frame.overview-title-only #overview {
      margin-top: 0 !important;
    }

    body.${ROOT_CLASS} .section-tip,
    body.${ROOT_CLASS} .subtle,
    body.${ROOT_CLASS} .footer {
      color: var(--pro-text-dim);
    }

    body.${ROOT_CLASS} .card,
    body.${ROOT_CLASS} .record-card,
    body.${ROOT_CLASS} .ops-resource-card,
    body.${ROOT_CLASS} .status-pill,
    body.${ROOT_CLASS} .metric-card,
    body.${ROOT_CLASS} .ops-stat-tile,
    body.${ROOT_CLASS} .ik-summary-box,
    body.${ROOT_CLASS} .ik-home-status-tile,
    body.${ROOT_CLASS} .ik-home-terminal-tile,
    body.${ROOT_CLASS} .ops-overview-metric {
      position: relative;
      border: 1px solid var(--pro-border) !important;
      border-radius: var(--pro-radius) !important;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 251, 254, 0.98) 100%) !important;
      box-shadow: var(--pro-shadow-soft) !important;
      overflow: hidden;
    }

    body.${ROOT_CLASS} .card::before,
    body.${ROOT_CLASS} .record-card::before,
    body.${ROOT_CLASS} .ops-resource-card::before,
    body.${ROOT_CLASS} .status-pill::before,
    body.${ROOT_CLASS} .metric-card::before,
    body.${ROOT_CLASS} .ops-stat-tile::before,
    body.${ROOT_CLASS} .ik-summary-box::before,
    body.${ROOT_CLASS} .ik-home-status-tile::before,
    body.${ROOT_CLASS} .ik-home-terminal-tile::before,
    body.${ROOT_CLASS} .ops-overview-metric::before {
      content: "";
      position: absolute;
      inset: 0 0 auto;
      height: 3px;
      background: linear-gradient(90deg, rgba(42, 99, 212, 0.78) 0%, rgba(42, 99, 212, 0) 76%);
      opacity: 0.45;
      pointer-events: none;
    }

    body.${ROOT_CLASS} .card-head {
      padding: 10px 12px 0 !important;
      gap: 10px;
    }

    body.${ROOT_CLASS} .card-title {
      color: var(--pro-text);
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.01em;
    }

    body.${ROOT_CLASS} .card-body {
      padding: 10px 12px 12px !important;
    }

    body.${ROOT_CLASS} .metric-label,
    body.${ROOT_CLASS} .status-k,
    body.${ROOT_CLASS} .ops-stat-label,
    body.${ROOT_CLASS} .record-label,
    body.${ROOT_CLASS} .info-k {
      color: var(--pro-text-dim);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      line-height: 1.2;
    }

    body.${ROOT_CLASS} .metric-value,
    body.${ROOT_CLASS} .status-v,
    body.${ROOT_CLASS} .ops-stat-value,
    body.${ROOT_CLASS} .record-value,
    body.${ROOT_CLASS} .info-v,
    body.${ROOT_CLASS} .ops-resource-value {
      color: var(--pro-text);
      font-weight: 800;
      line-height: 1.18;
    }

    body.${ROOT_CLASS} .metric-value,
    body.${ROOT_CLASS} .status-v,
    body.${ROOT_CLASS} .ops-stat-value,
    body.${ROOT_CLASS} .ops-resource-value,
    body.${ROOT_CLASS} .record-index,
    body.${ROOT_CLASS} #nextRefreshText {
      font-family: "Bahnschrift", "Segoe UI Variable Text", "Segoe UI", sans-serif;
    }

    body.${ROOT_CLASS} .metric-value {
      font-size: 20px;
    }

    body.${ROOT_CLASS} .metric-foot {
      margin-top: 8px;
      color: var(--pro-text-soft);
      font-size: 11px;
    }

    body.${ROOT_CLASS} .status-strip,
    body.${ROOT_CLASS} .topmetrics-fixed-host {
      gap: 10px;
      margin-top: 14px;
      padding: 10px;
      border: 1px solid rgba(200, 211, 223, 0.82);
      border-radius: 16px;
      background:
        linear-gradient(180deg, rgba(251, 252, 254, 0.96) 0%, rgba(244, 248, 252, 0.96) 100%);
      box-shadow: 0 14px 28px rgba(17, 28, 45, 0.08);
      backdrop-filter: blur(16px);
    }

    body.${ROOT_CLASS} .status-pill {
      padding: 10px 12px;
      min-height: 66px;
    }

    body.${ROOT_CLASS} .status-k {
      margin-bottom: 6px;
    }

    body.${ROOT_CLASS} .status-v {
      font-size: 19px;
      letter-spacing: -0.02em;
    }

    body.${ROOT_CLASS} .section-summary-sticky,
    body.${ROOT_CLASS} .arp-summary-sticky,
    body.${ROOT_CLASS} .section-summary-fixed-host > .section-summary-sticky,
    body.${ROOT_CLASS} .section-summary-fixed-host > .arp-summary-sticky,
    body.${ROOT_CLASS} #compactSummaryPinnedHost > .section-summary-sticky {
      padding: 10px !important;
      border: 1px solid rgba(200, 211, 223, 0.86) !important;
      border-radius: 16px !important;
      background:
        linear-gradient(180deg, rgba(251, 252, 254, 0.98) 0%, rgba(244, 248, 252, 0.98) 100%) !important;
      box-shadow: 0 14px 28px rgba(17, 28, 45, 0.08) !important;
      backdrop-filter: blur(16px);
    }

    body.${ROOT_CLASS} .section-summary-sticky > .grid-4,
    body.${ROOT_CLASS} .section-summary-sticky > .grid-3,
    body.${ROOT_CLASS} .section-summary-sticky > .grid-2,
    body.${ROOT_CLASS} .arp-summary-sticky > .grid-4,
    body.${ROOT_CLASS} .arp-summary-sticky > .grid-3,
    body.${ROOT_CLASS} .arp-summary-sticky > .grid-2 {
      gap: 8px !important;
    }

    body.${ROOT_CLASS} .ops-table-wrap {
      border: 1px solid var(--pro-border) !important;
      border-radius: 13px !important;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 251, 254, 0.98) 100%) !important;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.92);
    }

    body.${ROOT_CLASS} .ops-table {
      width: 100%;
      font-variant-numeric: tabular-nums;
    }

    body.${ROOT_CLASS} .ops-table th,
    body.${ROOT_CLASS} .ops-table td {
      border-bottom: 1px solid var(--pro-border-soft);
      padding: 7px 8px;
      color: var(--pro-text);
      font-size: 11px;
      line-height: 1.3;
    }

    body.${ROOT_CLASS} .ops-table th {
      background: #eef4fa !important;
      color: var(--pro-text-dim);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.08em;
      border-bottom-color: var(--pro-border-strong);
      box-shadow: inset 0 -1px 0 rgba(200, 211, 223, 0.9);
    }

    body.${ROOT_CLASS} .ops-table tbody tr:nth-child(even) {
      background: rgba(244, 248, 252, 0.9);
    }

    body.${ROOT_CLASS} .ops-table tbody tr:hover {
      background: rgba(232, 240, 255, 0.9);
    }

    body.${ROOT_CLASS} .ops-compact-table th {
      font-size: 9px;
      letter-spacing: 0.1em;
    }

    body.${ROOT_CLASS} .ops-inline-main,
    body.${ROOT_CLASS} .ops-inline-sub {
      color: var(--pro-text-soft);
    }

    body.${ROOT_CLASS} .tag {
      min-height: 18px;
      padding: 0 8px;
      border-radius: 999px;
      border: 1px solid transparent;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.04em;
    }

    body.${ROOT_CLASS} .tag.ok {
      background: rgba(35, 128, 79, 0.1);
      border-color: rgba(35, 128, 79, 0.16);
      color: var(--pro-success);
    }

    body.${ROOT_CLASS} .tag.warn {
      background: rgba(162, 108, 25, 0.1);
      border-color: rgba(162, 108, 25, 0.16);
      color: var(--pro-warn);
    }

    body.${ROOT_CLASS} .tag.danger {
      background: rgba(181, 77, 77, 0.1);
      border-color: rgba(181, 77, 77, 0.16);
      color: var(--pro-danger);
    }

    body.${ROOT_CLASS} .tag.info {
      background: rgba(42, 99, 212, 0.1);
      border-color: rgba(42, 99, 212, 0.16);
      color: var(--pro-accent);
    }

    body.${ROOT_CLASS} .record-list {
      gap: 8px !important;
    }

    body.${ROOT_CLASS} .record-card {
      border-radius: 13px !important;
    }

    body.${ROOT_CLASS} .record-head {
      padding: 8px 10px;
      border-bottom: 1px solid var(--pro-border-soft);
      background: linear-gradient(180deg, rgba(247, 250, 253, 0.96) 0%, rgba(243, 247, 251, 0.96) 100%);
    }

    body.${ROOT_CLASS} .record-index {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 26px;
      height: 26px;
      border-radius: 9px;
      background: var(--pro-accent-soft);
      color: var(--pro-accent);
      font-size: 12px;
      font-weight: 800;
      box-shadow: inset 0 0 0 1px rgba(42, 99, 212, 0.1);
    }

    body.${ROOT_CLASS} .record-title {
      gap: 2px;
    }

    body.${ROOT_CLASS} .record-title .record-value {
      color: var(--pro-text);
      font-size: 13px;
    }

    body.${ROOT_CLASS} .record-grid {
      gap: 6px 10px;
      padding: 8px 10px 10px;
      grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
    }

    body.${ROOT_CLASS} .record-item {
      padding-bottom: 5px;
      border-bottom: 1px dashed var(--pro-border-soft);
    }

    body.${ROOT_CLASS} .record-item:last-child {
      padding-bottom: 0;
      border-bottom: 0;
    }

    body.${ROOT_CLASS} .info-list {
      gap: 8px 12px;
    }

    body.${ROOT_CLASS} .info-item {
      padding-bottom: 8px;
      border-bottom: 1px dashed var(--pro-border-soft);
    }

    body.${ROOT_CLASS} .info-item:last-child {
      padding-bottom: 0;
      border-bottom: 0;
    }

    body.${ROOT_CLASS} .ops-resource-card,
    body.${ROOT_CLASS} .ops-stat-tile,
    body.${ROOT_CLASS} .ik-summary-box,
    body.${ROOT_CLASS} .ik-home-status-tile,
    body.${ROOT_CLASS} .ik-home-terminal-tile {
      padding: 10px 12px;
    }

    body.${ROOT_CLASS} .ops-resource-title,
    body.${ROOT_CLASS} .ops-resource-meta,
    body.${ROOT_CLASS} .ops-axis-labels {
      color: var(--pro-text-dim);
    }

    body.${ROOT_CLASS} .ops-resource-plot,
    body.${ROOT_CLASS} .chart-box,
    body.${ROOT_CLASS} .progress {
      border-radius: 10px;
    }

    body.${ROOT_CLASS} .chart-box {
      border: 1px solid rgba(214, 224, 234, 0.82);
      background: linear-gradient(180deg, rgba(250, 252, 254, 0.98) 0%, rgba(245, 249, 253, 0.98) 100%);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.92);
    }

    body.${ROOT_CLASS} .progress {
      background: rgba(219, 228, 239, 0.7);
      overflow: hidden;
    }

    body.${ROOT_CLASS} .progress > span {
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.28), 0 4px 12px rgba(42, 99, 212, 0.16);
    }

    body.${ROOT_CLASS} .empty {
      padding: 16px 14px;
      border: 1px dashed rgba(200, 211, 223, 0.96);
      border-radius: 12px;
      background: rgba(248, 251, 254, 0.94);
      color: var(--pro-text-dim);
    }

    body.${ROOT_CLASS} select,
    body.${ROOT_CLASS} input[type="search"],
    body.${ROOT_CLASS} input[type="text"] {
      border: 1px solid rgba(200, 211, 223, 0.92);
      border-radius: 11px;
      background: rgba(255, 255, 255, 0.94);
      color: var(--pro-text);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.92);
    }

    body.${ROOT_CLASS} select:focus,
    body.${ROOT_CLASS} input[type="search"]:focus,
    body.${ROOT_CLASS} input[type="text"]:focus {
      outline: none;
      border-color: rgba(42, 99, 212, 0.42);
      box-shadow: 0 0 0 4px var(--pro-accent-glow);
    }
  `;

  let observer = null;
  let scheduled = false;

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function resolveWanLineCount() {
    try {
      const snapshot = (typeof displayedSnapshot !== "undefined" && displayedSnapshot)
        || (typeof latestSnapshot !== "undefined" && latestSnapshot)
        || null;
      const explicitCount = Number(snapshot?.meta?.lineCount ?? snapshot?.meta?.wanCount);
      if (Number.isFinite(explicitCount) && explicitCount >= 0) return explicitCount;
      const wan = snapshot?.wan;
      if (Array.isArray(wan) && wan.length) return wan.length;
      const pppoe = snapshot?.pppoe;
      if (Array.isArray(pppoe) && pppoe.length) return pppoe.length;
    } catch (_) {
      // Best-effort only: this theme file should not crash the panel if snapshots are not ready.
    }

    const select = document.querySelector("select[data-overview-wan-line]");
    if (select) {
      const keys = Array.from(select.querySelectorAll("option"))
        .map((node) => normalizeText(node.value))
        .filter((value) => value && value !== "aggregate");
      if (keys.length) return keys.length;
    }

    return null;
  }

  function syncWanDensity() {
    if (!document.body) return;
    const count = resolveWanLineCount();
    const snapshot = (typeof displayedSnapshot !== "undefined" && displayedSnapshot)
      || (typeof latestSnapshot !== "undefined" && latestSnapshot)
      || null;
    const mode = typeof count === "number" && Number.isFinite(count)
      ? (count > 1 ? "multi" : count === 1 ? "single" : "none")
      : "";
    const tier = snapshot?.meta?.lineLayoutTier
      || (count <= 0 ? "none" : count === 1 ? "single" : count <= 3 ? "few" : count <= 6 ? "multi" : "dense");

    if (mode) {
      document.documentElement.dataset.wanMode = mode;
      document.body.dataset.wanMode = mode;
    } else {
      delete document.documentElement.dataset.wanMode;
      delete document.body.dataset.wanMode;
    }

    if (typeof count === "number" && Number.isFinite(count)) {
      document.documentElement.dataset.wanLines = String(count);
      document.body.dataset.wanLines = String(count);
    } else {
      delete document.documentElement.dataset.wanLines;
      delete document.body.dataset.wanLines;
    }

    if (tier) {
      document.documentElement.dataset.wanTier = tier;
      document.body.dataset.wanTier = tier;
    } else {
      delete document.documentElement.dataset.wanTier;
      delete document.body.dataset.wanTier;
    }

    const isSingle = mode === "single";
    const isMulti = mode === "multi";
    document.documentElement.classList.toggle(WAN_DENSITY_SINGLE_CLASS, isSingle);
    document.body.classList.toggle(WAN_DENSITY_SINGLE_CLASS, isSingle);
    document.documentElement.classList.toggle(WAN_DENSITY_MULTI_CLASS, isMulti);
    document.body.classList.toggle(WAN_DENSITY_MULTI_CLASS, isMulti);
  }

  function injectStyle() {
    if (!document.head || document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = STYLE_TEXT;
    document.head.appendChild(style);
  }

  function extractLabel(node) {
    if (!node) return "";
    const candidates = [
      node.getAttribute("data-panel-label"),
      node.getAttribute("title"),
      node.getAttribute("aria-label"),
      normalizeText(node.textContent)
    ];

    for (const candidate of candidates) {
      if (candidate) return candidate;
    }

    return "";
  }

  function collectMaps() {
    const groups = new Map();
    const sections = new Map();

    document.querySelectorAll("[data-nav-group]").forEach((node) => {
      const groupId = normalizeText(node.getAttribute("data-nav-group"));
      if (!groupId) return;

      const label = extractLabel(node);
      if (label && !groups.has(groupId)) {
        groups.set(groupId, label);
      }
    });

    document.querySelectorAll("[data-section]").forEach((node) => {
      const sectionId = normalizeText(node.getAttribute("data-section"));
      if (!sectionId) return;

      const current = sections.get(sectionId) || { label: "", groupId: "" };
      const label = extractLabel(node);
      const groupId = normalizeText(node.getAttribute("data-nav-group"));

      if (label && label.length >= current.label.length) {
        current.label = label;
      }

      if (groupId) {
        current.groupId = groupId;
      }

      sections.set(sectionId, current);
    });

    return { groups, sections };
  }

  function applyShellMetadata() {
    document.documentElement.classList.add(ROOT_CLASS);
    if (!document.body) return;

    document.body.classList.add(ROOT_CLASS);
    syncShellScrollOffset();
    resetPrimaryRailScroll();
    const readonlyFluid = document.body.classList.contains("readonly-diagnostics-page");
    document.documentElement.classList.toggle(READONLY_FLUID_CLASS, readonlyFluid);
    document.body.classList.toggle(READONLY_FLUID_CLASS, readonlyFluid);
    syncWanDensity();

    const appShell = document.querySelector(".app.ik-shell");
    const frame = document.querySelector(".app.ik-shell .frame");
    const topbar = document.querySelector(".topbar");
    const topMetrics = document.getElementById("topMetrics");

    if (readonlyFluid && appShell) {
      appShell.classList.remove("home-sidebar-hidden");
      window.requestAnimationFrame(() => resetReadonlyFluidScroll(appShell, frame));
    }

    if (appShell) appShell.dataset.proShell = "ready";
    if (frame) frame.dataset.proFrame = "ready";
    if (topbar) topbar.dataset.proTopbar = "ready";
    if (topMetrics && topMetrics.children.length) topMetrics.dataset.proSummary = "ready";

    const activeSection = normalizeText(
      (document.querySelector("[data-section].is-active") || {}).getAttribute?.("data-section")
        || window.location.hash.replace(/^#/, "")
    );

    if (activeSection) {
      document.body.dataset.proSection = activeSection;
    }

    // Keep this theme script neutral so it won't leak preview-only semantics across deployments.
  }

  function applySectionMetadata() {
    const maps = collectMaps();

    document.querySelectorAll("#app .section[id]").forEach((section) => {
      const sectionId = normalizeText(section.id);
      const info = maps.sections.get(sectionId) || {};
      const sectionHead = section.querySelector(":scope > .section-head");
      const title = sectionHead?.querySelector(".section-title");

      section.dataset.proSection = sectionId;
      section.classList.add("panel-pro-section");

      if (sectionId === "overview") {
        if (title) title.dataset.panelKicker = "";
        if (sectionHead) sectionHead.remove();
        return;
      }

      if (title) {
        const titleText = normalizeText(title.textContent);
        const kickerParts = [];

        if (info.groupId && maps.groups.has(info.groupId)) {
          kickerParts.push(maps.groups.get(info.groupId));
        }

        kickerParts.push(info.label || titleText);
        title.dataset.panelKicker = kickerParts.filter(Boolean).join(" / ");
      }
    });

    document.querySelectorAll(".section-summary-sticky, .arp-summary-sticky").forEach((node) => {
      node.dataset.proStickySummary = "ready";
    });

    document.querySelectorAll(".card").forEach((node) => {
      node.dataset.proCard = "ready";
    });

    document.querySelectorAll(".metric-card").forEach((node) => {
      node.dataset.proMetric = "ready";
    });

    document.querySelectorAll(".ops-table-wrap").forEach((node) => {
      node.dataset.proTable = "ready";
    });

    document.querySelectorAll(".record-list").forEach((node) => {
      node.dataset.proRecords = "ready";
    });
  }

  function enhanceDom() {
    scheduled = false;
    injectStyle();
    syncShellScrollOffset();
    resetPrimaryRailScroll();
    applyShellMetadata();
    applySectionMetadata();
  }

  function syncShellScrollOffset() {
    const scrollX = Math.max(
      0,
      Math.round(window.scrollX || document.documentElement?.scrollLeft || document.body?.scrollLeft || 0)
    );
    const value = `${scrollX}px`;
    document.documentElement.style.setProperty("--pro-window-scroll-x", value);
    if (document.body) document.body.style.setProperty("--pro-window-scroll-x", value);
  }

  function resetPrimaryRailScroll() {
    const rail = document.getElementById("ikRail") || document.querySelector(".app.ik-shell .ik-rail");
    if (rail && typeof rail.scrollTop === "number" && rail.scrollTop !== 0) {
      rail.scrollTop = 0;
    }
  }

  function handleViewportScroll() {
    window.requestAnimationFrame(() => {
      syncShellScrollOffset();
      resetPrimaryRailScroll();
    });
  }

  function resetReadonlyFluidScroll(appShellRef, frameRef) {
    if (!document.body?.classList.contains("readonly-diagnostics-page")) return;

    const appShell = appShellRef || document.querySelector(".app.ik-shell");
    const frame = frameRef || document.querySelector(".app.ik-shell .frame");

    try {
      window.scrollTo({ left: 0, top: window.scrollY || 0, behavior: "instant" });
    } catch (_) {
      window.scrollTo(0, window.scrollY || 0);
    }

    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;

    [appShell, frame, document.querySelector(".content"), document.querySelector("main")].forEach((node) => {
      if (node && typeof node.scrollLeft === "number") node.scrollLeft = 0;
    });
  }

  function scheduleEnhance() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(enhanceDom);
  }

  function startObserver() {
    if (observer || !document.body || typeof MutationObserver !== "function") return;

    observer = new MutationObserver(() => {
      scheduleEnhance();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-nav-group", "data-section"]
    });
  }

  function boot() {
    injectStyle();
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    enhanceDom();
    startObserver();
    window.addEventListener("hashchange", scheduleEnhance, { passive: true });
    window.addEventListener("load", scheduleEnhance, { passive: true });
    window.addEventListener("resize", syncShellScrollOffset, { passive: true });
    window.addEventListener("scroll", handleViewportScroll, { passive: true });
    window.addEventListener("hashchange", () => window.requestAnimationFrame(() => resetReadonlyFluidScroll()), { passive: true });
    window.addEventListener("load", () => window.requestAnimationFrame(() => resetReadonlyFluidScroll()), { passive: true });
    window.addEventListener("pageshow", () => window.requestAnimationFrame(() => resetReadonlyFluidScroll()), { passive: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
