#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { startMock, browserExecutable } = require('./check-panel-runtime-browser');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, '_acceptance', 'panel-runtime-browser');
const outputFor = (name) => path.join(outDir, `resource-tablet-flow-${name}.png`);

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

async function inspect(page, width, name, clickRow) {
  await page.setViewportSize({ width, height: 1024 });
  await page.goto(new URL('/?section=trafficLoad#trafficLoad', page.url()).toString(), { waitUntil: 'domcontentloaded' });
  const workspace = page.locator('[data-mobile-domain-workspace="trafficLoad"]');
  await workspace.waitFor();
  if (clickRow) {
    await page.locator('[data-mobile-row-id]').first().click();
    await workspace.waitFor({ state: 'attached' });
  }
  const evidence = await page.evaluate(() => {
    const shell = document.querySelector('[data-mobile-domain-workspace="trafficLoad"]');
    const layout = shell?.querySelector('.mdw-layout');
    const list = shell?.querySelector('.mdw-list-pane');
    const inspector = shell?.querySelector('.mdw-inspector');
    const rect = (node) => {
      const value = node?.getBoundingClientRect();
      return value ? { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height } : null;
    };
    const grid = layout ? getComputedStyle(layout).gridTemplateColumns.split(/\s+/).filter(Boolean) : [];
    return {
      viewport: { width: innerWidth, height: innerHeight },
      shellClass: shell?.className || '',
      layoutMode: shell?.getAttribute('data-mobile-domain-layout') || '',
      hasSelection: shell?.classList.contains('has-selection') || false,
      gridColumns: grid.length,
      gridTemplateColumns: layout ? getComputedStyle(layout).gridTemplateColumns : '',
      list: rect(list),
      inspector: rect(inspector),
      nextEvidence: (() => {
        const action = shell?.querySelector('[data-domain-next-evidence-action]');
        const region = shell?.querySelector('[data-domain-next-evidence="loadAudit"]');
        return {
          present: Boolean(action && region),
          rect: rect(action),
          route: action?.getAttribute('data-domain-next-evidence-route') || '',
          sourceObjectId: action?.getAttribute('data-domain-next-evidence-source-object-id') || '',
          targetObjectId: action?.getAttribute('data-domain-next-evidence-object-id') || '',
        };
      })(),
      listScrollHeight: list?.scrollHeight || 0,
      listClientHeight: list?.clientHeight || 0,
      context: rect(list?.querySelector('.mdw-domain-context')),
       layoutStyle: layout ? { display: getComputedStyle(layout).display, flexDirection: getComputedStyle(layout).flexDirection, gridAutoRows: getComputedStyle(layout).gridAutoRows, rowGap: getComputedStyle(layout).rowGap, listGridRow: getComputedStyle(list).gridRow, inspectorGridRow: getComputedStyle(inspector).gridRow } : null,
      inspectorStyle: inspector ? { marginTop: getComputedStyle(inspector).marginTop, position: getComputedStyle(inspector).position, transform: getComputedStyle(inspector).transform } : null,
      overflow: document.documentElement.scrollWidth - innerWidth,
      hasEvidence: Boolean(shell?.querySelector('.mdw-inspector, .mdw-domain-context')),
    };
  });
   const splitColumns = evidence.list && evidence.inspector && evidence.inspector.left >= evidence.list.right - 1;
   const stackedLayers = evidence.list && evidence.inspector &&
     Math.abs(evidence.list.left - evidence.inspector.left) <= 1 &&
     evidence.list.right >= evidence.viewport.width - 1 &&
     evidence.inspector.right >= evidence.viewport.width - 1 &&
     evidence.list.width >= evidence.viewport.width - evidence.list.left - 2 &&
     evidence.inspector.width >= evidence.viewport.width - evidence.inspector.left - 2 &&
     evidence.inspector.top >= evidence.list.bottom - 1;
    // 768px is a real tablet workbench, not a stacked phone fallback. The
    // resource route has a bounded two-pane task: signal/list on the left,
    // selected object evidence on the right.
    const layoutContract = splitColumns;
   if (evidence.viewport.width !== width || evidence.overflow > 1 || !evidence.hasEvidence ||
       !layoutContract ||
      !evidence.nextEvidence.present || evidence.nextEvidence.route !== 'loadAudit' ||
      !evidence.nextEvidence.sourceObjectId || !evidence.nextEvidence.targetObjectId ||
      !evidence.nextEvidence.rect || evidence.nextEvidence.rect.height < 44) {
    throw new Error(`resource tablet flow runtime failed: ${JSON.stringify(evidence)}`);
  }
  fs.mkdirSync(outDir, { recursive: true });
  await page.screenshot({ path: outputFor(name), animations: 'disabled', timeout: 15000, fullPage: false });
  if (clickRow) {
    await page.locator('[data-domain-next-evidence-action]').click();
    await page.waitForFunction(() => new URL(window.location.href).searchParams.get('section') === 'loadAudit');
    const navigation = await page.evaluate(() => ({
      section: new URL(window.location.href).searchParams.get('section'),
      objectId: new URL(window.location.href).searchParams.get('object'),
      from: new URL(window.location.href).searchParams.get('from'),
      evidenceAt: new URL(window.location.href).searchParams.get('evidenceAt'),
    }));
    if (navigation.section !== 'loadAudit' || !navigation.objectId || navigation.from !== 'trafficLoad' || !navigation.evidenceAt) {
      throw new Error(`resource tablet next-evidence navigation failed: ${JSON.stringify(navigation)}`);
    }
  }
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
    const evidence = [
      { name: '768-preview', width: 768, clickRow: false, result: await inspect(page, 768, '768-preview', false) },
      { name: '768-selected', width: 768, clickRow: true, result: await inspect(page, 768, '768-selected', true) },
      { name: '771-preview', width: 771, clickRow: false, result: await inspect(page, 771, '771-preview', false) },
      { name: '772-preview', width: 772, clickRow: false, result: await inspect(page, 772, '772-preview', false) },
      { name: '844-preview', width: 844, clickRow: false, result: await inspect(page, 844, '844-preview', false) },
      { name: '844-selected', width: 844, clickRow: true, result: await inspect(page, 844, '844-selected', true) },
    ];
    console.log(JSON.stringify({
      pass: true,
       contract: 'resource-tablet-flow-runtime-v2',
      evidence,
      screenshots: evidence.map(({ name }) => outputFor(name)),
    }, null, 2));
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
