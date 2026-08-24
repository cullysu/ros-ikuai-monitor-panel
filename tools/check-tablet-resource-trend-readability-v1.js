#!/usr/bin/env node
'use strict';

const { chromium } = require('playwright-core');
const { startMock, browserExecutable } = require('./acceptance/current-runtime-mock');

/**
 * Write-ahead visual contract for the narrow resource workbench.
 * The two-pane fix must not turn the named resource series into vertically
 * broken labels. Readability is checked on rendered geometry, not on a CSS
 * string or a screenshot pixel count.
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
  await page.goto(new URL('/?section=trafficLoad#trafficLoad', page.url()).toString(), { waitUntil: 'domcontentloaded' });
  const chart = page.locator('[data-mobile-domain-workspace="trafficLoad"] [data-section-time-series]');
  await chart.waitFor();
  const evidence = await page.evaluate(() => {
    const figure = document.querySelector('[data-mobile-domain-workspace="trafficLoad"] [data-section-time-series]');
    const rect = (node) => {
      const value = node?.getBoundingClientRect();
      return value ? { width: value.width, height: value.height, top: value.top, bottom: value.bottom } : null;
    };
    const labels = [...(figure?.querySelectorAll('.section-timeseries footer > span:not(.section-threshold-entry), .section-timeseries-readouts b') || [])]
      .map((node) => {
        const style = getComputedStyle(node);
        const value = node.getBoundingClientRect();
        const fontSize = Number.parseFloat(style.fontSize) || 12;
        const lineHeight = style.lineHeight === 'normal' ? fontSize * 1.35 : Number.parseFloat(style.lineHeight) || fontSize * 1.35;
        return { text: node.textContent?.trim() || '', height: value.height, lineHeight, wrapped: value.height > lineHeight * 1.7 };
      });
    const svg = figure?.querySelector('svg');
    return {
      viewport: { width: innerWidth, height: innerHeight },
      figure: rect(figure),
      svg: rect(svg),
      labels,
      wrappedLabels: labels.filter((item) => item.wrapped).map((item) => item.text),
      overflow: document.documentElement.scrollWidth - innerWidth,
      accessibleName: svg?.getAttribute('aria-labelledby') || '',
    };
  });
  const pass = evidence.viewport.width === width
    && evidence.figure
    && evidence.svg
    && evidence.svg.width >= 150
    && evidence.svg.height >= 80
    && evidence.wrappedLabels.length === 0
    && evidence.accessibleName
    && evidence.overflow <= 1;
  if (!pass) throw new Error(`tablet resource trend readability contract failed: ${JSON.stringify(evidence)}`);
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
    console.log(JSON.stringify({ pass: true, contract: 'tablet-resource-trend-readability-v1', evidence }, null, 2));
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
