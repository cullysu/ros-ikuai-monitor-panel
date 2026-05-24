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
  const cardTitle = arg('--card-title', '宽带实时流量');
  const outJson = path.resolve(arg('--json', 'panel-pppoe-order.json'));
  const outPng = path.resolve(arg('--png', 'panel-pppoe-order.png'));
  const width = Number(arg('--width', '1600'));
  const height = Number(arg('--height', '1200'));
  const waitMs = Number(arg('--wait', '5200'));
  const port = Number(arg('--port', String(9400 + Math.floor(Math.random() * 400))));
  const userDataDir = path.resolve(arg('--user-data-dir', path.join(process.cwd(), `_edge_pppoe_order_${port}_${Date.now()}`)));

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

    const expression = `(() => {
      const snapshot = typeof displayedSnapshot !== 'undefined'
        ? displayedSnapshot
        : typeof latestSnapshot !== 'undefined'
          ? latestSnapshot
          : window.__PANEL_TEST_SNAPSHOT__;
      const expectedOrder = typeof getLogicalWanLines === 'function'
        ? getLogicalWanLines(snapshot).map((row) => row.name).filter(Boolean)
        : [];
      const isPppoeName = (name) => /^pppoe[-_]?/i.test(name);
      const section = document.querySelector(${JSON.stringify(`#${section}`)});
      const titleText = ${JSON.stringify(cardTitle)};
      const card = Array.from(section?.querySelectorAll('.card') || [])
        .find((node) => (node.querySelector('.card-title')?.textContent || '').trim().includes(titleText));
      const tableNames = Array.from(card?.querySelectorAll('.ops-table tbody tr td:first-child, .record-card .record-title .record-value') || [])
        .map((node) => node.textContent.trim())
        .filter(isPppoeName);
      const lineBarNames = Array.from(card?.querySelectorAll('.line-bar .line-name') || [])
        .map((node) => node.textContent.trim())
        .filter(isPppoeName);
      const chartNames = Array.from(card?.querySelectorAll('.chart-label span:first-child') || [])
        .map((node) => node.textContent.trim())
        .filter(isPppoeName);
      const names = tableNames.length ? tableNames : lineBarNames.length ? lineBarNames : chartNames;
      const rows = Array.from(card?.querySelectorAll('tbody tr, .record-card, .line-bar') || []).slice(0, 12).map((node) => node.textContent.replace(/\\s+/g, ' ').trim());
      const rateRows = Array.from(card?.querySelectorAll('.rate-row, .ops-inline-dual') || []).slice(0, 16).map((row) => {
        const children = Array.from(row.children || []);
        return {
          text: row.textContent.replace(/\\s+/g, ' ').trim(),
          colors: children.map((child) => getComputedStyle(child).color),
          weights: children.map((child) => getComputedStyle(child).fontWeight)
        };
      });
      const orderMatches = names.length && expectedOrder.length
        ? expectedOrder.slice(0, names.length).every((name, index) => names[index] === name)
        : null;
      const colorGroupsUnified = rateRows.every((row) => row.colors.length < 2 || row.colors.every((color) => color === row.colors[0]));
      return {
        url: location.href,
        sectionFound: Boolean(section),
        cardTitle: card?.querySelector('.card-title')?.textContent.trim() || '',
        names,
        rows,
        rateRows,
        checks: {
          orderMatches,
          colorGroupsUnified
        },
        sourceMarkers: {
          opsFixedOrder: document.documentElement.innerHTML.includes('OPS_FIXED_PPPOE_LINE_ORDER'),
          sortFn: document.documentElement.innerHTML.includes('opsSortPppoeNamedRows'),
          mainSortFn: document.documentElement.innerHTML.includes('sortPppoeNamedRows')
        },
        textSample: section ? section.innerText.slice(0, 1500) : document.body.innerText.slice(0, 1500)
      };
    })()`;
    const evaluated = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (evaluated.exceptionDetails) throw new Error(JSON.stringify(evaluated.exceptionDetails));
    const data = evaluated.result?.value || {};
    const metrics = await send('Page.getLayoutMetrics');
    const contentSize = metrics.cssContentSize || { width, height };
    const screenshot = await send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: true,
      clip: {
        x: 0,
        y: 0,
        width: Math.min(Math.ceil(contentSize.width || width), width),
        height: Math.min(Math.ceil(contentSize.height || height), 1800),
        scale: 1
      }
    });

    await fs.writeFile(outJson, JSON.stringify(data, null, 2), 'utf8');
    await fs.writeFile(outPng, Buffer.from(screenshot.data, 'base64'));
    console.log(JSON.stringify({ json: outJson, png: outPng, cardTitle: data.cardTitle, names: data.names, checks: data.checks, sourceMarkers: data.sourceMarkers }, null, 2));
  } finally {
    if (socket) socket.close();
    if (browser && !browser.killed) browser.kill('SIGKILL');
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
