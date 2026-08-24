#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const { startMock, browserExecutable } = require('./acceptance/current-runtime-mock');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, '_acceptance', 'panel-runtime-browser');
const reportDir = path.join(root, '_acceptance', 'tablet-interface-relation-runtime');
const reportPath = path.join(reportDir, 'report.json');
const outputFor = (width) => path.join(outDir, `tablet-interface-relations-${width}.png`);

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
  const context = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.setDefaultNavigationTimeout(15000);

  try {
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
    await page.waitForFunction(() => document.querySelector('[data-panel-runtime-phase]')?.getAttribute('data-panel-runtime-phase') === 'current', null, { timeout: 12000 });
    await page.goto(new URL('/?section=interfaces#interfaces', mock.url).toString(), { waitUntil: 'domcontentloaded' });
    fs.mkdirSync(outDir, { recursive: true });
    const evidence = [];
    for (const width of [768, 844]) {
      await page.setViewportSize({ width, height: 1024 });
      await page.goto(new URL('/?section=interfaces#interfaces', mock.url).toString(), { waitUntil: 'domcontentloaded' });
      await page.locator('[data-mobile-domain-workspace="interfaces"]').waitFor();
      await page.locator('[data-tablet-interface-relations]').waitFor();
      const currentEvidence = await page.evaluate(() => {
        const relation = document.querySelector('[data-tablet-interface-relations]');
        const routeLedger = document.querySelector('[data-tablet-interface-route-evidence]');
        const comparison = document.querySelector('[data-tablet-interface-comparison]');
        const rows = [...document.querySelectorAll('[data-tablet-interface-relation-row]')];
        return {
          workspace: Boolean(document.querySelector('[data-mobile-domain-workspace="interfaces"]')),
          relation: Boolean(relation),
          comparisonLabel: relation?.querySelector('.mdw-list-heading small')?.textContent?.replace(/\s+/g, ' ').trim() || '',
          routeLedger: routeLedger?.textContent?.replace(/\s+/g, ' ').trim() || '',
          rowCount: rows.length,
          labels: rows.map((row) => row.textContent?.replace(/\s+/g, ' ').trim() || ''),
          currentPhase: document.querySelector('[data-panel-runtime-phase]')?.getAttribute('data-panel-runtime-phase') || '',
          viewport: { width: innerWidth, height: innerHeight },
          overflow: document.documentElement.scrollWidth - innerWidth,
        };
      });
      if (!currentEvidence.workspace || !currentEvidence.relation || currentEvidence.rowCount < 1 ||
        currentEvidence.comparisonLabel !== '关系摘要' ||
        !/默认路由/.test(currentEvidence.routeLedger) ||
        currentEvidence.overflow > 1 || currentEvidence.viewport.width !== width) {
        throw new Error(`tablet interface relation runtime contract failed: ${JSON.stringify(currentEvidence)}`);
      }
      evidence.push(currentEvidence);
      await page.screenshot({ path: outputFor(width), animations: 'disabled', timeout: 15000, fullPage: false });
    }
    const report = {
      pass: true,
      contract: 'tablet-interface-relations-runtime-v1',
      evidence,
      screenshots: evidence.map(({ viewport }) => outputFor(viewport.width)),
    };
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    process.stdout.write(`${JSON.stringify({ ...report, report: reportPath }, null, 2)}\n`);
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
