#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { startMock, browserExecutable } = require('./acceptance/current-runtime-mock');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, '_acceptance', 'desktop-ipad-runtime');
const viewports = [
  { id: 'wide', width: 1440, height: 900 },
  { id: 'compact-wide', width: 1280, height: 900 },
  { id: 'mid', width: 1040, height: 900 },
  { id: 'narrow', width: 820, height: 1024 },
];

async function login(page, mock) {
  await page.goto(new URL('/?surface=desktop', mock.url).toString(), { waitUntil: 'domcontentloaded' });
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
  await page.waitForFunction(() => document.querySelector('[data-panel-runtime-phase]')?.getAttribute('data-panel-runtime-phase') === 'current');
}

async function inspect(page, mock, scenario, viewport, largeText = false) {
  mock.state.scenario = scenario;
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(new URL('/?surface=desktop&section=overview#overview', mock.url).toString(), { waitUntil: 'domcontentloaded' });
  const rootNode = page.locator('[data-desktop-overview][data-visual-grammar="ikuai-4-ipad"]');
  await rootNode.waitFor();
  if (largeText) {
    await page.evaluate(() => {
      const live = document.querySelector('.panel-runtime-live');
      live?.setAttribute('data-panel-large-text', 'true');
      document.documentElement.style.fontSize = '200%';
    });
  }
  const result = await page.evaluate(() => {
    const root = document.querySelector('[data-desktop-overview]');
    const visible = (node) => {
      if (!node) return false;
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const buttons = [...(document.querySelectorAll('.panel-app-desktop button') || [])].filter(visible);
    const focused = document.activeElement;
    const surface = document.querySelector('.panel-app-desktop');
    const focusStyle = focused && surface?.contains(focused) ? getComputedStyle(focused) : null;
    return {
      mounted: Boolean(root && visible(root)),
      viewport: { width: innerWidth, height: innerHeight },
      overflowX: document.documentElement.scrollWidth - innerWidth,
      overflowY: document.documentElement.scrollHeight - innerHeight,
      largeText: document.querySelector('.panel-runtime-live')?.getAttribute('data-panel-large-text') || 'false',
      navTitles: [...(document.querySelectorAll('.panel-task-navigation button') || [])].every((button) => Boolean(button.getAttribute('title'))),
      focusInside: Boolean(focused && surface?.contains(focused)),
      focusVisible: Boolean(focusStyle && (focusStyle.outlineStyle !== 'none' || focusStyle.boxShadow !== 'none')),
      buttons: buttons.length,
      routeTone: root?.querySelector('.legacy-route-chip')?.className || '',
    };
  });
  await page.keyboard.press('Tab');
  const focusAfterTab = await page.evaluate(() => {
    const node = document.activeElement;
    if (!node) return { inside: false, visible: false, tag: '' };
    const style = getComputedStyle(node);
    return { inside: Boolean(document.querySelector('.panel-app-desktop')?.contains(node)), visible: style.outlineStyle !== 'none' || style.boxShadow !== 'none', tag: node.tagName };
  });
  result.focusAfterTab = focusAfterTab;
  result.pass = result.mounted && result.overflowX <= 1 && result.navTitles && (!largeText || (result.largeText === 'true' && result.overflowX <= 1)) && (result.buttons === 0 || (focusAfterTab.inside && focusAfterTab.visible));
  return { scenario, viewport: viewport.id, largeText, ...result };
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const mock = await startMock();
  const executablePath = browserExecutable();
  if (!executablePath) throw new Error('Edge/Chrome executable not found');
  const browser = await chromium.launch({ executablePath, headless: true, timeout: 15000 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.setDefaultNavigationTimeout(15000);
  try {
    await login(page, mock);
    const cells = [];
    for (const viewport of viewports) cells.push(await inspect(page, mock, 'single', viewport));
    cells.push(await inspect(page, mock, 'single', viewports[0], true));
    cells.push(await inspect(page, mock, 'interfaces-down', viewports[2]));
    const report = { pass: cells.every((cell) => cell.pass), contract: 'desktop-ipad-runtime-v1', cells };
    fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify(report, null, 2));
    if (!report.pass) process.exitCode = 1;
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    await mock.stop().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});
