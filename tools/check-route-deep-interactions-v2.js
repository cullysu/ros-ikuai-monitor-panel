#!/usr/bin/env node
'use strict';

// Browser-level acceptance for the remaining bounded-readonly workspaces. It
// serves the checked-in production bundle and injects the shared release
// scenario fixture before the bundle mounts; it never substitutes a test UI.
//
// Every browser is owned by the v2 lifecycle. A failed navigation or a global
// deadline therefore closes contexts, stops servers, and force-terminates the
// owned browser tree instead of leaving an Edge process behind.

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { buildSnapshot } = require('./local-predeploy-check');
const { startMock } = require('./check-panel-runtime-browser');
const { runBrowserLifecycle } = require('./acceptance/browser-lifecycle-v2/browser-lifecycle');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');
const pageTimeoutMs = 12_000;
// Includes managed Edge launch, context/page creation, and the route task. On
// Windows those lifecycle steps consume 5–7 seconds before route assertions.
const scenarioTimeoutMs = 25_000;
// Edge's browser-server tree can need more than three seconds to terminate on
// Windows; keep cleanup bounded while leaving enough time for verified taskkill.
const cleanupTimeoutMs = 6_000;
const suiteTimeoutMs = 115_000;
const phoneViewport = { width: 390, height: 844 };

const NOT_APPLICABLE = (reason) => ({ status: 'notApplicable', reason });
const CONTROL_CAPABILITIES = {
  fleetCollection: {
    search: 'required',
    filter: 'required',
    sort: 'required',
    pagination: 'required',
  },
  boundedEvidence: {
    search: NOT_APPLICABLE('采样序列是固定的证据对象，不提供集合搜索。'),
    filter: NOT_APPLICABLE('采样序列没有可比较的对象分类。'),
    sort: NOT_APPLICABLE('证据序列的唯一排序由采样时间契约确定。'),
    pagination: NOT_APPLICABLE('当前可信采样序列不足一页。'),
  },
  serviceLogCollection: {
    search: 'required',
    filter: 'required',
    sort: 'required',
    pagination: NOT_APPLICABLE('此固定服务日志夹具少于一页，分页没有可执行的下一页。'),
  },
  historicalLine: {
    search: 'required',
    filter: 'required',
    sort: 'required',
    pagination: NOT_APPLICABLE('当前历史线路记录少于一页。'),
  },
  diagnostics: {
    search: 'required',
    filter: 'required',
    sort: 'required',
    pagination: NOT_APPLICABLE('当前诊断记录少于一页。'),
  },
  unavailable: {
    search: NOT_APPLICABLE('没有可信对象集合时，筛选不能伪装成可执行查询。'),
    filter: NOT_APPLICABLE('没有可信对象集合时，筛选不能伪装成可执行查询。'),
    sort: NOT_APPLICABLE('没有可信对象集合时，排序不能伪装成可执行查询。'),
    pagination: NOT_APPLICABLE('没有可信对象集合时，不存在可翻页的结果。'),
  },
};

function assert(condition, message, detail) {
  if (!condition) throw new Error(`${message}: ${JSON.stringify(detail || {})}`);
}

function capabilityStatus(requirement, route, capability) {
  assert(requirement, '路由交互能力表缺少声明', { route, capability });
  if (requirement === 'required') return 'required';
  assert(
    requirement.status === 'notApplicable' && typeof requirement.reason === 'string' && requirement.reason.trim(),
    '路由交互能力表必须声明 required 或带理由的 notApplicable',
    { route, capability, requirement },
  );
  return 'notApplicable';
}

