#!/usr/bin/env node
'use strict';

require('./test-browser-lifecycle-lowload-timeout');

/*
 * Deep interaction contract for the accepted Mobile Reference owner.
 *
 * This suite exercises the production-built mobile tree rather than retaining
 * selectors and assumptions from the retired domain-workspace presentation.
 * Scenario semantics belong to the 56-cell matrix; this contract owns real
 * controls, canonical deep links, Back/Forward, direct links, and the network
 * directory hand-off.
 */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { buildSnapshot } = require('./local-predeploy-check');
const { runBrowserLifecycle } = require('./acceptance/browser-lifecycle-v2/browser-lifecycle');
const { gitWorktreeIdentity } = require('./worktree-runtime-identity');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');
const artifactDir = path.join(root, '_acceptance', 'route-deep-interactions-v3');
const reportPath = path.join(artifactDir, 'report.json');
const contract = 'mobile-reference-route-deep-interactions-v3';
const lowLoadTimeoutMs = Number.parseInt(process.env.CODEX_LOW_LOAD_BROWSER_TIMEOUT_MS || '', 10);
const actionTimeoutMs = Number.isFinite(lowLoadTimeoutMs) && lowLoadTimeoutMs > 0
  ? Math.max(30_000, lowLoadTimeoutMs)
  : 30_000;
const suiteTimeoutMs = Math.max(180_000, actionTimeoutMs * 4);
const cleanupTimeoutMs = 8_000;
const phoneViewport = { width: 390, height: 844 };
const routes = ['interfaces', 'routes', 'terminals', 'logs', 'dhcp'];

function assert(condition, message, evidence) {
  if (!condition) throw new Error(`${message}${evidence ? `\n${JSON.stringify(evidence, null, 2)}` : ''}`);
}

function serialise(error) {
  return {
    name: error?.name || 'Error',
    code: error?.code || '',
    message: String(error?.message || error),
    stack: String(error?.stack || '').split('\n').slice(0, 7).join('\n'),
  };
}

function sameIdentity(left, right) {
  return left.commit === right.commit
    && left.artifactKey === right.artifactKey
    && left.worktreeFingerprint === right.worktreeFingerprint;
}

function routeUrl(baseUrl, route, objectId = null) {
  const target = new URL(baseUrl);
  target.searchParams.set('surface', 'mobile');
  target.searchParams.set('section', route);
  if (objectId) target.searchParams.set('object', objectId);
  else target.searchParams.delete('object');
  target.hash = '';
  return target.toString();
}

function freePort() {
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
      response.end(String(error?.message || error));
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

function canonicalState(page) {
  const url = new URL(page.url());
  return {
    route: url.searchParams.get('section'),
    object: url.searchParams.get('object'),
    surface: url.searchParams.get('surface'),
    hash: url.hash,
  };
}

async function waitForWorkspace(page, route, detail = false) {
  const selector = detail
    ? `main[data-mobile-reference-workspace="${route}"][data-mobile-reference-object-detail]`
    : `main[data-mobile-reference-workspace="${route}"]:not([data-mobile-reference-object-detail])`;
  const workspace = page.locator(selector);
  await workspace.waitFor({ state: 'visible', timeout: actionTimeoutMs });
  return workspace;
}

async function workspaceState(page, route) {
  return page.evaluate((targetRoute) => {
    const workspace = document.querySelector(`main[data-mobile-reference-workspace="${targetRoute}"]`);
    const rows = [...(workspace?.querySelectorAll('[data-panel-object-row]') || [])];
    const selects = [...(workspace?.querySelectorAll('.ref-workspace-selects select') || [])];
    const pagination = workspace?.querySelector('.ref-pagination');
    const focused = document.activeElement?.closest?.('[data-panel-object-row]');
    const scroll = workspace?.querySelector(`[data-panel-workspace-scroll="${targetRoute}"]`);
    const historyWorkspace = history.state?.panelWorkspace || null;
    const url = new URL(location.href);
    return {
      route: url.searchParams.get('section'),
      object: url.searchParams.get('object'),
      surface: url.searchParams.get('surface'),
      hash: url.hash,
      detail: workspace?.getAttribute('data-mobile-reference-object-detail') || '',
      rowIds: rows.map((row) => row.getAttribute('data-panel-object-row') || ''),
      rowTexts: rows.map((row) => row.textContent?.replace(/\s+/g, ' ').trim() || ''),
      rowPrimaries: rows.map((row) => row.querySelector('b')?.textContent?.trim() || ''),
      search: workspace?.querySelector('input[type="search"]')?.value || '',
      selects: selects.map((select) => select.value),
      pagination: pagination?.textContent?.replace(/\s+/g, ' ').trim() || '',
      focusId: focused?.getAttribute('data-panel-object-row') || '',
      scrollTop: scroll instanceof HTMLElement ? Math.trunc(scroll.scrollTop) : 0,
      scrollMax: scroll instanceof HTMLElement ? Math.max(0, Math.trunc(scroll.scrollHeight - scroll.clientHeight)) : 0,
      historyWorkspace,
      overflowX: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0) - innerWidth,
    };
  }, route);
}

