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
      gap: 3px;
      min-width: 0;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 11px;
      line-height: 1.25;
    }
    #readonlyDiagnostics .readonly-ip-line {
      display: block;
      max-width: 100%;
      overflow: hidden;
      color: #253246;
      text-overflow: ellipsis;
      white-space: nowrap;
      word-break: normal;
      overflow-wrap: normal;
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
    body.readonly-diagnostics-page #readonlyDiagnostics .readonly-support-grid > .card,
    body.readonly-diagnostics-page #readonlyDiagnostics .readonly-compact-grid > .card {
      min-height: 0;
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

  function table(headers, rows, emptyText = "鏆傛棤鍙鏁版嵁", scrollClass = "readonly-scroll") {
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
    if (age === null) return "鏈噰闆?;
    if (age < 60) return `${age}s 鍓峘;
    if (age < 3600) return `${Math.round(age / 60)}m 鍓峘;
    return `${Math.round(age / 3600)}h 鍓峘;
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
    return level === "danger" ? "寮傚父" : level === "warn" ? "鍏虫敞" : "姝ｅ父";
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
        key: "REST 瀹炴椂閲囬泦",
        value: meta.realtimeUpdatedAt || snapshot.updatedAt,
        level: meta.realtimeError ? "danger" : levelByAge(meta.realtimeUpdatedAt || snapshot.updatedAt, restThreshold),
        detail: meta.realtimeError || `璧勬簮 / 鏃堕挓 / 鎺ュ彛蹇噰 路 鏈€杩戣€楁椂 ${number(meta.realtimeDurationSeconds || 0)}s 路 绔偣閲嶈瘯 ${number(failureCount(meta.realtimeEndpointFailures))}`,
      },
      {
        key: "REST 鎷撴墤鍒楄〃",
        value: meta.slowRestUpdatedAt,
        level: meta.slowRestError ? "danger" : levelByAge(meta.slowRestUpdatedAt, slowThreshold),
        detail: meta.slowRestError || `PPPoE / 鍦板潃 / 璺敱 / ARP 鎱㈤噰 路 鏈€杩戣€楁椂 ${number(meta.slowRestDurationSeconds || 0)}s 路 绔偣閲嶈瘯 ${number(failureCount(meta.slowRestEndpointFailures))}`,
      },
      {
        key: "SSH 杩炴帴璇︽儏",
        value: meta.connectionDetailUpdatedAt || connections.detailUpdatedAt,
        level: meta.connectionDetailError ? "danger" : levelByAge(meta.connectionDetailUpdatedAt || connections.detailUpdatedAt, detailThreshold),
        detail: meta.connectionDetailError || `缁堢娴侀噺鎺掕渚濊禆姝ら噰闆?路 鏈€杩戣€楁椂 ${number(meta.connectionDetailDurationSeconds || connections.detailDurationSeconds || 0)}s`,
      },
      {
        key: "杩炴帴鍗忚缁熻",
        value: meta.connectionProtocolUpdatedAt || connections.protocolUpdatedAt,
        level: meta.connectionProtocolError ? "danger" : levelByAge(meta.connectionProtocolUpdatedAt || connections.protocolUpdatedAt, protocolThreshold),
        detail: meta.connectionProtocolError || `TCP / UDP / ICMP 缁熻 路 鏈€杩戣€楁椂 ${number(meta.connectionProtocolDurationSeconds || connections.protocolDurationSeconds || 0)}s`,
      },
      {
        key: "DNS 闈欐€佽〃",
        value: meta.staticUpdatedAt,
        level: meta.staticError ? "danger" : levelByAge(meta.staticUpdatedAt, staticThreshold),
        detail: meta.staticError || `DNS FWD / 闈欐€佽鍒欏揩鐓?路 鏈€杩戣€楁椂 ${number(meta.staticDurationSeconds || 0)}s`,
      },
      {
        key: "鍙浣撴鎺㈡祴",
        value: diagTime,
        level: STATE.error ? "danger" : levelByAge(diagTime, FRESH.diag),
        detail: STATE.error || (diag?.cached ? `缂撳瓨 ${diag.cacheAgeSeconds || 0}s` : "DNS / HTTP / 鍑哄彛鎺㈡祴"),
      },
    ];
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
      const fake = dnsRows.some((row) => row.fakeIp);
      const answers = dnsRows.flatMap((row) => list(row.answers)).filter(Boolean);
      const dnsErrors = answers.length ? [] : dnsRows.filter(isDnsErrorRow);
      const dnsState = !dnsRows.length ? "鏈噰闆? : dnsErrors.length ? "DNS寮傚父" : fake ? "Fake-IP" : "鐪熷疄IP";
      const policy = fake ? "浠ｇ悊/Fake-IP" : answers.length ? "鐪熷疄IP/DIRECT鍊惧悜" : "鏈垽鏂?;
      let level = "ok";
      let verdict = "绗﹀悎棰勬湡";
      if (!dnsRows.length) {
        level = "warn";
        verdict = "鏈噰闆?DNS";
      } else if (dnsErrors.length) {
        level = "warn";
        verdict = "DNS 瑙ｆ瀽寮傚父";
      } else if (expected === "direct" && fake) {
        level = "danger";
        verdict = "鐤戜技鍥藉唴璇唬鐞?;
      } else if (expected === "proxy" && !fake) {
        level = "warn";
        verdict = "鐤戜技娴峰鏈繘浠ｇ悊";
      } else if (http && !http.ok) {
        level = "warn";
        verdict = "HTTP 鍙揪寮傚父";
      } else if (tcp && !tcp.ok) {
        level = "warn";
        verdict = "TCP 443 寮傚父";
      } else if (expected === "mixed") {
        level = "info";
        verdict = "娣峰悎绛栫暐";
      }
      return {
        name,
        expected,
        dnsState,
        fake,
        answers,
        policy,
        http,
        tcp,
        level,
        verdict,
      };
    });
  }

  function worstLevel(rows) {
    const levels = list(rows).map((row) => row?.level || "warn");
    if (levels.includes("danger")) return "danger";
    if (levels.includes("warn")) return "warn";
    if (levels.includes("info")) return "info";
    return "ok";
  }

  function selfCheckStatus(level) {
    return level === "danger" ? "寮傚父" : level === "warn" ? "闇€鍏虫敞" : level === "info" ? "璇存槑" : "姝ｅ父";
  }

  function selfCheckSiteRows(diag, names) {
    const matrix = buildSiteMatrix(diag);
    return names.map((name) => matrix.find((row) => row.name === name) || {
      name,
      expected: "-",
      dnsState: "鏈噰闆?,
      fake: false,
      answers: [],
      policy: "鏈垽鏂?,
      http: null,
      tcp: null,
      level: "warn",
      verdict: "绛夊緟鍙鎺㈡祴",
    });
  }

  function selfCheckSiteDetailRows(rows) {
    return rows.map((row) => `
      <tr>
        <td>${cell(html(row.name), html(row.expected === "direct" ? "DIRECT 棰勬湡" : row.expected === "proxy" ? "浠ｇ悊棰勬湡" : row.expected))}</td>
        <td>${cell(html(row.dnsState), html(list(row.answers).slice(0, 2).join(", ") || "-"), "readonly-mono")}</td>
        <td>${row.tcp ? pill(row.tcp.ok ? "TCP 閫? : "TCP 寮傚父", row.tcp.ok ? "ok" : "warn") : pill("鏈噰闆?, "warn")}</td>
        <td>${row.http ? (row.http.ok ? pill(`HTTP ${row.http.status || 200}`, "ok") : pill("HTTP 寮傚父", "warn")) : pill("鏈噰闆?, "warn")}</td>
        <td>${pill(row.verdict, row.level)}</td>
      </tr>`);
  }

  function buildSelfCheckItems(diag) {
    const exitIp = latestExitIp(diag);
    const groupCheck = (key, title, button, names, goal) => {
      const rows = selfCheckSiteRows(diag, names);
      const level = diag ? worstLevel(rows) : "warn";
      const tcpOk = rows.filter((row) => row.tcp?.ok).length;
      const httpOk = rows.filter((row) => row.http?.ok).length;
      const fakeCount = rows.filter((row) => row.fake).length;
      return {
        key,
        title,
        button,
        level,
        headers: ["绔欑偣", "DNS", "TCP443", "HTTP", "鍒ゆ柇"],
        summary: diag ? goal : "杩樻病鏈夊彧璇绘帰娴嬬粨鏋滐紝鐐瑰嚮鍚庝細鍒锋柊 DNS / TCP / HTTP / 鍑哄彛妫€娴嬨€?,
        metrics: [
          ["绔欑偣", `${rows.length} 涓猔],
          ["DNS", `${fakeCount} Fake-IP`],
          ["TCP443", `${tcpOk}/${rows.length} 閫歚],
          ["HTTP", `${httpOk}/${rows.length} 閫歚],
        ],
        rows: selfCheckSiteDetailRows(rows),
      };
    };
    const siteRows = buildSiteMatrix(diag);
    const directRows = siteRows.filter((row) => row.expected === "direct");
    const proxyRows = siteRows.filter((row) => row.expected === "proxy");
    const directFake = directRows.filter((row) => row.fake);
    const proxyReal = proxyRows.filter((row) => !row.fake);
    const dnsLevel = !diag ? "warn" : directFake.length ? "danger" : proxyReal.length ? "warn" : "ok";
    const dnsRows = [
      `<tr><td>鐩磋繛绔欑偣鐪熷疄 IP</td><td>${directRows.length - directFake.length}/${directRows.length}</td><td>${directFake.length ? pill("瀛樺湪璇唬鐞?, "danger") : pill("姝ｅ父", "ok")}</td><td>${html(directFake.map((row) => row.name).join(", ") || "鍥藉唴/鐩磋繛绔欑偣鏈惤 Fake-IP")}</td></tr>`,
      `<tr><td>浠ｇ悊绔欑偣 Fake-IP</td><td>${proxyRows.filter((row) => row.fake).length}/${proxyRows.length}</td><td>${proxyReal.length ? pill("闇€鍏虫敞", "warn") : pill("姝ｅ父", "ok")}</td><td>${html(proxyReal.map((row) => row.name).join(", ") || "娴峰浠ｇ悊绔欑偣宸茶繘鍏?Fake-IP/浠ｇ悊閾捐矾")}</td></tr>`,
      `<tr><td>鍑哄彛鏍锋湰</td><td>${html(exitIp)}</td><td>${pill(exitIp === "-" ? "鏈繑鍥? : "鍙", exitIp === "-" ? "warn" : "info")}</td><td>浠呬唬琛ㄩ潰鏉垮涓诲綋鍓嶅嚭鍙ｏ紝涓嶈嚜鍔ㄦ敼鍒嗘祦瑙勫垯</td></tr>`,
    ];
    return [
      groupCheck("github", "GitHub / YouTube 澶栫綉", "妫€娴?GitHub / YouTube 澶栫綉", ["GitHub", "YouTube", "Google"], "妫€鏌ュ缃戠珯鐐规槸鍚﹁蛋 Fake-IP/浠ｇ悊鍊惧悜锛屽苟楠岃瘉 TCP 443 涓?HTTP 鎺㈡祴銆?),
      groupCheck("apple", "Apple 璁㈤槄閾捐矾", "妫€娴?Apple 璁㈤槄閾捐矾", ["Apple", "PayPal"], "妫€鏌?Apple/鏀粯绫婚摼璺槸鍚︿繚鎸佺湡瀹?IP / DIRECT 鍊惧悜锛屽苟楠岃瘉 HTTPS 鍙揪銆?),
      groupCheck("douyin", "鎶栭煶鐩磋繛 CDN", "妫€娴嬫姈闊崇洿杩?CDN", ["Douyin", "Bilibili"], "妫€鏌ュ浗鍐呰棰戠珯鏄惁瑙ｆ瀽鍒扮湡瀹?IP锛岄伩鍏嶈璧版捣澶栦唬鐞嗗鑷村崱椤裤€?),
      {
        key: "dns",
        title: "DNS 娉勬紡 / 鍒嗘祦椋庨櫓",
        button: "妫€娴?DNS 娉勬紡椋庨櫓",
        level: dnsLevel,
        headers: ["妫€鏌ラ」", "缁撴灉", "鐘舵€?, "璇存槑"],
        summary: diag ? "瀵规瘮鐩磋繛绔欑偣鍜屼唬鐞嗙珯鐐圭殑瑙ｆ瀽缁撴灉锛屽垽鏂槸鍚﹀嚭鐜板浗鍐呰浠ｇ悊鎴栨捣澶栨湭杩涗唬鐞嗐€? : "杩樻病鏈夊彧璇绘帰娴嬬粨鏋滐紝鐐瑰嚮鍚庝細鍒锋柊 DNS 鐭╅樀涓庡嚭鍙ｆ牱鏈€?,
        metrics: [
          ["DNS 璁板綍", `${number(list(diag?.dnsMatrix).length)} 鏉],
          ["鐩磋繛璇唬鐞?, `${directFake.length} 涓猔],
          ["浠ｇ悊鏈繘", `${proxyReal.length} 涓猔],
          ["鍑哄彛", exitIp],
        ],
        rows: dnsRows,
      },
      {
        key: "webrtc",
        title: "WebRTC / STUN 椋庨櫓",
        button: "鏌ョ湅 WebRTC / STUN 璇存槑",
        level: "info",
        headers: ["椤圭洰", "缁撴灉", "鐘舵€?, "璇存槑"],
        summary: "WebRTC 鐪熷疄娉勬紡蹇呴』鍦ㄦ祻瑙堝櫒渚ф巿鏉冨悗娴嬭瘯銆傞潰鏉夸笉浼氱敵璇锋憚鍍忓ご/楹﹀厠椋庢潈闄愶紝涔熶笉浼氳嚜鍔ㄥ彂璧?STUN 濯掍綋鎺㈡祴銆?,
        metrics: [
          ["闈㈡澘鏉冮檺", "涓嶇敵璇峰獟浣撴潈闄?],
          ["STUN 鎺㈡祴", "涓嶈嚜鍔ㄥ彂璧?],
          ["缃戠粶渚?, "鍙樉绀烘彁绀?],
          ["澶勭悊鏂瑰紡", "娴忚鍣ㄤ晶娴嬭瘯"],
        ],
        rows: [
          `<tr><td>涓轰粈涔堜笉鑳借嚜鍔ㄦ祴</td><td>娴忚鍣?WebRTC 娉勬紡渚濊禆椤甸潰 JS 涓庡獟浣撴潈闄愶紝鏈嶅姟鍣ㄧ闈㈡澘鏃犳硶浠ｆ浛娴忚鍣ㄦ巿鏉冦€?/td><td>${pill("璇存槑", "info")}</td><td>閬垮厤闈㈡澘璇敵璇烽殣绉佹潈闄?/td></tr>`,
          `<tr><td>闈㈡澘鑳藉仛浠€涔?/td><td>灞曠ず DNS銆乀CP銆丠TTP銆佸嚭鍙?IP 涓庡垎娴侀闄┿€?/td><td>${pill("鍙", "ok")}</td><td>涓嶅啓閰嶇疆銆佷笉鏀规祻瑙堝櫒鏉冮檺</td></tr>`,
          `<tr><td>闇€瑕佷綘鐪嬪摢閲?/td><td>娴忚鍣?WebRTC 娴嬭瘯椤垫槸鍚︽毚闇茶繍钀ュ晢鍏綉 IP 鎴栧唴缃?IPv6銆?/td><td>${pill("浜哄伐纭", "warn")}</td><td>杩欑被缁撴灉鍙兘鍦ㄥ鎴风渚х‘璁?/td></tr>`,
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
    if (num(row.connections) > 200) tags.push("杩炴帴鏆存定");
    if (num(row.upRate) > 2 * 1024 * 1024) tags.push("涓婁紶寮傚父");
    if (totalRate > 5 * 1024 * 1024) tags.push("澶ф祦閲?);
    if (String(row.ip || "").includes(":")) tags.push("IPv6");
    if (!tags.length) tags.push("瑙傚療");
    return tags;
  }

  function riskItems(snapshot, diag) {
    const items = [];
    const pppoe = list(snapshot.pppoe);
    const interfaces = list(snapshot.interfaces);
    const dns = snapshot.dns || {};
    const connections = snapshot.connections || {};
    const dhcp = snapshot.dhcp || {};
    const distribution = list(snapshot.loadBalance?.distribution);
    const health = buildCollectionHealth(snapshot, diag);
    const stale = health.filter((row) => row.level !== "ok");
    const siteRows = buildSiteMatrix(diag);
    const siteProblems = siteRows.filter((row) => row.level === "warn" || row.level === "danger");

    if (snapshot.status !== "ok") items.push({ level: "danger", text: "閲囬泦鏈嶅姟寮傚父" });
    if (stale.length) items.push({ level: stale.some((row) => row.level === "danger") ? "danger" : "warn", text: `閲囬泦鏂伴矞搴?${stale.length} 椤筦 });
    if (!dns.running) items.push({ level: "warn", text: "RouterOS DNS 鏈惎鐢ㄨ繙绋嬭姹? });
    if (connections.protocolError) items.push({ level: "warn", text: "杩炴帴鍗忚缁熻寮傚父" });
    if (connections.detailError) items.push({ level: "danger", text: "杩炴帴璇︽儏閲囬泦寮傚父" });
    if (pppoe.some((row) => !row.running)) items.push({ level: "danger", text: "瀛樺湪绂荤嚎瀹藉甫" });
    const errorIfaces = interfaces.filter((row) => num(row.rxDrop) + num(row.txDrop) + num(row.rxError) + num(row.txError) > 0);
    if (errorIfaces.length) items.push({ level: "warn", text: `鎺ュ彛閿欒 ${errorIfaces.length} 椤筦 });
    const skew = distribution.some((row) => num(row.share) > 55 && distribution.length > 1);
    if (skew) items.push({ level: "warn", text: "绾胯矾璐熻浇鏄庢樉鍋忔枩" });
    if (list(dhcp.servers).length && !list(dhcp.servers).some((row) => row.running)) items.push({ level: "warn", text: "DHCP 鏈嶅姟鏈繍琛? });
    if (siteProblems.length) items.push({ level: siteProblems.some((row) => row.level === "danger") ? "danger" : "warn", text: `鍒嗘祦妫€娴?${siteProblems.length} 椤筦 });
    if (diag?.status === "error") items.push({ level: "warn", text: "鍙澶栭儴鎺㈡祴寮傚父" });
    return items;
  }

  function globalRiskChips(snapshot, diag) {
    const health = buildCollectionHealth(snapshot, diag);
    const siteRows = buildSiteMatrix(diag);
    const pppoe = list(snapshot.pppoe);
    const interfaces = list(snapshot.interfaces);
    const dhcp = snapshot.dhcp || {};
    const distribution = list(snapshot.loadBalance?.distribution);
    const terminals = list(snapshot.terminals);
    const staleCount = health.filter((row) => row.level !== "ok").length;
    const dnsBad = list(diag?.dnsMatrix).filter(isDnsErrorRow).length;
    const proxyBad = siteRows.filter((row) => row.level === "warn" || row.level === "danger").length;
    const wanBad = pppoe.filter((row) => !row.running).length + distribution.filter((row) => num(row.share) > 55 && distribution.length > 1).length;
    const dhcpBad = list(dhcp.servers).length && !list(dhcp.servers).some((row) => row.running) ? 1 : 0;
    const highTerminals = terminals.filter((row) => terminalRiskScore(row) >= 45).length;
    const ipv6Risk = num(snapshot.meta?.ipv6TerminalCount) > 0 ? 1 : 0;
    const ifaceErrors = interfaces.filter((row) => num(row.rxDrop) + num(row.txDrop) + num(row.rxError) + num(row.txError) > 0).length;
    return [
      { label: "閲囬泦寤惰繜", value: staleCount, level: staleCount ? "danger" : "ok" },
      { label: "DNS 寮傚父", value: dnsBad, level: dnsBad ? "warn" : "ok" },
      { label: "浠ｇ悊鍒嗘祦", value: proxyBad, level: proxyBad ? "warn" : "ok" },
      { label: "WAN 寮傚父", value: wanBad, level: wanBad ? "warn" : "ok" },
      { label: "DHCP 寮傚父", value: dhcpBad, level: dhcpBad ? "warn" : "ok" },
      { label: "楂樺嵄缁堢", value: highTerminals, level: highTerminals ? "danger" : "ok" },
      { label: "IPv6 椋庨櫓", value: ipv6Risk, level: ipv6Risk ? "warn" : "ok" },
      { label: "鎺ュ彛閿欒", value: ifaceErrors, level: ifaceErrors ? "warn" : "ok" },
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
    const status = danger ? "楂橀闄? : warn ? "闇€鍏虫敞" : "姝ｅ父";
    const statusLevel = danger ? "danger" : warn ? "warn" : "ok";
    return `
      <div class="readonly-banner">
        <div class="readonly-hero">
          <div class="readonly-hero-title">鍙杩愯浣撴 路 ${pill(status, statusLevel)}</div>
          <div class="readonly-hero-copy">鏈〉鍙睍绀轰笌鎺㈡祴锛屼笉鍚?RouterOS / OpenWrt / ESXi 鍐欏叆閰嶇疆锛涚敤浜庡揩閫熷畾浣嶉噰闆嗘柊椴滃害銆丏NS/浠ｇ悊鍒嗘祦銆佸嚭鍙ｃ€佹湇鍔″彲杈俱€佽鍒欏懡涓€佺粓绔闄┿€両Pv6 鍜岀嚎璺亸鏂溿€?/div>
          <div class="readonly-pill-row" style="margin-top:8px">
            ${risks.length ? risks.slice(0, 10).map((item) => pill(item.text, item.level)).join("") : pill("鏈彂鐜版槑鏄鹃闄?, "ok")}
            ${risks.length > 10 ? pill(`+${risks.length - 10} 椤筦, "warn") : ""}
          </div>
        </div>
        ${kpi("椋庨櫓椤?, `<span style="color:${danger ? "#d63b3b" : warn ? "#ad7200" : "#08a35c"}">${number(risks.length)}</span>`, `${number(danger)} 涓ラ噸 / ${number(warn)} 鍏虫敞`)}
        ${kpi("DNS 鎺㈡祴", number(dnsRows.length), STATE.loading && !diag ? "鍙鎺㈡祴涓? : diag ? `${diag.cached ? "缂撳瓨" : "瀹炴椂"} 路 ${html(diag.generatedAt || "-")}` : "绛夊緟鎺㈡祴")}
        ${kpi("鏈嶅姟鎺㈡祴", number(services.length), services.length ? `${number(services.filter((row) => row.ok).length)} 鍙揪` : "鏈畬鎴?)}
        ${kpi("鍑哄彛鎺㈡祴", number(exits.length), exits.length ? `${number(exits.filter((row) => row.ip).length)} 鏈夌粨鏋渀 : "鏈畬鎴?)}
      </div>`;
  }

  function renderCollectionHealth(snapshot, diag, compact = false) {
    const rows = buildCollectionHealth(snapshot, diag).map((row) => `
      <tr>
        <td>${cell(html(row.key), html(row.detail))}</td>
        <td>${pill(levelText(row.level), row.level)}</td>
        <td>${cell(html(ageText(row.value)), html(row.value || "-"), "readonly-mono")}</td>
        <td>${html(row.level === "ok" ? "椤甸潰/鏁版嵁婧愬悓姝ヤ腑" : "浼樺厛鎺掓煡閲囬泦绾跨▼鎴栨暟鎹簮")}</td>
      </tr>`);
    const body = table(["閲囬泦椤?, "鐘舵€?, "鏈€鍚庢洿鏂?, "鍒ゆ柇"], rows, "鏆傛棤閲囬泦鍋ュ悍鏁版嵁", compact ? "readonly-scroll" : "readonly-scroll-tall");
    return card("閲囬泦鍋ュ悍 / 鏁版嵁鏂伴矞搴?, "闃叉椤甸潰姝ｅ父浣嗗悗绔噰闆嗗崱姝?, body);
  }

  function renderSelfCheckPanel(diag) {
    const items = buildSelfCheckItems(diag);
    const activeKey = STATE.selfCheck.active || items[0]?.key;
    const active = items.find((item) => item.key === activeKey) || items[0];
    const refreshedText = STATE.selfCheck.refreshedAt
      ? `涓婃鎵嬪姩妫€娴嬶細${new Date(STATE.selfCheck.refreshedAt).toLocaleTimeString()}`
      : "灏氭湭鎵嬪姩瑙﹀彂锛屾湰鍖哄睍绀烘渶杩戜竴娆″彧璇绘帰娴嬬紦瀛?;
    const actionButtons = items.map((item) => {
      const busy = STATE.selfCheck.refreshing === item.key;
      return `
        <button class="readonly-selfcheck-item ${item.key === active.key ? "active" : ""}" data-readonly-refresh="${html(item.key)}" ${STATE.loading ? "disabled" : ""}>
          <span class="readonly-selfcheck-label">
            <strong>${html(item.button)}</strong>
            <span class="readonly-selfcheck-item-copy">${html(item.summary)}</span>
          </span>
          ${pill(busy ? "妫€娴嬩腑" : selfCheckStatus(item.level), busy ? "warn" : item.level)}
        </button>`;
    });
    const metricCards = list(active.metrics).map(([label, value]) => `
      <div class="readonly-selfcheck-metric">
        <span>${html(label)}</span>
        <strong>${html(value)}</strong>
      </div>`).join("");
    return card("鏁呴殰鑷鍏ュ彛", "鐐瑰嚮浼氬埛鏂板彧璇绘帰娴嬪苟鍦ㄥ彸渚ф樉绀哄搴旂粨鏋滐紱涓嶈嚜鍔ㄤ慨澶嶃€佷笉鍐欓厤缃?, `
      <div class="readonly-selfcheck-layout">
        <div class="readonly-selfcheck-list">${actionButtons.join("")}</div>
        <div class="readonly-selfcheck-detail ${active.level}">
          <div class="readonly-selfcheck-head">
            <div>
              <div class="readonly-selfcheck-title">${html(active.title)}</div>
              <div class="readonly-selfcheck-copy">${html(active.summary)}</div>
            </div>
            ${pill(STATE.selfCheck.refreshing === active.key ? "妫€娴嬩腑" : selfCheckStatus(active.level), STATE.selfCheck.refreshing === active.key ? "warn" : active.level)}
          </div>
          <div class="readonly-selfcheck-metrics">${metricCards}</div>
          ${table(active.headers || ["椤圭洰", "缁撴灉", "鐘舵€?, "璇存槑"], active.rows, "绛夊緟鍙鎺㈡祴缁撴灉", "readonly-scroll")}
          <div class="readonly-selfcheck-foot">${html(refreshedText)}锛沇ebRTC/STUN 椤逛粎鍋氳鏄庯紝涓嶇敵璇锋祻瑙堝櫒濯掍綋鏉冮檺銆?/div>
        </div>
      </div>`, "readonly-selfcheck-card-wide");
  }

  function renderSitePolicyMatrix(diag) {
    const exitIp = latestExitIp(diag);
    const rows = buildSiteMatrix(diag).map((row) => `
      <tr>
        <td>${cell(html(row.name), html(row.expected))}</td>
        <td>${cell(html(row.dnsState), html(row.answers.slice(0, 2).join(", ") || "-"), "readonly-mono")}</td>
        <td>${pill(row.fake ? "Fake-IP" : "鐪熷疄IP", row.fake ? "info" : "ok")}</td>
        <td>${html(row.policy)}</td>
        <td>${cell(html(exitIp), "褰撳墠闈㈡澘鍑哄彛锛岄潪閫愮珯鐐瑰嚭鍙?, "readonly-mono")}</td>
        <td>${row.tcp ? pill(row.tcp.ok ? "TCP閫? : "TCP澶辫触", row.tcp.ok ? "ok" : "warn") : pill("鏈噰闆?, "warn")}</td>
        <td>${row.http ? `${row.http.status ?? "-"} / ${number(row.http.elapsedMs)}ms` : "-"}</td>
        <td>${pill(row.verdict, row.level)}</td>
      </tr>`);
    return card("DNS / 浠ｇ悊鍒嗘祦浣撴鐭╅樀", "甯哥敤绔欑偣锛氳В鏋愩€丗ake-IP銆佺瓥鐣ャ€乀CP/HTTP 涓庡嚭鍙ｆ彁绀?, table(["绔欑偣", "DNS 缁撴灉", "Fake-IP", "绛栫暐鍒ゆ柇", "鍑哄彛 IP", "TCP443", "HTTP/寤惰繜", "鍒ゆ柇"], rows, "绛夊緟鍙鍒嗘祦鎺㈡祴", "readonly-scroll-tall"));
  }

  function renderDnsConsistency(diag) {
    const grouped = groupedByService(diag?.dnsMatrix);
    const serverOrder = ["OpenWrt DNS", "RouterOS DNS", "Panel System DNS"];
    const formatDnsCell = (serviceRows, serverName) => {
      const rows = serviceRows.filter((row) => row.serverName === serverName);
      const renderLine = (type) => {
        const row = rows.find((item) => item.type === type);
        if (!row) {
          return `<div class="readonly-dns-line"><span class="readonly-dns-kind">${type}</span><span class="readonly-dns-value warn">鏈噰闆?/span></div>`;
        }
        const answers = list(row.answers);
        const level = row.error ? "warn" : row.fakeIp ? "info" : "";
        const value = row.error || answers.slice(0, 2).join(", ") || "鏃犺繑鍥?;
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
        ? `寮傚父 ${number(errorCount)}`
        : expected === "proxy"
          ? (fakeCount ? "绗﹀悎浠ｇ悊" : "鐪熷疄IP")
          : (fakeCount ? "鐤戜技璇唬鐞? : "鐪熷疄IP");
      const elapsed = Math.max(...serviceRows.map((row) => num(row.elapsedMs)), 0);
      return `
        <tr>
          <td>${cell(html(name), html(serviceRows[0]?.domain || "-"))}</td>
          <td>${pill(expected, "info")}</td>
          ${serverOrder.map((serverName) => `<td>${formatDnsCell(serviceRows, serverName)}</td>`).join("")}
          <td>${cell(`${number(realCount)} 鐪?/ ${number(fakeCount)} 鍋嘸, errorCount ? `${number(errorCount)} 涓紓甯竊 : "鏃犲紓甯?)}</td>
          <td>${pill(verdict, level)}</td>
          <td>${number(elapsed)} ms</td>
        </tr>`;
    });
    return card("DNS 瑙ｆ瀽涓€鑷存€?, "姣忎釜绔欑偣涓€琛岋紝瀵圭収 OpenWrt / RouterOS / 绯荤粺 DNS 鐨?A 涓?AAAA 缁撴灉", table(["绔欑偣", "棰勬湡", "OpenWrt", "RouterOS", "绯荤粺", "鐪熷疄/Fake", "鍒ゆ柇", "鏈€鎱?], rows, "绛夊緟 DNS 鍙鎺㈡祴", "readonly-scroll-tall"));
  }

  function renderExitTable(diag) {
    const rows = list(diag?.exitChecks).map((row) => `
      <tr>
        <td>${cell(html(row.name), html(new URL(row.url || "https://invalid.local").hostname))}</td>
        <td>${cell(row.ip ? html(row.ip) : "鏈繑鍥?, row.error ? html(row.error) : "ASN / 鍦扮悊浣嶇疆鏈噰闆?, "readonly-mono")}</td>
        <td>${pill(row.error ? "寮傚父" : "鍙", row.error ? "warn" : "ok")}</td>
        <td>${number(row.elapsedMs)} ms</td>
      </tr>`);
    return card("鍑哄彛 IP / ASN 瀵圭収琛?, "鍥藉唴/娴峰/绔欑偣閫愮瓥鐣ュ嚭鍙ｆ殏涓嶆敼璺敱锛屼粎鏄剧ず褰撳墠闈㈡澘鍑哄彛", table(["鎺㈡祴婧?, "鍑哄彛 / ASN", "鐘舵€?, "鑰楁椂"], rows));
  }

  function renderServiceReachability(diag) {
    const httpRows = groupedByService(diag?.serviceReachability);
    const tcpRows = groupedByService(diag?.tcpReachability);
    const rows = SITE_ORDER.map((name) => {
      const http = list(httpRows[name])[0];
      const tcp = list(tcpRows[name])[0];
      return `
        <tr>
          <td>${html(name)}</td>
          <td>${tcp ? pill(tcp.ok ? "閫? : "澶辫触", tcp.ok ? "ok" : "warn") : pill("鏈噰闆?, "warn")}</td>
          <td>${http ? (http.status ?? "-") : "-"}</td>
          <td>${http ? pill(http.ok ? "鍙揪" : "澶辫触", http.ok ? "ok" : "warn") : pill("鏈噰闆?, "warn")}</td>
          <td>${number(Math.max(num(http?.elapsedMs), num(tcp?.elapsedMs)))} ms</td>
          <td>${html(http?.error || tcp?.error || "-")}</td>
        </tr>`;
    });
    return card("鏈嶅姟鍙揪鎬х煩闃?, "DNS銆乀CP 443銆丠TTP 鐘舵€併€佸欢杩熴€侀敊璇俊鎭?, table(["鏈嶅姟", "TCP443", "HTTP", "鐘舵€?, "寤惰繜", "閿欒"], rows, "绛夊緟鏈嶅姟鍙鎺㈡祴", "readonly-scroll-tall"));
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
    if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return "鏈噰闆?;
    if (parts[0] === 10 || (parts[0] === 192 && parts[1] === 168) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)) return "绉佺綉";
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return "CGNAT";
    return "鍏綉";
  }

  function miniKpi(label, value, foot = "") {
    return `<div class="readonly-wan-mini-kpi"><span>${html(label)}</span><strong>${value}</strong>${foot ? `<span>${html(foot)}</span>` : ""}</div>`;
  }

  function clipText(value, max = 42) {
    const text = String(value ?? "-");
    return text.length > max ? `${text.slice(0, Math.max(0, max - 1))}鈥 : text;
  }

  function compactIpList(values, limit = 2) {
    const ips = list(values).filter(Boolean);
    if (!ips.length) return "-";
    const shown = ips.slice(0, limit).map((ip) => `<span class="readonly-ip-line" title="${html(ip)}">${html(ip)}</span>`).join("");
    const more = ips.length > limit ? `<span class="readonly-more-line">+${number(ips.length - limit)} 涓湴鍧€</span>` : "";
    return `<div class="readonly-ip-stack">${shown}${more}</div>`;
  }

  function renderProtocolDistribution(snapshot) {
    const connections = snapshot.connections || {};
    const total = Math.max(num(connections.total), 1);
    const active = list(connections.active);
    const udp443 = active.filter((row) => String(row.protocol || "").toUpperCase().includes("UDP") && String(row.remoteIp || "").includes(":443"));
    const rows = [
      { label: "TCP", value: num(connections.tcp), color: "#165dff" },
      { label: "UDP", value: num(connections.udp), color: "#16c67a" },
      { label: "ICMP", value: num(connections.icmp), color: "#ffb020" },
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
    return card("杩炴帴鍗忚鍒嗗竷 / QUIC / UDP 443", "鍗忚鍗犳瘮 + 娲昏穬鏍锋湰鍚屽睆锛岄伩鍏嶅彧鐪嬬櫨鍒嗘瘮涓嶇煡閬撹皝鍦ㄨ窇", `
      <div class="readonly-wan-kpi-strip">
        ${miniKpi("杩炴帴鎬绘暟", number(connections.total), `${number(connections.tcp)} TCP`)}
        ${miniKpi("UDP 鍗犳瘮", percent(num(connections.udp) / total * 100), `${number(connections.udp)} 鏉)}
        ${miniKpi("TCP 鍗犳瘮", percent(num(connections.tcp) / total * 100), `${number(connections.tcp)} 鏉)}
        ${miniKpi("UDP443 鏍锋湰", number(udp443.length), "QUIC/STUN 瑙傚療")}
      </div>
      <div class="readonly-mini-list">
        ${rows.map((row) => progressRow(row.label, row.sample ? Math.min(100, row.value * 5) : row.value / total * 100, row.sample ? number(row.value) : percent(row.value / total * 100), row.color)).join("")}
      </div>
      <div class="readonly-protocol-sample">
        ${hotSamples.length ? hotSamples.map((row) => `
          <div class="readonly-protocol-chip">
            <strong>${html(row.localIp || "-")} 路 ${html(row.protocol || "-")}</strong>
            <span>${rate(row.upRate)} / ${rate(row.downRate)} 路 ${html(row.timeout || "-")}</span>
          </div>`).join("") : topIpSamples.map((row) => `
          <div class="readonly-protocol-chip">
            <strong>${html(row.displayName || row.hostname || row.ip)}</strong>
            <span>${html(row.ip || "-")} 路 ${number(row.connections)} 杩炴帴 路 ${rate(row.upRate)} / ${rate(row.downRate)}</span>
          </div>`).join("") || `<div class="empty">鏆傛棤杩炴帴鏍锋湰</div>`}
      </div>
      <div class="readonly-note" style="margin-top:8px">鏄庣粏 ${html(connections.detailUpdatedAt || "鏈噰闆?)} 路 鍗忚 ${html(connections.protocolUpdatedAt || "鏈噰闆?)}</div>`, "readonly-dense-card");
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
            <span>涓婅<strong>${rate(row.upRate)}</strong></span>
            <span>涓嬭<strong>${rate(row.downRate)}</strong></span>
            <span>IP 绫诲瀷<strong>${html(wanIpKind(row))}</strong></span>
            <span>璺敱<strong>${number(activeRoutes)} 娲诲姩</strong></span>
          </div>
        </div>`;
    });
    return card("WAN 绾胯矾鐢诲儚", "鎸夌嚎璺浐瀹氶『搴忓睍绀哄崰姣斻€佷笂涓嬭銆両P 绫诲瀷鍜屾椿鍔ㄨ矾鐢?, `
      <div class="readonly-wan-kpi-strip">
        ${miniKpi("鍦ㄧ嚎绾胯矾", `${number(pppoe.filter((row) => row.running).length)} / ${number(pppoe.length)}`, "PPPoE")}
        ${miniKpi("鍏綉绾胯矾", number(pppoe.filter((row) => wanIpKind(row) === "鍏綉").length), "鐪熷疄鍏綉鍦板潃")}
        ${miniKpi("绉佺綉/CGNAT", number(pppoe.filter((row) => ["绉佺綉", "CGNAT"].includes(wanIpKind(row))).length), "UPnP/鍏ョ珯闇€鍏虫敞")}
        ${miniKpi("鐞嗚鍧囧垎", percent(expected), "浠呯敤浜庡亸鏂滃弬鑰?)}
      </div>
      <div class="readonly-wan-line-grid">${tiles.join("") || `<div class="empty">鏆傛棤 WAN 绾胯矾鏁版嵁</div>`}</div>`, "readonly-dense-card");
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
      const quality = !row.running ? "绂荤嚎" : errorTotal ? "鎺ュ彛閿欒" : num(dist.share) > 55 ? "璐熻浇鍋忔枩" : "姝ｅ父";
      const level = !row.running ? "danger" : errorTotal || num(dist.share) > 55 ? "warn" : "ok";
      return `
        <tr>
          <td>${cell(html(row.name), html(row.parent || "-"))}</td>
          <td>${pill(row.running ? "鍦ㄧ嚎" : "绂荤嚎", row.running ? "ok" : "danger")}</td>
          <td>鏈噰闆?/td>
          <td>鏈噰闆?/td>
          <td>鏈噰闆?/td>
          <td>${number(activeDefaults)} 鏉?/td>
          <td>${percent(dist.share)}</td>
          <td>${number(errorTotal)}</td>
          <td>${pill(quality, level)}</td>
        </tr>`;
    });
    return card("澶?WAN 绾胯矾璐ㄩ噺", "鍦ㄧ嚎銆侀粯璁よ矾鐢便€丳CC 鍗犳瘮銆佹帴鍙ｉ敊璇紱寤惰繜/涓㈠寘/鎶栧姩淇濇寔鏈噰闆嗕笉閫犲亣", table(["绾胯矾", "鍦ㄧ嚎", "寤惰繜", "涓㈠寘", "鎶栧姩", "榛樿璺敱", "PCC鍗犳瘮", "閿欒", "5鍒嗛挓鍒ゆ柇"], rows, "鏆傛棤 WAN 绾胯矾鏁版嵁", "readonly-scroll-tall"));
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
          <td>${pill(Math.abs(diff) > 20 ? "鍋忔枩" : "鍧囪　", level)}</td>
        </tr>`;
    });
    const bars = distribution.map((row) => progressRow(row.name, num(row.share), percent(row.share), num(row.share) > 55 ? "#ffb020" : "#165dff")).join("");
    return card("PCC / 绾胯矾璐熻浇鍋忔枩", "鐞嗚鍧囧垎 vs 瀹為檯娴侀噺鍗犳瘮锛屽彧璇诲垽鏂笉鏀圭瓥鐣?, `
      <div class="readonly-wan-kpi-strip">
        ${miniKpi("鏈€蹇欑嚎璺?, html(busiest.name || "-"), percent(busiest.share))}
        ${miniKpi("鏈€浣庣嚎璺?, html(quietest.name || "-"), percent(quietest.share))}
        ${miniKpi("鍋忔枩绾胯矾", number(skewCount), `闃堝€?卤20%`)}
        ${miniKpi("鑱氬悎閫熺巼", rate(totalUp), `涓?${rate(totalDown)}`)}
      </div>
      <div class="readonly-mini-list">${bars || `<div class="empty">鏆傛棤绾胯矾璐熻浇鍒嗗竷</div>`}</div>
      <div style="margin-top:8px">${table(["绾胯矾", "鐞嗚", "瀹為檯", "涓婅", "涓嬭", "鍋忕", "鍒ゆ柇"], rows, "鏆傛棤绾胯矾鍒嗗竷", "readonly-table-compact")}</div>`, "readonly-dense-card readonly-pcc-card");
  }

  function renderInterfaceErrorTable(snapshot) {
    const rows = list(snapshot.interfaces)
      .map((row) => ({ ...row, errorTotal: num(row.rxDrop) + num(row.txDrop) + num(row.rxError) + num(row.txError) }))
      .sort((a, b) => b.errorTotal - a.errorTotal || (num(b.txRate) + num(b.rxRate)) - (num(a.txRate) + num(a.rxRate)))
      .slice(0, 14)
      .map((row) => `
        <tr>
          <td>${cell(html(row.name), html(row.type || row.role || "-"))}</td>
          <td>${pill(row.running ? "鍦ㄧ嚎" : "绂荤嚎", row.running ? "ok" : "danger")}</td>
          <td>${rate(row.txRate)}</td>
          <td>${rate(row.rxRate)}</td>
          <td>${number(row.rxDrop)} / ${number(row.txDrop)}</td>
          <td>${number(row.rxError)} / ${number(row.txError)}</td>
          <td>${pill(row.errorTotal ? "鍏虫敞" : "姝ｅ父", row.errorTotal ? "warn" : "ok")}</td>
        </tr>`);
    return card("鎺ュ彛閿欒鍋ュ悍琛?, "鎸夐敊璇紭鍏堝睍绀?Top 14锛孌rop / Error 涓庡疄鏃跺悶鍚愬悓灞?, table(["鎺ュ彛", "鐘舵€?, "瀹炴椂涓婅", "瀹炴椂涓嬭", "涓㈠寘 RX/TX", "閿欒 RX/TX", "鍒ゆ柇"], rows, "鏆傛棤鎺ュ彛鏁版嵁", "readonly-scroll readonly-table-compact"));
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
    return card("缁堢寮傚父鎺掕 / 楂橀闄╃煩闃?, `鎸夐闄╀紭鍏堝睍绀?Top ${number(Math.min(terminals.length, 12))} / ${number(terminals.length)} 鍙帮紝鍙繚鐣欑湡瀹為噰闆嗗瓧娈礰, table(["缁堢", "MAC", "涓婅", "涓嬭", "杩炴帴", "鏈€杩戝嚭鐜?, "椋庨櫓鏍囩"], rows, "鏆傛棤缁堢椋庨櫓鏁版嵁", "readonly-scroll readonly-table-compact"));
  }

  function renderChangeBoard(snapshot) {
    const history = snapshot.overview?.history || {};
    const changes = [
      { label: "WAN 涓婅", values: list(history.uplink), unit: "rate" },
      { label: "WAN 涓嬭", values: list(history.downlink), unit: "rate" },
      { label: "CPU", values: list(history.cpu), unit: "percent" },
      { label: "鍐呭瓨", values: list(history.memory), unit: "percent" },
      { label: "纾佺洏", values: list(history.disk), unit: "percent" },
    ].map((item) => {
      const values = item.values.map(num);
      const first = values[0] || 0;
      const last = values[values.length - 1] || 0;
      const delta = last - first;
      const display = item.unit === "rate" ? rate(Math.abs(delta)) : `${Math.abs(delta).toFixed(1)}%`;
      return { ...item, first, last, delta, display, score: Math.abs(delta) };
    }).sort((a, b) => b.score - a.score);

    const pppoe = list(snapshot.pppoe).slice().sort((a, b) => (num(b.upRate) + num(b.downRate)) - (num(a.upRate) + num(a.downRate))).slice(0, 5);
    return card("鏈€杩?10 鍒嗛挓鍙樺寲姒?, "褰撳墠浣跨敤闈㈡澘閲囨牱绐楀彛锛屼笉瓒?10 鍒嗛挓鏃舵寜宸叉湁鏍锋湰璁＄畻", `
      <div class="readonly-mini-list">
        ${changes.map((row) => `
          <div class="readonly-mini-item">
            <div class="readonly-main">${html(row.label)}</div>
            <div class="readonly-sub">褰撳墠 ${row.unit === "rate" ? rate(row.last) : `${row.last.toFixed(1)}%`}</div>
            <div class="readonly-main" style="text-align:right">${row.delta >= 0 ? "+" : "-"}${row.display}</div>
          </div>`).join("")}
      </div>
      <div class="readonly-note" style="margin-top:8px">褰撳墠鏈€蹇欑嚎璺細${pppoe.length ? pppoe.map((row) => `${html(row.name)} ${rate(num(row.upRate) + num(row.downRate))}`).join(" 路 ") : "鏆傛棤绾胯矾閫熺巼"}</div>`);
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
      ${card("RouterOS Mangle 鍛戒腑缁熻", "鎸夊寘鏁?娴侀噺鎺掑簭锛屽彧璇昏鏁?, table(["瑙勫垯", "鍔ㄤ綔", "璺敱鏍囪", "鍖呮暟", "娴侀噺"], mangle, "鏆傛棤 Mangle 鍛戒腑鏁版嵁"))}
      ${card("Nikki Provider 瑙勫垯瀹归噺", diag?.nikki?.ok ? `Provider ${number(diag.nikki.providerCount)} 涓?路 瑙勫垯 ${number(diag.nikki.ruleCount)} 鏉 : html(diag?.nikki?.error || "Nikki 鎺у埗鍣ㄦ湭閲囬泦"), table(["Provider", "绫诲瀷", "瑙勫垯鏁?, "鏇存柊鏃堕棿"], nikkiRows, "鏆傛棤 Nikki provider 鏁版嵁"))}`;
  }

  function renderIpv6Panel(snapshot) {
    const meta = snapshot.meta || {};
    const ifaces = list(snapshot.interfaces).filter((row) => list(row.ips).some((ip) => String(ip).includes(":")));
    const rows = ifaces.slice(0, 8).map((row) => `
      <tr>
        <td>${cell(html(row.name), html(row.type || row.role || "-"))}</td>
        <td>${pill(row.running ? "鍦ㄧ嚎" : "绂荤嚎", row.running ? "ok" : "danger")}</td>
        <td>${compactIpList(list(row.ips).filter((ip) => String(ip).includes(":")), row.name === "LAN" ? 3 : 2)}</td>
        <td>${rate(row.txRate)} / ${rate(row.rxRate)}</td>
      </tr>`);
    const ndRows = list(snapshot.dns?.ipv6Nd).slice(0, 6).map((row) => `
      <tr><td>${html(row.interface)}</td><td>${pill(row.advertiseDns ? "骞挎挱 DNS" : "涓嶅箍鎾?, row.advertiseDns ? "ok" : "warn")}</td><td>${html(list(row.dnsServers).join(", ") || "-")}</td><td>${html(row.raLifetime || "-")}</td></tr>`);
    return `
      ${card("IPv6 涓撳尯", "鍦板潃銆侀偦灞呫€丷A / DHCPv6銆佹硠婕忛闄╁彧璇诲睍绀?, `
        <div class="ops-stat-grid">
          ${kpi("IPv6 鍦板潃", number(meta.ipv6AddressCount), "RouterOS 鍦板潃琛?)}
          ${kpi("IPv6 鎺ュ彛", number(meta.ipv6InterfaceCount), "甯?IPv6 鐨勬帴鍙?)}
          ${kpi("IPv6 閭诲眳", number(meta.ipv6NeighborCount), "閭诲眳琛?)}
          ${kpi("IPv6 缁堢", number(meta.ipv6TerminalCount), "瀛樺湪鍒欏叧娉ㄧ粫杩囦唬鐞嗛闄?)}
        </div>
        <div style="margin-top:8px">${table(["鎺ュ彛", "鐘舵€?, "IPv6 鍦板潃鏍锋湰", "瀹炴椂涓?涓?], rows, "鏆傛棤 IPv6 鎺ュ彛鏁版嵁", "readonly-scroll readonly-table-compact")}</div>
        <div class="readonly-note" style="margin-top:8px">鎺ュ彛鏄庣粏灞曠ず ${number(Math.min(ifaces.length, 8))} / ${number(ifaces.length)} 椤癸紱LAN 鍦板潃鍙樉绀烘牱鏈紝閬垮厤鏁村垪琚?IPv6 闀垮湴鍧€鎾戠垎銆?/div>`)}
      ${card("IPv6 RA / DHCPv6", "DNS 骞挎挱鍜屽鎴风鐘舵€?, table(["鎺ュ彛", "DNS 骞挎挱", "DNS 鏈嶅姟鍣?, "RA 鐢熷懡鍛ㄦ湡"], ndRows, "鏆傛棤 RA / DHCPv6 鏁版嵁", "readonly-scroll readonly-table-compact"))}`;
  }

  function renderConfigDrift(snapshot, diag) {
    const meta = snapshot.meta || {};
    const dns = snapshot.dns || {};
    const lb = snapshot.loadBalance || {};
    const health = buildCollectionHealth(snapshot, diag);
    const checks = [
      { name: "鍙淇濇姢", ok: true, warn: false, detail: "鏈〉娌℃湁鍐欏叆鎺ュ彛銆佹病鏈夐厤缃彁浜ゅ姩浣? },
      { name: "閲囬泦鏂伴矞搴?, ok: !health.some((row) => row.level === "danger"), warn: health.some((row) => row.level === "warn"), detail: `${health.filter((row) => row.level !== "ok").length} 椤归渶鍏虫敞` },
      { name: "DNS 杩愯", ok: Boolean(dns.running), detail: dns.running ? "鍏佽杩滅▼璇锋眰宸插紑鍚? : "RouterOS DNS 褰撳墠鏈紑鍚繙绋嬭姹? },
      { name: "DNS 瑙勫垯瀹归噺", ok: num(dns.forwardRuleCount) > 0, warn: true, detail: `闈欐€佽鍒?${number(dns.forwardRuleCount)} 鏉 },
      { name: "PCC / 鍒嗘祦璇嗗埆", ok: Boolean(lb.pccDetected), warn: true, detail: lb.pccDetected ? "妫€娴嬪埌 PCC/鍒嗘祦瑙勫垯" : "鏈粠瑙勫垯娉ㄩ噴鎴栧瓧娈典腑璇嗗埆 PCC" },
      { name: "杩炴帴鍗忚閲囬泦", ok: !meta.connectionProtocolError, warn: true, detail: meta.connectionProtocolError || meta.connectionProtocolUpdatedAt || "鏈噰闆? },
      { name: "杩炴帴鏄庣粏閲囬泦", ok: !meta.connectionDetailError, warn: true, detail: meta.connectionDetailError || meta.connectionDetailUpdatedAt || "鏈噰闆? },
      { name: "Nikki Provider", ok: Boolean(diag?.nikki?.ok), warn: true, detail: diag?.nikki?.ok ? `${number(diag.nikki.providerCount)} 缁?/ ${number(diag.nikki.ruleCount)} 鏉 : (diag?.nikki?.error || "鏈噰闆?) },
      { name: "WebRTC/STUN", ok: true, warn: true, detail: "娴忚鍣ㄤ晶鏉冮檺娴嬭瘯锛屼笉鍦ㄩ潰鏉胯嚜鍔ㄧ敵璇峰獟浣撴潈闄? },
    ];
    const rows = checks.map((row) => {
      const level = row.ok ? (row.warn ? "warn" : "ok") : "danger";
      return `<tr><td>${html(row.name)}</td><td>${pill(row.ok ? (row.warn ? "鍏虫敞" : "閫氳繃") : "婕傜Щ", level)}</td><td>${html(row.detail)}</td></tr>`;
    });
    return card("閰嶇疆婕傜Щ妫€娴?, "鎸夊綋鍓嶅揩鐓т笌鍏抽敭鍩虹嚎鍋氬彧璇诲垽鏂?, table(["妫€鏌ラ」", "鐘舵€?, "璇存槑"], rows));
  }

  function renderTimeline(snapshot, diag) {
    const rows = [];
    if (snapshot.updatedAt) rows.push({ time: snapshot.updatedAt, type: "蹇収", msg: "RouterOS 闈㈡澘蹇収鍒锋柊" });
    if (snapshot.meta?.staticUpdatedAt) rows.push({ time: snapshot.meta.staticUpdatedAt, type: "闈欐€?, msg: "DNS/璺敱/瑙勫垯闈欐€佹暟鎹埛鏂? });
    if (snapshot.meta?.connectionProtocolUpdatedAt) rows.push({ time: snapshot.meta.connectionProtocolUpdatedAt, type: "杩炴帴", msg: "杩炴帴鍗忚璁℃暟鍒锋柊" });
    if (snapshot.meta?.connectionDetailUpdatedAt) rows.push({ time: snapshot.meta.connectionDetailUpdatedAt, type: "杩炴帴", msg: "杩炴帴鏄庣粏鍒锋柊" });
    if (diag?.generatedAt) rows.push({ time: diag.generatedAt, type: "鍙", msg: diag.cached ? "鍙鎺㈡祴缂撳瓨鍛戒腑" : "鍙鎺㈡祴鍒锋柊" });
    list(diag?.panelFiles).forEach((file) => {
      if (file.mtime) rows.push({ time: file.mtime, type: "闈㈡澘鏂囦欢", msg: `${file.path.split(/[\\/]/).pop()} 鏇存柊 / ${bytes(file.size)}` });
    });
    list(snapshot.logs?.all).slice(0, 12).forEach((row) => rows.push({ time: row.time, type: row.topics, msg: row.message }));
    const htmlRows = rows.slice(0, 24).map((row) => `<tr><td>${html(row.time)}</td><td>${pill(row.type || "-", "info")}</td><td>${html(row.msg)}</td></tr>`);
    return card("杩戞湡浜嬩欢 / 閰嶇疆鍙樻洿鏃堕棿绾?, "閲囬泦鍒锋柊銆侀潰鏉挎枃浠躲€丷outerOS 楂樹环鍊兼棩蹇楀悎骞跺睍绀?, table(["鏃堕棿", "鏉ユ簮", "浜嬩欢"], htmlRows, "鏆傛棤浜嬩欢", "readonly-scroll-tall"));
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
      { label: "DNS 闈欐€佽鍒?, value: dns.forwardRuleCount, meta: `${number(dns.disabledForwardRuleCount)} 鍋滅敤` },
      { label: "DNS 缂撳瓨鍗犵敤", value: dns.cacheUsed, meta: `${bytes(dns.cacheUsed)} / ${bytes(dns.cacheSize)}` },
      { label: "鍦板潃鍚嶅崟", value: list(security.addressLists).length, meta: "褰撳墠棰勮" },
      { label: "Nikki Provider", value: nikki.providerCount || 0, meta: `${number(nikki.ruleCount)} 鏉¤鍒檂 },
      { label: "DHCP 绉熺害", value: list(dhcp.leases).length, meta: `${list(dhcp.servers).length} 鏈嶅姟` },
      { label: "杩炴帴鎬绘暟", value: conn.total, meta: `${number(conn.tcp)} TCP / ${number(conn.udp)} UDP` },
      { label: "榛樿璺敱", value: list(route.defaultRoutes).length, meta: `${number(route.tableCount)} 璺敱琛╜ },
      { label: "鍙鍐欏叆", value: 0, meta: "鏈〉绂佹鍐欓厤缃? },
      { label: "绯荤粺鏃ュ織", value: list(logs.all).length, meta: "褰撳墠缂撳瓨" },
    ];
    return card("缂撳瓨 / 瑙勫垯瀹归噺", "闃叉瑙勫垯鎴柇銆佺紦瀛樺紓甯搞€佽繛鎺ヨ窡韪帇鍔涘鍙?, `<div class="ops-stat-grid">${items.map((item) => kpi(item.label, number(item.value), html(item.meta))).join("")}</div>`);
  }

  function renderFeatureDensityHeader(snapshot, diag, section) {
    const page = getReadonlyPage(section);
    const health = buildCollectionHealth(snapshot, diag);
    const riskCount = riskItems(snapshot, diag).length;
    const staleCount = health.filter((row) => row.level !== "ok").length;
    const pageHints = {
      readonlyDiagnostics: "鎬昏椤电敤浜庝竴鐪煎垽鏂闄╁叆鍙ｏ紝涓嶆壙杞介椤典俊鎭紝涔熶笉瑙﹀彂浠讳綍淇鍔ㄤ綔銆?,
      collectionHealthDiagnostics: "杩欓噷涓撻棬鐪嬮噰闆嗛摼璺槸鍚︽柊椴滐紝缁堢鎺掕涓嶅埛鏂版椂浼樺厛鐪?SSH 杩炴帴璇︽儏銆?,
      dnsProxyDiagnostics: "杩欓噷涓撻棬鐪?DNS銆丗ake-IP銆佸嚭鍙ｄ笌绔欑偣鍙揪鎬э紝鎺掓煡鍥藉唴澶栧垎娴佸拰娉勬紡銆?,
      wanQualityDiagnostics: "杩欓噷涓撻棬鐪嬪 WAN銆丳CC 鍋忔枩銆佽矾鐢辫〃銆佸崗璁拰鎺ュ彛璁℃暟銆?,
      terminalRiskDiagnostics: "杩欓噷涓撻棬鐪嬬粓绔紓甯搞€丏HCP 绉熺害銆両Pv6 鏆撮湶鍜岃澶囬闄┿€?,
      systemAuditDiagnostics: "杩欓噷涓撻棬鐪嬮厤缃紓绉汇€佸閲忋€佹棩蹇椼€侀潰鏉挎枃浠跺拰杩戞湡浜嬩欢銆?,
    };
    return `
      <div class="readonly-feature-brief">
        <div class="readonly-brief-copy">
          <div class="readonly-brief-title">${html(page.title)} 路 鍙淇℃伅鏉?/div>
          <div class="readonly-brief-text">${html(pageHints[section] || page.tip)}</div>
          <div class="readonly-pill-row" style="margin-top:7px">
            ${pill("涓嶅啓閰嶇疆", "ok")}
            ${pill("涓嶉噸鍚湇鍔?, "ok")}
            ${pill("涓嶆敼璺敱/闃茬伀澧?, "ok")}
          </div>
        </div>
        <div class="readonly-brief-metrics">
          ${kpi("椤甸潰椋庨櫓", number(riskCount), riskCount ? "鏈夐」鐩渶鍏虫敞" : "褰撳墠鏃犻泦涓闄?)}
          ${kpi("閲囬泦寮傚父", number(staleCount), `${number(health.length)} 涓暟鎹簮`)}
          ${kpi("蹇収鏃堕棿", html(snapshot.updatedAt || "-"), "REST /api/snapshot")}
          ${kpi("鍙鎺㈡祴", diag ? html(diag.cached ? "缂撳瓨鍛戒腑" : "瀹炴椂瀹屾垚") : html(STATE.loading ? "鎺㈡祴涓? : "鏈繑鍥?), html(diag?.generatedAt || STATE.error || "-"))}
          ${kpi("鏁版嵁婧?, number(health.length + list(diag?.panelFiles).length), "蹇収 / 鎺㈡祴 / 鏂囦欢")}
        </div>
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
      { name: "REST 蹇収", endpoint: "/api/snapshot 路 fast", updated: meta.realtimeUpdatedAt || snapshot.updatedAt, threshold: restThreshold, error: meta.realtimeError, feeds: "璧勬簮銆佹椂閽熴€佹帴鍙ｉ€熺巼銆佺郴缁熻礋杞? },
      { name: "REST 鎷撴墤鍒楄〃", endpoint: `pppoe/routes/arp 路 ${number(meta.slowRestWorkers || 1)} 骞跺彂`, updated: meta.slowRestUpdatedAt, threshold: slowThreshold, error: meta.slowRestError, feeds: "PPPoE銆佸湴鍧€銆侀粯璁よ矾鐢便€丄RP銆丏NS 鐘舵€? },
      { name: "SSH 杩炴帴璇︽儏", endpoint: "RouterOS SSH read-only", updated: meta.connectionDetailUpdatedAt || conn.detailUpdatedAt, threshold: detailThreshold, error: meta.connectionDetailError, feeds: "缁堢娴侀噺鎺掕銆佽繛鎺ユ暟銆佹椿璺冧細璇? },
      { name: "杩炴帴鍗忚缁熻", endpoint: "RouterOS connection print", updated: meta.connectionProtocolUpdatedAt || conn.protocolUpdatedAt, threshold: protocolThreshold, error: meta.connectionProtocolError, feeds: "TCP / UDP / ICMP / UDP443 鍒嗗竷" },
      { name: "闈欐€侀厤缃揩鐓?, endpoint: `DNS / routes / rules 路 ${number(meta.staticRestWorkers || 1)} 骞跺彂`, updated: meta.staticUpdatedAt, threshold: staticThreshold, error: meta.staticError, feeds: "DNS FWD銆侀粯璁よ矾鐢便€丮angle銆佸湴鍧€鍒楄〃" },
      { name: "鍙澶栭儴鎺㈡祴", endpoint: "/api/readonly-diagnostics", updated: diag?.generatedAt, threshold: FRESH.diag, feeds: "DNS 鐭╅樀銆乀CP/HTTP銆佸嚭鍙?IP銆侀潰鏉挎枃浠? },
      { name: "RouterOS 鏃ュ織缂撳瓨", endpoint: "log print", updated: snapshot.updatedAt, threshold: FRESH.rest, feeds: "杩戞湡浜嬩欢銆佹晠闅滄椂闂寸嚎" },
    ].map((row) => {
      const level = row.error ? "danger" : row.name === "鍙澶栭儴鎺㈡祴" && STATE.error ? "danger" : levelByAge(row.updated, row.threshold);
      return `
        <tr>
          <td>${cell(html(row.name), html(row.endpoint), "readonly-mono")}</td>
          <td>${pill(levelText(level), level)}</td>
          <td>${cell(html(ageText(row.updated)), `${html(clipText(row.feeds, 34))}<br><span class="readonly-mono">${html(row.updated || "-")}</span>`)}</td>
        </tr>`;
    });
    return card("鏁版嵁婧愬湴鍥?, "鏁版嵁鏉ユ簮銆佸埛鏂板勾榫勫拰褰卞搷鑼冨洿鍘嬬缉鍦ㄥ悓涓€琛?, table(["鏁版嵁婧?, "鐘舵€?, "鍒锋柊 / 褰卞搷"], rows, "鏆傛棤鏁版嵁婧?, "readonly-scroll readonly-table-compact"), "readonly-dense-card");
  }

  function renderCollectionImpactMatrix(snapshot, diag) {
    const rows = buildCollectionHealth(snapshot, diag).map((row) => {
      const impact = {
        "REST 瀹炴椂閲囬泦": "鍏ㄧ珯鍩虹鍗＄墖銆佹帴鍙ｃ€乄AN銆佺粓绔€佺郴缁熻祫婧?,
        "SSH 杩炴帴璇︽儏": "棣栭〉缁堢娴侀噺鎺掕銆佺粓绔闄┿€佽繛鎺ユ暟鎺掕",
        "杩炴帴鍗忚缁熻": "QUIC/UDP443銆佹祴閫?瑙嗛/浠ｇ悊闅ч亾瑙傚療",
        "DNS 闈欐€佽〃": "DNS 瑙勫垯銆佸垎娴佸垽鏂€侀厤缃紓绉诲熀绾?,
        "鍙浣撴鎺㈡祴": "DNS 娉勬紡銆佸嚭鍙?IP銆佹湇鍔″彲杈炬€с€侀潰鏉挎枃浠?,
      }[row.key] || "鍏宠仈璇婃柇椤?;
      return `
        <tr>
          <td>${html(row.key)}</td>
          <td>${pill(levelText(row.level), row.level)}</td>
          <td>${html(row.detail)}</td>
          <td>${html(impact)}</td>
          <td>${html(row.level === "ok" ? "缁х画瑙傚療" : "浼樺厛纭閲囬泦绾跨▼鍜屾暟鎹簮")}</td>
        </tr>`;
    });
    return card("閲囬泦褰卞搷闈㈢煩闃?, "鎶娾€滃摢涓噰闆嗗崱浣忎細褰卞搷鍝噷鈥濈洿鎺ュ垪鍑烘潵", table(["閲囬泦椤?, "鐘舵€?, "璇︽儏", "褰卞搷椤甸潰", "鎺掓煡浼樺厛绾?], rows), "readonly-dense-card");
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
          <td>${tcp ? pill(tcp.ok ? "閫? : "澶辫触", tcp.ok ? "ok" : "warn") : pill("鏈噰闆?, "warn")}</td>
          <td>${http ? `${http.status ?? "-"} / ${number(http.elapsedMs)}ms` : "-"}</td>
        </tr>`;
    });
    return card("绔欑偣鎺㈡祴瑕嗙洊鏄庣粏", "姣忎釜甯哥敤绔欑偣鍒板簳娴嬩簡鍝簺灞傦細DNS銆佺湡瀹?Fake-IP銆乀CP銆丠TTP", table(["绔欑偣", "棰勬湡", "DNS鏍锋湰", "鐪熷疄/Fake", "DNS寮傚父", "TCP443", "HTTP/寤惰繜"], rows, "绛夊緟鎺㈡祴"), "readonly-dense-card");
  }

  function renderDnsRuleInventory(snapshot) {
    const dns = snapshot.dns || {};
    const rows = list(dns.forwardRules).slice(0, 28).map((row) => `
      <tr>
        <td>${cell(html(row.name), html(row.comment || "-"))}</td>
        <td>${html(row.type || "-")}</td>
        <td>${cell(html(row.value || "-"), html(row.ttl || "-"), "readonly-mono")}</td>
        <td>${pill(row.disabled ? "鍋滅敤" : "鍚敤", row.disabled ? "warn" : "ok")}</td>
      </tr>`);
    return card("DNS 闈欐€?/ FWD 瑙勫垯棰勮", `鎬绘暟 ${number(dns.forwardRuleCount)} 路 鍋滅敤 ${number(dns.disabledForwardRuleCount)}`, table(["鍩熷悕/瑙勫垯", "绫诲瀷", "鍊?/ TTL", "鐘舵€?], rows, "鏆傛棤 DNS 瑙勫垯", "readonly-scroll-tall"), "readonly-dense-card");
  }

  function renderExitDecisionBoard(diag) {
    const siteRows = buildSiteMatrix(diag);
    const fake = siteRows.filter((row) => row.fake).length;
    const real = siteRows.filter((row) => !row.fake && row.answers.length).length;
    const dnsBad = siteRows.filter((row) => row.verdict.includes("DNS")).length;
    const httpBad = siteRows.filter((row) => row.http && !row.http.ok).length;
    const tcpBad = siteRows.filter((row) => row.tcp && !row.tcp.ok).length;
    return card("鍒嗘祦鍒ゅ畾鎽樿", "鎶婂鏉傜煩闃靛帇鎴愬嚑涓叧閿鏁帮紝鏂逛究鍏堝垽鏂柟鍚?, `
      <div class="ops-stat-grid">
        ${kpi("鐪熷疄 IP 鍊惧悜", number(real), "涓€鑸洿鍋?DIRECT")}
        ${kpi("Fake-IP 鍊惧悜", number(fake), "涓€鑸洿鍋忎唬鐞?)}
        ${kpi("DNS 寮傚父绔欑偣", number(dnsBad), "瑙ｆ瀽澶辫触鎴栬繑鍥炲紓甯?)}
        ${kpi("TCP 寮傚父绔欑偣", number(tcpBad), "443 杩炴帴澶辫触")}
        ${kpi("HTTP 寮傚父绔欑偣", number(httpBad), "绔欑偣灞傚彲杈惧紓甯?)}
        ${kpi("褰撳墠鍑哄彛", html(latestExitIp(diag)), "闈㈡澘渚у嚭鍙ｅ弬鑰?)}
      </div>
      <div class="readonly-note" style="margin-top:8px">杩欓噷鍙仛鍙褰掑洜锛屼笉浼氳嚜鍔ㄦ敼 DNS銆丯ikki 瑙勫垯銆丱penWrt 浠ｇ悊鎴?RouterOS 璺敱銆?/div>`, "readonly-dense-card");
  }

  function renderWanLineInventory(snapshot) {
    const routeByLine = Object.fromEntries(list(snapshot.loadBalance?.distribution).map((row) => [row.name, row]));
    const rows = sortedPppoeRows(snapshot.pppoe).map((row) => {
      const dist = routeByLine[row.name] || {};
      const routeText = list(row.routes).map((route) => `${route.table || "main"}/${route.distance || "-"}`).join(", ") || "-";
      return `
        <tr>
          <td>${cell(html(row.name), html(row.parent || "-"))}</td>
          <td>${pill(row.running ? "鍦ㄧ嚎" : "绂荤嚎", row.running ? "ok" : "danger")}</td>
          <td>${cell(list(row.addresses).slice(0, 2).map(html).join("<br>") || "-", "", "readonly-mono")}</td>
          <td>${rate(row.upRate)}</td>
          <td>${rate(row.downRate)}</td>
          <td>${bytes(row.txBytes)} / ${bytes(row.rxBytes)}</td>
          <td>${percent(dist.share)}</td>
          <td>${html(routeText)}</td>
        </tr>`;
    });
    return card("WAN 绾胯矾娓呭崟", "8 鏉?PPPoE 鐨勫湴鍧€銆佺埗鎺ュ彛銆侀€熺巼銆佺疮璁″拰璺敱琛ㄥ叧绯?, table(["绾胯矾", "鐘舵€?, "鍦板潃", "涓婅", "涓嬭", "绱涓?涓?, "鍗犳瘮", "璺敱琛?], rows, "鏆傛棤 WAN 鏁版嵁", "readonly-scroll-tall"), "readonly-dense-card");
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
          <td>${pill(row.running ? "鍦ㄧ嚎" : "绂荤嚎", row.running ? "ok" : "danger")}</td>
          <td>${main ? `${html(main.table)} / ${html(main.distance || "-")}` : "-"}</td>
          <td>${own ? `${html(own.table)} / ${html(own.distance || "-")}` : "-"}</td>
          <td>${pill(main?.active || own?.active ? "娲诲姩" : "鍏虫敞", main?.active || own?.active ? "ok" : "warn")}</td>
        </tr>`;
    });
    return card("榛樿璺敱缃楃洏", "鎶?main 榛樿銆佸悇绾胯矾琛ㄩ粯璁ゅ拰娲诲姩鐘舵€佸帇缂╁湪涓€灞?, `
      <div class="readonly-wan-kpi-strip">
        ${miniKpi("榛樿璺敱", number(defaults.length), `${number(activeDefaults.length)} 娲诲姩`)}
        ${miniKpi("main 琛?, number(mainDefaults.length), `${number(mainDefaults.filter((row) => row.active).length)} 娲诲姩`)}
        ${miniKpi("璺敱琛?, number(routes.tableCount), `${number(routes.staticCount)} 闈欐€乣)}
        ${miniKpi("鍔ㄦ€佽矾鐢?, number(routes.dynamicCount), "鍙缁熻")}
      </div>
      ${table(["绾胯矾", "鎷ㄥ彿", "main / distance", "涓撶敤琛?/ distance", "鍒ゆ柇"], lineRows, "鏆傛棤榛樿璺敱鏁版嵁")}`, "readonly-dense-card");
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
        <td>${pill(row.active ? "娲诲姩" : "闈炴椿鍔?, row.active ? "ok" : "warn")}</td>
        <td>${pill(row.disabled ? "鍋滅敤" : "鍚敤", row.disabled ? "warn" : "ok")}</td>
      </tr>`);
    return card("榛樿 / 闈欐€佽矾鐢卞簱瀛?, `灞曠ず榛樿璺敱 + 闈欐€佹牱鏈?${number(rows.length)} 鏉★紱鎬婚潤鎬?${number(routes.staticCount)}`, table(["鐩爣", "琛?, "缃戝叧", "璺濈", "娲诲姩", "鍚敤"], rows, "鏆傛棤璺敱鏁版嵁", "readonly-scroll readonly-table-compact"), "readonly-dense-card");
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
        <span>${row.samples.map(html).join(" 路 ") || "鏃犳牱鏈?} 路 IPv6 ${number(row.ipv6)}</span>
      </div>`);
    const samples = rules.slice(0, 4).map((row) => `
      <div class="readonly-protocol-chip">
        <strong>${html(row.table || "-")} 路 ${html(row.action || "-")}</strong>
        <span>${html(row.comment || row.srcAddress || "-")} 路 ${row.disabled ? "鍋滅敤" : row.inactive ? "鏈椿鍔? : "娲诲姩"}</span>
      </div>`);
    return card("Routing Rule 鎽樿", "鍏堢湅鍒嗙粍鍜岀姸鎬侊紝鍐嶇湅鏍锋湰锛涢伩鍏嶉暱琛ㄧ嫭鍗犳暣椤?, `
      <div class="readonly-wan-kpi-strip">
        ${miniKpi("瑙勫垯鎬绘暟", number(rules.length), `${number(lookupOnly)} lookup-only`)}
        ${miniKpi("娲诲姩瑙勫垯", number(rules.filter((row) => !row.disabled && !row.inactive).length), "disabled/inactive 宸插墧闄?)}
        ${miniKpi("IPv6 婧愮瓥鐣?, number(rules.filter((row) => String(row.srcAddress || "").includes(":")).length), "婧愬湴鍧€鍒嗘祦")}
        ${miniKpi("娑夊強琛?, number(groups.length), groups.slice(0, 4).map((row) => row.table).join(" / "))}
      </div>
      <div class="readonly-rule-group-grid">${groupCards.join("") || `<div class="empty">鏆傛棤 Routing Rule 鍒嗙粍</div>`}</div>
      <div class="readonly-protocol-sample">${samples.join("") || `<div class="empty">鏆傛棤 Routing Rule 鏍锋湰</div>`}</div>`, "readonly-dense-card");
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
    return card("Mangle 鍛戒腑鎽樿", "鎸夎矾鐢辨爣璁拌仛鍚堝懡涓紝蹇€熺湅鍝被绛栫暐瀹為檯鍦ㄨ窇", `
      <div class="readonly-wan-kpi-strip">
        ${miniKpi("Mangle 瑙勫垯", number(rules.length), "鍙璁℃暟")}
        ${miniKpi("鍛戒腑鍒嗙粍", number(byMark.length), "鎸?routing mark")}
        ${miniKpi("鏈€楂樻祦閲?, byMark[0] ? html(byMark[0].mark) : "-", byMark[0] ? bytes(byMark[0].bytes) : "")}
        ${miniKpi("PCC 璇嗗埆", snapshot.loadBalance?.pccDetected ? "宸叉娴? : "鏈娴?, "鏉ヨ嚜蹇収")}
      </div>
      ${table(["鏍囪", "瑙勫垯", "娴侀噺", "鏍锋湰娉ㄩ噴"], rows, "鏆傛棤 Mangle 鏁版嵁")}`, "readonly-dense-card");
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
    return card("缁堢瀵嗛泦娓呭崟", `鎸夋椿璺冨害灞曠ず Top ${number(Math.min(terminals.length, 12))} / ${number(terminals.length)} 鍙帮紝閬垮厤闀胯〃鎸ゆ帀 IPv6/DHCP 淇℃伅`, table(["缁堢", "MAC", "鐘舵€?, "涓婅", "涓嬭", "杩炴帴", "浼氳瘽娴侀噺", "鏈€杩戝嚭鐜?], rows, "鏆傛棤缁堢鏁版嵁", "readonly-scroll readonly-table-compact"), "readonly-dense-card");
  }

  function renderDhcpLeaseMatrix(snapshot) {
    const leases = list(snapshot.dhcp?.leases);
    const rows = leases.slice(0, 12).map((row) => `
      <tr>
        <td>${cell(html(row.displayName || row.hostname || row.address), html(row.address), "readonly-mono")}</td>
        <td>${html(row.mac || "-")}</td>
        <td>${html(row.server || "-")}</td>
        <td>${pill(row.status || "-", String(row.status || "").toLowerCase() === "bound" ? "ok" : "warn")}</td>
        <td>${pill(row.static ? "闈欐€? : "鍔ㄦ€?, row.static ? "info" : "ok")}</td>
        <td>${html(row.lastSeen || "-")}</td>
      </tr>`);
    return card("DHCP 绉熺害鐭╅樀", `灞曠ず Top ${number(Math.min(leases.length, 12))} / ${number(leases.length)} 鏉?路 鏈嶅姟 ${number(list(snapshot.dhcp?.servers).length)}`, table(["璁惧", "MAC", "鏈嶅姟", "鐘舵€?, "绫诲瀷", "鏈€鍚庡嚭鐜?], rows, "鏆傛棤 DHCP 绉熺害", "readonly-scroll readonly-table-compact"), "readonly-dense-card");
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
      return `<tr><td>${pill("鍙鍛婅", "warn")}</td><td>${html(text)}</td></tr>`;
    });
    return `
      ${card("瀹夊叏 / ARP 鍛婅鎽樿", "鍙灞曠ず锛屼笉鍒涘缓灏佺鎴栬鍒?, table(["绫诲瀷", "鍐呭"], alertRows, "褰撳墠娌℃湁瀹夊叏鎴?ARP 鍛婅", "readonly-scroll readonly-wrap-table"))}
      ${card("鍦板潃鍒楄〃棰勮", "灞曠ず Top 12 鏍锋湰锛屼究浜庤瀵熷叧閿悕鍗曞拰瑙勫垯瀹归噺", table(["鍒楄〃", "鍦板潃", "瓒呮椂", "娉ㄩ噴"], addrRows, "鏆傛棤鍦板潃鍒楄〃", "readonly-scroll readonly-table-compact"))}`;
  }

  function renderIpv6ExposureMatrix(snapshot) {
    const ipv6Terminals = list(snapshot.terminals).filter((row) => String(row.ip || "").includes(":"));
    const rows = ipv6Terminals.slice(0, 6).map((row) => `
      <tr>
        <td>${cell(html(clipText(row.displayName || row.hostname || "IPv6 缁堢", 24)), compactIpList([row.ip], 1))}</td>
        <td>${html(row.mac || "-")}</td>
        <td>${pill(row.status || "IPv6", "warn")}</td>
        <td>${rate(row.upRate)} / ${rate(row.downRate)}</td>
        <td>${number(row.connections)}</td>
        <td>${html(row.lastSeen || "-")}</td>
      </tr>`);
    return card("IPv6 缁堢鏆撮湶娓呭崟", `灞曠ず Top ${number(Math.min(ipv6Terminals.length, 6))} / ${number(ipv6Terminals.length)} 鍙帮紝闀?IPv6 鍦板潃鍋氬崟琛岃鍓猔, table(["缁堢 / IPv6", "MAC", "鐘舵€?, "涓?涓嬭", "杩炴帴", "鏈€杩戝嚭鐜?], rows, "鏆傛棤 IPv6 缁堢", "readonly-scroll readonly-table-compact"), "readonly-dense-card");
  }

  function renderPanelFileInventory(diag) {
    const rows = list(diag?.panelFiles).map((file) => `
      <tr>
        <td>${cell(html(String(file.path || "-").split(/[\\/]/).pop()), html(clipText(file.path || "-", 34)), "readonly-mono")}</td>
        <td>${bytes(file.size)}</td>
        <td>${html(file.mtime || "-")}</td>
        <td>${pill("鍙", "ok")}</td>
      </tr>`);
    return card("闈㈡澘鏂囦欢鍙娓呭崟", "鐢ㄤ簬杩借釜鍓嶇閮ㄧ讲涓庢枃浠舵洿鏂版椂闂达紝涓嶆墽琛岃鐩?, table(["鏂囦欢", "澶у皬", "淇敼鏃堕棿", "鐘舵€?], rows, "鏆傛棤闈㈡澘鏂囦欢鏁版嵁", "readonly-scroll readonly-table-compact"), "readonly-dense-card");
  }

  function renderRouterLogTable(snapshot) {
    const rows = list(snapshot.logs?.all).slice(0, 20).map((row) => `
      <tr>
        <td>${html(row.time || "-")}</td>
        <td>${pill(row.topics || "-", "info")}</td>
        <td>${html(row.message || "-")}</td>
      </tr>`);
    return card("RouterOS 鏃ュ織鍙绐楀彛", "灞曠ず鏈€杩?20 鏉￠珮浠峰€间簨浠讹紝涓嶆竻绌恒€佷笉鍐欏叆銆佷笉璋冩暣鏃ュ織閰嶇疆", table(["鏃堕棿", "涓婚", "娑堟伅"], rows, "鏆傛棤鏃ュ織", "readonly-scroll-tall readonly-wrap-table"), "readonly-dense-card");
  }

  function renderCapacityPressureMatrix(snapshot, diag) {
    const dns = snapshot.dns || {};
    const conn = snapshot.connections || {};
    const route = snapshot.routes || {};
    const rows = [
      { label: "DNS 缂撳瓨", value: num(dns.cacheSize) ? num(dns.cacheUsed) / num(dns.cacheSize) * 100 : 0, display: `${bytes(dns.cacheUsed)} / ${bytes(dns.cacheSize)}`, color: "#165dff" },
      { label: "杩炴帴 TCP", value: num(conn.total) ? num(conn.tcp) / num(conn.total) * 100 : 0, display: `${number(conn.tcp)} / ${number(conn.total)}`, color: "#16c67a" },
      { label: "杩炴帴 UDP", value: num(conn.total) ? num(conn.udp) / num(conn.total) * 100 : 0, display: `${number(conn.udp)} / ${number(conn.total)}`, color: "#ffb020" },
      { label: "榛樿璺敱鍗犳瘮", value: num(route.staticCount) ? num(route.defaultCount) / num(route.staticCount) * 100 : 0, display: `${number(route.defaultCount)} / ${number(route.staticCount)}`, color: "#7c5cff" },
      { label: "Nikki 瑙勫垯", value: Math.min(100, num(diag?.nikki?.ruleCount) / 80), display: `${number(diag?.nikki?.ruleCount)} 鏉, color: "#2f7df6" },
    ];
    return card("瀹归噺鍘嬪姏鏉?, "鐢ㄨ繘搴︽潯琛ュ厖瀹归噺瑙傚療锛屼笉浠ｈ〃闃堝€煎憡璀︼紝鍙綔瓒嬪娍鍙傝€?, `<div class="readonly-mini-list">${rows.map((row) => progressRow(row.label, row.value, row.display, row.color)).join("")}</div>`, "readonly-dense-card");
  }

  function renderDiagnosticsDirectory(snapshot, diag) {
    const health = buildCollectionHealth(snapshot, diag);
    const siteRows = buildSiteMatrix(diag);
    const pppoe = list(snapshot.pppoe);
    const terminals = list(snapshot.terminals);
    const routes = snapshot.routes || {};
    const rows = [
      { page: "閲囬泦鍋ュ悍", owner: "閲囬泦閾捐矾", signal: `${health.filter((row) => row.level !== "ok").length} 椤瑰叧娉╜, link: "collectionHealthDiagnostics", action: "鍏堢湅 SSH / REST / 闈欐€佽〃鏄惁鏂伴矞" },
      { page: "DNS / 浠ｇ悊", owner: "鍒嗘祦涓庡嚭鍙?, signal: `${siteRows.filter((row) => row.level !== "ok").length} 涓珯鐐瑰紓甯竊, link: "dnsProxyDiagnostics", action: "鏌?DNS銆丗ake-IP銆乀CP銆丠TTP銆佸嚭鍙? },
      { page: "绾胯矾璐ㄩ噺", owner: "WAN / PCC", signal: `${pppoe.filter((row) => !row.running).length} 鏉＄绾?/ ${number(routes.tableCount)} 寮犺〃`, link: "wanQualityDiagnostics", action: "鏌ョ嚎璺崰姣斻€佽矾鐢卞簱瀛樸€丮angle 鍛戒腑" },
      { page: "缁堢椋庨櫓", owner: "缁堢韬唤", signal: `${terminals.filter((row) => terminalRiskScore(row) >= 45).length} 鍙伴珮椋庨櫓`, link: "terminalRiskDiagnostics", action: "鏌ョ粓绔€丏HCP銆両Pv6 鏆撮湶" },
      { page: "绯荤粺瀹¤", owner: "鍩虹嚎涓庝簨浠?, signal: `${list(snapshot.logs?.all).length} 鏉℃棩蹇?/ ${list(diag?.panelFiles).length} 涓枃浠禶, link: "systemAuditDiagnostics", action: "鏌ユ紓绉汇€佸閲忋€佹棩蹇楀拰闈㈡澘鏂囦欢" },
    ].map((row) => `
      <tr>
        <td><a href="#${row.link}" data-section="${row.link}" data-nav-group="diagnostics">${html(row.page)}</a></td>
        <td>${html(row.owner)}</td>
        <td>${html(row.signal)}</td>
        <td>${html(row.action)}</td>
      </tr>`);
    return card("璇婃柇鍔熻兘椤电洰褰?, "鎬昏椤靛彧鍋氳矾鏍囷紝涓嶅鍒跺悇鍔熻兘椤佃鎯呰〃", table(["椤甸潰", "鍞竴鑱岃矗", "褰撳墠淇″彿", "涓嬩竴姝ユ煡鐪?], rows), "readonly-dense-card");
  }

  function renderRiskPriorityQueue(snapshot, diag) {
    const rows = riskItems(snapshot, diag).slice(0, 18).map((item, index) => `
      <tr>
        <td>${number(index + 1)}</td>
        <td>${pill(item.level === "danger" ? "楂? : item.level === "warn" ? "涓? : "浣?, item.level)}</td>
        <td>${html(item.text)}</td>
        <td>${html(item.level === "danger" ? "浼樺厛杩涘叆瀵瑰簲鍔熻兘椤垫帓鏌? : "瑙傚療瓒嬪娍鍜屽埛鏂扮姸鎬?)}</td>
      </tr>`);
    return card("椋庨櫓浼樺厛闃熷垪", "鍙垪闂绾跨储锛屼笉閲嶅灞曠ず璇︽儏鏁版嵁", table(["搴忓彿", "绾у埆", "绾跨储", "澶勭悊寤鸿"], rows, "褰撳墠娌℃湁闆嗕腑椋庨櫓"), "readonly-dense-card");
  }

  function renderSignalCoverageMatrix(snapshot, diag) {
    const rows = [
      { name: "閲囬泦鏂伴矞搴?, source: "REST / SSH / static snapshot", page: "閲囬泦鍋ュ悍", count: buildCollectionHealth(snapshot, diag).length },
      { name: "绔欑偣鍒嗘祦", source: "DNS / TCP / HTTP probes", page: "DNS / 浠ｇ悊", count: SITE_ORDER.length },
      { name: "WAN 涓庤矾鐢?, source: "PPPoE / route / mangle", page: "绾胯矾璐ㄩ噺", count: list(snapshot.pppoe).length + list(snapshot.routes?.defaultRoutes).length },
      { name: "缁堢韬唤", source: "terminal / DHCP / IPv6", page: "缁堢椋庨櫓", count: list(snapshot.terminals).length + list(snapshot.dhcp?.leases).length },
      { name: "瀹¤鍩虹嚎", source: "logs / files / capacity", page: "绯荤粺瀹¤", count: list(snapshot.logs?.all).length + list(diag?.panelFiles).length },
    ].map((row) => `
      <tr>
        <td>${html(row.name)}</td>
        <td>${html(row.source)}</td>
        <td>${html(row.page)}</td>
        <td>${number(row.count)}</td>
      </tr>`);
    return card("淇″彿瑕嗙洊鐭╅樀", "璇存槑姣忕被淇″彿鐨勫敮涓€褰掑睘锛岄伩鍏嶈法椤甸潰閲嶅灞曠ず", table(["淇″彿", "鏉ユ簮", "褰掑睘椤甸潰", "鏍锋湰鏁?], rows), "readonly-dense-card");
  }

  function renderDedupPolicyCard() {
    const rows = [
      { rule: "璇︽儏琛ㄥ敮涓€褰掑睘", desc: "閲囬泦銆丏NS銆乄AN銆佺粓绔€佸璁″悇鑷彧鍦ㄥ搴斿姛鑳介〉灞曠ず瀹屾暣琛ㄦ牸" },
      { rule: "鎬昏鍙仛绱㈠紩", desc: "鎬昏椤靛彧淇濈暀鍏ュ彛銆侀闄╀紭鍏堢骇鍜岃鐩栧叧绯伙紝涓嶅鍒舵槑缁嗚〃" },
      { rule: "鍚岀被淇℃伅涓嶈法椤甸噸澶?, desc: "瀹归噺銆佹棩蹇椼€佸畨鍏ㄥ悕鍗曞彧褰掔郴缁熷璁★紱DHCP 鍜?IPv6 缁堢鍙綊缁堢椋庨櫓" },
      { rule: "鏈噰闆嗕笉閫犲亣", desc: "娌℃湁鐪熷疄瀛楁鐨勪綅缃繚鐣欐湭閲囬泦鎴栧彧璇昏鏄庯紝涓嶈ˉ铏氬亣鎸囨爣" },
      { rule: "鍙杈圭晫鍥哄畾", desc: "鎵€鏈夋ā鍧楀彧灞曠ず鐘舵€侊紝涓嶄笅鍙戦厤缃€佷笉閲嶅惎鏈嶅姟銆佷笉鏀硅矾鐢辫鍒? },
    ].map((row) => `<tr><td>${html(row.rule)}</td><td>${html(row.desc)}</td></tr>`);
    return card("鍘婚噸褰掑睘瑙勫垯", "鐢ㄤ簬闃叉鍚庣画鍙堟妸鍚屼竴绫讳俊鎭爢鍥炲涓〉闈?, table(["瑙勫垯", "璇存槑"], rows), "readonly-dense-card");
  }

  function renderCollectionThresholdMatrix() {
    const rows = Object.entries(FRESH).map(([key, value]) => `
      <tr>
        <td>${html(key)}</td>
        <td>${number(value.warn)}s</td>
        <td>${number(value.danger)}s</td>
        <td>${html(key === "connection" ? "缁堢鎺掕/杩炴帴鏄庣粏" : key === "static" ? "DNS/璺敱/瑙勫垯闈欐€佸揩鐓? : key === "diag" ? "鍙澶栭儴鎺㈡祴" : "瀹炴椂椤甸潰鏁版嵁")}</td>
      </tr>`);
    return card("鏂伴矞搴﹂槇鍊艰〃", "鍙В閲婂垽鏂爣鍑嗭紝涓嶉噸澶嶄簨浠舵椂闂寸嚎", table(["绫诲瀷", "鍏虫敞闃堝€?, "寮傚父闃堝€?, "褰卞搷鑼冨洿"], rows, "鏆傛棤闃堝€?, "readonly-scroll readonly-table-compact"), "readonly-dense-card");
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
    return card("閲囬泦寤惰繜鎺掑簭", "鎸夊埛鏂板勾榫勬帓搴忥紝閬垮厤璇存槑鍒楁妸鏁磋鎾戦珮", table(["閲囬泦椤?, "鐘舵€?, "鏈€鍚庢洿鏂?], rows, "鏆傛棤閲囬泦鏁版嵁", "readonly-scroll readonly-table-compact"), "readonly-dense-card");
  }

  function renderCollectionDependencyMap(snapshot, diag) {
    const health = Object.fromEntries(buildCollectionHealth(snapshot, diag).map((row) => [row.key, row.level]));
    const rows = [
      { page: "棣栭〉娴侀噺鎺掕", needs: "SSH 杩炴帴璇︽儏", level: health["SSH 杩炴帴璇︽儏"] || "warn" },
      { page: "杩炴帴鐩戞帶", needs: "杩炴帴鍗忚缁熻 + SSH 杩炴帴璇︽儏", level: (health["杩炴帴鍗忚缁熻"] === "ok" && health["SSH 杩炴帴璇︽儏"] === "ok") ? "ok" : "warn" },
      { page: "DNS / 浠ｇ悊浣撴", needs: "DNS 闈欐€佽〃 + 鍙浣撴鎺㈡祴", level: (health["DNS 闈欐€佽〃"] === "ok" && health["鍙浣撴鎺㈡祴"] === "ok") ? "ok" : "warn" },
      { page: "绾胯矾璐ㄩ噺", needs: "REST 瀹炴椂閲囬泦 + 闈欐€侀厤缃揩鐓?, level: (health["REST 瀹炴椂閲囬泦"] === "ok" && health["DNS 闈欐€佽〃"] === "ok") ? "ok" : "warn" },
      { page: "绯荤粺瀹¤", needs: "REST 瀹炴椂閲囬泦 + 鏃ュ織缂撳瓨", level: health["REST 瀹炴椂閲囬泦"] || "warn" },
    ].map((row) => `
      <tr>
        <td>${html(row.page)}</td>
        <td>${html(row.needs)}</td>
        <td>${pill(levelText(row.level), row.level)}</td>
      </tr>`);
    return card("椤甸潰渚濊禆鍏崇郴", "鎶婇噰闆嗛」鍜岄〉闈㈡晠闅滃叧鑱旇捣鏉ワ紝閬垮厤閲嶅鏀惧悓涓€寮犺〃", table(["椤甸潰", "渚濊禆鏁版嵁", "褰撳墠鍒ゆ柇"], rows, "鏆傛棤渚濊禆", "readonly-scroll readonly-table-compact"), "readonly-dense-card");
  }

  function renderTerminalStatusBuckets(snapshot) {
    const terminals = list(snapshot.terminals);
    const buckets = [
      { label: "楂樿繛鎺?, rows: terminals.filter((row) => num(row.connections) > 200), color: "#ff5a5a" },
      { label: "鏈変笂浼?, rows: terminals.filter((row) => num(row.upRate) > 0), color: "#165dff" },
      { label: "鏈変笅杞?, rows: terminals.filter((row) => num(row.downRate) > 0), color: "#16c67a" },
      { label: "IPv6", rows: terminals.filter((row) => String(row.ip || "").includes(":")), color: "#7c5cff" },
      { label: "绂荤嚎/闄堟棫", rows: terminals.filter((row) => ["stale", "failed", "incomplete"].includes(String(row.status || "").toLowerCase())), color: "#ffb020" },
    ];
    return card("缁堢鐘舵€佸垎妗?, "淇濈暀缁堢椤典俊鎭噺锛屼絾涓嶉噸澶嶇郴缁熷璁＄殑瀹夊叏鍚嶅崟", `<div class="readonly-mini-list">${buckets.map((row) => progressRow(row.label, terminals.length ? row.rows.length / terminals.length * 100 : 0, `${number(row.rows.length)} / ${number(terminals.length)}`, row.color)).join("")}</div>`, "readonly-dense-card");
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
        <td>${pill(server.running ? "杩愯" : "鍋滅敤", server.running ? "ok" : "warn")}</td>
      </tr>`);
    return `
      ${card("DHCP 鏈嶅姟鎽樿", "缁堢椤典繚鐣?DHCP 瑙嗚锛屼笉閲嶅绯荤粺瀹¤", table(["鏈嶅姟", "鎺ュ彛", "鍦板潃姹?, "鐘舵€?], serverRows, "鏆傛棤 DHCP 鏈嶅姟"))}
      ${card("DHCP 鍦板潃姹犲崰鐢?, "鍦板潃姹犱娇鐢ㄧ巼鍙瑙傚療", table(["鍦板潃姹?, "宸茬敤", "鎬绘暟", "浣跨敤鐜?], poolRows, "鏆傛棤鍦板潃姹?))}`;
  }

  function renderAuditSignalSummary(snapshot, diag) {
    const securityAlerts = list(snapshot.security?.alerts).length;
    const arpAlerts = list(snapshot.arp?.alerts).length;
    const errorIfaces = list(snapshot.interfaces).filter((row) => num(row.rxDrop) + num(row.txDrop) + num(row.rxError) + num(row.txError) > 0).length;
    const checks = [
      { label: "瀹夊叏鍛婅", value: securityAlerts, meta: "security.alerts" },
      { label: "ARP 鍛婅", value: arpAlerts, meta: "arp.alerts" },
      { label: "鎺ュ彛閿欒", value: errorIfaces, meta: "drop/error > 0" },
      { label: "闈㈡澘鏂囦欢", value: list(diag?.panelFiles).length, meta: "閮ㄧ讲鍙拷婧? },
      { label: "鏃ュ織绐楀彛", value: list(snapshot.logs?.all).length, meta: "RouterOS 杩戞湡鏃ュ織" },
      { label: "鍙鍐欏叆", value: 0, meta: "鏃犻厤缃彁浜ゅ姩浣? },
    ];
    return card("瀹¤淇″彿鎽樿", "绯荤粺瀹¤椤靛彧淇濈暀璺ㄧ郴缁熷熀绾匡紝涓嶉噸澶嶇粓绔〉璁惧鏄庣粏", `<div class="ops-stat-grid">${checks.map((item) => kpi(item.label, number(item.value), html(item.meta))).join("")}</div>`, "readonly-dense-card");
  }

  function renderCompressedOverview(snapshot, diag) {
    const pppoe = list(snapshot.pppoe);
    const onlinePppoe = pppoe.filter((row) => row.running).length;
    const conn = snapshot.connections || {};
    const overview = snapshot.overview || {};
    return card("涓€灞忓帇缂╃増鎬昏", "蹇€熷贰妫€鍏ュ彛", `
      <div class="ops-stat-grid">
        ${kpi("鍦ㄧ嚎瀹藉甫", `${number(onlinePppoe)} / ${number(pppoe.length)}`, "PPPoE")}
        ${kpi("鍦ㄧ嚎缁堢", number(overview.onlineTerminals), "ARP / DHCP / IPv6 鍚堝苟")}
        ${kpi("杩炴帴鎬绘暟", number(conn.total), `${number(conn.tcp)} TCP 路 ${number(conn.udp)} UDP`)}
        ${kpi("瀹炴椂涓婅", rate(overview.uplinkBps), "鑱氬悎 WAN")}
        ${kpi("瀹炴椂涓嬭", rate(overview.downlinkBps), "鑱氬悎 WAN")}
        ${kpi("CPU", `${number(overview.cpuLoad)}%`, html(overview.cpuModel || "-"))}
        ${kpi("鍐呭瓨", percent(overview.memoryUsage), `${bytes(overview.memoryUsedBytes)} / ${bytes(overview.memoryTotalBytes)}`)}
        ${kpi("纾佺洏", percent(overview.diskUsage), `${bytes(overview.diskUsedBytes)} / ${bytes(overview.diskTotalBytes)}`)}
      </div>
      <div class="readonly-note" style="margin-top:8px">鍙鎺㈡祴锛?{diag ? `${diag.cached ? "缂撳瓨" : "瀹炴椂"} 路 ${html(diag.generatedAt || "-")}` : STATE.loading ? "鎺㈡祴涓? : "绛夊緟鎺㈡祴"}</div>`);
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
    { section: "readonlyDiagnostics", title: "鍙璇婃柇鎬昏", label: "璇婃柇鎬昏", desc: "鍏ュ彛鍜岄闄╂憳瑕?, tip: "鐙珛鍙璇婃柇鍏ュ彛锛屼笉鍐嶅悜棣栭〉娉ㄥ叆璇婃柇妯″潡", icon: "ik-load", keywords: "鍙 璇婃柇 鎬昏 椋庨櫓 鎽樿" },
    { section: "collectionHealthDiagnostics", title: "閲囬泦鍋ュ悍", label: "閲囬泦鍋ュ悍", desc: "鏁版嵁鏂伴矞搴?, tip: "REST銆丼SH銆丏NS 闈欐€佽〃銆佽繛鎺ヨ鎯呬笌鍙鎺㈡祴鍒锋柊鐘舵€?, icon: "ik-dns", keywords: "閲囬泦 鍋ュ悍 鏂伴矞搴?REST SSH 杩炴帴璇︽儏 鏁版嵁婧? },
    { section: "dnsProxyDiagnostics", title: "DNS / 浠ｇ悊浣撴", label: "DNS / 浠ｇ悊", desc: "鍒嗘祦涓庡嚭鍙?, tip: "甯哥敤绔欑偣 DNS銆丗ake-IP銆佸嚭鍙?IP銆乀CP/HTTP 鍙揪鎬ч泦涓彧璇绘娴?, icon: "ik-dns", keywords: "DNS 浠ｇ悊 鍒嗘祦 鍑哄彛 Fake-IP GitHub YouTube Apple 鎶栭煶" },
    { section: "wanQualityDiagnostics", title: "绾胯矾璐ㄩ噺", label: "绾胯矾璐ㄩ噺", desc: "WAN / PCC", tip: "澶?WAN 璐ㄩ噺銆丳CC 鍋忔枩銆佸崗璁垎甯冨拰瑙勫垯鍛戒腑鍙鍒嗘瀽", icon: "ik-balance", keywords: "WAN 绾胯矾 PCC 鍋忔枩 鍗忚 UDP443 瑙勫垯鍛戒腑" },
    { section: "terminalRiskDiagnostics", title: "缁堢椋庨櫓", label: "缁堢椋庨櫓", desc: "寮傚父缁堢 / IPv6", tip: "楂樿繛鎺ャ€侀珮娴侀噺銆両Pv6 鏆撮湶涓庣粓绔紓甯稿彧璇绘帓琛?, icon: "ik-terminal", keywords: "缁堢 椋庨櫓 寮傚父 IPv6 杩炴帴 娴侀噺 璁惧" },
    { section: "systemAuditDiagnostics", title: "绯荤粺瀹¤", label: "绯荤粺瀹¤", desc: "婕傜Щ / 閿欒 / 瀹归噺", tip: "閰嶇疆婕傜Щ銆佽繎鏈熶簨浠躲€佹帴鍙ｉ敊璇€佺紦瀛樺閲忓拰璧勬簮鍙樺寲姒?, icon: "ik-security", keywords: "瀹¤ 婕傜Щ 鍙樻洿 鏃堕棿绾?鎺ュ彛閿欒 瀹归噺 缂撳瓨" },
  ];

  const READONLY_SECTION_SET = new Set(READONLY_FEATURE_PAGES.map((page) => page.section));
  const isReadonlySection = (section) => READONLY_SECTION_SET.has(section);
  const getReadonlyPage = (section) => READONLY_FEATURE_PAGES.find((page) => page.section === section) || READONLY_FEATURE_PAGES[0];
  if (typeof compactTopbarSections !== "undefined") {
    READONLY_FEATURE_PAGES.forEach((page) => compactTopbarSections.add(page.section));
  }

  function renderReadonlyFeatureNav(activeSection) {
    return `<div class="readonly-feature-nav">
      ${READONLY_FEATURE_PAGES.map((page) => `
        <a class="readonly-feature-link ${page.section === activeSection ? "is-active" : ""}" href="#${page.section}" data-section="${page.section}" data-nav-group="diagnostics">
          <strong>${html(page.label)}</strong>
          <span>${html(page.desc)}</span>
        </a>`).join("")}
    </div>`;
  }

  function renderReadonlyFeatureBody(snapshot, diag, section) {
    switch (section) {
      case "collectionHealthDiagnostics":
        return `
          <div class="readonly-readable-flow">
            ${renderCollectionHealth(snapshot, diag)}
            <div class="readonly-density-columns readonly-collection-density">
              <div class="ops-page-stack">
                ${renderCollectionAgeQueue(snapshot, diag)}
                ${renderCollectionDependencyMap(snapshot, diag)}
                ${renderCollectionThresholdMatrix()}
              </div>
              <div class="ops-page-stack">
                ${renderCollectionImpactMatrix(snapshot, diag)}
                ${renderDataSourceMap(snapshot, diag)}
              </div>
            </div>
          </div>`;
      case "dnsProxyDiagnostics":
        return `
          <div class="readonly-readable-flow">
            <div class="readonly-compact-grid">
              ${renderExitDecisionBoard(diag)}
              ${renderExitTable(diag)}
            </div>
            ${renderServiceReachability(diag)}
            ${renderSitePolicyMatrix(diag)}
            ${renderDnsConsistency(diag)}
            <div class="readonly-band-stack">
              ${renderDnsProbeCoverage(diag)}
              ${renderDnsRuleInventory(snapshot)}
            </div>
          </div>`;
      case "wanQualityDiagnostics":
        return `
          <div class="readonly-readable-flow">
            <div class="readonly-wan-density-grid">
              <div class="ops-page-stack">
                ${renderPccSkew(snapshot)}
              </div>
              <div class="ops-page-stack">
                ${renderProtocolDistribution(snapshot)}
              </div>
              <div class="ops-page-stack">
                ${renderDefaultRouteCompass(snapshot)}
              </div>
            </div>
            ${renderWanQuality(snapshot)}
            ${renderWanLoadPortrait(snapshot)}
            ${renderWanLineInventory(snapshot)}
            <div class="readonly-wan-density-grid">
              <div class="ops-page-stack">
                ${renderRouteInventory(snapshot)}
              </div>
              <div class="ops-page-stack">
                ${renderMangleHitDigest(snapshot)}
              </div>
              <div class="ops-page-stack">
                ${renderRoutingRuleInventory(snapshot)}
              </div>
            </div>
          </div>`;
      case "terminalRiskDiagnostics":
        return `
          <div class="readonly-readable-flow">
            ${renderTerminalAnomalies(snapshot)}
            <div class="readonly-terminal-priority-grid">
              <div class="ops-page-stack">
                ${renderTerminalStatusBuckets(snapshot)}
                ${renderDhcpServerPoolSummary(snapshot)}
                ${renderDhcpLeaseMatrix(snapshot)}
              </div>
              <div class="ops-page-stack">
                ${renderIpv6ExposureMatrix(snapshot)}
                ${renderTerminalInventory(snapshot)}
              </div>
            </div>
            ${renderIpv6Panel(snapshot)}
          </div>`;
      case "systemAuditDiagnostics":
        return `
          <div class="readonly-readable-flow">
            ${renderConfigDrift(snapshot, diag)}
            <div class="readonly-density-columns readonly-system-density">
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
            </div>
            ${renderInterfaceErrorTable(snapshot)}
            ${renderTimeline(snapshot, diag)}
            ${renderRouterLogTable(snapshot)}
            ${renderSecuritySignals(snapshot)}
          </div>`;
      case "readonlyDiagnostics":
      default:
        return `
          <div class="readonly-readable-flow">
            ${renderGlobalRiskStrip(snapshot, diag)}
            ${renderRiskPriorityQueue(snapshot, diag)}
            ${renderCollectionHealth(snapshot, diag, true)}
            ${renderSelfCheckPanel(diag)}
            ${renderSitePolicyMatrix(diag)}
            ${renderCompressedOverview(snapshot, diag)}
            <div class="readonly-support-grid">
              ${renderDiagnosticsDirectory(snapshot, diag)}
              ${renderSignalCoverageMatrix(snapshot, diag)}
              ${renderDedupPolicyCard()}
            </div>
          </div>`;
    }
  }

  function renderReadonlyFeaturePage(snapshot, section = "readonlyDiagnostics") {
    const diag = STATE.payload;
    const page = getReadonlyPage(section);
    const isHub = page.section === "readonlyDiagnostics";
    const rootOpen = isHub ? "" : `<div id="readonlyDiagnostics" class="readonly-diagnostics-root">`;
    const rootClose = isHub ? "" : `</div>`;
    return `
      <section class="section readonly-diagnostics-section" id="${html(page.section)}">
        ${rootOpen}
        <div class="ops-page-stack">
          ${renderReadonlyFeatureBody(snapshot, diag, page.section)}
        </div>
        ${rootClose}
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
    const siteProblems = siteRows.filter((row) => row.level === "warn" || row.level === "danger").length;
    const pppoe = list(snapshot.pppoe);
    const onlinePppoe = pppoe.filter((row) => row.running).length;
    const terminals = list(snapshot.terminals);
    const highTerminals = terminals.filter((row) => terminalRiskScore(row) >= 45).length;
    const interfaces = list(snapshot.interfaces);
    const ifaceErrors = interfaces.filter((row) => num(row.rxDrop) + num(row.txDrop) + num(row.rxError) + num(row.txError) > 0).length;
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
        ["椋庨櫓椤?, number(risks.length), kpiLevel(risks.length, 1, 3)],
        ["閲囬泦寤惰繜", number(stale), kpiLevel(stale, 1, 2)],
        ["鍒嗘祦寮傚父", number(siteProblems), kpiLevel(siteProblems, 1, 3)],
        ["鎺ュ彛閿欒", number(ifaceErrors), kpiLevel(ifaceErrors, 1, 5)],
        ["ROS 鍐欏叆", "0", "ok"],
      ],
      collectionHealthDiagnostics: [
        ["寮傚父閲囬泦", number(stale), kpiLevel(stale, 1, 2)],
        ["REST", ageText(health.find((row) => row.key.includes("REST 瀹炴椂"))?.value), "info"],
        ["SSH 璇︽儏", ageText(health.find((row) => row.key.includes("SSH"))?.value), "info"],
        ["DNS 闈欐€?, ageText(health.find((row) => row.key.includes("DNS"))?.value), "info"],
        ["鍙鎺㈡祴", ageText(health.find((row) => row.key.includes("鍙"))?.value), "info"],
      ],
      dnsProxyDiagnostics: [
        ["DNS 寮傚父", number(dnsErrors), kpiLevel(dnsErrors, 1, 3)],
        ["鍒嗘祦寮傚父", number(siteProblems), kpiLevel(siteProblems, 1, 3)],
        ["鍑哄彛缁撴灉", number(exitCount), exitCount ? "ok" : "warn"],
        ["瑙勫垯鏍锋湰", number(staticRules), "info"],
        ["ROS 鍐欏叆", "0", "ok"],
      ],
      wanQualityDiagnostics: [
        ["鍦ㄧ嚎瀹藉甫", `${number(onlinePppoe)} / ${number(pppoe.length)}`, onlinePppoe === pppoe.length ? "ok" : "warn"],
        ["鏈€澶у崰姣?, percent(maxShare), maxShare > 55 ? "warn" : "ok"],
        ["UDP 鍗犳瘮", percent(num(connections.udp) / Math.max(num(connections.total), 1) * 100), "info"],
        ["榛樿璺敱", number(routeTotal), "info"],
        ["鎺ュ彛閿欒", number(ifaceErrors), kpiLevel(ifaceErrors, 1, 5)],
      ],
      terminalRiskDiagnostics: [
        ["楂樺嵄缁堢", number(highTerminals), kpiLevel(highTerminals, 1, 3)],
        ["鍦ㄧ嚎缁堢", number(snapshot.overview?.onlineTerminals ?? terminals.length), "info"],
        ["IPv6 缁堢", number(ipv6Count), ipv6Count ? "warn" : "ok"],
        ["DHCP 绉熺害", number(list(snapshot.dhcp?.leases).length), "info"],
        ["ROS 鍐欏叆", "0", "ok"],
      ],
      systemAuditDiagnostics: [
        ["閰嶇疆婕傜Щ", number(risks.filter((item) => /婕傜Щ|閰嶇疆|瑙勫垯|璺敱/.test(item.text)).length), "info"],
        ["鎺ュ彛閿欒", number(ifaceErrors), kpiLevel(ifaceErrors, 1, 5)],
        ["鏃ュ織绐楀彛", number(logsCount), "info"],
        ["DNS 瑙勫垯", number(staticRules), "info"],
        ["ROS 鍐欏叆", "0", "ok"],
      ],
    };
    return itemsBySection[section] || itemsBySection.readonlyDiagnostics;
  }

  function syncReadonlyScrollPin(snapshot = displayedSnapshot || latestSnapshot || {}) {
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
            <span>鍙鍚搁《 路 涓嶅啓閰嶇疆 路 涓嶆仮澶嶉《閮ㄥぇ鍗?/span>
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
        <td>${cell(html(row.name), html(row.expected === "direct" ? "DIRECT 棰勬湡" : row.expected === "proxy" ? "浠ｇ悊棰勬湡" : row.expected))}</td>
        <td>${cell(html(row.dnsState), html(row.policy))}</td>
        <td>${cell(row.tcp?.ok ? "TCP閫? : "TCP寮傚父", row.http?.ok ? `HTTP ${html(row.http.status || "-")}` : "HTTP寮傚父")}</td>
        <td>${pill(row.verdict, row.level)}</td>
      </tr>`);
    return card("DNS / 浠ｇ悊鍒嗘祦鎽樿", "棣栭〉鍙斁缁撹锛屽畬鏁寸煩闃佃繘鍏ュ彧璇讳綋妫€椤垫煡鐪?, table(["绔欑偣", "DNS/绛栫暐", "杩為€?, "鍒ゆ柇"], rows, "绛夊緟鍙鍒嗘祦鎺㈡祴", "readonly-scroll"));
  }

  function enhanceOverview(snapshot) {
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
    const navItems = READONLY_FEATURE_PAGES.map((page) => ({
      section: page.section,
      label: page.label,
      icon: page.icon || "ik-load",
    }));
    if (typeof railGroups !== "undefined" && Array.isArray(railGroups) && !railGroups.some((group) => group.id === "diagnostics")) {
      const insertAt = Math.max(1, railGroups.findIndex((group) => group.id === "logs"));
      railGroups.splice(insertAt >= 0 ? insertAt : railGroups.length, 0, {
        id: "diagnostics",
        label: "璇婃柇",
        icon: "ik-load",
        section: "readonlyDiagnostics",
      });
    }
    if (typeof menuGroups !== "undefined") {
      menuGroups.diagnostics = navItems;
      if (Array.isArray(menuGroups.monitor)) {
        menuGroups.monitor = menuGroups.monitor.filter((item) => !READONLY_SECTION_SET.has(item.section));
      }
    }
    if (typeof menuGroupLabel !== "undefined") {
      menuGroupLabel.diagnostics = "鍙璇婃柇";
    }
    if (typeof pageMeta !== "undefined") {
      READONLY_FEATURE_PAGES.forEach((page) => {
        pageMeta[page.section] = { title: page.title, subtitle: page.tip };
      });
    }
    if (typeof sectionToGroup !== "undefined") {
      READONLY_FEATURE_PAGES.forEach((page) => {
        sectionToGroup[page.section] = "diagnostics";
      });
    }
    if (typeof quickSearchItems !== "undefined" && Array.isArray(quickSearchItems)) {
      READONLY_FEATURE_PAGES.forEach((page) => {
        if (!quickSearchItems.some((item) => item.section === page.section)) {
          quickSearchItems.push({
            section: page.section,
            title: page.title,
            group: "鍙璇婃柇",
            icon: page.icon || "ik-load",
            desc: page.tip,
            keywords: page.keywords,
          });
        }
      });
    }
    return;
    if (typeof pageMeta !== "undefined") {
      pageMeta.readonlyDiagnostics = {
        title: "鍙浣撴",
        subtitle: "閲囬泦鍋ュ悍銆丏NS銆佸嚭鍙ｃ€佹湇鍔°€佽鍒欍€佺粓绔€両Pv6 涓庣嚎璺亸鏂滃彧璇昏瘖鏂?,
      };
    }
    if (typeof sectionToGroup !== "undefined") {
      sectionToGroup.readonlyDiagnostics = "monitor";
    }
    if (typeof menuGroups !== "undefined" && Array.isArray(menuGroups.monitor)) {
      if (!menuGroups.monitor.some((item) => item.section === "readonlyDiagnostics")) {
        menuGroups.monitor.splice(1, 0, { section: "readonlyDiagnostics", label: "鍙浣撴", icon: "ik-load" });
      }
    }
    if (typeof quickSearchItems !== "undefined" && Array.isArray(quickSearchItems)) {
      if (!quickSearchItems.some((item) => item.section === "readonlyDiagnostics")) {
        quickSearchItems.push({
          section: "readonlyDiagnostics",
          title: "鍙浣撴",
          group: "鐩戞帶",
          icon: "ik-load",
          desc: "閲囬泦鍋ュ悍銆丏NS銆佸嚭鍙ｃ€佹湇鍔″彲杈俱€佽鍒欏懡涓€佺粓绔闄┿€両Pv6 涓庣嚎璺亸鏂?,
          keywords: "鍙 浣撴 璇婃柇 閲囬泦 鍋ュ悍 DNS 鍑哄彛 鏈嶅姟 IPv6 缁堢 椋庨櫓 绾胯矾 鍋忔枩",
        });
      }
    }
  }

  function patchRenderers() {
    if (typeof renderApp !== "function" || renderApp.__readonlyDiagnosticsV2Patched) return;
    const originalRenderApp = renderApp;
    renderApp = function patchedReadonlyDiagnosticsRenderApp(snapshot) {
      if (typeof currentSection !== "undefined" && isReadonlySection(currentSection)) {
        document.body.classList.add("readonly-diagnostics-page");
        const warning = snapshot.status !== "ok"
          ? `<div class="notice danger" style="margin-bottom:12px">閲囬泦鐘舵€佸紓甯革細${html(snapshot.error || "鏈煡閿欒")}銆傚綋鍓嶉〉闈㈠睍绀烘渶杩戝彲鐢ㄥ揩鐓с€?/div>`
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

  registerReadonlyDiagnosticsPage();
  patchRenderers();

  if (typeof renderNavigation === "function") renderNavigation();
  const requestedFromQuery = new URLSearchParams(window.location.search || "").get("section") || "";
  const requested = requestedFromQuery || String(window.location.hash || "").replace(/^#/, "");
  if (isReadonlySection(requested) && typeof setActiveSection === "function") {
    setActiveSection(requested, true);
  } else if (typeof currentSection !== "undefined" && isReadonlySection(currentSection) && typeof renderApp === "function") {
    renderApp(displayedSnapshot || latestSnapshot || {});
  }
})();