function assertCanonicalUrl(page, label) {
  const location = new URL(page.url());
  assert(location.hash === '', '深交互路由不得保留 fragment/hash', { label, url: page.url(), hash: location.hash });
  return location;
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function mimeType(file) {
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.svg')) return 'image/svg+xml';
  if (file.endsWith('.png')) return 'image/png';
  if (file.endsWith('.woff2')) return 'font/woff2';
  return 'text/html; charset=utf-8';
}

async function startProductionAssetServer() {
  const server = http.createServer(async (request, response) => {
    try {
      const requested = new URL(request.url || '/', 'http://127.0.0.1').pathname;
      const relative = requested === '/' ? 'index.html' : decodeURIComponent(requested).replace(/^\/+/, '');
      const candidate = path.resolve(publicDir, relative);
      if (!candidate.startsWith(publicDir + path.sep) && candidate !== path.join(publicDir, 'index.html')) {
        response.writeHead(403).end();
        return;
      }
      let file = candidate;
      try {
        const info = await fsp.stat(file);
        if (!info.isFile()) throw new Error('not a file');
      } catch {
        file = path.join(publicDir, 'index.html');
      }
      const body = await fsp.readFile(file);
      response.writeHead(200, {
        'Content-Type': mimeType(file),
        'Content-Length': body.length,
        'Cache-Control': 'no-store',
      });
      response.end(body);
    } catch (error) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(String(error && error.message || error));
    }
  });
  const port = await freePort();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  let stopped = false;
  return {
    url: `http://127.0.0.1:${port}/`,
    stop: () => {
      if (stopped) return Promise.resolve();
      stopped = true;
      return new Promise((resolve, reject) => {
        server.close((error) => {
          if (error && error.code !== 'ERR_SERVER_NOT_RUNNING') reject(error);
          else resolve();
        });
        server.closeIdleConnections?.();
        server.closeAllConnections?.();
      });
    },
  };
}

function fixture(profile, scenario, adjust) {
  const value = buildSnapshot(profile, scenario);
  if (adjust) adjust(value);
  return value;
}

function routeUrl(baseUrl, route, objectId) {
  const target = new URL(baseUrl);
  target.searchParams.set('section', route);
  if (objectId) target.searchParams.set('object', objectId);
  target.hash = '';
  return target.toString();
}

async function workspaceState(page, route) {
  return page.evaluate((targetRoute) => {
    const workspace = document.querySelector(`[data-mobile-domain-workspace="${targetRoute}"]`);
    const pagination = workspace?.querySelector('.mdw-pagination');
    const recovery = workspace?.querySelector('[data-route-recovery]');
    const activeFilter = workspace?.querySelector('.mdw-filter-row button[aria-pressed="true"]');
    const focusedRow = document.activeElement?.closest?.('[data-mobile-row-id]');
    return {
      route: new URL(location.href).searchParams.get('section'),
      object: new URL(location.href).searchParams.get('object'),
      hash: location.hash,
      evidenceMode: workspace?.getAttribute('data-mobile-evidence-mode') || '',
      layout: workspace?.getAttribute('data-mobile-domain-layout') || '',
      rows: workspace?.querySelectorAll('[data-mobile-row-id]').length || 0,
      detail: workspace?.querySelector('[data-mobile-object-detail]')?.getAttribute('data-mobile-object-detail') || '',
      pagination: pagination?.textContent?.replace(/\s+/g, ' ').trim() || '',
      recoveryState: recovery?.getAttribute('data-route-recovery-state') || '',
      search: workspace?.querySelector('input[type="search"]')?.value || '',
      filter: activeFilter?.textContent?.replace(/\s+/g, ' ').trim() || '',
      sort: workspace?.querySelector('select')?.value || '',
      toolsOpen: workspace?.querySelector('.mdw-tools-toggle')?.getAttribute('aria-expanded') === 'true',
      focusId: focusedRow?.getAttribute('data-mobile-row-id') || '',
      scrollY: Math.round(window.scrollY),
      maxScrollY: Math.max(0, Math.round(document.documentElement.scrollHeight - window.innerHeight)),
    };
  }, route);
}

function sameWorkspacePresentation(actual, expected) {
  return actual.search === expected.search
    && actual.filter === expected.filter
    && actual.sort === expected.sort
    && actual.pagination === expected.pagination
    && actual.toolsOpen === expected.toolsOpen
    && actual.focusId === expected.focusId
    && Math.abs(actual.scrollY - expected.scrollY) <= 2;
}

async function waitForWorkspacePresentation(page, route, expected) {
  const deadline = Date.now() + pageTimeoutMs;
  let actual = await workspaceState(page, route);
  while (!sameWorkspacePresentation(actual, expected) && Date.now() < deadline) {
    await page.waitForTimeout(25);
    actual = await workspaceState(page, route);
  }
  assert(sameWorkspacePresentation(actual, expected), '浏览器历史未恢复完整工作区状态', { route, expected, actual });
  return actual;
}