function uniqueSearchTerm(texts) {
  const terms = [...new Set(texts.flatMap((value) => value.match(/[A-Za-z0-9_.:/-]{3,}/g) || []))];
  return terms.find((term) => texts.filter((value) => value.toLowerCase().includes(term.toLowerCase())).length === 1)
    || terms[0]
    || '';
}

function pageNumberFromPagination(text) {
  const match = String(text || '').match(/第\s*(\d+)\s*\/\s*\d+\s*页/);
  return match ? Number.parseInt(match[1], 10) : 1;
}

async function exerciseControls(page, route, workspace, initial) {
  const evidence = {
    search: false,
    retainedSearch: false,
    selects: 0,
    retainedFilter: false,
    retainedSort: false,
    pagination: false,
  };
  const search = workspace.locator('input[type="search"]');
  if (await search.count()) {
    const term = uniqueSearchTerm(initial.rowPrimaries);
    assert(term, '搜索控件存在但对象没有可验证的可见文本', { route, initial });
    await search.fill(term);
    await page.waitForFunction(({ targetRoute, expected }) => {
      const owner = document.querySelector(`main[data-mobile-reference-workspace="${targetRoute}"]`);
      return owner?.querySelector('input[type="search"]')?.value === expected;
    }, { targetRoute: route, expected: term });
    const searched = await workspaceState(page, route);
    assert(searched.rowIds.length > 0 && searched.rowIds.length <= initial.rowIds.length,
      '搜索没有保留匹配的真实对象', { route, term, initial: initial.rowIds, searched: searched.rowIds });
    evidence.search = true;
    evidence.retainedSearch = true;
  }

  const selects = workspace.locator('.ref-workspace-selects select');
  for (let index = 0; index < await selects.count(); index += 1) {
    const select = selects.nth(index);
    const current = await select.inputValue();
    const options = await select.locator('option').evaluateAll((nodes) => nodes.map((node) => node.value));
    let retained = false;
    for (const next of options.filter((value) => value !== current)) {
      await select.selectOption(next);
      assert(await select.inputValue() === next, '筛选或排序控件没有更新真实选择状态', { route, index, current, next });
      const changed = await workspaceState(page, route);
      if (changed.rowIds.length > 0) {
        retained = true;
        evidence.selects += 1;
        if (index === 0) evidence.retainedFilter = true;
        if (index === 1) evidence.retainedSort = true;
        break;
      }
      await select.selectOption(current);
    }
    if (!retained) await select.selectOption(current);
  }

  const pagination = workspace.locator('.ref-pagination');
  if (await pagination.count()) {
    const next = pagination.getByRole('button', { name: '下一页' });
    if (await next.count() && !await next.isDisabled()) {
      const before = await pagination.innerText();
      await next.click();
      await page.waitForFunction(({ targetRoute, beforeText }) => {
        const node = document.querySelector(`main[data-mobile-reference-workspace="${targetRoute}"] .ref-pagination`);
        return Boolean(node && node.textContent !== beforeText);
      }, { targetRoute: route, beforeText: before });
      evidence.pagination = true;
    }
  }
  return evidence;
}

