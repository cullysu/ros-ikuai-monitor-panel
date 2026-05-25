(() => {
  if (window.__scaleAdaptivePatchV1) return;
  window.__scaleAdaptivePatchV1 = true;

  const state = window.__scaleAdaptiveState || { page: {}, query: {}, group: {} };
  window.__scaleAdaptiveState = state;

  const style = document.createElement('style');
  style.textContent = `
    #app[aria-live] { }
    .scale-shell { display: grid; gap: 12px; }
    .scale-primary,
    .pm-action-panel,
    .pm-drilldown-panel,
    .scale-detail-card {
      border: 1px solid #dbe7f6;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 6px 18px rgba(18,41,70,.045);
    }
    .scale-primary { padding: 14px; }
    .scale-primary h3,
    .pm-panel-title { margin: 0; font-size: 18px; line-height: 1.25; color: #172033; }
    .scale-primary p,
    .pm-panel-copy { margin: 8px 0 0; color: #516070; font-size: 13px; line-height: 1.55; }
    .scale-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; color: #64748b; font-size: 12px; line-height: 1.35; }
    .scale-meta span { display: inline-flex; min-height: 24px; align-items: center; padding: 0 8px; border: 1px solid #e2eaf5; border-radius: 999px; background: #fff; }
    .scale-meta strong { color: #243246; }
    .pm-overview { display: grid; gap: 12px; }
    .pm-overview-main { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(300px, .75fr); gap: 12px; align-items: start; }
    .pm-action-panel { padding: 14px; border-left: 4px solid #245bff; }
    .pm-action-panel.is-warning { border-left-color: #ffb020; }
    .pm-action-panel.is-critical { border-left-color: #d92d20; }
    .pm-action-head { display: flex; gap: 10px; align-items: flex-start; justify-content: space-between; }
    .pm-action-severity { display: inline-flex; width: fit-content; max-width: 100%; min-height: 24px; align-items: center; justify-content: center; padding: 0 8px; border-radius: 999px; font-size: 12px; font-weight: 800; background: #eef6ff; color: #1f3b63; white-space: nowrap; }
    .pm-action-severity.is-warning { background: #fff7e6; color: #8a5700; }
    .pm-action-severity.is-critical { background: #fff1f0; color: #b42318; }
    .pm-next-step { margin-top: 12px; padding: 10px 12px; border-radius: 8px; background: #eef6ff; color: #1f3b63; font-size: 13px; line-height: 1.45; }
    .pm-action-list { display: grid; gap: 8px; margin-top: 10px; }
    .pm-action-item { display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 10px; align-items: start; padding: 9px 0; border-top: 1px solid #edf3fa; }
    .pm-action-item:first-child { border-top: 0; }
    .pm-action-item b { display: block; color: #1f2a3d; font-size: 13px; line-height: 1.35; }
    .pm-action-item span { color: #607086; font-size: 12px; line-height: 1.4; }
    .pm-drilldown-panel { padding: 14px; }
    .pm-shortcuts { display: grid; gap: 8px; margin-top: 12px; }
    .pm-shortcut { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: center; min-height: 44px; padding: 8px 10px; border: 1px solid #e3ecf7; border-radius: 8px; background: #fff; color: #1f2a3d; text-decoration: none; }
    .pm-shortcut:hover { border-color: #bdd4f4; background: #f7fbff; }
    .pm-shortcut b { display: block; font-size: 13px; line-height: 1.25; }
    .pm-shortcut span { display: block; margin-top: 3px; color: #68788d; font-size: 12px; line-height: 1.35; }
    .pm-shortcut i { color: #245bff; font-style: normal; font-weight: 800; }
    .scale-detail-head { display: grid; gap: 8px; padding: 12px; border: 1px solid #e1eaf5; border-radius: 8px; background: #f8fbff; }
    .scale-detail-headline { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: space-between; }
    .scale-detail-title { color: #1f2a3d; font-size: 15px; font-weight: 800; }
    .scale-detail-kpis { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .scale-detail-kpis span { display: inline-flex; min-height: 24px; align-items: center; padding: 0 8px; border: 1px solid #dce7f4; border-radius: 999px; background: #fff; color: #536377; font-size: 12px; }
    .scale-toolbar { display: grid; grid-template-columns: minmax(240px, 1fr) auto auto; gap: 8px; align-items: end; margin-bottom: 8px; }
    .scale-field { display: grid; gap: 4px; min-width: 0; }
    .scale-field label { color: #516070; font-size: 12px; font-weight: 800; }
    .scale-search, .scale-select { width: 100%; min-height: 38px; border: 1px solid #d8e2ef; border-radius: 8px; background: #fff; color: #223047; font-size: 13px; padding: 0 10px; }
    .scale-clear { min-height: 38px; min-width: 74px; border: 1px solid #d8e2ef; border-radius: 8px; background: #fff; color: #243246; font-weight: 800; cursor: pointer; }
    .scale-clear:disabled { opacity: .45; cursor: not-allowed; }
    .scale-filter-summary { margin: 0 0 8px; color: #5e6f84; font-size: 12px; line-height: 1.45; }
    .scale-table-wrap { width: 100%; max-width: 100%; overflow: auto; border: 1px solid #e3ecf7; border-radius: 8px; background: #fff; }
    .scale-table { width: 100%; min-width: 760px; border-collapse: collapse; font-size: 12px; }
    .scale-table th { position: sticky; top: 0; z-index: 1; padding: 8px 10px; background: #f5f8fc; color: #5c6d84; text-align: left; font-weight: 800; white-space: nowrap; border-bottom: 1px solid #e4edf7; }
    .scale-table td { padding: 8px 10px; color: #253247; border-top: 1px solid #edf3fa; vertical-align: top; }
    .scale-table tr:first-child td { border-top: 0; }
    .scale-table td:first-child { font-weight: 800; color: #152238; }
    .scale-shell,
    .scale-detail-card,
    .scale-detail-card .card-body {
      min-width: 0;
      max-width: 100%;
    }
    #terminals .scale-detail-card,
    #terminals .scale-detail-card .card-body,
    #trafficLoad .scale-detail-card,
    #trafficLoad .scale-detail-card .card-body {
      overflow: hidden;
    }
    #terminals .scale-table-wrap,
    #trafficLoad .scale-table-wrap {
      width: 100%;
      max-width: 100%;
      overflow-x: auto;
      overscroll-behavior-x: contain;
    }
    #terminals .scale-table,
    #trafficLoad .scale-table {
      table-layout: fixed;
    }
    #terminals .scale-table th,
    #terminals .scale-table td,
    #trafficLoad .scale-table th,
    #trafficLoad .scale-table td {
      min-width: 0;
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    #terminals .scale-table td:nth-child(5),
    #terminals .scale-table td:nth-child(6),
    #terminals .scale-table td:nth-child(7),
    #terminals .scale-table td:nth-child(8),
    #trafficLoad .scale-table td:nth-child(3),
    #trafficLoad .scale-table td:nth-child(4),
    #trafficLoad .scale-table td:nth-child(5),
    #trafficLoad .scale-table td:nth-child(6) {
      white-space: nowrap;
    }
    .scale-terminal-name,
    .scale-terminal-ip,
    .scale-terminal-mac {
      min-width: 0;
      max-width: 100%;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .scale-terminal-ip,
    .scale-terminal-mac {
      font-family: "Cascadia Mono","Consolas","Microsoft YaHei",monospace;
      font-size: 11.5px;
      line-height: 1.35;
    }
    #terminals .alias-cell,
    #trafficLoad .alias-cell,
    #terminals .alias-main,
    #trafficLoad .alias-main,
    #terminals .alias-name,
    #trafficLoad .alias-name {
      min-width: 0;
      max-width: 100%;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    #terminals .alias-cell,
    #trafficLoad .alias-cell {
      align-items: flex-start;
    }
    .scale-empty { padding: 18px; color: #69788d; text-align: center; }
    .scale-pager { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: flex-end; margin-top: 8px; color: #69788d; font-size: 12px; }
    .scale-pager button { min-height: 34px; min-width: 44px; border: 1px solid #d8e2ef; border-radius: 8px; background: #fff; color: #243246; font-weight: 800; cursor: pointer; }
    .scale-pager button:disabled { opacity: .45; cursor: not-allowed; }
    .scale-window-note { margin-top: 8px; color: #718096; font-size: 12px; line-height: 1.4; }
    #overview .section-tip,
    #interfaces .section-tip,
    .pm-risk-copy,
    .pm-panel-copy,
    .pm-interface-copy,
    .pm-interface-focus span,
    .pm-home-action span,
    .pm-status-row span { white-space: normal; overflow-wrap: anywhere; word-break: break-word; }
    .pm-home { display: grid; gap: 12px; min-width: 0; }
    .pm-home-grid { display: grid; grid-template-columns: minmax(0, 1.18fr) minmax(320px, .82fr); gap: 12px; align-items: stretch; }
    .pm-risk-hero,
    .pm-home-panel,
    .pm-proof-panel,
    .pm-interface-summary,
    .pm-interface-workbench {
      border: 1px solid #dbe7f6;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 6px 18px rgba(18,41,70,.045);
    }
    .pm-home > *,
    .pm-home-grid > *,
    .pm-interface-page > *,
    .pm-interface-summary > *,
    .pm-interface-workbench > * { min-width: 0; }
    .pm-risk-hero,
    .pm-home-panel,
    .pm-proof-panel,
    .pm-interface-summary,
    .pm-interface-workbench { width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box; }
    .pm-risk-hero { display: grid; gap: 12px; min-height: 260px; padding: 16px; border-left: 5px solid #245bff; }
    .pm-risk-hero.is-ok { border-left-color: #12b76a; }
    .pm-risk-hero.is-warning { border-left-color: #f79009; }
    .pm-risk-hero.is-critical { border-left-color: #d92d20; }
    .pm-risk-top { display: flex; gap: 10px; align-items: flex-start; justify-content: space-between; }
    .pm-risk-kicker { color: #64748b; font-size: 12px; font-weight: 800; line-height: 1.35; }
    .pm-risk-title { margin-top: 4px; color: #122033; font-size: 24px; font-weight: 900; line-height: 1.18; }
    .pm-risk-copy { max-width: 760px; margin: 8px 0 0; color: #536377; font-size: 13px; line-height: 1.55; }
    .pm-risk-badge { display: inline-flex; min-height: 28px; align-items: center; justify-content: center; padding: 0 10px; border-radius: 999px; background: #eef6ff; color: #1f3b63; font-size: 12px; font-weight: 900; white-space: nowrap; }
    .pm-risk-badge.is-ok { background: #ecfdf3; color: #027a48; }
    .pm-risk-badge.is-warning { background: #fff7e6; color: #8a5700; }
    .pm-risk-badge.is-critical { background: #fff1f0; color: #b42318; }
    .pm-next-action { display: grid; gap: 4px; padding: 12px; border: 1px solid #cfe0f5; border-radius: 8px; background: #f7fbff; color: #1f3b63; }
    .pm-next-action b { color: #11243d; font-size: 13px; }
    .pm-next-action span { font-size: 13px; line-height: 1.45; }
    .pm-home-actions { display: grid; gap: 8px; }
    .pm-home-action { display: grid; grid-template-columns: 88px minmax(0, 1fr) auto; gap: 10px; align-items: center; min-height: 46px; padding: 9px 10px; border: 1px solid #e3ecf7; border-radius: 8px; color: #1f2a3d; text-decoration: none; }
    .pm-home-action:hover { border-color: #bdd4f4; background: #f8fbff; }
    .pm-home-action b { display: block; color: #172033; font-size: 13px; line-height: 1.25; }
    .pm-home-action span { display: block; color: #64748b; font-size: 12px; line-height: 1.35; }
    .pm-home-action i { color: #245bff; font-style: normal; font-weight: 900; }
    .pm-home-panel { display: grid; gap: 12px; padding: 14px; }
    .pm-status-stack { display: grid; gap: 8px; }
    .pm-status-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: center; min-height: 42px; padding: 8px 10px; border: 1px solid #e5edf7; border-radius: 8px; background: #fbfdff; }
    .pm-status-row b { color: #1f2a3d; font-size: 13px; line-height: 1.25; }
    .pm-status-row span { color: #68788d; font-size: 12px; line-height: 1.35; }
    .pm-status-row strong { color: #172033; font-size: 13px; }
    .pm-proof-panel { padding: 14px; }
    .pm-proof-chart { margin-top: 10px; border: 1px solid #e3ecf7; border-radius: 8px; background: #f8fbff; padding: 10px; }
    .pm-proof-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 10px; min-width: 0; }
    .pm-proof-item {
      min-width: 0;
      min-height: 56px;
      padding: 9px 8px;
      overflow: hidden;
      border: 1px solid #e3ecf7;
      border-radius: 8px;
      background: #fff;
      box-sizing: border-box;
    }
    .pm-proof-item span {
      display: block;
      min-width: 0;
      color: #64748b;
      font-size: 12px;
      line-height: 1.25;
      overflow-wrap: anywhere;
    }
    .pm-proof-item b {
      display: block;
      min-width: 0;
      max-width: 100%;
      margin-top: 5px;
      color: #172033;
      font-size: clamp(11px, 1.05vw, 16px);
      line-height: 1.15;
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: break-word;
      font-variant-numeric: tabular-nums;
    }
    .pm-interface-page { display: grid; gap: 12px; min-width: 0; }
    .pm-interface-summary { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, .45fr); gap: 12px; padding: 14px; }
    .pm-interface-head { display: grid; gap: 8px; }
    .pm-interface-title { color: #122033; font-size: 20px; font-weight: 900; line-height: 1.2; }
    .pm-interface-copy { color: #536377; font-size: 13px; line-height: 1.55; }
    .pm-interface-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
    .pm-interface-kpi { min-height: 66px; padding: 10px; border: 1px solid #e3ecf7; border-radius: 8px; background: #fbfdff; }
    .pm-interface-kpi span { display: block; color: #64748b; font-size: 12px; line-height: 1.25; }
    .pm-interface-kpi b { display: block; margin-top: 6px; color: #172033; font-size: 18px; line-height: 1.15; }
    .pm-interface-focus { display: grid; gap: 8px; padding: 12px; border: 1px solid #e3ecf7; border-radius: 8px; background: #f8fbff; }
    .pm-interface-focus-title { color: #64748b; font-size: 12px; font-weight: 900; }
    .pm-interface-focus b { color: #172033; font-size: 16px; line-height: 1.2; }
    .pm-interface-focus span { color: #536377; font-size: 12px; line-height: 1.4; }
    .pm-interface-workbench { padding: 14px; }
    .scale-group-tabs { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }
    .scale-group-tab { min-height: 40px; padding: 6px 10px; border: 1px solid #d8e2ef; border-radius: 8px; background: #fff; color: #243246; cursor: pointer; text-align: left; }
    .scale-group-tab.is-active { border-color: #245bff; background: #eef6ff; color: #174ea6; }
    .scale-group-tab b { display: block; font-size: 13px; line-height: 1.15; }
    .scale-group-tab span { display: block; margin-top: 3px; font-size: 11px; color: #667892; }
    .pm-iface-name { display: grid; gap: 3px; }
    .pm-iface-name b { color: #172033; font-size: 12px; line-height: 1.2; }
    .pm-iface-name span { color: #68788d; font-size: 11px; line-height: 1.25; }
    .pm-iface-detail summary { color: #245bff; cursor: pointer; font-weight: 800; }
    .pm-iface-detail div { margin-top: 6px; color: #536377; font-size: 12px; line-height: 1.45; }
    html,
    body {
      overflow-x: clip !important;
    }
    .app.ik-shell .frame {
      overflow-x: clip !important;
      overflow-y: visible !important;
    }
    #overview.ikuai-overview-section { margin-top: 0; }
    #overview.ikuai-overview-section > .section-head { display: none; }
    .ikuai-home { display: grid; gap: 14px; min-width: 0; }
    .ikuai-home-grid { display: grid; grid-template-columns: minmax(340px, 430px) minmax(0, 1fr); gap: 14px; align-items: start; }
    .ikuai-home-grid > .ikuai-wan-card {
      position: sticky;
      top: 14px;
      align-self: start;
      max-height: calc(100vh - 28px);
      overflow-y: auto;
      overscroll-behavior: contain;
      scrollbar-gutter: stable;
    }
    .ikuai-card {
      min-width: 0;
      border: 1px solid #e7edf5;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 4px 14px rgba(18,41,70,.035);
    }
    .ikuai-card-head { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: space-between; padding: 16px 20px 0; }
    .ikuai-card-title { color: #121826; font-size: 15px; font-weight: 900; line-height: 1.25; }
    .ikuai-card-subtle { color: #7b8797; font-size: 12px; line-height: 1.45; }
    .ikuai-wan-card { min-height: 680px; padding: 20px; }
    .ikuai-wan-switch { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 8px; align-items: center; margin: 14px 0 18px; }
    .ikuai-wan-switch span { color: #5f6b7a; font-size: 12px; font-weight: 800; white-space: nowrap; }
    .ikuai-wan-select { width: 100%; min-height: 34px; border: 1px solid transparent; border-radius: 6px; background: #f3f5f7; color: #1f2937; font-size: 13px; font-weight: 700; text-align: center; text-align-last: center; padding: 0 32px 0 12px; cursor: pointer; }
    .ikuai-wan-select:hover { border-color: #d8e2ef; background: #eef3f8; }
    .ikuai-wan-select:focus { outline: 2px solid rgba(72, 145, 232, .22); border-color: #4891e8; background: #fff; }
    .ikuai-info-list { display: grid; gap: 0; }
    .ikuai-info-row { display: grid; grid-template-columns: 128px minmax(0, 1fr); gap: 10px; align-items: start; min-height: 38px; color: #101828; font-size: 13px; }
    .ikuai-info-row span { color: #111827; }
    .ikuai-info-row strong { min-width: 0; color: #1f2937; font-weight: 700; text-align: right; overflow-wrap: anywhere; }
    .ikuai-rate-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 4px 0 8px; color: #172554; font-size: 12px; }
    .ikuai-rate-row b { color: #172554; font-size: 13px; }
    .ikuai-rate-row span:last-child { color: #0f7a3a; text-align: right; }
    .ikuai-wan-chart { margin: 8px 0 12px; padding: 8px 0 0; border-bottom: 1px solid #eef2f7; }
    .ikuai-wan-chart svg { width: 100%; height: 96px; display: block; }
    .ikuai-latency { display: flex; align-items: center; justify-content: space-between; min-height: 38px; color: #111827; font-size: 13px; border-bottom: 1px solid #eef2f7; }
    .ikuai-quick-head { display: flex; align-items: center; justify-content: space-between; margin: 16px 0 12px; }
    .ikuai-quick-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px 14px; }
    .ikuai-quick { display: grid; place-items: center; gap: 7px; min-height: 58px; color: #6b7280; text-decoration: none; font-size: 12px; }
    .ikuai-quick:hover { color: #1769e0; }
    .ikuai-quick-icon { display: grid; place-items: center; width: 30px; height: 26px; border: 1px solid #dfe7f2; border-radius: 7px; color: #2f3a48; background: #fff; }
    .ikuai-quick .ik-menu-icon { width: 15px; height: 15px; }
    .ikuai-right { display: grid; gap: 14px; min-width: 0; }
    .ikuai-system-strip { display: grid; grid-template-columns: minmax(0, 1.3fr) repeat(3, minmax(140px, .55fr)); gap: 14px; padding: 18px 20px; align-items: center; }
    .ikuai-device { display: grid; grid-template-columns: 122px minmax(0, 1fr); gap: 16px; align-items: center; min-width: 0; }
    .ikuai-device-art { position: relative; width: 112px; height: 58px; border-radius: 8px; background: linear-gradient(180deg,#eef2f7,#d9e0ea); box-shadow: inset 0 -8px 0 rgba(0,0,0,.06); }
    .ikuai-device-art::before { content: ""; position: absolute; left: 14px; top: 18px; width: 46px; height: 3px; background: #7b8797; box-shadow: 0 8px 0 #7b8797, 0 16px 0 #7b8797; }
    .ikuai-device-art::after { content: ""; position: absolute; right: 14px; top: 23px; width: 8px; height: 8px; border-radius: 50%; background: #8b95a5; box-shadow: 12px 0 0 #8b95a5; }
    .ikuai-device-name { color: #111827; font-size: 15px; font-weight: 900; }
    .ikuai-device-meta { margin-top: 6px; color: #2f6fed; font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
    .ikuai-stat-tile { display: grid; grid-template-columns: 48px minmax(0, 1fr); gap: 10px; align-items: center; min-height: 80px; padding: 12px; border-radius: 8px; background: #f4f8ff; }
    .ikuai-stat-tile.is-purple { background: #f6f3ff; }
    .ikuai-stat-tile.is-orange { background: #fff8ed; }
    .ikuai-ring { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 50%; border: 7px solid #dbeafe; color: #1f3b63; font-weight: 900; font-size: 12px; }
    .ikuai-stat-tile.is-purple .ikuai-ring { border-color: #8b5cf6; }
    .ikuai-stat-tile.is-orange .ikuai-ring { border-color: #f5b84b; }
    .ikuai-stat-main { color: #111827; font-size: 18px; font-weight: 900; line-height: 1.1; }
    .ikuai-stat-meta { margin-top: 6px; color: #2563eb; font-size: 12px; }
    .ikuai-monitor-card { padding-bottom: 14px; }
    .ikuai-chart-controls { display: flex; gap: 8px; align-items: center; }
    .ikuai-chip { min-height: 28px; padding: 5px 11px; border: 1px solid #d8e2ef; border-radius: 6px; background: #fff; color: #4b5563; font-size: 12px; }
    .ikuai-chip.is-active { border-color: #4891e8; background: #4891e8; color: #fff; }
    .ikuai-chart-body { padding: 12px 20px 0; }
    .ikuai-chart-box { min-height: 170px; padding: 10px 10px 6px; border-radius: 8px; background: #fff; }
    .ikuai-chart-box svg { width: 100%; height: 150px; display: block; }
    .ikuai-line-legend { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 8px; color: #4b5563; font-size: 12px; }
    .ikuai-green-bar { height: 7px; margin-top: 8px; border-radius: 999px; background: linear-gradient(90deg,#6bd485,#8dde95); }
    .ikuai-card-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .ikuai-resource-card { min-height: 220px; padding-bottom: 14px; }
    .ikuai-resource-body { padding: 10px 20px 0; }
    .ikuai-resource-chart { min-height: 130px; }
    .ikuai-resource-chart svg { width: 100%; height: 126px; display: block; }
    .ikuai-empty { display: grid; place-items: center; min-height: 158px; color: #8b95a5; text-align: center; font-size: 13px; }
    .ikuai-empty-art { width: 64px; height: 42px; margin: 0 auto 12px; border-radius: 8px; background: linear-gradient(180deg,#eef2f7,#d9e0ea); position: relative; }
    .ikuai-empty-art::after { content: ""; position: absolute; left: 14px; right: 14px; top: 14px; height: 4px; background: #b8c1cf; box-shadow: 0 10px 0 #c5ccd7; }
    .ikuai-channel-list { padding: 16px 20px 18px; display: grid; gap: 12px; }
    .ikuai-channel-row { display: grid; grid-template-columns: 54px minmax(0, 1fr); gap: 10px; align-items: center; color: #4b5563; font-size: 13px; }
    .ikuai-channel-pills { display: flex; flex-wrap: wrap; gap: 6px; min-width: 0; }
    .ikuai-channel-pill { min-width: 36px; height: 8px; border-radius: 2px; background: #e8edf3; position: relative; }
    .ikuai-channel-pill.is-on { background: #94d8a3; }
    .ikuai-channel-pill span { position: absolute; left: 50%; top: 12px; transform: translateX(-50%); color: #4b5563; font-size: 11px; }
    .ikuai-rank-card { min-height: 260px; }
    .ikuai-rank-body { padding: 12px 20px 18px; display: grid; gap: 10px; max-height: 310px; overflow: auto; }
    .ikuai-rank-row { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; gap: 10px; align-items: center; min-height: 48px; }
    .ikuai-rank-index { display: grid; place-items: center; width: 26px; height: 22px; border-radius: 5px; background: #ffe7b0; color: #9a5b00; font-size: 11px; font-weight: 900; }
    .ikuai-rank-row:nth-child(2) .ikuai-rank-index { background: #dce9ff; color: #2463d8; }
    .ikuai-rank-row:nth-child(3) .ikuai-rank-index { background: #ffe1d4; color: #c2410c; }
    .ikuai-rank-name { color: #111827; font-size: 13px; font-weight: 800; overflow-wrap: anywhere; }
    .ikuai-rank-sub { margin-top: 3px; color: #7b8797; font-size: 12px; }
    .ikuai-rank-rate { color: #0f5132; font-size: 12px; text-align: right; white-space: nowrap; }
    #overview.ikuai-overview-section {
      overflow: hidden;
    }
    #overview.ikuai-overview-section.is-ikuai-scaled {
      height: var(--ikuai-scaled-height, auto);
      min-height: var(--ikuai-scaled-height, auto);
    }
    #overview.ikuai-overview-section .ikuai-home.is-viewport-scaled {
      width: var(--ikuai-home-design-width, 1180px);
      max-width: none;
      transform: scale(var(--ikuai-home-scale, 1));
      transform-origin: 0 0;
      will-change: transform;
    }
    #overview.ikuai-overview-section .ikuai-home.is-viewport-scaled .ikuai-home-grid {
      grid-template-columns: minmax(340px, 430px) minmax(0, 1fr) !important;
    }
    #overview.ikuai-overview-section .ikuai-home.is-viewport-scaled .ikuai-system-strip {
      grid-template-columns: minmax(0, 1.3fr) repeat(3, minmax(140px, .55fr)) !important;
    }
    #overview.ikuai-overview-section .ikuai-home.is-viewport-scaled .ikuai-card-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }
    #overview.ikuai-overview-section .ikuai-home.is-viewport-scaled .ikuai-home-grid > .ikuai-wan-card {
      position: sticky;
      top: 14px;
      max-height: calc(100vh - 28px);
      overflow-y: auto;
    }
    @media (max-width: 960px) {
      .pm-overview-main { grid-template-columns: 1fr; }
      .pm-home-grid,
      .pm-interface-summary,
      .ikuai-home-grid,
      .ikuai-system-strip { grid-template-columns: 1fr; }
      .ikuai-home-grid > .ikuai-wan-card {
        position: static;
        max-height: none;
        overflow: visible;
      }
      .ikuai-card-grid { grid-template-columns: 1fr; }
      .pm-proof-grid,
      .pm-interface-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .scale-toolbar { grid-template-columns: 1fr; align-items: stretch; }
      .scale-pager { justify-content: flex-start; }
    }
    @media (max-width: 560px) {
      .pm-action-head { display: grid; }
      .pm-action-item { grid-template-columns: 1fr; gap: 4px; }
      .pm-risk-top,
      .pm-home-action,
      .pm-status-row { grid-template-columns: 1fr; }
      .pm-risk-title { font-size: 20px; }
      .pm-proof-grid,
      .pm-interface-kpis { grid-template-columns: 1fr; }
      .ikuai-wan-card { min-height: 0; padding: 16px; }
      .ikuai-info-row { grid-template-columns: 104px minmax(0, 1fr); }
      .ikuai-quick-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .ikuai-device { grid-template-columns: 1fr; }
      .scale-group-tabs { display: grid; grid-template-columns: 1fr 1fr; }
      .scale-detail-kpis { display: grid; grid-template-columns: 1fr; }
      .scale-table { min-width: 680px; font-size: 11px; }
      .scale-table th, .scale-table td { padding: 7px 8px; }
    }
    #overview.ikuai-overview-section .ikuai-home.is-viewport-scaled .ikuai-wan-card {
      min-height: 680px !important;
      padding: 20px !important;
    }
    #overview.ikuai-overview-section .ikuai-home.is-viewport-scaled .ikuai-info-row {
      grid-template-columns: 128px minmax(0, 1fr) !important;
    }
    #overview.ikuai-overview-section .ikuai-home.is-viewport-scaled .ikuai-quick-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    }
    #overview.ikuai-overview-section .ikuai-home.is-viewport-scaled .ikuai-device {
      grid-template-columns: 122px minmax(0, 1fr) !important;
    }
  `;
  document.head.appendChild(style);

  const app = document.getElementById('app');
  if (app) app.removeAttribute('aria-live');

  function html(value) {
    return typeof escapeHtml === 'function'
      ? escapeHtml(value)
      : String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function number(value) {
    return typeof fmtNumber === 'function' ? fmtNumber(value) : String(Number(value || 0));
  }

  function rate(value) {
    return typeof fmtRate === 'function' ? fmtRate(value) : `${number(value)} B/s`;
  }

  function compact(value) {
    return typeof fmtCompact === 'function' ? fmtCompact(value) : number(value);
  }

  function bytes(value) {
    return typeof fmtBytes === 'function' ? fmtBytes(value) : number(value);
  }

  function pill(value, tone = 'info') {
    return typeof tag === 'function' ? tag(value, tone) : `<span>${html(value)}</span>`;
  }

  function totalRate(row, upKey = 'upRate', downKey = 'downRate') {
    return Number(row?.[upKey] || 0) + Number(row?.[downKey] || 0);
  }

  function interfaceDropTotal(row) {
    row = row || {};
    return Number((row.dropTotal ?? (Number(row.txDrop || 0) + Number(row.rxDrop || 0))) || 0);
  }

  function interfaceErrorTotal(row) {
    row = row || {};
    return Number((row.errorTotal ?? (Number(row.txError || 0) + Number(row.rxError || 0))) || 0);
  }

  function interfaceDropDelta(row) {
    return Number((row || {}).dropDelta || 0);
  }

  function interfaceErrorDelta(row) {
    return Number((row || {}).errorDelta || 0);
  }

  function interfacePacketDelta(row) {
    return Number((row || {}).packetDelta || 0);
  }

  function interfaceLossRate(row) {
    const value = Number((row || {}).lossRate);
    return Number.isFinite(value) ? value : null;
  }

  function lossRateText(row) {
    const value = interfaceLossRate(row);
    if (value === null) return '-';
    const percent = value * 100;
    const digits = percent > 0 && percent < 0.01 ? 4 : percent < 1 ? 3 : 2;
    return `${percent.toFixed(digits)}%`;
  }

  function isDerivedInterface(row) {
    row = row || {};
    const type = String(row.type || '').toLowerCase();
    const name = String(row.name || '').toLowerCase();
    return Boolean(row.isDerivedInterface || row.qualityEvidenceLevel === 'logical' || ['vlan', 'macvlan'].includes(type) || name.startsWith('vlan') || name.startsWith('macvlan'));
  }

  function interfaceRecentQualityScore(row) {
    return interfaceDropDelta(row) + interfaceErrorDelta(row) + (interfaceLossRate(row) || 0) * 1000;
  }

  function interfaceQualityEvidence(row) {
    const packetDelta = interfacePacketDelta(row);
    const pairText = row?.logicalPairKey ? ` · ${String(row.logicalPairKey).replace('logical-pair:', '成对 ')}` : '';
    const logicalText = isDerivedInterface(row) ? ` · 逻辑接口降权${pairText}` : '';
    return `累计 ${number(interfaceDropTotal(row))}/${number(interfaceErrorTotal(row))} · 新增 +${number(interfaceDropDelta(row))}/+${number(interfaceErrorDelta(row))} · 丢包率 ${lossRateText(row)}${packetDelta ? ` / ${number(packetDelta)} 包` : ''}${logicalText}`;
  }

  function levelRank(level) {
    return { ok: 0, info: 1, warning: 2, critical: 3 }[level] ?? 1;
  }

  function displayLevel(level) {
    return {
      ok: '正常',
      info: '观察',
      warning: '预警',
      critical: '高风险',
    }[level] || '观察';
  }

  function friendlyError(message) {
    if (!message) return '';
    const text = String(message);
    if (/HTTPConnectionPool|Max retries|Connection refused|timed out|Failed to fetch|NetworkError/i.test(text)) {
      return '本地采集服务或 RouterOS SSH 连接暂时不可用。';
    }
    return text.length > 90 ? `${text.slice(0, 90)}...` : text;
  }

  function issue(level, title, summary, nextStep, target = 'interfaces') {
    return { level, title, summary, nextStep, target };
  }

  function interfaceErrors(row) {
    return interfaceDropTotal(row) + interfaceErrorTotal(row);
  }

  function interfaceNeedsAttention(row) {
    return interfaceRecentQualityScore(row) > 0;
  }

  function isInterfaceDown(row) {
    return Boolean(row?.disabled || !row?.running);
  }

  function isVirtualInterface(row) {
    const type = String(row?.type || '').toLowerCase();
    const name = String(row?.name || '').toLowerCase();
    return ['vlan', 'macvlan', 'wireguard', 'wg', 'loopback', 'bridge', 'l2tp', 'eoip', 'gre', 'ovpn', 'sstp']
      .some((token) => type.includes(token) || name.startsWith(token));
  }

  function interfaceRole(row) {
    if (row?.role === 'WAN' || String(row?.name || '').toLowerCase().startsWith('pppoe-out')) return 'WAN';
    return isVirtualInterface(row) ? 'VNET' : (row?.role || 'LAN');
  }

  function interfaceScore(row) {
    const weight = isDerivedInterface(row) ? 0.35 : 1;
    return (isInterfaceDown(row) ? 1000000 : 0)
      + interfaceRecentQualityScore(row) * 100000
      + interfaceErrors(row) * 100 * weight
      + Math.round(totalRate(row, 'txRate', 'rxRate') / 1024);
  }

  function collectionState(snapshot) {
    const meta = snapshot?.meta || {};
    const routerHost = meta.routerHost || meta.target || '未配置';
    const updatedAt = snapshot?.updatedAt || meta.connectionDetailUpdatedAt || meta.staticUpdatedAt || '等待采集';
    const hasError = Boolean(snapshot?.error || snapshot?.status === 'error');
    return {
      level: hasError ? 'critical' : 'ok',
      title: hasError ? '采集不可用' : '采集正常',
      detail: hasError ? friendlyError(snapshot?.error) : `RouterOS ${routerHost}，最后更新 ${updatedAt}`,
      updatedAt,
      routerHost,
    };
  }

  function overviewIssues(snapshot, lines, interfaces) {
    const overview = snapshot?.overview || {};
    const connections = snapshot?.connections || {};
    const onlineLines = lines.filter((row) => row.running).length;
    const offlineLines = Math.max(0, lines.length - onlineLines);
    const downInterfaces = interfaces.filter(isInterfaceDown).length;
    const recentQualityInterfaces = interfaces.filter((row) => interfaceNeedsAttention(row));
    const primaryQualityInterfaces = recentQualityInterfaces.filter((row) => !isDerivedInterface(row)).length;
    const logicalQualityInterfaces = recentQualityInterfaces.length - primaryQualityInterfaces;
    const historicalQualityInterfaces = interfaces.filter((row) => interfaceErrors(row) > 0 && !interfaceNeedsAttention(row)).length;
    const connectionTotal = Number(overview.connectionTotal || connections.total || 0);
    const issues = [];

    if (snapshot?.error || snapshot?.status === 'error') {
      issues.push(issue('critical', '采集链路不可用', friendlyError(snapshot?.error), '先检查面板本机服务和 RouterOS SSH 登录信息。', 'overview'));
    }
    if (lines.length && onlineLines === 0) {
      issues.push(issue('critical', '所有 WAN 均未在线', `${lines.length} 条线路没有可用在线状态。`, '进入接口总览筛选 WAN，确认拨号状态、地址和父接口。', 'interfaces'));
    } else if (offlineLines > 0) {
      issues.push(issue('warning', '存在离线 WAN', `${offlineLines} / ${lines.length} 条 WAN 离线或未运行。`, '进入接口总览筛选离线/禁用，优先确认拨号和父接口。', 'interfaces'));
    }
    if (primaryQualityInterfaces > 0 || logicalQualityInterfaces > 0) {
      const topQuality = recentQualityInterfaces.slice().sort((a, b) => interfaceScore(b) - interfaceScore(a))[0] || {};
      issues.push(issue('warning', '接口最近出现丢包或错包', `主接口 ${primaryQualityInterfaces} 个，逻辑接口 ${logicalQualityInterfaces} 个；${topQuality.name || '-'} ${interfaceQualityEvidence(topQuality)}。`, '进入接口总览查看“累计 / 新增 / 丢包率”，VLAN/macvlan 证据按逻辑接口降权。', 'interfaces'));
    } else if (historicalQualityInterfaces > 0) {
      issues.push(issue('info', '接口只有历史累计丢错', `${historicalQualityInterfaces} 个接口存在历史累计，但最近采样未新增。`, '继续观察最近新增和丢包率，不把历史累计当成当前故障。', 'interfaces'));
    }
    if (downInterfaces > 0 && !offlineLines) {
      issues.push(issue('warning', '存在离线或禁用接口', `${downInterfaces} 个接口未运行或被禁用。`, '进入接口总览筛选离线/禁用，确认是否符合预期。', 'interfaces'));
    }
    if (connectionTotal >= 120000) {
      issues.push(issue('critical', '连接压力偏高', `当前连接 ${compact(connectionTotal)}。`, '进入连接监控查看 Top IP 和活跃会话。', 'connections'));
    } else if (connectionTotal >= 60000) {
      issues.push(issue('warning', '连接压力需要观察', `当前连接 ${compact(connectionTotal)}。`, '进入连接监控确认是否存在异常重连终端。', 'connections'));
    }
    if (['danger', 'critical'].includes(String(overview.systemLoadLevel || '').toLowerCase())) {
      issues.push(issue('critical', '系统负载异常', `CPU ${number(overview.cpuLoad)}%，内存 ${number(overview.memoryUsage)}%。`, '进入负载审计查看资源趋势和事件。', 'loadAudit'));
    } else if (['warn', 'warning'].includes(String(overview.systemLoadLevel || '').toLowerCase())) {
      issues.push(issue('warning', '系统负载接近阈值', `CPU ${number(overview.cpuLoad)}%，内存 ${number(overview.memoryUsage)}%。`, '观察资源趋势，必要时进入负载审计。', 'loadAudit'));
    }

    return issues.sort((a, b) => levelRank(b.level) - levelRank(a.level));
  }

  function valueList(value) {
    if (Array.isArray(value)) return value.filter((item) => item !== undefined && item !== null && String(item).trim() !== '');
    if (value === undefined || value === null || value === '') return [];
    return [value];
  }

  function shortList(value, limit = 2) {
    const rows = valueList(value).map((item) => String(item));
    if (!rows.length) return '-';
    const shown = rows.slice(0, limit).join(', ');
    return rows.length > limit ? `${shown} +${rows.length - limit}` : shown;
  }

  function scaleFor(snapshot, key, fallbackRows = []) {
    const meta = snapshot?.meta?.scale?.[key] || {};
    const total = Number(meta.actualCount ?? meta.totalCount ?? fallbackRows.length ?? 0);
    const shown = Number(meta.shownCount ?? fallbackRows.length ?? 0);
    return {
      actualCount: total,
      totalCount: Number(meta.totalCount ?? total),
      shownCount: shown,
      limit: Number(meta.limit ?? shown),
      hasMore: Boolean(meta.hasMore || shown < total),
      sampled: Boolean(meta.sampled),
      sampleMethod: meta.sampleMethod || '',
      bucket: meta.bucket || bucketFor(total),
      sortedBy: meta.sortedBy || '',
      groupedBy: Array.isArray(meta.groupedBy) ? meta.groupedBy : [],
    };
  }

  function bucketFor(count) {
    if (count <= 0) return 'none';
    if (count === 1) return 'single';
    if (count <= 6) return 'small';
    if (count <= 24) return 'medium';
    if (count <= 100) return 'large';
    return 'fleet';
  }

  function bucketLabel(bucket) {
    return {
      none: '暂无数据',
      single: '单线规模',
      small: '小规模',
      medium: '中等规模',
      large: '大规模',
      fleet: '批量规模',
    }[bucket] || '自适应规模';
  }

  function sortLabel(value) {
    const raw = String(value || '').toLowerCase();
    if (!raw) return '';
    if (raw.includes('traffic') || raw.includes('rate')) return '按流量优先';
    if (raw.includes('status')) return '按状态排序';
    if (raw.includes('role')) return '按角色/名称排序';
    if (raw.includes('ip')) return '按 IP 排序';
    if (raw.includes('natural') || raw.includes('name')) return '按名称排序';
    return '已排序';
  }

  function sampleLabel(meta) {
    if (!meta.sampled && !meta.hasMore) return '全量展示';
    if (meta.sampled) return '当前为样本';
    return '还有更多';
  }

  function scaleMeta(meta, label = '规模') {
    const rows = [
      `${html(label)} <strong>${number(meta.shownCount)} / ${number(meta.actualCount)}</strong>`,
      `规模 <strong>${html(bucketLabel(meta.bucket))}</strong>`,
      `<strong>${html(sampleLabel(meta))}</strong>`,
    ];
    const readableSort = sortLabel(meta.sortedBy);
    if (readableSort) rows.push(`排序 <strong>${html(readableSort)}</strong>`);
    return `<div class="scale-meta" data-scale-meta="true">${rows.map((item) => `<span>${item}</span>`).join('')}</div>`;
  }

  function detailHeader(meta, title, copy, extra = []) {
    return `<div class="scale-detail-head">
      <div class="scale-detail-headline">
        <div>
          <div class="scale-detail-title">${html(title)}</div>
          <div class="pm-panel-copy">${html(copy || '')}</div>
        </div>
        ${scaleMeta(meta, title)}
      </div>
      ${extra.length ? `<div class="scale-detail-kpis">${extra.map((item) => `<span>${html(item.label)} <strong>${item.value}</strong></span>`).join('')}</div>` : ''}
    </div>`;
  }

  function pageKey(key) {
    if (!state.page[key]) state.page[key] = 0;
    return state.page[key];
  }

  function setPage(key, value) {
    state.page[key] = Math.max(0, Number(value || 0));
  }

  function queryFor(key) {
    return String(state.query[key] || '').trim().toLowerCase();
  }

  function groupFor(key) {
    return String(state.group[key] || 'all');
  }

  function matchesQuery(row, query) {
    if (!query) return true;
    return JSON.stringify(row).toLowerCase().includes(query);
  }

  function adaptivePageSize(baseSize, meta) {
    const base = Math.max(1, Number(baseSize || 20));
    const narrow = window.innerWidth < 640;
    if (narrow && ['large', 'fleet'].includes(meta.bucket)) return Math.min(base, 10);
    if (narrow) return Math.min(base, 14);
    if (['large', 'fleet'].includes(meta.bucket)) return Math.min(base, 18);
    return base;
  }

  function scaleTable(headers, rowHtml, emptyText) {
    const body = Array.isArray(rowHtml) ? rowHtml.join('') : String(rowHtml || '');
    if (!body.trim()) return `<div class="scale-empty">${html(emptyText || '当前没有匹配数据')}</div>`;
    return `<div class="scale-table-wrap">
      <table class="scale-table">
        <thead><tr>${headers.map((header) => `<th>${html(header)}</th>`).join('')}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
  }

  function renderPagedTable(options) {
    const key = options.key;
    const rows = Array.isArray(options.rows) ? options.rows : [];
    const meta = options.meta || scaleFor(null, key, rows);
    const query = queryFor(key);
    const group = groupFor(key);
    const groupOptions = options.groupOptions || [{ value: 'all', label: '全部' }];
    const groupFn = options.groupFn || (() => 'all');
    const groupFilterFn = options.groupFilterFn || ((row, selected) => selected === 'all' || groupFn(row) === selected);
    const filtered = rows.filter((row) => matchesQuery(row, query) && groupFilterFn(row, group));
    const pageSize = adaptivePageSize(options.pageSize || 20, meta);
    const page = Math.min(pageKey(key), Math.max(0, Math.ceil(filtered.length / pageSize) - 1));
    setPage(key, page);
    const start = page * pageSize;
    const visible = filtered.slice(start, start + pageSize);
    const rowHtml = visible.map(options.rowHtml).join('');
    const selectedGroup = groupOptions.find((item) => item.value === group)?.label || '全部';
    const hasFilter = Boolean(query || group !== 'all');
    const shownTotal = Math.max(meta.actualCount, rows.length);
    const groupTabs = options.showGroupTabs ? `<div class="scale-group-tabs" role="tablist" aria-label="${html(options.groupLabel || '分组')}">
      ${groupOptions.map((item) => `<button type="button" role="tab" class="scale-group-tab ${group === item.value ? 'is-active' : ''}" data-scale-group-set="${html(key)}" data-scale-group-value="${html(item.value)}" aria-selected="${group === item.value ? 'true' : 'false'}"><b>${html(item.label)}</b>${item.meta ? `<span>${html(item.meta)}</span>` : ''}</button>`).join('')}
    </div>` : '';
    return `
      ${groupTabs}
      <div class="scale-toolbar" data-scale-toolbar="${html(key)}">
        <div class="scale-field">
          <label for="scale-search-${html(key)}">${html(options.searchLabel || '搜索')}</label>
          <input id="scale-search-${html(key)}" class="scale-search" data-scale-search="${html(key)}" aria-label="${html(options.searchLabel || '搜索')}" value="${html(state.query[key] || '')}" placeholder="${html(options.placeholder || '名称、IP、接口、状态')}">
        </div>
        <div class="scale-field">
          <label for="scale-group-${html(key)}">${html(options.groupLabel || '分组')}</label>
          <select id="scale-group-${html(key)}" class="scale-select" data-scale-group="${html(key)}" aria-label="${html(options.groupLabel || '分组')}">
            ${groupOptions.map((item) => `<option value="${html(item.value)}" ${group === item.value ? 'selected' : ''}>${html(item.label)}</option>`).join('')}
          </select>
        </div>
        <button class="scale-clear" type="button" data-scale-clear="${html(key)}" ${hasFilter ? '' : 'disabled'}>清空</button>
      </div>
      <div class="scale-filter-summary" data-scale-filter-summary="${html(key)}" aria-live="polite">
        当前展示 ${number(visible.length)} 条，筛选后 ${number(filtered.length)} 条，共 ${number(shownTotal)} 条；分组：${html(selectedGroup)}${query ? `；搜索：${html(state.query[key])}` : ''}
      </div>
      ${scaleTable(options.headers, rowHtml, options.emptyText || '当前没有匹配数据')}
      <div class="scale-pager">
        <span>第 ${number(page + 1)} 页 / 共 ${number(Math.max(1, Math.ceil(filtered.length / pageSize)))} 页，窗口 ${number(start + (visible.length ? 1 : 0))}-${number(start + visible.length)}</span>
        <button type="button" data-scale-page="${html(key)}" data-scale-page-dir="-1" ${page <= 0 ? 'disabled' : ''}>上一页</button>
        <button type="button" data-scale-page="${html(key)}" data-scale-page-dir="1" ${start + pageSize >= filtered.length ? 'disabled' : ''}>下一页</button>
      </div>
      <div class="scale-window-note">${html(options.note || '明细按窗口渲染；需要定位时先搜索或切换分组。')}</div>`;
  }

  function severityTone(item) {
    const raw = String(item?.severity || item?.level || '').toLowerCase();
    if (['critical', 'danger', 'error'].includes(raw)) return 'critical';
    if (['warning', 'warn'].includes(raw)) return 'warning';
    return 'info';
  }

  function overviewActions(snapshot) {
    const rows = (snapshot.actionQueue || snapshot.semanticTriage?.queue || []).slice(0, 4);
    if (!rows.length) {
      return '<div class="pm-action-list"><div class="pm-action-item"><span>状态</span><b>暂无行动项</b><span>保持观察，必要时进入详情页查看证据。</span></div></div>';
    }
    return `<div class="pm-action-list">${rows.map((item) => {
      const tone = severityTone(item);
      return `<div class="pm-action-item">
        <span class="pm-action-severity is-${tone}">${html(item.severity || item.level || 'info')}</span>
        <div><b>${html(item.title || item.id || '-')}</b><span>${html(item.nextStep || item.summary || item.source || '-')}</span></div>
      </div>`;
    }).join('')}</div>`;
  }

  function shortcut(sectionId, title, copy) {
    return `<a class="pm-shortcut" href="#${html(sectionId)}" data-section="${html(sectionId)}">
      <span><b>${html(title)}</b><span>${html(copy)}</span></span><i>进入</i>
    </a>`;
  }

  function safePercent(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '0%';
    return `${Math.max(0, Math.min(100, n)).toFixed(n % 1 ? 1 : 0)}%`;
  }

  function bestWanLine(lines) {
    const rows = Array.isArray(lines) ? lines : [];
    return rows.slice().sort((a, b) => totalRate(b) - totalRate(a))[0] || rows[0] || null;
  }

  function wanLineKey(line, index = 0) {
    return String(line?.name || line?.id || line?.access || `wan-${index}`);
  }

  function selectedWanLine(lines) {
    const rows = Array.isArray(lines) ? lines : [];
    const selectedKey = String(state.ikuaiWanLine || '');
    if (selectedKey) {
      const selected = rows.find((line, index) => wanLineKey(line, index) === selectedKey);
      if (selected) return selected;
      state.ikuaiWanLine = '';
    }
    return bestWanLine(rows);
  }

  function renderWanLineOptions(lines, selectedWan) {
    const rows = Array.isArray(lines) ? lines : [];
    if (!rows.length) return '<option value="">wan1</option>';
    const selectedKey = selectedWan ? wanLineKey(selectedWan, rows.indexOf(selectedWan)) : '';
    return rows.map((line, index) => {
      const key = wanLineKey(line, index);
      const status = line?.running ? '在线' : '离线';
      const traffic = totalRate(line) > 0 ? ` · ${rate(line.upRate)}/${rate(line.downRate)}` : '';
      const label = `${line?.name || key} · ${status}${traffic}`;
      return `<option value="${html(key)}" ${key === selectedKey ? 'selected' : ''}>${html(label)}</option>`;
    }).join('');
  }

  function wanAddressText(line) {
    return shortList(line?.addresses || line?.ips || line?.address, 2);
  }

  function wanUsageText(line) {
    if (!line) return '-';
    const total = Number(line.rxBytes || 0) + Number(line.txBytes || 0);
    return total > 0 ? bytes(total) : '0 B';
  }

  function quickTile(sectionId, icon, title) {
    return `<a class="ikuai-quick" href="#${html(sectionId)}" data-section="${html(sectionId)}">
      <span class="ikuai-quick-icon"><span class="ik-menu-icon ${html(icon)}"></span></span>
      <span>${html(title)}</span>
    </a>`;
  }

  function renderIkuaiQuickGrid() {
    return [
      quickTile('interfaces', 'ik-line', '接口总览'),
      quickTile('routes', 'ik-route', '路由对象'),
      quickTile('dhcp', 'ik-terminal', 'DHCP 服务'),
      quickTile('balance', 'ik-balance', '分流监控'),
      quickTile('security', 'ik-security', 'ACL 规则'),
      quickTile('trafficLoad', 'ik-load', '流量负载'),
      quickTile('connections', 'ik-load', '连接监控'),
      quickTile('loadAudit', 'ik-health', '负载审计'),
      quickTile('serviceLogs', 'ik-log', '日志中心'),
    ].join('');
  }

  function renderRankRows(rows, emptyText) {
    const list = rows.slice(0, 20);
    if (!list.length) return `<div class="ikuai-empty"><div><div class="ikuai-empty-art"></div>${html(emptyText || '当前暂无数据')}</div></div>`;
    return list.map((row, index) => {
      const name = row.displayName || row.hostname || row.name || row.ip || '-';
      const sub = [row.ip, row.mac].filter((item) => item && item !== '-').slice(0, 2).join(' · ') || row.status || '';
      return `<div class="ikuai-rank-row">
        <div class="ikuai-rank-index">${String(index + 1).padStart(2, '0')}</div>
        <div><div class="ikuai-rank-name">${html(name)}</div><div class="ikuai-rank-sub">${html(sub)}</div></div>
        <div class="ikuai-rank-rate">↑ ${rate(row.upRate)}<br>↓ ${rate(row.downRate)}</div>
      </div>`;
    }).join('');
  }

  function renderLinePills(rows) {
    const items = rows.slice(0, 18);
    if (!items.length) return '<span class="ikuai-card-subtle">暂无线路数据</span>';
    return items.map((line) => `<span class="ikuai-channel-pill ${line.running ? 'is-on' : ''}" title="${html(line.name || '-')}"><span>${html(String(line.name || '-').replace(/^pppoe-out/i, ''))}</span></span>`).join('');
  }

  function renderResourceCard(title, value, sub, series, color = '#4891e8') {
    const chart = typeof lineChart === 'function'
      ? lineChart([Array.isArray(series) ? series : []], { colors: [color] })
      : '<div class="scale-empty">等待趋势采集</div>';
    return `<div class="ikuai-card ikuai-resource-card">
      <div class="ikuai-card-head">
        <div><div class="ikuai-card-title">${html(title)}</div><div class="ikuai-card-subtle">${html(sub || '')}</div></div>
        <span class="ikuai-chip">平均值</span>
      </div>
      <div class="ikuai-resource-body">
        <div class="ikuai-card-subtle">${value}</div>
        <div class="ikuai-resource-chart">${chart}</div>
      </div>
    </div>`;
  }

  function renderOverviewScaleAdaptive(snapshot) {
    snapshot = snapshot || {};
    const lines = typeof getLogicalWanLines === 'function' ? getLogicalWanLines(snapshot) : (snapshot.wan || snapshot.pppoe || []);
    const interfaces = snapshot.interfaces || [];
    const overview = snapshot.overview || {};
    const connections = snapshot.connections || {};
    const collect = collectionState(snapshot);
    const issues = overviewIssues(snapshot, lines, interfaces);
    const topIssue = issues[0] || issue('ok', '当前没有高优先级风险', '线路、接口、连接和系统负载未发现需要立刻处理的信号。', '保持观察；需要细节时进入接口、流量、终端或 DHCP 页面下钻。', 'interfaces');
    const onlineLines = lines.filter((row) => row.running).length;
    const selectedWan = selectedWanLine(lines);
    const wanOptions = renderWanLineOptions(lines, selectedWan);
    const history = overview.history || {};
    const wanHistory = selectedWan?.history || {};
    const wanChart = typeof lineChart === 'function'
      ? lineChart([wanHistory.up || history.uplink || [], wanHistory.down || history.downlink || []], { colors: ['#2c3e9f', '#16a34a'] })
      : '<div class="scale-empty">等待速率趋势采集</div>';
    const aggregateChart = typeof lineChart === 'function'
      ? lineChart([history.uplink || [], history.downlink || []], { colors: ['#245bff', '#12b76a'] })
      : '<div class="scale-empty">等待速率趋势采集</div>';
    const terminals = (snapshot.terminals || []).slice();
    const activeTerminals = terminals.filter((row) => totalRate(row) > 0).length;
    const rankedTerminals = terminals.slice().sort((a, b) => totalRate(b) - totalRate(a));
    const connectionTotal = Number(overview.connectionTotal || connections.total || 0);
    const routerHost = snapshot.meta?.routerHost || snapshot.meta?.target || '-';
    const offlineLines = Math.max(0, lines.length - onlineLines);
    const errorInterfaces = interfaces.filter((row) => interfaceErrors(row) > 0).length;
    const connectionRing = Math.min(99, Math.max(1, Math.round(connectionTotal / 1000)));
    const latencyMs = Number(selectedWan?.latencyMs || overview.wanLatencyMs || overview.latencyMs || 0);
    const latencyTarget = selectedWan?.latencyTarget || overview.wanLatencyTarget || snapshot.meta?.wanLatency?.target || 'www.baidu.com';
    const latencyText = latencyMs > 0 ? `${number(latencyMs)}ms` : '未采集';
    return `<section class="section ikuai-overview-section" id="overview">
      <div class="ikuai-home" data-pm-overview="true" data-ikuai-reference-home="true">
        <div class="ikuai-card ikuai-system-strip">
          <div class="ikuai-device">
            <div class="ikuai-device-art" aria-hidden="true"></div>
            <div>
              <div class="ikuai-device-name">${html(overview.identity || 'RouterOS')}</div>
              <div class="ikuai-device-meta">${html(overview.version || '-')} · IP:${html(routerHost)}</div>
              <div class="ikuai-card-subtle">系统运行时间：${html(overview.uptime || '-')} · ${html(collect.title)}</div>
            </div>
          </div>
          <div class="ikuai-stat-tile">
            <div class="ikuai-ring">${number(onlineLines)}</div>
            <div><div class="ikuai-stat-main">${number(onlineLines)} / ${number(lines.length)}</div><div class="ikuai-stat-meta">在线 WAN</div></div>
          </div>
          <div class="ikuai-stat-tile is-purple">
            <div class="ikuai-ring">${number(activeTerminals)}</div>
            <div><div class="ikuai-stat-main">${number(overview.onlineTerminals || terminals.length || 0)}</div><div class="ikuai-stat-meta">在线终端</div></div>
          </div>
          <div class="ikuai-stat-tile is-orange">
            <div class="ikuai-ring">${number(connectionRing)}</div>
            <div><div class="ikuai-stat-main">${compact(connectionTotal)}</div><div class="ikuai-stat-meta">连接数</div></div>
          </div>
        </div>

        <div class="ikuai-home-grid">
          <aside class="ikuai-card ikuai-wan-card">
            <div class="ikuai-card-title">WAN信息</div>
            <label class="ikuai-wan-switch">
              <span>线路</span>
              <select class="ikuai-wan-select" data-ikuai-wan-select aria-label="切换 WAN 线路">${wanOptions}</select>
            </label>
            <div class="ikuai-info-list">
              <div class="ikuai-info-row"><span>运营商</span><strong>${pill(selectedWan?.running ? '已连接' : '未知', selectedWan?.running ? 'ok' : 'warn')}</strong></div>
              <div class="ikuai-info-row"><span>WAN IP</span><strong>${html(wanAddressText(selectedWan))}</strong></div>
              <div class="ikuai-info-row"><span>接入方式</span><strong>${html(selectedWan?.parent || selectedWan?.type || 'PPPoE')}</strong></div>
              <div class="ikuai-info-row"><span>运行时间</span><strong>${html(overview.uptime || '-')}</strong></div>
              <div class="ikuai-info-row"><span>本月数据使用情况</span><strong>${html(wanUsageText(selectedWan))}</strong></div>
            </div>
            <div class="ikuai-info-row"><span>上下行速率</span><strong></strong></div>
            <div class="ikuai-rate-row"><span>↑ <b>${rate(selectedWan?.upRate)}</b></span><span>↓ <b>${rate(selectedWan?.downRate)}</b></span></div>
            <div class="ikuai-wan-chart">${wanChart}</div>
            <div class="ikuai-latency"><span>延迟</span><strong title="ping ${html(latencyTarget)}">${latencyText}</strong></div>
            <div class="ikuai-quick-head"><div class="ikuai-card-title">快捷入口</div><a href="#interfaces" data-section="interfaces" class="ikuai-card-subtle">自定义</a></div>
            <div class="ikuai-quick-grid" data-overview-drilldown="true">${renderIkuaiQuickGrid()}</div>
          </aside>

          <main class="ikuai-right">
            <div class="ikuai-card ikuai-monitor-card" data-overview-action-panel="true">
              <div class="ikuai-card-head">
                <div><div class="ikuai-card-title">监控信息</div><div class="ikuai-card-subtle">${html(topIssue.title)} · ${html(topIssue.summary)}</div></div>
                <div class="ikuai-chart-controls"><span class="ikuai-chip">平均值</span><span class="ikuai-chip">全部</span><span class="ikuai-chip is-active">1小时</span><span class="ikuai-chip">24小时</span></div>
              </div>
              <div class="ikuai-chart-body">
                <div class="ikuai-card-subtle">上下行速率</div>
                <div class="ikuai-chart-box">${aggregateChart}</div>
                <div class="ikuai-line-legend">${pill(collect.title, collect.level === 'critical' ? 'danger' : 'ok')} <span>${html(selectedWan?.name || 'WAN')}</span><span>↑ ${rate(overview.uplinkBps)}</span><span>↓ ${rate(overview.downlinkBps)}</span></div>
                <div class="ikuai-green-bar"></div>
              </div>
            </div>

            <div class="ikuai-card-grid">
              <div class="ikuai-card ikuai-resource-card">
                <div class="ikuai-card-head">
                  <div><div class="ikuai-card-title">终端数量</div><div class="ikuai-card-subtle">当前在线状态</div></div>
                  <div class="ikuai-chart-controls"><span class="ikuai-chip">平均值</span><span class="ikuai-chip is-active">有线</span></div>
                </div>
                <div class="ikuai-resource-body">
                  <div class="pm-proof-grid">
                    <div class="pm-proof-item"><span>在线终端</span><b>${number(overview.onlineTerminals || terminals.length || 0)}</b></div>
                    <div class="pm-proof-item"><span>有流量</span><b>${number(activeTerminals)}</b></div>
                    <div class="pm-proof-item"><span>离线/低流量</span><b>${number(Math.max(0, (overview.onlineTerminals || terminals.length || 0) - activeTerminals))}</b></div>
                    <div class="pm-proof-item"><span>Top 终端</span><b>${html(rankedTerminals[0]?.ip || '-')}</b></div>
                  </div>
                </div>
              </div>
              ${renderResourceCard('内存使用率', safePercent(overview.memoryUsage), '平均值', history.memory || [], '#4891e8')}
              ${renderResourceCard('CPU负载', safePercent(overview.cpuLoad), '使用率 / 趋势', history.cpu || [], '#78c679')}
              ${renderResourceCard('磁盘使用率', safePercent(overview.diskUsage), '系统盘占用', history.disk || [], '#f5b84b')}
            </div>

            <div>
              <div class="ikuai-card-title" style="margin: 2px 0 10px;">流量排行榜</div>
              <div class="ikuai-card-grid">
                <div class="ikuai-card ikuai-rank-card">
                  <div class="ikuai-card-head"><div><div class="ikuai-card-title">终端流量排行榜（TOP20）</div><div class="ikuai-card-subtle">按实时上下行合计排序</div></div></div>
                  <div class="ikuai-rank-body">${renderRankRows(rankedTerminals, '当前暂无终端流量')}</div>
                </div>
                <div class="ikuai-card ikuai-rank-card">
                  <div class="ikuai-card-head"><div><div class="ikuai-card-title">应用/协议流量排行榜（TOP20）</div><div class="ikuai-card-subtle">RouterOS 协议明细未采集时显示空状态</div></div></div>
                  <div class="ikuai-rank-body">${connections.tcp || connections.udp || connections.icmp ? renderRankRows([
                    { name: 'TCP', upRate: Number(connections.tcp || 0), downRate: 0, status: '连接数' },
                    { name: 'UDP', upRate: Number(connections.udp || 0), downRate: 0, status: '连接数' },
                    { name: 'ICMP', upRate: Number(connections.icmp || 0), downRate: 0, status: '连接数' },
                  ], '当前暂无协议数据') : '<div class="ikuai-empty"><div><div class="ikuai-empty-art"></div>当前暂无数据</div></div>'}</div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </section>`;
  }

  function renderInterfacesScaleAdaptive(snapshot) {
    snapshot = snapshot || {};
    const rows = (snapshot.interfaces || []).slice().sort((a, b) => {
      const problem = interfaceScore(b) - interfaceScore(a);
      if (problem) return problem;
      const roleOrder = { WAN: 0, LAN: 1, VNET: 2 };
      const role = (roleOrder[interfaceRole(a)] ?? 9) - (roleOrder[interfaceRole(b)] ?? 9);
      return role || String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN', { numeric: true });
    });
    const meta = scaleFor(snapshot, 'interfaces', rows);
    const countFor = (name) => rows.filter((row) => {
      if (name === 'all') return true;
      if (name === 'down') return isInterfaceDown(row);
      if (name === 'error') return interfaceErrors(row) > 0;
      if (name === 'busy') return totalRate(row, 'txRate', 'rxRate') > 0;
      return interfaceRole(row) === name;
    }).length;
    const downCount = countFor('down');
    const errorCount = countFor('error');
    const abnormalCount = rows.filter((row) => isInterfaceDown(row) || interfaceNeedsAttention(row)).length;
    const wanCount = countFor('WAN');
    const lanCount = countFor('LAN');
    const vnetCount = countFor('VNET');
    const busiest = rows.slice().sort((a, b) => totalRate(b, 'txRate', 'rxRate') - totalRate(a, 'txRate', 'rxRate'))[0];
    const focus = rows.find((row) => isInterfaceDown(row) || interfaceNeedsAttention(row))
      || rows.find((row) => interfaceErrors(row) > 0)
      || busiest;
    const focusTitle = focus
      ? (isInterfaceDown(focus) ? '优先处理：离线/禁用接口' : interfaceNeedsAttention(focus) ? '优先处理：最近新增丢错接口' : interfaceErrors(focus) > 0 ? '观察：历史累计丢错接口' : '当前最忙接口')
      : '等待接口数据';
    const focusDetail = focus
      ? `${focus.name || '-'} · ${interfaceRole(focus)} · ${rate(totalRate(focus, 'txRate', 'rxRate'))} · ${interfaceQualityEvidence(focus)}`
      : '当前没有可展示的接口。';
    const groupOptions = [
      { value: 'all', label: '全部', meta: `${number(rows.length)} 个` },
      { value: 'error', label: '丢包证据', meta: `${number(errorCount)} 个` },
      { value: 'down', label: '离线/禁用', meta: `${number(downCount)} 个` },
      { value: 'WAN', label: 'WAN 接口', meta: `${number(wanCount)} 个` },
      { value: 'LAN', label: 'LAN', meta: `${number(lanCount)} 个` },
      { value: 'VNET', label: '虚拟接口', meta: `${number(vnetCount)} 个` },
      { value: 'busy', label: '有流量', meta: `${number(countFor('busy'))} 个` },
    ];
    const groupFilter = (row, selected) => {
      if (selected === 'all') return true;
      if (selected === 'down') return isInterfaceDown(row);
      if (selected === 'error') return interfaceErrors(row) > 0;
      if (selected === 'busy') return totalRate(row, 'txRate', 'rxRate') > 0;
      return interfaceRole(row) === selected;
    };
    return section('接口总览', 'interfaces', '按异常、角色、搜索和分页定位接口；不再把拓扑示意当作真实证据。', `
      <div class="pm-interface-page">
        <div class="pm-interface-summary">
          <div class="pm-interface-head">
            <div class="pm-interface-title">接口工作台</div>
            <div class="pm-interface-copy">先看异常和规模，再用分组、搜索、分页定位接口。这里不假设固定线路数，展示窗口和真实总量分开表达。</div>
            <div class="pm-interface-kpis">
              <div class="pm-interface-kpi"><span>接口总数</span><b>${number(rows.length)}</b></div>
              <div class="pm-interface-kpi"><span>WAN 接口</span><b>${number(wanCount)}</b></div>
              <div class="pm-interface-kpi"><span>LAN / 虚拟</span><b>${number(lanCount)} / ${number(vnetCount)}</b></div>
              <div class="pm-interface-kpi"><span>异常</span><b>${number(abnormalCount)}</b></div>
            </div>
          </div>
          <div class="pm-interface-focus">
            <div class="pm-interface-focus-title">${html(focusTitle)}</div>
            <b>${html(focus?.name || '-')}</b>
            <span>${html(focusDetail)}</span>
            <span>建议先看“最近新增”和“最近丢包率”；VLAN/macvlan 逻辑接口已降权展示。</span>
          </div>
        </div>
        <div class="pm-interface-workbench">
          ${detailHeader(meta, '接口明细窗口', '异常优先排序；搜索支持接口名、类型、地址和 MAC。详情列保留证据，不把长地址直接铺满首页。', [
            { label: '实际总量', value: number(meta.actualCount) },
            { label: '当前显示', value: number(meta.shownCount) },
            { label: '还有更多', value: html(meta.hasMore ? '是' : '否') },
            { label: '样本窗口', value: html(meta.sampled ? '是' : '否') },
          ])}
          ${renderPagedTable({
            key: 'interfaces',
            title: '接口',
            meta,
            rows,
            pageSize: 18,
            searchLabel: '搜索接口',
            groupLabel: '接口分组',
            placeholder: '接口名、角色、类型、IP、MAC',
            groupOptions,
            showGroupTabs: true,
            groupFilterFn: groupFilter,
            groupFn: interfaceRole,
            headers: ['接口', '分组', '状态', '地址摘要', '实时速率', '累计流量', '质量', '证据'],
            rowHtml: (row) => {
              const role = interfaceRole(row);
              const errors = interfaceErrors(row);
              const down = isInterfaceDown(row);
              const recentQuality = interfaceNeedsAttention(row);
              const statusText = down ? '离线/禁用' : recentQuality ? '最近新增丢错' : errors > 0 ? '历史累计丢错' : '在线';
              const statusTone = down ? 'danger' : recentQuality ? 'warn' : errors > 0 ? 'info' : 'ok';
              const traffic = `${rate(row.txRate)} / ${rate(row.rxRate)}`;
              const totalBytes = bytes(Number(row.txBytes || 0) + Number(row.rxBytes || 0));
              const evidence = [
                `类型：${row.type || '-'}`,
                `MAC：${row.mac || '-'}`,
                `网络：${shortList(row.networks, 3)}`,
                `网关/路由：${shortList(row.gateways, 3)}`,
              ].join('；');
              return `<tr>
                <td><div class="pm-iface-name"><b>${html(row.name || '-')}</b><span>${html(row.type || '-')}</span></div></td>
                <td>${pill(role, role === 'WAN' ? 'info' : role === 'VNET' ? 'warn' : 'ok')}</td>
                <td>${pill(statusText, statusTone)}</td>
                <td>${html(shortList(row.ips || row.addresses, 2))}</td>
                <td>${traffic}</td>
                <td>${totalBytes}</td>
                <td>${html(interfaceQualityEvidence(row))}</td>
                <td><details class="pm-iface-detail"><summary>查看</summary><div>${html(evidence)}</div></details></td>
              </tr>`;
            },
          })}
        </div>
      </div>`);
  }

  function renderTerminalsScaleAdaptive(snapshot) {
    const rows = (snapshot.terminals || []).slice().sort((a, b) => totalRate(b) - totalRate(a));
    const meta = scaleFor(snapshot, 'terminals', rows);
    return section('终端', 'terminals', '终端按身份、地址、状态和流量搜索。', `
      <div class="scale-shell">
        ${detailHeader(meta, '终端明细', '默认按流量优先。大规模网络先搜索或分组，再看当前窗口。', [
          { label: '有流量', value: number(rows.filter((row) => totalRate(row) > 0).length) },
          { label: 'IPv6', value: number(rows.filter((row) => String(row.ip || '').includes(':')).length) },
        ])}
        <div class="scale-detail-card"><div class="card-body">
          ${renderPagedTable({
            key: 'terminals',
            title: '终端',
            meta,
            rows,
            pageSize: 18,
            searchLabel: '搜索终端',
            groupLabel: '终端分组',
            placeholder: '主机名、IP、MAC、来源',
            groupOptions: [
              { value: 'all', label: '全部' },
              { value: 'active', label: '有流量' },
              { value: 'quiet', label: '低流量' },
              { value: 'ipv6', label: 'IPv6' },
            ],
            groupFn: (row) => String(row.ip || '').includes(':') ? 'ipv6' : totalRate(row) > 0 ? 'active' : 'quiet',
            headers: ['名称', 'IP', 'MAC', '状态', '上行', '下行', '连接', '累计'],
            rowHtml: (row) => `<tr>
              <td class="scale-terminal-name">${typeof renderEditableNameCell === 'function' ? renderEditableNameCell(row, row.ip, row.displayName || row.hostname || row.ip || '-') : html(row.displayName || row.hostname || row.ip || '-')}</td>
              <td class="scale-terminal-ip">${html(row.ip || '-')}</td>
              <td class="scale-terminal-mac">${html(row.mac || '-')}</td>
              <td>${pill(row.status || row.source || '-', row.status === 'failed' ? 'danger' : 'info')}</td>
              <td>${rate(row.upRate)}</td>
              <td>${rate(row.downRate)}</td>
              <td>${number(row.connections || row.connectionCount || 0)}</td>
              <td>${bytes(row.sessionBytes || 0)}</td>
            </tr>`,
          })}
        </div></div>
      </div>`);
  }

  function renderDhcpScaleAdaptive(snapshot) {
    const dhcp = snapshot.dhcp || {};
    const leases = dhcp.leases || [];
    const meta = scaleFor(snapshot, 'dhcpLeases', leases);
    const pools = dhcp.pools || [];
    const servers = dhcp.servers || [];
    return section('DHCP 服务', 'dhcp', 'DHCP 用总量和样本边界说清楚，租约列表进入搜索和分页。', `
      <div class="scale-shell">
        ${detailHeader(meta, 'DHCP 租约', '租约可能是样本视图；先看总量和状态，再搜索具体地址或主机。', [
          { label: '服务', value: number(servers.length) },
          { label: '地址池', value: number(pools.length) },
          { label: '静态租约', value: number(leases.filter((row) => row.static).length) },
        ])}
        <div class="scale-detail-card"><div class="card-body">
          ${renderPagedTable({
            key: 'dhcpLeases',
            title: 'DHCP',
            meta,
            rows: leases,
            pageSize: 18,
            searchLabel: '搜索租约',
            groupLabel: '租约分组',
            placeholder: 'IP、主机名、MAC、服务',
            groupOptions: [
              { value: 'all', label: '全部' },
              { value: 'bound', label: 'bound' },
              { value: 'static', label: '静态' },
              { value: 'other', label: '其他' },
            ],
            groupFn: (row) => row.static ? 'static' : String(row.status || '').toLowerCase() === 'bound' ? 'bound' : 'other',
            headers: ['IP', '主机名', 'MAC', '服务', '状态', '最后出现', '类型'],
            rowHtml: (row) => `<tr>
              <td>${html(row.address || '-')}</td>
              <td>${typeof renderEditableNameCell === 'function' ? renderEditableNameCell(row, row.address, row.displayName || row.hostname || row.address || '-') : html(row.displayName || row.hostname || '-')}</td>
              <td>${html(row.mac || '-')}</td>
              <td>${html(row.server || '-')}</td>
              <td>${pill(row.status || '-', String(row.status || '').toLowerCase() === 'bound' ? 'ok' : 'warn')}</td>
              <td>${html(row.lastSeen || '-')}</td>
              <td>${row.static ? pill('静态', 'info') : pill('动态', 'ok')}</td>
            </tr>`,
          })}
        </div></div>
      </div>`);
  }

  function renderTrafficLoadScaleAdaptive(snapshot) {
    const lines = typeof getLogicalWanLines === 'function' ? getLogicalWanLines(snapshot) : (snapshot.wan || snapshot.pppoe || []);
    const interfaces = (snapshot.interfaces || []).slice().sort((a, b) => totalRate(b, 'txRate', 'rxRate') - totalRate(a, 'txRate', 'rxRate'));
    const terminals = (snapshot.terminals || []).slice().sort((a, b) => totalRate(b) - totalRate(a));
    const overview = snapshot.overview || {};
    const wanMeta = scaleFor(snapshot, 'wan', lines);
    const busyLine = lines.slice().sort((a, b) => totalRate(b) - totalRate(a))[0];
    return section('流量负载', 'trafficLoad', '总览看聚合和异常，明细用分组、搜索和窗口渲染。', `
      <div class="scale-shell">
        ${detailHeader(wanMeta, '流量负载', '保留聚合吞吐和最忙对象；线路、接口、终端分别用窗口下钻。', [
          { label: '总上行', value: rate(overview.uplinkBps) },
          { label: '总下行', value: rate(overview.downlinkBps) },
          { label: '最忙线路', value: html(busyLine?.name || '-') },
          { label: '连接', value: compact(snapshot.connections?.total || 0) },
        ])}
        <div class="scale-detail-card"><div class="card-head"><div class="card-title">WAN 线路窗口</div><div class="subtle">按状态、父接口或名称过滤</div></div><div class="card-body">
          ${renderPagedTable({
            key: 'trafficLines',
            title: 'WAN',
            meta: wanMeta,
            rows: lines,
            pageSize: 14,
            searchLabel: '搜索线路',
            groupLabel: '线路分组',
            placeholder: '线路名、父接口、地址',
            groupOptions: [
              { value: 'all', label: '全部' },
              { value: 'online', label: '在线' },
              { value: 'offline', label: '离线' },
              { value: 'busy', label: '有流量' },
            ],
            groupFn: (row) => !row.running ? 'offline' : totalRate(row) > 0 ? 'busy' : 'online',
            headers: ['线路', '状态', '父接口', '地址', '上行', '下行', '累计', '活动路由'],
            rowHtml: (row) => `<tr>
              <td>${html(row.name)}</td>
              <td>${row.running ? pill('在线', 'ok') : pill('离线', 'danger')}</td>
              <td>${html(row.parent || row.access || '-')}</td>
              <td>${html((row.addresses || []).join(', ') || row.address || '-')}</td>
              <td>${rate(row.upRate)}</td>
              <td>${rate(row.downRate)}</td>
              <td>${bytes(Number(row.txBytes || 0) + Number(row.rxBytes || 0))}</td>
              <td>${number((row.routes || []).filter((route) => route.active).length)}</td>
            </tr>`,
          })}
        </div></div>
        <div class="grid-2">
          <div class="scale-detail-card"><div class="card-head"><div class="card-title">接口吞吐窗口</div><div class="subtle">${number(interfaces.length)} 个接口</div></div><div class="card-body">
            ${renderPagedTable({
              key: 'trafficInterfaces',
              title: '接口',
              meta: scaleFor(snapshot, 'interfaces', interfaces),
              rows: interfaces,
              pageSize: 12,
              searchLabel: '搜索接口',
              groupLabel: '接口分组',
              placeholder: '接口、角色、类型',
              groupOptions: [{ value: 'all', label: '全部' }, { value: 'WAN', label: 'WAN' }, { value: 'LAN', label: 'LAN' }],
              groupFn: (row) => row.role || 'LAN',
              headers: ['接口', '角色', '状态', '上行', '下行', '累计'],
              rowHtml: (row) => `<tr><td>${html(row.name)}</td><td>${pill(row.role || '-', row.role === 'WAN' ? 'info' : 'ok')}</td><td>${row.running ? pill('在线', 'ok') : pill('离线', 'danger')}</td><td>${rate(row.txRate)}</td><td>${rate(row.rxRate)}</td><td>${bytes(Number(row.txBytes || 0) + Number(row.rxBytes || 0))}</td></tr>`,
            })}
          </div></div>
          <div class="scale-detail-card"><div class="card-head"><div class="card-title">终端流量窗口</div><div class="subtle">${number(terminals.length)} 台终端</div></div><div class="card-body">
            ${renderPagedTable({
              key: 'trafficTerminals',
              title: '终端',
              meta: scaleFor(snapshot, 'terminals', terminals),
              rows: terminals,
              pageSize: 12,
              searchLabel: '搜索终端',
              groupLabel: '终端分组',
              placeholder: '终端、IP、MAC',
              groupOptions: [{ value: 'all', label: '全部' }, { value: 'active', label: '有流量' }, { value: 'quiet', label: '低流量' }],
              groupFn: (row) => totalRate(row) > 0 ? 'active' : 'quiet',
              headers: ['终端', 'IP', '上行', '下行', '连接', '累计'],
              rowHtml: (row) => `<tr><td class="scale-terminal-name">${html(row.displayName || row.hostname || row.ip || '-')}</td><td class="scale-terminal-ip">${html(row.ip || '-')}</td><td>${rate(row.upRate)}</td><td>${rate(row.downRate)}</td><td>${number(row.connections || row.connectionCount || 0)}</td><td>${bytes(row.sessionBytes || 0)}</td></tr>`,
            })}
          </div></div>
        </div>
      </div>`);
  }

  function scenarioProfile(snapshot) {
    const lines = typeof getLogicalWanLines === 'function' ? getLogicalWanLines(snapshot) : [];
    const count = Number(snapshot?.meta?.scale?.wan?.actualCount ?? snapshot?.meta?.wanCount ?? lines.length ?? 0);
    const tier = typeof getSnapshotLineLayoutTier === 'function' ? getSnapshotLineLayoutTier(snapshot) : 'dense';
    const bucket = bucketFor(count);
    return {
      count,
      tier,
      bucket,
      label: `${number(count)} WAN / ${bucketLabel(bucket)}`,
      headline: bucket === 'single' ? '单线聚合' : bucket === 'fleet' || bucket === 'large' ? '规模化运维' : '多线排障',
      overviewTip: '总览只放风险、动作和聚合健康；线路明细进入可搜索、可分组、可分页的详情页。',
      balanceTip: '分流页展示策略证据，不能把 Top-N 当作全量。',
      trafficTip: '流量页使用窗口渲染，保留真实总量、展示数和采样说明。',
      lineStatusTip: '线路状态按异常优先，再按名称、父接口和路由表下钻。',
      matrixTitle: '规模化线路窗口',
      matrixTip: '保留真实数量，按窗口展示明细。',
    };
  }

  getWanScenarioProfile = scenarioProfile;
  window.getWanScenarioProfile = scenarioProfile;
  renderOverview = renderOverviewScaleAdaptive;
  renderInterfaces = renderInterfacesScaleAdaptive;
  renderTerminals = renderTerminalsScaleAdaptive;
  renderDhcp = renderDhcpScaleAdaptive;
  renderTrafficLoad = renderTrafficLoadScaleAdaptive;
  window.renderOverview = renderOverview;
  window.renderInterfaces = renderInterfaces;
  window.renderTerminals = renderTerminals;
  window.renderDhcp = renderDhcp;
  window.renderTrafficLoad = renderTrafficLoad;

  const IKUAI_HOME_DESIGN_WIDTH = 1180;
  let ikuaiFitRaf = 0;
  let ikuaiFitObserver = null;
  let ikuaiObservedSection = null;

  function observeIkuaiSection(section) {
    if (typeof ResizeObserver !== 'function' || ikuaiObservedSection === section) return;
    if (ikuaiFitObserver) ikuaiFitObserver.disconnect();
    ikuaiObservedSection = section;
    ikuaiFitObserver = new ResizeObserver(() => requestIkuaiViewportFit());
    ikuaiFitObserver.observe(section);
  }

  function fitIkuaiHomeToViewport() {
    const section = document.querySelector('#overview.ikuai-overview-section');
    const home = section?.querySelector?.('.ikuai-home');
    if (!section || !home) return;
    observeIkuaiSection(section);
    const availableWidth = Math.max(1, Math.floor(section.clientWidth || section.getBoundingClientRect().width || 0));
    const scale = Math.min(1, availableWidth / IKUAI_HOME_DESIGN_WIDTH);
    const shouldScale = scale < 0.995;
    home.classList.toggle('is-viewport-scaled', shouldScale);
    section.classList.toggle('is-ikuai-scaled', shouldScale);
    if (!shouldScale) {
      home.style.removeProperty('--ikuai-home-scale');
      home.style.removeProperty('--ikuai-home-design-width');
      section.style.removeProperty('--ikuai-scaled-height');
      return;
    }
    home.style.setProperty('--ikuai-home-scale', scale.toFixed(5));
    home.style.setProperty('--ikuai-home-design-width', `${IKUAI_HOME_DESIGN_WIDTH}px`);
    const scaledHeight = Math.ceil(home.scrollHeight * scale);
    section.style.setProperty('--ikuai-scaled-height', `${scaledHeight}px`);
  }

  function requestIkuaiViewportFit() {
    if (ikuaiFitRaf) cancelAnimationFrame(ikuaiFitRaf);
    ikuaiFitRaf = requestAnimationFrame(() => {
      ikuaiFitRaf = 0;
      fitIkuaiHomeToViewport();
    });
  }

  function requestIkuaiViewportFitBurst() {
    requestIkuaiViewportFit();
    setTimeout(requestIkuaiViewportFit, 80);
    setTimeout(requestIkuaiViewportFit, 240);
  }

  window.addEventListener('resize', requestIkuaiViewportFit);
  window.addEventListener('load', requestIkuaiViewportFitBurst);
  document.addEventListener('DOMContentLoaded', requestIkuaiViewportFitBurst);
  const ikuaiDomObserverTarget = document.getElementById('app') || document.body;
  if (ikuaiDomObserverTarget && typeof MutationObserver === 'function') {
    const ikuaiDomObserver = new MutationObserver(() => requestIkuaiViewportFit());
    ikuaiDomObserver.observe(ikuaiDomObserverTarget, { childList: true, subtree: true });
  }
  requestIkuaiViewportFitBurst();
  const baseRenderAppForIkuaiFit = typeof renderApp === 'function' ? renderApp : null;
  if (baseRenderAppForIkuaiFit && !window.__ikuaiViewportFitRenderWrap) {
    window.__ikuaiViewportFitRenderWrap = true;
    renderApp = function renderAppWithIkuaiViewportFit(...args) {
      const result = baseRenderAppForIkuaiFit.apply(this, args);
      requestIkuaiViewportFitBurst();
      return result;
    };
    window.renderApp = renderApp;
  }

  document.addEventListener('input', (event) => {
    const target = event.target?.closest?.('[data-scale-search]');
    if (!target) return;
    state.query[target.dataset.scaleSearch] = target.value;
    setPage(target.dataset.scaleSearch, 0);
    if (typeof noteInteraction === 'function') noteInteraction(2400);
    if (typeof renderApp === 'function') renderApp(displayedSnapshot || latestSnapshot);
  });

  document.addEventListener('change', (event) => {
    const wanSelect = event.target?.closest?.('[data-ikuai-wan-select]');
    if (wanSelect) {
      state.ikuaiWanLine = wanSelect.value || '';
      if (typeof noteInteraction === 'function') noteInteraction(2400);
      if (typeof renderApp === 'function') renderApp(displayedSnapshot || latestSnapshot);
      return;
    }
    const target = event.target?.closest?.('[data-scale-group]');
    if (!target) return;
    state.group[target.dataset.scaleGroup] = target.value;
    setPage(target.dataset.scaleGroup, 0);
    if (typeof noteInteraction === 'function') noteInteraction(2400);
    if (typeof renderApp === 'function') renderApp(displayedSnapshot || latestSnapshot);
  });

  document.addEventListener('click', (event) => {
    const groupButton = event.target?.closest?.('[data-scale-group-set]');
    if (groupButton) {
      const key = groupButton.dataset.scaleGroupSet;
      state.group[key] = groupButton.dataset.scaleGroupValue || 'all';
      setPage(key, 0);
      if (typeof noteInteraction === 'function') noteInteraction(2400);
      if (typeof renderApp === 'function') renderApp(displayedSnapshot || latestSnapshot);
      return;
    }
    const clearButton = event.target?.closest?.('[data-scale-clear]');
    if (clearButton) {
      const key = clearButton.dataset.scaleClear;
      state.query[key] = '';
      state.group[key] = 'all';
      setPage(key, 0);
      if (typeof noteInteraction === 'function') noteInteraction(2400);
      if (typeof renderApp === 'function') renderApp(displayedSnapshot || latestSnapshot);
      return;
    }
    const button = event.target?.closest?.('[data-scale-page]');
    if (!button || button.disabled) return;
    const key = button.dataset.scalePage;
    setPage(key, pageKey(key) + Number(button.dataset.scalePageDir || 0));
    if (typeof noteInteraction === 'function') noteInteraction(2400);
    if (typeof renderApp === 'function') renderApp(displayedSnapshot || latestSnapshot);
  });

  const snapshot = displayedSnapshot || latestSnapshot;
  if (snapshot && typeof renderApp === 'function') {
    renderApp(snapshot);
  }
})();