async function recoveryContract(page, route) {
  return page.evaluate((targetRoute) => {
    const workspace = document.querySelector(`[data-mobile-domain-workspace="${targetRoute}"]`);
    const recovery = workspace?.querySelector('[data-route-recovery]');
    const firstRow = workspace?.querySelector('[data-mobile-row-id]');
    const actions = [...(recovery?.querySelectorAll('[data-route-recovery-action-level]') || [])].map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        level: node.getAttribute('data-route-recovery-action-level') || '',
        text: node.textContent?.replace(/\s+/g, ' ').trim() || '',
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    });
    const evidenceWorkspace = workspace?.querySelector('[data-mobile-domain-evidence-workspace]');
    return {
      state: recovery?.getAttribute('data-route-recovery-state') || '',
      route: recovery?.getAttribute('data-route-recovery') || '',
      actions,
      historicalRowsBeforeRecovery: Boolean(firstRow && recovery && (firstRow.compareDocumentPosition(recovery) & Node.DOCUMENT_POSITION_FOLLOWING)),
      evidenceFacts: [...(evidenceWorkspace?.querySelectorAll('[data-mobile-evidence-workspace-fact]') || [])]
        .map((node) => node.getAttribute('data-mobile-evidence-workspace-fact') || ''),
    };
  }, route);
}

function assertRecoveryActions(contract, route, expectedState, rows) {
  assert(contract.route === route, '路由恢复边界绑定到错误的领域路由', { route, expectedState, contract });
  assert(contract.state === expectedState, '路由恢复边界状态与证据状态不一致', { route, expectedState, contract });
  const primary = contract.actions.filter((action) => action.level === 'primary');
  const secondary = contract.actions.filter((action) => action.level === 'secondary');
  if (expectedState === 'partial' || expectedState === 'unavailable') {
    assert(primary.length === 1, '部分或不可用证据必须恰好提供一个主调查操作', { route, expectedState, contract });
    assert(secondary.length === 1, '部分或不可用证据必须恰好保留一个次级调查操作', { route, expectedState, contract });
    assert(primary[0].width >= 44 && primary[0].height >= 44, '主调查操作的触控尺寸小于 44px', { route, expectedState, primary: primary[0] });
  }
  if (expectedState === 'historical') {
    assert(primary.length === 0, '历史证据不得伪装成当前故障的主调查操作', { route, contract });
    assert(secondary.length === 2, '历史证据必须保留两个等权次级调查入口', { route, contract });
    if (rows > 0) {
      assert(contract.historicalRowsBeforeRecovery, '历史对象记录必须在历史建议边界之前出现', { route, contract });
    }
  }
}

async function prepareFixturePage(page, snapshot, viewport = phoneViewport) {
  await page.setViewportSize(viewport);
  page.setDefaultTimeout(pageTimeoutMs);
  page.setDefaultNavigationTimeout(pageTimeoutMs);
  await page.addInitScript((data) => { window.__PANEL_TEST_SNAPSHOT__ = data; }, snapshot);
}

