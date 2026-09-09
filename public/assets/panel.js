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
  function renderSwitcher(login, saved) {
    const wrap = $('routerSwitchWrap'), select = $('routerSwitcher');
    if (!wrap || !select) return;
    const list = Array.isArray(saved) ? saved.filter(function(r){ return r && r.id; }) : [];
    if (!list.length) { wrap.hidden = true; return; }
    wrap.hidden = false;
    const cur = routerLoginState ? ((routerLoginState.host || '') + '@' + (routerLoginState.user || '')) : '';
    const curId = routerLoginState && routerLoginState.savedId ? String(routerLoginState.savedId) : '';
    select.innerHTML = ['<option value="">' + esc('切换路由器…') + '</option>'].concat(list.map(function(row){
      const isCur = row.id === curId || ((row.host || '') + '@' + (row.user || '')) === cur;
      const state = row.lastTest && row.lastTest.rest && row.lastTest.rest.ok === true ? '在线' : (row.lastTest ? '待验证' : '未验证');
      return '<option value="' + esc(row.id) + '"' + (isCur ? ' selected' : '') + '>' + esc(row.label || row.host || '') + ' · ' + esc(row.user || '') + ' · ' + state + '</option>';
    })).join('');
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
    switchBusy = true;
    const text = $('updateText'), prev = text ? text.textContent : '';
    if (text) text.textContent = '正在切换路由器…';
    fetch('/api/router-login', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': window.routerLoginCsrfToken || '' },
      body: JSON.stringify({ savedId: id, rememberPassword: false })
    }).then(function(r){ return r.json().catch(function(){ return {}; }).then(function(p){ return { ok: r.ok, p: p }; }); })
      .then(function(res){
        if (!res.ok || res.p.ok === false) throw new Error((res.p && (res.p.error || (res.p.test && res.p.test.ssh && res.p.test.ssh.error))) || '切换失败');
        routerLoginState = res.p.routerLogin || routerLoginState;
        if (text) text.textContent = '已切换到 ' + ((routerLoginState && routerLoginState.host) || '');
        setTimeout(function(){ window.location.reload(); }, 600);
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
    if ($('routerSetupOverlay')) return;
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
            '<label class="router-setup-check"><input id="suRemember" type="checkbox" checked> 记住设备资料（保存地址、端口与协议到本机）</label>' +
            '<div class="router-setup-channel"><span class="dot" id="suRestDot"></span>REST <span class="dot" id="suSshDot"></span>SSH</div>' +
            '<div id="suMsg" class="router-setup-msg" hidden></div>' +
            '<div class="router-setup-actions"><button class="router-setup-submit" id="suSubmit" type="submit">连接并进入面板</button></div>' +
          '</form>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    overlay.querySelector('#routerSetupForm').addEventListener('submit', onSubmit);
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
      setTimeout(function(){ const o = $('routerSetupOverlay'); if (o) o.remove(); window.panelRouterSwitcher.reload(); }, 900);
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
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootSetupCheck);
  else bootSetupCheck();
})();
