#!/usr/bin/env node
'use strict';

// Production-bundle contract for the three desktop route supplements. Mobile Reference
// owns an intentionally independent route tree and is covered by its model, architecture,
// runtime and deep-interaction gates. This contract must not resurrect retired mobile
// supplement owners merely to reuse desktop selectors.

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { startMock, browserExecutable } = require('./check-panel-runtime-browser');
const { login } = require('./acceptance/accessibility-v2/runtime');
const { runBrowserLifecycle } = require('./acceptance/browser-lifecycle-v2/browser-lifecycle');

const root = path.resolve(__dirname, '..');
const publicIndex = path.join(root, 'public', 'index.html');
const screenshotRoot = process.env.SUPPLEMENTAL_SCREENSHOT_DIR
  ? path.resolve(root, process.env.SUPPLEMENTAL_SCREENSHOT_DIR)
  : null;
const suiteTimeoutMs = screenshotRoot ? 110_000 : 70_000;
const stepTimeoutMs = screenshotRoot ? 80_000 : 38_000;
const cleanupTimeoutMs = 6_000;
const capturedScreenshots = [];
const viewports = [
  { name: 'desktop1366', width: 1366, height: 768, workspace: 'desktop' },
  { name: 'desktop1440', width: 1440, height: 900, workspace: 'desktop' },
];

function assert(condition, message, detail) {
  if (!condition) throw new Error(`${message}: ${JSON.stringify(detail || {})}`);
}