async function exerciseControls(page, route, requirements) {
  const workspace = page.locator(`[data-mobile-domain-workspace="${route}"]`);
  const evidence = { search: false, filter: false, sort: false, pagination: false, requirements };
  const requiredCapabilities = Object.entries(requirements)
    .filter(([capability, requirement]) => capabilityStatus(requirement, route, capability) === 'required')
    .map(([capability]) => capability);
  const toggle = workspace.locator('.mdw-tools-toggle');
  if (requiredCapabilities.length) {
    assert(await toggle.count() === 1, '声明为 required 的路由控件缺少筛选入口', { route, requiredCapabilities });
    await toggle.click();
  }
  const controls = workspace.locator(`[data-domain-controls="${route}"]`);
  if (requiredCapabilities.length) {
    assert(await controls.count() === 1, '声明为 required 的路由控件未打开真实控件区', { route, requiredCapabilities });
  }

  const rows = workspace.locator('[data-mobile-row-id]');
  const initialRowIds = await rows.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-mobile-row-id') || ''));
  const search = controls.locator('input[type="search"]');
  if (capabilityStatus(requirements.search, route, 'search') === 'required') {
    assert(await search.count() === 1 && initialRowIds.length > 0, '声明为 required 的搜索缺少真实对象集合', { route, initialRowIds });
    const rowTexts = (await rows.allInnerTexts()).map((value) => value.replace(/\s+/g, ' ').trim());
    const terms = [...new Set(rowTexts.flatMap((value) => value.match(/[A-Za-z0-9_.:/-]{3,}/g) || []))];
    const term = terms.find((candidate) => rowTexts.filter((value) => value.toLowerCase().includes(candidate.toLowerCase())).length === 1) || '';
    assert(term.length > 0, '搜索对象缺少可见文本', { route, rowText: rowTexts[0] || '' });
    await search.fill(term);
    await page.waitForFunction(({ selector, value }) => document.querySelector(selector)?.value === value, {
      selector: `[data-mobile-domain-workspace="${route}"] input[type="search"]`, value: term,
    });
    const searchedRowIds = await rows.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-mobile-row-id') || ''));
    assert(searchedRowIds.length > 0 && searchedRowIds.length <= initialRowIds.length, '搜索后没有保留匹配的真实对象', { route, term, initialRowIds, searchedRowIds });
    if (initialRowIds.length > 1) {
      assert(
        searchedRowIds.length < initialRowIds.length || searchedRowIds.some((id, index) => id !== initialRowIds[index]),
        '搜索没有改变真实对象结果集', { route, term, initialRowIds, searchedRowIds },
      );
    }
    evidence.search = true;
  }

  const filterButtons = controls.locator('.mdw-filter-row button[aria-pressed]');
  if (capabilityStatus(requirements.filter, route, 'filter') === 'required') {
    assert(await filterButtons.count() > 1, '声明为 required 的筛选没有可切换的真实选项', { route });
    const activeIndex = await filterButtons.evaluateAll((nodes) => nodes.findIndex((node) => node.getAttribute('aria-pressed') === 'true'));
    const nextIndex = activeIndex === 0 ? 1 : 0;
    await filterButtons.nth(nextIndex).click();
    assert(await filterButtons.nth(nextIndex).getAttribute('aria-pressed') === 'true', '筛选控件未更新实际选择状态', { route, activeIndex, nextIndex });
    evidence.filter = true;
  }

  const sort = controls.locator('select').first();
  if (capabilityStatus(requirements.sort, route, 'sort') === 'required') {
    assert(await sort.count() === 1, '声明为 required 的排序缺少选择器', { route });
    const options = await sort.locator('option').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('value')).filter(Boolean));
    const initial = await sort.inputValue();
    const next = options.find((value) => value !== initial);
    assert(next, '声明为 required 的排序没有替代排序选项', { route, options, initial });
    await sort.selectOption(next);
    assert(await sort.inputValue() === next, '排序控件未更新实际选择状态', { route, initial, next });
    evidence.sort = true;
  }

  const reset = controls.getByRole('button', { name: '清除筛选' });
  if (await reset.count()) await reset.click();
  const pagination = workspace.locator('.mdw-pagination');
  if (capabilityStatus(requirements.pagination, route, 'pagination') === 'required') {
    assert(await pagination.count() === 1, '声明为 required 的分页没有分页导航', { route });
    const before = await pagination.innerText();
    const next = pagination.getByRole('button', { name: '下一页' });
    assert(await next.count() === 1 && !await next.isDisabled(), '声明为 required 的分页没有可执行的下一页', { route, before });
    await next.click();
    await page.waitForFunction(({ selector, beforeText }) => {
      const node = document.querySelector(selector);
      return Boolean(node && node.textContent !== beforeText);
    }, { selector: `[data-mobile-domain-workspace="${route}"] .mdw-pagination`, beforeText: before });
    const after = await pagination.innerText();
    assert(after !== before, '分页点击没有改变真实分页状态', { route, before, after });
    evidence.pagination = true;
  }
  return evidence;
}

