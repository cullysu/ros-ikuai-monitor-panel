const fs = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');

function arg(name, fallback = '') {
  const direct = process.argv.find((item) => item.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  if (index >= 0) return process.argv[index + 1] || fallback;
  return fallback;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function waitJson(url, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) return await response.json();
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw lastError || new Error(`Timed out waiting for ${url}`);
}

async function openSocket(wsUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    socket.onopen = () => resolve(socket);
    socket.onerror = () => reject(new Error(`Failed to open ${wsUrl}`));
  });
}

async function main() {
  const url = arg('--url', 'http://127.0.0.1:8138/');
  const section = arg('--section', 'arp');
  const terminalView = arg('--terminal-view', '');
  const outJson = path.resolve(arg('--json', `info-density-${section}${terminalView ? `-${terminalView}` : ''}.json`));
  const outPng = path.resolve(arg('--png', `info-density-${section}${terminalView ? `-${terminalView}` : ''}.png`));
  const width = Number(arg('--width', '1600'));
  const height = Number(arg('--height', '1200'));
  const waitMs = Number(arg('--wait', '6200'));
  const port = Number(arg('--port', String(10000 + Math.floor(Math.random() * 900))));
  const userDataDir = path.resolve(arg('--user-data-dir', path.join(process.cwd(), `_edge_info_density_${section}_${port}_${Date.now()}`)));

  const browserCandidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  ];
  const browserPath = (await Promise.all(browserCandidates.map(async (item) => [item, await exists(item)]))).find(([, ok]) => ok)?.[0];
  if (!browserPath) throw new Error('Edge/Chrome executable not found');

  await fs.mkdir(path.dirname(outJson), { recursive: true });
  await fs.mkdir(path.dirname(outPng), { recursive: true });
  await fs.mkdir(userDataDir, { recursive: true });

  const targetUrl = `${url}${url.includes('?') ? '&' : '?'}section=${encodeURIComponent(section)}&codexBust=${Date.now()}#${encodeURIComponent(section)}`;
  const browser = spawn(browserPath, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    targetUrl
  ], { windowsHide: true, stdio: 'ignore' });

  let socket;
  try {
    await waitJson(`http://127.0.0.1:${port}/json/version`, 15000);
    let pageTarget = null;
    for (let i = 0; i < 40; i += 1) {
      const targets = await waitJson(`http://127.0.0.1:${port}/json/list`, 3000);
      pageTarget = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
      if (pageTarget) break;
      await delay(250);
    }
    if (!pageTarget) throw new Error('Page websocket URL missing');

    socket = await openSocket(pageTarget.webSocketDebuggerUrl);
    let id = 0;
    const pending = new Map();

    socket.onmessage = async (event) => {
      let raw = event.data;
      if (raw && typeof raw !== 'string') {
        if (typeof raw.text === 'function') raw = await raw.text();
        else if (raw instanceof ArrayBuffer) raw = Buffer.from(raw).toString('utf8');
        else if (ArrayBuffer.isView(raw)) raw = Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength).toString('utf8');
        else raw = String(raw);
      }
      const message = JSON.parse(raw);
      if (!message.id || !pending.has(message.id)) return;
      const task = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) task.reject(new Error(`${task.method}: ${JSON.stringify(message.error)}`));
      else task.resolve(message.result || {});
    };

    function send(method, params = {}) {
      const messageId = ++id;
      return new Promise((resolve, reject) => {
        pending.set(messageId, { resolve, reject, method });
        socket.send(JSON.stringify({ id: messageId, method, params }));
      });
    }

    await send('Runtime.enable');
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: targetUrl });
    await delay(waitMs);

    if (section === 'terminals' && terminalView) {
      await send('Runtime.evaluate', {
        expression: `(() => {
          const btn = document.querySelector('[data-terminal-view="${terminalView}"]');
          if (btn) btn.click();
          return Boolean(btn);
        })()`,
        returnByValue: true
      });
      await delay(1800);
    }

    const expression = `(() => {
      const sectionName = ${JSON.stringify(section)};
      const terminalView = ${JSON.stringify(terminalView)};
      const normalize = (text) => String(text || '').replace(/\\s+/g, ' ').trim();
      const expected = {
        arp: ['设备身份关联表', 'MAC 漂移 / 冲突线索', 'ARP 原始表'],
        trafficAudit: ['协议 / 地址族分布', '当前活跃连接明细', '终端流量审计'],
        trafficLoad: ['宽带实时负载', '接口吞吐 / 地址族覆盖', '终端流量排行'],
        terminals: [terminalView === 'ipv6' ? 'IPv6 终端身份表' : 'IPv4 终端身份表', '设备身份合并表']
      }[sectionName] || [];
      const sectionEl = document.querySelector('#' + sectionName);
      const titles = Array.from(sectionEl?.querySelectorAll('.card-title') || []).map((node) => normalize(node.textContent));
      const missingTitles = expected.filter((title) => !titles.includes(title));
      const tables = Array.from(sectionEl?.querySelectorAll('table.ops-table') || []);
      const compactTables = Array.from(sectionEl?.querySelectorAll('table.ops-compact-table') || []);
      const headers = Array.from(sectionEl?.querySelectorAll('th') || []).map((node) => normalize(node.textContent));
      const text = normalize(sectionEl?.textContent || '');
      const rowCounts = tables.map((table) => table.querySelectorAll('tbody tr').length);
      const hasIpv4Text = /IPv4|192\\.168\\./.test(text);
      const hasIpv6Text = /IPv6|fe80:|2408:|2409:/.test(text);
      const hasMacText = /MAC|[0-9A-F]{2}:[0-9A-F]{2}:/i.test(text);
      const hasFlowText = /实时上行|实时下行|活跃会话|连接/.test(text);
      const hasArpText = /ARP|MAC 漂移/.test(text);
      const pass = Boolean(
        sectionEl &&
        missingTitles.length === 0 &&
        compactTables.length >= (sectionName === 'terminals' ? 2 : 3) &&
        rowCounts.reduce((sum, count) => sum + count, 0) >= (sectionName === 'trafficAudit' ? 20 : 8) &&
        (sectionName !== 'arp' || (hasArpText && hasIpv4Text && hasMacText)) &&
        (sectionName !== 'trafficAudit' || (hasFlowText && hasIpv4Text && hasIpv6Text)) &&
        (sectionName !== 'trafficLoad' || (hasFlowText && hasIpv4Text && hasIpv6Text)) &&
        (sectionName !== 'terminals' || (hasFlowText && hasMacText && (terminalView === 'ipv6' ? hasIpv6Text : hasIpv4Text)))
      );
      return {
        pass,
        section: sectionName,
        terminalView,
        url: location.href,
        sectionExists: Boolean(sectionEl),
        expectedTitles: expected,
        titles,
        missingTitles,
        tableCount: tables.length,
        compactTableCount: compactTables.length,
        rowCounts,
        headers,
        hasIpv4Text,
        hasIpv6Text,
        hasMacText,
        hasFlowText,
        hasArpText,
        viewport: { width: innerWidth, height: innerHeight },
        scrollHeight: document.documentElement.scrollHeight
      };
    })()`;

    const result = await send('Runtime.evaluate', { expression, returnByValue: true });
    const report = result.result?.value || {};
    const screenshot = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true
    });
    await fs.writeFile(outPng, Buffer.from(screenshot.data, 'base64'));
    await fs.writeFile(outJson, JSON.stringify(report, null, 2), 'utf8');

    if (!report.pass) {
      throw new Error(`Panel info density check failed: ${JSON.stringify(report)}`);
    }
    console.log(JSON.stringify(report, null, 2));
  } finally {
    if (socket) {
      try { socket.close(); } catch {}
    }
    browser.kill();
    await delay(300);
    try {
      await fs.rm(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
    } catch {}
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