async function exerciseHistory(page, baseUrl, route) {
  let workspace = await waitForWorkspace(page, route);
  const scroll = workspace.locator(`[data-panel-workspace-scroll="${route}"]`);
  if (await scroll.count()) {
    await scroll.evaluate((element) => { element.scrollTop = Math.max(0, element.scrollHeight - element.clientHeight); });
    await page.waitForFunction((targetRoute) => {
      const element = document.querySelector(`[data-panel-workspace-scroll="${targetRoute}"]`);
      return element instanceof HTMLElement
        && (element.scrollHeight <= element.clientHeight + 1 || element.scrollTop > 0);
    }, route);
  }
  const before = await workspaceState(page, route);
  const row = workspace.locator('[data-panel-object-row]').last();
  const objectId = await row.getAttribute('data-panel-object-row');
  assert(objectId, '对象列表没有可深链的真实对象标识', { route });
  await row.focus();
  await row.click();
  await waitForWorkspace(page, route, true);
  let state = canonicalState(page);
  assert(state.route === route && state.object === objectId && state.surface === null && state.hash === '',
    '对象详情没有写入无 surface 参数的 canonical URL', { route, objectId, state });

  await page.goBack({ waitUntil: 'domcontentloaded' });
  workspace = await waitForWorkspace(page, route);
  state = canonicalState(page);
  const afterBack = await workspaceState(page, route);
  assert(state.route === route && state.object === null && state.surface === null && state.hash === '',
    '浏览器 Back 没有恢复对象列表 URL', { route, objectId, state });
  assert(afterBack.search === before.search
    && JSON.stringify(afterBack.selects) === JSON.stringify(before.selects)
    && afterBack.pagination === before.pagination
    && JSON.stringify(afterBack.rowIds) === JSON.stringify(before.rowIds),
  '浏览器 Back 没有恢复筛选、排序或分页状态', { route, objectId, before, afterBack });
  assert(Math.abs(afterBack.scrollTop - before.scrollTop) <= 2,
    '浏览器 Back 没有恢复 Mobile Reference 内层滚动位置', { route, objectId, before, afterBack });
  assert(afterBack.focusId === objectId,
    '浏览器 Back 没有把焦点恢复到来源对象', { route, objectId, before, afterBack });
  assert(afterBack.historyWorkspace?.route === route
    && afterBack.historyWorkspace?.search === afterBack.search
    && afterBack.historyWorkspace?.filter === afterBack.selects[0]
    && afterBack.historyWorkspace?.sort === afterBack.selects[1]
    && afterBack.historyWorkspace?.page === pageNumberFromPagination(afterBack.pagination)
    && Math.abs(Number(afterBack.historyWorkspace?.scrollY) - afterBack.scrollTop) <= 2,
  '浏览器历史没有保存有界 Workspace 状态', { route, objectId, before, afterBack });

  await page.goForward({ waitUntil: 'domcontentloaded' });
  await waitForWorkspace(page, route, true);
  state = canonicalState(page);
  assert(state.route === route && state.object === objectId && state.surface === null && state.hash === '',
    '浏览器 Forward 没有重新打开对象详情', { route, objectId, state });

  await page.goto(routeUrl(baseUrl, route, objectId), { waitUntil: 'domcontentloaded' });
  await waitForWorkspace(page, route, true);
  state = canonicalState(page);
  assert(state.route === route && state.object === objectId && state.surface === null && state.hash === '',
    '对象 direct link 没有打开真实详情', { route, objectId, state });
  return {
    objectId,
    back: true,
    forward: true,
    direct: true,
    workspaceHistory: {
      search: afterBack.search,
      selects: afterBack.selects,
      pagination: afterBack.pagination,
      scrollTop: afterBack.scrollTop,
      focusId: afterBack.focusId,
    },
  };
}