async function exerciseDetailHistoryAndDeepLink(page, baseUrl, route) {
  const workspace = page.locator(`[data-mobile-domain-workspace="${route}"]`);
  const row = workspace.locator('[data-mobile-row-id]').first();
  const firstId = await row.getAttribute('data-mobile-row-id');
  assert(firstId, '对象列表未提供可深链的真实对象 ID', { route });
  await row.evaluate((node) => {
    const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const absoluteTop = node.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, Math.min(maximum, Math.max(0, absoluteTop - 96)));
    node.focus({ preventScroll: true });
  });
  const expected = await workspaceState(page, route);
  assert(expected.focusId === firstId, '进入详情前未建立可恢复的对象焦点', { route, firstId, expected });
  await row.click();
  const detail = workspace.locator('[data-mobile-object-detail]');
  await detail.waitFor();
  const selectedUrl = assertCanonicalUrl(page, `${route}:selected`);
  const selected = selectedUrl.searchParams.get('object');
  assert(selected === firstId, '对象详情未将真实对象 ID 写入 canonical URL', { route, firstId, selected, selectedUrl: page.url() });

  await page.goBack();
  await detail.waitFor({ state: 'detached' });
  assertCanonicalUrl(page, `${route}:back`);
  const back = await waitForWorkspacePresentation(page, route, expected);
  assert(back.route === route && back.object === null && !back.detail && back.hash === '', '浏览器 Back 未恢复无 hash 的对象列表', { route, back });

  await page.goForward();
  await detail.waitFor();
  assertCanonicalUrl(page, `${route}:forward`);
  const forward = await workspaceState(page, route);
  assert(forward.object === firstId && forward.detail === firstId && forward.hash === '', '浏览器 Forward 未恢复无 hash 的对象详情', { route, forward, firstId });

  await page.goto(routeUrl(baseUrl, route, firstId), { waitUntil: 'domcontentloaded' });
  await workspace.waitFor();
  await detail.waitFor();
  assertCanonicalUrl(page, `${route}:direct`);
  const direct = await workspaceState(page, route);
  assert(direct.route === route && direct.object === firstId && direct.detail === firstId && direct.hash === '', '对象深链未直接打开无 hash 的真实详情', { route, direct, firstId });
  return { objectId: firstId, expected, back, forward, direct };
}

async function inspectPartialMetrics(page, route) {
  return page.evaluate((targetRoute) => {
    const workspace = document.querySelector(`[data-mobile-domain-workspace="${targetRoute}"]`);
    return [...(workspace?.querySelectorAll('.mdw-metrics > div') || [])].map((node) => ({
      label: node.querySelector('small')?.textContent?.trim() || '',
      value: node.querySelector('b')?.textContent?.trim() || '',
      tone: node.className || '',
    }));
  }, route);
}

async function exerciseNonDefaultWorkspaceHistory(page, baseUrl, route) {
  const workspace = page.locator(`[data-mobile-domain-workspace="${route}"]`);
  const toggle = workspace.locator('.mdw-tools-toggle');
  if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
  const controls = workspace.locator(`[data-domain-controls="${route}"]`);
  const filterButtons = controls.locator('.mdw-filter-row button[aria-pressed]');
  const initialFilter = await filterButtons.evaluateAll((nodes) => nodes.findIndex((node) => node.getAttribute('aria-pressed') === 'true'));
  let selectedFilter = '';
  for (let index = 0; index < await filterButtons.count(); index += 1) {
    if (index === initialFilter) continue;
    await filterButtons.nth(index).click();
    if (await workspace.locator('[data-mobile-row-id]').count()) {
      selectedFilter = (await filterButtons.nth(index).innerText()).replace(/\s+/g, ' ').trim();
      break;
    }
  }
  assert(selectedFilter, '跨尺寸历史验收未找到包含真实对象的非默认筛选', { route, initialFilter });

  const sort = controls.locator('select').first();
  const sortOptions = await sort.locator('option').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('value')).filter(Boolean));
  const initialSort = await sort.inputValue();
  const selectedSort = sortOptions.find((value) => value !== initialSort);
  assert(selectedSort, '跨尺寸历史验收缺少非默认排序', { route, sortOptions, initialSort });
  await sort.selectOption(selectedSort);

  const rows = workspace.locator('[data-mobile-row-id]');
  const rowTexts = (await rows.allInnerTexts()).map((value) => value.replace(/\s+/g, ' ').trim());
  const terms = [...new Set(rowTexts.flatMap((value) => value.match(/[A-Za-z0-9_.:/-]{3,}/g) || []))];
  const term = terms.find((candidate) => rowTexts.some((value) => value.toLowerCase().includes(candidate.toLowerCase()))) || '';
  assert(term, '跨尺寸历史验收缺少可搜索对象文本', { route, rowTexts });
  await controls.locator('input[type="search"]').fill(term);
  assert(await rows.count() > 0, '跨尺寸非默认搜索与筛选组合没有保留真实对象', { route, selectedFilter, selectedSort, term });

  const history = await exerciseDetailHistoryAndDeepLink(page, baseUrl, route);
  assert(
    history.expected.search === term
      && history.expected.filter === selectedFilter
      && history.expected.sort === selectedSort
      && history.expected.toolsOpen
      && history.expected.focusId === history.objectId
      && (history.expected.maxScrollY === 0 || history.expected.scrollY > 0),
    '跨尺寸历史验收没有建立完整的非默认工作区状态',
    { route, selectedFilter, selectedSort, term, history },
  );
  return history;
}

