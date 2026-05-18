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
  const outJson = path.resolve(arg('--json', 'line-status-density.json'));
  const outPng = path.resolve(arg('--png', 'line-status-density.png'));
  const width = Number(arg('--width', '1600'));
  const height = Number(arg('--height', '1200'));
  const waitMs = Number(arg('--wait', '5200'));
  const port = Number(arg('--port', String(9900 + Math.floor(Math.random() * 500))));
  const userDataDir = path.resolve(arg('--user-data-dir', path.join(process.cwd(), `_edge_line_status_density_${port}_${Date.now()}`)));

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

  const targetUrl = `${url}${url.includes('?') ? '&' : '?'}section=lineStatus&codexBust=${Date.now()}#lineStatus`;
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

    const expression = `(() => {
      const normalize = (text) => String(text || '').replace(/\\s+/g, ' ').trim();
      const section = document.querySelector('#lineStatus');
      const findCard = (title) => Array.from(section?.querySelectorAll('.card') || [])
        .find((card) => normalize(card.querySelector('.card-title')?.textContent) === title);
      const inspectCard = (title) => {
        const card = findCard(title);
        if (!card) return { title, exists: false };
        const table = card.querySelector('table.ops-compact-table');
        const rows = Array.from(table?.querySelectorAll('tbody tr') || []);
        const rowHeights = rows.map((row) => Math.round(row.getBoundingClientRect().height * 10) / 10);
        const avgRowHeight = rowHeights.length
          ? Math.round((rowHeights.reduce((sum, value) => sum + value, 0) / rowHeights.length) * 10) / 10
          : 0;
        const names = rows.map((row) => normalize(row.cells?.[2]?.textContent || row.cells?.[0]?.textContent)).filter(Boolean);
        return {
          title,
          exists: true,
          hasCompactTable: Boolean(table),
          recordCardCount: card.querySelectorAll('.record-card').length,
          rowCount: rows.length,
          headers: Array.from(table?.querySelectorAll('thead th') || []).map((th) => normalize(th.textContent)),
          rowHeights,
          avgRowHeight,
          maxRowHeight: rowHeights.length ? Math.max(...rowHeights) : 0,
          cardHeight: Math.round(card.getBoundingClientRect().height * 10) / 10,
          names
        };
      };
      const queue = inspectCard('故障优先队列');
      const roleMatrix = inspectCard('线路角色矩阵');
      const pass = Boolean(
        section &&
        queue.exists &&
        queue.hasCompactTable &&
        queue.recordCardCount === 0 &&
        queue.rowCount >= 8 &&
        queue.avgRowHeight > 0 &&
        queue.avgRowHeight <= 40 &&
        queue.cardHeight <= 360 &&
        roleMatrix.exists &&
        roleMatrix.hasCompactTable &&
        roleMatrix.recordCardCount === 0
      );
      return {
        pass,
        sectionExists: Boolean(section),
        url: location.href,
        queue,
        roleMatrix,
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
      throw new Error(`Line status density check failed: ${JSON.stringify(report)}`);
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
