#!/usr/bin/env node
'use strict';

const { chromium } = require('playwright-core');
const { startMock, browserExecutable } = require('./check-panel-runtime-browser');

/**
 * Write-ahead contract for the resource tablet capacity boundary.
 *
 * At 768–799px the navigation rail leaves less room than the declared
 * 268px list + 420px inspector minimum. The resource workbench must use a
 * two-layer task flow there; at 844px it may keep the bounded master/detail
 * split. This prevents a squeezed two-pane layout with an orphaned blank
 * lower list column.
 */
async function login(page, mock) {
  await page.goto(mock.url, { waitUntil: 'domcontentloaded' });
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
  await page.waitForFunction(
    () => document.querySelector('[data-panel-runtime-phase]')?.getAttribute('data-panel-runtime-phase') === 'current',
    null,
    { timeout: 12000 },
  );
}

async function inspect(page, width) {
  await page.setViewportSize({ width, height: 1024 });
  await page.goto(new URL('/?section=trafficLoad', page.url()).toString(), { waitUntil: 'domcontentloaded' });
  const workspace = page.locator('[data-mobile-domain-workspace="trafficLoad"]');
  await workspace.waitFor();
  const evidence = await page.evaluate(() => {
    const shell = document.querySelector('[data-mobile-domain-workspace="trafficLoad"]');
    const layout = shell?.querySelector('.mdw-layout');
    const list = shell?.querySelector('.mdw-list-pane');
    const inspector = shell?.querySelector('.mdw-inspector');
    const rect = (node) => {
      const value = node?.getBoundingClientRect();
      return value ? { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height } : null;
    };
    return {
      viewport: { width: innerWidth, height: innerHeight },
      layoutMode: shell?.getAttribute('data-mobile-domain-layout') || '',
      display: layout ? getComputedStyle(layout).display : '',
      gridTemplateColumns: layout ? getComputedStyle(layout).gridTemplateColumns : '',
      layout: rect(layout),
      list: rect(list),
      inspector: rect(inspector),
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
  const columns = evidence.gridTemplateColumns.split(/\s+/).filter(Boolean);
  const list = evidence.list;
  const inspector = evidence.inspector;
  const contentWidth = evidence.layout?.width || 0;
  const stacked = list && inspector
    && inspector.top >= list.bottom - 1
    && list.width >= contentWidth - 2
    && inspector.width >= contentWidth - 2;
  const split = list && inspector
    && Math.abs(list.top - inspector.top) <= 1
    && inspector.left >= list.right - 1
    && list.width >= 248
    && inspector.width >= 400;
  const contractPass = evidence.viewport.width === width
    && evidence.layoutMode === 'workbench'
    && evidence.display === 'grid'
    && evidence.overflow <= 1
    && (width <= 799 ? columns.length === 1 && stacked : columns.length === 2 && split);
  if (!contractPass) throw new Error(`tablet resource capacity contract failed: ${JSON.stringify(evidence)}`);
  return evidence;
}

async function main() {
  const mock = await startMock();
  mock.state.scenario = 'resource-full';
  const executablePath = browserExecutable();
  if (!executablePath) throw new Error('Edge/Chrome executable not found');
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: process.platform === 'linux' ? ['--no-sandbox'] : [],
    timeout: 15000,
  });
  const context = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.setDefaultNavigationTimeout(15000);
  try {
    await login(page, mock);
    const evidence = [];
    for (const width of [768, 799, 844]) evidence.push({ width, result: await inspect(page, width) });
    console.log(JSON.stringify({ pass: true, contract: 'tablet-resource-fallback-v1', evidence }, null, 2));
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    await mock.stop().catch(() => {});
  }
}

main().catch((error) => {
  process.stderr.write(`${error && (error.stack || error.message) || error}\n`);
  process.exitCode = 1;
});
