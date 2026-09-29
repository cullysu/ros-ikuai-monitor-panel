const appEl = document.getElementById('app');
    const topMetricsEl = document.getElementById('topMetrics');
    const topbarEl = document.querySelector('.topbar');
    const frameEl = document.querySelector('.frame');
    const appShellEl = document.querySelector('.app');
    const pageTitleEl = document.getElementById('pageTitle');
    const updateTextEl = document.getElementById('updateText');
    const healthDotEl = document.getElementById('healthDot');
    const pageSubtitleEl = document.getElementById('pageSubtitle');
    const manualRefreshBtn = document.getElementById('manualRefreshBtn');
    const refreshModeTextEl = document.getElementById('refreshModeText');
    const nextRefreshTextEl = document.getElementById('nextRefreshText');
    const toolbarLineEl = document.querySelector('.toolbar-line');
    const refreshToolbarEl = document.querySelector('.refresh-toolbar');
    const deployPillEl = document.querySelector('.deploy-pill');
    const ikRailEl = document.getElementById('ikRail');
    const ikMenuPanelEl = document.getElementById('ikMenuPanel');
    const TEST_SNAPSHOT = window.__PANEL_TEST_SNAPSHOT__ || null;
    const IS_TEST_MODE = Boolean(TEST_SNAPSHOT);
    const REALTIME_REFRESH_SECONDS = 1;
    const DNS_RULE_PAGE_SIZE = 100;
    let latestSnapshot = null;
    let displayedSnapshot = null;
    let pendingSnapshot = null;
    let pendingTriggerMode = 'auto';
    let pollTimer = null;
    let countdownTimer = null;
    let interactionResumeTimer = null;
    let interactionPauseUntil = 0;
    let lastRefreshMode = 'init';
    let nextRefreshAt = null;
    let currentSection = 'overview';
    let currentNavGroup = 'home';
    let currentOverviewWanLine = 'aggregate';
    let currentInterfaceView = 'monitor';
    let currentInterfaceTopology = 'wan';
    let interfaceReadonlyOpen = false;
    let currentTerminalView = 'ipv4';
    let topMetricsPinnedHost = null;
    let compactSummaryPinnedHost = null;
    let compactSummaryPinnedSourceState = null;
    let sectionTopbarStateRaf = 0;
    const compactSummaryPinStartBySection = new Map();

    function normalizeTopbarActionLayout() {
      if (!toolbarLineEl || !manualRefreshBtn || !deployPillEl) {
        return;
      }
      toolbarLineEl.insertBefore(manualRefreshBtn, deployPillEl);
      const refreshMetaEl = refreshModeTextEl?.parentElement;
      if (refreshMetaEl?.classList?.contains('refresh-meta')) {
        toolbarLineEl.appendChild(refreshMetaEl);
      }
      refreshToolbarEl?.remove();
    }

    normalizeTopbarActionLayout();

    let dnsRuleBrowser = {
      offset: 0,
      limit: DNS_RULE_PAGE_SIZE,
      totalCount: 0,
      visibleRuleCount: 0,
      rows: [],
      loading: false,
      loaded: false,
      error: ''
    };

    const pageMeta = {
      overview: { title: '系统首页', subtitle: '首页仅保留核心链路、速率趋势与关键摘要' },
      interfaces: { title: '接口总览', subtitle: '接口状态、PPPoE 线路、聚合速率与拓扑关系集中查看' },
      dhcp: { title: 'DHCP 服务', subtitle: 'DHCP 服务器、地址池与租约按 RouterOS 实读数据展示' },
      dns: { title: 'DNS 服务', subtitle: 'DNS 运行状态、上游参数与静态规则只读展示' },
      routes: { title: '静态路由', subtitle: '真实路由表、默认路由与静态路由集中只读展示' },
      balance: { title: '分流监控', subtitle: '默认路由、分流规则与策略路由统一展示' },
      trafficLoad: { title: '流量负载', subtitle: '宽带吞吐、接口实时流量与终端流量排行集中查看' },
      lineStatus: { title: '线路状态', subtitle: '按拨号、地址、默认路由与接口异常实时检测线路状态' },
      security: { title: 'ACL 规则', subtitle: '访问控制、地址名单与异常告警集中查看' },
      arp: { title: 'ARP 监控', subtitle: 'ARP 列表、终端关联与冲突告警集中查看' },
      trafficAudit: { title: '流量审计', subtitle: '单 IP 活跃连接、实时流量与会话审计集中查看' },
      logs: { title: '日志中心', subtitle: '系统、Firewall、DHCP、DNS 日志分类查看' },
      loadAudit: { title: '负载审计', subtitle: '资源趋势、接口异常、管理员会话与健康事件集中审计' },
      serviceLogs: { title: '服务日志', subtitle: 'DHCP 与 DNS 服务日志、服务状态和静态规则集中展示' },
      terminals: { title: '终端监控', subtitle: '在线终端、ARP 与 DHCP 数据合并只读展示' },
      connections: { title: '连接监控', subtitle: '连接总数、单 IP 排行与活跃会话集中查看' },
      readonlyDiagnostics: { title: '只读诊断总览', subtitle: '独立只读诊断入口，不向首页注入诊断模块' },
      collectionHealthDiagnostics: { title: '采集健康', subtitle: 'REST、SSH、DNS 静态表、连接详情与只读探测刷新状态' },
      dnsProxyDiagnostics: { title: 'DNS / 代理体检', subtitle: '常用站点 DNS、Fake-IP、出口 IP、TCP/HTTP 可达性集中只读检测' },
      wanQualityDiagnostics: { title: '线路质量', subtitle: '多 WAN 质量、PCC 偏斜、协议分布和规则命中只读分析' },
      terminalRiskDiagnostics: { title: '终端风险', subtitle: '高连接、高流量、IPv6 暴露与终端异常只读排行' },
      systemAuditDiagnostics: { title: '系统审计', subtitle: '配置漂移、近期事件、接口错误、缓存容量和资源变化榜' },
    };

    const railGroups = [
      { id: 'monitor', label: '监控', icon: 'ik-line', section: 'interfaces' },
      { id: 'flow', label: '流量', icon: 'ik-balance', section: 'lineStatus' },
      { id: 'security', label: '安全', icon: 'ik-security', section: 'security' },
      { id: 'diagnostics', label: '诊断', icon: 'ik-load', section: 'readonlyDiagnostics' },
      { id: 'logs', label: '日志', icon: 'ik-log', section: 'logs' }
    ];

    const menuGroups = {
      home: [],
      monitor: [
        { section: 'interfaces', label: '接口总览', icon: 'ik-line' },
        { section: 'terminals', label: '终端监控', icon: 'ik-terminal' },
        { section: 'dhcp', label: 'DHCP 服务', icon: 'ik-terminal' },
        { section: 'dns', label: 'DNS 服务', icon: 'ik-dns' },
        { section: 'routes', label: '静态路由', icon: 'ik-route' }
      ],
      flow: [
        { section: 'lineStatus', label: '线路状态', icon: 'ik-line' },
        { section: 'balance', label: '分流监控', icon: 'ik-balance' },
        { section: 'trafficLoad', label: '流量负载', icon: 'ik-load' },
        { section: 'loadAudit', label: '负载审计', icon: 'ik-load' }
      ],
      security: [
        { section: 'security', label: 'ACL 规则', icon: 'ik-security' },
        { section: 'arp', label: 'ARP 监控', icon: 'ik-terminal' },
        { section: 'trafficAudit', label: '流量审计', icon: 'ik-load' }
      ],
      diagnostics: [
        { section: 'readonlyDiagnostics', label: '诊断总览', icon: 'ik-load' },
        { section: 'collectionHealthDiagnostics', label: '采集健康', icon: 'ik-dns' },
        { section: 'dnsProxyDiagnostics', label: 'DNS / 代理', icon: 'ik-dns' },
        { section: 'wanQualityDiagnostics', label: '线路质量', icon: 'ik-balance' },
        { section: 'terminalRiskDiagnostics', label: '终端风险', icon: 'ik-terminal' },
        { section: 'systemAuditDiagnostics', label: '系统审计', icon: 'ik-security' }
      ],
      logs: [
        { section: 'logs', label: '日志中心', icon: 'ik-log' },
        { section: 'serviceLogs', label: '服务日志', icon: 'ik-dns' }
      ]
    };

    const sectionToGroup = {
      overview: 'home',
      interfaces: 'monitor',
      dhcp: 'monitor',
      dns: 'monitor',
      routes: 'monitor',
      balance: 'flow',
      trafficLoad: 'flow',
      lineStatus: 'flow',
      security: 'security',
      arp: 'security',
      trafficAudit: 'security',
      logs: 'logs',
      loadAudit: 'flow',
      serviceLogs: 'logs',
      terminals: 'monitor',
      connections: 'flow',
      readonlyDiagnostics: 'diagnostics',
      collectionHealthDiagnostics: 'diagnostics',
      dnsProxyDiagnostics: 'diagnostics',
      wanQualityDiagnostics: 'diagnostics',
      terminalRiskDiagnostics: 'diagnostics',
      systemAuditDiagnostics: 'diagnostics'
    };

    const escapeHtml = (value) => String(value ?? '-')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');

    const fmtNumber = (value) => new Intl.NumberFormat('zh-CN').format(Number(value || 0));
    const fmtPercent = (value) => `${Number(value || 0).toFixed(1)}%`;
    const fmtBytes = (value) => {
      const num = Number(value || 0);
      if (!num) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      let idx = 0;
      let size = num;
      while (size >= 1024 && idx < units.length - 1) {
        size /= 1024;
        idx += 1;
      }
      return `${size.toFixed(size >= 100 || idx === 0 ? 0 : 1)} ${units[idx]}`;
    };
    const fmtRate = (value) => `${fmtBytes(Number(value || 0))}/s`;
    const rateStack = (upValue, downValue) => `
      <div class="rate-stack">
        <div class="rate-row"><span class="rate-label">上行</span><span class="rate-value">${fmtRate(upValue)}</span></div>
        <div class="rate-row"><span class="rate-label">下行</span><span class="rate-value">${fmtRate(downValue)}</span></div>
      </div>`;
    const fmtCompact = (value) => {
      const num = Number(value || 0);
      if (!num) return '0';
      if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
      if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
      return `${Math.round(num)}`;
    };
    const statusTextMap = {
      synchronized: '已同步',
      ok: '正常',
      true: '启用',
      false: '停用',
      bound: '已绑定',
      waiting: '等待',
      offered: '已提供',
      busy: '占用',
      testing: '检测中',
      conflict: '冲突',
      declined: '已拒绝',
      expired: '已过期',
      released: '已释放',
      running: '运行中',
      enabled: '启用',
      disabled: '停用',
      active: '活动',
      inactive: '未生效',
      permanent: '固定',
      complete: '完整',
      probe: '探测',
      warning: '预警',
      warn: '预警',
      danger: '异常',
      error: '异常',
      failed: '失败',
      reachable: '在线',
      stale: '待机',
      delay: '延迟',
      incomplete: '不完整',
      never: '从未'
    };
    const statusTokenList = (value) => String(value ?? '')
      .trim()
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
    const toDisplayText = (value) => {
      const rawText = String(value ?? '').trim();
      const key = rawText.toLowerCase();
      if (statusTextMap[key]) return statusTextMap[key];
      const tokens = statusTokenList(rawText);
      const translatedTokens = tokens
        .map((token) => statusTextMap[token] || '')
        .filter(Boolean);
      if (translatedTokens.length) {
        return Array.from(new Set(translatedTokens)).join(' / ');
      }
      return rawText || '-';
    };
    const levelClass = (status) => {
      const raw = String(status ?? '').trim().toLowerCase();
      const tokens = statusTokenList(status);
      const display = toDisplayText(status);
      if (['在线', '正常', '已同步', '启用', '运行中', '已绑定', '固定', '完整', '活动'].includes(display)) return 'ok';
      if (['预警', '等待', '已提供', '延迟', '待机', '探测', '检测中'].includes(display)) return 'warn';
      if (['离线', '异常', '失败', '冲突', '已拒绝', '已过期'].includes(display)) return 'danger';
      if (['synchronized', 'ok', 'true', 'bound', 'running', 'enabled', 'permanent', 'complete', 'active', 'reachable'].includes(raw)) return 'ok';
      if (['warning', 'warn', 'delay', 'stale', 'probe', 'waiting', 'offered', 'testing'].includes(raw)) return 'warn';
      if (['error', 'danger', 'failed', 'false', 'conflict', 'declined', 'expired', 'incomplete'].includes(raw)) return 'danger';
      if (tokens.some((token) => ['synchronized', 'ok', 'true', 'bound', 'running', 'enabled', 'permanent', 'complete', 'active', 'reachable'].includes(token))) return 'ok';
      if (tokens.some((token) => ['warning', 'warn', 'delay', 'stale', 'probe', 'waiting', 'offered', 'testing'].includes(token))) return 'warn';
      return tokens.some((token) => ['error', 'danger', 'failed', 'false', 'conflict', 'declined', 'expired', 'incomplete'].includes(token)) ? 'danger' : 'info';
    };
    const tag = (text, level) => `<span class="tag ${level || levelClass(text)}">${escapeHtml(toDisplayText(text))}</span>`;
    const normalizedName = (value) => {
      const text = String(value ?? '').trim();
      return text && text !== '-' ? text : '';
    };
    const displayNameFor = (row, fallback = '-') => {
      const customName = normalizedName(row?.customName);
      const autoName = normalizedName(row?.hostname);
      const displayName = normalizedName(row?.displayName) || customName || autoName || fallback;
      return {
        customName,
        autoName,
        displayName: displayName || fallback || '-'
      };
    };
    const renderEditableNameCell = (row, ipValue, fallback = '未命名设备') => {
      const ipText = String(ipValue ?? '').trim();
      const info = displayNameFor(row, fallback || ipText || '-');
      const buttonHtml = ipText
        ? `<button class="alias-action-btn" type="button" data-ip-alias-edit="true" data-ip="${escapeHtml(ipText)}" data-current-name="${escapeHtml(info.customName)}" data-auto-name="${escapeHtml(info.autoName)}">${info.customName ? '改名' : '命名'}</button>`
        : '';
      return `
        <div class="alias-cell">
          <div class="alias-main">
            <span class="alias-name">${escapeHtml(info.displayName)}</span>
            ${info.customName ? '<span class="alias-badge">自定义</span>' : ''}
          </div>
          ${buttonHtml}
        </div>`;
    };
    const progress = (value, color) => `<div class="progress"><span style="width:${Math.max(0, Math.min(100, Number(value || 0)))}%;background:${color || 'linear-gradient(90deg,#7da8ff 0%,#165dff 100%)'}"></span></div>`;
    const emptyBlock = (text = '暂无可展示数据') => `<div class="empty">${escapeHtml(text)}</div>`;
    pageMeta.dns4 = { title: 'DNS IPv4', subtitle: 'IPv4 DNS upstream, cache, DoH and static rules' };
    pageMeta.dns6 = { title: 'DNS IPv6', subtitle: 'IPv6 ND, RA and DHCPv6 prefix information' };
    delete pageMeta.dns;
    menuGroups.monitor = menuGroups.monitor.flatMap((item) => {
      if (item.section !== 'dns') return [item];
      return [
        { section: 'dns4', label: 'DNS IPv4', icon: 'ik-dns' },
        { section: 'dns6', label: 'DNS IPv6', icon: 'ik-dns' }
      ];
    });
    delete sectionToGroup.dns;
    sectionToGroup.dns4 = 'monitor';
    sectionToGroup.dns6 = 'monitor';

    const normalizeSection = (value) => {
      if (value === 'dns') return 'dns4';
      return pageMeta[value] ? value : 'overview';
    };
    const quickSearchItems = [
      { section: 'overview', title: '系统首页', group: '首页', icon: 'ik-home', desc: 'WAN、终端、连接、资源与排行总览', keywords: '首页 总览 系统 WAN 宽带 资源' },
      { section: 'interfaces', title: '接口总览', group: '监控', icon: 'ik-line', desc: '接口、PPPoE、IP、实时速率与累计流量', keywords: '接口 pppoe macvlan 速率 流量 WAN LAN' },
      { section: 'terminals', title: '终端监控', group: '监控', icon: 'ik-terminal', desc: 'IPv4 / IPv6 终端、ARP、DHCP 身份', keywords: '终端 设备 客户端 IPv4 IPv6 ARP DHCP' },
      { section: 'dhcp', title: 'DHCP 服务', group: '监控', icon: 'ik-terminal', desc: 'DHCP 服务、地址池、租约与分配状态', keywords: 'DHCP 租约 地址池 网关 手机 获取地址' },
      { section: 'dns4', title: 'DNS IPv4', group: '监控', icon: 'ik-dns', desc: 'IPv4 DNS、DoH、缓存与静态规则', keywords: 'DNS IPv4 DoH 缓存 规则 上游' },
      { section: 'dns6', title: 'DNS IPv6', group: '监控', icon: 'ik-dns', desc: 'IPv6 ND、RA、DHCPv6 与 Prefix', keywords: 'DNS IPv6 ND RA DHCPv6 Prefix' },
      { section: 'routes', title: '静态路由', group: '监控', icon: 'ik-route', desc: '路由表、默认路由、距离与状态', keywords: '路由 默认路由 route gateway distance' },
      { section: 'lineStatus', title: '线路状态', group: '流量', icon: 'ik-line', desc: '线路健康、路由角色、故障优先队列', keywords: '线路 状态 健康 故障 pppoe 诊断' },
      { section: 'balance', title: '分流监控', group: '流量', icon: 'ik-balance', desc: '分流规则、线路占比与默认路由分布', keywords: '分流 负载均衡 PCC Mangle 默认路由 占比' },
      { section: 'trafficLoad', title: '流量负载', group: '流量', icon: 'ik-load', desc: '宽带负载、接口吞吐与终端流量排行', keywords: '流量 负载 吞吐 排行 带宽 实时速率' },
      { section: 'loadAudit', title: '负载审计', group: '流量', icon: 'ik-load', desc: 'CPU、内存、磁盘、连接压力与接口异常', keywords: 'CPU 内存 磁盘 连接 审计 资源' },
      { section: 'connections', title: '连接监控', group: '流量', icon: 'ik-load', desc: '连接总数、协议、活跃会话与单 IP 排行', keywords: '连接 会话 TCP UDP ICMP IP 排行' },
      { section: 'security', title: 'ACL 规则', group: '安全', icon: 'ik-security', desc: '防火墙 ACL 规则只读查看', keywords: 'ACL 防火墙 firewall 安全 规则' },
      { section: 'arp', title: 'ARP 监控', group: '安全', icon: 'ik-terminal', desc: 'ARP 表、MAC 漂移与终端关联', keywords: 'ARP MAC 漂移 冲突 终端 IP' },
      { section: 'trafficAudit', title: '流量审计', group: '安全', icon: 'ik-load', desc: '终端流量、活跃连接与审计明细', keywords: '审计 流量 终端 活跃连接 协议' },
      { section: 'logs', title: '日志中心', group: '日志', icon: 'ik-log', desc: '系统、Firewall、DHCP、DNS 日志', keywords: '日志 log system firewall dhcp dns' },
      { section: 'serviceLogs', title: '服务日志', group: '日志', icon: 'ik-dns', desc: 'DHCP 与 DNS 服务日志和状态', keywords: '服务日志 DHCP DNS 状态' }
    ];
    let quickSearchOverlayEl = null;
    let quickSearchInputEl = null;
    let quickSearchResultsEl = null;
    let readonlyInfoEl = null;

    function quickSearchMatches(query = '') {
      const words = String(query || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
      if (!words.length) return quickSearchItems;
      return quickSearchItems
        .map((item) => {
          const title = String(item.title || '').toLowerCase();
          const section = String(item.section || '').toLowerCase();
          const group = String(item.group || '').toLowerCase();
          const keywords = String(item.keywords || '').toLowerCase();
          const desc = String(item.desc || '').toLowerCase();
          const haystack = `${title} ${section} ${group} ${keywords} ${desc}`;
          if (!words.every((word) => haystack.includes(word))) return null;
          const score = words.reduce((sum, word) => {
            if (title === word || section === word) return sum + 120;
            if (title.startsWith(word) || section.startsWith(word)) return sum + 80;
            if (title.includes(word) || section.includes(word)) return sum + 60;
            if (keywords.includes(word)) return sum + 30;
            if (group.includes(word)) return sum + 18;
            if (desc.includes(word)) return sum + 8;
            return sum;
          }, 0);
          return { item, score };
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, 'zh-CN'))
        .map(({ item }) => item);
    }

    function renderQuickSearchResults(query = '') {
      if (!quickSearchResultsEl) return;
      const matches = quickSearchMatches(query).slice(0, 12);
      if (!matches.length) {
        quickSearchResultsEl.innerHTML = '<div class="ik-quick-search-empty">没有匹配页面，试试“接口 / DHCP / DNS / ARP / 流量 / 日志”。</div>';
        return;
      }
      quickSearchResultsEl.innerHTML = matches.map((item, index) => `
        <button class="ik-quick-search-item ${index === 0 ? 'is-active' : ''}" type="button" data-quick-search-section="${escapeHtml(item.section)}">
          <span class="ik-quick-search-icon ik-menu-icon ${escapeHtml(item.icon)}"></span>
          <span class="ik-quick-search-main">
            <span class="ik-quick-search-name">${escapeHtml(item.title)}</span>
            <span class="ik-quick-search-desc">${escapeHtml(item.desc)}</span>
          </span>
          <span class="ik-quick-search-group">${escapeHtml(item.group)}</span>
        </button>`).join('');
    }

    function ensureQuickSearchPanel() {
      if (quickSearchOverlayEl && document.body.contains(quickSearchOverlayEl)) return quickSearchOverlayEl;
      quickSearchOverlayEl = document.createElement('div');
      quickSearchOverlayEl.className = 'ik-quick-search-overlay';
      quickSearchOverlayEl.innerHTML = `
        <div class="ik-quick-search-panel" role="dialog" aria-modal="true" aria-label="页面快速搜索">
          <div class="ik-quick-search-head">
            <div class="ik-quick-search-title">页面快速搜索</div>
            <button class="ik-quick-search-close" type="button" data-quick-search-close aria-label="关闭搜索">×</button>
          </div>
          <div class="ik-quick-search-body">
            <input class="ik-quick-search-input" type="search" placeholder="输入接口、DHCP、DNS、ARP、流量、日志..." autocomplete="off">
            <div class="ik-quick-search-hint">点击结果或按 Enter 跳转；Esc 关闭；Ctrl + K 可随时打开。</div>
            <div class="ik-quick-search-results"></div>
          </div>
        </div>`;
      document.body.appendChild(quickSearchOverlayEl);
      quickSearchInputEl = quickSearchOverlayEl.querySelector('.ik-quick-search-input');
      quickSearchResultsEl = quickSearchOverlayEl.querySelector('.ik-quick-search-results');
      quickSearchOverlayEl.addEventListener('mousedown', (event) => {
        if (event.target === quickSearchOverlayEl) closeQuickSearch();
      });
      quickSearchOverlayEl.addEventListener('click', (event) => {
        const closeButton = event.target.closest('[data-quick-search-close]');
        if (closeButton) {
          event.preventDefault();
          closeQuickSearch();
          return;
        }
        const itemButton = event.target.closest('[data-quick-search-section]');
        if (!itemButton) return;
        event.preventDefault();
        jumpQuickSearchSection(itemButton.dataset.quickSearchSection);
      });
      quickSearchInputEl.addEventListener('input', () => renderQuickSearchResults(quickSearchInputEl.value));
      quickSearchInputEl.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeQuickSearch();
          return;
        }
        if (event.key !== 'Enter') return;
        const first = quickSearchOverlayEl.querySelector('[data-quick-search-section]');
        if (!first) return;
        event.preventDefault();
        jumpQuickSearchSection(first.dataset.quickSearchSection);
      });
      renderQuickSearchResults('');
      return quickSearchOverlayEl;
    }

    function openQuickSearch(initialQuery = '') {
      ensureQuickSearchPanel();
      quickSearchOverlayEl.classList.add('is-open');
      quickSearchInputEl.value = initialQuery;
      renderQuickSearchResults(initialQuery);
      requestAnimationFrame(() => {
        quickSearchInputEl.focus();
        quickSearchInputEl.select();
      });
    }

    function closeQuickSearch() {
      if (!quickSearchOverlayEl) return;
      quickSearchOverlayEl.classList.remove('is-open');
    }

    function jumpQuickSearchSection(section) {
      const nextSection = normalizeSection(section);
      closeQuickSearch();
      currentNavGroup = resolveGroup(nextSection, currentNavGroup);
      setActiveSection(nextSection);
    }

    document.addEventListener('keydown', (event) => {
      const key = String(event.key || '').toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === 'k') {
        event.preventDefault();
        noteInteraction(3600);
        openQuickSearch();
      }
    });

    function renderReadonlyInfoContent() {
      const snapshot = displayedSnapshot || latestSnapshot || {};
      const meta = snapshot.meta || {};
      const overview = snapshot.overview || {};
      const statusLabel = snapshot.status === 'ok' ? tag('采集正常', 'ok') : tag('采集异常', 'danger');
      const pollText = meta.pollSeconds ? `${escapeHtml(String(meta.pollSeconds))}s` : '未采集';
      return `
        <div class="ik-readonly-head">
          <div class="ik-readonly-title"><span class="ik-readonly-dot"></span><span>只读状态</span></div>
          <button class="ik-readonly-close" type="button" data-readonly-info-close aria-label="关闭只读状态">×</button>
        </div>
        <div class="ik-readonly-body">
          <div class="ik-readonly-list">
            <span>采集状态</span><span>${statusLabel}</span>
            <span>面板入口</span><span>${escapeHtml(meta.target || '未采集')}</span>
            <span>RouterOS</span><span>${escapeHtml(meta.routerHost || '未采集')}</span>
            <span>版本</span><span>${escapeHtml(overview.version || '未采集')}</span>
            <span>最后更新</span><span>${escapeHtml(snapshot.updatedAt || '未采集')}</span>
            <span>刷新间隔</span><span>${pollText}</span>
          </div>
          <div class="ik-readonly-note">
            当前面板只读取快照与监控数据；这里不会修改 OpenWrt 代理、网关转发、防火墙、安全策略、RouterOS 路由或任何设备配置。
          </div>
        </div>`;
    }

    function ensureReadonlyInfoPanel() {
      if (readonlyInfoEl && document.body.contains(readonlyInfoEl)) return readonlyInfoEl;
      readonlyInfoEl = document.createElement('div');
      readonlyInfoEl.className = 'ik-readonly-popover';
      document.body.appendChild(readonlyInfoEl);
      readonlyInfoEl.addEventListener('click', (event) => {
        if (event.target.closest('[data-readonly-info-close]')) {
          event.preventDefault();
          closeReadonlyInfo();
        }
      });
      document.addEventListener('mousedown', (event) => {
        if (!readonlyInfoEl?.classList.contains('is-open')) return;
        if (readonlyInfoEl.contains(event.target) || event.target.closest('[data-readonly-info-open]')) return;
        closeReadonlyInfo();
      });
      return readonlyInfoEl;
    }

    function openReadonlyInfo() {
      ensureReadonlyInfoPanel();
      readonlyInfoEl.innerHTML = renderReadonlyInfoContent();
      readonlyInfoEl.classList.add('is-open');
    }

    function closeReadonlyInfo() {
      if (!readonlyInfoEl) return;
      readonlyInfoEl.classList.remove('is-open');
    }
    const isDnsRuleBrowserSection = (section = currentSection) => normalizeSection(section) === 'dns4';
    const compactTopbarSections = new Set([
      'interfaces',
      'dhcp',
      'routes',
      'connections',
      'trafficLoad',
      'lineStatus',
      'security',
      'arp',
      'trafficAudit',
      'logs',
      'loadAudit',
      'serviceLogs',
      'balance',
      'dns4',
      'dns6',
      'terminals',
      'readonlyDiagnostics',
      'collectionHealthDiagnostics',
      'dnsProxyDiagnostics',
      'wanQualityDiagnostics',
      'terminalRiskDiagnostics',
      'systemAuditDiagnostics'
    ]);
    const interfaceViews = {
      monitor: { title: '线路监控', tip: '查看线路实时速率、累计流量和接口状态' },
      ipv6: { title: 'IPv6 线路详情', tip: '仅展示当前真实读取到的 IPv6 地址与接口状态' }
    };
    const terminalViews = {
      ipv4: { title: 'IPv4', tip: '展示 IPv4 在线终端、ARP 与 DHCP 实时数据' },
      ipv6: { title: 'IPv6', tip: '展示当前真实读取到的 IPv6 终端与活跃会话' }
    };
    const normalizeInterfaceView = (value) => interfaceViews[value] ? value : 'monitor';
    const normalizeInterfaceTopology = (value) => ['wan', 'lan', 'vnet'].includes(value) ? value : 'wan';
    const normalizeTerminalView = (value) => terminalViews[value] ? value : 'ipv4';
    const refreshTriggerText = (mode) => mode === 'manual' ? '手动刷新' : mode === 'auto' ? '实时轮询' : '首次加载';
    const menuGroupLabel = {
      home: '首页概览',
      monitor: '接口监控',
      flow: '流量 / 分流',
      security: 'ACL / 安全',
      diagnostics: '只读诊断',
      logs: '日志中心'
    };
    const selectionContainer = () => {
      const selection = window.getSelection?.();
      if (!selection || selection.isCollapsed || !selection.rangeCount) return null;
      const node = selection.getRangeAt(0).commonAncestorContainer;
      return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    };
    const hasSelectionInsideApp = () => {
      const node = selectionContainer();
      return Boolean(node && appEl.contains(node));
    };
    const hasInteractionLock = () => document.visibilityState === 'hidden' || Date.now() < interactionPauseUntil || hasSelectionInsideApp();
    function armInteractionResume() {
      clearTimeout(interactionResumeTimer);
      const waitMs = Math.max(300, interactionPauseUntil - Date.now() + 120);
      interactionResumeTimer = setTimeout(() => {
        applyPendingSnapshotIfIdle();
        updateRefreshMeta();
      }, waitMs);
    }
    function noteInteraction(lockMs = 3200) {
      interactionPauseUntil = Math.max(interactionPauseUntil, Date.now() + lockMs);
      armInteractionResume();
      updateRefreshMeta();
    }
    async function saveIpAlias(ipValue, currentName = '', autoName = '') {
      const ip = String(ipValue ?? '').trim();
      if (!ip) return;
      noteInteraction(60000);
      const promptLines = [
        `IP: ${ip}`,
        '请输入自定义名称，留空即可清除。'
      ];
      if (autoName) {
        promptLines.push(`当前自动识别名称：${autoName}`);
      }
      const nextName = window.prompt(promptLines.join('\n'), currentName || '');
      if (nextName === null) {
        noteInteraction(1600);
        return;
      }
      try {
        const response = await fetch('/api/ip-alias', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ip, name: nextName })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload?.ok === false) {
          throw new Error(payload?.error || `HTTP ${response.status}`);
        }
        if (payload?.snapshot) {
          queueSnapshot(payload.snapshot, 'manual');
        } else {
          await loadSnapshot('manual');
        }
      } catch (error) {
        window.alert(`名称保存失败：${error?.message || '未知错误'}`);
      } finally {
        noteInteraction(2200);
      }
    }
    function applySnapshot(snapshot, triggerMode) {
      displayedSnapshot = snapshot;
      latestSnapshot = snapshot;
      lastRefreshMode = triggerMode;
      syncDnsRuleBrowserWithSnapshot(snapshot);
      renderTopMetrics(snapshot);
      renderApp(snapshot);
      ensureDnsRuleBrowserLoaded(snapshot);
    }
    function applyPendingSnapshotIfIdle(force = false) {
      if (!pendingSnapshot) return false;
      if (!force && hasInteractionLock()) {
        armInteractionResume();
        return false;
      }
      const snapshot = pendingSnapshot;
      const triggerMode = pendingTriggerMode;
      pendingSnapshot = null;
      pendingTriggerMode = 'auto';
      applySnapshot(snapshot, triggerMode);
      return true;
    }
    function queueSnapshot(snapshot, triggerMode) {
      latestSnapshot = snapshot;
      if (triggerMode !== 'manual' && hasInteractionLock()) {
        pendingSnapshot = snapshot;
        pendingTriggerMode = triggerMode;
        lastRefreshMode = triggerMode;
        if (normalizeSection(currentSection) === 'overview') {
          refreshOverviewRankGrid(snapshot);
        }
        armInteractionResume();
        updateRefreshMeta();
        return;
      }
      pendingSnapshot = null;
      pendingTriggerMode = 'auto';
      applySnapshot(snapshot, triggerMode);
    }

    function syncDnsRuleBrowserWithSnapshot(snapshot) {
      const dns = snapshot?.dns || {};
      const previewRows = Array.isArray(dns.forwardRules) ? dns.forwardRules : [];
      const visibleRuleCount = Number(dns.visibleRuleCount || previewRows.length || 0);
      const totalCount = Number(dns.forwardRuleCount || visibleRuleCount || 0);
      if (!dnsRuleBrowser.loaded && !dnsRuleBrowser.loading) {
        dnsRuleBrowser = {
          ...dnsRuleBrowser,
          offset: 0,
          totalCount,
          visibleRuleCount,
          rows: previewRows
        };
        return;
      }
      dnsRuleBrowser = {
        ...dnsRuleBrowser,
        totalCount: totalCount || dnsRuleBrowser.totalCount,
        visibleRuleCount: dnsRuleBrowser.loaded ? dnsRuleBrowser.visibleRuleCount : visibleRuleCount,
        rows: dnsRuleBrowser.loaded ? dnsRuleBrowser.rows : previewRows
      };
    }

    async function loadDnsRuleBrowser(options = {}) {
      const baseSnapshot = displayedSnapshot || latestSnapshot;
      syncDnsRuleBrowserWithSnapshot(baseSnapshot);
      if (IS_TEST_MODE) {
        return dnsRuleBrowser;
      }
      const offset = Math.max(0, Number.isFinite(Number(options.offset)) ? Number(options.offset) : dnsRuleBrowser.offset || 0);
      const limit = Math.max(1, Number.isFinite(Number(options.limit)) ? Number(options.limit) : dnsRuleBrowser.limit || DNS_RULE_PAGE_SIZE);
      const force = Boolean(options.force);
      if (dnsRuleBrowser.loading && !force) {
        return dnsRuleBrowser;
      }
      if (!force && dnsRuleBrowser.loaded && dnsRuleBrowser.offset === offset && dnsRuleBrowser.limit === limit && Array.isArray(dnsRuleBrowser.rows) && dnsRuleBrowser.rows.length) {
        return dnsRuleBrowser;
      }
      dnsRuleBrowser = {
        ...dnsRuleBrowser,
        offset,
        limit,
        loading: true,
        error: ''
      };
      if (isDnsRuleBrowserSection() && baseSnapshot) {
        renderApp(baseSnapshot);
      }
      try {
        const response = await fetch(`/api/dns-static?offset=${offset}&limit=${limit}`, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = await response.json();
        dnsRuleBrowser = {
          offset: Math.max(0, Number(payload.offset || 0)),
          limit: Math.max(1, Number(payload.limit || limit)),
          totalCount: Math.max(0, Number(payload.totalCount || 0)),
          visibleRuleCount: Math.max(0, Number(payload.visibleRuleCount || 0)),
          rows: Array.isArray(payload.rows) ? payload.rows : [],
          loading: false,
          loaded: true,
          error: ''
        };
      } catch (error) {
        const fallbackSnapshot = displayedSnapshot || latestSnapshot;
        const fallbackDns = fallbackSnapshot?.dns || {};
        const previewRows = Array.isArray(fallbackDns.forwardRules) ? fallbackDns.forwardRules : [];
        dnsRuleBrowser = {
          ...dnsRuleBrowser,
          totalCount: Number(fallbackDns.forwardRuleCount || dnsRuleBrowser.totalCount || previewRows.length || 0),
          visibleRuleCount: Number(fallbackDns.visibleRuleCount || previewRows.length || 0),
          rows: previewRows,
          loading: false,
          loaded: false,
          error: error?.message || '规则页读取失败'
        };
      }
      const activeSnapshot = displayedSnapshot || latestSnapshot;
      if (isDnsRuleBrowserSection() && activeSnapshot) {
        renderTopMetrics(activeSnapshot);
        renderApp(activeSnapshot);
      }
      return dnsRuleBrowser;
    }

    function ensureDnsRuleBrowserLoaded(snapshot, options = {}) {
      syncDnsRuleBrowserWithSnapshot(snapshot);
      if (!isDnsRuleBrowserSection() || IS_TEST_MODE) {
        return;
      }
      if (options.force) {
        void loadDnsRuleBrowser({ force: true, offset: options.offset, limit: options.limit });
        return;
      }
      if (!dnsRuleBrowser.loaded && !dnsRuleBrowser.loading && !dnsRuleBrowser.error) {
        void loadDnsRuleBrowser({ offset: dnsRuleBrowser.offset, limit: dnsRuleBrowser.limit });
      }
    }

    const navItemsFor = (groupId) => menuGroups[groupId] || [];
    const groupHasSection = (groupId, section) => navItemsFor(groupId).some((item) => item.section === section);
    const resolveGroup = (section, groupHint) => {
      if (groupHint && groupHasSection(groupHint, section)) return groupHint;
      return sectionToGroup[section] || 'monitor';
    };
    function renderNavigation() {
      if (ikRailEl) {
        ikRailEl.innerHTML = `
          <a class="ik-rail-logo ${currentNavGroup === 'home' ? 'is-active' : ''}" href="#overview" data-section="overview" data-nav-group="home" title="系统首页">首</a>
          <button class="ik-rail-button ik-rail-search-btn" type="button" title="搜索页面 Ctrl+K" data-quick-search-open aria-label="搜索页面">⌕</button>
          <div class="ik-rail-group">${railGroups.map((group) => `
            <a class="ik-rail-button ${currentNavGroup === group.id ? 'is-active' : ''}" href="#${group.section}" data-section="${group.section}" data-nav-group="${group.id}" title="${group.label}">
              <span class="ik-rail-glyph ${group.icon}"></span>
              <span class="ik-rail-label">${group.label}</span>
            </a>`).join('')}</div>
          <div class="ik-rail-spacer"></div>
          <div class="ik-rail-group"><button class="ik-rail-button ik-readonly-btn" type="button" title="只读状态" data-readonly-info-open aria-label="只读状态">只</button></div>`;
      }
      if (ikMenuPanelEl) {
        const items = navItemsFor(currentNavGroup);
        ikMenuPanelEl.classList.toggle('is-empty', items.length === 0);
        ikMenuPanelEl.innerHTML = items.length ? `<div class="nav-label">${menuGroupLabel[currentNavGroup] || '监控中心'}</div>${items.map((item) => `
          <a class="ik-menu-item ${item.section === currentSection ? 'is-active' : ''}" href="#${item.section}" data-section="${item.section}" data-nav-group="${currentNavGroup}">
            <span class="ik-menu-icon ${item.icon}"></span>
            <span class="ik-menu-copy">${item.label}</span>
          </a>`).join('')}` : '';
      }
    }

    function roundTo(value, digits = 2) {
      const factor = 10 ** Math.max(0, Number(digits || 0));
      const numeric = Number(value);
      return Number.isFinite(numeric) ? Math.round(numeric * factor) / factor : 0;
    }

    function chartValue(value) {
      if (value === null || value === undefined || value === '') return null;
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    }

    function smoothNumericSeries(values = [], passes = 2) {
      let smoothed = (values || []).map(chartValue);
      const iterations = Math.max(0, Number(passes || 0));
      for (let pass = 0; pass < iterations; pass += 1) {
        smoothed = smoothed.map((value, index, arr) => {
          if (value === null) return null;
          const neighbors = [arr[index - 1], value, arr[index + 1]].filter((item) => item !== null);
          if (!neighbors.length) return value;
          return neighbors.reduce((sum, item) => sum + item, 0) / neighbors.length;
        });
      }
      return smoothed;
    }

    function smoothRateNeedleZeros(values = [], options = {}) {
      const original = (values || []).map(chartValue);
      const floor = Math.max(1, Number(options.zeroNeedleFloor || 1024));
      const current = chartValue(options.current);
      const findNeighbor = (start, step) => {
        for (let offset = 1; offset <= 3; offset += 1) {
          const value = original[start + step * offset];
          if (value === null || value === undefined) continue;
          if (value > 0) return value;
          if (value === 0) return null;
        }
        return null;
      };
      return original.map((value, index) => {
        if (value !== 0) return value;
        const prev = findNeighbor(index, -1);
        const next = findNeighbor(index, 1);
        if (prev !== null && next !== null && Math.max(prev, next) >= floor) {
          return (prev + next) / 2;
        }
        if (index === original.length - 1 && prev !== null && current !== null && Math.max(prev, current) >= floor) {
          return (prev + current) / 2;
        }
        return value;
      });
    }

    function smoothSvgPath(points = []) {
      if (!points.length) return '';
      if (points.length === 1) return `M ${roundTo(points[0].x)} ${roundTo(points[0].y)}`;
      let path = `M ${roundTo(points[0].x)} ${roundTo(points[0].y)}`;
      for (let index = 1; index < points.length; index += 1) {
        const previous = points[index - 1];
        const current = points[index];
        const midX = (previous.x + current.x) / 2;
        path += ` C ${roundTo(midX)} ${roundTo(previous.y)}, ${roundTo(midX)} ${roundTo(current.y)}, ${roundTo(current.x)} ${roundTo(current.y)}`;
      }
      return path;
    }

    function chartSegmentElements(values, mapper, color, options = {}) {
      const strokeWidth = options.strokeWidth || 2.4;
      const segments = [];
      let current = [];
      (values || []).forEach((value, index) => {
        const numeric = chartValue(value);
        if (numeric === null) {
          if (current.length) segments.push(current);
          current = [];
          return;
        }
        const mapped = mapper(numeric, index);
        const [x, y] = String(mapped).split(',').map((item) => Number(item));
        if (Number.isFinite(x) && Number.isFinite(y)) {
          current.push({ x, y });
        }
      });
      if (current.length) segments.push(current);
      return segments.map((points) => {
        if (points.length === 1) {
          return `<circle cx="${roundTo(points[0].x)}" cy="${roundTo(points[0].y)}" r="2.2" fill="${color}"/>`;
        }
        return `<path fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" d="${smoothSvgPath(points)}"/>`;
      }).join('');
    }

    function lineChart(series, options = {}) {
      const width = options.width || 620;
      const height = options.height || 140;
      const padding = 18;
      const safeSeries = Array.isArray(series) ? series : [];
      const seriesList = Array.isArray(safeSeries[0]) ? safeSeries : [safeSeries];
      const preparedSeries = seriesList.map((arr) => {
        const rawValues = Array.isArray(arr) ? arr : [];
        return smoothNumericSeries(smoothRateNeedleZeros(rawValues, options), options.smoothPasses ?? 2);
      });
      const all = preparedSeries.flat().filter((item) => item !== null);
      const max = Math.max(...all, 1);
      const min = 0;
      const grid = [];
      for (let i = 0; i < 4; i += 1) {
        const y = padding + ((height - padding * 2) / 3) * i;
        grid.push(`<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="rgba(22,93,255,0.08)" stroke-width="1"/>`);
      }
      const colors = options.colors || ['#165dff', '#16c67a', '#ffb020'];
      const paths = preparedSeries.map((arr, idx) => {
        const step = arr.length > 1 ? (width - padding * 2) / (arr.length - 1) : 0;
        return chartSegmentElements(arr, (value, index) => {
          const x = padding + step * index;
          const y = height - padding - ((Number(value) - min) / (max - min || 1)) * (height - padding * 2);
          return `${x},${y}`;
        }, colors[idx % colors.length]);
      }).join('');
      return `<svg class="mini-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">${grid.join('')}${paths}</svg>`;
    }

    function rateAxisLineChart(values = [], color = '#165dff', options = {}) {
      const width = options.width || 360;
      const height = options.height || 82;
      const padX = 8;
      const padY = 8;
      const rawValues = Array.isArray(values) ? values : [];
      const current = chartValue(options.current);
      const displayValues = smoothNumericSeries(smoothRateNeedleZeros(rawValues, { ...options, current }), options.smoothPasses ?? 3);
      const points = displayValues.map(chartValue);
      const finitePoints = points.filter((value) => value !== null);
      const max = Math.max(...finitePoints, current !== null ? current : 0, 1);
      const plotHeight = height - padY * 2;
      const marks = [max, max / 2, 0];
      const grid = marks.map((mark) => {
        const y = padY + ((max - mark) / max) * plotHeight;
        return `<line x1="${padX}" y1="${y}" x2="${width - padX}" y2="${y}" stroke="rgba(22,93,255,0.10)" stroke-width="1"/>`;
      }).join('');
      const polyline = finitePoints.length
        ? chartSegmentElements(displayValues, (value, index) => {
            const step = points.length > 1 ? (width - padX * 2) / (points.length - 1) : 0;
            const x = padX + step * index;
            const y = padY + ((max - Math.max(0, value)) / max) * plotHeight;
            return `${x},${y}`;
          }, color)
        : '';
      return {
        svg: `<svg class="ik-wan-rate-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">${grid}${polyline}</svg>`,
        max,
        mid: max / 2,
        count: finitePoints.length
      };
    }

    function wanRateSplitCard(label, current, values = [], color = '#165dff', pollText = '') {
      const chart = rateAxisLineChart(values, color, { current });
      return `<div class="ik-wan-rate-card" style="--wan-rate-color:${color}">
        <div class="ik-wan-rate-head">
          <div class="ik-wan-rate-title"><i class="ik-wan-rate-dot"></i>${escapeHtml(label)}</div>
          <div class="ik-wan-rate-value">${fmtRate(current)}<span>${pollText ? `${escapeHtml(pollText)} · ` : ''}${fmtNumber(chart.count)} 点</span></div>
        </div>
        <div class="ik-wan-rate-chart">
          ${chart.svg}
          <div class="ik-wan-rate-axis">
            <span>${fmtRate(chart.max)}</span>
            <span>${fmtRate(chart.mid)}</span>
            <span>0 B/s</span>
          </div>
        </div>
      </div>`;
    }

    function resourcePercentChart(values = [], color = '#165dff') {
      const width = 360;
      const height = 96;
      const padX = 8;
      const padY = 8;
      const points = smoothNumericSeries((values || []).map(chartValue), 2);
      const chartHeight = height - padY * 2;
      const grid = [100, 50, 0].map((mark) => {
        const y = padY + ((100 - mark) / 100) * chartHeight;
        return `<line x1="${padX}" y1="${y}" x2="${width - padX}" y2="${y}" stroke="rgba(22,93,255,0.09)" stroke-width="1"/>`;
      }).join('');
      if (!points.some((value) => value !== null)) return `<svg class="ops-resource-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">${grid}</svg>`;
      const step = points.length > 1 ? (width - padX * 2) / (points.length - 1) : 0;
      const path = chartSegmentElements(points, (value, index) => {
        const clamped = Math.max(0, Math.min(100, Number(value)));
        const x = padX + step * index;
        const y = padY + ((100 - clamped) / 100) * chartHeight;
        return `${x},${y}`;
      }, color);
      return `<svg class="ops-resource-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">${grid}${path}</svg>`;
    }

    function resourceTrendCard(title, currentValue, values, color, meta) {
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
              <div class="ops-resource-plot">${resourcePercentChart(values, color)}</div>
            </div>` : emptyBlock(`${title} 当前未读取到历史采样`)}
        </div>`;
    }

    function resourceTrendGrid(overview, meta) {
      return `<div class="ops-resource-grid">
        ${resourceTrendCard('CPU 负载', fmtPercent(overview.cpuLoad), overview.history?.cpu || [], '#165dff', meta)}
        ${resourceTrendCard('内存使用率', fmtPercent(overview.memoryUsage), overview.history?.memory || [], '#16c67a', meta)}
        ${resourceTrendCard('磁盘使用率', fmtPercent(overview.diskUsage), overview.history?.disk || [], '#ffb020', meta)}
      </div>`;
    }

    function setPageSubtitle(text = '') {
      if (!pageSubtitleEl) return;
      const hidden = normalizeSection(currentSection) === 'overview';
      pageSubtitleEl.textContent = '';
      pageSubtitleEl.setAttribute('hidden', '');
      pageSubtitleEl.setAttribute('aria-hidden', 'true');
      pageSubtitleEl.classList.add('is-hidden');
      if (frameEl) {
        frameEl.classList.toggle('overview-title-only', hidden);
      }
      if (appShellEl) {
        appShellEl.classList.toggle('home-sidebar-hidden', hidden);
      }
    }

    function lockPageSubtitleHidden() {
      if (!pageSubtitleEl) return;
      setPageSubtitle('');
    }

    function getPppoeDisplayOrder(name) {
      // Natural ordering by the pppoe-out suffix number; no device-specific fixed table.
      const suffixMatch = String(name || '').trim().toLowerCase().match(/pppoe-out(\d+)$/);
      return suffixMatch ? Number(suffixMatch[1]) : Number.POSITIVE_INFINITY;
    }

    function sortPppoeNamedRows(rows) {
      return (rows || []).slice().sort((a, b) => {
        const orderA = getPppoeDisplayOrder(a?.name);
        const orderB = getPppoeDisplayOrder(b?.name);
        if (orderA !== orderB) return orderA - orderB;
        return String(a?.name || '').localeCompare(String(b?.name || ''), 'zh-CN', { numeric: true, sensitivity: 'base' });
      });
    }

    function getLineTrendRows(pppoe) {
      return sortPppoeNamedRows(
        (pppoe || []).filter((item) => item.history?.up?.length && item.history?.down?.length)
      );
    }

    function lineTrendDensity(count) {
      const n = Math.max(1, Number(count) || 1);
      const logN = Math.log2(n);
      const minTile = Math.round(Math.max(108, 260 - 38 * logN));
      const chartH = Math.round(Math.max(36, 128 - 22 * logN));
      const gap = n <= 4 ? 10 : n <= 16 ? 8 : 6;
      const compact = minTile <= 132 || n > 24;
      const maxH = compact ? Math.min(420, Math.max(220, 96 + n * 18)) : Math.min(560, Math.max(180, chartH * 2 + 96));
      return { n, minTile, chartH, gap, compact, maxH };
    }

    function lineTrendColumns(count) {
      const n = Math.max(1, Number(count) || 1);
      const ideal = Math.min(6, Math.max(1, Math.ceil(Math.sqrt(n))));
      let best = ideal;
      let bestFill = -1;
      for (let cols = ideal; cols <= 6; cols += 1) {
        const fill = n % cols;
        if (fill === 0) return cols;
        if (fill > bestFill) {
          bestFill = fill;
          best = cols;
        }
      }
      return best;
    }

    function lineTrendPeak(item) {
      const values = [...(item?.history?.up || []), ...(item?.history?.down || [])]
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value));
      return values.length ? Math.max(...values) : 0;
    }

    function renderLineTrendGrid(rows, options = {}) {
      const colors = options.colors || ['#165dff', '#16c67a'];
      const emptyText = options.emptyText || '当前未读取到可展示的线路趋势';
      if (!rows.length) return emptyBlock(emptyText);
      const online = rows.filter((item) => item.running);
      const offline = rows.filter((item) => !item.running);
      const pollText = options.pollText || '';
      const parts = [];
      if (online.length && online.length <= 4) {
        parts.push(online.map((item) => `
          <div class="line-trend-full">
            ${wanRateSplitCard(`${item.name} · 实时上行`, item.upRate, item.history.up, '#165dff', pollText)}
            ${wanRateSplitCard(`${item.name} · 实时下行`, item.downRate, item.history.down, '#16c67a', pollText)}
          </div>`).join(''));
      } else if (online.length) {
        const density = lineTrendDensity(online.length);
        if (density.compact) {
          parts.push(`<div class="line-trend-grid is-compact" style="--line-trend-max-h:${density.maxH}px">${online.map((item) => `
            <div class="line-trend-row">
              <div class="line-trend-row-name">${escapeHtml(item.name)}</div>
              <div class="line-trend-row-state">在线</div>
              <div class="line-trend-row-rate">↑ ${fmtRate(item.upRate)} ↓ ${fmtRate(item.downRate)}</div>
              <div class="line-trend-row-spark">${lineChart([item.history.up, item.history.down], { colors, width: 160, height: 28 })}</div>
            </div>`).join('')}</div>`);
        } else {
          const cols = window.matchMedia('(max-width: 760px)').matches ? 1 : lineTrendColumns(online.length);
          parts.push(`<div class="line-trend-grid" style="--line-trend-cols:${cols};--line-trend-chart-h:${density.chartH}px;--line-trend-gap:${density.gap}px">${online.map((item) => `
            <div class="chart-box">
              <div class="chart-label"><span>${escapeHtml(item.name)}</span><span class="line-trend-anchor">↑ ${fmtRate(item.upRate)} ↓ ${fmtRate(item.downRate)} · 峰值 ${fmtRate(lineTrendPeak(item))}</span></div>
              ${lineChart([item.history.up, item.history.down], { colors, height: density.chartH })}
            </div>`).join('')}</div>`);
        }
      }
      if (offline.length) {
        parts.push(`<div class="line-trend-offline"><span class="line-trend-offline-label">离线 ${fmtNumber(offline.length)} 条</span>${offline.map((item) => `<span class="line-trend-badge">${escapeHtml(item.name)}</span>`).join('')}</div>`);
      }
      return parts.length ? parts.join('') : emptyBlock(emptyText);
    }

    function recordItem(label, value) {
      return `<div class="record-item"><div class="record-label">${escapeHtml(label)}</div><div class="record-value">${value || '-'}</div></div>`;
    }

    function table(headers, rows, emptyText, indexOffset = 0) {
      const body = Array.isArray(rows) ? rows.join('') : String(rows || '');
      if (!body.trim()) return emptyBlock(emptyText);
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<table><tbody>${body}</tbody></table>`, 'text/html');
      const trList = Array.from(doc.querySelectorAll('tbody > tr'));
      if (!trList.length) return emptyBlock(emptyText);
      const cards = trList.map((tr, rowIndex) => {
        const cells = Array.from(tr.children).map((cell, cellIndex) => ({
          label: headers[cellIndex] || `字段 ${cellIndex + 1}`,
          value: cell.innerHTML && cell.innerHTML.trim() ? cell.innerHTML.trim() : '-'
        }));
        if (!cells.length) return '';
        const [primary, ...rest] = cells;
        return `
          <article class="record-card">
            <div class="record-head">
              <span class="record-index">${fmtNumber(rowIndex + 1 + indexOffset)}</span>
              <div class="record-title">
                <div class="record-label">${escapeHtml(primary.label)}</div>
                <div class="record-value">${primary.value}</div>
              </div>
            </div>
            ${rest.length ? `<div class="record-grid">${rest.map((item) => recordItem(item.label, item.value)).join('')}</div>` : ''}
          </article>`;
      }).join('');
      return cards ? `<div class="record-list">${cards}</div>` : emptyBlock(emptyText);
    }

    function compactTable(headers, rows, emptyText, className = 'ops-compact-table') {
      const body = Array.isArray(rows) ? rows.join('') : String(rows || '');
      if (!body.trim()) return emptyBlock(emptyText);
      const extraClasses = String(className || '')
        .split(/\s+/)
        .filter((name) => /^[a-z0-9_-]+$/i.test(name))
        .join(' ');
      const headerHtml = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('');
      return `<div class="ops-table-wrap"><table class="ops-table ${extraClasses}"><thead><tr>${headerHtml}</tr></thead><tbody>${body}</tbody></table></div>`;
    }

    function infoGrid(items) {
      return `<div class="info-list">${items.map((item) => `<div class="info-item"><div class="info-k">${escapeHtml(item.k)}</div><div class="info-v">${item.v}</div></div>`).join('')}</div>`;
    }

    function section(title, id, tip, body) {
      return `<section class="section" id="${id}"><div class="section-head"><div class="section-title">${title}</div><div class="section-tip">${tip || ''}</div></div>${body}</section>`;
    }

    function scaleHint(snapshot, ...keys) {
      const parts = [];
      for (const key of keys) {
        const meta = snapshot?.meta?.scale?.[key];
        if (meta && meta.hasMore) parts.push(`显示 ${fmtNumber(meta.shownCount)} / 共 ${fmtNumber(meta.totalCount)} 条`);
      }
      return parts.join('，');
    }

    function withScaleHint(snapshot, tip, ...keys) {
      const hint = scaleHint(snapshot, ...keys);
      return hint ? `${tip} · ${hint}` : tip;
    }

    function buildSnapshotAnomalyNotice(snapshot) {
      const o = snapshot?.overview || {};
      const parts = Array.isArray(o.resourceAnomaly) ? o.resourceAnomaly.filter(Boolean) : [];
      if (o.clockAnomaly) {
        const offset = Number(o.clockOffsetSeconds);
        parts.push(Number.isFinite(offset) && o.clockOffsetSeconds !== null
          ? `路由器时钟与面板相差约 ${fmtNumber(Math.round(Math.abs(offset) / 60))} 分钟，日志时间可能不可信`
          : '路由器时钟读数无法解析，日志时间可能不可信');
      }
      if (!parts.length) return '';
      return `<div class="notice danger" style="margin-bottom:12px">数据异常提醒：${escapeHtml(parts.join('；'))}。</div>`;
    }

    function tableWithFold(headers, rows, emptyText, keep = 24) {
      const list = Array.isArray(rows) ? rows : [];
      if (list.length <= keep) return table(headers, list, emptyText);
      const head = table(headers, list.slice(0, keep), emptyText);
      const tail = table(headers, list.slice(keep), '', keep);
      return `${head}<details class="ik-fold-more"><summary>展开其余 ${fmtNumber(list.length - keep)} 条（共 ${fmtNumber(list.length)} 条）</summary>${tail}</details>`;
    }

    // Fold blocks live inside a page that re-renders on every poll tick; keep
    // their expanded state across re-renders so "展开其余" stays usable.
    const FOLD_STATE_STORE_KEY = 'ikFoldOpenState.v1';

    function loadFoldStateMap() {
      try { return JSON.parse(localStorage.getItem(FOLD_STATE_STORE_KEY) || '{}'); } catch (error) { return {}; }
    }

    function restoreFoldStates() {
      const map = loadFoldStateMap();
      document.querySelectorAll('details.ik-fold-more').forEach((details, index) => {
        const key = `${currentSection}:${index}`;
        details.setAttribute('data-fold-key', key);
        if (map[key]) details.open = true;
      });
    }

    if (!window.__ikFoldEventsBound) {
      window.__ikFoldEventsBound = true;
      document.addEventListener('toggle', (event) => {
        const details = event.target;
        if (!details || !details.matches || !details.matches('details.ik-fold-more[data-fold-key]')) return;
        const map = loadFoldStateMap();
        map[details.getAttribute('data-fold-key')] = details.open;
        try { localStorage.setItem(FOLD_STATE_STORE_KEY, JSON.stringify(map)); } catch (error) {}
      }, true);
    }

    function metricCard(label, value, footA, footB) {
      return `<div class="card metric-card"><div class="metric-label">${escapeHtml(label)}</div><div class="metric-value">${value}</div><div class="metric-foot"><span>${footA || ''}</span><span>${footB || ''}</span></div></div>`;
    }

    function findCompactSummaryGrid(sectionEl) {
      if (!sectionEl || !compactTopbarSections.has(currentSection)) return null;
      if (sectionEl.querySelector(':scope > .arp-summary-sticky, :scope > .section-summary-sticky, :scope > .card > .card-body > .section-summary-sticky')) {
        return null;
      }
      const selectors = [
        ':scope > .grid-4',
        ':scope > .card > .card-body > .grid-4'
      ];
      for (const selector of selectors) {
        const candidate = sectionEl.querySelector(selector);
        if (candidate) return candidate;
      }
      return null;
    }

    function prepareCompactSection() {
      if (!appEl) return;
      const sectionEl = appEl.querySelector(`.section#${currentSection}`);
      if (!sectionEl) return;
      const summaryGrid = findCompactSummaryGrid(sectionEl);
      if (!summaryGrid || summaryGrid.closest('.section-summary-sticky')) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'section-summary-sticky';
      summaryGrid.parentNode.insertBefore(wrapper, summaryGrid);
      wrapper.appendChild(summaryGrid);
    }

    function hasCompactStickySummary() {
      return Boolean(
        compactTopbarSections.has(currentSection)
        && appEl
        && appEl.querySelector(`.section#${currentSection} .section-summary-sticky, .section#${currentSection} .arp-summary-sticky`)
      );
    }

    function syncTopMetricsVisibility() {
      if (!topMetricsEl) return;
      const hiddenForOverview = normalizeSection(currentSection) === 'overview';
      topMetricsEl.style.display = hiddenForOverview || hasCompactStickySummary() ? 'none' : '';
    }

    function ensureTopMetricsPinnedHost() {
      if (topMetricsPinnedHost && document.body.contains(topMetricsPinnedHost)) {
        return topMetricsPinnedHost;
      }
      topMetricsPinnedHost = document.createElement('div');
      topMetricsPinnedHost.id = 'topMetricsPinnedHost';
      topMetricsPinnedHost.className = 'status-strip topmetrics-fixed-host';
      topMetricsPinnedHost.setAttribute('aria-hidden', 'true');
      document.body.appendChild(topMetricsPinnedHost);
      return topMetricsPinnedHost;
    }

    function ensureCompactSummaryPinnedHost() {
      if (compactSummaryPinnedHost && document.body.contains(compactSummaryPinnedHost)) {
        return compactSummaryPinnedHost;
      }
      compactSummaryPinnedHost = document.createElement('div');
      compactSummaryPinnedHost.id = 'compactSummaryPinnedHost';
      compactSummaryPinnedHost.className = 'section-summary-fixed-host';
      compactSummaryPinnedHost.setAttribute('aria-hidden', 'true');
      document.body.appendChild(compactSummaryPinnedHost);
      return compactSummaryPinnedHost;
    }

    function setAppTopPadding(pixels) {
      if (!appEl) return;
      const nextPixels = Number(pixels);
      const nextValue = Number.isFinite(nextPixels) && nextPixels > 0 ? `${Math.ceil(nextPixels)}px` : '';
      if (appEl.style.paddingTop !== nextValue) {
        appEl.style.paddingTop = nextValue;
      }
    }

    function restoreCompactSummaryPinnedSourceState() {
      if (!compactSummaryPinnedSourceState?.el) {
        compactSummaryPinnedSourceState = null;
        return;
      }
      compactSummaryPinnedSourceState.el.style.visibility = compactSummaryPinnedSourceState.visibility;
      compactSummaryPinnedSourceState.el.style.pointerEvents = compactSummaryPinnedSourceState.pointerEvents;
      compactSummaryPinnedSourceState.el.style.marginBottom = compactSummaryPinnedSourceState.marginBottom;
      compactSummaryPinnedSourceState = null;
    }

    function clearTopMetricsPinnedState() {
      if (!frameEl) return;
      const hadPinnedTopMetrics = frameEl.classList.contains('topmetrics-fixed');
      frameEl.classList.remove('topmetrics-fixed');
      frameEl.style.removeProperty('--top-metrics-fixed-left');
      frameEl.style.removeProperty('--top-metrics-fixed-width');
      frameEl.style.removeProperty('--top-metrics-height');
      const pinnedHost = ensureTopMetricsPinnedHost();
      pinnedHost.style.display = 'none';
      pinnedHost.style.left = '';
      pinnedHost.style.width = '';
      pinnedHost.style.pointerEvents = '';
      pinnedHost.innerHTML = '';
      if (hadPinnedTopMetrics && !frameEl.classList.contains('section-summary-pinned')) {
        setAppTopPadding(0);
      }
    }

    function clearCompactSummaryPinnedState() {
      if (!frameEl) return;
      restoreCompactSummaryPinnedSourceState();
      frameEl.classList.remove('section-summary-fixed', 'section-summary-pinned');
      frameEl.style.removeProperty('--section-summary-fixed-left');
      frameEl.style.removeProperty('--section-summary-fixed-width');
      frameEl.style.removeProperty('--section-summary-height');
      const pinnedHost = ensureCompactSummaryPinnedHost();
      pinnedHost.style.display = 'none';
      pinnedHost.style.left = '';
      pinnedHost.style.width = '';
      pinnedHost.innerHTML = '';
    }

    function syncTopMetricsPinned() {
      clearTopMetricsPinnedState();
      if (!frameEl || !topMetricsEl || !topbarEl || !appEl) {
        syncTopbarOffset();
        return;
      }
      const isTerminalSection = normalizeSection(currentSection) === 'terminals';
      const hasMetrics = topMetricsEl.children.length > 0 && topMetricsEl.style.display !== 'none';
      frameEl.classList.toggle('topmetrics-pin-ready', isTerminalSection && hasMetrics);
      if (!isTerminalSection || !hasMetrics) {
        syncTopbarOffset();
        return;
      }
      const naturalRect = topMetricsEl.getBoundingClientRect();
      const naturalHeight = Math.ceil(naturalRect.height || topMetricsEl.offsetHeight || 0);
      if (!naturalHeight) {
        syncTopbarOffset();
        return;
      }
      const shouldPin = (window.scrollY || window.pageYOffset || 0) > 0;
      if (shouldPin) {
        const pinnedHost = ensureTopMetricsPinnedHost();
        frameEl.classList.add('topmetrics-fixed');
        frameEl.style.setProperty('--top-metrics-fixed-left', `${Math.round(naturalRect.left)}px`);
        frameEl.style.setProperty('--top-metrics-fixed-width', `${Math.round(naturalRect.width)}px`);
        frameEl.style.setProperty('--top-metrics-height', `${naturalHeight}px`);
        pinnedHost.innerHTML = topMetricsEl.innerHTML;
        pinnedHost.style.left = `${Math.round(naturalRect.left)}px`;
        pinnedHost.style.width = `${Math.round(naturalRect.width)}px`;
        pinnedHost.style.display = 'grid';
        setAppTopPadding(naturalHeight);
      }
      syncTopbarOffset();
    }

    function syncCompactSummaryPinned() {
      const sectionName = normalizeSection(currentSection);
      if (!frameEl || !appEl || sectionName === 'overview') {
        clearCompactSummaryPinnedState();
        syncTopbarOffset();
        return;
      }
      const sectionEl = appEl.querySelector(`.section#${currentSection}`);
      if (!sectionEl) {
        clearCompactSummaryPinnedState();
        syncTopbarOffset();
        return;
      }
      const summaryEl = sectionEl.querySelector(':scope > .section-summary-sticky, :scope > .arp-summary-sticky, :scope > .readonly-diagnostics-root > .section-summary-sticky, :scope > .card > .card-body > .section-summary-sticky');
      if (!summaryEl || !frameEl.classList.contains('scroll-snap-free')) {
        clearCompactSummaryPinnedState();
        syncTopbarOffset();
        return;
      }
      const naturalRect = summaryEl.getBoundingClientRect();
      const naturalHeight = Math.ceil(naturalRect.height || summaryEl.offsetHeight || 0);
      const scrollTop = window.scrollY || window.pageYOffset || 0;
      const summaryDocumentTop = Math.round(scrollTop + naturalRect.top);
      const storedPinStart = compactSummaryPinStartBySection.get(currentSection);
      const pinStart = Number.isFinite(storedPinStart) ? storedPinStart : summaryDocumentTop;
      const shouldPin = naturalHeight > 0 && scrollTop >= Math.max(24, pinStart);
      if (!shouldPin) {
        compactSummaryPinStartBySection.set(currentSection, summaryDocumentTop);
        clearCompactSummaryPinnedState();
        syncTopbarOffset();
        return;
      }
      const pinnedHost = ensureCompactSummaryPinnedHost();
      frameEl.classList.add('section-summary-pinned');
      frameEl.style.setProperty('--section-summary-fixed-left', `${Math.round(naturalRect.left)}px`);
      frameEl.style.setProperty('--section-summary-fixed-width', `${Math.round(naturalRect.width)}px`);
      frameEl.style.setProperty('--section-summary-height', `${naturalHeight}px`);
      pinnedHost.style.left = `${Math.round(naturalRect.left)}px`;
      pinnedHost.style.width = `${Math.round(naturalRect.width)}px`;
      pinnedHost.style.display = 'block';
      const needsCloneRefresh = compactSummaryPinnedSourceState?.el !== summaryEl || pinnedHost.childElementCount === 0;
      if (needsCloneRefresh) {
        restoreCompactSummaryPinnedSourceState();
        const summaryClone = summaryEl.cloneNode(true);
        summaryClone.style.position = 'static';
        summaryClone.style.top = 'auto';
        summaryClone.style.zIndex = 'auto';
        summaryClone.style.margin = '0';
        const readonlyFeatureSticky = summaryEl.classList.contains('readonly-feature-sticky');
        summaryClone.style.pointerEvents = readonlyFeatureSticky ? 'auto' : 'none';
        pinnedHost.style.pointerEvents = readonlyFeatureSticky ? 'auto' : '';
        pinnedHost.innerHTML = '';
        pinnedHost.appendChild(summaryClone);
        compactSummaryPinnedSourceState = {
          el: summaryEl,
          visibility: summaryEl.style.visibility,
          pointerEvents: summaryEl.style.pointerEvents,
          marginBottom: summaryEl.style.marginBottom
        };
      }
      summaryEl.style.visibility = 'hidden';
      summaryEl.style.pointerEvents = 'none';
      summaryEl.style.marginBottom = '0px';
      syncTopbarOffset();
    }

    function syncTopbarOffset() {
      if (!topbarEl) return;
      const compactStickySummary = frameEl
        && (frameEl.classList.contains('page-compact-topbar') || frameEl.classList.contains('arp-compact'))
        && hasCompactStickySummary();
      const topbarHeight = (frameEl?.classList.contains('topmetrics-fixed') || compactStickySummary) ? 0 : topbarEl.offsetHeight;
      document.documentElement.style.setProperty('--topbar-height', `${topbarHeight}px`);
    }

    function applySectionTopbarState() {
      if (!frameEl) return;
      const scrollSnapFree = hasCompactStickySummary();
      frameEl.classList.toggle('scroll-snap-free', scrollSnapFree);
      const compact = false;
      frameEl.classList.toggle('page-compact-topbar', compact);
      frameEl.classList.toggle('arp-compact', compact && currentSection === 'arp');
      syncTopMetricsVisibility();
      syncTopMetricsPinned();
      syncCompactSummaryPinned();
    }

    function syncSectionTopbarState() {
      if (sectionTopbarStateRaf) {
        cancelAnimationFrame(sectionTopbarStateRaf);
        sectionTopbarStateRaf = 0;
      }
      applySectionTopbarState();
    }

    function scheduleSectionTopbarState() {
      if (!frameEl || sectionTopbarStateRaf) return;
      sectionTopbarStateRaf = requestAnimationFrame(() => {
        sectionTopbarStateRaf = 0;
        applySectionTopbarState();
      });
    }

    function updateRefreshMeta() {
      if (!refreshModeTextEl || !nextRefreshTextEl) return;
      if (IS_TEST_MODE) {
        refreshModeTextEl.textContent = '测试快照';
        nextRefreshTextEl.textContent = '浏览器静态验收';
        return;
      }
      if (pendingSnapshot && hasInteractionLock()) {
        refreshModeTextEl.textContent = '新数据已获取';
        nextRefreshTextEl.textContent = '当前正在查看内容，暂缓覆盖页面';
        return;
      }
      refreshModeTextEl.textContent = refreshTriggerText(lastRefreshMode);
      if (!nextRefreshAt) {
        nextRefreshTextEl.textContent = '后台秒级采集';
        return;
      }
      const remainMs = Math.max(0, nextRefreshAt - Date.now());
      nextRefreshTextEl.textContent = remainMs < 1000 ? '即将采集新数据' : `${Math.ceil(remainMs / 1000)} 秒后采集`;
    }

    function renderTopMetrics(snapshot) {
      const metrics = buildTopMetrics(snapshot);
      const meta = pageMeta[currentSection];
      topMetricsEl.innerHTML = metrics.length ? metrics.map(([k, v]) => `<div class="status-pill"><div class="status-k">${k}</div><div class="status-v">${v}</div></div>`).join('') : '';
      pageTitleEl.textContent = meta.title;
      setPageSubtitle('');
      updateTextEl.textContent = snapshot.status === 'ok' ? `最后更新 ${snapshot.updatedAt}` : `采集异常 ${snapshot.updatedAt || ''}`;
      healthDotEl.className = `dot ${snapshot.status === 'ok' ? '' : 'danger'}`;
      updateRefreshMeta();
      syncSectionTopbarState();
    }

    function overviewRankPollText(snapshot) {
      const seconds = Number(snapshot?.meta?.pollSeconds || REALTIME_REFRESH_SECONDS || 1);
      return `每 ${escapeHtml(String(seconds))}s 自动刷新`;
    }

    const OVERVIEW_TERMINAL_RANK_LIMIT = 8;
    const OVERVIEW_INTERFACE_RANK_LIMIT = 8;

    function buildOverviewRankData(snapshot) {
      const connections = snapshot?.connections || {};
      const terminals = snapshot?.terminals || [];
      const interfaces = snapshot?.interfaces || [];
      const terminalSource = terminals.length ? terminals : (connections.topIps || []);
      const rankedTerminals = terminalSource
        .slice()
        .filter((row) => totalTrafficRate(row) > 0 || Number(row.connections || 0) > 0)
        .sort((a, b) => {
          const trafficDiff = totalTrafficRate(b) - totalTrafficRate(a);
          if (trafficDiff !== 0) return trafficDiff;
          return Number(b.connections || 0) - Number(a.connections || 0);
        })
        .slice(0, OVERVIEW_TERMINAL_RANK_LIMIT);
      const terminalRows = rankedTerminals.map((row) => {
        const name = displayNameFor(row, row.ip || '-').displayName;
        return `<tr>
          <td><b>${escapeHtml(name)}</b><div class="subtle">${escapeHtml(row.ip || '-')}</div></td>
          <td>${fmtRate(row.upRate)}</td>
          <td>${fmtRate(row.downRate)}</td>
          <td>${fmtNumber(row.connections || 0)}</td>
        </tr>`;
      }).join('');
      const rankedInterfaces = interfaces
        .slice()
        .sort((a, b) => totalTrafficRate(b, 'txRate', 'rxRate') - totalTrafficRate(a, 'txRate', 'rxRate'))
        .slice(0, OVERVIEW_INTERFACE_RANK_LIMIT);
      const interfaceRows = rankedInterfaces.map((row) => `<tr>
        <td><b>${escapeHtml(row.name)}</b><div class="subtle">${escapeHtml(row.type || '-')}</div></td>
        <td>${tag(row.role || '-', row.role === 'WAN' ? 'info' : 'ok')}</td>
        <td>${row.disabled ? tag('停用', 'warn') : row.running ? tag('在线', 'ok') : tag('离线', 'danger')}</td>
        <td>${fmtRate(row.txRate)}</td>
        <td>${fmtRate(row.rxRate)}</td>
      </tr>`).join('');
      return { rankedTerminals, rankedInterfaces, terminalRows, interfaceRows };
    }

    function renderOverviewRankGrid(snapshot) {
      const { rankedTerminals, rankedInterfaces, terminalRows, interfaceRows } = buildOverviewRankData(snapshot);
      const pollText = overviewRankPollText(snapshot);
      return `<div class="ik-home-rank-grid" data-overview-rank-grid>
        <div class="ik-home-rank-card" data-overview-rank-card="terminal">
          <div class="ik-home-rank-card-head"><div class="ik-home-rank-card-title">终端流量排行</div><div class="subtle">${fmtNumber(rankedTerminals.length)} 台 · ${pollText}</div></div>
          ${compactTable(['名称 / IP', '实时上行', '实时下行', '连接'], terminalRows, '当前未采集到终端流量排行', 'ik-home-rank-table')}
        </div>
        <div class="ik-home-rank-card" data-overview-rank-card="interface">
          <div class="ik-home-rank-card-head"><div class="ik-home-rank-card-title">接口吞吐排行</div><div class="subtle">${fmtNumber(rankedInterfaces.length)} 个接口 · ${pollText}</div></div>
          ${compactTable(['接口', '角色', '状态', '实时上行', '实时下行'], interfaceRows, '当前未采集到接口吞吐排行', 'ik-home-rank-table')}
        </div>
      </div>`;
    }

    function refreshOverviewRankGrid(snapshot) {
      if (!appEl || !snapshot) return false;
      const overviewEl = appEl.querySelector('#overview');
      const currentGrid = overviewEl?.querySelector('[data-overview-rank-grid]');
      if (!currentGrid) return false;
      const scrollState = {};
      currentGrid.querySelectorAll('[data-overview-rank-card]').forEach((card) => {
        const key = card.getAttribute('data-overview-rank-card');
        const scroller = card.querySelector('.ops-table-wrap');
        if (key && scroller) scrollState[key] = scroller.scrollTop;
      });
      currentGrid.outerHTML = renderOverviewRankGrid(snapshot);
      const nextGrid = overviewEl.querySelector('[data-overview-rank-grid]');
      Object.entries(scrollState).forEach(([key, top]) => {
        const scroller = nextGrid?.querySelector(`[data-overview-rank-card="${key}"] .ops-table-wrap`);
        if (scroller) scroller.scrollTop = top;
      });
      return Boolean(nextGrid);
    }

    function resolveOverviewWanSelection(pppoe) {
      const rows = Array.isArray(pppoe) ? pppoe : [];
      const selected = rows.find((row) => row.name === currentOverviewWanLine) || null;
      if (currentOverviewWanLine !== 'aggregate' && !selected) {
        currentOverviewWanLine = 'aggregate';
      }
      return { key: selected ? selected.name : 'aggregate', line: selected };
    }

    function renderOverviewWanLineSwitch(pppoe, selectedKey) {
      const rows = Array.isArray(pppoe) ? pppoe : [];
      const lineOptions = rows.map((row) => {
        const selected = row.name === selectedKey ? ' selected' : '';
        const state = row.running ? '在线' : '离线';
        return `<option value="${escapeHtml(row.name)}"${selected}>${escapeHtml(row.name)} · ${state} · ${fmtRate(totalTrafficRate(row))}</option>`;
      }).join('');
      const disabled = rows.length ? '' : ' disabled';
      return `<div class="ik-wan-switch" data-overview-wan-switch>
        <span class="ik-wan-switch-label">切换线路</span>
        <select class="ik-wan-line-select" data-overview-wan-line aria-label="切换 WAN 线路"${disabled}>
          <option value="aggregate"${selectedKey === 'aggregate' ? ' selected' : ''}>聚合全部线路</option>
          ${lineOptions}
        </select>
      </div>`;
    }

    renderOverview = function renderOverviewIkuai(snapshot) {
      const o = snapshot.overview || {};
      const history = o.history || {};
      const pppoe = typeof sortPppoeNamedRows === 'function'
        ? sortPppoeNamedRows(snapshot.pppoe || [])
        : (snapshot.pppoe || []).slice();
      const interfaces = snapshot.interfaces || [];
      const terminals = snapshot.terminals || [];
      const connections = snapshot.connections || {};
      const activePppoe = pppoe.filter((row) => row.running).length;
      const firstLine = pppoe.find((row) => row.running) || pppoe[0] || null;
      const busiestLine = pppoe.slice().sort((a, b) => totalTrafficRate(b) - totalTrafficRate(a))[0] || null;
      const wanRates = {
        up: Number(o.uplinkBps || 0),
        down: Number(o.downlinkBps || 0)
      };
      const totalWanUpBytes = pppoe.reduce((sum, row) => sum + Number(row?.txBytes || 0), 0);
      const totalWanDownBytes = pppoe.reduce((sum, row) => sum + Number(row?.rxBytes || 0), 0);
      const onlineTerminals = Number(o.onlineTerminals || terminals.filter((row) => ['reachable', 'delay'].includes(row.status)).length || 0);
      const terminalGroups = {
        active: terminals.filter((row) => ['reachable', 'delay'].includes(row.status)).length,
        keepAlive: terminals.filter((row) => row.status === 'stale').length,
        offline: terminals.filter((row) => ['failed', 'incomplete'].includes(row.status)).length
      };
      const connectionTotal = Number(o.connectionTotal || connections.total || 0);
      const activeSessions = (connections.active || []).length;
      const sampleCount = Math.max(
        history.cpu?.length || 0,
        history.memory?.length || 0,
        history.disk?.length || 0,
        history.uplink?.length || 0,
        history.downlink?.length || 0
      );
      const pollText = snapshot.meta?.pollSeconds ? `${escapeHtml(String(snapshot.meta.pollSeconds))}s / 点` : '未采集';
      const resourceMeta = `${fmtNumber(sampleCount)} 点 · ${pollText}`;
      const wanAddressText = firstLine?.addresses?.length
        ? firstLine.addresses.map(escapeHtml).join('<br>')
        : '未采集';
      const wanSelection = resolveOverviewWanSelection(pppoe);
      const selectedWanLine = wanSelection.line;
      const wanPanelRates = selectedWanLine
        ? { up: Number(selectedWanLine.upRate || 0), down: Number(selectedWanLine.downRate || 0) }
        : wanRates;
      const wanPanelUpBytes = selectedWanLine ? Number(selectedWanLine.txBytes || 0) : totalWanUpBytes;
      const wanPanelDownBytes = selectedWanLine ? Number(selectedWanLine.rxBytes || 0) : totalWanDownBytes;
      const wanPanelUpHistory = selectedWanLine ? (selectedWanLine.history?.up || []) : (history.uplink || []);
      const wanPanelDownHistory = selectedWanLine ? (selectedWanLine.history?.down || []) : (history.downlink || []);
      const wanPanelAddressText = selectedWanLine?.addresses?.length
        ? selectedWanLine.addresses.map(escapeHtml).join('<br>')
        : wanAddressText;
      const wanPanelTitle = selectedWanLine ? '单线路状态' : '宽带聚合状态';
      const wanPanelMain = selectedWanLine ? escapeHtml(selectedWanLine.name) : `${fmtNumber(activePppoe)} / ${fmtNumber(pppoe.length)}`;
      const wanPanelSub = selectedWanLine
        ? `${selectedWanLine.running ? '在线' : '离线'} · ${escapeHtml(selectedWanLine.parent || '未采集')} · ${fmtRate(totalTrafficRate(selectedWanLine))}`
        : (firstLine ? `首条在线 ${escapeHtml(firstLine.name)} · ${fmtRate(totalTrafficRate(firstLine))}` : '当前未采集到在线宽带');
      const wanPanelAccessText = selectedWanLine
        ? escapeHtml(selectedWanLine.name)
        : (pppoe.length > 1 ? '多线 PPPoE' : firstLine ? 'PPPoE' : '未采集');
      const wanUpChartLabel = selectedWanLine ? `${selectedWanLine.name} 上行速率` : 'WAN 上行速率';
      const wanDownChartLabel = selectedWanLine ? `${selectedWanLine.name} 下行速率` : 'WAN 下行速率';
      const syncState = o.ntpStatus === 'synchronized'
        ? tag('已同步', 'ok')
        : o.ntpStatus
          ? tag(o.ntpStatus, 'warn')
          : '未采集';
      const statusTiles = [
        { label: '设备', value: escapeHtml(o.identity || snapshot.meta?.target || '未采集'), meta: escapeHtml(o.boardName || snapshot.meta?.routerHost || '-') },
        { label: 'RouterOS', value: escapeHtml(o.version || '未采集'), meta: escapeHtml(o.architecture || '-') },
        { label: '运行时间', value: escapeHtml(o.uptime || '未采集'), meta: escapeHtml(o.systemTime || '-') },
        { label: '在线宽带', value: `${fmtNumber(activePppoe)} / ${fmtNumber(pppoe.length)}`, meta: 'PPPoE 线路' },
        { label: '在线终端', value: fmtNumber(onlineTerminals), meta: `终端总数 ${fmtNumber(terminals.length)}` },
        { label: '连接数', value: fmtCompact(connectionTotal), meta: `活跃会话 ${fmtNumber(activeSessions)}` },
        { label: 'CPU', value: fmtPercent(o.cpuLoad), meta: escapeHtml(o.cpuModel || '未采集') },
        { label: '内存 / 磁盘', value: `${fmtPercent(o.memoryUsage)} / ${fmtPercent(o.diskUsage)}`, meta: `${fmtBytes(o.memoryUsedBytes)} / ${fmtBytes(o.diskUsedBytes)}` }
      ].map((item) => `
        <div class="ik-home-status-tile">
          <span>${item.label}</span>
          <strong>${item.value}</strong>
          <em>${item.meta}</em>
        </div>`).join('');
      const quickLinks = [
        ['interfaces', 'ik-line', '接口总览'],
        ['dhcp', 'ik-terminal', 'DHCP 服务'],
        ['dns4', 'ik-dns', 'DNS IPv4'],
        ['dns6', 'ik-dns', 'DNS IPv6'],
        ['routes', 'ik-route', '静态路由'],
        ['balance', 'ik-balance', '分流监控'],
        ['security', 'ik-security', 'ACL 规则'],
        ['logs', 'ik-log', '日志中心'],
        ['trafficLoad', 'ik-load', '流量负载']
      ].map(([sectionName, icon, label]) => `
        <a class="ik-quick-link" href="#${sectionName}" data-section="${sectionName}">
          <span class="ik-menu-icon ${icon}"></span>
          <span>${label}</span>
        </a>`).join('');
      const lineTotalRate = pppoe.reduce((sum, row) => sum + totalTrafficRate(row), 0);
      const lineShareBars = pppoe.slice(0, 8).map((row) => {
        // Single line with no traffic is 100% of the observed share, not 0%.
        const share = lineTotalRate ? (totalTrafficRate(row) / lineTotalRate) * 100 : pppoe.length === 1 ? 100 : 0;
        return `<div class="line-bar">
          <div class="line-name">${escapeHtml(row.name)}</div>
          ${progress(share)}
          <div class="line-share">${share.toFixed(1)}%</div>
        </div>`;
      }).join('');
      const hiddenLineCount = Math.max(0, pppoe.length - 8);
      const lineShareBlock = lineShareBars
        ? `<div class="ik-home-line-bars">${lineShareBars}</div>${hiddenLineCount ? `<div class="subtle" style="margin-top:6px">另 ${fmtNumber(hiddenLineCount)} 条线路未计入占比条（共 ${fmtNumber(pppoe.length)} 条）</div>` : ''}`
        : emptyBlock('当前未采集到 PPPoE 线路占比');

      return section('系统首页', 'overview', '只读运维仪表盘：WAN、终端、连接、资源和排行集中展示', `
        ${buildSnapshotAnomalyNotice(snapshot)}
        <div class="ik-home-status-grid">${statusTiles}</div>
        <div class="ik-home-layout">
          <div class="stack">
            <div class="card wide-card ik-wan-info-card">
              <div class="card-head"><div class="card-title">WAN 信息</div><div class="subtle">只读展示</div></div>
              <div class="card-body">
                <div class="ik-wan-hero">
                  <div>
                    <div class="ik-wan-title">${wanPanelTitle}</div>
                    <div class="ik-wan-main">${wanPanelMain}</div>
                    <div class="ik-wan-sub">${wanPanelSub}</div>
                  </div>
                  <div class="ik-wan-chipline">
                    <span class="ik-wan-chip">上行 ${fmtRate(wanPanelRates.up)}</span>
                    <span class="ik-wan-chip">下行 ${fmtRate(wanPanelRates.down)}</span>
                  </div>
                  ${renderOverviewWanLineSwitch(pppoe, wanSelection.key)}
                </div>
                ${infoGrid([
                  {k:'WAN IP', v: wanPanelAddressText},
                  {k:'接入方式', v: wanPanelAccessText},
                  {k:'运行时间', v: escapeHtml(o.uptime || '未采集')},
                  {k:'累计上行流量', v: fmtBytes(wanPanelUpBytes)},
                  {k:'累计下行流量', v: fmtBytes(wanPanelDownBytes)},
                  {k:'实时上行速率', v: fmtRate(wanPanelRates.up)},
                  {k:'实时下行速率', v: fmtRate(wanPanelRates.down)},
                  {k:'同步状态', v: syncState}
                ])}
                <div class="ik-wan-rate-split">
                  ${wanRateSplitCard(wanUpChartLabel, wanPanelRates.up, wanPanelUpHistory, '#165dff', pollText)}
                  ${wanRateSplitCard(wanDownChartLabel, wanPanelRates.down, wanPanelDownHistory, '#16c67a', pollText)}
                </div>
              </div>
            </div>
            <div class="card wide-card ik-home-terminal-card">
              <div class="card-head"><div class="card-title">终端数量</div><div class="subtle">当前在线状态</div></div>
              <div class="card-body">
                <div class="ik-home-terminal-grid">
                  <div class="ik-home-terminal-tile"><div class="subtle">活跃</div><b>${fmtNumber(terminalGroups.active)}</b></div>
                  <div class="ik-home-terminal-tile"><div class="subtle">待机</div><b>${fmtNumber(terminalGroups.keepAlive)}</b></div>
                  <div class="ik-home-terminal-tile"><div class="subtle">离线 / 失败</div><b>${fmtNumber(terminalGroups.offline)}</b></div>
                </div>
                <div class="ik-summary-box" style="margin-top:8px"><div class="subtle">RouterOS 在线终端</div><b>${fmtNumber(onlineTerminals)}</b></div>
              </div>
            </div>
            <div class="card wide-card ik-home-quick-card">
              <div class="card-head"><div class="card-title">快速入口</div><div class="subtle">常用只读页面</div></div>
              <div class="card-body">
                <div class="ik-quick-grid">${quickLinks}</div>
              </div>
            </div>
          </div>
          <div class="ik-home-main">
            <div class="card">
              <div class="card-head"><div class="card-title">实时速率趋势</div><div class="subtle">最近采样窗口</div></div>
              <div class="card-body">
                <div class="ik-wan-rate-split is-main">
                  ${wanRateSplitCard('实时上行速率', wanRates.up, history.uplink || [], '#165dff', pollText)}
                  ${wanRateSplitCard('实时下行速率', wanRates.down, history.downlink || [], '#16c67a', pollText)}
                </div>
              </div>
            </div>
            <div class="card ik-system-load-card">
              <div class="card-head"><div class="card-title">系统负载</div><div class="subtle">CPU / 内存 / 磁盘分图</div></div>
              <div class="card-body">
                ${resourceTrendGrid(o, resourceMeta)}
              </div>
            </div>
            <div class="card">
              <div class="card-head"><div class="card-title">宽带状态摘要</div><div class="subtle">真实 PPPoE 与连接状态</div></div>
              <div class="card-body">
                <div class="ik-home-summary-grid">
                  <div class="ik-summary-box"><div class="subtle">在线宽带</div><b>${fmtNumber(activePppoe)} / ${fmtNumber(pppoe.length)}</b></div>
                  <div class="ik-summary-box"><div class="subtle">最忙线路</div><b>${busiestLine ? escapeHtml(busiestLine.name) : '未采集'}</b></div>
                  <div class="ik-summary-box"><div class="subtle">总上行</div><b>${fmtRate(wanRates.up)}</b></div>
                  <div class="ik-summary-box"><div class="subtle">总下行</div><b>${fmtRate(wanRates.down)}</b></div>
                  <div class="ik-summary-box"><div class="subtle">累计上行</div><b>${fmtBytes(totalWanUpBytes)}</b></div>
                  <div class="ik-summary-box"><div class="subtle">累计下行</div><b>${fmtBytes(totalWanDownBytes)}</b></div>
                  <div class="ik-summary-box"><div class="subtle">连接数</div><b>${fmtCompact(connectionTotal)}</b></div>
                  <div class="ik-summary-box"><div class="subtle">活跃会话</div><b>${fmtNumber(activeSessions)}</b></div>
                </div>
                ${lineShareBlock}
              </div>
            </div>
            <div class="card">
              <div class="card-head"><div class="card-title">流量排行</div><div class="subtle">实时排行 · 可滚动查看</div></div>
              <div class="card-body">
                ${renderOverviewRankGrid(snapshot)}
              </div>
            </div>
          </div>
        </div>`);
    };

    function renderInterfaces(snapshot) {
      currentInterfaceView = normalizeInterfaceView(currentInterfaceView);
      currentInterfaceTopology = normalizeInterfaceTopology(currentInterfaceTopology);
      const interfaces = snapshot.interfaces || [];
      const pppoe = snapshot.pppoe || [];
      const interfaceByName = Object.fromEntries(interfaces.map((row) => [row.name, row]));
      const runningWan = pppoe.filter((row) => row.running).length;
      const runningLan = interfaces.filter((row) => row.role === 'LAN' && row.running).length;
      const virtualCount = interfaces.filter((row) => ['wg', 'loopback', 'l2tp-out'].includes(row.type)).length;
      const detectedHealthy = pppoe.filter((row) => row.running && row.addresses.length && row.routes.some((route) => route.active)).length;
      const abnormalLines = pppoe.filter((row) => {
        const parent = interfaceByName[row.parent] || {};
        return !row.running || !row.addresses.length || ((parent.rxDrop || 0) + (parent.txDrop || 0) + (parent.rxError || 0) + (parent.txError || 0)) > 0;
      }).length;
      const ipv6Interfaces = interfaces.filter((row) => row.ips.some((ip) => String(ip).includes(':')));
      const virtualInterfaceTypes = new Set(['wg', 'loopback', 'l2tp-out', 'vlan', 'macvlan']);
      const physicalLanInterfaces = interfaces.filter((row) => row.role === 'LAN' && !virtualInterfaceTypes.has(String(row.type || '').toLowerCase()));
      const virtualInterfaces = interfaces.filter((row) => virtualInterfaceTypes.has(String(row.type || '').toLowerCase()));
      const topologyLevel = (warnCount, dangerCount, onlineCount, totalCount) => {
        if (dangerCount > 0) return 'danger';
        if (warnCount > 0) return 'warn';
        if (onlineCount > 0) return 'ok';
        return totalCount > 0 ? 'warn' : 'muted';
      };
      const wanTopologyItems = pppoe.map((row) => {
        const parent = interfaceByName[row.parent] || {};
        const dropTotal = Number(parent.txDrop || 0) + Number(parent.rxDrop || 0);
        const errorTotal = Number(parent.txError || 0) + Number(parent.rxError || 0);
        const hasActiveRoute = (row.routes || []).some((route) => route.active);
        const hasIp = (row.addresses || []).length > 0;
        const isOnline = Boolean(row.running);
        const isWarn = isOnline && (!hasIp || !hasActiveRoute || dropTotal > 0 || errorTotal > 0);
        const level = !isOnline ? 'danger' : isWarn ? 'warn' : 'ok';
        const issueParts = [];
        if (!hasIp) issueParts.push('未分配地址');
        if (!hasActiveRoute) issueParts.push('无活动默认路由');
        if (dropTotal > 0) issueParts.push(`丢包 ${fmtNumber(dropTotal)}`);
        if (errorTotal > 0) issueParts.push(`错误 ${fmtNumber(errorTotal)}`);
        return {
          name: row.name,
          type: 'PPPoE',
          level,
          running: isOnline,
          upRate: Number(row.upRate || 0),
          downRate: Number(row.downRate || 0),
          txBytes: Number(row.txBytes || 0),
          rxBytes: Number(row.rxBytes || 0),
          addresses: row.addresses || [],
          mac: parent.mac || '-',
          extra: row.parent || '-',
          issue: issueParts.join(' / ') || '状态正常'
        };
      });
      const interfaceTopologyItems = (rows, label) => rows.map((row) => {
        const dropTotal = Number(row.txDrop || 0) + Number(row.rxDrop || 0);
        const errorTotal = Number(row.txError || 0) + Number(row.rxError || 0);
        const hasIp = (row.ips || []).length > 0;
        const isOnline = Boolean(row.running);
        const isWarn = isOnline && (dropTotal > 0 || errorTotal > 0 || (!hasIp && label !== 'VNET'));
        const level = !isOnline ? 'danger' : isWarn ? 'warn' : 'ok';
        const issueParts = [];
        if (!hasIp && label !== 'VNET') issueParts.push('无地址');
        if (dropTotal > 0) issueParts.push(`丢包 ${fmtNumber(dropTotal)}`);
        if (errorTotal > 0) issueParts.push(`错误 ${fmtNumber(errorTotal)}`);
        return {
          name: row.name,
          type: row.type || label,
          level,
          running: isOnline,
          upRate: Number(row.txRate || 0),
          downRate: Number(row.rxRate || 0),
          txBytes: Number(row.txBytes || 0),
          rxBytes: Number(row.rxBytes || 0),
          addresses: row.ips || [],
          gateways: row.gateways || [],
          mac: row.mac || '-',
          extra: row.gateways?.length ? row.gateways.join(' / ') : '-',
          issue: issueParts.join(' / ') || '状态正常'
        };
      });
      const buildTopologyGroup = (key, label, items, description) => {
        const online = items.filter((item) => item.running).length;
        const warn = items.filter((item) => item.level === 'warn').length;
        const danger = items.filter((item) => item.level === 'danger').length;
        return {
          key,
          label,
          description,
          items,
          total: items.length,
          online,
          warn,
          danger,
          upRate: items.reduce((sum, item) => sum + item.upRate, 0),
          downRate: items.reduce((sum, item) => sum + item.downRate, 0),
          txBytes: items.reduce((sum, item) => sum + item.txBytes, 0),
          rxBytes: items.reduce((sum, item) => sum + item.rxBytes, 0),
          level: topologyLevel(warn, danger, online, items.length)
        };
      };
      const topologyGroups = {
        wan: buildTopologyGroup('wan', 'WAN', wanTopologyItems, '按 PPPoE 线路聚合显示广域拨号、活动路由与实时上下行'),
        lan: buildTopologyGroup('lan', 'LAN', interfaceTopologyItems(physicalLanInterfaces, 'LAN'), '按本地物理 / 桥接接口展示在线状态、地址、速率与丢包'),
        vnet: buildTopologyGroup('vnet', 'VNET', interfaceTopologyItems(virtualInterfaces, 'VNET'), '按 VLAN / WireGuard / Loopback / L2TP 等虚拟接口展示运行状态')
      };
      if (!topologyGroups[currentInterfaceTopology]?.items.length) {
        currentInterfaceTopology = topologyGroups.wan.items.length ? 'wan' : topologyGroups.lan.items.length ? 'lan' : 'vnet';
      }
      const selectedTopology = topologyGroups[currentInterfaceTopology];
      const distributionRows = sortPppoeNamedRows(snapshot.loadBalance.distribution || []);
      const distributionBlock = distributionRows.length
        ? distributionRows.map((row) => `<div class="line-bar"><div class="line-name">${escapeHtml(row.name)}</div>${progress(row.share)}<div class="line-share">${row.share.toFixed(1)}%</div></div>`).join('')
        : emptyBlock('当前未形成线路占比');
      const readonlyNotice = interfaceReadonlyOpen
        ? `<div class="notice" style="margin-bottom:12px">当前页为只读实时监控页，所有按钮只用于切换视图或触发当前页刷新，不会提交任何配置变更。</div>`
        : '';
      const lineRows = pppoe.map((row) => `
        <tr>
          <td>${escapeHtml(row.name)}</td>
          <td>${row.running ? tag('在线', 'ok') : tag('离线', 'danger')}</td>
          <td>${row.addresses.length ? row.addresses.map(escapeHtml).join('<br>') : '-'}</td>
          <td>${fmtRate(row.upRate)}</td>
          <td>${fmtRate(row.downRate)}</td>
          <td>${fmtBytes(row.txBytes)}</td>
          <td>${fmtBytes(row.rxBytes)}</td>
        </tr>`).join('');
      const ifaceRows = interfaces.map((row) => `
        <tr>
          <td>${escapeHtml(row.name)}</td>
          <td>${tag(row.role, row.role === 'WAN' ? 'info' : 'ok')}</td>
          <td>${tag(row.running ? '在线' : '离线', row.running ? 'ok' : 'danger')}</td>
          <td>${row.ips.length ? row.ips.map(escapeHtml).join('<br>') : '-'}</td>
          <td>${fmtRate(row.txRate)}</td>
          <td>${fmtRate(row.rxRate)}</td>
          <td>${fmtBytes(row.txBytes)}</td>
          <td>${fmtBytes(row.rxBytes)}</td>
          <td>${escapeHtml(row.mac)}</td>
          <td>${fmtNumber(row.txDrop + row.rxDrop)} / ${fmtNumber(row.txError + row.rxError)}</td>
        </tr>`).join('');
      const detectRows = pppoe.map((row) => {
        const parent = interfaceByName[row.parent] || {};
        const dropTotal = (parent.txDrop || 0) + (parent.rxDrop || 0);
        const errorTotal = (parent.txError || 0) + (parent.rxError || 0);
        const activeRoutes = row.routes.filter((route) => route.active);
        const routeState = activeRoutes.length
          ? activeRoutes.map((route) => `${escapeHtml(route.table || '-')}/distance ${escapeHtml(route.distance || '-')}`).join('<br>')
          : '未检测到活动默认路由';
        return `
          <tr>
            <td>${escapeHtml(row.name)}</td>
            <td>${tag(row.running ? '在线' : '离线', row.running ? 'ok' : 'danger')}</td>
            <td>${row.addresses.length ? tag('已分配', 'ok') : tag('未分配', 'warn')}</td>
            <td>${escapeHtml(row.parent || '-')}</td>
            <td>${routeState}</td>
            <td>${fmtRate(row.upRate)}</td>
            <td>${fmtRate(row.downRate)}</td>
            <td>${fmtNumber(dropTotal)} / ${fmtNumber(errorTotal)}</td>
          </tr>`;
      }).join('');
      const ipv6Rows = ipv6Interfaces.map((row) => {
        const addresses = row.ips.filter((ip) => String(ip).includes(':'));
        return `
          <tr>
            <td>${escapeHtml(row.name)}</td>
            <td>${tag(row.role, row.role === 'WAN' ? 'info' : 'ok')}</td>
            <td>${tag(row.running ? '在线' : '离线', row.running ? 'ok' : 'danger')}</td>
            <td>${addresses.map(escapeHtml).join('<br>')}</td>
            <td>${row.gateways.length ? row.gateways.map(escapeHtml).join('<br>') : '-'}</td>
            <td>${fmtRate(row.txRate)}</td>
            <td>${fmtRate(row.rxRate)}</td>
          </tr>`;
      }).join('');
      const topologyNodes = Object.values(topologyGroups).map((group) => `
        <button class="ik-device-node ${currentInterfaceTopology === group.key ? 'is-active' : ''} ${group.level === 'muted' ? 'is-muted' : `is-${group.level}`}" type="button" data-interface-topology="${group.key}">
          <span><i class="ik-device-status-dot ${group.level === 'muted' ? 'warn' : group.level}"></i></span>
          <span>${group.label}</span>
          <span class="ik-device-meta"><strong>${fmtNumber(group.online)}</strong><small>${fmtNumber(group.total)} 个对象</small></span>
        </button>`).join('');
      const topologyDetailItems = selectedTopology.key === 'wan'
        ? sortPppoeNamedRows(selectedTopology.items)
        : selectedTopology.items
          .slice()
          .sort((a, b) => ((b.upRate + b.downRate) - (a.upRate + a.downRate)));
      const topologyDetailRows = topologyDetailItems.map((item) => {
          if (selectedTopology.key === 'wan') {
            return `
              <tr>
                <td>${escapeHtml(item.name)}</td>
                <td>${tag(item.running ? '在线' : '离线', item.level === 'danger' ? 'danger' : item.level === 'warn' ? 'warn' : 'ok')}</td>
                <td>${item.addresses.length ? item.addresses.map(escapeHtml).join('<br>') : '-'}</td>
                <td>${escapeHtml(item.extra)}</td>
                <td>${fmtRate(item.upRate)}</td>
                <td>${fmtRate(item.downRate)}</td>
                <td>${fmtBytes(item.txBytes)}</td>
                <td>${fmtBytes(item.rxBytes)}</td>
                <td>${escapeHtml(item.issue)}</td>
              </tr>`;
          }
          if (selectedTopology.key === 'lan') {
            return `
              <tr>
                <td>${escapeHtml(item.name)}</td>
                <td>${tag(item.running ? '在线' : '离线', item.level === 'danger' ? 'danger' : item.level === 'warn' ? 'warn' : 'ok')}</td>
                <td>${item.addresses.length ? item.addresses.map(escapeHtml).join('<br>') : '-'}</td>
                <td>${escapeHtml(item.mac)}</td>
                <td>${fmtRate(item.upRate)}</td>
                <td>${fmtRate(item.downRate)}</td>
                <td>${fmtBytes(item.txBytes)}</td>
                <td>${fmtBytes(item.rxBytes)}</td>
                <td>${escapeHtml(item.issue)}</td>
              </tr>`;
          }
          return `
            <tr>
              <td>${escapeHtml(item.name)}</td>
              <td>${escapeHtml(item.type)}</td>
              <td>${tag(item.running ? '在线' : '离线', item.level === 'danger' ? 'danger' : item.level === 'warn' ? 'warn' : 'ok')}</td>
              <td>${item.addresses.length ? item.addresses.map(escapeHtml).join('<br>') : '-'}</td>
              <td>${fmtRate(item.upRate)}</td>
              <td>${fmtRate(item.downRate)}</td>
              <td>${fmtBytes(item.txBytes)}</td>
              <td>${fmtBytes(item.rxBytes)}</td>
              <td>${escapeHtml(item.issue)}</td>
            </tr>`;
        }).join('');
      const topologyDetailHeaders = selectedTopology.key === 'wan'
        ? ['线路', '状态', '地址', '父接口', '实时上行速率', '实时下行速率', '累计上行流量', '累计下行流量', '告警说明']
        : selectedTopology.key === 'lan'
          ? ['接口', '状态', '地址', 'MAC', '实时上行速率', '实时下行速率', '累计上行流量', '累计下行流量', '告警说明']
          : ['接口', '类型', '状态', '地址 / 路由', '实时上行速率', '实时下行速率', '累计上行流量', '累计下行流量', '告警说明'];
      const selectedRateRows = selectedTopology.key === 'wan'
        ? sortPppoeNamedRows(selectedTopology.items)
        : selectedTopology.items
          .slice()
          .sort((a, b) => ((b.upRate + b.downRate) - (a.upRate + a.downRate)));
      const selectedRateBlock = selectedTopology.items.length
        ? selectedRateRows
          .slice(0, 8)
          .map((item) => {
            const totalRate = item.upRate + item.downRate;
            const baseRate = Math.max(...selectedTopology.items.map((row) => row.upRate + row.downRate), 1);
            const percent = Math.max(2, (totalRate / baseRate) * 100);
            const gradient = item.level === 'danger'
              ? 'linear-gradient(90deg,#ff7a7a 0%,#ff4d4f 100%)'
              : item.level === 'warn'
                ? 'linear-gradient(90deg,#ffc46b 0%,#ff9f1c 100%)'
                : 'linear-gradient(90deg,#7da8ff 0%,#165dff 100%)';
            return `<div class="line-bar"><div class="line-name">${escapeHtml(item.name)}</div>${progress(percent, gradient)}<div class="line-share">${fmtRate(totalRate)}</div></div>`;
          }).join('')
        : emptyBlock(`暂无 ${selectedTopology.label} 监控对象`);
      const lineTrendRows = getLineTrendRows(pppoe);
      const lineTrendBlock = renderLineTrendGrid(lineTrendRows, {
        colors: ['#4a95ef', '#30c36b'],
        emptyText: '未检测到 PPPoE 线路历史数据'
      });
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
      let body = '';
      if (currentInterfaceView === 'detect') {
        body = `
          ${readonlyNotice}
          ${toolbar}
          <div class="grid-4">
            ${metricCard('在线线路', fmtNumber(runningWan), `总线路 ${fmtNumber(pppoe.length)} 条`, '')}
            ${metricCard('健康线路', fmtNumber(detectedHealthy), '同时满足在线 / 已分配 / 活动默认路由', '')}
            ${metricCard('异常线路', fmtNumber(abnormalLines), '离线、未分配或接口异常', '')}
            ${metricCard('IPv6 接口', fmtNumber(ipv6Interfaces.length), '仅统计真实读取到 IPv6 的接口', '')}
          </div>
          <div class="card" style="margin-top:12px">
            <div class="card-head"><div class="card-title">线路状态检测</div><div class="subtle">按当前实时状态检测</div></div>
            <div class="card-body">${tableWithFold(['线路', '拨号状态', 'IP 检测', '父接口', '默认路由', '实时上行速率', '实时下行速率', '丢包/错误'], detectRows, '暂无线路状态检测数据')}</div>
          </div>`;
      } else if (currentInterfaceView === 'ipv6') {
        body = `
          ${readonlyNotice}
          ${toolbar}
          <div class="grid-4">
            ${metricCard('IPv6 接口', fmtNumber(ipv6Interfaces.length), '当前有真实 IPv6 地址的接口', '')}
            ${metricCard('在线 IPv6 接口', fmtNumber(ipv6Interfaces.filter((row) => row.running).length), '当前运行中', '')}
            ${metricCard('在线 WAN', fmtNumber(runningWan), '实时拨号状态', '')}
            ${metricCard('在线 LAN', fmtNumber(runningLan), '实时接口状态', '')}
          </div>
          <div class="card" style="margin-top:12px">
            <div class="card-head"><div class="card-title">IPv6 线路详情</div><div class="subtle">不伪造未采集字段</div></div>
            <div class="card-body">${table(['接口', '角色', '状态', 'IPv6 地址', '网关 / 路由目标', '实时上行速率', '实时下行速率'], ipv6Rows, '当前未读取到 IPv6 线路数据')}</div>
          </div>`;
      } else {
        body = `
          <div class="ik-topology-board">
            <div class="ik-topology-grid">
              <div>
                <div class="ik-topology-nodes">
                  <div class="ik-device-node is-active"><span></span><span>WAN</span></div>
                  <div class="ik-device-node is-active"><span></span><span>LAN</span></div>
                  <div class="ik-device-node ${virtualCount ? 'is-active' : 'is-muted'}"><span></span><span>VNET</span></div>
                </div>
                <div class="ik-topology-legend">
                  <span class="legend-wan"><i></i>广域链路</span>
                  <span class="legend-lan"><i></i>本地接口</span>
                  <span class="legend-ok"><i></i>在线</span>
                  <span class="legend-warn"><i></i>预警</span>
                  <span class="legend-bad"><i></i>异常</span>
                </div>
              </div>
              <div class="ik-topology-side">
                <div class="ik-topology-stat"><b>${fmtNumber(runningWan)}</b><span class="subtle">在线 WAN</span></div>
                <div class="ik-topology-stat"><b>${fmtNumber(runningLan)}</b><span class="subtle">在线 LAN</span></div>
                <div class="ik-topology-stat"><b>${fmtNumber(detectedHealthy)}</b><span class="subtle">健康线路</span></div>
              </div>
            </div>
          </div>
          ${readonlyNotice}
          ${toolbar}
          <div class="card" style="margin-top:12px">
            <div class="card-head"><div class="card-title">线路核心流量</div><div class="subtle">优先展示实时上下行与累计流量</div></div>
            <div class="card-body">${tableWithFold(['线路', '状态', 'IP 地址', '实时上行速率', '实时下行速率', '累计上行流量', '累计下行流量'], lineRows, '暂无宽带线路数据')}</div>
          </div>
          <div class="grid-2" style="margin-top:12px">
            <div class="card">
              <div class="card-head"><div class="card-title">接口流量详情</div><div class="subtle">${fmtNumber(interfaces.length)} 项</div></div>
              <div class="card-body">${tableWithFold(['接口', '角色', '状态', 'IP 地址', '实时上行速率', '实时下行速率', '累计上行流量', '累计下行流量', 'MAC', '丢包/错误'], ifaceRows, '暂无接口数据')}</div>
            </div>
            <div class="stack">
              <div class="card">
                <div class="card-head"><div class="card-title">线路带宽占比</div><div class="subtle">当前多线路分布</div></div>
                <div class="card-body stack">${distributionBlock}</div>
              </div>
              <div class="card">
                <div class="card-head"><div class="card-title">线路速率趋势</div><div class="subtle">${fmtNumber(lineTrendRows.length)} 条线路历史</div></div>
                <div class="card-body">
                  ${lineTrendBlock}
                </div>
              </div>
            </div>
          </div>`;
      }
      return section('接口总览', 'interfaces', withScaleHint(snapshot, interfaceViews[currentInterfaceView].tip, 'interfaces'), `
        <div class="card">
          <div class="card-body">
            ${tabs}
            ${body}
          </div>
        </div>`);
    }

    function renderTerminals(snapshot) {
      currentTerminalView = normalizeTerminalView(currentTerminalView);
      const allTerminals = snapshot.terminals || [];
      const ipv4Terminals = allTerminals.filter((row) => !String(row.ip || '').includes(':'));
      const ipv6Terminals = allTerminals.filter((row) => String(row.ip || '').includes(':'));
      const renderTerminalRows = (rows) => rows.map((row) => `
        <tr>
          <td>${renderEditableNameCell(row, row.ip, '未知设备')}</td>
          <td>${escapeHtml(row.ip)}</td>
          <td>${tag(row.status)}</td>
          <td>${escapeHtml(row.lastSeen || '-')}</td>
          <td>${fmtRate(row.upRate)}</td>
          <td>${fmtRate(row.downRate)}</td>
          <td>${escapeHtml(row.mac || '-')}</td>
          <td>${fmtNumber(row.connections)}</td>
          <td>${fmtBytes(row.sessionBytes)}</td>
        </tr>`).join('');
      const arpRows = snapshot.arp.items.map((row) => `
        <tr>
          <td>${escapeHtml(row.ip)}</td>
          <td>${renderEditableNameCell(row, row.ip, row.ip || '-')}</td>
          <td>${escapeHtml(row.mac)}</td>
          <td>${tag(row.type, row.type === '静态' ? 'info' : 'ok')}</td>
          <td>${tag(row.status)}</td>
          <td>${escapeHtml(toDisplayText(row.lastSeen || '-'))}</td>
        </tr>`).join('');
      const leaseRows = snapshot.dhcp.leases.map((row) => `
        <tr>
          <td>${escapeHtml(row.address)}</td>
          <td>${renderEditableNameCell(row, row.address, row.address || '-')}</td>
          <td>${escapeHtml(row.mac)}</td>
          <td>${escapeHtml(row.server)}</td>
          <td>${tag(row.status, row.status === 'bound' ? 'ok' : 'warn')}</td>
          <td>${escapeHtml(toDisplayText(row.lastSeen || '-'))}</td>
          <td>${row.static ? tag('静态', 'info') : tag('动态', 'ok')}</td>
        </tr>`).join('');
      const ipv6ActiveRows = (snapshot.connections.active || [])
        .filter((row) => String(row.localIp || '').includes(':'))
        .map((row) => `
          <tr>
            <td>${escapeHtml(row.localIp)}</td>
            <td>${escapeHtml(row.remoteIp)}</td>
            <td>${tag(row.protocol, 'info')}</td>
            <td>${fmtRate(row.upRate)}</td>
            <td>${fmtRate(row.downRate)}</td>
            <td>${escapeHtml(row.timeout)}</td>
            <td>${escapeHtml(row.mark || '-')}</td>
          </tr>`).join('');
      const ipv6Up = ipv6Terminals.reduce((sum, row) => sum + Number(row.upRate || 0), 0);
      const ipv6Down = ipv6Terminals.reduce((sum, row) => sum + Number(row.downRate || 0), 0);
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
            <span class="ik-ghost-pill">当前页监控</span>
          </div>
        </div>`;
      let body = '';
      if (currentTerminalView === 'ipv6') {
        body = `
          ${toolbar}
          <div class="grid-4">
            ${metricCard('IPv6 终端', fmtNumber(ipv6Terminals.length), '按真实本地 IPv6 活跃会话汇总', '')}
            ${metricCard('在线 IPv6 终端', fmtNumber(ipv6Terminals.filter((row) => String(row.status).toLowerCase() !== 'failed').length), '当前可观测到流量或会话', '')}
            ${metricCard('IPv6 上行速率', fmtRate(ipv6Up), '聚合实时上行', '')}
            ${metricCard('IPv6 下行速率', fmtRate(ipv6Down), '聚合实时下行', '')}
          </div>
          <div class="notice" style="margin-top:12px">IPv6 终端不依赖 ARP / DHCP 展示，当前页按真实本地 IPv6 活跃会话和实时流量汇总。</div>
          <div class="card" style="margin-top:12px">
            <div class="card-head"><div class="card-title">IPv6 终端列表</div><div class="subtle">${fmtNumber(ipv6Terminals.length)} 项</div></div>
            <div class="card-body">${table(['名称', 'IP', '状态', '最后出现', '实时上行速率', '实时下行速率', 'MAC', '连接数', '累计流量'], renderTerminalRows(ipv6Terminals), '当前未读取到 IPv6 终端数据')}</div>
          </div>
          <div class="card" style="margin-top:12px">
            <div class="card-head"><div class="card-title">IPv6 活跃会话</div><div class="subtle">仅展示当前真实会话</div></div>
            <div class="card-body">${table(['本地 IPv6', '远端地址', '协议', '实时上行速率', '实时下行速率', '超时', '连接标记'], ipv6ActiveRows, '当前未读取到 IPv6 活跃会话')}</div>
          </div>`;
      } else {
        body = `
          ${toolbar}
          ${tableWithFold(['名称', 'IP', '状态', '最后出现', '实时上行速率', '实时下行速率', 'MAC', '连接数', '累计流量'], renderTerminalRows(ipv4Terminals), '暂无在线终端监控数据')}
          ${snapshot.arp.alerts.length ? `<div style="margin-top:12px" class="notice">${snapshot.arp.alerts.map((item) => `${escapeHtml(item.kind)}：${escapeHtml(item.value)} (${escapeHtml(item.detail)})`).join('；')}</div>` : ''}
          <div class="grid-2" style="margin-top:12px">
            <div class="card"><div class="card-head"><div class="card-title">ARP 列表</div><div class="subtle">${fmtNumber(snapshot.arp.items.length)} 条</div></div><div class="card-body">${tableWithFold(['IP', '主机名', 'MAC', '类型', '状态', '最后出现'], arpRows, '暂无 ARP 数据')}</div></div>
            <div class="card"><div class="card-head"><div class="card-title">DHCP 地址池</div><div class="subtle">${fmtNumber(snapshot.dhcp.pools.length)} 组</div></div><div class="card-body"><div class="stack">${snapshot.dhcp.pools.map((pool) => `<div><div class="chart-label"><span>${escapeHtml(pool.name)}</span><span>${fmtNumber(pool.used)} / ${fmtNumber(pool.total)}</span></div>${progress(pool.usage)}</div>`).join('') || emptyBlock('暂无 DHCP 地址池')}</div></div></div>
          </div>
          <div class="card" style="margin-top:12px"><div class="card-head"><div class="card-title">DHCP 租约与静态分配</div><div class="subtle">${fmtNumber(snapshot.dhcp.leases.length)} 条</div></div><div class="card-body">${tableWithFold(['IP', '主机名', 'MAC', '服务', '状态', '最后出现', '分配方式'], leaseRows, '暂无 DHCP 数据')}</div></div>`;
      }
      const lanScope = snapshot.terminalsLanScope || {};
      const droppedOutsideLan = Math.max(0, Number(lanScope.arpOutOfScope || 0));
      const terminalScopeNotice = (!allTerminals.length && droppedOutsideLan > 0)
        ? `<div class="notice" style="margin-bottom:12px">读取到 ${fmtNumber(droppedOutsideLan)} 条 ARP 记录在路由器 LAN 网段外（共 ${fmtNumber(lanScope.arpTotal || 0)} 条）。终端列表只统计 LAN 网段内的设备，所以当前显示为 0 台。</div>`
        : '';
      return section('终端监控', 'terminals', withScaleHint(snapshot, terminalViews[currentTerminalView].tip, 'terminals', 'dhcpLeases'), `
        ${terminalScopeNotice}
        <div class="card">
          <div class="card-body">
            ${tabs}
            ${body}
          </div>
        </div>`);
    }

    function renderConnections(snapshot, config = {}) {
      const o = snapshot.overview || {};
      const sectionTitle = config.title || '连接监控';
      const sectionId = config.id || 'connections';
      const sectionTip = config.tip || '连接跟踪、协议分布与单 IP 会话排行只读展示';
      const hasProtocolBreakdown = [snapshot.connections.tcp, snapshot.connections.udp, snapshot.connections.icmp].every((value) => Number.isFinite(Number(value)));
      const protocolCards = hasProtocolBreakdown ? `
        <div class="grid-4">
          ${metricCard('全局连接总数', fmtCompact(snapshot.connections.total), '连接跟踪总量', tag(snapshot.connections.thresholdLevel === 'danger' ? '高压' : snapshot.connections.thresholdLevel === 'warning' ? '预警' : '正常', snapshot.connections.thresholdLevel))}
          ${metricCard('TCP 连接数', fmtCompact(snapshot.connections.tcp), '协议统计', '')}
          ${metricCard('UDP 连接数', fmtCompact(snapshot.connections.udp), '协议统计', '')}
          ${metricCard('ICMP 连接数', fmtCompact(snapshot.connections.icmp), '协议统计', '')}
        </div>` : `
        <div class="grid-4">
          ${metricCard('全局连接总数', fmtCompact(snapshot.connections.total), '连接跟踪总量', tag(snapshot.connections.thresholdLevel === 'danger' ? '高压' : snapshot.connections.thresholdLevel === 'warning' ? '预警' : '正常', snapshot.connections.thresholdLevel))}
          ${metricCard('活跃会话数', fmtCompact((snapshot.connections.active || []).length), '按实时有流量会话统计', '')}
          ${metricCard('连接明细刷新', snapshot.connections.detailUpdatedAt ? escapeHtml(snapshot.connections.detailUpdatedAt) : '等待采集', '明细采集较慢时延后更新', '')}
          ${metricCard('协议分布', '未展示', '当前未保留秒级真实协议拆分', '')}
        </div>`;
      const topIpRows = snapshot.connections.topIps.map((row) => `
        <tr>
          <td>${escapeHtml(row.ip)}</td>
          <td>${renderEditableNameCell(row, row.ip, row.ip || '-')}</td>
          <td>${fmtNumber(row.connections)}</td>
          <td>${fmtRate(row.upRate)}</td>
          <td>${fmtRate(row.downRate)}</td>
        </tr>`);
      const activeRows = snapshot.connections.active.map((row) => `
        <tr>
          <td>${escapeHtml(row.localIp)}</td>
          <td>${escapeHtml(row.remoteIp)}</td>
          <td>${tag(row.protocol, 'info')}</td>
          <td>${fmtRate(row.upRate)}</td>
          <td>${fmtRate(row.downRate)}</td>
          <td>${escapeHtml(row.timeout)}</td>
          <td>${escapeHtml(row.mark || '-')}</td>
        </tr>`);
      const adminRows = (o.admins || []).map((item) => `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.via)}</td>
          <td>${escapeHtml(item.address)}</td>
          <td>${escapeHtml(item.when)}</td>
        </tr>`);
      const trafficPanels = `
        <div class="card" style="margin-top:12px"><div class="card-head"><div class="card-title">单 IP 活跃连接排行</div><div class="subtle">按当前活跃会话聚合</div></div><div class="card-body">${compactTable(['本地 IP', '主机名', '活跃连接', '实时上行速率', '实时下行速率'], topIpRows, '暂无活跃连接排行')}</div></div>
        <div class="card" style="margin-top:12px"><div class="card-head"><div class="card-title">当前活跃连接列表</div><div class="subtle">限前 ${fmtNumber(snapshot.connections.active.length)} 条</div></div><div class="card-body">${compactTable(['本地 IP', '远端地址', '协议', '实时上行速率', '实时下行速率', '超时', '连接标记'], activeRows, '暂无活跃连接')}</div></div>`;
      return section(sectionTitle, sectionId, sectionTip, `
        <div style="margin-top:12px">${protocolCards}</div>
        ${trafficPanels}`);
    }

    function renderDns(snapshot) {
      const dns = snapshot.dns || {};
      const visibleRuleCount = (dns.forwardRules || []).length;
      const totalRuleCount = Number(dns.forwardRuleCount || visibleRuleCount);
      const disabledRuleLabel = dns.forwardRuleSample
        ? `示例中停用 ${fmtNumber(dns.disabledForwardRuleCount || 0)} 条`
        : `停用 ${fmtNumber(dns.disabledForwardRuleCount || 0)} 条`;
      const ruleEmptyText = totalRuleCount
        ? `已检测到 ${fmtNumber(totalRuleCount)} 条规则，当前未读取到可展示的规则明细`
        : '暂无 DNS 静态规则';
      const enabledNdCount = (dns.ipv6Nd || []).filter((row) => row.advertiseDns).length;
      const boundPrefixClients = (dns.ipv6DhcpClients || []).filter((row) => row.status === 'bound').length;
      const listText = (values, fallback = '-') => (values && values.length ? values.map(escapeHtml).join('<br>') : fallback);
      const ndRows = (dns.ipv6Nd || []).map((row) => `
        <tr>
          <td>${escapeHtml(row.interface)}</td>
          <td>${row.advertiseDns ? tag('开启', 'ok') : tag('关闭', 'warn')}</td>
          <td>${listText(row.dnsServers, '未单独指定')}</td>
          <td>${row.managed ? tag('开启', 'info') : tag('关闭', 'ok')}</td>
          <td>${row.otherConfig ? tag('开启', 'info') : tag('关闭', 'ok')}</td>
          <td>${escapeHtml(row.raLifetime || '-')}</td>
        </tr>`);
      const dhcpClientRows = (dns.ipv6DhcpClients || []).map((row) => `
        <tr>
          <td>${escapeHtml(row.interface)}</td>
          <td>${tag(row.status || '-', row.status === 'bound' ? 'ok' : 'warn')}</td>
          <td>${escapeHtml(row.pool || '-')}</td>
          <td>${escapeHtml(row.prefix || '-')}</td>
          <td>${row.usePeerDns ? tag('开启', 'ok') : tag('关闭', 'info')}</td>
          <td>${row.addDefaultRoute ? `开启 · distance ${escapeHtml(row.defaultRouteDistance || '-')}` : '关闭'}</td>
        </tr>`);
      const ruleRows = (dns.forwardRules || []).map((row) => `
        <tr>
          <td>${escapeHtml(row.name)}</td>
          <td>${tag(row.type || '-', row.disabled ? 'warn' : 'info')}</td>
          <td>${escapeHtml(row.value)}</td>
          <td>${escapeHtml(row.ttl || '-')}</td>
          <td>${row.disabled ? tag('停用', 'warn') : tag('启用', 'ok')}</td>
          <td>${escapeHtml(row.comment || '-')}</td>
        </tr>`);
      return section('DNS 监控中心', 'dns', 'DNS 状态、上游参数、IPv6 广播与静态规则全部归入 DNS 监控中心', `
        <div class="grid-4">
          ${metricCard('DNS 服务状态', tag(dns.running ? '启用' : '未启用', dns.running ? 'ok' : 'danger'), `上游 DNS ${fmtNumber((dns.servers || []).length)} 个`, dns.dohServer ? 'DoH 已配置' : 'DoH 未配置')}
          ${metricCard('静态规则总数', fmtNumber(totalRuleCount), `当前展示 ${fmtNumber(visibleRuleCount)} 条`, disabledRuleLabel)}
          ${metricCard('IPv6 ND 广播', fmtNumber(enabledNdCount), `配置接口 ${fmtNumber((dns.ipv6Nd || []).length)} 个`, '')}
          ${metricCard('IPv6 Prefix 客户端', fmtNumber(boundPrefixClients), `DHCPv6 Client ${fmtNumber((dns.ipv6DhcpClients || []).length)} 个`, '')}
        </div>
        <div class="grid-2" style="margin-top:12px">
          <div class="card"><div class="card-head"><div class="card-title">DNS 上游与 DoH 参数</div><div class="subtle">仅展示 RouterOS 实际可读参数</div></div><div class="card-body">${infoGrid([
            {k:'上游 DNS', v: listText(dns.servers, '未读取到')},
            {k:'DoH 服务器', v: dns.dohServer ? escapeHtml(dns.dohServer) : '未配置'},
            {k:'DoH 证书校验', v: dns.dohServer ? (dns.verifyDohCert ? tag('开启', 'ok') : tag('关闭', 'warn')) : '-'},
            {k:'缓存占用', v: `${fmtBytes(dns.cacheUsed || 0)} / ${fmtBytes(dns.cacheSize || 0)}`}
          ])}</div></div>
          <div class="card"><div class="card-head"><div class="card-title">IPv6 DNS / RA 概览</div><div class="subtle">来自 ND 与 DHCPv6 Client</div></div><div class="card-body">${infoGrid([
            {k:'ND 广播接口', v: fmtNumber((dns.ipv6Nd || []).length)},
            {k:'已开启广播 DNS', v: fmtNumber(enabledNdCount)},
            {k:'Prefix 已绑定', v: fmtNumber(boundPrefixClients)},
            {k:'Peer DNS 客户端', v: fmtNumber((dns.ipv6DhcpClients || []).filter((row) => row.usePeerDns).length)}
          ])}</div></div>
        </div>
        <div class="grid-2" style="margin-top:12px">
          <div class="card"><div class="card-head"><div class="card-title">IPv6 ND 广播</div><div class="subtle">${fmtNumber((dns.ipv6Nd || []).length)} 个接口</div></div><div class="card-body">${table(['接口', '广播 DNS', '显式 DNS', 'Managed', 'Other Config', 'RA 生命周期'], ndRows, '当前未读取到 IPv6 ND 广播配置')}</div></div>
          <div class="card"><div class="card-head"><div class="card-title">IPv6 DHCP Client / Prefix</div><div class="subtle">${fmtNumber((dns.ipv6DhcpClients || []).length)} 个客户端</div></div><div class="card-body">${table(['接口', '状态', '前缀池', '前缀 / 地址', 'Peer DNS', '默认路由'], dhcpClientRows, '当前未读取到 IPv6 DHCP Client')}</div></div>
        </div>
        <div class="card" style="margin-top:12px"><div class="card-head"><div class="card-title">DNS 静态规则 / 转发规则</div><div class="subtle">当前展示 ${fmtNumber(visibleRuleCount)} / ${fmtNumber(totalRuleCount)} 条</div></div><div class="card-body">${table(['名称 / 正则', '类型', '目标值', 'TTL', '状态', '备注'], ruleRows, ruleEmptyText)}</div></div>`);
    }

    function renderSecurity(snapshot, config = {}) {
      const security = snapshot.security || {};
      const sectionTitle = config.title || '安全监控中心';
      const sectionId = config.id || 'security';
      const sectionTip = config.tip || 'Filter 规则、地址名单与异常访问日志都归入安全监控中心';
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
      const alerts = (security.alerts || []).length
        ? `<div class="notice">${security.alerts.slice(0, 12).map((row) => `${escapeHtml(row.time)} · ${escapeHtml(row.topics)} · ${escapeHtml(row.message)}`).join('<br>')}</div>`
        : `<div class="notice">当前未读取到显著防火墙 / 异常访问告警。</div>`;
      return section(sectionTitle, sectionId, withScaleHint(snapshot, sectionTip, 'securityFilters', 'addressLists'), `
        <div class="grid-4">
          ${metricCard('ACL 规则数', fmtNumber((security.filters || []).length), '仅统计可读 Filter', '')}
          ${metricCard('名单条目数', fmtNumber((security.addressLists || []).length), '黑白名单 / 地址集', '')}
          ${metricCard('异常告警数', fmtNumber((security.alerts || []).length), '按日志关键字聚合', '')}
          ${metricCard('ARP 防护记录', '日志侧观察', '当前无独立 API 计数', '')}
        </div>
        <div style="margin-top:12px">${alerts}</div>
        <div class="grid-2" style="margin-top:12px">
          <div class="card"><div class="card-head"><div class="card-title">防火墙 Filter 规则</div><div class="subtle">按命中包数排序</div></div><div class="card-body">${tableWithFold(['链', '动作', '备注', '命中包', '命中流量', '状态'], filterRows, '暂无 Filter 规则数据')}</div></div>
          <div class="card"><div class="card-head"><div class="card-title">黑白名单与地址集</div><div class="subtle">仅读取已存在条目</div></div><div class="card-body">${tableWithFold(['列表名', '类别', '地址', '超时', '备注'], listRows, '暂无地址名单数据')}</div></div>
        </div>`);
    }

    function renderBalance(snapshot) {
      const lb = snapshot.loadBalance || {};
      const distributionRows = sortPppoeNamedRows(lb.distribution || []);
      const distribution = distributionRows.length
        ? distributionRows.map((row) => `<div class="line-bar"><div class="line-name">${escapeHtml(row.name)}</div>${progress(row.share)}<div class="line-share">${Number(row.share || 0).toFixed(1)}%</div></div>`).join('')
        : emptyBlock('当前未形成线路流量分布');
      const routeRows = (lb.defaultRoutes || []).map((row) => `
        <tr>
          <td>${escapeHtml(row.gateway)}</td>
          <td>${escapeHtml(row.distance)}</td>
          <td>${escapeHtml(row.table)}</td>
          <td>${row.active ? tag('活动', 'ok') : tag('待机', 'warn')}</td>
          <td>${escapeHtml(row.comment || '-')}</td>
        </tr>`);
      const mangleRows = (lb.mangleRules || []).map((row) => `
        <tr>
          <td>${escapeHtml(row.chain)}</td>
          <td>${escapeHtml(row.action)}</td>
          <td>${escapeHtml(row.newRoutingMark || '-')}</td>
          <td>${escapeHtml(row.comment || '-')}</td>
          <td>${fmtCompact(row.packets)}</td>
          <td>${fmtBytes(row.bytes)}</td>
        </tr>`);
      const ruleRows = (lb.routingRules || []).map((row) => `
        <tr>
          <td>${escapeHtml(row.action)}</td>
          <td>${escapeHtml(row.table)}</td>
          <td>${escapeHtml(row.srcAddress)}</td>
          <td>${escapeHtml(row.dstAddress)}</td>
          <td>${row.disabled || row.inactive ? tag('未生效', 'warn') : tag('生效', 'ok')}</td>
          <td>${escapeHtml(row.comment || '-')}</td>
        </tr>`);
      return section('分流监控中心', 'balance', withScaleHint(snapshot, '默认路由、Mangle 分流规则与策略路由全部归入分流监控中心', 'pppoe', 'mangleRules'), `
        <div class="grid-4">
          ${metricCard('负载模式', escapeHtml(lb.mode || '-'), lb.pccDetected ? '检测到 PCC 分流' : '未检测到 PCC', '')}
          ${metricCard('活动线路数', fmtNumber(lb.activeLines), '基于默认路由活动态', '')}
          ${metricCard('默认路由数', fmtNumber((lb.defaultRoutes || []).length), '0.0.0.0/0', '')}
          ${metricCard('分流规则数', fmtNumber((lb.mangleRules || []).length), 'Mangle / Mark Routing', '')}
        </div>
        <div class="grid-2" style="margin-top:12px">
          <div class="card"><div class="card-head"><div class="card-title">线路流量占比</div><div class="subtle">实时速率分布</div></div><div class="card-body stack">${distribution}</div></div>
          <div class="card"><div class="card-head"><div class="card-title">当前多线路状态说明</div><div class="subtle">线路故障切换只做展示</div></div><div class="card-body">${infoGrid([
            {k:'负载模式', v: escapeHtml(lb.mode || '-')},
            {k:'PCC 检测', v: lb.pccDetected ? '已检测到' : '未检测到'},
            {k:'活动线路数', v: fmtNumber(lb.activeLines)},
            {k:'策略路由条目', v: fmtNumber((lb.routingRules || []).length)}
          ])}</div></div>
        </div>
        <div class="grid-2" style="margin-top:12px">
          <div class="card"><div class="card-head"><div class="card-title">默认路由状态</div><div class="subtle">${fmtNumber((lb.defaultRoutes || []).length)} 条</div></div><div class="card-body">${table(['网关', '距离', '路由表', '状态', '备注'], routeRows, '暂无默认路由数据')}</div></div>
          <div class="card"><div class="card-head"><div class="card-title">Mangle 分流规则</div><div class="subtle">按命中流量排序</div></div><div class="card-body">${tableWithFold(['链', '动作', '新路由标记', '备注', '命中包', '命中流量'], mangleRows, '暂无 Mangle 分流数据')}</div></div>
        </div>
        <div class="card" style="margin-top:12px"><div class="card-head"><div class="card-title">策略路由规则</div><div class="subtle">${fmtNumber((lb.routingRules || []).length)} 条</div></div><div class="card-body">${table(['动作', '路由表', '源地址', '目标地址', '状态', '备注'], ruleRows, '暂无策略路由规则')}</div></div>`);
    }

    function renderLogs(snapshot, config = {}) {
      const logs = snapshot.logs || {};
      const sectionTitle = config.title || '日志中心';
      const sectionId = config.id || 'logs';
      const sectionTip = config.tip || '系统、Firewall、DHCP、DNS 日志分类集中展示';
      const renderRows = (rows) => (rows || []).slice(0, 20).map((row) => `
        <tr>
          <td>${escapeHtml(row.time)}</td>
          <td>${escapeHtml(row.topics)}</td>
          <td>${escapeHtml(row.message)}</td>
        </tr>`);
      return section(sectionTitle, sectionId, sectionTip, `
        <div class="grid-4">
          ${metricCard('全部日志', fmtNumber((logs.all || []).length), '当前窗口内采样', '')}
          ${metricCard('系统日志', fmtNumber((logs.system || []).length), '非 DHCP / DNS / Firewall', '')}
          ${metricCard('Firewall 日志', fmtNumber((logs.firewall || []).length), '含防火墙主题', '')}
          ${metricCard('DHCP / DNS', `${fmtNumber((logs.dhcp || []).length)} / ${fmtNumber((logs.dns || []).length)}`, '服务日志', '')}
        </div>
        <div class="grid-2" style="margin-top:12px">
          <div class="card"><div class="card-head"><div class="card-title">系统日志</div><div class="subtle">最近 20 条</div></div><div class="card-body">${table(['时间', '主题', '消息'], renderRows(logs.system), '暂无系统日志')}</div></div>
          <div class="card"><div class="card-head"><div class="card-title">Firewall 日志</div><div class="subtle">最近 20 条</div></div><div class="card-body">${table(['时间', '主题', '消息'], renderRows(logs.firewall), '暂无 Firewall 日志')}</div></div>
        </div>
        <div class="grid-2" style="margin-top:12px">
          <div class="card"><div class="card-head"><div class="card-title">DHCP 日志</div><div class="subtle">最近 20 条</div></div><div class="card-body">${table(['时间', '主题', '消息'], renderRows(logs.dhcp), '暂无 DHCP 日志')}</div></div>
          <div class="card"><div class="card-head"><div class="card-title">DNS 日志</div><div class="subtle">最近 20 条</div></div><div class="card-body">${table(['时间', '主题', '消息'], renderRows(logs.dns), '暂无 DNS 日志')}</div></div>
        </div>
        <div class="footer">说明：本页不提供任何配置编辑、提交、删除、启停或策略修改动作，所有内容均来自本地采集服务的只读读取结果。</div>`);
    }

    function renderDhcp(snapshot) {
      const dhcp = snapshot.dhcp || {};
      const servers = dhcp.servers || [];
      const pools = dhcp.pools || [];
      const leases = dhcp.leases || [];
      const serverRows = servers.map((row) => `
        <tr>
          <td>${escapeHtml(row.name)}</td>
          <td>${escapeHtml(row.interface)}</td>
          <td>${escapeHtml(row.pool)}</td>
          <td>${escapeHtml(row.leaseTime)}</td>
          <td>${row.running ? tag('运行中', 'ok') : tag('停用', 'warn')}</td>
        </tr>`);
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
      return section('DHCP 服务', 'dhcp', withScaleHint(snapshot, 'DHCP 服务器、地址池与租约全部按 RouterOS 实读数据展示', 'dhcpLeases'), `
        <div class="grid-4">
          ${metricCard('DHCP 服务器', fmtNumber(servers.length), `运行中 ${fmtNumber(servers.filter((row) => row.running).length)} 个`, '')}
          ${metricCard('地址池', fmtNumber(pools.length), `空闲池 ${fmtNumber(pools.filter((row) => Number(row.available || 0) > 0).length)} 个`, '')}
          ${metricCard('绑定租约', fmtNumber(leases.filter((row) => row.status === 'bound').length), `总租约 ${fmtNumber(leases.length)} 条`, '')}
          ${metricCard('静态分配', fmtNumber(leases.filter((row) => row.static).length), '仅统计当前已读租约', '')}
        </div>
        <div class="grid-2" style="margin-top:12px">
          <div class="card"><div class="card-head"><div class="card-title">DHCP 服务器</div><div class="subtle">${fmtNumber(servers.length)} 台</div></div><div class="card-body">${table(['服务名', '接口', '地址池', '租期', '状态'], serverRows, '当前未读取到 DHCP 服务器')}</div></div>
          <div class="card"><div class="card-head"><div class="card-title">DHCP 地址池</div><div class="subtle">${fmtNumber(pools.length)} 组</div></div><div class="card-body"><div class="stack">${pools.map((pool) => `<div><div class="chart-label"><span>${escapeHtml(pool.name)}</span><span>${fmtNumber(pool.used)} / ${fmtNumber(pool.total)}</span></div>${progress(pool.usage)}</div>`).join('') || emptyBlock('当前未读取到 DHCP 地址池')}</div></div></div>
        </div>
        <div class="card" style="margin-top:12px"><div class="card-head"><div class="card-title">DHCP 租约与静态分配</div><div class="subtle">${fmtNumber(leases.length)} 条</div></div><div class="card-body">${tableWithFold(['IP', '主机名', 'MAC', '服务', '状态', '最后出现', '分配方式'], leaseRows, '当前未读取到 DHCP 租约')}</div></div>`);
    }

    function renderRoutes(snapshot) {
      const routes = snapshot.routes || {};
      const routeType = (row) => row.static ? '静态' : row.dynamic ? '动态' : '其它';
      const routeStatus = (row) => row.disabled ? tag('停用', 'warn') : row.active ? tag('活动', 'ok') : tag('待机', 'info');
      const routeItems = routes.items || [];
      const staticRouteItems = routes.staticRoutes || [];
      const defaultRouteItems = routes.defaultRoutes || [];
      const activeDefaultCount = defaultRouteItems.filter((row) => row.active && !row.disabled).length;
      const disabledStaticCount = staticRouteItems.filter((row) => row.disabled).length;
      const ipv4StaticCount = staticRouteItems.filter((row) => row.family === 'IPv4').length;
      const ipv6StaticCount = staticRouteItems.filter((row) => row.family === 'IPv6').length;
      const routeTables = Object.entries(
        routeItems.reduce((acc, row) => {
          const key = String(row.table || '-').trim() || '-';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {})
      ).sort((a, b) => b[1] - a[1]);
      const topTableText = routeTables.length
        ? routeTables.slice(0, 4).map(([name, count]) => `${name} (${fmtNumber(count)})`).join(' / ')
        : '-';
      const gatewayCount = new Set(
        routeItems
          .map((row) => String(row.gateway || '').trim())
          .filter((value) => value && value !== '-')
      ).size;
      const commentedStaticCount = staticRouteItems.filter((row) => String(row.comment || '').trim()).length;
      const defaultRows = (routes.defaultRoutes || []).map((row) => `
        <tr>
          <td>${escapeHtml(row.table)}</td>
          <td>${escapeHtml(row.gateway)}</td>
          <td>${escapeHtml(row.distance)}</td>
          <td>${routeStatus(row)}</td>
          <td>${escapeHtml(row.comment || '-')}</td>
        </tr>`);
      const staticRows = (routes.staticRoutes || []).map((row) => `
        <tr>
          <td>${escapeHtml(row.dstAddress)}</td>
          <td>${escapeHtml(row.gateway)}</td>
          <td>${escapeHtml(row.table)}</td>
          <td>${escapeHtml(row.distance)}</td>
          <td>${tag(routeType(row), row.static ? 'info' : 'warn')}</td>
          <td>${routeStatus(row)}</td>
          <td>${escapeHtml(row.comment || '-')}</td>
        </tr>`);
      const allRows = (routes.items || []).map((row) => `
        <tr>
          <td>${escapeHtml(row.dstAddress)}</td>
          <td>${escapeHtml(row.gateway)}</td>
          <td>${escapeHtml(row.table)}</td>
          <td>${escapeHtml(row.distance)}</td>
          <td>${tag(row.family, row.family === 'IPv6' ? 'warn' : 'info')}</td>
          <td>${tag(routeType(row), row.static ? 'info' : row.dynamic ? 'ok' : 'warn')}</td>
          <td>${routeStatus(row)}</td>
        </tr>`);
      return section('静态路由', 'routes', withScaleHint(snapshot, '真实路由表、默认路由与静态路由按 RouterOS 实表展示', 'routes'), `
        <div class="grid-2" style="margin-top:12px">
          <div class="card"><div class="card-head"><div class="card-title">默认路由状态</div><div class="subtle">${fmtNumber((routes.defaultRoutes || []).length)} 条</div></div><div class="card-body">${table(['路由表', '网关', '距离', '状态', '备注'], defaultRows, '当前未读取到默认路由')}</div></div>
          <div class="card"><div class="card-head"><div class="card-title">路由概览</div><div class="subtle">仅展示 RouterOS 可读字段</div></div><div class="card-body">${infoGrid([
            {k:'活动默认路由', v: `${fmtNumber(activeDefaultCount)} / ${fmtNumber(routes.defaultCount)}`},
            {k:'禁用静态路由', v: fmtNumber(disabledStaticCount)},
            {k:'IPv4 / IPv6 静态', v: `${fmtNumber(ipv4StaticCount)} / ${fmtNumber(ipv6StaticCount)}`},
            {k:'可见网关数量', v: fmtNumber(gatewayCount)},
            {k:'主要路由表', v: escapeHtml(topTableText)},
            {k:'带备注静态路由', v: fmtNumber(commentedStaticCount)}
          ])}</div></div>
        </div>
        <div class="card" style="margin-top:12px"><div class="card-head"><div class="card-title">静态路由列表</div><div class="subtle">${fmtNumber((routes.staticRoutes || []).length)} 条</div></div><div class="card-body">${table(['目标网段', '网关', '路由表', '距离', '类型', '状态', '备注'], staticRows, '当前未读取到静态路由')}</div></div>
        <div class="card" style="margin-top:12px"><div class="card-head"><div class="card-title">当前路由表</div><div class="subtle">前 ${fmtNumber((routes.items || []).length)} 条</div></div><div class="card-body">${tableWithFold(['目标网段', '网关', '路由表', '距离', '地址族', '类型', '状态'], allRows, '当前未读取到路由表')}</div></div>`);
    }

    function totalTrafficRate(row, upKey = 'upRate', downKey = 'downRate') {
      return Number((row || {})[upKey] || 0) + Number((row || {})[downKey] || 0);
    }

    function hasProtocolBreakdown(connections) {
      return [connections?.tcp, connections?.udp, connections?.icmp].every((value) => Number.isFinite(Number(value)));
    }

    function formatProtocolSplit(connections) {
      return hasProtocolBreakdown(connections)
        ? `TCP ${fmtCompact(connections.tcp)} / UDP ${fmtCompact(connections.udp)} / ICMP ${fmtCompact(connections.icmp)}`
        : '当前未采集';
    }

    function formatProtocolSampleTime(connections) {
      return connections?.protocolUpdatedAt ? escapeHtml(connections.protocolUpdatedAt) : '等待全量采样';
    }

    function interfaceAuditScore(row) {
      row = row || {};
      return Number(row.txDrop || 0) + Number(row.rxDrop || 0) + Number(row.txError || 0) + Number(row.rxError || 0);
    }

    function collectLoadAuditEvents(snapshot) {
      const overview = snapshot.overview || {};
      const connections = snapshot.connections || {};
      const dns = snapshot.dns || {};
      const logs = snapshot.logs || {};
      const events = [];

      if (overview.systemLoadLevel === 'danger') {
        events.push({time: '实时', source: '系统负载', level: 'danger', message: `CPU ${fmtPercent(overview.cpuLoad)} / 内存 ${fmtPercent(overview.memoryUsage)}，当前处于高压状态`});
      } else if (overview.systemLoadLevel === 'warning') {
        events.push({time: '实时', source: '系统负载', level: 'warn', message: `CPU ${fmtPercent(overview.cpuLoad)} / 内存 ${fmtPercent(overview.memoryUsage)}，当前处于预警状态`});
      }
      if (overview.ntpStatus && overview.ntpStatus !== 'synchronized') {
        events.push({time: '实时', source: 'NTP', level: 'warn', message: `NTP 状态为 ${overview.ntpStatus}`});
      }
      if (dns.cacheSize && dns.cacheUsed) {
        const cacheUsage = Math.min((Number(dns.cacheUsed || 0) / Math.max(Number(dns.cacheSize || 0), 1)) * 100, 100);
        if (cacheUsage >= 85) {
          events.push({time: '实时', source: 'DNS 缓存', level: cacheUsage >= 95 ? 'danger' : 'warn', message: `缓存占用 ${cacheUsage.toFixed(1)}%，${fmtBytes(dns.cacheUsed)} / ${fmtBytes(dns.cacheSize)}`});
        }
      }
      if (Number(connections.total || 0) >= 90000) {
        events.push({time: '实时', source: '连接压力', level: 'danger', message: `全局连接数 ${fmtCompact(connections.total)}，接近上限`});
      } else if (Number(connections.total || 0) >= 60000) {
        events.push({time: '实时', source: '连接压力', level: 'warn', message: `全局连接数 ${fmtCompact(connections.total)}，持续关注连接压力`});
      }

      const logRows = [...(logs.system || []), ...(logs.dns || [])]
        .filter((row) => /error|warning|critical|fail|down|timeout|cache full/i.test(`${row.topics || ''} ${row.message || ''}`))
        .slice(0, 8)
        .map((row) => ({
          time: row.time || '-',
          source: row.topics || '-',
          level: /error|critical|fail|cache full/i.test(`${row.topics || ''} ${row.message || ''}`) ? 'danger' : 'warn',
          message: row.message || '-'
        }));

      return [...events, ...logRows].slice(0, 10);
    }

    function renderTrafficLoad(snapshot) {
      const overview = snapshot.overview || {};
      const rawPppoe = snapshot.pppoe || [];
      const pppoe = sortPppoeNamedRows(rawPppoe);
      const interfaces = (snapshot.interfaces || []).slice().sort((a, b) => totalTrafficRate(b, 'txRate', 'rxRate') - totalTrafficRate(a, 'txRate', 'rxRate'));
      const terminals = (snapshot.terminals || []).slice().sort((a, b) => totalTrafficRate(b) - totalTrafficRate(a));
      const loadBalance = snapshot.loadBalance || {};
      const activeLines = pppoe.filter((row) => row.running).length;
      const busiestLine = rawPppoe.slice().sort((a, b) => totalTrafficRate(b) - totalTrafficRate(a))[0];
      const trafficTerminals = terminals.filter((row) => totalTrafficRate(row) > 0);
      const lineShareRows = sortPppoeNamedRows(((loadBalance.distribution || []).length ? loadBalance.distribution : pppoe.map((row) => ({
        name: row.name,
        share: 0,
        upRate: row.upRate,
        downRate: row.downRate
      }))))
        .slice(0, 8)
        .map((row) => `<div><div class="chart-label"><span>${escapeHtml(row.name)}</span><span>${Number(row.share || 0).toFixed(1)}%</span></div>${progress(row.share || 0)}</div>`)
        .join('');
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
      return section('流量负载', 'trafficLoad', withScaleHint(snapshot, '按 RouterOS 真实吞吐数据展示宽带占用、接口吞吐与终端流量排行', 'interfaces', 'terminals'), `
        ${buildSnapshotAnomalyNotice(snapshot)}
        <div class="grid-4">
          ${metricCard('总上行速率', fmtRate(overview.uplinkBps), `在线宽带 ${fmtNumber(activeLines)} / ${fmtNumber(pppoe.length)}`, busiestLine ? `最繁忙 ${escapeHtml(busiestLine.name)}` : '暂无在线宽带')}
          ${metricCard('总下行速率', fmtRate(overview.downlinkBps), `在线终端 ${fmtNumber(overview.onlineTerminals)}`, `有流量终端 ${fmtNumber(trafficTerminals.length)}`)}
          ${metricCard('线路吞吐峰值', busiestLine ? fmtRate(totalTrafficRate(busiestLine)) : '-', busiestLine ? `${fmtRate(busiestLine.upRate)} / ${fmtRate(busiestLine.downRate)}` : '当前未采集到线路实时流量', busiestLine ? `父接口 ${escapeHtml(busiestLine.parent || '-')}` : '')}
          ${metricCard('接口吞吐对象', fmtNumber(interfaces.length), `WAN / LAN ${fmtNumber(interfaces.filter((row) => row.role === 'WAN').length)} / ${fmtNumber(interfaces.filter((row) => row.role !== 'WAN').length)}`, `终端排行 ${fmtNumber(trafficTerminals.length)} 个`)}
        </div>
        <div class="grid-2" style="margin-top:12px">
          <div class="card"><div class="card-head"><div class="card-title">WAN 聚合吞吐趋势</div><div class="subtle">${fmtRate(overview.uplinkBps)} / ${fmtRate(overview.downlinkBps)}</div></div><div class="card-body"><div class="chart-box"><div class="chart-label"><span>总上 / 总下</span><span>${escapeHtml(snapshot.meta.pollSeconds)}s / 点</span></div>${lineChart([overview.history.uplink, overview.history.downlink], {colors:['#165dff','#f53f3f']})}</div></div></div>
          <div class="card"><div class="card-head"><div class="card-title">线路负载占比</div><div class="subtle">${busiestLine ? `${escapeHtml(busiestLine.name)} 当前最繁忙` : '等待采集'}</div></div><div class="card-body"><div class="stack">${lineShareRows || emptyBlock('当前未形成可读的线路占比')}</div></div></div>
        </div>
        <div class="card" style="margin-top:12px"><div class="card-head"><div class="card-title">线路速率趋势</div><div class="subtle">${fmtNumber(getLineTrendRows(pppoe).length)} 条线路同步展示</div></div><div class="card-body">${renderLineTrendGrid(getLineTrendRows(pppoe), {emptyText:'当前未采集到可展示的线路趋势'})}</div></div>
        <div class="grid-2" style="margin-top:12px">
          <div class="card"><div class="card-head"><div class="card-title">宽带实时负载</div><div class="subtle">按 PPPoE 实时吞吐排序</div></div><div class="card-body">${tableWithFold(['线路', '状态', '父接口', '实时上行速率', '实时下行速率', '累计上行流量', '累计下行流量'], lineRows, '当前未读取到宽带实时负载')}</div></div>
          <div class="card"><div class="card-head"><div class="card-title">接口吞吐排行</div><div class="subtle">按接口实时吞吐排序</div></div><div class="card-body">${tableWithFold(['接口', '角色', '类型', '实时上行速率', '实时下行速率', '累计上行流量', '累计下行流量'], interfaceRows, '当前未读取到接口吞吐排行')}</div></div>
        </div>
        <div class="card" style="margin-top:12px"><div class="card-head"><div class="card-title">终端实时流量排行</div><div class="subtle">按终端实时吞吐与累计流量综合查看</div></div><div class="card-body">${tableWithFold(['名称', 'IP', '实时上行速率', '实时下行速率', '连接数', '累计流量'], terminalRows, '当前未读取到终端实时流量排行')}</div></div>`);
    }

    function renderLoadAudit(snapshot) {
      const overview = snapshot.overview || {};
      const connections = snapshot.connections || {};
      const dns = snapshot.dns || {};
      const interfaces = (snapshot.interfaces || []).slice().sort((a, b) => {
        const diff = interfaceAuditScore(b) - interfaceAuditScore(a);
        return diff !== 0 ? diff : totalTrafficRate(b, 'txRate', 'rxRate') - totalTrafficRate(a, 'txRate', 'rxRate');
      });
      const auditEvents = collectLoadAuditEvents(snapshot);
      const interfaceRows = interfaces.slice(0, 16).map((row) => `
        <tr>
          <td>${escapeHtml(row.name)}</td>
          <td>${tag(row.role, row.role === 'WAN' ? 'info' : 'ok')}</td>
          <td>${row.running ? tag('在线', 'ok') : tag('离线', 'danger')}</td>
          <td>${fmtNumber(Number(row.txDrop || 0) + Number(row.rxDrop || 0))}</td>
          <td>${fmtNumber(Number(row.txError || 0) + Number(row.rxError || 0))}</td>
          <td>${fmtRate(row.txRate)}</td>
          <td>${fmtRate(row.rxRate)}</td>
          <td>${row.ips.length ? row.ips.map(escapeHtml).join('<br>') : '-'}</td>
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
      return section('负载审计', 'loadAudit', '按 RouterOS 真实资源、会话、接口异常和日志线索审计系统运行健康', `
        <div class="grid-4">
          ${metricCard('CPU 使用率', fmtPercent(overview.cpuLoad), `型号 ${escapeHtml(overview.cpuModel)}`, `${fmtNumber(overview.cpuCount)} 核 / ${fmtNumber(overview.cpuFrequency)} MHz`)}
          ${metricCard('内存占用率', fmtPercent(overview.memoryUsage), `已用 ${fmtBytes(overview.memoryUsedBytes)}`, `总量 ${fmtBytes(overview.memoryTotalBytes)}`)}
          ${metricCard('磁盘占用率', fmtPercent(overview.diskUsage), `已用 ${fmtBytes(overview.diskUsedBytes)}`, `总量 ${fmtBytes(overview.diskTotalBytes)}`)}
          ${metricCard('系统状态', tag(overview.systemLoadLevel === 'danger' ? '高压' : overview.systemLoadLevel === 'warning' ? '预警' : '正常', overview.systemLoadLevel), `NTP ${escapeHtml(overview.ntpStatus)}`, `运行时长 ${escapeHtml(overview.uptime)}`)}
        </div>
        <div class="grid-3" style="margin-top:12px">
          <div class="card" style="grid-column: span 2"><div class="card-head"><div class="card-title">资源趋势</div><div class="subtle">CPU / 内存 / 磁盘分图</div></div><div class="card-body">${resourceTrendGrid(overview, `${Math.max(overview.history?.cpu?.length || 0, overview.history?.memory?.length || 0, overview.history?.disk?.length || 0)} 点 · ${escapeHtml(snapshot.meta.pollSeconds)}s / 点`)}</div></div>
          <div class="card"><div class="card-head"><div class="card-title">运行健康摘要</div><div class="subtle">系统资源 / 连接压力 / DNS 缓存</div></div><div class="card-body">${infoGrid([
            {k:'连接总数', v: fmtCompact(connections.total)},
            {k:'活跃会话', v: fmtNumber((connections.active || []).length)},
            {k:'明细更新时间', v: connections.detailUpdatedAt ? escapeHtml(connections.detailUpdatedAt) : '等待采集'},
            {k:'DNS 缓存', v: dns.cacheSize ? `${fmtBytes(dns.cacheUsed || 0)} / ${fmtBytes(dns.cacheSize || 0)}` : '未提供'},
            {k:'系统时间', v: escapeHtml(overview.systemTime)},
            {k:'在线管理员', v: fmtNumber((overview.admins || []).length)}
          ])}</div></div>
        </div>
        <div class="grid-2" style="margin-top:12px">
          <div class="card"><div class="card-head"><div class="card-title">基础硬件信息</div><div class="subtle">${escapeHtml(overview.identity)}</div></div><div class="card-body">${infoGrid([
            {k:'RouterOS 版本', v: escapeHtml(overview.version)},
            {k:'设备型号', v: escapeHtml(overview.boardName)},
            {k:'架构', v: escapeHtml(overview.architecture)},
            {k:'系统时间', v: escapeHtml(overview.systemTime)},
            {k:'运行时长', v: escapeHtml(overview.uptime)},
            {k:'NTP 状态', v: tag(overview.ntpStatus || '-', overview.ntpStatus === 'synchronized' ? 'ok' : 'warn')}
          ])}</div></div>
          <div class="card"><div class="card-head"><div class="card-title">当前登录管理员</div><div class="subtle">${fmtNumber((overview.admins || []).length)} 个会话</div></div><div class="card-body">${table(['用户', '方式', '来源地址', '登录时间'], adminRows, '当前未读取到管理员会话')}</div></div>
        </div>
        <div class="grid-2" style="margin-top:12px">
          <div class="card"><div class="card-head"><div class="card-title">接口异常审计</div><div class="subtle">按丢包 / 错包优先排序</div></div><div class="card-body">${table(['接口', '角色', '状态', '丢包', '错包', '实时上行速率', '实时下行速率', '地址'], interfaceRows, '当前未读取到接口异常审计数据')}</div></div>
          <div class="card"><div class="card-head"><div class="card-title">健康事件摘要</div><div class="subtle">系统 / DNS / 日志预警线索</div></div><div class="card-body">${table(['时间', '来源', '级别', '内容'], eventRows, '当前未发现明显的资源与服务预警')}</div></div>
        </div>`);
    }

    function renderLineStatus(snapshot) {
      const interfaces = snapshot.interfaces || [];
      const pppoe = sortPppoeNamedRows(snapshot.pppoe || []);
      const interfaceByName = Object.fromEntries(interfaces.map((row) => [row.name, row]));
      const twoLine = (main, sub = '') => `<div class="ops-inline-dual"><div class="ops-inline-main">${main || '-'}</div>${sub ? `<div class="ops-inline-sub">${sub}</div>` : ''}</div>`;
      const inlinePair = (main, sub = '') => `<span class="ops-inline-pair"><span>${main || '-'}</span>${sub ? `<span class="ops-muted-inline">${sub}</span>` : ''}</span>`;
      const buildDiagnostic = (row) => {
        const parent = interfaceByName[row.parent] || {};
        const activeRoutes = (row.routes || []).filter((route) => route && route.active);
        const activeTables = activeRoutes.map((route) => String(route.table || '-'));
        const hasMain = activeTables.some((tableName) => tableName.toLowerCase() === 'main');
        const hasPolicy = activeTables.some((tableName) => tableName.toLowerCase() !== 'main');
        const role = hasMain && hasPolicy
          ? { label: '全局+策略', level: 'ok' }
          : hasMain
            ? { label: '全局出口', level: 'ok' }
            : hasPolicy
              ? { label: '策略出口', level: 'info' }
              : (row.routes || []).length
                ? { label: '备选未激活', level: 'warn' }
                : { label: '无默认路由', level: 'danger' };
        const hasAddress = (row.addresses || []).length > 0;
        const dropTotal = Number(parent.txDrop || 0) + Number(parent.rxDrop || 0);
        const errorTotal = Number(parent.txError || 0) + Number(parent.rxError || 0);
        const blockers = [];
        const observations = [];
        let score = 100;
        if (!row.running) { blockers.push('拨号离线'); score -= 45; }
        if (!hasAddress) { blockers.push('未拿到地址'); score -= 25; }
        if (!activeRoutes.length) { blockers.push('无活动默认路由'); score -= 35; }
        if (errorTotal > 0) { blockers.push('父接口错误'); score -= 25; }
        if (dropTotal > 0) { observations.push('父接口累计丢包'); score -= 5; }
        score = Math.max(0, Math.min(100, score));
        const level = blockers.some((item) => ['拨号离线', '无活动默认路由'].includes(item))
          ? 'danger'
          : blockers.length
            ? 'warn'
            : score >= 90 ? 'ok' : 'warn';
        const stateLabel = level === 'danger' ? '故障' : level === 'warn' ? '注意' : '正常';
        const action = !row.running ? '检查拨号链路'
          : !hasAddress ? '检查地址获取'
            : !activeRoutes.length ? '检查默认路由'
              : errorTotal > 0 ? '检查父接口错误' : '保持观察';
        return { row, role, activeRoutes, activeTables, hasAddress, dropTotal, errorTotal, blockers, observations, score, level, stateLabel, action };
      };
      const diagnostics = pppoe.map(buildDiagnostic);
      const diagnosticQueue = diagnostics.slice().sort((a, b) => {
        const rankA = (a.level === 'danger' ? 0 : a.level === 'warn' ? 1 : 2) * 1000 + (100 - a.score);
        const rankB = (b.level === 'danger' ? 0 : b.level === 'warn' ? 1 : 2) * 1000 + (100 - b.score);
        return rankA - rankB;
      });
      const activeRouteTables = Array.from(new Set(diagnostics.flatMap((item) => item.activeTables))).filter(Boolean);
      const diagnosticRows = diagnosticQueue.map((item, index) => {
        const reasonText = item.blockers.length ? item.blockers.join(' / ') : '关键闭环正常';
        return `
          <tr>
            <td>${fmtNumber(index + 1)}</td>
            <td>${tag(item.stateLabel, item.level)}</td>
            <td>${inlinePair(escapeHtml(item.row.name), escapeHtml(item.row.parent || '-'))}</td>
            <td>${fmtNumber(item.score)}</td>
            <td>${inlinePair(tag(item.role.label, item.role.level), item.activeTables.length ? item.activeTables.map(escapeHtml).join(' / ') : '无活动表')}</td>
            <td>${escapeHtml(reasonText)}</td>
            <td>${escapeHtml(item.action)}</td>
            <td>${inlinePair(`拨号 ${item.row.running ? '是' : '否'} / 地址 ${item.hasAddress ? '是' : '否'}`, `路由 ${item.activeRoutes.length ? '是' : '否'}`)}</td>
            <td>${fmtNumber(item.dropTotal)} / ${fmtNumber(item.errorTotal)}</td>
            <td>上 ${fmtRate(item.row.upRate)} / 下 ${fmtRate(item.row.downRate)}</td>
          </tr>`;
      }).join('');
      const lineStatusColumns = [
        { key: 'index', label: '#', sortable: false, render: (item, index) => fmtNumber(index + 1) },
        { key: 'status', label: '状态', sort: (item) => ({ danger: 0, warn: 1, ok: 2 }[item.level] ?? 3), render: (item) => tag(item.stateLabel, item.level) },        { key: 'line', label: '线路 / 父接口', sort: (item) => String(item.row.name || ''), render: (item) => inlinePair(escapeHtml(item.row.name), escapeHtml(item.row.parent || '-')) },
        { key: 'score', label: '分', sort: (item) => 100 - Number(item.score || 0), render: (item) => fmtNumber(item.score) },
        { key: 'role', label: '出口角色', sort: (item) => String(item.role.label || ''), render: (item) => inlinePair(tag(item.role.label, item.role.level), item.activeTables.length ? item.activeTables.map(escapeHtml).join(' / ') : '无活动表') },
        { key: 'reason', label: '原因', sort: (item) => String(item.blockers.length ? item.blockers.join('/') : ''), render: (item) => escapeHtml(item.blockers.length ? item.blockers.join(' / ') : '关键闭环正常') },
        { key: 'action', label: '动作', sort: (item) => String(item.action || ''), render: (item) => escapeHtml(item.action) },
        { key: 'closure', label: '闭环', sort: (item) => (item.row.running ? 1 : 0) + (item.hasAddress ? 2 : 0) + (item.activeRoutes.length ? 4 : 0), render: (item) => inlinePair(`拨号 ${item.row.running ? '是' : '否'} / 地址 ${item.hasAddress ? '是' : '否'}`, `路由 ${item.activeRoutes.length ? '是' : '否'}`) },
        { key: 'drops', label: '丢 / 错', sort: (item) => Number(item.dropTotal || 0) + Number(item.errorTotal || 0), render: (item) => `${fmtNumber(item.dropTotal)} / ${fmtNumber(item.errorTotal)}` },
        { key: 'traffic', label: '上 / 下', sort: (item) => Number(item.row.upRate || 0) + Number(item.row.downRate || 0), render: (item) => `上 ${fmtRate(item.row.upRate)} / 下 ${fmtRate(item.row.downRate)}` }
      ];
      window.__lineStatusColumns = lineStatusColumns;
      const queueView = getLineQueueView(lineStatusColumns);
      const sortedQueue = sortLineQueue(diagnosticQueue, queueView, lineStatusColumns);
      const visibleColumns = queueView.order
        .map((key) => lineStatusColumns.find((column) => column.key === key))
        .filter(Boolean)
        .filter((column) => !queueView.hidden.includes(column.key));
      const headerCells = visibleColumns.map((column) => {
        if (!column.sort) return `<th>${escapeHtml(column.label)}</th>`;
        const active = queueView.sortKey === column.key;
        const arrow = active ? (queueView.sortDir === 'asc' ? ' ▲' : ' ▼') : '';
        return `<th class="ls-sortable${active ? ' is-active' : ''}" data-ls-sort="${escapeHtml(column.key)}" title="点击切换排序">${escapeHtml(column.label)}${arrow}</th>`;
      }).join('');
      const allBodyRows = sortedQueue.map((item, index) => `<tr>${visibleColumns.map((column) => `<td>${column.render(item, index)}</td>`).join('')}</tr>`);
      const queueKeep = 24;
      const queueTableBlock = (rows) => `<div class="ops-table-wrap"><table class="ops-table ops-compact-table"><thead><tr>${headerCells}</tr></thead><tbody>${rows}</tbody></table></div>`;
      const queueTableHtml = allBodyRows.length <= queueKeep
        ? queueTableBlock(allBodyRows.join(''))
        : `${queueTableBlock(allBodyRows.slice(0, queueKeep).join(''))}<details class="ik-fold-more"><summary>展开其余 ${fmtNumber(allBodyRows.length - queueKeep)} 条（共 ${fmtNumber(allBodyRows.length)} 条）</summary>${queueTableBlock(allBodyRows.slice(queueKeep).join(''))}</details>`;
      const columnManagerRows = queueView.order.map((key) => {
        const column = lineStatusColumns.find((entry) => entry.key === key);
        const visible = !queueView.hidden.includes(key);
        return `
          <div class="ls-col-row">
            <label><input type="checkbox" data-ls-col-vis="${escapeHtml(key)}"${visible ? ' checked' : ''}> ${escapeHtml(column.label)}</label>
            <span class="ls-col-move">
              <button type="button" data-ls-col-up="${escapeHtml(key)}" title="上移">↑</button>
              <button type="button" data-ls-col-down="${escapeHtml(key)}" title="下移">↓</button>
            </span>
          </div>`;
      }).join('');
      const columnManager = `
        <div class="ls-col-manager">
          <button class="ls-col-manager-btn" type="button" data-ls-cols-toggle>列管理</button>
          ${window.__lineQueueManagerOpen ? `
          <div class="ls-col-pop">
            <div class="ls-col-pop-head"><b>列管理</b><button type="button" data-ls-col-reset>恢复默认</button></div>
            ${columnManagerRows}
            <div class="ls-col-pop-foot">点击表头可按该列排序；勾选控制显隐，↑↓ 调整顺序。</div>
          </div>` : ''}
        </div>`;
      const allBoardCards = diagnostics.map((item) => `
        <div class="ls-line-card is-${item.level}">
          <div class="ls-line-card-head"><b>${escapeHtml(item.row.name)}</b>${tag(item.stateLabel, item.level)}</div>
          <div class="ls-line-closure">
            <span class="ls-chip ${item.row.running ? 'is-ok' : 'is-bad'}">拨号 ${item.row.running ? '✓' : '✗'}</span>
            <span class="ls-chip ${item.hasAddress ? 'is-ok' : 'is-bad'}">地址 ${item.hasAddress ? '✓' : '✗'}</span>
            <span class="ls-chip ${item.activeRoutes.length ? 'is-ok' : 'is-bad'}">路由 ${item.activeRoutes.length ? '✓' : '✗'}</span>
          </div>
          <div class="ls-line-rates"><span>↑ ${fmtRate(item.row.upRate)}</span><span>↓ ${fmtRate(item.row.downRate)}</span></div>
          <div class="ls-line-foot">${escapeHtml(item.action)} · ${escapeHtml(item.role.label)} · 丢/错 ${fmtNumber(item.dropTotal)}/${fmtNumber(item.errorTotal)}</div>
        </div>`);
      const boardKeep = 24;
      const boardFold = allBoardCards.length > boardKeep
        ? `<details class="ik-fold-more" style="margin-top:8px"><summary>展开其余 ${fmtNumber(allBoardCards.length - boardKeep)} 条线路板卡（共 ${fmtNumber(allBoardCards.length)} 条）</summary><div class="grid-4">${allBoardCards.slice(boardKeep).join('')}</div></details>`
        : '';
      const lineBoardCards = allBoardCards.length <= boardKeep ? allBoardCards.join('') : allBoardCards.slice(0, boardKeep).join('');
      return section('线路状态', 'lineStatus', withScaleHint(snapshot, '按健康闭环、出口角色和处理优先级定位线路问题', 'wan'), `
        <div class="grid-4">
          ${metricCard('可用出口', fmtNumber(diagnostics.filter((item) => item.level === 'ok').length), `总线路 ${fmtNumber(pppoe.length)} 条`, '健康闭环完整')}
          ${metricCard('待观察', fmtNumber(diagnostics.filter((item) => item.level === 'warn').length), '有累计丢包或轻微异常', '先观察趋势')}
          ${metricCard('故障优先', fmtNumber(diagnostics.filter((item) => item.level === 'danger').length), '离线或无活动默认路由', '需要优先处理')}
          ${metricCard('路由覆盖', fmtNumber(activeRouteTables.length), activeRouteTables.length ? activeRouteTables.slice(0, 4).map(escapeHtml).join(' / ') : '无活动表', '按活动默认路由统计')}
        </div>
        <div class="grid-4" style="margin-top:8px">
          ${metricCard('拨号闭环', `${fmtNumber(diagnostics.filter((item) => item.row.running).length)} / ${fmtNumber(pppoe.length)}`, 'PPPoE 当前在线', '')}
          ${metricCard('地址闭环', `${fmtNumber(diagnostics.filter((item) => item.hasAddress).length)} / ${fmtNumber(pppoe.length)}`, '已拿到公网地址', '')}
          ${metricCard('路由闭环', `${fmtNumber(diagnostics.filter((item) => item.activeRoutes.length > 0).length)} / ${fmtNumber(pppoe.length)}`, '有活动默认路由', '')}
          ${metricCard('策略出口', fmtNumber(diagnostics.filter((item) => String(item.role?.label || '').includes('策略')).length), '非 main 表活动出口', '')}
        </div>
        <div class="card" style="margin-top:12px">
          <div class="card-head">
            <div class="card-title">故障优先队列</div>
            <div style="display:flex;align-items:center;gap:10px;min-width:0">${columnManager}<span class="subtle">点击表头按列排序</span></div>
          </div>
          <div class="card-body">
            ${queueTableHtml}
          </div>
        </div>
        <div class="card" style="margin-top:12px">
          <div class="card-head"><div class="card-title">线路状态板</div><div class="subtle">每条线路的闭环核对与实时吞吐</div></div>
          <div class="card-body"><div class="grid-4">${lineBoardCards}</div>${boardFold}</div>
        </div>`);
    }

    const LINE_QUEUE_STORE_KEY = 'lineStatusQueueView.v1';
    const defaultLineQueueRank = (item) => (item.level === 'danger' ? 0 : item.level === 'warn' ? 1 : 2) * 1000 + (100 - item.score);

    function getLineQueueView(columns) {
      const known = columns.map((column) => column.key);
      const defaults = { order: known.slice(), hidden: [], sortKey: '__queue__', sortDir: 'desc' };
      let view = null;
      try { view = JSON.parse(localStorage.getItem(LINE_QUEUE_STORE_KEY) || 'null'); } catch (error) { view = null; }
      if (!view || !Array.isArray(view.order)) return defaults;
      const order = known.filter((key) => view.order.includes(key));
      known.forEach((key) => { if (!order.includes(key)) order.push(key); });
      return {
        order,
        hidden: Array.isArray(view.hidden) ? view.hidden.filter((key) => known.includes(key) && key !== 'index') : [],
        sortKey: view.sortKey === '__queue__' || known.includes(view.sortKey) ? view.sortKey : '__queue__',
        sortDir: view.sortDir === 'asc' ? 'asc' : 'desc'
      };
    }

    function saveLineQueueView(view) {
      try { localStorage.setItem(LINE_QUEUE_STORE_KEY, JSON.stringify(view)); } catch (error) {}
    }

    function sortLineQueue(queue, view, columns) {
      if (view.sortKey === '__queue__') {
        return queue.slice().sort((a, b) => defaultLineQueueRank(a) - defaultLineQueueRank(b));
      }
      const column = columns.find((entry) => entry.key === view.sortKey);
      if (!column || !column.sort) {
        return queue.slice().sort((a, b) => defaultLineQueueRank(a) - defaultLineQueueRank(b));
      }
      const factor = view.sortDir === 'asc' ? 1 : -1;
      return queue.slice().sort((a, b) => {
        const valueA = column.sort(a);
        const valueB = column.sort(b);
        if (typeof valueA === 'string' || typeof valueB === 'string') {
          return String(valueA).localeCompare(String(valueB), 'zh-CN') * factor;
        }
        return (Number(valueA) - Number(valueB)) * factor;
      });
    }

    if (!window.__lineQueueEventsBound) {
      window.__lineQueueEventsBound = true;
      document.addEventListener('click', (event) => {
        const target = event.target;
        if (!target || !target.closest) return;
        const refresh = () => {
          if (typeof currentSection !== 'undefined' && currentSection === 'lineStatus'
            && typeof renderApp === 'function' && typeof latestSnapshot !== 'undefined' && latestSnapshot) {
            renderApp(latestSnapshot);
          }
        };
        const toggleEl = target.closest('[data-ls-cols-toggle]');
        if (toggleEl) {
          window.__lineQueueManagerOpen = !window.__lineQueueManagerOpen;
          refresh();
          return;
        }
        const insideManager = target.closest('.ls-col-manager');
        if (insideManager) {
          const view = window.__lineQueueView || getLineQueueView(window.__lineStatusColumns || []);
          const visEl = target.closest('[data-ls-col-vis]');
          const upEl = target.closest('[data-ls-col-up]');
          const downEl = target.closest('[data-ls-col-down]');
          const resetEl = target.closest('[data-ls-col-reset]');
          if (resetEl) {
            try { localStorage.removeItem(LINE_QUEUE_STORE_KEY); } catch (error) {}
            window.__lineQueueView = null;
          } else if (visEl) {
            const key = visEl.getAttribute('data-ls-col-vis');
            if (key !== 'index') {
              view.hidden = view.hidden.includes(key)
                ? view.hidden.filter((item) => item !== key)
                : view.hidden.concat(key);
            }
          } else if (upEl || downEl) {
            const key = (upEl || downEl).getAttribute(upEl ? 'data-ls-col-up' : 'data-ls-col-down');
            const from = view.order.indexOf(key);
            const to = upEl ? from - 1 : from + 1;
            if (from >= 0 && to >= 0 && to < view.order.length) {
              view.order.splice(from, 1);
              view.order.splice(to, 0, key);
            }
          } else {
            return;
          }
          window.__lineQueueView = view;
          saveLineQueueView(view);
          refresh();
          return;
        }
        const sortEl = target.closest('[data-ls-sort]');
        if (sortEl) {
          const view = window.__lineQueueView || getLineQueueView(window.__lineStatusColumns || []);
          const key = sortEl.getAttribute('data-ls-sort');
          if (view.sortKey !== key) { view.sortKey = key; view.sortDir = 'desc'; }
          else if (view.sortDir === 'desc') view.sortDir = 'asc';
          else { view.sortKey = '__queue__'; view.sortDir = 'desc'; }
          window.__lineQueueView = view;
          saveLineQueueView(view);
          refresh();
          return;
        }
        if (window.__lineQueueManagerOpen) {
          window.__lineQueueManagerOpen = false;
          refresh();
        }
      });
    }

    function renderArp(snapshot) {
      const arp = snapshot.arp || { items: [], alerts: [] };
      const terminals = snapshot.terminals || [];
      const trafficTerminalCount = terminals.filter((row) => Number(row.upRate || 0) + Number(row.downRate || 0) > 0).length;
      const arpRows = (arp.items || []).map((row) => `
        <tr>
          <td>${escapeHtml(row.ip)}</td>
          <td>${renderEditableNameCell(row, row.ip, row.ip || '-')}</td>
          <td>${escapeHtml(row.mac)}</td>
          <td>${tag(row.type, row.type === '静态' ? 'info' : 'ok')}</td>
          <td>${tag(row.status)}</td>
          <td>${escapeHtml(toDisplayText(row.lastSeen || '-'))}</td>
        </tr>`);
      const terminalRows = terminals.slice(0, 20).map((row) => `
        <tr>
          <td>${renderEditableNameCell(row, row.ip, row.ip || '-')}</td>
          <td>${escapeHtml(row.ip)}</td>
          <td>${fmtRate(row.upRate)}</td>
          <td>${fmtRate(row.downRate)}</td>
          <td>${escapeHtml(row.mac || '-')}</td>
          <td>${fmtNumber(row.connections)}</td>
        </tr>`);
      return `
        <section class="section section-arp" id="arp">
          <div class="section-head">
            <div class="section-title">ARP 监控</div>
            <div class="section-tip">ARP 表、终端联动信息与冲突告警按实际可读数据展示</div>
          </div>
          <div class="section-summary-sticky">
            <div class="grid-4">
              ${metricCard('ARP 条目', fmtNumber((arp.items || []).length), '来自 RouterOS ARP 表', '')}
              ${metricCard('ARP 告警', fmtNumber((arp.alerts || []).length), '冲突与异常条目按可读日志聚合', '')}
              ${metricCard('在线终端', fmtNumber(terminals.length), '终端联动信息按当前流量汇总', '')}
              ${metricCard('有流量终端', fmtNumber(trafficTerminalCount), '实时上下行大于 0 的终端', '')}
            </div>
          </div>
          <div>${(arp.alerts || []).length ? `<div class="notice">${arp.alerts.map((item) => `${escapeHtml(item.kind)}：${escapeHtml(item.value)} (${escapeHtml(item.detail)})`).join('；')}</div>` : `<div class="notice">当前未读取到 ARP 冲突或异常告警。</div>`}</div>
          <div class="grid-2" style="margin-top:12px">
            <div class="card"><div class="card-head"><div class="card-title">ARP 列表</div><div class="subtle">${fmtNumber((arp.items || []).length)} 条</div></div><div class="card-body">${table(['IP', '主机名', 'MAC', '类型', '状态', '最后出现'], arpRows, '当前未读取到 ARP 列表')}</div></div>
            <div class="card"><div class="card-head"><div class="card-title">ARP 关联终端流量</div><div class="subtle">按实时流量排序</div></div><div class="card-body">${table(['名称', 'IP', '实时上行速率', '实时下行速率', 'MAC', '连接数'], terminalRows, '当前未读取到终端联动数据')}</div></div>
          </div>
        </section>`;
    }

    function renderTrafficAudit(snapshot) {
      const connections = snapshot.connections || {};
      const terminals = snapshot.terminals || [];
      const protocolSplit = formatProtocolSplit(connections);
      const protocolSampleTime = formatProtocolSampleTime(connections);
      const topIpRows = (connections.topIps || []).map((row) => `
        <tr>
          <td>${escapeHtml(row.ip)}</td>
          <td>${renderEditableNameCell(row, row.ip, row.ip || '-')}</td>
          <td>${fmtNumber(row.connections)}</td>
          <td>${fmtRate(row.upRate)}</td>
          <td>${fmtRate(row.downRate)}</td>
        </tr>`);
      const activeRows = (connections.active || []).map((row) => `
        <tr>
          <td>${escapeHtml(row.localIp)}</td>
          <td>${escapeHtml(row.remoteIp)}</td>
          <td>${tag(row.protocol, 'info')}</td>
          <td>${fmtRate(row.upRate)}</td>
          <td>${fmtRate(row.downRate)}</td>
          <td>${escapeHtml(row.timeout)}</td>
          <td>${escapeHtml(row.mark || '-')}</td>
        </tr>`);
      const terminalRows = terminals.slice(0, 20).map((row) => `
        <tr>
          <td>${renderEditableNameCell(row, row.ip, row.ip || '-')}</td>
          <td>${escapeHtml(row.ip)}</td>
          <td>${fmtRate(row.upRate)}</td>
          <td>${fmtRate(row.downRate)}</td>
          <td>${fmtNumber(row.connections)}</td>
          <td>${fmtBytes(row.sessionBytes)}</td>
        </tr>`);
      return section('流量审计', 'trafficAudit', withScaleHint(snapshot, '活跃连接、单 IP 流量排行与会话审计数据集中查看', 'connectionsActive'), `
        <div class="grid-4">
          ${metricCard('连接总数', fmtCompact(connections.total), '连接跟踪总量', '')}
          ${metricCard('活跃会话', fmtNumber((connections.active || []).length), '实时有流量会话', '')}
          ${metricCard('协议拆分', protocolSplit, '最近一次全量采样', protocolSampleTime)}
          ${metricCard('审计刷新', connections.detailUpdatedAt ? escapeHtml(connections.detailUpdatedAt) : '等待采集', '会话明细刷新时间', '')}
        </div>
        <div class="grid-2" style="margin-top:12px">
          <div class="card"><div class="card-head"><div class="card-title">单 IP 活跃连接排行</div><div class="subtle">按当前活跃会话聚合</div></div><div class="card-body">${table(['本地 IP', '主机名', '活跃连接', '实时上行速率', '实时下行速率'], topIpRows, '当前未读取到单 IP 排行')}</div></div>
          <div class="card"><div class="card-head"><div class="card-title">当前活跃连接</div><div class="subtle">限前 ${fmtNumber((connections.active || []).length)} 条</div></div><div class="card-body">${table(['本地 IP', '远端地址', '协议', '实时上行速率', '实时下行速率', '超时', '连接标记'], activeRows, '当前未读取到活跃连接')}</div></div>
        </div>
        <div class="card" style="margin-top:12px"><div class="card-head"><div class="card-title">终端流量审计</div><div class="subtle">按终端流量排序</div></div><div class="card-body">${table(['名称', 'IP', '实时上行速率', '实时下行速率', '连接数', '累计流量'], terminalRows, '当前未读取到终端流量审计数据')}</div></div>`);
    }

    function renderApp(snapshot) {
      const warning = snapshot.status !== 'ok'
        ? `<div class="notice danger" style="margin-bottom:12px">采集状态异常：${escapeHtml(snapshot.error || '未知错误')}。当前页面展示的是最近一次可用数据快照。</div>`
        : '';
      const renderers = {
        overview: renderOverview,
        interfaces: renderInterfaces,
        dhcp: renderDhcp,
        routes: renderRoutes,
        terminals: renderTerminals,
        connections: renderConnections,
        trafficLoad: renderTrafficLoad,
        lineStatus: renderLineStatus,
        dns4: renderDnsV4,
        dns6: renderDnsV6,
        security: (activeSnapshot) => renderSecurity(activeSnapshot, {
          id: 'security',
          title: 'ACL 规则',
          tip: 'Filter 规则、名单与异常访问告警按真实数据只读展示'
        }),
        arp: renderArp,
        trafficAudit: renderTrafficAudit,
        balance: renderBalance,
        logs: renderLogs,
        loadAudit: renderLoadAudit,
        serviceLogs: renderServiceLogs
      };
      const renderer = renderers[currentSection] || renderOverview;
      appEl.innerHTML = `${warning}${renderer(snapshot)}`;
      prepareCompactSection();
      syncTopMetricsVisibility();
      syncSectionTopbarState();
      restoreFoldStates();
    }

    function renderFailure(message) {
      const meta = pageMeta[currentSection];
      pageTitleEl.textContent = meta.title;
      setPageSubtitle(`${meta.subtitle} · 当前仅显示故障提示`);
      healthDotEl.className = 'dot danger';
      updateTextEl.textContent = '采集失败';
      updateRefreshMeta();
      if (frameEl) {
        frameEl.classList.remove('page-compact-topbar', 'arp-compact');
      }
      if (topMetricsEl) {
        topMetricsEl.style.display = '';
      }
      syncTopbarOffset();
      appEl.innerHTML = `<div class="card"><div class="card-body"><div class="notice danger">本地采集服务暂时不可用：${escapeHtml(message)}</div></div></div>`;
    }

    function scheduleNext() {
      clearTimeout(pollTimer);
      clearInterval(countdownTimer);
      nextRefreshAt = null;
      if (IS_TEST_MODE) {
        updateRefreshMeta();
        return;
      }
      nextRefreshAt = Date.now() + REALTIME_REFRESH_SECONDS * 1000;
      countdownTimer = setInterval(updateRefreshMeta, 250);
      pollTimer = setTimeout(() => loadSnapshot('auto'), REALTIME_REFRESH_SECONDS * 1000);
      updateRefreshMeta();
    }

    async function loadSnapshot(triggerMode = 'auto') {
      clearTimeout(pollTimer);
      clearInterval(countdownTimer);
      nextRefreshAt = null;
      updateRefreshMeta();
      manualRefreshBtn.disabled = true;
      manualRefreshBtn.textContent = '刷新中...';
      try {
        let snapshot;
        if (TEST_SNAPSHOT) {
          snapshot = TEST_SNAPSHOT;
        } else {
          const response = await fetch('/api/snapshot', { cache: 'no-store' });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          snapshot = await response.json();
        }
        queueSnapshot(snapshot, triggerMode);
      } catch (error) {
        if (displayedSnapshot || latestSnapshot) {
          const fallbackSnapshot = { ...(latestSnapshot || displayedSnapshot), status: 'error', error: error.message };
          queueSnapshot(fallbackSnapshot, triggerMode);
        } else {
          lastRefreshMode = triggerMode;
          renderFailure(error.message);
        }
      } finally {
        manualRefreshBtn.disabled = false;
        manualRefreshBtn.textContent = '立即刷新';
        applyPendingSnapshotIfIdle();
        scheduleNext();
      }
    }

    document.addEventListener('change', (event) => {
      const overviewWanSelect = event.target.closest('[data-overview-wan-line]');
      if (overviewWanSelect) {
        currentOverviewWanLine = overviewWanSelect.value || 'aggregate';
        noteInteraction(1000);
        if ((displayedSnapshot || latestSnapshot) && currentSection === 'overview') {
          renderApp(displayedSnapshot || latestSnapshot);
        }
      }
    });

    document.addEventListener('click', (event) => {
      const quickSearchButton = event.target.closest('[data-quick-search-open]');
      if (quickSearchButton) {
        event.preventDefault();
        noteInteraction(3600);
        openQuickSearch();
        return;
      }
      const readonlyButton = event.target.closest('[data-readonly-info-open]');
      if (readonlyButton) {
        event.preventDefault();
        noteInteraction(2400);
        openReadonlyInfo();
        return;
      }
      const interfaceViewButton = event.target.closest('[data-interface-view]');
      if (interfaceViewButton) {
        event.preventDefault();
        noteInteraction();
        currentInterfaceView = normalizeInterfaceView(interfaceViewButton.dataset.interfaceView);
        if ((displayedSnapshot || latestSnapshot) && currentSection === 'interfaces') {
          renderApp(displayedSnapshot || latestSnapshot);
        }
        return;
      }
      const interfaceRefreshButton = event.target.closest('[data-interface-refresh]');
      if (interfaceRefreshButton) {
        event.preventDefault();
        loadSnapshot('manual');
        return;
      }
      const interfaceReadonlyButton = event.target.closest('[data-interface-readonly-toggle]');
      if (interfaceReadonlyButton) {
        event.preventDefault();
        noteInteraction();
        interfaceReadonlyOpen = !interfaceReadonlyOpen;
        if ((displayedSnapshot || latestSnapshot) && currentSection === 'interfaces') {
          renderApp(displayedSnapshot || latestSnapshot);
        }
        return;
      }
      const terminalViewButton = event.target.closest('[data-terminal-view]');
      if (terminalViewButton) {
        event.preventDefault();
        noteInteraction();
        currentTerminalView = normalizeTerminalView(terminalViewButton.dataset.terminalView);
        if ((displayedSnapshot || latestSnapshot) && currentSection === 'terminals') {
          renderApp(displayedSnapshot || latestSnapshot);
        }
        return;
      }
      const terminalRefreshButton = event.target.closest('[data-terminal-refresh]');
      if (terminalRefreshButton) {
        event.preventDefault();
        loadSnapshot('manual');
        return;
      }
      const ipAliasButton = event.target.closest('[data-ip-alias-edit]');
      if (ipAliasButton) {
        event.preventDefault();
        void saveIpAlias(
          ipAliasButton.dataset.ip,
          ipAliasButton.dataset.currentName || '',
          ipAliasButton.dataset.autoName || ''
        );
        return;
      }
      const link = event.target.closest('[data-section]');
      if (!link) return;
      const groupId = link.dataset.navGroup;
      if (groupId) currentNavGroup = groupId;
      event.preventDefault();
      noteInteraction(1800);
      setActiveSection(link.dataset.section);
    });

    function buildTopMetrics(snapshot) {
      const o = snapshot.overview || {};
      const interfaces = snapshot.interfaces || [];
      const pppoe = snapshot.pppoe || [];
      const terminals = snapshot.terminals || [];
      const arp = snapshot.arp || { items: [] };
      const dhcp = snapshot.dhcp || { leases: [], pools: [] };
      const connections = snapshot.connections || {};
      const dns = snapshot.dns || {};
      const security = snapshot.security || {};
      const lb = snapshot.loadBalance || {};
      const routes = snapshot.routes || {};
      const logs = snapshot.logs || {};
      const activePppoe = pppoe.filter((row) => row.running).length;
      const activeInterfaces = interfaces.filter((row) => row.running).length;
      const busiestLine = pppoe.slice().sort((a, b) => ((b.upRate + b.downRate) - (a.upRate + a.downRate)))[0];

      switch (currentSection) {
        case 'interfaces':
          return [
            ['在线接口', `${fmtNumber(activeInterfaces)} / ${fmtNumber(interfaces.length)}`],
            ['在线线路', `${fmtNumber(activePppoe)} / ${fmtNumber(pppoe.length)}`],
            ['当前主线路', busiestLine ? `${escapeHtml(busiestLine.name)} 路 ${fmtRate((busiestLine.upRate || 0) + (busiestLine.downRate || 0))}` : '-'],
            ['总上行速率', fmtRate(o.uplinkBps)],
            ['总下行速率', fmtRate(o.downlinkBps)]
          ];
        case 'dhcp':
          return [
            ['DHCP 服务数', fmtNumber((dhcp.servers || []).length)],
            ['地址池', fmtNumber((dhcp.pools || []).length)],
            ['已绑定租约', fmtNumber((dhcp.leases || []).filter((row) => row.status === 'bound').length)],
            ['静态分配', fmtNumber((dhcp.leases || []).filter((row) => row.static).length)]
          ];
        case 'terminals':
          return [
            ['在线终端', fmtNumber(terminals.length)],
            ['ARP 条目', fmtNumber((arp.items || []).length)],
            ['DHCP 地址池', fmtNumber((dhcp.pools || []).length)],
            ['DHCP 租约', fmtNumber((dhcp.leases || []).length)]
          ];
        case 'connections':
          // The page body carries the protocol KPI row; avoid repeating it in the topbar.
          return [
            ['协议采样', formatProtocolSampleTime(connections)],
            ['明细刷新', connections.detailUpdatedAt ? escapeHtml(connections.detailUpdatedAt) : '等待采集']
          ];
        case 'trafficLoad':
          {
            const activeTrafficTerminals = (terminals || []).filter((row) => Number(row.upRate || 0) + Number(row.downRate || 0) > 0).length;
            return [
              ['在线宽带', `${fmtNumber(activePppoe)} / ${fmtNumber(pppoe.length)}`],
              ['总上行速率', fmtRate(o.uplinkBps)],
              ['总下行速率', fmtRate(o.downlinkBps)],
              ['最忙线路', busiestLine ? `${escapeHtml(busiestLine.name)} 路 ${fmtRate((busiestLine.upRate || 0) + (busiestLine.downRate || 0))}` : '-'],
              ['有流量终端', fmtNumber(activeTrafficTerminals)]
            ];
          }
        case 'loadAudit':
          return [
            ['CPU 使用率', fmtPercent(o.cpuLoad)],
            ['内存占用率', fmtPercent(o.memoryUsage)],
            ['磁盘占用率', fmtPercent(o.diskUsage)],
            ['系统状态', tag(o.systemLoadLevel === 'danger' ? '高压' : o.systemLoadLevel === 'warning' ? '预警' : '正常', o.systemLoadLevel)],
            ['连接总数', fmtCompact(connections.total)]
          ];
        case 'lineStatus':
          // The page body carries a fuller tile strip; an extra topbar row would repeat it.
          return [];
        case 'dns4':
          {
            const dnsVisibleRuleCount = dnsRuleBrowser.loaded
              ? Number(dnsRuleBrowser.visibleRuleCount || (dnsRuleBrowser.rows || []).length || 0)
              : Number(dns.visibleRuleCount || (dns.forwardRules || []).length || 0);
            const dnsTotalRuleCount = Number(dns.forwardRuleCount || dnsVisibleRuleCount || 0);
            return [
              ['DNS 状态', dns.running ? '启用' : '未启用'],
              ['上游 DNS', fmtNumber((dns.servers || []).length)],
              ['缓存已用', dns.cacheUsed ? fmtBytes(dns.cacheUsed) : '未提供'],
              ['静态规则', `${fmtNumber(dnsVisibleRuleCount)} / ${fmtNumber(dnsTotalRuleCount)}`]
            ];
          }
        case 'dns6':
          {
            const enabledNdCount = (dns.ipv6Nd || []).filter((row) => row.advertiseDns).length;
            const boundPrefixClients = (dns.ipv6DhcpClients || []).filter((row) => row.status === 'bound').length;
            return [
              ['ND 接口', fmtNumber((dns.ipv6Nd || []).length)],
              ['广播 DNS', fmtNumber(enabledNdCount)],
              ['DHCPv6 Client', fmtNumber((dns.ipv6DhcpClients || []).length)],
              ['Prefix 绑定', fmtNumber(boundPrefixClients)]
            ];
          }
        case 'routes':
          return [
            ['静态路由', fmtNumber(routes.staticCount)],
            ['活动静态路由', fmtNumber(routes.activeStaticCount)],
            ['默认路由', fmtNumber(routes.defaultCount)],
            ['路由表', fmtNumber(routes.tableCount)]
          ];
        case 'security':
          return [
            ['Filter 规则', fmtNumber((security.filters || []).length)],
            ['地址名单', fmtNumber((security.addressLists || []).length)],
            ['异常告警', fmtNumber((security.alerts || []).length)],
            ['ACL 状态', (security.filters || []).length ? '已读取' : '未读取']
          ];
        case 'arp':
          return [];
        case 'trafficAudit':
          return [
            ['连接总数', fmtCompact(connections.total)],
            ['TCP', hasProtocolBreakdown(connections) ? fmtCompact(connections.tcp) : '未采集'],
            ['UDP', hasProtocolBreakdown(connections) ? fmtCompact(connections.udp) : '未采集'],
            ['ICMP', hasProtocolBreakdown(connections) ? fmtCompact(connections.icmp) : '未采集'],
            ['活跃会话', fmtNumber((connections.active || []).length)],
            ['协议采样', formatProtocolSampleTime(connections)]
          ];
        case 'balance':
          return [
            ['活动线路', fmtNumber(lb.activeLines)],
            ['默认路由', fmtNumber((lb.defaultRoutes || []).length)],
            ['Mangle 规则', fmtNumber((lb.mangleRules || []).length)],
            ['策略路由', fmtNumber((lb.routingRules || []).length)]
          ];
        case 'logs':
        case 'serviceLogs':
          return [
            ['全部日志', fmtNumber((logs.all || []).length)],
            ['系统日志', fmtNumber((logs.system || []).length)],
            ['Firewall', fmtNumber((logs.firewall || []).length)],
            ['DHCP / DNS', `${fmtNumber((logs.dhcp || []).length)} / ${fmtNumber((logs.dns || []).length)}`]
          ];
        case 'overview':
        default:
          return [];
      }
    }

    function renderDnsV4(snapshot) {
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
            ? '全量浏览读取失败，已回退预览'
            : '快照预览';
      const disabledRuleLabel = dns.forwardRuleSample
        ? `预览停用 ${fmtNumber(dns.disabledForwardRuleCount || 0)} 条`
        : `停用 ${fmtNumber(dns.disabledForwardRuleCount || 0)} 条`;
      const ruleEmptyText = totalRuleCount
        ? dnsRuleBrowser.loading
          ? '正在读取当前页 DNS 静态规则...'
          : dnsRuleBrowser.error
            ? '当前页读取失败，已回退到快照预览'
            : '当前页暂无可展示的 DNS 静态规则'
        : '暂无 DNS 静态规则';
      const browserNotice = dnsRuleBrowser.error
        ? `<div class="notice" style="margin-bottom:12px">DNS 静态规则页读取失败：${escapeHtml(dnsRuleBrowser.error)}，当前先回退显示快照预览。</div>`
        : dnsRuleBrowser.loading
          ? `<div class="notice" style="margin-bottom:12px">正在读取 DNS 静态规则第 ${fmtNumber(currentPage)} 页数据，加载完成后会自动更新。</div>`
          : '';
      const listText = (values, fallback = '-') => (values && values.length ? values.map(escapeHtml).join('<br>') : fallback);
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
          ${metricCard('DNS 服务状态', tag(dns.running ? '启用' : '未启用', dns.running ? 'ok' : 'danger'), `上游 DNS ${fmtNumber((dns.servers || []).length)} 个`, dns.dohServer ? 'DoH 已配置' : 'DoH 未配置')}
          ${metricCard('缓存占用', fmtBytes(dns.cacheUsed || 0), `缓存容量 ${fmtBytes(dns.cacheSize || 0)}`, '')}
          ${metricCard('静态规则总数', fmtNumber(totalRuleCount), `当前展示 ${fmtNumber(visibleRuleCount)} 条`, disabledRuleLabel)}
          ${metricCard('规则浏览状态', browserStateText, dnsRuleBrowser.loading ? '当前正在刷新规则页' : '规则浏览已就绪', dnsRuleBrowser.error ? '最近一次分页读取失败' : '')}
        </div>
        <div class="grid-2" style="margin-top:12px">
          <div class="card"><div class="card-head"><div class="card-title">DNS 上游与 DoH 参数</div><div class="subtle">仅展示 RouterOS 实际可读参数</div></div><div class="card-body">${infoGrid([
            {k:'上游 DNS', v: listText(dns.servers, '未读取到')},
            {k:'DoH 服务器', v: dns.dohServer ? escapeHtml(dns.dohServer) : '未配置'},
            {k:'DoH 证书校验', v: dns.dohServer ? (dns.verifyDohCert ? tag('开启', 'ok') : tag('关闭', 'warn')) : '-'},
            {k:'缓存占用', v: `${fmtBytes(dns.cacheUsed || 0)} / ${fmtBytes(dns.cacheSize || 0)}`}
          ])}</div></div>
          <div class="card"><div class="card-head"><div class="card-title">规则汇总</div><div class="subtle">静态 DNS / Forward 规则只读展示</div></div><div class="card-body">${infoGrid([
            {k:'规则总数', v: fmtNumber(totalRuleCount)},
            {k:'当前页展示', v: fmtNumber(visibleRuleCount)},
            {k:'停用规则', v: fmtNumber(dns.disabledForwardRuleCount || 0)},
            {k:'数据来源', v: dns.forwardRuleSample ? '快照预览 + 分页补充' : '全量快照'}
          ])}</div></div>
        </div>
        <div class="card" style="margin-top:12px">
          <div class="card-head">
            <div class="card-title">DNS 静态规则 / 转发规则</div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end">
              <span class="subtle">${browserStateText} · 当前展示 ${fmtNumber(visibleRuleCount)} / ${fmtNumber(totalRuleCount)} 条</span>
              <button class="action-btn" type="button" data-dns-rules-refresh ${dnsRuleBrowser.loading ? 'disabled' : ''}>刷新当前页</button>
              <button class="action-btn" type="button" data-dns-rules-page="prev" ${canPrev ? '' : 'disabled'}>上一页</button>
              <button class="action-btn" type="button" data-dns-rules-page="next" ${canNext ? '' : 'disabled'}>下一页</button>
            </div>
          </div>
          <div class="card-body">${browserNotice}${table(['名称 / 正则', '类型', '目标值', 'TTL', '状态', '备注'], ruleRows, ruleEmptyText)}</div>
        </div>`);
    }

    function renderDnsV6(snapshot) {
      const dns = snapshot.dns || {};
      const enabledNdCount = (dns.ipv6Nd || []).filter((row) => row.advertiseDns).length;
      const managedNdCount = (dns.ipv6Nd || []).filter((row) => row.managed).length;
      const otherConfigCount = (dns.ipv6Nd || []).filter((row) => row.otherConfig).length;
      const dhcpClientCount = (dns.ipv6DhcpClients || []).length;
      const boundPrefixClients = (dns.ipv6DhcpClients || []).filter((row) => row.status === 'bound').length;
      const peerDnsClients = (dns.ipv6DhcpClients || []).filter((row) => row.usePeerDns).length;
      const listText = (values, fallback = '-') => (values && values.length ? values.map(escapeHtml).join('<br>') : fallback);
      const ndRows = (dns.ipv6Nd || []).map((row) => `
        <tr>
          <td>${escapeHtml(row.interface)}</td>
          <td>${row.advertiseDns ? tag('开启', 'ok') : tag('关闭', 'warn')}</td>
          <td>${listText(row.dnsServers, '未单独指定')}</td>
          <td>${row.managed ? tag('开启', 'info') : tag('关闭', 'ok')}</td>
          <td>${row.otherConfig ? tag('开启', 'info') : tag('关闭', 'ok')}</td>
          <td>${escapeHtml(row.raLifetime || '-')}</td>
        </tr>`);
      const dhcpClientRows = (dns.ipv6DhcpClients || []).map((row) => `
        <tr>
          <td>${escapeHtml(row.interface)}</td>
          <td>${tag(row.status || '-', row.status === 'bound' ? 'ok' : 'warn')}</td>
          <td>${escapeHtml(row.pool || '-')}</td>
          <td>${escapeHtml(row.prefix || '-')}</td>
          <td>${row.usePeerDns ? tag('开启', 'ok') : tag('关闭', 'info')}</td>
          <td>${row.addDefaultRoute ? `开启 / distance ${escapeHtml(row.defaultRouteDistance || '-')}` : '关闭'}</td>
        </tr>`);
      return section('DNS IPv6', 'dns6', 'RouterOS 可读到的 ND、RA 与 DHCPv6 Prefix 信息', `
        <div class="grid-4">
          ${metricCard('ND 接口数', fmtNumber((dns.ipv6Nd || []).length), `广播 DNS ${fmtNumber(enabledNdCount)} 个`, '')}
          ${metricCard('Managed / Other', `${fmtNumber(managedNdCount)} / ${fmtNumber(otherConfigCount)}`, 'ND 标志位统计', '')}
          ${metricCard('DHCPv6 Client', fmtNumber(dhcpClientCount), `Peer DNS ${fmtNumber(peerDnsClients)} 个`, '')}
          ${metricCard('Prefix 已绑定', fmtNumber(boundPrefixClients), `总客户端 ${fmtNumber(dhcpClientCount)} 个`, '')}
        </div>
        <div class="grid-2" style="margin-top:12px">
          <div class="card"><div class="card-head"><div class="card-title">IPv6 ND / RA 概览</div><div class="subtle">来自 ipv6/nd</div></div><div class="card-body">${infoGrid([
            {k:'ND 接口', v: fmtNumber((dns.ipv6Nd || []).length)},
            {k:'广播 DNS', v: fmtNumber(enabledNdCount)},
            {k:'Managed', v: fmtNumber(managedNdCount)},
            {k:'Other Config', v: fmtNumber(otherConfigCount)}
          ])}</div></div>
          <div class="card"><div class="card-head"><div class="card-title">DHCPv6 / Prefix 概览</div><div class="subtle">来自 ipv6/dhcp-client</div></div><div class="card-body">${infoGrid([
            {k:'Client 数量', v: fmtNumber(dhcpClientCount)},
            {k:'Prefix 已绑定', v: fmtNumber(boundPrefixClients)},
            {k:'Peer DNS', v: fmtNumber(peerDnsClients)},
            {k:'默认路由启用', v: fmtNumber((dns.ipv6DhcpClients || []).filter((row) => row.addDefaultRoute).length)}
          ])}</div></div>
        </div>
        <div class="grid-2" style="margin-top:12px">
          <div class="card"><div class="card-head"><div class="card-title">IPv6 ND 广播</div><div class="subtle">${fmtNumber((dns.ipv6Nd || []).length)} 个接口</div></div><div class="card-body">${table(['接口', '广播 DNS', '显式 DNS', 'Managed', 'Other Config', 'RA 生命周期'], ndRows, '当前未读取到 IPv6 ND 广播配置')}</div></div>
          <div class="card"><div class="card-head"><div class="card-title">IPv6 DHCP Client / Prefix</div><div class="subtle">${fmtNumber(dhcpClientCount)} 个客户端</div></div><div class="card-body">${table(['接口', '状态', '前缀池', '前缀 / 地址', 'Peer DNS', '默认路由'], dhcpClientRows, '当前未读取到 IPv6 DHCP Client')}</div></div>
        </div>`);
    }

    function renderServiceLogs(snapshot) {
      const logs = snapshot.logs || {};
      const dhcp = snapshot.dhcp || {};
      const dns = snapshot.dns || {};
      const dnsTotalRuleCount = Number(dns.forwardRuleCount || dns.visibleRuleCount || (dns.forwardRules || []).length || 0);
      const renderRows = (rows) => (rows || []).slice(0, 20).map((row) => `
        <tr>
          <td>${escapeHtml(row.time)}</td>
          <td>${escapeHtml(row.topics)}</td>
          <td>${escapeHtml(row.message)}</td>
        </tr>`);
      return section('服务日志', 'serviceLogs', 'DHCP 与 DNS 服务日志、服务状态和静态规则集中展示', `
        <div class="grid-4">
          ${metricCard('DHCP 日志', fmtNumber((logs.dhcp || []).length), `DHCP 服务 ${fmtNumber((dhcp.servers || []).length)} 个`, '')}
          ${metricCard('DNS 日志', fmtNumber((logs.dns || []).length), `静态规则 ${fmtNumber(dnsTotalRuleCount)} 条`, '')}
          ${metricCard('DNS 状态', dns.running ? tag('启用', 'ok') : tag('未启用', 'danger'), '来自 RouterOS ip/dns', '')}
          ${metricCard('服务总览', `${fmtNumber((dhcp.servers || []).length)} / ${fmtNumber((dns.servers || []).length)}`, 'DHCP 服务 / DNS 上游', '')}
        </div>
        <div class="grid-2" style="margin-top:12px">
          <div class="card"><div class="card-head"><div class="card-title">DHCP 服务日志</div><div class="subtle">最近 20 条</div></div><div class="card-body">${table(['时间', '主题', '消息'], renderRows(logs.dhcp), '当前未读取到 DHCP 服务日志')}</div></div>
          <div class="card"><div class="card-head"><div class="card-title">DNS 服务日志</div><div class="subtle">最近 20 条</div></div><div class="card-body">${table(['时间', '主题', '消息'], renderRows(logs.dns), '当前未读取到 DNS 服务日志')}</div></div>
        </div>
        <div class="grid-2" style="margin-top:12px">
          <div class="card"><div class="card-head"><div class="card-title">DHCP 服务状态</div><div class="subtle">RouterOS 可读参数</div></div><div class="card-body">${infoGrid([
            {k:'DHCP 服务', v: fmtNumber((dhcp.servers || []).length)},
            {k:'地址池', v: fmtNumber((dhcp.pools || []).length)},
            {k:'租约', v: fmtNumber((dhcp.leases || []).length)},
            {k:'运行中', v: fmtNumber((dhcp.servers || []).filter((row) => row.running).length)}
          ])}</div></div>
          <div class="card"><div class="card-head"><div class="card-title">DNS 服务状态</div><div class="subtle">RouterOS 可读参数</div></div><div class="card-body">${infoGrid([
            {k:'DNS 状态', v: dns.running ? '启用' : '未启用'},
            {k:'上游 DNS', v: fmtNumber((dns.servers || []).length)},
            {k:'DoH', v: dns.dohServer ? escapeHtml(dns.dohServer) : '未配置'},
            {k:'静态规则', v: fmtNumber(dnsTotalRuleCount)}
          ])}</div></div>
        </div>`);
    }

    function setActiveSection(section, updateHash = true) {
      currentSection = normalizeSection(section);
      if (appShellEl) {
        appShellEl.classList.toggle('home-sidebar-hidden', currentSection === 'overview');
      }
      currentNavGroup = resolveGroup(currentSection, currentNavGroup);
      renderNavigation();
      if (updateHash && window.location.hash !== `#${currentSection}`) {
        window.location.hash = currentSection;
      }
      const meta = pageMeta[currentSection];
      pageTitleEl.textContent = meta.title;
      const snapshotToRender = displayedSnapshot || latestSnapshot;
      if (snapshotToRender) {
        renderTopMetrics(snapshotToRender);
        renderApp(snapshotToRender);
        ensureDnsRuleBrowserLoaded(snapshotToRender);
      } else {
        setPageSubtitle(meta.subtitle);
        updateRefreshMeta();
      }
    }

    async function loadSnapshot(triggerMode = 'auto') {
      clearTimeout(pollTimer);
      clearInterval(countdownTimer);
      nextRefreshAt = null;
      updateRefreshMeta();
      manualRefreshBtn.disabled = true;
      manualRefreshBtn.textContent = '刷新中...';
      try {
        let snapshot;
        if (TEST_SNAPSHOT) {
          snapshot = TEST_SNAPSHOT;
        } else {
          const response = await fetch('/api/snapshot', { cache: 'no-store' });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          snapshot = await response.json();
        }
        queueSnapshot(snapshot, triggerMode);
        if (isDnsRuleBrowserSection() && triggerMode === 'manual' && !TEST_SNAPSHOT && (dnsRuleBrowser.loaded || dnsRuleBrowser.error)) {
          await loadDnsRuleBrowser({ force: true, offset: dnsRuleBrowser.offset, limit: dnsRuleBrowser.limit });
        }
      } catch (error) {
        if (displayedSnapshot || latestSnapshot) {
          const fallbackSnapshot = { ...(latestSnapshot || displayedSnapshot), status: 'error', error: error.message };
          queueSnapshot(fallbackSnapshot, triggerMode);
        } else {
          lastRefreshMode = triggerMode;
          renderFailure(error.message);
        }
      } finally {
        manualRefreshBtn.disabled = false;
        manualRefreshBtn.textContent = '立即刷新';
        applyPendingSnapshotIfIdle();
        scheduleNext();
      }
    }

    document.addEventListener('click', (event) => {
      const dnsRefreshButton = event.target.closest('[data-dns-rules-refresh]');
      if (dnsRefreshButton) {
        event.preventDefault();
        noteInteraction(2400);
        void loadDnsRuleBrowser({ force: true, offset: dnsRuleBrowser.offset, limit: dnsRuleBrowser.limit });
        return;
      }
      const dnsPageButton = event.target.closest('[data-dns-rules-page]');
      if (!dnsPageButton) return;
      event.preventDefault();
      noteInteraction(2400);
      const step = Math.max(1, Number(dnsRuleBrowser.limit || DNS_RULE_PAGE_SIZE));
      const totalCount = Math.max(0, Number(dnsRuleBrowser.totalCount || 0));
      const maxOffset = totalCount > 0 ? Math.max(0, Math.floor((totalCount - 1) / step) * step) : 0;
      const nextOffset = dnsPageButton.dataset.dnsRulesPage === 'prev'
        ? Math.max(0, Number(dnsRuleBrowser.offset || 0) - step)
        : Math.min(maxOffset, Number(dnsRuleBrowser.offset || 0) + step);
      void loadDnsRuleBrowser({ force: true, offset: nextOffset, limit: step });
    });

    appEl.addEventListener('pointerdown', () => noteInteraction(3600), true);
    appEl.addEventListener('wheel', () => noteInteraction(2400), { passive: true });
    appEl.addEventListener('keydown', () => noteInteraction(3000), true);
    document.addEventListener('selectionchange', () => {
      if (hasSelectionInsideApp()) {
        noteInteraction(4200);
      } else if (pendingSnapshot) {
        armInteractionResume();
      }
    });
    document.addEventListener('copy', () => noteInteraction(4200));
    window.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        applyPendingSnapshotIfIdle();
      }
      updateRefreshMeta();
    });
    window.addEventListener('resize', scheduleSectionTopbarState);
    window.addEventListener('scroll', scheduleSectionTopbarState, { passive: true });
    manualRefreshBtn.addEventListener('click', () => loadSnapshot('manual'));
    window.addEventListener('hashchange', () => {
      noteInteraction(1600);
      setActiveSection((window.location.hash || '').replace('#', ''), false);
    });

    function resolveBootstrapSection() {
      const params = new URLSearchParams(window.location.search || '');
      if (!params.has('section')) {
        return (window.location.hash || '').replace('#', '');
      }
      const nextSection = normalizeSection(params.get('section'));
      const nextHash = `#${nextSection}`;
      if (window.location.hash !== nextHash) {
        if (window.history && typeof window.history.replaceState === 'function') {
          window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${nextHash}`);
        } else {
          window.location.hash = nextSection;
        }
      }
      return nextSection;
    }

    lockPageSubtitleHidden();
    renderNavigation();
    setActiveSection(resolveBootstrapSection(), false);
    loadSnapshot('init');
  
/* ===== folded from assets/panel.js (2026-09-29) — do not re-order: must run after boot sequence, before whitespace/readonly layers ===== */
(() => {
      if (window.__layoutDensityPatchV1) return;
      window.__layoutDensityPatchV1 = true;

      const densityStyle = document.createElement('style');
      densityStyle.textContent = `
        .sidebar { padding-top: 0; }
        .ik-brand { padding: 4px 6px 8px; }
        .ik-search-pill { margin: 0 6px 8px; min-height: 26px; }
        .nav-group { padding: 4px 4px 12px; }
        #interfaces .ik-topology-board { padding: 12px 14px; margin-bottom: 10px; }
        #interfaces .ik-topology-grid { grid-template-columns: minmax(0, 1fr) 132px; gap: 12px; align-items: start; }
        #interfaces .ik-topology-nodes { justify-content: flex-start; gap: 12px; min-height: 64px; }
        #interfaces .ik-device-node { min-width: 72px; padding: 8px 10px; gap: 6px; }
        #interfaces .ik-device-node span:first-child { width: 32px; height: 24px; }
        #interfaces .ik-device-node span:first-child::before { left: 6px; width: 14px; height: 6px; }
        #interfaces .ik-device-meta strong { font-size: 14px; }
        #interfaces .ik-topology-side { min-width: 132px; gap: 8px; }
        #interfaces .ik-topology-stat { padding-left: 10px; }
        #interfaces .ik-topology-stat b { font-size: 18px; margin-bottom: 2px; }
        #interfaces .ik-topology-legend { gap: 12px; margin-top: 10px; }
        #interfaces .ik-data-toolbar { margin-top: 8px; }
        #interfaces .grid-2 { align-items: start; }
        #terminals .grid-2 { align-items: start; }
        #terminals .grid-2 > .stack { gap: 12px; }
      `;
      document.head.appendChild(densityStyle);

      const VIRTUAL_TYPES = new Set(['wg', 'loopback', 'l2tp-out', 'vlan', 'macvlan']);
      const TOPOLOGY_LABELS = { wan: 'WAN', lan: 'LAN', vnet: 'VNET' };

      function getSelectedTopologyRows(snapshot) {
        const interfaces = snapshot.interfaces || [];
        const pppoe = sortPppoeNamedRows(snapshot.pppoe || []);
        if (currentInterfaceTopology === 'wan') {
          return pppoe.map((row) => ({
            name: row.name,
            upRate: Number(row.upRate || 0),
            downRate: Number(row.downRate || 0),
            level: !row.running ? 'danger' : (row.addresses || []).length ? 'ok' : 'warn'
          }));
        }
        const rows = interfaces.filter((row) => row.role === 'LAN' && (currentInterfaceTopology === 'vnet'
          ? VIRTUAL_TYPES.has(String(row.type || '').toLowerCase())
          : !VIRTUAL_TYPES.has(String(row.type || '').toLowerCase())));
        return rows.map((row) => ({
          name: row.name,
          upRate: Number(row.txRate || 0),
          downRate: Number(row.rxRate || 0),
          level: !row.running
            ? 'danger'
            : (Number(row.txDrop || 0) + Number(row.rxDrop || 0) + Number(row.txError || 0) + Number(row.rxError || 0)) > 0
              ? 'warn'
              : 'ok'
        }));
      }

      function buildSelectedRateBlockHtml(snapshot) {
          const rows = (currentInterfaceTopology === 'wan'
            ? getSelectedTopologyRows(snapshot)
            : getSelectedTopologyRows(snapshot).sort((a, b) => ((b.upRate + b.downRate) - (a.upRate + a.downRate))))
            .slice(0, 8);
        if (!rows.length) {
          return emptyBlock(`暂无 ${TOPOLOGY_LABELS[currentInterfaceTopology] || '接口'} 监控对象`);
        }
        const baseRate = Math.max(...rows.map((row) => row.upRate + row.downRate), 1);
        return rows.map((row) => {
          const totalRate = row.upRate + row.downRate;
          const percent = Math.max(2, (totalRate / baseRate) * 100);
          const gradient = row.level === 'danger'
            ? 'linear-gradient(90deg,#ff7a7a 0%,#ff4d4f 100%)'
            : row.level === 'warn'
              ? 'linear-gradient(90deg,#ffc46b 0%,#ff9f1c 100%)'
              : 'linear-gradient(90deg,#7da8ff 0%,#165dff 100%)';
          return `<div class="line-bar"><div class="line-name">${escapeHtml(row.name)}</div>${progress(percent, gradient)}<div class="line-share">${fmtRate(totalRate)}</div></div>`;
        }).join('');
      }

      function buildLeasePreviewHtml(snapshot) {
        const leases = ((snapshot.dhcp || {}).leases || []).slice(0, 8);
        const rows = leases.map((row) => `
          <tr>
            <td>${escapeHtml(row.address)}</td>
            <td>${renderEditableNameCell(row, row.address, row.address || '-')}</td>
            <td>${tag(row.status, row.status === 'bound' ? 'ok' : 'warn')}</td>
            <td>${row.static ? tag('静态', 'info') : tag('动态', 'ok')}</td>
            <td>${escapeHtml(toDisplayText(row.lastSeen || '-'))}</td>
          </tr>`).join('');
        return table(['IP', '主机名', '状态', '分配方式', '最后出现'], rows, '暂无 DHCP 租约概览');
      }

      const originalRenderInterfaces = renderInterfaces;
      renderInterfaces = function patchedRenderInterfaces(snapshot) {
        const html = originalRenderInterfaces(snapshot);
        if (currentInterfaceView !== 'monitor') return html;
        try {
          const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
          const section = doc.querySelector('section#interfaces');
          if (!section) return html;
          const board = section.querySelector('.ik-topology-board');
          if (!board || board.textContent.includes('当前选中线路')) return html;
          const summary = doc.createElement('div');
          summary.className = 'ik-topology-summary';
          summary.innerHTML = `
            <div class="ik-topology-summary-head">
              <div class="ik-topology-summary-title">当前选中线路</div>
              <div class="subtle">${escapeHtml(TOPOLOGY_LABELS[currentInterfaceTopology] || '线路')} / ${fmtNumber(getSelectedTopologyRows(snapshot).length)} 项</div>
            </div>
            <div class="stack">${buildSelectedRateBlockHtml(snapshot)}</div>`;
          board.appendChild(summary);
          return doc.body.innerHTML.trim();
        } catch (error) {
          return html;
        }
      };
      window.renderInterfaces = renderInterfaces;

      const originalRenderTerminals = renderTerminals;
      renderTerminals = function patchedRenderTerminals(snapshot) {
        const html = originalRenderTerminals(snapshot);
        if (currentTerminalView !== 'ipv4') return html;
        try {
          const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
          const section = doc.querySelector('section#terminals');
          if (!section) return html;
          const container = section.querySelector('.card > .card-body');
          if (!container) return html;
          const targetGrid = Array.from(section.querySelectorAll('.grid-2'))
            .find((node) => node.textContent.includes('ARP 列表') && node.textContent.includes('DHCP 地址池'));
          if (!targetGrid) return html;
          const poolCard = Array.from(targetGrid.children).find((node) => node.textContent.includes('DHCP 地址池'));
          if (poolCard && !targetGrid.textContent.includes('DHCP 租约概览')) {
            const stack = doc.createElement('div');
            stack.className = 'stack';
            stack.appendChild(poolCard.cloneNode(true));
            const previewCard = doc.createElement('div');
            previewCard.className = 'card';
            previewCard.innerHTML = `
              <div class="card-head">
                <div class="card-title">DHCP 租约概览</div>
                <div class="subtle">${fmtNumber((((snapshot.dhcp || {}).leases) || []).length)} 条</div>
              </div>
              <div class="card-body">${buildLeasePreviewHtml(snapshot)}</div>`;
            stack.appendChild(previewCard);
            poolCard.replaceWith(stack);
          }
          const children = Array.from(container.children);
          const tabs = children.find((node) => node.classList?.contains('ik-subtabs'));
          const toolbar = children.find((node) => node.classList?.contains('ik-data-toolbar'));
          const notice = children.find((node) => node.classList?.contains('notice'));
          const grid = Array.from(container.children).find((node) => node.classList?.contains('grid-2') && node.textContent.includes('ARP 列表'));
          const leaseCard = Array.from(container.children).find((node) => node.classList?.contains('card') && node.textContent.includes('DHCP 租约与静态分配'));
          const primaryList = Array.from(container.children).find((node) => {
            if (node === tabs || node === toolbar || node === notice || node === grid || node === leaseCard) return false;
            return node.classList?.contains('record-list') || node.classList?.contains('table-wrap') || node.classList?.contains('empty');
          });
          if (tabs && toolbar && grid && leaseCard && primaryList) {
            const terminalCard = doc.createElement('div');
            terminalCard.className = 'card';
            terminalCard.style.marginTop = '12px';
            terminalCard.innerHTML = `
              <div class="card-head">
                <div class="card-title">在线终端列表</div>
                <div class="subtle">${fmtNumber((snapshot.terminals || []).filter((row) => !String(row.ip || '').includes(':')).length)} 台</div>
              </div>
              <div class="card-body"></div>`;
            terminalCard.querySelector('.card-body').appendChild(primaryList.cloneNode(true));
            container.innerHTML = '';
            container.appendChild(tabs);
            container.appendChild(toolbar);
            if (notice) container.appendChild(notice);
            container.appendChild(grid);
            container.appendChild(terminalCard);
            container.appendChild(leaseCard);
          }
          return doc.body.innerHTML.trim();
        } catch (error) {
          return html;
        }
      };
      window.renderTerminals = renderTerminals;

      const snapshotToRender = displayedSnapshot || latestSnapshot;
      if (snapshotToRender) {
        renderApp(snapshotToRender);
        if (typeof ensureDnsRuleBrowserLoaded === 'function') {
          ensureDnsRuleBrowserLoaded(snapshotToRender);
        }
      }
    })();
  

/* ── 切换路由器（多路由器档案一键切换）────────────────────────── */
(function(){
  let switchBusy = false;
  function $(id){ return document.getElementById(id); }
  function esc(v){ const d = document.createElement('div'); d.textContent = v == null ? '' : String(v); return d.innerHTML; }
  let routerLoginState = null;
  function sameLogin(row, login) {
    if (!row || !login) return false;
    if (login.savedId && row.id === String(login.savedId)) return true;
    return String(row.host || '') === String(login.host || '') && String(row.user || '') === String(login.user || '');
  }
  function renderSwitcher(login, saved) {
    const wrap = $('routerSwitchWrap'), select = $('routerSwitcher');
    if (!wrap || !select) return;
    routerLoginState = login || routerLoginState;
    const list = Array.isArray(saved) ? saved.filter(function(r){ return r && r.id; }) : [];
    wrap.hidden = false;
    const currentLabel = routerLoginState && routerLoginState.host
      ? ((routerLoginState.host || '') + ' · ' + (routerLoginState.user || ''))
      : '未连接';
    const options = ['<option value="">' + esc(currentLabel) + '</option>'];
    list.forEach(function(row){
      const isCur = sameLogin(row, routerLoginState);
      const state = row.lastTest && row.lastTest.rest && row.lastTest.rest.ok === true ? '在线' : (row.lastTest && row.lastTest.ssh && row.lastTest.ssh.ok === true ? 'SSH 可用' : (row.lastTest ? '待验证' : '未验证'));
      options.push('<option value="' + esc(row.id) + '"' + (isCur ? ' selected' : '') + '>' + esc(row.label || row.host || '') + ' · ' + esc(row.user || '') + ' · ' + state + '</option>');
    });
    options.push('<option value="__add__">＋ 添加另一台路由器</option>');
    select.innerHTML = options.join('');
  }
  function loadLogins() {
    return fetch('/api/router-login', { cache: 'no-store', credentials: 'same-origin' })
      .then(function(r){ return r.json(); })
      .then(function(p){
        routerLoginState = p.routerLogin || null;
        if (p.csrfToken) window.routerLoginCsrfToken = p.csrfToken;
        window.panelRouterSwitcher.render(p.routerLogin, p.savedLogins);
        return p;
      })
      .catch(function(){ renderSwitcher(null, []); return null; });
  }
  function switchTo(id) {
    if (switchBusy || !id) return;
    if (id === '__add__') {
      if (window.panelRouterSetup && window.panelRouterSetup.open) window.panelRouterSetup.open({ host: '', user: 'admin', sshPort: 22, restScheme: 'http', restPort: 80 });
      loadLogins();
      return;
    }
    const currentId = routerLoginState && routerLoginState.savedId ? String(routerLoginState.savedId) : '';
    if (id === currentId) return;
    switchBusy = true;
    const text = $('updateText'), prev = text ? text.textContent : '';
    if (text) text.textContent = '正在切换路由器…';
    fetch('/api/router-login', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': window.routerLoginCsrfToken || '' },
      body: JSON.stringify({ savedId: id, rememberPassword: true })
    }).then(function(r){ return r.json().catch(function(){ return {}; }).then(function(p){ return { ok: r.ok, p: p }; }); })
      .then(function(res){
        if (!res.ok || res.p.ok === false) throw new Error((res.p && (res.p.error || (res.p.test && ((res.p.test.rest && res.p.test.rest.error) || (res.p.test.ssh && res.p.test.ssh.error))))) || '切换失败');
        routerLoginState = res.p.routerLogin || routerLoginState;
        if (text) text.textContent = '已切换到 ' + ((routerLoginState && routerLoginState.host) || '');
        setTimeout(function(){ window.location.reload(); }, 400);
      })
      .catch(function(err){
        if (text) text.textContent = '切换失败';
        window.alert('切换路由器失败：' + ((err && err.message) || err));
        window.panelRouterSwitcher.reload();
        if (text) text.textContent = prev;
      })
      .finally(function(){ switchBusy = false; });
  }
  document.addEventListener('change', function(e){
    if (e.target && e.target.id === 'routerSwitcher' && e.target.value) switchTo(e.target.value);
  });
  window.panelRouterSwitcher = { render: renderSwitcher, reload: loadLogins };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadLogins);
  else loadLogins();
})();

/* ── 首次连接设置界面（needs_config 时图形化配置）────────────── */
(function(){
  let setupBusy = false;
  function $(id){ return document.getElementById(id); }
  function esc(v){ const d = document.createElement('div'); d.textContent = v == null ? '' : String(v); return d.innerHTML; }
  function renderSetupForm(login) {
    const existing = $('routerSetupOverlay');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.className = 'router-setup-overlay';
    overlay.id = 'routerSetupOverlay';
    const scheme = (login && login.restScheme) || 'http';
    const restPort = (login && login.restPort) || 80;
    const sshPort = (login && login.sshPort) || 22;
    overlay.innerHTML =
      '<div class="router-setup-card" role="dialog" aria-label="建立设备连接">' +
        '<header><div class="router-setup-logo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><circle cx="6" cy="6" r="1"/><circle cx="6" cy="18" r="1"/></svg></div><div><h1>建立设备连接</h1><p>只读监控 · 凭据仅保存在本机</p></div></header>' +
        '<div class="router-setup-body">' +
          '<form id="routerSetupForm" novalidate>' +
            '<div class="router-setup-field"><label for="suHost">设备地址</label><input id="suHost" name="host" autocomplete="off" value="' + esc((login && login.host) || '192.168.88.1') + '"></div>' +
            '<div class="router-setup-row">' +
              '<div class="router-setup-field"><label for="suUser">用户名</label><input id="suUser" name="user" autocomplete="username" value="' + esc((login && login.user) || 'ros-panel-readonly') + '"></div>' +
              '<div class="router-setup-field"><label for="suPassword">密码</label><input id="suPassword" name="password" type="password" autocomplete="current-password"></div>' +
            '</div>' +
            '<details class="router-setup-advanced"><summary>高级连接设置</summary><div class="router-setup-body">' +
              '<div class="router-setup-row">' +
                '<div class="router-setup-field"><label for="suSshPort">SSH 端口</label><input id="suSshPort" name="sshPort" type="number" value="' + esc(String(sshPort)) + '"></div>' +
                '<div class="router-setup-field"><label for="suRestNote">REST 通道</label><input id="suRestNote" value="' + esc(scheme.toUpperCase() + ' ' + restPort) + '" disabled title="REST 通道跟随部署配置（routeros-panel.env）"></div>' +
              '</div>' +
            '</div></details>' +
            '<label class="router-setup-check"><input id="suRemember" type="checkbox" checked> 记住这台设备，方便顶栏切换路由器</label>' +
            '<div class="router-setup-channel"><span class="dot" id="suRestDot"></span>REST <span class="dot" id="suSshDot"></span>SSH</div>' +
            '<div id="suMsg" class="router-setup-msg" hidden></div>' +
            '<div class="router-setup-actions"><button class="router-setup-submit" id="suSubmit" type="submit">连接并进入面板</button><button class="router-setup-cancel" id="suCancel" type="button">取消</button></div>' +
          '</form>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.querySelector('#routerSetupForm').addEventListener('submit', onSubmit);
    const cancel = overlay.querySelector('#suCancel');
    if (cancel) cancel.addEventListener('click', function(){ overlay.remove(); if (window.panelRouterSwitcher) window.panelRouterSwitcher.reload(); });
  }
  function setChannel(id, ok) { const el = $(id); if (el) el.className = 'dot' + (ok ? ' ok' : ' bad'); }
  function showMsg(text, kind) { const el = $('suMsg'); if (!el) return; el.hidden = !text; el.textContent = text || ''; el.className = 'router-setup-msg' + (kind ? ' is-' + kind : ''); }
  async function onSubmit(event) {
    event.preventDefault();
    if (setupBusy) return;
    setupBusy = true;
    const btn = $('suSubmit'); if (btn) btn.disabled = true;
    showMsg('正在验证 REST 与 SSH 通道…');
    try {
      if (!window.routerLoginCsrfToken) {
        const boot = await fetch('/api/router-login', { cache: 'no-store', credentials: 'same-origin' }).then(function(r){ return r.json(); });
        window.routerLoginCsrfToken = boot.csrfToken || '';
        if (window.panelRouterSwitcher) window.panelRouterSwitcher.render(boot.routerLogin, boot.savedLogins);
      }
      const response = await fetch('/api/router-login', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': window.routerLoginCsrfToken || '' },
        body: JSON.stringify({
          host: $('suHost').value.trim(),
          user: $('suUser').value.trim(),
          password: $('suPassword').value,
          sshPort: Number($('suSshPort').value) || 22,
          rememberPassword: $('suRemember').checked
        })
      });
      const payload = await response.json().catch(function(){ return {}; });
      if (!response.ok || payload.ok === false) {
        const restErr = payload && payload.test && payload.test.rest && payload.test.rest.error;
        const sshErr = payload && payload.test && payload.test.ssh && payload.test.ssh.error;
        throw new Error((payload && (payload.error || restErr || sshErr)) || ('连接失败 HTTP ' + response.status));
      }
      const test = payload.test || {};
      setChannel('suRestDot', test.rest && test.rest.ok === true);
      setChannel('suSshDot', test.ssh && test.ssh.ok === true);
      showMsg(payload.warning || '连接成功，正在进入面板…', payload.warning ? 'is-partial' : 'is-ok');
      if (window.panelRouterSwitcher) window.panelRouterSwitcher.render(payload.routerLogin, payload.savedLogins);
      setTimeout(function(){ window.location.reload(); }, 500);
    } catch (error) {
      const raw = String((error && error.message) || error || '');
      showMsg(
        /failed to fetch|networkerror|load failed/i.test(raw)
          ? '连不上本机面板接口。请打开当前面板地址（默认 http://127.0.0.1:28646/），不要用已经关掉的临时调试端口。'
          : (raw || '连接失败'),
        'is-error'
      );
    } finally {
      setupBusy = false;
      const btn = $('suSubmit'); if (btn) btn.disabled = false;
    }
  }
  function bootSetupCheck() {
    fetch('/api/health', { cache: 'no-store', credentials: 'same-origin' })
      .then(function(r){ return r.json(); })
      .then(function(h){
        if (h && h.status === 'needs_config') renderSetupForm(h.routerLogin || null);
      })
      .catch(function(){});
  }
  window.panelRouterSetup = { open: renderSetupForm };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootSetupCheck);
  else bootSetupCheck();
})();
/* ===== folded from /layout-whitespace-patch.js (2026-09-29) — must run after panel.js block, before readonly-diagnostics block ===== */
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
    #overview { --home-panel-gap: 14px; }
    #overview .section-head { margin-bottom: 10px; }
    #overview .ik-home-status-grid { grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 10px; margin-bottom: 12px; }
    #overview .ik-home-status-tile { padding: 12px 14px; border-radius: 12px; box-shadow: 0 8px 24px rgba(26, 58, 102, .04); }
    #overview .ik-home-status-tile strong { margin-top: 6px; font-size: 18px; line-height: 1.15; }
    #overview .ik-home-status-tile em { margin-top: 6px; font-size: 11px; }
    #overview .ik-home-layout { grid-template-columns: 430px minmax(0, 1fr); gap: var(--home-panel-gap); align-items: stretch; }
    #overview .ik-home-layout > .stack { display: flex; flex-direction: column; gap: var(--home-panel-gap); min-width: 0; height: 100%; }
    #overview .ik-home-main { display: flex; flex-direction: column; gap: var(--home-panel-gap); min-width: 0; height: 100%; }
    #overview .card-head { padding: 7px 10px 0; }
    #overview .card-body { padding: 8px 10px 10px; }
    #overview .ik-wan-hero { gap: 12px; padding: 14px; margin-bottom: 12px; border-radius: 12px; }
    #overview .ik-wan-main { margin-top: 8px; font-size: 26px; }
    #overview .ik-wan-sub { margin-top: 7px; color: #6a788b; font-size: 11px; line-height: 1.4; }
    #overview .ik-wan-chipline { gap: 5px; }
    #overview .ik-wan-chip { min-height: 22px; padding: 0 8px; font-size: 10px; }
    #overview .ik-home-quick-card { display: flex; flex: 0 0 auto; flex-direction: column; min-height: 0; overflow: visible; }
    #overview .ik-home-quick-card .card-body { display: flex; flex: 0 0 auto; flex-direction: column; min-height: 0; height: auto; padding: 10px 10px 12px; overflow: visible; }
    #overview .ik-home-quick-card .ik-quick-grid { flex: 0 0 auto; grid-template-rows: repeat(3, 104px); gap: 12px; margin-top: 0; min-height: 0; }
    #overview .ik-home-quick-card .ik-quick-link { align-content: center; padding: 18px 12px; border-radius: 12px; font-size: 13px; font-weight: 700; }
    #overview .ik-home-quick-card .ik-quick-link span:first-child { width: 24px; height: 24px; border-radius: 8px; }
    #overview .ik-home-monitor-grid { grid-template-columns: minmax(0, .78fr) minmax(0, 1.22fr); gap: 10px; }
    #overview .ik-home-summary-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
    #overview .ik-home-rank-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; align-items: stretch; }
    #overview .ik-home-rank-card { display: flex; min-height: 0; flex-direction: column; }
    #overview .ik-home-rank-card .ops-table-wrap { border: 0; border-radius: 0; flex: 1 1 auto; height: 440px; max-height: 440px; overflow-y: auto; overscroll-behavior: contain; }
    #overview .ik-home-rank-card-head { padding: 10px 12px; }
    #overview .ik-home-rank-card .ops-table thead th { position: sticky; top: 0; z-index: 2; background: #f8fbff; box-shadow: 0 1px 0 #edf1f7; }
    #overview .wide-card .info-list { gap: 8px 14px; }
    #overview .wide-card .info-item { padding-bottom: 8px; }
    #overview .ik-wan-info-card .info-list { gap: 8px 14px; margin-top: 4px; }
    #overview .ik-wan-info-card .info-item { padding-bottom: 8px; }
    #overview .ik-wan-info-card .info-k { color: #7f8da1; font-size: 11px; font-weight: 700; line-height: 1.2; }
    #overview .ik-wan-info-card .info-v { margin-top: 3px; color: #253246; font-size: 12px; font-weight: 700; line-height: 1.35; }
    #overview .ik-wan-switch { margin-top: 8px; padding: 8px 10px; border-radius: 10px; }
    #overview .ik-wan-line-select { height: 28px; font-size: 12px; font-weight: 700; }
    #overview .ik-summary-split { gap: 10px; align-items: start; }
    #overview .ik-summary-box { min-height: 0; padding: 9px 10px; }
    #overview .ik-summary-box b { margin-top: 6px; font-size: 18px; line-height: 1.1; }
    #overview .ik-wan-info-card .ik-wan-rate-split:not(.is-main) { display: block !important; margin-top: 12px; }
    #overview .ik-wan-info-card .ik-wan-rate-split:not(.is-main) .ik-wan-rate-card { width: 100%; padding: 10px 12px 12px; }
    #overview .ik-wan-info-card .ik-wan-rate-split:not(.is-main) .ik-wan-rate-card + .ik-wan-rate-card { margin-top: 12px; }
    #overview .ik-wan-info-card .ik-wan-rate-split:not(.is-main) .ik-wan-rate-head { display: grid; margin-bottom: 8px; }
    #overview .ik-wan-info-card .ik-wan-rate-split:not(.is-main) .ik-wan-rate-value { min-width: 128px; margin-top: 0; text-align: right; }
    #overview .ik-wan-info-card .ik-wan-rate-split:not(.is-main) .ik-wan-rate-chart { grid-template-columns: minmax(0, 1fr) 78px; gap: 8px; }
    #overview .ik-wan-info-card .ik-wan-rate-split:not(.is-main) .ik-wan-rate-svg { height: 88px; }
    #overview .ik-wan-rate-split.is-main .ik-wan-rate-svg { height: 150px; }
    #overview .ik-wan-rate-axis { font-size: 10px; }
    #overview .chart-box { padding: 7px; }
    #overview .mini-chart { height: 112px; }
    #overview .ik-system-load-card .ops-resource-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    #overview .ik-system-load-card .ops-resource-card { padding: 10px 12px 12px; }
    #overview .ops-resource-grid { gap: 10px; }
    #overview .ops-resource-card { padding: 10px 12px 12px; }
    #overview .ops-resource-plot,
    #overview .ops-resource-svg { height: 112px; }
    #overview .ik-system-load-card .ops-resource-plot,
    #overview .ik-system-load-card .ops-resource-svg { height: 112px; }
    #overview .ik-home-terminal-grid { gap: 8px; }
    #overview .ik-home-terminal-tile { min-height: 76px; padding: 12px; border-radius: 10px; }
    #overview .ik-home-terminal-tile b { margin-top: 8px; font-size: 22px; }
    #overview .ik-home-line-bars { gap: 7px; margin-top: 12px; }
    #overview .ik-home-line-bars .line-bar { grid-template-columns: 116px minmax(0, 1fr) 72px; min-height: 22px; gap: 10px; }
    #overview .ik-home-line-bars .line-name { font-size: 11px; }
    #overview .ik-home-line-bars .line-share { font-size: 12px; }
    #overview .ik-home-line-bars .progress { height: 6px; }
    .ops-page-stack { display: flex; flex-direction: column; gap: 10px; }
    .ops-split { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.95fr); gap: 10px; align-items: start; }
    .ops-double { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; align-items: stretch; }
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
    #balance .metric-card:first-child .metric-value { font-size: 17px; line-height: 1.2; }
    #logs .metric-value { font-size: 17px; }
    #logs .ops-empty-card .card-body, #dns6 .ops-empty-card .card-body { padding-top: 10px; }
    #arp .card-body, #trafficAudit .card-body { padding-top: 8px; }
    #arp .record-list, #trafficAudit .record-list { gap: 4px; }
    #arp .record-head, #trafficAudit .record-head { padding: 5px 8px; }
    #arp .record-grid, #trafficAudit .record-grid { padding: 5px 8px 7px; gap: 3px 6px; }
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
    html {
      width: 100% !important;
      overflow-x: hidden !important;
    }
    body {
      width: 100% !important;
      min-width: 0 !important;
      overflow-x: hidden !important;
    }
    .app,
    .app.ik-shell,
    .app.ik-shell.home-sidebar-hidden,
    .app.horizontal-shell {
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100vw !important;
    }
    .app.ik-shell .frame {
      min-width: 0 !important;
      max-width: 100% !important;
      overflow-x: hidden !important;
    }
    .content,
    .card,
    .card-body,
    .ops-page-stack,
    .ops-workbench,
    .ops-workbench-grid,
    .ops-workbench-side,
    .ops-info-card,
    .ops-density-table,
    .ops-home-panel,
    .ik-home-main,
    .ik-home-layout,
    .public-home-grid,
    .ops-public-home-grid {
      min-width: 0 !important;
      max-width: 100% !important;
    }
    .table-wrap,
    .ops-table-wrap {
      max-width: 100% !important;
      overflow-x: auto !important;
      overscroll-behavior-x: contain;
    }
    .ops-table {
      min-width: min(760px, 100%);
    }
    @media (max-width: 1280px) {
      #overview .ik-home-layout,
      #overview .ik-home-main,
      #overview .ik-home-monitor-grid,
      #overview .ik-home-rank-grid,
      #overview .ops-overview-banner,
      #overview .ops-overview-banner-grid,
      #overview .ops-public-home-grid,
      #overview .public-home-grid,
      #overview .public-home-split-grid,
      #overview .public-home-rank-wrap .ik-home-rank-grid,
      .ops-workbench-grid,
      .ops-section-grid,
      .ops-split,
      .ops-double {
        grid-template-columns: minmax(0, 1fr) !important;
      }
      .grid-6,
      .grid-4,
      .grid-3 {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
      #overview .public-home-status-grid,
      #overview .public-home-fact-grid,
      #overview .public-home-quick-grid,
      #overview .ops-home-stream-grid,
      #overview .public-home-terminal-grid,
      #overview .ops-resource-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
      #overview .ik-system-load-card .ops-resource-grid,
      #overview .public-home-load-card .ops-resource-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      }
    }
    @media (max-width: 960px) {
      .app.ik-shell,
      .app.ik-shell.home-sidebar-hidden {
        grid-template-columns: 52px minmax(0, 1fr) !important;
        background: linear-gradient(90deg, #fbfcff 0 52px, #ffffff 52px 100%) !important;
      }
      .app.ik-shell .sidebar {
        display: none !important;
      }
      .app.ik-shell .frame,
      .app.ik-shell.home-sidebar-hidden .frame {
        grid-column: 2 !important;
      }
      .topbar-header {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 10px !important;
      }
      .topbar-actions {
        align-items: flex-start !important;
        width: 100% !important;
        min-width: 0 !important;
      }
      .toolbar-line,
      .refresh-toolbar {
        justify-content: flex-start !important;
        width: 100% !important;
      }
      .content {
        padding: 14px 14px 24px !important;
      }
    }
    @media (max-width: 640px) {
      .app.ik-shell,
      .app.ik-shell.home-sidebar-hidden {
        grid-template-columns: 48px minmax(0, 1fr) !important;
        background: linear-gradient(90deg, #fbfcff 0 48px, #ffffff 48px 100%) !important;
      }
      .app.ik-shell .ik-rail {
        width: 48px !important;
      }
      .app.ik-shell .content,
      .app.ik-shell .frame .content {
        padding: 10px 8px 18px !important;
      }
      .topbar {
        padding: 8px 10px 0 !important;
      }
      .page-title {
        font-size: 17px !important;
      }
      .status-strip,
      .grid-6,
      .grid-4,
      .grid-3,
      .grid-2,
      .dual,
      .line-trend-grid,
      .ops-stat-grid,
      .ops-kpi-strip,
      .ops-resource-grid,
      #overview .public-home-status-grid,
      #overview .public-home-fact-grid,
      #overview .public-home-quick-grid,
      #overview .ops-home-stream-grid,
      #overview .public-home-terminal-grid,
      #overview .public-home-terminal-summary-grid,
      #overview .public-home-line-matrix-summary {
        grid-template-columns: minmax(0, 1fr) !important;
      }
      #overview .public-home-hero,
      .line-bar,
      .ops-bar-stack .line-bar,
      #overview .ik-home-line-bars .line-bar {
        grid-template-columns: minmax(0, 1fr) !important;
      }
      #overview .ik-wan-rate-chart,
      #overview .ops-home-stream-grid .ik-wan-rate-chart {
        grid-template-columns: minmax(0, 1fr) minmax(54px, 62px) !important;
      }
      .refresh-toolbar {
        align-items: flex-start !important;
      }
      .refresh-meta {
        flex-wrap: wrap !important;
        white-space: normal !important;
      }
      .card-head,
      .section-head,
      .chart-label {
        flex-direction: column !important;
        align-items: flex-start !important;
      }
      #interfaces .interfaces-monitor-grid,
      #interfaces .interfaces-monitor-main,
      .ops-workbench-grid,
      .ops-section-grid {
        grid-template-columns: minmax(0, 1fr) !important;
      }
      .ops-axis-chart,
      .ik-wan-rate-chart {
        grid-template-columns: minmax(0, 1fr) minmax(54px, 62px) !important;
      }
      .ops-signal-row {
        grid-template-columns: minmax(0, 1fr) !important;
      }
      .ops-signal-side {
        align-items: flex-start !important;
        min-width: 0 !important;
      }
      .ik-readonly-popover {
        left: 56px !important;
        right: 8px !important;
        width: auto !important;
      }
      .ops-table {
        min-width: 640px;
      }
    }
    /* Legacy home fallback: keep the WAN/shortcut column visible on desktop
       widths even when this older renderer is active on a live host. */
    #overview .ik-home-layout {
      grid-template-columns: minmax(330px, 420px) minmax(0, 1fr) !important;
      align-items: start !important;
    }
    #overview .ik-home-layout > .stack:first-child {
      position: static !important;
      top: auto !important;
      align-self: stretch !important;
      max-height: none !important;
      overflow: visible !important;
      overscroll-behavior: auto !important;
      scrollbar-gutter: auto !important;
      scrollbar-width: auto !important;
    }
    #overview .ik-home-layout > .stack:first-child > .card {
      width: 100%;
    }
    #overview .ik-home-layout > .legacy-home-side-placeholder {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
      grid-column: 1 !important;
      grid-row: 1 !important;
      min-width: 0 !important;
    }
    #overview .ik-home-layout > .legacy-home-side {
      grid-column: 1 !important;
      grid-row: 1 !important;
      display: flex !important;
      flex-direction: column !important;
      min-width: 0 !important;
      align-self: stretch !important;
      position: static !important;
      top: auto !important;
      left: auto !important;
      width: auto !important;
      max-height: none !important;
      overflow: visible !important;
      overscroll-behavior: auto !important;
      scrollbar-gutter: auto !important;
    }
    #overview .ik-home-layout > .legacy-home-main {
      grid-column: 2 !important;
      grid-row: 1 !important;
      min-width: 0 !important;
    }
    #overview .ik-home-layout > .legacy-home-side.is-legacy-home-fixed {
      position: static !important;
      top: auto !important;
      left: auto !important;
      width: auto !important;
      z-index: auto !important;
    }
    #overview .ikuai-home-grid > .ikuai-home-sticky-placeholder {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
      grid-column: 1 !important;
      grid-row: 1 !important;
      min-width: 0 !important;
    }
    #overview .ikuai-home-grid > .ikuai-home-sticky-side {
      grid-column: 1 !important;
      grid-row: 1 !important;
      align-self: stretch !important;
      position: static !important;
      top: auto !important;
      left: auto !important;
      width: auto !important;
      max-height: none !important;
      overflow: visible !important;
      overscroll-behavior: auto !important;
      scrollbar-gutter: auto !important;
    }
    #overview .ikuai-home-grid > .ikuai-home-sticky-main {
      grid-column: 2 !important;
      grid-row: 1 !important;
      min-width: 0 !important;
    }
    #overview .ikuai-home-grid > .ikuai-home-sticky-side.is-ikuai-home-fixed {
      position: static !important;
      top: auto !important;
      left: auto !important;
      width: auto !important;
      z-index: auto !important;
    }
    @media (max-width: 1280px) and (min-width: 761px) {
      #overview .ik-home-layout {
        grid-template-columns: minmax(320px, 38vw) minmax(0, 1fr) !important;
      }
      #overview .ik-home-layout > .stack:first-child {
        position: static !important;
        top: auto !important;
        max-height: none !important;
      }
      #overview .ik-home-main,
      #overview .ik-home-monitor-grid,
      #overview .ik-home-rank-grid {
        grid-template-columns: minmax(0, 1fr) !important;
      }
    }
    @media (max-width: 760px) {
      #overview .ik-home-layout {
        grid-template-columns: minmax(0, 1fr) !important;
      }
      #overview .ik-home-layout > .stack:first-child {
        position: static !important;
        max-height: none;
        overflow: visible;
      }
      #overview .ik-home-layout > .legacy-home-side,
      #overview .ik-home-layout > .legacy-home-main {
        grid-column: auto !important;
        grid-row: auto !important;
      }
      #overview .ik-home-layout > .legacy-home-side-placeholder {
        display: none !important;
      }
      #overview .ik-home-layout > .legacy-home-side.is-legacy-home-fixed {
        position: static !important;
        width: auto !important;
      }
      #overview .ikuai-home-grid > .ikuai-home-sticky-side,
      #overview .ikuai-home-grid > .ikuai-home-sticky-main {
        grid-column: auto !important;
        grid-row: auto !important;
      }
      #overview .ikuai-home-grid > .ikuai-home-sticky-placeholder {
        display: none !important;
      }
      #overview .ikuai-home-grid > .ikuai-home-sticky-side.is-ikuai-home-fixed {
        position: static !important;
        width: auto !important;
      }
    }
  `;
  document.head.appendChild(whitespaceStyle);

  let legacyHomeStickyFrame = 0;

  function resetLegacyHomeStickyFallback(layout) {
    const root = layout || document.querySelector('#overview .ik-home-layout');
    if (!root) return;
    root.querySelector(':scope > .legacy-home-side-placeholder')?.remove();
    const side = root.querySelector(':scope > .legacy-home-side');
    const main = root.querySelector(':scope > .legacy-home-main');
    if (side) {
      side.classList.remove('is-legacy-home-fixed');
      side.classList.remove('legacy-home-side');
      side.style.removeProperty('--legacy-home-fixed-left');
      side.style.removeProperty('--legacy-home-fixed-width');
      side.style.removeProperty('--legacy-home-fixed-top');
    }
    main?.classList.remove('legacy-home-main');
  }

  function syncLegacyHomeStickyFallback() {
    const layout = document.querySelector('#overview .ik-home-layout');
    resetLegacyHomeStickyFallback(layout);
  }

  function resetIkuaiHomeStickyFallback(layout) {
    const root = layout || document.querySelector('#overview .ikuai-home-grid');
    if (!root) return;
    root.querySelector(':scope > .ikuai-home-sticky-placeholder')?.remove();
    const side = root.querySelector(':scope > .ikuai-home-sticky-side');
    const main = root.querySelector(':scope > .ikuai-home-sticky-main');
    if (side) {
      side.classList.remove('is-ikuai-home-fixed');
      side.classList.remove('ikuai-home-sticky-side');
      side.style.removeProperty('--ikuai-home-fixed-left');
      side.style.removeProperty('--ikuai-home-fixed-width');
      side.style.removeProperty('--ikuai-home-fixed-top');
    }
    main?.classList.remove('ikuai-home-sticky-main');
  }

  function syncIkuaiHomeStickyFallback() {
    const overview = document.querySelector('#overview');
    const layout = overview?.querySelector('.ikuai-home-grid');
    resetIkuaiHomeStickyFallback(layout);
  }

  function syncHomeStickyFallbacks() {
    legacyHomeStickyFrame = 0;
    syncLegacyHomeStickyFallback();
    syncIkuaiHomeStickyFallback();
  }
  window.__syncHomeStickyFallbacks = syncHomeStickyFallbacks;

  function requestLegacyHomeStickyFallbackSync() {
    if (legacyHomeStickyFrame) return;
    legacyHomeStickyFrame = window.requestAnimationFrame(syncHomeStickyFallbacks);
  }

  window.addEventListener('resize', requestLegacyHomeStickyFallbackSync);
  window.addEventListener('load', () => setTimeout(requestLegacyHomeStickyFallbackSync, 250), { once: true });

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

  function opsChartNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  function opsRound(value, digits = 2) {
    const factor = 10 ** Math.max(0, Number(digits || 0));
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.round(numeric * factor) / factor : 0;
  }

  function opsSmoothPercentValues(values = []) {
    const raw = (values || []).map(opsChartNumber);
    const finiteCount = raw.filter((value) => value !== null).length;
    if (finiteCount < 4) return raw;

    // Resource collection is intentionally fast, so draw a rolling trend instead
    // of every instantaneous CPU tick. Numeric values above the chart stay raw.
    let last = null;
    const ema = raw.map((value) => {
      if (value === null) return null;
      if (last === null) {
        last = value;
      } else {
        last = last * 0.72 + value * 0.28;
      }
      return last;
    });

    let smoothed = ema;
    for (let pass = 0; pass < 5; pass += 1) {
      smoothed = smoothed.map((value, index, arr) => {
        if (value === null) return null;
        const prev2 = arr[index - 2] ?? arr[index - 1] ?? value;
        const prev1 = arr[index - 1] ?? value;
        const next1 = arr[index + 1] ?? value;
        const next2 = arr[index + 2] ?? arr[index + 1] ?? value;
        return (prev2 + prev1 * 2 + value * 4 + next1 * 2 + next2) / 10;
      });
    }
    return smoothed;
  }

  function opsSmoothPath(points = []) {
    if (!points.length) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      const midX = opsRound((previous.x + current.x) / 2, 2);
      const midY = opsRound((previous.y + current.y) / 2, 2);
      path += ` Q ${previous.x} ${previous.y} ${midX} ${midY}`;
    }
    const last = points[points.length - 1];
    path += ` T ${last.x} ${last.y}`;
    return path;
  }

  function opsPercentMiniChart(values = [], color = '#165dff') {
    const width = 360;
    const height = 96;
    const padX = 8;
    const padY = 8;
    const rawPoints = (values || []).map(opsChartNumber);
    const finitePoints = rawPoints.filter((value) => value !== null);
    const chartHeight = height - padY * 2;
    const grid = [100, 50, 0].map((mark) => {
      const y = padY + ((100 - mark) / 100) * chartHeight;
      return `<line x1="${padX}" y1="${y}" x2="${width - padX}" y2="${y}" stroke="rgba(22,93,255,0.09)" stroke-width="1"/>`;
    }).join('');
    if (!finitePoints.length) return `<svg class="ops-resource-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">${grid}</svg>`;
    const smoothed = opsSmoothPercentValues(values);
    const step = rawPoints.length > 1 ? (width - padX * 2) / (rawPoints.length - 1) : 0;
    const pathPoints = smoothed.map((value, index) => {
      if (value === null) return null;
      const clamped = Math.max(0, Math.min(100, Number(value)));
      const x = padX + step * index;
      const y = padY + ((100 - clamped) / 100) * chartHeight;
      return { x: opsRound(x, 2), y: opsRound(y, 2) };
    }).filter(Boolean);
    const path = opsSmoothPath(pathPoints);
    return `<svg class="ops-resource-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">${grid}<path fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="${path}"/></svg>`;
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

  function addressValues(values = []) {
    if (Array.isArray(values)) return values;
    if (values === undefined || values === null || values === '') return [];
    return [values];
  }

  function splitIpFamilies(values = []) {
    return addressValues(values).reduce((acc, value) => {
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

  function addressCell(values = [], limit = Infinity) {
    const families = splitIpFamilies(values);
    if (!families.ipv4.length && !families.ipv6.length) return '<div class="ops-address-stack"><span>-</span></div>';
    const hasBoth = families.ipv4.length && families.ipv6.length;
    const perFamilyLimit = hasBoth ? Math.max(1, Math.ceil(limit / 2)) : limit;
    const renderFamily = (items) => {
      if (!items.length) return '';
      const shown = items.slice(0, perFamilyLimit);
      const extraCount = Math.max(0, items.length - shown.length);
      const rows = shown.map((item) => `<span>${escapeHtml(item)}</span>`).join('');
      const extra = extraCount ? `<span>+${fmtNumber(extraCount)} 个地址</span>` : '';
      return `<span class="ops-address-family">${rows}${extra}</span>`;
    };
    return `<div class="ops-address-stack">${renderFamily(families.ipv4)}${renderFamily(families.ipv6)}</div>`;
  }

  function addressMetaCell(values = [], meta = '') {
    return `<div class="ops-address-with-meta">${addressCell(values)}${meta ? `<span class="ops-address-meta">${meta}</span>` : ''}</div>`;
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

  function opsGetPppoeDisplayOrder(name) {
    const normalized = String(name || '').trim().toLowerCase();
    const suffixMatch = normalized.match(/pppoe[-_\s]*out(\d+)$/i) || normalized.match(/(\d+)$/);
    return suffixMatch ? Number(suffixMatch[1]) : Number.POSITIVE_INFINITY;
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
          <td class="ops-address-cell">${addressCell(row.addresses || [])}</td>
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
        <td class="ops-address-cell">${addressCell(row.ips || [])}</td>
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
            <td class="ops-address-cell">${addressCell(ipv6Addresses)}</td>
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
          ${opsCard('线路速率趋势', `${fmtNumber(lineTrendRows.length)} 条线路同步展示`, renderLineTrendGrid(lineTrendRows, { emptyText: '当前未采集到可展示的线路趋势' }), 'ops-info-card')}
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
            ${opsCard('线路速率趋势', `${fmtNumber(lineTrendRows.length)} 条线路同步展示`, renderLineTrendGrid(lineTrendRows, { emptyText: '当前未采集到可展示的线路趋势' }), 'ops-info-card')}
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
        <td class="ops-address-cell">${addressCell(row.ip || '-')}</td>
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
        ${opsCard('WAN 聚合吞吐趋势', `${fmtRate(overview.uplinkBps)} / ${fmtRate(overview.downlinkBps)}`, `<div class="chart-box"><div class="chart-label"><span>总上 / 总下</span><span>${escapeHtml(snapshot.meta.pollSeconds)}s / 点</span></div>${lineChart([overview.history.uplink, overview.history.downlink], { colors: ['#165dff', '#f53f3f'], axis: 'rate' })}</div>`, 'ops-info-card')}
        ${opsCard('线路负载占比', busiestLine ? `${escapeHtml(busiestLine.name)} 当前最繁忙` : '等待采集', opsBarStack(lineShareRows, { percentMode: true, emptyText: '当前未形成可读的线路占比' }), 'ops-info-card')}
      </div>
      <div class="ops-page-stack" style="margin-top:12px">
        ${opsCard('线路速率趋势', `${fmtNumber(getLineTrendRows(pppoe).length)} 条线路同步展示`, renderLineTrendGrid(getLineTrendRows(pppoe), { emptyText: '当前未采集到可展示的线路趋势' }), 'ops-info-card')}
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
          { label: '上游 DNS', value: fmtNumber((dns.servers || []).length), meta: escapeHtml((dns.servers || []).slice(0, 2).join(' / ')) || '未读取到' },
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
            { label: 'DNS 上游', value: fmtNumber((dns.servers || []).length), meta: escapeHtml((dns.servers || []).slice(0, 2).join(' / ')) || '未读取到' },
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
    #serviceLogs .metric-value { font-size: 17px; line-height: 1.15; }
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
        <td class="ops-address-cell">${addressCell(row.addresses || [])}</td>
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
          <td class="ops-address-cell">${addressSummary}</td>
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
            <td class="ops-address-cell">${addressCell(ipv6Addresses)}</td>
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
    if (currentInterfaceView === 'ipv6') {
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
              <div class="ops-section-grid interfaces-monitor-main">
                <div class="interfaces-inline-panel">
                  <div class="interfaces-inline-head">
                    <div class="interfaces-inline-title">线路趋势带宽</div>
                    <div class="interfaces-inline-subtle">${fmtNumber(lineTrendRows.length)} 条线路同步采样 · 在线画趋势，离线收进状态条</div>
                  </div>
                  ${renderLineTrendGrid(lineTrendRows, { emptyText: '当前未采集到可展示的线路趋势', pollText: `${escapeHtml(String(pollSeconds))}s / 点` })}
                </div>
                <div class="ops-double interfaces-facts-row">
                  <div class="interfaces-inline-panel interfaces-monitor-facts">
                    <div class="interfaces-inline-head">
                      <div class="interfaces-inline-title">线路闭环快照</div>
                      <div class="interfaces-inline-subtle">把角色、地址族和父接口异常直接压在趋势旁边</div>
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
                  <div class="interfaces-inline-panel interfaces-monitor-facts">
                    <div class="interfaces-inline-head">
                      <div class="interfaces-inline-title">速判补位</div>
                      <div class="interfaces-inline-subtle">把默认路由、地址和关注级别压成二次判断层</div>
                    </div>
                    ${opsStatTiles([
                      { label: '当前最忙线路', value: busiestLine ? escapeHtml(busiestLine.name) : '-', meta: busiestLine ? fmtRate(totalTrafficRate(busiestLine)) : '暂无实时吞吐' },
                      { label: '带地址线路', value: fmtNumber(linesWithAddress), meta: `${fmtNumber(pppoe.length)} 条宽带中已拿到地址` },
                      { label: '活动默认路由', value: fmtNumber(linesWithActiveRoute), meta: activeRouteTables.length ? activeRouteTables.slice(0, 3).map(escapeHtml).join(' / ') : '当前无活动表' },
                      { label: '待重点关注', value: fmtNumber(watchLines + dangerousLines), meta: `warn ${fmtNumber(watchLines)} / danger ${fmtNumber(dangerousLines)}` }
                    ])}
                  </div>
                </div>
              </div>`, 'ops-info-card')}
            <div class="ops-workbench-side interfaces-monitor-side">
              <div class="ops-double interfaces-side-row">
                ${opsCard('接口覆盖摘要', '把在线性、双栈覆盖和错误接口压成固定宽屏摘要', opsStatTiles([
                  { label: '在线 LAN', value: fmtNumber(runningLan), meta: `LAN 总数 ${fmtNumber(interfaces.filter((row) => row.role === 'LAN').length)}` },
                  { label: '虚拟接口', value: fmtNumber(virtualCount), meta: 'VLAN / WG / Loopback / L2TP' },
                  { label: '双栈接口', value: fmtNumber(dualStackInterfaces), meta: '同时具备 IPv4 / IPv6' },
                  { label: 'IPv6 接口', value: fmtNumber(ipv6Interfaces.length), meta: '包含真实 IPv6 地址' },
                  { label: '有丢错接口', value: fmtNumber(interfaceIssueCount), meta: '累计丢包或错包非 0' },
                  { label: '活动路由表', value: fmtNumber(activeRouteTables.length), meta: activeRouteTables.length ? activeRouteTables.slice(0, 3).map(escapeHtml).join(' / ') : '无活动表' }
                ]), 'ops-info-card')}
                ${opsDenseTableCard('父接口健康', '把承载接口、线路和丢错压成短表，避免右侧长竖列把首屏撑空', ['父接口', '线路 / 角色', '上 / 下', '丢 / 错', '地址族'], parentHealthRows, '当前未读取到父接口健康信息', 'ops-compact-density', 'ops-compact-table')}
              </div>
            </div>
          </div>
          <div class="ops-page-stack">
            ${opsDenseTableCard('宽带实时流量', `${fmtNumber(sortedPppoe.length)} 条宽带，固定顺序展示状态、地址和活动路由`, ['线路', '状态', 'IP 地址', '实时上行速率', '实时下行速率', '累计上行流量', '累计下行流量', '活动路由', '父接口'], lineRows, '当前未读取到宽带线路数据', 'ops-compact-density', 'ops-compact-table')}
            ${opsDenseTableCard('接口吞吐明细', `${fmtNumber(sortedInterfaces.length)} 个接口，按实时吞吐排序`, ['接口', '角色', '状态', '实时上行速率', '实时下行速率', '累计上行流量', '累计下行流量', 'IP / 网关', 'MAC / 丢包错误'], ifaceRows, '当前未读取到接口数据', 'ops-compact-density', 'ops-compact-table')}
          </div>
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
          { label: '上游 DNS', value: fmtNumber((dns.servers || []).length), meta: escapeHtml((dns.servers || []).slice(0, 2).join(' / ')) || '未读取到' },
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
          { label: 'DNS 上游', value: fmtNumber((dns.servers || []).length), meta: escapeHtml((dns.servers || []).slice(0, 2).join(' / ')) || '未读取到' },
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
    #terminals .metric-value { font-size: 17px; line-height: 1.15; }
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
        <td class="ops-address-cell">${addressCell(row.ips || [])}</td>
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
    .ops-table td.ops-address-cell,
    .ops-compact-table td.ops-address-cell,
    #interfaces .ops-table td.ops-address-cell,
    #trafficLoad .ops-table td.ops-address-cell,
    #lineStatus .ops-table td.ops-address-cell,
    #arp .ops-table td.ops-address-cell,
    #trafficAudit .ops-table td.ops-address-cell,
    #terminals .ops-table td.ops-address-cell {
      white-space: normal;
      min-width: 0;
      max-width: 100%;
    }
    .ops-address-stack {
      display: grid;
      gap: 1px;
      min-width: 0;
      max-width: 100%;
      color: inherit;
      font-family: "Cascadia Mono","Consolas","Microsoft YaHei",monospace;
      font-size: 10.5px;
      font-weight: 500;
      line-height: 1.18;
      white-space: normal;
      font-variant-numeric: tabular-nums;
    }
    .ops-address-stack span {
      display: block;
      min-width: 0;
      max-width: 100%;
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .ops-address-family {
      display: grid;
      gap: 0;
      min-width: 0;
      max-width: 100%;
    }
    .ops-address-with-meta {
      display: grid;
      gap: 2px;
      min-width: 0;
      max-width: 100%;
    }
    .ops-address-meta {
      display: block;
      min-width: 0;
      max-width: 100%;
      color: var(--text-dim);
      font-family: "Cascadia Mono","Consolas","Microsoft YaHei",monospace;
      font-size: 10.5px;
      line-height: 1.18;
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .ops-chip-line { display: flex; gap: 5px; flex-wrap: wrap; align-items: center; }
    .ops-family-badge { display: inline-flex; align-items: center; min-height: 18px; padding: 0 7px; border-radius: 999px; background: #edf5ff; color: #165dff; font-size: 11px; font-weight: 500; }
    .ops-family-badge.is-v6 { background: #eefbf5; color: #087c4a; }
    .ops-family-badge.is-mixed { background: #fff7e8; color: #ad6800; }
    .ops-table .ops-rate-cell { min-width: 118px; }
    #interfaces .ops-stat-grid,
    #trafficLoad .ops-stat-grid,
    #terminals .ops-stat-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    #interfaces .interfaces-monitor-grid { grid-template-columns: minmax(0, 1fr); align-items: stretch; }
    #interfaces .interfaces-monitor-main { grid-template-columns: minmax(0, 1fr); align-items: stretch; }
    #interfaces .interfaces-monitor-side { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    #interfaces .interfaces-trend-stack { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    #interfaces .interfaces-inline-panel { padding: 10px; border: 1px solid #e3edf8; border-radius: 12px; background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%); }
    #interfaces .interfaces-inline-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
    #interfaces .interfaces-inline-title { color: var(--text); font-size: 12px; font-weight: 700; line-height: 1.2; }
    #interfaces .interfaces-inline-subtle { color: var(--text-dim); font-size: 11px; line-height: 1.2; text-align: right; }
    #interfaces .interfaces-monitor-facts .ops-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    #interfaces .interfaces-side-row .ops-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    #interfaces .interfaces-facts-row > .interfaces-inline-panel { display: flex; flex-direction: column; }
    #interfaces .interfaces-side-row > .card { display: flex; flex-direction: column; }
    #interfaces .interfaces-side-row > .card .card-body { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
    #interfaces .interfaces-facts-row .ops-stat-grid,
    #interfaces .interfaces-side-row .ops-stat-grid { flex: 1 1 auto; grid-auto-rows: minmax(64px, 1fr); align-content: stretch; }
    #interfaces .interfaces-facts-row .ops-stat-tile,
    #interfaces .interfaces-side-row .ops-stat-tile { display: flex; flex-direction: column; justify-content: center; }
    #interfaces .interfaces-side-row .ops-table-wrap { flex: 1 1 auto; }
    .ops-workbench { display: flex; flex-direction: column; gap: 8px; }
    .ops-workbench-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; align-items: stretch; }
    .ops-workbench-side,
    .ops-panel-stack { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    .ops-section-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; align-items: stretch; }
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
    @media (max-width: 960px) {
      #interfaces .interfaces-monitor-grid,
      #interfaces .interfaces-monitor-main,
      .ops-workbench-grid,
      .ops-section-grid {
        grid-template-columns: minmax(0, 1fr) !important;
      }
      #interfaces .interfaces-monitor-side,
      .ops-workbench-side,
      .ops-panel-stack {
        min-width: 0 !important;
        max-width: 100% !important;
      }
      #interfaces .interfaces-monitor-facts .ops-stat-grid,
      #interfaces .ops-stat-grid,
      #trafficLoad .ops-stat-grid,
      .ops-kpi-strip {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
      .ops-axis-chart,
      .ik-wan-rate-chart {
        grid-template-columns: minmax(0, 1fr) minmax(54px, 62px) !important;
      }
      .ops-signal-row {
        grid-template-columns: minmax(0, 1fr) !important;
      }
      .ops-signal-side {
        align-items: flex-start !important;
        min-width: 0 !important;
      }
      .chart-label,
      #interfaces .interfaces-inline-head {
        align-items: flex-start !important;
        flex-direction: column !important;
        gap: 4px !important;
      }
      #interfaces .interfaces-inline-subtle {
        text-align: left !important;
      }
    }
    @media (max-width: 520px) {
      #interfaces .interfaces-monitor-facts .ops-stat-grid,
      #interfaces .ops-stat-grid,
      #trafficLoad .ops-stat-grid,
      .ops-kpi-strip {
        grid-template-columns: minmax(0, 1fr) !important;
      }
      .ops-table {
        min-width: 640px;
      }
    }
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
    if (family === 'ipv4') return addressCell(arrayFromSet(group.ipv4), 2);
    if (family === 'ipv6') return addressCell(arrayFromSet(group.ipv6), 2);
    return addressFamilyBadge([...arrayFromSet(group.ipv4), ...arrayFromSet(group.ipv6)]);
  }

  function buildDeviceIdentityRows(groups, limit = 40) {
    return groups.slice(0, limit).map((group) => `
      <tr>
        <td>${groupNameCell(group)}</td>
        <td class="ops-address-cell">${groupAddressCell(group, 'ipv4')}</td>
        <td class="ops-address-cell">${groupAddressCell(group, 'ipv6')}</td>
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
        <td class="ops-address-cell">${addressCell(row.ip || '-')}</td>
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
          <td class="ops-address-cell">${addressCell(row.ip || '-')}</td>
          <td class="ops-address-cell">${addressCell(paired, 2)}</td>
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
          <td class="ops-address-cell">${addressCell(row.ip || '-')}</td>
          <td class="ops-address-cell">${addressCell(paired, 1)}</td>
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
            <td class="ops-address-cell">${addressCell(row.localIp || '-')}</td>
            <td class="ops-address-cell">${addressCell(row.remoteIp || '-')}</td>
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
          <td class="ops-address-cell">${addressCell(row.ip || '-')}</td>
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
          <td class="ops-address-cell">${addressCell(row.localIp || '-')}</td>
          <td class="ops-address-cell">${addressCell(row.remoteIp || '-')}</td>
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
          <td class="ops-address-cell">${addressCell(row.ip || '-')}</td>
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
      ? `<div class="ops-double">${wanRateSplitCard('总上行速率', overview.uplinkBps, history.uplink || [], '#165dff', `${escapeHtml(String(pollSeconds))}s / 点`)}${wanRateSplitCard('总下行速率', overview.downlinkBps, history.downlink || [], '#f53f3f', `${escapeHtml(String(pollSeconds))}s / 点`)}</div>`
      : emptyBlock('当前未读取到 WAN 聚合历史');
    const lineRows = pppoe.map((row) => `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${statusTag(row.running)}</td>
        <td class="ops-address-cell">${addressCell(row.addresses || [])}</td>
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
        <td class="ops-address-cell">${addressCell(row.ips || [])}</td>
        <td>${fmtRate(row.txRate)}</td>
        <td>${fmtRate(row.rxRate)}</td>
        <td>${packetSummaryCell(Number(row.txDrop || 0) + Number(row.rxDrop || 0), Number(row.txError || 0) + Number(row.rxError || 0))}</td>
        <td>${escapeHtml(row.mac || '-')}</td>
      </tr>`);
    const terminalRows = terminals.slice(0, 30).map((row) => `
      <tr>
        <td>${renderEditableNameCell(row, row.ip, terminalLabel(row))}</td>
        <td>${addressFamilyBadge([row.ip])}</td>
        <td class="ops-address-cell">${addressCell(row.ip || '-')}</td>
        <td>${escapeHtml(row.mac || '-')}</td>
        <td>${fmtRate(row.upRate)}</td>
        <td>${fmtRate(row.downRate)}</td>
        <td>${fmtNumber(row.connections)}</td>
        <td>${fmtBytes(row.sessionBytes)}</td>
      </tr>`);
    const terminalHotRows = trafficTerminals.slice(0, 8).map((row) => `
      <tr>
        <td>${escapeHtml(terminalLabel(row))}</td>
        <td class="ops-address-cell">${addressMetaCell(row.ip || '-', isRealMac(row.mac) ? escapeHtml(row.mac) : '无 MAC')}</td>
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
              { label: '当前最忙线路', value: busiestLine ? fmtRate(totalTrafficRate(busiestLine)) : '-', meta: busiestLine ? escapeHtml(busiestLine.name) : '暂无实时吞吐' },
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
    requestLegacyHomeStickyFallbackSync();
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
  requestLegacyHomeStickyFallbackSync();
})();
/* ===== folded from /readonly-diagnostics.js (2026-09-29) — must run last: after panel.js and layout-whitespace-patch blocks ===== */
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
      padding: 8px 10px;
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
      margin-top: 4px;
      color: var(--text);
      font-size: 16px;
      font-weight: 700;
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
      font-size: 12px;
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
      font-size: 16px;
      font-weight: 800;
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
      { page: "采集健康", owner: "采集链路", signal: `${health.filter((row) => row.level !== "ok").length} 项关注`, link: "collectionHealthDiagnostics", action: "先看 SSH / REST / 静态表是否新鲜" },
      { page: "DNS / 代理", owner: "分流与出口", signal: `${siteRows.filter((row) => row.level !== "ok").length} 个站点异常`, link: "dnsProxyDiagnostics", action: "查 DNS、Fake-IP、TCP、HTTP、出口" },
      { page: "线路质量", owner: "WAN / PCC", signal: `${pppoe.filter((row) => !row.running).length} 条离线 / ${number(routes.tableCount)} 张表`, link: "wanQualityDiagnostics", action: "查线路占比、路由库存、Mangle 命中" },
      { page: "终端风险", owner: "终端身份", signal: `${terminals.filter((row) => terminalRiskScore(row) >= 45).length} 台高风险`, link: "terminalRiskDiagnostics", action: "查终端、DHCP、IPv6 暴露" },
      { page: "系统审计", owner: "基线与事件", signal: `${list(snapshot.logs?.all).length} 条日志 / ${list(diag?.panelFiles).length} 个文件`, link: "systemAuditDiagnostics", action: "查漂移、容量、日志和面板文件" },
    ].map((row) => `
      <tr>
        <td><a href="#${row.link}" data-section="${row.link}" data-nav-group="${html(getReadonlyNavGroup(row.link))}">${html(row.page)}</a></td>
        <td>${html(row.owner)}</td>
        <td>${html(row.signal)}</td>
        <td>${html(row.action)}</td>
      </tr>`);
    return card("诊断功能页目录", "总览页只做路标，不复制各功能页详情表", table(["页面", "唯一职责", "当前信号", "下一步查看"], rows), "readonly-dense-card");
  }

  function renderRiskPriorityQueue(snapshot, diag) {
    const rows = riskItems(snapshot, diag).slice(0, 18).map((item, index) => `
      <tr>
        <td>${number(index + 1)}</td>
        <td>${pill(item.level === "danger" ? "高" : item.level === "warn" ? "中" : "低", item.level)}</td>
        <td>${html(item.text)}</td>
        <td>${html(item.level === "danger" ? "优先进入对应功能页排查" : "观察趋势和刷新状态")}</td>
      </tr>`);
    return card("风险优先队列", "只列问题线索，不重复展示详情数据", table(["序号", "级别", "线索", "处理建议"], rows, "当前没有集中风险"), "readonly-dense-card");
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
    return card("信号覆盖矩阵", "说明每类信号的唯一归属，避免跨页面重复展示", table(["信号", "来源", "归属页面", "样本数"], rows), "readonly-dense-card");
  }

  function renderDedupPolicyCard() {
    const rows = [
      { rule: "详情表唯一归属", desc: "采集、DNS、WAN、终端、审计各自只在对应功能页展示完整表格" },
      { rule: "总览只做索引", desc: "总览页只保留入口、风险优先级和覆盖关系，不复制明细表" },
      { rule: "同类信息不跨页重复", desc: "容量、日志、安全名单只归系统审计；DHCP 和 IPv6 终端只归终端风险" },
      { rule: "未采集不造假", desc: "没有真实字段的位置保留未采集或只读说明，不补虚假指标" },
      { rule: "只读边界固定", desc: "所有模块只展示状态，不下发配置、不重启服务、不改路由规则" },
    ].map((row) => `<tr><td>${html(row.rule)}</td><td>${html(row.desc)}</td></tr>`);
    return card("去重归属规则", "用于防止后续又把同一类信息堆回多个页面", table(["规则", "说明"], rows), "readonly-dense-card");
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
  const getReadonlyPage = (section) => READONLY_FEATURE_PAGES.find((page) => page.section === section) || READONLY_FEATURE_PAGES[0];
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
              "先看配置、规则和系统基线是否漂移，再进入资源容量与事件证据，保持审计页的诊断主线清晰。",
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
            ${renderReadonlyStickySummary(snapshot, page.section)}
            ${renderReadonlyFeatureChrome(snapshot, page.section)}
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

  (() => {
    const style = document.createElement("style");
    style.textContent = `
    .readonly-diagnostics-root .readonly-feature-brief {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 16px;
      margin: 0 0 8px;
      padding: 7px 12px;
    }
    .readonly-diagnostics-root .readonly-brief-copy {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 4px 10px;
      padding: 0;
      border: 0;
      background: none;
      box-shadow: none;
      min-width: 0;
    }
    .readonly-diagnostics-root .readonly-brief-title { margin: 0; font-size: 13px; line-height: 1.2; }
    .readonly-diagnostics-root .readonly-brief-text { margin: 0; font-size: 11px; }
    .readonly-diagnostics-root .readonly-pill-row { margin: 0 !important; gap: 5px; }
    .readonly-diagnostics-root .readonly-brief-metrics { display: flex; flex-wrap: wrap; gap: 3px 16px; }
    .readonly-diagnostics-root .readonly-kpi { display: flex; align-items: baseline; gap: 5px; padding: 0; border: 0; background: none; box-shadow: none; border-radius: 0; }
    .readonly-diagnostics-root .readonly-kpi-label { font-size: 11px; font-weight: 600; }
    .readonly-diagnostics-root .readonly-kpi-value { margin: 0; font-size: 13px; font-weight: 800; white-space: nowrap; }
    .readonly-diagnostics-root .readonly-kpi-foot { display: none; }
    .readonly-diagnostics-root .readonly-summary-sticky { padding: 6px 8px; }
    .readonly-diagnostics-root .readonly-summary-sticky .metric-card { padding: 5px 8px; }
    .readonly-diagnostics-root .readonly-summary-sticky .metric-card { min-height: 0 !important; }
    .readonly-diagnostics-root .readonly-summary-sticky > .readonly-summary-grid { gap: 8px !important; margin-top: 4px !important; align-items: start !important; }
    .readonly-diagnostics-root .readonly-kpi-label, .readonly-diagnostics-root .readonly-kpi-value { white-space: nowrap; }
    .readonly-diagnostics-root .readonly-summary-sticky .metric-value { font-size: 15px; }
    .readonly-diagnostics-root .readonly-section-band { padding: 10px 12px; }
    .readonly-diagnostics-root .readonly-section-band::before { margin-bottom: 8px; }
    .readonly-diagnostics-root .readonly-band-head { margin-bottom: 8px; }
    .readonly-diagnostics-root .readonly-band-title { margin-top: 4px; font-size: 15px; }
    .readonly-diagnostics-root .readonly-readable-flow { gap: 8px; }
    .readonly-diagnostics-root .readonly-workbench-body { gap: 8px !important; }
    .readonly-diagnostics-root .readonly-wan-kpi-strip { gap: 6px; }
    @media (min-width: 1600px) {
      .readonly-diagnostics-root .readonly-workbench-body { gap: 10px; }
    }
    @media (max-width: 1599px) and (min-width: 1367px) {
      .metric-value { font-size: clamp(15px, 0.6vw + 8px, 17px); }
    }
    @media (max-width: 1366px) {
      .metric-value { font-size: clamp(14px, 0.6vw + 7px, 16px); }
      #overview .ik-home-status-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .status-strip { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    }
    @media (max-width: 1180px) {
      /* 8 status tiles never split into 3 columns without an orphan hole;
         stay at 4 columns so the grid stays 4x2 at this width. */
      #overview .ik-home-status-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .status-strip { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
      .grid-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 1023px) {
      #overview .ik-home-status-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .status-strip { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
      .readonly-diagnostics-root .readonly-summary-sticky > .readonly-summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
    }
    @media (max-width: 479px) {
      .readonly-diagnostics-root .readonly-kpi-value { font-size: 12px; }
      .readonly-diagnostics-root .readonly-summary-sticky > .readonly-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
    }
    `;
    document.head.appendChild(style);
  })();


  (() => {
    const style = document.createElement("style");
    style.textContent = `
    @media (max-width: 760px) {
      html, body { overflow-x: hidden; }
      .readonly-diagnostics-root .readonly-summary-sticky > .readonly-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
      .section-summary-sticky > .grid-4, .section-summary-sticky > .grid-3 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
      .section-summary-sticky > .grid-4 > .metric-card, .section-summary-sticky > .grid-3 > .metric-card { min-width: 0 !important; }
      .status-strip { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
      .status-strip .status-pill, .public-home-status-grid > *, .ik-home-status-grid > * { min-width: 0 !important; }
      .readonly-diagnostics-root .readonly-summary-sticky > .readonly-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
      .readonly-diagnostics-root .readonly-kpi-value, .readonly-diagnostics-root .readonly-kpi-label { white-space: normal; word-break: break-all; }
      .line-trend-grid, .line-trend-full { --line-trend-cols: 1 !important; grid-template-columns: minmax(0, 1fr) !important; }
      .ik-wan-rate-split:not(.is-main) { grid-template-columns: minmax(0, 1fr) !important; }
      .ops-double, .ops-split { grid-template-columns: minmax(0, 1fr) !important; }
      .toolbar-line, .topbar-actions, .refresh-toolbar { flex-wrap: wrap !important; max-width: 100% !important; }
      .ik-wan-line-select, .ik-wan-switch, #routerSwitchWrap, #routerSwitcher { max-width: 100% !important; width: 100% !important; min-width: 0 !important; }
      .topbar .deploy-pill, .topbar .update-pill { max-width: 100%; }
      .readonly-diagnostics-root .readonly-band-head { grid-template-columns: minmax(0, 1fr) !important; }
      #overview .ik-home-status-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
      #overview .ik-home-layout, #overview .ik-wan-hero, #overview .ik-home-layout .card, #overview .ik-wan-info-card { max-width: 100% !important; min-width: 0 !important; }
      #overview select, #overview input { max-width: 100% !important; }
      #overview .ik-wan-chipline, #overview .ik-wan-chip { max-width: 100%; }
      .readonly-diagnostics-root .readonly-brief-metrics { gap: 3px 12px; }
    }

    `;
    document.head.appendChild(style);
  })();
})();
