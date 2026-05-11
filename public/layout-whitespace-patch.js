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
    #overview .ik-home-status-grid { grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 8px; margin-bottom: 10px; }
    #overview .ik-home-status-tile { padding: 10px 12px; }
    #overview .ik-home-status-tile strong { font-size: 17px; }
    #overview .ik-home-layout { grid-template-columns: 430px minmax(0, 1fr); gap: 12px; align-items: stretch; }
    #overview .ik-home-layout > .stack,
    #overview .ik-home-main { gap: 10px; height: 100%; }
    #overview .ik-home-layout > .stack { display: flex; flex-direction: column; min-width: 0; }
    #overview .ik-home-quick-card { display: flex; flex: 0 0 auto; flex-direction: column; min-height: 0; overflow: visible; }
    #overview .ik-home-quick-card .card-body { display: flex; flex: 0 0 auto; flex-direction: column; min-height: 0; height: auto; padding: 12px 10px 14px; overflow: visible; }
    #overview .ik-home-quick-card .ik-quick-grid { flex: 0 0 auto; grid-template-rows: repeat(3, 104px); gap: 12px; margin-top: 0; min-height: 0; }
    #overview .ik-home-quick-card .ik-quick-link { align-content: center; padding: 18px 12px; border-radius: 12px; font-size: 13px; font-weight: 700; }
    #overview .ik-home-quick-card .ik-quick-link span:first-child { width: 26px; height: 26px; border-radius: 8px; }
    #overview .ik-home-monitor-grid { grid-template-columns: minmax(0, .78fr) minmax(0, 1.22fr); gap: 10px; }
    #overview .ik-home-summary-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
    #overview .ik-home-rank-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; align-items: stretch; }
    #overview .ik-home-rank-card { display: flex; min-height: 0; flex-direction: column; }
    #overview .ik-home-rank-card .ops-table-wrap { border: 0; border-radius: 0; flex: 1 1 auto; height: 440px; max-height: 440px; overflow-y: auto; overscroll-behavior: contain; }
    #overview .ik-home-rank-card .ops-table thead th { position: sticky; top: 0; z-index: 2; background: #f8fbff; box-shadow: 0 1px 0 #edf1f7; }
    #overview .wide-card .info-list { gap: 6px 10px; }
    #overview .wide-card .info-item { padding-bottom: 6px; }
    #overview .ik-wan-info-card .info-list { gap: 8px 14px; margin-top: 4px; }
    #overview .ik-wan-info-card .info-item { padding-bottom: 8px; }
    #overview .ik-wan-info-card .info-k { color: #7f8da1; font-size: 11px; font-weight: 700; line-height: 1.2; }
    #overview .ik-wan-info-card .info-v { margin-top: 3px; color: #253246; font-size: 12px; font-weight: 700; line-height: 1.35; }
    #overview .ik-wan-switch { margin-top: 9px; padding: 8px 10px; border-radius: 10px; }
    #overview .ik-wan-line-select { height: 31px; font-size: 12px; font-weight: 700; }
    #overview .ik-summary-split { gap: 8px; align-items: start; }
    #overview .ik-summary-box { min-height: 0; padding: 8px 10px; }
    #overview .ik-wan-rate-split:not(.is-main) .ik-wan-rate-svg { height: 96px; }
    #overview .chart-box { padding: 8px; }
    #overview .mini-chart { height: 126px; }
    #overview .ik-system-load-card .ops-resource-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    #overview .ik-system-load-card .ops-resource-card { padding: 10px 12px 12px; }
    #overview .ops-resource-grid { gap: 10px; }
    #overview .ops-resource-card { padding: 9px 10px; }
    #overview .ops-resource-plot,
    #overview .ops-resource-svg { height: 112px; }
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
    if (!rows.length) return emptyBlock(options.emptyText || '鏆傛棤鍙睍绀烘暟鎹?);
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
          </div>` : emptyBlock(`${title} 褰撳墠鏈鍙栧埌鍘嗗彶閲囨牱`)}
      </div>`;
  }

  function opsStatTiles(items, emptyText = '鏆傛棤鍙睍绀烘暟鎹?) {
    if (!items.length) return emptyBlock(emptyText);
    return `<div class="ops-stat-grid">${items.map((item) => `
      <div class="ops-stat-tile">
        <div class="ops-stat-label">${escapeHtml(item.label)}</div>
        <div class="ops-stat-value">${item.value || '-'}</div>
        ${item.meta ? `<div class="ops-stat-meta">${item.meta}</div>` : ''}
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
    return `${shown}<br><span class="ops-inline-sub">+${fmtNumber(items.length - limit)} 椤?/span>`;
  }

  function addressCell(values = []) {
    const families = splitIpFamilies(values);
    const primary = families.ipv4[0] || families.ipv6[0] || '-';
    const total = families.ipv4.length + families.ipv6.length;
    let secondary = '';
    if (families.ipv4.length && families.ipv6.length) secondary = families.ipv6[0];
    else if (total > 1) secondary = `鍏?${fmtNumber(total)} 涓湴鍧€`;
    return opsTwoLineCell(escapeHtml(primary), secondary ? escapeHtml(secondary) : '');
  }

  function gatewayCell(values = []) {
    const items = (values || []).map((value) => String(value || '').trim()).filter(Boolean);
    if (!items.length) return opsTwoLineCell('-', '');
    const primary = items[0];
    const secondary = items.length > 1 ? `鍏?${fmtNumber(items.length)} 鏉＄洰鏍嘸 : '';
    return opsTwoLineCell(escapeHtml(primary), secondary ? escapeHtml(secondary) : '');
  }

  function packetSummaryCell(dropValue, errorValue) {
    return opsTwoLineCell(`涓?${fmtNumber(dropValue)}`, `閿?${fmtNumber(errorValue)}`);
  }

  function routeSummaryCell(routes = []) {
    const activeRoutes = (routes || []).filter((route) => route && route.active);
    if (!activeRoutes.length) return opsTwoLineCell('鏈娴嬪埌娲诲姩榛樿', '');
    const primary = `${activeRoutes[0].table || '-'} / distance ${activeRoutes[0].distance || '-'}`;
    const secondary = activeRoutes.length > 1 ? `鍏?${fmtNumber(activeRoutes.length)} 鏉℃椿鍔ㄨ矾鐢盽 : (activeRoutes[0].comment || '');
    return opsTwoLineCell(escapeHtml(primary), secondary ? escapeHtml(secondary) : '');
  }

  function statusTag(running, disabled = false) {
    if (disabled) return tag('鍋滅敤', 'warn');
    return running ? tag('鍦ㄧ嚎', 'ok') : tag('绂荤嚎', 'danger');
  }

  function yesNoTag(value, yesText = '鏄?, noText = '鍚?) {
    return value ? tag(yesText, 'ok') : tag(noText, 'warn');
  }

  function routeRoleFor(activeRoutes = [], allRoutes = []) {
    const activeTables = activeRoutes.map((route) => String(route.table || '-').trim() || '-');
    const hasMain = activeTables.some((table) => table.toLowerCase() === 'main');
    const hasPolicy = activeTables.some((table) => table.toLowerCase() !== 'main');
    if (hasMain && hasPolicy) return { label: '鍏ㄥ眬+绛栫暐', level: 'ok' };
    if (hasMain) return { label: '鍏ㄥ眬鍑哄彛', level: 'ok' };
    if (hasPolicy) return { label: '绛栫暐鍑哄彛', level: 'info' };
    if ((allRoutes || []).length) return { label: '澶囬€夋湭婵€娲?, level: 'warn' };
    return { label: '鏃犻粯璁よ矾鐢?, level: 'danger' };
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
      blockers.push('鎷ㄥ彿绂荤嚎');
      score -= 45;
    }
    if (!hasAddress) {
      blockers.push('鏈嬁鍒板湴鍧€');
      score -= 25;
    }
    if (!hasActiveRoute) {
      blockers.push('鏃犳椿鍔ㄩ粯璁よ矾鐢?);
      score -= 35;
    }
    if (errorTotal > 0) {
      blockers.push('鐖舵帴鍙ｉ敊璇?);
      score -= 25;
    }
    if (dropTotal > 0) {
      observations.push('鐖舵帴鍙ｇ疮璁′涪鍖?);
      score -= 5;
    }

    score = Math.max(0, Math.min(100, score));
    const level = blockers.some((item) => ['鎷ㄥ彿绂荤嚎', '鏃犳椿鍔ㄩ粯璁よ矾鐢?].includes(item))
      ? 'danger'
      : blockers.length
        ? 'warn'
        : score >= 90
          ? 'ok'
          : 'warn';
    const stateLabel = level === 'danger' ? '鏁呴殰' : level === 'warn' ? '娉ㄦ剰' : '姝ｅ父';
    const reasonList = blockers.concat(observations);
    const action = !row.running
      ? '妫€鏌ユ嫧鍙烽摼璺?
      : !hasAddress
        ? '妫€鏌ュ湴鍧€鑾峰彇'
        : !hasActiveRoute
          ? '妫€鏌ラ粯璁よ矾鐢?
          : errorTotal > 0
            ? '妫€鏌ョ埗鎺ュ彛閿欒'
            : '淇濇寔瑙傚療';

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
    if (!item.reasonList.length) return opsTwoLineCell('鍏抽敭闂幆姝ｅ父', '');
    const primary = item.blockers.length ? item.blockers.join(' / ') : '鍏抽敭闂幆姝ｅ父';
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
      ? `<div class="notice" style="margin-bottom:12px">褰撳墠椤甸潰淇濇寔鍙鐩戞帶妯″紡锛屾寜閽彧鐢ㄤ簬鍒囨崲瑙嗗浘鎴栧埛鏂板綋鍓嶉〉锛屼笉浼氭彁浜や换浣曢厤缃彉鏇淬€?/div>`
      : '';
    const tabs = `
      <div class="ik-subtabs">
        <button class="ik-subtab ${currentInterfaceView === 'monitor' ? 'is-active' : ''}" type="button" data-interface-view="monitor">绾胯矾鐩戞帶</button>
        <button class="ik-subtab ${currentInterfaceView === 'detect' ? 'is-active' : ''}" type="button" data-interface-view="detect">绾胯矾鐘舵€佹娴?/button>
        <button class="ik-subtab ${currentInterfaceView === 'ipv6' ? 'is-active' : ''}" type="button" data-interface-view="ipv6">IPv6 绾胯矾璇︽儏</button>
      </div>`;
    const toolbar = `
      <div class="ik-data-toolbar">
        <div class="ik-ghost-group">
          <span class="ik-ghost-pill is-active">${escapeHtml(interfaceViews[currentInterfaceView].title)}</span>
          <button class="ik-ghost-pill" type="button" data-interface-refresh="current">鍒锋柊褰撳墠椤垫暟鎹?/button>
        </div>
        <div class="ik-ghost-group">
          <button class="ik-ghost-pill ${interfaceReadonlyOpen ? 'is-active' : ''}" type="button" data-interface-readonly-toggle="true">鍙鐩戞帶</button>
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
      ? opsBarStack(loadDistributionRows, { percentMode: true, emptyText: '褰撳墠鏈舰鎴愮嚎璺崰姣旀暟鎹? })
      : opsBarStack(realtimeLoadRows, { emptyText: '褰撳墠鏈舰鎴愮嚎璺疄鏃惰礋杞藉垎甯? });
    const lineRows = sortedPppoe.map((row) => {
      const activeRoutes = (row.routes || []).filter((route) => route.active);
      return `
        <tr>
          <td>${escapeHtml(row.name)}</td>
          <td>${statusTag(row.running)}</td>
          <td>${opsTwoLineCell(escapeHtml(row.parent || '-'), activeRoutes.length ? escapeHtml(`${activeRoutes[0].table || '-'} / distance ${activeRoutes[0].distance || '-'}`) : '鏃犳椿鍔ㄩ粯璁?)}</td>
          <td>${addressCell(row.addresses || [])}</td>
          <td>${fmtRate(row.upRate)}</td>
          <td>${fmtRate(row.downRate)}</td>
          <td>${fmtBytes(row.txBytes)}</td>
          <td>${fmtBytes(row.rxBytes)}</td>
          <td>${escapeHtml(row.status || (row.running ? '鍦ㄧ嚎' : '绂荤嚎'))}</td>
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
        <td>${opsTwoLineCell(escapeHtml(row.mac || '-'), `涓?${fmtNumber(Number(row.txDrop || 0) + Number(row.rxDrop || 0))} / 閿?${fmtNumber(Number(row.txError || 0) + Number(row.rxError || 0))}`)}</td>
      </tr>`);
    const detectRows = sortedPppoe.map((row) => {
      const parent = interfaceByName[row.parent] || {};
      const dropTotal = Number(parent.txDrop || 0) + Number(parent.rxDrop || 0);
      const errorTotal = Number(parent.txError || 0) + Number(parent.rxError || 0);
      return `
        <tr>
          <td>${escapeHtml(row.name)}</td>
          <td>${statusTag(row.running)}</td>
          <td>${row.addresses?.length ? tag('宸插垎閰?, 'ok') : tag('鏈垎閰?, 'warn')}</td>
          <td>${opsTwoLineCell(
            escapeHtml(row.parent || '-'),
            ((row.routes || []).filter((route) => route && route.active).length
              ? escapeHtml(`${(row.routes || []).filter((route) => route && route.active)[0].table || '-'} / distance ${(row.routes || []).filter((route) => route && route.active)[0].distance || '-'}`)
              : '鏃犳椿鍔ㄩ粯璁?)
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
          ${metricCard('鍦ㄧ嚎瀹藉甫', fmtNumber(runningWan), `鎬荤嚎璺?${fmtNumber(pppoe.length)} 鏉, '')}
          ${metricCard('鍋ュ悍绾胯矾', fmtNumber(detectedHealthy), '鍚屾椂婊¤冻鍦ㄧ嚎 / 鏈夊湴鍧€ / 鏈夋椿鍔ㄩ粯璁よ矾鐢?, '')}
          ${metricCard('寮傚父绾胯矾', fmtNumber(abnormalLines), '绂荤嚎銆佹湭鍒嗛厤鎴栫埗鎺ュ彛鏈夊紓甯?, '')}
          ${metricCard('IPv6 鎺ュ彛', fmtNumber(ipv6Interfaces.length), '褰撳墠鍙鍙栧埌 IPv6 鍦板潃鐨勬帴鍙?, '')}
        </div>
        <div class="ops-page-stack" style="margin-top:12px">
          ${opsCard('妫€娴嬫憳瑕?, '褰撳墠椤佃仛鐒︾嚎璺仴搴峰拰寮傚父瀹氫綅', opsStatTiles([
            { label: '鏈夊湴鍧€瀹藉甫', value: fmtNumber(pppoe.filter((row) => (row.addresses || []).length).length), meta: '宸叉嬁鍒版嫧鍙峰湴鍧€' },
            { label: '娲诲姩榛樿', value: fmtNumber(pppoe.filter((row) => (row.routes || []).some((route) => route.active)).length), meta: '瀛樺湪娲诲姩榛樿璺敱' },
            { label: '鐖舵帴鍙ｅ紓甯?, value: fmtNumber(pppoe.filter((row) => {
              const parent = interfaceByName[row.parent] || {};
              return Number(parent.txDrop || 0) + Number(parent.rxDrop || 0) + Number(parent.txError || 0) + Number(parent.rxError || 0) > 0;
            }).length), meta: '涓㈠寘鎴栭敊璇潪 0' },
            { label: '绂荤嚎绾胯矾', value: fmtNumber(pppoe.filter((row) => !row.running).length), meta: '鎷ㄥ彿鐘舵€佹湭灏辩华' }
          ]), 'ops-info-card')}
          ${opsDenseTableCard('绾胯矾鐘舵€佹娴?, `${fmtNumber(sortedPppoe.length)} 鏉＄嚎璺痐, ['绾胯矾', '鎷ㄥ彿鐘舵€?, '鍦板潃鐘舵€?, '鐖舵帴鍙?/ 娲诲姩璺敱', '瀹炴椂涓婅閫熺巼', '瀹炴椂涓嬭閫熺巼', '涓㈠寘 / 閿欒'], detectRows, '褰撳墠鏈鍙栧埌绾胯矾鐘舵€佹娴嬫暟鎹?)}
          ${opsCard('8 鏉＄嚎璺€熺巼瓒嬪娍', `${fmtNumber(lineTrendRows.length)} 鏉＄嚎璺悓姝ュ睍绀篳, renderLineTrendGrid(lineTrendRows, { emptyText: '褰撳墠鏈噰闆嗗埌鍙睍绀虹殑绾胯矾瓒嬪娍' }), 'ops-info-card')}
        </div>`;
    } else if (currentInterfaceView === 'ipv6') {
      body = `
        ${readonlyNotice}
        ${toolbar}
        <div class="grid-4" style="margin-top:12px">
          ${metricCard('IPv6 鎺ュ彛', fmtNumber(ipv6Interfaces.length), '褰撳墠鏈夌湡瀹?IPv6 鍦板潃鐨勬帴鍙?, '')}
          ${metricCard('鍦ㄧ嚎 IPv6 鎺ュ彛', fmtNumber(ipv6Interfaces.filter((row) => row.running).length), '鎺ュ彛閾捐矾鐘舵€?, '')}
          ${metricCard('WAN IPv6 绾胯矾', fmtNumber(pppoe.filter((row) => splitIpFamilies(row.addresses || []).ipv6.length).length), '甯﹀墠缂€鎴栭摼璺湰鍦板湴鍧€', '')}
          ${metricCard('IPv6 缃戝叧鎺ュ彛', fmtNumber(ipv6Interfaces.filter((row) => (row.gateways || []).some((value) => String(value || '').includes(':'))).length), '鍙鍒?IPv6 鐩爣', '')}
        </div>
        <div class="ops-page-stack" style="margin-top:12px">
          ${opsCard('IPv6 鎽樿', '鑱氱劍鎺ュ彛銆佸湴鍧€鍜?IPv6 璺敱鐩爣', opsStatTiles([
            { label: 'LAN IPv6 鎺ュ彛', value: fmtNumber(ipv6Interfaces.filter((row) => row.role === 'LAN').length), meta: '妗ユ帴 / VLAN / 铏氭嫙鎺ュ彛' },
            { label: 'WAN IPv6 鎺ュ彛', value: fmtNumber(ipv6Interfaces.filter((row) => row.role === 'WAN').length), meta: '鎷ㄥ彿渚ф帴鍙? },
            { label: '鏈?IPv6 缃戝叧', value: fmtNumber(ipv6Interfaces.filter((row) => (row.gateways || []).some((value) => String(value || '').includes(':'))).length), meta: '鍙 IPv6 璺敱鐩爣' },
            { label: '鏈夋祦閲忔帴鍙?, value: fmtNumber(ipv6Interfaces.filter((row) => totalTrafficRate(row, 'txRate', 'rxRate') > 0).length), meta: '褰撳墠瀛樺湪鍚炲悙' }
          ]), 'ops-info-card')}
          ${opsDenseTableCard('IPv6 鎺ュ彛鏄庣粏', `${fmtNumber(ipv6Interfaces.length)} 涓帴鍙, ['鎺ュ彛', '瑙掕壊', '鐘舵€?, 'IPv6 鍦板潃', '缃戝叧 / 璺敱鐩爣', '瀹炴椂涓婅閫熺巼', '瀹炴椂涓嬭閫熺巼'], ipv6Rows, '褰撳墠鏈鍙栧埌 IPv6 鎺ュ彛鏁版嵁')}
        </div>`;
    } else {
      body = `
        ${readonlyNotice}
        ${toolbar}
        <div class="grid-4" style="margin-top:12px">
          ${metricCard('鍦ㄧ嚎鎺ュ彛', `${fmtNumber(runningInterfaces)} / ${fmtNumber(interfaces.length)}`, '鎵€鏈夋帴鍙ｈ繍琛岀姸鎬?, '')}
          ${metricCard('鍦ㄧ嚎瀹藉甫', `${fmtNumber(runningWan)} / ${fmtNumber(pppoe.length)}`, 'PPPoE 绾胯矾灏辩华鎯呭喌', '')}
          ${metricCard('鍋ュ悍瀹藉甫', fmtNumber(detectedHealthy), '鍦ㄧ嚎涓旀嫢鏈夊湴鍧€涓庢椿鍔ㄩ粯璁よ矾鐢?, '')}
          ${metricCard('寮傚父绾胯矾', fmtNumber(abnormalLines), '闇€瑕佷紭鍏堟帓鏌ョ殑绾胯矾', '')}
        </div>
        <div class="ops-page-stack" style="margin-top:12px">
          ${opsCard('鎺ュ彛杩愯鎽樿', '鍏堢湅鏁翠綋锛屽啀鐪嬪甯﹀拰鎺ュ彛鏄庣粏', opsStatTiles([
            { label: 'WAN 鎬讳笂琛?, value: fmtRate(totalWanUp), meta: `${fmtNumber(pppoe.length)} 鏉″甯﹁仛鍚坄 },
            { label: 'WAN 鎬讳笅琛?, value: fmtRate(totalWanDown), meta: busiestLine ? `褰撳墠涓荤嚎 ${escapeHtml(busiestLine.name)}` : '鏆傛棤涓荤嚎' },
            { label: '鍦ㄧ嚎 LAN', value: fmtNumber(runningLan), meta: `LAN 鎬绘暟 ${fmtNumber(interfaces.filter((row) => row.role === 'LAN').length)}` },
            { label: '铏氭嫙鎺ュ彛', value: fmtNumber(virtualCount), meta: 'VLAN / WG / Loopback / L2TP' },
            { label: 'IPv6 鎺ュ彛', value: fmtNumber(ipv6Interfaces.length), meta: '鍏峰 IPv6 鍦板潃鐨勬帴鍙? },
            { label: '鏈€蹇欏甯﹂€熺巼', value: busiestLine ? fmtRate(totalTrafficRate(busiestLine)) : '-', meta: busiestLine ? `${fmtRate(busiestLine.upRate)} / ${fmtRate(busiestLine.downRate)}` : '鏆傛棤瀹炴椂绾胯矾娴侀噺' }
          ]), 'ops-info-card')}
          ${opsDenseTableCard('瀹藉甫瀹炴椂娴侀噺', `${fmtNumber(sortedPppoe.length)} 鏉″甯, ['绾胯矾', '鐘舵€?, '鐖舵帴鍙?/ 娲诲姩璺敱', 'IP 鍦板潃', '瀹炴椂涓婅閫熺巼', '瀹炴椂涓嬭閫熺巼', '绱涓婅娴侀噺', '绱涓嬭娴侀噺', '鎷ㄥ彿鐘舵€?], lineRows, '褰撳墠鏈鍙栧埌瀹藉甫绾胯矾鏁版嵁')}
          <div class="ops-double">
            ${opsCard('绾胯矾璐熻浇鍒嗗竷', loadDistributionRows.length ? `${fmtNumber(loadDistributionRows.length)} 鏉＄嚎璺崰姣擿 : '褰撳墠鎸夊疄鏃跺悶鍚愯嚜鍔ㄦ帓搴?, loadDistributionBlock, 'ops-info-card')}
            ${opsCard('8 鏉＄嚎璺€熺巼瓒嬪娍', `${fmtNumber(lineTrendRows.length)} 鏉＄嚎璺悓姝ュ睍绀篳, renderLineTrendGrid(lineTrendRows, { emptyText: '褰撳墠鏈噰闆嗗埌鍙睍绀虹殑绾胯矾瓒嬪娍' }), 'ops-info-card')}
          </div>
          ${opsDenseTableCard('鎺ュ彛鍚炲悙鏄庣粏', `${fmtNumber(sortedInterfaces.length)} 涓帴鍙, ['鎺ュ彛', '瑙掕壊', '鐘舵€?, 'IP 鍦板潃', '瀹炴椂涓婅閫熺巼', '瀹炴椂涓嬭閫熺巼', '绱涓婅娴侀噺', '绱涓嬭娴侀噺', 'MAC / 涓㈠寘閿欒'], ifaceRows, '褰撳墠鏈鍙栧埌鎺ュ彛鏁版嵁')}
        </div>`;
    }
    return section('鎺ュ彛鎬昏', 'interfaces', interfaceViews[currentInterfaceView].tip, `
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
    const routeType = (row) => row.static ? '闈欐€? : row.dynamic ? '鍔ㄦ€? : '鍏跺畠';
    const routeStatus = (row) => row.disabled ? tag('鍋滅敤', 'warn') : row.active ? tag('娲诲姩', 'ok') : tag('寰呮満', 'info');
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
    return section('闈欐€佽矾鐢?, 'routes', '鐪熷疄璺敱琛ㄣ€侀粯璁よ矾鐢变笌闈欐€佽矾鐢辨寜 RouterOS 瀹炶〃灞曠ず', `
      <div class="grid-4">
        ${metricCard('榛樿璺敱', fmtNumber(defaultRouteItems.length), `娲诲姩 ${fmtNumber(activeDefaultCount)} 鏉, `璺敱琛?${fmtNumber(routeTables.length)} 涓猔)}
        ${metricCard('闈欐€佽矾鐢?, fmtNumber(staticRouteItems.length), `鍋滅敤 ${fmtNumber(disabledStaticCount)} 鏉, `甯﹀娉?${fmtNumber(commentedStaticCount)} 鏉)}
        ${metricCard('鍦板潃鏃?, `${fmtNumber(ipv4StaticCount)} / ${fmtNumber(ipv6StaticCount)}`, 'IPv4 / IPv6 闈欐€佽矾鐢?, '')}
        ${metricCard('鍙缃戝叧', fmtNumber(gatewayEntries.length), `鍏ㄩ噺璺敱 ${fmtNumber(routeItems.length)} 鏉, '')}
      </div>
      <div class="ops-double" style="margin-top:12px">
        ${opsDenseTableCard('璺敱琛ㄥ垎甯?, `${fmtNumber(routeTables.length)} 涓矾鐢辫〃`, ['璺敱琛?, '鎬昏矾鐢?, '榛樿璺敱', '娲诲姩榛樿', '鍏宠仈缃戝叧'], routeTableRows, '褰撳墠鏈瘑鍒埌璺敱琛ㄥ垎甯?)}
        ${opsDenseTableCard('缃戝叧娲诲姩鐭╅樀', `${fmtNumber(gatewayEntries.length)} 涓綉鍏砢, ['缃戝叧', '鎬昏矾鐢?, '娲诲姩', '榛樿璺敱', '璺敱琛?, '澶囨敞'], gatewayRows, '褰撳墠鏈瘑鍒埌缃戝叧娲诲姩鐭╅樀')}
      </div>
      <div class="ops-page-stack" style="margin-top:12px">
        ${opsDenseTableCard('榛樿璺敱鐘舵€?, `${fmtNumber(defaultRouteItems.length)} 鏉, ['璺敱琛?, '缃戝叧', '璺濈', '鐘舵€?, '澶囨敞'], defaultRows, '褰撳墠鏈鍙栧埌榛樿璺敱')}
        ${opsDenseTableCard('闈欐€佽矾鐢卞垪琛?, `${fmtNumber(staticRouteItems.length)} 鏉, ['鐩爣缃戞', '缃戝叧', '璺敱琛?, '璺濈', '绫诲瀷', '鐘舵€?, '澶囨敞'], staticRows, '褰撳墠鏈鍙栧埌闈欐€佽矾鐢?)}
        ${opsDenseTableCard('鍏ㄩ噺璺敱琛?, `鍏?${fmtNumber(routeItems.length)} 鏉, ['鐩爣缃戞', '缃戝叧', '璺敱琛?, '璺濈', '鍦板潃鏃?, '绫诲瀷', '鐘舵€?], allRows, '褰撳墠鏈鍙栧埌璺敱琛?)}
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
        status: row.status || '鍦ㄧ嚎',
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
          status: row.active ? '鍦ㄧ嚎' : '寰呮満',
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
        <td>${tag(row.status || (row.activeCount ? '鍦ㄧ嚎' : '寰呮満'), row.activeCount ? 'ok' : 'info')}</td>
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
        <td>${row.disabled || row.inactive ? tag('鏈敓鏁?, 'warn') : tag('鐢熸晥', 'ok')}</td>
        <td>${escapeHtml(row.comment || '-')}</td>
      </tr>`);
    const ruleCards = [];
    if (mangleRules.length) {
      ruleCards.push(opsDenseTableCard('Mangle 鍒嗘祦瑙勫垯', `${fmtNumber(mangleRules.length)} 鏉, ['閾?, '鍔ㄤ綔', '鏂拌矾鐢辨爣璁?, '鍛戒腑鍖?, '鍛戒腑娴侀噺', '澶囨敞'], mangleRows, '褰撳墠鏈噰闆嗗埌 Mangle 鍒嗘祦瑙勫垯'));
    }
    if (routingRules.length) {
      ruleCards.push(opsDenseTableCard('绛栫暐璺敱瑙勫垯', `${fmtNumber(routingRules.length)} 鏉, ['鍔ㄤ綔', '璺敱琛?, '婧愬湴鍧€', '鐩爣鍦板潃', '鐘舵€?, '澶囨敞'], ruleRows, '褰撳墠鏈噰闆嗗埌绛栫暐璺敱瑙勫垯'));
    }
    if (!ruleCards.length) {
      ruleCards.push(opsInfoCard('瑙勫垯閲囬泦鐘舵€?, '褰撳墠蹇収鍐呮湭鍙戠幇鍒嗘祦瑙勫垯鏄庣粏', [
        { k: 'Mangle 瑙勫垯', v: fmtNumber(mangleRules.length) },
        { k: '绛栫暐璺敱', v: fmtNumber(routingRules.length) },
        { k: '榛樿璺敱', v: fmtNumber(defaultRoutes.length) },
        { k: '娲诲姩绾胯矾', v: fmtNumber(lb.activeLines || lineSummaries.length) }
      ]));
    }
    return section('鍒嗘祦鐩戞帶涓績', 'balance', '榛樿璺敱銆佸垎娴佽鍒欎笌绾胯矾鍒囨崲鐘舵€佹寜 RouterOS 瀹為檯璇诲彇缁撴灉灞曠ず', `
      <div class="grid-4">
        ${metricCard('璐熻浇妯″紡', escapeHtml(lb.mode || '-'), lb.pccDetected ? '宸叉娴嬪埌 PCC' : '鏈娴嬪埌 PCC', '')}
        ${metricCard('娲诲姩绾胯矾', fmtNumber(lb.activeLines || lineSummaries.length), `鍗犳瘮绾胯矾 ${fmtNumber(distributionList.length)} 鏉, '')}
        ${metricCard('榛樿璺敱', fmtNumber(defaultRoutes.length), `娲诲姩 ${fmtNumber(defaultRoutes.filter((row) => row.active).length)} 鏉, '')}
        ${metricCard('鍒嗘祦瑙勫垯', fmtNumber(mangleRules.length + routingRules.length), `Mangle ${fmtNumber(mangleRules.length)} / 绛栫暐 ${fmtNumber(routingRules.length)}`, '')}
      </div>
      <div class="ops-double ops-balance-route-row" style="margin-top:12px">
        ${opsCard('绾胯矾璐熻浇鍗犳瘮', distributionList.length ? `${fmtNumber(distributionList.length)} 鏉＄嚎璺弬涓庢樉绀篳 : '绛夊緟閲囬泦', opsBarStack(distributionRows, { percentMode: true, emptyText: '褰撳墠鏈舰鎴愮嚎璺祦閲忓垎甯? }), 'ops-info-card ops-balance-share-card')}
        ${opsDenseTableCard('榛樿璺敱琛ㄥ垎甯?, `${fmtNumber(routeTableMatrixRows.length)} 涓〃`, ['璺敱琛?, '榛樿璺敱', '娲诲姩', '缃戝叧', '璺濈'], routeTableMatrixRows, '褰撳墠鏈瘑鍒埌榛樿璺敱琛ㄥ垎甯?)}
      </div>
      <div class="ops-page-stack" style="margin-top:12px">
        ${opsDenseTableCard('绾胯矾涓庤矾鐢辨槧灏?, `${fmtNumber(lineSummaries.length)} 鏉＄嚎璺痐, ['绾胯矾', '鐘舵€?, '鍗犳瘮', '瀹炴椂涓婅閫熺巼', '瀹炴椂涓嬭閫熺巼', '娲诲姩榛樿', '璺敱琛?, '澶囨敞'], lineMatrixRows, '褰撳墠鏈鍙栧埌绾胯矾涓庤矾鐢辨槧灏?)}
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
        <td>${row.running ? tag('杩愯涓?, 'ok') : tag('鍋滅敤', 'warn')}</td>
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
        <td>${row.static ? tag('闈欐€?, 'info') : tag('鍔ㄦ€?, 'ok')}</td>
      </tr>`);
    return section('DHCP 鏈嶅姟', 'dhcp', 'DHCP 鏈嶅姟鍣ㄣ€佸湴鍧€姹犱笌绉熺害鎸?RouterOS 瀹為檯璇诲彇缁撴灉闆嗕腑灞曠ず', `
      <div class="grid-4">
        ${metricCard('DHCP 鏈嶅姟鍣?, fmtNumber(servers.length), `杩愯涓?${fmtNumber(runningServers)} 涓猔, `鍋滅敤 ${fmtNumber(servers.length - runningServers)} 涓猔)}
        ${metricCard('鍦板潃姹?, fmtNumber(pools.length), `骞冲潎鍒╃敤鐜?${averagePoolUsage}`, `绌洪棽鍦板潃 ${fmtNumber(pools.reduce((sum, pool) => sum + Number(pool.available || 0), 0))}`)}
        ${metricCard('缁戝畾绉熺害', fmtNumber(boundLeases), `鎬荤绾?${fmtNumber(leases.length)} 鏉, '')}
        ${metricCard('闈欐€佸垎閰?, fmtNumber(staticLeases), `鍔ㄦ€?${fmtNumber(Math.max(leases.length - staticLeases, 0))} 鏉, '')}
      </div>
      <div class="ops-double" style="margin-top:12px">
        ${opsDenseTableCard('DHCP 鏈嶅姟鍣?, `${fmtNumber(servers.length)} 鍙癭, ['鏈嶅姟鍚?, '鎺ュ彛', '鍦板潃姹?, '绉熸湡', '鐘舵€?], serverRows, '褰撳墠鏈鍙栧埌 DHCP 鏈嶅姟鍣?)}
        ${opsDenseTableCard('鍦板潃姹犲崰鐢?, `${fmtNumber(pools.length)} 缁刞, ['鍦板潃姹?, '宸茬敤', '鎬婚噺', '绌洪棽', '鍒╃敤鐜?, '鍏宠仈鏈嶅姟'], poolRows, '褰撳墠鏈鍙栧埌 DHCP 鍦板潃姹?)}
      </div>
      <div class="ops-page-stack" style="margin-top:12px">
        ${opsDenseTableCard('DHCP 绉熺害涓庨潤鎬佸垎閰?, `${fmtNumber(leases.length)} 鏉, ['IP', '涓绘満鍚?, 'MAC', '鏈嶅姟', '鐘舵€?, '鏈€鍚庡嚭鐜?, '鍒嗛厤鏂瑰紡'], leaseRows, '褰撳墠鏈鍙栧埌 DHCP 绉熺害')}
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
        <td>${row.running ? tag('鍦ㄧ嚎', 'ok') : tag('绂荤嚎', 'danger')}</td>
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
    return section('娴侀噺璐熻浇', 'trafficLoad', '鎸?RouterOS 鐪熷疄鍚炲悙鏁版嵁灞曠ず瀹藉甫鍗犵敤銆佹帴鍙ｅ悶鍚愪笌缁堢娴侀噺鎺掕', `
      <div class="grid-4">
        ${metricCard('鎬讳笂琛岄€熺巼', fmtRate(overview.uplinkBps), `鍦ㄧ嚎瀹藉甫 ${fmtNumber(activeLines)} / ${fmtNumber(pppoe.length)}`, busiestLine ? `鏈€绻佸繖 ${escapeHtml(busiestLine.name)}` : '鏆傛棤鍦ㄧ嚎瀹藉甫')}
        ${metricCard('鎬讳笅琛岄€熺巼', fmtRate(overview.downlinkBps), `鍦ㄧ嚎缁堢 ${fmtNumber(overview.onlineTerminals)}`, `鏈夋祦閲忕粓绔?${fmtNumber(trafficTerminals.length)}`)}
        ${metricCard('绾胯矾鍚炲悙宄板€?, busiestLine ? fmtRate(totalTrafficRate(busiestLine)) : '-', busiestLine ? `${fmtRate(busiestLine.upRate)} / ${fmtRate(busiestLine.downRate)}` : '褰撳墠鏈噰闆嗗埌绾胯矾瀹炴椂娴侀噺', busiestLine ? `鐖舵帴鍙?${escapeHtml(busiestLine.parent || '-')}` : '')}
        ${metricCard('鎺ュ彛鍚炲悙瀵硅薄', fmtNumber(interfaces.length), `WAN / LAN ${fmtNumber(interfaces.filter((row) => row.role === 'WAN').length)} / ${fmtNumber(interfaces.filter((row) => row.role !== 'WAN').length)}`, `缁堢鎺掕 ${fmtNumber(trafficTerminals.length)} 鍙癭)}
      </div>
      <div class="ops-split" style="margin-top:12px">
        ${opsCard('WAN 鑱氬悎鍚炲悙瓒嬪娍', `${fmtRate(overview.uplinkBps)} / ${fmtRate(overview.downlinkBps)}`, `<div class="chart-box"><div class="chart-label"><span>鎬讳笂 / 鎬讳笅</span><span>${escapeHtml(snapshot.meta.pollSeconds)}s / 鐐?/span></div>${lineChart([overview.history.uplink, overview.history.downlink], { colors: ['#165dff', '#f53f3f'] })}</div>`, 'ops-info-card')}
        ${opsCard('绾胯矾璐熻浇鍗犳瘮', busiestLine ? `${escapeHtml(busiestLine.name)} 褰撳墠鏈€绻佸繖` : '绛夊緟閲囬泦', opsBarStack(lineShareRows, { percentMode: true, emptyText: '褰撳墠鏈舰鎴愬彲璇荤殑绾胯矾鍗犳瘮' }), 'ops-info-card')}
      </div>
      <div class="ops-page-stack" style="margin-top:12px">
        ${opsCard('8 鏉＄嚎璺€熺巼瓒嬪娍', `${fmtNumber(getLineTrendRows(pppoe).length)} 鏉＄嚎璺悓姝ュ睍绀篳, renderLineTrendGrid(getLineTrendRows(pppoe), { emptyText: '褰撳墠鏈噰闆嗗埌鍙睍绀虹殑绾胯矾瓒嬪娍' }), 'ops-info-card')}
      </div>
      <div class="ops-double" style="margin-top:12px">
        ${opsTableCard('瀹藉甫瀹炴椂璐熻浇', '鎸?PPPoE 鍚嶇О鍥哄畾鎺掑簭', ['绾胯矾', '鐘舵€?, '鐖舵帴鍙?, '瀹炴椂涓婅閫熺巼', '瀹炴椂涓嬭閫熺巼', '绱涓婅娴侀噺', '绱涓嬭娴侀噺'], lineRows, '褰撳墠鏈鍙栧埌瀹藉甫瀹炴椂璐熻浇')}
        ${opsTableCard('鎺ュ彛鍚炲悙鎺掕', '鎸夋帴鍙ｅ疄鏃跺悶鍚愭帓搴?, ['鎺ュ彛', '瑙掕壊', '绫诲瀷', '瀹炴椂涓婅閫熺巼', '瀹炴椂涓嬭閫熺巼', '绱涓婅娴侀噺', '绱涓嬭娴侀噺'], interfaceRows, '褰撳墠鏈鍙栧埌鎺ュ彛鍚炲悙鎺掕')}
      </div>
      <div class="ops-page-stack" style="margin-top:12px">
        ${opsTableCard('缁堢瀹炴椂娴侀噺鎺掕', '鎸夌粓绔疄鏃跺悶鍚愪笌绱娴侀噺缁煎悎鏌ョ湅', ['鍚嶇О', 'IP', '瀹炴椂涓婅閫熺巼', '瀹炴椂涓嬭閫熺巼', '杩炴帴鏁?, '绱娴侀噺'], terminalRows, '褰撳墠鏈鍙栧埌缁堢瀹炴椂娴侀噺鎺掕')}
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
      ? `绗?${fmtNumber(currentPage)} / ${fmtNumber(totalPages)} 椤礰
      : dnsRuleBrowser.loading
        ? '姝ｅ湪鍔犺浇鍏ㄩ噺瑙勫垯娴忚'
        : dnsRuleBrowser.error
          ? '鍒嗛〉璇诲彇澶辫触锛屽凡鍥為€€蹇収棰勮'
          : '蹇収棰勮';
    const ruleEmptyText = totalRuleCount
      ? dnsRuleBrowser.loading
        ? '姝ｅ湪璇诲彇褰撳墠椤?DNS 闈欐€佽鍒?..'
        : dnsRuleBrowser.error
          ? '褰撳墠椤佃鍒欒鍙栧け璐ワ紝宸插洖閫€鏄剧ず蹇収棰勮'
          : '褰撳墠椤垫病鏈夊彲灞曠ず鐨?DNS 闈欐€佽鍒?
      : '褰撳墠鏈鍙栧埌 DNS 闈欐€佽鍒?;
    const browserNotice = dnsRuleBrowser.error
      ? `<div class="notice" style="margin-bottom:12px">DNS 闈欐€佽鍒欓〉璇诲彇澶辫触锛?{escapeHtml(dnsRuleBrowser.error)}锛屽綋鍓嶅厛鍥為€€鏄剧ず蹇収棰勮銆?/div>`
      : dnsRuleBrowser.loading
        ? `<div class="notice" style="margin-bottom:12px">姝ｅ湪璇诲彇 DNS 闈欐€佽鍒欑 ${fmtNumber(currentPage)} 椤碉紝鍔犺浇瀹屾垚鍚庝細鑷姩鏇存柊銆?/div>`
        : '';
    const ruleRows = browserRows.map((row) => `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${tag(row.type || '-', row.disabled ? 'warn' : 'info')}</td>
        <td>${escapeHtml(row.value)}</td>
        <td>${escapeHtml(row.ttl || '-')}</td>
        <td>${row.disabled ? tag('鍋滅敤', 'warn') : tag('鍚敤', 'ok')}</td>
        <td>${escapeHtml(row.comment || '-')}</td>
      </tr>`);
    return section('DNS IPv4', 'dns4', '鑱氱劍 IPv4 DNS 鏈嶅姟鐘舵€併€佺紦瀛樸€丏oH 涓庨潤鎬佽鍒欐祻瑙堬紝涓嶅啀鎶?IPv6 淇℃伅鍫嗗湪鍚屼竴椤?, `
      <div class="grid-4">
        ${metricCard('DNS 鏈嶅姟鐘舵€?, tag(dns.running ? '鍚敤' : '鏈惎鐢?, dns.running ? 'ok' : 'danger'), `涓婃父 DNS ${fmtNumber((dns.servers || []).length)} 涓猔, dns.dohServer ? 'DoH 宸查厤缃? : 'DoH 鏈厤缃?)}
        ${metricCard('缂撳瓨鍗犵敤', fmtBytes(dns.cacheUsed || 0), `缂撳瓨瀹归噺 ${fmtBytes(dns.cacheSize || 0)}`, '')}
        ${metricCard('闈欐€佽鍒欐€绘暟', fmtNumber(totalRuleCount), `褰撳墠椤?${fmtNumber(visibleRuleCount)} 鏉, `鍋滅敤 ${fmtNumber(dns.disabledForwardRuleCount || 0)} 鏉)}
        ${metricCard('瑙勫垯娴忚鐘舵€?, browserStateText, dnsRuleBrowser.loading ? '褰撳墠姝ｅ湪鍒锋柊瑙勫垯椤? : '瑙勫垯娴忚宸插氨缁?, dnsRuleBrowser.error ? '鏈€杩戜竴娆″垎椤佃鍙栧け璐? : '')}
      </div>
      <div class="ops-page-stack" style="margin-top:12px">
        ${opsCard('DNS 鏈嶅姟鎽樿', '缂撳瓨銆丏oH 鍜岃鍒欐祻瑙堢姸鎬佸叏閮ㄩ泦涓埌涓€琛屼笅闈紝閬垮厤宸﹀彸澶х┖鐧?, opsStatTiles([
          { label: '涓婃父 DNS', value: fmtNumber((dns.servers || []).length), meta: (dns.servers || []).slice(0, 2).join(' / ') || '鏈鍙栧埌' },
          { label: 'DoH 鐘舵€?, value: dns.dohServer ? '宸查厤缃? : '鏈厤缃?, meta: dns.dohServer ? escapeHtml(dns.dohServer) : '鏈厤缃?DoH' },
          { label: '璇佷功鏍￠獙', value: dns.dohServer ? (dns.verifyDohCert ? '寮€鍚? : '鍏抽棴') : '-', meta: dns.dohServer ? 'DoH 璇佷功楠岃瘉鐘舵€? : '褰撳墠鏈惎鐢?DoH' },
          { label: '缂撳瓨鍗犵敤鐜?, value: dns.cacheSize ? `${((Number(dns.cacheUsed || 0) / Number(dns.cacheSize || 1)) * 100).toFixed(1)}%` : '-', meta: `${fmtBytes(dns.cacheUsed || 0)} / ${fmtBytes(dns.cacheSize || 0)}` },
          { label: '褰撳墠椤垫樉绀?, value: fmtNumber(visibleRuleCount), meta: `鎬绘暟 ${fmtNumber(totalRuleCount)} 鏉 },
          { label: '娴忚鐘舵€?, value: browserStateText, meta: dns.forwardRuleSample ? '蹇収棰勮 + 鍒嗛〉琛ュ厖' : '鍏ㄩ噺蹇収' }
        ]), 'ops-info-card')}
        <div class="ops-double">
          ${opsInfoCard('涓婃父 DNS / DoH 鍙傛暟', '鍏ㄩ儴鏉ヨ嚜 RouterOS 鍙鍙傛暟', [
            { k: '涓婃父 DNS', v: compactListHtml(dns.servers || [], 3) },
            { k: 'DoH 鏈嶅姟', v: dns.dohServer ? escapeHtml(dns.dohServer) : '鏈厤缃? },
            { k: '璇佷功鏍￠獙', v: dns.dohServer ? (dns.verifyDohCert ? tag('寮€鍚?, 'ok') : tag('鍏抽棴', 'warn')) : '-' },
            { k: '缂撳瓨瀹归噺', v: `${fmtBytes(dns.cacheUsed || 0)} / ${fmtBytes(dns.cacheSize || 0)}` }
          ])}
          ${opsInfoCard('瑙勫垯娴忚鎽樿', '褰撳墠椤靛拰鎬婚噺鏄庣‘鎷嗗紑鏄剧ず', [
            { k: '瑙勫垯鎬绘暟', v: fmtNumber(totalRuleCount) },
            { k: '褰撳墠椤垫樉绀?, v: fmtNumber(visibleRuleCount) },
            { k: '鍋滅敤瑙勫垯', v: fmtNumber(dns.disabledForwardRuleCount || 0) },
            { k: '娴忚鐘舵€?, v: escapeHtml(browserStateText) }
          ])}
        </div>
        <div class="card">
          <div class="card-head">
            <div class="card-title">DNS 闈欐€佽鍒?/ 杞彂瑙勫垯</div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end">
              <span class="subtle">${browserStateText} 璺?褰撳墠鏄剧ず ${fmtNumber(visibleRuleCount)} / ${fmtNumber(totalRuleCount)} 鏉?/span>
              <button class="action-btn" type="button" data-dns-rules-refresh ${dnsRuleBrowser.loading ? 'disabled' : ''}>鍒锋柊褰撳墠椤?/button>
              <button class="action-btn" type="button" data-dns-rules-page="prev" ${canPrev ? '' : 'disabled'}>涓婁竴椤?/button>
              <button class="action-btn" type="button" data-dns-rules-page="next" ${canNext ? '' : 'disabled'}>涓嬩竴椤?/button>
            </div>
          </div>
          <div class="card-body">${browserNotice}${opsDenseTable(['鍚嶇О / 姝ｅ垯', '绫诲瀷', '鐩爣鍊?, 'TTL', '鐘舵€?, '澶囨敞'], ruleRows, ruleEmptyText)}</div>
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
        <td>${row.advertiseDns ? tag('寮€鍚?, 'ok') : tag('鍏抽棴', 'warn')}</td>
        <td>${listText(row.dnsServers, '鏈崟鐙寚瀹?)}</td>
        <td>${row.managed ? tag('寮€鍚?, 'info') : tag('鍏抽棴', 'ok')}</td>
        <td>${row.otherConfig ? tag('寮€鍚?, 'info') : tag('鍏抽棴', 'ok')}</td>
        <td>${escapeHtml(row.raLifetime || '-')}</td>
      </tr>`);
    const dhcpClientRows = dhcpClients.map((row) => `
      <tr>
        <td>${escapeHtml(row.interface)}</td>
        <td>${tag(row.status || '-', row.status === 'bound' ? 'ok' : 'warn')}</td>
        <td>${escapeHtml(row.pool || '-')}</td>
        <td>${escapeHtml(row.prefix || '-')}</td>
        <td>${row.usePeerDns ? tag('寮€鍚?, 'ok') : tag('鍏抽棴', 'info')}</td>
        <td>${row.addDefaultRoute ? `寮€鍚?/ distance ${escapeHtml(row.defaultRouteDistance || '-')}` : '鍏抽棴'}</td>
      </tr>`);
    const hasAnyIpv6Data = ndList.length || dhcpClients.length;
    return section('DNS IPv6', 'dns6', 'RouterOS 鍙鍒扮殑 ND銆丷A 涓?DHCPv6 Prefix 淇℃伅', `
      <div class="grid-4">
        ${metricCard('ND 鎺ュ彛鏁?, fmtNumber(ndList.length), `骞挎挱 DNS ${fmtNumber(enabledNdCount)} 涓猔, '')}
        ${metricCard('Managed / Other', `${fmtNumber(managedNdCount)} / ${fmtNumber(otherConfigCount)}`, 'ND 鏍囧織浣嶇粺璁?, '')}
        ${metricCard('DHCPv6 Client', fmtNumber(dhcpClients.length), `Peer DNS ${fmtNumber(peerDnsClients)} 涓猔, '')}
        ${metricCard('Prefix 宸茬粦瀹?, fmtNumber(boundPrefixClients), `鎬诲鎴风 ${fmtNumber(dhcpClients.length)} 涓猔, '')}
      </div>
      <div class="ops-page-stack" style="margin-top:12px">
        ${hasAnyIpv6Data
          ? `<div class="ops-double">
               ${opsDenseTableCard('IPv6 ND 骞挎挱', `${fmtNumber(ndList.length)} 涓帴鍙, ['鎺ュ彛', '骞挎挱 DNS', '鏄惧紡 DNS', 'Managed', 'Other Config', 'RA 鐢熷懡鍛ㄦ湡'], ndRows, '褰撳墠鏈鍙栧埌 IPv6 ND 骞挎挱閰嶇疆')}
               ${opsDenseTableCard('IPv6 DHCP Client / Prefix', `${fmtNumber(dhcpClients.length)} 涓鎴风`, ['鎺ュ彛', '鐘舵€?, '鍓嶇紑姹?, '鍓嶇紑 / 鍦板潃', 'Peer DNS', '榛樿璺敱'], dhcpClientRows, '褰撳墠鏈鍙栧埌 IPv6 DHCP Client')}
             </div>`
          : opsCard('IPv6 DNS 閲囬泦鐘舵€?, '褰撳墠椤甸潰娌℃湁璇诲埌 ND / DHCPv6 鏄庣粏', emptyBlock('褰撳墠鏈鍙栧埌 IPv6 ND / DHCPv6 鏁版嵁'), 'ops-empty-card ops-density-table')}
      </div>`);
  };
  window.renderDnsV6 = renderDnsV6;

  renderLogs = function patchedRenderLogs(snapshot, config = {}) {
    const logs = snapshot.logs || {};
    const sectionTitle = config.title || '鏃ュ織涓績';
    const sectionId = config.id || 'logs';
    const sectionTip = config.tip || '绯荤粺銆丗irewall銆丏HCP銆丏NS 鏃ュ織鍒嗙被闆嗕腑灞曠ず';
    const groups = [
      { key: 'system', title: '绯荤粺鏃ュ織', empty: '褰撳墠娌℃湁閲囬泦鍒扮郴缁熸棩蹇? },
      { key: 'firewall', title: 'Firewall 鏃ュ織', empty: '褰撳墠娌℃湁閲囬泦鍒?Firewall 鏃ュ織' },
      { key: 'dhcp', title: 'DHCP 鏃ュ織', empty: '褰撳墠娌℃湁閲囬泦鍒?DHCP 鏃ュ織' },
      { key: 'dns', title: 'DNS 鏃ュ織', empty: '褰撳墠娌℃湁閲囬泦鍒?DNS 鏃ュ織' }
    ];
    const renderRows = (rows) => (rows || []).slice(0, 20).map((row) => `
      <tr>
        <td>${escapeHtml(row.time)}</td>
        <td>${escapeHtml(row.topics)}</td>
        <td>${escapeHtml(row.message)}</td>
      </tr>`);
    const availableCards = groups.filter((group) => (logs[group.key] || []).length).map((group) => (
      opsDenseTableCard(group.title, `鏈€杩?${fmtNumber(Math.min((logs[group.key] || []).length, 20))} 鏉, ['鏃堕棿', '涓婚', '娑堟伅'], renderRows(logs[group.key]), group.empty)
    ));
    return section(sectionTitle, sectionId, sectionTip, `
      <div class="grid-4">
        ${metricCard('鍏ㄩ儴鏃ュ織', fmtNumber((logs.all || []).length), '褰撳墠绐楀彛鍐呴噰鏍?, '')}
        ${metricCard('绯荤粺鏃ュ織', fmtNumber((logs.system || []).length), '闈?DHCP / DNS / Firewall', '')}
        ${metricCard('Firewall 鏃ュ織', fmtNumber((logs.firewall || []).length), '鍚槻鐏涓婚', '')}
        ${metricCard('DHCP / DNS', `${fmtNumber((logs.dhcp || []).length)} / ${fmtNumber((logs.dns || []).length)}`, '鏈嶅姟鏃ュ織', '')}
      </div>
      <div class="ops-page-stack" style="margin-top:12px">
        ${availableCards.length
          ? availableCards.join('')
          : opsCard('鏃ュ織閲囬泦鐘舵€?, '褰撳墠绐楀彛涓虹┖', emptyBlock('褰撳墠娌℃湁閲囬泦鍒扮郴缁熴€丗irewall銆丏HCP銆丏NS 鏃ュ織'), 'ops-empty-card ops-density-table')}
      </div>
      <div class="footer">璇存槑锛氭湰椤典笉鎻愪緵浠讳綍閰嶇疆缂栬緫銆佹彁浜ゃ€佸垹闄ゃ€佸惎鍋滄垨绛栫暐淇敼鍔ㄤ綔锛屾墍鏈夊唴瀹瑰潎鏉ヨ嚜鏈湴閲囬泦鏈嶅姟鐨勫彧璇昏鍙栫粨鏋溿€?/div>`);
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
        <td>${row.advertiseDns ? tag('寮€鍚?, 'ok') : tag('鍏抽棴', 'warn')}</td>
        <td>${compactListHtml(row.dnsServers || [], 2)}</td>
        <td>${opsTwoLineCell(row.managed ? 'Managed 寮€' : 'Managed 鍏?, row.otherConfig ? 'Other 寮€' : 'Other 鍏?)}</td>
        <td>${escapeHtml(row.raLifetime || '-')}</td>
      </tr>`);
    const dhcpClientRows = dhcpClients.map((row) => `
      <tr>
        <td>${escapeHtml(row.interface)}</td>
        <td>${tag(row.status || '-', row.status === 'bound' ? 'ok' : 'warn')}</td>
        <td>${escapeHtml(row.pool || '-')}</td>
        <td>${escapeHtml(row.prefix || '-')}</td>
        <td>${opsTwoLineCell(row.usePeerDns ? 'Peer DNS 寮€' : 'Peer DNS 鍏?, row.addDefaultRoute ? `榛樿璺敱 ${escapeHtml(row.defaultRouteDistance || '-')}` : '榛樿璺敱鍏?)}</td>
      </tr>`);
    const hasAnyIpv6Data = ndList.length || dhcpClients.length;
    return section('DNS IPv6', 'dns6', 'IPv6 ND 骞挎挱銆丷A 鏍囧織鍜?DHCPv6 Prefix 绾靛悜灞曞紑锛屽噺灏戠┖鍒椾笌妯悜鎷栧姩', `
      <div class="grid-4">
        ${metricCard('ND 鎺ュ彛鏁?, fmtNumber(ndList.length), `骞挎挱 DNS ${fmtNumber(enabledNdCount)} 涓猔, '')}
        ${metricCard('Managed / Other', `${fmtNumber(managedNdCount)} / ${fmtNumber(otherConfigCount)}`, 'RA 鏍囧織浣嶇粺璁?, '')}
        ${metricCard('DHCPv6 Client', fmtNumber(dhcpClients.length), `Peer DNS ${fmtNumber(peerDnsClients)} 涓猔, '')}
        ${metricCard('Prefix 宸茬粦瀹?, fmtNumber(boundPrefixClients), `瀹㈡埛绔€绘暟 ${fmtNumber(dhcpClients.length)} 涓猔, '')}
      </div>
      <div class="ops-page-stack" style="margin-top:12px">
        ${hasAnyIpv6Data
          ? `
            ${opsCard('IPv6 DNS 鎽樿', 'ND 骞挎挱涓?DHCPv6 Prefix 鍒嗗紑绾靛悜灞曠ず锛岄伩鍏嶅乏鍙充袱寮犲ぇ绌鸿〃', opsStatTiles([
              { label: '骞挎挱 DNS 鎺ュ彛', value: fmtNumber(enabledNdCount), meta: `ND 鎺ュ彛鎬绘暟 ${fmtNumber(ndList.length)}` },
              { label: 'Managed / Other', value: `${fmtNumber(managedNdCount)} / ${fmtNumber(otherConfigCount)}`, meta: 'RA 鏍囧織浣嶇粺璁? },
              { label: 'Prefix 宸茬粦瀹?, value: fmtNumber(boundPrefixClients), meta: `瀹㈡埛绔€绘暟 ${fmtNumber(dhcpClients.length)}` },
              { label: 'Peer DNS 瀹㈡埛绔?, value: fmtNumber(peerDnsClients), meta: '浣跨敤瀵圭 DNS 鐨?DHCPv6 Client' }
            ]), 'ops-info-card')}
            ${opsDenseTableCard('IPv6 ND 骞挎挱鎺ュ彛', `${fmtNumber(ndList.length)} 涓帴鍙, ['鎺ュ彛', '骞挎挱 DNS', '鏄惧紡 DNS', 'RA 鏍囧織', '鐢熷瓨鏈?], ndRows, '褰撳墠鏈鍙栧埌 IPv6 ND 骞挎挱閰嶇疆')}
            ${opsDenseTableCard('IPv6 DHCPv6 Prefix 瀹㈡埛绔?, `${fmtNumber(dhcpClients.length)} 涓鎴风`, ['鎺ュ彛', '鐘舵€?, '鍓嶇紑姹?, '鍓嶇紑 / 鍦板潃', 'Peer DNS / 榛樿璺敱'], dhcpClientRows, '褰撳墠鏈鍙栧埌 IPv6 DHCPv6 Client')}
          `
          : opsCard('IPv6 DNS 閲囬泦鐘舵€?, '褰撳墠椤甸潰娌℃湁璇诲埌 ND / DHCPv6 鏄庣粏', emptyBlock('褰撳墠鏈鍙栧埌 IPv6 ND / DHCPv6 鏁版嵁'), 'ops-empty-card ops-density-table')}
      </div>`);
  };
  window.renderDnsV6 = renderDnsV6;

  renderSecurity = function patchedRenderSecurityDense(snapshot, config = {}) {
    const security = snapshot.security || {};
    const sectionTitle = config.title || '瀹夊叏鐩戞帶涓績';
    const sectionId = config.id || 'security';
    const sectionTip = config.tip || 'Filter 瑙勫垯銆佸湴鍧€鍚嶅崟涓庡紓甯稿憡璀︽寜鐪熷疄璇诲彇缁撴灉闆嗕腑灞曠ず';
    const filterRows = (security.filters || []).map((row) => `
      <tr>
        <td>${escapeHtml(row.chain)}</td>
        <td>${tag(row.action, row.disabled ? 'warn' : 'info')}</td>
        <td>${escapeHtml(row.comment || '-')}</td>
        <td>${fmtCompact(row.packets)}</td>
        <td>${fmtBytes(row.bytes)}</td>
        <td>${row.disabled ? tag('鍋滅敤', 'warn') : tag('鍚敤', 'ok')}</td>
      </tr>`);
    const listRows = (security.addressLists || []).map((row) => `
      <tr>
        <td>${escapeHtml(row.list)}</td>
        <td>${tag(row.category, row.category === '榛戝悕鍗? ? 'danger' : row.category === '鐧藉悕鍗? ? 'ok' : 'info')}</td>
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
      const key = String(row.category || '鏈垎绫?).trim() || '鏈垎绫?;
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
        ${metricCard('ACL 瑙勫垯鏁?, fmtNumber((security.filters || []).length), `鍚敤 ${fmtNumber(enabledFilters)} 鏉, '鍙粺璁＄湡瀹?Filter')}
        ${metricCard('鍦板潃鍚嶅崟鏉＄洰', fmtNumber((security.addressLists || []).length), '榛戠櫧鍚嶅崟 / 鍦板潃闆嗛瑙?, '')}
        ${metricCard('寮傚父鍛婅', fmtNumber((security.alerts || []).length), '鑴氭湰銆佽闂垨绯荤粺閿欒', '')}
        ${metricCard('Filter 绱鍛戒腑', fmtCompact(totalFilterPackets), '鍛戒腑鍖呯疮璁?, '')}
      </div>
      <div class="ops-page-stack" style="margin-top:12px">
        ${opsDenseTableCard('杩戞湡寮傚父鍛婅', `${fmtNumber((security.alerts || []).length)} 鏉, ['鏃堕棿', '涓婚', '娑堟伅'], alertRows, '褰撳墠鏈鍙栧埌寮傚父鍛婅')}
        <div class="ops-double">
          ${opsCard('Filter 鎽樿', '鎶婂師鏉ュ彧鍗犱綅缃殑鎻愰啋鍖烘敼鎴愬彲璇绘憳瑕?, opsStatTiles([
            { label: '鍚敤瑙勫垯', value: fmtNumber(enabledFilters), meta: `鎬昏鍒?${fmtNumber((security.filters || []).length)} 鏉 },
            { label: 'Input 閾?, value: fmtNumber(inputFilters), meta: '杈撳叆闈㈤槻鎶? },
            { label: 'Forward 閾?, value: fmtNumber(forwardFilters), meta: '杞彂闈㈤檺鍒? },
            { label: '绱鍛戒腑娴侀噺', value: fmtBytes(totalFilterBytes), meta: '鎵€鏈?Filter 娴侀噺绱' }
          ]), 'ops-info-card')}
          ${opsCard('鍦板潃鍚嶅崟鍒嗙被', `${fmtNumber((security.addressLists || []).length)} 鏉″悕鍗曟寜绫诲埆鑱氬悎`, opsBarStack(categoryBars, { emptyText: '褰撳墠鏈鍙栧埌鍦板潃鍚嶅崟鍒嗙被' }), 'ops-info-card')}
        </div>
        ${opsDenseTableCard('ACL Filter 鏄庣粏', `${fmtNumber((security.filters || []).length)} 鏉¤鍒檂, ['閾?, '鍔ㄤ綔', '澶囨敞', '鍛戒腑鍖?, '鍛戒腑娴侀噺', '鐘舵€?], filterRows, '褰撳墠鏈鍙栧埌 Filter 瑙勫垯')}
        ${opsDenseTableCard('鍦板潃鍚嶅崟鏄庣粏', `${fmtNumber((security.addressLists || []).length)} 鏉, ['鍒楄〃鍚?, '绫诲埆', '鍦板潃', '瓒呮椂', '澶囨敞'], listRows, '褰撳墠鏈鍙栧埌鍦板潃鍚嶅崟')}
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
        <td>${row.running ? tag('杩愯涓?, 'ok') : tag('鍋滅敤', 'warn')}</td>
      </tr>`);
    const dnsPreviewRows = (dns.forwardRules || []).slice(0, 12).map((row) => `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${tag(row.type || '-', row.disabled ? 'warn' : 'info')}</td>
        <td>${escapeHtml(row.value)}</td>
        <td>${escapeHtml(row.ttl || '-')}</td>
        <td>${row.disabled ? tag('鍋滅敤', 'warn') : tag('鍚敤', 'ok')}</td>
      </tr>`);
    return section('鏈嶅姟鏃ュ織', 'serviceLogs', '鍙仛鐒?DHCP / DNS 鏈嶅姟鏈韩鐨勬棩蹇楃獥鍙ｃ€佹湇鍔＄姸鎬佸拰瑙勫垯棰勮锛屼笉鍐嶈绌烘棩蹇楀崱鐗囧崰婊￠〉闈?, `
      <div class="grid-4">
        ${metricCard('DHCP 鏃ュ織', fmtNumber((logs.dhcp || []).length), `DHCP 鏈嶅姟 ${fmtNumber((dhcp.servers || []).length)} 涓猔, '')}
        ${metricCard('DNS 鏃ュ織', fmtNumber((logs.dns || []).length), `闈欐€佽鍒?${fmtNumber(dnsTotalRuleCount)} 鏉, '')}
        ${metricCard('DNS 鐘舵€?, dns.running ? tag('鍚敤', 'ok') : tag('鏈惎鐢?, 'danger'), '鏉ヨ嚜 RouterOS ip/dns', '')}
        ${metricCard('鏈嶅姟鎬昏', `${fmtNumber((dhcp.servers || []).length)} / ${fmtNumber((dns.servers || []).length)}`, 'DHCP 鏈嶅姟 / DNS 涓婃父', '')}
      </div>
      <div class="ops-page-stack" style="margin-top:12px">
        ${opsDenseTableCard('鏈嶅姟鏃ュ織绐楀彛', serviceEvents.length ? `鏈€杩?${fmtNumber(serviceEvents.length)} 鏉?DHCP / DNS 鏃ュ織` : '褰撳墠绐楀彛娌℃湁 DHCP / DNS 浜嬩欢', ['鏉ユ簮', '鏃堕棿', '涓婚', '娑堟伅'], serviceRows, '褰撳墠鏈鍙栧埌 DHCP / DNS 鏈嶅姟鏃ュ織')}
        <div class="ops-double">
          ${opsDenseTableCard('DHCP 鏈嶅姟鐘舵€?, `${fmtNumber((dhcp.servers || []).length)} 涓湇鍔, ['鏈嶅姟', '鎺ュ彛', '鍦板潃姹?, '绉熸湡', '鐘舵€?], serverRows, '褰撳墠鏈鍙栧埌 DHCP 鏈嶅姟鐘舵€?)}
          ${opsCard('鏈嶅姟鎽樿', '褰撴棩蹇楃獥鍙ｄ负绌烘椂锛岀敤鐪熷疄鏈嶅姟鐘舵€佽€屼笉鏄┖鐧芥潵鎵挎帴椤甸潰', opsStatTiles([
            { label: 'DHCP 鍦板潃姹?, value: fmtNumber((dhcp.pools || []).length), meta: `绉熺害 ${fmtNumber((dhcp.leases || []).length)} 鏉 },
            { label: '杩愯涓?DHCP', value: fmtNumber((dhcp.servers || []).filter((row) => row.running).length), meta: `鎬绘湇鍔?${fmtNumber((dhcp.servers || []).length)} 涓猔 },
            { label: 'DNS 涓婃父', value: fmtNumber((dns.servers || []).length), meta: (dns.servers || []).slice(0, 2).join(' / ') || '鏈鍙栧埌' },
            { label: 'DoH', value: dns.dohServer ? '宸查厤缃? : '鏈厤缃?, meta: dns.dohServer ? escapeHtml(dns.dohServer) : '褰撳墠鏈惎鐢? },
            { label: '缂撳瓨鍗犵敤', value: `${fmtBytes(dns.cacheUsed || 0)} / ${fmtBytes(dns.cacheSize || 0)}`, meta: 'DNS 缂撳瓨褰撳墠鐘舵€? },
            { label: '瑙勫垯鎬绘暟', value: fmtNumber(dnsTotalRuleCount), meta: `棰勮 ${fmtNumber((dns.forwardRules || []).length)} 鏉 }
          ]), 'ops-info-card')}
        </div>
        ${opsDenseTableCard('DNS 闈欐€佽鍒欓瑙?, `鏄剧ず ${fmtNumber((dns.forwardRules || []).length)} / ${fmtNumber(dnsTotalRuleCount)} 鏉, ['鍚嶇О / 姝ｅ垯', '绫诲瀷', '鐩爣鍊?, 'TTL', '鐘舵€?], dnsPreviewRows, dnsTotalRuleCount ? '褰撳墠椤垫病鏈夊彲灞曠ず鐨勮鍒欓瑙? : '褰撳墠鏈鍙栧埌 DNS 闈欐€佽鍒?)}
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
      ? opsBarStack(loadDistributionRows, { percentMode: true, emptyText: '褰撳墠鏈舰鎴愮嚎璺崰姣旀暟鎹? })
      : opsBarStack(realtimeLoadRows, { emptyText: '褰撳墠鏈舰鎴愮嚎璺疄鏃惰礋杞藉垎甯? });
    const readonlyNotice = interfaceReadonlyOpen
      ? `<div class="notice" style="margin-bottom:8px">褰撳墠椤甸潰淇濇寔鍙鐩戞帶妯″紡锛屾寜閽粎鐢ㄤ簬鍒囨崲瑙嗗浘鍜屽埛鏂板綋鍓嶉〉鏁版嵁锛屼笉浼氭彁浜や换浣曢厤缃€?/div>`
      : '';
    const tabs = `
      <div class="ik-subtabs">
        <button class="ik-subtab ${currentInterfaceView === 'monitor' ? 'is-active' : ''}" type="button" data-interface-view="monitor">绾胯矾鐩戞帶</button>
        <button class="ik-subtab ${currentInterfaceView === 'detect' ? 'is-active' : ''}" type="button" data-interface-view="detect">绾胯矾鐘舵€佹娴?/button>
        <button class="ik-subtab ${currentInterfaceView === 'ipv6' ? 'is-active' : ''}" type="button" data-interface-view="ipv6">IPv6 绾胯矾璇︽儏</button>
      </div>`;
    const toolbar = `
      <div class="ik-data-toolbar">
        <div class="ik-ghost-group">
          <span class="ik-ghost-pill is-active">${escapeHtml(interfaceViews[currentInterfaceView].title)}</span>
          <button class="ik-ghost-pill" type="button" data-interface-refresh="current">鍒锋柊褰撳墠椤垫暟鎹?/button>
        </div>
        <div class="ik-ghost-group">
          <button class="ik-ghost-pill ${interfaceReadonlyOpen ? 'is-active' : ''}" type="button" data-interface-readonly-toggle="true">鍙鐩戞帶</button>
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
          <td>${opsTwoLineCell(escapeHtml(row.mac || '-'), `涓?${fmtNumber(Number(row.txDrop || 0) + Number(row.rxDrop || 0))} / 閿?${fmtNumber(Number(row.txError || 0) + Number(row.rxError || 0))}`)}</td>
        </tr>`;
    });
    const diagnostics = sortedPppoe.map((row) => buildLineDiagnostic(row, interfaceByName));
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
        <td>${opsTwoLineCell(tag(item.role.label, item.role.level), item.activeTables.length ? item.activeTables.map(escapeHtml).join(' / ') : '鏃犳椿鍔ㄨ〃')}</td>
        <td>${diagnosticReasonCell(item)}</td>
        <td>${escapeHtml(item.action)}</td>
        <td>${opsTwoLineCell(`鎷ㄥ彿 ${item.row.running ? '鏄? : '鍚?} / 鍦板潃 ${item.hasAddress ? '鏄? : '鍚?}`, `璺敱 ${item.hasActiveRoute ? '鏄? : '鍚?}`)}</td>
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
        <td>${yesNoTag(item.hasAddress, '宸叉嬁鍒?, '鏈嬁鍒?)}</td>
        <td>${packetSummaryCell(item.dropTotal, item.errorTotal)}</td>
      </tr>`);
    const dangerousLines = diagnostics.filter((item) => item.level === 'danger').length;
    const watchLines = diagnostics.filter((item) => item.level === 'warn').length;
    const usableLines = diagnostics.filter((item) => item.level === 'ok').length;
    const activeRouteTables = Array.from(new Set(diagnostics.flatMap((item) => item.activeTables))).filter(Boolean);
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

    let body = '';
    if (currentInterfaceView === 'detect') {
      body = `
        ${readonlyNotice}
        ${toolbar}
        <div class="grid-4" style="margin-top:8px">
          ${metricCard('鍙敤鍑哄彛', fmtNumber(usableLines), `鎬荤嚎璺?${fmtNumber(pppoe.length)} 鏉, '鍋ュ悍闂幆瀹屾暣')}
          ${metricCard('寰呰瀵?, fmtNumber(watchLines), '鏈夌疮璁′涪鍖呮垨杞诲井寮傚父', '鍏堣瀵熻秼鍔?)}
          ${metricCard('鏁呴殰浼樺厛', fmtNumber(dangerousLines), '绂荤嚎鎴栨棤娲诲姩榛樿璺敱', '闇€瑕佷紭鍏堝鐞?)}
          ${metricCard('璺敱瑕嗙洊', fmtNumber(activeRouteTables.length), activeRouteTables.length ? activeRouteTables.slice(0, 4).map(escapeHtml).join(' / ') : '鏃犳椿鍔ㄨ〃', '鎸夋椿鍔ㄩ粯璁よ矾鐢辩粺璁?)}
        </div>
        <div class="ops-page-stack" style="margin-top:8px">
          ${opsCard('绾胯矾璇婃柇鎽樿', '杩欎釜椤甸潰鍙洖绛斾竴浠朵簨锛氬摢鏉″嚭鍙ｈ兘鐢ㄣ€佷负浠€涔堜笉鍙敤銆佷笅涓€姝ュ厛鐪嬪摢閲?, opsStatTiles([
            { label: '鎷ㄥ彿闂幆', value: `${fmtNumber(runningWan)} / ${fmtNumber(pppoe.length)}`, meta: 'PPPoE 褰撳墠鍦ㄧ嚎' },
            { label: '鍦板潃闂幆', value: `${fmtNumber(diagnostics.filter((item) => item.hasAddress).length)} / ${fmtNumber(pppoe.length)}`, meta: '宸叉嬁鍒板叕缃?IPv6 鍦板潃' },
            { label: '璺敱闂幆', value: `${fmtNumber(diagnostics.filter((item) => item.hasActiveRoute).length)} / ${fmtNumber(pppoe.length)}`, meta: '瀛樺湪娲诲姩榛樿璺敱' },
            { label: '鐖舵帴鍙ｉ敊璇?, value: fmtNumber(diagnostics.filter((item) => item.errorTotal > 0).length), meta: '閿欒鍖呴潪 0 鎵嶈鍏ユ晠闅? },
            { label: '绛栫暐鍑哄彛', value: fmtNumber(diagnostics.filter((item) => item.role.label.includes('绛栫暐')).length), meta: '闈?main 琛ㄦ椿鍔ㄥ嚭鍙? },
            { label: '鍏ㄥ眬鍑哄彛', value: fmtNumber(diagnostics.filter((item) => item.activeTables.some((table) => table.toLowerCase() === 'main')).length), meta: 'main 琛ㄦ椿鍔ㄥ嚭鍙? }
          ]), 'ops-info-card')}
          ${opsDenseTableCard('鏁呴殰浼樺厛闃熷垪', `${fmtNumber(diagnosticQueue.length)} 鏉＄嚎璺紝绱у噾璇婃柇瑙嗗浘`, ['#', '鐘舵€?, '绾胯矾 / 鐖舵帴鍙?, '鍒?, '鍑哄彛瑙掕壊', '鍘熷洜', '鍔ㄤ綔', '闂幆', '涓?/ 閿?, '涓?/ 涓?], diagnosticRows, '褰撳墠鏈鍙栧埌绾胯矾璇婃柇鏁版嵁', 'ops-compact-density', 'ops-compact-table')}
          ${opsDenseTableCard('绾胯矾瑙掕壊鐭╅樀', '鐪嬫瘡鏉?PPPoE 鍦ㄨ矾鐢变綋绯婚噷鎵紨浠€涔堣鑹诧紝鑰屼笉鏄噸澶嶆帴鍙ｅ悶鍚愭竻鍗?, ['绾胯矾', '鍑哄彛瑙掕壊', '娲诲姩琛?, '璺濈', '鐖舵帴鍙?, '鍦板潃', '涓?/ 閿?], roleRows, '褰撳墠鏈鍙栧埌绾胯矾瑙掕壊鏁版嵁', 'ops-compact-density', 'ops-compact-table')}
          ${opsCard('8 鏉＄嚎璺€熺巼瓒嬪娍', `${fmtNumber(lineTrendRows.length)} 鏉＄嚎璺悓姝ュ睍绀猴紝浣滀负璇婃柇杈呭姪淇℃伅`, renderLineTrendGrid(lineTrendRows, { emptyText: '褰撳墠鏈噰闆嗗埌鍙睍绀虹殑绾胯矾瓒嬪娍' }), 'ops-info-card')}
        </div>`;
    } else if (currentInterfaceView === 'ipv6') {
      body = `
        ${readonlyNotice}
        ${toolbar}
        <div class="grid-4" style="margin-top:8px">
          ${metricCard('IPv6 鎺ュ彛', fmtNumber(ipv6Interfaces.length), '璇诲彇鍒扮湡瀹?IPv6 鍦板潃鐨勬帴鍙?, '')}
          ${metricCard('鍦ㄧ嚎 IPv6 鎺ュ彛', fmtNumber(ipv6Interfaces.filter((row) => row.running).length), '閾捐矾杩愯鐘舵€?, '')}
          ${metricCard('WAN IPv6 绾胯矾', fmtNumber(pppoe.filter((row) => splitIpFamilies(row.addresses || []).ipv6.length).length), '甯?IPv6 鍦板潃鐨勫甯?, '')}
          ${metricCard('IPv6 缃戝叧鎺ュ彛', fmtNumber(ipv6Interfaces.filter((row) => (row.gateways || []).some((value) => String(value || '').includes(':'))).length), '鍙 IPv6 璺敱鐩爣', '')}
        </div>
        <div class="ops-page-stack" style="margin-top:8px">
          ${opsCard('IPv6 鎺ュ彛鎽樿', '鍙繚鐣?IPv6 鍦板潃銆両Pv6 缃戝叧涓庢帴鍙ｅ疄鏃跺悶鍚愶紝涓嶅啀鍫嗙┖鐧藉潡', opsStatTiles([
            { label: 'LAN IPv6 鎺ュ彛', value: fmtNumber(ipv6Interfaces.filter((row) => row.role === 'LAN').length), meta: '妗?/ VLAN / 铏氭嫙鎺ュ彛' },
            { label: 'WAN IPv6 鎺ュ彛', value: fmtNumber(ipv6Interfaces.filter((row) => row.role === 'WAN').length), meta: '鎷ㄥ彿渚ф帴鍙? },
            { label: '鍏峰 IPv6 缃戝叧', value: fmtNumber(ipv6Interfaces.filter((row) => (row.gateways || []).some((value) => String(value || '').includes(':'))).length), meta: '瀛樺湪 IPv6 璺敱鐩爣' },
            { label: '鏈夊疄鏃舵祦閲?, value: fmtNumber(ipv6Interfaces.filter((row) => totalTrafficRate(row, 'txRate', 'rxRate') > 0).length), meta: '褰撳墠瀛樺湪鍚炲悙' }
          ]), 'ops-info-card')}
          ${opsDenseTableCard('IPv6 鎺ュ彛鏄庣粏', `${fmtNumber(ipv6Interfaces.length)} 涓帴鍙, ['鎺ュ彛', '瑙掕壊', '鐘舵€?, 'IPv6 鍦板潃', 'IPv6 缃戝叧', '瀹炴椂涓婅閫熺巼', '瀹炴椂涓嬭閫熺巼'], ipv6Rows, '褰撳墠鏈鍙栧埌 IPv6 鎺ュ彛鏁版嵁')}
        </div>`;
    } else {
      body = `
        ${readonlyNotice}
        ${toolbar}
        <div class="grid-4" style="margin-top:8px">
          ${metricCard('鍦ㄧ嚎鎺ュ彛', `${fmtNumber(runningInterfaces)} / ${fmtNumber(interfaces.length)}`, '鍏ㄩ儴鎺ュ彛杩愯鎯呭喌', '')}
          ${metricCard('鍦ㄧ嚎瀹藉甫', `${fmtNumber(runningWan)} / ${fmtNumber(pppoe.length)}`, 'PPPoE 绾胯矾鍦ㄧ嚎鎯呭喌', '')}
          ${metricCard('鍋ュ悍瀹藉甫', fmtNumber(detectedHealthy), '鍦ㄧ嚎涓斿叿澶囧湴鍧€涓庢椿鍔ㄩ粯璁よ矾鐢?, '')}
          ${metricCard('寮傚父绾胯矾', fmtNumber(abnormalLines), '闇€瑕佷紭鍏堟帓鏌ョ殑绾胯矾', '')}
        </div>
        <div class="ops-page-stack" style="margin-top:8px">
          ${opsCard('鎺ュ彛鐩戞帶鎽樿', '棣栭〉鍙繚鐣欐€诲喌锛岃缁嗕俊鎭湪琛ㄦ牸鍜岃秼鍔块噷杩炵画灞曞紑', opsStatTiles([
            { label: 'WAN 鎬讳笂琛?, value: fmtRate(totalWanUp), meta: `${fmtNumber(pppoe.length)} 鏉＄嚎璺仛鍚坄 },
            { label: 'WAN 鎬讳笅琛?, value: fmtRate(totalWanDown), meta: busiestLine ? `褰撳墠鏈€绻佸繖 ${escapeHtml(busiestLine.name)}` : '鏆傛棤涓荤嚎璺? },
            { label: '鍦ㄧ嚎 LAN', value: fmtNumber(runningLan), meta: `LAN 鎬绘暟 ${fmtNumber(interfaces.filter((row) => row.role === 'LAN').length)}` },
            { label: '铏氭嫙鎺ュ彛', value: fmtNumber(virtualCount), meta: 'VLAN / WG / Loopback / L2TP' },
            { label: 'IPv6 鎺ュ彛', value: fmtNumber(ipv6Interfaces.length), meta: '鍖呭惈鐪熷疄 IPv6 鍦板潃' },
            { label: '鏈€绻佸繖绾胯矾', value: busiestLine ? fmtRate(totalTrafficRate(busiestLine)) : '-', meta: busiestLine ? `${fmtRate(busiestLine.upRate)} / ${fmtRate(busiestLine.downRate)}` : '鏆傛棤瀹炴椂鍚炲悙' }
          ]), 'ops-info-card')}
          ${opsDenseTableCard('瀹藉甫瀹炴椂娴侀噺', `${fmtNumber(sortedPppoe.length)} 鏉″甯, ['绾胯矾', '鐘舵€?, 'IP 鍦板潃', '瀹炴椂涓婅閫熺巼', '瀹炴椂涓嬭閫熺巼', '绱涓婅娴侀噺', '绱涓嬭娴侀噺', '娲诲姩璺敱', '鐖舵帴鍙?], lineRows, '褰撳墠鏈鍙栧埌瀹藉甫绾胯矾鏁版嵁')}
          ${opsCard('8 鏉＄嚎璺€熺巼瓒嬪娍', `${fmtNumber(lineTrendRows.length)} 鏉＄嚎璺悓姝ュ睍绀篳, renderLineTrendGrid(lineTrendRows, { emptyText: '褰撳墠鏈噰闆嗗埌鍙睍绀虹殑绾胯矾瓒嬪娍' }), 'ops-info-card')}
          ${opsCard('绾胯矾璐熻浇鍒嗗竷', loadDistributionRows.length ? `${fmtNumber(loadDistributionRows.length)} 鏉＄嚎璺崰姣擿 : '鎸夊疄鏃跺悶鍚愯嚜鍔ㄦ帓搴?, loadDistributionBlock, 'ops-info-card')}
          ${opsDenseTableCard('鎺ュ彛鍚炲悙鏄庣粏', `${fmtNumber(sortedInterfaces.length)} 涓帴鍙, ['鎺ュ彛', '瑙掕壊', '鐘舵€?, '瀹炴椂涓婅閫熺巼', '瀹炴椂涓嬭閫熺巼', '绱涓婅娴侀噺', '绱涓嬭娴侀噺', 'IP / 缃戝叧', 'MAC / 涓㈠寘閿欒'], ifaceRows, '褰撳墠鏈鍙栧埌鎺ュ彛鏁版嵁')}
        </div>`;
    }

    return section('鎺ュ彛鎬昏', 'interfaces', interfaceViews[currentInterfaceView].tip, `
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
      ? `绗?${fmtNumber(currentPage)} / ${fmtNumber(totalPages)} 椤礰
      : dnsRuleBrowser.loading
        ? '姝ｅ湪鍔犺浇鍏ㄩ噺瑙勫垯娴忚'
        : dnsRuleBrowser.error
          ? '鍒嗛〉璇诲彇澶辫触锛屽凡鍥為€€蹇収棰勮'
          : '蹇収棰勮';
    const ruleEmptyText = totalRuleCount
      ? dnsRuleBrowser.loading
        ? '姝ｅ湪璇诲彇褰撳墠椤?DNS 闈欐€佽鍒?..'
        : dnsRuleBrowser.error
          ? '褰撳墠椤佃鍒欒鍙栧け璐ワ紝宸插洖閫€鏄剧ず蹇収棰勮'
          : '褰撳墠椤垫病鏈夊彲灞曠ず鐨?DNS 闈欐€佽鍒?
      : '褰撳墠鏈鍙栧埌 DNS 闈欐€佽鍒?;
    const browserNotice = dnsRuleBrowser.error
      ? `<div class="notice" style="margin-bottom:8px">DNS 闈欐€佽鍒欏垎椤佃鍙栧け璐ワ細${escapeHtml(dnsRuleBrowser.error)}锛屽綋鍓嶅洖閫€涓哄揩鐓ч瑙堛€?/div>`
      : dnsRuleBrowser.loading
        ? `<div class="notice" style="margin-bottom:8px">姝ｅ湪璇诲彇 DNS 闈欐€佽鍒欑 ${fmtNumber(currentPage)} 椤碉紝瀹屾垚鍚庝細鑷姩鍒锋柊銆?/div>`
        : '';
    const ruleRows = browserRows.map((row) => `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${tag(row.type || '-', row.disabled ? 'warn' : 'info')}</td>
        <td>${escapeHtml(row.value)}</td>
        <td>${escapeHtml(row.ttl || '-')}</td>
        <td>${row.disabled ? tag('鍋滅敤', 'warn') : tag('鍚敤', 'ok')}</td>
        <td>${escapeHtml(row.comment || '-')}</td>
      </tr>`);
    return section('DNS IPv4', 'dns4', '涓婃父 DNS銆丏oH銆佺紦瀛樹笌闈欐€佽鍒欏彧璇荤洃鎺?, `
      <div class="grid-4">
        ${metricCard('DNS 鐘舵€?, dns.running ? tag('鍚敤', 'ok') : tag('鏈惎鐢?, 'danger'), `涓婃父 DNS ${fmtNumber((dns.servers || []).length)} 涓猔, dns.dohServer ? 'DoH 宸查厤缃? : 'DoH 鏈厤缃?)}
        ${metricCard('缂撳瓨鍗犵敤', fmtBytes(dns.cacheUsed || 0), `缂撳瓨瀹归噺 ${fmtBytes(dns.cacheSize || 0)}`, '')}
        ${metricCard('闈欐€佽鍒欐€绘暟', fmtNumber(totalRuleCount), `褰撳墠椤?${fmtNumber(visibleRuleCount)} 鏉, `鍋滅敤 ${fmtNumber(dns.disabledForwardRuleCount || 0)} 鏉)}
        ${metricCard('瑙勫垯娴忚鐘舵€?, browserStateText, dnsRuleBrowser.loading ? '姝ｅ湪鍒锋柊瑙勫垯椤? : '瑙勫垯娴忚鍙敤', dnsRuleBrowser.error ? '鏈€杩戜竴娆″垎椤靛け璐? : '')}
      </div>
      <div class="ops-page-stack" style="margin-top:8px">
        ${opsCard('DNS 鏈嶅姟鎽樿', '鎶婄姸鎬併€佺紦瀛樸€丏oH 涓庤鍒欐祻瑙堥泦涓垚涓€鏉′富淇℃伅娴?, opsStatTiles([
          { label: '涓婃父 DNS', value: fmtNumber((dns.servers || []).length), meta: (dns.servers || []).slice(0, 2).join(' / ') || '鏈鍙栧埌' },
          { label: 'DoH', value: dns.dohServer ? '宸查厤缃? : '鏈厤缃?, meta: dns.dohServer ? escapeHtml(dns.dohServer) : '褰撳墠鏈惎鐢?DoH' },
          { label: '璇佷功鏍￠獙', value: dns.dohServer ? (dns.verifyDohCert ? '寮€鍚? : '鍏抽棴') : '-', meta: dns.dohServer ? 'DoH 璇佷功鏍￠獙鐘舵€? : '褰撳墠鏈惎鐢?DoH' },
          { label: '缂撳瓨鍗犵敤鐜?, value: dns.cacheSize ? `${((Number(dns.cacheUsed || 0) / Math.max(1, Number(dns.cacheSize || 0))) * 100).toFixed(1)}%` : '-', meta: `${fmtBytes(dns.cacheUsed || 0)} / ${fmtBytes(dns.cacheSize || 0)}` },
          { label: '褰撳墠椤垫樉绀?, value: fmtNumber(visibleRuleCount), meta: `鎬绘暟 ${fmtNumber(totalRuleCount)} 鏉 },
          { label: '瑙勫垯娴忚', value: browserStateText, meta: dns.forwardRuleSample ? '蹇収棰勮 + 鍒嗛〉璇诲彇' : '蹇収棰勮' }
        ]), 'ops-info-card')}
        ${opsCard('涓婃父 DNS / DoH 鍙傛暟', '鎵€鏈夊瓧娈靛潎鏉ヨ嚜 RouterOS 鍙鍙傛暟', infoGrid([
          { k: '涓婃父 DNS', v: compactListHtml(dns.servers || [], 3) },
          { k: 'DoH 鏈嶅姟鍣?, v: dns.dohServer ? escapeHtml(dns.dohServer) : '鏈厤缃? },
          { k: '璇佷功鏍￠獙', v: dns.dohServer ? (dns.verifyDohCert ? tag('寮€鍚?, 'ok') : tag('鍏抽棴', 'warn')) : '-' },
          { k: '缂撳瓨瀹归噺', v: `${fmtBytes(dns.cacheUsed || 0)} / ${fmtBytes(dns.cacheSize || 0)}` }
        ]), 'ops-info-card')}
        <div class="card">
          <div class="card-head">
            <div class="card-title">DNS 闈欐€佽鍒?/ 杞彂瑙勫垯</div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end">
              <span class="subtle">${browserStateText}锛屽綋鍓嶆樉绀?${fmtNumber(visibleRuleCount)} / ${fmtNumber(totalRuleCount)} 鏉?/span>
              <button class="action-btn" type="button" data-dns-rules-refresh ${dnsRuleBrowser.loading ? 'disabled' : ''}>鍒锋柊褰撳墠椤?/button>
              <button class="action-btn" type="button" data-dns-rules-page="prev" ${canPrev ? '' : 'disabled'}>涓婁竴椤?/button>
              <button class="action-btn" type="button" data-dns-rules-page="next" ${canNext ? '' : 'disabled'}>涓嬩竴椤?/button>
            </div>
          </div>
          <div class="card-body">
            ${browserNotice}
            ${opsDenseTable(['鍚嶇О / 姝ｅ垯', '绫诲瀷', '鐩爣鍊?, 'TTL', '鐘舵€?, '澶囨敞'], ruleRows, ruleEmptyText)}
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
        <td>${row.advertiseDns ? tag('寮€鍚?, 'ok') : tag('鍏抽棴', 'warn')}</td>
        <td>${compactListHtml(row.dnsServers || [], 2)}</td>
        <td>${opsTwoLineCell(row.managed ? 'Managed 寮€' : 'Managed 鍏?, row.otherConfig ? 'Other 寮€' : 'Other 鍏?)}</td>
        <td>${escapeHtml(row.raLifetime || '-')}</td>
      </tr>`);
    const dhcpClientRows = dhcpClients.map((row) => `
      <tr>
        <td>${escapeHtml(row.interface)}</td>
        <td>${tag(row.status || '-', row.status === 'bound' ? 'ok' : 'warn')}</td>
        <td>${escapeHtml(row.pool || '-')}</td>
        <td>${escapeHtml(row.prefix || '-')}</td>
        <td>${opsTwoLineCell(row.usePeerDns ? 'Peer DNS 寮€' : 'Peer DNS 鍏?, row.addDefaultRoute ? `榛樿璺敱 ${escapeHtml(row.defaultRouteDistance || '-')}` : '榛樿璺敱鍏?)}</td>
      </tr>`);
    const hasAnyIpv6Data = ndList.length || dhcpClients.length;
    return section('DNS IPv6', 'dns6', 'IPv6 ND銆丷A 涓?DHCPv6 Prefix 绾靛悜绱у噾灞曠ず', `
      <div class="grid-4">
        ${metricCard('ND 鎺ュ彛鏁?, fmtNumber(ndList.length), `骞挎挱 DNS ${fmtNumber(enabledNdCount)} 涓猔, '')}
        ${metricCard('Managed / Other', `${fmtNumber(managedNdCount)} / ${fmtNumber(otherConfigCount)}`, 'RA 鏍囧織浣嶇粺璁?, '')}
        ${metricCard('DHCPv6 Client', fmtNumber(dhcpClients.length), `Peer DNS ${fmtNumber(peerDnsClients)} 涓猔, '')}
        ${metricCard('Prefix 宸茬粦瀹?, fmtNumber(boundPrefixClients), `瀹㈡埛绔€绘暟 ${fmtNumber(dhcpClients.length)} 涓猔, '')}
      </div>
      <div class="ops-page-stack" style="margin-top:8px">
        ${hasAnyIpv6Data
          ? `
            ${opsCard('IPv6 DNS 鎽樿', '涓嶅啀宸﹀彸骞抽摵澶х┖琛紝鏀规垚绾靛悜鐨勭湡瀹炴暟鎹祦', opsStatTiles([
              { label: '骞挎挱 DNS 鎺ュ彛', value: fmtNumber(enabledNdCount), meta: `ND 鎺ュ彛鎬绘暟 ${fmtNumber(ndList.length)}` },
              { label: 'Managed / Other', value: `${fmtNumber(managedNdCount)} / ${fmtNumber(otherConfigCount)}`, meta: 'RA 鏍囧織浣? },
              { label: 'Prefix 宸茬粦瀹?, value: fmtNumber(boundPrefixClients), meta: `瀹㈡埛绔€绘暟 ${fmtNumber(dhcpClients.length)}` },
              { label: 'Peer DNS 瀹㈡埛绔?, value: fmtNumber(peerDnsClients), meta: '浣跨敤瀵圭 DNS 鐨?DHCPv6 Client' }
            ]), 'ops-info-card')}
            ${opsDenseTableCard('IPv6 ND 骞挎挱鎺ュ彛', `${fmtNumber(ndList.length)} 涓帴鍙, ['鎺ュ彛', '骞挎挱 DNS', '鏄惧紡 DNS', 'RA 鏍囧織', '鐢熷瓨鏈?], ndRows, '褰撳墠鏈鍙栧埌 IPv6 ND 骞挎挱閰嶇疆')}
            ${opsDenseTableCard('IPv6 DHCPv6 Prefix 瀹㈡埛绔?, `${fmtNumber(dhcpClients.length)} 涓鎴风`, ['鎺ュ彛', '鐘舵€?, '鍓嶇紑姹?, '鍓嶇紑 / 鍦板潃', 'Peer DNS / 榛樿璺敱'], dhcpClientRows, '褰撳墠鏈鍙栧埌 IPv6 DHCPv6 Client')}
          `
          : opsCard('IPv6 DNS 閲囬泦鐘舵€?, '褰撳墠椤甸潰娌℃湁璇诲埌 ND / DHCPv6 鏄庣粏', emptyBlock('褰撳墠鏈鍙栧埌 IPv6 ND / DHCPv6 鏁版嵁'), 'ops-empty-card ops-density-table')}
      </div>`);
  };
  window.renderDnsV6 = renderDnsV6;

  renderSecurity = function patchedRenderSecurityDenseV3(snapshot, config = {}) {
    const security = snapshot.security || {};
    const sectionTitle = config.title || '瀹夊叏鐩戞帶涓績';
    const sectionId = config.id || 'security';
    const sectionTip = config.tip || 'Filter 瑙勫垯銆佸湴鍧€鍚嶅崟涓庡紓甯稿憡璀︽寜鐪熷疄璇诲彇缁撴灉灞曠ず';
    const filterRows = (security.filters || []).map((row) => `
      <tr>
        <td>${escapeHtml(row.chain)}</td>
        <td>${tag(row.action, row.disabled ? 'warn' : 'info')}</td>
        <td>${escapeHtml(row.comment || '-')}</td>
        <td>${fmtCompact(row.packets)}</td>
        <td>${fmtBytes(row.bytes)}</td>
        <td>${row.disabled ? tag('鍋滅敤', 'warn') : tag('鍚敤', 'ok')}</td>
      </tr>`);
    const listRows = (security.addressLists || []).map((row) => `
      <tr>
        <td>${escapeHtml(row.list)}</td>
        <td>${tag(row.category, row.category === '榛戝悕鍗? ? 'danger' : row.category === '鐧藉悕鍗? ? 'ok' : 'info')}</td>
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
      const key = String(row.category || '鏈垎绫?).trim() || '鏈垎绫?;
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
        ${metricCard('ACL 瑙勫垯鏁?, fmtNumber((security.filters || []).length), `鍚敤 ${fmtNumber(enabledFilters)} 鏉, '浠呯粺璁＄湡瀹?Filter')}
        ${metricCard('鍦板潃鍚嶅崟鏉＄洰', fmtNumber((security.addressLists || []).length), '榛戠櫧鍚嶅崟 / 鍦板潃闆?, '')}
        ${metricCard('寮傚父鍛婅', fmtNumber((security.alerts || []).length), '绯荤粺鎴栬闂紓甯?, '')}
        ${metricCard('Filter 鍛戒腑', fmtCompact(totalFilterPackets), `绱 ${fmtBytes(totalFilterBytes)}`, '')}
      </div>
      <div class="ops-page-stack" style="margin-top:8px">
        ${opsCard('ACL 鎽樿', '鎶婂師鏉ユ澗鏁ｇ殑姒傝鍘嬫垚涓€灞忓彲璇荤殑鍏抽敭淇℃伅', opsStatTiles([
          { label: '鍚敤瑙勫垯', value: fmtNumber(enabledFilters), meta: `鎬昏鍒?${fmtNumber((security.filters || []).length)} 鏉 },
          { label: 'Input 閾?, value: fmtNumber(inputFilters), meta: '杈撳叆闈㈤槻鎶? },
          { label: 'Forward 閾?, value: fmtNumber(forwardFilters), meta: '杞彂闈㈣鍒? },
          { label: '鍛戒腑娴侀噺', value: fmtBytes(totalFilterBytes), meta: '鍏ㄩ儴 Filter 绱' }
        ]), 'ops-info-card')}
        ${opsCard('鍦板潃鍚嶅崟鍒嗙被', `${fmtNumber((security.addressLists || []).length)} 鏉″悕鍗曡仛鍚坄, opsBarStack(categoryBars, { emptyText: '褰撳墠鏈鍙栧埌鍦板潃鍚嶅崟鍒嗙被' }), 'ops-info-card')}
        ${opsDenseTableCard('杩戞湡寮傚父鍛婅', `${fmtNumber((security.alerts || []).length)} 鏉, ['鏃堕棿', '涓婚', '娑堟伅'], alertRows, '褰撳墠鏈鍙栧埌寮傚父鍛婅')}
        ${opsDenseTableCard('ACL Filter 鏄庣粏', `${fmtNumber((security.filters || []).length)} 鏉¤鍒檂, ['閾?, '鍔ㄤ綔', '澶囨敞', '鍛戒腑鍖?, '鍛戒腑娴侀噺', '鐘舵€?], filterRows, '褰撳墠鏈鍙栧埌 Filter 瑙勫垯')}
        ${opsDenseTableCard('鍦板潃鍚嶅崟鏄庣粏', `${fmtNumber((security.addressLists || []).length)} 鏉, ['鍒楄〃鍚?, '绫诲埆', '鍦板潃', '瓒呮椂', '澶囨敞'], listRows, '褰撳墠鏈鍙栧埌鍦板潃鍚嶅崟')}
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
        <td>${row.running ? tag('杩愯涓?, 'ok') : tag('鍋滅敤', 'warn')}</td>
      </tr>`);
    const dnsPreviewRows = (dns.forwardRules || []).slice(0, 12).map((row) => `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${tag(row.type || '-', row.disabled ? 'warn' : 'info')}</td>
        <td>${escapeHtml(row.value)}</td>
        <td>${escapeHtml(row.ttl || '-')}</td>
        <td>${row.disabled ? tag('鍋滅敤', 'warn') : tag('鍚敤', 'ok')}</td>
      </tr>`);
    const serviceLogBlock = serviceEvents.length
      ? opsDenseTableCard('鏈嶅姟鏃ュ織绐楀彛', `鏈€杩?${fmtNumber(serviceEvents.length)} 鏉?DHCP / DNS 鏃ュ織`, ['鏉ユ簮', '鏃堕棿', '涓婚', '娑堟伅'], serviceRows, '褰撳墠鏈鍙栧埌 DHCP / DNS 鏈嶅姟鏃ュ織')
      : opsCard('鏈嶅姟鏃ュ織绐楀彛', '褰撳墠娌℃湁 DHCP / DNS 鏂颁簨浠讹紝鏀惰捣绌虹櫧鏃ュ織琛ㄦ牸锛屽彧淇濈暀绱у噾鐘舵€佷俊鎭?, opsStatTiles([
        { label: 'DHCP 鏃ュ織', value: fmtNumber((logs.dhcp || []).length), meta: '褰撳墠绐楀彛' },
        { label: 'DNS 鏃ュ織', value: fmtNumber((logs.dns || []).length), meta: '褰撳墠绐楀彛' },
        { label: '鏃ュ織鏉ユ簮', value: 'DHCP / DNS', meta: '绛夊緟鏂扮殑鏈嶅姟浜嬩欢鍐欏叆' }
      ]), 'ops-info-card');
    return section('鏈嶅姟鏃ュ織', 'serviceLogs', 'DHCP / DNS 鏈嶅姟鐘舵€併€佽鍒欓瑙堜笌鏈嶅姟鏃ュ織绐楀彛', `
      <div class="grid-4">
        ${metricCard('DHCP 鏃ュ織', fmtNumber((logs.dhcp || []).length), `DHCP 鏈嶅姟 ${fmtNumber((dhcp.servers || []).length)} 涓猔, '')}
        ${metricCard('DNS 鏃ュ織', fmtNumber((logs.dns || []).length), `闈欐€佽鍒?${fmtNumber(dnsTotalRuleCount)} 鏉, '')}
        ${metricCard('DNS 鐘舵€?, dns.running ? tag('鍚敤', 'ok') : tag('鏈惎鐢?, 'danger'), '鏉ヨ嚜 RouterOS ip/dns', '')}
        ${metricCard('鏈嶅姟姒傝', `${fmtNumber((dhcp.servers || []).length)} / ${fmtNumber((dns.servers || []).length)}`, 'DHCP 鏈嶅姟 / DNS 涓婃父', '')}
      </div>
      <div class="ops-page-stack" style="margin-top:8px">
        ${opsCard('鏈嶅姟鎽樿', '褰撴湇鍔℃棩蹇楃獥鍙ｈ緝绌烘椂锛岀敤鐪熷疄鐨?DHCP / DNS 鐘舵€佹壙鎺ラ〉闈紝涓嶅啀鐣欏ぇ鐗囩┖鐧?, opsStatTiles([
          { label: 'DHCP 鍦板潃姹?, value: fmtNumber((dhcp.pools || []).length), meta: `绉熺害 ${fmtNumber((dhcp.leases || []).length)} 鏉 },
          { label: '杩愯涓?DHCP', value: fmtNumber((dhcp.servers || []).filter((row) => row.running).length), meta: `鎬绘湇鍔?${fmtNumber((dhcp.servers || []).length)} 涓猔 },
          { label: 'DNS 涓婃父', value: fmtNumber((dns.servers || []).length), meta: (dns.servers || []).slice(0, 2).join(' / ') || '鏈鍙栧埌' },
          { label: 'DoH', value: dns.dohServer ? '宸查厤缃? : '鏈厤缃?, meta: dns.dohServer ? escapeHtml(dns.dohServer) : '褰撳墠鏈惎鐢? },
          { label: '缂撳瓨鍗犵敤', value: `${fmtBytes(dns.cacheUsed || 0)} / ${fmtBytes(dns.cacheSize || 0)}`, meta: 'DNS 缂撳瓨褰撳墠鐘舵€? },
          { label: '瑙勫垯鎬绘暟', value: fmtNumber(dnsTotalRuleCount), meta: `棰勮 ${fmtNumber((dns.forwardRules || []).length)} 鏉 }
        ]), 'ops-info-card')}
        ${opsDenseTableCard('DHCP 鏈嶅姟鐘舵€?, `${fmtNumber((dhcp.servers || []).length)} 涓湇鍔, ['鏈嶅姟', '鎺ュ彛', '鍦板潃姹?, '绉熸湡', '鐘舵€?], serverRows, '褰撳墠鏈鍙栧埌 DHCP 鏈嶅姟鐘舵€?)}
        ${opsDenseTableCard('DNS 闈欐€佽鍒欓瑙?, `鏄剧ず ${fmtNumber((dns.forwardRules || []).length)} / ${fmtNumber(dnsTotalRuleCount)} 鏉, ['鍚嶇О / 姝ｅ垯', '绫诲瀷', '鐩爣鍊?, 'TTL', '鐘舵€?], dnsPreviewRows, dnsTotalRuleCount ? '褰撳墠椤垫病鏈夊彲灞曠ず鐨勮鍒欓瑙? : '褰撳墠鏈鍙栧埌 DNS 闈欐€佽鍒?)}
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
      ? tag('楂樺帇', 'danger')
      : overview.systemLoadLevel === 'warning'
        ? tag('棰勮', 'warn')
        : tag('姝ｅ父', 'ok');
    const connectionPressure = Number(connections.total || 0) >= 90000
      ? tag('楂樺帇', 'danger')
      : Number(connections.total || 0) >= 60000
        ? tag('棰勮', 'warn')
        : tag('姝ｅ父', 'ok');
    const ntpState = overview.ntpStatus === 'synchronized'
      ? tag('宸插悓姝?, 'ok')
      : overview.ntpStatus
        ? tag('鏈悓姝?, 'warn')
        : '-';
    const trendMeta = `${fmtNumber(sampleCount)} 涓噰鏍风偣 路 ${escapeHtml(String(pollSeconds))}s / 鐐筦;
    const trendBlock = sampleCount
      ? `<div class="ops-resource-grid">
          ${opsResourceTrendCard('CPU 璐熻浇', fmtPercent(overview.cpuLoad), cpuHistory, '#165dff', trendMeta)}
          ${opsResourceTrendCard('鍐呭瓨浣跨敤鐜?, fmtPercent(overview.memoryUsage), memoryHistory, '#16c67a', trendMeta)}
          ${opsResourceTrendCard('纾佺洏浣跨敤鐜?, fmtPercent(overview.diskUsage), diskHistory, '#ffb020', trendMeta)}
        </div>`
      : emptyBlock('褰撳墠鏈鍙栧埌璧勬簮瓒嬪娍鏁版嵁');
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
        <td>${tag(item.level === 'danger' ? '寮傚父' : '棰勮', item.level)}</td>
        <td>${escapeHtml(item.message || '-')}</td>
      </tr>`);

    return section('璐熻浇瀹¤', 'loadAudit', '鍩轰簬 RouterOS 鐪熷疄璧勬簮銆佽繛鎺ャ€佹帴鍙ｄ笌鏃ュ織鐨勫彧璇昏礋杞藉璁?, `
      <div class="grid-4">
        ${metricCard('CPU 浣跨敤鐜?, fmtPercent(overview.cpuLoad), `鍨嬪彿 ${escapeHtml(overview.cpuModel || '-')}`, `${fmtNumber(overview.cpuCount)} 鏍?/ ${fmtNumber(overview.cpuFrequency)} MHz`)}
        ${metricCard('鍐呭瓨鍗犵敤鐜?, fmtPercent(overview.memoryUsage), `宸茬敤 ${fmtBytes(overview.memoryUsedBytes)}`, `鎬婚噺 ${fmtBytes(overview.memoryTotalBytes)}`)}
        ${metricCard('纾佺洏鍗犵敤鐜?, fmtPercent(overview.diskUsage), `宸茬敤 ${fmtBytes(overview.diskUsedBytes)}`, `鎬婚噺 ${fmtBytes(overview.diskTotalBytes)}`)}
        ${metricCard('鍏ㄥ眬杩炴帴鏁?, fmtCompact(connections.total), `娲昏穬 ${fmtNumber((connections.active || []).length)} 鏉, `杩炴帴鍘嬪姏 ${connectionPressure}`)}
      </div>
      <div class="ops-page-stack" style="margin-top:8px">
        ${opsCard('瀹¤鎽樿', '鎸夋垚鐔熺綉缁滄帶鍒跺彴鐨勫仛娉曪紝鎶婃渶鍏抽敭鐨勭郴缁熺姸鎬佸帇鎴愪竴灞忓彲璇绘憳瑕侊紝鍐嶅線涓嬬湅鏄庣粏', opsStatTiles([
          { label: '绯荤粺璐熻浇', value: systemLoadTag, meta: `CPU ${fmtPercent(overview.cpuLoad)} / 鍐呭瓨 ${fmtPercent(overview.memoryUsage)}` },
          { label: 'DNS 缂撳瓨', value: cacheUsage, meta: `${fmtBytes(dns.cacheUsed || 0)} / ${fmtBytes(dns.cacheSize || 0)}` },
          { label: 'NTP', value: ntpState, meta: escapeHtml(overview.systemTime || '-') },
          { label: '绠＄悊鍛樹細璇?, value: fmtNumber((overview.admins || []).length), meta: `杩愯鏃堕暱 ${escapeHtml(overview.uptime || '-')}` },
          { label: '娲昏穬浼氳瘽', value: fmtNumber((connections.active || []).length), meta: connections.detailUpdatedAt ? escapeHtml(connections.detailUpdatedAt) : '绛夊緟閲囬泦' },
          { label: '鎺ュ彛寮傚父', value: fmtNumber(interfaceAlertCount), meta: `鎺ュ彛鎬绘暟 ${fmtNumber(interfaces.length)}` }
        ]), 'ops-info-card')}
        ${opsCard('璧勬簮瓒嬪娍', '鎷嗗垎 CPU / 鍐呭瓨 / 纾佺洏锛屽垎鍒爣鏄庨鑹层€佸綋鍓嶅€间笌 100 / 50 / 0% 鍧愭爣杞?, trendBlock, 'ops-info-card')}
        ${opsDenseTableCard('鎺ュ彛寮傚父瀹¤', `${fmtNumber(Math.min(interfaces.length, 20))} / ${fmtNumber(interfaces.length)} 涓帴鍙ｏ紝鎸夊紓甯镐笌鍚炲悙浼樺厛灞曠ず`, ['鎺ュ彛', '瑙掕壊', '鐘舵€?, '瀹炴椂涓婅閫熺巼', '瀹炴椂涓嬭閫熺巼', '涓㈠寘 / 閿欏寘', '鍦板潃', 'MAC'], interfaceRows, '褰撳墠鏈鍙栧埌鎺ュ彛瀹¤鏁版嵁')}
        <div class="ops-double" style="margin-top:0">
          ${opsDenseTableCard('鍋ュ悍浜嬩欢绐楀彛', `${fmtNumber(auditEvents.length)} 鏉￠璀?寮傚父`, ['鏃堕棿', '鏉ユ簮', '绾у埆', '鍐呭'], eventRows, '褰撳墠鏈彂鐜版槑鏄剧殑璧勬簮鎴栨湇鍔″紓甯?)}
          ${opsDenseTableCard('褰撳墠鐧诲綍绠＄悊鍛?, `${fmtNumber((overview.admins || []).length)} 涓細璇漙, ['鐢ㄦ埛', '鏂瑰紡', '鏉ユ簮鍦板潃', '鐧诲綍鏃堕棿'], adminRows, '褰撳墠鏈鍙栧埌绠＄悊鍛樹細璇?)}
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
    if (['reachable', 'bound', 'online', 'ok'].includes(value)) return tag('鍦ㄧ嚎', 'ok');
    if (['failed', 'incomplete', 'offline'].includes(value)) return tag(value === 'failed' ? '澶辫触' : '绂荤嚎', 'danger');
    if (value === 'noarp') return tag('鏃?ARP', 'warn');
    if (value === 'stale') return tag('寰呮満', 'warn');
    if (value === 'delay') return tag('寤惰繜', 'warn');
    return tag(status || '-', 'info');
  }

  function addressFamilyBadge(values = []) {
    const families = splitIpFamilies(values);
    if (families.ipv4.length && families.ipv6.length) return '<span class="ops-family-badge is-mixed">IPv4+IPv6</span>';
    if (families.ipv6.length) return '<span class="ops-family-badge is-v6">IPv6</span>';
    if (families.ipv4.length) return '<span class="ops-family-badge">IPv4</span>';
    return '<span class="ops-family-badge">鏈煡</span>';
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
      group.sources.add('缁堢');
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

  function countRows(mapObject, labelName = '鐘舵€?) {
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
        <td>${tag(item.kind || '鍛婅', 'warn')}</td>
        <td>${escapeHtml(item.value || '-')}</td>
        <td>${compactListHtml(String(item.detail || '').split(',').map((value) => value.trim()), 4)}</td>
      </tr>`);
    const arpRows = (arp.items || []).map((row) => `
      <tr>
        <td>${escapeHtml(row.ip)}</td>
        <td>${renderEditableNameCell(row, row.ip, row.ip || '-')}</td>
        <td>${escapeHtml(row.mac)}</td>
        <td>${tag(row.type, row.type === '闈欐€? ? 'info' : 'ok')}</td>
        <td>${terminalStatusTag(row.status)}</td>
        <td>${escapeHtml(toDisplayText(row.lastSeen || '-'))}</td>
      </tr>`);
    return section('ARP 鐩戞帶', 'arp', 'ARP 琛ㄣ€佺粓绔韩浠姐€両Pv4/IPv6 鍦板潃鍜?MAC 婕傜Щ鎸夊悓涓€璁惧瑙嗚灞曠ず', `
      <div class="grid-4">
        ${metricCard('ARP 鏉＄洰', fmtNumber((arp.items || []).length), 'RouterOS ARP 琛?, '')}
        ${metricCard('MAC 婕傜Щ', fmtNumber((arp.alerts || []).length), '鍚屼竴 MAC 瀵瑰簲澶氫釜 IPv4', '')}
        ${metricCard('璁惧韬唤', fmtNumber(groups.length), `IPv6 鍏宠仈 ${fmtNumber(groups.filter((group) => group.ipv6.size).length)} 涓猔, '')}
        ${metricCard('鏈夋祦閲忚澶?, fmtNumber(trafficGroups.length), `缁堢鎬绘暟 ${fmtNumber(terminals.length)}`, '')}
      </div>
      <div class="ops-page-stack" style="margin-top:8px">
        ${opsCard('ARP / 缁堢鍏宠仈鎽樿', '鎸?Netdisco / LibreNMS 鐨勮澶囩储寮曟€濊矾锛屾妸 MAC銆両Pv4銆両Pv6銆丄RP 鐘舵€佸拰娴侀噺鏀惧湪鍚屼竴涓婁笅鏂?, opsStatTiles([
          { label: 'IPv4 鍦板潃', value: fmtNumber(groups.reduce((sum, group) => sum + group.ipv4.size, 0)), meta: '鏉ヨ嚜 ARP / 缁堢琛? },
          { label: 'IPv6 鍦板潃', value: fmtNumber(groups.reduce((sum, group) => sum + group.ipv6.size, 0)), meta: '鏉ヨ嚜缁堢/浼氳瘽瑙傛祴' },
          { label: '鍙瘑鍒?MAC', value: fmtNumber(groups.filter((group) => group.macs.size).length), meta: '鍙敤浜庤韩浠藉綊骞? },
          { label: '鍦ㄧ嚎/鍙揪', value: fmtNumber(groups.filter((group) => worstTerminalStatus(group.statuses) === 'reachable').length), meta: '褰撳墠鐘舵€佽仛鍚? },
          { label: '寰呮満/鏃?ARP', value: fmtNumber(groups.filter((group) => ['stale', 'noarp'].includes(worstTerminalStatus(group.statuses))).length), meta: 'IPv6 涓嶄緷璧?ARP 灞炴甯哥幇璞? },
          { label: '瀹炴椂鍚炲悙', value: fmtRate(groups.reduce((sum, group) => sum + group.upRate + group.downRate, 0)), meta: '鍏宠仈缁堢瀹炴椂涓婁笅琛? }
        ]), 'ops-info-card')}
        ${opsDenseTableCard('璁惧韬唤鍏宠仈琛?, `${fmtNumber(groups.length)} 涓韩浠斤紝涓€琛屽悎骞?IPv4 / IPv6 / MAC / 娴侀噺`, ['璁惧', 'IPv4', 'IPv6', 'MAC', '鐘舵€?, '瀹炴椂涓婅', '瀹炴椂涓嬭', '杩炴帴', '绱娴侀噺'], buildDeviceIdentityRows(groups, 48), '褰撳墠鏈鍙栧埌璁惧韬唤鍏宠仈鏁版嵁', 'ops-compact-density', 'ops-compact-table')}
        <div class="ops-double">
          ${opsDenseTableCard('MAC 婕傜Щ / 鍐茬獊绾跨储', `${fmtNumber((arp.alerts || []).length)} 鏉, ['绫诲瀷', 'MAC', '鍏宠仈 IPv4'], driftRows, '褰撳墠鏈鍙栧埌 MAC 婕傜Щ绾跨储', 'ops-compact-density', 'ops-compact-table')}
          ${opsDenseTableCard('ARP 鐘舵€佸垎甯?, `${fmtNumber((arp.items || []).length)} 鏉?ARP`, ['鐘舵€?, '鏁伴噺', '鍗犳瘮'], countRows(countBy(arp.items || [], (row) => row.status || '-')), '褰撳墠鏈鍙栧埌 ARP 鐘舵€佸垎甯?, 'ops-compact-density', 'ops-compact-table')}
        </div>
        ${opsDenseTableCard('ARP 鍘熷琛?, `${fmtNumber((arp.items || []).length)} 鏉, ['IP', '涓绘満鍚?, 'MAC', '绫诲瀷', '鐘舵€?, '鏈€鍚庡嚭鐜?], arpRows, '褰撳墠鏈鍙栧埌 ARP 鍒楄〃', 'ops-compact-density', 'ops-compact-table')}
      </div>`);
  };
  window.renderArp = renderArp;

  renderTerminals = function patchedRenderTerminalsIdentityDense(snapshot) {
    currentTerminalView = normalizeTerminalView(currentTerminalView);
    const allTerminals = snapshot.terminals || [];
    const ipv4Terminals = allTerminals.filter((row) => !isIpv6Address(row.ip));
    const ipv6Terminals = allTerminals.filter((row) => isIpv6Address(row.ip));
    const ipMap = ipToTerminalMap(allTerminals);
    const groups = buildDeviceGroups(snapshot);
    const familyRows = (currentTerminalView === 'ipv6' ? ipv6Terminals : ipv4Terminals)
      .slice()
      .sort((a, b) => totalTrafficRate(b) - totalTrafficRate(a) || Number(b.connections || 0) - Number(a.connections || 0))
      .map((row) => {
        const mac = normalizedMac(row.mac);
        const group = mac ? groups.find((item) => item.macs.has(mac)) : null;
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
    const ipv6ActiveRows = (snapshot.connections.active || [])
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
    const currentRows = currentTerminalView === 'ipv6' ? ipv6Terminals : ipv4Terminals;
    const currentUp = currentTerminalView === 'ipv6' ? ipv6Up : ipv4Up;
    const currentDown = currentTerminalView === 'ipv6' ? ipv6Down : ipv4Down;
    const tabs = `
      <div class="ik-subtabs">
        <button class="ik-subtab ${currentTerminalView === 'ipv4' ? 'is-active' : ''}" type="button" data-terminal-view="ipv4">IPv4</button>
        <button class="ik-subtab ${currentTerminalView === 'ipv6' ? 'is-active' : ''}" type="button" data-terminal-view="ipv6">IPv6</button>
      </div>`;
    const toolbar = `
      <div class="ik-data-toolbar">
        <div class="ik-ghost-group">
          <span class="ik-ghost-pill is-active">${currentTerminalView === 'ipv6' ? 'IPv6 缁堢' : 'IPv4 缁堢'}</span>
          <button class="ik-ghost-pill" type="button" data-terminal-refresh="current">鍒锋柊褰撳墠椤垫暟鎹?/button>
        </div>
        <div class="ik-ghost-group">
          <span class="ik-ghost-pill">韬唤鍏宠仈瑙嗗浘</span>
        </div>
      </div>`;
    return section('缁堢鐩戞帶', 'terminals', terminalViews[currentTerminalView].tip, `
      <div class="card">
        <div class="card-body">
          ${tabs}
          ${toolbar}
          <div class="grid-4" style="margin-top:8px">
            ${metricCard(currentTerminalView === 'ipv6' ? 'IPv6 缁堢' : 'IPv4 缁堢', fmtNumber(currentRows.length), `韬唤褰掑苟 ${fmtNumber(groupsForView.length)} 涓猔, '')}
            ${metricCard('鍙揪/鍦ㄧ嚎', fmtNumber(currentRows.filter((row) => String(row.status).toLowerCase() === 'reachable').length), '褰撳墠 reachable 鐘舵€?, '')}
            ${metricCard('瀹炴椂涓婅', fmtRate(currentUp), currentTerminalView === 'ipv6' ? 'IPv6 鑱氬悎涓婅' : 'IPv4 鑱氬悎涓婅', '')}
            ${metricCard('瀹炴椂涓嬭', fmtRate(currentDown), currentTerminalView === 'ipv6' ? 'IPv6 鑱氬悎涓嬭' : 'IPv4 鑱氬悎涓嬭', '')}
          </div>
          <div class="ops-page-stack" style="margin-top:8px">
            ${opsCard(`${currentTerminalView === 'ipv6' ? 'IPv6' : 'IPv4'} 缁堢鎽樿`, '鎸夎澶囪韩浠藉悎骞跺湴鍧€鏃忋€丮AC銆佺姸鎬併€佽繛鎺ュ拰娴侀噺锛岄伩鍏嶅彧鐪嬪埌涓€寮犲绔?IP 娓呭崟', opsStatTiles([
              { label: '鍙屾爤璁惧', value: fmtNumber(groups.filter((group) => group.ipv4.size && group.ipv6.size).length), meta: '鍚屼竴韬唤鍚屾椂鏈?IPv4 / IPv6' },
              { label: '鏈?MAC', value: fmtNumber(currentRows.filter((row) => isRealMac(row.mac)).length), meta: '鍙敤浜庤澶囧綊骞? },
              { label: '鏈夎繛鎺?, value: fmtNumber(currentRows.filter((row) => Number(row.connections || 0) > 0).length), meta: '杩炴帴鏁板ぇ浜?0' },
              { label: '鏈夊疄鏃舵祦閲?, value: fmtNumber(currentRows.filter((row) => totalTrafficRate(row) > 0).length), meta: '涓婁笅琛岄€熺巼澶т簬 0' },
              { label: '鏃?ARP/寰呮満', value: fmtNumber(currentRows.filter((row) => ['noarp', 'stale'].includes(String(row.status || '').toLowerCase())).length), meta: currentTerminalView === 'ipv6' ? 'IPv6 涓嶄緷璧?ARP' : '闇€瑕佺粨鍚堟渶鍚庡嚭鐜版椂闂? },
              { label: '绱娴侀噺', value: fmtBytes(currentRows.reduce((sum, row) => sum + Number(row.sessionBytes || 0), 0)), meta: '褰撳墠浼氳瘽绱' }
            ]), 'ops-info-card')}
            ${opsDenseTableCard(`${currentTerminalView === 'ipv6' ? 'IPv6' : 'IPv4'} 缁堢韬唤琛╜, `${fmtNumber(currentRows.length)} 鏉″湴鍧€锛屽惈璺ㄥ湴鍧€鏃忓叧鑱擿, ['鍚嶇О', '鍦板潃鏃?, '鏈湴鍦板潃', '鍏宠仈鍙︿竴鍦板潃鏃?, 'MAC', '鐘舵€?, '鏈€鍚庡嚭鐜?, '瀹炴椂涓婅', '瀹炴椂涓嬭', '杩炴帴', '绱娴侀噺'], familyRows, `褰撳墠鏈鍙栧埌 ${currentTerminalView === 'ipv6' ? 'IPv6' : 'IPv4'} 缁堢鏁版嵁`, 'ops-compact-density', 'ops-compact-table')}
            ${opsDenseTableCard('璁惧韬唤鍚堝苟琛?, `${fmtNumber(groupsForView.length)} 涓澶囪韩浠絗, ['璁惧', 'IPv4', 'IPv6', 'MAC', '鐘舵€?, '瀹炴椂涓婅', '瀹炴椂涓嬭', '杩炴帴', '绱娴侀噺'], buildDeviceIdentityRows(groupsForView, 48), '褰撳墠鏈鍙栧埌璁惧韬唤鍚堝苟鏁版嵁', 'ops-compact-density', 'ops-compact-table')}
            ${currentTerminalView === 'ipv6'
              ? opsDenseTableCard('IPv6 娲昏穬浼氳瘽', `${fmtNumber(ipv6ActiveRows.length)} 鏉＄湡瀹?IPv6 浼氳瘽`, ['璁惧', '鏈湴 IPv6', '杩滅鍦板潃', '鍗忚', '瀹炴椂涓婅', '瀹炴椂涓嬭', '瓒呮椂', '杩炴帴鏍囪'], ipv6ActiveRows, '褰撳墠鏈鍙栧埌 IPv6 娲昏穬浼氳瘽', 'ops-compact-density', 'ops-compact-table')
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
    return section('娴侀噺瀹¤', 'trafficAudit', '鎸変細璇濄€佸崗璁€佸湴鍧€鏃忓拰璁惧韬唤瀹¤褰撳墠娲昏穬娴侀噺', `
      <div class="grid-4">
        ${metricCard('杩炴帴鎬绘暟', fmtCompact(connections.total), '杩炴帴璺熻釜鎬婚噺', '')}
        ${metricCard('娲昏穬浼氳瘽', fmtNumber(active.length), `IPv4 / IPv6 ${fmtNumber(ipv4Active.length)} / ${fmtNumber(ipv6Active.length)}`, '')}
        ${metricCard('鍗忚鎷嗗垎', formatProtocolSplit(connections), '鏈€杩戜竴娆″叏閲忛噰鏍?, formatProtocolSampleTime(connections))}
        ${metricCard('瀹¤鍒锋柊', connections.detailUpdatedAt ? escapeHtml(connections.detailUpdatedAt) : '绛夊緟閲囬泦', '浼氳瘽鏄庣粏鍒锋柊鏃堕棿', '')}
      </div>
      <div class="ops-page-stack" style="margin-top:8px">
        ${opsCard('浼氳瘽瀹¤鎽樿', '鍊熼壌 UniFi Flow 鐨勬€濊矾锛屾妸鍗忚銆佸湴鍧€鏃忋€佺鐐广€佹柟鍚戦€熺巼鏀惧湪浼氳瘽涓婁笅鏂囬噷锛岃€屼笉鏄彧鐪?IP 鏁板瓧', opsStatTiles([
          { label: 'IPv4 娲昏穬浼氳瘽', value: fmtNumber(ipv4Active.length), meta: '鏈湴鎴栬繙绔负 IPv4' },
          { label: 'IPv6 娲昏穬浼氳瘽', value: fmtNumber(ipv6Active.length), meta: '鏈湴鎴栬繙绔负 IPv6' },
          { label: 'TCP 浼氳瘽', value: fmtNumber(active.filter((row) => String(row.protocol || '').toUpperCase() === 'TCP').length), meta: '褰撳墠鏄庣粏' },
          { label: 'UDP 浼氳瘽', value: fmtNumber(active.filter((row) => String(row.protocol || '').toUpperCase() === 'UDP').length), meta: '褰撳墠鏄庣粏' },
          { label: '涓婅鍚堣', value: fmtRate(active.reduce((sum, row) => sum + Number(row.upRate || 0), 0)), meta: '娲昏穬浼氳瘽鍚堣' },
          { label: '涓嬭鍚堣', value: fmtRate(active.reduce((sum, row) => sum + Number(row.downRate || 0), 0)), meta: '娲昏穬浼氳瘽鍚堣' }
        ]), 'ops-info-card')}
        <div class="ops-double">
          ${opsDenseTableCard('鍗忚 / 鍦板潃鏃忓垎甯?, `${fmtNumber(active.length)} 鏉℃椿璺冧細璇漙, ['鍗忚', '浼氳瘽', 'IPv4 / IPv6', '瀹炴椂涓婅', '瀹炴椂涓嬭'], protocolRows(active), '褰撳墠鏈鍙栧埌鍗忚鍒嗗竷', 'ops-compact-density', 'ops-compact-table')}
          ${opsDenseTableCard('鍗?IP 娲昏穬杩炴帴鎺掕', `${fmtNumber((connections.topIps || []).length)} 涓鐐筦, ['璁惧', '鏃?, '鏈湴 IP', 'MAC', '杩炴帴', '瀹炴椂涓婅', '瀹炴椂涓嬭'], topIpRows, '褰撳墠鏈鍙栧埌鍗?IP 鎺掕', 'ops-compact-density', 'ops-compact-table')}
        </div>
        ${opsDenseTableCard('褰撳墠娲昏穬杩炴帴鏄庣粏', `${fmtNumber(active.length)} 鏉★紝鎸?RouterOS 鐪熷疄杩炴帴鏄庣粏`, ['璁惧', '鏃?, '鏈湴鍦板潃', '杩滅鍦板潃', '鍗忚', '瀹炴椂涓婅', '瀹炴椂涓嬭', '瓒呮椂', '杩炴帴鏍囪'], activeRows, '褰撳墠鏈鍙栧埌娲昏穬杩炴帴', 'ops-compact-density', 'ops-compact-table')}
        ${opsDenseTableCard('缁堢娴侀噺瀹¤', `${fmtNumber(terminals.length)} 鍙扮粓绔紝鎸夊悶鍚愬拰杩炴帴鎺掑簭`, ['鍚嶇О', '鏃?, 'IP', 'MAC', '鐘舵€?, '瀹炴椂涓婅', '瀹炴椂涓嬭', '杩炴帴', '绱娴侀噺'], terminalRows, '褰撳墠鏈鍙栧埌缁堢娴侀噺瀹¤鏁版嵁', 'ops-compact-density', 'ops-compact-table')}
      </div>`);
  };
  window.renderTrafficAudit = renderTrafficAudit;

  renderTrafficLoad = function patchedRenderTrafficLoadIpDense(snapshot) {
    const overview = snapshot.overview || {};
    const rawPppoe = snapshot.pppoe || [];
    const pppoe = opsSortPppoeNamedRows(rawPppoe);
    const interfaces = (snapshot.interfaces || []).slice().sort((a, b) => totalTrafficRate(b, 'txRate', 'rxRate') - totalTrafficRate(a, 'txRate', 'rxRate'));
    const terminals = (snapshot.terminals || []).slice().sort((a, b) => totalTrafficRate(b) - totalTrafficRate(a));
    const loadBalance = snapshot.loadBalance || {};
    const activeLines = pppoe.filter((row) => row.running).length;
    const busiestLine = rawPppoe.slice().sort((a, b) => totalTrafficRate(b) - totalTrafficRate(a))[0];
    const trafficTerminals = terminals.filter((row) => totalTrafficRate(row) > 0);
    const ipv6Interfaces = interfaces.filter((row) => splitIpFamilies(row.ips || []).ipv6.length);
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
    return section('娴侀噺璐熻浇', 'trafficLoad', '鎸夌嚎璺€佹帴鍙ｃ€佸湴鍧€鏃忓拰缁堢韬唤灞曠ず鐪熷疄鍚炲悙锛屼笉鍐嶅彧缁欎綆瀵嗗害鎺掕', `
      <div class="grid-4">
        ${metricCard('鎬讳笂琛岄€熺巼', fmtRate(overview.uplinkBps), `鍦ㄧ嚎瀹藉甫 ${fmtNumber(activeLines)} / ${fmtNumber(pppoe.length)}`, busiestLine ? `鏈€绻佸繖 ${escapeHtml(busiestLine.name)}` : '鏆傛棤鍦ㄧ嚎瀹藉甫')}
        ${metricCard('鎬讳笅琛岄€熺巼', fmtRate(overview.downlinkBps), `鍦ㄧ嚎缁堢 ${fmtNumber(overview.onlineTerminals)}`, `鏈夋祦閲忕粓绔?${fmtNumber(trafficTerminals.length)}`)}
        ${metricCard('IPv6 鎺ュ彛瑕嗙洊', `${fmtNumber(ipv6Interfaces.length)} / ${fmtNumber(interfaces.length)}`, '鎺ュ彛鍚湡瀹?IPv6 鍦板潃', '')}
        ${metricCard('鎺ュ彛鍚炲悙瀵硅薄', fmtNumber(interfaces.length), `WAN / LAN ${fmtNumber(interfaces.filter((row) => row.role === 'WAN').length)} / ${fmtNumber(interfaces.filter((row) => row.role !== 'WAN').length)}`, `缁堢鎺掕 ${fmtNumber(trafficTerminals.length)} 鍙癭)}
      </div>
      <div class="ops-split" style="margin-top:8px">
        ${opsCard('WAN 鑱氬悎鍚炲悙瓒嬪娍', `${fmtRate(overview.uplinkBps)} / ${fmtRate(overview.downlinkBps)}`, `<div class="chart-box"><div class="chart-label"><span>鎬讳笂 / 鎬讳笅</span><span>${escapeHtml(snapshot.meta.pollSeconds)}s / 鐐?/span></div>${lineChart([overview.history.uplink, overview.history.downlink], { colors: ['#165dff', '#f53f3f'] })}</div>`, 'ops-info-card')}
        ${opsCard('绾胯矾璐熻浇鍗犳瘮', busiestLine ? `${escapeHtml(busiestLine.name)} 褰撳墠鏈€绻佸繖` : '绛夊緟閲囬泦', opsBarStack(lineShareRows, { percentMode: true, emptyText: '褰撳墠鏈舰鎴愬彲璇荤殑绾胯矾鍗犳瘮' }), 'ops-info-card')}
      </div>
      <div class="ops-page-stack" style="margin-top:8px">
        ${opsCard('璐熻浇鎽樿', '鍊熼壌 Netdata 鐨勭綉缁滄帴鍙ｈ瑙掞紝鎶婂甫瀹姐€佺姸鎬併€侀敊璇€佸湴鍧€鏃忚鐩栨斁鍦ㄥ悓涓€椤甸潰涓?, opsStatTiles([
          { label: '鏈€绻佸繖绾胯矾', value: busiestLine ? fmtRate(totalTrafficRate(busiestLine)) : '-', meta: busiestLine ? `${escapeHtml(busiestLine.name)} 路 ${fmtRate(busiestLine.upRate)} / ${fmtRate(busiestLine.downRate)}` : '鏆傛棤瀹炴椂鍚炲悙' },
          { label: '鍙屾爤鎺ュ彛', value: fmtNumber(interfaces.filter((row) => { const families = splitIpFamilies(row.ips || []); return families.ipv4.length && families.ipv6.length; }).length), meta: '鍚屾椂鍏峰 IPv4 / IPv6' },
          { label: '浠?IPv6/閾捐矾鏈湴', value: fmtNumber(interfaces.filter((row) => { const families = splitIpFamilies(row.ips || []); return !families.ipv4.length && families.ipv6.length; }).length), meta: '甯歌浜庤櫄鎷?閾捐矾鏈湴鎺ュ彛' },
          { label: '鏈変涪閿欐帴鍙?, value: fmtNumber(interfaces.filter((row) => Number(row.txDrop || 0) + Number(row.rxDrop || 0) + Number(row.txError || 0) + Number(row.rxError || 0) > 0).length), meta: '涓㈠寘鎴栭敊鍖呯疮璁￠潪 0' },
          { label: 'IPv4 娴侀噺缁堢', value: fmtNumber(trafficTerminals.filter((row) => !isIpv6Address(row.ip)).length), meta: '褰撳墠鏈夊疄鏃跺悶鍚? },
          { label: 'IPv6 娴侀噺缁堢', value: fmtNumber(trafficTerminals.filter((row) => isIpv6Address(row.ip)).length), meta: '褰撳墠鏈夊疄鏃跺悶鍚? }
        ]), 'ops-info-card')}
        ${opsCard('8 鏉＄嚎璺€熺巼瓒嬪娍', `${fmtNumber(getLineTrendRows(pppoe).length)} 鏉＄嚎璺悓姝ュ睍绀篳, renderLineTrendGrid(getLineTrendRows(pppoe), { emptyText: '褰撳墠鏈噰闆嗗埌鍙睍绀虹殑绾胯矾瓒嬪娍' }), 'ops-info-card')}
        ${opsDenseTableCard('瀹藉甫瀹炴椂璐熻浇', '鎸?PPPoE 鍚嶇О鍥哄畾鎺掑簭锛岄檮甯﹀湴鍧€鍜屾椿鍔ㄨ矾鐢?, ['绾胯矾', '鐘舵€?, 'IP 鍦板潃', '瀹炴椂涓婅', '瀹炴椂涓嬭', '绱涓婅', '绱涓嬭', '娲诲姩璺敱', '鐖舵帴鍙?], lineRows, '褰撳墠鏈鍙栧埌瀹藉甫瀹炴椂璐熻浇', 'ops-compact-density', 'ops-compact-table')}
        ${opsDenseTableCard('鎺ュ彛鍚炲悙 / 鍦板潃鏃忚鐩?, `${fmtNumber(interfaces.length)} 涓帴鍙ｏ紝鎸夊疄鏃跺悶鍚愭帓搴廯, ['鎺ュ彛', '瑙掕壊', '鐘舵€?, '鏃?, '鍦板潃', '瀹炴椂涓婅', '瀹炴椂涓嬭', '涓?/ 閿?, 'MAC'], interfaceRows, '褰撳墠鏈鍙栧埌鎺ュ彛鍚炲悙鎺掕', 'ops-compact-density', 'ops-compact-table')}
        ${opsDenseTableCard('缁堢娴侀噺鎺掕', `${fmtNumber(terminals.length)} 鍙扮粓绔紝鎸夊疄鏃跺悶鍚愪紭鍏堟帓搴廯, ['鍚嶇О', '鏃?, 'IP', 'MAC', '瀹炴椂涓婅', '瀹炴椂涓嬭', '杩炴帴', '绱娴侀噺'], terminalRows, '褰撳墠鏈鍙栧埌缁堢娴侀噺鎺掕', 'ops-compact-density', 'ops-compact-table')}
      </div>`);
  };
  window.renderTrafficLoad = renderTrafficLoad;

  const snapshotToRender = displayedSnapshot || latestSnapshot;
  if (snapshotToRender) {
    renderApp(snapshotToRender);
    if (typeof ensureDnsRuleBrowserLoaded === 'function') {
      ensureDnsRuleBrowserLoaded(snapshotToRender);
    }
  }
})();

