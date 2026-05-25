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
  const section = 'overview';
  const outJson = path.resolve(arg('--json', 'overview-ikuai.json'));
  const outPng = path.resolve(arg('--png', 'overview-ikuai.png'));
  const width = Number(arg('--width', '1528'));
  const height = Number(arg('--height', '980'));
  const waitMs = Number(arg('--wait', '7000'));
  const port = Number(arg('--port', String(11000 + Math.floor(Math.random() * 900))));
  const userDataDir = path.resolve(arg('--user-data-dir', path.join(process.cwd(), `_edge_overview_${port}_${Date.now()}`)));

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

  const targetUrl = `${url}${url.includes('?') ? '&' : '?'}section=${section}&codexBust=${Date.now()}#${section}`;
  const browser = spawn(browserPath, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ], { stdio: 'ignore' });

  let socket;
  try {
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

    const expression = `(() => {
      const normalize = (text) => String(text || '').replace(/\\s+/g, ' ').trim();
      const sectionEl = document.querySelector('#overview');
      const text = normalize(sectionEl?.textContent || '');
      const required = ['WAN 信息', '快捷入口', '监控信息', '终端数量', '流量排行榜', 'CPU负载', '内存使用率', '磁盘使用率'];
      const missing = required.filter((item) => !text.includes(item));
      const statusTiles = Array.from(sectionEl?.querySelectorAll('.ikuai-stat-tile') || []);
      const quickLinks = Array.from(sectionEl?.querySelectorAll('.ikuai-quick') || []);
      const terminalSummary = sectionEl?.querySelector('[data-ikuai-terminal-summary]');
      const latency = sectionEl?.querySelector('.ikuai-latency');
      const quickHead = sectionEl?.querySelector('.ikuai-quick-head');
      const terminalAfterLatency = Boolean(latency && terminalSummary && (latency.compareDocumentPosition(terminalSummary) & Node.DOCUMENT_POSITION_FOLLOWING));
      const terminalBeforeQuick = Boolean(terminalSummary && quickHead && (terminalSummary.compareDocumentPosition(quickHead) & Node.DOCUMENT_POSITION_FOLLOWING));
      const duplicateTerminalCards = Array.from(sectionEl?.querySelectorAll('.ikuai-right .ikuai-card-title') || [])
        .filter((node) => normalize(node.textContent) === '终端数量');
      const visibleAxisLabels = (selector) => Array.from(sectionEl?.querySelectorAll(selector) || [])
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0' && normalize(node.textContent);
        });
      const wanAxisLabels = visibleAxisLabels('.ikuai-wan-card .axis-tick-label');
      const monitorAxisLabels = visibleAxisLabels('.ikuai-monitor-card .axis-tick-label');
      const overviewAxesOk = wanAxisLabels.length >= 3 && monitorAxisLabels.length >= 3;
      let overviewStickyOk = innerWidth < 1024;
      let overviewStickyProbe = null;
      if (innerWidth >= 1024) {
        const originalScrollY = scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
        const wanCard = sectionEl?.querySelector('.ikuai-wan-card');
        const titleNode = wanCard?.querySelector('.ikuai-card-title');
        const maxProbeY = Math.max(0, document.documentElement.scrollHeight - innerHeight - 1);
        const probeY = Math.min(520, maxProbeY);
        if (wanCard && titleNode && probeY >= 120) {
          scrollTo(0, probeY);
          const cardRect = wanCard.getBoundingClientRect();
          const titleRect = titleNode.getBoundingClientRect();
          const cardStyle = getComputedStyle(wanCard);
          overviewStickyOk = cardStyle.position === 'sticky' && cardRect.top >= 0 && cardRect.top <= 24 && titleRect.top >= cardRect.top && titleRect.top < innerHeight / 2;
          overviewStickyProbe = {
            probeY,
            cardTop: Math.round(cardRect.top),
            titleTop: Math.round(titleRect.top),
            position: cardStyle.position,
            internalScrollTop: Math.round(wanCard.scrollTop || 0)
          };
          scrollTo(0, originalScrollY);
        }
      }
      const resourceGrid = sectionEl?.querySelector('.ikuai-resource-grid');
      const resourceCards = Array.from(resourceGrid?.querySelectorAll('.ikuai-resource-card') || []);
      const resourceText = normalize(resourceGrid?.textContent || '');
      const resourceColumns = resourceGrid ? getComputedStyle(resourceGrid).gridTemplateColumns.split(' ').filter(Boolean).length : 0;
      const overflowingMetricNodes = Array.from(sectionEl?.querySelectorAll('.ikuai-terminal-item b, .ikuai-stat-main, .ikuai-resource-card .ikuai-card-title') || [])
        .filter((node) => node.scrollWidth > node.clientWidth + 2);
      const horizontalOverflow = sectionEl ? sectionEl.scrollWidth > sectionEl.clientWidth + 2 : true;
      return {
        pass: Boolean(sectionEl && missing.length === 0 && statusTiles.length >= 3 && quickLinks.length >= 9 && terminalAfterLatency && terminalBeforeQuick && duplicateTerminalCards.length === 0 && overviewAxesOk && overviewStickyOk && resourceCards.length === 3 && resourceColumns >= 3 && resourceText.includes('CPU负载') && resourceText.includes('内存使用率') && resourceText.includes('磁盘使用率') && !horizontalOverflow && overflowingMetricNodes.length === 0),
        url: location.href,
        missing,
        statusTileCount: statusTiles.length,
        quickLinkCount: quickLinks.length,
        terminalAfterLatency,
        terminalBeforeQuick,
        duplicateTerminalCardCount: duplicateTerminalCards.length,
        wanAxisLabelCount: wanAxisLabels.length,
        wanAxisLabels: wanAxisLabels.map((node) => normalize(node.textContent)).slice(0, 3),
        monitorAxisLabelCount: monitorAxisLabels.length,
        monitorAxisLabels: monitorAxisLabels.map((node) => normalize(node.textContent)).slice(0, 3),
        overviewAxesOk,
        overviewStickyOk,
        overviewStickyProbe,
        resourceCardCount: resourceCards.length,
        resourceColumns,
        horizontalOverflow,
        overflowingMetricCount: overflowingMetricNodes.length,
        overflowingMetrics: overflowingMetricNodes.map((node) => normalize(node.textContent)).slice(0, 8),
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
      throw new Error(`Overview check failed: ${JSON.stringify(report)}`);
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
