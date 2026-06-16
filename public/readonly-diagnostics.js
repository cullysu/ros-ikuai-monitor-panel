(() => {
  if (window.__readonlyDiagnosticsPanelV2) return;
  window.__readonlyDiagnosticsPanelV2 = true;

  const STATE = {
    payload: null,
    loading: false,
    loadingPromise: null,
    error: "",
    fetchedAt: 0,
    selfCheck: {
      active: "github",
      refreshing: "",
      refreshedAt: 0,
    },
  };
  const DIAG_TTL_MS = 45 * 1000;

  // Public RouterOS-only build: keep this script from force-registering private diagnostics
  // navigation or injecting any private summary blocks into the overview page.
  // Private build can override via `window.__readonlyDiagnosticsPrivateNav = true/false`.
  const READONLY_DIAGNOSTICS_PRIVATE_NAV = (() => {
    if (window.__readonlyDiagnosticsPrivateNav === true) return true;
    if (window.__readonlyDiagnosticsPrivateNav === false) return false;

    const appShell = String(document.body?.getAttribute("data-app-shell") || "").toLowerCase();
    if (appShell && !appShell.includes("ikuai")) return false;

    const deployChannel = String(document.body?.getAttribute("data-deploy-channel") || "").toLowerCase();
    if (deployChannel.includes("public")) return false;

    return true;
  })();
  const FRESH = {
    rest: { warn: 8, danger: 20 },
    static: { warn: 120, danger: 300 },
    connection: { warn: 8, danger: 20 },
    protocol: { warn: 8, danger: 20 },
    diag: { warn: 90, danger: 180 },
  };

  const SITE_ORDER = [
    "Douyin",
    "Bilibili",
    "Apple",
    "GitHub",
    "YouTube",
    "Google",
    "Cloudflare",
    "Steam",
    "PayPal",
    "OpenAI",
  ];

  const style = document.createElement("style");
  style.textContent = `
    .readonly-global-strip {
      display: grid;
      grid-template-columns: repeat(8, minmax(0, 1fr));
      gap: 8px;
      margin: 0 0 10px;
    }
    .readonly-global-chip {
      min-width: 0;
      padding: 8px 10px;
      border: 1px solid #e4edf8;
      border-radius: 11px;
      background: linear-gradient(180deg, #fff 0%, #fbfdff 100%);
      box-shadow: 0 8px 18px rgba(31, 58, 96, .04);
    }
    .readonly-global-chip strong {
      display: block;
      color: #253246;
      font-size: 15px;
      line-height: 1.1;
    }
    .readonly-global-chip span {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-bottom: 4px;
      color: #7f8da1;
      font-size: 10px;
      font-weight: 800;
      white-space: nowrap;
    }
    .readonly-global-chip span::before {
      content: "";
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: #8fb7ff;
    }
    .readonly-global-chip.ok span::before { background: #16c67a; }
    .readonly-global-chip.warn span::before { background: #ffb020; }
    .readonly-global-chip.danger span::before { background: #ff5a5a; }
    #readonlyDiagnostics .readonly-feature-nav {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 8px;
      margin: 0 0 10px;
    }
    #readonlyDiagnostics .readonly-feature-link {
      display: block;
      min-width: 0;
      padding: 10px 12px;
      border: 1px solid #e1ecf8;
      border-radius: 12px;
      background: #fff;
      color: #42526a;
      text-decoration: none;
      box-shadow: 0 8px 18px rgba(31, 58, 96, .04);
    }
    #readonlyDiagnostics .readonly-feature-link.is-active {
      border-color: #bcd8ff;
      background: linear-gradient(180deg, #f5f9ff 0%, #eef6ff 100%);
      color: #176adf;
      box-shadow: inset 3px 0 0 #2f7df6, 0 10px 22px rgba(47, 125, 246, .08);
    }
    #readonlyDiagnostics .readonly-feature-link strong {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 13px;
      line-height: 1.25;
    }
    #readonlyDiagnostics .readonly-feature-link span {
      display: block;
      overflow: hidden;
      margin-top: 4px;
      color: #7f8da1;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 10px;
      line-height: 1.25;
    }
    #readonlyDiagnostics .readonly-advanced-nav {
      min-width: 0;
      border: 1px dashed #d6e4f5;
      border-radius: 12px;
      background: #fbfdff;
      padding: 8px;
    }
    #readonlyDiagnostics .readonly-advanced-nav summary {
      cursor: pointer;
      color: #6d7f95;
      font-size: 12px;
      font-weight: 800;
      list-style-position: inside;
    }
    #readonlyDiagnostics .readonly-advanced-nav-links {
      display: grid;
      gap: 6px;
      margin-top: 8px;
    }
    #readonlyDiagnostics .readonly-feature-sticky {
      margin-bottom: 10px;
      padding: 0 0 2px;
    }
    #readonlyDiagnostics .readonly-feature-sticky .readonly-feature-nav {
      margin-bottom: 8px;
    }
    .section-summary-fixed-host > .readonly-feature-sticky {
      pointer-events: auto !important;
      padding: 10px 12px !important;
      border: 1px solid var(--line) !important;
      border-radius: 0 0 14px 14px !important;
      background: rgba(255, 255, 255, 0.96) !important;
      box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08) !important;
      backdrop-filter: blur(12px);
    }
    .section-summary-fixed-host > .readonly-feature-sticky .readonly-feature-link {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      min-height: 34px !important;
      border: 1px solid var(--line) !important;
      border-radius: 11px !important;
      background: #fff !important;
      color: #1f3b62 !important;
      text-decoration: none !important;
      pointer-events: auto !important;
    }
    .section-summary-fixed-host > .readonly-feature-sticky .readonly-feature-link.is-active {
      background: #eaf3ff !important;
      border-color: #bfdbfe !important;
      color: #1d4ed8 !important;
      box-shadow: inset 3px 0 0 var(--blue) !important;
    }
    .section-summary-fixed-host > .readonly-feature-sticky .readonly-feature-link strong {
      font-size: 13px !important;
      line-height: 1.2 !important;
      white-space: nowrap !important;
    }
    .section-summary-fixed-host > .readonly-feature-sticky .readonly-feature-link span {
      display: none !important;
    }
    .section-summary-fixed-host > .readonly-feature-sticky .readonly-feature-nav {
      display: grid !important;
      grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
      gap: 8px !important;
      margin-bottom: 6px !important;
    }
    .section-summary-fixed-host > .readonly-feature-sticky .readonly-feature-link {
      padding: 8px 10px !important;
    }
    .section-summary-fixed-host > .readonly-feature-sticky .readonly-feature-brief {
      display: block !important;
      margin-bottom: 0 !important;
    }
    .section-summary-fixed-host > .readonly-feature-sticky .readonly-brief-copy {
      display: none !important;
    }
    .section-summary-fixed-host > .readonly-feature-sticky .readonly-brief-metrics {
      display: grid !important;
      grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
      gap: 8px !important;
    }
    .section-summary-fixed-host > .readonly-feature-sticky .readonly-brief-text,
    .section-summary-fixed-host > .readonly-feature-sticky .readonly-pill-row,
    .section-summary-fixed-host > .readonly-feature-sticky .readonly-kpi-foot {
      display: none !important;
    }
    .section-summary-fixed-host > .readonly-feature-sticky .readonly-brief-copy {
      padding: 8px 10px !important;
    }
    .section-summary-fixed-host > .readonly-feature-sticky .readonly-kpi {
      padding: 7px 9px !important;
      min-height: 46px !important;
      border: 1px solid var(--line) !important;
      border-radius: 11px !important;
      background: #f8fbff !important;
    }
    .section-summary-fixed-host > .readonly-feature-sticky .readonly-kpi-label {
      color: var(--muted) !important;
      font-size: 11px !important;
      line-height: 1.2 !important;
      white-space: nowrap !important;
    }
    .section-summary-fixed-host > .readonly-feature-sticky .readonly-kpi-value {
      margin-top: 3px !important;
      font-size: 15px !important;
      line-height: 1.2 !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }
    #readonlyDiagnostics .readonly-summary-sticky,
    .readonly-diagnostics-section > .readonly-summary-sticky {
      margin-bottom: 10px;
      padding: 0;
      overflow: visible;
    }
    .readonly-summary-sticky > .readonly-summary-grid,
    .section-summary-fixed-host > .readonly-summary-sticky > .readonly-summary-grid {
      display: grid !important;
      grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
      gap: 10px !important;
      margin-top: 8px !important;
      min-width: 0 !important;
      align-items: stretch !important;
    }
    .readonly-summary-sticky .metric-card {
      min-width: 0 !important;
      min-height: 90px !important;
      box-shadow: none;
    }
    .section-summary-fixed-host > .readonly-summary-sticky {
      padding: 0 !important;
      border: 0 !important;
      background: rgba(255, 255, 255, 0.98) !important;
      box-shadow: none !important;
      backdrop-filter: blur(12px);
    }
    .section-summary-fixed-host > .readonly-summary-sticky .metric-card {
      pointer-events: none;
    }
    .readonly-overview-health {
      margin: 0 0 10px;
    }
    #readonlyDiagnostics .readonly-banner {
      display: grid;
      grid-template-columns: minmax(0, 1.25fr) repeat(4, minmax(126px, .55fr));
      gap: 8px;
      margin-bottom: 10px;
      align-items: stretch;
    }
    #readonlyDiagnostics .readonly-hero {
      padding: 12px 14px;
      border: 1px solid #dcecff;
      border-radius: 12px;
      background: linear-gradient(135deg, #f8fbff 0%, #eef6ff 100%);
      box-shadow: inset 3px 0 0 #2f7df6;
    }
    #readonlyDiagnostics .readonly-hero-title {
      color: var(--text);
      font-size: 15px;
      font-weight: 800;
      line-height: 1.2;
    }
    #readonlyDiagnostics .readonly-hero-copy {
      margin-top: 5px;
      color: var(--text-soft);
      font-size: 12px;
      line-height: 1.5;
    }
    #readonlyDiagnostics .readonly-kpi {
      min-width: 0;
      padding: 10px 11px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
    }
    #readonlyDiagnostics .readonly-kpi-label {
      color: var(--text-dim);
      font-size: 11px;
      font-weight: 700;
      line-height: 1.2;
    }
    #readonlyDiagnostics .readonly-kpi-value {
      margin-top: 6px;
      color: var(--text);
      font-size: 19px;
      font-weight: 800;
      line-height: 1;
      word-break: break-word;
    }
    #readonlyDiagnostics .readonly-kpi-foot {
      margin-top: 6px;
      color: var(--text-soft);
      font-size: 11px;
      line-height: 1.25;
      word-break: break-word;
    }
    #readonlyDiagnostics .readonly-grid-3,
    .readonly-overview-health .readonly-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      align-items: start;
    }
    #readonlyDiagnostics .readonly-grid-2 {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      align-items: start;
    }
    #readonlyDiagnostics .readonly-grid-wide {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(0, .85fr);
      gap: 10px;
      align-items: start;
    }
    #readonlyDiagnostics .readonly-readable-flow {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 0;
    }
    body.readonly-diagnostics-page {
      width: 100%;
      min-width: 0 !important;
      max-width: 100%;
      overflow-x: hidden;
    }
    body.readonly-diagnostics-page .app,
    body.readonly-diagnostics-page .app.ik-shell {
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
    }
    body.readonly-diagnostics-page .frame,
    body.readonly-diagnostics-page .content,
    body.readonly-diagnostics-page #readonlyDiagnostics {
      min-width: 0;
    }
    body.readonly-diagnostics-page #topMetrics,
    body.readonly-diagnostics-page .app.ik-shell .frame:not(.overview-title-only):not(.page-compact-topbar):not(.arp-compact):not(.section-summary-fixed):not(.section-summary-pinned):not(.scroll-snap-free) #topMetrics {
      display: none !important;
    }
    .readonly-scroll-pin-host {
      position: fixed;
      top: 0;
      left: var(--readonly-pin-left, 0px);
      width: var(--readonly-pin-width, 100%);
      z-index: 92;
      display: none;
      padding: 8px 12px;
      border: 1px solid rgba(191, 219, 254, 0.86);
      border-top: 0;
      border-radius: 0 0 14px 14px;
      background: rgba(255, 255, 255, 0.96);
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
      backdrop-filter: blur(14px);
      pointer-events: none;
    }
    .readonly-scroll-pin-host.is-visible {
      display: block;
      pointer-events: auto;
    }
    .readonly-scroll-pin-inner {
      display: grid;
      grid-template-columns: minmax(180px, 280px) 1fr;
      gap: 12px;
      align-items: center;
    }
    .readonly-scroll-pin-title {
      min-width: 0;
      color: #14233b;
      font-size: 15px;
      font-weight: 800;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .readonly-scroll-pin-title span {
      display: block;
      margin-top: 2px;
      color: #708095;
      font-size: 11px;
      font-weight: 700;
      line-height: 1.2;
    }
    .readonly-scroll-pin-metrics {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
    }
    .readonly-scroll-pin-kpi {
      min-width: 0;
      padding: 7px 9px;
      border: 1px solid #e4edf8;
      border-radius: 11px;
      background: #f8fbff;
    }
    .readonly-scroll-pin-kpi span {
      display: flex;
      align-items: center;
      gap: 5px;
      color: #708095;
      font-size: 11px;
      font-weight: 800;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .readonly-scroll-pin-kpi span::before {
      content: "";
      flex: 0 0 auto;
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: #16c67a;
    }
    .readonly-scroll-pin-kpi.warn span::before { background: #ffb020; }
    .readonly-scroll-pin-kpi.danger span::before { background: #ff5a5a; }
    .readonly-scroll-pin-kpi.info span::before { background: #2f7df6; }
    .readonly-scroll-pin-kpi strong {
      display: block;
      margin-top: 3px;
      color: #14233b;
      font-size: 15px;
      line-height: 1.15;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    body.readonly-diagnostics-page #readonlyDiagnostics .ops-table-wrap.readonly-scroll,
    body.readonly-diagnostics-page #readonlyDiagnostics .ops-table-wrap.readonly-scroll-tall {
      max-height: none;
      overflow: visible;
      overscroll-behavior: auto;
    }
    body.readonly-diagnostics-page #readonlyDiagnostics .readonly-wrap-table {
      overflow-x: hidden;
      overflow-y: visible;
    }
    body.readonly-diagnostics-page #readonlyDiagnostics .readonly-table th {
      position: static;
      box-shadow: none;
    }
    body.readonly-diagnostics-page #readonlyDiagnostics .readonly-table {
      table-layout: fixed;
    }
    body.readonly-diagnostics-page #readonlyDiagnostics .readonly-table th,
    body.readonly-diagnostics-page #readonlyDiagnostics .readonly-table td,
    body.readonly-diagnostics-page #readonlyDiagnostics .readonly-mono {
      white-space: normal;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    #readonlyDiagnostics .readonly-support-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      align-items: start;
    }
    #readonlyDiagnostics .readonly-density-columns {
      display: grid;
      grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr) minmax(0, 1fr);
      gap: 10px;
      align-items: start;
    }
    #readonlyDiagnostics .readonly-density-columns > .ops-page-stack {
      min-width: 0;
      gap: 10px;
    }
    #readonlyDiagnostics .readonly-collection-density {
      grid-template-columns: minmax(0, 1.04fr) minmax(0, .96fr);
    }
    #readonlyDiagnostics .readonly-terminal-density {
      grid-template-columns: minmax(0, .92fr) minmax(0, 1.08fr);
    }
    #readonlyDiagnostics .readonly-terminal-priority-grid {
      display: grid;
      grid-template-columns: minmax(0, .92fr) minmax(0, 1.08fr);
      gap: 10px;
      align-items: start;
    }
    #readonlyDiagnostics .readonly-system-density {
      grid-template-columns: minmax(0, .92fr) minmax(0, 1.08fr) minmax(0, .95fr);
    }
    #readonlyDiagnostics .readonly-compact-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      align-items: start;
    }
    #readonlyDiagnostics .readonly-band-stack {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 0;
    }
    #readonlyDiagnostics .readonly-uneven-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(330px, .65fr);
      gap: 10px;
      align-items: start;
    }
    #readonlyDiagnostics .readonly-paired-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 10px;
      align-items: start;
    }
    #readonlyDiagnostics .readonly-scroll,
    .readonly-overview-health .readonly-scroll {
      max-height: 270px;
      overflow: auto;
      overscroll-behavior: contain;
    }
    #readonlyDiagnostics .readonly-scroll-tall {
      max-height: 360px;
      overflow: auto;
      overscroll-behavior: contain;
    }
    #readonlyDiagnostics .readonly-wrap-table {
      overflow-x: hidden;
      overflow-y: auto;
    }
    #readonlyDiagnostics .readonly-wrap-table .readonly-table {
      table-layout: fixed;
      min-width: 0;
    }
    #readonlyDiagnostics .readonly-wrap-table .readonly-table th,
    #readonlyDiagnostics .readonly-wrap-table .readonly-table td,
    #readonlyDiagnostics .readonly-wrap-table .readonly-mono {
      white-space: normal;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    #readonlyDiagnostics .readonly-table,
    .readonly-overview-health .readonly-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: auto;
      background: #fff;
    }
    #readonlyDiagnostics .readonly-table th,
    #readonlyDiagnostics .readonly-table td,
    .readonly-overview-health .readonly-table th,
    .readonly-overview-health .readonly-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #edf2f7;
      text-align: left;
      vertical-align: top;
      color: var(--text);
      font-size: 11px;
      line-height: 1.32;
    }
    #readonlyDiagnostics .readonly-table th,
    .readonly-overview-health .readonly-table th {
      position: sticky;
      top: 0;
      z-index: 1;
      background: #f8fbff;
      color: var(--text-dim);
      font-size: 10px;
      font-weight: 800;
      white-space: nowrap;
      box-shadow: 0 1px 0 #edf2f7;
    }
    #readonlyDiagnostics .ops-table-wrap {
      border-radius: 8px;
      border: 1px solid #edf2f7;
      background: #fff;
      overflow: hidden;
    }
    #readonlyDiagnostics .card {
      box-shadow: 0 6px 16px rgba(31, 58, 96, .045);
    }
    #readonlyDiagnostics .card-head {
      padding: 9px 11px 0;
    }
    #readonlyDiagnostics .card-body {
      padding: 8px 11px 11px;
    }
    #readonlyDiagnostics .readonly-table tbody tr:nth-child(even),
    .readonly-overview-health .readonly-table tbody tr:nth-child(even) {
      background: rgba(248, 251, 255, .78);
    }
    #readonlyDiagnostics .readonly-main,
    .readonly-overview-health .readonly-main {
      color: var(--text);
      font-weight: 700;
      line-height: 1.25;
      word-break: break-word;
    }
    #readonlyDiagnostics .readonly-sub,
    .readonly-overview-health .readonly-sub {
      margin-top: 2px;
      color: var(--text-soft);
      font-size: 10px;
      line-height: 1.25;
      word-break: break-word;
    }
    #readonlyDiagnostics .readonly-mono,
    .readonly-overview-health .readonly-mono {
      font-family: Consolas, "SFMono-Regular", "Liberation Mono", monospace;
    }
    #readonlyDiagnostics .readonly-note,
    .readonly-overview-health .readonly-note {
      padding: 8px 10px;
      border: 1px solid #dcecff;
      border-radius: 10px;
      background: #f7fbff;
      color: #2d5c9f;
      font-size: 12px;
      line-height: 1.5;
    }
    #readonlyDiagnostics .readonly-pill-row,
    .readonly-overview-health .readonly-pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    #readonlyDiagnostics .readonly-pill,
    .readonly-overview-health .readonly-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      min-height: 22px;
      padding: 0 8px;
      border: 1px solid #dcecff;
      border-radius: 999px;
      background: #f7fbff;
      color: #2f6fb6;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }
    #readonlyDiagnostics .readonly-pill.ok,
    .readonly-overview-health .readonly-pill.ok { border-color: #c8f2df; background: #effcf6; color: #08a35c; }
    #readonlyDiagnostics .readonly-pill.warn,
    .readonly-overview-health .readonly-pill.warn { border-color: #ffe6b3; background: #fff9eb; color: #ad7200; }
    #readonlyDiagnostics .readonly-pill.danger,
    .readonly-overview-health .readonly-pill.danger { border-color: #ffd1d1; background: #fff3f3; color: #d63b3b; }
    #readonlyDiagnostics .readonly-progress {
      display: grid;
      grid-template-columns: 112px minmax(0, 1fr) 64px;
      gap: 8px;
      align-items: center;
      min-height: 24px;
    }
    #readonlyDiagnostics .readonly-progress-track {
      height: 7px;
      overflow: hidden;
      border-radius: 999px;
      background: #edf3fa;
    }
    #readonlyDiagnostics .readonly-progress-fill {
      height: 100%;
      width: var(--pct);
      border-radius: inherit;
      background: linear-gradient(90deg, #8fb7ff 0%, #165dff 100%);
    }
    #readonlyDiagnostics .readonly-mini-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    #readonlyDiagnostics .readonly-mini-item {
      display: grid;
      grid-template-columns: 108px minmax(0, 1fr) 80px;
      gap: 8px;
      align-items: center;
      padding: 6px 8px;
      border: 1px solid #edf2f7;
      border-radius: 9px;
      background: #fbfdff;
      font-size: 11px;
    }
    #readonlyDiagnostics .readonly-dns-pair {
      display: grid;
      gap: 3px;
    }
    #readonlyDiagnostics .readonly-dns-line {
      display: grid;
      grid-template-columns: 34px minmax(0, 1fr);
      gap: 5px;
      align-items: start;
    }
    #readonlyDiagnostics .readonly-dns-kind {
      color: #7f8da1;
      font-size: 10px;
      font-weight: 800;
      line-height: 1.35;
    }
    #readonlyDiagnostics .readonly-dns-value {
      color: #253246;
      font-family: Consolas, "SFMono-Regular", "Liberation Mono", monospace;
      font-size: 10px;
      line-height: 1.35;
      overflow-wrap: anywhere;
    }
    #readonlyDiagnostics .readonly-dns-value.warn { color: #ad7200; }
    #readonlyDiagnostics .readonly-dns-value.info { color: #176adf; }
    #readonlyDiagnostics .readonly-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    #readonlyDiagnostics .readonly-action {
      height: 32px;
      padding: 0 12px;
      border: 1px solid #dcecff;
      border-radius: 999px;
      background: #f7fbff;
      color: #2f6fb6;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
    }
    #readonlyDiagnostics .readonly-action:hover {
      background: #edf6ff;
    }
    #readonlyDiagnostics .readonly-selfcheck-layout {
      display: grid;
      grid-template-columns: 360px minmax(0, 1fr);
      gap: 12px;
      align-items: stretch;
    }
    #readonlyDiagnostics .readonly-selfcheck-card-wide .readonly-selfcheck-layout {
      grid-template-columns: minmax(320px, .72fr) minmax(560px, 1.28fr);
    }
    #readonlyDiagnostics .readonly-selfcheck-card-wide .readonly-selfcheck-list {
      align-content: start;
    }
    #readonlyDiagnostics .readonly-selfcheck-list {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
    }
    #readonlyDiagnostics .readonly-selfcheck-item {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
      align-items: center;
      width: 100%;
      min-height: 54px;
      padding: 9px 10px;
      border: 1px solid #e1ecf8;
      border-radius: 12px;
      background: #fbfdff;
      color: #253246;
      text-align: left;
      cursor: pointer;
    }
    #readonlyDiagnostics .readonly-selfcheck-item:hover {
      border-color: #bcd9ff;
      background: #f4f9ff;
    }
    #readonlyDiagnostics .readonly-selfcheck-item.active {
      border-color: #8fbfff;
      background: linear-gradient(135deg, #f8fbff 0%, #eef6ff 100%);
      box-shadow: inset 3px 0 0 #2f7df6;
    }
    #readonlyDiagnostics .readonly-selfcheck-label {
      min-width: 0;
    }
    #readonlyDiagnostics .readonly-selfcheck-label strong {
      display: block;
      font-size: 12px;
      line-height: 1.2;
    }
    #readonlyDiagnostics .readonly-selfcheck-item-copy {
      display: block;
      margin-top: 3px;
      color: #7d8a9c;
      font-size: 11px;
      line-height: 1.25;
    }
    #readonlyDiagnostics .readonly-selfcheck-detail {
      min-width: 0;
      padding: 12px;
      border: 1px solid #dcecff;
      border-radius: 13px;
      background: linear-gradient(180deg, #fff 0%, #f8fbff 100%);
    }
    #readonlyDiagnostics .readonly-selfcheck-detail .ops-table-wrap {
      max-height: 300px;
      overflow-x: hidden;
    }
    #readonlyDiagnostics .readonly-selfcheck-detail.warn {
      border-color: #ffe0a3;
      background: linear-gradient(180deg, #fff 0%, #fffaf0 100%);
    }
    #readonlyDiagnostics .readonly-selfcheck-detail.danger {
      border-color: #ffc8c8;
      background: linear-gradient(180deg, #fff 0%, #fff5f5 100%);
    }
    #readonlyDiagnostics .readonly-selfcheck-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 10px;
    }
    #readonlyDiagnostics .readonly-selfcheck-title {
      color: #253246;
      font-size: 15px;
      font-weight: 900;
      line-height: 1.25;
    }
    #readonlyDiagnostics .readonly-selfcheck-copy {
      margin-top: 4px;
      color: #6d7b8e;
      font-size: 12px;
      line-height: 1.55;
    }
    #readonlyDiagnostics .readonly-selfcheck-metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin: 10px 0;
    }
    #readonlyDiagnostics .readonly-selfcheck-metric {
      min-width: 0;
      padding: 8px;
      border: 1px solid #e6eef8;
      border-radius: 10px;
      background: rgba(255,255,255,.72);
    }
    #readonlyDiagnostics .readonly-selfcheck-metric span {
      display: block;
      color: #8793a4;
      font-size: 10px;
      font-weight: 800;
    }
    #readonlyDiagnostics .readonly-selfcheck-metric strong {
      display: block;
      margin-top: 4px;
      overflow: hidden;
      color: #253246;
      font-size: 12px;
      line-height: 1.2;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    #readonlyDiagnostics .readonly-selfcheck-foot {
      margin-top: 8px;
      color: #7d8a9c;
      font-size: 11px;
      line-height: 1.5;
    }
    #readonlyDiagnostics .readonly-feature-brief {
      display: grid;
      grid-template-columns: minmax(360px, .74fr) minmax(0, 1.26fr);
      gap: 10px;
      margin: 0 0 12px;
      align-items: stretch;
    }
    #readonlyDiagnostics .readonly-brief-copy {
      min-width: 0;
      padding: 11px 13px;
      border: 1px solid #dcecff;
      border-radius: 12px;
      background: linear-gradient(135deg, #fbfdff 0%, #f2f8ff 100%);
      box-shadow: inset 3px 0 0 #2f7df6;
    }
    #readonlyDiagnostics .readonly-brief-title {
      color: var(--text);
      font-size: 14px;
      font-weight: 900;
      line-height: 1.25;
    }
    #readonlyDiagnostics .readonly-brief-text {
      margin-top: 5px;
      color: var(--text-soft);
      font-size: 11px;
      line-height: 1.45;
    }
    #readonlyDiagnostics .readonly-brief-metrics {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
      align-items: stretch;
    }
    #readonlyDiagnostics .readonly-dense-card .card-body {
      min-height: 0;
    }
    #readonlyDiagnostics .readonly-wan-line-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
    }
    #readonlyDiagnostics .readonly-wan-line-tile {
      min-width: 0;
      padding: 9px 10px;
      border: 1px solid #e4edf8;
      border-radius: 12px;
      background: linear-gradient(180deg, #fff 0%, #fbfdff 100%);
      box-shadow: 0 8px 18px rgba(31, 58, 96, .035);
    }
    #readonlyDiagnostics .readonly-wan-line-tile.warn {
      border-color: #ffe2a8;
      background: linear-gradient(180deg, #fff 0%, #fffaf0 100%);
    }
    #readonlyDiagnostics .readonly-wan-line-tile.danger {
      border-color: #ffcaca;
      background: linear-gradient(180deg, #fff 0%, #fff5f5 100%);
    }
    #readonlyDiagnostics .readonly-wan-line-head {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: center;
      margin-bottom: 7px;
    }
    #readonlyDiagnostics .readonly-wan-line-name {
      overflow: hidden;
      color: #1f2d3d;
      font-size: 13px;
      font-weight: 900;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    #readonlyDiagnostics .readonly-wan-line-share {
      color: #111827;
      font-size: 16px;
      font-weight: 900;
      white-space: nowrap;
    }
    #readonlyDiagnostics .readonly-wan-meter {
      height: 7px;
      overflow: hidden;
      border-radius: 999px;
      background: #edf3fa;
    }
    #readonlyDiagnostics .readonly-wan-meter > span {
      display: block;
      height: 100%;
      width: var(--pct);
      border-radius: inherit;
      background: linear-gradient(90deg, #8fb7ff 0%, #165dff 100%);
    }
    #readonlyDiagnostics .readonly-wan-line-meta {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 5px 8px;
      margin-top: 8px;
    }
    #readonlyDiagnostics .readonly-wan-line-meta span {
      min-width: 0;
      color: #7f8da1;
      font-size: 10px;
      line-height: 1.25;
    }
    #readonlyDiagnostics .readonly-wan-line-meta strong {
      display: block;
      overflow: hidden;
      margin-top: 2px;
      color: #253246;
      font-size: 11px;
      line-height: 1.25;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    #readonlyDiagnostics .readonly-wan-density-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.04fr) minmax(0, .98fr) minmax(0, 1.12fr);
      gap: 10px;
      align-items: start;
    }
    #readonlyDiagnostics .readonly-wan-density-grid > .ops-page-stack {
      min-width: 0;
      gap: 10px;
    }
    #readonlyDiagnostics .readonly-pcc-card .readonly-mini-list {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 5px 8px;
    }
    #readonlyDiagnostics .readonly-pcc-card .readonly-progress {
      grid-template-columns: 96px minmax(0, 1fr) 54px;
      min-height: 20px;
    }
    #readonlyDiagnostics .readonly-pcc-card .readonly-table th,
    #readonlyDiagnostics .readonly-pcc-card .readonly-table td {
      padding: 5px 6px;
      font-size: 10px;
      line-height: 1.2;
    }
    #readonlyDiagnostics .readonly-wan-kpi-strip {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 7px;
      margin-bottom: 8px;
    }
    #readonlyDiagnostics .readonly-wan-mini-kpi {
      min-width: 0;
      padding: 7px 8px;
      border: 1px solid #edf2f7;
      border-radius: 10px;
      background: #fbfdff;
    }
    #readonlyDiagnostics .readonly-wan-mini-kpi span {
      display: block;
      overflow: hidden;
      color: #7f8da1;
      font-size: 10px;
      font-weight: 800;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    #readonlyDiagnostics .readonly-wan-mini-kpi strong {
      display: block;
      overflow: hidden;
      margin-top: 4px;
      color: #253246;
      font-size: 14px;
      font-weight: 900;
      line-height: 1.15;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    #readonlyDiagnostics .readonly-protocol-sample {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px;
      margin-top: 8px;
    }
    #readonlyDiagnostics .readonly-protocol-chip {
      min-width: 0;
      padding: 7px 8px;
      border: 1px solid #edf2f7;
      border-radius: 10px;
      background: #fbfdff;
    }
    #readonlyDiagnostics .readonly-protocol-chip strong {
      display: block;
      color: #253246;
      font-size: 12px;
      line-height: 1.2;
    }
    #readonlyDiagnostics .readonly-protocol-chip span {
      display: block;
      overflow: hidden;
      margin-top: 3px;
      color: #7f8da1;
      font-size: 10px;
      line-height: 1.25;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    #readonlyDiagnostics .readonly-rule-group-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 7px;
      margin: 8px 0;
    }
    #readonlyDiagnostics .readonly-rule-group {
      min-width: 0;
      padding: 8px 9px;
      border: 1px solid #edf2f7;
      border-radius: 10px;
      background: #fbfdff;
    }
    #readonlyDiagnostics .readonly-rule-group strong {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      color: #253246;
      font-size: 12px;
      line-height: 1.25;
    }
    #readonlyDiagnostics .readonly-rule-group span {
      display: block;
      overflow: hidden;
      margin-top: 4px;
      color: #7f8da1;
      font-size: 10px;
      line-height: 1.3;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    #readonlyDiagnostics .readonly-clip {
      display: block;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    body.readonly-diagnostics-page #readonlyDiagnostics .readonly-clip {
      word-break: normal !important;
      overflow-wrap: normal !important;
      white-space: nowrap !important;
    }
    body.readonly-diagnostics-page #readonlyDiagnostics .readonly-table-compact .readonly-table th,
    body.readonly-diagnostics-page #readonlyDiagnostics .readonly-table-compact .readonly-table td {
      padding: 6px 8px;
      line-height: 1.28;
      vertical-align: middle;
    }
    body.readonly-diagnostics-page #readonlyDiagnostics .readonly-table-compact .readonly-sub {
      margin-top: 1px;
      line-height: 1.25;
    }
    body.readonly-diagnostics-page #readonlyDiagnostics .readonly-table-clip .readonly-table th,
    body.readonly-diagnostics-page #readonlyDiagnostics .readonly-table-clip .readonly-table td {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      word-break: normal;
      overflow-wrap: normal;
    }
    #readonlyDiagnostics .readonly-ip-stack {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 10.5px;
      line-height: 1.18;
    }
    #readonlyDiagnostics .readonly-ip-line {
      display: block;
      max-width: 100%;
      color: #253246;
      white-space: normal;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    #readonlyDiagnostics .readonly-ip-family {
      display: grid;
      gap: 0;
      min-width: 0;
      max-width: 100%;
    }
    #readonlyDiagnostics .readonly-more-line {
      color: #7f8da1;
      font-family: inherit;
      font-size: 10px;
    }
    #readonlyDiagnostics .readonly-wan-two-col {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 10px;
      align-items: start;
    }
    body.readonly-diagnostics-page #readonlyDiagnostics .readonly-uneven-grid {
      grid-template-columns: minmax(0, 1fr);
    }
    body.readonly-diagnostics-page #readonlyDiagnostics .readonly-grid-2,
    body.readonly-diagnostics-page #readonlyDiagnostics .readonly-grid-wide,
    body.readonly-diagnostics-page #readonlyDiagnostics .readonly-support-grid,
    body.readonly-diagnostics-page #readonlyDiagnostics .readonly-compact-grid,
    body.readonly-diagnostics-page #readonlyDiagnostics .readonly-density-columns,
    body.readonly-diagnostics-page #readonlyDiagnostics .readonly-terminal-priority-grid,
    body.readonly-diagnostics-page #readonlyDiagnostics .readonly-wan-density-grid,
    body.readonly-diagnostics-page #readonlyDiagnostics .readonly-wan-two-col,
    body.readonly-diagnostics-page #readonlyDiagnostics .readonly-feature-brief {
      grid-template-columns: minmax(0, 1fr) !important;
    }
    body.readonly-diagnostics-page #readonlyDiagnostics .readonly-support-grid > .card,
    body.readonly-diagnostics-page #readonlyDiagnostics .readonly-compact-grid > .card {
      min-height: 0;
    }
    #readonlyDiagnostics,
    .readonly-diagnostics-root {
      --rd-surface: var(--panel, #ffffff);
      --rd-surface-alt: var(--panel-soft, #fbfdff);
      --rd-surface-muted: var(--surface-soft, #f4f8fd);
      --rd-line: var(--line, #d7e3f4);
      --rd-line-soft: var(--border, #e7eef8);
      --rd-text: var(--text, #253246);
      --rd-muted: var(--text-soft, #6d7b8e);
      --rd-dim: var(--text-dim, #7f8da1);
      --rd-accent: var(--blue, #2f7df6);
      --rd-accent-soft: var(--accent-soft, #eef6ff);
      --rd-ok: var(--green, #16c67a);
      --rd-warn: var(--amber, #ffb020);
      --rd-danger: var(--red, #ff5a5a);
      --rd-shadow: 0 18px 32px rgba(15, 23, 42, 0.06);
      --rd-shadow-soft: 0 10px 20px rgba(15, 23, 42, 0.04);
    }
    .readonly-diagnostics-section {
      position: relative;
    }
    .readonly-diagnostics-root,
    #readonlyDiagnostics {
      min-width: 0;
    }
    .readonly-diagnostics-shell {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .readonly-diagnostics-shell > .ops-page-stack {
      gap: 12px;
    }
    #readonlyDiagnostics .readonly-feature-sticky,
    .readonly-diagnostics-root .readonly-feature-sticky {
      margin-bottom: 0;
      padding: 12px;
      border: 1px solid var(--rd-line-soft);
      border-radius: 16px;
      background: linear-gradient(180deg, var(--rd-surface) 0%, var(--rd-surface-alt) 100%);
      box-shadow: var(--rd-shadow-soft);
    }
    #readonlyDiagnostics .readonly-feature-nav,
    .readonly-diagnostics-root .readonly-feature-nav {
      gap: 10px;
      margin: 0 0 12px;
    }
    #readonlyDiagnostics .readonly-feature-link,
    .readonly-diagnostics-root .readonly-feature-link {
      position: relative;
      padding: 12px 13px 11px;
      border-color: var(--rd-line-soft);
      border-radius: 13px;
      background: linear-gradient(180deg, var(--rd-surface) 0%, var(--rd-surface-alt) 100%);
      color: var(--rd-text);
      box-shadow: none;
      transition: border-color .18s ease, background .18s ease, transform .18s ease;
    }
    #readonlyDiagnostics .readonly-feature-link::after,
    .readonly-diagnostics-root .readonly-feature-link::after {
      content: "";
      position: absolute;
      left: 12px;
      right: 12px;
      bottom: 0;
      height: 3px;
      border-radius: 999px;
      background: transparent;
    }
    #readonlyDiagnostics .readonly-feature-link:hover,
    .readonly-diagnostics-root .readonly-feature-link:hover {
      border-color: var(--rd-line);
      transform: translateY(-1px);
    }
    #readonlyDiagnostics .readonly-feature-link.is-active,
    .readonly-diagnostics-root .readonly-feature-link.is-active {
      border-color: rgba(47, 125, 246, 0.24);
      background: linear-gradient(180deg, var(--rd-surface) 0%, var(--rd-accent-soft) 100%);
      color: var(--rd-accent);
      box-shadow: inset 0 0 0 1px rgba(47, 125, 246, 0.08);
    }
    #readonlyDiagnostics .readonly-feature-link.is-active::after,
    .readonly-diagnostics-root .readonly-feature-link.is-active::after {
      background: var(--rd-accent);
    }
    #readonlyDiagnostics .readonly-feature-link strong,
    .readonly-diagnostics-root .readonly-feature-link strong,
    #readonlyDiagnostics .readonly-brief-title,
    .readonly-diagnostics-root .readonly-brief-title,
    #readonlyDiagnostics .card-title,
    .readonly-diagnostics-root .card-title {
      color: var(--rd-text);
    }
    #readonlyDiagnostics .readonly-feature-link span,
    .readonly-diagnostics-root .readonly-feature-link span,
    #readonlyDiagnostics .subtle,
    .readonly-diagnostics-root .subtle,
    #readonlyDiagnostics .readonly-brief-text,
    .readonly-diagnostics-root .readonly-brief-text {
      color: var(--rd-muted);
    }
    #readonlyDiagnostics .readonly-feature-brief,
    .readonly-diagnostics-root .readonly-feature-brief {
      margin: 0;
    }
    #readonlyDiagnostics .readonly-brief-copy,
    .readonly-diagnostics-root .readonly-brief-copy {
      border-color: var(--rd-line-soft);
      background: linear-gradient(135deg, var(--rd-surface) 0%, var(--rd-accent-soft) 100%);
      box-shadow: inset 4px 0 0 var(--rd-accent);
    }
    #readonlyDiagnostics .readonly-summary-sticky,
    .readonly-diagnostics-root .readonly-summary-sticky {
      margin-bottom: 0;
      padding: 10px 12px;
      border: 1px solid var(--rd-line-soft);
      border-radius: 15px;
      background: linear-gradient(180deg, var(--rd-surface) 0%, var(--rd-surface-alt) 100%);
      box-shadow: var(--rd-shadow-soft);
    }
    #readonlyDiagnostics .readonly-summary-sticky > .readonly-summary-grid,
    .readonly-diagnostics-root .readonly-summary-sticky > .readonly-summary-grid {
      gap: 12px !important;
      margin-top: 0 !important;
    }
    #readonlyDiagnostics .readonly-summary-sticky .metric-card,
    .readonly-diagnostics-root .readonly-summary-sticky .metric-card {
      min-height: 96px !important;
      border: 1px solid var(--rd-line-soft);
      border-radius: 13px;
      background: linear-gradient(180deg, var(--rd-surface) 0%, var(--rd-surface-alt) 100%);
      box-shadow: none;
    }
    #readonlyDiagnostics .readonly-summary-sticky .metric-label,
    .readonly-diagnostics-root .readonly-summary-sticky .metric-label {
      color: var(--rd-muted) !important;
      font-size: 11px;
      font-weight: 800;
    }
    #readonlyDiagnostics .readonly-summary-sticky .metric-value,
    .readonly-diagnostics-root .readonly-summary-sticky .metric-value {
      color: var(--rd-text) !important;
      font-size: 18px;
      font-weight: 900;
    }
    #readonlyDiagnostics .readonly-summary-sticky .metric-foot,
    .readonly-diagnostics-root .readonly-summary-sticky .metric-foot {
      color: var(--rd-dim) !important;
    }
    #readonlyDiagnostics .readonly-section-band,
    .readonly-diagnostics-root .readonly-section-band {
      position: relative;
      overflow: hidden;
      padding: 14px;
      border: 1px solid var(--rd-line-soft);
      border-radius: 18px;
      background: linear-gradient(180deg, var(--rd-surface) 0%, var(--rd-surface-alt) 100%);
      box-shadow: var(--rd-shadow-soft);
    }
    #readonlyDiagnostics .readonly-section-band::before,
    .readonly-diagnostics-root .readonly-section-band::before {
      content: "";
      display: block;
      width: 72px;
      height: 3px;
      margin-bottom: 12px;
      border-radius: 999px;
      background: var(--rd-accent);
      opacity: 0.9;
    }
    #readonlyDiagnostics .readonly-section-band.is-ok::before,
    .readonly-diagnostics-root .readonly-section-band.is-ok::before {
      background: var(--rd-ok);
    }
    #readonlyDiagnostics .readonly-section-band.is-warn::before,
    .readonly-diagnostics-root .readonly-section-band.is-warn::before {
      background: var(--rd-warn);
    }
    #readonlyDiagnostics .readonly-section-band.is-danger::before,
    .readonly-diagnostics-root .readonly-section-band.is-danger::before {
      background: var(--rd-danger);
    }
    #readonlyDiagnostics .readonly-band-head,
    .readonly-diagnostics-root .readonly-band-head {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      margin-bottom: 12px;
      align-items: start;
    }
    #readonlyDiagnostics .readonly-band-copy,
    .readonly-diagnostics-root .readonly-band-copy {
      min-width: 0;
    }
    #readonlyDiagnostics .readonly-band-eyebrow,
    .readonly-diagnostics-root .readonly-band-eyebrow {
      display: inline-flex;
      align-items: center;
      min-height: 22px;
      padding: 0 8px;
      border: 1px solid var(--rd-line-soft);
      border-radius: 999px;
      background: var(--rd-surface-muted);
      color: var(--rd-accent);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.04em;
    }
    #readonlyDiagnostics .readonly-band-title,
    .readonly-diagnostics-root .readonly-band-title {
      margin-top: 8px;
      color: var(--rd-text);
      font-size: 17px;
      font-weight: 900;
      line-height: 1.25;
    }
    #readonlyDiagnostics .readonly-band-desc,
    .readonly-diagnostics-root .readonly-band-desc {
      max-width: 78ch;
      margin-top: 4px;
      color: var(--rd-muted);
      font-size: 12px;
      line-height: 1.55;
    }
    #readonlyDiagnostics .readonly-band-signal,
    .readonly-diagnostics-root .readonly-band-signal {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      justify-content: flex-end;
      align-content: flex-start;
    }
    #readonlyDiagnostics .readonly-band-body,
    .readonly-diagnostics-root .readonly-band-body {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    #readonlyDiagnostics .readonly-band-body > .readonly-density-columns,
    #readonlyDiagnostics .readonly-band-body > .readonly-support-grid,
    #readonlyDiagnostics .readonly-band-body > .readonly-compact-grid,
    #readonlyDiagnostics .readonly-band-body > .readonly-wan-density-grid,
    #readonlyDiagnostics .readonly-band-body > .readonly-terminal-priority-grid,
    #readonlyDiagnostics .readonly-band-body > .readonly-grid-2,
    #readonlyDiagnostics .readonly-band-body > .readonly-grid-3,
    #readonlyDiagnostics .readonly-band-body > .readonly-grid-wide,
    .readonly-diagnostics-root .readonly-band-body > .readonly-density-columns,
    .readonly-diagnostics-root .readonly-band-body > .readonly-support-grid,
    .readonly-diagnostics-root .readonly-band-body > .readonly-compact-grid,
    .readonly-diagnostics-root .readonly-band-body > .readonly-wan-density-grid,
    .readonly-diagnostics-root .readonly-band-body > .readonly-terminal-priority-grid,
    .readonly-diagnostics-root .readonly-band-body > .readonly-grid-2,
    .readonly-diagnostics-root .readonly-band-body > .readonly-grid-3,
    .readonly-diagnostics-root .readonly-band-body > .readonly-grid-wide {
      gap: 12px;
    }
    #readonlyDiagnostics .readonly-global-strip,
    .readonly-diagnostics-root .readonly-global-strip {
      gap: 10px;
      margin: 0;
    }
    #readonlyDiagnostics .readonly-global-chip,
    .readonly-diagnostics-root .readonly-global-chip,
    #readonlyDiagnostics .readonly-kpi,
    .readonly-diagnostics-root .readonly-kpi,
    #readonlyDiagnostics .readonly-selfcheck-item,
    .readonly-diagnostics-root .readonly-selfcheck-item,
    #readonlyDiagnostics .readonly-selfcheck-detail,
    .readonly-diagnostics-root .readonly-selfcheck-detail,
    #readonlyDiagnostics .readonly-selfcheck-metric,
    .readonly-diagnostics-root .readonly-selfcheck-metric,
    #readonlyDiagnostics .readonly-mini-item,
    .readonly-diagnostics-root .readonly-mini-item,
    #readonlyDiagnostics .readonly-wan-line-tile,
    .readonly-diagnostics-root .readonly-wan-line-tile,
    #readonlyDiagnostics .readonly-wan-mini-kpi,
    .readonly-diagnostics-root .readonly-wan-mini-kpi,
    #readonlyDiagnostics .readonly-protocol-chip,
    .readonly-diagnostics-root .readonly-protocol-chip,
    #readonlyDiagnostics .readonly-rule-group,
    .readonly-diagnostics-root .readonly-rule-group {
      border-color: var(--rd-line-soft);
      background: linear-gradient(180deg, var(--rd-surface) 0%, var(--rd-surface-alt) 100%);
      box-shadow: none;
    }
    #readonlyDiagnostics .card,
    .readonly-diagnostics-root .card {
      border: 1px solid var(--rd-line-soft);
      border-radius: 14px;
      background: linear-gradient(180deg, var(--rd-surface) 0%, var(--rd-surface-alt) 100%);
      box-shadow: var(--rd-shadow-soft);
    }
    #readonlyDiagnostics .readonly-section-band .card,
    .readonly-diagnostics-root .readonly-section-band .card {
      box-shadow: none;
    }
    #readonlyDiagnostics .card-head,
    .readonly-diagnostics-root .card-head {
      padding: 12px 14px 0;
    }
    #readonlyDiagnostics .card-body,
    .readonly-diagnostics-root .card-body {
      padding: 10px 14px 14px;
    }
    #readonlyDiagnostics .readonly-note,
    .readonly-diagnostics-root .readonly-note {
      border-color: rgba(47, 125, 246, 0.16);
      background: var(--rd-surface-muted);
      color: var(--rd-accent);
    }
    #readonlyDiagnostics .readonly-pill,
    .readonly-diagnostics-root .readonly-pill {
      border-color: var(--rd-line-soft);
      background: var(--rd-surface-muted);
    }
    #readonlyDiagnostics .ops-table-wrap,
    .readonly-diagnostics-root .ops-table-wrap {
      border-color: var(--rd-line-soft);
      border-radius: 12px;
      background: var(--rd-surface);
    }
    #readonlyDiagnostics .readonly-table,
    .readonly-diagnostics-root .readonly-table {
      background: transparent;
    }
    #readonlyDiagnostics .readonly-table th,
    .readonly-diagnostics-root .readonly-table th {
      background: var(--rd-surface-muted);
      color: var(--rd-dim);
      box-shadow: 0 1px 0 var(--rd-line-soft);
    }
    #readonlyDiagnostics .readonly-table td,
    .readonly-diagnostics-root .readonly-table td {
      border-bottom-color: var(--rd-line-soft);
    }
    #readonlyDiagnostics .readonly-table tbody tr:nth-child(even),
    .readonly-diagnostics-root .readonly-table tbody tr:nth-child(even) {
      background: rgba(240, 247, 255, 0.68);
    }
  `;
  document.head.appendChild(style);

  const html = (value) => {
    if (typeof escapeHtml === "function") return escapeHtml(value);
    return String(value ?? "-")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  };
  const number = (value) => (typeof fmtNumber === "function" ? fmtNumber(value) : new Intl.NumberFormat("zh-CN").format(Number(value || 0)));
  const bytes = (value) => {
    if (typeof fmtBytes === "function") return fmtBytes(value);
    const units = ["B", "KB", "MB", "GB", "TB"];
    let size = Number(value || 0);
    let index = 0;
    while (size >= 1024 && index < units.length - 1) {
      size /= 1024;
      index += 1;
    }
    return `${size.toFixed(size >= 100 || index === 0 ? 0 : 1)} ${units[index]}`;
  };
  const rate = (value) => (typeof fmtRate === "function" ? fmtRate(value) : `${bytes(value)}/s`);
  const percent = (value) => `${Number(value || 0).toFixed(1)}%`;
  const list = (value) => (Array.isArray(value) ? value : []);
  const num = (value) => Number(value || 0);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value || 0)));

  function cell(main, sub = "", extra = "") {
    return `<div class="readonly-main ${extra}">${main || "-"}</div>${sub ? `<div class="readonly-sub">${sub}</div>` : ""}`;
  }

  function pill(text, level = "info") {
    return `<span class="readonly-pill ${level}">${html(text)}</span>`;
  }

  function card(title, subtle, body, extraClass = "") {
    return `
      <div class="card ${extraClass}">
        <div class="card-head">
          <div class="card-title">${html(title)}</div>
          <div class="subtle">${subtle || ""}</div>
        </div>
        <div class="card-body">${body}</div>
      </div>`;
  }

  function table(headers, rows, emptyText = "暂无只读数据", scrollClass = "readonly-scroll") {
    if (!rows.length) {
      return `<div class="empty">${html(emptyText)}</div>`;
    }
    return `
      <div class="ops-table-wrap ${scrollClass}">
        <table class="readonly-table">
          <thead><tr>${headers.map((item) => `<th>${html(item)}</th>`).join("")}</tr></thead>
          <tbody>${rows.join("")}</tbody>
        </table>
      </div>`;
  }

  function kpi(label, value, foot = "") {
    return `
      <div class="readonly-kpi">
        <div class="readonly-kpi-label">${html(label)}</div>
        <div class="readonly-kpi-value">${value}</div>
        <div class="readonly-kpi-foot">${foot || ""}</div>
      </div>`;
  }

  function progressRow(label, value, display, color = "#165dff") {
    const pct = `${clamp(value, 0, 100)}%`;
    return `
      <div class="readonly-progress">
        <div class="readonly-main">${html(label)}</div>
        <div class="readonly-progress-track"><div class="readonly-progress-fill" style="--pct:${pct};background:${color}"></div></div>
        <div class="readonly-main" style="text-align:right">${display}</div>
      </div>`;
  }

  function parseTime(value) {
    if (!value) return null;
    const text = String(value).replace(" ", "T");
    const ts = Date.parse(text);
    return Number.isFinite(ts) ? ts : null;
  }

  function ageSeconds(value) {
    const ts = parseTime(value);
    if (!ts) return null;
    return Math.max(0, Math.round((Date.now() - ts) / 1000));
  }

  function ageText(value) {
    const age = ageSeconds(value);
    if (age === null) return "未采集";
    if (age < 60) return `${age}s 前`;
    if (age < 3600) return `${Math.round(age / 60)}m 前`;
    return `${Math.round(age / 3600)}h 前`;
  }

  function levelByAge(value, thresholds) {
    const age = ageSeconds(value);
    if (age === null) return "danger";
    if (age >= thresholds.danger) return "danger";
    if (age >= thresholds.warn) return "warn";
    return "ok";
  }

  function collectionThreshold(base, pollSeconds, durationSeconds) {
    const poll = Math.max(0, Number(pollSeconds || 0));
    const duration = Math.max(0, Number(durationSeconds || 0));
    const expectedCycle = Math.max(poll, duration);
    if (!expectedCycle) return base;
    return {
      warn: Math.max(base.warn, Math.ceil(expectedCycle * 2.5 + 4)),
      danger: Math.max(base.danger, Math.ceil(expectedCycle * 4 + 8)),
    };
  }

  function levelText(level) {
    return level === "danger" ? "异常" : level === "warn" ? "关注" : level === "info" ? "说明" : "正常";
  }

  function canonicalName(name) {
    const raw = String(name || "").toLowerCase();
    if (raw.includes("openai")) return "OpenAI";
    if (raw.includes("cloudflare")) return "Cloudflare";
    if (raw.includes("github")) return "GitHub";
    if (raw.includes("youtube")) return "YouTube";
    if (raw.includes("google")) return "Google";
    if (raw.includes("apple")) return "Apple";
    if (raw.includes("douyin")) return "Douyin";
    if (raw.includes("bilibili")) return "Bilibili";
    if (raw.includes("steam")) return "Steam";
    if (raw.includes("paypal")) return "PayPal";
    return name || "-";
  }

  function groupedByService(rows) {
    return list(rows).reduce((acc, row) => {
      const key = canonicalName(row.service || row.name);
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
      return acc;
    }, {});
  }

  function isDnsErrorRow(row) {
    if (!row) return false;
    if (row.error) return true;
    if (row.rcode == null || row.rcode === "") return false;
    return Number(row.rcode) !== 0;
  }

  function latestExitIp(diag) {
    const ok = list(diag?.exitChecks).find((row) => row.ip && !row.error);
    return ok?.ip || "-";
  }

  function buildCollectionHealth(snapshot, diag) {
    const meta = snapshot.meta || {};
    const connections = snapshot.connections || {};
    const diagTime = diag?.generatedAt || null;
    const failureCount = (value) => Object.keys(value || {}).length;
    const restThreshold = collectionThreshold(FRESH.rest, meta.pollSeconds, meta.realtimeDurationSeconds);
    const slowThreshold = collectionThreshold(FRESH.static, meta.slowRestPollSeconds, meta.slowRestDurationSeconds);
    const detailThreshold = collectionThreshold(
      FRESH.connection,
      meta.connectionDetailPollSeconds,
      meta.connectionDetailDurationSeconds || connections.detailDurationSeconds,
    );
    const protocolThreshold = collectionThreshold(
      FRESH.protocol,
      meta.connectionProtocolPollSeconds || meta.connectionDetailPollSeconds,
      meta.connectionProtocolDurationSeconds || connections.protocolDurationSeconds,
    );
    const staticThreshold = collectionThreshold(FRESH.static, meta.staticPollSeconds, meta.staticDurationSeconds);
    return [
      {
        key: "REST 实时采集",
        value: meta.realtimeUpdatedAt || snapshot.updatedAt,
        level: meta.realtimeError ? "danger" : levelByAge(meta.realtimeUpdatedAt || snapshot.updatedAt, restThreshold),
        detail: meta.realtimeError || `资源 / 时钟 / 接口快采 · 最近耗时 ${number(meta.realtimeDurationSeconds || 0)}s · 端点重试 ${number(failureCount(meta.realtimeEndpointFailures))}`,
      },
      {
        key: "REST 拓扑列表",
        value: meta.slowRestUpdatedAt,
        level: meta.slowRestError ? "danger" : levelByAge(meta.slowRestUpdatedAt, slowThreshold),
        detail: meta.slowRestError || `PPPoE / 地址 / 路由 / ARP 慢采 · 最近耗时 ${number(meta.slowRestDurationSeconds || 0)}s · 端点重试 ${number(failureCount(meta.slowRestEndpointFailures))}`,
      },
      {
        key: "SSH 连接详情",
        value: meta.connectionDetailUpdatedAt || connections.detailUpdatedAt,
        level: meta.connectionDetailError ? "danger" : levelByAge(meta.connectionDetailUpdatedAt || connections.detailUpdatedAt, detailThreshold),
        detail: meta.connectionDetailError || `终端流量排行依赖此采集 · 最近耗时 ${number(meta.connectionDetailDurationSeconds || connections.detailDurationSeconds || 0)}s`,
      },
      {
        key: "连接协议统计",
        value: meta.connectionProtocolUpdatedAt || connections.protocolUpdatedAt,
        level: meta.connectionProtocolError ? "danger" : levelByAge(meta.connectionProtocolUpdatedAt || connections.protocolUpdatedAt, protocolThreshold),
        detail: meta.connectionProtocolError || `TCP / UDP / ICMP 统计 · 最近耗时 ${number(meta.connectionProtocolDurationSeconds || connections.protocolDurationSeconds || 0)}s`,
      },
      {
        key: "DNS 静态表",
        value: meta.staticUpdatedAt,
        level: meta.staticError ? "danger" : levelByAge(meta.staticUpdatedAt, staticThreshold),
        detail: meta.staticError || `DNS FWD / 静态规则快照 · 最近耗时 ${number(meta.staticDurationSeconds || 0)}s`,
      },
      {
        key: "只读体检探测",
        value: diagTime,
        level: STATE.error ? "danger" : levelByAge(diagTime, FRESH.diag),
        detail: STATE.error || (diag?.cached ? `缓存 ${diag.cacheAgeSeconds || 0}s` : "DNS / HTTP / 出口探测"),
      },
    ];
  }

  function summarizeDnsRows(dnsRows) {
    const rows = list(dnsRows);
    const answerRows = rows.filter((row) => list(row.answers).length);
    const fakeRows = answerRows.filter((row) => row.fakeIp);
    const realRows = answerRows.filter((row) => !row.fakeIp);
    const dnsErrors = answerRows.length ? [] : rows.filter(isDnsErrorRow);
    const answers = [...new Set(answerRows.flatMap((row) => list(row.answers)).filter(Boolean))];
    const dnsMode = !rows.length
      ? "none"
      : fakeRows.length && realRows.length
        ? "mixed"
        : fakeRows.length
          ? "fake"
          : realRows.length
            ? "real"
            : dnsErrors.length
              ? "error"
              : "unknown";
    const dnsState = dnsMode === "fake"
      ? "Fake-IP"
      : dnsMode === "mixed"
        ? "混合策略"
        : dnsMode === "real"
          ? "真实IP"
          : dnsMode === "error"
            ? "DNS异常"
            : "未采集";
    const policy = dnsMode === "fake"
      ? "代理/Fake-IP"
      : dnsMode === "mixed"
        ? "多 DNS 结果不一致"
        : dnsMode === "real"
          ? "真实IP/DIRECT倾向"
          : "未判断";
    return { rows, answers, dnsErrors, fakeRows, realRows, dnsMode, dnsState, policy };
  }

  function httpProbeState(http, tcpOk) {
    if (!http) return { state: "missing", label: "未采集", level: "warn", reachable: false };
    if (http.ok) return { state: "ok", label: `HTTP ${http.status || 200}`, level: "ok", reachable: true };
    const error = String(http.error || "").toLowerCase();
    if (tcpOk && (error.includes("timed out") || error.includes("timeout"))) {
      return { state: "soft-timeout", label: "HTTP 超时", level: "info", reachable: true };
    }
    return { state: "hard-fail", label: "HTTP 异常", level: "warn", reachable: false };
  }

  function dnsModePill(mode) {
    if (mode === "fake") return pill("Fake-IP", "info");
    if (mode === "mixed") return pill("混合", "info");
    if (mode === "real") return pill("真实IP", "ok");
    if (mode === "error") return pill("DNS异常", "warn");
    return pill("未采集", "warn");
  }

  function httpStatePill(state, label) {
    return pill(label, state === "ok" ? "ok" : state === "soft-timeout" ? "info" : "warn");
  }

  function buildSiteMatrix(diag) {
    const dnsGroups = groupedByService(diag?.dnsMatrix);
    const httpGroups = groupedByService(diag?.serviceReachability);
    const tcpGroups = groupedByService(diag?.tcpReachability);
    return SITE_ORDER.map((name) => {
      const dnsRows = list(dnsGroups[name]);
      const http = list(httpGroups[name])[0] || null;
      const tcp = list(tcpGroups[name])[0] || null;
      const expected = dnsRows[0]?.expected || http?.expected || tcp?.expected || "-";
      const dnsSummary = summarizeDnsRows(dnsRows);
      const httpSummary = httpProbeState(http, tcp?.ok);
      const fake = dnsSummary.dnsMode === "fake";
      const answers = dnsSummary.answers;
      const dnsErrors = dnsSummary.dnsErrors;
      const dnsState = dnsSummary.dnsState;
      const policy = dnsSummary.policy;
      let level = "ok";
      let verdict = expected === "mixed" ? "混合策略" : "符合预期";
      if (!dnsRows.length) {
        level = "warn";
        verdict = "未采集 DNS";
      } else if (dnsErrors.length) {
        level = "warn";
        verdict = "DNS 解析异常";
      } else if (expected === "direct" && dnsSummary.dnsMode === "fake") {
        level = "danger";
        verdict = "疑似国内误代理";
      } else if (expected === "proxy" && dnsSummary.dnsMode === "real") {
        level = "warn";
        verdict = "疑似海外未进代理";
      } else if (expected === "mixed") {
        level = "info";
        verdict = "混合策略";
        if (tcp && !tcp.ok) {
          level = "warn";
          verdict = "TCP 443 异常";
        } else if (httpSummary.state === "soft-timeout") {
          level = "info";
          verdict = "TCP 可达，HTTP 探测超时";
        } else if (httpSummary.state === "hard-fail") {
          level = "warn";
          verdict = "HTTP 可达异常";
        }
      } else if (dnsSummary.dnsMode === "mixed") {
        level = "info";
        verdict = "多 DNS 结果不一致";
      } else if (tcp && !tcp.ok) {
        level = "warn";
        verdict = "TCP 443 异常";
      } else if (httpSummary.state === "soft-timeout") {
        level = "info";
        verdict = "TCP 可达，HTTP 探测超时";
      } else if (httpSummary.state === "hard-fail") {
        level = "warn";
        verdict = "HTTP 可达异常";
      }
      return {
        name,
        expected,
        dnsMode: dnsSummary.dnsMode,
        dnsState,
        fake,
        answers,
        policy,
        http,
        httpState: httpSummary.state,
        httpLabel: httpSummary.label,
        httpReachable: httpSummary.reachable,
        tcp,
        level,
        verdict,
      };
    });
  }

  function splitPolicySummary(siteRows) {
    const rows = list(siteRows);
    const directMisproxy = rows.filter((row) => row.expected === "direct" && row.dnsMode === "fake");
    const proxyBypass = rows.filter((row) => row.expected === "proxy" && row.dnsMode === "real");
    const directMixed = rows.filter((row) => row.expected === "direct" && row.dnsMode === "mixed");
    const proxyMixed = rows.filter((row) => row.expected === "proxy" && row.dnsMode === "mixed");
    return {
      directMisproxy,
      proxyBypass,
      directMixed,
      proxyMixed,
      policyProblemCount: directMisproxy.length + proxyBypass.length,
      mixedCount: directMixed.length + proxyMixed.length,
    };
  }

  function interfaceErrorTotal(row) {
    return num(row.rxDrop) + num(row.txDrop) + num(row.rxError) + num(row.txError);
  }

  function logicalInterfaceIssueKey(row) {
    const name = String(row?.name || "");
    return /^macvlan/i.test(name) ? name.replace(/^macvlan/i, "vlan") : name;
  }

  function pickInterfaceIssueRow(current, candidate) {
    if (!current) return candidate;
    const currentMacvlan = /^macvlan/i.test(String(current.name || "")) || String(current.type || "").toLowerCase() === "macvlan";
    const candidateMacvlan = /^macvlan/i.test(String(candidate.name || "")) || String(candidate.type || "").toLowerCase() === "macvlan";
    if (currentMacvlan !== candidateMacvlan) return currentMacvlan ? candidate : current;
    const currentScore = interfaceErrorTotal(current) + num(current.txRate) + num(current.rxRate);
    const candidateScore = interfaceErrorTotal(candidate) + num(candidate.txRate) + num(candidate.rxRate);
    return candidateScore > currentScore ? candidate : current;
  }

  function interfaceIssueRows(snapshot) {
    const grouped = new Map();
    list(snapshot.interfaces).forEach((row) => {
      const errorTotal = interfaceErrorTotal(row);
      if (!errorTotal) return;
      const normalized = { ...row, errorTotal };
      const key = logicalInterfaceIssueKey(normalized);
      grouped.set(key, pickInterfaceIssueRow(grouped.get(key), normalized));
    });
    return [...grouped.values()].sort((a, b) => b.errorTotal - a.errorTotal || (num(b.txRate) + num(b.rxRate)) - (num(a.txRate) + num(a.rxRate)));
  }

  function worstLevel(rows) {
    const levels = list(rows).map((row) => row?.level || "warn");
    if (levels.includes("danger")) return "danger";
    if (levels.includes("warn")) return "warn";
    if (levels.includes("info")) return "info";
    return "ok";
  }

  function selfCheckStatus(level) {
    return level === "danger" ? "异常" : level === "warn" ? "需关注" : level === "info" ? "说明" : "正常";
  }

  function selfCheckSiteRows(diag, names) {
    const matrix = buildSiteMatrix(diag);
    return names.map((name) => matrix.find((row) => row.name === name) || {
      name,
      expected: "-",
      dnsState: "未采集",
      dnsMode: "none",
      fake: false,
      answers: [],
      policy: "未判断",
      http: null,
      httpState: "missing",
      httpLabel: "未采集",
      httpReachable: false,
      tcp: null,
      level: "warn",
      verdict: "等待只读探测",
    });
  }

  function selfCheckSiteDetailRows(rows) {
    return rows.map((row) => `
      <tr>
        <td>${cell(html(row.name), html(row.expected === "direct" ? "DIRECT 预期" : row.expected === "proxy" ? "代理预期" : row.expected))}</td>
        <td>${cell(html(row.dnsState), html(list(row.answers).slice(0, 2).join(", ") || "-"), "readonly-mono")}</td>
        <td>${row.tcp ? pill(row.tcp.ok ? "TCP 通" : "TCP 异常", row.tcp.ok ? "ok" : "warn") : pill("未采集", "warn")}</td>
        <td>${httpStatePill(row.httpState, row.httpLabel)}</td>
        <td>${pill(row.verdict, row.level)}</td>
      </tr>`);
  }

  function buildSelfCheckItems(diag) {
    const exitIp = latestExitIp(diag);
    const groupCheck = (key, title, button, names, goal) => {
      const rows = selfCheckSiteRows(diag, names);
      const level = diag ? worstLevel(rows) : "warn";
      const tcpOk = rows.filter((row) => row.tcp?.ok).length;
      const httpReachable = rows.filter((row) => row.httpReachable).length;
      const fakeCount = rows.filter((row) => row.dnsMode === "fake").length;
      const mixedCount = rows.filter((row) => row.dnsMode === "mixed").length;
      return {
        key,
        title,
        button,
        level,
        headers: ["站点", "DNS", "TCP443", "HTTP", "判断"],
        summary: diag ? goal : "还没有只读探测结果，点击后会刷新 DNS / TCP / HTTP / 出口检测。",
        metrics: [
          ["站点", `${rows.length} 个`],
          ["DNS", `${fakeCount} Fake / ${mixedCount} 混合`],
          ["TCP443", `${tcpOk}/${rows.length} 通`],
          ["HTTP", `${httpReachable}/${rows.length} 可达`],
        ],
        rows: selfCheckSiteDetailRows(rows),
      };
    };
    const siteRows = buildSiteMatrix(diag);
    const directRows = siteRows.filter((row) => row.expected === "direct");
    const proxyRows = siteRows.filter((row) => row.expected === "proxy");
    const directFake = directRows.filter((row) => row.dnsMode === "fake");
    const directMixed = directRows.filter((row) => row.dnsMode === "mixed");
    const directRealCount = directRows.filter((row) => row.dnsMode === "real").length;
    const proxyReal = proxyRows.filter((row) => row.dnsMode === "real");
    const proxyMixed = proxyRows.filter((row) => row.dnsMode === "mixed");
    const proxyFakeCount = proxyRows.filter((row) => row.dnsMode === "fake").length;
    const dnsLevel = !diag ? "warn" : directFake.length ? "danger" : proxyReal.length ? "warn" : (directMixed.length || proxyMixed.length) ? "info" : "ok";
    const dnsRows = [
      `<tr><td>直连站点真实 IP</td><td>${directRealCount}/${directRows.length}</td><td>${directFake.length ? pill("存在误代理", "danger") : directMixed.length ? pill("有混合", "info") : pill("正常", "ok")}</td><td>${html(directFake.map((row) => row.name).join(", ") || directMixed.map((row) => `${row.name}（多 DNS 不一致）`).join(", ") || "国内/直连站点未落 Fake-IP")}</td></tr>`,
      `<tr><td>代理站点 Fake-IP</td><td>${proxyFakeCount}/${proxyRows.length}</td><td>${proxyReal.length ? pill("需关注", "warn") : proxyMixed.length ? pill("有混合", "info") : pill("正常", "ok")}</td><td>${html(proxyReal.map((row) => row.name).join(", ") || proxyMixed.map((row) => `${row.name}（多 DNS 不一致）`).join(", ") || "海外代理站点已进入 Fake-IP/代理链路")}</td></tr>`,
      `<tr><td>出口样本</td><td>${html(exitIp)}</td><td>${pill(exitIp === "-" ? "未返回" : "只读", exitIp === "-" ? "warn" : "info")}</td><td>仅代表面板宿主当前出口，不自动改分流规则</td></tr>`,
    ];
    return [
      groupCheck("github", "GitHub / YouTube 外网", "检测 GitHub / YouTube 外网", ["GitHub", "YouTube", "Google"], "检查外网站点是否走 Fake-IP/代理倾向，并验证 TCP 443 与 HTTP 探测。"),
      groupCheck("apple", "Apple 订阅链路", "检测 Apple 订阅链路", ["Apple", "PayPal"], "检查 Apple/支付类链路是否保持真实 IP / DIRECT 倾向，并验证 HTTPS 可达。"),
      groupCheck("douyin", "抖音直连 CDN", "检测抖音直连 CDN", ["Douyin", "Bilibili"], "检查国内视频站是否解析到真实 IP，避免误走海外代理导致卡顿。"),
      {
        key: "dns",
        title: "DNS 泄漏 / 分流风险",
        button: "检测 DNS 泄漏风险",
        level: dnsLevel,
        headers: ["检查项", "结果", "状态", "说明"],
        summary: diag ? "对比直连站点和代理站点的解析结果，判断是否出现国内误代理或海外未进代理。" : "还没有只读探测结果，点击后会刷新 DNS 矩阵与出口样本。",
        metrics: [
          ["DNS 记录", `${number(list(diag?.dnsMatrix).length)} 条`],
          ["直连误代理", `${directFake.length} 个`],
          ["代理未进", `${proxyReal.length} 个`],
          ["出口", exitIp],
        ],
        rows: dnsRows,
      },
      {
        key: "webrtc",
        title: "WebRTC / STUN 风险",
        button: "查看 WebRTC / STUN 说明",
        level: "info",
        headers: ["项目", "结果", "状态", "说明"],
        summary: "WebRTC 真实泄漏必须在浏览器侧授权后测试。面板不会申请摄像头/麦克风权限，也不会自动发起 STUN 媒体探测。",
        metrics: [
          ["面板权限", "不申请媒体权限"],
          ["STUN 探测", "不自动发起"],
          ["网络侧", "只显示提示"],
          ["处理方式", "浏览器侧测试"],
        ],
        rows: [
          `<tr><td>为什么不能自动测</td><td>浏览器 WebRTC 泄漏依赖页面 JS 与媒体权限，服务器端面板无法代替浏览器授权。</td><td>${pill("说明", "info")}</td><td>避免面板误申请隐私权限</td></tr>`,
          `<tr><td>面板能做什么</td><td>展示 DNS、TCP、HTTP、出口 IP 与分流风险。</td><td>${pill("只读", "ok")}</td><td>不写配置、不改浏览器权限</td></tr>`,
          `<tr><td>需要你看哪里</td><td>浏览器 WebRTC 测试页是否暴露运营商公网 IP 或内网 IPv6。</td><td>${pill("人工确认", "warn")}</td><td>这类结果只能在客户端侧确认</td></tr>`,
        ],
      },
    ];
  }

  function terminalRiskScore(row) {
    let score = 0;
    const totalRate = num(row.upRate) + num(row.downRate);
    if (num(row.connections) > 200) score += 35;
    else if (num(row.connections) > 80) score += 20;
    if (totalRate > 5 * 1024 * 1024) score += 25;
    if (num(row.upRate) > 2 * 1024 * 1024) score += 20;
    if (num(row.sessionBytes) > 2 * 1024 * 1024 * 1024) score += 15;
    if (String(row.ip || "").includes(":")) score += 8;
    if (["failed", "incomplete", "declined"].includes(String(row.status || "").toLowerCase())) score += 20;
    return score;
  }

  function terminalRiskTags(row) {
    const tags = [];
    const totalRate = num(row.upRate) + num(row.downRate);
    if (num(row.connections) > 200) tags.push("连接暴涨");
    if (num(row.upRate) > 2 * 1024 * 1024) tags.push("上传异常");
    if (totalRate > 5 * 1024 * 1024) tags.push("大流量");
    if (String(row.ip || "").includes(":")) tags.push("IPv6");
    if (!tags.length) tags.push("观察");
    return tags;
  }

  function riskItems(snapshot, diag) {
    const items = [];
    const pppoe = list(snapshot.pppoe);
    const interfaces = interfaceIssueRows(snapshot);
    const dns = snapshot.dns || {};
    const connections = snapshot.connections || {};
    const dhcp = snapshot.dhcp || {};
    const distribution = list(snapshot.loadBalance?.distribution);
    const health = buildCollectionHealth(snapshot, diag);
    const stale = health.filter((row) => row.level !== "ok");
    const siteRows = buildSiteMatrix(diag);
    const splitSummary = splitPolicySummary(siteRows);

    if (snapshot.status !== "ok") items.push({ level: "danger", text: "采集服务异常" });
    if (stale.length) items.push({ level: stale.some((row) => row.level === "danger") ? "danger" : "warn", text: `采集新鲜度 ${stale.length} 项` });
    if (!dns.running) items.push({ level: "warn", text: "RouterOS DNS 未启用远程请求" });
    if (connections.protocolError) items.push({ level: "warn", text: "连接协议统计异常" });
    if (connections.detailError) items.push({ level: "danger", text: "连接详情采集异常" });
    if (pppoe.some((row) => !row.running)) items.push({ level: "danger", text: "存在离线宽带" });
    if (interfaces.length) items.push({ level: "warn", text: `接口错误 ${interfaces.length} 组` });
    const skew = distribution.some((row) => num(row.share) > 55 && distribution.length > 1);
    if (skew) items.push({ level: "warn", text: "线路负载明显偏斜" });
    if (list(dhcp.servers).length && !list(dhcp.servers).some((row) => row.running)) items.push({ level: "warn", text: "DHCP 服务未运行" });
    if (splitSummary.policyProblemCount) items.push({ level: "danger", text: `分流策略 ${splitSummary.policyProblemCount} 项` });
    if (diag?.status === "error") items.push({ level: "warn", text: "只读外部探测异常" });
    return items;
  }

  function globalRiskChips(snapshot, diag) {
    const health = buildCollectionHealth(snapshot, diag);
    const siteRows = buildSiteMatrix(diag);
    const splitSummary = splitPolicySummary(siteRows);
    const pppoe = list(snapshot.pppoe);
    const interfaces = interfaceIssueRows(snapshot);
    const dhcp = snapshot.dhcp || {};
    const distribution = list(snapshot.loadBalance?.distribution);
    const terminals = list(snapshot.terminals);
    const staleCount = health.filter((row) => row.level !== "ok").length;
    const dnsBad = list(diag?.dnsMatrix).filter(isDnsErrorRow).length;
    const proxyBad = splitSummary.policyProblemCount;
    const wanBad = pppoe.filter((row) => !row.running).length + distribution.filter((row) => num(row.share) > 55 && distribution.length > 1).length;
    const dhcpBad = list(dhcp.servers).length && !list(dhcp.servers).some((row) => row.running) ? 1 : 0;
    const highTerminals = terminals.filter((row) => terminalRiskScore(row) >= 45).length;
    const ipv6Risk = num(snapshot.meta?.ipv6TerminalCount) > 0 ? 1 : 0;
    const ifaceErrors = interfaces.length;
    return [
      { label: "采集延迟", value: staleCount, level: staleCount ? "danger" : "ok" },
      { label: "DNS 异常", value: dnsBad, level: dnsBad ? "warn" : "ok" },
      { label: "代理分流", value: proxyBad, level: proxyBad ? "warn" : "ok" },
      { label: "WAN 异常", value: wanBad, level: wanBad ? "warn" : "ok" },
      { label: "DHCP 异常", value: dhcpBad, level: dhcpBad ? "warn" : "ok" },
      { label: "高危终端", value: highTerminals, level: highTerminals ? "danger" : "ok" },
      { label: "IPv6 风险", value: ipv6Risk, level: ipv6Risk ? "warn" : "ok" },
      { label: "接口错误", value: ifaceErrors, level: ifaceErrors ? "warn" : "ok" },
    ];
  }

  function renderGlobalRiskStrip(snapshot, diag) {
    return `<div class="readonly-global-strip" data-readonly-global-strip>${globalRiskChips(snapshot, diag).map((item) => `
      <div class="readonly-global-chip ${item.level}">
        <span>${html(item.label)}</span>
        <strong>${number(item.value)}</strong>
      </div>`).join("")}</div>`;
  }

  function renderRiskSummary(snapshot, diag) {
    const risks = riskItems(snapshot, diag);
    const danger = risks.filter((item) => item.level === "danger").length;
    const warn = risks.filter((item) => item.level === "warn").length;
    const dnsRows = list(diag?.dnsMatrix);
    const services = list(diag?.serviceReachability);
    const exits = list(diag?.exitChecks);
    const status = danger ? "高风险" : warn ? "需关注" : "正常";
    const statusLevel = danger ? "danger" : warn ? "warn" : "ok";
    return `
      <div class="readonly-banner">
        <div class="readonly-hero">
          <div class="readonly-hero-title">只读运行体检 · ${pill(status, statusLevel)}</div>
          <div class="readonly-hero-copy">本页只展示与探测，不向 RouterOS / OpenWrt / ESXi 写入配置；用于快速定位采集新鲜度、DNS/代理分流、出口、服务可达、规则命中、终端风险、IPv6 和线路偏斜。</div>
          <div class="readonly-pill-row" style="margin-top:8px">
            ${risks.length ? risks.slice(0, 10).map((item) => pill(item.text, item.level)).join("") : pill("未发现明显风险", "ok")}
            ${risks.length > 10 ? pill(`+${risks.length - 10} 项`, "warn") : ""}
          </div>
        </div>
        ${kpi("风险项", `<span style="color:${danger ? "#d63b3b" : warn ? "#ad7200" : "#08a35c"}">${number(risks.length)}</span>`, `${number(danger)} 严重 / ${number(warn)} 关注`)}
        ${kpi("DNS 探测", number(dnsRows.length), STATE.loading && !diag ? "只读探测中" : diag ? `${diag.cached ? "缓存" : "实时"} · ${html(diag.generatedAt || "-")}` : "等待探测")}
        ${kpi("服务探测", number(services.length), services.length ? `${number(services.filter((row) => row.ok).length)} 可达` : "未完成")}
        ${kpi("出口探测", number(exits.length), exits.length ? `${number(exits.filter((row) => row.ip).length)} 有结果` : "未完成")}
      </div>`;
  }

  function renderCollectionHealth(snapshot, diag, compact = false) {
    const rows = buildCollectionHealth(snapshot, diag).map((row) => `
      <tr>
        <td>${cell(html(row.key), html(row.detail))}</td>
        <td>${pill(levelText(row.level), row.level)}</td>
        <td>${cell(html(ageText(row.value)), html(row.value || "-"), "readonly-mono")}</td>
        <td>${html(row.level === "ok" ? "页面/数据源同步中" : "优先排查采集线程或数据源")}</td>
      </tr>`);
    const body = table(["采集项", "状态", "最后更新", "判断"], rows, "暂无采集健康数据", compact ? "readonly-scroll" : "readonly-scroll-tall");
    return card("采集健康 / 数据新鲜度", "防止页面正常但后端采集卡死", body);
  }

  function renderSelfCheckPanel(diag) {
    const items = buildSelfCheckItems(diag);
    const activeKey = STATE.selfCheck.active || items[0]?.key;
    const active = items.find((item) => item.key === activeKey) || items[0];
    const refreshedText = STATE.selfCheck.refreshedAt
      ? `上次手动检测：${new Date(STATE.selfCheck.refreshedAt).toLocaleTimeString()}`
      : "尚未手动触发，本区展示最近一次只读探测缓存";
    const actionButtons = items.map((item) => {
      const busy = STATE.selfCheck.refreshing === item.key;
      return `
        <button class="readonly-selfcheck-item ${item.key === active.key ? "active" : ""}" data-readonly-refresh="${html(item.key)}" ${STATE.loading ? "disabled" : ""}>
          <span class="readonly-selfcheck-label">
            <strong>${html(item.button)}</strong>
            <span class="readonly-selfcheck-item-copy">${html(item.summary)}</span>
          </span>
          ${pill(busy ? "检测中" : selfCheckStatus(item.level), busy ? "warn" : item.level)}
        </button>`;
    });
    const metricCards = list(active.metrics).map(([label, value]) => `
      <div class="readonly-selfcheck-metric">
        <span>${html(label)}</span>
        <strong>${html(value)}</strong>
      </div>`).join("");
    return card("故障自检入口", "点击会刷新只读探测并在右侧显示对应结果；不自动修复、不写配置", `
      <div class="readonly-selfcheck-layout">
        <div class="readonly-selfcheck-list">${actionButtons.join("")}</div>
        <div class="readonly-selfcheck-detail ${active.level}">
          <div class="readonly-selfcheck-head">
            <div>
              <div class="readonly-selfcheck-title">${html(active.title)}</div>
              <div class="readonly-selfcheck-copy">${html(active.summary)}</div>
            </div>
            ${pill(STATE.selfCheck.refreshing === active.key ? "检测中" : selfCheckStatus(active.level), STATE.selfCheck.refreshing === active.key ? "warn" : active.level)}
          </div>
          <div class="readonly-selfcheck-metrics">${metricCards}</div>
          ${table(active.headers || ["项目", "结果", "状态", "说明"], active.rows, "等待只读探测结果", "readonly-scroll")}
          <div class="readonly-selfcheck-foot">${html(refreshedText)}；WebRTC/STUN 项仅做说明，不申请浏览器媒体权限。</div>
        </div>
      </div>`, "readonly-selfcheck-card-wide");
  }

  function renderSitePolicyMatrix(diag) {
    const exitIp = latestExitIp(diag);
    const rows = buildSiteMatrix(diag).map((row) => `
      <tr>
        <td>${cell(html(row.name), html(row.expected))}</td>
        <td>${cell(html(row.dnsState), html(row.answers.slice(0, 2).join(", ") || "-"), "readonly-mono")}</td>
        <td>${dnsModePill(row.dnsMode)}</td>
        <td>${html(row.policy)}</td>
        <td>${cell(html(exitIp), "当前面板出口，非逐站点出口", "readonly-mono")}</td>
        <td>${row.tcp ? pill(row.tcp.ok ? "TCP通" : "TCP失败", row.tcp.ok ? "ok" : "warn") : pill("未采集", "warn")}</td>
        <td>${cell(html(row.httpLabel), html(row.http ? `${number(row.http.elapsedMs)}ms` : "-"), "readonly-mono")}</td>
        <td>${pill(row.verdict, row.level)}</td>
      </tr>`);
    return card("DNS / 代理分流体检矩阵", "常用站点：解析、Fake-IP、策略、TCP/HTTP 与出口提示", table(["站点", "DNS 结果", "Fake-IP", "策略判断", "出口 IP", "TCP443", "HTTP/延迟", "判断"], rows, "等待只读分流探测", "readonly-scroll-tall"));
  }

  function renderDnsConsistency(diag) {
    const grouped = groupedByService(diag?.dnsMatrix);
    const serverOrder = ["OpenWrt DNS", "RouterOS DNS", "Panel System DNS"];
    const formatDnsCell = (serviceRows, serverName) => {
      const rows = serviceRows.filter((row) => row.serverName === serverName);
      const renderLine = (type) => {
        const row = rows.find((item) => item.type === type);
        if (!row) {
          return `<div class="readonly-dns-line"><span class="readonly-dns-kind">${type}</span><span class="readonly-dns-value warn">未采集</span></div>`;
        }
        const answers = list(row.answers);
        const level = row.error ? "warn" : row.fakeIp ? "info" : "";
        const value = row.error || answers.slice(0, 2).join(", ") || "无返回";
        return `<div class="readonly-dns-line"><span class="readonly-dns-kind">${type}</span><span class="readonly-dns-value ${level}">${html(value)}</span></div>`;
      };
      return `<div class="readonly-dns-pair">${renderLine("A")}${renderLine("AAAA")}</div>`;
    };
    const rows = SITE_ORDER.map((name) => {
      const serviceRows = list(grouped[name]);
      const expected = serviceRows[0]?.expected || "-";
      const fakeCount = serviceRows.filter((row) => row.fakeIp).length;
      const realCount = serviceRows.filter((row) => !row.fakeIp && list(row.answers).length).length;
      const errorCount = serviceRows.filter(isDnsErrorRow).length;
      const level = errorCount ? "warn" : expected === "proxy" ? (fakeCount ? "ok" : "warn") : (fakeCount ? "warn" : "ok");
      const verdict = errorCount
        ? `异常 ${number(errorCount)}`
        : expected === "proxy"
          ? (fakeCount ? "符合代理" : "真实IP")
          : (fakeCount ? "疑似误代理" : "真实IP");
      const elapsed = Math.max(...serviceRows.map((row) => num(row.elapsedMs)), 0);
      return `
        <tr>
          <td>${cell(html(name), html(serviceRows[0]?.domain || "-"))}</td>
          <td>${pill(expected, "info")}</td>
          ${serverOrder.map((serverName) => `<td>${formatDnsCell(serviceRows, serverName)}</td>`).join("")}
          <td>${cell(`${number(realCount)} 真 / ${number(fakeCount)} 假`, errorCount ? `${number(errorCount)} 个异常` : "无异常")}</td>
          <td>${pill(verdict, level)}</td>
          <td>${number(elapsed)} ms</td>
        </tr>`;
    });
    return card("DNS 解析一致性", "每个站点一行，对照 OpenWrt / RouterOS / 系统 DNS 的 A 与 AAAA 结果", table(["站点", "预期", "OpenWrt", "RouterOS", "系统", "真实/Fake", "判断", "最慢"], rows, "等待 DNS 只读探测", "readonly-scroll-tall"));
  }

  function renderExitTable(diag) {
    const rows = list(diag?.exitChecks).map((row) => `
      <tr>
        <td>${cell(html(row.name), html(new URL(row.url || "https://invalid.local").hostname))}</td>
        <td>${cell(row.ip ? html(row.ip) : "未返回", row.error ? html(row.error) : "ASN / 地理位置未采集", "readonly-mono")}</td>
        <td>${pill(row.error ? "异常" : "只读", row.error ? "warn" : "ok")}</td>
        <td>${number(row.elapsedMs)} ms</td>
      </tr>`);
    return card("出口 IP / ASN 对照表", "国内/海外/站点逐策略出口暂不改路由，仅显示当前面板出口", table(["探测源", "出口 / ASN", "状态", "耗时"], rows));
  }

  function renderServiceReachability(diag) {
    const httpRows = groupedByService(diag?.serviceReachability);
    const tcpRows = groupedByService(diag?.tcpReachability);
    const rows = SITE_ORDER.map((name) => {
      const http = list(httpRows[name])[0];
      const tcp = list(tcpRows[name])[0];
      const httpInfo = httpProbeState(http, tcp?.ok);
      return `
        <tr>
          <td>${html(name)}</td>
          <td>${tcp ? pill(tcp.ok ? "通" : "失败", tcp.ok ? "ok" : "warn") : pill("未采集", "warn")}</td>
          <td>${http ? (http.status ?? "-") : "-"}</td>
          <td>${httpStatePill(httpInfo.state, httpInfo.state === "soft-timeout" ? "超时但 TCP 通" : httpInfo.state === "ok" ? "可达" : httpInfo.label)}</td>
          <td>${number(Math.max(num(http?.elapsedMs), num(tcp?.elapsedMs)))} ms</td>
          <td>${html(httpInfo.state === "soft-timeout" ? "HTTP 内容探测超时，TCP 443 已可达" : http?.error || tcp?.error || "-")}</td>
        </tr>`;
    });
    return card("服务可达性矩阵", "DNS、TCP 443、HTTP 状态、延迟、错误信息", table(["服务", "TCP443", "HTTP", "状态", "延迟", "错误"], rows, "等待服务只读探测", "readonly-scroll-tall"));
  }

  function pppoeIndex(name) {
    const match = String(name || "").match(/pppoe-out(\d+)/i);
    return match ? Number(match[1]) : 9999;
  }

  function sortedPppoeRows(rows) {
    return list(rows).slice().sort((a, b) => pppoeIndex(a.name) - pppoeIndex(b.name) || String(a.name || "").localeCompare(String(b.name || "")));
  }

  function wanIpv4(row) {
    return list(row?.addresses).find((address) => /^\d+\./.test(String(address || ""))) || "";
  }

  function wanIpKind(row) {
    const raw = wanIpv4(row).split("/")[0];
    const parts = raw.split(".").map((part) => Number(part));
    if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return "未采集";
    if (parts[0] === 10 || (parts[0] === 192 && parts[1] === 168) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)) return "私网";
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return "CGNAT";
    return "公网";
  }

  function miniKpi(label, value, foot = "") {
    return `<div class="readonly-wan-mini-kpi"><span>${html(label)}</span><strong>${value}</strong>${foot ? `<span>${html(foot)}</span>` : ""}</div>`;
  }

  function clipText(value, max = 42) {
    const text = String(value ?? "-");
    return text.length > max ? `${text.slice(0, Math.max(0, max - 1))}…` : text;
  }

  function compactIpList(values, limit = Infinity) {
    const ips = list(values).map((ip) => String(ip || "").trim()).filter(Boolean);
    if (!ips.length) return "-";
    const ipv4 = ips.filter((ip) => !ip.includes(":"));
    const ipv6 = ips.filter((ip) => ip.includes(":"));
    const hasBoth = ipv4.length && ipv6.length;
    const perFamilyLimit = hasBoth ? Math.max(1, Math.ceil(limit / 2)) : limit;
    const family = (items) => {
      if (!items.length) return "";
      const shown = items.slice(0, perFamilyLimit).map((ip) => `<span class="readonly-ip-line" title="${html(ip)}">${html(ip)}</span>`).join("");
      const more = items.length > perFamilyLimit ? `<span class="readonly-more-line">+${number(items.length - perFamilyLimit)} 个地址</span>` : "";
      return `<span class="readonly-ip-family">${shown}${more}</span>`;
    };
    return `<div class="readonly-ip-stack">${family(ipv4)}${family(ipv6)}</div>`;
  }

  function renderProtocolDistribution(snapshot) {
    const connections = snapshot.connections || {};
    const total = Math.max(num(connections.total), 1);
    const hasProtocolCounts = [connections.tcp, connections.udp, connections.icmp].every((value) => Number.isFinite(Number(value)));
    const active = list(connections.active);
    const udp443 = active.filter((row) => String(row.protocol || "").toUpperCase().includes("UDP") && String(row.remoteIp || "").includes(":443"));
    const rows = [
      { label: "TCP", value: hasProtocolCounts ? num(connections.tcp) : 0, color: "#165dff", unavailable: !hasProtocolCounts },
      { label: "UDP", value: hasProtocolCounts ? num(connections.udp) : 0, color: "#16c67a", unavailable: !hasProtocolCounts },
      { label: "ICMP", value: hasProtocolCounts ? num(connections.icmp) : 0, color: "#ffb020", unavailable: !hasProtocolCounts },
      { label: "UDP 443", value: udp443.length, color: "#7c5cff", sample: true },
    ];
    const hotSamples = active
      .slice()
      .sort((a, b) => num(b.totalRate) - num(a.totalRate))
      .slice(0, 6);
    const topIpSamples = list(connections.topIps)
      .slice()
      .sort((a, b) => (num(b.upRate) + num(b.downRate) + num(b.connections) * 5000) - (num(a.upRate) + num(a.downRate) + num(a.connections) * 5000))
      .slice(0, 6);
    return card("连接协议分布 / QUIC / UDP 443", "协议占比 + 活跃样本同屏，避免只看百分比不知道谁在跑", `
      <div class="readonly-wan-kpi-strip">
        ${miniKpi("连接总数", number(connections.total), hasProtocolCounts ? `${number(connections.tcp)} TCP` : "协议未采集")}
        ${miniKpi("UDP 占比", hasProtocolCounts ? percent(num(connections.udp) / total * 100) : "未采集", hasProtocolCounts ? `${number(connections.udp)} 条` : "协议统计已降级")}
        ${miniKpi("TCP 占比", hasProtocolCounts ? percent(num(connections.tcp) / total * 100) : "未采集", hasProtocolCounts ? `${number(connections.tcp)} 条` : "协议统计已降级")}
        ${miniKpi("UDP443 样本", number(udp443.length), "QUIC/STUN 观察")}
      </div>
      <div class="readonly-mini-list">
        ${rows.map((row) => progressRow(row.label, row.sample ? Math.min(100, row.value * 5) : (row.unavailable ? 0 : row.value / total * 100), row.sample ? number(row.value) : (row.unavailable ? "未采集" : percent(row.value / total * 100)), row.color)).join("")}
      </div>
      <div class="readonly-protocol-sample">
        ${hotSamples.length ? hotSamples.map((row) => `
          <div class="readonly-protocol-chip">
            <strong>${html(row.localIp || "-")} · ${html(row.protocol || "-")}</strong>
            <span>${rate(row.upRate)} / ${rate(row.downRate)} · ${html(row.timeout || "-")}</span>
          </div>`).join("") : topIpSamples.map((row) => `
          <div class="readonly-protocol-chip">
            <strong>${html(row.displayName || row.hostname || row.ip)}</strong>
            <span>${html(row.ip || "-")} · ${number(row.connections)} 连接 · ${rate(row.upRate)} / ${rate(row.downRate)}</span>
          </div>`).join("") || `<div class="empty">暂无连接样本</div>`}
      </div>
      <div class="readonly-note" style="margin-top:8px">明细 ${html(connections.detailUpdatedAt || "未采集")} · 协议 ${html(connections.protocolUpdatedAt || "未采集")}</div>`, "readonly-dense-card");
  }

  function renderWanLoadPortrait(snapshot) {
    const distributionMap = Object.fromEntries(list(snapshot.loadBalance?.distribution).map((row) => [row.name, row]));
    const pppoe = sortedPppoeRows(snapshot.pppoe);
    const expected = pppoe.length ? 100 / pppoe.length : 0;
    const maxShare = Math.max(1, ...pppoe.map((row) => num(distributionMap[row.name]?.share)));
    const tiles = pppoe.map((row) => {
      const dist = distributionMap[row.name] || {};
      const share = num(dist.share);
      const diff = share - expected;
      const level = !row.running ? "danger" : Math.abs(diff) >= 20 ? "warn" : "";
      const activeRoutes = list(row.routes).filter((route) => route.active).length;
      return `
        <div class="readonly-wan-line-tile ${level}">
          <div class="readonly-wan-line-head">
            <div class="readonly-wan-line-name">${html(row.name)}</div>
            <div class="readonly-wan-line-share">${percent(share)}</div>
          </div>
          <div class="readonly-wan-meter"><span style="--pct:${clamp(share / maxShare * 100, 0, 100)}%"></span></div>
          <div class="readonly-wan-line-meta">
            <span>上行<strong>${rate(row.upRate)}</strong></span>
            <span>下行<strong>${rate(row.downRate)}</strong></span>
            <span>IP 类型<strong>${html(wanIpKind(row))}</strong></span>
            <span>路由<strong>${number(activeRoutes)} 活动</strong></span>
          </div>
        </div>`;
    });
    return card("WAN 线路画像", "按线路固定顺序展示占比、上下行、IP 类型和活动路由", `
      <div class="readonly-wan-kpi-strip">
        ${miniKpi("在线线路", `${number(pppoe.filter((row) => row.running).length)} / ${number(pppoe.length)}`, "PPPoE")}
        ${miniKpi("公网线路", number(pppoe.filter((row) => wanIpKind(row) === "公网").length), "真实公网地址")}
        ${miniKpi("私网/CGNAT", number(pppoe.filter((row) => ["私网", "CGNAT"].includes(wanIpKind(row))).length), "UPnP/入站需关注")}
        ${miniKpi("理论均分", percent(expected), "仅用于偏斜参考")}
      </div>
      <div class="readonly-wan-line-grid">${tiles.join("") || `<div class="empty">暂无 WAN 线路数据</div>`}</div>`, "readonly-dense-card");
  }

  function renderWanQuality(snapshot) {
    const distribution = list(snapshot.loadBalance?.distribution);
    const byName = Object.fromEntries(distribution.map((row) => [row.name, row]));
    const interfaces = Object.fromEntries(list(snapshot.interfaces).map((row) => [row.name, row]));
    const rows = sortedPppoeRows(snapshot.pppoe).map((row) => {
      const iface = interfaces[row.name] || {};
      const dist = byName[row.name] || {};
      const errorTotal = num(iface.rxDrop) + num(iface.txDrop) + num(iface.rxError) + num(iface.txError);
      const activeDefaults = list(row.routes).filter((route) => route.active).length;
      const quality = !row.running ? "离线" : errorTotal ? "接口错误" : num(dist.share) > 55 ? "负载偏斜" : "正常";
      const level = !row.running ? "danger" : errorTotal || num(dist.share) > 55 ? "warn" : "ok";
      return `
        <tr>
          <td>${cell(html(row.name), html(row.parent || "-"))}</td>
          <td>${pill(row.running ? "在线" : "离线", row.running ? "ok" : "danger")}</td>
          <td>未采集</td>
          <td>未采集</td>
          <td>未采集</td>
          <td>${number(activeDefaults)} 条</td>
          <td>${percent(dist.share)}</td>
          <td>${number(errorTotal)}</td>
          <td>${pill(quality, level)}</td>
        </tr>`;
    });
    return card("多 WAN 线路质量", "在线、默认路由、PCC 占比、接口错误；延迟/丢包/抖动保持未采集不造假", table(["线路", "在线", "延迟", "丢包", "抖动", "默认路由", "PCC占比", "错误", "5分钟判断"], rows, "暂无 WAN 线路数据", "readonly-scroll-tall"));
  }

  function renderPccSkew(snapshot) {
    const distribution = sortedPppoeRows(snapshot.loadBalance?.distribution);
    const expected = distribution.length ? 100 / distribution.length : 0;
    const busiest = distribution.slice().sort((a, b) => num(b.share) - num(a.share))[0] || {};
    const quietest = distribution.slice().sort((a, b) => num(a.share) - num(b.share))[0] || {};
    const skewCount = distribution.filter((row) => Math.abs(num(row.share) - expected) > 20).length;
    const totalUp = distribution.reduce((sum, row) => sum + num(row.upRate), 0);
    const totalDown = distribution.reduce((sum, row) => sum + num(row.downRate), 0);
    const rows = distribution.slice().sort((a, b) => num(b.share) - num(a.share)).slice(0, 6).map((row) => {
      const diff = num(row.share) - expected;
      const level = Math.abs(diff) > 20 ? "warn" : "ok";
      return `
        <tr>
          <td>${html(row.name)}</td>
          <td>${percent(expected)}</td>
          <td>${percent(row.share)}</td>
          <td>${rate(row.upRate)}</td>
          <td>${rate(row.downRate)}</td>
          <td>${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%</td>
          <td>${pill(Math.abs(diff) > 20 ? "偏斜" : "均衡", level)}</td>
        </tr>`;
    });
    const bars = distribution.map((row) => progressRow(row.name, num(row.share), percent(row.share), num(row.share) > 55 ? "#ffb020" : "#165dff")).join("");
    return card("PCC / 线路负载偏斜", "理论均分 vs 实际流量占比，只读判断不改策略", `
      <div class="readonly-wan-kpi-strip">
        ${miniKpi("最忙线路", html(busiest.name || "-"), percent(busiest.share))}
        ${miniKpi("最低线路", html(quietest.name || "-"), percent(quietest.share))}
        ${miniKpi("偏斜线路", number(skewCount), `阈值 ±20%`)}
        ${miniKpi("聚合速率", rate(totalUp), `下 ${rate(totalDown)}`)}
      </div>
      <div class="readonly-mini-list">${bars || `<div class="empty">暂无线路负载分布</div>`}</div>
      <div style="margin-top:8px">${table(["线路", "理论", "实际", "上行", "下行", "偏离", "判断"], rows, "暂无线路分布", "readonly-table-compact")}</div>`, "readonly-dense-card readonly-pcc-card");
  }

  function renderInterfaceErrorTable(snapshot) {
    const rows = interfaceIssueRows(snapshot)
      .slice(0, 14)
      .map((row) => `
        <tr>
          <td>${cell(html(row.name), html(row.type || row.role || "-"))}</td>
          <td>${pill(row.running ? "在线" : "离线", row.running ? "ok" : "danger")}</td>
          <td>${rate(row.txRate)}</td>
          <td>${rate(row.rxRate)}</td>
          <td>${number(row.rxDrop)} / ${number(row.txDrop)}</td>
          <td>${number(row.rxError)} / ${number(row.txError)}</td>
          <td>${pill(row.errorTotal ? "关注" : "正常", row.errorTotal ? "warn" : "ok")}</td>
        </tr>`);
    return card("接口错误健康表", "按逻辑接口去重展示 Top 14，macvlan / vlan 同源项不再重复计入", table(["接口", "状态", "实时上行", "实时下行", "丢包 RX/TX", "错误 RX/TX", "判断"], rows, "暂无接口数据", "readonly-scroll readonly-table-compact"));
  }

  function renderTerminalAnomalies(snapshot) {
    const terminals = list(snapshot.terminals);
    const rows = terminals.map((row) => ({ ...row, score: terminalRiskScore(row) }))
      .sort((a, b) => b.score - a.score || (num(b.upRate) + num(b.downRate)) - (num(a.upRate) + num(a.downRate)))
      .slice(0, 12)
      .map((row) => `
        <tr>
          <td>${cell(html(row.displayName || row.hostname || row.ip), html(row.ip), "readonly-mono")}</td>
          <td>${html(row.mac || "-")}</td>
          <td>${rate(row.upRate)}</td>
          <td>${rate(row.downRate)}</td>
          <td>${number(row.connections)}</td>
          <td>${html(row.lastSeen || "-")}</td>
          <td>${terminalRiskTags(row).map((tagText) => pill(tagText, row.score >= 45 ? "danger" : row.score >= 20 ? "warn" : "info")).join(" ")}</td>
        </tr>`);
    return card("终端异常排行 / 高风险矩阵", `按风险优先展示 Top ${number(Math.min(terminals.length, 12))} / ${number(terminals.length)} 台，只保留真实采集字段`, table(["终端", "MAC", "上行", "下行", "连接", "最近出现", "风险标签"], rows, "暂无终端风险数据", "readonly-scroll readonly-table-compact"));
  }

  function renderChangeBoard(snapshot) {
    const history = snapshot.overview?.history || {};
    const changes = [
      { label: "WAN 上行", values: list(history.uplink), unit: "rate" },
      { label: "WAN 下行", values: list(history.downlink), unit: "rate" },
      { label: "CPU", values: list(history.cpu), unit: "percent" },
      { label: "内存", values: list(history.memory), unit: "percent" },
      { label: "磁盘", values: list(history.disk), unit: "percent" },
    ].map((item) => {
      const values = item.values.map(num);
      const first = values[0] || 0;
      const last = values[values.length - 1] || 0;
      const delta = last - first;
      const display = item.unit === "rate" ? rate(Math.abs(delta)) : `${Math.abs(delta).toFixed(1)}%`;
      return { ...item, first, last, delta, display, score: Math.abs(delta) };
    }).sort((a, b) => b.score - a.score);

    const pppoe = list(snapshot.pppoe).slice().sort((a, b) => (num(b.upRate) + num(b.downRate)) - (num(a.upRate) + num(a.downRate))).slice(0, 5);
    return card("最近 10 分钟变化榜", "当前使用面板采样窗口，不足 10 分钟时按已有样本计算", `
      <div class="readonly-mini-list">
        ${changes.map((row) => `
          <div class="readonly-mini-item">
            <div class="readonly-main">${html(row.label)}</div>
            <div class="readonly-sub">当前 ${row.unit === "rate" ? rate(row.last) : `${row.last.toFixed(1)}%`}</div>
            <div class="readonly-main" style="text-align:right">${row.delta >= 0 ? "+" : "-"}${row.display}</div>
          </div>`).join("")}
      </div>
      <div class="readonly-note" style="margin-top:8px">当前最忙线路：${pppoe.length ? pppoe.map((row) => `${html(row.name)} ${rate(num(row.upRate) + num(row.downRate))}`).join(" · ") : "暂无线路速率"}</div>`);
  }

  function renderRuleHitTable(snapshot, diag) {
    const mangle = list(snapshot.loadBalance?.mangleRules).slice(0, 12).map((row) => `
      <tr>
        <td>${cell(html(row.comment || row.newRoutingMark || row.action), html(row.chain || "-"))}</td>
        <td>${html(row.action || "-")}</td>
        <td>${html(row.newRoutingMark || "-")}</td>
        <td>${number(row.packets)}</td>
        <td>${bytes(row.bytes)}</td>
      </tr>`);
    const nikkiRows = list(diag?.nikki?.providers).slice(0, 8).map((row) => `
      <tr>
        <td>${html(row.name)}</td>
        <td>${html(row.type || "-")}</td>
        <td>${number(row.ruleCount)}</td>
        <td>${html(row.updatedAt || "-")}</td>
      </tr>`);
    return `
      ${card("RouterOS Mangle 命中统计", "按包数/流量排序，只读计数", table(["规则", "动作", "路由标记", "包数", "流量"], mangle, "暂无 Mangle 命中数据"))}
      ${card("Nikki Provider 规则容量", diag?.nikki?.ok ? `Provider ${number(diag.nikki.providerCount)} 个 · 规则 ${number(diag.nikki.ruleCount)} 条` : html(diag?.nikki?.error || "Nikki 控制器未采集"), table(["Provider", "类型", "规则数", "更新时间"], nikkiRows, "暂无 Nikki provider 数据"))}`;
  }

  function renderIpv6Panel(snapshot) {
    const meta = snapshot.meta || {};
    const ifaces = list(snapshot.interfaces).filter((row) => list(row.ips).some((ip) => String(ip).includes(":")));
    const rows = ifaces.slice(0, 8).map((row) => `
      <tr>
        <td>${cell(html(row.name), html(row.type || row.role || "-"))}</td>
        <td>${pill(row.running ? "在线" : "离线", row.running ? "ok" : "danger")}</td>
        <td>${compactIpList(list(row.ips).filter((ip) => String(ip).includes(":")), row.name === "LAN" ? 3 : 2)}</td>
        <td>${rate(row.txRate)} / ${rate(row.rxRate)}</td>
      </tr>`);
    const ndRows = list(snapshot.dns?.ipv6Nd).slice(0, 6).map((row) => `
      <tr><td>${html(row.interface)}</td><td>${pill(row.advertiseDns ? "广播 DNS" : "不广播", row.advertiseDns ? "ok" : "warn")}</td><td>${html(list(row.dnsServers).join(", ") || "-")}</td><td>${html(row.raLifetime || "-")}</td></tr>`);
    return `
      ${card("IPv6 专区", "地址、邻居、RA / DHCPv6、泄漏风险只读展示", `
        <div class="ops-stat-grid">
          ${kpi("IPv6 地址", number(meta.ipv6AddressCount), "RouterOS 地址表")}
          ${kpi("IPv6 接口", number(meta.ipv6InterfaceCount), "带 IPv6 的接口")}
          ${kpi("IPv6 邻居", number(meta.ipv6NeighborCount), "邻居表")}
          ${kpi("IPv6 终端", number(meta.ipv6TerminalCount), "存在则关注绕过代理风险")}
        </div>
        <div style="margin-top:8px">${table(["接口", "状态", "IPv6 地址样本", "实时上/下"], rows, "暂无 IPv6 接口数据", "readonly-scroll readonly-table-compact")}</div>
        <div class="readonly-note" style="margin-top:8px">接口明细展示 ${number(Math.min(ifaces.length, 8))} / ${number(ifaces.length)} 项；LAN 地址只显示样本，避免整列被 IPv6 长地址撑爆。</div>`)}
      ${card("IPv6 RA / DHCPv6", "DNS 广播和客户端状态", table(["接口", "DNS 广播", "DNS 服务器", "RA 生命周期"], ndRows, "暂无 RA / DHCPv6 数据", "readonly-scroll readonly-table-compact"))}`;
  }

  function renderConfigDrift(snapshot, diag) {
    const meta = snapshot.meta || {};
    const dns = snapshot.dns || {};
    const lb = snapshot.loadBalance || {};
    const health = buildCollectionHealth(snapshot, diag);
    const checks = [
      { name: "只读保护", ok: true, warn: false, detail: "本页没有写入接口、没有配置提交动作" },
      { name: "采集新鲜度", ok: !health.some((row) => row.level === "danger"), warn: health.some((row) => row.level === "warn"), detail: `${health.filter((row) => row.level !== "ok").length} 项需关注` },
      { name: "DNS 运行", ok: Boolean(dns.running), detail: dns.running ? "允许远程请求已开启" : "RouterOS DNS 当前未开启远程请求" },
      { name: "DNS 规则容量", ok: num(dns.forwardRuleCount) > 0, warn: true, detail: `静态规则 ${number(dns.forwardRuleCount)} 条` },
      { name: "PCC / 分流识别", ok: Boolean(lb.pccDetected), warn: true, detail: lb.pccDetected ? "检测到 PCC/分流规则" : "未从规则注释或字段中识别 PCC" },
      { name: "连接协议采集", ok: !meta.connectionProtocolError, warn: true, detail: meta.connectionProtocolError || meta.connectionProtocolUpdatedAt || "未采集" },
      { name: "连接明细采集", ok: !meta.connectionDetailError, warn: true, detail: meta.connectionDetailError || meta.connectionDetailUpdatedAt || "未采集" },
      { name: "Nikki Provider", ok: Boolean(diag?.nikki?.ok), warn: true, detail: diag?.nikki?.ok ? `${number(diag.nikki.providerCount)} 组 / ${number(diag.nikki.ruleCount)} 条` : (diag?.nikki?.error || "未采集") },
      { name: "WebRTC/STUN", ok: true, warn: true, detail: "浏览器侧权限测试，不在面板自动申请媒体权限" },
    ];
    const rows = checks.map((row) => {
      const level = row.ok ? (row.warn ? "warn" : "ok") : "danger";
      return `<tr><td>${html(row.name)}</td><td>${pill(row.ok ? (row.warn ? "关注" : "通过") : "漂移", level)}</td><td>${html(row.detail)}</td></tr>`;
    });
    return card("配置漂移检测", "按当前快照与关键基线做只读判断", table(["检查项", "状态", "说明"], rows));
  }

  function renderTimeline(snapshot, diag) {
    const rows = [];
    if (snapshot.updatedAt) rows.push({ time: snapshot.updatedAt, type: "快照", msg: "RouterOS 面板快照刷新" });
    if (snapshot.meta?.staticUpdatedAt) rows.push({ time: snapshot.meta.staticUpdatedAt, type: "静态", msg: "DNS/路由/规则静态数据刷新" });
    if (snapshot.meta?.connectionProtocolUpdatedAt) rows.push({ time: snapshot.meta.connectionProtocolUpdatedAt, type: "连接", msg: "连接协议计数刷新" });
    if (snapshot.meta?.connectionDetailUpdatedAt) rows.push({ time: snapshot.meta.connectionDetailUpdatedAt, type: "连接", msg: "连接明细刷新" });
    if (diag?.generatedAt) rows.push({ time: diag.generatedAt, type: "只读", msg: diag.cached ? "只读探测缓存命中" : "只读探测刷新" });
    list(diag?.panelFiles).forEach((file) => {
      if (file.mtime) rows.push({ time: file.mtime, type: "面板文件", msg: `${file.path.split(/[\\/]/).pop()} 更新 / ${bytes(file.size)}` });
    });
    list(snapshot.logs?.all).slice(0, 12).forEach((row) => rows.push({ time: row.time, type: row.topics, msg: row.message }));
    const htmlRows = rows.slice(0, 24).map((row) => `<tr><td>${html(row.time)}</td><td>${pill(row.type || "-", "info")}</td><td>${html(row.msg)}</td></tr>`);
    return card("近期事件 / 配置变更时间线", "采集刷新、面板文件、RouterOS 高价值日志合并展示", table(["时间", "来源", "事件"], htmlRows, "暂无事件", "readonly-scroll-tall"));
  }

  function renderCapacity(snapshot, diag) {
    const dns = snapshot.dns || {};
    const dhcp = snapshot.dhcp || {};
    const security = snapshot.security || {};
    const logs = snapshot.logs || {};
    const conn = snapshot.connections || {};
    const route = snapshot.routes || {};
    const nikki = diag?.nikki || {};
    const items = [
      { label: "DNS 静态规则", value: dns.forwardRuleCount, meta: `${number(dns.disabledForwardRuleCount)} 停用` },
      { label: "DNS 缓存占用", value: dns.cacheUsed, meta: `${bytes(dns.cacheUsed)} / ${bytes(dns.cacheSize)}` },
      { label: "地址名单", value: list(security.addressLists).length, meta: "当前预览" },
      { label: "Nikki Provider", value: nikki.providerCount || 0, meta: `${number(nikki.ruleCount)} 条规则` },
      { label: "DHCP 租约", value: list(dhcp.leases).length, meta: `${list(dhcp.servers).length} 服务` },
      { label: "连接总数", value: conn.total, meta: `${number(conn.tcp)} TCP / ${number(conn.udp)} UDP` },
      { label: "默认路由", value: list(route.defaultRoutes).length, meta: `${number(route.tableCount)} 路由表` },
      { label: "只读写入", value: 0, meta: "本页禁止写配置" },
      { label: "系统日志", value: list(logs.all).length, meta: "当前缓存" },
    ];
    return card("缓存 / 规则容量", "防止规则截断、缓存异常、连接跟踪压力复发", `<div class="ops-stat-grid">${items.map((item) => kpi(item.label, number(item.value), html(item.meta))).join("")}</div>`);
  }

  function renderFeatureDensityHeader(snapshot, diag, section) {
    const page = getReadonlyPage(section);
    const health = buildCollectionHealth(snapshot, diag);
    const riskCount = riskItems(snapshot, diag).length;
    const staleCount = health.filter((row) => row.level !== "ok").length;
    const pageHints = {
      readonlyDiagnostics: "总览页用于一眼判断风险入口，不承载首页信息，也不触发任何修复动作。",
      collectionHealthDiagnostics: "这里专门看采集链路是否新鲜，终端排行不刷新时优先看 SSH 连接详情。",
      dnsProxyDiagnostics: "这里专门看 DNS、Fake-IP、出口与站点可达性，排查国内外分流和泄漏。",
      wanQualityDiagnostics: "这里专门看多 WAN、PCC 偏斜、路由表、协议和接口计数。",
      terminalRiskDiagnostics: "这里专门看终端异常、DHCP 租约、IPv6 暴露和设备风险。",
      systemAuditDiagnostics: "这里专门看配置漂移、容量、日志、面板文件和近期事件。",
    };
    return `
      <div class="readonly-feature-brief">
        <div class="readonly-brief-copy">
          <div class="readonly-brief-title">${html(page.title)} · 只读信息板</div>
          <div class="readonly-brief-text">${html(pageHints[section] || page.tip)}</div>
          <div class="readonly-pill-row" style="margin-top:7px">
            ${pill("不写配置", "ok")}
            ${pill("不重启服务", "ok")}
            ${pill("不改路由/防火墙", "ok")}
          </div>
        </div>
        <div class="readonly-brief-metrics">
          ${kpi("页面风险", number(riskCount), riskCount ? "有项目需关注" : "当前无集中风险")}
          ${kpi("采集异常", number(staleCount), `${number(health.length)} 个数据源`)}
          ${kpi("快照时间", html(snapshot.updatedAt || "-"), "REST /api/snapshot")}
          ${kpi("只读探测", diag ? html(diag.cached ? "缓存命中" : "实时完成") : html(STATE.loading ? "探测中" : "未返回"), html(diag?.generatedAt || STATE.error || "-"))}
          ${kpi("数据源", number(health.length + list(diag?.panelFiles).length), "快照 / 探测 / 文件")}
        </div>
      </div>`;
  }

  function renderReadonlyBand(eyebrow, title, desc, body, tone = "info", signal = "") {
    const toneClass = tone === "danger" || tone === "warn" || tone === "ok" ? `is-${tone}` : "is-info";
    return `
      <div class="readonly-section-band ${toneClass}">
        <div class="readonly-band-head">
          <div class="readonly-band-copy">
            <div class="readonly-band-eyebrow">${html(eyebrow)}</div>
            <div class="readonly-band-title">${html(title)}</div>
            <div class="readonly-band-desc">${html(desc)}</div>
          </div>
          ${signal ? `<div class="readonly-band-signal">${signal}</div>` : ""}
        </div>
        <div class="readonly-band-body">${body}</div>
      </div>`;
  }

  function renderReadonlyFeatureChrome(snapshot, section) {
    return `
      <div class="readonly-feature-sticky">
        ${renderReadonlyFeatureNav(section)}
        ${renderFeatureDensityHeader(snapshot, STATE.payload, section)}
      </div>`;
  }

  function renderDataSourceMap(snapshot, diag) {
    const meta = snapshot.meta || {};
    const conn = snapshot.connections || {};
    const restThreshold = collectionThreshold(FRESH.rest, meta.pollSeconds, meta.realtimeDurationSeconds);
    const slowThreshold = collectionThreshold(FRESH.static, meta.slowRestPollSeconds, meta.slowRestDurationSeconds);
    const detailThreshold = collectionThreshold(FRESH.connection, meta.connectionDetailPollSeconds, meta.connectionDetailDurationSeconds || conn.detailDurationSeconds);
    const protocolThreshold = collectionThreshold(FRESH.protocol, meta.connectionProtocolPollSeconds || meta.connectionDetailPollSeconds, meta.connectionProtocolDurationSeconds || conn.protocolDurationSeconds);
    const staticThreshold = collectionThreshold(FRESH.static, meta.staticPollSeconds, meta.staticDurationSeconds);
    const rows = [
      { name: "REST 快照", endpoint: "/api/snapshot · fast", updated: meta.realtimeUpdatedAt || snapshot.updatedAt, threshold: restThreshold, error: meta.realtimeError, feeds: "资源、时钟、接口速率、系统负载" },
      { name: "REST 拓扑列表", endpoint: `pppoe/routes/arp · ${number(meta.slowRestWorkers || 1)} 并发`, updated: meta.slowRestUpdatedAt, threshold: slowThreshold, error: meta.slowRestError, feeds: "PPPoE、地址、默认路由、ARP、DNS 状态" },
      { name: "SSH 连接详情", endpoint: "RouterOS SSH read-only", updated: meta.connectionDetailUpdatedAt || conn.detailUpdatedAt, threshold: detailThreshold, error: meta.connectionDetailError, feeds: "终端流量排行、连接数、活跃会话" },
      { name: "连接协议统计", endpoint: "RouterOS connection print", updated: meta.connectionProtocolUpdatedAt || conn.protocolUpdatedAt, threshold: protocolThreshold, error: meta.connectionProtocolError, feeds: "TCP / UDP / ICMP / UDP443 分布" },
      { name: "静态配置快照", endpoint: `DNS / routes / rules · ${number(meta.staticRestWorkers || 1)} 并发`, updated: meta.staticUpdatedAt, threshold: staticThreshold, error: meta.staticError, feeds: "DNS FWD、默认路由、Mangle、地址列表" },
      { name: "只读外部探测", endpoint: "/api/readonly-diagnostics", updated: diag?.generatedAt, threshold: FRESH.diag, feeds: "DNS 矩阵、TCP/HTTP、出口 IP、面板文件" },
      { name: "RouterOS 日志缓存", endpoint: "log print", updated: snapshot.updatedAt, threshold: FRESH.rest, feeds: "近期事件、故障时间线" },
    ].map((row) => {
      const level = row.error ? "danger" : row.name === "只读外部探测" && STATE.error ? "danger" : levelByAge(row.updated, row.threshold);
      return `
        <tr>
          <td>${cell(html(row.name), html(row.endpoint), "readonly-mono")}</td>
          <td>${pill(levelText(level), level)}</td>
          <td>${cell(html(ageText(row.updated)), `${html(clipText(row.feeds, 34))}<br><span class="readonly-mono">${html(row.updated || "-")}</span>`)}</td>
        </tr>`;
    });
    return card("数据源地图", "数据来源、刷新年龄和影响范围压缩在同一行", table(["数据源", "状态", "刷新 / 影响"], rows, "暂无数据源", "readonly-scroll readonly-table-compact"), "readonly-dense-card");
  }

  function renderCollectionImpactMatrix(snapshot, diag) {
    const rows = buildCollectionHealth(snapshot, diag).map((row) => {
      const impact = {
        "REST 实时采集": "全站基础卡片、接口、WAN、终端、系统资源",
        "SSH 连接详情": "首页终端流量排行、终端风险、连接数排行",
        "连接协议统计": "QUIC/UDP443、测速/视频/代理隧道观察",
        "DNS 静态表": "DNS 规则、分流判断、配置漂移基线",
        "只读体检探测": "DNS 泄漏、出口 IP、服务可达性、面板文件",
      }[row.key] || "关联诊断页";
      return `
        <tr>
          <td>${html(row.key)}</td>
          <td>${pill(levelText(row.level), row.level)}</td>
          <td>${html(row.detail)}</td>
          <td>${html(impact)}</td>
          <td>${html(row.level === "ok" ? "继续观察" : "优先确认采集线程和数据源")}</td>
        </tr>`;
    });
    return card("采集影响面矩阵", "把“哪个采集卡住会影响哪里”直接列出来", table(["采集项", "状态", "详情", "影响页面", "排查优先级"], rows), "readonly-dense-card");
  }

  function renderDnsProbeCoverage(diag) {
    const dnsGroups = groupedByService(diag?.dnsMatrix);
    const tcpGroups = groupedByService(diag?.tcpReachability);
    const httpGroups = groupedByService(diag?.serviceReachability);
    const rows = SITE_ORDER.map((name) => {
      const dnsRows = list(dnsGroups[name]);
      const tcp = list(tcpGroups[name])[0];
      const http = list(httpGroups[name])[0];
      const fake = dnsRows.filter((row) => row.fakeIp).length;
      const real = dnsRows.flatMap((row) => list(row.answers)).filter(Boolean).length - fake;
      const errors = dnsRows.filter(isDnsErrorRow).length;
      return `
        <tr>
          <td>${html(name)}</td>
          <td>${html(dnsRows[0]?.expected || http?.expected || tcp?.expected || "-")}</td>
          <td>${number(dnsRows.length)}</td>
          <td>${number(real)} / ${number(fake)}</td>
          <td>${number(errors)}</td>
          <td>${tcp ? pill(tcp.ok ? "通" : "失败", tcp.ok ? "ok" : "warn") : pill("未采集", "warn")}</td>
          <td>${http ? `${http.status ?? "-"} / ${number(http.elapsedMs)}ms` : "-"}</td>
        </tr>`;
    });
    return card("站点探测覆盖明细", "每个常用站点到底测了哪些层：DNS、真实/Fake-IP、TCP、HTTP", table(["站点", "预期", "DNS样本", "真实/Fake", "DNS异常", "TCP443", "HTTP/延迟"], rows, "等待探测"), "readonly-dense-card");
  }

  function renderDnsRuleInventory(snapshot) {
    const dns = snapshot.dns || {};
    const rows = list(dns.forwardRules).slice(0, 28).map((row) => `
      <tr>
        <td>${cell(html(row.name), html(row.comment || "-"))}</td>
        <td>${html(row.type || "-")}</td>
        <td>${cell(html(row.value || "-"), html(row.ttl || "-"), "readonly-mono")}</td>
        <td>${pill(row.disabled ? "停用" : "启用", row.disabled ? "warn" : "ok")}</td>
      </tr>`);
    return card("DNS 静态 / FWD 规则预览", `总数 ${number(dns.forwardRuleCount)} · 停用 ${number(dns.disabledForwardRuleCount)}`, table(["域名/规则", "类型", "值 / TTL", "状态"], rows, "暂无 DNS 规则", "readonly-scroll-tall"), "readonly-dense-card");
  }

  function renderExitDecisionBoard(diag) {
    const siteRows = buildSiteMatrix(diag);
    const fake = siteRows.filter((row) => row.fake).length;
    const real = siteRows.filter((row) => !row.fake && row.answers.length).length;
    const dnsBad = siteRows.filter((row) => row.verdict.includes("DNS")).length;
    const httpBad = siteRows.filter((row) => row.http && !row.http.ok).length;
    const tcpBad = siteRows.filter((row) => row.tcp && !row.tcp.ok).length;
    return card("分流判定摘要", "把复杂矩阵压成几个关键计数，方便先判断方向", `
      <div class="ops-stat-grid">
        ${kpi("真实 IP 倾向", number(real), "一般更偏 DIRECT")}
        ${kpi("Fake-IP 倾向", number(fake), "一般更偏代理")}
        ${kpi("DNS 异常站点", number(dnsBad), "解析失败或返回异常")}
        ${kpi("TCP 异常站点", number(tcpBad), "443 连接失败")}
        ${kpi("HTTP 异常站点", number(httpBad), "站点层可达异常")}
        ${kpi("当前出口", html(latestExitIp(diag)), "面板侧出口参考")}
      </div>
      <div class="readonly-note" style="margin-top:8px">这里只做只读归因，不会自动改 DNS、Nikki 规则、OpenWrt 代理或 RouterOS 路由。</div>`, "readonly-dense-card");
  }

  function renderWanLineInventory(snapshot) {
    const routeByLine = Object.fromEntries(list(snapshot.loadBalance?.distribution).map((row) => [row.name, row]));
    const rows = sortedPppoeRows(snapshot.pppoe).map((row) => {
      const dist = routeByLine[row.name] || {};
      const routeText = list(row.routes).map((route) => `${route.table || "main"}/${route.distance || "-"}`).join(", ") || "-";
      return `
        <tr>
          <td>${cell(html(row.name), html(row.parent || "-"))}</td>
          <td>${pill(row.running ? "在线" : "离线", row.running ? "ok" : "danger")}</td>
          <td>${cell(compactIpList(row.addresses), "", "readonly-mono")}</td>
          <td>${rate(row.upRate)}</td>
          <td>${rate(row.downRate)}</td>
          <td>${bytes(row.txBytes)} / ${bytes(row.rxBytes)}</td>
          <td>${percent(dist.share)}</td>
          <td>${html(routeText)}</td>
        </tr>`;
    });
    return card("WAN 线路清单", `${number(rows.length)} 条 WAN/PPPoE 的地址、父接口、速率、累计和路由表关系`, table(["线路", "状态", "地址", "上行", "下行", "累计上/下", "占比", "路由表"], rows, "暂无 WAN 数据", "readonly-scroll-tall"), "readonly-dense-card");
  }

  function renderDefaultRouteCompass(snapshot) {
    const routes = snapshot.routes || {};
    const defaults = list(routes.defaultRoutes);
    const activeDefaults = defaults.filter((row) => row.active && !row.disabled);
    const mainDefaults = defaults.filter((row) => row.table === "main");
    const lineRows = sortedPppoeRows(snapshot.pppoe).map((row) => {
      const lineDefaults = defaults.filter((route) => route.gateway === row.name);
      const main = lineDefaults.find((route) => route.table === "main");
      const own = lineDefaults.find((route) => route.table === `r${pppoeIndex(row.name)}`);
      return `
        <tr>
          <td>${html(row.name)}</td>
          <td>${pill(row.running ? "在线" : "离线", row.running ? "ok" : "danger")}</td>
          <td>${main ? `${html(main.table)} / ${html(main.distance || "-")}` : "-"}</td>
          <td>${own ? `${html(own.table)} / ${html(own.distance || "-")}` : "-"}</td>
          <td>${pill(main?.active || own?.active ? "活动" : "关注", main?.active || own?.active ? "ok" : "warn")}</td>
        </tr>`;
    });
    return card("默认路由罗盘", "把 main 默认、各线路表默认和活动状态压缩在一屏", `
      <div class="readonly-wan-kpi-strip">
        ${miniKpi("默认路由", number(defaults.length), `${number(activeDefaults.length)} 活动`)}
        ${miniKpi("main 表", number(mainDefaults.length), `${number(mainDefaults.filter((row) => row.active).length)} 活动`)}
        ${miniKpi("路由表", number(routes.tableCount), `${number(routes.staticCount)} 静态`)}
        ${miniKpi("动态路由", number(routes.dynamicCount), "只读统计")}
      </div>
      ${table(["线路", "拨号", "main / distance", "专用表 / distance", "判断"], lineRows, "暂无默认路由数据")}`, "readonly-dense-card");
  }

  function renderRouteInventory(snapshot) {
    const routes = snapshot.routes || {};
    const defaultRows = list(routes.defaultRoutes);
    const staticSample = list(routes.staticRoutes).filter((row) => !row.default).slice(0, 4);
    const rows = defaultRows.concat(staticSample).slice(0, 8).map((row) => `
      <tr>
        <td>${cell(html(row.dstAddress || "-"), html(clipText(row.comment || "-", 28)))}</td>
        <td>${html(row.table || "-")}</td>
        <td>${html(clipText(row.gateway || "-", 30))}</td>
        <td>${html(row.distance || "-")}</td>
        <td>${pill(row.active ? "活动" : "非活动", row.active ? "ok" : "warn")}</td>
        <td>${pill(row.disabled ? "停用" : "启用", row.disabled ? "warn" : "ok")}</td>
      </tr>`);
    return card("默认 / 静态路由库存", `展示默认路由 + 静态样本 ${number(rows.length)} 条；总静态 ${number(routes.staticCount)}`, table(["目标", "表", "网关", "距离", "活动", "启用"], rows, "暂无路由数据", "readonly-scroll readonly-table-compact"), "readonly-dense-card");
  }

  function renderRoutingRuleInventory(snapshot) {
    const rules = list(snapshot.loadBalance?.routingRules);
    const groups = Object.values(rules.reduce((acc, row) => {
      const key = row.table || "-";
      if (!acc[key]) acc[key] = { table: key, total: 0, active: 0, disabled: 0, inactive: 0, ipv6: 0, samples: [] };
      acc[key].total += 1;
      if (row.disabled) acc[key].disabled += 1;
      if (row.inactive) acc[key].inactive += 1;
      if (!row.disabled && !row.inactive) acc[key].active += 1;
      if (String(row.srcAddress || row.dstAddress || "").includes(":")) acc[key].ipv6 += 1;
      if (acc[key].samples.length < 2) acc[key].samples.push(row.comment || row.srcAddress || row.action || "-");
      return acc;
    }, {})).sort((a, b) => pppoeIndex(a.table) - pppoeIndex(b.table) || String(a.table).localeCompare(String(b.table)));
    const lookupOnly = rules.filter((row) => String(row.action || "").includes("lookup-only")).length;
    const groupCards = groups.slice(0, 6).map((row) => `
      <div class="readonly-rule-group">
        <strong><span>${html(row.table)}</span><span>${number(row.active)} / ${number(row.total)}</span></strong>
        <span>${row.samples.map(html).join(" · ") || "无样本"} · IPv6 ${number(row.ipv6)}</span>
      </div>`);
    const samples = rules.slice(0, 4).map((row) => `
      <div class="readonly-protocol-chip">
        <strong>${html(row.table || "-")} · ${html(row.action || "-")}</strong>
        <span>${html(row.comment || row.srcAddress || "-")} · ${row.disabled ? "停用" : row.inactive ? "未活动" : "活动"}</span>
      </div>`);
    return card("Routing Rule 摘要", "先看分组和状态，再看样本；避免长表独占整页", `
      <div class="readonly-wan-kpi-strip">
        ${miniKpi("规则总数", number(rules.length), `${number(lookupOnly)} lookup-only`)}
        ${miniKpi("活动规则", number(rules.filter((row) => !row.disabled && !row.inactive).length), "disabled/inactive 已剔除")}
        ${miniKpi("IPv6 源策略", number(rules.filter((row) => String(row.srcAddress || "").includes(":")).length), "源地址分流")}
        ${miniKpi("涉及表", number(groups.length), groups.slice(0, 4).map((row) => row.table).join(" / "))}
      </div>
      <div class="readonly-rule-group-grid">${groupCards.join("") || `<div class="empty">暂无 Routing Rule 分组</div>`}</div>
      <div class="readonly-protocol-sample">${samples.join("") || `<div class="empty">暂无 Routing Rule 样本</div>`}</div>`, "readonly-dense-card");
  }

  function renderMangleHitDigest(snapshot) {
    const rules = list(snapshot.loadBalance?.mangleRules);
    const byMark = Object.values(rules.reduce((acc, row) => {
      const mark = row.newRoutingMark || row.action || "-";
      if (!acc[mark]) acc[mark] = { mark, rules: 0, packets: 0, bytes: 0, comments: [] };
      acc[mark].rules += 1;
      acc[mark].packets += num(row.packets);
      acc[mark].bytes += num(row.bytes);
      if (row.comment && acc[mark].comments.length < 2) acc[mark].comments.push(row.comment);
      return acc;
    }, {})).sort((a, b) => b.bytes - a.bytes || b.packets - a.packets);
    const rows = byMark.slice(0, 10).map((row) => `
      <tr>
        <td>${html(row.mark)}</td>
        <td>${number(row.rules)}</td>
        <td>${bytes(row.bytes)}</td>
        <td><span class="readonly-clip readonly-mono" title="${html(row.comments.join(" / ") || "-")}">${row.comments.map(html).join(" / ") || "-"}</span></td>
      </tr>`);
    return card("Mangle 命中摘要", "按路由标记聚合命中，快速看哪类策略实际在跑", `
      <div class="readonly-wan-kpi-strip">
        ${miniKpi("Mangle 规则", number(rules.length), "只读计数")}
        ${miniKpi("命中分组", number(byMark.length), "按 routing mark")}
        ${miniKpi("最高流量", byMark[0] ? html(byMark[0].mark) : "-", byMark[0] ? bytes(byMark[0].bytes) : "")}
        ${miniKpi("PCC 识别", snapshot.loadBalance?.pccDetected ? "已检测" : "未检测", "来自快照")}
      </div>
      ${table(["标记", "规则", "流量", "样本注释"], rows, "暂无 Mangle 数据")}`, "readonly-dense-card");
  }

  function renderTerminalInventory(snapshot) {
    const terminals = list(snapshot.terminals);
    const rows = terminals
      .slice()
      .sort((a, b) => (num(b.upRate) + num(b.downRate) + num(b.connections) * 5000) - (num(a.upRate) + num(a.downRate) + num(a.connections) * 5000))
      .slice(0, 12)
      .map((row) => `
        <tr>
          <td>${cell(html(row.displayName || row.hostname || row.ip), html(row.ip), "readonly-mono")}</td>
          <td>${html(row.mac || "-")}</td>
          <td>${pill(row.status || "unknown", String(row.status || "").toLowerCase() === "bound" || String(row.status || "").toLowerCase() === "reachable" ? "ok" : "info")}</td>
          <td>${rate(row.upRate)}</td>
          <td>${rate(row.downRate)}</td>
          <td>${number(row.connections)}</td>
          <td>${bytes(row.sessionBytes)}</td>
          <td>${html(row.lastSeen || "-")}</td>
        </tr>`);
    return card("终端密集清单", `按活跃度展示 Top ${number(Math.min(terminals.length, 12))} / ${number(terminals.length)} 台，避免长表挤掉 IPv6/DHCP 信息`, table(["终端", "MAC", "状态", "上行", "下行", "连接", "会话流量", "最近出现"], rows, "暂无终端数据", "readonly-scroll readonly-table-compact"), "readonly-dense-card");
  }

  function renderDhcpLeaseMatrix(snapshot) {
    const leases = list(snapshot.dhcp?.leases);
    const rows = leases.slice(0, 12).map((row) => `
      <tr>
        <td>${cell(html(row.displayName || row.hostname || row.address), html(row.address), "readonly-mono")}</td>
        <td>${html(row.mac || "-")}</td>
        <td>${html(row.server || "-")}</td>
        <td>${pill(row.status || "-", String(row.status || "").toLowerCase() === "bound" ? "ok" : "warn")}</td>
        <td>${pill(row.static ? "静态" : "动态", row.static ? "info" : "ok")}</td>
        <td>${html(row.lastSeen || "-")}</td>
      </tr>`);
    return card("DHCP 租约矩阵", `展示 Top ${number(Math.min(leases.length, 12))} / ${number(leases.length)} 条 · 服务 ${number(list(snapshot.dhcp?.servers).length)}`, table(["设备", "MAC", "服务", "状态", "类型", "最后出现"], rows, "暂无 DHCP 租约", "readonly-scroll readonly-table-compact"), "readonly-dense-card");
  }

  function renderSecuritySignals(snapshot) {
    const securityAlerts = list(snapshot.security?.alerts);
    const arpAlerts = list(snapshot.arp?.alerts);
    const addrRows = list(snapshot.security?.addressLists).slice(0, 12).map((row) => `
      <tr>
        <td>${html(row.list || "-")}</td>
        <td>${html(clipText(row.address || "-", 34))}</td>
        <td>${html(row.timeout || "-")}</td>
        <td>${html(clipText(row.comment || "-", 42))}</td>
      </tr>`);
    const alertRows = securityAlerts.concat(arpAlerts).slice(0, 12).map((row) => {
      const text = typeof row === "string" ? row : (row.message || row.text || JSON.stringify(row));
      return `<tr><td>${pill("只读告警", "warn")}</td><td>${html(text)}</td></tr>`;
    });
    return `
      ${card("安全 / ARP 告警摘要", "只读展示，不创建封禁或规则", table(["类型", "内容"], alertRows, "当前没有安全或 ARP 告警", "readonly-scroll readonly-wrap-table"))}
      ${card("地址列表预览", "展示 Top 12 样本，便于观察关键名单和规则容量", table(["列表", "地址", "超时", "注释"], addrRows, "暂无地址列表", "readonly-scroll readonly-table-compact"))}`;
  }

  function renderIpv6ExposureMatrix(snapshot) {
    const ipv6Terminals = list(snapshot.terminals).filter((row) => String(row.ip || "").includes(":"));
    const rows = ipv6Terminals.slice(0, 6).map((row) => `
      <tr>
        <td>${cell(html(clipText(row.displayName || row.hostname || "IPv6 终端", 24)), compactIpList([row.ip], 1))}</td>
        <td>${html(row.mac || "-")}</td>
        <td>${pill(row.status || "IPv6", "warn")}</td>
        <td>${rate(row.upRate)} / ${rate(row.downRate)}</td>
        <td>${number(row.connections)}</td>
        <td>${html(row.lastSeen || "-")}</td>
      </tr>`);
    return card("IPv6 终端暴露清单", `展示 Top ${number(Math.min(ipv6Terminals.length, 6))} / ${number(ipv6Terminals.length)} 台，长 IPv6 地址改为分行展示`, table(["终端 / IPv6", "MAC", "状态", "上/下行", "连接", "最近出现"], rows, "暂无 IPv6 终端", "readonly-scroll readonly-table-compact"), "readonly-dense-card");
  }

  function renderPanelFileInventory(diag) {
    const rows = list(diag?.panelFiles).map((file) => `
      <tr>
        <td>${cell(html(String(file.path || "-").split(/[\\/]/).pop()), html(clipText(file.path || "-", 34)), "readonly-mono")}</td>
        <td>${bytes(file.size)}</td>
        <td>${html(file.mtime || "-")}</td>
        <td>${pill("只读", "ok")}</td>
      </tr>`);
    return card("面板文件只读清单", "用于追踪前端部署与文件更新时间，不执行覆盖", table(["文件", "大小", "修改时间", "状态"], rows, "暂无面板文件数据", "readonly-scroll readonly-table-compact"), "readonly-dense-card");
  }

  function renderRouterLogTable(snapshot) {
    const rows = list(snapshot.logs?.all).slice(0, 20).map((row) => `
      <tr>
        <td>${html(row.time || "-")}</td>
        <td>${pill(row.topics || "-", "info")}</td>
        <td>${html(row.message || "-")}</td>
      </tr>`);
    return card("RouterOS 日志只读窗口", "展示最近 20 条高价值事件，不清空、不写入、不调整日志配置", table(["时间", "主题", "消息"], rows, "暂无日志", "readonly-scroll-tall readonly-wrap-table"), "readonly-dense-card");
  }

  function renderCapacityPressureMatrix(snapshot, diag) {
    const dns = snapshot.dns || {};
    const conn = snapshot.connections || {};
    const route = snapshot.routes || {};
    const rows = [
      { label: "DNS 缓存", value: num(dns.cacheSize) ? num(dns.cacheUsed) / num(dns.cacheSize) * 100 : 0, display: `${bytes(dns.cacheUsed)} / ${bytes(dns.cacheSize)}`, color: "#165dff" },
      { label: "连接 TCP", value: num(conn.total) ? num(conn.tcp) / num(conn.total) * 100 : 0, display: `${number(conn.tcp)} / ${number(conn.total)}`, color: "#16c67a" },
      { label: "连接 UDP", value: num(conn.total) ? num(conn.udp) / num(conn.total) * 100 : 0, display: `${number(conn.udp)} / ${number(conn.total)}`, color: "#ffb020" },
      { label: "默认路由占比", value: num(route.staticCount) ? num(route.defaultCount) / num(route.staticCount) * 100 : 0, display: `${number(route.defaultCount)} / ${number(route.staticCount)}`, color: "#7c5cff" },
      { label: "Nikki 规则", value: Math.min(100, num(diag?.nikki?.ruleCount) / 80), display: `${number(diag?.nikki?.ruleCount)} 条`, color: "#2f7df6" },
    ];
    return card("容量压力条", "用进度条补充容量观察，不代表阈值告警，只作趋势参考", `<div class="readonly-mini-list">${rows.map((row) => progressRow(row.label, row.value, row.display, row.color)).join("")}</div>`, "readonly-dense-card");
  }

  function renderDiagnosticsDirectory(snapshot, diag) {
    const health = buildCollectionHealth(snapshot, diag);
    const siteRows = buildSiteMatrix(diag);
    const pppoe = list(snapshot.pppoe);
    const terminals = list(snapshot.terminals);
    const routes = snapshot.routes || {};
    const rows = [
      { page: "采集健康", owner: "采集链路", signal: `${health.filter((row) => row.level !== "ok").length} 项关注`, link: "collectionHealthDiagnostics", focus: "SSH / REST / 静态表新鲜度" },
      { page: "DNS / 代理", owner: "分流与出口", signal: `${siteRows.filter((row) => row.level !== "ok").length} 个站点异常`, link: "dnsProxyDiagnostics", focus: "DNS、Fake-IP、TCP、HTTP、出口" },
      { page: "线路质量", owner: "WAN / PCC", signal: `${pppoe.filter((row) => !row.running).length} 条离线 / ${number(routes.tableCount)} 张表`, link: "wanQualityDiagnostics", focus: "线路占比、路由库存、Mangle 命中" },
      { page: "终端风险", owner: "终端身份", signal: `${terminals.filter((row) => terminalRiskScore(row) >= 45).length} 台高风险`, link: "terminalRiskDiagnostics", focus: "终端、DHCP、IPv6 暴露" },
      { page: "系统审计", owner: "基线与事件", signal: `${list(snapshot.logs?.all).length} 条日志 / ${list(diag?.panelFiles).length} 个文件`, link: "systemAuditDiagnostics", focus: "漂移、容量、日志和面板文件" },
    ].map((row) => `
      <tr>
        <td><a href="#${row.link}" data-section="${row.link}" data-nav-group="${html(getReadonlyNavGroup(row.link))}">${html(row.page)}</a></td>
        <td>${html(row.owner)}</td>
        <td>${html(row.signal)}</td>
        <td>${html(row.focus)}</td>
      </tr>`);
    return card("状态功能页目录", "总览页只做路标，不复制各功能页详情表", table(["页面", "唯一职责", "当前信号", "查看范围"], rows), "readonly-dense-card");
  }

  function renderRiskPriorityQueue(snapshot, diag) {
    const rows = riskItems(snapshot, diag).slice(0, 18).map((item, index) => `
      <tr>
        <td>${number(index + 1)}</td>
        <td>${pill(item.level === "danger" ? "高" : item.level === "warn" ? "中" : "低", item.level)}</td>
        <td>${html(item.text)}</td>
        <td>${html(item.level === "danger" ? "对应功能页有高等级状态" : "观察趋势和刷新状态")}</td>
      </tr>`);
    return card("状态关注清单", "只列状态事实，不重复展示详情数据", table(["序号", "级别", "状态事实", "状态说明"], rows, "当前没有集中关注项"), "readonly-dense-card");
  }

  function renderSignalCoverageMatrix(snapshot, diag) {
    const rows = [
      { name: "采集新鲜度", source: "REST / SSH / static snapshot", page: "采集健康", count: buildCollectionHealth(snapshot, diag).length },
      { name: "站点分流", source: "DNS / TCP / HTTP probes", page: "DNS / 代理", count: SITE_ORDER.length },
      { name: "WAN 与路由", source: "PPPoE / route / mangle", page: "线路质量", count: list(snapshot.pppoe).length + list(snapshot.routes?.defaultRoutes).length },
      { name: "终端身份", source: "terminal / DHCP / IPv6", page: "终端风险", count: list(snapshot.terminals).length + list(snapshot.dhcp?.leases).length },
      { name: "审计基线", source: "logs / files / capacity", page: "系统审计", count: list(snapshot.logs?.all).length + list(diag?.panelFiles).length },
    ].map((row) => `
      <tr>
        <td>${html(row.name)}</td>
        <td>${html(row.source)}</td>
        <td>${html(row.page)}</td>
        <td>${number(row.count)}</td>
      </tr>`);
    return card("证据来源表", "说明每类状态数据的页面归属，避免跨页面重复展示", table(["状态数据", "来源", "归属页面", "样本数"], rows), "readonly-dense-card");
  }

  function renderDedupPolicyCard() {
    const rows = [
      { rule: "详情表唯一归属", desc: "采集、DNS、WAN、终端、审计各自只在对应功能页展示完整表格" },
      { rule: "总览只做索引", desc: "总览页只保留入口、风险优先级和覆盖关系，不复制明细表" },
      { rule: "同类信息不跨页重复", desc: "容量、日志、安全名单只归系统审计；DHCP 和 IPv6 终端只归终端风险" },
      { rule: "未采集不造假", desc: "没有真实字段的位置保留未采集或只读说明，不补虚假指标" },
      { rule: "只读边界固定", desc: "所有模块只展示状态，不下发配置、不重启服务、不改路由规则" },
    ].map((row) => `<tr><td>${html(row.rule)}</td><td>${html(row.desc)}</td></tr>`);
    return card("信息归属规则", "用于防止后续又把同一类信息堆回多个页面", table(["规则", "说明"], rows), "readonly-dense-card");
  }

  function renderCollectionThresholdMatrix() {
    const rows = Object.entries(FRESH).map(([key, value]) => `
      <tr>
        <td>${html(key)}</td>
        <td>${number(value.warn)}s</td>
        <td>${number(value.danger)}s</td>
        <td>${html(key === "connection" ? "终端排行/连接明细" : key === "static" ? "DNS/路由/规则静态快照" : key === "diag" ? "只读外部探测" : "实时页面数据")}</td>
      </tr>`);
    return card("新鲜度阈值表", "只解释判断标准，不重复事件时间线", table(["类型", "关注阈值", "异常阈值", "影响范围"], rows, "暂无阈值", "readonly-scroll readonly-table-compact"), "readonly-dense-card");
  }

  function renderCollectionAgeQueue(snapshot, diag) {
    const rows = buildCollectionHealth(snapshot, diag)
      .slice()
      .sort((a, b) => (ageSeconds(b.value) ?? 999999) - (ageSeconds(a.value) ?? 999999))
      .map((row) => `
        <tr>
          <td>${cell(html(row.key), html(clipText(row.detail, 34)))}</td>
          <td>${pill(levelText(row.level), row.level)}</td>
          <td>${cell(html(ageText(row.value)), html(row.value || "-"), "readonly-mono")}</td>
        </tr>`);
    return card("采集延迟排序", "按刷新年龄排序，避免说明列把整行撑高", table(["采集项", "状态", "最后更新"], rows, "暂无采集数据", "readonly-scroll readonly-table-compact"), "readonly-dense-card");
  }

  function renderCollectionDependencyMap(snapshot, diag) {
    const health = Object.fromEntries(buildCollectionHealth(snapshot, diag).map((row) => [row.key, row.level]));
    const rows = [
      { page: "首页流量排行", needs: "SSH 连接详情", level: health["SSH 连接详情"] || "warn" },
      { page: "连接监控", needs: "连接协议统计 + SSH 连接详情", level: (health["连接协议统计"] === "ok" && health["SSH 连接详情"] === "ok") ? "ok" : "warn" },
      { page: "DNS / 代理体检", needs: "DNS 静态表 + 只读体检探测", level: (health["DNS 静态表"] === "ok" && health["只读体检探测"] === "ok") ? "ok" : "warn" },
      { page: "线路质量", needs: "REST 实时采集 + 静态配置快照", level: (health["REST 实时采集"] === "ok" && health["DNS 静态表"] === "ok") ? "ok" : "warn" },
      { page: "系统审计", needs: "REST 实时采集 + 日志缓存", level: health["REST 实时采集"] || "warn" },
    ].map((row) => `
      <tr>
        <td>${html(row.page)}</td>
        <td>${html(row.needs)}</td>
        <td>${pill(levelText(row.level), row.level)}</td>
      </tr>`);
    return card("页面依赖关系", "把采集项和页面故障关联起来，避免重复放同一张表", table(["页面", "依赖数据", "当前判断"], rows, "暂无依赖", "readonly-scroll readonly-table-compact"), "readonly-dense-card");
  }

  function renderTerminalStatusBuckets(snapshot) {
    const terminals = list(snapshot.terminals);
    const buckets = [
      { label: "高连接", rows: terminals.filter((row) => num(row.connections) > 200), color: "#ff5a5a" },
      { label: "有上传", rows: terminals.filter((row) => num(row.upRate) > 0), color: "#165dff" },
      { label: "有下载", rows: terminals.filter((row) => num(row.downRate) > 0), color: "#16c67a" },
      { label: "IPv6", rows: terminals.filter((row) => String(row.ip || "").includes(":")), color: "#7c5cff" },
      { label: "离线/陈旧", rows: terminals.filter((row) => ["stale", "failed", "incomplete"].includes(String(row.status || "").toLowerCase())), color: "#ffb020" },
    ];
    return card("终端状态分桶", "保留终端页信息量，但不重复系统审计的安全名单", `<div class="readonly-mini-list">${buckets.map((row) => progressRow(row.label, terminals.length ? row.rows.length / terminals.length * 100 : 0, `${number(row.rows.length)} / ${number(terminals.length)}`, row.color)).join("")}</div>`, "readonly-dense-card");
  }

  function renderDhcpServerPoolSummary(snapshot) {
    const dhcp = snapshot.dhcp || {};
    const poolRows = list(dhcp.pools).map((pool) => `
      <tr>
        <td>${html(pool.name || "-")}</td>
        <td>${number(pool.used)}</td>
        <td>${number(pool.total)}</td>
        <td>${percent(pool.usage)}</td>
      </tr>`);
    const serverRows = list(dhcp.servers).map((server) => `
      <tr>
        <td>${html(server.name || "-")}</td>
        <td>${html(server.interface || "-")}</td>
        <td>${html(server.pool || "-")}</td>
        <td>${pill(server.running ? "运行" : "停用", server.running ? "ok" : "warn")}</td>
      </tr>`);
    return `
      ${card("DHCP 服务摘要", "终端页保留 DHCP 视角，不重复系统审计", table(["服务", "接口", "地址池", "状态"], serverRows, "暂无 DHCP 服务"))}
      ${card("DHCP 地址池占用", "地址池使用率只读观察", table(["地址池", "已用", "总数", "使用率"], poolRows, "暂无地址池"))}`;
  }

  function renderAuditSignalSummary(snapshot, diag) {
    const securityAlerts = list(snapshot.security?.alerts).length;
    const arpAlerts = list(snapshot.arp?.alerts).length;
    const errorIfaces = interfaceIssueRows(snapshot).length;
    const checks = [
      { label: "安全告警", value: securityAlerts, meta: "security.alerts" },
      { label: "ARP 告警", value: arpAlerts, meta: "arp.alerts" },
      { label: "接口错误", value: errorIfaces, meta: "逻辑接口去重" },
      { label: "面板文件", value: list(diag?.panelFiles).length, meta: "部署可追溯" },
      { label: "日志窗口", value: list(snapshot.logs?.all).length, meta: "RouterOS 近期日志" },
      { label: "只读写入", value: 0, meta: "无配置提交动作" },
    ];
    return card("审计信号摘要", "系统审计页只保留跨系统基线，不重复终端页设备明细", `<div class="ops-stat-grid">${checks.map((item) => kpi(item.label, number(item.value), html(item.meta))).join("")}</div>`, "readonly-dense-card");
  }

  function renderCompressedOverview(snapshot, diag) {
    const pppoe = list(snapshot.pppoe);
    const onlinePppoe = pppoe.filter((row) => row.running).length;
    const conn = snapshot.connections || {};
    const overview = snapshot.overview || {};
    return card("一屏压缩版总览", "快速巡检入口", `
      <div class="ops-stat-grid">
        ${kpi("在线宽带", `${number(onlinePppoe)} / ${number(pppoe.length)}`, "PPPoE")}
        ${kpi("在线终端", number(overview.onlineTerminals), "ARP / DHCP / IPv6 合并")}
        ${kpi("连接总数", number(conn.total), `${number(conn.tcp)} TCP · ${number(conn.udp)} UDP`)}
        ${kpi("实时上行", rate(overview.uplinkBps), "聚合 WAN")}
        ${kpi("实时下行", rate(overview.downlinkBps), "聚合 WAN")}
        ${kpi("CPU", `${number(overview.cpuLoad)}%`, html(overview.cpuModel || "-"))}
        ${kpi("内存", percent(overview.memoryUsage), `${bytes(overview.memoryUsedBytes)} / ${bytes(overview.memoryTotalBytes)}`)}
        ${kpi("磁盘", percent(overview.diskUsage), `${bytes(overview.diskUsedBytes)} / ${bytes(overview.diskTotalBytes)}`)}
      </div>
      <div class="readonly-note" style="margin-top:8px">只读探测：${diag ? `${diag.cached ? "缓存" : "实时"} · ${html(diag.generatedAt || "-")}` : STATE.loading ? "探测中" : "等待探测"}</div>`);
  }

  function renderReadonlyDiagnostics(snapshot) {
    const diag = STATE.payload;
    return `
      <section class="section" id="readonlyDiagnostics">
        ${renderGlobalRiskStrip(snapshot, diag)}
        <div class="ops-page-stack">
          <div class="readonly-grid-2">
            ${renderCollectionHealth(snapshot, diag)}
            ${renderSelfCheckPanel(diag)}
          </div>
          ${renderCompressedOverview(snapshot, diag)}
          ${renderSitePolicyMatrix(diag)}
          <div class="readonly-grid-wide">
            ${renderDnsConsistency(diag)}
            <div class="ops-page-stack">
              ${renderExitTable(diag)}
              ${renderProtocolDistribution(snapshot)}
            </div>
          </div>
          <div class="readonly-grid-2">
            ${renderServiceReachability(diag)}
            ${renderTerminalAnomalies(snapshot)}
          </div>
          <div class="readonly-grid-2">
            ${renderWanQuality(snapshot)}
            ${renderPccSkew(snapshot)}
          </div>
          <div class="readonly-grid-3">
            ${renderChangeBoard(snapshot)}
            ${renderConfigDrift(snapshot, diag)}
            ${renderCapacity(snapshot, diag)}
          </div>
          <div class="readonly-grid-2">
            ${renderInterfaceErrorTable(snapshot)}
            <div class="ops-page-stack">${renderRuleHitTable(snapshot, diag)}</div>
          </div>
          <div class="readonly-grid-2">
            <div class="ops-page-stack">${renderIpv6Panel(snapshot)}</div>
            ${renderTimeline(snapshot, diag)}
          </div>
        </div>
      </section>`;
  }

  const READONLY_FEATURE_PAGES = [
    { section: "readonlyDiagnostics", title: "只读诊断总览", label: "诊断总览", desc: "入口和风险摘要", tip: "独立只读诊断入口，不再向首页注入诊断模块", icon: "ik-load", keywords: "只读 诊断 总览 风险 摘要" },
    { section: "collectionHealthDiagnostics", title: "采集健康", label: "采集健康", desc: "数据新鲜度", tip: "REST、SSH、DNS 静态表、连接详情与只读探测刷新状态", icon: "ik-dns", keywords: "采集 健康 新鲜度 REST SSH 连接详情 数据源" },
    { section: "dnsProxyDiagnostics", title: "DNS / 代理体检", label: "DNS / 代理", desc: "分流与出口", tip: "常用站点 DNS、Fake-IP、出口 IP、TCP/HTTP 可达性集中只读检测", icon: "ik-dns", keywords: "DNS 代理 分流 出口 Fake-IP GitHub YouTube Apple 抖音" },
    { section: "wanQualityDiagnostics", title: "线路质量", label: "线路质量", desc: "WAN / PCC", tip: "多 WAN 质量、PCC 偏斜、协议分布和规则命中只读分析", icon: "ik-balance", keywords: "WAN 线路 PCC 偏斜 协议 UDP443 规则命中" },
    { section: "terminalRiskDiagnostics", title: "终端风险", label: "终端风险", desc: "异常终端 / IPv6", tip: "高连接、高流量、IPv6 暴露与终端异常只读排行", icon: "ik-terminal", keywords: "终端 风险 异常 IPv6 连接 流量 设备" },
    { section: "systemAuditDiagnostics", title: "系统审计", label: "系统审计", desc: "漂移 / 错误 / 容量", tip: "配置漂移、近期事件、接口错误、缓存容量和资源变化榜", icon: "ik-security", keywords: "审计 漂移 变更 时间线 接口错误 容量 缓存" },
  ];

  const READONLY_SECTION_SET = new Set(READONLY_FEATURE_PAGES.map((page) => page.section));
  const isReadonlySection = (section) => READONLY_SECTION_SET.has(section);
  const READONLY_PUBLIC_NAV_SECTIONS = new Set([
    "collectionHealthDiagnostics",
    "dnsProxyDiagnostics",
    "wanQualityDiagnostics",
    "terminalRiskDiagnostics",
    "systemAuditDiagnostics",
  ]);
  const readonlyLogsPage = READONLY_FEATURE_PAGES.find((page) => page.section === "systemAuditDiagnostics");
  if (readonlyLogsPage) {
    readonlyLogsPage.title = "日志 / 审计";
    readonlyLogsPage.label = "日志";
    readonlyLogsPage.desc = "事件 / 错误 / 容量";
    readonlyLogsPage.tip = "近期事件、接口错误、缓存容量和资源变化概要";
  }
  const getReadonlyPage = (section) => (
    READONLY_FEATURE_PAGES.find((page) => page.section === section) ||
    READONLY_FEATURE_PAGES.find((page) => page.section === "collectionHealthDiagnostics") ||
    READONLY_FEATURE_PAGES[0]
  );
  const READONLY_NAV_PLACEMENT = {
    readonlyDiagnostics: { group: "monitor", label: "只读总览", icon: "ik-load", after: "interfaces", quickGroup: "监控" },
    terminalRiskDiagnostics: { group: "monitor", label: "终端风险", icon: "ik-terminal", after: "terminals", quickGroup: "监控" },
    dnsProxyDiagnostics: { group: "monitor", label: "DNS / 代理", icon: "ik-dns", after: "dns6", quickGroup: "监控" },
    wanQualityDiagnostics: { group: "flow", label: "线路质量", icon: "ik-balance", after: "lineStatus", quickGroup: "流量" },
    collectionHealthDiagnostics: { group: "logs", label: "采集健康", icon: "ik-dns", after: "serviceLogs", quickGroup: "日志" },
    systemAuditDiagnostics: { group: "logs", label: "系统审计", icon: "ik-security", after: "collectionHealthDiagnostics", quickGroup: "日志" },
  };
  const getReadonlyNavPlacement = (section) => READONLY_NAV_PLACEMENT[section] || READONLY_NAV_PLACEMENT.readonlyDiagnostics;
  const getReadonlyNavGroup = (section) => getReadonlyNavPlacement(section).group;
  if (typeof compactTopbarSections !== "undefined") {
    READONLY_FEATURE_PAGES.forEach((page) => compactTopbarSections.add(page.section));
  }

  function renderReadonlyFeatureNav(activeSection) {
    const defaultPages = READONLY_DIAGNOSTICS_PRIVATE_NAV
      ? READONLY_FEATURE_PAGES
      : READONLY_FEATURE_PAGES.filter((page) => READONLY_PUBLIC_NAV_SECTIONS.has(page.section));
    const advancedPages = READONLY_DIAGNOSTICS_PRIVATE_NAV
      ? []
      : READONLY_FEATURE_PAGES.filter((page) => !READONLY_PUBLIC_NAV_SECTIONS.has(page.section));
    const navLink = (page) => `
        <a class="readonly-feature-link ${page.section === activeSection ? "is-active" : ""}" href="#${page.section}" data-section="${page.section}" data-nav-group="${html(getReadonlyNavGroup(page.section))}">
          <strong>${html(page.label)}</strong>
          <span>${html(page.desc)}</span>
        </a>`;
    return `<div class="readonly-feature-nav">
      ${defaultPages.map(navLink).join("")}
      ${advancedPages.length ? `<details class="readonly-advanced-nav"${advancedPages.some((page) => page.section === activeSection) ? " open" : ""}>
        <summary>内部说明</summary>
        <div class="readonly-advanced-nav-links">${advancedPages.map(navLink).join("")}</div>
      </details>` : ""}
      </div>`;
  }

  function renderReadonlyStickySummary(snapshot, section) {
    const metrics = readonlyPinMetrics(snapshot, STATE.payload, section).slice(0, 5);
    return `
      <div class="section-summary-sticky readonly-summary-sticky">
        <div class="readonly-summary-grid">
          ${metrics.map(([label, value]) => metricCard(label, html(value), "", "")).join("")}
        </div>
      </div>`;
  }

  function renderReadonlyFeatureBody(snapshot, diag, section) {
    const health = buildCollectionHealth(snapshot, diag);
    const staleCount = health.filter((row) => row.level !== "ok").length;
    const risks = riskItems(snapshot, diag);
    const siteRows = buildSiteMatrix(diag);
    const splitSummary = splitPolicySummary(siteRows);
    const siteProblemCount = splitSummary.policyProblemCount;
    const dnsErrorCount = list(diag?.dnsMatrix).filter(isDnsErrorRow).length;
    const exitResults = list(diag?.exitChecks).filter((row) => row.ip).length;
    const pppoe = list(snapshot.pppoe);
    const offlinePppoe = pppoe.filter((row) => !row.running).length;
    const terminals = list(snapshot.terminals);
    const highRiskTerminals = terminals.filter((row) => terminalRiskScore(row) >= 45).length;
    const ipv6TerminalCount = num(snapshot.meta?.ipv6TerminalCount);
    const panelFileCount = list(diag?.panelFiles).length;
    const logCount = list(snapshot.logs?.all).length;
    const interfaceErrorCount = interfaceIssueRows(snapshot).length;
    const routeTableCount = num(snapshot.routes?.tableCount);
    switch (section) {
      case "collectionHealthDiagnostics":
        return `
          <div class="readonly-readable-flow">
            ${renderReadonlyBand(
              "采集链路",
              "采集健康与刷新年龄",
              "先确认快照、SSH、静态表和只读探测是否新鲜，再决定要不要继续深看后面的依赖和影响面。",
              `${renderCollectionHealth(snapshot, diag)}`,
              staleCount ? "warn" : "ok",
              [
                pill(`${number(staleCount)} 项异常`, staleCount ? "warn" : "ok"),
                pill(`${number(health.length)} 个数据源`, "info"),
              ].join("")
            )}
            ${renderReadonlyBand(
              "依赖与阈值",
              "延迟排序、阈值与影响面",
              "把“哪个采集卡住会影响哪里”集中放在一个分区里，保留高密度，但不再让说明和表格散落成独立小风格。",
              `<div class="readonly-density-columns readonly-collection-density">
                <div class="ops-page-stack">
                  ${renderCollectionAgeQueue(snapshot, diag)}
                  ${renderCollectionDependencyMap(snapshot, diag)}
                  ${renderCollectionThresholdMatrix()}
                </div>
                <div class="ops-page-stack">
                  ${renderCollectionImpactMatrix(snapshot, diag)}
                  ${renderDataSourceMap(snapshot, diag)}
                </div>
              </div>`,
              staleCount ? "warn" : "info",
              [
                pill("SSH / REST / 静态表", "info"),
                pill("只读不修复", "ok"),
              ].join("")
            )}
          </div>`;
      case "dnsProxyDiagnostics":
        return `
          <div class="readonly-readable-flow">
            ${renderReadonlyBand(
              "解析与出口",
              "出口判断与服务可达性",
              "把出口归因、出口 IP 结果和服务探测先放到同一观察面，优先回答“是不是分流、是不是出口、是不是服务本身”。",
              `<div class="readonly-compact-grid">
                ${renderExitDecisionBoard(diag)}
                ${renderExitTable(diag)}
              </div>
              ${renderServiceReachability(diag)}`,
              siteProblemCount || dnsErrorCount ? "warn" : "ok",
              [
                pill(`${number(siteProblemCount)} 个策略违背`, siteProblemCount ? "warn" : "ok"),
                pill(`${number(splitSummary.mixedCount)} 个混合态`, splitSummary.mixedCount ? "info" : "ok"),
                pill(`${number(exitResults)} 个出口结果`, exitResults ? "ok" : "warn"),
              ].join("")
            )}
            ${renderReadonlyBand(
              "站点矩阵",
              "DNS / 代理体检主矩阵",
              "保留原来的高信息密度，但把主矩阵提升为这一页的中心模块，让视觉重心更稳定。",
              `${renderSitePolicyMatrix(diag)}`,
              siteProblemCount || dnsErrorCount ? "warn" : "ok",
              [
                pill(`${number(dnsErrorCount)} 条 DNS 异常`, dnsErrorCount ? "warn" : "ok"),
                pill(`${number(siteRows.length)} 个站点样本`, "info"),
              ].join("")
            )}
            ${renderReadonlyBand(
              "一致性与规则",
              "DNS 一致性、探测覆盖与静态规则",
              "把规则、探测覆盖和一致性收口到同一节，避免矩阵之外再冒出另一套视觉语言。",
              `${renderDnsConsistency(diag)}
              <div class="readonly-band-stack">
                ${renderDnsProbeCoverage(diag)}
                ${renderDnsRuleInventory(snapshot)}
              </div>`,
              dnsErrorCount ? "warn" : "info",
              [
                pill("Fake-IP / TCP / HTTP", "info"),
                pill("只读不改 DNS/Nikki", "ok"),
              ].join("")
            )}
          </div>`;
      case "wanQualityDiagnostics":
        return `
          <div class="readonly-readable-flow">
            ${renderReadonlyBand(
              "多 WAN 摘要",
              "PCC 偏斜、协议分布与默认路由",
              "先把多 WAN 的结论层收在最上面，便于值班时一眼区分是线路离线、分流偏斜还是默认路由异常。",
              `<div class="readonly-wan-density-grid">
                <div class="ops-page-stack">
                  ${renderPccSkew(snapshot)}
                </div>
                <div class="ops-page-stack">
                  ${renderProtocolDistribution(snapshot)}
                </div>
                <div class="ops-page-stack">
                  ${renderDefaultRouteCompass(snapshot)}
                </div>
              </div>`,
              offlinePppoe ? "warn" : "ok",
              [
                pill(`${number(offlinePppoe)} 条线路离线`, offlinePppoe ? "warn" : "ok"),
                pill(`${number(routeTableCount)} 张路由表`, "info"),
              ].join("")
            )}
            ${renderReadonlyBand(
              "线路画像",
              "线路质量、负载画像与清单",
              "把质量判断、负载画像和线路明细并成同一节，减少“卡片各自成页”的割裂感。",
              `${renderWanQuality(snapshot)}
              ${renderWanLoadPortrait(snapshot)}
              ${renderWanLineInventory(snapshot)}`,
              offlinePppoe ? "warn" : "info",
              [
                pill("固定宽屏密度布局", "info"),
                pill("只读不切换线路", "ok"),
              ].join("")
            )}
            ${renderReadonlyBand(
              "路由证据",
              "静态路由、Mangle 命中与策略规则",
              "把会影响多 WAN 归因的底层证据集中起来，方便从现象回钻到规则层。",
              `<div class="readonly-wan-density-grid">
                <div class="ops-page-stack">
                  ${renderRouteInventory(snapshot)}
                </div>
                <div class="ops-page-stack">
                  ${renderMangleHitDigest(snapshot)}
                </div>
                <div class="ops-page-stack">
                  ${renderRoutingRuleInventory(snapshot)}
                </div>
              </div>`,
              offlinePppoe ? "warn" : "info",
              [
                pill("PCC / Route / Rule", "info"),
                pill(`${number(interfaceErrorCount)} 个接口错误`, interfaceErrorCount ? "warn" : "ok"),
              ].join("")
            )}
          </div>`;
      case "terminalRiskDiagnostics":
        return `
          <div class="readonly-readable-flow">
            ${renderReadonlyBand(
              "风险入口",
              "终端异常与高风险优先级",
              "先锁定高连接、高流量和状态异常的终端，再往 DHCP、IPv6 和清单明细下钻。",
              `${renderTerminalAnomalies(snapshot)}`,
              highRiskTerminals ? "danger" : ipv6TerminalCount ? "warn" : "ok",
              [
                pill(`${number(highRiskTerminals)} 台高风险`, highRiskTerminals ? "danger" : "ok"),
                pill(`${number(ipv6TerminalCount)} 台 IPv6 终端`, ipv6TerminalCount ? "warn" : "info"),
              ].join("")
            )}
            ${renderReadonlyBand(
              "身份与暴露",
              "终端状态、DHCP 与 IPv6 暴露",
              "把 DHCP、IPv6 暴露和终端密集清单作为同一诊断带，视觉上更像运维工作台，而不是独立散卡。",
              `<div class="readonly-terminal-priority-grid">
                <div class="ops-page-stack">
                  ${renderTerminalStatusBuckets(snapshot)}
                  ${renderDhcpServerPoolSummary(snapshot)}
                  ${renderDhcpLeaseMatrix(snapshot)}
                </div>
                <div class="ops-page-stack">
                  ${renderIpv6ExposureMatrix(snapshot)}
                  ${renderTerminalInventory(snapshot)}
                </div>
              </div>`,
              highRiskTerminals ? "danger" : ipv6TerminalCount ? "warn" : "info",
              [
                pill(`${number(list(snapshot.dhcp?.leases).length)} 条 DHCP 租约`, "info"),
                pill("只读不踢终端", "ok"),
              ].join("")
            )}
            ${renderReadonlyBand(
              "IPv6 细节",
              "接口、RA 与 DHCPv6 视角",
              "把 IPv6 诊断单独沉到底部，既保留完整度，也不抢占高风险终端的第一页节奏。",
              `${renderIpv6Panel(snapshot)}`,
              ipv6TerminalCount ? "warn" : "ok",
              [
                pill("IPv6 / RA / DHCPv6", "info"),
                pill("无写入操作", "ok"),
              ].join("")
            )}
          </div>`;
      case "systemAuditDiagnostics":
        return `
          <div class="readonly-readable-flow">
            ${renderReadonlyBand(
              "基线漂移",
              "配置漂移与审计入口",
              "先看配置、规则和系统基线是否漂移，再进入资源容量与事件证据，保持审计页的证据层级清晰。",
              `${renderConfigDrift(snapshot, diag)}`,
              interfaceErrorCount ? "warn" : "ok",
              [
                pill(`${number(interfaceErrorCount)} 个接口错误`, interfaceErrorCount ? "warn" : "ok"),
                pill(`${number(logCount)} 条日志窗口`, "info"),
              ].join("")
            )}
            ${renderReadonlyBand(
              "容量与变更",
              "审计摘要、容量压力与面板文件",
              "把容量、变化榜和只读文件清单放在一个证据层里，兼容新的全站主题，同时保留高信息密度。",
              `<div class="readonly-density-columns readonly-system-density">
                <div class="ops-page-stack">
                  ${renderAuditSignalSummary(snapshot, diag)}
                  ${renderCapacityPressureMatrix(snapshot, diag)}
                </div>
                <div class="ops-page-stack">
                  ${renderChangeBoard(snapshot)}
                  ${renderCapacity(snapshot, diag)}
                </div>
                <div class="ops-page-stack">
                  ${renderPanelFileInventory(diag)}
                </div>
              </div>`,
              interfaceErrorCount ? "warn" : "info",
              [
                pill(`${number(panelFileCount)} 个面板文件`, "info"),
                pill("只读审计", "ok"),
              ].join("")
            )}
            ${renderReadonlyBand(
              "事件证据",
              "接口错误、时间线、日志与安全信号",
              "把事件流和证据流沉到同一节，方便从摘要直接进入最近变更、日志和安全线索。",
              `${renderInterfaceErrorTable(snapshot)}
              ${renderTimeline(snapshot, diag)}
              ${renderRouterLogTable(snapshot)}
              ${renderSecuritySignals(snapshot)}`,
              interfaceErrorCount ? "warn" : "info",
              [
                pill(`${number(logCount)} 条近期日志`, "info"),
                pill("不清日志不改配置", "ok"),
              ].join("")
            )}
          </div>`;
      case "readonlyDiagnostics":
      default:
        return `
          <div class="readonly-readable-flow">
            ${renderReadonlyBand(
              "总览入口",
              "全局风险与采集新鲜度",
              "总览页不复制专项页的所有细节，而是先给值班者风险条、优先队列和采集健康这三个进入动作。",
              `${renderGlobalRiskStrip(snapshot, diag)}
              ${renderRiskPriorityQueue(snapshot, diag)}
              ${renderCollectionHealth(snapshot, diag, true)}`,
              staleCount || risks.length ? "warn" : "ok",
              [
                pill(`${number(risks.length)} 条风险线索`, risks.length ? "warn" : "ok"),
                pill(`${number(staleCount)} 项采集延迟`, staleCount ? "warn" : "ok"),
              ].join("")
            )}
            ${renderReadonlyBand(
              "体检视图",
              "只读自检、站点矩阵与系统快照",
              "把人工触发自检、站点体检和压缩运行快照整成同一观察带，减少页面之间的样式割裂感。",
              `${renderSelfCheckPanel(diag)}
              ${renderSitePolicyMatrix(diag)}
              ${renderCompressedOverview(snapshot, diag)}`,
              siteProblemCount ? "warn" : "ok",
              [
                pill(`${number(siteProblemCount)} 个站点异常`, siteProblemCount ? "warn" : "ok"),
                pill(`${number(exitResults)} 个出口结果`, exitResults ? "ok" : "warn"),
              ].join("")
            )}
            ${renderReadonlyBand(
              "目录与边界",
              "诊断入口、信号覆盖与去重归属",
              "保留总览页的导航价值，同时明确哪些内容在哪一页看，避免新设计系统下又重复堆表。",
              `<div class="readonly-support-grid">
                ${renderDiagnosticsDirectory(snapshot, diag)}
                ${renderSignalCoverageMatrix(snapshot, diag)}
                ${renderDedupPolicyCard()}
              </div>`,
              "info",
              [
                pill("只读总览", "info"),
                pill("不覆盖专项页", "ok"),
              ].join("")
            )}
          </div>`;
    }
  }

  function renderReadonlyFeaturePage(snapshot, section = "readonlyDiagnostics") {
    const diag = STATE.payload;
    const page = getReadonlyPage(section);
    const rootAttrs = page.section === "readonlyDiagnostics"
      ? `class="readonly-diagnostics-root" data-readonly-page="${html(page.section)}"`
      : `id="readonlyDiagnostics" class="readonly-diagnostics-root" data-readonly-page="${html(page.section)}"`;
    return `
      <section class="section readonly-diagnostics-section" id="${html(page.section)}">
        <div ${rootAttrs}>
          <div class="readonly-diagnostics-shell">
            ${renderReadonlyFeatureChrome(snapshot, page.section)}
            ${renderReadonlyStickySummary(snapshot, page.section)}
            <div class="ops-page-stack readonly-workbench-body">
              ${renderReadonlyFeatureBody(snapshot, diag, page.section)}
            </div>
          </div>
        </div>
      </section>`;
  }

  let readonlyScrollPinHost = null;
  let readonlyScrollPinRaf = 0;

  function ensureReadonlyScrollPinHost() {
    if (readonlyScrollPinHost && document.body.contains(readonlyScrollPinHost)) {
      return readonlyScrollPinHost;
    }
    readonlyScrollPinHost = document.createElement("div");
    readonlyScrollPinHost.id = "readonlyScrollPinHost";
    readonlyScrollPinHost.className = "readonly-scroll-pin-host";
    readonlyScrollPinHost.setAttribute("aria-hidden", "true");
    document.body.appendChild(readonlyScrollPinHost);
    return readonlyScrollPinHost;
  }

  function hideReadonlyScrollPin() {
    const host = ensureReadonlyScrollPinHost();
    host.classList.remove("is-visible");
    host.style.left = "";
    host.style.width = "";
    host.innerHTML = "";
    host.dataset.key = "";
  }

  function kpiLevel(value, warnAt = 1, dangerAt = 3) {
    const amount = num(value);
    if (amount >= dangerAt) return "danger";
    if (amount >= warnAt) return "warn";
    return "ok";
  }

  function readonlyPinMetrics(snapshot, diag, section) {
    const health = buildCollectionHealth(snapshot, diag);
    const stale = health.filter((row) => row.level !== "ok").length;
    const risks = riskItems(snapshot, diag);
    const siteRows = buildSiteMatrix(diag);
    const siteProblems = splitPolicySummary(siteRows).policyProblemCount;
    const pppoe = list(snapshot.pppoe);
    const onlinePppoe = pppoe.filter((row) => row.running).length;
    const terminals = list(snapshot.terminals);
    const highTerminals = terminals.filter((row) => terminalRiskScore(row) >= 45).length;
    const ifaceErrors = interfaceIssueRows(snapshot).length;
    const connections = snapshot.connections || {};
    const distribution = list(snapshot.loadBalance?.distribution);
    const maxShare = distribution.reduce((max, row) => Math.max(max, num(row.share)), 0);
    const dnsErrors = list(diag?.dnsMatrix).filter(isDnsErrorRow).length;
    const exitCount = list(diag?.exitChecks).filter((row) => row.ip).length;
    const ipv6Count = num(snapshot.meta?.ipv6TerminalCount);
    const logsCount = list(snapshot.logs?.all).length;
    const staticRules = num(snapshot.dns?.staticCount ?? list(snapshot.dns?.staticRules).length);
    const routeTotal = num(snapshot.routes?.total ?? list(snapshot.routes?.items).length);
    const itemsBySection = {
      readonlyDiagnostics: [
        ["风险项", number(risks.length), kpiLevel(risks.length, 1, 3)],
        ["采集延迟", number(stale), kpiLevel(stale, 1, 2)],
        ["分流异常", number(siteProblems), kpiLevel(siteProblems, 1, 3)],
        ["接口错误", number(ifaceErrors), kpiLevel(ifaceErrors, 1, 5)],
        ["ROS 写入", "0", "ok"],
      ],
      collectionHealthDiagnostics: [
        ["异常采集", number(stale), kpiLevel(stale, 1, 2)],
        ["REST", ageText(health.find((row) => row.key.includes("REST 实时"))?.value), "info"],
        ["SSH 详情", ageText(health.find((row) => row.key.includes("SSH"))?.value), "info"],
        ["DNS 静态", ageText(health.find((row) => row.key.includes("DNS"))?.value), "info"],
        ["只读探测", ageText(health.find((row) => row.key.includes("只读"))?.value), "info"],
      ],
      dnsProxyDiagnostics: [
        ["DNS 异常", number(dnsErrors), kpiLevel(dnsErrors, 1, 3)],
        ["分流异常", number(siteProblems), kpiLevel(siteProblems, 1, 3)],
        ["出口结果", number(exitCount), exitCount ? "ok" : "warn"],
        ["规则样本", number(staticRules), "info"],
        ["ROS 写入", "0", "ok"],
      ],
      wanQualityDiagnostics: [
        ["在线宽带", `${number(onlinePppoe)} / ${number(pppoe.length)}`, onlinePppoe === pppoe.length ? "ok" : "warn"],
        ["最大占比", percent(maxShare), maxShare > 55 ? "warn" : "ok"],
        ["UDP 占比", Number.isFinite(Number(connections.udp)) ? percent(num(connections.udp) / Math.max(num(connections.total), 1) * 100) : "未采集", "info"],
        ["默认路由", number(routeTotal), "info"],
        ["接口错误", number(ifaceErrors), kpiLevel(ifaceErrors, 1, 5)],
      ],
      terminalRiskDiagnostics: [
        ["高危终端", number(highTerminals), kpiLevel(highTerminals, 1, 3)],
        ["在线终端", number(snapshot.overview?.onlineTerminals ?? terminals.length), "info"],
        ["IPv6 终端", number(ipv6Count), ipv6Count ? "warn" : "ok"],
        ["DHCP 租约", number(list(snapshot.dhcp?.leases).length), "info"],
        ["ROS 写入", "0", "ok"],
      ],
      systemAuditDiagnostics: [
        ["配置漂移", number(risks.filter((item) => /漂移|配置|规则|路由/.test(item.text)).length), "info"],
        ["接口错误", number(ifaceErrors), kpiLevel(ifaceErrors, 1, 5)],
        ["日志窗口", number(logsCount), "info"],
        ["DNS 规则", number(staticRules), "info"],
        ["ROS 写入", "0", "ok"],
      ],
    };
    return itemsBySection[section] || itemsBySection.readonlyDiagnostics;
  }

  function syncReadonlyScrollPin(snapshot = displayedSnapshot || latestSnapshot || {}) {
    hideReadonlyScrollPin();
    if (typeof syncSectionTopbarState === "function") {
      syncSectionTopbarState();
    }
    return;
    const section = typeof currentSection !== "undefined" ? currentSection : "readonlyDiagnostics";
    const host = ensureReadonlyScrollPinHost();
    if (!isReadonlySection(section) || !document.body.classList.contains("readonly-diagnostics-page")) {
      hideReadonlyScrollPin();
      return;
    }
    const scrollTop = window.scrollY || window.pageYOffset || 0;
    const sectionEl = appEl?.querySelector(`.section#${section}`);
    if (!sectionEl || scrollTop < 96) {
      hideReadonlyScrollPin();
      return;
    }
    const rect = sectionEl.getBoundingClientRect();
    const left = Math.max(0, Math.round(rect.left));
    const width = Math.max(320, Math.round(rect.width || window.innerWidth - left));
    const page = getReadonlyPage(section);
    const diag = STATE.payload;
    const metrics = readonlyPinMetrics(snapshot, diag, section);
    const key = `${section}|${metrics.map((item) => item.join(":")).join("|")}`;
    host.style.left = `${left}px`;
    host.style.width = `${width}px`;
    host.style.setProperty("--readonly-pin-left", `${left}px`);
    host.style.setProperty("--readonly-pin-width", `${width}px`);
    if (host.dataset.key !== key) {
      host.dataset.key = key;
      host.innerHTML = `
        <div class="readonly-scroll-pin-inner">
          <div class="readonly-scroll-pin-title">
            ${html(page.label)}
            <span>只读吸顶 · 不写配置 · 不恢复顶部大卡</span>
          </div>
          <div class="readonly-scroll-pin-metrics">
            ${metrics.map(([label, value, level]) => `
              <div class="readonly-scroll-pin-kpi ${html(level || "info")}">
                <span>${html(label)}</span>
                <strong>${html(value)}</strong>
              </div>`).join("")}
          </div>
        </div>`;
    }
    host.classList.add("is-visible");
  }

  function scheduleReadonlyScrollPin() {
    if (readonlyScrollPinRaf) return;
    readonlyScrollPinRaf = requestAnimationFrame(() => {
      readonlyScrollPinRaf = 0;
      syncReadonlyScrollPin();
    });
  }

  renderReadonlyDiagnostics = function renderReadonlyDiagnosticsHub(snapshot) {
    return renderReadonlyFeaturePage(snapshot, "readonlyDiagnostics");
  };

  async function ensureDiagnosticsFetch(snapshot, force = false) {
    const stale = Date.now() - STATE.fetchedAt > DIAG_TTL_MS;
    if (STATE.loading) return STATE.loadingPromise || Promise.resolve();
    if (!force && STATE.payload && !stale) return Promise.resolve();
    STATE.loading = true;
    STATE.error = "";
    STATE.loadingPromise = (async () => {
      try {
        const response = await fetch(`/api/readonly-diagnostics${force ? "?refresh=1" : ""}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        STATE.payload = await response.json();
        STATE.fetchedAt = Date.now();
      } catch (error) {
        STATE.error = error?.message || String(error);
      } finally {
        STATE.loading = false;
        STATE.loadingPromise = null;
        if (typeof currentSection !== "undefined" && isReadonlySection(currentSection) && typeof renderApp === "function") {
          renderApp(snapshot || displayedSnapshot || latestSnapshot || {});
        }
      }
    })();
    return STATE.loadingPromise;
  }

  function renderOverviewSiteSummary(diag) {
    const rows = buildSiteMatrix(diag).slice(0, 8).map((row) => `
      <tr>
        <td>${cell(html(row.name), html(row.expected === "direct" ? "DIRECT 预期" : row.expected === "proxy" ? "代理预期" : row.expected))}</td>
        <td>${cell(html(row.dnsState), html(row.policy))}</td>
        <td>${cell(row.tcp?.ok ? "TCP通" : row.tcp ? "TCP异常" : "TCP未采集", row.httpLabel)}</td>
        <td>${pill(row.verdict, row.level)}</td>
      </tr>`);
    return card("DNS / 代理分流摘要", "首页只放结论，完整矩阵进入只读体检页查看", table(["站点", "DNS/策略", "连通", "判断"], rows, "等待只读分流探测", "readonly-scroll"));
  }

  function enhanceOverview(snapshot) {
    if (!READONLY_DIAGNOSTICS_PRIVATE_NAV) return;
    return;
    if (!appEl) return;
    const section = appEl.querySelector("#overview");
    if (!section) return;
    const diag = STATE.payload;
    const existingStrip = section.querySelector("[data-readonly-global-strip]");
    if (existingStrip) existingStrip.remove();
    const head = section.querySelector(".section-head");
    if (head) head.insertAdjacentHTML("afterend", renderGlobalRiskStrip(snapshot, diag));

    const existingHealth = section.querySelector("[data-readonly-overview-health]");
    if (existingHealth) existingHealth.remove();
    const statusGrid = section.querySelector(".ik-home-status-grid");
    if (statusGrid) {
      statusGrid.insertAdjacentHTML("afterend", `
        <div class="readonly-overview-health" data-readonly-overview-health>
          <div class="readonly-grid-3">
            ${renderCollectionHealth(snapshot, diag, true)}
            ${renderOverviewSiteSummary(diag)}
            ${renderChangeBoard(snapshot)}
          </div>
        </div>`);
    }
  }

  function registerReadonlyDiagnosticsPage() {
    if (!READONLY_DIAGNOSTICS_PRIVATE_NAV) return;
    const pages = READONLY_FEATURE_PAGES.map((page) => ({
      ...page,
      placement: getReadonlyNavPlacement(page.section),
    }));
    const stripReadonlyItems = (items = []) => items.filter((item) => !READONLY_SECTION_SET.has(item.section));
    const insertMenuItem = (group, item, afterSection) => {
      if (!menuGroups[group]) menuGroups[group] = [];
      menuGroups[group] = menuGroups[group].filter((candidate) => candidate.section !== item.section);
      const insertAt = afterSection
        ? menuGroups[group].findIndex((candidate) => candidate.section === afterSection)
        : -1;
      if (insertAt >= 0) {
        menuGroups[group].splice(insertAt + 1, 0, item);
      } else {
        menuGroups[group].push(item);
      }
    };

    if (typeof railGroups !== "undefined" && Array.isArray(railGroups)) {
      for (let index = railGroups.length - 1; index >= 0; index -= 1) {
        if (railGroups[index]?.id === "diagnostics") {
          railGroups.splice(index, 1);
        }
      }
    }
    if (typeof menuGroups !== "undefined") {
      Object.keys(menuGroups).forEach((group) => {
        menuGroups[group] = stripReadonlyItems(menuGroups[group]);
      });
      delete menuGroups.diagnostics;
      pages.forEach((page) => {
        insertMenuItem(page.placement.group, {
          section: page.section,
          label: page.placement.label || page.label,
          icon: page.placement.icon || page.icon || "ik-load",
        }, page.placement.after);
      });
    }
    if (typeof menuGroupLabel !== "undefined") {
      delete menuGroupLabel.diagnostics;
    }
    if (typeof pageMeta !== "undefined") {
      READONLY_FEATURE_PAGES.forEach((page) => {
        pageMeta[page.section] = { title: page.title, subtitle: page.tip };
      });
    }
    if (typeof sectionToGroup !== "undefined") {
      pages.forEach((page) => {
        sectionToGroup[page.section] = page.placement.group;
      });
    }
    if (typeof currentNavGroup !== "undefined" && currentNavGroup === "diagnostics") {
      currentNavGroup = getReadonlyNavGroup(typeof currentSection !== "undefined" ? currentSection : "readonlyDiagnostics");
    }
    if (typeof quickSearchItems !== "undefined" && Array.isArray(quickSearchItems)) {
      pages.forEach((page) => {
        const nextItem = {
          section: page.section,
          title: page.title,
          group: page.placement.quickGroup || page.placement.group,
          icon: page.placement.icon || page.icon || "ik-load",
          desc: page.tip,
          keywords: page.keywords,
        };
        const existing = quickSearchItems.find((item) => item.section === page.section);
        if (existing) {
          Object.assign(existing, nextItem);
        } else {
          quickSearchItems.push(nextItem);
        }
      });
    }
    return;
  }

  function patchRenderers() {
    if (typeof renderApp !== "function" || renderApp.__readonlyDiagnosticsV2Patched) return;
    const originalRenderApp = renderApp;
    renderApp = function patchedReadonlyDiagnosticsRenderApp(snapshot) {
      if (typeof currentSection !== "undefined" && isReadonlySection(currentSection)) {
        document.body.classList.add("readonly-diagnostics-page");
        const warning = snapshot.status !== "ok"
          ? `<div class="notice danger" style="margin-bottom:12px">采集状态异常：${html(snapshot.error || "未知错误")}。当前页面展示最近可用快照。</div>`
          : "";
        ensureDiagnosticsFetch(snapshot);
        appEl.innerHTML = `${warning}${renderReadonlyFeaturePage(snapshot, currentSection)}`;
        if (typeof prepareCompactSection === "function") prepareCompactSection();
        if (typeof syncTopMetricsVisibility === "function") syncTopMetricsVisibility();
        if (typeof syncSectionTopbarState === "function") syncSectionTopbarState();
        const readonlyTopMetrics = document.getElementById("topMetrics");
        if (readonlyTopMetrics) readonlyTopMetrics.style.setProperty("display", "none", "important");
        syncReadonlyScrollPin(snapshot);
        return;
      }
      document.body.classList.remove("readonly-diagnostics-page");
      hideReadonlyScrollPin();
      originalRenderApp(snapshot);
    };
    renderApp.__readonlyDiagnosticsV2Patched = true;
    window.renderApp = renderApp;

    if (typeof buildTopMetrics === "function" && !buildTopMetrics.__readonlyDiagnosticsV2Patched) {
      const originalBuildTopMetrics = buildTopMetrics;
      buildTopMetrics = function patchedReadonlyDiagnosticsTopMetrics(snapshot) {
        if (typeof currentSection !== "undefined" && isReadonlySection(currentSection)) {
          return [];
        }
        return originalBuildTopMetrics(snapshot);
      };
      buildTopMetrics.__readonlyDiagnosticsV2Patched = true;
      window.buildTopMetrics = buildTopMetrics;
    }
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-readonly-refresh]");
    if (!button) return;
    const key = button.getAttribute("data-readonly-refresh") || "github";
    STATE.selfCheck.active = key;
    if (key === "webrtc") {
      STATE.selfCheck.refreshing = "";
      STATE.selfCheck.refreshedAt = Date.now();
      if (typeof currentSection !== "undefined" && isReadonlySection(currentSection) && typeof renderApp === "function") {
        renderApp(displayedSnapshot || latestSnapshot || {});
      }
      return;
    }
    STATE.selfCheck.refreshing = key;
    if (typeof currentSection !== "undefined" && isReadonlySection(currentSection) && typeof renderApp === "function") {
      renderApp(displayedSnapshot || latestSnapshot || {});
    }
    ensureDiagnosticsFetch(displayedSnapshot || latestSnapshot || {}, true).finally(() => {
      STATE.selfCheck.refreshing = "";
      STATE.selfCheck.refreshedAt = Date.now();
      if (typeof currentSection !== "undefined" && isReadonlySection(currentSection) && typeof renderApp === "function") {
        renderApp(displayedSnapshot || latestSnapshot || {});
      }
    });
  });

  window.addEventListener("scroll", scheduleReadonlyScrollPin, { passive: true });
  window.addEventListener("resize", scheduleReadonlyScrollPin, { passive: true });
  window.addEventListener("hashchange", () => setTimeout(scheduleReadonlyScrollPin, 80));

  const requestedFromQuery = new URLSearchParams(window.location.search || "").get("section") || "";
  const requested = requestedFromQuery || String(window.location.hash || "").replace(/^#/, "");

  const shouldBootReadonly = READONLY_DIAGNOSTICS_PRIVATE_NAV
    || isReadonlySection(requested)
    || (typeof currentSection !== "undefined" && isReadonlySection(currentSection));

  if (READONLY_DIAGNOSTICS_PRIVATE_NAV) {
    registerReadonlyDiagnosticsPage();
    if (typeof renderNavigation === "function") renderNavigation();
  }

  if (shouldBootReadonly) {
    patchRenderers();
    if (isReadonlySection(requested) && typeof setActiveSection === "function") {
      setActiveSection(requested, true);
    } else if (typeof currentSection !== "undefined" && isReadonlySection(currentSection) && typeof renderApp === "function") {
      renderApp(displayedSnapshot || latestSnapshot || {});
    }
  }
})();
