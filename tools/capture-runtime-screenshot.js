#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const config = JSON.parse(process.argv[2] || '{}');
const root = path.resolve(__dirname, '..');
const output = path.resolve(config.output || '');
const outputRoot = path.resolve(root, '_acceptance', 'panel-runtime-browser');
if (!output.startsWith(outputRoot + path.sep)) throw new Error('screenshot output escapes runtime acceptance root');

const configuredTimeout = Number(config.timeout);
const timeout = Number.isFinite(configuredTimeout)
  ? Math.min(Math.max(configuredTimeout, 5000), 30000)
  : 30000;

(async () => {
  let browser = null;
  let context = null;
  let exitCode = 0;
  try {
    browser = await chromium.launch({
      executablePath: config.browser,
      headless: true,
      args: process.platform === 'linux' ? ['--no-sandbox'] : [],
      timeout,
    });
    context = await browser.newContext({ viewport: config.viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.setDefaultTimeout(timeout);
    page.setDefaultNavigationTimeout(timeout);
    await page.goto(config.url, { waitUntil: 'domcontentloaded', timeout });
    if (config.selector) await page.locator(config.selector).waitFor({ timeout });
    const image = await page.screenshot({ path: output, animations: 'disabled', timeout });
    console.log(JSON.stringify({
      bytes: image.length,
      sha256: crypto.createHash('sha256').update(image).digest('hex'),
      image: { width: image.readUInt32BE(16), height: image.readUInt32BE(20) },
      viewport: page.viewportSize(),
    }));
  } catch (error) {
    console.error(error.stack || String(error));
    exitCode = 1;
  } finally {
    // Edge can leave a Playwright close promise pending after a screenshot has
    // already been written. This helper is intentionally isolated, so cleanup
    // must be bounded; otherwise the parent runtime gate waits for its global
    // timeout and reports a false screenshot failure.
    const closeWithin = async (resource, timeoutMs) => {
      if (!resource) return;
      await Promise.race([
        Promise.resolve().then(() => resource.close()).catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, timeoutMs)),
      ]);
    };
    await closeWithin(context, 1500);
    await closeWithin(browser, 1500);
    // Do not let lingering browser handles keep this isolated worker alive.
    process.exit(exitCode);
  }
})();
