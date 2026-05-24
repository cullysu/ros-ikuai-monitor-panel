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
  const outJson = path.resolve(arg('--json', 'panel-split-columns.json'));
  const outPng = path.resolve(arg('--png', 'panel-split-columns.png'));
  const width = Number(arg('--width', '1600'));
  const height = Number(arg('--height', '1200'));
  const waitMs = Number(arg('--wait', '5200'));
  const port = Number(arg('--port', String(9800 + Math.floor(Math.random() * 500))));
  const userDataDir = path.resolve(arg('--user-data-dir', path.join(process.cwd(), `_edge_split_columns_${port}_${Date.now()}`)));

  const expectedHeaders = arg('--expected-headers', '实时上行速率,实时下行速率,累计上行流量,累计下行流量')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const legacyHeaders = ['实时速率', '累计上下行', '上下行速率', '上行实时', '下行实时', '实时上 / 下', '上 / 下行实时', '累计上 / 下'];

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
      const expectedHeaders = ${JSON.stringify(expectedHeaders)};
      const legacyHeaders = ${JSON.stringify(legacyHeaders)};
      const snapshot = typeof displayedSnapshot !== 'undefined'
        ? displayedSnapshot
        : typeof latestSnapshot !== 'undefined'
          ? latestSnapshot
          : window.__PANEL_TEST_SNAPSHOT__;
      const expectedOrder = typeof getLogicalWanLines === 'function'
        ? getLogicalWanLines(snapshot).map((row) => row.name).filter(Boolean)
        : [];
      const section = document.querySelector(${JSON.stringify(`#${section}`)});
      const cardTitle = ${JSON.stringify(cardTitle)};
      const card = Array.from(section?.querySelectorAll('.card') || [])
        .find((node) => (node.querySelector('.card-title')?.textContent || '').trim().includes(cardTitle));
      if (card) card.scrollIntoView({ block: 'start', inline: 'nearest' });
      const headers = Array.from(card?.querySelectorAll('thead th') || []).map((node) => node.textContent.replace(/\\s+/g, ' ').trim());
      const recordLabels = Array.from(card?.querySelectorAll('.record-label') || []).map((node) => node.textContent.replace(/\\s+/g, ' ').trim());
      const rows = Array.from(card?.querySelectorAll('tbody tr') || []).map((row) => Array.from(row.children || []).map((cell) => cell.textContent.replace(/\\s+/g, ' ').trim()));
      const firstColumn = rows.map((row) => row[0]).filter(Boolean);
      const recordTitles = Array.from(card?.querySelectorAll('.record-title .record-value') || []).map((node) => node.textContent.replace(/\\s+/g, ' ').trim());
      const isPppoeName = (name) => /^pppoe[-_]?/i.test(name);
      const pppoeNames = firstColumn.filter(isPppoeName).length
        ? firstColumn.filter(isPppoeName)
        : recordTitles.filter(isPppoeName);
      const bodyText = card?.innerText || '';
      const rect = card?.getBoundingClientRect();
      const actualLabels = [...headers, ...recordLabels];
      const missingExpectedHeaders = expectedHeaders.filter((header) => !actualLabels.includes(header));
      const foundLegacyHeaders = legacyHeaders.filter((header) => actualLabels.includes(header));
      const rowWidthMatches = rows.length ? rows.every((row) => !headers.length || row.length === headers.length) : true;
      const pppoeOrderMatches = pppoeNames.length && expectedOrder.length
        ? expectedOrder.slice(0, pppoeNames.length).every((name, index) => pppoeNames[index] === name)
        : null;
      return {
        url: location.href,
        section,
        cardTitle,
        sectionFound: Boolean(section),
        cardFound: Boolean(card),
        actualTitle: card?.querySelector('.card-title')?.textContent.trim() || '',
        headers,
        recordLabels: Array.from(new Set(recordLabels)),
        rows: rows.slice(0, 10),
        pppoeNames,
        checks: {
          splitHeadersPresent: missingExpectedHeaders.length === 0,
          noLegacyHeaders: foundLegacyHeaders.length === 0,
          rowWidthMatches,
          pppoeOrderMatches
        },
        details: {
          missingExpectedHeaders,
          foundLegacyHeaders,
          hasRateStack: Boolean(card?.querySelector('.rate-stack')),
          hasTwoLineRateCell: Array.from(card?.querySelectorAll('.ops-two-line') || []).some((node) => /上\\s|下\\s/.test(node.textContent))
        },
        capture: rect ? {
          x: Math.max(0, Math.floor(window.scrollX + rect.left - 16)),
          y: Math.max(0, Math.floor(window.scrollY + rect.top - 16)),
          width: Math.min(${width}, Math.ceil(rect.width + 32)),
          height: Math.min(${height}, Math.ceil(rect.height + 80))
        } : null,
        textSample: bodyText.slice(0, 1600)
      };
    })()`;
    const evaluated = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (evaluated.exceptionDetails) throw new Error(JSON.stringify(evaluated.exceptionDetails));
    const data = evaluated.result?.value || {};
    await delay(300);

    const clip = data.capture || { x: 0, y: 0, width, height };
    const screenshot = await send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: true,
      clip: {
        x: clip.x,
        y: clip.y,
        width: Math.max(1, clip.width),
        height: Math.max(1, clip.height),
        scale: 1
      }
    });

    const pass = data.cardFound
      && data.checks?.splitHeadersPresent
      && data.checks?.noLegacyHeaders
      && data.checks?.rowWidthMatches
      && data.details?.hasRateStack === false
      && data.details?.hasTwoLineRateCell === false;
    data.pass = Boolean(pass);

    await fs.writeFile(outJson, JSON.stringify(data, null, 2), 'utf8');
    await fs.writeFile(outPng, Buffer.from(screenshot.data, 'base64'));
    console.log(JSON.stringify({
      pass: data.pass,
      json: outJson,
      png: outPng,
      section,
      cardTitle,
      headers: data.headers,
      checks: data.checks,
      details: data.details,
      pppoeNames: data.pppoeNames
    }, null, 2));
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
