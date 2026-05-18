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
  const outJson = path.resolve(arg('--json', 'overview-rank-quick-align.json'));
  const outPng = path.resolve(arg('--png', 'overview-rank-quick-align.png'));
  const width = Number(arg('--width', '1528'));
  const height = Number(arg('--height', '980'));
  const waitMs = Number(arg('--wait', '8000'));
  const port = Number(arg('--port', String(12000 + Math.floor(Math.random() * 2000))));
  const userDataDir = path.resolve(arg('--user-data-dir', path.join(process.cwd(), `_edge_overview_align_${port}_${Date.now()}`)));

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

  const separator = url.includes('?') ? '&' : '?';
  const targetUrl = `${url}${separator}codexAlign=${Date.now()}#overview`;
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
      const rect = (el) => {
        const r = el?.getBoundingClientRect();
        return r ? { top: r.top, left: r.left, width: r.width, height: r.height, right: r.right, bottom: r.bottom } : null;
      };
      const quickCard = document.querySelector('#overview .ik-home-quick-card');
      const quickGrid = document.querySelector('#overview .ik-home-quick-card .ik-quick-grid');
      const quickLinks = [...document.querySelectorAll('#overview .ik-home-quick-card .ik-quick-link')];
      const lastQuick = quickLinks.at(-1);
      const rankSection = document.querySelector('#overview [data-overview-rank-grid]')?.closest('.card');
      const rankWraps = [...document.querySelectorAll('#overview .ik-home-rank-card .ops-table-wrap')];
      const rankRows = [...document.querySelectorAll('#overview .ik-home-rank-card tbody tr')];
      const rankVisibleRows = rankWraps.map((wrap) => [...wrap.querySelectorAll('tbody tr')].filter((tr) => {
        const trr = tr.getBoundingClientRect();
        const wr = wrap.getBoundingClientRect();
        return trr.bottom > wr.top && trr.top < wr.bottom;
      }).length);
      const quickR = rect(quickCard);
      const gridR = rect(quickGrid);
      const lastR = rect(lastQuick);
      const rankR = rect(rankSection);
      const quickBottomOk = Boolean(quickR && lastR && lastR.bottom <= quickR.bottom - 2);
      const rankQuickDelta = quickR && rankR ? Math.abs(rankR.bottom - quickR.bottom) : null;
      const rankHeightOk = rankQuickDelta !== null && rankQuickDelta <= 28;
      return {
        url: location.href,
        quickCard: quickR,
        quickGrid: gridR,
        lastQuick: lastR,
        rankSection: rankR,
        quickLinkCount: quickLinks.length,
        rankWrapHeights: rankWraps.map((wrap) => ({
          clientHeight: wrap.clientHeight,
          scrollHeight: wrap.scrollHeight,
          cssHeight: getComputedStyle(wrap).height,
          maxHeight: getComputedStyle(wrap).maxHeight
        })),
        rankRowCount: rankRows.length,
        rankVisibleRows,
        quickBottomOk,
        rankQuickDelta,
        rankHeightOk,
        pass: quickBottomOk && rankHeightOk && quickLinks.length >= 9 && rankVisibleRows.every((count) => count >= 8)
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
      throw new Error(`Overview rank/quick alignment failed: ${JSON.stringify(report)}`);
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
