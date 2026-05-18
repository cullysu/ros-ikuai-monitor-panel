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
  const section = arg('--section', 'interfaces');
  const outJson = path.resolve(arg('--json', 'fixed-sidebars.json'));
  const outPng = path.resolve(arg('--png', 'fixed-sidebars.png'));
  const width = Number(arg('--width', '1600'));
  const height = Number(arg('--height', '1000'));
  const scrollY = Number(arg('--scroll-y', '720'));
  const waitMs = Number(arg('--wait', '5200'));
  const port = Number(arg('--port', String(9900 + Math.floor(Math.random() * 500))));
  const userDataDir = path.resolve(arg('--user-data-dir', path.join(process.cwd(), `_edge_fixed_sidebars_${port}_${Date.now()}`)));

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

    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const message = { id: ++id, method, params };
      pending.set(message.id, { resolve, reject, method });
      socket.send(JSON.stringify(message));
    });

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await delay(waitMs);
    await send('Runtime.evaluate', { expression: `window.scrollTo(0, ${scrollY});`, awaitPromise: true });
    await delay(600);

    const expression = `(() => {
      const rectOf = (selector) => {
        const node = document.querySelector(selector);
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return {
          selector,
          position: style.position,
          display: style.display,
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          bottom: Math.round(rect.bottom),
          text: node.innerText.replace(/\\s+/g, ' ').trim().slice(0, 120)
        };
      };
      const rail = rectOf('.ik-rail');
      const sidebar = rectOf('.sidebar');
      const frame = rectOf('.frame');
      const pass = Boolean(
        rail && sidebar && frame
        && rail.position === 'fixed'
        && sidebar.position === 'fixed'
        && Math.abs(rail.top) <= 1
        && Math.abs(sidebar.top) <= 1
        && rail.left === 0
        && sidebar.left >= 50
        && frame.left >= 190
      );
      return {
        url: location.href,
        scrollY: Math.round(window.scrollY),
        rail,
        sidebar,
        frame,
        pass
      };
    })()`;
    const evaluated = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (evaluated.exceptionDetails) throw new Error(JSON.stringify(evaluated.exceptionDetails));
    const data = evaluated.result?.value || {};

    const screenshot = await send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: false
    });

    await fs.writeFile(outJson, JSON.stringify(data, null, 2), 'utf8');
    await fs.writeFile(outPng, Buffer.from(screenshot.data, 'base64'));
    console.log(JSON.stringify({ pass: data.pass, json: outJson, png: outPng, scrollY: data.scrollY, rail: data.rail, sidebar: data.sidebar, frame: data.frame }, null, 2));
    if (!data.pass) process.exitCode = 2;
  } finally {
    if (socket) socket.close();
    if (browser && !browser.killed) browser.kill('SIGKILL');
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