async function exercisePaginationHistory(page, baseUrl, route) {
  await page.goto(routeUrl(baseUrl, route), { waitUntil: 'domcontentloaded' });
  const workspace = await waitForWorkspace(page, route);
  const pagination = workspace.locator('.ref-pagination');
  assert(await pagination.count() === 1, '确定性分页工作区没有分页控件', { route });
  const next = pagination.getByRole('button', { name: '下一页' });
  assert(await next.count() === 1 && !await next.isDisabled(), '确定性分页工作区没有可进入的下一页', { route });
  const beforeText = await pagination.innerText();
  await next.click();
  await page.waitForFunction(({ targetRoute, previous }) => {
    const node = document.querySelector(`main[data-mobile-reference-workspace="${targetRoute}"] .ref-pagination`);
    return Boolean(node && node.textContent !== previous);
  }, { targetRoute: route, previous: beforeText });
  const paged = await workspaceState(page, route);
  assert(pageNumberFromPagination(paged.pagination) > 1 && paged.rowIds.length > 0,
    '分页控件没有形成可验证的非首页对象集合', { route, paged });
  const history = await exerciseHistory(page, baseUrl, route);
  return { retainedPagination: true, history };
}

async function inspectRoute(page, baseUrl, route) {
  await page.goto(routeUrl(baseUrl, route), { waitUntil: 'domcontentloaded' });
  const workspace = await waitForWorkspace(page, route);
  const initial = await workspaceState(page, route);
  assert(initial.route === route && initial.surface === null && initial.hash === '' && initial.rowIds.length > 0,
    '真实移动工作区没有呈现可交互对象', { route, initial });
  assert(initial.overflowX <= 1, '移动工作区存在横向溢出', { route, initial });
  const controls = await exerciseControls(page, route, workspace, initial);
  const history = await exerciseHistory(page, baseUrl, route);
  const paginationHistory = route === 'interfaces'
    ? await exercisePaginationHistory(page, baseUrl, route)
    : null;
  return { route, rows: initial.rowIds.length, controls, history, paginationHistory };
}

async function inspectNetworkDirectory(page, baseUrl) {
  await page.goto(routeUrl(baseUrl, 'lineStatus'), { waitUntil: 'domcontentloaded' });
  const directory = page.locator('main[data-mobile-reference-network-directory]');
  await directory.waitFor({ state: 'visible', timeout: actionTimeoutMs });
  const rows = directory.locator('.ref-interfaces > button:not(.ref-card-link)');
  assert(await rows.count() > 0, '网络目录没有真实 WAN 或接口对象');
  await rows.first().click();
  await page.waitForFunction(() => new URL(location.href).searchParams.has('object'));
  const opened = canonicalState(page);
  assert(['lineStatus', 'interfaces'].includes(opened.route) && opened.object && opened.surface === null,
    '网络目录对象没有进入可返回的真实详情', opened);
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await directory.waitFor({ state: 'visible', timeout: actionTimeoutMs });
  const back = canonicalState(page);
  assert(back.route === 'lineStatus' && back.object === null && back.surface === null,
    '网络目录 Back 没有恢复列表', back);
  return { rows: await rows.count(), openedRoute: opened.route, back: true };
}

async function inspectEmptyDiagnostics(page, baseUrl) {
  const route = 'readonlyDiagnostics';
  await page.goto(routeUrl(baseUrl, route), { waitUntil: 'domcontentloaded' });
  const workspace = await waitForWorkspace(page, route);
  const state = await workspaceState(page, route);
  const empty = workspace.locator('.ref-empty');
  assert(state.route === route && state.object === null && state.surface === null && state.rowIds.length === 0,
    '没有诊断记录时工作区伪造了对象', state);
  assert(await empty.count() === 1 && (await empty.innerText()).trim().length > 0,
    '没有诊断记录时缺少明确空态', state);
  return { route, rows: 0, honestEmptyState: true };
}