async function verifyCapabilityViewports(page, baseUrl, route) {
  const outcomes = [];
  for (const expectation of [
    { viewport: { width: 667, height: 375 }, layout: 'phone-list', label: 'short-landscape-phone' },
    { viewport: { width: 600, height: 800 }, layout: 'compact-list', label: 'compact' },
    { viewport: { width: 375, height: 667 }, layout: 'phone-list', label: 'noncanonical-phone', restoreWorkspace: true },
    { viewport: { width: 768, height: 1024 }, layout: 'workbench', label: 'tablet-workbench', restoreWorkspace: true },
  ]) {
    await page.setViewportSize(expectation.viewport);
    await page.goto(routeUrl(baseUrl, route), { waitUntil: 'domcontentloaded' });
    const workspace = page.locator(`[data-mobile-domain-workspace="${route}"]`);
    await workspace.waitFor();
    assertCanonicalUrl(page, `${route}:${expectation.label}`);
    const state = await workspaceState(page, route);
    assert(state.layout === expectation.layout, '能力视口没有进入约定的独立任务表面', { route, expectation, state });
    const workspaceHistory = expectation.restoreWorkspace
      ? await exerciseNonDefaultWorkspaceHistory(page, baseUrl, route)
      : null;
    outcomes.push({ ...expectation, state, workspaceHistory });
  }
  await page.setViewportSize(phoneViewport);
  return outcomes;
}

async function runAvailableRoute(page, baseUrl, specification) {
  await prepareFixturePage(page, specification.snapshot);
  await page.goto(routeUrl(baseUrl, specification.route), { waitUntil: 'domcontentloaded' });
  const workspace = page.locator(`[data-mobile-domain-workspace="${specification.route}"]`);
  await workspace.waitFor();
  assertCanonicalUrl(page, `${specification.route}:initial`);
  const initial = await workspaceState(page, specification.route);
  assert(initial.route === specification.route && initial.rows > 0, '直接路由未呈现可交互对象列表', {
    route: specification.route, fixture: specification.fixture, initial,
  });
  assert(initial.evidenceMode === specification.evidenceMode, '路由没有呈现预期的生产证据状态', { route: specification.route, expected: specification.evidenceMode, initial });
  if (specification.expectPartial) {
    assert(initial.recoveryState === 'partial', '部分采集未呈现路由级部分证据边界', { route: specification.route, initial });
  }
  if (specification.evidenceMode === 'historical') {
    assert(initial.recoveryState === 'historical', '历史采集未呈现路由级历史证据边界', { route: specification.route, initial });
  }
  const recovery = await recoveryContract(page, specification.route);
  if (specification.expectPartial) assertRecoveryActions(recovery, specification.route, 'partial', initial.rows);
  if (specification.evidenceMode === 'historical') assertRecoveryActions(recovery, specification.route, 'historical', initial.rows);
  const partialMetrics = specification.expectPartial ? await inspectPartialMetrics(page, specification.route) : null;
  if (partialMetrics) {
    assert(
      partialMetrics.some((metric) => metric.value === '未取得') && partialMetrics.some((metric) => /^\d/.test(metric.value)),
      '部分采集夹具没有同时呈现缺失与可用的真实领域指标', { route: specification.route, partialMetrics },
    );
  }
  const controls = await exerciseControls(page, specification.route, specification.capabilities);
  const detail = await exerciseDetailHistoryAndDeepLink(page, baseUrl, specification.route);
  const viewports = specification.verifyCapabilities
    ? await verifyCapabilityViewports(page, baseUrl, specification.route)
    : [];
  return { route: specification.route, fixture: specification.fixture, initial, recovery, partialMetrics, controls, detail, viewports };
}

