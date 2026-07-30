#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { startMock, browserExecutable } = require('./check-panel-runtime-browser');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, '_acceptance', 'panel-runtime-browser');
const outputFor = (width) => path.join(outDir, `desktop-interface-relations-${width}.png`);

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

async function inspect(page, width, height, mock) {
  await page.setViewportSize({ width, height });
  await page.goto(new URL('/?section=interfaces#interfaces', mock.url).toString(), { waitUntil: 'domcontentloaded' });
  const workspace = page.locator('[data-desktop-domain-workspace="interfaces"]');
  await workspace.waitFor();
  const relation = workspace.locator('[data-desktop-interface-relations]');
  await relation.waitFor();
  const evidence = await page.evaluate(() => {
    const relation = document.querySelector('[data-desktop-interface-relations]');
    const rows = [...document.querySelectorAll('[data-desktop-interface-relation-row]')];
    const tablePane = document.querySelector('.ddw-table-pane');
    const inspector = document.querySelector('.ddw-inspector');
    const rect = (node) => {
      const value = node?.getBoundingClientRect();
      return value ? { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height } : null;
    };
    return {
      viewport: { width: innerWidth, height: innerHeight },
      phase: document.querySelector('[data-panel-runtime-phase]')?.getAttribute('data-panel-runtime-phase') || '',
      relation: rect(relation),
      rowCount: rows.length,
      rowText: rows.map((row) => row.textContent?.replace(/\s+/g, ' ').trim() || ''),
      tablePane: rect(tablePane),
      inspector: rect(inspector),
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
  if (evidence.viewport.width !== width || evidence.viewport.height !== height || evidence.phase !== 'current' ||
      evidence.rowCount < 2 || !evidence.rowText.some((text) => /默认路由/.test(text)) ||
      !evidence.rowText.some((text) => /gateway|网关|distance/.test(text)) || evidence.overflow > 1 ||
      !evidence.relation || !evidence.tablePane || !evidence.inspector) {
    throw new Error(`desktop interface relation runtime contract failed: ${JSON.stringify(evidence)}`);
  }
  fs.mkdirSync(outDir, { recursive: true });
  await page.screenshot({ path: outputFor(width), animations: 'disabled', timeout: 15000, fullPage: false });
  return evidence;
}

async function main() {
  const mock = await startMock();
  mock.state.scenario = 'interface-review';
  const executablePath = browserExecutable();
  if (!executablePath) throw new Error('Edge/Chrome executable not found');
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: process.platform === 'linux' ? ['--no-sandbox'] : [],
    timeout: 15000,
  });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.setDefaultNavigationTimeout(15000);
  try {
    await login(page, mock);
    const evidence = [
      { width: 1366, height: 768, result: await inspect(page, 1366, 768, mock) },
      { width: 1440, height: 900, result: await inspect(page, 1440, 900, mock) },
    ];
    process.stdout.write(`${JSON.stringify({
      pass: true,
      contract: 'desktop-interface-relations-runtime-v1',
      evidence,
      screenshots: evidence.map(({ width }) => outputFor(width)),
    }, null, 2)}\n`);
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
