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
  const section = arg('--section', 'loadAudit');
  const outJson = path.resolve(arg('--json', `resource-balance-${section}.json`));
  const outPng = path.resolve(arg('--png', `resource-balance-${section}.png`));
  const width = Number(arg('--width', '1528'));
  const height = Number(arg('--height', '980'));
  const waitMs = Number(arg('--wait', '6200'));
  const port = Number(arg('--port', String(10000 + Math.floor(Math.random() * 900))));
  const userDataDir = path.resolve(arg('--user-data-dir', path.join(process.cwd(), `_edge_resource_${section}_${port}_${Date.now()}`)));

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
      const sectionName = ${JSON.stringify(section)};
      const normalize = (text) => String(text || '').replace(/\\s+/g, ' ').trim();
      const sectionEl = document.querySelector('#' + sectionName);
      const text = normalize(sectionEl?.textContent || '');
      if (sectionName === 'loadAudit') {
        const required = ['CPU 负载', '内存使用率', '磁盘使用率', '100%', '50%', '0%'];
        const missing = required.filter((item) => !text.includes(item));
        const cards = Array.from(sectionEl?.querySelectorAll('.ops-resource-card') || []);
        const axes = Array.from(sectionEl?.querySelectorAll('.ops-axis-chart') || []);
        const colors = cards.map((card) => getComputedStyle(card).getPropertyValue('--resource-color').trim());
        return {
          pass: Boolean(sectionEl && missing.length === 0 && cards.length >= 3 && axes.length >= 3),
          section: sectionName,
          url: location.href,
          missing,
          resourceCardCount: cards.length,
          axisChartCount: axes.length,
          colors,
          viewport: { width: innerWidth, height: innerHeight },
          scrollHeight: document.documentElement.scrollHeight
        };
      }
      if (sectionName === 'balance') {
        const row = sectionEl?.querySelector('.ops-balance-route-row');
        const shareCard = sectionEl?.querySelector('.ops-balance-share-card');
        const cards = Array.from(row?.children || []);
        const routeCard = cards.find((card) => card !== shareCard);
        const shareRect = shareCard?.getBoundingClientRect();
        const routeRect = routeCard?.getBoundingClientRect();
        const bars = Array.from(shareCard?.querySelectorAll('.line-bar') || []);
        const heightDiff = shareRect && routeRect ? Math.abs(shareRect.height - routeRect.height) : null;
        return {
          pass: Boolean(sectionEl && row && shareCard && routeCard && bars.length >= 8 && heightDiff !== null && heightDiff <= 12),
          section: sectionName,
          url: location.href,
          barCount: bars.length,
          shareHeight: shareRect ? shareRect.height : 0,
          routeHeight: routeRect ? routeRect.height : 0,
          heightDiff,
          viewport: { width: innerWidth, height: innerHeight },
          scrollHeight: document.documentElement.scrollHeight
        };
      }
      return { pass: false, section: sectionName, error: 'unsupported section' };
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
      throw new Error(`Resource/balance check failed: ${JSON.stringify(report)}`);
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
