const fs = require('fs/promises');
const nodeFs = require('fs');
const http = require('http');
const net = require('net');
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

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'text/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.png') return 'image/png';
  if (ext === '.svg') return 'image/svg+xml';
  return 'application/octet-stream';
}

function isPathInside(rootPath, candidatePath) {
  const relative = path.relative(rootPath, candidatePath);
  return relative === '' || (
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function safePublicFile(publicRoot, reqUrl) {
  const resolvedPublicRoot = path.resolve(publicRoot);
  const parsed = new URL(reqUrl, 'http://127.0.0.1');
  const raw = decodeURIComponent(parsed.pathname === '/' ? '/index.html' : parsed.pathname);
  const resolved = path.resolve(resolvedPublicRoot, `.${raw}`);
  if (!isPathInside(resolvedPublicRoot, resolved)) return null;
  if (nodeFs.existsSync(resolved) && nodeFs.statSync(resolved).isDirectory()) {
    return path.join(resolved, 'index.html');
  }
  return resolved;
}

function createStaticServer(publicRoot) {
  return http.createServer((req, res) => {
    const file = safePublicFile(publicRoot, req.url || '/');
    if (!file || !nodeFs.existsSync(file) || !nodeFs.statSync(file).isFile()) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType(file), 'Cache-Control': 'no-store' });
    nodeFs.createReadStream(file).pipe(res);
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
}

function closeServer(server) {
  if (!server) return;
  try {
    server.close();
  } catch {}
}

function findLoopbackPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = address && typeof address === 'object' ? address.port : 0;
      server.close((error) => {
        if (error) reject(error);
        else if (!port) reject(new Error('Failed to allocate a loopback port'));
        else resolve(port);
      });
    });
  });
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
      return await getJson(url);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw lastError || new Error(`Timed out waiting for ${url}`);
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, { timeout: 2000 }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      response.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`HTTP ${response.statusCode}: ${body.slice(0, 160)}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on('timeout', () => request.destroy(new Error(`Timed out fetching ${url}`)));
    request.on('error', reject);
  });
}

async function openSocket(wsUrl, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    const timer = setTimeout(() => {
      try { socket.close(); } catch {}
      reject(new Error(`Timed out opening ${wsUrl}`));
    }, timeoutMs);
    socket.onopen = () => {
      clearTimeout(timer);
      resolve(socket);
    };
    socket.onerror = () => {
      clearTimeout(timer);
      reject(new Error(`Failed to open ${wsUrl}`));
    };
  });
}

function resourceFullSnapshot() {
  const now = new Date().toISOString();
  return {
    status: 'ok',
    updatedAt: now,
    meta: {
      scaleScenario: 'resource-full',
      target: '10.0.0.1',
      routerHost: '10.0.0.1',
      pollSeconds: 5,
      realtimeUpdatedAt: now,
      slowRestUpdatedAt: now,
      staticUpdatedAt: now,
      capabilities: { restTrusted: true, sshRead: true }
    },
    overview: {
      identity: 'RouterOS',
      version: '7.15',
      boardName: 'RB5009',
      uptime: '3d 4h',
      cpuLoad: 96,
      memoryUsage: 92,
      diskUsage: 97
    },
    wan: [{ name: 'pppoe-out10', parent: 'ether1', running: true, upRate: 1200, downRate: 3400 }],
    pppoe: [{ name: 'pppoe-out10', parent: 'ether1', running: true, upRate: 1200, downRate: 3400 }],
    interfaces: [
      { name: 'ether1', type: 'ether', running: true, bridge: 'bridge-lan', txRate: 82000000, rxRate: 48000000 },
      { name: 'ether2', type: 'ether', running: true, bridge: 'bridge-lan', txRate: 42000000, rxRate: 28000000 },
      { name: 'sfp1', type: 'sfp', running: true, bridge: 'bridge-core', txRate: 120000000, rxRate: 76000000 }
    ],
    routes: { defaultRoutes: [{ table: 'main', gateway: '1.1.1.1', distance: 1, active: true, disabled: false }] },
    connections: { total: 54321, active: [{}, {}, {}, {}, {}, {}, {}, {}], topIps: [] },
    terminals: [{ name: 'client-1', ip: '192.168.88.10', status: 'online' }],
    dns: { cache: 'warm', pressure: 'high' }
  };
}

function balanceSnapshot() {
  const now = new Date().toISOString();
  return {
    status: 'ok',
    updatedAt: now,
    meta: {
      scaleScenario: 'single',
      target: '10.0.0.1',
      routerHost: '10.0.0.1',
      pollSeconds: 5,
      realtimeUpdatedAt: now,
      slowRestUpdatedAt: now,
      staticUpdatedAt: now,
      capabilities: { restTrusted: true, sshRead: true }
    },
    overview: {
      identity: 'RouterOS',
      version: '7.15',
      boardName: 'RB5009',
      uptime: '3d 4h',
      cpuLoad: 42,
      memoryUsage: 51,
      diskUsage: 31
    },
    wan: [
      { name: 'pppoe-out10', parent: 'ether1', running: true, upRate: 1200, downRate: 3400, routes: [{ active: true, disabled: false }] },
      { name: 'pppoe-out20', parent: 'ether2', running: true, upRate: 900, downRate: 2800, routes: [] }
    ],
    pppoe: [
      { name: 'pppoe-out10', parent: 'ether1', running: true, upRate: 1200, downRate: 3400 },
      { name: 'pppoe-out20', parent: 'ether2', running: true, upRate: 900, downRate: 2800 }
    ],
    interfaces: [
      { name: 'ether1', type: 'ether', running: true, bridge: 'bridge-lan', txRate: 82000000, rxRate: 48000000 },
      { name: 'ether2', type: 'ether', running: true, bridge: 'bridge-lan', txRate: 42000000, rxRate: 28000000 }
    ],
    routes: {
      defaultRoutes: [
        { table: 'main', gateway: '1.1.1.1', distance: 1, active: true, disabled: false },
        { table: 'main', gateway: '2.2.2.2', distance: 2, active: false, disabled: false }
      ]
    },
    connections: { total: 1234, active: [{}, {}], topIps: [{}] },
    terminals: [{ name: 'client-1', ip: '192.168.88.10', status: 'online' }]
  };
}

function allOfflineSnapshot() {
  const now = new Date().toISOString();
  return {
    status: 'ok',
    updatedAt: now,
    meta: {
      scaleScenario: 'all-offline',
      target: '10.0.0.1',
      routerHost: '10.0.0.1',
      pollSeconds: 5,
      realtimeUpdatedAt: now,
      slowRestUpdatedAt: now,
      staticUpdatedAt: now,
      capabilities: { restTrusted: true, sshRead: true }
    },
    overview: {
      identity: 'RouterOS',
      version: '7.15',
      boardName: 'RB5009',
      uptime: '3d 4h',
      cpuLoad: 38,
      memoryUsage: 46,
      diskUsage: 28
    },
    wan: [
      { name: 'pppoe-out10', parent: 'ether1', running: false, upRate: 0, downRate: 0, routes: [{ active: false, disabled: false }] },
      { name: 'pppoe-out20', parent: 'ether2', running: false, upRate: 0, downRate: 0, routes: [] },
      { name: 'pppoe-out30', parent: 'ether3', running: false, upRate: 0, downRate: 0, routes: [] },
      { name: 'pppoe-out40', parent: 'ether4', running: false, upRate: 0, downRate: 0, routes: [] }
    ],
    pppoe: [
      { name: 'pppoe-out10', parent: 'ether1', running: false, upRate: 0, downRate: 0 },
      { name: 'pppoe-out20', parent: 'ether2', running: false, upRate: 0, downRate: 0 },
      { name: 'pppoe-out30', parent: 'ether3', running: false, upRate: 0, downRate: 0 },
      { name: 'pppoe-out40', parent: 'ether4', running: false, upRate: 0, downRate: 0 }
    ],
    interfaces: [
      { name: 'ether1', type: 'ether', running: true, bridge: 'bridge-wan' },
      { name: 'ether2', type: 'ether', running: true, bridge: 'bridge-wan' },
      { name: 'ether3', type: 'ether', running: true, bridge: 'bridge-wan' },
      { name: 'ether4', type: 'ether', running: true, bridge: 'bridge-wan' }
    ],
    routes: {
      defaultRoutes: [
        { table: 'main', gateway: 'pppoe-out10', distance: 1, active: false, disabled: false },
        { table: 'main', gateway: 'pppoe-out20', distance: 2, active: false, disabled: false }
      ]
    },
    connections: { total: 48, active: [], topIps: [] },
    terminals: [
      { name: 'workstation-1', ip: '192.168.88.20', status: 'online' },
      { name: 'nas-1', ip: '192.168.88.30', status: 'online' }
    ]
  };
}

function interfaceDownSnapshot() {
  const snapshot = balanceSnapshot();
  snapshot.meta.scaleScenario = 'interfaces-down';
  snapshot.updatedAt = new Date().toISOString();
  snapshot.interfaces = [
    { name: 'ether1', type: 'ether', running: true, bridge: 'bridge-wan', txRate: 82000000, rxRate: 48000000 },
    { name: 'ether2', type: 'ether', running: false, bridge: 'bridge-lan', txRate: 0, rxRate: 0 },
    { name: 'sfp1', type: 'sfp', running: true, bridge: 'bridge-core', txRate: 120000000, rxRate: 76000000 }
  ];
  return snapshot;
}

function collectionDownSnapshot() {
  const snapshot = balanceSnapshot();
  const now = new Date().toISOString();
  snapshot.meta.scaleScenario = 'collection-down';
  snapshot.updatedAt = now;
  snapshot.meta.realtimeUpdatedAt = now;
  snapshot.meta.slowRestUpdatedAt = now;
  snapshot.meta.staticUpdatedAt = now;
  snapshot.meta.realtimeError = 'REST realtime unavailable';
  snapshot.meta.slowRestError = 'REST business snapshot unavailable';
  snapshot.meta.staticError = 'SSH static facts unavailable';
  snapshot.meta.connectionDetailError = 'connection detail unavailable';
  snapshot.meta.realtimeEndpointFailures = [
    { group: 'REST', name: '10.0.0.1 /rest/interface' }
  ];
  snapshot.meta.slowRestEndpointFailures = [
    { group: 'slow REST', name: '10.0.0.1 /rest/ip/route' }
  ];
  snapshot.meta.staticEndpointFailures = [
    { group: 'SSH', name: '10.0.0.1 /system/resource' }
  ];
  snapshot.meta.detailEndpointFailures = [
    { group: 'connection detail', name: '10.0.0.1 /ip/firewall/connection' }
  ];
  snapshot.meta.capabilities = { restTrusted: false, sshRead: false };
  return snapshot;
}

function noSnapshotSnapshot() {
  const now = new Date().toISOString();
  return {
    status: 'error',
    error: 'RouterOS current snapshot unavailable',
    updatedAt: now,
    meta: {
      scaleScenario: 'no-snapshot',
      target: '10.0.0.1',
      routerHost: '10.0.0.1',
      pollSeconds: 5,
      realtimeUpdatedAt: now,
      staticUpdatedAt: now,
      realtimeError: 'current snapshot unavailable',
      slowRestError: 'business snapshot unavailable',
      capabilities: { restTrusted: false, sshRead: false }
    },
    overview: {},
    wan: [],
    pppoe: [],
    interfaces: [],
    routes: { defaultRoutes: [] },
    connections: { total: 0, active: [], topIps: [] },
    terminals: []
  };
}

async function main() {
  let staticServer = null;
  let url = arg('--url', '');
  if (!url) {
    staticServer = createStaticServer(path.join(process.cwd(), 'public'));
    await listen(staticServer);
    url = `http://127.0.0.1:${staticServer.address().port}/`;
  }
  const section = arg('--section', 'loadAudit');
  const outJson = path.resolve(arg('--json', `resource-balance-${section}.json`));
  const outPng = path.resolve(arg('--png', `resource-balance-${section}.png`));
  const width = Number(arg('--width', '1528'));
  const height = Number(arg('--height', '980'));
  const waitMs = Number(arg('--wait', '6200'));
  const cdpTimeoutMs = Math.max(1000, Number(arg('--cdp-timeout', '12000')) || 12000);
  const requestedPort = arg('--port', '');
  const port = requestedPort ? Number(requestedPort) : await findLoopbackPort();
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid debugger port: ${requestedPort || port}`);
  }
  const userDataDir = path.resolve(arg('--user-data-dir', path.join(process.cwd(), `_edge_resource_${section}_${port}_${Date.now()}`)));

  const winBrowserCandidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  ];
  const macBrowserCandidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
  ];
  const linuxBrowserCandidates = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge'
  ];
  const browserCandidates = process.platform === 'win32'
    ? winBrowserCandidates
    : process.platform === 'darwin'
      ? macBrowserCandidates
      : linuxBrowserCandidates;
  const requestedBrowserPath = arg('--browser', process.env.CODEX_BROWSER_PATH || '');
  if (requestedBrowserPath && !(await exists(requestedBrowserPath))) {
    throw new Error(`Requested browser executable not found: ${requestedBrowserPath}`);
  }
  const browserPath = requestedBrowserPath || (await Promise.all(browserCandidates.map(async (item) => [item, await exists(item)]))).find(([, ok]) => ok)?.[0];
  if (!browserPath) throw new Error('Edge/Chrome executable not found');

  await fs.mkdir(path.dirname(outJson), { recursive: true });
  await fs.mkdir(pß}7ÚÚ$z{-®éÜj×ed = Boolean(
          surfaceAttrs.list &&
          surfaceAttrs.headers === 1 &&
          surfaceAttrs.detailControl &&
          surfaceAttrs.detailRows > 0 &&
          firstScreenOrderProductized
        );
        const statusCoreBlocks = Array.from(surface?.querySelectorAll('[data-row-id]') || []).map((row) => ({
          id: row.getAttribute('data-row-id') || '',
          coreBlock: row.getAttribute('data-overview-mobile-core-block') || ''
        }));
        const coreBlockById = Object.fromEntries(statusCoreBlocks.map((row) => [row.id, row.coreBlock]));
        const statusCoreBlocksModelBacked = Boolean(
          (!coreBlockById['timeline-wan'] || coreBlockById['timeline-wan'] === 'wan') &&
          (!coreBlockById['timeline-collection'] || coreBlockById['timeline-collection'] === 'collection') &&
          (!coreBlockById['timeline-resource'] || coreBlockById['timeline-resource'] === 'resource')
        );
        const pass = Boolean(
          root &&
          screen &&
          surface &&
          hero &&
          heroHeadlineVisible &&
          deviceHeaderVisible &&
          !deviceHeaderUsesVerdict &&
          deviceStatusVisible &&
          buildTimeMobileCss &&
          mobileTokensApplied &&
          nativeTrustSpinePolished &&
          metricGridProductized &&
          mobileGroupedSurfaceLowBorder &&
          incidentTelemetryProductized &&
          noSnapshotTelemetryTruthful &&
          normalNativeFirstScreen &&
          collectionTrustRailFixed &&
          collectionTrustSeparatedFromImpact &&
          hasProductChartRail &&
          hasNativeChartLayout &&
          productChartProductized &&
          modelBackedChartPlot &&
          judgementLabelNoEllipsis &&
          bottomTabsQuiet &&
          routerBottomTabsProductized &&
          routerStatusHeaderProductized &&
          appRhythmPolished &&
          surfacePolicyModelBacked &&
          statusCoreBlocksModelBacked &&
          primaryListEvidenceStandardized &&
          resourceTrackNoiseLow &&
          resourceVisualModelBacked &&
          wanPortEvidenceDeferred &&
          channelRailModelBacked &&
          abnormalDecisionRailProductized &&
          abnormalHeroLayoutStable &&
          appViewportBounded &&
          abnormalViewportOverflowFree &&
          (expectedConfig.mode === 'normal'
            ? !firstScreenText.includes('æ­£å¸¸çŠ¶æ€æ€»è§ˆ')
            : expectedConfig.mode === 'p0'
            ? abnormalDecisionRailProductized
            : true) &&
          (expectedConfig.mode === 'normal'
            ? !terminalRankingCopyVisible && (evidenceDeferred ? visibleTerminalRows.length === 0 : (visibleTerminalRows.length >= 1 && visibleTerminalRows.length <= 3))
            : !terminalRankingCopyVisible && (evidenceDeferred ? visibleTerminalRows.length === 0 : visibleTerminalRows.length >= 1)) &&
          !styleTextLeakedIntoOverview &&
          missing.length === 0 &&
          !hasHorizontalOverflow
        );
        return {
          pass,
          section: sectionName,
          url: location.href,
          missing,
          mobileStyleStack,
          rootAttrs,
          deviceHeader: {
            title: deviceTitleText,
            visible: deviceHeaderVisible,
            usesVerdict: deviceHeaderUsesVerdict,
            statusVisible: deviceStatusVisible,
            rect: deviceTitleRect ? {
              top: deviceTitleRect.top,
              bottom: deviceTitleRect.bottom,
              height: deviceTitleRect.height,
            } : null,
          },
          mobileTokensApplied,
          mobileTokenValues,
          surfaceAttrs,
          heroAttrs,
          expectedConfig,
          impactLineAttrs,
          listText: normalize(list?.textContent || '').slice(0, 240),
          terminalListMounted: Boolean(terminalList),
          terminalRowCount: terminalRows.length,
          visibleTerminalRowCount: visibleTerminalRows.length,
          evidenceDeferred,
          detailEntryVisible,
          terminalRankingCopyVisible,
          styleTextLeakedIntoOverview,
          hasHorizontalOverflow,
          hasProductChartRail,
          hasNativeChartLayout,
          productChartProductized,
          modelBackedChartPlot,
          productChartDecision,
          productChartAnomaly,
          chartRailFullWidth,
          chartRailNotSideBubble,
          chartReadoutLabelsVisible,
          chartDecisionLayoutProductized,
          chartReadoutColumnCount,
          chartReadoutRowCount,
          chartReadoutCellHeights,
          chartReadoutCellPositions: chartReadoutCellRects.map((rect) => ({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom })),
          chartRailComputedColumns: chartRailStyle?.gridTemplateColumns || '',
          chartRailComputedRows: chartRailStyle?.gridTemplateRows || '',
          chartRailWithinHero,
          heroHeadlineVisible,
          heroHeadlineRect: heroHeadlineRect ? { left: heroHeadlineRect.left, top: heroHeadlineRect.top, right: heroHeadlineRect.right, bottom: heroHeadlineRect.bottom, width: heroHeadlineRect.width, height: heroHeadlineRect.height } : null,
          chartRailRect: chartRailRect ? { left: chartRailRect.left, top: chartRailRect.top, right: chartRailRect.right, bottom: chartRailRect.bottom, width: chartRailRect.width, height: chartRailRect.height } : null,
          heroRect: heroRect ? { left: heroRect.left, top: heroRect.top, right: heroRect.right, bottom: heroRect.bottom, width: heroRect.width, height: heroRect.height } : null,
          chartRailClassName: chartRail?.className || '',
          lineChartHeight: lineChartRect?.height || 0,
          chartSeriesLegendText,
          chartSeriesPaintProductized,
          chartSeriesPaint: {
            download: { stroke: downloadLineStyle?.stroke || '', fill: downloadLineStyle?.fill || '' },
            upload: { stroke: uploadLineStyle?.stroke || '', fill: uploadLineStyle?.fill || '' },
          },
          hasReferenceChartContract,
          visibleChartRailLabelCount: visibleChartRailLabels.length,
          visibleChartRailLabelText,
          judgementLabelNoEllipsis,
          bottomTabsQuiet,
          routerBottomTabsProductized,
          routerTabItems: routerTabItems.length,
          routerTabIds,
          routerTabTargets,
          routerTabLabels,
          routerTabTouchTargetsOk,
          routerTabActiveNeutral,
          routerStatusHeaderProductized,
          statusHeaderFlatAndSeparated,
          statusHeaderActionLabel,
          appRhythmPolished,
          surfacePolicyModelBacked,
          statusCoreBlocksModelBacked,
          statusCoreBlocks,
          primaryListEvidenceStandardized,
          listEvidence,
          nativeTrustSpinePolished,
          metricGridProductized,
          noSnapshotMetricsDeferred,
          mobileGroupedSurfaceLowBorder,
          incidentTelemetryProductized,
          resourceLandscapeTelemetryDeferred,
          noSnapshotTelemetryTruthful,
          incidentTelemetryFacts,
          incidentTelemetryStyle: incidentTelemetryStyle ? {
            display: incidentTelemetryStyle.display,
            gridTemplateColumns: incidentTelemetryStyle.gridTemplateColumns,
            gridTemplateRows: incidentTelemetryStyle.gridTemplateRows,
            height: incidentTelemetryStyle.height,
          } : null,
          groupedSurfaceNoise: groupedSurfaceStyles.map((style) => ({
            backgroundColor: style.backgroundColor,
            borderTopWidth: style.borderTopWidth,
            borderRightWidth: style.borderRightWidth,
            borderBottomWidth: style.borderBottomWidth,
            borderLeftWidth: style.borderLeftWidth,
            boxShadow: style.boxShadow
          })),
          groupedSeparatorNoise: groupedSeparatorStyles.slice(0, 6).map((style) => ({
            backgroundColor: style.backgroundColor,
            borderTopWidth: style.borderTopWidth,
            borderRightWidth: style.borderRightWidth,
            borderBottomWidth: style.borderBottomWidth,
            borderLeftWidth: style.borderLeftWidth,
            boxShadow: style.boxShadow
          })),
          normalNativeFirstScreen,
          normalSummaryLabels,
          normalSummaryCellIds,
          normalChartLabelText: normalize(normalChartLabel?.textContent || ''),
          normalHeroHeadlineDisplay: normalHeroHeadlineStyle?.display || '',
          collectionTrustRailFixed,
          collectionTrustSeparatedFromImpact,
          collectionTrustLabels,
          metricLabels,
          metricGridStyle: metricGridStyle ? {
            display: metricGridStyle.display,
            gridTemplateColumns: metricGridStyle.gridTemplateColumns,
            borderTopWidth: metricGridStyle.borderTopWidth,
            boxShadow: metricGridStyle.boxShadow
          } : null,
          resourceTrackNoiseLow,
          resourceVisualModelBacked,
          resourceTrackFills,
          wanPortEvidenceDeferred,
          channelRailModelBacked,
          wanPortCellCount: wanPortCells.length,
          wanPortCellNoise,
          abnormalDecisionRailProductized,
          abnormalActionTouchTargetOk,
          abnormalHeroLayoutStable,
          abnormalViewportOverflowFree,
          abnormalComputedSizing: {
            heroMinHeight: heroStyle?.minHeight || '',
            heroHeight: heroStyle?.height || '',
            heroMaxHeight: heroStyle?.maxHeight || '',
            railMinHeight: abnormalDecisionRailStyle?.minHeight || '',
            railHeight: abnormalDecisionRailStyle?.height || '',
            listRows: abnormalListRowStyles
          },
          abnormalDecisionRailRect: abnormalDecisionRailRect ? {
            left: abnormalDecisionRailRect.left,
            top: abnormalDecisionRailRect.top,
            right: abnormalDecisionRailRect.right,
            bottom: abnormalDecisionRailRect.bottom,
            width: abnormalDecisionRailRect.width,
            height: abnormalDecisionRailRect.height
          } : null,
          abnormalListRowRects: abnormalListRowRects.map((rect) => ({
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height
          })),
          abnormalDecisionLabels,
          abnormalDecisionValues,
          abnormalDecisionCellNoise,
          appRhythmStyles: {
            heroBorderTopWidth: heroStyle?.borderTopWidth || '',
            heroBorderRadius: heroStyle?.borderRadius || '',
            heroBackgroundColor: heroStyle?.backgroundColor || '',
            heroBackdropFilter: heroStyle?.backdropFilter || '',
            heroBoxShadow: heroStyle?.boxShadow || '',
            surfaceBackgroundColor: surfaceStyle?.backgroundColor || '',
            surfaceBorderTopWidth: surfaceStyle?.borderTopWidth || '',
            surfaceBorderRadius: surfaceStyle?.borderRadius || '',
            surfaceBackdropFilter: surfaceStyle?.backdropFilter || '',
            judgementBorderTopWidth: judgementStyle?.borderTopWidth || '',
            trustStripBorderTopWidth: trustStripStyle?.borderTopWidth || '',
            listBorderTopWidth: listStyle?.borderTopWidth || '',
            listBoxShadow: listStyle?.boxShadow || '',
            bottomTabsBackgroundColor: bottomTabsStyle?.backgroundColor || '',
            activeTabBackgroundColor: activeTabStyle?.backgroundColor || '',
            activeTabBoxShadow: activeTabStyle?.boxShadow || '',
            activeTabLowNoise
          },
          bottomTabsStyle: bottomTabsStyle ? {
            borderTopWidth: bottomTabsStyle.borderTopWidth,
            borderTopStyle: bottomTabsStyle.borderTopStyle,
            borderTopColor: bottomTabsStyle.borderTopColor,
            boxShadow: bottomTabsStyle.boxShadow
          } : null,
          appViewportBounded,
          documentScrollHeight: document.documentElement.scrollHeight,
          appHeight: appRect ? appRect.height : 0,
          screenHeight: screenRect ? screenRect.height : 0,
          screenScrollHeight: screen ? screen.scrollHeight : 0,
          screenClientHeight: screen ? screen.clientHeight : 0,
          trendColumns,
          wideNodes,
          viewport: { width: innerWidth, height: innerHeight, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth },
          scrollHeight: document.documentElement.scrollHeight,
          textExcerpt: firstScreenText.slice(0, 700)
        };
      }
      return { pass: false, section: sectionName, error: 'unsupported section' };
    })()`;

    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) {
      const detail = result.exceptionDetails;
      const exceptionText = [
        detail.text,
        detail.exception?.description,
        detail.exception?.value
      ].filter(Boolean).join('\n');
      throw new Error(`Resource/balance runtime evaluation failed: ${exceptionText || JSON.stringify(detail)}`);
    }
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
    closeServer(staticServer);
  }
}

function isTransientRuntimeError(error) {
  const message = String(error?.stack || error?.message || error || '');
  return /ECONNREFUSED|ECONNRESET|Page websocket URL missing|Failed to open ws:|Timed out opening ws:|Browser exited before debugger|CDP socket|CDP command timed out|chrome-error:\/\/chromewebdata|fetch failed/i.test(message);
}

async function runWithRetries() {
  const attempts = Math.max(
    1,
    Number(arg('--runtime-retries', process.env.CODEX_RESOURCE_RUNTIME_RETRIES || '3')) || 3
  );
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await main();
      return;
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isTransientRuntimeError(error)) {
        throw error;
      }
      console.warn(`[resource-balance] transient runtime retry ${attempt + 1}/${attempts}: ${error.message || error}`);
      await delay(1200 + attempt * 650);
    }
  }
  throw lastError;
}

runWithRetries().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
