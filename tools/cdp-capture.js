const fs = require('fs');
const path = require('path');

function arg(name, fallback = '') {
  const direct = process.argv.find((item) => item.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  if (index >= 0) return process.argv[index + 1] || fallback;
  return fallback;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toBool(value) {
  if (value === '' || value == null) return null;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

async function main() {
  const wsUrl = arg('--ws');
  const targetUrl = arg('--url', 'about:blank');
  const outFile = path.resolve(arg('--out'));
  const width = Number(arg('--width', '1600'));
  const height = Number(arg('--height', '2200'));
  const waitMs = Number(arg('--wait', '2200'));
  const scrollY = Number(arg('--scroll', '0'));
  const settleMs = Number(arg('--settle', '700'));
  const fullPage = toBool(arg('--full-page')) !== false;

  if (!wsUrl || !outFile) {
    throw new Error('missing --ws or --out');
  }

  const log = (...args) => console.error('[cdp-capture]', ...args);
  log('start', { wsUrl, targetUrl, outFile, width, height, waitMs, scrollY, settleMs, fullPage });
  const isPageSocket = /\/devtools\/page\//i.test(wsUrl);

  const browser = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const eventWaiters = [];

  const matchesEvent = (event, matcher = {}) => {
    if (matcher.sessionId && event.sessionId !== matcher.sessionId) return false;
    if (matcher.method && event.method !== matcher.method) return false;
    return true;
  };

  const waitForEvent = (matcher, timeoutMs = 15000) =>
    new Promise((resolve, reject) => {
      const waiter = {
        matcher,
        resolve,
        reject,
        timer: setTimeout(() => {
          const index = eventWaiters.indexOf(waiter);
          if (index >= 0) eventWaiters.splice(index, 1);
          reject(new Error(`timeout waiting for event ${matcher.method || 'unknown'}`));
        }, timeoutMs)
      };
      eventWaiters.push(waiter);
    });

  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const message = { id: ++id, method, params };
      if (sessionId) message.sessionId = sessionId;
      log('send', message.id, method, sessionId || 'browser');
      pending.set(message.id, { resolve, reject, method });
      browser.send(JSON.stringify(message));
    });

  const evaluate = async (expression, sessionId) => {
    const result = await send(
      'Runtime.evaluate',
      {
        expression,
        awaitPromise: true,
        returnByValue: true
      },
      sessionId
    );
    if (result.exceptionDetails) {
      throw new Error(`Runtime.evaluate failed: ${JSON.stringify(result.exceptionDetails)}`);
    }
    return result.result ? result.result.value : null;
  };

  browser.onmessage = async (event) => {
    try {
      let raw = event.data;
      if (raw && typeof raw !== 'string') {
        if (typeof raw.text === 'function') {
          raw = await raw.text();
        } else if (raw instanceof ArrayBuffer) {
          raw = Buffer.from(raw).toString('utf8');
        } else if (ArrayBuffer.isView(raw)) {
          raw = Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength).toString('utf8');
        } else {
          raw = String(raw);
        }
      }

      const data = JSON.parse(raw);
      if (data.id) log('message', data.id);
      if (data.id && pending.has(data.id)) {
        const task = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) {
          task.reject(new Error(`${task.method}: ${JSON.stringify(data.error)}`));
        } else {
          task.resolve(data.result || {});
        }
        return;
      }
      if (data.method) {
        for (let index = eventWaiters.length - 1; index >= 0; index -= 1) {
          const waiter = eventWaiters[index];
          if (matchesEvent(data, waiter.matcher)) {
            clearTimeout(waiter.timer);
            eventWaiters.splice(index, 1);
            waiter.resolve(data);
          }
        }
      }
    } catch (error) {
      log('message-parse-error', error && error.message ? error.message : String(error));
    }
  };

  browser.onclose = () => {
    log('close');
    for (const [, task] of pending) {
      task.reject(new Error(`browser ws closed while waiting for ${task.method}`));
    }
    pending.clear();
    for (const waiter of eventWaiters.splice(0)) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error('browser ws closed while waiting for event'));
    }
  };

  browser.onerror = (event) => {
    const reason = event?.message || 'browser ws error';
    log('error', reason);
    console.error(reason);
    process.exit(1);
  };

  browser.onopen = async () => {
    log('open');
    try {
      if (isPageSocket) {
        await send('Page.enable');
        await send('Runtime.enable');
        await send('Emulation.setDeviceMetricsOverride', {
          width,
          height,
          deviceScaleFactor: 1,
          mobile: false
        });
        const loadEvent = waitForEvent({ method: 'Page.loadEventFired' }, Math.max(15000, waitMs + 12000));
        await send('Page.navigate', { url: targetUrl });
        await loadEvent;
        await delay(waitMs);
        if (Number.isFinite(scrollY) && scrollY > 0) {
          await evaluate(`(() => {
            window.scrollTo(0, ${scrollY});
            window.dispatchEvent(new Event('scroll'));
            return Math.round(window.scrollY || 0);
          })()`);
          await delay(settleMs);
        }
        const { data } = await send('Page.captureScreenshot', {
          format: 'png',
          fromSurface: true,
          captureBeyondViewport: fullPage
        });
        log('captured-page', data ? data.length : 0);
        fs.mkdirSync(path.dirname(outFile), { recursive: true });
        fs.writeFileSync(outFile, Buffer.from(data, 'base64'));
        browser.close();
        process.exit(0);
      }

      const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
      log('target', targetId);
      const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
      log('session', sessionId);
      await send('Page.enable', {}, sessionId);
      await send('Runtime.enable', {}, sessionId);
      await send(
        'Emulation.setDeviceMetricsOverride',
        {
          width,
          height,
          deviceScaleFactor: 1,
          mobile: false
        },
        sessionId
      );
      const loadEvent = waitForEvent({ sessionId, method: 'Page.loadEventFired' }, Math.max(15000, waitMs + 12000));
      await send('Page.navigate', { url: targetUrl }, sessionId);
      await loadEvent;
      await delay(waitMs);
      if (Number.isFinite(scrollY) && scrollY > 0) {
        await evaluate(`(() => {
          window.scrollTo(0, ${scrollY});
          window.dispatchEvent(new Event('scroll'));
          return Math.round(window.scrollY || 0);
        })()`, sessionId);
        await delay(settleMs);
      }
      const { data } = await send(
        'Page.captureScreenshot',
        { format: 'png', fromSurface: true, captureBeyondViewport: fullPage },
        sessionId
      );
      log('captured', data ? data.length : 0);
      fs.mkdirSync(path.dirname(outFile), { recursive: true });
      fs.writeFileSync(outFile, Buffer.from(data, 'base64'));
      await send('Target.closeTarget', { targetId });
      browser.close();
      process.exit(0);
    } catch (error) {
      console.error(error.stack || String(error));
      process.exit(1);
    }
  };
}
main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
