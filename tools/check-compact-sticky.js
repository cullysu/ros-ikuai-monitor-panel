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
  const expectCompact = toBool(arg('--expect-compact'));
  const outFile = arg('--out');

  if (!wsUrl) {
    throw new Error('missing --ws');
  }

  const isPageSocket = /\/devtools\/page\//i.test(wsUrl);
  const inspectExpression = `(() => {
    const frame = document.querySelector('.frame');
    const topbar = document.querySelector('.topbar');
    const pageTitle = document.querySelector('.page-title');
    const topMetrics = document.getElementById('topMetrics');
    const sectionName = typeof currentSection === 'string' ? currentSection : null;
    const sticky = sectionName
      ? document.querySelector(\`.section#\${sectionName} .section-summary-sticky, .section#\${sectionName} .arp-summary-sticky\`)
      : null;
    const fixedSummary = document.getElementById('compactSummaryPinnedHost');
    const rootStyle = getComputedStyle(document.documentElement);
    const topbarStyle = topbar ? getComputedStyle(topbar) : null;
    const fixedSummaryStyle = fixedSummary ? getComputedStyle(fixedSummary) : null;
    const titleRect = pageTitle ? pageTitle.getBoundingClientRect() : null;
    const topbarRect = topbar ? topbar.getBoundingClientRect() : null;
    const stickyRect = sticky ? sticky.getBoundingClientRect() : null;
    const fixedSummaryRect = fixedSummary ? fixedSummary.getBoundingClientRect() : null;
    return {
      currentSection: sectionName,
      scrollY: Math.round(window.scrollY || 0),
      frameClassName: frame ? frame.className : null,
      frameClasses: frame ? Array.from(frame.classList) : [],
      hasSticky: Boolean(sticky),
      stickyTop: stickyRect ? Math.round(stickyRect.top) : null,
      stickyBottom: stickyRect ? Math.round(stickyRect.bottom) : null,
      stickyHeight: stickyRect ? Math.round(stickyRect.height) : null,
      stickyTextLength: sticky ? (sticky.innerText || '').trim().length : 0,
      fixedSummaryDisplay: fixedSummaryStyle ? fixedSummaryStyle.display : null,
      fixedSummaryTop: fixedSummaryRect ? Math.round(fixedSummaryRect.top) : null,
      fixedSummaryBottom: fixedSummaryRect ? Math.round(fixedSummaryRect.bottom) : null,
      fixedSummaryHeight: fixedSummaryRect ? Math.round(fixedSummaryRect.height) : null,
      fixedSummaryTextLength: fixedSummary ? (fixedSummary.innerText || '').trim().length : 0,
      topbarHeightVar: rootStyle.getPropertyValue('--topbar-height').trim(),
      topbarDisplay: topbarStyle ? topbarStyle.display : null,
      topbarVisibility: topbarStyle ? topbarStyle.visibility : null,
      topbarOpacity: topbarStyle ? topbarStyle.opacity : null,
      topbarMaxHeight: topbarStyle ? topbarStyle.maxHeight : null,
      topbarTop: topbarRect ? Math.round(topbarRect.top) : null,
      topbarBottom: topbarRect ? Math.round(topbarRect.bottom) : null,
      pageTitleTop: titleRect ? Math.round(titleRect.top) : null,
      pageTitleBottom: titleRect ? Math.round(titleRect.bottom) : null,
      topMetricsDisplay: topMetrics ? getComputedStyle(topMetrics).display : null
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

      const payload = { before, after };
      const text = JSON.stringify(payload, null, 2);
      if (outFile) {
        fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
        fs.writeFileSync(path.resolve(outFile), text, 'utf8');
      }
      console.log(text);

      if (expectCompact !== null) {
        const fixedSummaryVisible = Boolean(
          after
          && after.fixedSummaryDisplay !== 'none'
          && Number.isFinite(after.fixedSummaryTop)
          && after.fixedSummaryTop >= 0
          && after.fixedSummaryTop <= 4
          && Number.isFinite(after.fixedSummaryBottom)
          && after.fixedSummaryBottom > 0
          && after.fixedSummaryTextLength > 0
        );
        const stickyVisible = Boolean(
          after
          && after.hasSticky
          && Number.isFinite(after.stickyTop)
          && after.stickyTop >= 0
          && after.stickyTop <= 4
          && Number.isFinite(after.stickyBottom)
          && after.stickyBottom > 0
          && after.stickyTextLength > 0
        );
        const isCompact = Boolean(
          after
          && after.hasSticky
          && after.frameClasses
          && after.frameClasses.includes('page-compact-topbar')
          && (after.currentSection !== 'arp' || after.frameClasses.includes('arp-compact'))
          && after.topbarHeightVar === '0px'
          && after.topMetricsDisplay === 'none'
          && (fixedSummaryVisible || stickyVisible)
          && Number.isFinite(after.pageTitleBottom)
          && after.pageTitleBottom <= 0
        );
        if (isCompact !== expectCompact) {
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
