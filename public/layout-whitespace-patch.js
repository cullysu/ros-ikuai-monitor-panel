(() => {
  if (window.__layoutWhitespacePatchV2) return;
  window.__layoutWhitespacePatchV2 = true;

  const whitespaceStyle = document.createElement('style');
  whitespaceStyle.textContent = `
    .page-subtitle,
    .topbar .page-subtitle,
    .topbar-header .page-subtitle {
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      margin: 0 !important;
      overflow: hidden !important;
    }
    #overview { --home-panel-gap: 10px; }
    #overview .section-head { margin-bottom: 8px; }
    #overview .ik-home-status-grid { grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 7px; margin-bottom: 8px; }
    #overview .ik-home-status-tile { padding: 8px 10px; border-radius: 10px; box-shadow: 0 6px 18px rgba(26, 58, 102, .035); }
    #overview .ik-home-status-tile strong { margin-top: 4px; font-size: 16px; line-height: 1.1; }
    #overview .ik-home-status-tile em { margin-top: 4px; font-size: 10.5px; }
    #overview .ik-home-layout { grid-template-columns: 420px minmax(0, 1fr); gap: var(--home-panel-gap); align-items: start; }
    #overview .ik-home-layout > .stack,
    #overview .ik-home-main { gap: var(--home-panel-gap); height: auto; }
    #overview .ik-home-layout > .stack { display: flex; flex-direction: column; min-width: 0; }
    #overview .ik-home-main { display: grid; grid-template-columns: minmax(0, .92fr) minmax(0, 1.08fr); align-items: stretch; }
    #overview .ik-home-main > .card { min-width: 0; }
    #overview .ik-home-main > .card:nth-child(1),
    #overview .ik-home-main > .card:nth-child(4) { grid-column: 1 / -1; }
    #overview .card-head { padding: 7px 10px 0; }
    #overview .card-body { padding: 8px 10px 10px; }
    #overview .ik-wan-hero { gap: 10px; padding: 10px; margin-bottom: 8px; border-radius: 10px; }
    #overview .ik-wan-main { margin-top: 5px; font-size: 22px; }
    #overview .ik-wan-sub { margin-top: 5px; line-height: 1.35; }
    #overview .ik-wan-chipline { gap: 5px; }
    #overview .ik-wan-chip { min-height: 22px; padding: 0 8px; font-size: 10.5px; }
    #overview .ik-home-quick-card { display: flex; flex: 0 0 auto; flex-direction: column; min-height: 0; overflow: visible; }
    #overview .ik-home-quick-card .card-body { display: flex; flex: 0 0 auto; flex-direction: column; min-height: 0; height: auto; padding: 9px 10px 10px; overflow: visible; }
    #overview .ik-home-quick-card .ik-quick-grid { flex: 0 0 auto; grid-template-rows: repeat(3, 78px); gap: 8px; margin-top: 0; min-height: 0; }
    #overview .ik-home-quick-card .ik-quick-link { align-content: center; padding: 10px 9px; border-radius: 10px; font-size: 12px; font-weight: 700; }
    #overview .ik-home-quick-card .ik-quick-link span:first-child { width: 24px; height: 24px; border-radius: 8px; }
    #overview .ik-home-monitor-grid { grid-template-columns: minmax(0, .78fr) minmax(0, 1.22fr); gap: 10px; }
    #overview .ik-home-summary-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
    #overview .ik-home-rank-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; align-items: stretch; }
    #overview .ik-home-rank-card { display: flex; min-height: 0; flex-direction: column; }
    #overview .ik-home-rank-card .ops-table-wrap { border: 0; border-radius: 0; flex: 1 1 auto; height: 430px; max-height: 430px; overflow-y: auto; overscroll-behavior: contain; }
    #overview .ik-home-rank-card-head { padding: 8px 10px; }
    #overview .ik-home-rank-card .ops-table thead th { position: sticky; top: 0; z-index: 2; background: #f8fbff; box-shadow: 0 1px 0 #edf1f7; }
    #overview .wide-card .info-list { gap: 6px 10px; }
    #overview .wide-card .info-item { padding-bottom: 6px; }
    #overview .ik-wan-info-card .info-list { gap: 6px 10px; margin-top: 3px; }
    #overview .ik-wan-info-card .info-item { padding-bottom: 5px; }
    #overview .ik-wan-info-card .info-k { color: #7f8da1; font-size: 11px; font-weight: 700; line-height: 1.2; }
    #overview .ik-wan-info-card .info-v { margin-top: 3px; color: #253246; font-size: 12px; font-weight: 700; line-height: 1.35; }
    #overview .ik-wan-switch { margin-top: 7px; padding: 6px 8px; border-radius: 9px; }
    #overview .ik-wan-line-select { height: 28px; font-size: 12px; font-weight: 700; }
    #overview .ik-summary-split { gap: 8px; align-items: start; }
    #overview .ik-summary-box { min-height: 0; padding: 7px 9px; }
    #overview .ik-summary-box b { margin-top: 5px; font-size: 16px; line-height: 1.05; }
    #overview .ik-wan-rate-split:not(.is-main) { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 8px; }
    #overview .ik-wan-rate-split:not(.is-main) .ik-wan-rate-head { display: block; margin-bottom: 5px; }
    #overview .ik-wan-rate-split:not(.is-main) .ik-wan-rate-value { min-width: 0; margin-top: 5px; text-align: left; }
    #overview .ik-wan-rate-split:not(.is-main) .ik-wan-rate-chart { grid-template-columns: minmax(0, 1fr) 54px; gap: 6px; }
    #overview .ik-wan-rate-split:not(.is-main) .ik-wan-rate-svg { height: 82px; }
    #overview .ik-wan-rate-split.is-main .ik-wan-rate-svg { height: 124px; }
    #overview .ik-wan-rate-axis { font-size: 9.5px; }
    #overview .chart-box { padding: 7px; }
    #overview .mini-chart { height: 112px; }
    #overview .ik-system-load-card .ops-resource-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    #overview .ik-system-load-card .ops-resource-card { padding: 9px 10px 10px; }
    #overview .ops-resource-grid { gap: 10px; }
    #overview .ops-resource-card { padding: 9px 10px; }
    #overview .ops-resource-plot,
    #overview .ops-resource-svg { height: 88px; }
    #overview .ik-system-load-card .ops-resource-plot,
    #overview .ik-system-load-card .ops-resource-svg { height: 88px; }
    #overview .ik-home-terminal-grid { gap: 7px; }
    #overview .ik-home-terminal-tile { min-height: 62px; padding: 9px 10px; border-radius: 9px; }
    #overview .ik-home-terminal-tile b { margin-top: 6px; font-size: 20px; }
    #overview .ik-home-line-bars { gap: 4px; margin-top: 8px; }
    #overview .ik-home-line-bars .line-bar { grid-template-columns: 104px minmax(0, 1fr) 58px; min-height: 18px; gap: 8px; }
    #overview .ik-home-line-bars .line-name { font-size: 11px; }
    #overview .ik-home-line-bars .line-share { font-size: 12px; }
    #overview .ik-home-line-bars .progress { height: 6px; }
    .ops-page-stack { display: flex; flex-direction: column; gap: 10px; }
    .ops-split { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.95fr); gap: 10px; align-items: start; }
    .ops-double { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; align-items: start; }
    .ops-side-stack { display: flex; flex-direction: column; gap: 10px; }
    .ops-bar-stack { display: flex; flex-direction: column; gap: 6px; }
    .ops-bar-stack .line-bar { grid-template-columns: 118px 1fr 90px; gap: 10px; }
    .ops-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(126px, 1fr)); gap: 8px; }
    .ops-stat-tile { min-width: 0; padding: 8px 9px; border-radius: 8px; border: 1px solid var(--border); background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%); }
    .ops-stat-label { color: var(--text-dim); font-size: 11px; line-height: 1.2; word-break: break-word; }
    .ops-stat-value { margin-top: 4px; color: var(--text); font-size: 14px; font-weight: 700; line-height: 1.2; word-break: break-word; }
    .ops-stat-meta { margin-top: 4px; color: var(--text-soft); font-size: 11px; line-height: 1.35; }
    .ops-density-table .card-body, .ops-info-card .card-body { padding: 8px 10px 10px; }
    .ops-table-wrap { overflow: auto; border: 1px solid var(--border); border-radius: 8px; background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%); }
    .ops-table { width: 100%; border-collapse: collapse; table-layout: auto; }
    .ops-table th, .ops-table td { padding: 7px 8px; border-bottom: 1px solid #edf2f7; text-align: left; vertical-align: top; color: var(--text); font-size: 12px; line-height: 1.35; }
    .ops-table th { position: sticky; top: 0; z-index: 1; background: #f8fbff; color: var(--text-dim); font-size: 11px; font-weight: 700; white-space: nowrap; }
    .ops-table tbody tr:nth-child(even) { background: rgba(248, 251, 255, 0.78); }
    .ops-table tbody tr:hover { background: #f3f8ff; }
    .ops-table tbody tr:last-child td { border-bottom: 0; }
    .ops-compact-table th { padding: 5px 7px; font-size: 10px; line-height: 1.1; }
    .ops-compact-table td { padding: 5px 7px; font-size: 11px; line-height: 1.18; vertical-align: middle; }
    .ops-compact-table .ops-inline-dual { gap: 1px; }
    .ops-compact-table .ops-inline-main,
    .ops-compact-table .ops-inline-sub { font-size: 11px; line-height: 1.15; }
    .ops-compact-table .tag { min-height: 18px; padding: 0 7px; font-size: 11px; }
    .ops-inline-dual { display: flex; flex-direction: column; gap: 2px; min-width: 0; color: var(--text-soft); }
    .ops-inline-main { color: inherit; font-weight: 500; line-height: 1.25; word-break: break-word; }
    .ops-inline-sub { color: inherit; font-size: 11px; font-weight: 500; line-height: 1.25; word-break: break-word; }
    .ops-inline-sub.is-mono, .ops-inline-main.is-mono { font-family: "Consolas", "SFMono-Regular", "Liberation Mono", monospace; }
    .ops-density-table .record-list { gap: 4px; }
    .ops-density-table .record-head { padding: 5px 8px; }
    .ops-density-table .record-title { gap: 0; }
    .ops-density-table .record-title .record-label, .ops-density-table .record-item .record-label { font-size: 10px; line-height: 1.05; }
    .ops-density-table .record-title .record-value, .ops-density-table .record-item .record-value { font-size: 11px; line-height: 1.2; }
    .ops-density-table .record-grid { padding: 5px 8px 7px; gap: 3px 6px; grid-template-columns: repeat(auto-fit, minmax(124px, 1fr)); }
    .ops-density-table .record-item { padding-bottom: 3px; }
    .ops-density-table .empty, .ops-info-card .empty { min-height: 0; padding: 14px 12px; border: 1px dashed #e6edf7; border-radius: 8px; background: #fbfcfe; }
    #routes .metric-value, #balance .metric-value, #dns6 .metric-value, #logs .metric-value, #trafficLoad .metric-value, #trafficAudit .metric-value { white-space: normal; word-break: break-word; }
    #balance .metric-card:first-child .metric-value { font-size: 20px; line-height: 1.2; }
    #logs .metric-value { font-size: 22px; }
    #logs .ops-empty-card .card-body, #dns6 .ops-empty-card .card-body { padding-top: 10px; }
    #arp .card-body, #trafficAudit .card-body { padding-top: 8px; }
    #arp .record-list, #trafficAudit .record-list { gap: 4px; }
    #arp .record-head, #trafficAudit .record-head { padding: 5px 8px; }
    #arp .record-grid, #trafficAudit .record-grid { padding: 5px 8px 7px; gap: 3px 6px; }
    #trafficLoad .line-trend-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .ops-resource-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    .ops-resource-card { min-width: 0; padding: 8px 10px 10px; border: 1px solid #e3edf8; border-radius: 10px; background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%); }
    .ops-resource-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 7px; }
    .ops-resource-title { display: flex; align-items: center; gap: 6px; color: var(--text); font-size: 12px; font-weight: 700; line-height: 1.2; }
    .ops-resource-dot { width: 8px; height: 8px; border-radius: 999px; background: var(--resource-color); box-shadow: 0 0 0 3px color-mix(in srgb, var(--resource-color) 14%, transparent); }
    .ops-resource-value { color: var(--text); font-size: 13px; font-weight: 700; line-height: 1.1; text-align: right; white-space: nowrap; }
    .ops-resource-meta { margin-top: 2px; color: var(--text-dim); font-size: 10px; line-height: 1.2; text-align: right; white-space: nowrap; }
    .ops-axis-chart { display: grid; grid-template-columns: 32px minmax(0, 1fr); gap: 6px; align-items: stretch; }
    .ops-axis-labels { display: flex; flex-direction: column; justify-content: space-between; padding: 1px 0 3px; color: var(--text-dim); font-size: 10px; line-height: 1; text-align: right; }
    .ops-resource-plot { min-width: 0; height: 96px; border-radius: 8px; background: linear-gradient(180deg, #fbfdff 0%, #f8fbff 100%); }
    .ops-resource-svg { display: block; width: 100%; height: 96px; }
    #balance .ops-balance-route-row { align-items: stretch; }
    #balance .ops-balance-route-row > .card { height: 100%; }
    #balance .ops-balance-share-card { display: flex; flex-direction: column; }
    #balance .ops-balance-share-card .card-body { display: flex; flex: 1; }
    #balance .ops-balance-share-card .ops-bar-stack { flex: 1; justify-content: space-between; gap: 0; min-height: 252px; }
    #balance .ops-balance-share-card .line-bar { min-height: 24px; align-items: center; }
    #overview {
      --ops-home-ink: #17324b;
      --ops-home-muted: #6a7c91;
      --ops-home-soft: #93a3b5;
      --ops-home-border: #dbe6f2;
      --ops-home-surface: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
      --home-panel-gap: 12px;
    }
    #overview .section-head {
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e3edf7;
    }
    #overview .ops-overview-shell { display: flex; flex-direction: column; gap: 12px; }
    #overview .ops-overview-banner {
      display: grid;
      grid-template-columns: minmax(0, 1.12fr) minmax(380px, 0.88fr);
      border: 1px solid #d8e3ef;
      border-radius: 18px;
      overflow: hidden;
      background: linear-gradient(135deg, #173451 0%, #1d587c 45%, #f7fbff 45.2%, #fbfdff 100%);
      box-shadow: 0 18px 40px rgba(18, 41, 70, 0.08);
    }
    #overview .ops-overview-banner-main {
      min-width: 0;
      padding: 18px 22px;
      color: #fff;
    }
    #overview .ops-overview-kicker {
      color: rgba(255, 255, 255, 0.64);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }
    #overview .ops-overview-title {
      margin-top: 8px;
      color: #fff;
      font: 800 32px/1.08 "Bahnschrift", "Microsoft YaHei", sans-serif;
      letter-spacing: 0.01em;
    }
    #overview .ops-overview-meta,
    #overview .ops-overview-brief {
      margin-top: 6px;
      color: rgba(255, 255, 255, 0.82);
      font-size: 13px;
      line-height: 1.4;
    }
    #overview .ops-overview-chip-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 16px;
    }
    #overview .ops-overview-chip {
      display: inline-flex;
      align-items: baseline;
      gap: 6px;
      min-height: 30px;
      padding: 0 11px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.16);
      background: rgba(255, 255, 255, 0.11);
    }
    #overview .ops-overview-chip span {
      color: rgba(255, 255, 255, 0.72);
      font-size: 11px;
      line-height: 1;
    }
    #overview .ops-overview-chip b {
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      line-height: 1;
    }
    #overview .ops-overview-chip.is-ok {
      border-color: rgba(134, 239, 172, 0.24);
      background: rgba(34, 197, 94, 0.16);
    }
    #overview .ops-overview-chip.is-warn {
      border-color: rgba(253, 224, 71, 0.24);
      background: rgba(245, 158, 11, 0.16);
    }
    #overview .ops-overview-chip.is-muted {
      border-color: rgba(226, 232, 240, 0.18);
      background: rgba(148, 163, 184, 0.12);
    }
    #overview .ops-overview-banner-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      align-content: center;
      padding: 16px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 251, 255, 1) 100%);
    }
    #overview .ops-overview-metric {
      min-width: 0;
      padding: 12px 13px;
      border-radius: 14px;
      border: 1px solid #e2ebf5;
      background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%);
      box-shadow: 0 10px 20px rgba(23, 50, 75, 0.04);
    }
    #overview .ops-overview-metric span,
    #overview .ops-overview-metric em {
      display: block;
      color: var(--ops-home-muted);
      font-size: 11px;
      line-height: 1.25;
      font-style: normal;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #overview .ops-overview-metric strong {
      display: block;
      margin-top: 5px;
      color: var(--ops-home-ink);
      font: 800 20px/1.08 "Bahnschrift", "Microsoft YaHei", sans-serif;
      letter-spacing: 0.01em;
    }
    #overview .ops-overview-metric em { margin-top: 5px; }
    #overview .ops-overview-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 12px;
      align-items: start;
    }
    #overview .ops-overview-left,
    #overview .ops-overview-center,
    #overview .ops-overview-right {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 0;
    }
    #overview .ops-public-home-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.08fr) minmax(360px, 0.92fr);
      gap: 12px;
      align-items: start;
    }
    #overview .ops-public-home-main,
    #overview .ops-public-home-side {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 0;
    }
    #overview .ops-public-home-wide,
    #overview .ops-public-home-full {
      grid-column: 1 / -1;
      min-width: 0;
    }
    #overview .ops-public-home-trend-band {
      display: grid;
      grid-template-columns: minmax(0, 1.18fr) minmax(0, 0.82fr);
      gap: 12px;
      align-items: start;
    }
    #overview .ops-home-panel,
    #overview .ops-overview-right .ik-home-rank-card {
      min-width: 0;
      border: 1px solid var(--ops-home-border);
      border-radius: 16px;
      background: var(--ops-home-surface);
      box-shadow: 0 14px 28px rgba(18, 41, 70, 0.05);
      overflow: hidden;
    }
    #overview .ops-home-panel .card-head,
    #overview .ops-overview-right .ik-home-rank-card-head {
      padding: 12px 14px 0;
    }
    #overview .ops-home-panel .card-body { padding: 12px 14px 14px; }
    #overview .ops-home-panel .card-title,
    #overview .ops-overview-right .ik-home-rank-card-title {
      color: var(--ops-home-ink);
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.01em;
    }
    #overview .ops-home-panel .subtle,
    #overview .ops-overview-right .ik-home-rank-card-head .subtle {
      color: var(--ops-home-muted);
    }
    #overview .ops-home-focus {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 132px;
      gap: 12px;
      padding: 14px;
      border-radius: 16px;
      border: 1px solid #dce7f3;
      background: linear-gradient(180deg, #f1f7fd 0%, #ffffff 100%);
    }
    #overview .ops-home-focus-kicker {
      color: var(--ops-home-muted);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }
    #overview .ops-home-focus-value {
      margin-top: 6px;
      color: var(--ops-home-ink);
      font: 800 28px/1.05 "Bahnschrift", "Microsoft YaHei", sans-serif;
    }
    #overview .ops-home-focus-meta {
      margin-top: 6px;
      color: #586d84;
      font-size: 13px;
      line-height: 1.45;
    }
    #overview .ops-home-focus-rates {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    #overview .ops-home-pill-metric {
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid #e2ecf7;
      background: #fff;
    }
    #overview .ops-home-pill-metric span {
      display: block;
      color: var(--ops-home-muted);
      font-size: 11px;
      line-height: 1.2;
    }
    #overview .ops-home-pill-metric b {
      display: block;
      margin-top: 4px;
      color: var(--ops-home-ink);
      font: 700 16px/1.1 "Bahnschrift", "Microsoft YaHei", sans-serif;
    }
    #overview .ops-home-context-card .ik-wan-switch {
      margin-top: 10px;
      padding: 8px 10px;
      border: 1px solid #e1ebf5;
      border-radius: 12px;
      background: #fff;
    }
    #overview .ops-home-context-card .ik-wan-line-select {
      height: 32px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 700;
    }
    #overview .ops-home-fact-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
    }
    #overview .ops-home-fact {
      min-width: 0;
      padding: 9px 10px;
      border-radius: 12px;
      border: 1px solid #e3edf7;
      background: #fff;
    }
    #overview .ops-home-fact span {
      display: block;
      color: #7a8da2;
      font-size: 11px;
      line-height: 1.2;
    }
    #overview .ops-home-fact strong {
      display: block;
      margin-top: 4px;
      color: #203349;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.4;
      word-break: break-word;
    }
    #overview .ops-home-quick-grid {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
    }
    #overview .ops-home-quick-link {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 8px;
      min-height: 80px;
      padding: 12px 10px;
      border: 1px solid #e1ebf6;
      border-radius: 14px;
      background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%);
      color: #1f3650;
      text-decoration: none;
      transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
    }
    #overview .ops-home-quick-link:hover {
      transform: translateY(-1px);
      border-color: #c5d9ff;
      box-shadow: 0 12px 24px rgba(33, 73, 126, 0.08);
    }
    #overview .ops-home-quick-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: 10px;
      background: #edf5ff;
      box-shadow: inset 0 0 0 1px #d9e8fb;
    }
    #overview .ops-home-quick-link span:last-child {
      color: #1f3650;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.3;
    }
    #overview .ops-home-stream-panel .card-body { padding-top: 10px; }
    #overview .ops-home-stream-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    #overview .ops-home-stream-grid .ik-wan-rate-card {
      padding: 12px 12px 13px;
      border-radius: 14px;
      border: 1px solid #e2ebf6;
      background: #fff;
    }
    #overview .ops-home-stream-grid .ik-wan-rate-title {
      color: var(--ops-home-ink);
      font-size: 12px;
      font-weight: 700;
    }
    #overview .ops-home-stream-grid .ik-wan-rate-value {
      min-width: 122px;
      color: var(--ops-home-ink);
      font: 800 20px/1.05 "Bahnschrift", "Microsoft YaHei", sans-serif;
    }
    #overview .ops-home-stream-grid .ik-wan-rate-value span {
      color: var(--ops-home-muted);
      font-size: 10px;
      font-weight: 500;
    }
    #overview .ops-home-stream-grid .ik-wan-rate-chart { grid-template-columns: minmax(0, 1fr) 70px; }
    #overview .ops-home-stream-grid .ik-wan-rate-svg { height: 164px; }
    #overview .ik-system-load-card .ops-resource-card {
      border-radius: 14px;
      background: #fff;
    }
    #overview .ops-home-line-stack {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }
    #overview .ops-home-line-roster {
      display: grid;
      gap: 8px;
      margin-top: 12px;
    }
    #overview .ops-home-line-card {
      padding: 10px 11px;
      border: 1px solid #e2ebf5;
      border-radius: 13px;
      background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
    }
    #overview .ops-home-line-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
    }
    #overview .ops-home-line-title strong {
      display: block;
      color: var(--ops-home-ink);
      font-size: 13px;
      line-height: 1.15;
    }
    #overview .ops-home-line-title span {
      display: block;
      margin-top: 3px;
      color: var(--ops-home-muted);
      font-size: 11px;
      line-height: 1.3;
    }
    #overview .ops-home-line-badge {
      display: inline-flex;
      align-items: center;
      min-height: 22px;
      padding: 0 9px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }
    #overview .ops-home-line-badge.is-up {
      background: #e9f7ef;
      color: #0f8b4c;
    }
    #overview .ops-home-line-badge.is-down {
      background: #fff1f2;
      color: #c2414c;
    }
    #overview .ops-home-line-progress { margin-top: 8px; }
    #overview .ops-home-line-stats {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin-top: 8px;
    }
    #overview .ops-home-line-stats label {
      display: block;
      color: var(--ops-home-muted);
      font-size: 10px;
      line-height: 1.1;
    }
    #overview .ops-home-line-stats b {
      display: block;
      margin-top: 4px;
      color: #1f3650;
      font-size: 12px;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #overview .ops-home-terminal-summary-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }
    #overview .ops-public-home-side .ops-home-terminal-summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    #overview .ops-home-terminal-kpi {
      min-width: 0;
      padding: 10px 11px;
      border-radius: 13px;
      border: 1px solid #e2ebf6;
      background: #fff;
    }
    #overview .ops-home-terminal-kpi span,
    #overview .ops-home-terminal-kpi em {
      display: block;
      color: var(--ops-home-muted);
      font-size: 11px;
      line-height: 1.2;
      font-style: normal;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #overview .ops-home-terminal-kpi strong {
      display: block;
      margin-top: 5px;
      color: var(--ops-home-ink);
      font: 800 20px/1.08 "Bahnschrift", "Microsoft YaHei", sans-serif;
    }
    #overview .ops-home-terminal-kpi em { margin-top: 4px; }
    #overview .ops-overview-right .ik-home-rank-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      align-items: stretch;
    }
    #overview .ops-public-home-side .ops-resource-grid {
      grid-template-columns: minmax(0, 1fr);
    }
    #overview .ops-public-home-side .ik-home-rank-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 12px;
      align-items: stretch;
    }
    #overview .ops-overview-right .ik-home-rank-card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    #overview .ops-public-home-side .ik-home-rank-card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    #overview .ops-overview-right .ik-home-rank-card .ops-table-wrap {
      height: auto;
      max-height: 356px;
      border: 0;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
      overflow-y: auto;
    }
    #overview .ops-public-home-side .ik-home-rank-card .ops-table-wrap {
      height: auto;
      max-height: 308px;
      border: 0;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
      overflow-y: auto;
    }
    #overview .ops-overview-right .ik-home-rank-card .ops-table thead th {
      top: 0;
      z-index: 2;
      background: #f7fbff;
      box-shadow: 0 1px 0 #e8eff7;
    }
    #overview .ops-public-home-side .ik-home-rank-card .ops-table thead th {
      top: 0;
      z-index: 2;
      background: #f7fbff;
      box-shadow: 0 1px 0 #e8eff7;
    }
    #overview .ops-overview-right .ik-home-rank-card .ops-table td,
    #overview .ops-overview-right .ik-home-rank-card .ops-table th {
      padding-left: 10px;
      padding-right: 10px;
    }
    #overview .ops-public-home-side .ik-home-rank-card .ops-table td,
    #overview .ops-public-home-side .ik-home-rank-card .ops-table th {
      padding-left: 10px;
      padding-right: 10px;
    }
    body[data-wan-tier="single"] #overview .ops-public-home-side .ops-home-terminal-summary-grid,
    body[data-wan-tier="few"] #overview .ops-public-home-side .ops-home-terminal-summary-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    body[data-wan-tier="single"] #overview .ops-public-home-side .ops-resource-grid,
    body[data-wan-tier="few"] #overview .ops-public-home-side .ops-resource-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    body[data-wan-tier="multi"] #overview .ops-public-home-side .ops-resource-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    #overview .public-home-pro {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    #overview .public-home-status-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 0;
    }
    #overview .public-home-grid {
      display: grid;
      grid-template-columns: 432px minmax(0, 1fr);
      gap: 12px;
      align-items: start;
    }
    #overview .public-home-left,
    #overview .public-home-main {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 0;
    }
    #overview .public-home-wan-card .card-body {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding-top: 10px;
    }
    #overview .public-home-hero {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 170px;
      gap: 12px;
      padding: 14px;
      border: 1px solid #dce7f5;
      border-radius: 16px;
      background: linear-gradient(180deg, #f4f9ff 0%, #ffffff 100%);
    }
    #overview .public-home-kicker {
      color: var(--ops-home-muted);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    #overview .public-home-main-value {
      margin-top: 8px;
      color: var(--ops-home-ink);
      font: 800 32px/1.02 "Bahnschrift", "Microsoft YaHei", sans-serif;
      letter-spacing: -0.02em;
    }
    #overview .public-home-main-meta {
      margin-top: 8px;
      color: #597086;
      font-size: 13px;
      line-height: 1.45;
    }
    #overview .public-home-hero-aside {
      display: grid;
      gap: 8px;
      align-content: start;
    }
    #overview .public-home-stat-chip {
      padding: 10px 12px;
      border: 1px solid #e2ebf6;
      border-radius: 13px;
      background: #fff;
    }
    #overview .public-home-stat-chip span {
      display: block;
      color: var(--ops-home-muted);
      font-size: 11px;
      line-height: 1.2;
    }
    #overview .public-home-stat-chip strong {
      display: block;
      margin-top: 5px;
      color: var(--ops-home-ink);
      font: 700 18px/1.1 "Bahnschrift", "Microsoft YaHei", sans-serif;
    }
    #overview .public-home-chip-row {
      gap: 10px;
      margin-top: 0;
    }
    #overview .public-home-chip-row .ops-overview-chip {
      display: inline-grid;
      grid-auto-flow: column;
      grid-auto-columns: max-content;
      align-items: baseline;
      gap: 8px;
      min-height: 38px;
      padding: 8px 13px 9px;
      border-width: 1px;
      border-style: solid;
      border-radius: 999px;
      background: #f4f8fc;
      box-shadow: 0 8px 18px rgba(27, 52, 88, 0.06);
    }
    #overview .public-home-chip-row .ops-overview-chip span {
      color: #6b7a8f;
      font-size: 11px;
      font-weight: 700;
      line-height: 1;
      letter-spacing: 0.01em;
    }
    #overview .public-home-chip-row .ops-overview-chip b {
      color: #233247;
      font-size: 13px;
      font-weight: 800;
      line-height: 1;
    }
    #overview .public-home-chip-row .ops-overview-chip.is-ok {
      border-color: #b7e6c7;
      background: linear-gradient(180deg, #f1fcf5 0%, #e3f8ea 100%);
    }
    #overview .public-home-chip-row .ops-overview-chip.is-ok span {
      color: #4f7d61;
    }
    #overview .public-home-chip-row .ops-overview-chip.is-ok b {
      color: #1d5a31;
    }
    #overview .public-home-chip-row .ops-overview-chip.is-warn {
      border-color: #f3d28c;
      background: linear-gradient(180deg, #fff8eb 0%, #ffefcf 100%);
    }
    #overview .public-home-chip-row .ops-overview-chip.is-warn span {
      color: #8e6a28;
    }
    #overview .public-home-chip-row .ops-overview-chip.is-warn b {
      color: #6c4707;
    }
    #overview .public-home-chip-row .ops-overview-chip.is-muted {
      border-color: #d7e1eb;
      background: linear-gradient(180deg, #f7fafe 0%, #edf3f8 100%);
    }
    #overview .public-home-chip-row .ops-overview-chip.is-muted span {
      color: #708095;
    }
    #overview .public-home-chip-row .ops-overview-chip.is-muted b {
      color: #2d3b4f;
    }
    #overview .public-home-fact-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin-top: 0;
    }
    #overview .public-home-linebars-wrap {
      padding: 10px 12px;
      border: 1px solid #e2ebf6;
      border-radius: 14px;
      background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
    }
    #overview .public-home-block-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 8px;
    }
    #overview .public-home-block-head span {
      color: var(--ops-home-ink);
      font-size: 12px;
      font-weight: 700;
    }
    #overview .public-home-block-head em {
      color: var(--ops-home-muted);
      font-size: 11px;
      font-style: normal;
      text-align: right;
    }
    #overview .public-home-shortcuts-card .card-body {
      padding-top: 10px;
    }
    #overview .public-home-quick-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }
    #overview .public-home-quick-grid .ops-home-quick-link {
      flex-direction: row;
      align-items: center;
      justify-content: flex-start;
      min-height: 60px;
      padding: 10px 12px;
      gap: 10px;
    }
    #overview .public-home-quick-grid .ops-home-quick-link span:last-child {
      font-size: 13px;
      line-height: 1.2;
    }
    #overview .public-home-split-grid {
      display: grid;
      grid-template-columns: minmax(360px, 0.92fr) minmax(0, 1.08fr);
      gap: 12px;
      align-items: start;
    }
    #overview .public-home-terminal-grid {
      gap: 8px;
      margin-bottom: 10px;
    }
    #overview .public-home-terminal-summary {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    #overview .public-home-load-card .ops-resource-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    #overview .public-home-rank-wrap .ik-home-rank-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      align-items: start;
    }
    #overview .public-home-rank-wrap .ik-home-rank-card {
      min-width: 0;
      border: 1px solid var(--ops-home-border);
      border-radius: 16px;
      background: var(--ops-home-surface);
      box-shadow: 0 14px 28px rgba(18, 41, 70, 0.05);
      overflow: hidden;
    }
    #overview .public-home-rank-wrap .ik-home-rank-card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 12px 14px 0;
    }
    #overview .public-home-rank-wrap .ik-home-rank-card .ops-table-wrap {
      height: auto;
      max-height: 340px;
      border: 0;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
      overflow-y: auto;
    }
    #overview .public-home-rank-wrap .ik-home-rank-card .ops-table thead th {
      top: 0;
      z-index: 2;
      background: #f7fbff;
      box-shadow: 0 1px 0 #e8eff7;
    }
    #overview .public-home-rank-wrap .ik-home-rank-card .ops-table td,
    #overview .public-home-rank-wrap .ik-home-rank-card .ops-table th {
      padding-left: 10px;
      padding-right: 10px;
    }
    #overview .public-home-line-matrix-card .card-head {
      padding: 10px 12px 0;
    }
    #overview .public-home-line-matrix-card .card-body {
      padding: 8px 12px 12px;
    }
    #overview .public-home-line-matrix-summary {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 8px;
    }
    #overview .public-home-line-matrix-kpi {
      display: grid;
      gap: 3px;
      padding: 7px 8px 8px;
      border: 1px solid #e6edf7;
      border-radius: 12px;
      background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.8);
    }
    #overview .public-home-line-matrix-kpi span {
      color: #7f8da1;
      font-size: 10px;
      font-weight: 700;
      line-height: 1.1;
      letter-spacing: .02em;
    }
    #overview .public-home-line-matrix-kpi strong {
      color: #253246;
      font: 700 14px/1.1 "Bahnschrift","Microsoft YaHei",sans-serif;
    }
    #overview .public-home-line-matrix-kpi em {
      color: #8a98ad;
      font-size: 10px;
      line-height: 1.25;
      font-style: normal;
    }
    #overview .public-home-line-matrix-card .ops-table-wrap {
      border: 1px solid #e2eaf5;
      border-radius: 12px;
      background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
      box-shadow: inset 0 1px 0 rgba(255,255,255,.75);
    }
    #overview .public-home-line-matrix-card .public-home-line-matrix-table thead th {
      padding: 6px 8px;
      font-size: 10px;
      line-height: 1.08;
      letter-spacing: .015em;
      background: #f7fbff;
    }
    #overview .public-home-line-matrix-card .public-home-line-matrix-table td {
      padding: 6px 8px;
      vertical-align: middle;
    }
    #overview .public-home-line-matrix-card .public-home-line-matrix-table tbody tr:nth-child(even) {
      background: rgba(247, 251, 255, 0.9);
    }
    #overview .public-home-line-matrix-card .public-home-line-matrix-table .tag {
      min-height: 17px;
      padding: 0 6px;
      font-size: 10px;
    }
    #overview .public-home-line-dual {
      display: grid;
      gap: 2px;
      min-width: 0;
    }
    #overview .public-home-line-main {
      color: #253246;
      font-size: 11.5px;
      font-weight: 700;
      line-height: 1.15;
      white-space: nowrap;
    }
    #overview .public-home-line-sub {
      color: #7f8da1;
      font-size: 10px;
      line-height: 1.22;
      white-space: nowrap;
    }
    #overview .public-home-pro {
      gap: 8px;
    }
    #overview .public-home-pro .ops-home-panel,
    #overview .public-home-pro .ik-home-rank-card {
      border-radius: 12px;
      box-shadow: 0 6px 14px rgba(18, 41, 70, 0.035);
    }
    #overview .public-home-pro .ops-home-panel .card-head,
    #overview .public-home-pro .ik-home-rank-card-head {
      padding: 8px 10px 0;
    }
    #overview .public-home-pro .ops-home-panel .card-body {
      padding: 8px 10px 10px;
    }
    #overview .public-home-pro .ops-home-panel .card-title,
    #overview .public-home-pro .ik-home-rank-card-title {
      font-size: 13px;
    }
    #overview .public-home-pro .ops-home-panel .subtle,
    #overview .public-home-pro .ik-home-rank-card-head .subtle {
      font-size: 10.5px;
      line-height: 1.25;
    }
    #overview .public-home-status-grid {
      gap: 8px;
    }
    #overview .public-home-status-grid .ik-home-status-tile {
      padding: 7px 9px;
      border-radius: 10px;
      box-shadow: none;
    }
    #overview .public-home-status-grid .status-k {
      font-size: 10px;
      line-height: 1.1;
    }
    #overview .public-home-status-grid .status-v {
      margin-top: 3px;
      font-size: 17px;
      line-height: 1.02;
    }
    #overview .public-home-status-grid em {
      margin-top: 3px;
      font-size: 10px;
      line-height: 1.2;
    }
    #overview .public-home-grid {
      grid-template-columns: 408px minmax(0, 1fr);
      gap: 8px;
    }
    #overview .public-home-left,
    #overview .public-home-main,
    #overview .public-home-split-grid,
    #overview .public-home-rank-wrap .ik-home-rank-grid {
      gap: 8px;
    }
    #overview .public-home-wan-card .card-body {
      gap: 8px;
      padding-top: 8px;
    }
    #overview .public-home-hero {
      grid-template-columns: minmax(0, 1fr) 144px;
      gap: 8px;
      padding: 10px;
      border-radius: 12px;
    }
    #overview .public-home-kicker {
      font-size: 10px;
      letter-spacing: 0.09em;
    }
    #overview .public-home-main-value {
      margin-top: 4px;
      font-size: 26px;
      line-height: 1;
    }
    #overview .public-home-main-meta {
      margin-top: 5px;
      font-size: 11px;
      line-height: 1.35;
    }
    #overview .public-home-hero-aside {
      gap: 6px;
    }
    #overview .public-home-stat-chip {
      padding: 7px 8px;
      border-radius: 10px;
    }
    #overview .public-home-stat-chip span {
      font-size: 10px;
    }
    #overview .public-home-stat-chip strong {
      margin-top: 3px;
      font-size: 14px;
    }
    #overview .public-home-chip-row {
      gap: 6px;
    }
    #overview .public-home-chip-row .ops-overview-chip {
      gap: 6px;
      min-height: 30px;
      padding: 5px 10px 6px;
      box-shadow: none;
    }
    #overview .public-home-chip-row .ops-overview-chip span {
      font-size: 10px;
    }
    #overview .public-home-chip-row .ops-overview-chip b {
      font-size: 12px;
    }
    #overview .ops-home-context-card .ik-wan-switch {
      margin-top: 8px;
      padding: 6px 8px;
      border-radius: 10px;
    }
    #overview .ops-home-context-card .ik-wan-line-select {
      height: 28px;
      border-radius: 8px;
      font-size: 11px;
    }
    #overview .public-home-fact-grid {
      gap: 6px;
    }
    #overview .public-home-fact-grid .ops-home-fact {
      padding: 7px 8px;
      border-radius: 10px;
    }
    #overview .public-home-fact-grid .ops-home-fact span {
      font-size: 10px;
    }
    #overview .public-home-fact-grid .ops-home-fact strong {
      margin-top: 3px;
      font-size: 12px;
      line-height: 1.25;
    }
    #overview .public-home-linebars-wrap {
      padding: 8px 9px;
      border-radius: 11px;
    }
    #overview .public-home-block-head {
      margin-bottom: 6px;
    }
    #overview .public-home-block-head span {
      font-size: 11px;
    }
    #overview .public-home-block-head em {
      font-size: 10px;
    }
    #overview .public-home-shortcuts-card .card-body {
      padding-top: 8px;
    }
    #overview .public-home-quick-grid {
      gap: 6px;
    }
    #overview .public-home-quick-grid .ops-home-quick-link {
      min-height: 48px;
      padding: 7px 9px;
      gap: 8px;
      border-radius: 10px;
      box-shadow: none;
    }
    #overview .public-home-quick-grid .ops-home-quick-link span:last-child {
      font-size: 12px;
    }
    #overview .public-home-quick-grid .ops-home-quick-icon {
      width: 24px;
      height: 24px;
      border-radius: 8px;
    }
    #overview .ops-home-stream-panel .card-body {
      padding-top: 8px;
    }
    #overview .ops-home-stream-grid {
      gap: 8px;
    }
    #overview .ops-home-stream-grid .ik-wan-rate-card {
      padding: 9px 10px 10px;
      border-radius: 11px;
    }
    #overview .ops-home-stream-grid .ik-wan-rate-head {
      margin-bottom: 4px;
    }
    #overview .ops-home-stream-grid .ik-wan-rate-title {
      font-size: 11px;
    }
    #overview .ops-home-stream-grid .ik-wan-rate-value {
      min-width: 106px;
      font-size: 17px;
    }
    #overview .ops-home-stream-grid .ik-wan-rate-chart {
      grid-template-columns: minmax(0, 1fr) 58px;
      gap: 6px;
    }
    #overview .ops-home-stream-grid .ik-wan-rate-svg {
      height: 132px;
    }
    #overview .public-home-terminal-grid {
      gap: 6px;
      margin-bottom: 6px;
    }
    #overview .public-home-terminal-grid .ik-home-terminal-tile {
      min-height: 52px;
      padding: 7px 8px;
      border-radius: 10px;
    }
    #overview .public-home-terminal-grid .ik-home-terminal-tile span {
      font-size: 10px;
    }
    #overview .public-home-terminal-grid .ik-home-terminal-tile b {
      margin-top: 4px;
      font-size: 18px;
    }
    #overview .public-home-terminal-summary {
      gap: 6px;
    }
    #overview .public-home-terminal-summary .ops-home-terminal-kpi {
      padding: 7px 8px;
      border-radius: 10px;
    }
    #overview .public-home-terminal-summary .ops-home-terminal-kpi span,
    #overview .public-home-terminal-summary .ops-home-terminal-kpi em {
      font-size: 10px;
    }
    #overview .public-home-terminal-summary .ops-home-terminal-kpi strong {
      margin-top: 3px;
      font-size: 16px;
    }
    #overview .public-home-load-card .ops-resource-grid {
      gap: 8px;
    }
    #overview .public-home-load-card .ops-resource-card {
      padding: 7px 8px 8px;
      border-radius: 10px;
    }
    #overview .public-home-load-card .ops-resource-plot,
    #overview .public-home-load-card .ops-resource-svg {
      height: 76px;
    }
    #overview .public-home-rank-wrap .ik-home-rank-card-head {
      padding: 8px 10px 0;
    }
    #overview .public-home-rank-wrap .ik-home-rank-card .ops-table-wrap {
      max-height: 300px;
    }
    #overview .public-home-rank-wrap .ik-home-rank-card .ops-table td,
    #overview .public-home-rank-wrap .ik-home-rank-card .ops-table th {
      padding-left: 8px;
      padding-right: 8px;
    }
    #overview .public-home-line-matrix-card .card-head {
      padding: 8px 10px 0;
    }
    #overview .public-home-line-matrix-card .card-body {
      padding: 6px 10px 10px;
    }
    #overview .public-home-line-matrix-summary {
      gap: 6px;
      margin-bottom: 6px;
    }
    #overview .public-home-line-matrix-kpi {
      gap: 2px;
      padding: 6px 7px 7px;
      border-radius: 10px;
      box-shadow: none;
    }
    #overview .public-home-line-matrix-kpi span,
    #overview .public-home-line-matrix-kpi em {
      font-size: 10px;
      line-height: 1.15;
    }
    #overview .public-home-line-matrix-kpi strong {
      font-size: 12px;
      line-height: 1.08;
    }
    #overview .public-home-line-matrix-card .public-home-line-matrix-table thead th {
      padding: 5px 7px;
    }
    #overview .public-home-line-matrix-card .public-home-line-matrix-table td {
      padding: 5px 7px;
    }
    #overview .public-home-line-dual {
      gap: 1px;
    }
    #overview .public-home-line-main {
      font-size: 11px;
    }
    #overview .public-home-line-sub {
      font-size: 9.5px;
      line-height: 1.16;
    }
    #trafficLoad .ops-workbench-grid,
    #trafficLoad .ops-double,
    #trafficLoad .ops-split,
    #trafficAudit .ops-double,
    #arp .ops-double {
      grid-template-columns: minmax(0, 1fr) !important;
    }
    #trafficLoad .ops-workbench-side {
      min-width: 0;
    }
  `;
  document.head.appendChild(whitespaceStyle);

  function forceHidePageSubtitle() {
    document.querySelectorAll('.page-subtitle').forEach((node) => {
      if (node.textContent) node.textContent = '';
      node.classList.add('is-hidden');
      if (!node.hasAttribute('hidden')) node.setAttribute('hidden', '');
      if (node.getAttribute('aria-hidden') !== 'true') node.setAttribute('aria-hidden', 'true');
    });
  }

  forceHidePageSubtitle();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', forceHidePageSubtitle, { once: true });
  }

  function opsCard(title, subtle, body, className = '') {
    const classes = ['card', className].filter(Boolean).join(' ');
    return `<div class="${classes}"><div class="card-head"><div class="card-title">${title}</div><div class="subtle">${subtle || ''}</div></div><div class="card-body">${body}</div></div>`;
  }

  function opsInfoCard(title, subtle, items, className = '') {
    return opsCard(title, subtle, infoGrid(items), `ops-info-card ${className}`.trim());
  }

  function opsTableCard(title, subtle, headers, rows, emptyText, className = '') {
    return opsCard(title, subtle, table(headers, rows, emptyText), `ops-density-table ${className}`.trim());
  }

  function opsDenseTable(headers, rows, emptyText, className = '') {
    const body = Array.isArray(rows) ? rows.join('') : String(rows || '');
    if (!body.trim()) return emptyBlock(emptyText);
    const tableClass = ['ops-table', className].filter(Boolean).join(' ');
    return `<div class="ops-table-wrap"><table class="${tableClass}"><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function opsDenseTableCard(title, subtle, headers, rows, emptyText, className = '', tableClass = '') {
    return opsCard(title, subtle, opsDenseTable(headers, rows, emptyText, tableClass), `ops-density-table ${className}`.trim());
  }

  function opsBarStack(rows, options = {}) {
    if (!rows.length) return emptyBlock(options.emptyText || '暂无可展示数据');
    const max = Math.max(...rows.map((row) => Number(row.value || 0)), 1);
    return `<div class="ops-bar-stack">${rows.map((row) => {
      const raw = Number(row.value || 0);
      const percent = options.percentMode ? raw : (raw / max) * 100;
      return `<div class="line-bar"><div class="line-name">${escapeHtml(row.label)}</div>${progress(percent, options.color)}<div class="line-share">${row.display || fmtNumber(raw)}</div></div>`;
    }).join('')}</div>`;
  }

  function opsPercentMiniChart(values = [], color = '#165dff') {
    const width = 360;
    const height = 96;
    const padX = 8;
    const padY = 8;
    const points = (values || []).map((value) => Number(value || 0));
    const chartHeight = height - padY * 2;
    const grid = [100, 50, 0].map((mark) => {
      const y = padY + ((100 - mark) / 100) * chartHeight;
      return `<line x1="${padX}" y1="${y}" x2="${width - padX}" y2="${y}" stroke="rgba(22,93,255,0.09)" stroke-width="1"/>`;
    }).join('');
    if (!points.length) return `<svg class="ops-resource-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">${grid}</svg>`;
    const step = points.length > 1 ? (width - padX * 2) / (points.length - 1) : 0;
    const polyline = points.map((value, index) => {
      const clamped = Math.max(0, Math.min(100, Number(value || 0)));
      const x = padX + step * index;
      const y = padY + ((100 - clamped) / 100) * chartHeight;
      return `${x},${y}`;
    }).join(' ');
    return `<svg class="ops-resource-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">${grid}<polyline fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" points="${polyline}"/></svg>`;
  }

  function opsResourceTrendCard(title, currentValue, values, color, meta) {
    const hasValues = Array.isArray(values) && values.length > 0;
    return `
      <div class="ops-resource-card" style="--resource-color:${color}">
        <div class="ops-resource-head">
          <div class="ops-resource-title"><span class="ops-resource-dot"></span><span>${escapeHtml(title)}</span></div>
          <div>
            <div class="ops-resource-value">${escapeHtml(String(currentValue || '-'))}</div>
            <div class="ops-resource-meta">${escapeHtml(String(meta || '-'))}</div>
          </div>
        </div>
        ${hasValues ? `
          <div class="ops-axis-chart">
            <div class="ops-axis-labels"><span>100%</span><span>50%</span><span>0%</span></div>
            <div class="ops-resource-plot">${opsPercentMiniChart(values, color)}</div>
          </div>` : emptyBlock(`${title} 当前未读取到历史采样`)}
      </div>`;
  }

  function opsStatTiles(items, emptyText = '暂无可展示数据') {
    if (!items.length) return emptyBlock(emptyText);
    return `<div class="ops-stat-grid">${items.map((item) => `
      <div class="ops-stat-tile">
        <div class="ops-stat-label">${escapeHtml(item.label)}</div>
        <div class="ops-stat-value">${item.value || '-'}</div>
        ${item.meta ? `<div class="ops-stat-meta">${item.meta}</div>` : ''}
      </div>`).join('')}</div>`;
  }

  function opsKpiStrip(items = []) {
    if (!items.length) return '';
    return `<div class="ops-kpi-strip">${items.map((item) => `
      <div class="ops-kpi-tile">
        <div class="ops-kpi-label">${escapeHtml(item.label || '-')}</div>
        <div class="ops-kpi-value">${item.value || '-'}</div>
        ${item.meta ? `<div class="ops-kpi-meta">${item.meta}</div>` : ''}
      </div>`).join('')}</div>`;
  }

  function opsSignalList(items = [], emptyText = '暂无可展示数据') {
    if (!items.length) return emptyBlock(emptyText);
    return `<div class="ops-signal-list">${items.map((item) => `
      <div class="ops-signal-row">
        <div class="ops-signal-main">
          <div class="ops-signal-label">${escapeHtml(item.label || '-')}</div>
          ${item.meta ? `<div class="ops-signal-meta">${item.meta}</div>` : ''}
        </div>
        <div class="ops-signal-side">
          ${item.tag ? `<div class="ops-signal-tag">${item.tag}</div>` : ''}
          <div class="ops-signal-value">${item.value || '-'}</div>
          ${item.hint ? `<div class="ops-signal-hint">${item.hint}</div>` : ''}
        </div>
      </div>`).join('')}</div>`;
  }

  function sortCountEntries(mapObject) {
    return Object.entries(mapObject).sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0));
  }

  function opsTwoLineCell(main, sub = '') {
    return `<div class="ops-inline-dual"><div class="ops-inline-main">${main || '-'}</div>${sub ? `<div class="ops-inline-sub">${sub}</div>` : ''}</div>`;
  }

  function splitIpFamilies(values = []) {
    return (values || []).reduce((acc, value) => {
      const text = String(value || '').trim();
      if (!text) return acc;
      if (text.includes(':')) acc.ipv6.push(text);
      else acc.ipv4.push(text);
      return acc;
    }, { ipv4: [], ipv6: [] });
  }

  function compactListHtml(values = [], limit = 2) {
    const items = (values || []).map((value) => String(value || '').trim()).filter(Boolean);
    if (!items.length) return '-';
    const shown = items.slice(0, limit).map((item) => escapeHtml(item)).join('<br>');
    if (items.length <= limit) return shown;
    return `${shown}<br><span class="ops-inline-sub">+${fmtNumber(items.length - limit)} 项</span>`;
  }

  function addressCell(values = []) {
    const families = splitIpFamilies(values);
    const primary = families.ipv4[0] || families.ipv6[0] || '-';
    const total = families.ipv4.length + families.ipv6.length;
    let secondary = '';
    if (families.ipv4.length && families.ipv6.length) secondary = families.ipv6[0];
    else if (total > 1) secondary = `共 ${fmtNumber(total)} 个地址`;
    return opsTwoLineCell(escapeHtml(primary), secondary ? escapeHtml(secondary) : '');
  }

  function gatewayCell(values = []) {
    const items = (values || []).map((value) => String(value || '').trim()).filter(Boolean);
    if (!items.length) return opsTwoLineCell('-', '');
    const primary = items[0];
    const secondary = items.length > 1 ? `共 ${fmtNumber(items.length)} 条目标` : '';
    return opsTwoLineCell(escapeHtml(primary), secondary ? escapeHtml(secondary) : '');
  }

  function packetSummaryCell(dropValue, errorValue) {
    return opsTwoLineCell(`丢 ${fmtNumber(dropValue)}`, `错 ${fmtNumber(errorValue)}`);
  }

  function routeSummaryCell(routes = []) {
    const activeRoutes = (routes || []).filter((route) => route && route.active);
    if (!activeRoutes.length) return opsTwoLineCell('未检测到活动默认', '');
    const primary = `${activeRoutes[0].table || '-'} / distance ${activeRoutes[0].distance || '-'}`;
    const secondary = activeRoutes.length > 1 ? `共 ${fmtNumber(activeRoutes.length)} 条活动路由` : (activeRoutes[0].comment || '');
    return opsTwoLineCell(escapeHtml(primary), secondary ? escapeHtml(secondary) : '');
  }

  function statusTag(running, disabled = false) {
    if (disabled) return tag('停用', 'warn');
    return running ? tag('在线', 'ok') : tag('离线', 'danger');
  }

  function yesNoTag(value, yesText = '是', noText = '否') {
    return value ? tag(yesText, 'ok') : tag(noText, 'warn');
  }

  function routeRoleFor(activeRoutes = [], allRoutes = []) {
    const activeTables = activeRoutes.map((route) => String(route.table || '-').trim() || '-');
    const hasMain = activeTables.some((table) => table.toLowerCase() === 'main');
    const hasPolicy = activeTables.some((table) => table.toLowerCase() !== 'main');
    if (hasMain && hasPolicy) return { label: '全局+策略', level: 'ok' };
    if (hasMain) return { label: '全局出口', level: 'ok' };
    if (hasPolicy) return { label: '策略出口', level: 'info' };
    if ((allRoutes || []).length) return { label: '备选未激活', level: 'warn' };
    return { label: '无默认路由', level: 'danger' };
  }

  function buildLineDiagnostic(row, interfaceByName = {}) {
    const parent = interfaceByName[row.parent] || {};
    const allRoutes = row.routes || [];
    const activeRoutes = allRoutes.filter((route) => route && route.active);
    const hasAddress = (row.addresses || []).length > 0;
    const hasActiveRoute = activeRoutes.length > 0;
    const dropTotal = Number(parent.txDrop || 0) + Number(parent.rxDrop || 0);
    const errorTotal = Number(parent.txError || 0) + Number(parent.rxError || 0);
    const role = routeRoleFor(activeRoutes, allRoutes);
    const activeTables = activeRoutes.map((route) => String(route.table || '-').trim() || '-');
    const distances = activeRoutes.map((route) => String(route.distance || '-').trim() || '-');
    const blockers = [];
    const observations = [];
    let score = 100;

    if (!row.running) {
      blockers.push('拨号离线');
      score -= 45;
    }
    if (!hasAddress) {
      blockers.push('未拿到地址');
      score -= 25;
    }
    if (!hasActiveRoute) {
      blockers.push('无活动默认路由');
      score -= 35;
    }
    if (errorTotal > 0) {
      blockers.push('父接口错误');
      score -= 25;
    }
    if (dropTotal > 0) {
      observations.push('父接口累计丢包');
      score -= 5;
    }

    score = Math.max(0, Math.min(100, score));
    const level = blockers.some((item) => ['拨号离线', '无活动默认路由'].includes(item))
      ? 'danger'
      : blockers.length
        ? 'warn'
        : score >= 90
          ? 'ok'
          : 'warn';
    const stateLabel = level === 'danger' ? '故障' : level === 'warn' ? '注意' : '正常';
    const reasonList = blockers.concat(observations);
    const action = !row.running
      ? '检查拨号链路'
      : !hasAddress
        ? '检查地址获取'
        : !hasActiveRoute
          ? '检查默认路由'
          : errorTotal > 0
            ? '检查父接口错误'
            : '保持观察';

    return {
      row,
      parent,
      activeRoutes,
      allRoutes,
      role,
      level,
      stateLabel,
      score,
      blockers,
      observations,
      reasonList,
      action,
      hasAddress,
      hasActiveRoute,
      dropTotal,
      errorTotal,
      activeTables,
      distances
    };
  }

  function lineDiagnosticRank(item) {
    const levelRank = item.level === 'danger' ? 0 : item.level === 'warn' ? 1 : 2;
    return levelRank * 1000 + (100 - item.score);
  }

  function diagnosticReasonCell(item) {
    if (!item.reasonList.length) return opsTwoLineCell('关键闭环正常', '');
    const primary = item.blockers.length ? item.blockers.join(' / ') : '关键闭环正常';
    const secondary = item.observations.length ? item.observations.join(' / ') : '';
    return opsTwoLineCell(escapeHtml(primary), secondary ? escapeHtml(secondary) : '');
  }

  const OPS_FIXED_PPPOE_LINE_ORDER = ['pppoe-out10', 'pppoe-out20', 'pppoe-out30', 'pppoe-out40', 'pppoe-out50', 'pppoe-out60', 'pppoe-out70', 'pppoe-out80'];
  const OPS_FIXED_PPPOE_LINE_ORDER_MAP = new Map(OPS_FIXED_PPPOE_LINE_ORDER.map((name, index) => [name, index]));

  function opsGetPppoeDisplayOrder(name) {
    const normalized = String(name || '').trim().toLowerCase();
    if (OPS_FIXED_PPPOE_LINE_ORDER_MAP.has(normalized)) {
      return OPS_FIXED_PPPOE_LINE_ORDER_MAP.get(normalized);
    }
    const suffixMatch = normalized.match(/pppoe-out(\d+)$/i);
    return suffixMatch ? OPS_FIXED_PPPOE_LINE_ORDER.length + Number(suffixMatch[1]) : Number.POSITIVE_INFINITY;
  }

  function opsSortPppoeNamedRows(rows) {
    if (typeof sortPppoeNamedRows === 'function') return sortPppoeNamedRows(rows);
    return (rows || []).slice().sort((a, b) => {
      const orderA = opsGetPppoeDisplayOrder(a?.name);
      const orderB = opsGetPppoeDisplayOrder(b?.name);
      if (orderA !== orderB) return orderA - orderB;
      return String(a?.name || '').localeCompare(String(b?.name || ''), 'zh-CN', { numeric: true, sensitivity: 'base' });
    });
  }

  renderInterfaces = function patchedRenderInterfaces(snapshot) {
    currentInterfaceView = normalizeInterfaceView(currentInterfaceView);
    const interfaces = snapshot.interfaces || [];
    const rawPppoe = snapshot.pppoe || [];
    const pppoe = opsSortPppoeNamedRows(rawPppoe);
    const loadBalance = snapshot.loadBalance || {};
    const interfaceByName = Object.fromEntries(interfaces.map((row) => [row.name, row]));
    const virtualTypes = new Set(['wg', 'loopback', 'l2tp-out', 'vlan', 'macvlan']);
    const runningInterfaces = interfaces.filter((row) => row.running).length;
    const runningWan = pppoe.filter((row) => row.running).length;
    const runningLan = interfaces.filter((row) => row.role === 'LAN' && row.running).length;
    const virtualCount = interfaces.filter((row) => virtualTypes.has(String(row.type || '').toLowerCase())).length;
    const detectedHealthy = pppoe.filter((row) => row.running && row.addresses?.length && (row.routes || []).some((route) => route.active)).length;
    const abnormalLines = pppoe.filter((row) => {
      const parent = interfaceByName[row.parent] || {};
      const issueCount = Number(parent.rxDrop || 0) + Number(parent.txDrop || 0) + Number(parent.rxError || 0) + Number(parent.txError || 0);
      return !row.running || !row.addresses?.length || issueCount > 0 || !(row.routes || []).some((route) => route.active);
    }).length;
    const ipv6Interfaces = interfaces.filter((row) => (row.ips || []).some((ip) => String(ip).includes(':')));
    const sortedPppoe = pppoe;
    const busiestPppoe = rawPppoe.slice().sort((a, b) => totalTrafficRate(b) - totalTrafficRate(a));
    const sortedInterfaces = interfaces.slice().sort((a, b) => totalTrafficRate(b, 'txRate', 'rxRate') - totalTrafficRate(a, 'txRate', 'rxRate'));
    const lineTrendRows = getLineTrendRows(pppoe);
    const busiestLine = busiestPppoe[0];
    const totalWanUp = pppoe.reduce((sum, row) => sum + Number(row.upRate || 0), 0);
    const totalWanDown = pppoe.reduce((sum, row) => sum + Number(row.downRate || 0), 0);
    const readonlyNotice = interfaceReadonlyOpen
      ? `<div class="notice" style="margin-bottom:12px">当前页面保持只读监控模式，按钮只用于切换视图或刷新当前页，不会提交任何配置变更。</div>`
      : '';
    const tabs = `
      <div class="ik-subtabs">
        <button class="ik-subtab ${currentInterfaceView === 'monitor' ? 'is-active' : ''}" type="button" data-interface-view="monitor">线路监控</button>
        <button class="ik-subtab ${currentInterfaceView === 'detect' ? 'is-active' : ''}" type="button" data-interface-view="detect">线路状态检测</button>
        <button class="ik-subtab ${currentInterfaceView === 'ipv6' ? 'is-active' : ''}" type="button" data-interface-view="ipv6">IPv6 线路详情</button>
      </div>`;
    const toolbar = `
      <div class="ik-data-toolbar">
        <div class="ik-ghost-group">
          <span class="ik-ghost-pill is-active">${escapeHtml(interfaceViews[currentInterfaceView].title)}</span>
          <button class="ik-ghost-pill" type="button" data-interface-refresh="current">刷新当前页数据</button>
        </div>
        <div class="ik-ghost-group">
          <button class="ik-ghost-pill ${interfaceReadonlyOpen ? 'is-active' : ''}" type="button" data-interface-readonly-toggle="true">只读监控</button>
        </div>
      </div>`;
    const loadDistributionRows = opsSortPppoeNamedRows(loadBalance.distribution || []).map((row) => ({
      label: row.name,
      value: Number(row.share || 0),
      display: `${Number(row.share || 0).toFixed(1)}%`
    }));
    const realtimeLoadRows = sortedPppoe.slice(0, 8).map((row) => ({
      label: row.name,
      value: Math.max(1, totalTrafficRate(row)),
      display: fmtRate(totalTrafficRate(row))
    }));
    const loadDistributionBlock = loadDistributionRows.length
      ? opsBarStack(loadDistributionRows, { percentMode: true, emptyText: '当前未形成线路占比数据' })
      : opsBarStack(realtimeLoadRows, { emptyText: '当前未形成线路实时负载分布' });
    const lineRows = sortedPppoe.map((row) => {
      const activeRoutes = (row.routes || []).filter((route) => route.active);
      return `
        <tr>
          <td>${escapeHtml(row.name)}</td>
          <td>${statusTag(row.running)}</td>
          <td>${opsTwoLineCell(escapeHtml(row.parent || '-'), activeRoutes.length ? escapeHtml(`${activeRoutes[0].table || '-'} / distance ${activeRoutes[0].distance || '-'}`) : '无活动默认')}</td>
          <td>${addressCell(row.addresses || [])}</td>
          <td>${fmtRate(row.upRate)}</td>
          <td>${fmtRate(row.downRate)}</td>
          <td>${fmtBytes(row.txBytes)}</td>
          <td>${fmtBytes(row.rxBytes)}</td>
          <td>${escapeHtml(row.status || (row.running ? '在线' : '离线'))}</td>
        </tr>`;
    });
    const ifaceRows = sortedInterfaces.map((row) => `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${tag(row.role || '-', row.role === 'WAN' ? 'info' : 'ok')}</td>
        <td>${statusTag(row.running, row.disabled)}</td>
        <td>${addressCell(row.ips || [])}</td>
        <td>${fmtRate(row.txRate)}</td>
        <td>${fmtRate(row.rxRate)}</td>
        <td>${fmtBytes(row.txBytes)}</td>
        <td>${fmtBytes(row.rxBytes)}</td>
        <td>${opsTwoLineCell(escapeHtml(row.mac || '-'), `丢 ${fmtNumber(Number(row.txDrop || 0) + Number(row.rxDrop || 0))} / 错 ${fmtNumber(Number(row.txError || 0) + Number(row.rxError || 0))}`)}</td>
      </tr>`);
    const detectRows = sortedPppoe.map((row) => {
      const parent = interfaceByName[row.parent] || {};
      const dropTotal = Number(parent.txDrop || 0) + Number(parent.rxDrop || 0);
      const errorTotal = Number(parent.txError || 0) + Number(parent.rxError || 0);
      return `
        <tr>
          <td>${escapeHtml(row.name)}</td>
          <td>${statusTag(row.running)}</td>
          <td>${row.addresses?.length ? tag('已分配', 'ok') : tag('未分配', 'warn')}</td>
          <td>${opsTwoLineCell(
            escapeHtml(row.parent || '-'),
            ((row.routes || []).filter((route) => route && route.active).length
              ? escapeHtml(`${(row.routes || []).filter((route) => route && route.active)[0].table || '-'} / distance ${(row.routes || []).filter((route) => route && route.active)[0].distance || '-'}`)
              : '无活动默认')
          )}</td>
          <td>${fmtRate(row.upRate)}</td>
          <td>${fmtRate(row.downRate)}</td>
          <td>${packetSummaryCell(dropTotal, errorTotal)}</td>
        </tr>`;
    });
    const ipv6Rows = ipv6Interfaces
      .slice()
      .sort((a, b) => totalTrafficRate(b, 'txRate', 'rxRate') - totalTrafficRate(a, 'txRate', 'rxRate'))
      .map((row) => {
        const ipv6Addresses = splitIpFamilies(row.ips || []).ipv6;
        return `
          <tr>
            <td>${escapeHtml(row.name)}</td>
            <td>${tag(row.role || '-', row.role === 'WAN' ? 'info' : 'ok')}</td>
            <td>${statusTag(row.running, row.disabled)}</td>
            <td>${addressCell(ipv6Addresses)}</td>
            <td>${gatewayCell((row.gateways || []).filter((value) => String(value || '').includes(':')))}</td>
            <td>${fmtRate(row.txRate)}</td>
            <td>${fmtRate(row.rxRate)}</td>
          </tr>`;
      });
    let body = '';
    if (currentInterfaceView === 'detect') {
      body = `
        ${readonlyNotice}
        ${toolbar}
        <div class="grid-4" style="margin-top:12px">
          ${metricCard('在线宽带', fmtNumber(runningWan), `总线路 ${fmtNumber(pppoe.length)} 条`, '')}
          ${metricCard('健康线路', fmtNumber(detectedHealthy), '同时满足在线 / 有地址 / 有活动默认路由', '')}
          ${metricCard('异常线路', fmtNumber(abnormalLines), '离线、未分配或父接口有异常', '')}
          ${metricCard('IPv6 接口', fmtNumber(ipv6Interfaces.length), '当前可读取到 IPv6 地址的接口', '')}
        </div>
        <div class="ops-page-stack" style="margin-top:12px">
          ${opsCard('检测摘要', '当前页聚焦线路健康和异常定位', opsStatTiles([
            { label: '有地址宽带', value: fmtNumber(pppoe.filter((row) => (row.addresses || []).length).length), meta: '已拿到拨号地址' },
            { label: '活动默认', value: fmtNumber(pppoe.filter((row) => (row.routes || []).some((route) => route.active)).length), meta: '存在活动默认路由' },
            { label: '父接口异常', value: fmtNumber(pppoe.filter((row) => {
              const parent = interfaceByName[row.parent] || {};
              return Number(parent.txDrop || 0) + Number(parent.rxDrop || 0) + Number(parent.txError || 0) + Number(parent.rxError || 0) > 0;
            }).length), meta: '丢包或错误非 0' },
            { label: '离线线路', value: fmtNumber(pppoe.filter((row) => !row.running).length), meta: '拨号状态未就绪' }
          ]), 'ops-info-card')}
          ${opsDenseTableCard('线路状态检测', `${fmtNumber(sortedPppoe.length)} 条线路`, ['线路', '拨号状态', '地址状态', '父接口 / 活动路由', '实时上行速率', '实时下行速率', '丢包 / 错误'], detectRows, '当前未读取到线路状态检测数据')}
          ${opsCard('8 条线路速率趋势', `${fmtNumber(lineTrendRows.length)} 条线路同步展示`, renderLineTrendGrid(lineTrendRows, { emptyText: '当前未采集到可展示的线路趋势' }), 'ops-info-card')}
        </div>`;
    } else if (currentInterfaceView === 'ipv6') {
      body = `
        ${readonlyNotice}
        ${toolbar}
        <div class="grid-4" style="margin-top:12px">
          ${metricCard('IPv6 接口', fmtNumber(ipv6Interfaces.length), '当前有真实 IPv6 地址的接口', '')}
          ${metricCard('在线 IPv6 接口', fmtNumber(ipv6Interfaces.filter((row) => row.running).length), '接口链路状态', '')}
          ${metricCard('WAN IPv6 线路', fmtNumber(pppoe.filter((row) => splitIpFamilies(row.addresses || []).ipv6.length).length), '带前缀或链路本地地址', '')}
          ${metricCard('IPv6 网关接口', fmtNumber(ipv6Interfaces.filter((row) => (row.gateways || []).some((value) => String(value || '').includes(':'))).length), '可读到 IPv6 目标', '')}
        </div>
        <div class="ops-page-stack" style="margin-top:12px">
          ${opsCard('IPv6 摘要', '聚焦接口、地址和 IPv6 路由目标', opsStatTiles([
            { label: 'LAN IPv6 接口', value: fmtNumber(ipv6Interfaces.filter((row) => row.role === 'LAN').length), meta: '桥接 / VLAN / 虚拟接口' },
            { label: 'WAN IPv6 接口', value: fmtNumber(ipv6Interfaces.filter((row) => row.role === 'WAN').length), meta: '拨号侧接口' },
            { label: '有 IPv6 网关', value: fmtNumber(ipv6Interfaces.filter((row) => (row.gateways || []).some((value) => String(value || '').includes(':'))).length), meta: '可见 IPv6 路由目标' },
            { label: '有流量接口', value: fmtNumber(ipv6Interfaces.filter((row) => totalTrafficRate(row, 'txRate', 'rxRate') > 0).length), meta: '当前存在吞吐' }
          ]), 'ops-info-card')}
          ${opsDenseTableCard('IPv6 接口明细', `${fmtNumber(ipv6Interfaces.length)} 个接口`, ['接口', '角色', '状态', 'IPv6 地址', '网关 / 路由目标', '实时上行速率', '实时下行速率'], ipv6Rows, '当前未读取到 IPv6 接口数据')}
        </div>`;
    } else {
      body = `
        ${readonlyNotice}
        ${toolbar}
        <div class="grid-4" style="margin-top:12px">
          ${metricCard('在线接口', `${fmtNumber(runningInterfaces)} / ${fmtNumber(interfaces.length)}`, '所有接口运行状态', '')}
          ${metricCard('在线宽带', `${fmtNumber(runningWan)} / ${fmtNumber(pppoe.length)}`, 'PPPoE 线路就绪情况', '')}
          ${metricCard('健康宽带', fmtNumber(detectedHealthy), '在线且拥有地址与活动默认路由', '')}
          ${metricCard('异常线路', fmtNumber(abnormalLines), '需要优先排查的线路', '')}
        </div>
        <div class="ops-page-stack" style="margin-top:12px">
          ${opsCard('接口运行摘要', '先看整体，再看宽带和接口明细', opsStatTiles([
            { label: 'WAN 总上行', value: fmtRate(totalWanUp), meta: `${fmtNumber(pppoe.length)} 条宽带聚合` },
            { label: 'WAN 总下行', value: fmtRate(totalWanDown), meta: busiestLine ? `当前主线 ${escapeHtml(busiestLine.name)}` : '暂无主线' },
            { label: '在线 LAN', value: fmtNumber(runningLan), meta: `LAN 总数 ${fmtNumber(interfaces.filter((row) => row.role === 'LAN').length)}` },
            { label: '虚拟接口', value: fmtNumber(virtualCount), meta: 'VLAN / WG / Loopback / L2TP' },
            { label: 'IPv6 接口', value: fmtNumber(ipv6Interfaces.length), meta: '具备 IPv6 地址的接口' },
            { label: '最忙宽带速率', value: busiestLine ? fmtRate(totalTrafficRate(busiestLine)) : '-', meta: busiestLine ? `${fmtRate(busiestLine.upRate)} / ${fmtRate(busiestLine.downRate)}` : '暂无实时线路流量' }
          ]), 'ops-info-card')}
          ${opsDenseTableCard('宽带实时流量', `${fmtNumber(sortedPppoe.length)} 条宽带`, ['线路', '状态', '父接口 / 活动路由', 'IP 地址', '实时上行速率', '实时下行速率', '累计上行流量', '累计下行流量', '拨号状态'], lineRows, '当前未读取到宽带线路数据')}
          <div class="ops-double">
            ${opsCard('线路负载分布', loadDistributionRows.length ? `${fmtNumber(loadDistributionRows.length)} 条线路占比` : '当前按实时吞吐自动排序', loadDistributionBlock, 'ops-info-card')}
            ${opsCard('8 条线路速率趋势', `${fmtNumber(lineTrendRows.length)} 条线路同步展示`, renderLineTrendGrid(lineTrendRows, { emptyText: '当前未采集到可展示的线路趋势' }), 'ops-info-card')}
          </div>
          ${opsDenseTableCard('接口吞吐明细', `${fmtNumber(sortedInterfaces.length)} 个接口`, ['接口', '角色', '状态', 'IP 地址', '实时上行速率', '实时下行速率', '累计上行流量', '累计下行流量', 'MAC / 丢包错误'], ifaceRows, '当前未读取到接口数据')}
        </div>`;
    }
    return section('接口总览', 'interfaces', interfaceViews[currentInterfaceView].tip, `
      <div class="card">
        <div class="card-body">
          ${tabs}
          ${body}
        </div>
      </div>`);
  };
  window.renderInterfaces = renderInterfaces;

  renderRoutes = function patchedRenderRoutes(snapshot) {
    const routes = snapshot.routes || {};
    const routeItems = routes.items || [];
    const staticRouteItems = routes.staticRoutes || [];
    const defaultRouteItems = routes.defaultRoutes || [];
    const activeDefaultCount = defaultRouteItems.filter((row) => row.active && !row.disabled).length;
    const disabledStaticCount = staticRouteItems.filter((row) => row.disabled).length;
    const ipv4StaticCount = staticRouteItems.filter((row) => row.family === 'IPv4').length;
    const ipv6StaticCount = staticRouteItems.filter((row) => row.family === 'IPv6').length;
    const routeTables = sortCountEntries(routeItems.reduce((acc, row) => {
      const key = String(row.table || '-').trim() || '-';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}));
    const gatewayEntries = sortCountEntries(routeItems.reduce((acc, row) => {
      const key = String(row.gateway || '-').trim() || '-';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})).filter(([name]) => name && name !== '-');
    const commentedStaticCount = staticRouteItems.filter((row) => String(row.comment || '').trim()).length;
    const routeType = (row) => row.static ? '静态' : row.dynamic ? '动态' : '其它';
    const routeStatus = (row) => row.disabled ? tag('停用', 'warn') : row.active ? tag('活动', 'ok') : tag('待机', 'info');
    const defaultRows = defaultRouteItems.map((row) => `
      <tr>
        <td>${escapeHtml(row.table)}</td>
        <td>${escapeHtml(row.gateway)}</td>
        <td>${escapeHtml(row.distance)}</td>
        <td>${routeStatus(row)}</td>
        <td>${escapeHtml(row.comment || '-')}</td>
      </tr>`);
    const staticRows = staticRouteItems.map((row) => `
      <tr>
        <td>${escapeHtml(row.dstAddress)}</td>
        <td>${escapeHtml(row.gateway)}</td>
        <td>${escapeHtml(row.table)}</td>
        <td>${escapeHtml(row.distance)}</td>
        <td>${tag(routeType(row), row.static ? 'info' : 'warn')}</td>
        <td>${routeStatus(row)}</td>
        <td>${escapeHtml(row.comment || '-')}</td>
      </tr>`);
    const allRows = routeItems.map((row) => `
      <tr>
        <td>${escapeHtml(row.dstAddress)}</td>
        <td>${escapeHtml(row.gateway)}</td>
        <td>${escapeHtml(row.table)}</td>
        <td>${escapeHtml(row.distance)}</td>
        <td>${tag(row.family, row.family === 'IPv6' ? 'warn' : 'info')}</td>
        <td>${tag(routeType(row), row.static ? 'info' : row.dynamic ? 'ok' : 'warn')}</td>
        <td>${routeStatus(row)}</td>
      </tr>`);
    const routeTableRows = routeTables.slice(0, 12).map(([name, count]) => {
      const linkedRoutes = routeItems.filter((row) => (String(row.table || '-').trim() || '-') === name);
      const linkedDefaults = defaultRouteItems.filter((row) => (String(row.table || '-').trim() || '-') === name);
      const activeDefaults = linkedDefaults.filter((row) => row.active && !row.disabled).length;
      const gateways = Array.from(new Set(linkedRoutes.map((row) => String(row.gateway || '').trim()).filter(Boolean))).slice(0, 4).join(' / ');
      return `
        <tr>
          <td>${escapeHtml(name)}</td>
          <td>${fmtNumber(count)}</td>
          <td>${fmtNumber(linkedDefaults.length)}</td>
          <td>${fmtNumber(activeDefaults)}</td>
          <td>${escapeHtml(gateways || '-')}</td>
        </tr>`;
    });
    const gatewayRows = gatewayEntries.slice(0, 12).map(([name, count]) => {
      const linkedRoutes = routeItems.filter((row) => String(row.gateway || '').trim() === name);
      const activeCount = linkedRoutes.filter((row) => row.active && !row.disabled).length;
      const linkedDefaults = defaultRouteItems.filter((row) => String(row.gateway || '').trim() === name).length;
      const tables = Array.from(new Set(linkedRoutes.map((row) => String(row.table || '-').trim() || '-'))).slice(0, 4).join(' / ');
      const comment = linkedRoutes.map((row) => String(row.comment || '').trim()).find(Boolean) || '-';
      return `
        <tr>
          <td>${escapeHtml(name)}</td>
          <td>${fmtNumber(count)}</td>
          <td>${fmtNumber(activeCount)}</td>
          <td>${fmtNumber(linkedDefaults)}</td>
          <td>${escapeHtml(tables || '-')}</td>
          <td>${escapeHtml(comment)}</td>
        </tr>`;
    });
    return section('静态路由', 'routes', '真实路由表、默认路由与静态路由按 RouterOS 实表展示', `
      <div class="grid-4">
        ${metricCard('默认路由', fmtNumber(defaultRouteItems.length), `活动 ${fmtNumber(activeDefaultCount)} 条`, `路由表 ${fmtNumber(routeTables.length)} 个`)}
        ${metricCard('静态路由', fmtNumber(staticRouteItems.length), `停用 ${fmtNumber(disabledStaticCount)} 条`, `带备注 ${fmtNumber(commentedStaticCount)} 条`)}
        ${metricCard('地址族', `${fmtNumber(ipv4StaticCount)} / ${fmtNumber(ipv6StaticCount)}`, 'IPv4 / IPv6 静态路由', '')}
        ${metricCard('可见网关', fmtNumber(gatewayEntries.length), `全量路由 ${fmtNumber(routeItems.length)} 条`, '')}
      </div>
      <div class="ops-double" style="margin-top:12px">
        ${opsDenseTableCard('路由表分布', `${fmtNumber(routeTables.length)} 个路由表`, ['路由表', '总路由', '默认路由', '活动默认', '关联网关'], routeTableRows, '当前未识别到路由表分布')}
        ${opsDenseTableCard('网关活动矩阵', `${fmtNumber(gatewayEntries.length)} 个网关`, ['网关', '总路由', '活动', '默认路由', '路由表', '备注'], gatewayRows, '当前未识别到网关活动矩阵')}
      </div>
      <div class="ops-page-stack" style="margin-top:12px">
        ${opsDenseTableCard('默认路由状态', `${fmtNumber(defaultRouteItems.length)} 条`, ['路由表', '网关', '距离', '状态', '备注'], defaultRows, '当前未读取到默认路由')}
        ${opsDenseTableCard('静态路由列表', `${fmtNumber(staticRouteItems.length)} 条`, ['目标网段', '网关', '路由表', '距离', '类型', '状态', '备注'], staticRows, '当前未读取到静态路由')}
        ${opsDenseTableCard('全量路由表', `共 ${fmtNumber(routeItems.length)} 条`, ['目标网段', '网关', '路由表', '距离', '地址族', '类型', '状态'], allRows, '当前未读取到路由表')}
      </div>`);
  };
  window.renderRoutes = renderRoutes;

  renderBalance = function patchedRenderBalance(snapshot) {
    const lb = snapshot.loadBalance || {};
    const distributionList = lb.distribution || [];
    const defaultRoutes = lb.defaultRoutes || [];
    const mangleRules = lb.mangleRules || [];
    const routingRules = lb.routingRules || [];
    const distributionRows = distributionList.map((row) => ({
      label: row.name,
      value: Number(row.share || 0),
      display: `${Number(row.share || 0).toFixed(1)}%`
    }));
    const lineStateMap = {};
    distributionList.forEach((row) => {
      const key = String(row.name || '').trim();
      if (!key) return;
      lineStateMap[key] = {
        name: key,
        share: Number(row.share || 0),
        upRate: Number(row.upRate || 0),
        downRate: Number(row.downRate || 0),
        status: row.status || '在线',
        tables: new Set(),
        routeCount: 0,
        activeCount: 0,
        comments: []
      };
    });
    defaultRoutes.forEach((row) => {
      const key = String(row.gateway || '').trim();
      if (!key) return;
      if (!lineStateMap[key]) {
        lineStateMap[key] = {
          name: key,
          share: 0,
          upRate: 0,
          downRate: 0,
          status: row.active ? '在线' : '待机',
          tables: new Set(),
          routeCount: 0,
          activeCount: 0,
          comments: []
        };
      }
      lineStateMap[key].tables.add(String(row.table || '-').trim() || '-');
      lineStateMap[key].routeCount += 1;
      if (row.active) lineStateMap[key].activeCount += 1;
      if (row.comment) lineStateMap[key].comments.push(row.comment);
    });
    const lineSummaries = Object.values(lineStateMap).sort((a, b) => {
      const shareDiff = Number(b.share || 0) - Number(a.share || 0);
      if (shareDiff !== 0) return shareDiff;
      return (b.upRate + b.downRate) - (a.upRate + a.downRate);
    });
    const lineMatrixRows = lineSummaries.map((row) => `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${tag(row.status || (row.activeCount ? '在线' : '待机'), row.activeCount ? 'ok' : 'info')}</td>
        <td>${Number(row.share || 0).toFixed(1)}%</td>
        <td>${fmtRate(row.upRate)}</td>
        <td>${fmtRate(row.downRate)}</td>
        <td>${fmtNumber(row.activeCount)} / ${fmtNumber(row.routeCount)}</td>
        <td>${escapeHtml(Array.from(row.tables).join(' / ') || '-')}</td>
        <td>${escapeHtml(row.comments[0] || '-')}</td>
      </tr>`);
    const routeTableMatrixRows = sortCountEntries(defaultRoutes.reduce((acc, row) => {
      const key = String(row.table || '-').trim() || '-';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})).map(([name, count]) => {
      const linkedRoutes = defaultRoutes.filter((row) => (String(row.table || '-').trim() || '-') === name);
      const activeCount = linkedRoutes.filter((row) => row.active && !row.disabled).length;
      const gateways = Array.from(new Set(linkedRoutes.map((row) => String(row.gateway || '').trim()).filter(Boolean))).slice(0, 4).join(' / ');
      const distances = Array.from(new Set(linkedRoutes.map((row) => String(row.distance || '-').trim() || '-'))).slice(0, 4).join(' / ');
      return `
        <tr>
          <td>${escapeHtml(name)}</td>
          <td>${fmtNumber(count)}</td>
          <td>${fmtNumber(activeCount)}</td>
          <td>${escapeHtml(gateways || '-')}</td>
          <td>${escapeHtml(distances || '-')}</td>
        </tr>`;
    });
    const mangleRows = mangleRules.map((row) => `
      <tr>
        <td>${escapeHtml(row.chain)}</td>
        <td>${escapeHtml(row.action)}</td>
        <td>${escapeHtml(row.newRoutingMark || '-')}</td>
        <td>${fmtCompact(row.packets)}</td>
        <td>${fmtBytes(row.bytes)}</td>
        <td>${escapeHtml(row.comment || '-')}</td>
      </tr>`);
    const ruleRows = routingRules.map((row) => `
      <tr>
        <td>${escapeHtml(row.action)}</td>
        <td>${escapeHtml(row.table)}</td>
        <td>${escapeHtml(row.srcAddress)}</td>
        <td>${escapeHtml(row.dstAddress)}</td>
        <td>${row.disabled || row.inactive ? tag('未生效', 'warn') : tag('生效', 'ok')}</td>
        <td>${escapeHtml(row.comment || '-')}</td>
      </tr>`);
    const ruleCards = [];
    if (mangleRules.length) {
      ruleCards.push(opsDenseTableCard('Mangle 分流规则', `${fmtNumber(mangleRules.length)} 条`, ['链', '动作', '新路由标记', '命中包', '命中流量', '备注'], mangleRows, '当前未采集到 Mangle 分流规则'));
    }
    if (routingRules.length) {
      ruleCards.push(opsDenseTableCard('策略路由规则', `${fmtNumber(routingRules.length)} 条`, ['动作', '路由表', '源地址', '目标地址', '状态', '备注'], ruleRows, '当前未采集到策略路由规则'));
    }
    if (!ruleCards.length) {
      ruleCards.push(opsInfoCard('规则采集状态', '当前快照内未发现分流规则明细', [
        { k: 'Mangle 规则', v: fmtNumber(mangleRules.length) },
        { k: '策略路由', v: fmtNumber(routingRules.length) },
        { k: '默认路由', v: fmtNumber(defaultRoutes.length) },
        { k: '活动线路', v: fmtNumber(lb.activeLines || lineSummaries.length) }
      ]));
    }
    return section('分流监控中心', 'balance', '默认路由、分流规则与线路切换状态按 RouterOS 实际读取结果展示', `
      <div class="grid-4">
        ${metricCard('负载模式', escapeHtml(lb.mode || '-'), lb.pccDetected ? '已检测到 PCC' : '未检测到 PCC', '')}
        ${metricCard('活动线路', fmtNumber(lb.activeLines || lineSummaries.length), `占比线路 ${fmtNumber(distributionList.length)} 条`, '')}
        ${metricCard('默认路由', fmtNumber(defaultRoutes.length), `活动 ${fmtNumber(defaultRoutes.filter((row) => row.active).length)} 条`, '')}
        ${metricCard('分流规则', fmtNumber(mangleRules.length + routingRules.length), `Mangle ${fmtNumber(mangleRules.length)} / 策略 ${fmtNumber(routingRules.length)}`, '')}
      </div>
      <div class="ops-double ops-balance-route-row" style="margin-top:12px">
        ${opsCard('线路负载占比', distributionList.length ? `${fmtNumber(distributionList.length)} 条线路参与显示` : '等待采集', opsBarStack(distributionRows, { percentMode: true, emptyText: '当前未形成线路流量分布' }), 'ops-info-card ops-balance-share-card')}
        ${opsDenseTableCard('默认路由表分布', `${fmtNumber(routeTableMatrixRows.length)} 个表`, ['路由表', '默认路由', '活动', '网关', '距离'], routeTableMatrixRows, '当前未识别到默认路由表分布')}
      </div>
      <div class="ops-page-stack" style="margin-top:12px">
        ${opsDenseTableCard('线路与路由映射', `${fmtNumber(lineSummaries.length)} 条线路`, ['线路', '状态', '占比', '实时上行速率', '实时下行速率', '活动默认', '路由表', '备注'], lineMatrixRows, '当前未读取到线路与路由映射')}
        ${ruleCards.join('')}
      </div>`);
  };
  window.renderBalance = renderBalance;

  renderDhcp = function patchedRenderDhcp(snapshot) {
    const dhcp = snapshot.dhcp || {};
    const servers = dhcp.servers || [];
    const pools = dhcp.pools || [];
    const leases = dhcp.leases || [];
    const runningServers = servers.filter((row) => row.running).length;
    const boundLeases = leases.filter((row) => row.status === 'bound').length;
    const staticLeases = leases.filter((row) => row.static).length;
    const averagePoolUsage = pools.length ? `${(pools.reduce((sum, pool) => sum + Number(pool.usage || 0), 0) / pools.length).toFixed(1)}%` : '-';
    const serverRows = servers.map((row) => `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.interface)}</td>
        <td>${escapeHtml(row.pool)}</td>
        <td>${escapeHtml(row.leaseTime)}</td>
        <td>${row.running ? tag('运行中', 'ok') : tag('停用', 'warn')}</td>
      </tr>`);
    const poolRows = pools.map((pool) => {
      const linkedServers = servers.filter((row) => row.pool === pool.name).map((row) => row.name).join(' / ');
      return `
        <tr>
          <td>${escapeHtml(pool.name)}</td>
          <td>${fmtNumber(pool.used)}</td>
          <td>${fmtNumber(pool.total)}</td>
          <td>${fmtNumber(pool.available)}</td>
          <td>${Number(pool.usage || 0).toFixed(1)}%</td>
          <td>${escapeHtml(linkedServers || '-')}</td>
        </tr>`;
    });
    const leaseRows = leases.map((row) => `
      <tr>
        <td>${escapeHtml(row.address)}</td>
        <td>${renderEditableNameCell(row, row.address, row.address || '-')}</td>
        <td>${escapeHtml(row.mac)}</td>
        <td>${escapeHtml(row.server)}</td>
        <td>${tag(row.status, row.status === 'bound' ? 'ok' : 'warn')}</td>
        <td>${escapeHtml(toDisplayText(row.lastSeen || '-'))}</td>
        <td>${row.static ? tag('静态', 'info') : tag('动态', 'ok')}</td>
      </tr>`);
    return section('DHCP 服务', 'dhcp', 'DHCP 服务器、地址池与租约按 RouterOS 实际读取结果集中展示', `
      <div class="grid-4">
        ${metricCard('DHCP 服务器', fmtNumber(servers.length), `运行中 ${fmtNumber(runningServers)} 个`, `停用 ${fmtNumber(servers.length - runningServers)} 个`)}
        ${metricCard('地址池', fmtNumber(pools.length), `平均利用率 ${averagePoolUsage}`, `空闲地址 ${fmtNumber(pools.reduce((sum, pool) => sum + Number(pool.available || 0), 0))}`)}
        ${metricCard('绑定租约', fmtNumber(boundLeases), `总租约 ${fmtNumber(leases.length)} 条`, '')}
        ${metricCard('静态分配', fmtNumber(staticLeases), `动态 ${fmtNumber(Math.max(leases.length - staticLeases, 0))} 条`, '')}
      </div>
      <div class="ops-double" style="margin-top:12px">
        ${opsDenseTableCard('DHCP 服务器', `${fmtNumber(servers.length)} 台`, ['服务名', '接口', '地址池', '租期', '状态'], serverRows, '当前未读取到 DHCP 服务器')}
        ${opsDenseTableCard('地址池占用', `${fmtNumber(pools.length)} 组`, ['地址池', '已用', '总量', '空闲', '利用率', '关联服务'], poolRows, '当前未读取到 DHCP 地址池')}
      </div>
      <div class="ops-page-stack" style="margin-top:12px">
        ${opsDenseTableCard('DHCP 租约与静态分配', `${fmtNumber(leases.length)} 条`, ['IP', '主机名', 'MAC', '服务', '状态', '最后出现', '分配方式'], leaseRows, '当前未读取到 DHCP 租约')}
      </div>`);
  };
  window.renderDhcp = renderDhcp;

  renderTrafficLoad = function patchedRenderTrafficLoad(snapshot) {
    const overview = snapshot.overview || {};
    const rawPppoe = snapshot.pppoe || [];
    const pppoe = opsSortPppoeNamedRows(rawPppoe);
    const busiestPppoe = rawPppoe.slice().sort((a, b) => totalTrafficRate(b) - totalTrafficRate(a));
    const interfaces = (snapshot.interfaces || []).slice().sort((a, b) => totalTrafficRate(b, 'txRate', 'rxRate') - totalTrafficRate(a, 'txRate', 'rxRate'));
    const terminals = (snapshot.terminals || []).slice().sort((a, b) => totalTrafficRate(b) - totalTrafficRate(a));
    const loadBalance = snapshot.loadBalance || {};
    const activeLines = pppoe.filter((row) => row.running).length;
    const busiestLine = busiestPppoe[0];
    const trafficTerminals = terminals.filter((row) => totalTrafficRate(row) > 0);
    const lineShareRows = opsSortPppoeNamedRows((loadBalance.distribution || []).length ? loadBalance.distribution : pppoe.map((row) => ({
      name: row.name,
      share: 0,
      upRate: row.upRate,
      downRate: row.downRate
    }))).slice(0, 8).map((row) => ({
      label: row.name,
      value: Number(row.share || 0),
      display: `${Number(row.share || 0).toFixed(1)}%`
    }));
    const lineRows = pppoe.slice(0, 12).map((row) => `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${row.running ? tag('在线', 'ok') : tag('离线', 'danger')}</td>
        <td>${escapeHtml(row.parent || '-')}</td>
        <td>${fmtRate(row.upRate)}</td>
        <td>${fmtRate(row.downRate)}</td>
        <td>${fmtBytes(row.txBytes)}</td>
        <td>${fmtBytes(row.rxBytes)}</td>
      </tr>`);
    const interfaceRows = interfaces.slice(0, 12).map((row) => `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${tag(row.role, row.role === 'WAN' ? 'info' : 'ok')}</td>
        <td>${escapeHtml(row.type || '-')}</td>
        <td>${fmtRate(row.txRate)}</td>
        <td>${fmtRate(row.rxRate)}</td>
        <td>${fmtBytes(row.txBytes)}</td>
        <td>${fmtBytes(row.rxBytes)}</td>
      </tr>`);
    const terminalRows = trafficTerminals.slice(0, 20).map((row) => `
      <tr>
        <td>${renderEditableNameCell(row, row.ip, row.ip || '-')}</td>
        <td>${escapeHtml(row.ip)}</td>
        <td>${fmtRate(row.upRate)}</td>
        <td>${fmtRate(row.downRate)}</td>
        <td>${fmtNumber(row.connections)}</td>
        <td>${fmtBytes(row.sessionBytes)}</td>
      </tr>`);
    return section('流量负载', 'trafficLoad', '按 RouterOS 真实吞吐数据展示宽带占用、接口吞吐与终端流量排行', `
      <div class="grid-4">
        ${metricCard('总上行速率', fmtRate(overview.uplinkBps), `在线宽带 ${fmtNumber(activeLines)} / ${fmtNumber(pppoe.length)}`, busiestLine ? `最繁忙 ${escapeHtml(busiestLine.name)}` : '暂无在线宽带')}
        ${metricCard('总下行速率', fmtRate(overview.downlinkBps), `在线终端 ${fmtNumber(overview.onlineTerminals)}`, `有流量终端 ${fmtNumber(trafficTerminals.length)}`)}
        ${metricCard('线路吞吐峰值', busiestLine ? fmtRate(totalTrafficRate(busiestLine)) : '-', busiestLine ? `${fmtRate(busiestLine.upRate)} / ${fmtRate(busiestLine.downRate)}` : '当前未采集到线路实时流量', busiestLine ? `父接口 ${escapeHtml(busiestLine.parent || '-')}` : '')}
        ${metricCard('接口吞吐对象', fmtNumber(interfaces.length), `WAN / LAN ${fmtNumber(interfaces.filter((row) => row.role === 'WAN').length)} / ${fmtNumber(interfaces.filter((row) => row.role !== 'WAN').length)}`, `终端排行 ${fmtNumber(trafficTerminals.length)} 台`)}
      </div>
      <div class="ops-split" style="margin-top:12px">
        ${opsCard('WAN 聚合吞吐趋势', `${fmtRate(overview.uplinkBps)} / ${fmtRate(overview.downlinkBps)}`, `<div class="chart-box"><div class="chart-label"><span>总上 / 总下</span><span>${escapeHtml(snapshot.meta.pollSeconds)}s / 点</span></div>${lineChart([overview.history.uplink, overview.history.downlink], { colors: ['#165dff', '#f53f3f'] })}</div>`, 'ops-info-card')}
        ${opsCard('线路负载占比', busiestLine ? `${escapeHtml(busiestLine.name)} 当前最繁忙` : '等待采集', opsBarStack(lineShareRows, { percentMode: true, emptyText: '当前未形成可读的线路占比' }), 'ops-info-card')}
      </div>
      <div class="ops-page-stack" style="margin-top:12px">
        ${opsCard('8 条线路速率趋势', `${fmtNumber(getLineTrendRows(pppoe).length)} 条线路同步展示`, renderLineTrendGrid(getLineTrendRows(pppoe), { emptyText: '当前未采集到可展示的线路趋势' }), 'ops-info-card')}
      </div>
      <div class="ops-double" style="margin-top:12px">
        ${opsTableCard('宽带实时负载', '按 PPPoE 名称固定排序', ['线路', '状态', '父接口', '实时上行速率', '实时下行速率', '累计上行流量', '累计下行流量'], lineRows, '当前未读取到宽带实时负载')}
        ${opsTableCard('接口吞吐排行', '按接口实时吞吐排序', ['接口', '角色', '类型', '实时上行速率', '实时下行速率', '累计上行流量', '累计下行流量'], interfaceRows, '当前未读取到接口吞吐排行')}
      </div>
      <div class="ops-page-stack" style="margin-top:12px">
        ${opsTableCard('终端实时流量排行', '按终端实时吞吐与累计流量综合查看', ['名称', 'IP', '实时上行速率', '实时下行速率', '连接数', '累计流量'], terminalRows, '当前未读取到终端实时流量排行')}
      </div>`);
  };
  window.renderTrafficLoad = renderTrafficLoad;

  renderDnsV4 = function patchedRenderDnsV4(snapshot) {
    const dns = snapshot.dns || {};
    const previewRows = Array.isArray(dns.forwardRules) ? dns.forwardRules : [];
    const browserLoaded = dnsRuleBrowser.loaded;
    const browserRows = browserLoaded ? (dnsRuleBrowser.rows || []) : previewRows;
    const visibleRuleCount = browserLoaded
      ? Number(dnsRuleBrowser.visibleRuleCount || browserRows.length || 0)
      : Number(dns.visibleRuleCount || browserRows.length || 0);
    const totalRuleCount = browserLoaded
      ? Number(dnsRuleBrowser.totalCount || dns.forwardRuleCount || visibleRuleCount || 0)
      : Number(dns.forwardRuleCount || visibleRuleCount || 0);
    const effectiveLimit = Math.max(1, Number(browserLoaded ? dnsRuleBrowser.limit : DNS_RULE_PAGE_SIZE) || DNS_RULE_PAGE_SIZE);
    const effectiveOffset = browserLoaded ? Math.max(0, Number(dnsRuleBrowser.offset || 0)) : 0;
    const totalPages = totalRuleCount > 0 ? Math.max(1, Math.ceil(totalRuleCount / effectiveLimit)) : 1;
    const currentPage = totalRuleCount > 0 ? Math.min(totalPages, Math.floor(effectiveOffset / effectiveLimit) + 1) : 1;
    const maxOffset = totalRuleCount > 0 ? Math.max(0, (totalPages - 1) * effectiveLimit) : 0;
    const canPrev = browserLoaded && effectiveOffset > 0 && !dnsRuleBrowser.loading;
    const canNext = browserLoaded && effectiveOffset < maxOffset && !dnsRuleBrowser.loading;
    const browserStateText = browserLoaded
      ? `第 ${fmtNumber(currentPage)} / ${fmtNumber(totalPages)} 页`
      : dnsRuleBrowser.loading
        ? '正在加载全量规则浏览'
        : dnsRuleBrowser.error
          ? '分页读取失败，已回退快照预览'
          : '快照预览';
    const ruleEmptyText = totalRuleCount
      ? dnsRuleBrowser.loading
        ? '正在读取当前页 DNS 静态规则...'
        : dnsRuleBrowser.error
          ? '当前页规则读取失败，已回退显示快照预览'
          : '当前页没有可展示的 DNS 静态规则'
      : '当前未读取到 DNS 静态规则';
    const browserNotice = dnsRuleBrowser.error
      ? `<div class="notice" style="margin-bottom:12px">DNS 静态规则页读取失败：${escapeHtml(dnsRuleBrowser.error)}，当前先回退显示快照预览。</div>`
      : dnsRuleBrowser.loading
        ? `<div class="notice" style="margin-bottom:12px">正在读取 DNS 静态规则第 ${fmtNumber(currentPage)} 页，加载完成后会自动更新。</div>`
        : '';
    const ruleRows = browserRows.map((row) => `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${tag(row.type || '-', row.disabled ? 'warn' : 'info')}</td>
        <td>${escapeHtml(row.value)}</td>
        <td>${escapeHtml(row.ttl || '-')}</td>
        <td>${row.disabled ? tag('停用', 'warn') : tag('启用', 'ok')}</td>
        <td>${escapeHtml(row.comment || '-')}</td>
      </tr>`);
    return section('DNS IPv4', 'dns4', '聚焦 IPv4 DNS 服务状态、缓存、DoH 与静态规则浏览，不再把 IPv6 信息堆在同一页', `
      <div class="grid-4">
        ${metricCard('DNS 服务状态', tag(dns.running ? '启用' : '未启用', dns.running ? 'ok' : 'danger'), `上游 DNS ${fmtNumber((dns.servers || []).length)} 个`, dns.dohServer ? 'DoH 已配置' : 'DoH 未配置')}
        ${metricCard('缓存占用', fmtBytes(dns.cacheUsed || 0), `缓存容量 ${fmtBytes(dns.cacheSize || 0)}`, '')}
        ${metricCard('静态规则总数', fmtNumber(totalRuleCount), `当前页 ${fmtNumber(visibleRuleCount)} 条`, `停用 ${fmtNumber(dns.disabledForwardRuleCount || 0)} 条`)}
        ${metricCard('规则浏览状态', browserStateText, dnsRuleBrowser.loading ? '当前正在刷新规则页' : '规则浏览已就绪', dnsRuleBrowser.error ? '最近一次分页读取失败' : '')}
      </div>
      <div class="ops-page-stack" style="margin-top:12px">
        ${opsCard('DNS 服务摘要', '缓存、DoH 和规则浏览状态全部集中到一行下面，避免左右大空白', opsStatTiles([
          { label: '上游 DNS', value: fmtNumber((dns.servers || []).length), meta: (dns.servers || []).slice(0, 2).join(' / ') || '未读取到' },
          { label: 'DoH 状态', value: dns.dohServer ? '已配置' : '未配置', meta: dns.dohServer ? escapeHtml(dns.dohServer) : '未配置 DoH' },
          { label: '证书校验', value: dns.dohServer ? (dns.verifyDohCert ? '开启' : '关闭') : '-', meta: dns.dohServer ? 'DoH 证书验证状态' : '当前未启用 DoH' },
          { label: '缓存占用率', value: dns.cacheSize ? `${((Number(dns.cacheUsed || 0) / Number(dns.cacheSize || 1)) * 100).toFixed(1)}%` : '-', meta: `${fmtBytes(dns.cacheUsed || 0)} / ${fmtBytes(dns.cacheSize || 0)}` },
          { label: '当前页显示', value: fmtNumber(visibleRuleCount), meta: `总数 ${fmtNumber(totalRuleCount)} 条` },
          { label: '浏览状态', value: browserStateText, meta: dns.forwardRuleSample ? '快照预览 + 分页补充' : '全量快照' }
        ]), 'ops-info-card')}
        <div class="ops-double">
          ${opsInfoCard('上游 DNS / DoH 参数', '全部来自 RouterOS 可读参数', [
            { k: '上游 DNS', v: compactListHtml(dns.servers || [], 3) },
            { k: 'DoH 服务', v: dns.dohServer ? escapeHtml(dns.dohServer) : '未配置' },
            { k: '证书校验', v: dns.dohServer ? (dns.verifyDohCert ? tag('开启', 'ok') : tag('关闭', 'warn')) : '-' },
            { k: '缓存容量', v: `${fmtBytes(dns.cacheUsed || 0)} / ${fmtBytes(dns.cacheSize || 0)}` }
          ])}
          ${opsInfoCard('规则浏览摘要', '当前页和总量明确拆开显示', [
            { k: '规则总数', v: fmtNumber(totalRuleCount) },
            { k: '当前页显示', v: fmtNumber(visibleRuleCount) },
            { k: '停用规则', v: fmtNumber(dns.disabledForwardRuleCount || 0) },
            { k: '浏览状态', v: escapeHtml(browserStateText) }
          ])}
        </div>
        <div class="card">
          <div class="card-head">
            <div class="card-title">DNS 静态规则 / 转发规则</div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end">
              <span class="subtle">${browserStateText} 路 当前显示 ${fmtNumber(visibleRuleCount)} / ${fmtNumber(totalRuleCount)} 条</span>
              <button class="action-btn" type="button" data-dns-rules-refresh ${dnsRuleBrowser.loading ? 'disabled' : ''}>刷新当前页</button>
              <button class="action-btn" type="button" data-dns-rules-page="prev" ${canPrev ? '' : 'disabled'}>上一页</button>
              <button class="action-btn" type="button" data-dns-rules-page="next" ${canNext ? '' : 'disabled'}>下一页</button>
            </div>
          </div>
          <div class="card-body">${browserNotice}${opsDenseTable(['名称 / 正则', '类型', '目标值', 'TTL', '状态', '备注'], ruleRows, ruleEmptyText)}</div>
        </div>
      </div>`);
  };
  window.renderDnsV4 = renderDnsV4;

  renderDnsV6 = function patchedRenderDnsV6(snapshot) {
    const dns = snapshot.dns || {};
    const ndList = dns.ipv6Nd || [];
    const dhcpClients = dns.ipv6DhcpClients || [];
    const enabledNdCount = ndList.filter((row) => row.advertiseDns).length;
    const managedNdCount = ndList.filter((row) => row.managed).length;
    const otherConfigCount = ndList.filter((row) => row.otherConfig).length;
    const boundPrefixClients = dhcpClients.filter((row) => row.status === 'bound').length;
    const peerDnsClients = dhcpClients.filter((row) => row.usePeerDns).length;
    const listText = (values, fallback = '-') => (values && values.length ? values.map(escapeHtml).join('<br>') : fallback);
    const ndRows = ndList.map((row) => `
      <tr>
        <td>${escapeHtml(row.interface)}</td>
        <td>${row.advertiseDns ? tag('开启', 'ok') : tag('关闭', 'warn')}</td>
        <td>${listText(row.dnsServers, '未单独指定')}</td>
        <td>${row.managed ? tag('开启', 'info') : tag('关闭', 'ok')}</td>
        <td>${row.otherConfig ? tag('开启', 'info') : tag('关闭', 'ok')}</td>
        <td>${escapeHtml(row.raLifetime || '-')}</td>
      </tr>`);
    const dhcpClientRows = dhcpClients.map((row) => `
      <tr>
        <td>${escapeHtml(row.interface)}</td>
        <td>${tag(row.status || '-', row.status === 'bound' ? 'ok' : 'warn')}</td>
        <td>${escapeHtml(row.pool || '-')}</td>
        <td>${escapeHtml(row.prefix || '-')}</td>
        <td>${row.usePeerDns ? tag('开启', 'ok') : tag('关闭', 'info')}</td>
        <td>${row.addDefaultRoute ? `开启 / distance ${escapeHtml(row.defaultRouteDistance || '-')}` : '关闭'}</td>
      </tr>`);
    const hasAnyIpv6Data = ndList.length || dhcpClients.length;
    return section('DNS IPv6', 'dns6', 'RouterOS 可读到的 ND、RA 与 DHCPv6 Prefix 信息', `
      <div class="grid-4">
        ${metricCard('ND 接口数', fmtNumber(ndList.length), `广播 DNS ${fmtNumber(enabledNdCount)} 个`, '')}
        ${metricCard('Managed / Other', `${fmtNumber(managedNdCount)} / ${fmtNumber(otherConfigCount)}`, 'ND 标志位统计', '')}
        ${metricCard('DHCPv6 Client', fmtNumber(dhcpClients.length), `Peer DNS ${fmtNumber(peerDnsClients)} 个`, '')}
        ${metricCard('Prefix 已绑定', fmtNumber(boundPrefixClients), `总客户端 ${fmtNumber(dhcpClients.length)} 个`, '')}
      </div>
      <div class="ops-page-stack" style="margin-top:12px">
        ${hasAnyIpv6Data
          ? `<div class="ops-double">
               ${opsDenseTableCard('IPv6 ND 广播', `${fmtNumber(ndList.length)} 个接口`, ['接口', '广播 DNS', '显式 DNS', 'Managed', 'Other Config', 'RA 生命周期'], ndRows, '当前未读取到 IPv6 ND 广播配置')}
               ${opsDenseTableCard('IPv6 DHCP Client / Prefix', `${fmtNumber(dhcpClients.length)} 个客户端`, ['接口', '状态', '前缀池', '前缀 / 地址', 'Peer DNS', '默认路由'], dhcpClientRows, '当前未读取到 IPv6 DHCP Client')}
             </div>`
          : opsCard('IPv6 DNS 采集状态', '当前页面没有读到 ND / DHCPv6 明细', emptyBlock('当前未读取到 IPv6 ND / DHCPv6 数据'), 'ops-empty-card ops-density-table')}
      </div>`);
  };
  window.renderDnsV6 = renderDnsV6;

  renderLogs = function patchedRenderLogs(snapshot, config = {}) {
    const logs = snapshot.logs || {};
    const sectionTitle = config.title || '日志中心';
    const sectionId = config.id || 'logs';
    const sectionTip = config.tip || '系统、Firewall、DHCP、DNS 日志分类集中展示';
    const groups = [
      { key: 'system', title: '系统日志', empty: '当前没有采集到系统日志' },
      { key: 'firewall', title: 'Firewall 日志', empty: '当前没有采集到 Firewall 日志' },
      { key: 'dhcp', title: 'DHCP 日志', empty: '当前没有采集到 DHCP 日志' },
      { key: 'dns', title: 'DNS 日志', empty: '当前没有采集到 DNS 日志' }
    ];
    const renderRows = (rows) => (rows || []).slice(0, 20).map((row) => `
      <tr>
        <td>${escapeHtml(row.time)}</td>
        <td>${escapeHtml(row.topics)}</td>
        <td>${escapeHtml(row.message)}</td>
      </tr>`);
    const availableCards = groups.filter((group) => (logs[group.key] || []).length).map((group) => (
      opsDenseTableCard(group.title, `最近 ${fmtNumber(Math.min((logs[group.key] || []).length, 20))} 条`, ['时间', '主题', '消息'], renderRows(logs[group.key]), group.empty)
    ));
    return section(sectionTitle, sectionId, sectionTip, `
      <div class="grid-4">
        ${metricCard('全部日志', fmtNumber((logs.all || []).length), '当前窗口内采样', '')}
        ${metricCard('系统日志', fmtNumber((logs.system || []).length), '非 DHCP / DNS / Firewall', '')}
        ${metricCard('Firewall 日志', fmtNumber((logs.firewall || []).length), '含防火墙主题', '')}
        ${metricCard('DHCP / DNS', `${fmtNumber((logs.dhcp || []).length)} / ${fmtNumber((logs.dns || []).length)}`, '服务日志', '')}
      </div>
      <div class="ops-page-stack" style="margin-top:12px">
        ${availableCards.length
          ? availableCards.join('')
          : opsCard('日志采集状态', '当前窗口为空', emptyBlock('当前没有采集到系统、Firewall、DHCP、DNS 日志'), 'ops-empty-card ops-density-table')}
      </div>
      <div class="footer">说明：本页不提供任何配置编辑、提交、删除、启停或策略修改动作，所有内容均来自本地采集服务的只读读取结果。</div>`);
  };
  window.renderLogs = renderLogs;

  renderDnsV6 = function patchedRenderDnsV6Dense(snapshot) {
    const dns = snapshot.dns || {};
    const ndList = dns.ipv6Nd || [];
    const dhcpClients = dns.ipv6DhcpClients || [];
    const enabledNdCount = ndList.filter((row) => row.advertiseDns).length;
    const managedNdCount = ndList.filter((row) => row.managed).length;
    const otherConfigCount = ndList.filter((row) => row.otherConfig).length;
    const boundPrefixClients = dhcpClients.filter((row) => row.status === 'bound').length;
    const peerDnsClients = dhcpClients.filter((row) => row.usePeerDns).length;
    const ndRows = ndList.map((row) => `
      <tr>
        <td>${escapeHtml(row.interface)}</td>
        <td>${row.advertiseDns ? tag('开启', 'ok') : tag('关闭', 'warn')}</td>
        <td>${compactListHtml(row.dnsServers || [], 2)}</td>
        <td>${opsTwoLineCell(row.managed ? 'Managed 开' : 'Managed 关', row.otherConfig ? 'Other 开' : 'Other 关')}</td>
        <td>${escapeHtml(row.raLifetime || '-')}</td>
      </tr>`);
    const dhcpClientRows = dhcpClients.map((row) => `
      <tr>
        <td>${escapeHtml(row.interface)}</td>
        <td>${tag(row.status || '-', row.status === 'bound' ? 'ok' : 'warn')}</td>
        <td>${escapeHtml(row.pool || '-')}</td>
        <td>${escapeHtml(row.prefix || '-')}</td>
        <td>${opsTwoLineCell(row.usePeerDns ? 'Peer DNS 开' : 'Peer DNS 关', row.addDefaultRoute ? `默认路由 ${escapeHtml(row.defaultRouteDistance || '-')}` : '默认路由关')}</td>
      </tr>`);
    const hasAnyIpv6Data = ndList.length || dhcpClients.length;
    return section('DNS IPv6', 'dns6', 'IPv6 ND 广播、RA 标志和 DHCPv6 Prefix 纵向展开，减少空列与横向拖动', `
      <div class="grid-4">
        ${metricCard('ND 接口数', fmtNumber(ndList.length), `广播 DNS ${fmtNumber(enabledNdCount)} 个`, '')}
        ${metricCard('Managed / Other', `${fmtNumber(managedNdCount)} / ${fmtNumber(otherConfigCount)}`, 'RA 标志位统计', '')}
        ${metricCard('DHCPv6 Client', fmtNumber(dhcpClients.length), `Peer DNS ${fmtNumber(peerDnsClients)} 个`, '')}
        ${metricCard('Prefix 已绑定', fmtNumber(boundPrefixClients), `客户端总数 ${fmtNumber(dhcpClients.length)} 个`, '')}
      </div>
      <div class="ops-page-stack" style="margin-top:12px">
        ${hasAnyIpv6Data
          ? `
            ${opsCard('IPv6 DNS 摘要', 'ND 广播与 DHCPv6 Prefix 分开纵向展示，避免左右两张大空表', opsStatTiles([
              { label: '广播 DNS 接口', value: fmtNumber(enabledNdCount), meta: `ND 接口总数 ${fmtNumber(ndList.length)}` },
              { label: 'Managed / Other', value: `${fmtNumber(managedNdCount)} / ${fmtNumber(otherConfigCount)}`, meta: 'RA 标志位统计' },
              { label: 'Prefix 已绑定', value: fmtNumber(boundPrefixClients), meta: `客户端总数 ${fmtNumber(dhcpClients.length)}` },
              { label: 'Peer DNS 客户端', value: fmtNumber(peerDnsClients), meta: '使用对端 DNS 的 DHCPv6 Client' }
            ]), 'ops-info-card')}
            ${opsDenseTableCard('IPv6 ND 广播接口', `${fmtNumber(ndList.length)} 个接口`, ['接口', '广播 DNS', '显式 DNS', 'RA 标志', '生存期'], ndRows, '当前未读取到 IPv6 ND 广播配置')}
            ${opsDenseTableCard('IPv6 DHCPv6 Prefix 客户端', `${fmtNumber(dhcpClients.length)} 个客户端`, ['接口', '状态', '前缀池', '前缀 / 地址', 'Peer DNS / 默认路由'], dhcpClientRows, '当前未读取到 IPv6 DHCPv6 Client')}
          `
          : opsCard('IPv6 DNS 采集状态', '当前页面没有读到 ND / DHCPv6 明细', emptyBlock('当前未读取到 IPv6 ND / DHCPv6 数据'), 'ops-empty-card ops-density-table')}
      </div>`);
  };
  window.renderDnsV6 = renderDnsV6;

  renderSecurity = function patchedRenderSecurityDense(snapshot, config = {}) {
    const security = snapshot.security || {};
    const sectionTitle = config.title || '安全监控中心';
    const sectionId = config.id || 'security';
    const sectionTip = config.tip || 'Filter 规则、地址名单与异常告警按真实读取结果集中展示';
    const filterRows = (security.filters || []).map((row) => `
      <tr>
        <td>${escapeHtml(row.chain)}</td>
        <td>${tag(row.action, row.disabled ? 'warn' : 'info')}</td>
        <td>${escapeHtml(row.comment || '-')}</td>
        <td>${fmtCompact(row.packets)}</td>
        <td>${fmtBytes(row.bytes)}</td>
        <td>${row.disabled ? tag('停用', 'warn') : tag('启用', 'ok')}</td>
      </tr>`);
    const listRows = (security.addressLists || []).map((row) => `
      <tr>
        <td>${escapeHtml(row.list)}</td>
        <td>${tag(row.category, row.category === '黑名单' ? 'danger' : row.category === '白名单' ? 'ok' : 'info')}</td>
        <td>${escapeHtml(row.address)}</td>
        <td>${escapeHtml(row.timeout || '-')}</td>
        <td>${escapeHtml(row.comment || '-')}</td>
      </tr>`);
    const alertRows = (security.alerts || []).map((row) => `
      <tr>
        <td>${escapeHtml(row.time)}</td>
        <td>${escapeHtml(row.topics)}</td>
        <td>${escapeHtml(row.message)}</td>
      </tr>`);
    const categoryBars = sortCountEntries((security.addressLists || []).reduce((acc, row) => {
      const key = String(row.category || '未分类').trim() || '未分类';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})).map(([label, value]) => ({
      label,
      value: Number(value || 0),
      display: fmtNumber(value)
    }));
    const enabledFilters = (security.filters || []).filter((row) => !row.disabled).length;
    const inputFilters = (security.filters || []).filter((row) => row.chain === 'input').length;
    const forwardFilters = (security.filters || []).filter((row) => row.chain === 'forward').length;
    const totalFilterPackets = (security.filters || []).reduce((sum, row) => sum + Number(row.packets || 0), 0);
    const totalFilterBytes = (security.filters || []).reduce((sum, row) => sum + Number(row.bytes || 0), 0);
    return section(sectionTitle, sectionId, sectionTip, `
      <div class="grid-4">
        ${metricCard('ACL 规则数', fmtNumber((security.filters || []).length), `启用 ${fmtNumber(enabledFilters)} 条`, '只统计真实 Filter')}
        ${metricCard('地址名单条目', fmtNumber((security.addressLists || []).length), '黑白名单 / 地址集预览', '')}
        ${metricCard('异常告警', fmtNumber((security.alerts || []).length), '脚本、访问或系统错误', '')}
        ${metricCard('Filter 累计命中', fmtCompact(totalFilterPackets), '命中包累计', '')}
      </div>
      <div class="ops-page-stack" style="margin-top:12px">
        ${opsDenseTableCard('近期异常告警', `${fmtNumber((security.alerts || []).length)} 条`, ['时间', '主题', '消息'], alertRows, '当前未读取到异常告警')}
        <div class="ops-double">
          ${opsCard('Filter 摘要', '把原来只占位置的提醒区改成可读摘要', opsStatTiles([
            { label: '启用规则', value: fmtNumber(enabledFilters), meta: `总规则 ${fmtNumber((security.filters || []).length)} 条` },
            { label: 'Input 链', value: fmtNumber(inputFilters), meta: '输入面防护' },
            { label: 'Forward 链', value: fmtNumber(forwardFilters), meta: '转发面限制' },
            { label: '累计命中流量', value: fmtBytes(totalFilterBytes), meta: '所有 Filter 流量累计' }
          ]), 'ops-info-card')}
          ${opsCard('地址名单分类', `${fmtNumber((security.addressLists || []).length)} 条名单按类别聚合`, opsBarStack(categoryBars, { emptyText: '当前未读取到地址名单分类' }), 'ops-info-card')}
        </div>
        ${opsDenseTableCard('ACL Filter 明细', `${fmtNumber((security.filters || []).length)} 条规则`, ['链', '动作', '备注', '命中包', '命中流量', '状态'], filterRows, '当前未读取到 Filter 规则')}
        ${opsDenseTableCard('地址名单明细', `${fmtNumber((security.addressLists || []).length)} 条`, ['列表名', '类别', '地址', '超时', '备注'], listRows, '当前未读取到地址名单')}
      </div>`);
  };
  window.renderSecurity = renderSecurity;

  renderServiceLogs = function patchedRenderServiceLogsDense(snapshot) {
    const logs = snapshot.logs || {};
    const dhcp = snapshot.dhcp || {};
    const dns = snapshot.dns || {};
    const dnsTotalRuleCount = Number(dns.forwardRuleCount || dns.visibleRuleCount || (dns.forwardRules || []).length || 0);
    const serviceEvents = [
      ...(logs.dhcp || []).map((row) => ({ source: 'DHCP', ...row })),
      ...(logs.dns || []).map((row) => ({ source: 'DNS', ...row }))
    ].sort((a, b) => String(b.time || '').localeCompare(String(a.time || ''))).slice(0, 40);
    const serviceRows = serviceEvents.map((row) => `
      <tr>
        <td>${escapeHtml(row.source || '-')}</td>
        <td>${escapeHtml(row.time)}</td>
        <td>${escapeHtml(row.topics)}</td>
        <td>${escapeHtml(row.message)}</td>
      </tr>`);
    const serverRows = (dhcp.servers || []).map((row) => `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.interface)}</td>
        <td>${escapeHtml(row.pool)}</td>
        <td>${escapeHtml(row.leaseTime)}</td>
        <td>${row.running ? tag('运行中', 'ok') : tag('停用', 'warn')}</td>
      </tr>`);
    const dnsPreviewRows = (dns.forwardRules || []).slice(0, 12).map((row) => `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${tag(row.type || '-', row.disabled ? 'warn' : 'info')}</td>
        <td>${escapeHtml(row.value)}</td>
        <td>${escapeHtml(row.ttl || '-')}</td>
        <td>${row.disabled ? tag('停用', 'warn') : tag('启用', 'ok')}</td>
      </tr>`);
    return section('服务日志', 'serviceLogs', '只聚焦 DHCP / DNS 服务本身的日志窗口、服务状态和规则预览，不再让空日志卡片占满页面', `
      <div class="grid-4">
        ${metricCard('DHCP 日志', fmtNumber((logs.dhcp || []).length), `DHCP 服务 ${fmtNumber((dhcp.servers || []).length)} 个`, '')}
        ${metricCard('DNS 日志', fmtNumber((logs.dns || []).length), `静态规则 ${fmtNumber(dnsTotalRuleCount)} 条`, '')}
        ${metricCard('DNS 状态', dns.running ? tag('启用', 'ok') : tag('未启用', 'danger'), '来自 RouterOS ip/dns', '')}
        ${metricCard('服务总览', `${fmtNumber((dhcp.servers || []).length)} / ${fmtNumber((dns.servers || []).length)}`, 'DHCP 服务 / DNS 上游', '')}
      </div>
      <div class="ops-page-stack" style="margin-top:12px">
        ${opsDenseTableCard('服务日志窗口', serviceEvents.length ? `最近 ${fmtNumber(serviceEvents.length)} 条 DHCP / DNS 日志` : '当前窗口没有 DHCP / DNS 事件', ['来源', '时间', '主题', '消息'], serviceRows, '当前未读取到 DHCP / DNS 服务日志')}
        <div class="ops-double">
          ${opsDenseTableCard('DHCP 服务状态', `${fmtNumber((dhcp.servers || []).length)} 个服务`, ['服务', '接口', '地址池', '租期', '状态'], serverRows, '当前未读取到 DHCP 服务状态')}
          ${opsCard('服务摘要', '当日志窗口为空时，用真实服务状态而不是空白来承接页面', opsStatTiles([
            { label: 'DHCP 地址池', value: fmtNumber((dhcp.pools || []).length), meta: `租约 ${fmtNumber((dhcp.leases || []).length)} 条` },
            { label: '运行中 DHCP', value: fmtNumber((dhcp.servers || []).filter((row) => row.running).length), meta: `总服务 ${fmtNumber((dhcp.servers || []).length)} 个` },
            { label: 'DNS 上游', value: fmtNumber((dns.servers || []).length), meta: (dns.servers || []).slice(0, 2).join(' / ') || '未读取到' },
            { label: 'DoH', value: dns.dohServer ? '已配置' : '未配置', meta: dns.dohServer ? escapeHtml(dns.dohServer) : '当前未启用' },
            { label: '缓存占用', value: `${fmtBytes(dns.cacheUsed || 0)} / ${fmtBytes(dns.cacheSize || 0)}`, meta: 'DNS 缓存当前状态' },
            { label: '规则总数', value: fmtNumber(dnsTotalRuleCount), meta: `预览 ${fmtNumber((dns.forwardRules || []).length)} 条` }
          ]), 'ops-info-card')}
        </div>
        ${opsDenseTableCard('DNS 静态规则预览', `显示 ${fmtNumber((dns.forwardRules || []).length)} / ${fmtNumber(dnsTotalRuleCount)} 条`, ['名称 / 正则', '类型', '目标值', 'TTL', '状态'], dnsPreviewRows, dnsTotalRuleCount ? '当前页没有可展示的规则预览' : '当前未读取到 DNS 静态规则')}
      </div>`);
  };
  window.renderServiceLogs = renderServiceLogs;

  const densityStyleV3 = document.createElement('style');
  densityStyleV3.textContent = `
    #interfaces .grid-4,
    #dns4 .grid-4,
    #dns6 .grid-4,
    #security .grid-4,
    #serviceLogs .grid-4 { gap: 8px; }
    #interfaces > .grid-4,
    #dhcp > .grid-4,
    #dns4 > .grid-4,
    #dns6 > .grid-4,
    #security > .grid-4,
    #serviceLogs > .grid-4,
    #terminals > .grid-4 {
      display: grid !important;
      grid-template-columns: repeat(4, minmax(220px, 1fr)) !important;
      align-items: stretch;
      min-width: 904px;
    }
    #interfaces > .grid-4 > .metric-card,
    #dhcp > .grid-4 > .metric-card,
    #dns4 > .grid-4 > .metric-card,
    #dns6 > .grid-4 > .metric-card,
    #security > .grid-4 > .metric-card,
    #serviceLogs > .grid-4 > .metric-card,
    #terminals > .grid-4 > .metric-card {
      min-width: 220px;
    }
    .section-summary-sticky,
    .arp-summary-sticky {
      overflow-x: auto;
      overflow-y: hidden;
    }
    .section-summary-sticky > .grid-4,
    .arp-summary-sticky > .grid-4 {
      grid-template-columns: repeat(4, minmax(220px, 1fr)) !important;
      min-width: 904px;
      align-items: stretch;
    }
    .section-summary-sticky > .grid-4 > .metric-card,
    .arp-summary-sticky > .grid-4 > .metric-card {
      min-width: 220px;
    }
    .section-summary-sticky > .grid-3,
    .arp-summary-sticky > .grid-3 {
      grid-template-columns: repeat(3, minmax(220px, 1fr)) !important;
      min-width: 676px;
      align-items: stretch;
    }
    .section-summary-sticky > .grid-2,
    .arp-summary-sticky > .grid-2 {
      grid-template-columns: repeat(2, minmax(220px, 1fr)) !important;
      min-width: 448px;
      align-items: stretch;
    }
    #interfaces .metric-card,
    #dns4 .metric-card,
    #dns6 .metric-card,
    #security .metric-card,
    #serviceLogs .metric-card { min-height: 0; }
    #interfaces .metric-value,
    #dns4 .metric-value,
    #dns6 .metric-value,
    #security .metric-value,
    #serviceLogs .metric-value { font-size: 20px; line-height: 1.15; }
    #interfaces .metric-foot,
    #dns4 .metric-foot,
    #dns6 .metric-foot,
    #security .metric-foot,
    #serviceLogs .metric-foot { gap: 6px; font-size: 11px; }
    #interfaces .ops-page-stack,
    #dns4 .ops-page-stack,
    #dns6 .ops-page-stack,
    #security .ops-page-stack,
    #serviceLogs .ops-page-stack { gap: 8px; }
    #interfaces .card-head,
    #dns4 .card-head,
    #dns6 .card-head,
    #security .card-head,
    #serviceLogs .card-head { padding: 8px 10px; min-height: 0; }
    #interfaces .card-body,
    #dns4 .card-body,
    #dns6 .card-body,
    #security .card-body,
    #serviceLogs .card-body { padding: 8px 10px 10px; }
    #interfaces .ops-double,
    #dns4 .ops-double,
    #dns6 .ops-double,
    #security .ops-double,
    #serviceLogs .ops-double { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    #interfaces .ops-stat-grid,
    #dns4 .ops-stat-grid,
    #dns6 .ops-stat-grid,
    #security .ops-stat-grid,
    #serviceLogs .ops-stat-grid { grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 6px; }
    #interfaces .ops-stat-tile,
    #dns4 .ops-stat-tile,
    #dns6 .ops-stat-tile,
    #security .ops-stat-tile,
    #serviceLogs .ops-stat-tile { padding: 7px 8px; }
    #interfaces .ops-table th,
    #interfaces .ops-table td,
    #dns4 .ops-table th,
    #dns4 .ops-table td,
    #dns6 .ops-table th,
    #dns6 .ops-table td,
    #security .ops-table th,
    #security .ops-table td,
    #serviceLogs .ops-table th,
    #serviceLogs .ops-table td { padding: 6px 7px; }
    #interfaces .chart-box,
    #dns4 .chart-box,
    #dns6 .chart-box,
    #security .chart-box,
    #serviceLogs .chart-box { padding: 8px; }
    #interfaces .line-trend-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
  `;
  document.head.appendChild(densityStyleV3);

  const acceptanceScrollParam = new URLSearchParams(window.location.search || '').get('acceptScroll');
  const acceptanceScrollY = Number(acceptanceScrollParam);
  if (Number.isFinite(acceptanceScrollY) && acceptanceScrollY > 0) {
    const applyAcceptanceScroll = () => {
      window.scrollTo(0, acceptanceScrollY);
      window.dispatchEvent(new Event('scroll'));
    };
    window.addEventListener('load', () => setTimeout(applyAcceptanceScroll, 400), { once: true });
    setTimeout(applyAcceptanceScroll, 1200);
  }

  renderInterfaces = function patchedRenderInterfacesDenseV3(snapshot) {
    currentInterfaceView = normalizeInterfaceView(currentInterfaceView);
    const interfaces = snapshot.interfaces || [];
    const rawPppoe = snapshot.pppoe || [];
    const pppoe = opsSortPppoeNamedRows(rawPppoe);
    const loadBalance = snapshot.loadBalance || {};
    const interfaceByName = Object.fromEntries(interfaces.map((row) => [row.name, row]));
    const virtualTypes = new Set(['wg', 'loopback', 'l2tp-out', 'vlan', 'macvlan']);
    const runningInterfaces = interfaces.filter((row) => row.running).length;
    const runningWan = pppoe.filter((row) => row.running).length;
    const runningLan = interfaces.filter((row) => row.role === 'LAN' && row.running).length;
    const virtualCount = interfaces.filter((row) => virtualTypes.has(String(row.type || '').toLowerCase())).length;
    const detectedHealthy = pppoe.filter((row) => row.running && row.addresses?.length && (row.routes || []).some((route) => route.active)).length;
    const abnormalLines = pppoe.filter((row) => {
      const parent = interfaceByName[row.parent] || {};
      const issueCount = Number(parent.rxDrop || 0) + Number(parent.txDrop || 0) + Number(parent.rxError || 0) + Number(parent.txError || 0);
      return !row.running || !row.addresses?.length || issueCount > 0 || !(row.routes || []).some((route) => route.active);
    }).length;
    const ipv6Interfaces = interfaces.filter((row) => (row.ips || []).some((ip) => String(ip || '').includes(':')));
    const sortedPppoe = pppoe;
    const busiestPppoe = rawPppoe.slice().sort((a, b) => totalTrafficRate(b) - totalTrafficRate(a));
    const sortedInterfaces = interfaces.slice().sort((a, b) => totalTrafficRate(b, 'txRate', 'rxRate') - totalTrafficRate(a, 'txRate', 'rxRate'));
    const lineTrendRows = getLineTrendRows(pppoe);
    const busiestLine = busiestPppoe[0];
    const totalWanUp = pppoe.reduce((sum, row) => sum + Number(row.upRate || 0), 0);
    const totalWanDown = pppoe.reduce((sum, row) => sum + Number(row.downRate || 0), 0);
    const dualStackInterfaces = interfaces.filter((row) => {
      const families = splitIpFamilies(row.ips || []);
      return families.ipv4.length && families.ipv6.length;
    }).length;
    const interfaceIssueCount = interfaces.filter((row) => Number(row.txDrop || 0) + Number(row.rxDrop || 0) + Number(row.txError || 0) + Number(row.rxError || 0) > 0).length;
    const pollSeconds = snapshot.meta?.pollSeconds || '-';
    const loadDistributionRows = opsSortPppoeNamedRows(loadBalance.distribution || []).map((row) => ({
      label: row.name,
      value: Number(row.share || 0),
      display: `${Number(row.share || 0).toFixed(1)}%`
    }));
    const realtimeLoadRows = sortedPppoe.slice(0, 8).map((row) => ({
      label: row.name,
      value: Math.max(1, totalTrafficRate(row)),
      display: fmtRate(totalTrafficRate(row))
    }));
    const loadDistributionBlock = loadDistributionRows.length
      ? opsBarStack(loadDistributionRows, { percentMode: true, emptyText: '当前未形成线路占比数据' })
      : opsBarStack(realtimeLoadRows, { emptyText: '当前未形成线路实时负载分布' });
    const readonlyNotice = interfaceReadonlyOpen
      ? `<div class="notice" style="margin-bottom:8px">当前页面保持只读监控模式，按钮仅用于切换视图和刷新当前页数据，不会提交任何配置。</div>`
      : '';
    const tabs = `
      <div class="ik-subtabs">
        <button class="ik-subtab ${currentInterfaceView === 'monitor' ? 'is-active' : ''}" type="button" data-interface-view="monitor">线路监控</button>
        <button class="ik-subtab ${currentInterfaceView === 'detect' ? 'is-active' : ''}" type="button" data-interface-view="detect">线路状态检测</button>
        <button class="ik-subtab ${currentInterfaceView === 'ipv6' ? 'is-active' : ''}" type="button" data-interface-view="ipv6">IPv6 线路详情</button>
      </div>`;
    const toolbar = `
      <div class="ik-data-toolbar">
        <div class="ik-ghost-group">
          <span class="ik-ghost-pill is-active">${escapeHtml(interfaceViews[currentInterfaceView].title)}</span>
          <button class="ik-ghost-pill" type="button" data-interface-refresh="current">刷新当前页数据</button>
        </div>
        <div class="ik-ghost-group">
          <button class="ik-ghost-pill ${interfaceReadonlyOpen ? 'is-active' : ''}" type="button" data-interface-readonly-toggle="true">只读监控</button>
        </div>
      </div>`;
    const lineRows = sortedPppoe.map((row) => `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${statusTag(row.running)}</td>
        <td>${addressCell(row.addresses || [])}</td>
        <td>${fmtRate(row.upRate)}</td>
        <td>${fmtRate(row.downRate)}</td>
        <td>${fmtBytes(row.txBytes)}</td>
        <td>${fmtBytes(row.rxBytes)}</td>
        <td>${routeSummaryCell(row.routes || [])}</td>
        <td>${escapeHtml(row.parent || '-')}</td>
      </tr>`);
    const ifaceRows = sortedInterfaces.map((row) => {
      const gatewayValues = (row.gateways || []).slice(0, 1);
      const addressSummary = row.ips?.length
        ? addressCell(row.ips || [])
        : gatewayValues.length
          ? gatewayCell(gatewayValues)
          : opsTwoLineCell('-', '');
      return `
        <tr>
          <td>${escapeHtml(row.name)}</td>
          <td>${tag(row.role || '-', row.role === 'WAN' ? 'info' : 'ok')}</td>
          <td>${statusTag(row.running, row.disabled)}</td>
          <td>${fmtRate(row.txRate)}</td>
          <td>${fmtRate(row.rxRate)}</td>
          <td>${fmtBytes(row.txBytes)}</td>
          <td>${fmtBytes(row.rxBytes)}</td>
          <td>${addressSummary}</td>
          <td>${opsTwoLineCell(escapeHtml(row.mac || '-'), `丢 ${fmtNumber(Number(row.txDrop || 0) + Number(row.rxDrop || 0))} / 错 ${fmtNumber(Number(row.txError || 0) + Number(row.rxError || 0))}`)}</td>
        </tr>`;
    });
    const diagnostics = sortedPppoe.map((row) => buildLineDiagnostic(row, interfaceByName));
    const diagnosticsByName = Object.fromEntries(diagnostics.map((item) => [item.row.name, item]));
    const diagnosticQueue = diagnostics
      .slice()
      .sort((a, b) => {
        const diff = lineDiagnosticRank(a) - lineDiagnosticRank(b);
        return diff !== 0 ? diff : opsGetPppoeDisplayOrder(a.row.name) - opsGetPppoeDisplayOrder(b.row.name);
      });
    const diagnosticRows = diagnosticQueue.map((item, index) => `
      <tr>
        <td>${fmtNumber(index + 1)}</td>
        <td>${tag(item.stateLabel, item.level)}</td>
        <td>${opsTwoLineCell(escapeHtml(item.row.name), escapeHtml(item.row.parent || '-'))}</td>
        <td>${fmtNumber(item.score)}</td>
        <td>${opsTwoLineCell(tag(item.role.label, item.role.level), item.activeTables.length ? item.activeTables.map(escapeHtml).join(' / ') : '无活动表')}</td>
        <td>${diagnosticReasonCell(item)}</td>
        <td>${escapeHtml(item.action)}</td>
        <td>${opsTwoLineCell(`拨号 ${item.row.running ? '是' : '否'} / 地址 ${item.hasAddress ? '是' : '否'}`, `路由 ${item.hasActiveRoute ? '是' : '否'}`)}</td>
        <td>${packetSummaryCell(item.dropTotal, item.errorTotal)}</td>
        <td>${opsTwoLineCell(fmtRate(item.row.upRate), fmtRate(item.row.downRate))}</td>
      </tr>`);
    const roleRows = diagnostics.map((item) => `
      <tr>
        <td>${escapeHtml(item.row.name)}</td>
        <td>${tag(item.role.label, item.role.level)}</td>
        <td>${item.activeTables.length ? item.activeTables.map(escapeHtml).join('<br>') : '-'}</td>
        <td>${item.distances.length ? item.distances.map(escapeHtml).join('<br>') : '-'}</td>
        <td>${escapeHtml(item.row.parent || '-')}</td>
        <td>${yesNoTag(item.hasAddress, '已拿到', '未拿到')}</td>
        <td>${packetSummaryCell(item.dropTotal, item.errorTotal)}</td>
      </tr>`);
    const dangerousLines = diagnostics.filter((item) => item.level === 'danger').length;
    const watchLines = diagnostics.filter((item) => item.level === 'warn').length;
    const usableLines = diagnostics.filter((item) => item.level === 'ok').length;
    const linesWithAddress = diagnostics.filter((item) => item.hasAddress).length;
    const linesWithActiveRoute = diagnostics.filter((item) => item.hasActiveRoute).length;
    const activeRouteTables = Array.from(new Set(diagnostics.flatMap((item) => item.activeTables))).filter(Boolean);
    const globalRoleLines = diagnostics.filter((item) => item.role.label.includes('全局')).length;
    const strategyRoleLines = diagnostics.filter((item) => item.role.label.includes('策略')).length;
    const ipv6LineCount = pppoe.filter((row) => splitIpFamilies(row.addresses || []).ipv6.length).length;
    const zeroTrafficLines = pppoe.filter((row) => totalTrafficRate(row) <= 0).length;
    const hotTrafficLines = pppoe.filter((row) => totalTrafficRate(row) >= 1024 * 1024).length;
    const parentIssueLines = diagnostics.filter((item) => item.dropTotal > 0 || item.errorTotal > 0).length;
    const lineFocusRows = sortedPppoe.slice(0, 8).map((row) => {
      const item = diagnosticsByName[row.name];
      return `
        <tr>
          <td>${escapeHtml(row.name)}</td>
          <td>${opsTwoLineCell(item ? tag(item.role.label, item.role.level) : statusTag(row.running), escapeHtml(row.parent || '-'))}</td>
          <td>${opsTwoLineCell(fmtRate(row.upRate), fmtRate(row.downRate))}</td>
          <td>${fmtRate(totalTrafficRate(row))}</td>
        </tr>`;
    });
    const interfaceHotRows = sortedInterfaces.slice(0, 8).map((row) => {
      const families = splitIpFamilies(row.ips || []);
      const dropTotal = Number(row.txDrop || 0) + Number(row.rxDrop || 0);
      const errorTotal = Number(row.txError || 0) + Number(row.rxError || 0);
      return `
        <tr>
          <td>${escapeHtml(row.name)}</td>
          <td>${opsTwoLineCell(tag(row.role || '-', row.role === 'WAN' ? 'info' : 'ok'), statusTag(row.running, row.disabled))}</td>
          <td>${opsTwoLineCell(fmtRate(row.txRate), fmtRate(row.rxRate))}</td>
          <td>${packetSummaryCell(dropTotal, errorTotal)}</td>
          <td>${opsTwoLineCell(`${fmtNumber(families.ipv4.length)} v4`, `${fmtNumber(families.ipv6.length)} v6`)}</td>
        </tr>`;
    });
    const riskFocusRows = diagnosticQueue.slice(0, 8).map((item) => `
      <tr>
        <td>${escapeHtml(item.row.name)}</td>
        <td>${opsTwoLineCell(tag(item.stateLabel, item.level), `${fmtNumber(item.score)} 分`)}</td>
        <td>${opsTwoLineCell(escapeHtml(item.action || '等待处理建议'), escapeHtml(item.row.parent || '-'))}</td>
        <td>${opsTwoLineCell(fmtRate(item.row.upRate), fmtRate(item.row.downRate))}</td>
      </tr>`);
    const parentHealthRows = diagnosticQueue.slice(0, 8).map((item) => {
      const parent = interfaceByName[item.row.parent] || {};
      const parentFamilies = splitIpFamilies(parent.ips || []);
      const parentDrop = Number(parent.txDrop || 0) + Number(parent.rxDrop || 0);
      const parentError = Number(parent.txError || 0) + Number(parent.rxError || 0);
      const upRate = parent.name ? parent.txRate : item.row.upRate;
      const downRate = parent.name ? parent.rxRate : item.row.downRate;
      return `
        <tr>
          <td>${escapeHtml(parent.name || item.row.parent || item.row.name || '-')}</td>
          <td>${opsTwoLineCell(escapeHtml(item.row.name), tag(item.role.label, item.role.level))}</td>
          <td>${opsTwoLineCell(fmtRate(upRate), fmtRate(downRate))}</td>
          <td>${packetSummaryCell(parentDrop, parentError)}</td>
          <td>${opsTwoLineCell(`${fmtNumber(parentFamilies.ipv4.length)} v4`, `${fmtNumber(parentFamilies.ipv6.length)} v6`)}</td>
        </tr>`;
    });
    const ipv6Rows = ipv6Interfaces
      .slice()
      .sort((a, b) => totalTrafficRate(b, 'txRate', 'rxRate') - totalTrafficRate(a, 'txRate', 'rxRate'))
      .map((row) => {
        const ipv6Addresses = splitIpFamilies(row.ips || []).ipv6;
        const ipv6Gateways = (row.gateways || []).filter((value) => String(value || '').includes(':'));
        return `
          <tr>
            <td>${escapeHtml(row.name)}</td>
            <td>${tag(row.role || '-', row.role === 'WAN' ? 'info' : 'ok')}</td>
            <td>${statusTag(row.running, row.disabled)}</td>
            <td>${addressCell(ipv6Addresses)}</td>
            <td>${gatewayCell(ipv6Gateways)}</td>
            <td>${fmtRate(row.txRate)}</td>
            <td>${fmtRate(row.rxRate)}</td>
          </tr>`;
      });
    const ipv6HotRows = ipv6Interfaces
      .slice()
      .sort((a, b) => totalTrafficRate(b, 'txRate', 'rxRate') - totalTrafficRate(a, 'txRate', 'rxRate'))
      .slice(0, 8)
      .map((row) => {
        const ipv6Addresses = splitIpFamilies(row.ips || []).ipv6.length;
        const ipv6Gateways = (row.gateways || []).filter((value) => String(value || '').includes(':')).length;
        return `
          <tr>
            <td>${escapeHtml(row.name)}</td>
            <td>${opsTwoLineCell(tag(row.role || '-', row.role === 'WAN' ? 'info' : 'ok'), statusTag(row.running, row.disabled))}</td>
            <td>${opsTwoLineCell(fmtRate(row.txRate), fmtRate(row.rxRate))}</td>
            <td>${opsTwoLineCell(`${fmtNumber(ipv6Addresses)} 地址`, `${fmtNumber(ipv6Gateways)} 网关`)}</td>
          </tr>`;
      });

    let body = '';
    if (currentInterfaceView === 'detect') {
      body = `
        ${readonlyNotice}
        ${toolbar}
        <div class="grid-4" style="margin-top:8px">
          ${metricCard('可用出口', fmtNumber(usableLines), `总线路 ${fmtNumber(pppoe.length)} 条`, '健康闭环完整')}
          ${metricCard('待观察', fmtNumber(watchLines), '有累计丢包或轻微异常', '先观察趋势')}
          ${metricCard('故障优先', fmtNumber(dangerousLines), '离线或无活动默认路由', '需要优先处理')}
          ${metricCard('路由覆盖', fmtNumber(activeRouteTables.length), activeRouteTables.length ? activeRouteTables.slice(0, 4).map(escapeHtml).join(' / ') : '无活动表', '按活动默认路由统计')}
        </div>
        <div class="ops-workbench" style="margin-top:8px">
          <div class="ops-workbench-grid">
            ${opsDenseTableCard('故障优先队列', `${fmtNumber(diagnosticQueue.length)} 条线路，按诊断分值与顺位紧凑展示`, ['#', '状态', '线路 / 父接口', '分', '出口角色', '原因', '动作', '闭环', '丢 / 错', '上 / 下'], diagnosticRows, '当前未读取到线路诊断数据', 'ops-compact-density', 'ops-compact-table')}
            <div class="ops-workbench-side">
              ${opsCard('线路诊断摘要', '先判断闭环是否完整，再决定要去看拨号、地址、路由还是父接口错误', opsStatTiles([
                { label: '拨号闭环', value: `${fmtNumber(runningWan)} / ${fmtNumber(pppoe.length)}`, meta: 'PPPoE 当前在线' },
                { label: '地址闭环', value: `${fmtNumber(linesWithAddress)} / ${fmtNumber(pppoe.length)}`, meta: '已拿到公网或 IPv6 地址' },
                { label: '路由闭环', value: `${fmtNumber(linesWithActiveRoute)} / ${fmtNumber(pppoe.length)}`, meta: '存在活动默认路由' },
                { label: '父接口错误', value: fmtNumber(diagnostics.filter((item) => item.errorTotal > 0).length), meta: '错误包非 0 才计入故障' },
                { label: '策略出口', value: fmtNumber(diagnostics.filter((item) => item.role.label.includes('策略')).length), meta: '非 main 表活动出口' },
                { label: '采样节奏', value: `${escapeHtml(String(pollSeconds))}s / 点`, meta: `${fmtNumber(lineTrendRows.length)} 条线路趋势同步` }
              ]), 'ops-info-card')}
              ${opsDenseTableCard('重点关注线路', '把动作建议、父接口和吞吐压成短表，避免诊断页右侧被长竖列撑高', ['线路', '状态 / 分', '动作 / 父接口', '上 / 下'], riskFocusRows, '当前未读取到重点关注线路', 'ops-compact-density', 'ops-compact-table')}
            </div>
          </div>
          <div class="ops-split">
            ${opsDenseTableCard('线路角色矩阵', '看每条 PPPoE 在路由体系里扮演什么角色，而不是重复接口吞吐清单', ['线路', '出口角色', '活动表', '距离', '父接口', '地址', '丢 / 错'], roleRows, '当前未读取到线路角色数据', 'ops-compact-density', 'ops-compact-table')}
            ${opsCard('线路趋势参照', `${fmtNumber(lineTrendRows.length)} 条线路同步展示，作为诊断参照系`, renderLineTrendGrid(lineTrendRows, { emptyText: '当前未采集到可展示的线路趋势' }), 'ops-info-card')}
          </div>
        </div>`;
    } else if (currentInterfaceView === 'ipv6') {
      body = `
        ${readonlyNotice}
        ${toolbar}
        <div class="grid-4" style="margin-top:8px">
          ${metricCard('IPv6 接口', fmtNumber(ipv6Interfaces.length), '读取到真实 IPv6 地址的接口', '')}
          ${metricCard('在线 IPv6 接口', fmtNumber(ipv6Interfaces.filter((row) => row.running).length), '链路运行状态', '')}
          ${metricCard('WAN IPv6 线路', fmtNumber(pppoe.filter((row) => splitIpFamilies(row.addresses || []).ipv6.length).length), '带 IPv6 地址的宽带', '')}
          ${metricCard('IPv6 网关接口', fmtNumber(ipv6Interfaces.filter((row) => (row.gateways || []).some((value) => String(value || '').includes(':'))).length), '可见 IPv6 路由目标', '')}
        </div>
        <div class="ops-workbench" style="margin-top:8px">
          <div class="ops-workbench-grid">
            ${opsDenseTableCard('IPv6 接口明细', `${fmtNumber(ipv6Interfaces.length)} 个接口，按实时吞吐排序`, ['接口', '角色', '状态', 'IPv6 地址', 'IPv6 网关', '实时上行速率', '实时下行速率'], ipv6Rows, '当前未读取到 IPv6 接口数据', 'ops-compact-density', 'ops-compact-table')}
            <div class="ops-workbench-side">
              ${opsCard('IPv6 接口摘要', '把 IPv6 地址可见性、网关覆盖和链路在线性压成固定宽屏摘要', opsStatTiles([
                { label: 'LAN IPv6 接口', value: fmtNumber(ipv6Interfaces.filter((row) => row.role === 'LAN').length), meta: '桥 / VLAN / 虚拟接口' },
                { label: 'WAN IPv6 接口', value: fmtNumber(ipv6Interfaces.filter((row) => row.role === 'WAN').length), meta: '拨号侧接口' },
                { label: '具备 IPv6 网关', value: fmtNumber(ipv6Interfaces.filter((row) => (row.gateways || []).some((value) => String(value || '').includes(':'))).length), meta: '存在 IPv6 路由目标' },
                { label: '双栈接口', value: fmtNumber(dualStackInterfaces), meta: '同时具备 IPv4 / IPv6' },
                { label: '有实时流量', value: fmtNumber(ipv6Interfaces.filter((row) => totalTrafficRate(row, 'txRate', 'rxRate') > 0).length), meta: '当前存在吞吐' },
                { label: '采样节奏', value: `${escapeHtml(String(pollSeconds))}s / 点`, meta: '与主监控页保持一致' }
              ]), 'ops-info-card')}
              ${opsDenseTableCard('IPv6 热点接口', '把 IPv6 地址、网关和实时吞吐压成短表，避免右侧形成长竖列', ['接口', '角色 / 状态', '上 / 下', '地址 / 网关'], ipv6HotRows, '当前未读取到 IPv6 热点接口', 'ops-compact-density', 'ops-compact-table')}
            </div>
          </div>
        </div>`;
    } else {
      body = `
        ${readonlyNotice}
        ${toolbar}
        <div class="grid-4" style="margin-top:8px">
          ${metricCard('在线接口', `${fmtNumber(runningInterfaces)} / ${fmtNumber(interfaces.length)}`, '全部接口运行情况', '')}
          ${metricCard('在线宽带', `${fmtNumber(runningWan)} / ${fmtNumber(pppoe.length)}`, 'PPPoE 线路在线情况', '')}
          ${metricCard('健康宽带', fmtNumber(detectedHealthy), '在线且具备地址与活动默认路由', '')}
          ${metricCard('异常线路', fmtNumber(abnormalLines), '需要优先排查的线路', '')}
        </div>
        <div class="ops-workbench" style="margin-top:8px">
          <div class="ops-workbench-grid interfaces-monitor-grid">
            ${opsCard('线路运行主屏', '把逐线趋势、当前最忙出口和负载分布压进同一块值班主屏', `
              ${opsKpiStrip([
                { label: 'WAN 总上行', value: fmtRate(totalWanUp), meta: `${fmtNumber(pppoe.length)} 条线路聚合` },
                { label: 'WAN 总下行', value: fmtRate(totalWanDown), meta: busiestLine ? `最繁忙 ${escapeHtml(busiestLine.name)}` : '暂无主线路' },
                { label: '采样节奏', value: `${escapeHtml(String(pollSeconds))}s / 点`, meta: `健康 ${fmtNumber(detectedHealthy)} / 异常 ${fmtNumber(abnormalLines)}` }
              ])}
              <div class="ops-section-grid interfaces-monitor-main" style="margin-top:8px">
                <div class="interfaces-trend-stack">
                  <div class="interfaces-inline-panel">
                    <div class="interfaces-inline-head">
                      <div class="interfaces-inline-title">线路趋势带宽</div>
                      <div class="interfaces-inline-subtle">${fmtNumber(lineTrendRows.length)} 条线路同步采样</div>
                    </div>
                    ${renderLineTrendGrid(lineTrendRows, { emptyText: '当前未采集到可展示的线路趋势' })}
                  </div>
                  <div class="interfaces-inline-panel interfaces-monitor-facts">
                    <div class="interfaces-inline-head">
                      <div class="interfaces-inline-title">线路闭环快照</div>
                      <div class="interfaces-inline-subtle">把角色、地址族和父接口异常直接压在趋势下面</div>
                    </div>
                    ${opsStatTiles([
                      { label: '全局出口', value: fmtNumber(globalRoleLines), meta: '具备 main 默认路由' },
                      { label: '策略出口', value: fmtNumber(strategyRoleLines), meta: '命中非 main 表' },
                      { label: '带 IPv6 宽带', value: fmtNumber(ipv6LineCount), meta: '宽带地址带 IPv6' },
                      { label: '零流量线路', value: fmtNumber(zeroTrafficLines), meta: '当前上下行均为 0' },
                      { label: '高负载线路', value: fmtNumber(hotTrafficLines), meta: '瞬时吞吐 ≥ 1 MB/s' },
                      { label: '父接口丢错', value: fmtNumber(parentIssueLines), meta: '承载接口出现丢错' }
                    ])}
                  </div>
                </div>
                <div class="ops-panel-stack">
                  <div class="interfaces-inline-panel">
                    <div class="interfaces-inline-head">
                      <div class="interfaces-inline-title">重点线路快扫</div>
                      <div class="interfaces-inline-subtle">把速率、角色和父接口压成短表，避免主屏纵向拉长</div>
                    </div>
                    ${opsDenseTable(['线路', '角色 / 父接口', '上 / 下', '合计'], lineFocusRows, '当前未读取到重点线路', 'ops-compact-table')}
                  </div>
                  <div class="interfaces-inline-panel interfaces-monitor-facts">
                    <div class="interfaces-inline-head">
                      <div class="interfaces-inline-title">速判补位</div>
                      <div class="interfaces-inline-subtle">把默认路由、地址和关注级别压成二次判断层</div>
                    </div>
                    ${opsStatTiles([
                      { label: '最繁忙线路', value: busiestLine ? escapeHtml(busiestLine.name) : '-', meta: busiestLine ? fmtRate(totalTrafficRate(busiestLine)) : '暂无实时吞吐' },
                      { label: '带地址线路', value: fmtNumber(linesWithAddress), meta: `${fmtNumber(pppoe.length)} 条宽带中已拿到地址` },
                      { label: '活动默认路由', value: fmtNumber(linesWithActiveRoute), meta: activeRouteTables.length ? activeRouteTables.slice(0, 3).map(escapeHtml).join(' / ') : '当前无活动表' },
                      { label: '待重点关注', value: fmtNumber(watchLines + dangerousLines), meta: `warn ${fmtNumber(watchLines)} / danger ${fmtNumber(dangerousLines)}` }
                    ])}
                  </div>
                </div>
              </div>`, 'ops-info-card')}
            <div class="ops-workbench-side interfaces-monitor-side">
              ${opsCard('接口覆盖摘要', '把在线性、双栈覆盖和错误接口压成固定宽屏摘要', opsStatTiles([
                { label: '在线 LAN', value: fmtNumber(runningLan), meta: `LAN 总数 ${fmtNumber(interfaces.filter((row) => row.role === 'LAN').length)}` },
                { label: '虚拟接口', value: fmtNumber(virtualCount), meta: 'VLAN / WG / Loopback / L2TP' },
                { label: '双栈接口', value: fmtNumber(dualStackInterfaces), meta: '同时具备 IPv4 / IPv6' },
                { label: 'IPv6 接口', value: fmtNumber(ipv6Interfaces.length), meta: '包含真实 IPv6 地址' },
                { label: '有丢错接口', value: fmtNumber(interfaceIssueCount), meta: '累计丢包或错包非 0' },
                { label: '活动路由表', value: fmtNumber(activeRouteTables.length), meta: activeRouteTables.length ? activeRouteTables.slice(0, 3).map(escapeHtml).join(' / ') : '无活动表' }
              ]), 'ops-info-card')}
              ${opsCard('线路负载分布', loadDistributionRows.length ? `${fmtNumber(loadDistributionRows.length)} 条线路占比` : '按实时吞吐自动排序', loadDistributionBlock, 'ops-info-card')}
              ${opsDenseTableCard('父接口健康', '把承载接口、线路和丢错压成短表，避免右侧长竖列把首屏撑空', ['父接口', '线路 / 角色', '上 / 下', '丢 / 错', '地址族'], parentHealthRows, '当前未读取到父接口健康信息', 'ops-compact-density', 'ops-compact-table')}
            </div>
          </div>
          <div class="ops-split">
            ${opsDenseTableCard('宽带实时流量', `${fmtNumber(sortedPppoe.length)} 条宽带，固定顺序展示状态、地址和活动路由`, ['线路', '状态', 'IP 地址', '实时上行速率', '实时下行速率', '累计上行流量', '累计下行流量', '活动路由', '父接口'], lineRows, '当前未读取到宽带线路数据', 'ops-compact-density', 'ops-compact-table')}
            ${opsDenseTableCard('接口热区', '把吞吐、丢错和地址族压成短表，不再用长竖列把下半屏撑长', ['接口', '角色 / 状态', '上 / 下', '丢 / 错', '地址族'], interfaceHotRows, '当前未读取到接口热区', 'ops-compact-density', 'ops-compact-table')}
          </div>
          ${opsDenseTableCard('接口吞吐明细', `${fmtNumber(sortedInterfaces.length)} 个接口，按实时吞吐排序`, ['接口', '角色', '状态', '实时上行速率', '实时下行速率', '累计上行流量', '累计下行流量', 'IP / 网关', 'MAC / 丢包错误'], ifaceRows, '当前未读取到接口数据', 'ops-compact-density', 'ops-compact-table')}
        </div>`;
    }

    return section('接口总览', 'interfaces', interfaceViews[currentInterfaceView].tip, `
      <div class="card">
        <div class="card-body">
          ${tabs}
          ${body}
        </div>
      </div>`);
  };
  window.renderInterfaces = renderInterfaces;

  renderDnsV4 = function patchedRenderDnsV4DenseV3(snapshot) {
    const dns = snapshot.dns || {};
    const previewRows = Array.isArray(dns.forwardRules) ? dns.forwardRules : [];
    const browserLoaded = dnsRuleBrowser.loaded;
    const browserRows = browserLoaded ? (dnsRuleBrowser.rows || []) : previewRows;
    const visibleRuleCount = browserLoaded
      ? Number(dnsRuleBrowser.visibleRuleCount || browserRows.length || 0)
      : Number(dns.visibleRuleCount || browserRows.length || 0);
    const totalRuleCount = browserLoaded
      ? Number(dnsRuleBrowser.totalCount || dns.forwardRuleCount || visibleRuleCount || 0)
      : Number(dns.forwardRuleCount || visibleRuleCount || 0);
    const effectiveLimit = Math.max(1, Number(browserLoaded ? dnsRuleBrowser.limit : DNS_RULE_PAGE_SIZE) || DNS_RULE_PAGE_SIZE);
    const effectiveOffset = browserLoaded ? Math.max(0, Number(dnsRuleBrowser.offset || 0)) : 0;
    const totalPages = totalRuleCount > 0 ? Math.max(1, Math.ceil(totalRuleCount / effectiveLimit)) : 1;
    const currentPage = totalRuleCount > 0 ? Math.min(totalPages, Math.floor(effectiveOffset / effectiveLimit) + 1) : 1;
    const maxOffset = totalRuleCount > 0 ? Math.max(0, (totalPages - 1) * effectiveLimit) : 0;
    const canPrev = browserLoaded && effectiveOffset > 0 && !dnsRuleBrowser.loading;
    const canNext = browserLoaded && effectiveOffset < maxOffset && !dnsRuleBrowser.loading;
    const browserStateText = browserLoaded
      ? `第 ${fmtNumber(currentPage)} / ${fmtNumber(totalPages)} 页`
      : dnsRuleBrowser.loading
        ? '正在加载全量规则浏览'
        : dnsRuleBrowser.error
          ? '分页读取失败，已回退快照预览'
          : '快照预览';
    const ruleEmptyText = totalRuleCount
      ? dnsRuleBrowser.loading
        ? '正在读取当前页 DNS 静态规则...'
        : dnsRuleBrowser.error
          ? '当前页规则读取失败，已回退显示快照预览'
          : '当前页没有可展示的 DNS 静态规则'
      : '当前未读取到 DNS 静态规则';
    const browserNotice = dnsRuleBrowser.error
      ? `<div class="notice" style="margin-bottom:8px">DNS 静态规则分页读取失败：${escapeHtml(dnsRuleBrowser.error)}，当前回退为快照预览。</div>`
      : dnsRuleBrowser.loading
        ? `<div class="notice" style="margin-bottom:8px">正在读取 DNS 静态规则第 ${fmtNumber(currentPage)} 页，完成后会自动刷新。</div>`
        : '';
    const ruleRows = browserRows.map((row) => `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${tag(row.type || '-', row.disabled ? 'warn' : 'info')}</td>
        <td>${escapeHtml(row.value)}</td>
        <td>${escapeHtml(row.ttl || '-')}</td>
        <td>${row.disabled ? tag('停用', 'warn') : tag('启用', 'ok')}</td>
        <td>${escapeHtml(row.comment || '-')}</td>
      </tr>`);
    return section('DNS IPv4', 'dns4', '上游 DNS、DoH、缓存与静态规则只读监控', `
      <div class="grid-4">
        ${metricCard('DNS 状态', dns.running ? tag('启用', 'ok') : tag('未启用', 'danger'), `上游 DNS ${fmtNumber((dns.servers || []).length)} 个`, dns.dohServer ? 'DoH 已配置' : 'DoH 未配置')}
        ${metricCard('缓存占用', fmtBytes(dns.cacheUsed || 0), `缓存容量 ${fmtBytes(dns.cacheSize || 0)}`, '')}
        ${metricCard('静态规则总数', fmtNumber(totalRuleCount), `当前页 ${fmtNumber(visibleRuleCount)} 条`, `停用 ${fmtNumber(dns.disabledForwardRuleCount || 0)} 条`)}
        ${metricCard('规则浏览状态', browserStateText, dnsRuleBrowser.loading ? '正在刷新规则页' : '规则浏览可用', dnsRuleBrowser.error ? '最近一次分页失败' : '')}
      </div>
      <div class="ops-page-stack" style="margin-top:8px">
        ${opsCard('DNS 服务摘要', '把状态、缓存、DoH 与规则浏览集中成一条主信息流', opsStatTiles([
          { label: '上游 DNS', value: fmtNumber((dns.servers || []).length), meta: (dns.servers || []).slice(0, 2).join(' / ') || '未读取到' },
          { label: 'DoH', value: dns.dohServer ? '已配置' : '未配置', meta: dns.dohServer ? escapeHtml(dns.dohServer) : '当前未启用 DoH' },
          { label: '证书校验', value: dns.dohServer ? (dns.verifyDohCert ? '开启' : '关闭') : '-', meta: dns.dohServer ? 'DoH 证书校验状态' : '当前未启用 DoH' },
          { label: '缓存占用率', value: dns.cacheSize ? `${((Number(dns.cacheUsed || 0) / Math.max(1, Number(dns.cacheSize || 0))) * 100).toFixed(1)}%` : '-', meta: `${fmtBytes(dns.cacheUsed || 0)} / ${fmtBytes(dns.cacheSize || 0)}` },
          { label: '当前页显示', value: fmtNumber(visibleRuleCount), meta: `总数 ${fmtNumber(totalRuleCount)} 条` },
          { label: '规则浏览', value: browserStateText, meta: dns.forwardRuleSample ? '快照预览 + 分页读取' : '快照预览' }
        ]), 'ops-info-card')}
        ${opsCard('上游 DNS / DoH 参数', '所有字段均来自 RouterOS 可读参数', infoGrid([
          { k: '上游 DNS', v: compactListHtml(dns.servers || [], 3) },
          { k: 'DoH 服务器', v: dns.dohServer ? escapeHtml(dns.dohServer) : '未配置' },
          { k: '证书校验', v: dns.dohServer ? (dns.verifyDohCert ? tag('开启', 'ok') : tag('关闭', 'warn')) : '-' },
          { k: '缓存容量', v: `${fmtBytes(dns.cacheUsed || 0)} / ${fmtBytes(dns.cacheSize || 0)}` }
        ]), 'ops-info-card')}
        <div class="card">
          <div class="card-head">
            <div class="card-title">DNS 静态规则 / 转发规则</div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end">
              <span class="subtle">${browserStateText}，当前显示 ${fmtNumber(visibleRuleCount)} / ${fmtNumber(totalRuleCount)} 条</span>
              <button class="action-btn" type="button" data-dns-rules-refresh ${dnsRuleBrowser.loading ? 'disabled' : ''}>刷新当前页</button>
              <button class="action-btn" type="button" data-dns-rules-page="prev" ${canPrev ? '' : 'disabled'}>上一页</button>
              <button class="action-btn" type="button" data-dns-rules-page="next" ${canNext ? '' : 'disabled'}>下一页</button>
            </div>
          </div>
          <div class="card-body">
            ${browserNotice}
            ${opsDenseTable(['名称 / 正则', '类型', '目标值', 'TTL', '状态', '备注'], ruleRows, ruleEmptyText)}
          </div>
        </div>
      </div>`);
  };
  window.renderDnsV4 = renderDnsV4;

  renderDnsV6 = function patchedRenderDnsV6DenseV3(snapshot) {
    const dns = snapshot.dns || {};
    const ndList = dns.ipv6Nd || [];
    const dhcpClients = dns.ipv6DhcpClients || [];
    const enabledNdCount = ndList.filter((row) => row.advertiseDns).length;
    const managedNdCount = ndList.filter((row) => row.managed).length;
    const otherConfigCount = ndList.filter((row) => row.otherConfig).length;
    const boundPrefixClients = dhcpClients.filter((row) => row.status === 'bound').length;
    const peerDnsClients = dhcpClients.filter((row) => row.usePeerDns).length;
    const ndRows = ndList.map((row) => `
      <tr>
        <td>${escapeHtml(row.interface)}</td>
        <td>${row.advertiseDns ? tag('开启', 'ok') : tag('关闭', 'warn')}</td>
        <td>${compactListHtml(row.dnsServers || [], 2)}</td>
        <td>${opsTwoLineCell(row.managed ? 'Managed 开' : 'Managed 关', row.otherConfig ? 'Other 开' : 'Other 关')}</td>
        <td>${escapeHtml(row.raLifetime || '-')}</td>
      </tr>`);
    const dhcpClientRows = dhcpClients.map((row) => `
      <tr>
        <td>${escapeHtml(row.interface)}</td>
        <td>${tag(row.status || '-', row.status === 'bound' ? 'ok' : 'warn')}</td>
        <td>${escapeHtml(row.pool || '-')}</td>
        <td>${escapeHtml(row.prefix || '-')}</td>
        <td>${opsTwoLineCell(row.usePeerDns ? 'Peer DNS 开' : 'Peer DNS 关', row.addDefaultRoute ? `默认路由 ${escapeHtml(row.defaultRouteDistance || '-')}` : '默认路由关')}</td>
      </tr>`);
    const hasAnyIpv6Data = ndList.length || dhcpClients.length;
    return section('DNS IPv6', 'dns6', 'IPv6 ND、RA 与 DHCPv6 Prefix 纵向紧凑展示', `
      <div class="grid-4">
        ${metricCard('ND 接口数', fmtNumber(ndList.length), `广播 DNS ${fmtNumber(enabledNdCount)} 个`, '')}
        ${metricCard('Managed / Other', `${fmtNumber(managedNdCount)} / ${fmtNumber(otherConfigCount)}`, 'RA 标志位统计', '')}
        ${metricCard('DHCPv6 Client', fmtNumber(dhcpClients.length), `Peer DNS ${fmtNumber(peerDnsClients)} 个`, '')}
        ${metricCard('Prefix 已绑定', fmtNumber(boundPrefixClients), `客户端总数 ${fmtNumber(dhcpClients.length)} 个`, '')}
      </div>
      <div class="ops-page-stack" style="margin-top:8px">
        ${hasAnyIpv6Data
          ? `
            ${opsCard('IPv6 DNS 摘要', '不再左右平铺大空表，改成纵向的真实数据流', opsStatTiles([
              { label: '广播 DNS 接口', value: fmtNumber(enabledNdCount), meta: `ND 接口总数 ${fmtNumber(ndList.length)}` },
              { label: 'Managed / Other', value: `${fmtNumber(managedNdCount)} / ${fmtNumber(otherConfigCount)}`, meta: 'RA 标志位' },
              { label: 'Prefix 已绑定', value: fmtNumber(boundPrefixClients), meta: `客户端总数 ${fmtNumber(dhcpClients.length)}` },
              { label: 'Peer DNS 客户端', value: fmtNumber(peerDnsClients), meta: '使用对端 DNS 的 DHCPv6 Client' }
            ]), 'ops-info-card')}
            ${opsDenseTableCard('IPv6 ND 广播接口', `${fmtNumber(ndList.length)} 个接口`, ['接口', '广播 DNS', '显式 DNS', 'RA 标志', '生存期'], ndRows, '当前未读取到 IPv6 ND 广播配置')}
            ${opsDenseTableCard('IPv6 DHCPv6 Prefix 客户端', `${fmtNumber(dhcpClients.length)} 个客户端`, ['接口', '状态', '前缀池', '前缀 / 地址', 'Peer DNS / 默认路由'], dhcpClientRows, '当前未读取到 IPv6 DHCPv6 Client')}
          `
          : opsCard('IPv6 DNS 采集状态', '当前页面没有读到 ND / DHCPv6 明细', emptyBlock('当前未读取到 IPv6 ND / DHCPv6 数据'), 'ops-empty-card ops-density-table')}
      </div>`);
  };
  window.renderDnsV6 = renderDnsV6;

  renderSecurity = function patchedRenderSecurityDenseV3(snapshot, config = {}) {
    const security = snapshot.security || {};
    const sectionTitle = config.title || '安全监控中心';
    const sectionId = config.id || 'security';
    const sectionTip = config.tip || 'Filter 规则、地址名单与异常告警按真实读取结果展示';
    const filterRows = (security.filters || []).map((row) => `
      <tr>
        <td>${escapeHtml(row.chain)}</td>
        <td>${tag(row.action, row.disabled ? 'warn' : 'info')}</td>
        <td>${escapeHtml(row.comment || '-')}</td>
        <td>${fmtCompact(row.packets)}</td>
        <td>${fmtBytes(row.bytes)}</td>
        <td>${row.disabled ? tag('停用', 'warn') : tag('启用', 'ok')}</td>
      </tr>`);
    const listRows = (security.addressLists || []).map((row) => `
      <tr>
        <td>${escapeHtml(row.list)}</td>
        <td>${tag(row.category, row.category === '黑名单' ? 'danger' : row.category === '白名单' ? 'ok' : 'info')}</td>
        <td>${escapeHtml(row.address)}</td>
        <td>${escapeHtml(row.timeout || '-')}</td>
        <td>${escapeHtml(row.comment || '-')}</td>
      </tr>`);
    const alertRows = (security.alerts || []).map((row) => `
      <tr>
        <td>${escapeHtml(row.time)}</td>
        <td>${escapeHtml(row.topics)}</td>
        <td>${escapeHtml(row.message)}</td>
      </tr>`);
    const categoryBars = sortCountEntries((security.addressLists || []).reduce((acc, row) => {
      const key = String(row.category || '未分类').trim() || '未分类';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})).map(([label, value]) => ({
      label,
      value: Number(value || 0),
      display: fmtNumber(value)
    }));
    const enabledFilters = (security.filters || []).filter((row) => !row.disabled).length;
    const inputFilters = (security.filters || []).filter((row) => row.chain === 'input').length;
    const forwardFilters = (security.filters || []).filter((row) => row.chain === 'forward').length;
    const totalFilterPackets = (security.filters || []).reduce((sum, row) => sum + Number(row.packets || 0), 0);
    const totalFilterBytes = (security.filters || []).reduce((sum, row) => sum + Number(row.bytes || 0), 0);
    return section(sectionTitle, sectionId, sectionTip, `
      <div class="grid-4">
        ${metricCard('ACL 规则数', fmtNumber((security.filters || []).length), `启用 ${fmtNumber(enabledFilters)} 条`, '仅统计真实 Filter')}
        ${metricCard('地址名单条目', fmtNumber((security.addressLists || []).length), '黑白名单 / 地址集', '')}
        ${metricCard('异常告警', fmtNumber((security.alerts || []).length), '系统或访问异常', '')}
        ${metricCard('Filter 命中', fmtCompact(totalFilterPackets), `累计 ${fmtBytes(totalFilterBytes)}`, '')}
      </div>
      <div class="ops-page-stack" style="margin-top:8px">
        ${opsCard('ACL 摘要', '把原来松散的概览压成一屏可读的关键信息', opsStatTiles([
          { label: '启用规则', value: fmtNumber(enabledFilters), meta: `总规则 ${fmtNumber((security.filters || []).length)} 条` },
          { label: 'Input 链', value: fmtNumber(inputFilters), meta: '输入面防护' },
          { label: 'Forward 链', value: fmtNumber(forwardFilters), meta: '转发面规则' },
          { label: '命中流量', value: fmtBytes(totalFilterBytes), meta: '全部 Filter 累计' }
        ]), 'ops-info-card')}
        ${opsCard('地址名单分类', `${fmtNumber((security.addressLists || []).length)} 条名单聚合`, opsBarStack(categoryBars, { emptyText: '当前未读取到地址名单分类' }), 'ops-info-card')}
        ${opsDenseTableCard('近期异常告警', `${fmtNumber((security.alerts || []).length)} 条`, ['时间', '主题', '消息'], alertRows, '当前未读取到异常告警')}
        ${opsDenseTableCard('ACL Filter 明细', `${fmtNumber((security.filters || []).length)} 条规则`, ['链', '动作', '备注', '命中包', '命中流量', '状态'], filterRows, '当前未读取到 Filter 规则')}
        ${opsDenseTableCard('地址名单明细', `${fmtNumber((security.addressLists || []).length)} 条`, ['列表名', '类别', '地址', '超时', '备注'], listRows, '当前未读取到地址名单')}
      </div>`);
  };
  window.renderSecurity = renderSecurity;

  renderServiceLogs = function patchedRenderServiceLogsDenseV3(snapshot) {
    const logs = snapshot.logs || {};
    const dhcp = snapshot.dhcp || {};
    const dns = snapshot.dns || {};
    const dnsTotalRuleCount = Number(dns.forwardRuleCount || dns.visibleRuleCount || (dns.forwardRules || []).length || 0);
    const serviceEvents = [
      ...(logs.dhcp || []).map((row) => ({ source: 'DHCP', ...row })),
      ...(logs.dns || []).map((row) => ({ source: 'DNS', ...row }))
    ].sort((a, b) => String(b.time || '').localeCompare(String(a.time || ''))).slice(0, 40);
    const serviceRows = serviceEvents.map((row) => `
      <tr>
        <td>${escapeHtml(row.source || '-')}</td>
        <td>${escapeHtml(row.time)}</td>
        <td>${escapeHtml(row.topics)}</td>
        <td>${escapeHtml(row.message)}</td>
      </tr>`);
    const serverRows = (dhcp.servers || []).map((row) => `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.interface)}</td>
        <td>${escapeHtml(row.pool)}</td>
        <td>${escapeHtml(row.leaseTime)}</td>
        <td>${row.running ? tag('运行中', 'ok') : tag('停用', 'warn')}</td>
      </tr>`);
    const dnsPreviewRows = (dns.forwardRules || []).slice(0, 12).map((row) => `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${tag(row.type || '-', row.disabled ? 'warn' : 'info')}</td>
        <td>${escapeHtml(row.value)}</td>
        <td>${escapeHtml(row.ttl || '-')}</td>
        <td>${row.disabled ? tag('停用', 'warn') : tag('启用', 'ok')}</td>
      </tr>`);
    const serviceLogBlock = serviceEvents.length
      ? opsDenseTableCard('服务日志窗口', `最近 ${fmtNumber(serviceEvents.length)} 条 DHCP / DNS 日志`, ['来源', '时间', '主题', '消息'], serviceRows, '当前未读取到 DHCP / DNS 服务日志')
      : opsCard('服务日志窗口', '当前没有 DHCP / DNS 新事件，收起空白日志表格，只保留紧凑状态信息', opsStatTiles([
        { label: 'DHCP 日志', value: fmtNumber((logs.dhcp || []).length), meta: '当前窗口' },
        { label: 'DNS 日志', value: fmtNumber((logs.dns || []).length), meta: '当前窗口' },
        { label: '日志来源', value: 'DHCP / DNS', meta: '等待新的服务事件写入' }
      ]), 'ops-info-card');
    return section('服务日志', 'serviceLogs', 'DHCP / DNS 服务状态、规则预览与服务日志窗口', `
      <div class="grid-4">
        ${metricCard('DHCP 日志', fmtNumber((logs.dhcp || []).length), `DHCP 服务 ${fmtNumber((dhcp.servers || []).length)} 个`, '')}
        ${metricCard('DNS 日志', fmtNumber((logs.dns || []).length), `静态规则 ${fmtNumber(dnsTotalRuleCount)} 条`, '')}
        ${metricCard('DNS 状态', dns.running ? tag('启用', 'ok') : tag('未启用', 'danger'), '来自 RouterOS ip/dns', '')}
        ${metricCard('服务概览', `${fmtNumber((dhcp.servers || []).length)} / ${fmtNumber((dns.servers || []).length)}`, 'DHCP 服务 / DNS 上游', '')}
      </div>
      <div class="ops-page-stack" style="margin-top:8px">
        ${opsCard('服务摘要', '当服务日志窗口较空时，用真实的 DHCP / DNS 状态承接页面，不再留大片空白', opsStatTiles([
          { label: 'DHCP 地址池', value: fmtNumber((dhcp.pools || []).length), meta: `租约 ${fmtNumber((dhcp.leases || []).length)} 条` },
          { label: '运行中 DHCP', value: fmtNumber((dhcp.servers || []).filter((row) => row.running).length), meta: `总服务 ${fmtNumber((dhcp.servers || []).length)} 个` },
          { label: 'DNS 上游', value: fmtNumber((dns.servers || []).length), meta: (dns.servers || []).slice(0, 2).join(' / ') || '未读取到' },
          { label: 'DoH', value: dns.dohServer ? '已配置' : '未配置', meta: dns.dohServer ? escapeHtml(dns.dohServer) : '当前未启用' },
          { label: '缓存占用', value: `${fmtBytes(dns.cacheUsed || 0)} / ${fmtBytes(dns.cacheSize || 0)}`, meta: 'DNS 缓存当前状态' },
          { label: '规则总数', value: fmtNumber(dnsTotalRuleCount), meta: `预览 ${fmtNumber((dns.forwardRules || []).length)} 条` }
        ]), 'ops-info-card')}
        ${opsDenseTableCard('DHCP 服务状态', `${fmtNumber((dhcp.servers || []).length)} 个服务`, ['服务', '接口', '地址池', '租期', '状态'], serverRows, '当前未读取到 DHCP 服务状态')}
        ${opsDenseTableCard('DNS 静态规则预览', `显示 ${fmtNumber((dns.forwardRules || []).length)} / ${fmtNumber(dnsTotalRuleCount)} 条`, ['名称 / 正则', '类型', '目标值', 'TTL', '状态'], dnsPreviewRows, dnsTotalRuleCount ? '当前页没有可展示的规则预览' : '当前未读取到 DNS 静态规则')}
        ${serviceLogBlock}
      </div>`);
  };
  window.renderServiceLogs = renderServiceLogs;

  const densityStyleV4 = document.createElement('style');
  densityStyleV4.textContent = `
    #loadAudit .ops-page-stack,
    #routes .ops-page-stack,
    #balance .ops-page-stack,
    #trafficLoad .ops-page-stack,
    #lineStatus .ops-page-stack,
    #trafficAudit .ops-page-stack,
    #terminals .ops-page-stack { gap: 8px; }
    #loadAudit .ops-split,
    #routes .ops-split,
    #balance .ops-split,
    #trafficLoad .ops-split,
    #lineStatus .ops-split,
    #trafficAudit .ops-split,
    #terminals .ops-split { grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.95fr); gap: 8px; }
    #loadAudit .ops-double,
    #routes .ops-double,
    #balance .ops-double,
    #trafficLoad .ops-double,
    #lineStatus .ops-double,
    #trafficAudit .ops-double,
    #terminals .ops-double,
    #routes .grid-2,
    #balance .grid-2,
    #lineStatus .grid-2,
    #trafficAudit .grid-2,
    #terminals .grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    #routes .grid-4,
    #balance .grid-4,
    #trafficLoad .grid-4,
    #lineStatus .grid-4,
    #trafficAudit .grid-4,
    #terminals .grid-4 { gap: 8px; }
    #routes .metric-card,
    #balance .metric-card,
    #trafficLoad .metric-card,
    #lineStatus .metric-card,
    #trafficAudit .metric-card,
    #terminals .metric-card { min-height: 0; }
    #routes .metric-value,
    #balance .metric-value,
    #trafficLoad .metric-value,
    #lineStatus .metric-value,
    #trafficAudit .metric-value,
    #terminals .metric-value { font-size: 20px; line-height: 1.15; }
    #routes .metric-foot,
    #balance .metric-foot,
    #trafficLoad .metric-foot,
    #lineStatus .metric-foot,
    #trafficAudit .metric-foot,
    #terminals .metric-foot { gap: 6px; font-size: 11px; }
    #routes .card-head,
    #balance .card-head,
    #trafficLoad .card-head,
    #lineStatus .card-head,
    #trafficAudit .card-head,
    #terminals .card-head { padding: 8px 10px; min-height: 0; }
    #loadAudit .chart-box,
    #routes .chart-box,
    #balance .chart-box,
    #trafficLoad .chart-box,
    #lineStatus .chart-box,
    #trafficAudit .chart-box,
    #terminals .chart-box { padding: 8px; }
    #loadAudit .mini-chart,
    #routes .mini-chart,
    #balance .mini-chart,
    #trafficLoad .mini-chart,
    #lineStatus .mini-chart,
    #trafficAudit .mini-chart,
    #terminals .mini-chart { height: 118px; }
    #loadAudit .ops-stat-grid,
    #routes .ops-stat-grid,
    #balance .ops-stat-grid,
    #trafficLoad .ops-stat-grid,
    #lineStatus .ops-stat-grid,
    #trafficAudit .ops-stat-grid,
    #terminals .ops-stat-grid { grid-template-columns: repeat(auto-fit, minmax(116px, 1fr)); gap: 7px; }
    #loadAudit .ops-stat-tile,
    #routes .ops-stat-tile,
    #balance .ops-stat-tile,
    #trafficLoad .ops-stat-tile,
    #lineStatus .ops-stat-tile,
    #trafficAudit .ops-stat-tile,
    #terminals .ops-stat-tile { padding: 7px 8px; }
    #routes .ops-table th,
    #routes .ops-table td,
    #balance .ops-table th,
    #balance .ops-table td,
    #trafficLoad .ops-table th,
    #trafficLoad .ops-table td,
    #lineStatus .ops-table th,
    #lineStatus .ops-table td,
    #trafficAudit .ops-table th,
    #trafficAudit .ops-table td,
    #terminals .ops-table th,
    #terminals .ops-table td { padding: 6px 7px; }
    #loadAudit .ops-info-card .card-body,
    #loadAudit .ops-density-table .card-body,
    #routes .card-body,
    #balance .card-body,
    #trafficLoad .card-body,
    #lineStatus .card-body,
    #trafficAudit .card-body,
    #terminals .card-body { padding: 8px 10px 10px; }
  `;
  document.head.appendChild(densityStyleV4);

  renderLoadAudit = function patchedRenderLoadAuditDenseV4(snapshot) {
    const overview = snapshot.overview || {};
    const connections = snapshot.connections || {};
    const dns = snapshot.dns || {};
    const interfaces = (snapshot.interfaces || []).slice().sort((a, b) => {
      const diff = interfaceAuditScore(b) - interfaceAuditScore(a);
      return diff !== 0 ? diff : totalTrafficRate(b, 'txRate', 'rxRate') - totalTrafficRate(a, 'txRate', 'rxRate');
    });
    const auditEvents = collectLoadAuditEvents(snapshot);
    const cpuHistory = overview.history?.cpu || [];
    const memoryHistory = overview.history?.memory || [];
    const diskHistory = overview.history?.disk || [];
    const sampleCount = Math.max(cpuHistory.length, memoryHistory.length, diskHistory.length, 0);
    const pollSeconds = snapshot.meta?.pollSeconds || '-';
    const cacheUsage = dns.cacheSize
      ? `${((Number(dns.cacheUsed || 0) / Math.max(1, Number(dns.cacheSize || 0))) * 100).toFixed(1)}%`
      : '-';
    const interfaceAlertCount = interfaces.filter((row) => interfaceAuditScore(row) > 0).length;
    const systemLoadTag = overview.systemLoadLevel === 'danger'
      ? tag('高压', 'danger')
      : overview.systemLoadLevel === 'warning'
        ? tag('预警', 'warn')
        : tag('正常', 'ok');
    const connectionPressure = Number(connections.total || 0) >= 90000
      ? tag('高压', 'danger')
      : Number(connections.total || 0) >= 60000
        ? tag('预警', 'warn')
        : tag('正常', 'ok');
    const ntpState = overview.ntpStatus === 'synchronized'
      ? tag('已同步', 'ok')
      : overview.ntpStatus
        ? tag('未同步', 'warn')
        : '-';
    const trendMeta = `${fmtNumber(sampleCount)} 个采样点 · ${escapeHtml(String(pollSeconds))}s / 点`;
    const trendBlock = sampleCount
      ? `<div class="ops-resource-grid">
          ${opsResourceTrendCard('CPU 负载', fmtPercent(overview.cpuLoad), cpuHistory, '#165dff', trendMeta)}
          ${opsResourceTrendCard('内存使用率', fmtPercent(overview.memoryUsage), memoryHistory, '#16c67a', trendMeta)}
          ${opsResourceTrendCard('磁盘使用率', fmtPercent(overview.diskUsage), diskHistory, '#ffb020', trendMeta)}
        </div>`
      : emptyBlock('当前未读取到资源趋势数据');
    const interfaceRows = interfaces.slice(0, 20).map((row) => `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${tag(row.role || '-', row.role === 'WAN' ? 'info' : 'ok')}</td>
        <td>${statusTag(row.running, row.disabled)}</td>
        <td>${fmtRate(row.txRate)}</td>
        <td>${fmtRate(row.rxRate)}</td>
        <td>${packetSummaryCell(Number(row.txDrop || 0) + Number(row.rxDrop || 0), Number(row.txError || 0) + Number(row.rxError || 0))}</td>
        <td>${addressCell(row.ips || [])}</td>
        <td>${escapeHtml(row.mac || '-')}</td>
      </tr>`);
    const adminRows = (overview.admins || []).map((item) => `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${escapeHtml(item.via)}</td>
        <td>${escapeHtml(item.address)}</td>
        <td>${escapeHtml(item.when)}</td>
      </tr>`);
    const eventRows = auditEvents.map((item) => `
      <tr>
        <td>${escapeHtml(item.time || '-')}</td>
        <td>${escapeHtml(item.source || '-')}</td>
        <td>${tag(item.level === 'danger' ? '异常' : '预警', item.level)}</td>
        <td>${escapeHtml(item.message || '-')}</td>
      </tr>`);

    return section('负载审计', 'loadAudit', '基于 RouterOS 真实资源、连接、接口与日志的只读负载审计', `
      <div class="grid-4">
        ${metricCard('CPU 使用率', fmtPercent(overview.cpuLoad), `型号 ${escapeHtml(overview.cpuModel || '-')}`, `${fmtNumber(overview.cpuCount)} 核 / ${fmtNumber(overview.cpuFrequency)} MHz`)}
        ${metricCard('内存占用率', fmtPercent(overview.memoryUsage), `已用 ${fmtBytes(overview.memoryUsedBytes)}`, `总量 ${fmtBytes(overview.memoryTotalBytes)}`)}
        ${metricCard('磁盘占用率', fmtPercent(overview.diskUsage), `已用 ${fmtBytes(overview.diskUsedBytes)}`, `总量 ${fmtBytes(overview.diskTotalBytes)}`)}
        ${metricCard('全局连接数', fmtCompact(connections.total), `活跃 ${fmtNumber((connections.active || []).length)} 条`, `连接压力 ${connectionPressure}`)}
      </div>
      <div class="ops-page-stack" style="margin-top:8px">
        ${opsCard('审计摘要', '按成熟网络控制台的做法，把最关键的系统状态压成一屏可读摘要，再往下看明细', opsStatTiles([
          { label: '系统负载', value: systemLoadTag, meta: `CPU ${fmtPercent(overview.cpuLoad)} / 内存 ${fmtPercent(overview.memoryUsage)}` },
          { label: 'DNS 缓存', value: cacheUsage, meta: `${fmtBytes(dns.cacheUsed || 0)} / ${fmtBytes(dns.cacheSize || 0)}` },
          { label: 'NTP', value: ntpState, meta: escapeHtml(overview.systemTime || '-') },
          { label: '管理员会话', value: fmtNumber((overview.admins || []).length), meta: `运行时长 ${escapeHtml(overview.uptime || '-')}` },
          { label: '活跃会话', value: fmtNumber((connections.active || []).length), meta: connections.detailUpdatedAt ? escapeHtml(connections.detailUpdatedAt) : '等待采集' },
          { label: '接口异常', value: fmtNumber(interfaceAlertCount), meta: `接口总数 ${fmtNumber(interfaces.length)}` }
        ]), 'ops-info-card')}
        ${opsCard('资源趋势', '拆分 CPU / 内存 / 磁盘，分别标明颜色、当前值与 100 / 50 / 0% 坐标轴', trendBlock, 'ops-info-card')}
        ${opsDenseTableCard('接口异常审计', `${fmtNumber(Math.min(interfaces.length, 20))} / ${fmtNumber(interfaces.length)} 个接口，按异常与吞吐优先展示`, ['接口', '角色', '状态', '实时上行速率', '实时下行速率', '丢包 / 错包', '地址', 'MAC'], interfaceRows, '当前未读取到接口审计数据')}
        <div class="ops-double" style="margin-top:0">
          ${opsDenseTableCard('健康事件窗口', `${fmtNumber(auditEvents.length)} 条预警/异常`, ['时间', '来源', '级别', '内容'], eventRows, '当前未发现明显的资源或服务异常')}
          ${opsDenseTableCard('当前登录管理员', `${fmtNumber((overview.admins || []).length)} 个会话`, ['用户', '方式', '来源地址', '登录时间'], adminRows, '当前未读取到管理员会话')}
        </div>
      </div>`);
  };
  window.renderLoadAudit = renderLoadAudit;

  const ipDensityStyle = document.createElement('style');
  ipDensityStyle.textContent = `
    #arp .ops-table-wrap,
    #trafficAudit .ops-table-wrap,
    #trafficLoad .ops-table-wrap,
    #terminals .ops-table-wrap { max-height: none; }
    #arp .ops-compact-table td,
    #trafficAudit .ops-compact-table td,
    #trafficLoad .ops-compact-table td,
    #terminals .ops-compact-table td { white-space: nowrap; }
    .ops-chip-line { display: flex; gap: 5px; flex-wrap: wrap; align-items: center; }
    .ops-family-badge { display: inline-flex; align-items: center; min-height: 18px; padding: 0 7px; border-radius: 999px; background: #edf5ff; color: #165dff; font-size: 11px; font-weight: 500; }
    .ops-family-badge.is-v6 { background: #eefbf5; color: #087c4a; }
    .ops-family-badge.is-mixed { background: #fff7e8; color: #ad6800; }
    .ops-table .ops-rate-cell { min-width: 118px; }
    #interfaces .ops-stat-grid,
    #trafficLoad .ops-stat-grid,
    #terminals .ops-stat-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    #interfaces .interfaces-monitor-grid { grid-template-columns: minmax(0, 1.42fr) minmax(372px, 0.98fr); align-items: start; }
    #interfaces .interfaces-monitor-main { grid-template-columns: minmax(0, 1.08fr) minmax(320px, 0.92fr); }
    #interfaces .interfaces-monitor-side { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    #interfaces .interfaces-trend-stack { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    #interfaces .interfaces-inline-panel { padding: 10px; border: 1px solid #e3edf8; border-radius: 12px; background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%); }
    #interfaces .interfaces-inline-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
    #interfaces .interfaces-inline-title { color: var(--text); font-size: 12px; font-weight: 700; line-height: 1.2; }
    #interfaces .interfaces-inline-subtle { color: var(--text-dim); font-size: 11px; line-height: 1.2; text-align: right; }
    #interfaces .interfaces-monitor-facts .ops-stat-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .ops-workbench { display: flex; flex-direction: column; gap: 8px; }
    .ops-workbench-grid { display: grid; grid-template-columns: minmax(0, 1.52fr) minmax(360px, 0.88fr); gap: 8px; align-items: start; }
    .ops-workbench-side,
    .ops-panel-stack { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    .ops-section-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, 0.82fr); gap: 8px; align-items: start; }
    .ops-kpi-strip { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    .ops-kpi-tile { min-width: 0; padding: 8px 9px; border: 1px solid #e3edf8; border-radius: 10px; background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%); }
    .ops-kpi-label { color: var(--text-dim); font-size: 11px; line-height: 1.2; }
    .ops-kpi-value { margin-top: 4px; color: var(--text); font-size: 14px; font-weight: 700; line-height: 1.15; word-break: break-word; }
    .ops-kpi-meta { margin-top: 4px; color: var(--text-soft); font-size: 11px; line-height: 1.3; word-break: break-word; }
    .ops-signal-list { display: flex; flex-direction: column; gap: 6px; }
    .ops-signal-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 8px 9px; border: 1px solid #e3edf8; border-radius: 10px; background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%); }
    .ops-signal-main { min-width: 0; }
    .ops-signal-label { color: var(--text); font-size: 12px; font-weight: 700; line-height: 1.2; word-break: break-word; }
    .ops-signal-meta { margin-top: 3px; color: var(--text-soft); font-size: 11px; line-height: 1.25; word-break: break-word; }
    .ops-signal-side { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; min-width: 112px; }
    .ops-signal-tag { line-height: 0; }
    .ops-signal-value { color: var(--text); font-size: 13px; font-weight: 700; line-height: 1.15; text-align: right; white-space: nowrap; }
    .ops-signal-hint { color: var(--text-dim); font-size: 11px; line-height: 1.2; text-align: right; white-space: nowrap; }
    .ops-stack-note { color: var(--text-dim); font-size: 11px; line-height: 1.35; }
  `;
  document.head.appendChild(ipDensityStyle);

  function isIpv6Address(value) {
    return String(value || '').includes(':');
  }

  function isRealMac(value) {
    const text = String(value || '').trim();
    return Boolean(text && text !== '-' && text.toLowerCase() !== 'null');
  }

  function normalizedMac(value) {
    return isRealMac(value) ? String(value).trim().toUpperCase() : '';
  }

  function terminalLabel(row = {}) {
    return String(row.displayName || row.customName || row.hostname || row.ip || '-').trim() || '-';
  }

  function terminalStatusTag(status) {
    const value = String(status || '-').toLowerCase();
    if (['reachable', 'bound', 'online', 'ok'].includes(value)) return tag('在线', 'ok');
    if (['failed', 'incomplete', 'offline'].includes(value)) return tag(value === 'failed' ? '失败' : '离线', 'danger');
    if (value === 'noarp') return tag('无 ARP', 'warn');
    if (value === 'stale') return tag('待机', 'warn');
    if (value === 'delay') return tag('延迟', 'warn');
    return tag(status || '-', 'info');
  }

  function addressFamilyBadge(values = []) {
    const families = splitIpFamilies(values);
    if (families.ipv4.length && families.ipv6.length) return '<span class="ops-family-badge is-mixed">IPv4+IPv6</span>';
    if (families.ipv6.length) return '<span class="ops-family-badge is-v6">IPv6</span>';
    if (families.ipv4.length) return '<span class="ops-family-badge">IPv4</span>';
    return '<span class="ops-family-badge">未知</span>';
  }

  function arrayFromSet(set, sorter = true) {
    const items = Array.from(set || []).filter(Boolean);
    return sorter ? items.sort((a, b) => String(a).localeCompare(String(b), 'zh-Hans-CN', { numeric: true })) : items;
  }

  function compactSetCell(values, limit = 2) {
    return compactListHtml(arrayFromSet(values), limit);
  }

  function worstTerminalStatus(statuses = []) {
    const values = Array.from(statuses).map((item) => String(item || '').toLowerCase());
    if (values.some((item) => ['failed', 'incomplete', 'offline'].includes(item))) return 'failed';
    if (values.some((item) => ['noarp', 'stale', 'delay'].includes(item))) return values.includes('noarp') ? 'noarp' : 'stale';
    if (values.some((item) => ['reachable', 'bound', 'online', 'ok'].includes(item))) return 'reachable';
    return values[0] || '-';
  }

  function buildDeviceGroups(snapshot = {}) {
    const groups = new Map();
    const ensure = (key, seed = {}) => {
      const groupKey = key || `ip:${seed.ip || seed.address || seed.name || groups.size}`;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          key: groupKey,
          names: new Set(),
          ipv4: new Set(),
          ipv6: new Set(),
          macs: new Set(),
          statuses: new Set(),
          arpStatuses: new Set(),
          arpTypes: new Set(),
          lastSeen: new Set(),
          sources: new Set(),
          upRate: 0,
          downRate: 0,
          connections: 0,
          sessionBytes: 0
        });
      }
      return groups.get(groupKey);
    };
    (snapshot.terminals || []).forEach((row) => {
      const mac = normalizedMac(row.mac);
      const key = mac || `ip:${row.ip || terminalLabel(row)}`;
      const group = ensure(key, row);
      group.names.add(terminalLabel(row));
      if (isIpv6Address(row.ip)) group.ipv6.add(String(row.ip || '').trim());
      else group.ipv4.add(String(row.ip || '').trim());
      if (mac) group.macs.add(mac);
      group.statuses.add(row.status || '-');
      if (row.lastSeen) group.lastSeen.add(toDisplayText(row.lastSeen || '-'));
      group.sources.add('终端');
      group.upRate += Number(row.upRate || 0);
      group.downRate += Number(row.downRate || 0);
      group.connections += Number(row.connections || 0);
      group.sessionBytes += Number(row.sessionBytes || 0);
    });
    ((snapshot.arp || {}).items || []).forEach((row) => {
      const mac = normalizedMac(row.mac);
      const key = mac || `ip:${row.ip || terminalLabel(row)}`;
      const group = ensure(key, row);
      group.names.add(terminalLabel(row));
      if (row.ip) group.ipv4.add(String(row.ip).trim());
      if (mac) group.macs.add(mac);
      group.arpStatuses.add(row.status || '-');
      group.arpTypes.add(row.type || '-');
      if (row.lastSeen) group.lastSeen.add(toDisplayText(row.lastSeen || '-'));
      group.sources.add('ARP');
    });
    return Array.from(groups.values()).sort((a, b) => {
      const trafficDiff = (b.upRate + b.downRate) - (a.upRate + a.downRate);
      if (trafficDiff !== 0) return trafficDiff;
      const connDiff = b.connections - a.connections;
      if (connDiff !== 0) return connDiff;
      return arrayFromSet(a.names)[0]?.localeCompare(arrayFromSet(b.names)[0] || '', 'zh-Hans-CN', { numeric: true }) || 0;
    });
  }

  function groupNameCell(group) {
    const name = arrayFromSet(group.names)[0] || '-';
    const source = arrayFromSet(group.sources).join(' / ') || '-';
    return opsTwoLineCell(escapeHtml(name), escapeHtml(source));
  }

  function statusSummaryCell(group) {
    const status = terminalStatusTag(worstTerminalStatus(group.statuses));
    const arp = arrayFromSet(group.arpStatuses).join(' / ');
    return opsTwoLineCell(status, arp ? `ARP ${escapeHtml(arp)}` : '');
  }

  function groupAddressCell(group, family) {
    if (family === 'ipv4') return compactSetCell(group.ipv4, 2);
    if (family === 'ipv6') return compactSetCell(group.ipv6, 2);
    return addressFamilyBadge([...arrayFromSet(group.ipv4), ...arrayFromSet(group.ipv6)]);
  }

  function buildDeviceIdentityRows(groups, limit = 40) {
    return groups.slice(0, limit).map((group) => `
      <tr>
        <td>${groupNameCell(group)}</td>
        <td>${groupAddressCell(group, 'ipv4')}</td>
        <td>${groupAddressCell(group, 'ipv6')}</td>
        <td>${compactSetCell(group.macs, 2)}</td>
        <td>${statusSummaryCell(group)}</td>
        <td class="ops-rate-cell">${fmtRate(group.upRate)}</td>
        <td class="ops-rate-cell">${fmtRate(group.downRate)}</td>
        <td>${fmtNumber(group.connections)}</td>
        <td>${fmtBytes(group.sessionBytes)}</td>
      </tr>`);
  }

  function countBy(rows, getter) {
    return (rows || []).reduce((acc, row) => {
      const key = getter(row) || '-';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  function countRows(mapObject, labelName = '状态') {
    return sortCountEntries(mapObject).map(([name, count]) => `
      <tr>
        <td>${escapeHtml(name)}</td>
        <td>${fmtNumber(count)}</td>
        <td>${progress(count, 'linear-gradient(90deg,#7da8ff 0%,#165dff 100%)')}</td>
      </tr>`);
  }

  function connectionFamily(row) {
    return isIpv6Address(row.localIp) || isIpv6Address(row.remoteIp) ? 'IPv6' : 'IPv4';
  }

  function protocolRows(activeConnections = []) {
    const map = activeConnections.reduce((acc, row) => {
      const protocol = String(row.protocol || '-').toUpperCase();
      if (!acc[protocol]) acc[protocol] = { count: 0, upRate: 0, downRate: 0, ipv4: 0, ipv6: 0 };
      acc[protocol].count += 1;
      acc[protocol].upRate += Number(row.upRate || 0);
      acc[protocol].downRate += Number(row.downRate || 0);
      if (connectionFamily(row) === 'IPv6') acc[protocol].ipv6 += 1;
      else acc[protocol].ipv4 += 1;
      return acc;
    }, {});
    return Object.entries(map)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([protocol, item]) => `
        <tr>
          <td>${tag(protocol, 'info')}</td>
          <td>${fmtNumber(item.count)}</td>
          <td>${fmtNumber(item.ipv4)} / ${fmtNumber(item.ipv6)}</td>
          <td>${fmtRate(item.upRate)}</td>
          <td>${fmtRate(item.downRate)}</td>
        </tr>`);
  }

  function ipToTerminalMap(terminals = []) {
    return Object.fromEntries((terminals || []).map((row) => [String(row.ip || ''), row]));
  }

  renderArp = function patchedRenderArpIdentityDense(snapshot) {
    const arp = snapshot.arp || { items: [], alerts: [] };
    const terminals = snapshot.terminals || [];
    const groups = buildDeviceGroups(snapshot);
    const trafficGroups = groups.filter((group) => group.upRate + group.downRate > 0);
    const driftRows = (arp.alerts || []).map((item) => `
      <tr>
        <td>${tag(item.kind || '告警', 'warn')}</td>
        <td>${escapeHtml(item.value || '-')}</td>
        <td>${compactListHtml(String(item.detail || '').split(',').map((value) => value.trim()), 4)}</td>
      </tr>`);
    const arpRows = (arp.items || []).map((row) => `
      <tr>
        <td>${escapeHtml(row.ip)}</td>
        <td>${renderEditableNameCell(row, row.ip, row.ip || '-')}</td>
        <td>${escapeHtml(row.mac)}</td>
        <td>${tag(row.type, row.type === '静态' ? 'info' : 'ok')}</td>
        <td>${terminalStatusTag(row.status)}</td>
        <td>${escapeHtml(toDisplayText(row.lastSeen || '-'))}</td>
      </tr>`);
    return section('ARP 监控', 'arp', 'ARP 表、终端身份、IPv4/IPv6 地址和 MAC 漂移按同一设备视角展示', `
      <div class="grid-4">
        ${metricCard('ARP 条目', fmtNumber((arp.items || []).length), 'RouterOS ARP 表', '')}
        ${metricCard('MAC 漂移', fmtNumber((arp.alerts || []).length), '同一 MAC 对应多个 IPv4', '')}
        ${metricCard('设备身份', fmtNumber(groups.length), `IPv6 关联 ${fmtNumber(groups.filter((group) => group.ipv6.size).length)} 个`, '')}
        ${metricCard('有流量设备', fmtNumber(trafficGroups.length), `终端总数 ${fmtNumber(terminals.length)}`, '')}
      </div>
      <div class="ops-page-stack" style="margin-top:8px">
        ${opsCard('ARP / 终端关联摘要', '按 Netdisco / LibreNMS 的设备索引思路，把 MAC、IPv4、IPv6、ARP 状态和流量放在同一上下文', opsStatTiles([
          { label: 'IPv4 地址', value: fmtNumber(groups.reduce((sum, group) => sum + group.ipv4.size, 0)), meta: '来自 ARP / 终端表' },
          { label: 'IPv6 地址', value: fmtNumber(groups.reduce((sum, group) => sum + group.ipv6.size, 0)), meta: '来自终端/会话观测' },
          { label: '可识别 MAC', value: fmtNumber(groups.filter((group) => group.macs.size).length), meta: '可用于身份归并' },
          { label: '在线/可达', value: fmtNumber(groups.filter((group) => worstTerminalStatus(group.statuses) === 'reachable').length), meta: '当前状态聚合' },
          { label: '待机/无 ARP', value: fmtNumber(groups.filter((group) => ['stale', 'noarp'].includes(worstTerminalStatus(group.statuses))).length), meta: 'IPv6 不依赖 ARP 属正常现象' },
          { label: '实时吞吐', value: fmtRate(groups.reduce((sum, group) => sum + group.upRate + group.downRate, 0)), meta: '关联终端实时上下行' }
        ]), 'ops-info-card')}
        ${opsDenseTableCard('设备身份关联表', `${fmtNumber(groups.length)} 个身份，一行合并 IPv4 / IPv6 / MAC / 流量`, ['设备', 'IPv4', 'IPv6', 'MAC', '状态', '实时上行', '实时下行', '连接', '累计流量'], buildDeviceIdentityRows(groups, 48), '当前未读取到设备身份关联数据', 'ops-compact-density', 'ops-compact-table')}
        <div class="ops-double">
          ${opsDenseTableCard('MAC 漂移 / 冲突线索', `${fmtNumber((arp.alerts || []).length)} 条`, ['类型', 'MAC', '关联 IPv4'], driftRows, '当前未读取到 MAC 漂移线索', 'ops-compact-density', 'ops-compact-table')}
          ${opsDenseTableCard('ARP 状态分布', `${fmtNumber((arp.items || []).length)} 条 ARP`, ['状态', '数量', '占比'], countRows(countBy(arp.items || [], (row) => row.status || '-')), '当前未读取到 ARP 状态分布', 'ops-compact-density', 'ops-compact-table')}
        </div>
        ${opsDenseTableCard('ARP 原始表', `${fmtNumber((arp.items || []).length)} 条`, ['IP', '主机名', 'MAC', '类型', '状态', '最后出现'], arpRows, '当前未读取到 ARP 列表', 'ops-compact-density', 'ops-compact-table')}
      </div>`);
  };
  window.renderArp = renderArp;

  renderTerminals = function patchedRenderTerminalsIdentityDense(snapshot) {
    currentTerminalView = normalizeTerminalView(currentTerminalView);
    const allTerminals = snapshot.terminals || [];
    const activeConnections = (snapshot.connections || {}).active || [];
    const ipv4Terminals = allTerminals.filter((row) => !isIpv6Address(row.ip));
    const ipv6Terminals = allTerminals.filter((row) => isIpv6Address(row.ip));
    const ipMap = ipToTerminalMap(allTerminals);
    const groups = buildDeviceGroups(snapshot);
    const groupByMac = new Map();
    groups.forEach((group) => {
      group.macs.forEach((mac) => groupByMac.set(mac, group));
    });
    const currentRows = currentTerminalView === 'ipv6' ? ipv6Terminals : ipv4Terminals;
    const sortedCurrentRows = currentRows
      .slice()
      .sort((a, b) => totalTrafficRate(b) - totalTrafficRate(a) || Number(b.connections || 0) - Number(a.connections || 0));
    const familyRows = sortedCurrentRows.map((row) => {
      const mac = normalizedMac(row.mac);
      const group = mac ? groupByMac.get(mac) : null;
      const paired = group
        ? (isIpv6Address(row.ip) ? arrayFromSet(group.ipv4) : arrayFromSet(group.ipv6))
        : [];
      return `
        <tr>
          <td>${renderEditableNameCell(row, row.ip, terminalLabel(row))}</td>
          <td>${addressFamilyBadge([row.ip])}</td>
          <td>${escapeHtml(row.ip || '-')}</td>
          <td>${compactListHtml(paired, 2)}</td>
          <td>${escapeHtml(row.mac || '-')}</td>
          <td>${terminalStatusTag(row.status)}</td>
          <td>${escapeHtml(toDisplayText(row.lastSeen || '-'))}</td>
          <td>${fmtRate(row.upRate)}</td>
          <td>${fmtRate(row.downRate)}</td>
          <td>${fmtNumber(row.connections)}</td>
          <td>${fmtBytes(row.sessionBytes)}</td>
        </tr>`;
    });
    const watchRows = sortedCurrentRows.slice(0, 14).map((row) => {
      const mac = normalizedMac(row.mac);
      const group = mac ? groupByMac.get(mac) : null;
      const paired = group
        ? (isIpv6Address(row.ip) ? arrayFromSet(group.ipv4) : arrayFromSet(group.ipv6))
        : [];
      return `
        <tr>
          <td>${renderEditableNameCell(row, row.ip, terminalLabel(row))}</td>
          <td>${terminalStatusTag(row.status)}</td>
          <td>${escapeHtml(row.ip || '-')}</td>
          <td>${compactListHtml(paired, 1)}</td>
          <td>${fmtRate(row.upRate)}</td>
          <td>${fmtRate(row.downRate)}</td>
          <td>${fmtNumber(row.connections)}</td>
        </tr>`;
    });
    const ipv6ActiveRows = activeConnections
      .filter((row) => isIpv6Address(row.localIp))
      .map((row) => {
        const terminal = ipMap[String(row.localIp || '')] || {};
        return `
          <tr>
            <td>${escapeHtml(terminalLabel(terminal) || row.localIp || '-')}</td>
            <td>${escapeHtml(row.localIp)}</td>
            <td>${escapeHtml(row.remoteIp || '-')}</td>
            <td>${tag(row.protocol || '-', 'info')}</td>
            <td>${fmtRate(row.upRate)}</td>
            <td>${fmtRate(row.downRate)}</td>
            <td>${escapeHtml(row.timeout || '-')}</td>
            <td>${escapeHtml(row.mark || '-')}</td>
          </tr>`;
      });
    const groupsForView = groups.filter((group) => currentTerminalView === 'ipv6' ? group.ipv6.size : group.ipv4.size);
    const ipv4Up = ipv4Terminals.reduce((sum, row) => sum + Number(row.upRate || 0), 0);
    const ipv4Down = ipv4Terminals.reduce((sum, row) => sum + Number(row.downRate || 0), 0);
    const ipv6Up = ipv6Terminals.reduce((sum, row) => sum + Number(row.upRate || 0), 0);
    const ipv6Down = ipv6Terminals.reduce((sum, row) => sum + Number(row.downRate || 0), 0);
    const currentUp = currentTerminalView === 'ipv6' ? ipv6Up : ipv4Up;
    const currentDown = currentTerminalView === 'ipv6' ? ipv6Down : ipv4Down;
    const reachableCount = currentRows.filter((row) => String(row.status).toLowerCase() === 'reachable').length;
    const currentTrafficCount = currentRows.filter((row) => totalTrafficRate(row) > 0).length;
    const currentConnectionCount = currentRows.filter((row) => Number(row.connections || 0) > 0).length;
    const currentSilentCount = currentRows.filter((row) => ['noarp', 'stale'].includes(String(row.status || '').toLowerCase())).length;
    const dualStackDeviceCount = groups.filter((group) => group.ipv4.size && group.ipv6.size).length;
    const currentSessionBytes = currentRows.reduce((sum, row) => sum + Number(row.sessionBytes || 0), 0);
    const statusLabel = (row) => {
      const status = String(row.status || '-').toLowerCase();
      if (status === 'reachable') return 'reachable / 在线';
      if (status === 'stale') return 'stale / 待确认';
      if (status === 'noarp') return 'noarp / 静默';
      if (status === 'delay') return 'delay / 延迟';
      return status || '-';
    };
    const statusRows = countRows(countBy(currentRows, (row) => statusLabel(row)), '状态');
    const deviceHotRows = groupsForView.slice(0, 8).map((group) => `
      <tr>
        <td>${escapeHtml(arrayFromSet(group.names)[0] || '-')}</td>
        <td>${opsTwoLineCell(`${fmtNumber(group.ipv4.size)} IPv4 / ${fmtNumber(group.ipv6.size)} IPv6`, `${fmtNumber(group.macs.size)} MAC`)}</td>
        <td>${opsTwoLineCell(fmtRate(group.upRate), fmtRate(group.downRate))}</td>
        <td>${opsTwoLineCell(`连接 ${fmtNumber(group.connections)}`, terminalStatusTag(worstTerminalStatus(group.statuses)))}</td>
      </tr>`);
    const tabs = `
      <div class="ik-subtabs">
        <button class="ik-subtab ${currentTerminalView === 'ipv4' ? 'is-active' : ''}" type="button" data-terminal-view="ipv4">IPv4</button>
        <button class="ik-subtab ${currentTerminalView === 'ipv6' ? 'is-active' : ''}" type="button" data-terminal-view="ipv6">IPv6</button>
      </div>`;
    const toolbar = `
      <div class="ik-data-toolbar">
        <div class="ik-ghost-group">
          <span class="ik-ghost-pill is-active">${currentTerminalView === 'ipv6' ? 'IPv6 终端' : 'IPv4 终端'}</span>
          <button class="ik-ghost-pill" type="button" data-terminal-refresh="current">刷新当前页数据</button>
        </div>
        <div class="ik-ghost-group">
          <span class="ik-ghost-pill">身份关联视图</span>
        </div>
      </div>`;
    return section('终端监控', 'terminals', terminalViews[currentTerminalView].tip, `
      <div class="card">
        <div class="card-body">
          ${tabs}
          ${toolbar}
          <div class="grid-4" style="margin-top:8px">
            ${metricCard(currentTerminalView === 'ipv6' ? 'IPv6 终端' : 'IPv4 终端', fmtNumber(currentRows.length), `身份归并 ${fmtNumber(groupsForView.length)} 个`, '')}
            ${metricCard('可达/在线', fmtNumber(reachableCount), '当前 reachable 状态', '')}
            ${metricCard('实时上行', fmtRate(currentUp), currentTerminalView === 'ipv6' ? 'IPv6 聚合上行' : 'IPv4 聚合上行', '')}
            ${metricCard('实时下行', fmtRate(currentDown), currentTerminalView === 'ipv6' ? 'IPv6 聚合下行' : 'IPv4 聚合下行', '')}
          </div>
          <div class="ops-page-stack" style="margin-top:8px">
            ${opsDenseTableCard(`${currentTerminalView === 'ipv6' ? 'IPv6' : 'IPv4'} 即时队列`, `${fmtNumber(Math.min(sortedCurrentRows.length, 14))} / ${fmtNumber(sortedCurrentRows.length)} 条地址，按吞吐和连接优先排序`, ['设备', '状态', '本地地址', '另一地址族', '实时上行', '实时下行', '连接'], watchRows, `当前未读取到 ${currentTerminalView === 'ipv6' ? 'IPv6' : 'IPv4'} 即时队列`, 'ops-compact-density', 'ops-compact-table')}
            ${opsCard(`${currentTerminalView === 'ipv6' ? 'IPv6' : 'IPv4'} 身份覆盖摘要`, '先判断身份归并是否完整，再去看单个地址、会话和流量明细', opsKpiStrip([
              { label: '双栈设备', value: fmtNumber(dualStackDeviceCount), meta: '同一身份同时有 IPv4 / IPv6' },
              { label: '有 MAC', value: fmtNumber(currentRows.filter((row) => isRealMac(row.mac)).length), meta: '可用于设备归并' },
              { label: '有连接', value: fmtNumber(currentConnectionCount), meta: '连接数大于 0' },
              { label: '有实时流量', value: fmtNumber(currentTrafficCount), meta: '上下行速率大于 0' },
              { label: '静默/待机地址', value: fmtNumber(currentSilentCount), meta: currentTerminalView === 'ipv6' ? 'IPv6 不依赖 ARP' : '需要结合最后出现时间' },
              { label: '累计流量', value: fmtBytes(currentSessionBytes), meta: '当前会话累计' }
            ]), 'ops-info-card')}
            ${opsDenseTableCard('状态分布', `${fmtNumber(currentRows.length)} 条地址状态聚合`, ['状态', '数量', '分布'], statusRows, '当前未读取到状态分布', 'ops-compact-density', 'ops-table')}
            ${opsDenseTableCard('设备身份热点', '把设备身份、地址族、吞吐和连接压成短表，避免终端页右侧竖向拉长', ['设备', '地址 / MAC', '上 / 下', '连接 / 状态'], deviceHotRows, '当前未读取到设备身份热点', 'ops-compact-density', 'ops-table')}
            ${opsDenseTableCard(`${currentTerminalView === 'ipv6' ? 'IPv6' : 'IPv4'} 终端地址视图`, `${fmtNumber(currentRows.length)} 条地址，含跨地址族关联`, ['名称', '地址族', '本地地址', '关联另一地址族', 'MAC', '状态', '最后出现', '实时上行', '实时下行', '连接', '累计流量'], familyRows, `当前未读取到 ${currentTerminalView === 'ipv6' ? 'IPv6' : 'IPv4'} 终端数据`, 'ops-compact-density', 'ops-table')}
            ${opsDenseTableCard('设备身份合并表', `${fmtNumber(groupsForView.length)} 个设备身份`, ['设备', 'IPv4', 'IPv6', 'MAC', '状态', '实时上行', '实时下行', '连接', '累计流量'], buildDeviceIdentityRows(groupsForView, 48), '当前未读取到设备身份合并数据', 'ops-compact-density', 'ops-table')}
            ${currentTerminalView === 'ipv6'
              ? opsDenseTableCard('IPv6 活跃会话', `${fmtNumber(ipv6ActiveRows.length)} 条真实 IPv6 会话`, ['设备', '本地 IPv6', '远端地址', '协议', '实时上行', '实时下行', '超时', '连接标记'], ipv6ActiveRows, '当前未读取到 IPv6 活跃会话', 'ops-compact-density', 'ops-table')
              : ''}
          </div>
        </div>
      </div>`);
  };
  window.renderTerminals = renderTerminals;

  renderTrafficAudit = function patchedRenderTrafficAuditFlowDense(snapshot) {
    const connections = snapshot.connections || {};
    const terminals = snapshot.terminals || [];
    const active = connections.active || [];
    const ipMap = ipToTerminalMap(terminals);
    const ipv4Active = active.filter((row) => connectionFamily(row) === 'IPv4');
    const ipv6Active = active.filter((row) => connectionFamily(row) === 'IPv6');
    const topIpRows = (connections.topIps || []).map((row) => {
      const terminal = ipMap[String(row.ip || '')] || row;
      return `
        <tr>
          <td>${renderEditableNameCell(terminal, row.ip, terminalLabel(terminal) || row.ip || '-')}</td>
          <td>${addressFamilyBadge([row.ip])}</td>
          <td>${escapeHtml(row.ip || '-')}</td>
          <td>${escapeHtml(terminal.mac || '-')}</td>
          <td>${fmtNumber(row.connections)}</td>
          <td>${fmtRate(row.upRate)}</td>
          <td>${fmtRate(row.downRate)}</td>
        </tr>`;
    });
    const activeRows = active.map((row) => {
      const terminal = ipMap[String(row.localIp || '')] || {};
      return `
        <tr>
          <td>${escapeHtml(terminalLabel(terminal) || row.localIp || '-')}</td>
          <td>${addressFamilyBadge([row.localIp, row.remoteIp])}</td>
          <td>${escapeHtml(row.localIp)}</td>
          <td>${escapeHtml(row.remoteIp || '-')}</td>
          <td>${tag(row.protocol || '-', 'info')}</td>
          <td>${fmtRate(row.upRate)}</td>
          <td>${fmtRate(row.downRate)}</td>
          <td>${escapeHtml(row.timeout || '-')}</td>
          <td>${escapeHtml(row.mark || '-')}</td>
        </tr>`;
    });
    const terminalRows = terminals
      .slice()
      .sort((a, b) => totalTrafficRate(b) - totalTrafficRate(a) || Number(b.connections || 0) - Number(a.connections || 0))
      .slice(0, 40)
      .map((row) => `
        <tr>
          <td>${renderEditableNameCell(row, row.ip, terminalLabel(row))}</td>
          <td>${addressFamilyBadge([row.ip])}</td>
          <td>${escapeHtml(row.ip || '-')}</td>
          <td>${escapeHtml(row.mac || '-')}</td>
          <td>${terminalStatusTag(row.status)}</td>
          <td>${fmtRate(row.upRate)}</td>
          <td>${fmtRate(row.downRate)}</td>
          <td>${fmtNumber(row.connections)}</td>
          <td>${fmtBytes(row.sessionBytes)}</td>
        </tr>`);
    return section('流量审计', 'trafficAudit', '按会话、协议、地址族和设备身份审计当前活跃流量', `
      <div class="grid-4">
        ${metricCard('连接总数', fmtCompact(connections.total), '连接跟踪总量', '')}
        ${metricCard('活跃会话', fmtNumber(active.length), `IPv4 / IPv6 ${fmtNumber(ipv4Active.length)} / ${fmtNumber(ipv6Active.length)}`, '')}
        ${metricCard('协议拆分', formatProtocolSplit(connections), '最近一次全量采样', formatProtocolSampleTime(connections))}
        ${metricCard('审计刷新', connections.detailUpdatedAt ? escapeHtml(connections.detailUpdatedAt) : '等待采集', '会话明细刷新时间', '')}
      </div>
      <div class="ops-page-stack" style="margin-top:8px">
        ${opsCard('会话审计摘要', '借鉴 UniFi Flow 的思路，把协议、地址族、端点、方向速率放在会话上下文里，而不是只看 IP 数字', opsStatTiles([
          { label: 'IPv4 活跃会话', value: fmtNumber(ipv4Active.length), meta: '本地或远端为 IPv4' },
          { label: 'IPv6 活跃会话', value: fmtNumber(ipv6Active.length), meta: '本地或远端为 IPv6' },
          { label: 'TCP 会话', value: fmtNumber(active.filter((row) => String(row.protocol || '').toUpperCase() === 'TCP').length), meta: '当前明细' },
          { label: 'UDP 会话', value: fmtNumber(active.filter((row) => String(row.protocol || '').toUpperCase() === 'UDP').length), meta: '当前明细' },
          { label: '上行合计', value: fmtRate(active.reduce((sum, row) => sum + Number(row.upRate || 0), 0)), meta: '活跃会话合计' },
          { label: '下行合计', value: fmtRate(active.reduce((sum, row) => sum + Number(row.downRate || 0), 0)), meta: '活跃会话合计' }
        ]), 'ops-info-card')}
        <div class="ops-double">
          ${opsDenseTableCard('协议 / 地址族分布', `${fmtNumber(active.length)} 条活跃会话`, ['协议', '会话', 'IPv4 / IPv6', '实时上行', '实时下行'], protocolRows(active), '当前未读取到协议分布', 'ops-compact-density', 'ops-compact-table')}
          ${opsDenseTableCard('单 IP 活跃连接排行', `${fmtNumber((connections.topIps || []).length)} 个端点`, ['设备', '族', '本地 IP', 'MAC', '连接', '实时上行', '实时下行'], topIpRows, '当前未读取到单 IP 排行', 'ops-compact-density', 'ops-compact-table')}
        </div>
        ${opsDenseTableCard('当前活跃连接明细', `${fmtNumber(active.length)} 条，按 RouterOS 真实连接明细`, ['设备', '族', '本地地址', '远端地址', '协议', '实时上行', '实时下行', '超时', '连接标记'], activeRows, '当前未读取到活跃连接', 'ops-compact-density', 'ops-compact-table')}
        ${opsDenseTableCard('终端流量审计', `${fmtNumber(terminals.length)} 台终端，按吞吐和连接排序`, ['名称', '族', 'IP', 'MAC', '状态', '实时上行', '实时下行', '连接', '累计流量'], terminalRows, '当前未读取到终端流量审计数据', 'ops-compact-density', 'ops-compact-table')}
      </div>`);
  };
  window.renderTrafficAudit = renderTrafficAudit;

  renderTrafficLoad = function patchedRenderTrafficLoadIpDense(snapshot) {
    const overview = snapshot.overview || {};
    const history = overview.history || {};
    const rawPppoe = snapshot.pppoe || [];
    const pppoe = opsSortPppoeNamedRows(rawPppoe);
    const interfaces = (snapshot.interfaces || []).slice().sort((a, b) => totalTrafficRate(b, 'txRate', 'rxRate') - totalTrafficRate(a, 'txRate', 'rxRate'));
    const terminals = (snapshot.terminals || []).slice().sort((a, b) => totalTrafficRate(b) - totalTrafficRate(a));
    const loadBalance = snapshot.loadBalance || {};
    const activeLines = pppoe.filter((row) => row.running).length;
    const busiestLine = rawPppoe.slice().sort((a, b) => totalTrafficRate(b) - totalTrafficRate(a))[0];
    const trafficTerminals = terminals.filter((row) => totalTrafficRate(row) > 0);
    const ipv6Interfaces = interfaces.filter((row) => splitIpFamilies(row.ips || []).ipv6.length);
    const dualStackInterfaces = interfaces.filter((row) => {
      const families = splitIpFamilies(row.ips || []);
      return families.ipv4.length && families.ipv6.length;
    }).length;
    const ipv6OnlyInterfaces = interfaces.filter((row) => {
      const families = splitIpFamilies(row.ips || []);
      return !families.ipv4.length && families.ipv6.length;
    }).length;
    const issueInterfaces = interfaces.filter((row) => Number(row.txDrop || 0) + Number(row.rxDrop || 0) + Number(row.txError || 0) + Number(row.rxError || 0) > 0).length;
    const activeInterfaceCount = interfaces.filter((row) => totalTrafficRate(row, 'txRate', 'rxRate') > 0).length;
    const ipv4TrafficTerminals = trafficTerminals.filter((row) => !isIpv6Address(row.ip)).length;
    const ipv6TrafficTerminals = trafficTerminals.filter((row) => isIpv6Address(row.ip)).length;
    const pollSeconds = snapshot.meta?.pollSeconds || '-';
    const totalLineTraffic = pppoe.reduce((sum, row) => sum + totalTrafficRate(row), 0);
    const aggregateHistoryPoints = Math.max((history.uplink || []).length, (history.downlink || []).length, 0);
    const distributionRows = opsSortPppoeNamedRows(loadBalance.distribution || []);
    const lineShareRows = distributionRows.length
      ? distributionRows.slice(0, 8).map((row) => ({
        label: row.name,
        value: Number(row.share || 0),
        display: `${Number(row.share || 0).toFixed(1)}%`
      }))
      : totalLineTraffic > 0
        ? rawPppoe
          .slice()
          .sort((a, b) => totalTrafficRate(b) - totalTrafficRate(a))
          .slice(0, 8)
          .map((row) => ({
            label: row.name,
            value: (totalTrafficRate(row) / totalLineTraffic) * 100,
            display: `${((totalTrafficRate(row) / totalLineTraffic) * 100).toFixed(1)}%`
          }))
        : [];
    const lineShareBlock = lineShareRows.length
      ? opsBarStack(lineShareRows, { percentMode: true, emptyText: '当前未形成可读的线路占比' })
      : emptyBlock('当前未形成可读的线路占比');
    const aggregateTrendBlock = aggregateHistoryPoints
      ? `<div class="chart-box"><div class="chart-label"><span>总上 / 总下</span><span>${escapeHtml(String(pollSeconds))}s / 点</span></div>${lineChart([history.uplink || [], history.downlink || []], { colors: ['#165dff', '#f53f3f'] })}</div>`
      : emptyBlock('当前未读取到 WAN 聚合历史');
    const lineRows = pppoe.map((row) => `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${statusTag(row.running)}</td>
        <td>${addressCell(row.addresses || [])}</td>
        <td>${fmtRate(row.upRate)}</td>
        <td>${fmtRate(row.downRate)}</td>
        <td>${fmtBytes(row.txBytes)}</td>
        <td>${fmtBytes(row.rxBytes)}</td>
        <td>${routeSummaryCell(row.routes || [])}</td>
        <td>${escapeHtml(row.parent || '-')}</td>
      </tr>`);
    const interfaceRows = interfaces.slice(0, 24).map((row) => `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${tag(row.role || '-', row.role === 'WAN' ? 'info' : 'ok')}</td>
        <td>${statusTag(row.running, row.disabled)}</td>
        <td>${addressFamilyBadge(row.ips || [])}</td>
        <td>${addressCell(row.ips || [])}</td>
        <td>${fmtRate(row.txRate)}</td>
        <td>${fmtRate(row.rxRate)}</td>
        <td>${packetSummaryCell(Number(row.txDrop || 0) + Number(row.rxDrop || 0), Number(row.txError || 0) + Number(row.rxError || 0))}</td>
        <td>${escapeHtml(row.mac || '-')}</td>
      </tr>`);
    const terminalRows = terminals.slice(0, 30).map((row) => `
      <tr>
        <td>${renderEditableNameCell(row, row.ip, terminalLabel(row))}</td>
        <td>${addressFamilyBadge([row.ip])}</td>
        <td>${escapeHtml(row.ip || '-')}</td>
        <td>${escapeHtml(row.mac || '-')}</td>
        <td>${fmtRate(row.upRate)}</td>
        <td>${fmtRate(row.downRate)}</td>
        <td>${fmtNumber(row.connections)}</td>
        <td>${fmtBytes(row.sessionBytes)}</td>
      </tr>`);
    const terminalHotRows = trafficTerminals.slice(0, 8).map((row) => `
      <tr>
        <td>${escapeHtml(terminalLabel(row))}</td>
        <td>${opsTwoLineCell(escapeHtml(row.ip || '-'), isRealMac(row.mac) ? escapeHtml(row.mac) : '无 MAC')}</td>
        <td>${opsTwoLineCell(fmtRate(row.upRate), fmtRate(row.downRate))}</td>
        <td>${opsTwoLineCell(`连接 ${fmtNumber(row.connections)}`, fmtBytes(row.sessionBytes))}</td>
      </tr>`);
    const lineHotRows = rawPppoe
      .slice()
      .sort((a, b) => totalTrafficRate(b) - totalTrafficRate(a))
      .slice(0, 8)
      .map((row) => {
        const activeRoutes = (row.routes || []).filter((route) => route && route.active);
        const role = routeRoleFor(activeRoutes, row.routes || []);
        return `
          <tr>
            <td>${escapeHtml(row.name)}</td>
            <td>${opsTwoLineCell(escapeHtml(row.parent || '-'), tag(role.label, role.level))}</td>
            <td>${opsTwoLineCell(fmtRate(row.upRate), fmtRate(row.downRate))}</td>
            <td>${fmtRate(totalTrafficRate(row))}</td>
          </tr>`;
      });
    return section('流量负载', 'trafficLoad', '按线路、接口、地址族和终端身份展示真实吞吐，不再只给低密度排行', `
      <div class="grid-4">
        ${metricCard('总上行速率', fmtRate(overview.uplinkBps), `在线宽带 ${fmtNumber(activeLines)} / ${fmtNumber(pppoe.length)}`, busiestLine ? `最繁忙 ${escapeHtml(busiestLine.name)}` : '暂无在线宽带')}
        ${metricCard('总下行速率', fmtRate(overview.downlinkBps), `在线终端 ${fmtNumber(overview.onlineTerminals)}`, `有流量终端 ${fmtNumber(trafficTerminals.length)}`)}
        ${metricCard('IPv6 接口覆盖', `${fmtNumber(ipv6Interfaces.length)} / ${fmtNumber(interfaces.length)}`, '接口含真实 IPv6 地址', '')}
        ${metricCard('活跃观测对象', fmtNumber(interfaces.length), `有流量接口 ${fmtNumber(activeInterfaceCount)}`, `终端排行 ${fmtNumber(trafficTerminals.length)} 台`)}
      </div>
      <div class="ops-workbench" style="margin-top:8px">
        <div class="ops-workbench-grid">
          ${opsCard('流量主屏', '固定宽屏下先看 WAN 聚合、线路占比与采样节奏，再往下钻接口和终端明细', `
            ${opsKpiStrip([
              { label: 'WAN 上 / 下', value: `${fmtRate(overview.uplinkBps)} / ${fmtRate(overview.downlinkBps)}`, meta: '总上行 / 总下行' },
              { label: '最繁忙线路', value: busiestLine ? fmtRate(totalTrafficRate(busiestLine)) : '-', meta: busiestLine ? escapeHtml(busiestLine.name) : '暂无实时吞吐' },
              { label: '采样节奏', value: `${escapeHtml(String(pollSeconds))}s / 点`, meta: `${fmtNumber(aggregateHistoryPoints)} 个聚合采样点` }
            ])}
            <div class="ops-section-grid" style="margin-top:8px">
              <div>${aggregateTrendBlock}</div>
              <div class="ops-panel-stack">
                <div class="ops-stack-note">${distributionRows.length ? '优先展示负载均衡分配结果；缺失时回退到实时吞吐折算占比。' : totalLineTraffic > 0 ? '当前缺少策略分配结果，已用真实吞吐折算线路占比。' : '当前暂无可读吞吐或策略占比结果。'}</div>
                ${lineShareBlock}
              </div>
            </div>`, 'ops-info-card')}
          <div class="ops-workbench-side">
            ${opsCard('流量结构摘要', '把地址族覆盖、错误接口和流量终端压缩成一列，避免重复大卡片堆叠', opsStatTiles([
              { label: '双栈接口', value: fmtNumber(dualStackInterfaces), meta: '同时具备 IPv4 / IPv6' },
              { label: '仅 IPv6/链路本地', value: fmtNumber(ipv6OnlyInterfaces), meta: '常见于虚拟或链路本地接口' },
              { label: '有丢错接口', value: fmtNumber(issueInterfaces), meta: '丢包或错包累计非 0' },
              { label: '有流量接口', value: fmtNumber(activeInterfaceCount), meta: `接口总数 ${fmtNumber(interfaces.length)}` },
              { label: 'IPv4 流量终端', value: fmtNumber(ipv4TrafficTerminals), meta: '当前有实时吞吐' },
              { label: 'IPv6 流量终端', value: fmtNumber(ipv6TrafficTerminals), meta: '当前有实时吞吐' }
            ]), 'ops-info-card')}
            ${opsDenseTableCard('终端热区', '把终端身份、地址、实时吞吐和连接压成短表，避免右侧被长列表拉长', ['终端', '地址 / MAC', '上 / 下', '连接 / 会话'], terminalHotRows, '当前未读取到终端热区', 'ops-compact-density', 'ops-compact-table')}
          </div>
        </div>
        <div class="ops-double">
          ${opsDenseTableCard('终端流量排行', `${fmtNumber(terminals.length)} 台终端，按实时吞吐优先排序`, ['名称', '族', 'IP', 'MAC', '实时上行', '实时下行', '连接', '累计流量'], terminalRows, '当前未读取到终端流量排行', 'ops-compact-density', 'ops-compact-table')}
          ${opsDenseTableCard('接口吞吐 / 地址族覆盖', `${fmtNumber(interfaces.length)} 个接口，按实时吞吐排序`, ['接口', '角色', '状态', '族', '地址', '实时上行', '实时下行', '丢 / 错', 'MAC'], interfaceRows, '当前未读取到接口吞吐排行', 'ops-compact-density', 'ops-compact-table')}
        </div>
        <div class="ops-split">
          ${opsDenseTableCard('宽带实时负载', '按 PPPoE 名称固定排序，附带地址和活动路由', ['线路', '状态', 'IP 地址', '实时上行', '实时下行', '累计上行', '累计下行', '活动路由', '父接口'], lineRows, '当前未读取到宽带实时负载', 'ops-compact-density', 'ops-compact-table')}
          ${opsDenseTableCard('线路热点队列', '把父接口、出口角色和实时吞吐压成短表，避免下半屏再出现长竖列留白', ['线路', '父接口 / 角色', '上 / 下', '合计'], lineHotRows, '当前未读取到线路热点队列', 'ops-compact-density', 'ops-compact-table')}
        </div>
      </div>`);
  };
  window.renderTrafficLoad = renderTrafficLoad;

  function rebalancePublicOverviewColumns() {
    try {
      const overview = document.querySelector('#overview');
      if (!overview) return;
      if (!overview.querySelector('.ops-public-home-grid')) return;
      const main = overview.querySelector('.ops-public-home-main');
      const side = overview.querySelector('.ops-public-home-side');
      if (!main || !side) return;

      const trendBand = overview.querySelector('.ops-public-home-trend-band');
      const rankBand = overview.querySelector('.ops-public-home-rank-band');
      const loadCard = trendBand?.querySelector('.ik-system-load-card');
      const rankGrid = rankBand?.querySelector('[data-overview-rank-grid]');

      if (loadCard && !side.querySelector('.ik-system-load-card')) {
        side.appendChild(loadCard);
      }
      if (rankGrid && !side.querySelector('[data-overview-rank-grid]')) {
        side.appendChild(rankGrid);
      }

      if (trendBand) trendBand.remove();
      if (rankBand) rankBand.remove();

    } catch (error) {
      // Keep the public page usable even if the balancing patch fails.
    }
  }

  const originalRenderAppForWhitespacePatch = renderApp;
  renderApp = function patchedRenderAppForWhitespacePatch(snapshot) {
    const result = originalRenderAppForWhitespacePatch(snapshot);
    rebalancePublicOverviewColumns();
    return result;
  };
  window.renderApp = renderApp;

  const snapshotToRender = displayedSnapshot || latestSnapshot;
  if (snapshotToRender) {
    renderApp(snapshotToRender);
    if (typeof ensureDnsRuleBrowserLoaded === 'function') {
      ensureDnsRuleBrowserLoaded(snapshotToRender);
    }
  }
})();
