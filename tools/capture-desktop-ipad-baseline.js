#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright-core');
const { startMock, browserExecutable } = require('./acceptance/current-runtime-mock');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, '_acceptance', 'desktop-ipad-baseline');

async function login(page, mock) {
  await page.goto(new URL('/?surface=desktop', mock.url).toString(), { waitUntil: 'domcontentloaded' });
  const form = page.locator('[data-router-login-form]');
  await form.waitFor({ state: 'attached', timeout: 10000 }).catch(async (error) => {
    const body = await page.locator('body').innerText().catch(() => '');
    const html = await page.locator('body').innerHTML().catch(() => '');
    throw new Error(`router login form missing; body=${body.slice(0, 800)} html=${html.slice(0, 800)} cause=${error.message}`);
  });
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

async function capture(page, mock, scenario, width, height) {
  mock.state.scenario = scenario;
  await page.setViewportSize({ width, height });
  await page.goto(new URL('/?surface=desktop&section=overview#overview', mock.url).toString(), { waitUntil: 'domcontentloaded' });
  const rootNode = page.locator('[data-desktop-overview][data-visual-grammar="ikuai-4-ipad"]');
  await rootNode.waitFor();
  const output = path.join(outDir, `${scenario}-${width}x${height}.png`);
  await page.screenshot({ path: output, animations: 'disabled', timeout: 15000, fullPage: false });
    const detail = await page.evaluate(() => {
      const root = document.querySelector('[data-desktop-overview]');
    const visible = (node) => {
      if (!node) return false;
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
      const textNodes = [...(root?.querySelectorAll('h1, h2, b, small, span, button') || [])].filter((node) => visible(node) && node.textContent?.trim());
      const chartSvgs = [...(root?.querySelectorAll('.legacy-chart svg') || [])];
      const summaryText = root?.querySelector('[data-desktop-status-bus]')?.textContent || '';
      const routeChip = root?.querySelector('.legacy-route-chip');
      const resourceCards = [...(root?.querySelectorAll('[data-desktop-resource-evidence] .legacy-resource-card') || [])];
      const collectionStatus = root?.querySelector('.legacy-status-text');
      return {
      risk: root?.getAttribute('data-desktop-overview-risk') || '',
      evidenceMode: root?.getAttribute('data-desktop-evidence-mode') || '',
      summaryTiles: root?.querySelectorAll('[data-desktop-status-bus] .legacy-summary-tile').length || 0,
      resourceCards: root?.querySelectorAll('[data-desktop-resource-evidence] .legacy-resource-card').length || 0,
      objectRows: root?.querySelectorAll('[data-desktop-object-list] .legacy-object-row').length || 0,
      bandwidthSummaryItems: root?.querySelectorAll('[data-desktop-bandwidth-summary] .legacy-summary-tile').length || 0,
      verdictVisible: visible(root?.querySelector('[data-desktop-incident-verdict]')),
        chartTruth: chartSvgs.every((svg) => svg.getAttribute('role') === 'img' && Boolean(svg.querySelector('title')) && Boolean(svg.querySelector('desc')) && !/none/i.test(svg.getAttribute('preserveAspectRatio') || '')),
        chartSamplingTruth: [...(root?.querySelectorAll('.legacy-chart-axis') || [])].every((node) => /独立标尺/.test(node.textContent || '') && /(点|单点)/.test(node.textContent || '')),
        minTextPx: Math.min(...textNodes.map((node) => Number.parseFloat(getComputedStyle(node).fontSize || '0')).filter(Number.isFinite), 999),
        minTextNode: textNodes.map((node) => ({ text: (node.textContent || '').trim().slice(0, 40), fontSize: getComputedStyle(node).fontSize, tag: node.tagName, className: node.className?.baseVal || node.className || '' })).sort((left, right) => Number.parseFloat(left.fontSize) - Number.parseFloat(right.fontSize))[0] || null,
        minButtonHeight: Math.min(...[...(root?.querySelectorAll('button') || [])].filter(visible).map((node) => node.getBoundingClientRect().height), 999),
        unavailableDoesNotLookMeasured: root?.getAttribute('data-desktop-evidence-mode') !== 'unavailable' || (!/在线宽带\s*0\s*\/\s*0/.test(summaryText) && !/在线终端\s*0/.test(summaryText)),
        historicalDoesNotClaimCurrent: root?.getAttribute('data-desktop-evidence-mode') !== 'historical' || !/当前快照|当前采样|当前状态/.test(summaryText),
        routeStatusTone: routeChip?.className || '',
        collectionStatusTone: collectionStatus?.className || '',
        resourceStates: resourceCards.map((card) => card.getAttribute('data-resource-state') || ''),
        overflowX: document.documentElement.scrollWidth - innerWidth,
      };
  });
  const expected = {
    single: { risk: 'none', mode: 'current', routeTone: 'is-verified' },
    fleet: { risk: 'interfaces', mode: 'current', routeTone: 'is-verified' },
    'all-offline': { risk: 'wan', mode: 'current', routeTone: 'is-offline' },
    'no-snapshot': { risk: 'evidence', mode: 'unavailable', routeTone: 'is-unavailable' },
    'collection-down': { risk: 'collection', mode: 'historical', routeTone: 'is-unknown' },
    'resource-full': { risk: 'resource', mode: 'current', routeTone: 'is-verified' },
    'interfaces-down': { risk: 'interfaces', mode: 'current', routeTone: 'is-verified' },
  }[scenario];
  const checks = {
    semanticState: detail.risk === expected.risk && detail.evidenceMode === expected.mode,
    summaryComplete: detail.summaryTiles === 8,
    resourceTriplet: detail.resourceCards === 3,
    scenarioWorkspace: expected.risk === 'none' ? detail.bandwidthSummaryItems === 8 && !detail.verdictVisible : detail.objectRows >= 1 && detail.verdictVisible,
    chartTruth: detail.chartTruth,
    chartSamplingTruth: detail.chartSamplingTruth,
    readableType: detail.minTextPx >= 11,
    unavailableDoesNotLookMeasured: detail.unavailableDoesNotLookMeasured,
    historicalDoesNotClaimCurrent: detail.historicalDoesNotClaimCurrent,
    routeStatusTone: detail.routeStatusTone.includes(expected.routeTone),
    collectionFailureTone: scenario !== 'collection-down' || !/is-(ok|trust)/.test(detail.collectionStatusTone),
    resourceThresholdTone: scenario !== 'resource-full' || detail.resourceStates.length === 3 && detail.resourceStates.every((state) => state === 'over-threshold'),
    pointerTargets: detail.minButtonHeight >= 28,
    noHorizontalOverflow: detail.overflowX <= 1,
  };
  return {
    scenario, width, height, output,
    sha256: crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex'),
    pass: Object.values(checks).every(Boolean), checks, detail,
  };
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
    const captures = [];
    for (const scenario of ['single', 'fleet', 'all-offline', 'no-snapshot', 'collection-down', 'resource-full', 'interfaces-down']) {
      captures.push(await capture(page, mock, scenario, 1366, 768));
      captures.push(await capture(page, mock, scenario, 1440, 900));
    }
    const report = { pass: captures.every((capture) => capture.pass), contract: 'desktop-ipad-legacy-matrix-v1', captures };
    fs.writeFileSync(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.pass) process.exitCode = 1;
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
