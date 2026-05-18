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
  const outJson = path.resolve(arg('--json', 'trafficload-order.json'));
  const outPng = path.resolve(arg('--png', 'trafficload-order.png'));
  const width = Number(arg('--width', '1600'));
  const height = Number(arg('--height', '1200'));
  const waitMs = Number(arg('--wait', '4200'));
  const port = Number(arg('--port', String(9300 + Math.floor(Math.random() * 400))));
  const userDataDir = path.resolve(arg('--user-data-dir', path.join(process.cwd(), `_edge_trafficload_${port}_${Date.now()}`)));

  const edgeCandidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  ];
  const browserPath = (await Promise.all(edgeCandidates.map(async (item) => [item, await exists(item)]))).find(([, ok]) => ok)?.[0];
  if (!browserPath) throw new Error('Edge/Chrome executable not found');

  await fs.mkdir(path.dirname(outJson), { recursive: true });
  await fs.mkdir(path.dirname(outPng), { recursive: true });
  await fs.mkdir(userDataDir, { recursive: true });

  const targetUrl = `${url}${url.includes('?') ? '&' : '?'}section=trafficLoad&codexBust=${Date.now()}#trafficLoad`;
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
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false
    });
    await delay(waitMs);

    const expression = `(() => {
      const expectedOrder = ['pppoe-out10','pppoe-out20','pppoe-out30','pppoe-out40','pppoe-out50','pppoe-out60','pppoe-out70','pppoe-out80'];
      const section = document.querySelector('#trafficLoad');
      const cardByTitle = (title) => Array.from(section?.querySelectorAll('.card') || [])
        .find((card) => (card.querySelector('.card-title')?.textContent || '').trim().includes(title));
      const namesFromChartLabels = (card) => Array.from(card?.querySelectorAll('.chart-label span:first-child') || [])
        .map((node) => node.textContent.trim())
        .filter(Boolean);
      const namesFromLineBars = (card) => Array.from(card?.querySelectorAll('.line-bar .line-name') || [])
        .map((node) => node.textContent.trim())
        .filter(Boolean);
      const lineShareCard = cardByTitle('线路负载占比');
      const broadbandCard = cardByTitle('宽带实时负载');
      const trendCard = cardByTitle('8 条线路速率趋势');
      const lineShareNames = namesFromLineBars(lineShareCard).length ? namesFromLineBars(lineShareCard) : namesFromChartLabels(lineShareCard);
      const broadbandNames = Array.from(broadbandCard?.querySelectorAll('.record-card .record-title .record-value') || [])
        .map((node) => node.textContent.trim())
        .filter(Boolean);
      const trendNames = namesFromChartLabels(trendCard);
      const rateRows = Array.from(document.querySelectorAll('.rate-row')).slice(0, 12).map((row) => {
        const label = row.querySelector('.rate-label');
        const value = row.querySelector('.rate-value');
        return {
          text: row.textContent.trim(),
          rowColor: getComputedStyle(row).color,
          labelColor: label ? getComputedStyle(label).color : null,
          valueColor: value ? getComputedStyle(value).color : null,
          labelWeight: label ? getComputedStyle(label).fontWeight : null,
          valueWeight: value ? getComputedStyle(value).fontWeight : null
        };
      });
      const colorsMatch = rateRows.every((row) => !row.labelColor || !row.valueColor || row.labelColor === row.valueColor);
      const orderMatches = (items) => expectedOrder.every((name, index) => items[index] === name);
      return {
        url: location.href,
        sectionFound: Boolean(section),
        pageTitle: document.querySelector('.page-title')?.textContent.trim() || '',
        lineShareNames,
        broadbandNames,
        trendNames,
        rateRows,
        checks: {
          lineShareOrder: orderMatches(lineShareNames),
          broadbandOrder: orderMatches(broadbandNames),
          trendOrder: orderMatches(trendNames),
          rateColorsUnified: colorsMatch
        },
        sourceMarkers: {
          fixedOrder: document.documentElement.innerHTML.includes('FIXED_PPPOE_LINE_ORDER'),
          sortFn: document.documentElement.innerHTML.includes('sortPppoeNamedRows'),
          unifiedRateCss: document.documentElement.innerHTML.includes('.rate-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; color: var(--text-soft); }')
        },
        textSample: section ? section.innerText.slice(0, 1500) : document.body.innerText.slice(0, 1500)
      };
    })()`;
    const evaluated = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (evaluated.exceptionDetails) {
      throw new Error(JSON.stringify(evaluated.exceptionDetails));
    }
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
    console.log(JSON.stringify({ json: outJson, png: outPng, checks: data.checks, lineShareNames: data.lineShareNames, broadbandNames: data.broadbandNames, trendNames: data.trendNames, sourceMarkers: data.sourceMarkers }, null, 2));
  } finally {
    if (socket) socket.close();
    if (browser && !browser.killed) browser.kill('SIGKILL');
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
