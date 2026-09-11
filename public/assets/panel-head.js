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
      { id: 'home', label: '首页', icon: 'ik-home', section: 'overview' },
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
      detect: { title: '线路状态检测', tip: '基于拨号状态、默认路由和接口异常做实时检测' },
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
          <div class="ik-wan-rate-value">${fmtRate(current)}<span>${escapeHtml(pollText)} · ${fmtNumber(chart.count)} 点</span></div>
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

    const FIXED_PPPOE_LINE_ORDER = ['pppoe-out10', 'pppoe-out20', 'pppoe-out30', 'pppoe-out40', 'pppoe-out50', 'pppoe-out60', 'pppoe-out70', 'pppoe-out80'];
    const FIXED_PPPOE_LINE_ORDER_MAP = new Map(FIXED_PPPOE_LINE_ORDER.map((name, index) => [name, index]));

    function getPppoeDisplayOrder(name) {
      const normalized = String(name || '').trim().toLowerCase();
      if (FIXED_PPPOE_LINE_ORDER_MAP.has(normalized)) {
        return FIXED_PPPOE_LINE_ORDER_MAP.get(normalized);
      }
      const suffixMatch = normalized.match(/pppoe-out(\d+)$/i);
      return suffixMatch ? FIXED_PPPOE_LINE_ORDER.length + Number(suffixMatch[1]) : Number.POSITIVE_INFINITY;
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
      for (let cols = ideal; cols <= 6; cols += 1) {
        if (n % cols === 0) return cols;
      }
      return ideal;
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
      const parts = [];
      if (online.length) {
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
          const cols = lineTrendColumns(online.length);
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

    function table(headers, rows, emptyText) {
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
              <span class="record-index">${fmtNumber(rowIndex + 1)}</span>
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
            ['当前主线路', busiestLine ? `${escapeHtml(busiestLine.name)} · ${fmtRate((busiestLine.upRate || 0) + (busiestLine.downRate || 0))}` : '-'],
            ['总上行速率', fmtRate(o.uplinkBps)],
            ['总下行速率', fmtRate(o.downlinkBps)]
          ];
        case 'dhcp':
          return [
            ['DHCP 服务器', fmtNumber((dhcp.servers || []).length)],
            ['地址池', fmtNumber((dhcp.pools || []).length)],
            ['绑定租约', fmtNumber((dhcp.leases || []).filter((row) => row.status === 'bound').length)],
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
          {
            const hasProtocolTopMetrics = [connections.tcp, connections.udp].every((value) => Number.isFinite(Number(value)));
            return [
              ['连接总数', fmtCompact(connections.total)],
              ['活跃会话', fmtNumber((connections.active || []).length)],
              ['单 IP 排行', fmtNumber((connections.topIps || []).length)],
              ['明细刷新', connections.detailUpdatedAt ? escapeHtml(connections.detailUpdatedAt) : '等待采集'],
              ['协议拆分', hasProtocolTopMetrics ? `${fmtCompact(connections.tcp)} / ${fmtCompact(connections.udp)}` : '当前未采集']
            ];
          }
        case 'trafficLoad':
          {
            const activeTrafficTerminals = (terminals || []).filter((row) => Number(row.upRate || 0) + Number(row.downRate || 0) > 0).length;
            return [
              ['在线宽带', `${fmtNumber(activePppoe)} / ${fmtNumber(pppoe.length)}`],
              ['总上行速率', fmtRate(o.uplinkBps)],
              ['总下行速率', fmtRate(o.downlinkBps)],
              ['最繁忙线路', busiestLine ? `${escapeHtml(busiestLine.name)} 路 ${fmtRate((busiestLine.upRate || 0) + (busiestLine.downRate || 0))}` : '-'],
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
          return [
            ['在线线路', `${fmtNumber(activePppoe)} / ${fmtNumber(pppoe.length)}`],
            ['在线接口', `${fmtNumber(activeInterfaces)} / ${fmtNumber(interfaces.length)}`],
            ['异常线路', fmtNumber(pppoe.filter((row) => !row.running || !(row.addresses || []).length).length)],
            ['IPv6 接口', fmtNumber(interfaces.filter((row) => (row.ips || []).some((ip) => String(ip).includes(':'))).length)]
          ];
        case 'dns':
          return [
            ['DNS 状态', dns.running ? '启用' : '未启用'],
            ['上游 DNS', fmtNumber((dns.servers || []).length)],
            ['缓存已用', dns.cacheUsed ? fmtBytes(dns.cacheUsed) : '未提供'],
            ['静态规则', fmtNumber((dns.forwardRules || []).length)]
          ];
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
          return [
            ['ARP 条目', fmtNumber((arp.items || []).length)],
            ['ARP 告警', fmtNumber((arp.alerts || []).length)],
            ['在线终端', fmtNumber(terminals.length)],
            ['实时流量终端', fmtNumber((terminals || []).filter((row) => Number(row.upRate || 0) + Number(row.downRate || 0) > 0).length)]
          ];
        case 'trafficAudit':
          return [
            ['连接总数', fmtCompact(connections.total)],
            ['活跃会话', fmtNumber((connections.active || []).length)],
            ['单 IP 排行', fmtNumber((connections.topIps || []).length)],
            ['审计刷新', connections.detailUpdatedAt ? escapeHtml(connections.detailUpdatedAt) : '等待采集']
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

    function renderOverview(snapshot) {
      const o = snapshot.overview || {};
      const pppoe = snapshot.pppoe || [];
      const activePppoe = pppoe.filter((row) => row.running).length;
      const firstLine = pppoe.find((row) => row.running) || pppoe[0];
      const terminals = snapshot.terminals || [];
      const terminalGroups = {
        active: terminals.filter((row) => ['reachable', 'delay'].includes(row.status)).length,
        keepAlive: terminals.filter((row) => row.status === 'stale').length,
        offline: terminals.filter((row) => ['failed', 'incomplete'].includes(row.status)).length
      };
      const totalWanUpBytes = pppoe.reduce((sum, row) => sum + Number(row?.txBytes || 0), 0);
      const totalWanDownBytes = pppoe.reduce((sum, row) => sum + Number(row?.rxBytes || 0), 0);
      return section('首页总览', 'overview', '只保留宽带核心信息与趋势卡片', `
        <div class="ik-home-layout">
          <div class="stack">
            <div class="card wide-card ik-wan-info-card">
              <div class="card-head"><div class="card-title">WAN 信息</div><div class="subtle">只读展示</div></div>
              <div class="card-body">
                ${infoGrid([
                  {k:'在线宽带', v:`${fmtNumber(activePppoe)} / ${fmtNumber(pppoe.length)}`},
                  {k:'WAN IP', v: firstLine?.addresses?.length ? firstLine.addresses.map(escapeHtml).join('<br>') : '-'},
                  {k:'接入方式', v: pppoe.length > 1 ? '多线 PPPoE' : firstLine ? 'PPPoE' : '-'},
                  {k:'运行时间', v: escapeHtml(o.uptime || '-')},
                  {k:'累计上行流量', v:fmtBytes(totalWanUpBytes)},
                  {k:'累计下行流量', v:fmtBytes(totalWanDownBytes)},
                  {k:'实时上行速率', v:fmtRate(o.uplinkBps)},
                  {k:'实时下行速率', v:fmtRate(o.downlinkBps)},
                  {k:'系统时间', v: escapeHtml(o.systemTime || '-')},
                  {k:'同步状态', v: tag(o.ntpStatus || '-', o.ntpStatus === 'synchronized' ? 'ok' : 'warn')}
                ])}
                <div class="ik-quick-grid">
          <a class="ik-quick-link" href="#interfaces" data-section="interfaces"><span class="ik-menu-icon ik-line"></span><span>接口总览</span></a>
          <a class="ik-quick-link" href="#dhcp" data-section="dhcp"><span class="ik-menu-icon ik-terminal"></span><span>DHCP 服务</span></a>
          <a class="ik-quick-link" href="#balance" data-section="balance"><span class="ik-menu-icon ik-balance"></span><span>分流监控</span></a>
          <a class="ik-quick-link" href="#security" data-section="security"><span class="ik-menu-icon ik-security"></span><span>ACL 规则</span></a>
          <a class="ik-quick-link" href="#logs" data-section="logs"><span class="ik-menu-icon ik-log"></span><span>日志中心</span></a>
          <a class="ik-quick-link" href="#trafficLoad" data-section="trafficLoad"><span class="ik-menu-icon ik-load"></span><span>流量负载</span></a>
        </div>
              </div>
            </div>
          </div>
          <div class="stack">
            <div class="card">
              <div class="card-head"><div class="card-title">实时速率趋势</div><div class="subtle">最近采样窗口</div></div>
              <div class="card-body">
                <div class="chart-box">
                  <div class="chart-label"><span>实时上行速率 ${fmtRate(o.uplinkBps)}</span><span>实时下行速率 ${fmtRate(o.downlinkBps)}</span></div>
                  ${lineChart([o.history.uplink, o.history.downlink], {colors:['#4a95ef','#30c36b']})}
                </div>
              </div>
            </div>
            <div class="ik-summary-split">
              <div class="card">
                <div class="card-head"><div class="card-title">终端数量</div><div class="subtle">当前在线状态</div></div>
                <div class="card-body">
                  <div class="ik-summary-split">
                    <div class="ik-summary-box"><div class="subtle">活跃</div><b>${fmtNumber(terminalGroups.active)}</b></div>
                    <div class="ik-summary-box"><div class="subtle">待机</div><b>${fmtNumber(terminalGroups.keepAlive)}</b></div>
                  </div>
                  <div class="ik-summary-box" style="margin-top:10px"><div class="subtle">离线 / 失败</div><b>${fmtNumber(terminalGroups.offline)}</b></div>
                </div>
              </div>
              <div class="card">
                <div class="card-head"><div class="card-title">系统负载</div><div class="subtle">CPU / 内存 / 磁盘</div></div>
                <div class="card-body">
                  ${resourceTrendGrid(o, `${Math.max(o.history?.cpu?.length || 0, o.history?.memory?.length || 0, o.history?.disk?.length || 0)} 点 · ${escapeHtml(String(snapshot.meta.pollSeconds))}s / 点`)}
                </div>
              </div>
            </div>
            <div class="card">
              <div class="card-head"><div class="card-title">宽带状态摘要</div><div class="subtle">仅保留首页级信息</div></div>
              <div class="card-body">
                <div class="ik-summary-split">
                  <div class="ik-summary-box"><div class="subtle">在线宽带</div><b>${fmtNumber(activePppoe)} / ${fmtNumber(pppoe.length)}</b></div>
                  <div class="ik-summary-box"><div class="subtle">在线终端</div><b>${fmtNumber(o.onlineTerminals)}</b></div>
                  <div class="ik-summary-box"><div class="subtle">连接总数</div><b>${fmtCompact(o.connectionTotal)}</b></div>
                  <div class="ik-summary-box"><div class="subtle">RouterOS</div><b>${escapeHtml(o.version || '-')}</b></div>
                </div>
              </div>
            </div>
          </div>
        </div>`);
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
        const share = lineTotalRate ? (totalTrafficRate(row) / lineTotalRate) * 100 : 0;
        return `<div class="line-bar">
          <div class="line-name">${escapeHtml(row.name)}</div>
          ${progress(share)}
          <div class="line-share">${share.toFixed(1)}%</div>
        </div>`;
      }).join('');
      const lineShareBlock = lineShareBars
        ? `<div class="ik-home-line-bars">${lineShareBars}</div>`
        : emptyBlock('当前未采集到 PPPoE 线路占比');

      return section('系统首页', 'overview', '只读运维仪表盘：WAN、终端、连接、资源和排行集中展示', `
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
            <div class="card-body">${table(['线路', '拨号状态', 'IP 检测', '父接口', '默认路由', '实时上行速率', '实时下行速率', '丢包/错误'], detectRows, '暂无线路状态检测数据')}</div>
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
            <div class="card-body">${table(['线路', '状态', 'IP 地址', '实时上行速率', '实时下行速率', '累计上行流量', '累计下行流量'], lineRows, '暂无宽带线路数据')}</div>
          </div>
          <div class="grid-2" style="margin-top:12px">
            <div class="card">
              <div class="card-head"><div class="card-title">接口流量详情</div><div class="subtle">${fmtNumber(interfaces.length)} 项</div></div>
              <div class="card-body">${table(['接口', '角色', '状态', 'IP 地址', '实时上行速率', '实时下行速率', '累计上行流量', '累计下行流量', 'MAC', '丢包/错误'], ifaceRows, '暂无接口数据')}</div>
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
      return section('接口总览', 'interfaces', interfaceViews[currentInterfaceView].tip, `
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
          ${table(['名称', 'IP', '状态', '最后出现', '实时上行速率', '实时下行速率', 'MAC', '连接数', '累计流量'], renderTerminalRows(ipv4Terminals), '暂无在线终端监控数据')}
          ${snapshot.arp.alerts.length ? `<div style="margin-top:12px" class="notice">${snapshot.arp.alerts.map((item) => `${escapeHtml(item.kind)}：${escapeHtml(item.value)} (${escapeHtml(item.detail)})`).join('；')}</div>` : ''}
          <div class="grid-2" style="margin-top:12px">
            <div class="card"><div class="card-head"><div class="card-title">ARP 列表</div><div class="subtle">${fmtNumber(snapshot.arp.items.length)} 条</div></div><div class="card-body">${table(['IP', '主机名', 'MAC', '类型', '状态', '最后出现'], arpRows, '暂无 ARP 数据')}</div></div>
            <div class="card"><div class="card-head"><div class="card-title">DHCP 地址池</div><div class="subtle">${fmtNumber(snapshot.dhcp.pools.length)} 组</div></div><div class="card-body"><div class="stack">${snapshot.dhcp.pools.map((pool) => `<div><div class="chart-label"><span>${escapeHtml(pool.name)}</span><span>${fmtNumber(pool.used)} / ${fmtNumber(pool.total)}</span></div>${progress(pool.usage)}</div>`).join('') || emptyBlock('暂无 DHCP 地址池')}</div></div></div>
          </div>
          <div class="card" style="margin-top:12px"><div class="card-head"><div class="card-title">DHCP 租约与静态分配</div><div class="subtle">${fmtNumber(snapshot.dhcp.leases.length)} 条</div></div><div class="card-body">${table(['IP', '主机名', 'MAC', '服务', '状态', '最后出现', '分配方式'], leaseRows, '暂无 DHCP 数据')}</div></div>`;
      }
      return section('终端监控', 'terminals', terminalViews[currentTerminalView].tip, `
        <div class="card">
          <div class="card-body">
            ${tabs}
            ${body}
          </div>
        </div>`);
    }

    function renderConnections(snapshot, config = {}) {
      const o = snapshot.overview || {};
      const admins = Array.isArray(o.admins) ? o.admins : [];
      const sectionTitle = config.title || '负载监控中心';
      const sectionId = config.id || 'connections';
      const sectionTip = config.tip || '系统负载、硬件状态、管理员会话与连接数都归入负载监控中心';
      const emphasis = config.emphasis || 'traffic';
      const loadCards = `
        <div class="grid-4">
          ${metricCard('CPU 使用率', fmtPercent(o.cpuLoad), `型号 ${escapeHtml(o.cpuModel)}`, `${fmtNumber(o.cpuCount)} 核 / ${fmtNumber(o.cpuFrequency)} MHz`)}
          ${metricCard('内存占用率', fmtPercent(o.memoryUsage), `已用 ${fmtBytes(o.memoryUsedBytes)}`, `总量 ${fmtBytes(o.memoryTotalBytes)}`)}
          ${metricCard('磁盘占用率', fmtPercent(o.diskUsage), `已用 ${fmtBytes(o.diskUsedBytes)}`, `总量 ${fmtBytes(o.diskTotalBytes)}`)}
          ${metricCard('系统状态', tag(o.systemLoadLevel === 'danger' ? '高压' : o.systemLoadLevel === 'warning' ? '预警' : '正常', o.systemLoadLevel), `NTP ${escapeHtml(o.ntpStatus)}`, `运行时长 ${escapeHtml(o.uptime)}`)}
        </div>`;
      const infoPanels = `
        <div class="grid-2" style="margin-top:12px">
          <div class="card"><div class="card-head"><div class="card-title">基础硬件信息</div><div class="subtle">${escapeHtml(o.identity)}</div></div><div class="card-body">${infoGrid([
            {k:'RouterOS 版本', v: escapeHtml(o.version)},
            {k:'设备型号', v: escapeHtml(o.boardName)},
            {k:'架构', v: escapeHtml(o.architecture)},
            {k:'系统时间', v: escapeHtml(o.systemTime)},
            {k:'运行时长', v: escapeHtml(o.uptime)},
            {k:'在线管理员会话', v: fmtNumber(admins.length)}
          ])}</div></div>
          <div class="card"><div class="card-head"><div class="card-title">当前登录管理员</div><div class="subtle">${fmtNumber(admins.length)} 会话</div></div><div class="card-body">${admins.length ? infoGrid(admins.slice(0, 6).map((item) => ({k:`${item.name} / ${item.via}`, v:`${escapeHtml(item.address)} · ${escapeHtml(item.when)}`}))) : emptyBlock('暂无在线管理会话')}</div></div>
        </div>`;
      const loadCharts = `
        <div class="grid-3" style="margin-top:12px">
          <div class="card" style="grid-column: span 2"><div class="card-head"><div class="card-title">资源趋势</div><div class="subtle">CPU / 内存 / 磁盘分图</div></div><div class="card-body">${resourceTrendGrid(o, `${Math.max(o.history?.cpu?.length || 0, o.history?.memory?.length || 0, o.history?.disk?.length || 0)} 点 · ${escapeHtml(snapshot.meta.pollSeconds)}s / 点`)}</div></div>
          <div class="card"><div class="card-head"><div class="card-title">实时速率趋势</div><div class="subtle">WAN 聚合速率</div></div><div class="card-body"><div class="chart-box"><div class="chart-label"><span>实时上行速率 ${fmtRate(o.uplinkBps)}</span><span>实时下行速率 ${fmtRate(o.downlinkBps)}</span></div>${lineChart([o.history.uplink, o.history.downlink], {colors:['#165dff','#f53f3f']})}</div></div></div>
        </div>`;
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
      const auditPanels = `
        <div class="grid-2" style="margin-top:12px">
          <div class="card"><div class="card-head"><div class="card-title">管理会话审计</div><div class="subtle">${fmtNumber((o.admins || []).length)} 会话</div></div><div class="card-body">${table(['用户', '方式', '来源地址', '登录时间'], adminRows, '暂无在线管理会话')}</div></div>
          <div class="card"><div class="card-head"><div class="card-title">负载状态说明</div><div class="subtle">仅展示 RouterOS 可读状态</div></div><div class="card-body">${infoGrid([
            {k:'系统状态', v: tag(o.systemLoadLevel === 'danger' ? '高压' : o.systemLoadLevel === 'warning' ? '预警' : '正常', o.systemLoadLevel)},
            {k:'连接总数', v: fmtCompact(snapshot.connections.total)},
            {k:'明细更新时间', v: snapshot.connections.detailUpdatedAt ? escapeHtml(snapshot.connections.detailUpdatedAt) : '等待采集'},
            {k:'NTP 状态', v: tag(o.ntpStatus || '-', o.ntpStatus === 'synchronized' ? 'ok' : 'warn')}
          ])}</div></div>
        </div>
        <div class="card" style="margin-top:12px"><div class="card-head"><div class="card-title">当前活跃连接列表</div><div class="subtle">负载审计视角下的实时会话</div></div><div class="card-body">${table(['本地 IP', '远端地址', '协议', '实时上行速率', '实时下行速率', '超时', '连接标记'], activeRows, '暂无活跃连接')}</div></div>`;
      const trafficPanels = `
        <div class="grid-2" style="margin-top:12px">
          <div class="card"><div class="card-head"><div class="card-title">单 IP 活跃连接排行</div><div class="subtle">按当前活跃会话聚合</div></div><div class="card-body">${table(['本地 IP', '主机名', '活跃连接', '实时上行速率', '实时下行速率'], topIpRows, '暂无活跃连接排行')}</div></div>
          <div class="card"><div class="card-head"><div class="card-title">当前活跃连接列表</div><div class="subtle">限前 ${fmtNumber(snapshot.connections.active.length)} 条</div></div><div class="card-body">${table(['本地 IP', '远端地址', '协议', '实时上行速率', '实时下行速率', '超时', '连接标记'], activeRows, '暂无活跃连接')}</div></div>
        </div>`;
      return section(sectionTitle, sectionId, sectionTip, `
        ${loadCards}
        ${infoPanels}
        ${loadCharts}
        <div style="margin-top:12px">${protocolCards}</div>
        ${emphasis === 'audit' ? auditPanels : trafficPanels}`);
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
      return section(sectionTitle, sectionId, sectionTip, `
        <div class="grid-4">
          ${metricCard('ACL 规则数', fmtNumber((security.filters || []).length), '仅统计可读 Filter', '')}
          ${metricCard('名单条目数', fmtNumber((security.addressLists || []).length), '黑白名单 / 地址集', '')}
          ${metricCard('异常告警数', fmtNumber((security.alerts || []).length), '按日志关键字聚合', '')}
          ${metricCard('ARP 防护记录', '日志侧观察', '当前无独立 API 计数', '')}
        </div>
        <div style="margin-top:12px">${alerts}</div>
        <div class="grid-2" style="margin-top:12px">
          <div class="card"><div class="card-head"><div class="card-title">防火墙 Filter 规则</div><div class="subtle">按命中包数排序</div></div><div class="card-body">${table(['链', '动作', '备注', '命中包', '命中流量', '状态'], filterRows, '暂无 Filter 规则数据')}</div></div>
          <div class="card"><div class="card-head"><div class="card-title">黑白名单与地址集</div><div class="subtle">仅读取已存在条目</div></div><div class="card-body">${table(['列表名', '类别', '地址', '超时', '备注'], listRows, '暂无地址名单数据')}</div></div>
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
      return section('分流监控中心', 'balance', '默认路由、Mangle 分流规则与策略路由全部归入分流监控中心', `
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
          <div class="card"><div class="card-head"><div class="card-title">Mangle 分流规则</div><div class="subtle">按命中流量排序</div></div><div class="card-body">${table(['链', '动作', '新路由标记', '备注', '命中包', '命中流量'], mangleRows, '暂无 Mangle 分流数据')}</div></div>
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
      return section('DHCP 服务', 'dhcp', 'DHCP 服务器、地址池与租约全部按 RouterOS 实读数据展示', `
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
        <div class="card" style="margin-top:12px"><div class="card-head"><div class="card-title">DHCP 租约与静态分配</div><div class="subtle">${fmtNumber(leases.length)} 条</div></div><div class="card-body">${table(['IP', '主机名', 'MAC', '服务', '状态', '最后出现', '分配方式'], leaseRows, '当前未读取到 DHCP 租约')}</div></div>`);
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
      return section('静态路由', 'routes', '真实路由表、默认路由与静态路由按 RouterOS 实表展示', `
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
        <div class="card" style="margin-top:12px"><div class="card-head"><div class="card-title">当前路由表</div><div class="subtle">前 ${fmtNumber((routes.items || []).length)} 条</div></div><div class="card-body">${table(['目标网段', '网关', '路由表', '距离', '地址族', '类型', '状态'], allRows, '当前未读取到路由表')}</div></div>`);
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
      return section('流量负载', 'trafficLoad', '按 RouterOS 真实吞吐数据展示宽带占用、接口吞吐与终端流量排行', `
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
          <div class="card"><div class="card-head"><div class="card-title">宽带实时负载</div><div class="subtle">按 PPPoE 实时吞吐排序</div></div><div class="card-body">${table(['线路', '状态', '父接口', '实时上行速率', '实时下行速率', '累计上行流量', '累计下行流量'], lineRows, '当前未读取到宽带实时负载')}</div></div>
          <div class="card"><div class="card-head"><div class="card-title">接口吞吐排行</div><div class="subtle">按接口实时吞吐排序</div></div><div class="card-body">${table(['接口', '角色', '类型', '实时上行速率', '实时下行速率', '累计上行流量', '累计下行流量'], interfaceRows, '当前未读取到接口吞吐排行')}</div></div>
        </div>
        <div class="card" style="margin-top:12px"><div class="card-head"><div class="card-title">终端实时流量排行</div><div class="subtle">按终端实时吞吐与累计流量综合查看</div></div><div class="card-body">${table(['名称', 'IP', '实时上行速率', '实时下行速率', '连接数', '累计流量'], terminalRows, '当前未读取到终端实时流量排行')}</div></div>`);
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
      const roleRows = diagnostics.map((item) => `
        <tr>
          <td>${escapeHtml(item.row.name)}</td>
          <td>${tag(item.role.label, item.role.level)}</td>
          <td>${item.activeTables.length ? item.activeTables.map(escapeHtml).join('<br>') : '-'}</td>
          <td>${item.activeRoutes.length ? item.activeRoutes.map((route) => escapeHtml(route.distance || '-')).join('<br>') : '-'}</td>
          <td>${escapeHtml(item.row.parent || '-')}</td>
          <td>${item.hasAddress ? tag('已拿到', 'ok') : tag('未拿到', 'warn')}</td>
          <td>${fmtNumber(item.dropTotal)} / ${fmtNumber(item.errorTotal)}</td>
        </tr>`).join('');
      const lineTrendRows = getLineTrendRows(pppoe);
      return section('线路状态', 'lineStatus', '按健康闭环、出口角色和处理优先级定位线路问题', `
        <div class="grid-4">
          ${metricCard('可用出口', fmtNumber(diagnostics.filter((item) => item.level === 'ok').length), `总线路 ${fmtNumber(pppoe.length)} 条`, '健康闭环完整')}
          ${metricCard('待观察', fmtNumber(diagnostics.filter((item) => item.level === 'warn').length), '有累计丢包或轻微异常', '先观察趋势')}
          ${metricCard('故障优先', fmtNumber(diagnostics.filter((item) => item.level === 'danger').length), '离线或无活动默认路由', '需要优先处理')}
          ${metricCard('路由覆盖', fmtNumber(activeRouteTables.length), activeRouteTables.length ? activeRouteTables.slice(0, 4).map(escapeHtml).join(' / ') : '无活动表', '按活动默认路由统计')}
        </div>
        <div class="card" style="margin-top:12px"><div class="card-head"><div class="card-title">故障优先队列</div><div class="subtle">紧凑诊断视图，一行一条线路</div></div><div class="card-body">${compactTable(['#', '状态', '线路 / 父接口', '分', '出口角色', '原因', '动作', '闭环', '丢 / 错', '上 / 下'], diagnosticRows, '当前未读取到线路诊断数据')}</div></div>
        <div class="card" style="margin-top:12px"><div class="card-head"><div class="card-title">线路角色矩阵</div><div class="subtle">看每条 PPPoE 在路由体系里的角色，不重复接口吞吐清单</div></div><div class="card-body">${compactTable(['线路', '出口角色', '活动表', '距离', '父接口', '地址', '丢 / 错'], roleRows, '当前未读取到线路角色数据')}</div></div>
        <div class="card" style="margin-top:12px"><div class="card-head"><div class="card-title">线路速率趋势</div><div class="subtle">${fmtNumber(lineTrendRows.length)} 条线路同步展示，作为诊断辅助信息</div></div><div class="card-body">${renderLineTrendGrid(lineTrendRows, {emptyText:'当前未读取到可展示的线路趋势'})}</div></div>`);
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
      return section('流量审计', 'trafficAudit', '活跃连接、单 IP 流量排行与会话审计数据集中查看', `
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

    function renderServiceLogs(snapshot) {
      const logs = snapshot.logs || {};
      const dhcp = snapshot.dhcp || {};
      const dns = snapshot.dns || {};
      const renderRows = (rows) => (rows || []).slice(0, 20).map((row) => `
        <tr>
          <td>${escapeHtml(row.time)}</td>
          <td>${escapeHtml(row.topics)}</td>
          <td>${escapeHtml(row.message)}</td>
        </tr>`);
      return section('服务日志', 'serviceLogs', 'DHCP 与 DNS 服务日志、服务状态和静态规则集中展示', `
        <div class="grid-4">
          ${metricCard('DHCP 日志', fmtNumber((logs.dhcp || []).length), `DHCP 服务器 ${fmtNumber((dhcp.servers || []).length)} 个`, '')}
          ${metricCard('DNS 日志', fmtNumber((logs.dns || []).length), `静态规则 ${fmtNumber((dns.forwardRules || []).length)} 条`, '')}
          ${metricCard('DNS 状态', dns.running ? tag('启用', 'ok') : tag('未启用', 'danger'), '来自 RouterOS ip/dns', '')}
          ${metricCard('服务总览', `${fmtNumber((dhcp.servers || []).length)} / ${fmtNumber((dns.servers || []).length)}`, 'DHCP 服务 / DNS 上游', '')}
        </div>
        <div class="grid-2" style="margin-top:12px">
          <div class="card"><div class="card-head"><div class="card-title">DHCP 服务日志</div><div class="subtle">最近 20 条</div></div><div class="card-body">${table(['时间', '主题', '消息'], renderRows(logs.dhcp), '当前未读取到 DHCP 服务日志')}</div></div>
          <div class="card"><div class="card-head"><div class="card-title">DNS 服务日志</div><div class="subtle">最近 20 条</div></div><div class="card-body">${table(['时间', '主题', '消息'], renderRows(logs.dns), '当前未读取到 DNS 服务日志')}</div></div>
        </div>
        <div class="grid-2" style="margin-top:12px">
          <div class="card"><div class="card-head"><div class="card-title">DHCP 服务状态</div><div class="subtle">RouterOS 可读参数</div></div><div class="card-body">${infoGrid([
            {k:'DHCP 服务器', v: fmtNumber((dhcp.servers || []).length)},
            {k:'地址池', v: fmtNumber((dhcp.pools || []).length)},
            {k:'租约', v: fmtNumber((dhcp.leases || []).length)},
            {k:'运行中', v: fmtNumber((dhcp.servers || []).filter((row) => row.running).length)}
          ])}</div></div>
          <div class="card"><div class="card-head"><div class="card-title">DNS 服务状态</div><div class="subtle">RouterOS 可读参数</div></div><div class="card-body">${infoGrid([
            {k:'DNS 状态', v: dns.running ? '启用' : '未启用'},
            {k:'上游 DNS', v: fmtNumber((dns.servers || []).length)},
            {k:'DoH', v: dns.dohServer ? escapeHtml(dns.dohServer) : '未配置'},
            {k:'静态规则', v: fmtNumber((dns.forwardRules || []).length)}
          ])}</div></div>
        </div>`);
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
      } else {
        setPageSubtitle(meta.subtitle);
        updateRefreshMeta();
      }
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
          return [
            ['连接总数', fmtCompact(connections.total)],
            ['TCP', hasProtocolBreakdown(connections) ? fmtCompact(connections.tcp) : '未采集'],
            ['UDP', hasProtocolBreakdown(connections) ? fmtCompact(connections.udp) : '未采集'],
            ['ICMP', hasProtocolBreakdown(connections) ? fmtCompact(connections.icmp) : '未采集'],
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
          return [
            ['在线线路', `${fmtNumber(activePppoe)} / ${fmtNumber(pppoe.length)}`],
            ['在线接口', `${fmtNumber(activeInterfaces)} / ${fmtNumber(interfaces.length)}`],
            ['异常线路', fmtNumber(pppoe.filter((row) => !row.running || !(row.addresses || []).length).length)],
            ['IPv6 接口', fmtNumber(interfaces.filter((row) => (row.ips || []).some((ip) => String(ip).includes(':'))).length)]
          ];
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
  