async function main() {
  const startedAt = Date.now();
  const identityStart = gitWorktreeIdentity(root);
  assert(fs.existsSync(path.join(publicDir, 'index.html')), '生产发布资产缺少 public/index.html');
  const snapshot = buildSnapshot('private', 'fleet');
  const lifecycle = await runBrowserLifecycle({
    globalTimeoutMs: suiteTimeoutMs,
    stepTimeoutMs: suiteTimeoutMs,
    cleanupTimeoutMs,
  }, async (runtime) => {
    const server = await startProductionAssetServer();
    runtime.registerCleanup('mobile-reference-assets.stop', () => server.stop());
    await runtime.page.setViewportSize(phoneViewport);
    runtime.page.setDefaultTimeout(actionTimeoutMs);
    runtime.page.setDefaultNavigationTimeout(actionTimeoutMs);
    await runtime.page.addInitScript((value) => { window.__PANEL_TEST_SNAPSHOT__ = value; }, snapshot);
    const routeResults = [];
    for (const route of routes) routeResults.push(await inspectRoute(runtime.page, server.url, route));
    assert(routeResults.some((entry) => entry.controls.retainedSearch),
      '没有工作区保留非空搜索状态进入历史详情', { routeResults });
    assert(routeResults.some((entry) => entry.controls.retainedFilter),
      '没有工作区保留非默认筛选状态进入历史详情', { routeResults });
    assert(routeResults.some((entry) => entry.controls.retainedSort),
      '没有工作区保留非默认排序状态进入历史详情', { routeResults });
    assert(routeResults.some((entry) => entry.paginationHistory?.retainedPagination),
      '没有工作区保留非首页分页状态进入历史详情', { routeResults });
    const histories = routeResults.flatMap((entry) => [entry.history, entry.paginationHistory?.history].filter(Boolean));
    assert(histories.some((entry) => entry.workspaceHistory.scrollTop > 0),
      '没有工作区形成可验证的非零内层滚动恢复证据', { routeResults });
    const emptyDiagnostics = await inspectEmptyDiagnostics(runtime.page, server.url);
    const network = await inspectNetworkDirectory(runtime.page, server.url);
    return { routeResults, emptyDiagnostics, network };
  });
  assert(lifecycle.ok, 'Mobile Reference 深交互浏览器生命周期失败', {
    error: lifecycle.error,
    diagnostics: lifecycle.diagnostics,
  });
  const identityEnd = gitWorktreeIdentity(root);
  assert(sameIdentity(identityStart, identityEnd), '深交互验收期间工作树身份发生变化', { identityStart, identityEnd });
  const report = {
    pass: true,
    complete: true,
    contract,
    generatedAt: new Date().toISOString(),
    commit: identityEnd.commit,
    artifactKey: identityEnd.artifactKey,
    worktreeFingerprint: identityEnd.worktreeFingerprint,
    routes: lifecycle.result.routeResults,
    emptyDiagnostics: lifecycle.result.emptyDiagnostics,
    network: lifecycle.result.network,
    browserLifecycle: lifecycle.diagnostics,
    elapsedMs: Date.now() - startedAt,
  };
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    pass: report.pass,
    complete: report.complete,
    contract,
    routes: report.routes.map((entry) => ({ route: entry.route, rows: entry.rows, controls: entry.controls, history: entry.history })),
    emptyDiagnostics: report.emptyDiagnostics,
    network: report.network,
    elapsedMs: report.elapsedMs,
  }, null, 2));
}

main().catch((error) => {
  const identity = gitWorktreeIdentity(root);
  const report = {
    pass: false,
    complete: false,
    contract,
    generatedAt: new Date().toISOString(),
    commit: identity.commit,
    artifactKey: identity.artifactKey,
    worktreeFingerprint: identity.worktreeFingerprint,
    error: serialise(error),
  };
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
});