async function loginLiveRuntime(page, baseUrl) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  const form = page.locator('[data-router-login-form]');
  await form.waitFor();
  await page.locator('input[name="host"]').fill('192.0.2.1');
  await page.locator('input[name="user"]').fill('observer');
  await page.locator('input[name="password"]').fill('correct-horse');
  await form.locator('button[type="submit"]').click();
  const hostKey = page.locator('.router-host-key-confirmation');
  await hostKey.waitFor();
  await hostKey.locator('input[type="checkbox"]').check();
  await form.locator('button[type="submit"]').click();
  await page.waitForFunction(() => (
    document.querySelector('[data-panel-runtime-phase]')?.getAttribute('data-panel-runtime-phase') === 'current'
  ));
}

async function runLiveAvailableRoute(page, baseUrl, route, fixtureName, evidenceMode) {
  await page.setViewportSize(phoneViewport);
  page.setDefaultTimeout(pageTimeoutMs);
  page.setDefaultNavigationTimeout(pageTimeoutMs);
  await loginLiveRuntime(page, baseUrl);
  await page.goto(routeUrl(baseUrl, route), { waitUntil: 'domcontentloaded' });
  const workspace = page.locator(`[data-mobile-domain-workspace="${route}"]`);
  await workspace.waitFor();
  assertCanonicalUrl(page, `${route}:live-initial`);
  const initial = await workspaceState(page, route);
  assert(initial.route === route && initial.rows > 0 && initial.evidenceMode === evidenceMode,
    '生产运行时诊断路由没有呈现可交互历史对象', { route, fixtureName, evidenceMode, initial });
  assert(initial.recoveryState === 'historical', '运行时诊断记录没有呈现历史证据边界', { route, fixtureName, initial });
  const recovery = await recoveryContract(page, route);
  assertRecoveryActions(recovery, route, 'historical', initial.rows);
  const controls = await exerciseControls(page, route, CONTROL_CAPABILITIES.diagnostics);
  const detail = await exerciseDetailHistoryAndDeepLink(page, baseUrl, route);
  return { route, fixture: fixtureName, initial, recovery, controls, detail };
}

async function runUnavailableRoute(page, baseUrl) {
  const route = 'readonlyDiagnostics';
  await prepareFixturePage(page, fixture('private', 'no-snapshot'));
  await page.goto(routeUrl(baseUrl, route), { waitUntil: 'domcontentloaded' });
  const workspace = page.locator(`[data-mobile-domain-workspace="${route}"]`);
  await workspace.waitFor();
  assertCanonicalUrl(page, `${route}:unavailable`);
  const state = await workspaceState(page, route);
  assert(state.route === route && state.evidenceMode === 'unavailable' && state.recoveryState === 'unavailable' && state.rows === 0 && !state.detail,
    '不可用快照没有保持只读诊断的不可用边界', state);
  const recovery = await recoveryContract(page, route);
  assertRecoveryActions(recovery, route, 'unavailable', state.rows);
  const expectedFacts = ['missing', 'impact', 'last-success', 'collection'];
  assert(expectedFacts.every((fact) => recovery.evidenceFacts.includes(fact)), '不可用路由回退成通用空白页，缺少证据工作区事实', { route, recovery });
  for (const [capability, requirement] of Object.entries(CONTROL_CAPABILITIES.unavailable)) {
    assert(capabilityStatus(requirement, route, capability) === 'notApplicable', '不可用路由的控件能力表错误', { route, capability, requirement });
  }
  return { route, fixture: 'no-snapshot', state, recovery };
}

async function runLifecycleScenario(label, suiteDeadlineAt, scenario) {
  const remainingMs = suiteDeadlineAt - Date.now();
  assert(remainingMs >= 5_000, '深交互套件全局 deadline 已耗尽，拒绝开始未受控场景', { label, remainingMs });
  const lifecycle = await runBrowserLifecycle({
    globalTimeoutMs: Math.min(scenarioTimeoutMs, remainingMs),
    stepTimeoutMs: scenarioTimeoutMs,
    cleanupTimeoutMs,
  }, async (runtime) => scenario(runtime));
  assert(lifecycle.ok, '受控浏览器生命周期场景失败', { label, error: lifecycle.error, diagnostics: lifecycle.diagnostics });
  return { label, result: lifecycle.result, lifecycle: lifecycle.diagnostics };
}

