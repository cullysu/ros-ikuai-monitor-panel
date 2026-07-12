const fs = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');

function arg(name, fallback = '') {
  const direct = process.argv.find((item) => item.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] || fallback) : fallback;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const outJson = path.resolve(arg('--json', 'readonly-info.json'));
  const outPng = path.resolve(arg('--png', 'readonly-info.png'));
  const width = Number(arg('--width', '1528'));
  const height = Number(arg('--height', '980'));
  const waitMs = Number(arg('--wait', '5500'));
  const port = Number(arg('--port', String(13000 + Math.floor(Math.random() * 900))));
  const userDataDir = path.resolve(arg('--user-data-dir', path.join(process.cwd(), `_edge_readonly_${port}_${Date.now()}`)));

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

  const targetUrl = `${url}${url.includes('?') ? '&' : '?'}section=overview&codexBust=${Date.now()}#overview`;
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
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const messageId = ++id;
      pending.set(messageId, { resolve, reject, method });
      socket.send(JSON.stringify({ id: messageId, method, params }));
    });

    await send('Runtime.enable');
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: targetUrl });
    await delay(waitMs);

    const expression = `(() => {
      const button = document.querySelector('[data-readonly-info-open]');
      button?.click();
      const popover = document.querySelector('.ik-readonly-popover');
      const text = String(popover?.textContent || '').replace(/\\s+/g, ' ').trim();
      return {
        pass: Boolean(button && button.getAttribute('aria-label')?.includes('不写 RouterOS 配置') && popover?.classList.contains('is-open') && text.includes('只读状态') && text.includes('RouterOS') && text.includes('不会修改')),
        opened: popover?.classList.contains('is-open') || false,
        text,
        buttonText: button?.textContent || '',
        buttonCount: document.querySelectorAll('[data-readonly-info-open]').length
      };
    })()`;
    const result = await send('Runtime.evaluate', { expression, returnByValue: true });
    const report = result.result?.value || {};
    const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    await fs.writeFile(outPng, Buffer.from(screenshot.data, 'base64'));
    await fs.writeFile(outJson, JSON.stringify(report, null, 2), 'utf8');
    if (!report.pass) throw new Error(`Readonly info check failed: ${JSON.stringify(report)}`);
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
