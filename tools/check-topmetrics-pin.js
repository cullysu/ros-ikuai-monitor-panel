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
  const width = Number(arg('--width', '1600'));
  const height = Number(arg('--height', '2200'));
  const waitMs = Number(arg('--wait', '2400'));
  const scrollY = Number(arg('--scroll', '0'));
  const settleMs = Number(arg('--settle', '700'));
  const expectPinned = toBool(arg('--expect-pinned'));
  const outFile = arg('--out');

  if (!wsUrl) {
    throw new Error('missing --ws');
  }
  const isPageSocket = /\/devtools\/page\//i.test(wsUrl);

  const inspectExpression = `(() => {
    const frame = document.querySelector('.frame');
    const topMetrics = document.getElementById('topMetrics');
    const pinnedHost = document.getElementById('topMetricsPinnedHost');
    const topbar = document.querySelector('.topbar');
    const pageTitle = document.querySelector('.page-title');
    const content = document.querySelector('.content');
    const sourceRect = topMetrics ? topMetrics.getBoundingClientRect() : null;
    const pinnedRect = pinnedHost ? pinnedHost.getBoundingClientRect() : null;
    const topbarRect = topbar ? topbar.getBoundingClientRect() : null;
    const pageTitleRect = pageTitle ? pageTitle.getBoundingClientRect() : null;
    const sourceStyle = topMetrics ? getComputedStyle(topMetrics) : null;
    const pinnedStyle = pinnedHost ? getComputedStyle(pinnedHost) : null;
    return {
      currentSection: typeof currentSection === 'string' ? currentSection : null,
      scrollY: Math.round(window.scrollY || 0),
      hasPinnedClass: Boolean(frame && frame.classList.contains('topmetrics-fixed')),
      frameClassName: frame ? frame.className : null,
      sourceMetrics: topMetrics ? {
        display: sourceStyle ? sourceStyle.display : null,
        visibility: sourceStyle ? sourceStyle.visibility : null,
        position: sourceStyle ? sourceStyle.position : null,
        top: sourceRect ? Math.round(sourceRect.top) : null,
        left: sourceRect ? Math.round(sourceRect.left) : null,
        width: sourceRect ? Math.round(sourceRect.width) : null,
        height: sourceRect ? Math.round(sourceRect.height) : null,
        childCount: topMetrics.children.length
      } : null,
      pinnedHost: pinnedHost ? {
        display: pinnedStyle ? pinnedStyle.display : null,
        visibility: pinnedStyle ? pinnedStyle.visibility : null,
        position: pinnedStyle ? pinnedStyle.position : null,
        top: pinnedRect ? Math.round(pinnedRect.top) : null,
        left: pinnedRect ? Math.round(pinnedRect.left) : null,
        width: pinnedRect ? Math.round(pinnedRect.width) : null,
        height: pinnedRect ? Math.round(pinnedRect.height) : null,
        childCount: pinnedHost.children.length,
        textLength: (pinnedHost.innerText || '').trim().length
      } : null,
      topbarTop: topbarRect ? Math.round(topbarRect.top) : null,
      topbarBottom: topbarRect ? Math.round(topbarRect.bottom) : null,
      pageTitleTop: pageTitleRect ? Math.round(pageTitleRect.top) : null,
      pageTitleBottom: pageTitleRect ? Math.round(pageTitleRect.bottom) : null,
      contentPaddingTop: content ? getComputedStyle(content).paddingTop : null,
      metricsCount: topMetrics ? topMetrics.children.length : 0
    };
  })()`;

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
  };

  browser.onclose = () => {
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
    console.error(reason);
    process.exit(1);
  };

  browser.onopen = async () => {
    try {
      let sessionId;
      let targetId;
      if (!isPageSocket) {
        const target = await send('Target.createTarget', { url: 'about:blank' });
        targetId = target.targetId;
        const attached = await send('Target.attachToTarget', { targetId, flatten: true });
        sessionId = attached.sessionId;
      }
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
      const loadEvent = waitForEvent(
        sessionId ? { sessionId, method: 'Page.loadEventFired' } : { method: 'Page.loadEventFired' },
        Math.max(15000, waitMs + 12000)
      );
      await send('Page.navigate', { url: targetUrl }, sessionId);
      await loadEvent;
      await delay(waitMs);
      const before = await evaluate(inspectExpression, sessionId);
      if (Number.isFinite(scrollY) && scrollY > 0) {
        await evaluate(`(() => {
          window.scrollTo(0, ${scrollY});
          window.dispatchEvent(new Event('scroll'));
          return Math.round(window.scrollY || 0);
        })()`, sessionId);
        await delay(settleMs);
      }
      const after = await evaluate(inspectExpression, sessionId);
      const payload = {
        before,
        after
      };
      const text = JSON.stringify(payload, null, 2);
      if (outFile) {
        fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
        fs.writeFileSync(path.resolve(outFile), text, 'utf8');
      }
      console.log(text);
      if (expectPinned !== null) {
        const isPinned = Boolean(
          after
          && after.currentSection === 'terminals'
          && after.hasPinnedClass
          && after.sourceMetrics
          && after.sourceMetrics.visibility === 'hidden'
          && after.pinnedHost
          && after.pinnedHost.display !== 'none'
          && after.pinnedHost.position === 'fixed'
          && Number.isFinite(after.pinnedHost.top)
          && after.pinnedHost.top <= 4
          && after.pinnedHost.childCount === 4
          && after.pinnedHost.textLength > 0
          && Number.isFinite(after.pageTitleBottom)
          && after.pageTitleBottom <= 0
        );
        if (isPinned !== expectPinned) {
          process.exitCode = 2;
        }
      }
      if (targetId) {
        await send('Target.closeTarget', { targetId });
      }
      browser.close();
      setTimeout(() => process.exit(process.exitCode || 0), 50);
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