async function withProductionAssets(runtime, label, task) {
  const server = await startProductionAssetServer();
  runtime.registerCleanup(`${label}.asset-server.stop`, () => server.stop());
  return task(server.url);
}

async function main() {
  assert(fs.existsSync(path.join(publicDir, 'index.html')), '生产发布资产缺少 public/index.html');
  const suiteStartedAt = Date.now();
  const suiteDeadlineAt = suiteStartedAt + suiteTimeoutMs;
  const partialDhcp = fixture('private', 'fleet', (snapshot) => {
    // Preserve the shared fleet fixture's lease evidence while withholding
    // two optional collections, exercising the renderer's partial boundary.
    delete snapshot.dhcp.clients;
    delete snapshot.dhcp.pools;
  });
  const specifications = [
    { route: 'lineStatus', fixture: 'fleet', snapshot: fixture('private', 'fleet'), evidenceMode: 'current', capabilities: CONTROL_CAPABILITIES.fleetCollection, verifyCapabilities: true },
    { route: 'dhcp', fixture: 'fleet-partial', snapshot: partialDhcp, evidenceMode: 'current', expectPartial: true, capabilities: CONTROL_CAPABILITIES.fleetCollection },
    { route: 'arp', fixture: 'fleet', snapshot: fixture('private', 'fleet'), evidenceMode: 'current', capabilities: CONTROL_CAPABILITIES.fleetCollection },
    { route: 'loadAudit', fixture: 'resource-full', snapshot: fixture('private', 'resource-full'), evidenceMode: 'current', capabilities: CONTROL_CAPABILITIES.boundedEvidence },
    { route: 'serviceLogs', fixture: 'fleet', snapshot: fixture('private', 'fleet'), evidenceMode: 'current', capabilities: CONTROL_CAPABILITIES.serviceLogCollection },
    { route: 'lineStatus', fixture: 'collection-down', snapshot: fixture('private', 'collection-down'), evidenceMode: 'historical', capabilities: CONTROL_CAPABILITIES.historicalLine },
  ];
  const routes = [];
  for (const specification of specifications) {
    routes.push(await runLifecycleScenario(`${specification.route}:${specification.fixture}`, suiteDeadlineAt, (runtime) => (
      withProductionAssets(runtime, `${specification.route}:${specification.fixture}`, (baseUrl) => runAvailableRoute(runtime.page, baseUrl, specification))
    )));
  }
  const live = await runLifecycleScenario('readonlyDiagnostics:collection-down-live-runtime', suiteDeadlineAt, async (runtime) => {
    const liveMock = await startMock();
    runtime.registerCleanup('readonlyDiagnostics:live-mock.stop', () => liveMock.stop());
    liveMock.state.scenario = 'collection-down';
    return runLiveAvailableRoute(runtime.page, liveMock.url, 'readonlyDiagnostics', 'collection-down-live-runtime', 'historical');
  });
  const unavailable = await runLifecycleScenario('readonlyDiagnostics:no-snapshot', suiteDeadlineAt, (runtime) => (
    withProductionAssets(runtime, 'readonlyDiagnostics:no-snapshot', (baseUrl) => runUnavailableRoute(runtime.page, baseUrl))
  ));
  const resultRows = routes.map((entry) => entry.result);
  const paginationRoutes = new Set(resultRows.filter((item) => item.controls.pagination).map((item) => item.route));
  assert(['lineStatus', 'dhcp', 'arp'].every((route) => paginationRoutes.has(route)), '舰队场景没有覆盖三条可分页路由的真实分页', { paginationRoutes: [...paginationRoutes] });
  assert(resultRows.some((item) => item.fixture === 'fleet-partial' && item.initial.rows > 0), '部分 DHCP 夹具未保留可交互租约证据', resultRows);
  const report = {
    pass: true,
    contract: 'route-deep-interactions-v2',
    source: 'production-public-runtime-with-shared-scenario-fixtures',
    globalDeadlineMs: suiteTimeoutMs,
    elapsedMs: Date.now() - suiteStartedAt,
    routes,
    live,
    unavailable,
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  process.stderr.write(`${error && (error.stack || error.message) || error}\n`);
  process.exitCode = 1;
});