async function captureViewport(page, viewport, state) {
  if (!screenshotRoot) return;
  const file = `${viewport.name}-${state}.png`;
  const output = path.join(screenshotRoot, file);
  await page.screenshot({ path: output, fullPage: false, animations: 'disabled' });
  const bytes = fs.readFileSync(output);
  capturedScreenshots.push({
    file,
    state,
    surface: viewport.workspace,
    width: viewport.width,
    height: viewport.height,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
}

function routeUrl(baseUrl, route) {
  const url = new URL(baseUrl);
  url.searchParams.set('section', route);
  url.hash = '';
  return url.toString();
}

function now(offsetMs = 0) {
  return new Date(Date.now() + offsetMs).toISOString();
}

function envelope(kind, options = {}) {
  return {
    schemaVersion: 1,
    kind,
    readOnly: true,
    generatedAt: now(),
    observedAt: options.observedAt === undefined ? now() : options.observedAt,
    evidenceMode: options.evidenceMode || 'current',
    source: options.source || 'rest-live',
    sourceStatus: options.sourceStatus || 'ok',
    coverage: options.coverage || 'page',
  };
}

function connectionBody(options = {}) {
  const rows = [
    { srcIp: '192.0.2.42', dstIp: '1.1.1.1', protocol: 'tcp', timeout: '00:00:18', origRateBps: null, replRateBps: 0 },
    { srcIp: '192.0.2.42', dstIp: '8.8.8.8', protocol: 'udp', timeout: '00:00:04', origRateBps: 125000, replRateBps: 64000 },
    { srcIp: '203.0.113.17', dstIp: '192.0.2.42', protocol: 'tcp', timeout: '00:01:12', origRateBps: 84000, replRateBps: 320000 },
    { srcIp: '192.0.2.42', dstIp: '9.9.9.9', protocol: 'udp', timeout: '00:00:21', origRateBps: 4200, replRateBps: 0 },
    { srcIp: '192.0.2.42', dstIp: '2001:4860:4860::8888', protocol: 'udp', timeout: '00:00:09', origRateBps: 1800, replRateBps: 900 },
    { srcIp: '198.51.100.24', dstIp: '192.0.2.42', protocol: 'tcp', timeout: '00:02:03', origRateBps: 45000, replRateBps: 17000 },
  ].slice(0, screenshotRoot ? 6 : 2);
  return {
    ...envelope('connection-search', { source: 'routeros-ssh', coverage: 'bounded-sample', ...options }),
    targetIp: '192.0.2.42',
    sourceIp: null,
    limit: 40,
    query: { targetIp: '192.0.2.42', sourceIp: null },
    page: { requestedLimit: 40, returnedCount: rows.length, maxLimit: 50 },
    matchCount: rows.length,
    transport: 'ssh',
    capture: {
      complete: false,
      capturedBytes: 4096,
      firstOutputSeconds: 0.03,
      truncatedByRows: true,
      truncatedByBytes: false,
      timedOut: false,
      incompleteTransport: false,
      truncatedByLimit: true,
    },
    rows,
  };
}

function dnsBody(offset, options = {}) {
  const revision = 'd'.repeat(64);
  const cachedPage = offset === 50;
  const pageRows = cachedPage
    ? [{ name: 'vpn.example', type: 'A', value: '192.0.2.10', ttl: '10m', comment: '', disabled: false }]
    : Array.from({ length: screenshotRoot ? 50 : 2 }, (_, index) => ({
      name: index === 0 ? 'nas.example' : index === 1 ? 'old.example' : `node-${String(index + 1).padStart(2, '0')}.lan`,
      type: index % 7 === 0 ? 'AAAA' : 'A',
      value: index % 7 === 0 ? `2001:db8::${index + 1}` : `192.0.2.${index + 8}`,
      ttl: index % 3 === 0 ? '5m' : index % 3 === 1 ? '30m' : '1h',
      comment: index === 1 ? 'legacy' : '',
      disabled: index === 1,
    }));
  return {
    ...envelope('dns-static', {
      coverage: 'page',
      evidenceMode: cachedPage ? 'historical' : 'current',
      source: cachedPage ? 'rest-cache' : 'rest-live',
      sourceStatus: cachedPage ? 'degraded' : 'ok',
      ...options,
    }),
    revision,
    offset,
    limit: 50,
    totalCount: 51,
    visibleRuleCount: pageRows.length,
    page: {
      offset,
      pageSize: 50,
      returnedCount: pageRows.length,
      totalCount: 51,
      revision,
      maxPageSize: 50,
      maxVisibleRows: 1000,
      maxVisiblePages: 20,
    },
    rows: pageRows,
  };
}

function healthBody(options = {}) {
  const sourceUpdatedAt = options.observedAt === undefined ? now() : options.observedAt;
  return {
    ...envelope('health-findings', { coverage: 'bounded-sample', source: 'snapshot-health-analysis', observedAt: sourceUpdatedAt, ...options }),
    status: 'critical',
    sourceUpdatedAt,
    limit: 20,
    counts: { critical: 1, warning: 0, info: 0 },
    findings: [{
      id: 'system.resource_pressure',
      severity: 'critical',
      domain: 'resources',
      title: '路由器资源压力偏高',
      summary: 'CPU 已超过告警阈值。',
      source: 'collector-health-v1',
      priority: 1,
      evidence: [{ label: 'CPU', value: '96%' }],
    }],
    guardrails: { routerosWrites: false, usesCachedSnapshot: true, mutatingEndpoints: false },
  };
}

function workspaceSelector(viewport, route) {
  return viewport.workspace === 'mobile'
    ? `[data-panel-route-content="${route}"].mop-route`
    : `[data-desktop-domain-workspace="${route}"]`;
}

function baseRowSelector(viewport) {
  return viewport.workspace === 'mobile'
    ? '.mop-route-group li > button[id^="mop-row-"]'
    : '[data-desktop-row-id]';
}

async function openRoute(page, baseUrl, viewport, route) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.evaluate(() => {
    const current = window.history.state;
    if (!current || typeof current !== 'object' || !Object.prototype.hasOwnProperty.call(current, 'panelRouteSupplement')) return;
    const next = { ...current };
    delete next.panelRouteSupplement;
    window.history.replaceState(next, '', window.location.href);
  });
  await page.goto(routeUrl(baseUrl, route), { waitUntil: 'domcontentloaded' });
  await page.locator(workspaceSelector(viewport, route)).waitFor();
}

async function baseRows(page, viewport, route) {
  return page.locator(`${workspaceSelector(viewport, route)} ${baseRowSelector(viewport)}`)
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-desktop-row-id') || (node.id || '').replace(/^mop-row-/, '')).filter(Boolean));
}

async function supplementSnapshot(page, kind) {
  return page.locator(`[data-supplemental-surface="${kind}"]`).evaluate((node) => ({
    state: node.getAttribute('data-supplemental-state'),
    request: node.getAttribute('data-supplemental-request'),
    evidence: node.getAttribute('data-supplemental-evidence'),
    source: node.getAttribute('data-supplemental-source'),
    coverage: node.getAttribute('data-supplemental-coverage'),
    observedAt: node.getAttribute('data-supplemental-observed-at'),
    target: node.getAttribute('data-supplemental-target'),
    offset: node.getAttribute('data-supplemental-offset'),
    pageSize: node.getAttribute('data-supplemental-page-size'),
    total: node.getAttribute('data-supplemental-total'),
    errorCode: node.getAttribute('data-supplemental-error-code'),
    retryAfter: node.getAttribute('data-supplemental-retry-after'),
    text: node.textContent || '',
  }));
}

async function waitForSupplement(page, kind, expected) {
  const selector = `[data-supplemental-surface="${kind}"]`;
  await page.waitForFunction(({ selector: target, expectedState }) => {
    const node = document.querySelector(target);
    return Boolean(node) && Object.entries(expectedState).every(([name, value]) => node.getAttribute(`data-supplemental-${name}`) === value);
  }, { selector, expectedState: expected });
  return supplementSnapshot(page, kind);
}

async function assertFocusedAndVisible(page, selector, message, detail = {}) {
  await page.waitForFunction((target) => document.activeElement?.matches(target) === true, selector);
  const focus = await page.evaluate((target) => {
    const node = document.activeElement;
    if (!(node instanceof HTMLElement)) return { matches: false, visible: false, tag: null };
    const rect = node.getBoundingClientRect();
    return {
      matches: node.matches(target),
      visible: rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0
        && rect.top < window.innerHeight && rect.left < window.innerWidth,
      tag: node.tagName,
      rowId: node.getAttribute('data-supplemental-row-id'),
      label: node.getAttribute('aria-label'),
    };
  }, selector);
  assert(focus.matches && focus.visible, message, { ...detail, focus });
}

async function assertSnapshotRowsPreserved(page, viewport, route, original) {
  const current = await baseRows(page, viewport, route);
  assert(original.length > 0 && original.every((id) => current.includes(id)), '补充证据覆盖或清空了原始快照对象行', { route, original, current });
}

async function runConnectionContract(page, mock, baseUrl, viewport) {
  mock.state.supplemental.requests.length = 0;
  mock.state.supplemental.connectionSearch = { mode: 'success', delayMs: 0, body: connectionBody() };
  await openRoute(page, baseUrl, viewport, 'connections');
  const originalRows = await baseRows(page, viewport, 'connections');
  const targetInput = page.locator('[data-supplemental-target-input]');
  const submit = page.locator('[data-supplemental-submit="connections"]');
  assert(await targetInput.count() === 1 && await submit.count() === 1, '连接远程查询缺少显式输入与提交控件', { viewport: viewport.name });
  await targetInput.fill('192.0.2.42');
  await page.waitForTimeout(350);
  assert(mock.state.supplemental.requests.filter((item) => item.kind === 'connection-search').length === 0,
    '输入 IP 时触发了隐式远程连接查询', { viewport: viewport.name, requests: mock.state.supplemental.requests });
  await submit.click();
  await waitForSupplement(page, 'connections', { state: 'ready', request: 'success', evidence: 'current', source: 'routeros-ssh', coverage: 'bounded-sample' });
  const requests = mock.state.supplemental.requests.filter((item) => item.kind === 'connection-search');
  assert(requests.length === 1 && requests[0].target === '192.0.2.42' && requests[0].limit === '40',
    '连接远程查询没有以单次显式规范 IP + 固定 limit=40 发出', { viewport: viewport.name, requests });
  const duplicateSnapshotRows = await baseRows(page, viewport, 'connections');
  assert(duplicateSnapshotRows.length === 0, '连接补充查询与当前快照对象列表重复渲染', { viewport: viewport.name, duplicateSnapshotRows });
  assert(await page.locator('[data-supplemental-clear-query]').count() === 1, '连接补充查询缺少返回当前快照的清除入口', { viewport: viewport.name });
  const clearQueryBox = await page.locator('[data-supplemental-clear-query]').boundingBox();
  assert(clearQueryBox && clearQueryBox.height >= 44, '连接清除查询触控目标小于 44px', { viewport: viewport.name, clearQueryBox });
  const connectionLiveStatus = await page.locator('[data-supplemental-live-status]').textContent();
  assert(connectionLiveStatus?.includes(`找到 ${screenshotRoot ? 6 : 2} 条连接`), '连接查询成功没有可访问完成播报', { viewport: viewport.name, connectionLiveStatus });
  await captureViewport(page, viewport, 'connections-list');

  const result = page.locator('[data-supplemental-surface="connections"] [data-supplemental-row-id]').first();
  assert(await result.count() === 1, '连接补充结果没有提供可进入的对象行', { viewport: viewport.name });
  await result.click();
  await page.locator('[data-supplemental-object-detail]').waitFor();
  if (viewport.name === 'phone') {
    await assertFocusedAndVisible(page, '[data-supplemental-object-detail] button[aria-label="返回连接结果"]', '手机进入连接详情后焦点没有落到可见返回控件', { viewport: viewport.name });
  }
  await captureViewport(page, viewport, 'connections-detail');
  const rates = await page.locator('[data-supplemental-surface="connections"] [data-supplemental-rate-origin]').evaluateAll((nodes) => nodes.map((node) => ({
    origin: node.getAttribute('data-supplemental-rate-origin'),
    text: node.textContent || '',
  })));
  assert(rates.some((item) => item.origin === 'unavailable' && item.text.includes('未取得')),
    '连接缺失速率没有以未取得呈现', { viewport: viewport.name, rates });
  assert(rates.some((item) => item.origin === 'observed-zero' && /0\s*bps/i.test(item.text)),
    '连接观测到的零速率没有保持为 0 bps', { viewport: viewport.name, rates });
  if (viewport.name === 'phone') {
    await page.goBack();
    await page.locator('[data-supplemental-object-detail]').waitFor({ state: 'detached' });
    await assertFocusedAndVisible(page, '[data-supplemental-row-id]', '手机 Back 后没有把焦点恢复到来源连接行', { viewport: viewport.name });
    await page.goForward();
    await page.locator('[data-supplemental-object-detail]').waitFor();
    await assertFocusedAndVisible(page, '[data-supplemental-object-detail] button[aria-label="返回连接结果"]', '手机 Forward 后没有把焦点恢复到详情返回控件', { viewport: viewport.name });
    assert(mock.state.supplemental.requests.filter((item) => item.kind === 'connection-search').length === 1,
      '连接对象 Back/Forward 恢复时重复执行了远程查询', { viewport: viewport.name, requests: mock.state.supplemental.requests });
    await page.locator('[data-supplemental-object-detail] button[aria-label="返回连接结果"]').click();
    await page.locator('[data-supplemental-object-detail]').waitFor({ state: 'detached' });
    await page.locator('[data-supplemental-clear-query]').click();
    await page.waitForFunction(({ workspace, rowSelector, expected }) => {
      const root = document.querySelector(workspace);
      if (!root) return false;
       const ids = [...root.querySelectorAll(rowSelector)].map((node) => node.getAttribute('data-desktop-row-id') || (node.id || '').replace(/^mop-row-/, ''));
      return expected.every((id) => ids.includes(id));
    }, { workspace: workspaceSelector(viewport, 'connections'), rowSelector: baseRowSelector(viewport), expected: originalRows });
    assert(mock.state.supplemental.requests.filter((item) => item.kind === 'connection-search').length === 1,
      '清除查询时意外重复执行了远程查询', { viewport: viewport.name, requests: mock.state.supplemental.requests });
  }
}

async function runDnsContract(page, mock, baseUrl, viewport) {
  mock.state.supplemental.requests.length = 0;
  mock.state.supplemental.dnsStatic = {
    mode: 'success',
    delayMs: 0,
    pages: new Map([[0, dnsBody(0)], [50, dnsBody(50)]]),
  };
  await openRoute(page, baseUrl, viewport, 'dns4');
  const initialHistoryLength = await page.evaluate(() => window.history.length);
  await waitForSupplement(page, 'dns4', { state: 'ready', request: 'success', evidence: 'current', source: 'rest-live', coverage: 'page' });
  const dnsLiveStatus = await page.locator('[data-supplemental-live-status]').textContent();
  assert(dnsLiveStatus?.includes('DNS 第 1 页读取完成'), 'DNS 成功读取没有可访问完成播报', { viewport: viewport.name, dnsLiveStatus });
  const duplicateSnapshotRows = await baseRows(page, viewport, 'dns4');
  assert(duplicateSnapshotRows.length === 0, 'DNS 当前补充清单仍与快照对象列表重复渲染', { viewport: viewport.name, duplicateSnapshotRows });
  assert(await page.evaluate(() => window.history.length) === initialHistoryLength,
    'DNS 首次自动读取伪造了一条分页历史记录', { viewport: viewport.name, initialHistoryLength });
  const firstRequest = mock.state.supplemental.requests.find((item) => item.kind === 'dns-static');
  assert(firstRequest?.offset === 0 && firstRequest?.limit === 50, 'DNS 首页没有以明确 offset/limit 读取', { viewport: viewport.name, firstRequest });
  await captureViewport(page, viewport, 'dns-current');
  const next = page.locator('[data-supplemental-next-page]');
  const prev = page.locator('[data-supplemental-prev-page]');
  assert(await next.count() === 1 && await prev.count() === 1, 'DNS 补充清单缺少上一页/下一页控件', { viewport: viewport.name });
  if (viewport.workspace === 'mobile') {
    const nextBox = await next.boundingBox();
    assert(nextBox && nextBox.y >= 0 && nextBox.y + nextBox.height <= viewport.height,
      'DNS 下一页入口没有出现在移动工作区初始视口', { viewport: viewport.name, nextBox, height: viewport.height });
  }
  await next.click();
  await waitForSupplement(page, 'dns4', { state: 'ready', request: 'success', evidence: 'historical', source: 'rest-cache', coverage: 'page' });
  const secondRequest = mock.state.supplemental.requests.filter((item) => item.kind === 'dns-static').at(-1);
  assert(secondRequest?.offset === 50 && secondRequest?.limit === 50, 'DNS 下一页没有请求后续 offset/limit', { viewport: viewport.name, secondRequest });
  const pageTwo = await supplementSnapshot(page, 'dns4');
  assert(pageTwo.offset === '50' && pageTwo.pageSize === '50' && pageTwo.total === '51', 'DNS 第 2 页证据范围没有暴露为稳定 data 属性', { viewport: viewport.name, pageTwo });
  await page.goBack();
  await waitForSupplement(page, 'dns4', { state: 'ready', request: 'success', evidence: 'current', source: 'rest-live', coverage: 'page' });
  assert((await supplementSnapshot(page, 'dns4')).offset === '0', 'DNS Back 没有恢复第 1 页证据', { viewport: viewport.name });
  await page.goForward();
  await waitForSupplement(page, 'dns4', { state: 'ready', request: 'success', evidence: 'historical', source: 'rest-cache', coverage: 'page' });
  assert((await supplementSnapshot(page, 'dns4')).offset === '50', 'DNS Forward 没有恢复第 2 页证据', { viewport: viewport.name });
  await prev.click();
  await waitForSupplement(page, 'dns4', { state: 'ready', request: 'success', evidence: 'current', source: 'rest-live', coverage: 'page' });
  mock.state.supplemental.dnsStatic = {
    mode: 'success',
    delayMs: 0,
    pages: new Map([
      [0, dnsBody(0)],
      [50, {
        __mockResponse: true,
        mode: 'error',
        status: 409,
        errorBody: {
          code: 'dns_page_out_of_range',
          error: 'The requested DNS page no longer exists in this collection generation.',
          totalCount: 2,
          lastPage: 1,
          revision: 'e'.repeat(64),
        },
      }],
    ]),
  };
  const shrinkRequestStart = mock.state.supplemental.requests.length;
  await next.click();
  await waitForSupplement(page, 'dns4', { state: 'ready', request: 'success', evidence: 'current', source: 'rest-live', coverage: 'page' });
  const shrinkRequests = mock.state.supplemental.requests.slice(shrinkRequestStart).filter((item) => item.kind === 'dns-static');
  assert(shrinkRequests.length === 2 && shrinkRequests[0].offset === 50 && shrinkRequests[1].offset === 0,
    'DNS 缩页没有 replace 到最后有效页并重新读取同代首页', { viewport: viewport.name, shrinkRequests });
  assert((await supplementSnapshot(page, 'dns4')).offset === '0', 'DNS 缩页恢复后仍停留在越界页', { viewport: viewport.name });
}

async function runEvidenceStateContract(page, mock, baseUrl, viewport) {
  mock.state.supplemental.healthFindings = { mode: 'success', delayMs: 550, body: healthBody() };
  await openRoute(page, baseUrl, viewport, 'security');
  await waitForSupplement(page, 'security', { state: 'loading', request: 'loading', evidence: 'unavailable' });
  await waitForSupplement(page, 'security', { state: 'ready', request: 'success', evidence: 'current', source: 'snapshot-health-analysis', coverage: 'bounded-sample' });
  await captureViewport(page, viewport, 'security-current');

  mock.state.supplemental.healthFindings = {
    mode: 'success',
    delayMs: 0,
    body: healthBody({ evidenceMode: 'historical', sourceStatus: 'degraded', observedAt: now(-300_000) }),
  };
  await openRoute(page, baseUrl, viewport, 'security');
  await waitForSupplement(page, 'security', { state: 'ready', request: 'success', evidence: 'historical', source: 'snapshot-health-analysis', coverage: 'bounded-sample' });

  mock.state.supplemental.healthFindings = {
    mode: 'success',
    delayMs: 0,
    body: healthBody({ evidenceMode: 'unavailable', sourceStatus: 'failed', coverage: 'unavailable', observedAt: null }),
  };
  await openRoute(page, baseUrl, viewport, 'security');
  await waitForSupplement(page, 'security', { state: 'unavailable', request: 'success', evidence: 'unavailable', source: 'snapshot-health-analysis', coverage: 'unavailable' });

  mock.state.supplemental.dnsStatic = { mode: 'error', delayMs: 0, pages: new Map() };
  await openRoute(page, baseUrl, viewport, 'dns4');
  const dnsFallbackRows = await baseRows(page, viewport, 'dns4');
  await waitForSupplement(page, 'dns4', { state: 'error', request: 'error', evidence: 'unavailable' });
  await assertSnapshotRowsPreserved(page, viewport, 'dns4', dnsFallbackRows);

  mock.state.supplemental.connectionSearch = { mode: 'malformed', delayMs: 0, body: { schemaVersion: 1 } };
  await openRoute(page, baseUrl, viewport, 'connections');
  const input = page.locator('[data-supplemental-target-input]');
  await input.fill('192.0.2.42');
  await page.locator('[data-supplemental-submit="connections"]').click();
  await waitForSupplement(page, 'connections', { state: 'malformed', request: 'success', evidence: 'unavailable' });

  mock.state.supplemental.connectionSearch = {
    mode: 'error',
    delayMs: 0,
    status: 429,
    headers: { 'Retry-After': '12' },
    errorBody: {
      code: 'connection_search_rate_limited',
      error: '请求过于频繁，请稍后重试。',
      retryAfterSeconds: 12,
    },
  };
  await openRoute(page, baseUrl, viewport, 'connections');
  const errorInput = page.locator('[data-supplemental-target-input]');
  await errorInput.fill('192.0.2.42');
  await page.locator('[data-supplemental-submit="connections"]').click();
  await waitForSupplement(page, 'connections', {
    state: 'error', request: 'error', evidence: 'unavailable', target: '192.0.2.42',
    'error-code': 'connection_search_rate_limited', 'retry-after': '12',
  });
  assert(await errorInput.inputValue() === '192.0.2.42', '连接错误态丢失了用户查询目标', { viewport: viewport.name });
  const rateLimitedRetry = page.locator('[data-supplemental-retry]');
  assert(await rateLimitedRetry.count() === 1 && await rateLimitedRetry.isDisabled(), '连接限流态没有保留明确且暂时禁用的重试入口', { viewport: viewport.name });

  mock.state.supplemental.healthFindings = {
    mode: 'empty',
    delayMs: 0,
    emptyBody: healthBody({ evidenceMode: 'current' }),
  };
  mock.state.supplemental.healthFindings.emptyBody.findings = [];
  await openRoute(page, baseUrl, viewport, 'security');
  await waitForSupplement(page, 'security', { state: 'empty', request: 'success', evidence: 'current', source: 'snapshot-health-analysis', coverage: 'bounded-sample' });
  const health = await supplementSnapshot(page, 'security');
  assert(health.text.length > 0, '空健康发现被渲染成空白区域，而不是有界空结果', { viewport: viewport.name, health });
}

async function runViewportContracts(page, mock, baseUrl, viewport) {
  const checks = [];
  for (const [name, task] of [
    ['connections-explicit-query-and-history', runConnectionContract],
    ['dns-pagination-and-snapshot-preservation', runDnsContract],
    ['health-current-historical-unavailable-loading-empty-malformed', runEvidenceStateContract],
  ]) {
    try {
      await task(page, mock, baseUrl, viewport);
      checks.push({ name, pass: true });
    } catch (error) {
      checks.push({ name, pass: false, detail: String(error?.message || error) });
    }
  }
  return [{ viewport: `${viewport.width}x${viewport.height}`, surface: viewport.workspace, checks }];
}

async function main() {
  assert(fs.existsSync(publicIndex), '生产 bundle 缺少 public/index.html');
  if (screenshotRoot) {
    fs.rmSync(screenshotRoot, { recursive: true, force: true });
    fs.mkdirSync(screenshotRoot, { recursive: true });
  }
  const lifecycleRuns = [];
  for (const viewport of viewports) {
    const mock = await startMock();
    let lifecycle;
    try {
      lifecycle = await runBrowserLifecycle({
        executablePath: browserExecutable(),
        globalTimeoutMs: suiteTimeoutMs,
        stepTimeoutMs,
        cleanupTimeoutMs,
      }, async (runtime) => {
        runtime.registerCleanup('supplemental.mock.stop', () => mock.stop());
        // The public loader makes a one-shot surface choice. Establish the
        // target capability before the first navigation so the test exercises
        // the same mobile/desktop closure that the viewport contract names.
        await runtime.page.setViewportSize({ width: viewport.width, height: viewport.height });
        const surfaceUrl = new URL(mock.url);
        surfaceUrl.searchParams.set('surface', viewport.workspace);
        const baseUrl = surfaceUrl.toString();
        await login(runtime.page, baseUrl);
        // Each viewport owns a bounded browser lifecycle. This keeps one slow
        // surface from consuming every other surface's diagnostic budget.
        runtime.page.setDefaultTimeout(1_500);
        runtime.page.setDefaultNavigationTimeout(8_000);
        return runViewportContracts(runtime.page, mock, baseUrl, viewport);
      });
    } finally {
      // Browser startup can fail before its cleanup registry exists. The mock
      // stop is idempotent, so this outer owner closes that earlier path too.
      await mock.stop();
    }
    lifecycleRuns.push({ viewport: viewport.name, lifecycle });
  }
  const surfaces = lifecycleRuns.flatMap((run) => run.lifecycle.result || []);
  const firstError = lifecycleRuns.find((run) => run.lifecycle.error)?.lifecycle.error || null;
  const report = {
    contract: 'supplemental-route-production-runtime-v1',
    source: 'checked-in-public-bundle + isolated-startMock-per-desktop-viewport + managed-browser-lifecycle-v2',
    pass: lifecycleRuns.every((run) => run.lifecycle.ok) && surfaces.every((surface) => surface.checks.every((item) => item.pass)),
    lifecycle: lifecycleRuns.map((run) => ({ viewport: run.viewport, ...run.lifecycle.diagnostics })),
    surfaces,
    error: firstError,
    screenshots: capturedScreenshots,
  };
  if (screenshotRoot) {
    fs.writeFileSync(path.join(screenshotRoot, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.pass) {
    throw new Error('supplemental production runtime contract is red; do not relax the data/evidence contract to make it pass');
  }
}

main().catch((error) => {
  process.stderr.write(`${error && (error.stack || error.message) || error}\n`);
  process.exitCode = 1;
});
